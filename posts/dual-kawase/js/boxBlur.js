function setupBoxBlur(canvasId, simpleVtxSrc, simpleFragSrc, blitVtxSrc, blitFragSrc, pauseCheckboxID, sizeID) {
	/* Init */
	const canvas = document.getElementById(canvasId);
	let buffersInitialized = false;
	let initComplete = false;
	let pause = false;
	/* Texture Objects */
	let textureSDR, textureSelfIllum = null;
	/* Framebuffer Objects */
	let circleDrawFramebuffer, frameTexture;
	let blurSize = 12;

	/* Circle Rotation size */
	const radius = 0.1;

	const gl = canvas.getContext('webgl',
		{
			preserveDrawingBuffer: false,
			antialias: false,
			alpha: false,
		}
	);

	const pauseCheckbox = document.getElementById(pauseCheckboxID);
	pauseCheckbox.addEventListener('change', () => {
		pause = !pauseCheckbox.checked;
	});


	const blurSizeRange = document.getElementById(sizeID);
	blurSizeRange.addEventListener('input', function () {
		blurSize = blurSizeRange.value;
	});

	/* Shaders */
	/* Draw Texture Shader */
	const simpleShd = compileAndLinkShader(gl, simpleVtxSrc, simpleFragSrc);
	const offsetLocationCircle = gl.getUniformLocation(simpleShd, "offset");
	const radiusLocationCircle = gl.getUniformLocation(simpleShd, "radius");

	/* Draw Framebuffer Shader */
	/* Blit Shader */
	const blitShd = compileAndLinkShader(gl, blitVtxSrc, blitFragSrc);
	const frameSizeRCPLocation = gl.getUniformLocation(blitShd, "frameSizeRCP");
	const blurSizeLocation = gl.getUniformLocation(blitShd, "blurSize");

	const vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, unitQuad, gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);

	let last_time = 0;
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

	function redraw(time) {
		redrawActive = true;
		if (!buffersInitialized) {
			setupTextureBuffers();
		}
		if (!initComplete) {
			redrawActive = false;
			return;
		}
		last_time = time;

		/* Circle Motion */
		var radiusSwitch = !pause ? radius : 0.0;
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
		gl.uniform1i(blurSizeLocation, blurSize);

		/* Drawcall */
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

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
		renderLoop(last_time);
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
				stopRendering(last_time);
			}
		});
	}

	/* Only render when the canvas is actually on screen */
	let observer = new IntersectionObserver(handleIntersection);
	observer.observe(canvas);
}
