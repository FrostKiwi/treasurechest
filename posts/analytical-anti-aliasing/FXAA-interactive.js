"use strict";
async function loadFrame(gl, path) {
	const response = await fetch(path);
	const blob = await response.blob();
	const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none' });

	const target = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, target);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, bitmap);

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

function setupFXAAInteractive(canvasId, simpleVtxSrc, simpleFragSrc, vertexLumaSrc, lumaFragSrc, blitVtxSrc, blitFragSrc, redVtxSrc, redFragSrc) {
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

	let lumaBuffer, lumaTexture, blitBuffer, blitTexture;
	let enableFXAA = true;
	let enableRed = true;
	let showLuma = false;
	let greenLuma = false;
	let pause = false;
	let fxaaQualityPreset = 12;

	/* Shaders */
	/* Passthrough Shader */
	let fxaaShd;
	let rcpFrameLocation;
	let fxaaQualitySubpixLocation;
	let fxaaQualityEdgeThresholdLocation;
	let fxaaQualityEdgeThresholdMinLocation;

	function updateFXAAShader() {
		if (fxaaShd) {
			gl.deleteProgram(fxaaShd);
		}

		const prefix = `
        #define FXAA_QUALITY_PRESET ${fxaaQualityPreset}
        #define FXAA_GREEN_AS_LUMA ${greenLuma ? 1 : 0}
        #define FXAA_ENABLE ${enableFXAA ? 1 : 0}
        #define FXAA_LUMA ${showLuma ? 1 : 0}
	    `;

		fxaaShd = compileAndLinkShader(gl, simpleVtxSrc, simpleFragSrc, prefix);

		rcpFrameLocation = gl.getUniformLocation(fxaaShd, "RcpFrame");
		fxaaQualitySubpixLocation = gl.getUniformLocation(fxaaShd, "u_fxaaQualitySubpix");
		fxaaQualityEdgeThresholdLocation = gl.getUniformLocation(fxaaShd, "u_fxaaQualityEdgeThreshold");
		fxaaQualityEdgeThresholdMinLocation = gl.getUniformLocation(fxaaShd, "u_fxaaQualityEdgeThresholdMin");
	}

	updateFXAAShader();

	const lumaShd = compileAndLinkShader(gl, vertexLumaSrc, lumaFragSrc);

	/* Blit Shader */
	const blitShd = compileAndLinkShader(gl, blitVtxSrc, blitFragSrc);
	const transformLocation = gl.getUniformLocation(blitShd, "transform");
	const offsetLocationPost = gl.getUniformLocation(blitShd, "offset");

	/* Simple Red Box */
	const redShd = compileAndLinkShader(gl, redVtxSrc, redFragSrc);
	const transformLocationRed = gl.getUniformLocation(redShd, "transform");
	const offsetLocationRed = gl.getUniformLocation(redShd, "offset");
	const aspect_ratioLocationRed = gl.getUniformLocation(redShd, "aspect_ratio");
	const thicknessLocation = gl.getUniformLocation(redShd, "thickness");
	const pixelsizeLocation = gl.getUniformLocation(redShd, "pixelsize");

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

	const trackedCoords = [
		[357.250, 206.375],
		[356.602, 207.301],
		[356.309, 207.559],
		[354.832, 208.711],
		[353.121, 209.863],
		[350.578, 211.102],
		[347.594, 212.336],
		[343.457, 214.652],
		[338.086, 216.977],
		[332.803, 219.934],
		[327.791, 222.625],
		[324.259, 224.398],
		[319.233, 227.902],
		[315.627, 231.492],
		[315.381, 233.305],
		[314.672, 234.145],
		[314.616, 235.363],
		[315.028, 236.508],
		[316.072, 237.676],
		[317.366, 238.301],
		[317.657, 239.703],
		[319.354, 240.016],
		[320.018, 241.277],
		[321.091, 241.785],
		[321.726, 241.777],
		[321.824, 242.117],
		[322.334, 242.109],
		[322.082, 242.965],
		[322.100, 242.965]
	];

	function applyTrackingData(index, location) {
		const x = (trackedCoords[index][0] / canvas.width) * 2 - 1;
		const y = 1 - (trackedCoords[index][1] / canvas.height) * 2;
		gl.uniform2f(location, x, y);
	}

	function setupBuffers() {
		gl.deleteFramebuffer(lumaBuffer);
		lumaBuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, lumaBuffer);

		lumaTexture = setupTexture(gl, canvas.width, canvas.height, lumaTexture, gl.LINEAR);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, lumaTexture, 0);

		gl.deleteFramebuffer(blitBuffer);
		blitBuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, blitBuffer);

		blitTexture = setupTexture(gl, canvas.width, canvas.height, blitTexture, gl.NEAREST);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, blitTexture, 0);
	}

	/* Not working :[ Maybe pass it in as a param */
	const fxaaCheckbox = document.getElementById('fxaaCheck');
	fxaaCheckbox.addEventListener('change', () => {
		enableFXAA = fxaaCheckbox.checked;
		updateFXAAShader();
		redraw();
	});
	const redCheckbox = document.getElementById('redCheck');
	redCheckbox.addEventListener('change', () => {
		enableRed = redCheckbox.checked;
		redraw();
	});
	const pauseCheckbox = document.getElementById('pauseCheck');
	pauseCheckbox.addEventListener('change', () => {
		pause = !pauseCheckbox.checked;
		redraw();
	});
	const lumaCheckbox = document.getElementById('lumaCheck');
	lumaCheckbox.addEventListener('change', () => {
		showLuma = lumaCheckbox.checked;
		updateFXAAShader();
		redraw();
	});
	const greenCheckbox = document.getElementById('greenCheck');
	greenCheckbox.addEventListener('change', () => {
		greenLuma = greenCheckbox.checked;
		updateFXAAShader();
		redraw();
	});

	/* FXAA Parameters */
	const fxaaQualityPresetSelect = document.getElementById('FXAA_QUALITY_PRESET');
	fxaaQualityPresetSelect.addEventListener('change', function () {
		fxaaQualityPreset = parseInt(fxaaQualityPresetSelect.value);
		updateFXAAShader();
		redraw();
	});

	let fxaaQualitySubpix = 0.75;
	let fxaaQualityEdgeThreshold = 0.166;
	let fxaaQualityEdgeThresholdMin = 0.0833;

	const fxaaQualitySubpixRange = document.getElementById('fxaaQualitySubpixRange');
	const fxaaQualityEdgeThresholdRange = document.getElementById('fxaaQualityEdgeThresholdRange');
	const fxaaQualityEdgeThresholdMinRange = document.getElementById('fxaaQualityEdgeThresholdMinRange');

	fxaaQualitySubpixRange.addEventListener('input', function () {
		fxaaQualitySubpix = parseFloat(fxaaQualitySubpixRange.value);
		redraw();
	});

	fxaaQualityEdgeThresholdRange.addEventListener('input', function () {
		fxaaQualityEdgeThreshold = parseFloat(fxaaQualityEdgeThresholdRange.value);
		redraw();
	});

	fxaaQualityEdgeThresholdMinRange.addEventListener('input', function () {
		fxaaQualityEdgeThresholdMin = parseFloat(fxaaQualityEdgeThresholdMinRange.value);
		redraw();
	});

	const vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, unitQuad, gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);

	let last_time = 0;
	let redrawActive = false;

	canvas.width = 684;
	canvas.height = 480;

	gl.viewport(0, 0, 684, 480);

	const fps = 30;
	const frameDuration = 1000 / fps;
	let frameIndex = 0;
	let lastFrameTime = 0;
	let forward = true;
	let delayActive = false;

	function redraw() {
		if (!isRendering || redrawActive || !framesLoaded)
			return;
		redrawActive = true;

		/* Setup PostProcess Framebuffer */
		gl.bindFramebuffer(gl.FRAMEBUFFER, lumaBuffer);
		gl.disable(gl.BLEND);
		gl.bindTexture(gl.TEXTURE_2D, textures[frameIndex]);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.useProgram(lumaShd);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		/* Draw To Screen */
		gl.bindFramebuffer(gl.FRAMEBUFFER, blitBuffer);
		gl.bindTexture(gl.TEXTURE_2D, lumaTexture);
		gl.useProgram(fxaaShd);
		gl.clear(gl.COLOR_BUFFER_BIT);
		
		/* FXAA Arguments */
		gl.uniform2f(rcpFrameLocation, 1.0 / canvas.width, 1.0 / canvas.height);
		gl.uniform1f(fxaaQualitySubpixLocation, fxaaQualitySubpix);
		gl.uniform1f(fxaaQualityEdgeThresholdLocation, fxaaQualityEdgeThreshold);
		gl.uniform1f(fxaaQualityEdgeThresholdMinLocation, fxaaQualityEdgeThresholdMin);

		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		gl.useProgram(blitShd);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindTexture(gl.TEXTURE_2D, blitTexture);

		/* Simple Passthrough */
		gl.uniform4f(transformLocation, 1.0, 1.0, 0.0, 0.0);
		gl.uniform2f(offsetLocationPost, 0.0, 0.0);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		/* Scaled image in the bottom left */
		gl.uniform4f(transformLocation, 0.25, 0.25, -0.75, -0.75);
		applyTrackingData(frameIndex, offsetLocationPost);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		/* Draw Red box for viewport illustration */
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.useProgram(redShd);
		gl.uniform1f(aspect_ratioLocationRed, canvas.width / canvas.height - 1.0);
		gl.uniform1f(thicknessLocation, 0.2);
		gl.uniform1f(pixelsizeLocation, (1.0 / canvas.width) * 50);
		gl.uniform4f(transformLocationRed, 0.25, 0.25, 0, 0);
		applyTrackingData(frameIndex, offsetLocationRed);
		if (enableRed)
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		gl.uniform1f(thicknessLocation, 0.1);
		gl.uniform1f(pixelsizeLocation, 0.0);
		gl.uniform4f(transformLocationRed, 0.5, 0.5, 0.0, 0.0);
		gl.uniform2f(offsetLocationRed, -0.75, -0.75);
		if (enableRed)
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		redrawActive = false;
	}

	let isRendering = false;

	function renderLoop(time) {
		if (isRendering) {
			if (time - lastFrameTime >= frameDuration) {
				lastFrameTime = time;

				redraw();

				if (forward) {
					if (!pause)
						frameIndex++;
					if (frameIndex == 29) {
						frameIndex = 28;
						forward = false;

						if (!delayActive) {
							delayActive = true;
							setTimeout(() => {
								delayActive = false;
								if (isRendering) requestAnimationFrame(renderLoop);
							}, 1000);
							return;
						}
					}
				} else {
					if(!pause)
						frameIndex--;
					if (frameIndex < 0) {
						forward = true;
						frameIndex = 0;

						if (!delayActive) {
							delayActive = true;
							setTimeout(() => {
								delayActive = false;
								if (isRendering) requestAnimationFrame(renderLoop);
							}, 1000);
							return;
						}
					}
				}
			}

			if (!delayActive) {
				requestAnimationFrame(renderLoop);
			}
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
					setupBuffers();
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
					gl.deleteTexture(lumaTexture);
					gl.deleteFramebuffer(lumaBuffer);
					gl.deleteTexture(blitTexture);
					gl.deleteFramebuffer(blitBuffer);
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
