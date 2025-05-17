function setupBoxBlur() {
	/* Init */
	const canvas = document.getElementById('canvasBoxBlur');

	/* State tracking */
	let buffersInitialized = false, initComplete = false, benchmode = false;
	/* Texture Objects */
	let textureSDR, textureSelfIllum;
	/* Framebuffer Objects */
	let circleDrawFramebuffer, frameTexture;

	/* Circle Rotation size */
	const radius = 0.1;

	/* Main WebGL 1.0 Context */
	const gl = canvas.getContext('webgl', {
		preserveDrawingBuffer: false,
		antialias: false,
		alpha: false,
	});

	/* UI Elements */
	const samplePosRange = document.getElementById('samplePosRange');
	const sigmaRange = document.getElementById('sigmaRange');
	const boxKernelSizeRange = document.getElementById('boxKernelSizeRange');
	const animateCheckBox = document.getElementById('animateCheck_Boxblur');
	const benchmarkBoxBlur = document.getElementById('benchmarkBoxBlur');
	const benchmarkBoxBlurLabel = document.getElementById('benchmarkBoxBlurLabel');
	const fpsBoxBlur = document.getElementById('fpsBoxBlur');
	const msBoxBlur = document.getElementById('msBoxBlur');
	const widthBoxBlur = document.getElementById('widthBoxBlur');
	const heightBoxBlur = document.getElementById('heightBoxBlur');
	const tapsBoxBlur = document.getElementById('tapsBoxBlur');
	const iterOut = document.getElementById('iterOut');

	/* Events */
	boxKernelSizeRange.addEventListener('input', function () {
		reCompileBlurShader(boxKernelSizeRange.value);
	});

	benchmarkBoxBlur.addEventListener('click', function () {
		benchmarkBoxBlur.disabled = true;
		benchmode = true;
		canvas.width = 1600;
		canvas.height = 1200;
		widthBoxBlur.value = 1600;
		heightBoxBlur.value = 1200;
		stopRendering();
		startRendering();
	});

	/* Shaders for recompilation */
	let blitShd;
	let frameSizeRCPLocation;
	let samplePosMultLocation;

	/* Shaders */
	/* Draw Texture Shader */
	const simpleShd = compileAndLinkShader(gl, 'simpleVert', 'simpleFrag');
	const offsetLocationCircle = gl.getUniformLocation(simpleShd, "offset");
	const radiusLocationCircle = gl.getUniformLocation(simpleShd, "radius");

	/* Helper for recompilation */
	function reCompileBlurShader(blurSize) {
		blitShd = compileAndLinkShader(gl, 'boxBlurVert', 'boxBlurFrag', "#define KERNEL_SIZE " + blurSize + '\n');
		frameSizeRCPLocation = gl.getUniformLocation(blitShd, "frameSizeRCP");
		samplePosMultLocation = gl.getUniformLocation(blitShd, "samplePosMult");
		sigmaLocation = gl.getUniformLocation(blitShd, "sigma");
	}
	/* Blit Shader */
	reCompileBlurShader(3)

	/* Send Unit code verts to the GPU */
	const vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, unitQuad, gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);

	let redrawActive = false;

	async function setupTextureBuffers() {
		buffersInitialized = true;
		initComplete = false;
		/* Setup Buffers */
		gl.deleteFramebuffer(circleDrawFramebuffer);
		circleDrawFramebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, circleDrawFramebuffer);

		frameTexture = setupTexture(gl, canvas.width, canvas.height, frameTexture, gl.NEAREST);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, frameTexture, 0);

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
		textureSDR = setupTexture(gl, null, null, textureSDR, gl.LINEAR, baseBitmap);
		textureSelfIllum = setupTexture(gl, null, null, textureSelfIllum, gl.LINEAR, selfIllumBitmap);
		baseBitmap.close();
		selfIllumBitmap.close();
		initComplete = true;
	}

	let prevNow = performance.now();
	let lastStatsUpdate = prevNow;
	let fpsEMA = 60;
	let msEMA = 16;

	let queried = false;
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
		const KernelSizeSide = boxKernelSizeRange.value * 2 + 1;
		const tapsNewText = (canvas.width * canvas.height * KernelSizeSide * KernelSizeSide / 1000000).toFixed(1) + " Million";
		if (tapsBoxBlur.value != tapsNewText)
			tapsBoxBlur.value = tapsNewText;

		/* Circle Motion */
		var radiusSwitch = animateCheckBox.checked ? radius : 0.0;
		var speed = (performance.now() / 10000) % Math.PI * 2;
		const offset = [radiusSwitch * Math.cos(speed), radiusSwitch * Math.sin(speed)];
		gl.useProgram(simpleShd);
		gl.bindTexture(gl.TEXTURE_2D, textureSDR);
		gl.uniform2fv(offsetLocationCircle, offset);
		gl.uniform1f(radiusLocationCircle, radiusSwitch);

		/* Setup PostProcess Framebuffer */
		gl.bindFramebuffer(gl.FRAMEBUFFER, circleDrawFramebuffer);
		gl.viewport(0, 0, canvas.width, canvas.height);

		/* Draw Call */
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		/* Setup Draw to screen */
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.useProgram(blitShd);
		gl.bindTexture(gl.TEXTURE_2D, frameTexture);

		gl.uniform2f(frameSizeRCPLocation, 1.0 / canvas.width, 1.0 / canvas.height);
		gl.uniform1f(samplePosMultLocation, samplePosRange.value);
		gl.uniform1f(sigmaLocation, sigmaRange.value);

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
			for (let x = 0; x < iterOut.value; x++)
				gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
			gl.readPixels(128, 128, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dummyPixels);

			/* Display results */
			const benchTime = performance.now() - benchNow - ((readPixelsTimeEnd - readPixelsTimeStart) / 10);
			benchmarkBoxBlurLabel.textContent = benchTime >= 1000 ? (benchTime / 1000).toFixed(1) + " s" : benchTime.toFixed(1) + " ms";
			benchmode = false;
			benchmarkBoxBlur.disabled = false;
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
			fpsBoxBlur.value = fpsEMA.toFixed(0);
			msBoxBlur.value = msEMA.toFixed(2);
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
			widthBoxBlur.value = width;
			heightBoxBlur.value = height;

			stopRendering();
			startRendering();
		}
	}

	/* Resize Event */
	let resizeTimer = null;
	function onResize() {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => {
			nativeResize();
		}, 100);
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
		gl.deleteTexture(textureSDR);
		gl.deleteTexture(textureSelfIllum);
		gl.deleteTexture(frameTexture);
		gl.deleteFramebuffer(circleDrawFramebuffer);
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
