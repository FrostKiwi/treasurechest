function setupAnalytical(canvasId, circleVtxSrc, circleFragSrc, blitVtxSrc, blitFragSrc, redVtxSrc, redFragSrc, radioName, radioSmoothSize) {
	/* Init */
	const canvas = document.getElementById(canvasId);
	let circleDrawFramebuffer, frameTexture;
	let buffersInitialized = false;
	let resDiv = 1;
	let pixelSmoothSize = 1;
	const gl = canvas.getContext('webgl',
		{
			preserveDrawingBuffer: false,
			antialias: false,
			alpha: true
		}
	);

	/* Render Resolution */
	const radios = document.querySelectorAll(`input[name="${radioName}"]`);
	radios.forEach(radio => {
		/* Force set to 1 to fix a reload bug in Firefox Android */
		if (radio.value === "1")
			radio.checked = true;
		radio.addEventListener('change', (event) => {
			resDiv = event.target.value;
			stopRendering();
			startRendering();
		});
	});

	/* Smooth Size */
	const radiosSmooth = document.querySelectorAll(`input[name="${radioSmoothSize}"]`);
	radiosSmooth.forEach(radio => {
		/* Force set to 1 to fix a reload bug in Firefox Android */
		if (radio.value === "1")
			radio.checked = true;
		radio.addEventListener('change', (event) => {
			pixelSmoothSize = event.target.value;
			stopRendering();
			startRendering();
		});
	});

	/* Shaders */
	/* Circle Shader */
	const circleShd = compileAndLinkShader(gl, circleVtxSrc, circleFragSrc);
	const aspect_ratioLocation = gl.getUniformLocation(circleShd, "aspect_ratio");
	const offsetLocationCircle = gl.getUniformLocation(circleShd, "offset");
	const pixelSizeCircle = gl.getUniformLocation(circleShd, "pixelSize");
	const sizeLocationCircle = gl.getUniformLocation(circleShd, "size");

	/* Blit Shader */
	const blitShd = compileAndLinkShader(gl, blitVtxSrc, blitFragSrc);
	const transformLocation = gl.getUniformLocation(blitShd, "transform");
	const offsetLocationPost = gl.getUniformLocation(blitShd, "offset");

	/* Simple Red Box */
	const redShd = compileAndLinkShader(gl, redVtxSrc, redFragSrc);
	const transformLocationRed = gl.getUniformLocation(redShd, "transform");
	const offsetLocationRed = gl.getUniformLocation(redShd, "offset");
	const aspect_ratioLocationRed = gl.getUniformLocation(redShd, "aspect_ratio");
	const thicknessLocation = gl.getUniformLocation(redShd, "thickness");
	const pixelsizeLocation = gl.getUniformLocation(redShd, "pixelsize");

	const vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, unitQuad, gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
	gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
	gl.enableVertexAttribArray(0);
	gl.enableVertexAttribArray(1);

	setupTextureBuffers();

	const circleOffsetAnim = new Float32Array([
		0.0, 0.0
	]);

	let aspect_ratio = 0;
	let last_time = 0;
	let redrawActive = false;

	function setupTextureBuffers() {
		gl.deleteFramebuffer(circleDrawFramebuffer);
		circleDrawFramebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, circleDrawFramebuffer);

		frameTexture = setupTexture(gl, canvas.width / resDiv, canvas.height / resDiv, frameTexture, gl.NEAREST);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, frameTexture, 0);
		buffersInitialized = true;
	}

	gl.enable(gl.BLEND);

	function redraw(time) {
		redrawActive = true;
		if (!buffersInitialized) {
			setupTextureBuffers();
		}
		last_time = time;

		/* Setup PostProcess Framebuffer */
		gl.viewport(0, 0, canvas.width / resDiv, canvas.height / resDiv);
		gl.bindFramebuffer(gl.FRAMEBUFFER, circleDrawFramebuffer);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.useProgram(circleShd);

		/* Draw Circle Animation */
		gl.uniform1f(pixelSizeCircle, (2.0 / (canvas.height / resDiv)) * pixelSmoothSize);

		gl.uniform1f(aspect_ratioLocation, aspect_ratio);
		var radius = 0.1;
		var speed = (time / 10000) % Math.PI * 2;
		circleOffsetAnim[0] = radius * Math.cos(speed) + 0.1;
		circleOffsetAnim[1] = radius * Math.sin(speed);
		gl.uniform2fv(offsetLocationCircle, circleOffsetAnim);
		gl.uniform1f(sizeLocationCircle, circleSize);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		gl.viewport(0, 0, canvas.width, canvas.height);

		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.useProgram(blitShd);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		/* Simple Passthrough */
		gl.uniform4f(transformLocation, 1.0, 1.0, 0.0, 0.0);
		gl.uniform2f(offsetLocationPost, 0.0, 0.0);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		/* Scaled image in the bottom left */
		gl.uniform4f(transformLocation, 0.25, 0.25, -0.75, -0.75);
		gl.uniform2fv(offsetLocationPost, circleOffsetAnim);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		/* Draw Red box for viewport illustration */
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.useProgram(redShd);
		gl.uniform1f(aspect_ratioLocationRed, (1.0 / aspect_ratio) - 1.0);
		gl.uniform1f(thicknessLocation, 0.2);
		gl.uniform1f(pixelsizeLocation, (1.0 / canvas.width) * 50);
		gl.uniform4f(transformLocationRed, 0.25, 0.25, -0.75, -0.75);
		gl.uniform2fv(offsetLocationRed, circleOffsetAnim);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		gl.uniform1f(thicknessLocation, 0.1);
		gl.uniform1f(pixelsizeLocation, 0.0);
		gl.uniform4f(transformLocationRed, 0.5, 0.5, 0.0, 0.0);
		gl.uniform2f(offsetLocationRed, -0.75, -0.75);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		redrawActive = false;
	}

	let isRendering = false;
	let animationFrameId;

	function onResize() {
		const dipRect = canvas.getBoundingClientRect();
		const width = Math.round(devicePixelRatio * dipRect.right) - Math.round(devicePixelRatio * dipRect.left);
		const height = Math.round(devicePixelRatio * dipRect.bottom) - Math.round(devicePixelRatio * dipRect.top);

		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;

			setupTextureBuffers();
			aspect_ratio = 1.0 / (width / height);
			stopRendering();
			startRendering();
		}
	}

	window.addEventListener('resize', onResize, true);
	onResize();

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

		/* Delete the important buffer to free up memory */
		gl.deleteTexture(frameTexture);
		gl.deleteFramebuffer(circleDrawFramebuffer);
		buffersInitialized = false;
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
