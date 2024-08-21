"use strict";
async function loadFrame(gl, path) {
	const response = await fetch(path);
	const blob = await response.blob();
	const bitmap = await createImageBitmap(blob);

	const target = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, target);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);

	bitmap.close();
	return target;
}

async function loadAllFrames(gl, start, end) {
	const framePromises = [];
	for (let i = start; i <= end; i++) {
		const path = `frames/${i}.png`;
		framePromises.push(loadFrame(gl, path));
	}

	const textures = await Promise.all(framePromises);
	return textures;
}

function setupFXAA(canvasId, circleVtxSrc, circleFragSrc) {
	/* Init */
	const canvas = document.getElementById(canvasId);
	const gl = canvas.getContext('webgl',
		{
			preserveDrawingBuffer: true,
			antialias: false,
			alpha: false,
			premultipliedAlpha: false
		}
	);

	/* Shaders */
	/* Circle Shader */
	const fxaaShd = compileAndLinkShader(gl, circleVtxSrc, circleFragSrc);
	const rcpFrameLocation = gl.getUniformLocation(fxaaShd, "RcpFrame");
	const enableLocation = gl.getUniformLocation(fxaaShd, "enable");

	/* Load frames */
	let framesLoaded = false;
	let textures = [];

	/* Load frames */
	loadAllFrames(gl, 11, 30).then((loadedTextures) => {
		textures = loadedTextures;
		framesLoaded = true;
	});

	/* Vertex Buffer of a simple Quad with some colors */
	const unitQuad = new Float32Array([
		-1.0, 1.0,
		1.0, 1.0,
		1.0, -1.0,
		-1.0, -1.0,
	]);

	const vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, unitQuad, gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);

	let last_time = 0;
	let redrawActive = false;
	let exportIMG = false;

	canvas.width = 640;
	canvas.height = 480;

	gl.viewport(0, 0, 640, 480);

	const fps = 30;
	const frameDuration = 1000 / fps;
	let frameIndex = 0;
	let lastFrameTime = 0;
	let forward = true;

	let frame = 0;
	function redraw() {
		redrawActive = true;

		/* Setup PostProcess Framebuffer */
		gl.bindTexture(gl.TEXTURE_2D, textures[frameIndex]);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.useProgram(fxaaShd);
		gl.uniform2f(rcpFrameLocation, 1.0 / canvas.width, 1.0 / canvas.height);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		redrawActive = false;

		if (exportIMG && framesLoaded) {
			gl.finish();
			if (frame == 19)
				exportIMG = false;
			canvas.toBlob((blob) => {
				const url = URL.createObjectURL(blob);

				const a = document.createElement('a');
				a.style.display = 'none';
				a.href = url;
				a.download = `lover${frame}.png`;

				document.body.appendChild(a);
				a.click();

				document.body.removeChild(a);
				URL.revokeObjectURL(url);
			}, `image/png`);
		}
		frame++;
		if (frame > 19)
			frame = 0;
	}

	let isRendering = false;

	function renderLoop(time) {
		if (isRendering) {

			if (time - lastFrameTime >= frameDuration) {
				lastFrameTime = time;

				redraw();

				if (forward) {
					frameIndex++;
					if (frameIndex == 19) {
						forward = false;
						setTimeout(() => requestAnimationFrame(renderLoop), 1000);
						return;
					}
				} else {
					frameIndex--;
					if (frameIndex < 0) {
						forward = true;
						frameIndex = 0;
						setTimeout(() => requestAnimationFrame(renderLoop), 1000);
						return;
					}
				}
			}

			requestAnimationFrame(renderLoop);
		}
	}

	function handleIntersection(entries) {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				if (!isRendering) {
					/* Start rendering, when canvas visible */
					isRendering = true;
					renderLoop(last_time);
				}
			} else {
				/* Stop another redraw being called */
				isRendering = false;
				while (redrawActive) {
					/* Spin on draw calls being processed. To simplify sync.
					   In reality this code is block is never reached, but just
					   in case, we have this here. */
				}
				/* Force the rendering pipeline to sync with CPU before we mess with it */
				gl.finish();

				/* Delete the important buffer to free up memory */
				//buffersInitialized = false;
			}
		});
	}

	/* Only render when the canvas is actually on screen */
	let observer = new IntersectionObserver(handleIntersection);
	observer.observe(canvas);
}
