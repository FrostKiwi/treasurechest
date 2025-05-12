function setupSimple(canvasId, simpleVtxSrc, simpleFragSrc) {
	/* Init */
	const canvas = document.getElementById(canvasId);
	let buffersInitialized = false;
	const gl = canvas.getContext('webgl',
		{
			preserveDrawingBuffer: false,
			antialias: false,
			alpha: false,
		}
	);
	/* Shaders */
	/* Circle Shader */
	const simpleShd = compileAndLinkShader(gl, simpleVtxSrc, simpleFragSrc);

	const vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, unitQuad, gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);

	setupTextureBuffers();

	let aspect_ratio = 0;
	let redrawActive = false;

	function setupTextureBuffers() {
		/* Setup Buffers */
		buffersInitialized = true;
	}

	function redraw() {
		redrawActive = true;
		if (!buffersInitialized) {
			setupTextureBuffers();
		}

		/* Setup PostProcess Framebuffer */
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.useProgram(simpleShd);

		/* Draw Call */
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		redrawActive = false;
	}

	let isRendering = false;
	let animationFrameId;

	/* Render at Native Resolution */
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
