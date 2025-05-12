function setupSimple(canvasId, simpleVtxSrc, simpleFragSrc, pauseCheckboxID) {
	/* Init */
	const canvas = document.getElementById(canvasId);
	let buffersInitialized = false;
	let pause = false;
	/* Texture Objects */
	let textureSDR, textureSelfIllum = null;
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

	/* Shaders */
	/* Circle Shader */
	const simpleShd = compileAndLinkShader(gl, simpleVtxSrc, simpleFragSrc);
	gl.useProgram(simpleShd);
	const offsetLocationCircle = gl.getUniformLocation(simpleShd, "offset");
	const radiusLocationCircle = gl.getUniformLocation(simpleShd, "radius");

	const vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, unitQuad, gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);

	setupTextureBuffers();

	let aspect_ratio = 0;
	let last_time = 0;
	let redrawActive = false;

	async function setupTextureBuffers() {
		/* Setup Buffers */
		buffersInitialized = true;

		let [base, selfIllum] = await Promise.all([
			fetch("/dual-kawase/img/SDR_Bloom_No_Sprites.png"),
			fetch("/dual-kawase/img/Selfillumination.png")
		]);
		let [baseBlob, selfIllumBlob] = await Promise.all([
			base.blob(),
			selfIllum.blob()
		]);
		let [baseBitmap, selfIllumBitmap] = await Promise.all([
			createImageBitmap(baseBlob, { colorSpaceConversion: 'none' }),
			createImageBitmap(selfIllumBlob, { colorSpaceConversion: 'none' })
		]);
		textureSDR = setupTexture(gl, 1368, 1026, textureSDR, gl.LINEAR, baseBitmap);
		textureSelfIllum = setupTexture(gl, 1368, 1026, textureSelfIllum, gl.LINEAR, baseBitmap);
		baseBitmap.close();
		selfIllumBitmap.close();
		gl.bindTexture(gl.TEXTURE_2D, textureSDR);
	}

	function redraw(time) {
		redrawActive = true;
		if (!buffersInitialized) {
			setupTextureBuffers();
		}
		last_time = time;

		/* Circle Motion */
		var radius = !pause ? 0.1 : 0.0;
		var speed = (time / 10000) % Math.PI * 2;
		const offset = [radius * Math.cos(speed), radius * Math.sin(speed)];
		gl.uniform2fv(offsetLocationCircle, offset);
		gl.uniform1f(radiusLocationCircle, radius);

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
		gl.deleteTexture(selfIllumBitmap);
		buffersInitialized = false;
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
