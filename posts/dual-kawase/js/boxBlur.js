import * as util from './utility.js'

export async function setupBoxBlur() {
	/* Init */
	const canvas = document.getElementById('canvasBoxBlur');

	/* State tracking */
	let buffersInitialized = false, initComplete = false, benchmode = false;

	/* Circle Rotation size */
	const radius = 0.1;

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

	const ctx = {
		tex: { sdr: null, selfIllum: null, frame: null },
		fb: { circle: null },
		shd: {
			simple: { handle: null, uniforms: { offset: null, radius: null } },
			blit: { handle: null, uniforms: { frameSizeRCP: null, samplePosMult: null, sigma: null } },
		},
	};

	/* UI Elements */
	const ui = {
		samplePosRange: document.getElementById('samplePosRange'),
		sigmaRange: document.getElementById('sigmaRange'),
		kernelSizeRange: document.getElementById('boxKernelSizeRange'),
		animateCheckBox: document.getElementById('animateCheck_Boxblur'),
		benchmark: document.getElementById('benchmarkBoxBlur'),
		benchmarkLabel: document.getElementById('benchmarkBoxBlurLabel'),
		fps: document.getElementById('fpsBoxBlur'),
		ms: document.getElementById('msBoxBlur'),
		width: document.getElementById('widthBoxBlur'),
		height: document.getElementById('heightBoxBlur'),
		tapsCount: document.getElementById('tapsBoxBlur'),
		iterOut: document.getElementById('iterOutBoxBlur'),
	};

	/* Events */
	ui.kernelSizeRange.addEventListener('input', function () {
		reCompileBlurShader(ui.kernelSizeRange.value);
	});

	ui.benchmark.addEventListener('click', function () {
		ui.benchmark.disabled = true;
		benchmode = true;
		canvas.width = 1600;
		canvas.height = 1200;
		ui.width.value = 1600;
		ui.height.value = 1200;
		stopRendering();
		startRendering();
	});

	/* Shaders */
	const simpleVert = await util.fetchShader("shader/simple.vs");
	const simpleFrag = await util.fetchShader("shader/simple.fs");
	const boxBlurVert = await util.fetchShader("shader/boxBlur.vs");
	const boxBlurFrag = await util.fetchShader("shader/boxBlur.fs");

	/* Draw Texture Shader */
	ctx.shd.simple.handle = util.compileAndLinkShader(gl, simpleVert, simpleFrag);
	ctx.shd.simple.uniforms.offset = gl.getUniformLocation(ctx.shd.simple.handle, "offset");
	ctx.shd.simple.uniforms.radius = gl.getUniformLocation(ctx.shd.simple.handle, "radius");

	/* Helper for recompilation */
	function reCompileBlurShader(blurSize) {
		ctx.shd.blit.handle = util.compileAndLinkShader(gl, boxBlurVert, boxBlurFrag, "#define KERNEL_SIZE " + blurSize + '\n');
		ctx.shd.blit.uniforms.frameSizeRCP = gl.getUniformLocation(ctx.shd.blit.handle, "frameSizeRCP");
		ctx.shd.blit.uniforms.samplePosMult = gl.getUniformLocation(ctx.shd.blit.handle, "samplePosMult");
		ctx.shd.blit.uniforms.sigma = gl.getUniformLocation(ctx.shd.blit.handle, "sigma");
	}
	/* Blit Shader */
	reCompileBlurShader(3)

	/* Send Unit code verts to the GPU */
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, util.unitQuad, gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);

	let redrawActive = false;

	async function setupTextureBuffers() {
		buffersInitialized = true;
		initComplete = false;
		/* Setup Buffers */
		gl.deleteFramebuffer(ctx.fb.circle);
		ctx.fb.circle = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.circle);

		ctx.tex.frame = util.setupTexture(gl, canvas.width, canvas.height, ctx.tex.frame, gl.NEAREST);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ctx.tex.frame, 0);

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
		initComplete = true;
	}

	let prevNow = performance.now();
	let lastStatsUpdate = prevNow;
	let fpsEMA = 60;
	let msEMA = 16;

	function redraw() {
		redrawActive = true;
		if (!buffersInitialized) {
			setupTextureBuffers();
		}
		if (!initComplete) {
			redrawActive = false;
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
		gl.useProgram(ctx.shd.simple.handle);
		gl.bindTexture(gl.TEXTURE_2D, ctx.tex.sdr);
		gl.uniform2fv(ctx.shd.simple.uniforms.offset, offset);
		gl.uniform1f(ctx.shd.simple.uniforms.radius, radiusSwitch);

		/* Setup PostProcess Framebuffer */
		gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.circle);
		gl.viewport(0, 0, canvas.width, canvas.height);

		/* Draw Call */
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		/* Setup Draw to screen */
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.useProgram(ctx.shd.blit.handle);
		gl.bindTexture(gl.TEXTURE_2D, ctx.tex.frame);

		gl.uniform2f(ctx.shd.blit.uniforms.frameSizeRCP, 1.0 / canvas.width, 1.0 / canvas.height);
		gl.uniform1f(ctx.shd.blit.uniforms.samplePosMult, ui.samplePosRange.value);
		gl.uniform1f(ctx.shd.blit.uniforms.sigma, ui.sigmaRange.value);

		/* Drawcall */
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		/* Force CPU-GPU Sync to prevent overloading the GPU during compositing.
		   In reality this is more likely to be flush, but still, it seems to
		   help on multiple devices with during low FPS */
		gl.finish();

		if (benchmode) {
			const dummyPixels = new Uint8Array(4);
			/* Make sure the Command Queue is empty */;
			gl.readPixels(256, 256, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dummyPixels);

			/* Measure the rough length of a pixel Readback */
			const readPixelsTimeStart = performance.now();
			for (let x = 0; x < 10; x++)
				gl.readPixels(Math.round(Math.random() * 512), Math.round(Math.random() * 512), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dummyPixels);
			const readPixelsTimeEnd = performance.now();

			/* Measure blur iterations */
			const benchNow = performance.now()
			for (let x = 0; x < ui.iterOut.value; x++)
				gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
			gl.readPixels(128, 128, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dummyPixels);

			/* Display results */
			const benchTime = performance.now() - benchNow - ((readPixelsTimeEnd - readPixelsTimeStart) / 10);
			ui.benchmarkLabel.textContent = benchTime >= 1000 ? (benchTime / 1000).toFixed(1) + " s" : benchTime.toFixed(1) + " ms";
			benchmode = false;
			ui.benchmark.disabled = false;
			onResize();
		}

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

		redrawActive = false;
	}

	let isRendering = false;
	let animationFrameId;

	/* Render at Native Resolution */
	function nativeResize() {
		const dipRect = canvas.getBoundingClientRect();
		const width = Math.round(devicePixelRatio * dipRect.right) - Math.round(devicePixelRatio * dipRect.left);
		const height = Math.round(devicePixelRatio * dipRect.bottom) - Math.round(devicePixelRatio * dipRect.top);

		if (!benchmode && width && canvas.width !== width || height && canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;

			/* Report in UI */
			ui.width.value = width;
			ui.height.value = height;

			stopRendering();
			startRendering();
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
		if (isRendering) {
			redraw();
			animationFrameId = requestAnimationFrame(renderLoop);
		}
	}

	function startRendering() {
		/* Start rendering, when canvas visible */
		isRendering = true;
		renderLoop();
	}

	function stopRendering() {
		/* Stop another redraw being called */
		isRendering = false;
		cancelAnimationFrame(animationFrameId);
		while (redrawActive) {
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
		gl.deleteFramebuffer(ctx.fb.circle);
		buffersInitialized = false;
		initComplete = false;
	}

	function handleIntersection(entries) {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				if (!isRendering) startRendering();
			} else {
				stopRendering();
			}
		});
	}

	/* Only render when the canvas is actually on screen */
	let observer = new IntersectionObserver(handleIntersection);
	observer.observe(canvas);
}