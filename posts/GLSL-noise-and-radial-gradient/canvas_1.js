/* Init */
const canvas = document.getElementById("canvas_1");
const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });
gl.clearColor(0, 0, 0, 1);

const canvasToDisplaySizeMap = new Map([[canvas, [-1, -1]]]);


// Listen for resize events on the window
window.addEventListener("resize", onResize, false);

function redraw() {
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clear(gl.COLOR_BUFFER_BIT);

	// Define vertices of a triangle
	var vertices = [
		0.0, 0.5, 0.0, // Vertex 1
		-0.5, -0.5, 0.0, // Vertex 2
		0.5, -0.5, 0.0 // Vertex 3
	];

	// Create buffer
	var vertex_buffer = gl.createBuffer();

	// Bind buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

	// Pass data to buffer
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	// Unbind buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	// Create shaders
	var vertCode = 'attribute vec3 coordinates;' +
		'void main(void) {' +
		' gl_Position = vec4(coordinates, 1.0);' +
		'}';
	var vertShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertShader, vertCode);
	gl.compileShader(vertShader);

	var fragCode = 'void main(void) {' +
		' gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);' +
		'}';
	var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragShader, fragCode);
	gl.compileShader(fragShader);

	// Create shader program
	var shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertShader);
	gl.attachShader(shaderProgram, fragShader);
	gl.linkProgram(shaderProgram);
	gl.useProgram(shaderProgram);

	// Bind vertex buffer object
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

	// Get the attribute location
	var coord = gl.getAttribLocation(shaderProgram, "coordinates");

	// Point an attribute to the currently bound VBO
	gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);

	// Enable the attribute
	gl.enableVertexAttribArray(coord);

	// Draw the triangle
	gl.drawArrays(gl.TRIANGLES, 0, 3);
	console.log("redraw");
}


/* Proper resize handling for native resolution canvases */

function onResize() {
	// Handle the resize event here
	let width = canvas.clientWidth;
	let height = canvas.clientHeight;
	let dpr = window.devicePixelRatio;

	const displayWidth = Math.round(width * dpr);
	const displayHeight = Math.round(height * dpr);
	canvasToDisplaySizeMap.set(canvas, [displayWidth, displayHeight]);

	resizeCanvasToDisplaySize(canvas);
}

function resizeCanvasToDisplaySize(canvas) {
	// Get the size the browser is displaying the canvas in device pixels.
	const [displayWidth, displayHeight] = canvasToDisplaySizeMap.get(canvas);

	// Check if the canvas is not the same size.
	const needResize = canvas.width !== displayWidth || canvas.height !== displayHeight;

	if (needResize) {
		// Make the canvas the same size
		canvas.width = displayWidth;
		canvas.height = displayHeight;
		redraw();
	}
	return needResize;
}

// Initial call to ensure canvas is sized correctly from the start
onResize();
