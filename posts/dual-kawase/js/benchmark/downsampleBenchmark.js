"use strict";
import * as util from "../utility.js";

self.addEventListener("message", async (ev) => {
	const { iterations, blurShaderSrc, kernelSize, samplePos, sigma, downSample, skipMode } = ev.data;

	const ctx = {
		flags: { contextLoss: false },
		tex: { frame: null, frameFinal: null, down: [], intermediate: [], nativeIntermediate: null },
		fb: { scene: null, final: null, intermediate: [], down: [], nativeIntermediate: null },
		shd: {
			blur: {
				handle: null, uniforms: { frameSizeRCP: null, samplePosMult: null, bloomStrength: null, sigma: null, direction: null }
			},
			bg: {
				handle: null
			},
			passthrough: {
				handle: null
			}
		}
	};

	const canvas = new OffscreenCanvas(1600, 1200);
	const gl = canvas.getContext("webgl", {
		preserveDrawingBuffer: false,
		antialias: false,
		alpha: false
	});

	let renderer = gl.getParameter(gl.RENDERER);
	const rendererInfoExt = gl.getExtension('WEBGL_debug_renderer_info');
	if (rendererInfoExt)
		renderer = gl.getParameter(rendererInfoExt.UNMASKED_RENDERER_WEBGL);

	canvas.addEventListener("webglcontextlost", (e) => {
		e.preventDefault();
		ctx.flags.contextLoss = true;
		self.postMessage({
			type: "done",
			benchText: "Benchmark Canceled",
			skipMode: skipMode.charAt(0).toUpperCase() + skipMode.slice(1),
			renderer: "⚠ WebGL Context Lost, use a smaller iteration count! " + renderer
		});
		self.close();
	});

	const testPixel = new Uint8Array(4);

	const simpleQuad = await util.fetchShader("../../shader/simpleQuad.vs");
	const noiseFrag = await util.fetchShader("../../shader/noise.fs");
	const simpleTexture = await util.fetchShader("../../shader/simpleTexture.fs");

	const quadBuffer = util.bindUnitQuad(gl);

	/* Setup Buffers */
	gl.deleteFramebuffer(ctx.fb.scene);
	gl.deleteFramebuffer(ctx.fb.final);
	gl.deleteFramebuffer(ctx.fb.nativeIntermediate);
	[ctx.fb.scene, ctx.tex.frame] = util.setupFramebuffer(gl, 1600, 1200);
	[ctx.fb.final, ctx.tex.frameFinal] = util.setupFramebuffer(gl, 1600, 1200);
	[ctx.fb.nativeIntermediate, ctx.tex.nativeIntermediate] = util.setupFramebuffer(gl, 1600, 1200);

	/* Setup downsample buffers */
	const levels = parseInt(downSample);
	let w = 1600, h = 1200;
	for (let i = 0; i < levels; ++i) {
		w = Math.max(1, w >> 1);
		h = Math.max(1, h >> 1);
		const [fb, tex] = util.setupFramebuffer(gl, w, h);
		ctx.fb.down.push(fb);
		ctx.tex.down.push(tex);
		const [intermediateFb, intermediateTex] = util.setupFramebuffer(gl, w, h);
		ctx.fb.intermediate.push(intermediateFb);
		ctx.tex.intermediate.push(intermediateTex);
	}

	ctx.shd.bg = util.compileAndLinkShader(gl, simpleQuad, noiseFrag);
	ctx.shd.passthrough = util.compileAndLinkShader(gl, simpleQuad, simpleTexture);

	/* Separable Gaussian Blur Shader */
	ctx.shd.blur = util.compileAndLinkShader(gl, simpleQuad, blurShaderSrc, ["frameSizeRCP", "samplePosMult", "bloomStrength", "sigma", "direction"], "#define KERNEL_SIZE " + kernelSize + '\n');

	/* Generate noise texture */
	gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.scene);
	gl.viewport(0, 0, 1600, 1200);
	gl.useProgram(ctx.shd.bg.handle);
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	/* Perform separable blur: horizontal pass followed by vertical pass */
	function performSeparableBlur(srcTexture, targetFB, width, height, intermediateFB, intermediateTex, bloomStrength) {
		gl.useProgram(ctx.shd.blur.handle);
		
		/* Set common uniforms */
		gl.uniform2f(ctx.shd.blur.uniforms.frameSizeRCP, 1.0 / width, 1.0 / height);
		gl.uniform1f(ctx.shd.blur.uniforms.samplePosMult, samplePos);
		gl.uniform1f(ctx.shd.blur.uniforms.sigma, Math.max(kernelSize / sigma, 0.001));
		gl.uniform1f(ctx.shd.blur.uniforms.bloomStrength, bloomStrength);
		
		/* Horizontal pass */
		gl.bindFramebuffer(gl.FRAMEBUFFER, intermediateFB);
		gl.viewport(0, 0, width, height);
		gl.uniform2f(ctx.shd.blur.uniforms.direction, 1.0, 0.0); // Horizontal
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, srcTexture);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		
		/* Vertical pass */
		gl.bindFramebuffer(gl.FRAMEBUFFER, targetFB);
		gl.viewport(0, 0, width, height);
		gl.uniform2f(ctx.shd.blur.uniforms.direction, 0.0, 1.0); // Vertical
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, intermediateTex);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	}

	/* Run a draw Call with the blur Shader to ensure it's loaded */
	gl.useProgram(ctx.shd.blur.handle);
	gl.bindTexture(gl.TEXTURE_2D, ctx.tex.frame);
	gl.uniform2f(ctx.shd.blur.uniforms.frameSizeRCP, 1.0 / 1600, 1.0 / 1200);
	gl.uniform1f(ctx.shd.blur.uniforms.samplePosMult, samplePos);
	gl.uniform1f(ctx.shd.blur.uniforms.bloomStrength, 1.0);
	gl.uniform1f(ctx.shd.blur.uniforms.sigma, Math.max(kernelSize / sigma, 0.001));
	gl.uniform2f(ctx.shd.blur.uniforms.direction, 1.0, 0.0);
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

	/* Make sure the Command Queue is empty */
	gl.readPixels(Math.random() * 512, Math.random() * 512, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, testPixel);

	/* Measure the rough length of a pixel Readback */
	const readPixelsTimeStart = performance.now();
	for (let x = 0; x < 10; x++)
		gl.readPixels(Math.random() * 512, Math.random() * 512, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, testPixel);
	const readPixelsTimeEnd = performance.now();

	/* Warm Up the pipeline */
	for (let x = 0; x < iterations / 10; x++) {
		benchmarkIteration();
	}
	gl.readPixels(Math.random() * 512, Math.random() * 512, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, testPixel);

	/* Benchmark function that replicates the exact downsample algorithm */
	function benchmarkIteration() {
		let srcTex = ctx.tex.frame;
		let w = 1600, h = 1200;

		if (levels > 0) {
			if (skipMode === "skipDown") {
				/* Skip downsample steps: jump directly to target level and blur */
				const lastDownsampleFB = ctx.fb.down[levels - 1];
				const lastIntermediateFB = ctx.fb.intermediate[levels - 1];
				const lastIntermediateTex = ctx.tex.intermediate[levels - 1];
				w = Math.max(1, 1600 >> levels);
				h = Math.max(1, 1200 >> levels);
				
				/* First downsample directly to target level */
				gl.useProgram(ctx.shd.passthrough.handle);
				gl.bindFramebuffer(gl.FRAMEBUFFER, lastDownsampleFB);
				gl.viewport(0, 0, w, h);
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, srcTex);
				gl.uniform1i(gl.getUniformLocation(ctx.shd.passthrough.handle, "texture"), 0);
				gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
				
				/* Then blur at the target resolution */
				performSeparableBlur(ctx.tex.down[levels - 1], lastDownsampleFB, w, h, lastIntermediateFB, lastIntermediateTex, 1.0);
				srcTex = ctx.tex.down[levels - 1];
			} else {
				/* Normal mode: Downsample up to the second to last level */
				gl.useProgram(ctx.shd.passthrough.handle);
				for (let i = 0; i < levels - 1; ++i) {
					const fb = ctx.fb.down[i];
					w = Math.max(1, w >> 1);
					h = Math.max(1, h >> 1);

					gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
					gl.viewport(0, 0, w, h);

					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, srcTex);
					gl.uniform1i(gl.getUniformLocation(ctx.shd.passthrough.handle, "texture"), 0);
					gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
					srcTex = ctx.tex.down[i];
				}

				/* Blur into the last downsample buffer */
				const lastDownsampleFB = ctx.fb.down[levels - 1];
				const lastIntermediateFB = ctx.fb.intermediate[levels - 1];
				const lastIntermediateTex = ctx.tex.intermediate[levels - 1];
				w = Math.max(1, w >> 1);
				h = Math.max(1, h >> 1);
				
				performSeparableBlur(srcTex, lastDownsampleFB, w, h, lastIntermediateFB, lastIntermediateTex, 1.0);
				srcTex = ctx.tex.down[levels - 1];
			}
		} else {
			/* Run Gaussian blur at native resolution when no downsample */
			performSeparableBlur(srcTex, ctx.fb.final, 1600, 1200, ctx.fb.nativeIntermediate, ctx.tex.nativeIntermediate, 1.0);
		}

		/* Upsample chain */
		if (levels > 0) {
			if (skipMode === "skipUp") {
				/* Skip upsample steps: srcTex stays at the lowest resolution */
			} else {
				/* Normal mode: Upsample through the mip levels */
				gl.useProgram(ctx.shd.passthrough.handle);
				for (let i = levels - 2; i >= 0; i--) {
					const fb = ctx.fb.down[i];
					let upsampleW = Math.max(1, 1600 >> (i + 1));
					let upsampleH = Math.max(1, 1200 >> (i + 1));
					gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
					gl.viewport(0, 0, upsampleW, upsampleH);
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, srcTex);
					gl.uniform1i(gl.getUniformLocation(ctx.shd.passthrough.handle, "texture"), 0);
					gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
					srcTex = ctx.tex.down[i];
				}
			}

			/* Final pass to present to screen (with upscaling if needed) */
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, 1600, 1200);
			gl.useProgram(ctx.shd.passthrough.handle);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, srcTex);
			gl.uniform1i(gl.getUniformLocation(ctx.shd.passthrough.handle, "texture"), 0);
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		}
	}

	/* Measure blur iterations */
	const benchNow = performance.now();
	for (let x = 0; x < iterations; x++) {
		benchmarkIteration();
	}
	gl.readPixels(Math.random() * 512, Math.random() * 512, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, testPixel);

	/* Display results */
	const kernelSizeSide = kernelSize * 2 + 1;
	/* Calculate taps based on downsampling algorithm */
	let totalTaps = 0;
	const effectiveRes = [Math.max(1, 1600 >> parseInt(downSample)), Math.max(1, 1200 >> parseInt(downSample))];
	if (levels > 0) {
		/* Separable blur taps at effective resolution */
		totalTaps += effectiveRes[0] * effectiveRes[1] * kernelSizeSide * 2; // horizontal + vertical
		
		if (skipMode === "normal") {
			/* Add downsample and upsample taps */
			let w = 1600, h = 1200;
			for (let i = 0; i < levels - 1; ++i) {
				w = Math.max(1, w >> 1);
				h = Math.max(1, h >> 1);
				totalTaps += w * h; // downsample pass
			}
			for (let i = levels - 2; i >= 0; i--) {
				let upsampleW = Math.max(1, 1600 >> (i + 1));
				let upsampleH = Math.max(1, 1200 >> (i + 1));
				totalTaps += upsampleW * upsampleH; // upsample pass
			}
			totalTaps += 1600 * 1200; // final upsample
		} else if (skipMode === "skipUp") {
			/* Add downsample taps but skip intermediate upsample taps */
			let w = 1600, h = 1200;
			for (let i = 0; i < levels - 1; ++i) {
				w = Math.max(1, w >> 1);
				h = Math.max(1, h >> 1);
				totalTaps += w * h; // downsample pass
			}
			totalTaps += 1600 * 1200; // final upsample
		} else if (skipMode === "skipDown") {
			/* Direct downsample to target level, then blur, then final upsample */
			totalTaps += effectiveRes[0] * effectiveRes[1]; // direct downsample pass
			totalTaps += 1600 * 1200; // final upsample
		}
	} else {
		/* Native resolution separable blur */
		totalTaps = 1600 * 1200 * kernelSizeSide * 2;
	}
	const tapsCount = (totalTaps / 1000000).toFixed(1);

	const benchTime = performance.now() - benchNow - ((readPixelsTimeEnd - readPixelsTimeStart) / 10);
	const iterationTime = benchTime / iterations;
	const iterationText = iterationTime < 1 ? (iterationTime * 1000).toFixed(2) + " µs" : iterationTime.toFixed(2) + " ms";

	let benchText;
	if (benchTime < 1)
		benchText = "Unreliable Measurement"
	else
		benchText = benchTime >= 1000 ? (benchTime / 1000).toFixed(1) + " s" : benchTime.toFixed(1) + " ms";

	if (testPixel[0] + testPixel[1] + testPixel[2] == 0) {
		benchText = "Invalid Measurement"
	}

	/* Clean Up */
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.useProgram(null);
	gl.disableVertexAttribArray(0);

	gl.deleteBuffer(quadBuffer);
	gl.deleteFramebuffer(ctx.fb.scene);
	gl.deleteFramebuffer(ctx.fb.final);
	gl.deleteFramebuffer(ctx.fb.nativeIntermediate);
	gl.deleteTexture(ctx.tex.frame);
	gl.deleteTexture(ctx.tex.frameFinal);
	gl.deleteTexture(ctx.tex.nativeIntermediate);
	for (let i = 0; i < levels; ++i) {
		gl.deleteFramebuffer(ctx.fb.down[i]);
		gl.deleteTexture(ctx.tex.down[i]);
		gl.deleteFramebuffer(ctx.fb.intermediate[i]);
		gl.deleteTexture(ctx.tex.intermediate[i]);
	}
	gl.deleteProgram(ctx.shd.blur.handle);
	gl.deleteProgram(ctx.shd.bg.handle);
	gl.deleteProgram(ctx.shd.passthrough.handle);

	if (!ctx.flags.contextLoss)
		self.postMessage({ 
			type: "done", 
			benchText, 
			iterationText, 
			renderer, 
			tapsCount,
			skipMode: skipMode.charAt(0).toUpperCase() + skipMode.slice(1)
		});
});