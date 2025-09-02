"use strict";
import * as util from "../utility.js";

self.addEventListener("message", async (ev) => {
	const { iterations, downShaderSrc, upShaderSrc, downsampleLevels, samplePos } = ev.data;

	const ctx = {
		flags: { contextLoss: false },
		tex: { frame: null, down: [] },
		fb: { scene: null, down: [] },
		shd: {
			downsample: {
				handle: null, uniforms: { frameSizeRCP: null, offset: null, bloomStrength: null }
			},
			upsample: {
				handle: null, uniforms: { frameSizeRCP: null, offset: null, bloomStrength: null }
			},
			passthrough: {
				handle: null
			},
			bg: {
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
			downsampleLevels: downsampleLevels,
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
	[ctx.fb.scene, ctx.tex.frame] = util.setupFramebuffer(gl, 1600, 1200);

	/* Setup downsample buffers */
	const levels = parseInt(downsampleLevels);
	let w = 1600, h = 1200;
	for (let i = 0; i < levels; ++i) {
		w = Math.max(1, w >> 1);
		h = Math.max(1, h >> 1);
		const [fb, tex] = util.setupFramebuffer(gl, w, h);
		ctx.fb.down.push(fb);
		ctx.tex.down.push(tex);
	}

	ctx.shd.bg = util.compileAndLinkShader(gl, simpleQuad, noiseFrag);
	ctx.shd.passthrough = util.compileAndLinkShader(gl, simpleQuad, simpleTexture);

	/* Dual Kawase Shaders */
	ctx.shd.downsample = util.compileAndLinkShader(gl, simpleQuad, downShaderSrc, ["frameSizeRCP", "offset", "bloomStrength"]);
	ctx.shd.upsample = util.compileAndLinkShader(gl, simpleQuad, upShaderSrc, ["frameSizeRCP", "offset", "bloomStrength"]);

	/* Generate noise texture */
	gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.scene);
	gl.viewport(0, 0, 1600, 1200);
	gl.useProgram(ctx.shd.bg.handle);
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	/* Run a draw Call with the shaders to ensure they're loaded */
	gl.useProgram(ctx.shd.downsample.handle);
	gl.bindTexture(gl.TEXTURE_2D, ctx.tex.frame);
	gl.uniform2f(ctx.shd.downsample.uniforms.frameSizeRCP, 1.0 / 1600, 1.0 / 1200);
	gl.uniform1f(ctx.shd.downsample.uniforms.offset, samplePos);
	gl.uniform1f(ctx.shd.downsample.uniforms.bloomStrength, 1.0);
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

	/* Make sure the Command Queue is empty */
	gl.readPixels(Math.random() * 512, Math.random() * 512, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, testPixel);

	/* Measure the rough length of a pixel Readback */
	const readPixelsTimeStart = performance.now();
	for (let x = 0; x < 10; x++)
		gl.readPixels(Math.random() * 512, Math.random() * 512, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, testPixel);
	const readPixelsTimeEnd = performance.now();

	/* Benchmark function that replicates the exact Dual Kawase algorithm */
	function benchmarkIteration() {
		let srcTex = ctx.tex.frame;

		if (levels > 0) {
			/* Apply distributed brightness, due to color precision limitations and multi pass nature of this blur algorithm */
			const totalPasses = 2 * levels;
			const distributedBrightness = Math.pow(1.0, 1.0 / totalPasses);
			
			/* Downsample chain */
			gl.useProgram(ctx.shd.downsample.handle);
			gl.uniform1f(ctx.shd.downsample.uniforms.offset, samplePos);
			
			let w = 1600, h = 1200;
			for (let i = 0; i < levels; ++i) {
				const fb = ctx.fb.down[i];
				w = Math.max(1, w >> 1);
				h = Math.max(1, h >> 1);

				gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
				gl.viewport(0, 0, w, h);

				const frameSizeRCP = [1.0 / w, 1.0 / h];
				gl.uniform2fv(ctx.shd.downsample.uniforms.frameSizeRCP, frameSizeRCP);
				gl.uniform1f(ctx.shd.downsample.uniforms.bloomStrength, distributedBrightness);

				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, srcTex);
				gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
				srcTex = ctx.tex.down[i];
			}

			/* Upsample chain */
			gl.useProgram(ctx.shd.upsample.handle);
			gl.uniform1f(ctx.shd.upsample.uniforms.offset, samplePos);
			
			for (let i = levels - 2; i >= 0; i--) {
				const fb = ctx.fb.down[i];
				w = Math.max(1, 1600 >> (i + 1));
				h = Math.max(1, 1200 >> (i + 1));

				gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
				gl.viewport(0, 0, w, h);

				const srcW = Math.max(1, 1600 >> (i + 2));
				const srcH = Math.max(1, 1200 >> (i + 2));
				const frameSizeRCP = [1.0 / srcW, 1.0 / srcH];
				gl.uniform2fv(ctx.shd.upsample.uniforms.frameSizeRCP, frameSizeRCP);
				gl.uniform1f(ctx.shd.upsample.uniforms.bloomStrength, distributedBrightness);

				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, srcTex);
				gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
				srcTex = ctx.tex.down[i];
			}

			/* Final upsample to full resolution */
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, 1600, 1200);

			const srcW = Math.max(1, 1600 >> 1);
			const srcH = Math.max(1, 1200 >> 1);
			const frameSizeRCP = [1.0 / srcW, 1.0 / srcH];
			gl.uniform2fv(ctx.shd.upsample.uniforms.frameSizeRCP, frameSizeRCP);
			gl.uniform1f(ctx.shd.upsample.uniforms.bloomStrength, distributedBrightness);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, srcTex);
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		} else {
			/* No blur - direct passthrough */
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, 1600, 1200);
			gl.useProgram(ctx.shd.passthrough.handle);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, srcTex);
			gl.uniform1i(gl.getUniformLocation(ctx.shd.passthrough.handle, "texture"), 0);
			gl.uniform1f(gl.getUniformLocation(ctx.shd.passthrough.handle, "bloomStrength"), 1.0);
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		}
	}

	/* Warm Up the pipeline */
	for (let x = 0; x < iterations / 10; x++) {
		benchmarkIteration();
	}
	gl.readPixels(Math.random() * 512, Math.random() * 512, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, testPixel);

	/* Measure blur iterations */
	const benchNow = performance.now();
	for (let x = 0; x < iterations; x++) {
		benchmarkIteration();
	}
	gl.readPixels(Math.random() * 512, Math.random() * 512, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, testPixel);

	/* Display results */
	/* Calculate texture taps based on dual kawase algorithm */
	let totalTaps = 0;
	if (levels > 0) {
		for (let i = 0; i < levels; i++) {
			const levelW = Math.max(1, 1600 >> (i + 1));
			const levelH = Math.max(1, 1200 >> (i + 1));
			totalTaps += levelW * levelH * 5; // 5 samples per downsample pass
			if (i < levels - 1) totalTaps += levelW * levelH * 8; // 8 samples per upsample pass (except final)
		}
		totalTaps += 1600 * 1200 * 8; // Final upsample to full res
	} else {
		totalTaps = 1600 * 1200; // Direct passthrough
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
	gl.deleteTexture(ctx.tex.frame);
	for (let i = 0; i < levels; ++i) {
		gl.deleteFramebuffer(ctx.fb.down[i]);
		gl.deleteTexture(ctx.tex.down[i]);
	}
	gl.deleteProgram(ctx.shd.downsample.handle);
	gl.deleteProgram(ctx.shd.upsample.handle);
	gl.deleteProgram(ctx.shd.passthrough.handle);
	gl.deleteProgram(ctx.shd.bg.handle);

	if (!ctx.flags.contextLoss)
		self.postMessage({ 
			type: "done", 
			benchText, 
			iterationText, 
			renderer, 
			tapsCount,
			downsampleLevels: levels
		});
});