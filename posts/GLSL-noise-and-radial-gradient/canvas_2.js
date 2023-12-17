(function () {
/* Init */
const canvas = document.getElementById("canvas_2");
const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });

/* Shaders */
const vertexShader = createAndCompileShader(gl.VERTEX_SHADER, "vertex_2");
const fragmentShader = createAndCompileShader(gl.FRAGMENT_SHADER, "fragment_2");

const shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vertexShader);
gl.attachShader(shaderProgram, fragmentShader);
gl.linkProgram(shaderProgram);
gl.useProgram(shaderProgram);


/* Vertex Buffer */
const unitQuad = new Float32Array([
	-1.0, 3.0,
	-1.0, -1.0,
	3.0, -1.0
]);

const vertex_buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unitQuad), gl.STATIC_DRAW);

gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
var vtx = gl.getAttribLocation(shaderProgram, "vtx");
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
})();