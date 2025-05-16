function setupBoxBlur() {
	/* Init */
	const canvas = document.getElementById('canvasBoxBlur');
	
	/* State tracking */
	let buffersInitialized = false;
	let initComplete = false;
	
	/* Texture Objects */
	let textureSDR, textureSelfIllum;
	/* Framebuffer Objects */
	let circleDrawFramebuffer, frameTexture;

	/* Circle Rotation size */
	const radius = 0.1;

	/* Main WebGL 1.0 Context */
	const gl = canvas.getContext('webgl',
		{
			preserveDrawingBuffer: false,
			antialias: false,
			alpha: false,
		}
	);

	/* UI Elements */
	const samplePosRange = document.getElementById('samplePosRange');
	const sigmaRange = document.getElementById('sigmaRange');
	const boxKernelSizeRange = document.getElementById('boxKernelSizeRange');
	const animateCheckBox = document.getElementById('animateCheck_Boxblur');
	const benchmarkCheckBox = document.getElementById('benchmarkCheck_Boxblur');
	const iterationsBoxBlur = document.getElementById('iterationsBoxBlur');
	const fpsBoxBlur = document.getElementById('fpsBoxBlur');
	const msBoxBlur = document.getElementById('msBoxBlur');
	const widthBoxBlur = document.getElementById('widthBoxBlur');
	const heightBoxBlur = document.getElementById('heightBoxBlur');
	const tapsBoxBlur = document.getElementById('tapsBoxBlur');

	/* Events */
	boxKernelSizeRange.addEventListener('input', function () {
		reCompileBlurShader(boxKernelSizeRange.value);
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

	let avgFPS = 60;
	let avgMS = 16;
	function redraw(time) {
		redrawActive = true;
		if (!buffersInitialized) {
			setupTextureBuffers();
		}
		if (!initComplete) {
			redrawActive = false;
			return;
		}

		/* Circle Motion */
		var radiusSwitch = animateCheckBox.checked ? radius : 0.0;
		var speed = (time / 10000) % Math.PI * 2;
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

		/* Finish command queue to measure just the Blur Time */
		gl.finish();
		
		const preBlurTime = performance.now();
		/* Drawcall */
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		/* Force CPU-GPU Sync to prevent overloading the GPU during compositing.
		   Especially apple devices may kill all WebGL contexts if we don't
		   perform this. Whether this leads to more accurate or less accurate
		   benchmarking numbers kinda depends on context */
		gl.finish();

		/* UI Stats */
		const KernelSizeSide = boxKernelSizeRange.value * 2 + 1;
		tapsBoxBlur.value = (canvas.width * canvas.height * KernelSizeSide * KernelSizeSide / 1000000).toFixed(1) + " Million";

		const instMS = performance.now() - preBlurTime;
		const instFPS = 1000 / instMS;
		avgFPS = avgFPS ? avgFPS + 0.05 * (instFPS - avgFPS) : instFPS;
		avgMS = avgMS ? avgMS + 0.05 * (instMS - avgMS) : instMS;
		fpsBoxBlur.value = Math.min(999, Math.round(avgFPS));
		msBoxBlur.value = avgMS.toFixed(1);

		redrawActive = false;
	}

	let isRendering = false;
	let animationFrameId;

	/* Render at Native Resolution */
	function nativeResize() {
		const dipRect = canvas.getBoundingClientRect();
		const width = Math.round(devicePixelRatio * dipRect.right) - Math.round(devicePixelRatio * dipRect.left);
		const height = Math.round(devicePixelRatio * dipRect.bottom) - Math.round(devicePixelRatio * dipRect.top);

		if (width && canvas.width !== width || height && canvas.height !== height) {
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

	function renderLoop(time) {
		if (isRendering) {
			redraw(time);
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
