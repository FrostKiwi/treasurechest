import * as util from '../utility.js'

export async function setupGaussianSeparableBlur() {
	/* Init */
	const WebGLBox = document.getElementById('WebGLBox-GaussianSeparableBlur');
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
		passMode: "pass1",
		flags: { isRendering: false, buffersInitialized: false, initComplete: false, benchMode: false },
		/* Textures */
		tex: { sdr: null, selfIllum: null, frame: null, frameIntermediate: null, frameFinal: null },
		/* Framebuffers */
		fb: { scene: null, intermediate: null, final: null },
		/* Shaders and their respective Resource Locations */
		shd: {
			scene: { handle: null, uniforms: { offset: null, radius: null } },
			blur: { handle: null, uniforms: { frameSizeRCP: null, samplePosMult: null, sigma: null, bloomStrength: null, direction: null } },
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
			kernelSize: WebGLBox.querySelector('#sizeRange'),
			sigma: WebGLBox.querySelector('#sigmaRange'),
			samplePos: WebGLBox.querySelector('#samplePosRange'),
			samplePosReset: WebGLBox.querySelector('#samplePosRangeReset'),
		},
		rendering: {
			animate: WebGLBox.querySelector('#animateCheck'),
			modes: WebGLBox.querySelectorAll('input[name="modeGaussSep"]'),
			passModes: WebGLBox.querySelectorAll('input[name="passMode"]'),
			lightBrightness: WebGLBox.querySelector('#lightBrightness'),
			lightBrightnessReset: WebGLBox.querySelector('#lightBrightnessReset'),
		},
		benchmark: {
			button: WebGLBox.querySelector('#benchmark'),
			label: WebGLBox.querySelector('#benchmarkLabel'),
			iterOut: WebGLBox.querySelector('#iterOut'),
			renderer: document.getElementById('WebGLBox-GaussianSeparableBlurDetail').querySelector('#renderer'),
			passMode: document.getElementById('WebGLBox-GaussianSeparableBlurDetail').querySelector('#passMode'),
			iterTime: document.getElementById('WebGLBox-GaussianSeparableBlurDetail').querySelector('#iterTime'),
			tapsCount: document.getElementById('WebGLBox-GaussianSeparableBlurDetail').querySelector('#tapsCountBench'),
			iterations: WebGLBox.querySelector('#iterations')
		}
	};

	/* Shaders */
	const circleAnimation = await util.fetchShader("shader/circleAnimation.vs");
	const simpleTexture = await util.fetchShader("shader/simpleTexture.fs");
	const bloomVert = await util.fetchShader("shader/bloom.vs");
	const bloomFrag = await util.fetchShader("shader/bloom.fs");
	const simpleQuad = await util.fetchShader("shader/simpleQuad.vs");
	const gaussianBlurFrag = await util.fetchShader("shader/gaussianBlurSeparable.fs");

	/* Elements that cause a redraw in the non-animation mode */
	ui.blur.kernelSize.addEventListener('input', () => { if (!ui.rendering.animate.checked) redraw() });
	ui.blur.sigma.addEventListener('input', () => { if (!ui.rendering.animate.checked) redraw() });
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

	ui.blur.kernelSize.addEventListener('input', () => {
		reCompileBlurShader(ui.blur.kernelSize.value);
		ui.blur.samplePos.disabled = ui.blur.kernelSize.value == 0;
		ui.blur.samplePosReset.disabled = ui.blur.kernelSize.value == 0;
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
	
	/* Pass Mode */
	ui.rendering.passModes.forEach(radio => {
		/* Force set to pass1 to fix a reload bug in Firefox Android */
		if (radio.value === "pass1")
			radio.checked = true;
		radio.addEventListener('change', (event) => {
			ctx.passMode = event.target.value;
			if (!ui.rendering.animate.checked) redraw();
		});
	});

	ui.benchmark.button.addEventListener("click", () => {
		ctx.flags.benchMode = true;
		stopRendering();
		ui.display.spinner.style.display = "block";
		ui.benchmark.button.disabled = true;

		/* spin up the Worker (ES-module) */
		const worker = new Worker("./js/benchmark/gaussianSeparableBlurBenchmark.js", { type: "module" });

		/* pass all data the worker needs */
		worker.postMessage({
			iterations: ui.benchmark.iterOut.value,
			blurShaderSrc: gaussianBlurFrag,
			kernelSize: ui.blur.kernelSize.value,
			samplePos: ui.blur.samplePos.value,
			sigma: ui.blur.sigma.value,
			passMode: ctx.passMode
		});

		/* Benchmark */
		worker.addEventListener("message", (event) => {
			if (event.data.type !== "done") return;

			ui.benchmark.label.textContent = event.data.benchText;
			ui.benchmark.tapsCount.textContent = event.data.tapsCount;
			ui.benchmark.iterTime.textContent = event.data.iterationText;
			ui.benchmark.renderer.textContent = event.data.renderer;
			ui.benchmark.passMode.textContent = event.data.passMode;

			worker.terminate();
			ui.benchmark.button.disabled = false;
			ctx.flags.benchMode = false;
			if (ui.rendering.animate.checked)
				startRendering();
			else
				redraw();
		});
	});

	ui.benchmark.iterations.addEventListener("change", (event) => {
		ui.benchmark.iterOut.value = event.target.value;
		ui.benchmark.label.textContent = "Benchmark";
	});

	/* Draw Texture Shader */
	ctx.shd.scene = util.compileAndLinkShader(gl, circleAnimation, simpleTexture, ["offset", "radius"]);

	/* Draw bloom Shader */
	ctx.shd.bloom = util.compileAndLinkShader(gl, bloomVert, bloomFrag, ["texture", "textureAdd", "offset", "radius"]);


	/* Helper for recompilation */
	function reCompileBlurShader(blurSize) {
		ctx.shd.blur = util.compileAndLinkShader(gl, simpleQuad, gaussianBlurFrag, ["frameSizeRCP", "samplePosMult", "bloomStrength", "sigma", "direction"], "#define KERNEL_SIZE " + blurSize + '\n');
	}

	/* Blur Shader */
	reCompileBlurShader(ui.blur.kernelSize.value)

	/* Send Unit code verts to the GPU */
	util.bindUnitQuad(gl);

	async function setupTextureBuffers() {
		ui.display.spinner.style.display = "block";
		ctx.flags.buffersInitialized = true;
		ctx.flags.initComplete = false;

		gl.deleteFramebuffer(ctx.fb.scene);
		gl.deleteFramebuffer(ctx.fb.intermediate);
		gl.deleteFramebuffer(ctx.fb.final);
		[ctx.fb.scene, ctx.tex.frame] = util.setupFramebuffer(gl, canvas.width, canvas.height);
		[ctx.fb.intermediate, ctx.tex.frameIntermediate] = util.setupFramebuffer(gl, canvas.width, canvas.height);
		[ctx.fb.final, ctx.tex.frameFinal] = util.setupFramebuffer(gl, canvas.width, canvas.height);

		// Clear intermediate texture to prevent lazy initialization warnings
		gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.intermediate);
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
		const KernelSizeSide = ui.blur.kernelSize.value * 2 + 1;
		/* Separable blur: pass1/pass2 = 1 pass, combined = 2 passes */
		const samplesPerPixel = ctx.passMode == "combined" ? KernelSizeSide * 2 : KernelSizeSide;
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

		/* Separable Gaussian blur implementation */
		gl.useProgram(ctx.shd.blur.handle);
		
		if (ctx.passMode == "pass1") {
			/* Pass 1 only: Horizontal blur directly to screen */
			const finalFB = ctx.mode == "bloom" ? ctx.fb.final : null;
			gl.bindFramebuffer(gl.FRAMEBUFFER, finalFB);
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.uniform1f(ctx.shd.blur.uniforms.bloomStrength, ctx.mode == "scene" ? 1.0 : ui.rendering.lightBrightness.value);
			gl.uniform2f(ctx.shd.blur.uniforms.direction, 1.0, 0.0); // Horizontal direction
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, ctx.tex.frame);
			gl.uniform2f(ctx.shd.blur.uniforms.frameSizeRCP, 1.0 / canvas.width, 1.0 / canvas.height);
			gl.uniform1f(ctx.shd.blur.uniforms.samplePosMult, ui.blur.samplePos.value);
			gl.uniform1f(ctx.shd.blur.uniforms.sigma, Math.max(ui.blur.kernelSize.value / ui.blur.sigma.value, 0.001));
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		} else if (ctx.passMode == "pass2") {
			/* Pass 2 only: Vertical blur directly to screen */
			const finalFB = ctx.mode == "bloom" ? ctx.fb.final : null;
			gl.bindFramebuffer(gl.FRAMEBUFFER, finalFB);
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.uniform1f(ctx.shd.blur.uniforms.bloomStrength, ctx.mode == "scene" ? 1.0 : ui.rendering.lightBrightness.value);
			gl.uniform2f(ctx.shd.blur.uniforms.direction, 0.0, 1.0); // Vertical direction
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, ctx.tex.frame);
			gl.uniform2f(ctx.shd.blur.uniforms.frameSizeRCP, 1.0 / canvas.width, 1.0 / canvas.height);
			gl.uniform1f(ctx.shd.blur.uniforms.samplePosMult, ui.blur.samplePos.value);
			gl.uniform1f(ctx.shd.blur.uniforms.sigma, Math.max(ui.blur.kernelSize.value / ui.blur.sigma.value, 0.001));
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		} else {
			/* Combined: Two-pass separable blur */
			/* Pass 1: Horizontal blur to intermediate buffer */
			gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.intermediate);
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.uniform1f(ctx.shd.blur.uniforms.bloomStrength, ctx.mode == "scene" ? 1.0 : ui.rendering.lightBrightness.value);
			gl.uniform2f(ctx.shd.blur.uniforms.direction, 1.0, 0.0); // Horizontal direction
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, ctx.tex.frame);
			gl.uniform2f(ctx.shd.blur.uniforms.frameSizeRCP, 1.0 / canvas.width, 1.0 / canvas.height);
			gl.uniform1f(ctx.shd.blur.uniforms.samplePosMult, ui.blur.samplePos.value);
			gl.uniform1f(ctx.shd.blur.uniforms.sigma, Math.max(ui.blur.kernelSize.value / ui.blur.sigma.value, 0.001));
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
			
			/* Pass 2: Vertical blur to final destination */
			const finalFB = ctx.mode == "bloom" ? ctx.fb.final : null;
			gl.bindFramebuffer(gl.FRAMEBUFFER, finalFB);
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.uniform1f(ctx.shd.blur.uniforms.bloomStrength, ctx.mode == "scene" ? 1.0 : ui.rendering.lightBrightness.value);
			gl.uniform2f(ctx.shd.blur.uniforms.direction, 0.0, 1.0); // Vertical direction
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, ctx.tex.frameIntermediate);
			gl.uniform2f(ctx.shd.blur.uniforms.frameSizeRCP, 1.0 / canvas.width, 1.0 / canvas.height);
			gl.uniform1f(ctx.shd.blur.uniforms.samplePosMult, ui.blur.samplePos.value);
			gl.uniform1f(ctx.shd.blur.uniforms.sigma, Math.max(ui.blur.kernelSize.value / ui.blur.sigma.value, 0.001));
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
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
		gl.deleteTexture(ctx.tex.frameIntermediate); ctx.tex.frameIntermediate = null;
		gl.deleteTexture(ctx.tex.frameFinal); ctx.tex.frameFinal = null;
		gl.deleteFramebuffer(ctx.fb.scene); ctx.fb.scene = null;
		gl.deleteFramebuffer(ctx.fb.intermediate); ctx.fb.intermediate = null;
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

	/* Only render when the canvas is actually on screen */
	let observer = new IntersectionObserver(handleIntersection);
	observer.observe(canvas);
}