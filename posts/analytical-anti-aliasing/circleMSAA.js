function setupMSAA(canvasId, circleVtxSrc, circleFragSrc, circleSimpleFragSrc, postVtxSrc, postFragSrc, blitVtxSrc, blitFragSrc, redVtxSrc, redFragSrc, radioName, radioSmoothSize) {
	/* Init */
	const canvas = document.getElementById(canvasId);
	let frameTexture, circleDrawFramebuffer;
	let buffersInitialized = false;
	let resDiv = 1;
	let pixelSmoothSize = 1;
	const gl = canvas.getContext('webgl2',
		{
			preserveDrawingBuffer: false,
			antialias: false,
			alpha: true,
			premultipliedAlpha: true
		}
	);

	/* Setup Possibilities */
	let samples = 1;
	let renderbuffer = null;
	let resolveFramebuffer = null;

	const maxSamples = gl.getParameter(gl.MAX_SAMPLES);

	/* Enable the options in the MSAA dropdown based on maxSamples */
	const msaaSelect = document.getElementById("MSAA");
	for (let option of msaaSelect.options) {
		if (parseInt(option.value) <= maxSamples) {
			option.disabled = false;
		}
	}
	samples = parseInt(msaaSelect.value);

	/* Event listener for select dropdown */
	msaaSelect.addEventListener('change', function () {
		/* Get new MSAA level and reset-init buffers */
		samples = parseInt(msaaSelect.value);
		setupTextureBuffers();
	});

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
	const circleShd_step = compileAndLinkShader(gl, circleVtxSrc, circleSimpleFragSrc);
	const aspect_ratioLocation_step = gl.getUniformLocation(circleShd_step, "aspect_ratio");
	const offsetLocationCircle_step = gl.getUniformLocation(circleShd_step, "offset");
	const sizeLocationCircle_step = gl.getUniformLocation(circleShd_step, "size");

	/* Blit Shader */
	const blitShd = compileAndLinkShader(gl, blitVtxSrc, blitFragSrc);
	const transformLocation = gl.getUniformLocation(blitShd, "transform");
	const offsetLocationPost = gl.getUniformLocation(blitShd, "offset");

	/* Post Shader */
	const postShd = compileAndLinkShader(gl, postVtxSrc, postFragSrc);

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
	let animationFrameId;

	function setupTextureBuffers() {
		gl.deleteFramebuffer(circleDrawFramebuffer)
		circleDrawFramebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, circleDrawFramebuffer);

		gl.deleteRenderbuffer(renderbuffer);
		renderbuffer = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
		const errorMessageElement = document.getElementById('sampleErrorMessage');
		/* Here we need two branches because of implementation specific
		   shenanigans. Mobile chips will always force any call to 
		   renderbufferStorageMultisample() to be 4x MSAA, so to have a noAA
		   comparison, we split the Framebuffer setup */
		if (samples != 1) {
			gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, canvas.width / resDiv, canvas.height / resDiv);
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderbuffer);

			const actualSamples = gl.getRenderbufferParameter(
				gl.RENDERBUFFER,
				gl.RENDERBUFFER_SAMPLES
			);
			if (samples !== actualSamples) {
				errorMessageElement.style.display = 'block';
				errorMessageElement.textContent = `⚠️ You chose MSAAx${samples}, but the graphics driver forced it to MSAAx${actualSamples}. You are probably on a mobile GPU, where this behavior is expected.`;
			} else {
				errorMessageElement.style.display = 'none';
			}
		} else {
			errorMessageElement.style.display = 'none';
		}

		gl.deleteFramebuffer(resolveFramebuffer);
		resolveFramebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, resolveFramebuffer);

		frameTexture = setupTexture(gl, canvas.width / resDiv, canvas.height / resDiv, frameTexture, gl.NEAREST);
		gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, frameTexture, 0);
		buffersInitialized = true;
	}

	function redraw(time) {
		redrawActive = true;
		if (!buffersInitialized) {
			setupTextureBuffers();
		}
		last_time = time;

		gl.disable(gl.BLEND);
		gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
		/* Setup PostProcess Framebuffer */
		if (samples == 1)
			gl.bindFramebuffer(gl.FRAMEBUFFER, resolveFramebuffer);
		else
			gl.bindFramebuffer(gl.FRAMEBUFFER, circleDrawFramebuffer);
		gl.clear(gl.COLOR_BUFFER_BIT);
		if (samples == 1)
			gl.useProgram(circleShd_step);
		else
			gl.useProgram(circleShd);
		gl.viewport(0, 0, canvas.width / resDiv, canvas.height / resDiv);

		/* Draw Circle Animation */
		var radius = 0.1;
		var speed = (time / 10000) % Math.PI * 2;
		circleOffsetAnim[0] = radius * Math.cos(speed) + 0.1;
		circleOffsetAnim[1] = radius * Math.sin(speed);
		if (samples == 1) {
			/* Here we need two branches because of implementation specific
   			   shenanigans. Mobile chips will always force any call to 
   			   renderbufferStorageMultisample() to be 4x MSAA, so to have a noAA
   			   comparison, we split the demo across two shaders */
			gl.uniform2fv(offsetLocationCircle_step, circleOffsetAnim);
			gl.uniform1f(aspect_ratioLocation_step, aspect_ratio);
			gl.uniform1f(sizeLocationCircle_step, circleSize);
		}
		else {
			gl.uniform2fv(offsetLocationCircle, circleOffsetAnim);
			gl.uniform1f(aspect_ratioLocation, aspect_ratio);
			gl.uniform1f(sizeLocationCircle, circleSize);
			gl.uniform1f(pixelSizeCircle, (2.0 / (canvas.height / resDiv)) * pixelSmoothSize);
		}

		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
		gl.enable(gl.BLEND);

		gl.viewport(0, 0, canvas.width, canvas.height);

		if (samples !== 1) {
			gl.useProgram(postShd);
			gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

			/* Resolve the MSAA framebuffer to a regular texture */
			gl.bindFramebuffer(gl.READ_FRAMEBUFFER, circleDrawFramebuffer);
			gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, resolveFramebuffer);
			gl.blitFramebuffer(
				0, 0, canvas.width, canvas.height,
				0, 0, canvas.width, canvas.height,
				gl.COLOR_BUFFER_BIT, gl.LINEAR
			);
		}

		gl.useProgram(blitShd);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindTexture(gl.TEXTURE_2D, frameTexture);

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

	function onResize() {
		const dipRect = canvas.getBoundingClientRect();
		const width = Math.round(devicePixelRatio * dipRect.right) - Math.round(devicePixelRatio * dipRect.left);
		const height = Math.round(devicePixelRatio * dipRect.bottom) - Math.round(devicePixelRatio * dipRect.top);

		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;

			setupTextureBuffers();
			aspect_ratio = 1.0 / (width / height);
		}
	}

	window.addEventListener('resize', onResize, true);
	onResize();

	let isRendering = false;

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
		gl.deleteRenderbuffer(renderbuffer);
		gl.deleteFramebuffer(resolveFramebuffer);
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
