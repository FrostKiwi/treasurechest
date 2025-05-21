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

	/* To be removed */
	const floatTest = document.getElementById('floatTest');
	const ext = gl.getExtension('OES_texture_float');
	floatTest.textContent = ext;

	/* State and Objects */
	const ctx = {
		/* State for of the Rendering */
		mode: "scene",
		flags: { isRendering: false, redrawActive: false, buffersInitialized: false, initComplete: false, benchMode: false },
		/* Textures */
		tex: { sdr: null, selfIllum: null, frame: null, frameFinal: null },
		/* Framebuffers */
		fb: { scene: null, final: null },
		/* Shaders and their respective Resource Locations */
		shd: {
			scene: { handle: null, uniforms: { offset: null, radius: null } },
			blur: { handle: null, uniforms: { frameSizeRCP: null, samplePosMult: null, sigma: null, bloomStrength: null } },
			bloom: { handle: null, uniforms: { offset: null, radius: null, tex0: null, tex1: null } }
		}
	};

	/* UI Elements */
	const ui = {
		samplePosRange: document.getElementById('samplePosRange'),
		sigmaRange: document.getElementById('sigmaRange'),
		kernelSizeRange: document.getElementById('boxKernelSizeRange'),
		animateCheckBox: document.getElementById('animateCheck_Boxblur'),
		benchmark: document.getElementById('benchmarkBoxBlur'),
		benchmarkLabel: document.getElementById('benchmarkBoxBlurLabel'),
		renderer: document.getElementById('rendererBox'),
		fps: document.getElementById('fpsBoxBlur'),
		ms: document.getElementById('msBoxBlur'),
		width: document.getElementById('widthBoxBlur'),
		height: document.getElementById('heightBoxBlur'),
		tapsCount: document.getElementById('tapsBoxBlur'),
		tapsCountBench: document.getElementById('tapsCountBenchBox'),
		iterOut: document.getElementById('iterOutBoxBlur'),
		spinner: canvas.parentElement.querySelector('svg'),
		contextLoss: document.getElementById('contextLoss'),
		bloomBrightnessRange: document.getElementById('bloomBrightnessRange'),
		iterTime: document.getElementById('iterTimeBox'),
		radios: document.querySelectorAll('input[name="modeBox"]'),
		debugIMG: document.getElementById('debugIMG'),
	};

	/* Shaders */
	const circleAnimation = await util.fetchShader("shader/circleAnimation.vs");
	const simpleTexture = await util.fetchShader("shader/simpleTexture.fs");
	const bloomVert = await util.fetchShader("shader/bloom.vs");
	const bloomFrag = await util.fetchShader("shader/bloom.fs");
	const simpleQuad = await util.fetchShader("shader/simpleQuad.vs");
	const boxBlurFrag = await util.fetchShader("shader/boxBlur.fs");

	/* Events */
	canvas.addEventListener("webglcontextlost", (e) => {
		ui.contextLoss.style.display = "block";
		e.preventDefault();
	});

	ui.kernelSizeRange.addEventListener('input', function () {
		reCompileBlurShader(ui.kernelSizeRange.value);
	});

	/* Render Mode */
	ui.radios.forEach(radio => {
		/* Force set to scene to fix a reload bug in Firefox Android */
		if (radio.value === "scene")
			radio.checked = true;
		radio.addEventListener('change', (event) => {
			ctx.mode = event.target.value;
		});
	});

	ui.benchmark.addEventListener("click", () => {
		ctx.flags.benchMode = true;
		stopRendering();
		ui.spinner.style.display = "block";
		ui.benchmark.disabled = true;

		/* spin up the Worker (ES-module) */
		const worker = new Worker("./js/benchmark.js", { type: "module" });

		/* pass all data the worker needs */
		worker.postMessage({
			iterations: ui.iterOut.value,
			blurShaderSrc: boxBlurFrag,
			kernelSize: ui.kernelSizeRange.value,
			samplePos: ui.samplePosRange.value,
			sigma: ui.sigmaRange.value
		});

		/* Benchmark */
		worker.addEventListener("message", (ev) => {
			if (ev.data.type !== "done") return;

			ui.benchmarkLabel.textContent = ev.data.benchText;
			ui.tapsCountBench.textContent = ev.data.tapsCount;
			ui.iterTime.textContent = ev.data.iterationText;
			ui.renderer.textContent = ev.data.renderer;
			if (ev.data.blob) {
				ui.debugIMG.src = URL.createObjectURL(ev.data.blob);
			}

			worker.terminate();
			startRendering();
			ui.benchmark.disabled = false;
			ctx.flags.benchMode = false;
		});
	});

	/* Draw Texture Shader */
	ctx.shd.scene.handle = util.compileAndLinkShader(gl, circleAnimation, simpleTexture);
	ctx.shd.scene.uniforms.offset = gl.getUniformLocation(ctx.shd.scene.handle, "offset");
	ctx.shd.scene.uniforms.radius = gl.getUniformLocation(ctx.shd.scene.handle, "radius");

	/* Draw bloom Shader */
	ctx.shd.bloom.handle = util.compileAndLinkShader(gl, bloomVert, bloomFrag);
	ctx.shd.bloom.uniforms.tex0 = gl.getUniformLocation(ctx.shd.bloom.handle, "texture");
	ctx.shd.bloom.uniforms.tex1 = gl.getUniformLocation(ctx.shd.bloom.handle, "textureAdd");
	ctx.shd.bloom.uniforms.offset = gl.getUniformLocation(ctx.shd.bloom.handle, "offset");
	ctx.shd.bloom.uniforms.radius = gl.getUniformLocation(ctx.shd.bloom.handle, "radius");

	/* Helper for recompilation */
	function reCompileBlurShader(blurSize) {
		ctx.shd.blur.handle = util.compileAndLinkShader(gl, simpleQuad, boxBlurFrag, "#define KERNEL_SIZE " + blurSize + '\n');
		ctx.shd.blur.uniforms.frameSizeRCP = gl.getUniformLocation(ctx.shd.blur.handle, "frameSizeRCP");
		ctx.shd.blur.uniforms.samplePosMult = gl.getUniformLocation(ctx.shd.blur.handle, "samplePosMult");
		ctx.shd.blur.uniforms.bloomStrength = gl.getUniformLocation(ctx.shd.blur.handle, "bloomStrength");
		ctx.shd.blur.uniforms.sigma = gl.getUniformLocation(ctx.shd.blur.handle, "sigma");
	}

	/* Blur Shader */
	reCompileBlurShader(ui.kernelSizeRange.value)

	/* Send Unit code verts to the GPU */
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, util.unitQuad, gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);

	async function setupTextureBuffers() {
		ui.spinner.style.display = "block";
		ctx.flags.buffersInitialized = true;
		ctx.flags.initComplete = false;
		/* Setup Buffers */
		gl.deleteFramebuffer(ctx.fb.scene);
		gl.deleteFramebuffer(ctx.fb.final);
		ctx.fb.scene = gl.createFramebuffer();
		ctx.fb.final = gl.createFramebuffer();

		ctx.tex.frame = util.setupTexture(gl, canvas.width, canvas.height, ctx.tex.frame, gl.NEAREST);
		ctx.tex.frameFinal = util.setupTexture(gl, canvas.width, canvas.height, ctx.tex.frameFinal, gl.NEAREST);
		gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.scene);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ctx.tex.frame, 0);
		gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.final);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ctx.tex.frameFinal, 0);

		/* Setup textures */
		let [base, selfIllum] = await Promise.all([
			fetch("/dual-kawase/img/SDR_No_Sprite.png"),
			fetch("/dual-kawase/img/Selfillumination.png")
		]);
		let [baseBlob, selfIllumBlob] = await Promise.all([
			base.blob(),
			selfIllum.blob()
		]);
		/* We the browser pre-filter the textures what correspond to 1:1 pixel
		   mapping. This to side-step MipMaps, as we need just a simple demo.
		   Otherwise, aliasing messes with what the article tries to explain */
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

	function redraw() {
		ctx.flags.redrawActive = true;
		if (!ctx.flags.buffersInitialized) {
			setupTextureBuffers();
		}
		if (!ctx.flags.initComplete) {
			ctx.flags.redrawActive = false;
			return;
		}

		/* UI Stats */
		const KernelSizeSide = ui.kernelSizeRange.value * 2 + 1;
		const tapsNewText = (canvas.width * canvas.height * KernelSizeSide * KernelSizeSide / 1000000).toFixed(1) + " Million";
		if (ui.tapsCount.value != tapsNewText)
			ui.tapsCount.value = tapsNewText;

		/* Circle Motion */
		var radiusSwitch = ui.animateCheckBox.checked ? radius : 0.0;
		var speed = (performance.now() / 10000) % Math.PI * 2;
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
		gl.uniform1f(ctx.shd.blur.uniforms.sigma, ui.sigmaRange.value);

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
			gl.uniform1i(ctx.shd.bloom.uniforms.tex0, 0);

			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, ctx.tex.frameFinal);
			gl.uniform1i(ctx.shd.bloom.uniforms.tex1, 1);

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

		if (now - lastStatsUpdate >= 1000) {
			ui.fps.value = fpsEMA.toFixed(0);
			ui.ms.value = msEMA.toFixed(2);
			lastStatsUpdate = now;
		}

		ctx.flags.redrawActive = false;
	}
	let animationFrameId;

	/* Render at Native Resolution */
	function nativeResize() {
		const [width, height] = util.getNativeSize(canvas);

		if (width && canvas.width !== width || height && canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;

			/* Report in UI */
			ui.width.value = width;
			ui.height.value = height;

			if (!ctx.flags.benchMode) {
				stopRendering();
				startRendering();
			}
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

	function renderLoop() {
		if (ctx.flags.isRendering) {
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
		while (ctx.flags.redrawActive) {
			/* Spin on draw calls being processed. To simplify sync.
			   In reality this code is block is never reached, but just
			   in case, we have this here. */
		}
		/* Force the rendering pipeline to sync with CPU before we mess with it */
		gl.finish();

		/* Delete the buffers to free up memory */
		gl.deleteTexture(ctx.tex.sdr);
		gl.deleteTexture(ctx.tex.selfIllum);
		gl.deleteTexture(ctx.tex.frame);
		gl.deleteTexture(ctx.tex.frameFinal);
		gl.deleteFramebuffer(ctx.fb.scene);
		gl.deleteFramebuffer(ctx.fb.final);
		ctx.flags.buffersInitialized = false;
		ctx.flags.initComplete = false;
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