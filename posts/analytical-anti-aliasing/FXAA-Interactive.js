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

/* Normal transform
357.25	206.375
356.602	207.301
356.309	207.559
354.832	208.711
353.121	209.863
350.578	211.102
347.594	212.336
343.457	214.652
338.086	216.977
332.803	219.934
327.791	222.625
324.259	224.398
319.233	227.902
315.627	231.492
315.381	233.305
314.672	234.145
314.616	235.363
315.028	236.508
316.072	237.676
317.366	238.301
317.657	239.703
319.354	240.016
320.018	241.277
321.091	241.785
321.726	241.777
321.824	242.117
322.334	242.109
322.082	242.965

Retrack
356.188	206.188
355.488	207.145
355.195	207.367
353.859	208.531
352.148	209.699
349.438	210.875
346.484	212.188
342.305	214.477
337.125	216.809
331.816	219.738
326.789	222.449
323.188	224.207
318.188	227.742
314.543	231.297
314.238	233.133
313.598	233.926
313.516	235.188
314.09	236.312
315.121	237.496
316.227	238.125
316.578	239.523
318.199	239.828
319.082	241.117
320.129	241.613
320.684	241.594
320.855	241.91
321.188	241.91
321.121	242.801


End of Keyframe Data
 */

async function loadAllFrames(gl, start, end) {
	const framePromises = [];
	for (let i = start; i <= end; i++) {
		const path = `frames/${i}.png`;
		framePromises.push(loadFrame(gl, path));
	}

	const textures = await Promise.all(framePromises);
	return textures;
}

function setupFXAA(canvasId, simpleVtxSrc, simpleFragSrc, ) {
	/* Init */
	const canvas = document.getElementById(canvasId);
	const gl = canvas.getContext('webgl',
		{
			preserveDrawingBuffer: false,
			antialias: false,
			alpha: false,
			premultipliedAlpha: false
		}
	);

	/* Shaders */
	/* Circle Shader */
	const fxaaShd = compileAndLinkShader(gl, simpleVtxSrc, simpleFragSrc);
	const rcpFrameLocation = gl.getUniformLocation(fxaaShd, "RcpFrame");
	const enableLocation = gl.getUniformLocation(fxaaShd, "enable");

	/* Load frames */
	let framesLoaded = false;
	let textures = [];

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

	canvas.width = 684;
	canvas.height = 480;

	gl.viewport(0, 0, 684, 480);

	const fps = 30;
	const frameDuration = 1000 / fps;
	let frameIndex = 0;
	let lastFrameTime = 0;
	let forward = true;
	let start = false;

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
			if (frameIndex == 0)
				start = true;
		}
		if (start) {
			gl.finish();
			if (frameIndex == 28){
				start = false;
				exportIMG = false;
			}
			canvas.toBlob((blob) => {
				const url = URL.createObjectURL(blob);
				console.log(frameIndex);
				const a = document.createElement('a');
				a.style.display = 'none';
				a.href = url;
				a.download = `${frameIndex}.png`;

				document.body.appendChild(a);
				a.click();

				document.body.removeChild(a);
				URL.revokeObjectURL(url);
			}, `image/png`);
		}
		frame++;
		/* 		if (frame > 32)
					frame = 0; */
	}

	let isRendering = false;

	function renderLoop(time) {
		if (isRendering) {

			if (time - lastFrameTime >= frameDuration) {
				lastFrameTime = time;

				redraw();

				if (forward) {
					frameIndex++;
					if (frameIndex == 29) {
						frameIndex = 28;
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

	async function handleIntersection(entries) {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				if (!isRendering) {
					/* Start rendering, when canvas visible */
					isRendering = true;

					/* Load all frames and await the result */
					textures = await loadAllFrames(gl, 0, 28);
					framesLoaded = true;

					renderLoop(last_time);
				}
			} else {
				/* Stop another redraw being called */
				isRendering = false;
				while (redrawActive) {
					/* Spin on draw calls being processed. To simplify sync.
					   In reality, this code block is never reached, but just
					   in case, we have this here. */
				}
				/* Force the rendering pipeline to sync with CPU before we mess with it */
				gl.finish();

				/* Delete the textures to free up memory */
				if (framesLoaded) {
					textures.forEach(texture => {
						gl.deleteTexture(texture);
					});
					textures = [];
					framesLoaded = false;
				}
			}
		}
	}


	/* Only render when the canvas is actually on screen */
	let observer = new IntersectionObserver(handleIntersection);
	observer.observe(canvas);
}
