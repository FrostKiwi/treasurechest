"use strict";
function createAndCompileShader(gl, type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, document.getElementById(source).text);
	gl.compileShader(shader);
	return shader;
}

/* Resize the canvas to draw at native one-to-one pixel size */
function onResize(canvas) {
	const width = Math.round(canvas.clientWidth * window.devicePixelRatio);
	const height = Math.round(canvas.clientHeight * window.devicePixelRatio);

	if (canvas.width !== width || canvas.height !== height) {
		canvas.width = width;
		canvas.height = height;
	}
}

function setupTri(canvasId, circleVtxSrc, circleFragSrc, redrawVtxSrc, redrawFragSrc) {
	/* Init */
	const canvas = document.getElementById(canvasId);
	const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });

	/* Shaders */
	const circleVtxShd = createAndCompileShader(gl, gl.VERTEX_SHADER, circleVtxSrc);
	const circleFragShd = createAndCompileShader(gl, gl.FRAGMENT_SHADER, circleFragSrc);
	
	const redrawVtxShd = createAndCompileShader(gl, gl.VERTEX_SHADER, redrawVtxSrc);
	const redrawFragShd = createAndCompileShader(gl, gl.FRAGMENT_SHADER, redrawFragSrc);
	
	const circleShd = gl.createProgram();
	gl.attachShader(circleShd, circleVtxShd);
	gl.attachShader(circleShd, circleFragShd);
	gl.linkProgram(circleShd);
	gl.useProgram(circleShd);
	
	const redrawShd = gl.createProgram();
	gl.attachShader(redrawShd, redrawVtxShd);
	gl.attachShader(redrawShd, redrawFragShd);
	gl.linkProgram(redrawShd);

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
	var vtx = gl.getAttribLocation(circleShd, "vtx");
	gl.enableVertexAttribArray(vtx);
	gl.vertexAttribPointer(vtx, 2, gl.FLOAT, false, 0, 0);

	const aspect_ratioLocation = gl.getUniformLocation(circleShd, "aspect_ratio");
	const timeLocation = gl.getUniformLocation(circleShd, "time");

	function redraw() {
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	}

	function updateTransform(time) {
		gl.uniform1f(aspect_ratioLocation, 1.0 / (canvas.width / canvas.height));
		gl.uniform1f(timeLocation, (time / 10000) % Math.PI * 2);
		redraw();
		requestAnimationFrame(updateTransform);
	}

	window.addEventListener('resize', onResize(canvas), true);
	onResize(canvas);
	updateTransform();
}