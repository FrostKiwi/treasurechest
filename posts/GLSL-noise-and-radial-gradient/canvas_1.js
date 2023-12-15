"use strict";
/* Init */
const canvas = document.getElementById("canvas_1");
const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });
gl.clearColor(0, 0, 0, 0);

function redraw() {
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clear(gl.COLOR_BUFFER_BIT);

	const unitquadtex = new Float32Array([
		-1.0, 1.0,
		1.0, 1.0,
		1.0, -1.0,
		-1.0, -1.0
	]);

	const vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unitquadtex), gl.STATIC_DRAW);

	// Create shaders
	var vertCode =
	'attribute vec2 vtx;' +
	'varying vec2 uv;' +
	'void main() {' +
		'uv = vtx;' +
		'gl_Position = vec4(vtx, 0.0, 1.0);' +
	'}';
	var vertShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertShader, vertCode);
	gl.compileShader(vertShader);
	if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
		console.error('Vertex shader compilation error: ' + gl.getShaderInfoLog(vertShader));
	}
	var fragCode =
		'precision mediump float;' +
		'varying vec2 uv;' +
		'void main(void) {' +
		'     if(length(uv) < 1.0)' +
		'         gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);' +
		'     else' +
		'         discard;' +
		'}';

	var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragShader, fragCode);
	gl.compileShader(fragShader);

	if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
		console.error('Fragment shader compilation error: ' + gl.getShaderInfoLog(fragShader));
	}

	// Create shader program
	var shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertShader);
	gl.attachShader(shaderProgram, fragShader);
	gl.linkProgram(shaderProgram);
	gl.useProgram(shaderProgram);

	// Bind vertex buffer object
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

	// Get the attribute location
	var vtx = gl.getAttribLocation(shaderProgram, "vtx");
	gl.enableVertexAttribArray(vtx);
	gl.vertexAttribPointer(vtx, 2, gl.FLOAT, false,
		2 * Float32Array.BYTES_PER_ELEMENT, 0);
		
	// Draw the triangle
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	console.log("redrawn");
}

const canvasToDisplaySizeMap = new Map([[canvas, [-1, -1]]]);

function onResize(entries) {
	for (const entry of entries) {
		let width;
		let height;
		let dpr = window.devicePixelRatio;
		if (entry.devicePixelContentBoxSize) {
			// NOTE: Only this path gives the correct answer
			// The other 2 paths are an imperfect fallback
			// for browsers that don't provide anyway to do this
			width = entry.devicePixelContentBoxSize[0].inlineSize;
			height = entry.devicePixelContentBoxSize[0].blockSize;
			dpr = 1; // it's already in width and height
		} else if (entry.contentBoxSize) {
			if (entry.contentBoxSize[0]) {
				width = entry.contentBoxSize[0].inlineSize;
				height = entry.contentBoxSize[0].blockSize;
			} else {
				// legacy
				width = entry.contentBoxSize.inlineSize;
				height = entry.contentBoxSize.blockSize;
			}
		} else {
			// legacy
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

const resizeObserver = new ResizeObserver(onResize);
resizeObserver.observe(canvas, { box: 'content-box' });

function resizeCanvasToDisplaySize(canvas) {
	// Get the size the browser is displaying the canvas in device pixels.
	const [displayWidth, displayHeight] = canvasToDisplaySizeMap.get(canvas);

	// Check if the canvas is not the same size.
	const needResize = canvas.width !== displayWidth ||
		canvas.height !== displayHeight;

	if (needResize) {
		// Make the canvas the same size
		canvas.width = displayWidth;
		canvas.height = displayHeight;
	}

	return needResize;
}