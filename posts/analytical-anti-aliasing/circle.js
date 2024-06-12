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

	/* Vertex Buffer */
	const unitQuad = new Float32Array([
		-1.0, 1.0,
		1.0, 1.0,
		1.0, -1.0,
		-1.0, -1.0
	]);

	const vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unitQuad), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	var vtx = gl.getAttribLocation(shaderProgram, "vtx");
	gl.enableVertexAttribArray(vtx);
	gl.vertexAttribPointer(vtx, 2, gl.FLOAT, false, 0, 0);

	/* Vertex Buffer */
	const transform = new Float32Array([
		1.0, 0.0,
		0.0, 1.0,
	]);

	const transformLocation = gl.getUniformLocation(shaderProgram, "transform");

	gl.uniformMatrix2fv(transformLocation, false, transform);

	function redraw() {
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	}

	function createAndCompileShader(type, source) {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, document.getElementById(source).text);
		gl.compileShader(shader);
		return shader;
	}

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
}