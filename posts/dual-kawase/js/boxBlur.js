import * as util from './utility.js'

export async function setupBoxBlur() {
	/* Init */
	const canvas = document.getElementById('canvasBoxBlur');

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
		tex: { sdr: null, selfIllum: null, frame: null, frameFinal: null },
		/* Framebuffers */
		fb: { scene: null, final: null },
		/* Shaders and their respective Resource Locations */
		shd: {
			scene: { handle: null, uniforms: { offset: null, radius: null } },
			passthrough: { handle: null },
			blur: { handle: null, uniforms: { frameSizeRCP: null, samplePosMult: null, sigma: null, bloomStrength: null } },
			bloom: { handle: null, uniforms: { offset: null, radius: null, texture: null, textureAdd: null } }
		}
	};

	/* UI Elements */
	const ui = {
		samplePosRange: document.getElementById('samplePosRange'),
		sigmaRange: document.getElementById('sigmaRangeGauss'),
		stats: {
			fps: document.getElementById('fpsBoxBlur'),
			ms: document.getElementById('msBoxBlur'),
			width: document.getElementById('widthBoxBlur'),
			height: document.getElementById('heightBoxBlur'),
			tapsCount: document.getElementById('tapsBoxBlur'),
		},
		kernelSizeSlider: document.getElementById('boxKernelSizeRange'),
		animate: document.getElementById('animateCheck_Boxblur'),
		downSampleRange: document.getElementById('downSampleRange'),
		spinner: canvas.parentElement.querySelector('svg'),
		contextLoss: document.getElementById('contextLoss'),
		bloomBrightnessRange: document.getElementById('bloomBrightnessRange'),
		radios: document.querySelectorAll('input[name="modeBox"]'),
		benchmark: {
			label: document.getElementById('benchmarkBoxBlurLabel'),
			iterOut: document.getElementById('iterOutBoxBlur'),
			button: document.getElementById('benchmarkBoxBlur'),
			renderer: document.getElementById('rendererBox'),
			iterTime: document.getElementById('iterTimeBox'),
			debugIMG: document.getElementById('debugIMG'),
			tapsCount: document.getElementById('tapsCountBenchBox')
		}
	};

	/* Shaders */
	const circleAnimation = await util.fetchShader("shader/circleAnimation.vs");
	const simpleTexture = await util.fetchShader("shader/simpleTexture.fs");
	const bloomVert = await util.fetchShader("shader/bloom.vs");
	const bloomFrag = await util.fetchShader("shader/bloom.fs");
	const simpleQuad = await util.fetchShader("shader/simpleQuad.vs");
	const boxBlurFrag = await util.fetchShader("shader/boxBlur.fs");
	const gaussianBlurFrag = await util.fetchShader("shader/gaussianBlur.fs");

	/* Elements that cause a redraw in the non-animation mode */
	ui.kernelSizeSlider.addEventListener('input', () => { if (!ui.animate.checked) redraw() });
	ui.sigmaRange.addEventListener('input', () => { if (!ui.animate.checked) redraw() });
	ui.samplePosRange.addEventListener('input', () => { if (!ui.animate.checked) redraw() });
	ui.bloomBrightnessRange.addEventListener('input', () => { if (!ui.animate.checked) redraw() });
	ui.downSampleRange.addEventListener('input', () => { if (!ui.animate.checked) redraw() });

	/* Events */
	ui.animate.addEventListener("change", () => {
		if (ui.animate.checked)
			startRendering();
		else {
			ui.stats.fps.value = "-";
			ui.stats.ms.value = "-";
			ctx.flags.isRendering = false;
			redraw()
		}
	});

	canvas.addEventListener("webglcontextlost", () => {
		ui.contextLoss.style.display = "block";
	});

	ui.kernelSizeSlider.addEventListener('input', () => {
		reCompileBlurShader(ui.kernelSizeSlider.value);
	});

	/* Render Mode */
	ui.radios.forEach(radio => {
		/* Force set to scene to fix a reload bug in Firefox Android */
		if (radio.value === "scene")
			radio.checked = true;
		radio.addEventListener('change', (event) => {
			ctx.mode = event.target.value;
			if (!ui.animate.checked) redraw();
		});
	});

	ui.benchmark.button.addEventListener("click", () => {
		ctx.flags.benchMode = true;
		stopRendering();
		ui.spinner.style.display = "block";
		ui.benchmark.button.disabled = true;

		/* spin up the Worker (ES-module) */
		const worker = new Worker("./js/benchmark.js", { type: "module" });

		/* pass all data the worker needs */
		worker.postMessage({
			iterations: ui.benchmark.iterOut.value,
			blurShaderSrc: gaussianBlurFrag,
			kernelSize: ui.kernelSizeSlider.value,
			samplePos: ui.samplePosRange.value,
			sigma: ui.kernelSizeSlider.value / ui.sigmaRange.value
		});

		/* Benchmark */
		worker.addEventListener("message", (event) => {
			if (event.data.type !== "done") return;

			ui.benchmark.label.textContent = event.data.benchText;
			ui.benchmark.tapsCount.textContent = event.data.tapsCount;
			ui.benchmark.iterTime.textContent = event.data.iterationText;
			ui.benchmark.renderer.textContent = event.data.renderer;
			if (event.data.blob) {
				ui.benchmark.debugIMG.src = URL.createObjectURL(event.data.blob);
			}

			worker.terminate();
			ui.benchmark.button.disabled = false;
			ctx.flags.benchMode = false;
			if (ui.animate.checked)
				startRendering();
			else
				redraw();
		});
	});

	/* Draw Texture Shader */
	ctx.shd.scene = util.compileAndLinkShader(gl, circleAnimation, simpleTexture, ["offset", "radius"]);

	/* Draw bloom Shader */
	ctx.shd.bloom = util.compileAndLinkShader(gl, bloomVert, bloomFrag, ["texture", "textureAdd", "offset", "radius"]);

	/* Simple Passthrough */
	ctx.shd.passthrough = util.compileAndLinkShader(gl, simpleQuad, simpleTexture);

	/* Helper for recompilation */
	function reCompileBlurShader(blurSize) {
		ctx.shd.blur = util.compileAndLinkShader(gl, simpleQuad, gaussianBlurFrag, ["frameSizeRCP", "samplePosMult", "bloomStrength", "sigma"], "#define KERNEL_SIZE " + blurSize + '\n');
	}

	/* Blur Shader */
	reCompileBlurShader(ui.kernelSizeSlider.value)

	/* Send Unit code verts to the GPU */
	util.bindUnitQuad(gl);

	async function setupTextureBuffers() {
		ui.spinner.style.display = "block";
		ctx.flags.buffersInitialized = true;
		ctx.flags.initComplete = false;

		/* Setup Buffers */
		gl.deleteFramebuffer(ctx.fb.scene);
		gl.deleteFramebuffer(ctx.fb.final);
		[ctx.fb.scene, ctx.tex.frame] = util.setupFramebuffer(gl, canvas.width, canvas.height);
		[ctx.fb.final, ctx.tex.frameFinal] = util.setupFramebuffer(gl, canvas.width, canvas.height);

		/* Setup textures */
		let [base, selfIllum] = await Promise.all([
			fetch("/dual-kawase/img/SDR_No_Sprite.png"),
			fetch("/dual-kawase/img/Selfillumination.png")
		]);
		let [baseBlob, selfIllumBlob] = await Promise.all([
			base.blob(),
			selfIllum.blob()
		]);
		/* We the browser pre-filter the textures what corresponds to 1:1 pixel
		   mapping. This to side-step MipMaps, as we need just a simple demo.
		   Otherwise, aliasing messes with what the article tries to explain. */
		let [baseBitmap, selfIllumBitmap] = await Promise.all([
			createImageBitmap(baseBlob, { colorSpaceConversion: 'none', resizeWidth: canvas.width * (1.0 + radius), resizeHeight: canvas.height * (1.0 + radius), resizeQuality: "high" }),
			createImageBitmap(selfIllumBlob, { colorSpaceConversion: 'none', resizeWidth: canvas.width * (1.0 + radius), resizeHeight: canvas.height * (1.0 + radius), resizeQuality: "high" })
		]);
		ctx.tex.sdr = util.setupTexture(gl, null, null, ctx.tex.sdr, gl.LINEAR, baseBitmap);
		ctx.tex.selfIllum = util.setupTexture(gl, null, null, ctx.tex.selfIllum, gl.LINEAR, selfIllumBitmap);
		baseBitmap.close();
		selfIllumBitmap.close();
		ctx.flags.initComplete = true;
		ui.spinner.style.display = "none";
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
		const KernelSizeSide = ui.kernelSizeSlider.value * 2 + 1;
		const tapsNewText = (canvas.width * canvas.height * KernelSizeSide * KernelSizeSide / 1000000).toFixed(1) + " Million";
		if (ui.stats.tapsCount.value != tapsNewText)
			ui.stats.tapsCount.value = tapsNewText;

		/* Circle Motion */
		let radiusSwitch = ui.animate.checked ? radius : 0.0;
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

		/* Setup Blur to Buffer */
		gl.useProgram(ctx.shd.blur.handle);
		if (ctx.mode == "bloom")
			gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.final);
		else
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		if (ctx.mode == "scene")
			gl.uniform1f(ctx.shd.blur.uniforms.bloomStrength, 1.0);
		else
			gl.uniform1f(ctx.shd.blur.uniforms.bloomStrength, ui.bloomBrightnessRange.value);
		gl.bindTexture(gl.TEXTURE_2D, ctx.tex.frame);

		gl.uniform2f(ctx.shd.blur.uniforms.frameSizeRCP, 1.0 / canvas.width, 1.0 / canvas.height);
		gl.uniform1f(ctx.shd.blur.uniforms.samplePosMult, ui.samplePosRange.value);
		gl.uniform1f(ctx.shd.blur.uniforms.sigma, ui.kernelSizeSlider.value / ui.sigmaRange.value);

		/* Drawcall */
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		/* Output to the Screen */
		if (ctx.mode == "bloom") {
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

		if (ui.animate.checked && now - lastStatsUpdate >= 1000) {
			ui.stats.fps.value = fpsEMA.toFixed(0);
			ui.stats.ms.value = msEMA.toFixed(2);
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

			/* Report in UI */
			ui.stats.width.value = width;
			ui.stats.height.value = height;

			if (!ctx.flags.benchMode) {
				stopRendering();
				startRendering();
			}
			if (!ui.animate.checked)
				redraw();
		}
	}

	/* Resize Event */
	let resizeTimer = null;
	function onResize() {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => { nativeResize(); }, 100);
	}

	window.addEventListener('resize', onResize, true);
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
		if (ctx.flags.isRendering && ui.animate.checked) {
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
		gl.deleteTexture(ctx.tex.frameFinal); ctx.tex.frameFinal = null;
		gl.deleteFramebuffer(ctx.fb.scene); ctx.fb.scene = null;
		gl.deleteFramebuffer(ctx.fb.final); ctx.fb.final = null;
		ctx.flags.buffersInitialized = false;
		ctx.flags.initComplete = false;
		ui.stats.fps.value = "-";
		ui.stats.ms.value = "-";
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