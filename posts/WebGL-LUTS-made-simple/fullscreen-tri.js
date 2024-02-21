"use strict";

/* Helpers */
function createAndCompileShader(gl, type, source, canvas) {
	const shader = gl.createShader(type);
	const element = document.getElementById(source);
	let shaderSource;

	if (element.tagName === 'SCRIPT')
		shaderSource = element.text;
	else
		shaderSource = ace.edit(source).getValue();

	gl.shaderSource(shader, shaderSource);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
		displayErrorMessage(canvas, gl.getShaderInfoLog(shader));
	else
		displayErrorMessage(canvas, "");
	return shader;
}

function displayErrorMessage(canvas, message) {
	let errorElement = canvas.nextSibling;
	const hasErrorElement = errorElement && errorElement.tagName === 'PRE';

	if (message) {
		if (!hasErrorElement) {
			errorElement = document.createElement('pre');
			errorElement.style.color = 'red';
			canvas.parentNode.insertBefore(errorElement, canvas.nextSibling);
		}
		errorElement.textContent = `Shader Compilation Error: ${message}`;
		canvas.style.display = 'none';
		errorElement.style.display = 'block';
	} else {
		if (hasErrorElement)
			errorElement.style.display = 'none';
		canvas.style.display = 'block';
	}
}


function setupTexture(gl, target, source) {
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

function setupTri(canvasId, vertexId, fragmentId, videoId, lut, buttonId) {
	/* Init */
	const canvas = document.getElementById(canvasId);
	const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });
	const lutImg = document.getElementById(lut);
	let lutTexture, videoTexture, shaderProgram;

	/* Shaders */
	function initializeShaders() {
		const vertexShader = createAndCompileShader(gl, gl.VERTEX_SHADER, vertexId, canvas);
		const fragmentShader = createAndCompileShader(gl, gl.FRAGMENT_SHADER, fragmentId, canvas);

		shaderProgram = gl.createProgram();
		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmentShader);
		gl.linkProgram(shaderProgram);

		/* Clean-up */
		gl.detachShader(shaderProgram, vertexShader);
		gl.detachShader(shaderProgram, fragmentShader);
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);

		gl.useProgram(shaderProgram);
	}

	initializeShaders();

	const lutTextureLocation = gl.getUniformLocation(shaderProgram, "lut");

	if (buttonId) {
		const button = document.getElementById(buttonId);
		button.addEventListener('click', function () {
			if (shaderProgram)
				gl.deleteProgram(shaderProgram);
			initializeShaders();
		});
	}

	/* Video Setup */
	const video = document.getElementById(videoId);

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