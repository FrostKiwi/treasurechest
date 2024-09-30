function setup3D(canvasId, circleVtxSrc, circleFragSrc, simpleColorFragSrc, blitVtxSrc, blitFragSrc, radioName, showQuadOpt) {
	/* Init */
	const canvas = document.getElementById(canvasId);
	let circleDrawFramebuffer, frameTexture;
	let buffersInitialized = false;
	let showQuad = false;
	let resDiv = 1;
	const gl = canvas.getContext('webgl',
		{
			preserveDrawingBuffer: false,
			antialias: false,
			alpha: true
		}
	);

	let DerivativesExtension = gl.getExtension('OES_standard_derivatives');

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

	/* Show Quad instead of circle choise */
	const showQuadOption = document.querySelectorAll(`input[name="${showQuadOpt}"]`);
	showQuadOption.forEach(radio => {
		/* Force set to 1 to fix a reload bug in Firefox Android */
		if (radio.value === "false")
			radio.checked = true;
		radio.addEventListener('change', (event) => {
			showQuad = (event.target.value === "true");
			stopRendering();
			startRendering();
		});
	});

	/* Shaders */
	/* Circle Shader */
	const circleShd = compileAndLinkShader(gl, circleVtxSrc, circleFragSrc);
	const viewProjectionLocation = gl.getUniformLocation(circleShd, "perspective");

	/* SimpleColor Shader */
	const simpleColorShd = compileAndLinkShader(gl, circleVtxSrc, simpleColorFragSrc);
	const viewProjectionLocationSimple = gl.getUniformLocation(simpleColorShd, "perspective");

	/* Blit Shader */
	const blitShd = compileAndLinkShader(gl, blitVtxSrc, blitFragSrc);
	const transformLocation = gl.getUniformLocation(blitShd, "transform");
	const offsetLocationPost = gl.getUniformLocation(blitShd, "offset");

	const vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, unitQuad, gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
	gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
	gl.enableVertexAttribArray(0);
	gl.enableVertexAttribArray(1);

	setupTextureBuffers();

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

	let viewMatrix = Mat4.create();
	let projectionMatrix = Mat4.create();

	let eye = [1.5, 1.5, 1.5];
	let target = [0, 0, 0];
	let up = [0, 0, 1];

	gl.enable(gl.BLEND);

	function redraw(time) {
		redrawActive = true;
		if (!buffersInitialized) {
			setupTextureBuffers();
		}
		last_time = time;

		const radius = 5 + 4 * Math.sin(time / 2000);
		var speed = (time / 5000) % Math.PI * 2;
		eye[0] = radius * Math.cos(speed) + 0.1;
		eye[1] = radius * Math.sin(speed);

		Mat4.lookAt(viewMatrix, eye, target, up);

		let fov = 75 * Math.PI / 180;
		Mat4.perspectiveNO(projectionMatrix, fov, aspect_ratio, 1, Infinity);

		Mat4.multiply(projectionMatrix, projectionMatrix, viewMatrix);

		/* Setup PostProcess Framebuffer */
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.viewport(0, 0, canvas.width / resDiv, canvas.height / resDiv);
		gl.bindFramebuffer(gl.FRAMEBUFFER, circleDrawFramebuffer);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.useProgram(circleShd);
		gl.uniformMatrix4fv(viewProjectionLocation, false, projectionMatrix);

		/* Draw Circle Animation */
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		if(showQuad){
			gl.useProgram(simpleColorShd);
			gl.uniformMatrix4fv(viewProjectionLocationSimple, false, projectionMatrix);
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		}

		gl.viewport(0, 0, canvas.width, canvas.height);

		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.useProgram(blitShd);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		/* Simple Passthrough */
		gl.uniform4f(transformLocation, 1.0, 1.0, 0.0, 0.0);
		gl.uniform2f(offsetLocationPost, 0.0, 0.0);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		/* Draw Red box for viewport illustration */
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
			aspect_ratio = width / height;
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