"use strict";
import * as util from "./utility.js";

self.addEventListener("message", async (ev) => {
	const { blurShaderSrc, kernelSize, samplePos, sigma } = ev.data;

	const ctx = {
		tex: { sdr: null, selfIllum: null, frame: null },
		fb: { scene: null },
		shd: {
			handle: null, uniforms: { frameSizeRCP: null, samplePosMult: null, sigma: null }
		}
	};

	const canvas = new OffscreenCanvas(1600, 1200);
	const gl = canvas.getContext("webgl", {
		preserveDrawingBuffer: false,
		antialias: false,
		alpha: false
	});

	const simpleQuad = await util.fetchShader("../shader/simpleQuad.vs");
	const noiseFrag = await util.fetchShader("../shader/noise.fs");

	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, util.unitQuad, gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);

	/* Setup Buffers */
	gl.deleteFramebuffer(ctx.fb.scene);
	ctx.fb.scene = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.scene);
	ctx.tex.frame = util.setupTexture(gl, 1600, 1200, ctx.tex.frame, gl.NEAREST);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ctx.tex.frame, 0);
	gl.bindTexture(gl.TEXTURE_2D, ctx.tex.frame);

	const bgShd = util.compileAndLinkShader(gl, simpleQuad, noiseFrag);

	/* Blur Shader */
	ctx.shd.handle = util.compileAndLinkShader(gl, simpleQuad, blurShaderSrc, "#define KERNEL_SIZE " + kernelSize + '\n');
	ctx.shd.uniforms.frameSizeRCP = gl.getUniformLocation(ctx.shd.handle, "frameSizeRCP");
	ctx.shd.uniforms.samplePosMult = gl.getUniformLocation(ctx.shd.handle, "samplePosMult");
	ctx.shd.uniforms.sigma = gl.getUniformLocation(ctx.shd.handle, "sigma");

	gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.scene);
	gl.viewport(0, 0, 1600, 1200);
	gl.useProgram(bgShd);
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	
	gl.useProgram(ctx.shd.handle);
	gl.bindTexture(gl.TEXTURE_2D, ctx.tex.frame);
	gl.uniform2f(ctx.shd.uniforms.frameSizeRCP, 1.0 / 1600, 1.0 / 1200);
	gl.uniform1f(ctx.shd.uniforms.samplePosMult, samplePos);
	gl.uniform1f(ctx.shd.uniforms.sigma, sigma);
	
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

	/* ReadBack */
	const dummy = new Uint8Array(4);
	gl.readPixels(Math.random() * 512, Math.random() * 512, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dummy);

	/* debug */
	const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
	self.postMessage({ type: "done", blob });
});