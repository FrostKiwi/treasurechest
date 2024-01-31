"use strict";
function setupTri(canvasId, vertexId, fragmentId) {
	/* Init */
	const canvas = document.getElementById(canvasId);
	const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });

	const lutImg = document.getElementById('viridis');
	const lutTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, lutTexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, lutImg);

	/* Video Setup */
	const video = document.querySelector('video');

	if (video.paused) {
		video.loop = true;
		video.muted = true;
		video.play();
	}

	const videoTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, videoTexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	/* Shaders */
	const vertexShader = createAndCompileShader(gl.VERTEX_SHADER, vertexId);
	const fragmentShader = createAndCompileShader(gl.FRAGMENT_SHADER, fragmentId);

	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);
	const videoTextureLocation = gl.getUniformLocation(shaderProgram, "video");
	const lutTextureLocation = gl.getUniformLocation(shaderProgram, "lut");

	/* Video Texture Update */
	let videoTextureInitialized = false;

	function updateVideoTexture() {
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, videoTexture);

		if (video.readyState >= video.HAVE_CURRENT_DATA) {
			if (!videoTextureInitialized || video.videoWidth !== canvas.width || video.videoHeight !== canvas.height) {
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, video.videoWidth, video.videoHeight, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				videoTextureInitialized = true;
			}
			/* Update without recreation */
			gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGB, gl.UNSIGNED_BYTE, video);

			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, lutTexture);
			gl.uniform1i(lutTextureLocation, 1);
		}
	}

	gl.useProgram(shaderProgram);

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