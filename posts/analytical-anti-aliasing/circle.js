"use strict";
function compileAndLinkShader(gl, vtxShdSrc, FragShdSrc) {
	/* Vertex Shader Compilation */
	const vtxShd = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vtxShd, document.getElementById(vtxShdSrc).text);
	gl.compileShader(vtxShd);

	if (!gl.getShaderParameter(vtxShd, gl.COMPILE_STATUS))
		console.error("Vertex shader compilation error: ", gl.getShaderInfoLog(vtxShd));

	/* Fragment Shader Compilation */
	const FragShd = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(FragShd, document.getElementById(FragShdSrc).text);
	gl.compileShader(FragShd);

	if (!gl.getShaderParameter(FragShd, gl.COMPILE_STATUS))
		console.error("Fragment shader compilation error: ", gl.getShaderInfoLog(FragShd));

	/* Shader Linking */
	const LinkedShd = gl.createProgram();
	gl.attachShader(LinkedShd, vtxShd);
	gl.attachShader(LinkedShd, FragShd);
	gl.linkProgram(LinkedShd);

	if (!gl.getProgramParameter(LinkedShd, gl.LINK_STATUS))
		console.error("Shader program linking error: ", gl.getProgramInfoLog(LinkedShd));

	return LinkedShd;
}

function setup(canvasId, circleVtxSrc, circleFragSrc, postVtxSrc, postFragSrc, redVtxSrc, redFragSrc) {
	/* Init */
	const canvas = document.getElementById(canvasId);
	const webglVersion = canvasId == 'canvasMSAA' ? 'webgl2' : 'webgl';
	const gl = canvas.getContext(webglVersion,
		{
			preserveDrawingBuffer: false,
			antialias: false,
			alpha: true,
			premultipliedAlpha: true
		}
	);
	gl.getExtension('OES_standard_derivatives');

	/* Setup Possibilities */
	let samples = 1;
	let renderbuffer = null;
	let resolveFramebuffer = null;

	if (canvasId == 'canvasMSAA') {
		const maxSamples = gl.getParameter(gl.MAX_SAMPLES);

		/* Enable the options in the MSAA dropdown based on maxSamples */
		const msaaSelect = document.getElementById("MSAA");
		for (let option of msaaSelect.options) {
			if (parseInt(option.value) <= maxSamples) {
				option.disabled = false;
			}
		}

		samples = parseInt(msaaSelect.value); // Initial samples based on selected option
		/* Event listener for select dropdown */
		msaaSelect.addEventListener('change', function () {
			samples = parseInt(msaaSelect.value); // Update samples based on the new selection
			onResize(true); // Call the resize function to apply changes
		});
	}

	/* Shaders */
	/* Circle Shader */
	const circleShd = compileAndLinkShader(gl, circleVtxSrc, circleFragSrc);
	const aspect_ratioLocation = gl.getUniformLocation(circleShd, "aspect_ratio");
	const offsetLocationCircle = gl.getUniformLocation(circleShd, "offset");

	/* Post Processing Shader */
	const postShd = compileAndLinkShader(gl, postVtxSrc, postFragSrc);
	const transformLocation = gl.getUniformLocation(postShd, "transform");
	const offsetLocationPost = gl.getUniformLocation(postShd, "offset");

	/* Simple Red Box */
	const redShd = compileAndLinkShader(gl, redVtxSrc, redFragSrc);
	const transformLocationRed = gl.getUniformLocation(redShd, "transform");
	const offsetLocationRed = gl.getUniformLocation(redShd, "offset");
	const aspect_ratioLocationRed = gl.getUniformLocation(redShd, "aspect_ratio");
	const thicknessLocation = gl.getUniformLocation(redShd, "thickness");
	const pixelsizeLocation = gl.getUniformLocation(redShd, "pixelsize");

	/* Vertex Buffer of a simple Quad with some colors */
	const unitQuad = new Float32Array([
		-1.0, 1.0, 1.0, 1.0, 0.0,
		1.0, 1.0, 1.0, 0.0, 1.0,
		1.0, -1.0, 0.0, 1.0, 1.0,
		-1.0, -1.0, 1.0, 1.0, 1.0
	]);

	const vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, unitQuad, gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
	gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
	gl.enableVertexAttribArray(0);
	gl.enableVertexAttribArray(1);

	/* Framebuffer setup with MSAA */
	const framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	if (canvasId == 'canvasMSAA') {
		renderbuffer = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
		gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, canvas.width, canvas.height);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderbuffer);

		resolveFramebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, resolveFramebuffer);
		gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	} else {
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	}

	const circleOffsetAnim = new Float32Array([
		0.0, 0.0
	]);

	let aspect_ratio = 0;

	if (canvasId == 'canvasMSAA')
		gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);

	function redraw(time) {
		if (canvasId == 'canvasMSAA'){
			gl.disable(gl.BLEND);
			gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
		}

		/* Setup PostProcess Framebuffer */
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.useProgram(circleShd);

		/* Draw Circle Animation */
		gl.uniform1f(aspect_ratioLocation, aspect_ratio);
		var radius = 0.1;
		var speed = (time / 10000) % Math.PI * 2;
		circleOffsetAnim[0] = radius * Math.cos(speed);
		circleOffsetAnim[1] = radius * Math.sin(speed);
		gl.uniform2fv(offsetLocationCircle, circleOffsetAnim);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

		if (canvasId == 'canvasMSAA') {
			/* Resolve the MSAA framebuffer to a regular texture */
			gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer);
			gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, resolveFramebuffer);
			gl.blitFramebuffer(
				0, 0, canvas.width, canvas.height,
				0, 0, canvas.width, canvas.height,
				gl.COLOR_BUFFER_BIT, gl.NEAREST
			);
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.useProgram(postShd);

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

		requestAnimationFrame(redraw);
	}

	function onResize(sampleChange) {
		const dipRect = canvas.getBoundingClientRect();
		const width = Math.round(devicePixelRatio * dipRect.right) - Math.round(devicePixelRatio * dipRect.left);
		const height = Math.round(devicePixelRatio * dipRect.bottom) - Math.round(devicePixelRatio * dipRect.top);

		if (canvas.width !== width || canvas.height !== height || sampleChange) {
			canvas.width = width;
			canvas.height = height;
			if (canvasId == 'canvasMSAA') {
				gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
				gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, width, height);
			}
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			gl.viewport(0, 0, width, height);
			aspect_ratio = 1.0 / (width / height);
		}
	}

	window.addEventListener('resize', onResize, true);
	onResize();
	redraw(0);
}
