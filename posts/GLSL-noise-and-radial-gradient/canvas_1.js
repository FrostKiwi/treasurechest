/* Init */
const canvas = document.getElementById("canvas_1");
const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });

/* Shaders */
const vertexShader = createAndCompileShader(gl.VERTEX_SHADER, "vertex_1");
const fragmentShader = createAndCompileShader(gl.FRAGMENT_SHADER, "fragment_1");

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

const canvasToDisplaySizeMap = new Map([[canvas, [-1, -1]]]);
const resizeObserver = new ResizeObserver(onResize);
resizeObserver.observe(canvas, { box: 'content-box' });

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

function onResize(entries) {
	for (const entry of entries) {
		let width;
		let height;
		let dpr = window.devicePixelRatio;
		if (entry.devicePixelContentBoxSize) {
			width = entry.devicePixelContentBoxSize[0].inlineSize;
			height = entry.devicePixelContentBoxSize[0].blockSize;
			dpr = 1;
		} else if (entry.contentBoxSize) {
			if (entry.contentBoxSize[0]) {
				width = entry.contentBoxSize[0].inlineSize;
				height = entry.contentBoxSize[0].blockSize;
			} else {
				width = entry.contentBoxSize.inlineSize;
				height = entry.contentBoxSize.blockSize;
			}
		} else {
			width = entry.contentRect.width;
			height = entry.contentRect.height;
		}
		const displayWidth = Math.round(width * dpr);
		const displayHeight = Math.round(height * dpr);
		canvasToDisplaySizeMap.set(entry.target, [displayWidth, displayHeight]);
	}
	if (resizeCanvasToDisplaySize(canvas)) {
		redraw();
	}
}

function resizeCanvasToDisplaySize(canvas) {
	const [displayWidth, displayHeight] = canvasToDisplaySizeMap.get(canvas);

	const needResize = canvas.width !== displayWidth ||
		canvas.height !== displayHeight;

	if (needResize) {
		canvas.width = displayWidth;
		canvas.height = displayHeight;
	}

	return needResize;
}