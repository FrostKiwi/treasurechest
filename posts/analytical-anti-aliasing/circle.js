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

function setupTri(canvasId, circleVtxSrc, circleFragSrc, postVtxSrc, postFragSrc) {
	/* Init */
	const canvas = document.getElementById(canvasId);
	const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });

	/* Shaders */
	/* Circle Shader */
	const circleShd = compileAndLinkShader(gl, circleVtxSrc, circleFragSrc);
	gl.useProgram(circleShd);
	gl.enableVertexAttribArray(0);
	const aspect_ratioLocation = gl.getUniformLocation(circleShd, "aspect_ratio");
	const timeLocation = gl.getUniformLocation(circleShd, "time");

	/* Post Processing Shader */
	const postShd = compileAndLinkShader(gl, postVtxSrc, postFragSrc);
	gl.enableVertexAttribArray(0);
	const u_textureLocation = gl.getUniformLocation(postShd, "u_texture");
	gl.uniform1i(u_textureLocation, 0);

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
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

	function redraw(time) {
		/* Setup PostProcess Framebuffer */
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.useProgram(circleShd);

		/* Draw Circle Animation */
		gl.uniform1f(aspect_ratioLocation, 1.0 / (canvas.width / canvas.height));
		gl.uniform1f(timeLocation, (time / 10000) % Math.PI * 2);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		/* Draw the final image to the canvas */
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.useProgram(postShd);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		requestAnimationFrame(redraw);
	}

	/* Resize the canvas to draw at native one-to-one pixel size */
	function onResize() {
		const width = Math.round(canvas.clientWidth * window.devicePixelRatio);
		const height = Math.round(canvas.clientHeight * window.devicePixelRatio);

		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			gl.viewport(0, 0, width, height);
		}
	}

	window.addEventListener('resize', onResize, true);
	onResize();
	redraw();
}