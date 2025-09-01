import * as util from './utility.js'

export async function setupKawaseBlur() {
	/* Init */
	const WebGLBox = document.getElementById('WebGLBox-KawaseBlur');
	const canvas = WebGLBox.querySelector('canvas');

	/* Circle Rotation size */
	const radius = 0.12;

	/* Main WebGL 1.0 Context */
	const gl = canvas.getContext('webgl', {
		preserveDrawingBuffer: false,
		antialias: false,
		alpha: false,
	});

	/* State and Objects */
	const ctx = {
		/* State for of the Rendering */
		mode: "scene",
		flags: { isRendering: false, buffersInitialized: false, initComplete: false, benchMode: false },
		/* Textures */
		tex: { sdr: null, selfIllum: null, frame: null, frameIntermediate1: null, frameIntermediate2: null, frameFinal: null },
		/* Framebuffers */
		fb: { scene: null, intermediate1: null, intermediate2: null, final: null },
		/* Shaders and their respective Resource Locations */
		shd: {
			scene: { handle: null, uniforms: { offset: null, radius: null } },
			kawase: { handle: null, uniforms: { frameSizeRCP: null, samplePosMult: null, bloomStrength: null, pixelOffset: null } },
			bloom: { handle: null, uniforms: { offset: null, radius: null, texture: null, textureAdd: null } }
		}
	};

	/* UI Elements */
	const ui = {
		display: {
			spinner: canvas.parentElement.querySelector('svg', canvas.parentElement),
			contextLoss: canvas.parentElement.querySelector('div', canvas.parentElement),
			fps: WebGLBox.querySelector('#fps'),
			ms: WebGLBox.querySelector('#ms'),
			width: WebGLBox.querySelector('#width'),
			height: WebGLBox.querySelector('#height'),
			tapsCount: WebGLBox.querySelector('#taps'),
		},
		blur: {
			iterations: WebGLBox.querySelector('#iterationsRange'),
			samplePos: WebGLBox.querySelector('#samplePosRange'),
			samplePosReset: WebGLBox.querySelector('#samplePosRangeReset'),
		},
		rendering: {
			animate: WebGLBox.querySelector('#animateCheck'),
			modes: WebGLBox.querySelectorAll('input[name="modeKawase"]'),
			lightBrightness: WebGLBox.querySelector('#lightBrightness'),
			lightBrightnessReset: WebGLBox.querySelector('#lightBrightnessReset'),
		}
	};

	/* Shaders */
	const circleAnimation = await util.fetchShader("shader/circleAnimation.vs");
	const simpleTexture = await util.fetchShader("shader/simpleTexture.fs");
	const bloomVert = await util.fetchShader("shader/bloom.vs");
	const bloomFrag = await util.fetchShader("shader/bloom.fs");
	const simpleQuad = await util.fetchShader("shader/simpleQuad.vs");
	const kawaseFrag = await util.fetchShader("shader/kawase.fs");

	/* Elements that cause a redraw in the non-animation mode */
	ui.blur.iterations.addEventListener('input', () => { 
		// Lock/unlock samplePos based on iterations
		const iterations = parseInt(ui.blur.iterations.value);
		ui.blur.samplePos.disabled = iterations === 0;
		ui.blur.samplePosReset.disabled = iterations === 0;
		if (!ui.rendering.animate.checked) redraw() 
	});
	ui.blur.samplePos.addEventListener('input', () => { if (!ui.rendering.animate.checked) redraw() });
	ui.rendering.lightBrightness.addEventListener('input', () => { if (!ui.rendering.animate.checked) redraw() });

	/* Events */
	ui.rendering.animate.addEventListener("change", () => {
		if (ui.rendering.animate.checked)
			startRendering();
		else {
			ui.display.fps.value = "-";
			ui.display.ms.value = "-";
			ctx.flags.isRendering = false;
			redraw()
		}
	});

	canvas.addEventListener("webglcontextlost", () => {
		ui.display.contextLoss.style.display = "block";
	});

	/* Render Mode */
	ui.rendering.modes.forEach(radio => {
		/* Force set to scene to fix a reload bug in Firefox Android */
		if (radio.value === "scene")
			radio.checked = true;
		radio.addEventListener('change', (event) => {
			ctx.mode = event.target.value;
			ui.rendering.lightBrightness.disabled = ctx.mode === "scene";
			ui.rendering.lightBrightnessReset.disabled = ctx.mode === "scene";
			if (!ui.rendering.animate.checked) redraw();
		});
	});

	/* Draw Texture Shader */
	ctx.shd.scene = util.compileAndLinkShader(gl, circleAnimation, simpleTexture, ["offset", "radius"]);

	/* Draw bloom Shader */
	ctx.shd.bloom = util.compileAndLinkShader(gl, bloomVert, bloomFrag, ["texture", "textureAdd", "offset", "radius"]);

	/* Kawase Blur Shader */
	ctx.shd.kawase = util.compileAndLinkShader(gl, simpleQuad, kawaseFrag, ["frameSizeRCP", "samplePosMult", "pixelOffset", "bloomStrength"]);

	/* Send Unit code verts to the GPU */
	util.bindUnitQuad(gl);

	async function setupTextureBuffers() {
		ui.display.spinner.style.display = "block";
		ctx.flags.buffersInitialized = true;
		ctx.flags.initComplete = false;

		gl.deleteFramebuffer(ctx.fb.scene);
		gl.deleteFramebuffer(ctx.fb.intermediate1);
		gl.deleteFramebuffer(ctx.fb.intermediate2);
		gl.deleteFramebuffer(ctx.fb.final);
		[ctx.fb.scene, ctx.tex.frame] = util.setupFramebuffer(gl, canvas.width, canvas.height);
		[ctx.fb.intermediate1, ctx.tex.frameIntermediate1] = util.setupFramebuffer(gl, canvas.width, canvas.height);
		[ctx.fb.intermediate2, ctx.tex.frameIntermediate2] = util.setupFramebuffer(gl, canvas.width, canvas.height);
		[ctx.fb.final, ctx.tex.frameFinal] = util.setupFramebuffer(gl, canvas.width, canvas.height);

		// Clear intermediate textures to prevent lazy initialization warnings
		gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.intermediate1);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.intermediate2);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		let [base, selfIllum] = await Promise.all([
			fetch("/dual-kawase/img/SDR_No_Sprite.png"),
			fetch("/dual-kawase/img/Selfillumination.png")
		]);
		let [baseBlob, selfIllumBlob] = await Promise.all([base.blob(), selfIllum.blob()]);
		let [baseBitmap, selfIllumBitmap] = await Promise.all([
			createImageBitmap(baseBlob, { colorSpaceConversion: 'none', resizeWidth: canvas.width * 1.12, resizeHeight: canvas.height * 1.12, resizeQuality: "high" }),
			createImageBitmap(selfIllumBlob, { colorSpaceConversion: 'none', resizeWidth: canvas.width * 1.12, resizeHeight: canvas.height * 1.12, resizeQuality: "high" })
		]);

		ctx.tex.sdr = util.setupTexture(gl, null, null, ctx.tex.sdr, gl.LINEAR, baseBitmap);
		ctx.tex.selfIllum = util.setupTexture(gl, null, null, ctx.tex.selfIllum, gl.LINEAR, selfIllumBitmap);

		baseBitmap.close();
		selfIllumBitmap.close();

		ctx.flags.initComplete = true;
		ui.display.spinner.style.display = "none";
	}

	let prevNow = performance.now();
	let lastStatsUpdate = prevNow;
	let fpsEMA = 60;
	let msEMA = 16;

	async function redraw() {
		if (!ctx.flags.buffersInitialized)
			await setupTextureBuffers();
		if (!ctx.flags.initComplete)
			return;

		/* UI Stats */
		const iterations = parseInt(ui.blur.iterations.value);
		/* Kawase blur: 4 samples per iteration, 0 iterations = no blur (1 sample) */
		const samplesPerPixel = iterations === 0 ? 1 : iterations * 4;
		const tapsNewText = (canvas.width * canvas.height * samplesPerPixel / 1000000).toFixed(1) + " Million";
		ui.display.tapsCount.value = tapsNewText;
		ui.display.width.value = canvas.width;
		ui.display.height.value = canvas.height;

		/* Circle Motion */
		let radiusSwitch = ui.rendering.animate.checked ? radius : 0.0;
		let speed = (performance.now() / 10000) % Math.PI * 2;
		const offset = [radiusSwitch * Math.cos(speed), radiusSwitch * Math.sin(speed)];
		gl.useProgram(ctx.shd.scene.handle);
		const texture = ctx.mode == "scene" ? ctx.tex.sdr : ctx.tex.selfIllum;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform2fv(ctx.shd.scene.uniforms.offset, offset);
		gl.uniform1f(ctx.shd.scene.uniforms.radius, radiusSwitch);

		/* Setup PostProcess Framebuffer */
		gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.scene);
		gl.viewport(0, 0, canvas.width, canvas.height);

		/* Draw Call */
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		/* Handle 0 iterations case - direct copy to output */
		if (iterations === 0) {
			/* Direct copy from scene to final destination using Kawase shader with no offset */
			const finalFB = ctx.mode === "bloom" ? ctx.fb.final : null; // null = screen
			gl.bindFramebuffer(gl.FRAMEBUFFER, finalFB);
			gl.viewport(0, 0, canvas.width, canvas.height);
			
			/* Use Kawase shader with pixelOffset=0 and samplePosMult=0 for simple copy */
			gl.useProgram(ctx.shd.kawase.handle);
			gl.uniform2f(ctx.shd.kawase.uniforms.frameSizeRCP, 1.0 / canvas.width, 1.0 / canvas.height);
			gl.uniform1f(ctx.shd.kawase.uniforms.samplePosMult, 0.0); // No offset
			gl.uniform1f(ctx.shd.kawase.uniforms.pixelOffset, 0.0); // No offset
			gl.uniform1f(ctx.shd.kawase.uniforms.bloomStrength, ctx.mode == "scene" ? 1.0 : ui.rendering.lightBrightness.value);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, ctx.tex.frame);
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		} else {
			/* Kawase Blur implementation - iterative ping-pong between framebuffers */
			gl.useProgram(ctx.shd.kawase.handle);
			gl.uniform2f(ctx.shd.kawase.uniforms.frameSizeRCP, 1.0 / canvas.width, 1.0 / canvas.height);
			gl.uniform1f(ctx.shd.kawase.uniforms.samplePosMult, ui.blur.samplePos.value);
			
			/* Apply brightness only on final iteration to match Gaussian behavior */

			let currentInputTex = ctx.tex.frame;
			let currentInputFB = ctx.fb.scene;
			
			for (let i = 0; i < iterations; i++) {
			/* Determine output framebuffer */
			let outputFB, outputTex;
			if (i === iterations - 1) {
				/* Last iteration - output to final destination */
				outputFB = ctx.mode === "bloom" ? ctx.fb.final : null; // null = screen
			} else {
				/* Intermediate iterations - ping-pong between buffers */
				if (i % 2 === 0) {
					outputFB = ctx.fb.intermediate1;
					outputTex = ctx.tex.frameIntermediate1;
				} else {
					outputFB = ctx.fb.intermediate2;
					outputTex = ctx.tex.frameIntermediate2;
				}
			}

			/* Setup output framebuffer */
			gl.bindFramebuffer(gl.FRAMEBUFFER, outputFB);
			gl.viewport(0, 0, canvas.width, canvas.height);

			/* Bind input texture */
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, currentInputTex);

			/* Set pixel offset for this iteration */
			gl.uniform1f(ctx.shd.kawase.uniforms.pixelOffset, i);

			/* Apply distributed brightness, due to color precision limitations and multi pass nature of this blur algorithm */
			const finalBrightness = ctx.mode == "scene" ? 1.0 : ui.rendering.lightBrightness.value;
			const distributedBrightness = Math.pow(finalBrightness, 1.0 / iterations);
			gl.uniform1f(ctx.shd.kawase.uniforms.bloomStrength, distributedBrightness);

			/* Draw */
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

			/* Setup for next iteration */
			if (i < iterations - 1) {
				if (i % 2 === 0) {
					currentInputTex = ctx.tex.frameIntermediate1;
				} else {
					currentInputTex = ctx.tex.frameIntermediate2;
				}
			}
		}
		}

		if (ctx.mode == "bloom") {
			/* Now do the bloom composition to the screen */
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.useProgram(ctx.shd.bloom.handle);

			gl.uniform2fv(ctx.shd.bloom.uniforms.offset, offset);
			gl.uniform1f(ctx.shd.bloom.uniforms.radius, radiusSwitch);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, ctx.tex.sdr);
			gl.uniform1i(ctx.shd.bloom.uniforms.texture, 0);

			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, ctx.tex.frameFinal);
			gl.uniform1i(ctx.shd.bloom.uniforms.textureAdd, 1);

			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		}

		/* Ask for CPU-GPU Sync to prevent overloading the GPU during compositing.
		   In reality this is more likely to be flush, but still, it seems to
		   help on multiple devices with during low FPS */
		gl.finish();

		const now = performance.now();
		let dt = now - prevNow;

		if (dt > 0) {
			const instFPS = 1000 / dt;
			const ALPHA = 0.05;
			fpsEMA = ALPHA * instFPS + (1 - ALPHA) * fpsEMA;
			msEMA = ALPHA * dt + (1 - ALPHA) * msEMA;
		}
		prevNow = now;

		if (ui.rendering.animate.checked && now - lastStatsUpdate >= 1000) {
			ui.display.fps.value = fpsEMA.toFixed(0);
			ui.display.ms.value = msEMA.toFixed(2);
			lastStatsUpdate = now;
		}
	}

	let animationFrameId;

	/* Render at Native Resolution */
	function nativeResize() {
		const [width, height] = util.getNativeSize(canvas);

		if (width && canvas.width !== width || height && canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;

			if (!ctx.flags.benchMode) {
				stopRendering();
				startRendering();
			}
			if (!ui.rendering.animate.checked)
				redraw();
		}
	}

	/* Resize Event */
	nativeResize();

	let resizePending = false;
	window.addEventListener('resize', () => {
		if (!resizePending) {
			resizePending = true;
			requestAnimationFrame(() => {
				resizePending = false;
				nativeResize();
			});
		}
	});

	function renderLoop() {
		if (ctx.flags.isRendering && ui.rendering.animate.checked) {
			redraw();
			animationFrameId = requestAnimationFrame(renderLoop);
		}
	}

	function startRendering() {
		/* Start rendering, when canvas visible */
		ctx.flags.isRendering = true;
		renderLoop();
	}

	function stopRendering() {
		/* Stop another redraw being called */
		ctx.flags.isRendering = false;
		cancelAnimationFrame(animationFrameId);
		/* Force the rendering pipeline to sync with CPU before we mess with it */
		gl.finish();

		/* Delete the buffers to free up memory */
		gl.deleteTexture(ctx.tex.sdr); ctx.tex.sdr = null;
		gl.deleteTexture(ctx.tex.selfIllum); ctx.tex.selfIllum = null;
		gl.deleteTexture(ctx.tex.frame); ctx.tex.frame = null;
		gl.deleteTexture(ctx.tex.frameIntermediate1); ctx.tex.frameIntermediate1 = null;
		gl.deleteTexture(ctx.tex.frameIntermediate2); ctx.tex.frameIntermediate2 = null;
		gl.deleteTexture(ctx.tex.frameFinal); ctx.tex.frameFinal = null;
		gl.deleteFramebuffer(ctx.fb.scene); ctx.fb.scene = null;
		gl.deleteFramebuffer(ctx.fb.intermediate1); ctx.fb.intermediate1 = null;
		gl.deleteFramebuffer(ctx.fb.intermediate2); ctx.fb.intermediate2 = null;
		gl.deleteFramebuffer(ctx.fb.final); ctx.fb.final = null;
		ctx.flags.buffersInitialized = false;
		ctx.flags.initComplete = false;
		ui.display.fps.value = "-";
		ui.display.ms.value = "-";
	}

	function handleIntersection(entries) {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				if (!ctx.flags.isRendering && !ctx.flags.benchMode) startRendering();
			} else {
				stopRendering();
			}
		});
	}

	/* Initialize UI state */
	const initialIterations = parseInt(ui.blur.iterations.value);
	ui.blur.samplePos.disabled = initialIterations === 0;
	ui.blur.samplePosReset.disabled = initialIterations === 0;

	/* Only render when the canvas is actually on screen */
	let observer = new IntersectionObserver(handleIntersection);
	observer.observe(canvas);
}