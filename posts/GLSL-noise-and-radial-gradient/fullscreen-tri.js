"use strict";
function setupTri(canvasId, vertexId, fragmentId) {
	/* Init */
	const canvas = document.getElementById(canvasId);
	const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });

	/* Shaders */
	const vertexShader = createAndCompileShader(gl.VERTEX_SHADER, vertexId);
	const fragmentShader = createAndCompileShader(gl.FRAGMENT_SHADER, fragmentId);

	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);
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

	/* 1:1 Pixel Mapping */
	function onResize() {
		const width = Math.round(canvas.clientWidth * window.devicePixelRatio);
		const height = Math.round(canvas.clientHeight * window.devicePixelRatio);

		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
			redraw();
		}
	}
	window.addEventListener('resize', onResize, true);
	onResize();
};