import * as util from '../utility.js'

export async function setupGaussianDownsampleBlur() {
	/* Init */
	const WebGLBox = document.getElementById('WebGLBox-GaussianDownsampleBlur');
	const canvas = WebGLBox.querySelector('canvas');

	/* Circle Rotation size */
	const radius = 0.12;

	/* Main WebGL 1.0 Context */
	const gl = canvas.getContext('webgl', {
		preserveDrawingBuffer: false,
		antialias: false,
		alpha: false,
	});

	/* State and Objects */
	const ctx = {
		/* State for of the Rendering */
		mode: "scene",
		skipMode: "normal",
		flags: { isRendering: false, buffersInitialized: false, initComplete: false, benchMode: false },
		/* Textures */
		tex: { sdr: null, selfIllum: null, frame: null, frameFinal: null, down: [], intermediate: [], nativeIntermediate: null },
		/* Framebuffers */
		fb: { scene: null, final: null, down: [], intermediate: [], nativeIntermediate: null },
		/* Shaders and their respective Resource Locations */
		shd: {
			scene: { handle: null, uniforms: { offset: null, radius: null } },
			passthrough: { handle: null },
			blur: { handle: null, uniforms: { frameSizeRCP: null, samplePosMult: null, sigma: null, bloomStrength: null } },
			bloom: { handle: null, uniforms: { offset: null, radius: null, texture: null, textureAdd: null } }
		}
	};

	/* UI Elements */
	const ui = {
		display: {
			spinner: canvas.parentElement.querySelector('svg', canvas.parentElement),
			contextLoss: canvas.parentElement.querySelector('div', canvas.parentElement),
			fps: WebGLBox.querySelector('#fps'),
			ms: WebGLBox.querySelector('#ms'),
			width: WebGLBox.querySelector('#width'),
			height: WebGLBox.querySelector('#height'),
			tapsCount: WebGLBox.querySelector('#taps'),
		},
		blur: {
			kernelSize: WebGLBox.querySelector('#sizeRange'),
			sigma: WebGLBox.querySelector('#sigmaRange'),
			samplePos: WebGLBox.querySelector('#samplePosRange'),
			samplePosReset: WebGLBox.querySelector('#samplePosRangeReset'),
			downSample: WebGLBox.querySelector('#downSampleRange'),
		},
		rendering: {
			animate: WebGLBox.querySelector('#animateCheck'),
			modes: WebGLBox.querySelectorAll('input[type="radio"]'),
			skipModes: WebGLBox.querySelectorAll('input[name="skipMode"]'),
			lightBrightness: WebGLBox.querySelector('#lightBrightness'),
			lightBrightnessReset: WebGLBox.querySelector('#lightBrightnessReset'),
		},
		benchmark: {
			button: WebGLBox.querySelector('#benchmark'),
			label: WebGLBox.querySelector('#benchmarkLabel'),
			iterOut: WebGLBox.querySelector('#iterOut'),
			renderer: document.getElementById('WebGLBox-GaussianDownsampleBlurDetail').querySelector('#renderer'),
			skipMode: document.getElementById('WebGLBox-GaussianDownsampleBlurDetail').querySelector('#skipMode'),
			iterTime: document.getElementById('WebGLBox-GaussianDownsampleBlurDetail').querySelector('#iterTime'),
			tapsCount: document.getElementById('WebGLBox-GaussianDownsampleBlurDetail').querySelector('#tapsCountBench'),
			iterations: WebGLBox.querySelector('#iterations')
		}
	};

	/* Shaders */
	const circleAnimation = await util.fetchShader("shader/circleAnimation.vs");
	const simpleTexture = await util.fetchShader("shader/simpleTexture.fs");
	const bloomVert = await util.fetchShader("shader/bloom.vs");
	const bloomFrag = await util.fetchShader("shader/bloom.fs");
	const simpleQuad = await util.fetchShader("shader/simpleQuad.vs");
	const gaussianBlurFrag = await util.fetchShader("shader/gaussianBlurSeparable.fs");

	/* Elements that cause a redraw in the non-animation mode */
	ui.blur.kernelSize.addEventListener('input', () => { if (!ui.rendering.animate.checked) redraw() });
	ui.blur.sigma.addEventListener('input', () => { if (!ui.rendering.animate.checked) redraw() });
	ui.blur.samplePos.addEventListener('input', () => { if (!ui.rendering.animate.checked) redraw() });
	ui.rendering.lightBrightness.addEventListener('input', () => { if (!ui.rendering.animate.checked) redraw() });
	ui.blur.downSample.addEventListener('input', () => { 
		updateSkipModeControls();
		if (!ui.rendering.animate.checked) redraw() 
	});

	/* Events */
	ui.rendering.animate.addEventListener("change", () => {
		if (ui.rendering.animate.checked)
			startRendering();
		else {
			ui.display.fps.value = "-";
			ui.display.ms.value = "-";
			ctx.flags.isRendering = false;
			redraw()
		}
	});

	canvas.addEventListener("webglcontextlost", () => {
		ui.display.contextLoss.style.display = "block";
	});

	ui.blur.kernelSize.addEventListener('input', () => {
		reCompileBlurShader(ui.blur.kernelSize.value);
		ui.blur.samplePos.disabled = ui.blur.kernelSize.value == 0;
		ui.blur.samplePosReset.disabled = ui.blur.kernelSize.value == 0;
	});

	/* Render Mode */
	ui.rendering.modes.forEach(radio => {
		/* Skip skipMode radio buttons */
		if (radio.name === "skipMode") return;
		
		/* Force set to scene to fix a reload bug in Firefox Android */
		if (radio.value === "scene")
			radio.checked = true;
		radio.addEventListener('change', (event) => {
			ctx.mode = event.target.value;
			ui.rendering.lightBrightness.disabled = ctx.mode === "scene";
			ui.rendering.lightBrightnessReset.disabled = ctx.mode === "scene";
			if (!ui.rendering.animate.checked) redraw();
		});
	});

	/* Skip Mode */
	ui.rendering.skipModes.forEach(radio => {
		/* Force set to normal to fix a reload bug in Firefox Android */
		if (radio.value === "normal")
			radio.checked = true;
		radio.addEventListener('change', (event) => {
			ctx.skipMode = event.target.value;
			if (!ui.rendering.animate.checked) redraw();
		});
	});

	/* Helper function to update skip mode controls */
	function updateSkipModeControls() {
		const hasIntermediarySteps = ui.blur.downSample.value > 1;
		ui.rendering.skipModes.forEach(radio => {
			radio.disabled = !hasIntermediarySteps;
		});
		/* Reset to normal if disabled */
		if (!hasIntermediarySteps && ctx.skipMode !== "normal") {
			ctx.skipMode = "normal";
		}
		/* Always sync UI radio buttons with current ctx.skipMode */
		ui.rendering.skipModes.forEach(radio => {
			radio.checked = (radio.value === ctx.skipMode);
		});
	}

	/* Initialize skip mode controls */
	updateSkipModeControls();

	ui.benchmark.button.addEventListener("click", () => {
		ctx.flags.benchMode = true;
		stopRendering();
		ui.display.spinner.style.display = "block";
		ui.benchmark.button.disabled = true;

		/* spin up the Worker (ES-module) */
		const worker = new Worker("./js/benchmark/downsampleBenchmark.js", { type: "module" });

		/* pass all data the worker needs */
		worker.postMessage({
			iterations: ui.benchmark.iterOut.value,
			blurShaderSrc: gaussianBlurFrag,
			kernelSize: ui.blur.kernelSize.value,
			samplePos: ui.blur.samplePos.value,
			sigma: ui.blur.sigma.value,
			downSample: ui.blur.downSample.value,
			skipMode: ctx.skipMode
		});

		/* Benchmark */
		worker.addEventListener("message", (event) => {
			if (event.data.type !== "done") return;

			ui.benchmark.label.textContent = event.data.benchText;
			ui.benchmark.tapsCount.textContent = event.data.tapsCount;
			ui.benchmark.iterTime.textContent = event.data.iterationText;
			ui.benchmark.renderer.textContent = event.data.renderer;
			ui.benchmark.skipMode.textContent = event.data.skipMode;

			worker.terminate();
			ui.benchmark.button.disabled = false;
			ctx.flags.benchMode = false;
			if (ui.rendering.animate.checked)
				startRendering();
			else
				redraw();
		});
	});

	ui.benchmark.iterations.addEventListener("change", (event) => {
		ui.benchmark.iterOut.value = event.target.value;
		ui.benchmark.label.textContent = "Benchmark";
	});

	/* Draw Texture Shader */
	ctx.shd.scene = util.compileAndLinkShader(gl, circleAnimation, simpleTexture, ["offset", "radius"]);

	/* Draw bloom Shader */
	ctx.shd.bloom = util.compileAndLinkShader(gl, bloomVert, bloomFrag, ["texture", "textureAdd", "offset", "radius"]);

	/* Simple Passthrough */
	ctx.shd.passthrough = util.compileAndLinkShader(gl, simpleQuad, simpleTexture);

	/* Helper for recompilation */
	function reCompileBlurShader(blurSize) {
		ctx.shd.blur = util.compileAndLinkShader(gl, simpleQuad, gaussianBlurFrag, ["frameSizeRCP", "samplePosMult", "bloomStrength", "sigma", "direction"], "#define KERNEL_SIZE " + blurSize + '\n');
	}

	/* Blur Shader */
	reCompileBlurShader(ui.blur.kernelSize.value)

	/* Send Unit code verts to the GPU */
	util.bindUnitQuad(gl);

	async function setupTextureBuffers() {
		ui.display.spinner.style.display = "block";
		ctx.flags.buffersInitialized = true;
		ctx.flags.initComplete = false;

		gl.deleteFramebuffer(ctx.fb.scene);
		gl.deleteFramebuffer(ctx.fb.final);
		[ctx.fb.scene, ctx.tex.frame] = util.setupFramebuffer(gl, canvas.width, canvas.height);
		[ctx.fb.final, ctx.tex.frameFinal] = util.setupFramebuffer(gl, canvas.width, canvas.height);
		
		/* Add native resolution intermediate buffer for separable blur */
		gl.deleteFramebuffer(ctx.fb.nativeIntermediate);
		gl.deleteTexture(ctx.tex.nativeIntermediate);
		[ctx.fb.nativeIntermediate, ctx.tex.nativeIntermediate] = util.setupFramebuffer(gl, canvas.width, canvas.height);

		const maxDown = ui.blur.downSample.max;
		for (let i = 0; i < ui.blur.downSample.max; ++i) {
			gl.deleteFramebuffer(ctx.fb.down[i]);
			gl.deleteTexture(ctx.tex.down[i]);
			gl.deleteFramebuffer(ctx.fb.intermediate[i]);
			gl.deleteTexture(ctx.tex.intermediate[i]);
		}
		ctx.fb.down = [];
		ctx.tex.down = [];
		ctx.fb.intermediate = [];
		ctx.tex.intermediate = [];

		let w = canvas.width, h = canvas.height;
		for (let i = 0; i < maxDown; ++i) {
			w = Math.max(1, w >> 1);
			h = Math.max(1, h >> 1);
			const [fb, tex] = util.setupFramebuffer(gl, w, h);
			ctx.fb.down.push(fb);
			ctx.tex.down.push(tex);
			const [intermediateFb, intermediateTex] = util.setupFramebuffer(gl, w, h);
			ctx.fb.intermediate.push(intermediateFb);
			ctx.tex.intermediate.push(intermediateTex);
		}

		let [base, selfIllum] = await Promise.all([
			fetch("/dual-kawase/img/SDR_No_Sprite.png"),
			fetch("/dual-kawase/img/Selfillumination.png")
		]);
		let [baseBlob, selfIllumBlob] = await Promise.all([base.blob(), selfIllum.blob()]);
		let [baseBitmap, selfIllumBitmap] = await Promise.all([
			createImageBitmap(baseBlob, { colorSpaceConversion: 'none', resizeWidth: canvas.width * 1.12, resizeHeight: canvas.height * 1.12, resizeQuality: "high" }),
			createImageBitmap(selfIllumBlob, { colorSpaceConversion: 'none', resizeWidth: canvas.width * 1.12, resizeHeight: canvas.height * 1.12, resizeQuality: "high" })
		]);

		ctx.tex.sdr = util.setupTexture(gl, null, null, ctx.tex.sdr, gl.LINEAR, baseBitmap);
		ctx.tex.selfIllum = util.setupTexture(gl, null, null, ctx.tex.selfIllum, gl.LINEAR, selfIllumBitmap);

		baseBitmap.close();
		selfIllumBitmap.close();

		ctx.flags.initComplete = true;
		ui.display.spinner.style.display = "none";
	}

	/* Perform separable blur: horizontal pass followed by vertical pass */
	function performSeparableBlur(srcTexture, targetFB, width, height, intermediateFB, intermediateTex, bloomStrength) {
		gl.useProgram(ctx.shd.blur.handle);
		
		/* Set common uniforms */
		gl.uniform2f(ctx.shd.blur.uniforms.frameSizeRCP, 1.0 / width, 1.0 / height);
		gl.uniform1f(ctx.shd.blur.uniforms.samplePosMult, ui.blur.samplePos.value);
		gl.uniform1f(ctx.shd.blur.uniforms.sigma, Math.max(ui.blur.kernelSize.value / ui.blur.sigma.value, 0.001));
		gl.uniform1f(ctx.shd.blur.uniforms.bloomStrength, bloomStrength);
		
		/* Horizontal pass */
		gl.bindFramebuffer(gl.FRAMEBUFFER, intermediateFB);
		gl.viewport(0, 0, width, height);
		gl.uniform2f(ctx.shd.blur.uniforms.direction, 1.0, 0.0); // Horizontal
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, srcTexture);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		
		/* Vertical pass */
		gl.bindFramebuffer(gl.FRAMEBUFFER, targetFB);
		gl.viewport(0, 0, width, height);
		gl.uniform2f(ctx.shd.blur.uniforms.direction, 0.0, 1.0); // Vertical
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, intermediateTex);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	}

	let prevNow = performance.now();
	let lastStatsUpdate = prevNow;
	let fpsEMA = 60;
	let msEMA = 16;

	async function redraw() {
		if (!ctx.flags.buffersInitialized)
			await setupTextureBuffers();
		if (!ctx.flags.initComplete)
			return;

		/* UI Stats */
		const KernelSizeSide = ui.blur.kernelSize.value * 2 + 1;
		const effectiveRes = [Math.max(1, canvas.width >> +ui.blur.downSample.value), Math.max(1, canvas.height >> +ui.blur.downSample.value)];
		const tapsNewText = (effectiveRes[0] * effectiveRes[1] * KernelSizeSide * 2 / 1000000).toFixed(1) + " Million";
		ui.display.tapsCount.value = tapsNewText;
		ui.display.width.value = effectiveRes[0];
		ui.display.height.value = effectiveRes[1];

		/* Circle Motion */
		let radiusSwitch = ui.rendering.animate.checked ? radius : 0.0;
		let speed = (performance.now() / 10000) % Math.PI * 2;
		const offset = [radiusSwitch * Math.cos(speed), radiusSwitch * Math.sin(speed)];
		gl.useProgram(ctx.shd.scene.handle);
		const texture = ctx.mode == "scene" ? ctx.tex.sdr : ctx.tex.selfIllum;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform2fv(ctx.shd.scene.uniforms.offset, offset);
		gl.uniform1f(ctx.shd.scene.uniforms.radius, radiusSwitch);

		/* Setup PostProcess Framebuffer */
		gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.fb.scene);
		gl.viewport(0, 0, canvas.width, canvas.height);

		/* Draw Call */
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		/* down-sample chain */
		const levels = ui.blur.downSample.value;
		let srcTex = ctx.tex.frame;
		let w = canvas.width, h = canvas.height;

		if (levels > 0) {
			if (ctx.skipMode === "skipDown") {
				/* Skip downsample steps: jump directly to target level and blur */
				const lastDownsampleFB = ctx.fb.down[levels - 1];
				const lastIntermediateFB = ctx.fb.intermediate[levels - 1];
				const lastIntermediateTex = ctx.tex.intermediate[levels - 1];
				/* Calculate target resolution directly */
				w = Math.max(1, canvas.width >> levels);
				h = Math.max(1, canvas.height >> levels);
				const bloomStrength = ctx.mode == "scene" ? 1.0 : ui.rendering.lightBrightness.value;
				
				performSeparableBlur(srcTex, lastDownsampleFB, w, h, lastIntermediateFB, lastIntermediateTex, bloomStrength);
				srcTex = ctx.tex.down[levels - 1];
			} else {
				/* Normal mode: Downsample up to the second to last level */
				gl.useProgram(ctx.shd.passthrough.handle);
				for (let i = 0; i < levels - 1; ++i) {
					const fb = ctx.fb.down[i];
					w = Math.max(1, w >> 1);
					h = Math.max(1, h >> 1);

					gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
					gl.viewport(0, 0, w, h);

					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, srcTex);
					gl.uniform1i(gl.getUniformLocation(ctx.shd.passthrough.handle, "texture"), 0);
					gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
					srcTex = ctx.tex.down[i];
				}

				/* Blur into the last downsample buffer */
				const lastDownsampleFB = ctx.fb.down[levels - 1];
				const lastIntermediateFB = ctx.fb.intermediate[levels - 1];
				const lastIntermediateTex = ctx.tex.intermediate[levels - 1];
				w = Math.max(1, w >> 1);
				h = Math.max(1, h >> 1);
				const bloomStrength = ctx.mode == "scene" ? 1.0 : ui.rendering.lightBrightness.value;
				
				performSeparableBlur(srcTex, lastDownsampleFB, w, h, lastIntermediateFB, lastIntermediateTex, bloomStrength);
				srcTex = ctx.tex.down[levels - 1];
			}
		} else {
			/* Run Gaussian blur at native resolution when no downsample */
			const bloomStrength = ctx.mode == "scene" ? 1.0 : ui.rendering.lightBrightness.value;
			
			performSeparableBlur(srcTex, ctx.fb.final, canvas.width, canvas.height, ctx.fb.nativeIntermediate, ctx.tex.nativeIntermediate, bloomStrength);
			srcTex = ctx.tex.frameFinal;
		}

		/* Upsample chain */
		if (levels > 0) {
			if (ctx.skipMode === "skipUp") {
				/* Skip upsample steps: srcTex stays at the lowest resolution */
				/* Final pass will handle upscaling to full resolution */
			} else {
				/* Normal mode: Upsample through the mip levels */
				gl.useProgram(ctx.shd.passthrough.handle);
				for (let i = levels - 2; i >= 0; i--) {
					const fb = ctx.fb.down[i];
					let upsampleW = Math.max(1, canvas.width >> (i + 1));
					let upsampleH = Math.max(1, canvas.height >> (i + 1));
					gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
					gl.viewport(0, 0, upsampleW, upsampleH);
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, srcTex);
					gl.uniform1i(gl.getUniformLocation(ctx.shd.passthrough.handle, "texture"), 0);
					gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
					srcTex = ctx.tex.down[i];
				}
			}
		}

		/* Final pass to present to screen (with upscaling if needed) */
		/* Skip final pass in bloom mode with no downsampling to avoid feedback loop */
		if (!(ctx.mode == "bloom" && levels == 0)) {
			const finalFB = ctx.mode == "bloom" ? ctx.fb.final : null;
			gl.bindFramebuffer(gl.FRAMEBUFFER, finalFB);
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.useProgram(ctx.shd.passthrough.handle);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, srcTex);
			gl.uniform1i(gl.getUniformLocation(ctx.shd.passthrough.handle, "texture"), 0);
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		}

		if (ctx.mode == "bloom") {
			/* Now do the bloom composition to the screen */
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.useProgram(ctx.shd.bloom.handle);

			gl.uniform2fv(ctx.shd.bloom.uniforms.offset, offset);
			gl.uniform1f(ctx.shd.bloom.uniforms.radius, radiusSwitch);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, ctx.tex.sdr);
			gl.uniform1i(ctx.shd.bloom.uniforms.texture, 0);

			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, ctx.tex.frameFinal);
			gl.uniform1i(ctx.shd.bloom.uniforms.textureAdd, 1);

			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		}

		/* Ask for CPU-GPU Sync to prevent overloading the GPU during compositing.
		   In reality this is more likely to be flush, but still, it seems to
		   help on multiple devices with during low FPS */
		gl.finish();

		const now = performance.now();
		let dt = now - prevNow;

		if (dt > 0) {
			const instFPS = 1000 / dt;
			const ALPHA = 0.05;
			fpsEMA = ALPHA * instFPS + (1 - ALPHA) * fpsEMA;
			msEMA = ALPHA * dt + (1 - ALPHA) * msEMA;
		}
		prevNow = now;

		if (ui.rendering.animate.checked && now - lastStatsUpdate >= 1000) {
			ui.display.fps.value = fpsEMA.toFixed(0);
			ui.display.ms.value = msEMA.toFixed(2);
			lastStatsUpdate = now;
		}
	}

	let animationFrameId;

	/* Render at Native Resolution */
	function nativeResize() {
		const [width, height] = util.getNativeSize(canvas);

		if (width && canvas.width !== width || height && canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;

			if (!ctx.flags.benchMode) {
				stopRendering();
				startRendering();
			}
			if (!ui.rendering.animate.checked)
				redraw();
		}
	}

	/* Resize Event */
	nativeResize();

	let resizePending = false;
	window.addEventListener('resize', () => {
		if (!resizePending) {
			resizePending = true;
			requestAnimationFrame(() => {
				resizePending = false;
				nativeResize();
			});
		}
	});

	function renderLoop() {
		if (ctx.flags.isRendering && ui.rendering.animate.checked) {
			redraw();
			animationFrameId = requestAnimationFrame(renderLoop);
		}
	}

	function startRendering() {
		/* Start rendering, when canvas visible */
		ctx.flags.isRendering = true;
		renderLoop();
	}

	function stopRendering() {
		/* Stop another redraw being called */
		ctx.flags.isRendering = false;
		cancelAnimationFrame(animationFrameId);
		/* Force the rendering pipeline to sync with CPU before we mess with it */
		gl.finish();

		/* Delete the buffers to free up memory */
		gl.deleteTexture(ctx.tex.sdr); ctx.tex.sdr = null;
		gl.deleteTexture(ctx.tex.selfIllum); ctx.tex.selfIllum = null;
		gl.deleteTexture(ctx.tex.frame); ctx.tex.frame = null;
		gl.deleteTexture(ctx.tex.frameFinal); ctx.tex.frameFinal = null;
		gl.deleteFramebuffer(ctx.fb.scene); ctx.fb.scene = null;
		gl.deleteFramebuffer(ctx.fb.final); ctx.fb.final = null;
		gl.deleteFramebuffer(ctx.fb.nativeIntermediate); ctx.fb.nativeIntermediate = null;
		gl.deleteTexture(ctx.tex.nativeIntermediate); ctx.tex.nativeIntermediate = null;
		for (let i = 0; i < ui.blur.downSample.max; ++i) {
			gl.deleteTexture(ctx.tex.down[i]);
			gl.deleteFramebuffer(ctx.fb.down[i]);
			gl.deleteTexture(ctx.tex.intermediate[i]);
			gl.deleteFramebuffer(ctx.fb.intermediate[i]);
		}
		ctx.tex.down = [];
		ctx.fb.down = [];
		ctx.tex.intermediate = [];
		ctx.fb.intermediate = [];
		ctx.flags.buffersInitialized = false;
		ctx.flags.initComplete = false;
		ui.display.fps.value = "-";
		ui.display.ms.value = "-";
	}

	function handleIntersection(entries) {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				if (!ctx.flags.isRendering && !ctx.flags.benchMode) startRendering();
			} else {
				stopRendering();
			}
		});
	}

	/* Only render when the canvas is actually on screen */
	let observer = new IntersectionObserver(handleIntersection);
	observer.observe(canvas);
}