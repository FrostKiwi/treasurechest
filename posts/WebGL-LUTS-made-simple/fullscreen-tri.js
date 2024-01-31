"use strict";
function setupTri(canvasId, vertexId, fragmentId) {
	/* Init */
	const canvas = document.getElementById(canvasId);
	const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });

	/* Video Setup */
	const video = document.querySelector('video');
	const videoTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, videoTexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	// Update the video texture each frame
	function updateVideoTexture() {
		if (video.readyState >= video.HAVE_CURRENT_DATA) {
			gl.bindTexture(gl.TEXTURE_2D, videoTexture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
		}
	}

	/* Shaders */
	const vertexShader = createAndCompileShader(gl.VERTEX_SHADER, vertexId);
	const fragmentShader = createAndCompileShader(gl.FRAGMENT_SHADER, fragmentId);

	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);
	const videoTextureLocation = gl.getUniformLocation(shaderProgram, "video");
	
	gl.useProgram(shaderProgram);
	gl.uniform1i(videoTextureLocation, 0);

	/* Vertex Buffer with a Fullscreen Triangle */
	const unitTri = new Float32Array([
		-1.0, 3.0,
		-1.0, -1.0,
		3.0, -1.0
	]);

	const vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unitTri), gl.STATIC_DRAW);

	const vtx = gl.getAttribLocation(shaderProgram, "vtx");
	gl.enableVertexAttribArray(vtx);
	gl.vertexAttribPointer(vtx, 2, gl.FLOAT, false, 0, 0);

	function redraw() {
		updateVideoTexture();
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}

	function createAndCompileShader(type, source) {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, document.getElementById(source).text);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(shader));
		}
		return shader;
	}

	function renderLoop() {
		redraw();
		requestAnimationFrame(renderLoop);
	}
	renderLoop();
};