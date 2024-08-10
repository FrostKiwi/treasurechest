"use strict";
function compileAndLinkShader(gl, vtxShdSrc, FragShdSrc){
	const vtxShd = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vtxShd, document.getElementById(vtxShdSrc).text);
	gl.compileShader(vtxShd);

	const FragShd = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(FragShd, document.getElementById(FragShdSrc).text);
	gl.compileShader(FragShd);
	
	const LinkedShd = gl.createProgram();
	gl.attachShader(LinkedShd, vtxShd);
	gl.attachShader(LinkedShd, FragShd);
	gl.linkProgram(LinkedShd);

	return LinkedShd;
}

function setupTri(canvasId, circleVtxSrc, circleFragSrc, postVtxSrc, postFragSrc, redVtxSrc, redFragSrc) {
	/* Init */
	const canvas = document.getElementById(canvasId);
	const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });
	gl.getExtension('OES_standard_derivatives')

	/* Shaders */
	/* Circle Shader */
	const circleShd = compileAndLinkShader(gl, circleVtxSrc, circleFragSrc);
	gl.useProgram(circleShd);
	gl.enableVertexAttribArray(0);
	const aspect_ratioLocation = gl.getUniformLocation(circleShd, "aspect_ratio");
	const offsetLocationCircle = gl.getUniformLocation(circleShd, "offset");

	/* Post Processing Shader */
	const postShd = compileAndLinkShader(gl, postVtxSrc, postFragSrc);
	gl.useProgram(postShd);
	gl.enableVertexAttribArray(0);
	const u_textureLocation = gl.getUniformLocation(postShd, "u_texture");
	const transformLocation = gl.getUniformLocation(postShd, "transform");
	const offsetLocationPost = gl.getUniformLocation(postShd, "offset");
	gl.uniform1i(u_textureLocation, 0);

	/* Simple Red Box */
	const redShd = compileAndLinkShader(gl, redVtxSrc, redFragSrc);
	gl.useProgram(redShd);
	gl.enableVertexAttribArray(0);
	const transformLocationRed = gl.getUniformLocation(redShd, "transform");
	const offsetLocationRed = gl.getUniformLocation(redShd, "offset");
	const aspect_ratioLocationRed = gl.getUniformLocation(redShd, "aspect_ratio");
	const thicknessLocation = gl.getUniformLocation(redShd, "thickness");

	/* Vertex Buffer of a simple Quad */
	const unitQuad = new Float32Array([
		-1.0, 1.0,
		1.0, 1.0,
		1.0, -1.0,
		-1.0, -1.0
	]);

	const vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unitQuad), gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

	/* Framebuffer setup */
	const framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

	const circleOffsetAnim = new Float32Array([
		0.0, 0.0
	]);

	let aspect_ratio = 0;

	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	function redraw(time) {
		/* Setup PostProcess Framebuffer */
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.useProgram(circleShd);

		/* Draw Circle Animation */
		gl.uniform1f(aspect_ratioLocation, aspect_ratio);
		const radius = 0.1;
		const speed = (time / 10000) % Math.PI * 2
		circleOffsetAnim[0] = radius * Math.cos(speed);
		circleOffsetAnim[1] = radius * Math.sin(speed);
		gl.uniform2fv(offsetLocationCircle, circleOffsetAnim);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		/* Draw the final image to the canvas */
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
		gl.useProgram(redShd);
		gl.uniform1f(aspect_ratioLocationRed, (1.0 / aspect_ratio) - 1.0);
		gl.uniform1f(thicknessLocation, 0.2);
		gl.uniform4f(transformLocationRed, 0.25, 0.25, -0.75, -0.75);
		gl.uniform2fv(offsetLocationRed, circleOffsetAnim);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		gl.uniform1f(thicknessLocation, 0.1);
		gl.uniform4f(transformLocationRed, 0.5, 0.5, 0.0, 0.0);
		gl.uniform2f(offsetLocationRed, -0.75, -0.75);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		requestAnimationFrame(redraw);
	}

	/* Resize the canvas to draw at native one-to-one pixel size */
	/* Awesome solution by https://stackoverflow.com/a/35244519/6240779 */
	function onResize() {
		const dipRect = canvas.getBoundingClientRect();
		const width = Math.round(devicePixelRatio * dipRect.right)
			- Math.round(devicePixelRatio * dipRect.left);
		const height = Math.round(devicePixelRatio * dipRect.bottom)
			- Math.round(devicePixelRatio * dipRect.top);

		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			gl.viewport(0, 0, width, height);
			aspect_ratio = 1.0 / (width / height);
		}
	}

	window.addEventListener('resize', onResize, true);
	onResize();
	redraw(0);
}