"use strict";

/* Helpers */
function createAndCompileShader(gl, type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, document.getElementById(source).text);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error(gl.getShaderInfoLog(shader));
	}
	return shader;
}

function setupTexture(gl, target, source){
	gl.deleteTexture(target);
	target = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, target);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	/* Technically we can prepare the Black and White video as mono H.264 and
	   upload just one channel, but keep it simple for the blog post */
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
	return target;
}

function setupTri(canvasId, vertexId, fragmentId, lut) {
	/* Init */
	const canvas = document.getElementById(canvasId);
	const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });
	const lutImg = document.getElementById(lut);
	let lutTexture, videoTexture;

	/* Shaders */
	const vertexShader = createAndCompileShader(gl, gl.VERTEX_SHADER, vertexId);
	const fragmentShader = createAndCompileShader(gl, gl.FRAGMENT_SHADER, fragmentId);

	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);
	gl.useProgram(shaderProgram);

	const lutTextureLocation = gl.getUniformLocation(shaderProgram, "lut");

	/* Video Setup */
	const video = document.querySelector('video');

	if (video.paused) {
		video.loop = true;
		video.muted = true;
		video.play();
	}

	let videoTextureInitialized = false;
	let lutTextureInitialized = false;

	function updateTextures() {
		if (lut && lutImg.naturalWidth && !lutTextureInitialized) {
			lutTexture = setupTexture(gl, lutTexture, lutImg);
			lutTextureInitialized = true;
		}

		gl.activeTexture(gl.TEXTURE0);
		if (video.readyState >= video.HAVE_CURRENT_DATA) {
			if (!videoTextureInitialized || video.videoWidth !== canvas.width || video.videoHeight !== canvas.height) {
				videoTexture = setupTexture(gl, videoTexture, video);
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				videoTextureInitialized = true;
			}
			/* Update without recreation */
			gl.bindTexture(gl.TEXTURE_2D, videoTexture);
			gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGB, gl.UNSIGNED_BYTE, video);

			if (lut) {
				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D, lutTexture);
				gl.uniform1i(lutTextureLocation, 1);
			}
		}
	}

	/* Vertex Buffer with a Fullscreen Triangle */
	/* Position and UV coordinates */
	const unitTri = new Float32Array([
		-1.0, 3.0, 0.0, -1.0,
		-1.0, -1.0, 0.0, 1.0,
		3.0, -1.0, 2.0, 1.0
	]);

	const vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unitTri), gl.STATIC_DRAW);

	const vtx = gl.getAttribLocation(shaderProgram, "vtx");
	gl.enableVertexAttribArray(vtx);
	gl.vertexAttribPointer(vtx, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);

	const texCoord = gl.getAttribLocation(shaderProgram, "UVs");
	gl.enableVertexAttribArray(texCoord);
	gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

	function redraw() {
		updateTextures();
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}

	let isRendering = false;

	function renderLoop() {
		redraw();
		if (isRendering) {
			requestAnimationFrame(renderLoop);
		}
	}

	function handleIntersection(entries) {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				if (!isRendering) {
					isRendering = true;
					renderLoop();
				}
			} else {
				isRendering = false;
				videoTextureInitialized = false;
				gl.deleteTexture(videoTexture);
			}
		});
	}

	let observer = new IntersectionObserver(handleIntersection);
	observer.observe(canvas);
};