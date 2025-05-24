"use strict";
import * as util from "./utility.js";

self.addEventListener("message", async (ev) => {
	const { iterations, blurShaderSrc, kernelSize, samplePos, sigma } = ev.data;

	const ctx = {
		flags: { contextLoss: false },
		tex: { sdr: null, selfIllum: null, frame: null },
		fb: { scene: null },
		shd: {
			blur: {
				handle: null, uniforms: { frameSizeRCP: null, samplePosMult: null, sigma: null, bloomStrength: null }
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
			blob: null,
			benchText: "Benchmark Canceled",
			renderer: "⚠ WebGL Context Lost, use a smaller iteration count! " + renderer
		});
		self.close();
	});

	const testPixel = new Uint8Array(4);

	const simpleQuad = await util.fetchShader("../shader/simpleQuad.vs");
	const noiseFrag = await util.fetchShader("../shader/noise.fs");

	const quadBuffer = util.bindUnitQuad(gl);

	/* Setup Buffers */
	gl.deleteFramebuffer(ctx.fb.scene);
	[ctx.fb.scene, ctx.tex.frame] = util.setupFramebuffer(gl, 1600, 1200);

	ctx.shd.bg = util.compileAndLinkShader(gl, simpleQuad, noiseFrag);

	/* Blur Shader */
	ctx.shd.blur = util.compileAndLinkShader(gl, simpleQuad, blurShaderSrc, ["samplePosMult", "bloomStrength", "frameSizeRCP", "sigma"], "#define KERNEL_SIZE " + kernelSize + '\n');

	gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.scene);
	gl.viewport(0, 0, 1600, 1200);
	gl.useProgram(ctx.shd.bg.handle);
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	/* Run a draw Call with the blur Shader to ensure it's loaded */
	gl.useProgram(ctx.shd.blur.handle);
	gl.bindTexture(gl.TEXTURE_2D, ctx.tex.frame);
	gl.uniform2f(ctx.shd.blur.uniforms.frameSizeRCP, 1.0 / 1600, 1.0 / 1200);
	gl.uniform1f(ctx.shd.blur.uniforms.samplePosMult, samplePos);
	gl.uniform1f(ctx.shd.blur.uniforms.bloomStrength, 1.0);
	gl.uniform1f(ctx.shd.blur.uniforms.sigma, sigma);

	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

	/* Make sure the Command Queue is empty */;
	gl.readPixels(Math.random() * 512, Math.random() * 512, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, testPixel);

	/* Measure the rough length of a pixel Readback */
	const readPixelsTimeStart = performance.now();
	for (let x = 0; x < 10; x++)
		gl.readPixels(Math.random() * 512, Math.random() * 512, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, testPixel);
	const readPixelsTimeEnd = performance.now();

	/* Warm Up the pipeline */
	for (let x = 0; x < iterations / 10; x++)
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	gl.readPixels(Math.random() * 512, Math.random() * 512, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, testPixel);

	/* Measure blur iterations */
	const benchNow = performance.now()
	for (let x = 0; x < iterations; x++)
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	gl.readPixels(Math.random() * 512, Math.random() * 512, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, testPixel);

	/* Display results */
	const kernelSizeSide = kernelSize * 2 + 1;
	const tapsCount = (1600 * 1200 * kernelSizeSide * kernelSizeSide / 1000000).toFixed(1);
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
	gl.deleteProgram(ctx.shd.blur.handle);
	gl.deleteProgram(ctx.shd.bg.handle);

	/* debug */
	const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
	if (!ctx.flags.contextLoss)
		self.postMessage({ type: "done", blob, benchText, iterationText, renderer, tapsCount });
});