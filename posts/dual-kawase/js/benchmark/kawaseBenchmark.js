"use strict";
import * as util from "../utility.js";

self.addEventListener("message", async (ev) => {
	const { iterations, kawaseShaderSrc, kawaseIterations, samplePos } = ev.data;

	const ctx = {
		flags: { contextLoss: false },
		tex: { frame: null, frameIntermediate1: null, frameIntermediate2: null },
		fb: { scene: null, intermediate1: null, intermediate2: null },
		shd: {
			kawase: {
				handle: null, uniforms: { frameSizeRCP: null, samplePosMult: null, pixelOffset: null, bloomStrength: null }
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
			kawaseIterations: kawaseIterations,
			renderer: "⚠ WebGL Context Lost, use a smaller iteration count! " + renderer
		});
		self.close();
	});

	const testPixel = new Uint8Array(4);

	const simpleQuad = await util.fetchShader("../../shader/simpleQuad.vs");
	const noiseFrag = await util.fetchShader("../../shader/noise.fs");

	const quadBuffer = util.bindUnitQuad(gl);

	/* Setup Buffers */
	gl.deleteFramebuffer(ctx.fb.scene);
	gl.deleteFramebuffer(ctx.fb.intermediate1);
	gl.deleteFramebuffer(ctx.fb.intermediate2);
	[ctx.fb.scene, ctx.tex.frame] = util.setupFramebuffer(gl, 1600, 1200);
	[ctx.fb.intermediate1, ctx.tex.frameIntermediate1] = util.setupFramebuffer(gl, 1600, 1200);
	[ctx.fb.intermediate2, ctx.tex.frameIntermediate2] = util.setupFramebuffer(gl, 1600, 1200);

	// Clear intermediate textures to prevent lazy initialization warnings
	gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.intermediate1);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.intermediate2);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	ctx.shd.bg = util.compileAndLinkShader(gl, simpleQuad, noiseFrag);

	/* Kawase Blur Shader */
	ctx.shd.kawase = util.compileAndLinkShader(gl, simpleQuad, kawaseShaderSrc, ["frameSizeRCP", "samplePosMult", "pixelOffset", "bloomStrength"]);

	/* Generate noise texture */
	gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.scene);
	gl.viewport(0, 0, 1600, 1200);
	gl.useProgram(ctx.shd.bg.handle);
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	/* Run a draw Call with the kawase Shader to ensure it's loaded */
	gl.useProgram(ctx.shd.kawase.handle);
	gl.bindTexture(gl.TEXTURE_2D, ctx.tex.frame);
	gl.uniform2f(ctx.shd.kawase.uniforms.frameSizeRCP, 1.0 / 1600, 1.0 / 1200);
	gl.uniform1f(ctx.shd.kawase.uniforms.samplePosMult, samplePos);
	gl.uniform1f(ctx.shd.kawase.uniforms.pixelOffset, 0);
	gl.uniform1f(ctx.shd.kawase.uniforms.bloomStrength, 1.0);
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

	/* Make sure the Command Queue is empty */
	gl.readPixels(Math.random() * 512, Math.random() * 512, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, testPixel);

	/* Measure the rough length of a pixel Readback */
	const readPixelsTimeStart = performance.now();
	for (let x = 0; x < 10; x++)
		gl.readPixels(Math.random() * 512, Math.random() * 512, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, testPixel);
	const readPixelsTimeEnd = performance.now();

	/* Benchmark function that replicates the exact Kawase algorithm */
	function benchmarkIteration() {
		const kawaseIters = parseInt(kawaseIterations);
		
		if (kawaseIters === 0) {
			/* Handle 0 iterations case - direct copy to output using Kawase shader with no offset */
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, 1600, 1200);
			
			/* Use Kawase shader with pixelOffset=0 and samplePosMult=0 for simple copy */
			gl.useProgram(ctx.shd.kawase.handle);
			gl.uniform2f(ctx.shd.kawase.uniforms.frameSizeRCP, 1.0 / 1600, 1.0 / 1200);
			gl.uniform1f(ctx.shd.kawase.uniforms.samplePosMult, 0.0); // No offset
			gl.uniform1f(ctx.shd.kawase.uniforms.pixelOffset, 0.0); // No offset
			gl.uniform1f(ctx.shd.kawase.uniforms.bloomStrength, 1.0);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, ctx.tex.frame);
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		} else {
			/* Kawase Blur implementation - iterative ping-pong between framebuffers */
			gl.useProgram(ctx.shd.kawase.handle);
			gl.uniform2f(ctx.shd.kawase.uniforms.frameSizeRCP, 1.0 / 1600, 1.0 / 1200);
			gl.uniform1f(ctx.shd.kawase.uniforms.samplePosMult, samplePos);
			
			/* Apply distributed brightness, due to color precision limitations and multi pass nature of this blur algorithm */
			const distributedBrightness = Math.pow(1.0, 1.0 / kawaseIters);

			let currentInputTex = ctx.tex.frame;
			
			for (let i = 0; i < kawaseIters; i++) {
				/* Determine output framebuffer */
				let outputFB;
				if (i === kawaseIters - 1) {
					/* Last iteration - output to final destination */
					outputFB = null; // null = screen
				} else {
					/* Intermediate iterations - ping-pong between buffers */
					if (i % 2 === 0) {
						outputFB = ctx.fb.intermediate1;
					} else {
						outputFB = ctx.fb.intermediate2;
					}
				}

				/* Setup output framebuffer */
				gl.bindFramebuffer(gl.FRAMEBUFFER, outputFB);
				gl.viewport(0, 0, 1600, 1200);

				/* Bind input texture */
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, currentInputTex);

				/* Set pixel offset for this iteration */
				gl.uniform1f(ctx.shd.kawase.uniforms.pixelOffset, i);

				/* Apply distributed brightness */
				gl.uniform1f(ctx.shd.kawase.uniforms.bloomStrength, distributedBrightness);

				/* Draw */
				gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

				/* Setup for next iteration */
				if (i < kawaseIters - 1) {
					if (i % 2 === 0) {
						currentInputTex = ctx.tex.frameIntermediate1;
					} else {
						currentInputTex = ctx.tex.frameIntermediate2;
					}
				}
			}
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
	const kawaseIters = parseInt(kawaseIterations);
	/* Kawase blur: 4 samples per iteration, 0 iterations = no blur (1 sample) */
	const samplesPerPixel = kawaseIters === 0 ? 1 : kawaseIters * 4;
	const tapsCount = (1600 * 1200 * samplesPerPixel / 1000000).toFixed(1);
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
	gl.deleteFramebuffer(ctx.fb.intermediate1);
	gl.deleteFramebuffer(ctx.fb.intermediate2);
	gl.deleteTexture(ctx.tex.frame);
	gl.deleteTexture(ctx.tex.frameIntermediate1);
	gl.deleteTexture(ctx.tex.frameIntermediate2);
	gl.deleteProgram(ctx.shd.kawase.handle);
	gl.deleteProgram(ctx.shd.bg.handle);

	if (!ctx.flags.contextLoss)
		self.postMessage({ 
			type: "done", 
			benchText, 
			iterationText, 
			renderer, 
			tapsCount,
			kawaseIterations: kawaseIters
		});
});