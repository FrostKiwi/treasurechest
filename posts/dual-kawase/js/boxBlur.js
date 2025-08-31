import * as util from './utility.js'

export async function setupBoxBlur() {
	/* Init */
	const WebGLBox = document.getElementById('WebGLBox-BoxBlur');
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
		tex: { sdr: null, selfIllum: null, frame: null, frameFinal: null },
		/* Framebuffers */
		fb: { scene: null, final: null },
		/* Shaders and their respective Resource Locations */
		shd: {
			scene: { handle: null, uniforms: { offset: null, radius: null } },
			blur: { handle: null, uniforms: { frameSizeRCP: null, samplePosMult: null, bloomStrength: null } },
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
			samplePos: WebGLBox.querySelector('#samplePosRange'),
			samplePosReset: WebGLBox.querySelector('#samplePosRangeReset'),
		},
		rendering: {
			animate: WebGLBox.querySelector('#animateCheck'),
			modes: WebGLBox.querySelectorAll('input[type="radio"]'),
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
	const boxBlurFrag = await util.fetchShader("shader/boxBlur.fs");

	/* Elements that cause a redraw in the non-animation mode */
	ui.blur.kernelSize.addEventListener('input', () => { if (!ui.rendering.animate.checked) redraw() });
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

	/* Draw Texture Shader */
	ctx.shd.scene = util.compileAndLinkShader(gl, circleAnimation, simpleTexture, ["offset", "radius"]);

	/* Draw bloom Shader */
	ctx.shd.bloom = util.compileAndLinkShader(gl, bloomVert, bloomFrag, ["texture", "textureAdd", "offset", "radius"]);

	/* Helper for recompilation */
	function reCompileBlurShader(blurSize) {
		ctx.shd.blur = util.compileAndLinkShader(gl, simpleQuad, boxBlurFrag, ["frameSizeRCP", "samplePosMult", "bloomStrength"], "#define KERNEL_SIZE " + blurSize + '\n');
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
		gl.deleteFramebuffer(ctx.fb.final);
		[ctx.fb.scene, ctx.tex.frame] = util.setupFramebuffer(gl, canvas.width, canvas.height);
		[ctx.fb.final, ctx.tex.frameFinal] = util.setupFramebuffer(gl, canvas.width, canvas.height);

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
		const tapsNewText = (canvas.width * canvas.height * KernelSizeSide * KernelSizeSide / 1000000).toFixed(1) + " Million";
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

		/* Box blur at native resolution */
		gl.useProgram(ctx.shd.blur.handle);
		const finalFB = ctx.mode == "bloom" ? ctx.fb.final : null;
		gl.bindFramebuffer(gl.FRAMEBUFFER, finalFB);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.uniform1f(ctx.shd.blur.uniforms.bloomStrength, ctx.mode == "scene" ? 1.0 : ui.rendering.lightBrightness.value);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, ctx.tex.frame);
		gl.uniform2f(ctx.shd.blur.uniforms.frameSizeRCP, 1.0 / canvas.width, 1.0 / canvas.height);
		gl.uniform1f(ctx.shd.blur.uniforms.samplePosMult, ui.blur.samplePos.value);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

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
		gl.deleteTexture(ctx.tex.frameFinal); ctx.tex.frameFinal = null;
		gl.deleteFramebuffer(ctx.fb.scene); ctx.fb.scene = null;
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