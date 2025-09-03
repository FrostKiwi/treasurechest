import * as util from './utility.js'

export async function setupBilinear() {
	/* Init */
	const WebGLBox = document.getElementById('WebGLBox-Bilinear');
	const canvas = WebGLBox.querySelector('canvas');

	/* Circle Rotation size */
	const radius = 0.12;
	
	/* Resolution divider for framebuffer rendering */
	const resDiv = 4; // Hardcoded quarter resolution
	let renderFramebuffer, renderTexture;
	let buffersInitialized = false;

	/* Main WebGL 1.0 Context */
	const gl = canvas.getContext('webgl', {
		preserveDrawingBuffer: false,
		antialias: false,
		alpha: true,
	});

	/* State and Objects */
	const ctx = {
		mode: "nearest",
		flags: { isRendering: false, initComplete: false },
		/* Textures */
		tex: { sdr: null },
		/* Shaders and their respective Resource Locations */
		shd: {
			kiwi: { handle: null, uniforms: { offset: null, kiwiSize: null } },
			blit: { handle: null, uniforms: { texture: null } }
		}
	};

	/* UI Elements */
	const ui = {
		display: {
			spinner: canvas.parentElement.querySelector('svg'),
			contextLoss: canvas.parentElement.querySelector('div'),
		},
		rendering: {
			modes: WebGLBox.querySelectorAll('input[type="radio"]'),
			animate: WebGLBox.querySelector('#animateCheck'),
			kiwiSize: WebGLBox.querySelector('#kiwiSize'),
		}
	};

	/* Render Mode */
	ui.rendering.modes.forEach(radio => {
		/* Force set to nearest to fix a reload bug in Firefox Android */
		if (radio.value === "nearest")
			radio.checked = true;
		radio.addEventListener('change', (event) => {
			ctx.mode = event.target.value;
			if (!ui.rendering.animate.checked) redraw();
		});
	});


	/* Shaders */
	const circleAnimationSize = await util.fetchShader("shader/circleAnimationSize.vs");
	const simpleTexture = await util.fetchShader("shader/simpleTexture.fs");
	const simpleQuad = await util.fetchShader("shader/simpleQuad.vs");

	/* Elements that cause a redraw in the non-animation mode */
	ui.rendering.kiwiSize.addEventListener('input', () => { if (!ui.rendering.animate.checked) redraw() });

	/* Events */
	ui.rendering.animate.addEventListener("change", () => {
		if (ui.rendering.animate.checked)
			startRendering();
		else {
			ctx.flags.isRendering = false;
			redraw()
		}
	});

	canvas.addEventListener("webglcontextlost", () => {
		ui.display.contextLoss.style.display = "block";
	});

	/* Draw Texture Shader */
	ctx.shd.kiwi = util.compileAndLinkShader(gl, circleAnimationSize, simpleTexture, ["offset", "kiwiSize"]);
	
	/* Blit Shader for upscaling */
	ctx.shd.blit = util.compileAndLinkShader(gl, simpleQuad, simpleTexture, ["texture"]);
	
	/* Set initial shader state */
	gl.useProgram(ctx.shd.kiwi.handle);

	/* Send Unit code verts to the GPU */
	util.bindUnitQuad(gl);

	/* THis genius workaround is based on @Kaiido's: https://stackoverflow.com/a/69385604/6240779 */
	function loadSVGAsImage(blob) {
		return new Promise((resolve) => {
			const img = new Image();
			const url = URL.createObjectURL(blob);
			
			img.onload = () => {
				URL.revokeObjectURL(url);
				resolve(img);
			};
			
			img.src = url;
		});
	}

	async function setupTextureBuffers() {
		ui.display.spinner.style.display = "block";
		ctx.flags.initComplete = false;

		/* Create framebuffer for quarter resolution rendering */
		gl.deleteFramebuffer(renderFramebuffer);
		renderFramebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, renderFramebuffer);

		/* Create RGBA framebuffer texture manually to preserve alpha */
		gl.deleteTexture(renderTexture);
		renderTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, renderTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width / resDiv, canvas.height / resDiv, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTexture, 0);
		buffersInitialized = true;

		/* Load kiwi texture */
		let base = await fetch("img/kiwi4by3.svg");
		let baseBlob = await base.blob();
		let baseImage = await loadSVGAsImage(baseBlob);
		let baseBitmap = await createImageBitmap(baseImage, { resizeWidth: canvas.width / resDiv, resizeHeight: canvas.height / resDiv, colorSpaceConversion: 'none', resizeQuality: "high" });

		ctx.tex.sdr = util.setupTexture(gl, null, null, ctx.tex.sdr, gl.NEAREST, baseBitmap, 4);

		baseBitmap.close();

		ctx.flags.initComplete = true;
		ui.display.spinner.style.display = "none";
	}

	async function redraw() {
		if (!ctx.flags.initComplete)
			await setupTextureBuffers();
		if (!ctx.flags.initComplete)
			return;

		/* Pass 1: Render to framebuffer at reduced resolution */
		gl.viewport(0, 0, canvas.width / resDiv, canvas.height / resDiv);
		gl.bindFramebuffer(gl.FRAMEBUFFER, renderFramebuffer);
		gl.clear(gl.COLOR_BUFFER_BIT);
		
		/* Use kiwi shader */
		gl.useProgram(ctx.shd.kiwi.handle);
		
		/* Bind kiwi texture and set filtering mode */
		gl.bindTexture(gl.TEXTURE_2D, ctx.tex.sdr);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, ctx.mode == "nearest" ? gl.NEAREST : gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, ctx.mode == "nearest" ? gl.NEAREST : gl.LINEAR);

		/* Circle Motion */
		let radiusSwitch = ui.rendering.animate.checked ? radius : 0.0;
		let speed = (performance.now() / 10000) % Math.PI * 2;
		const offset = [radiusSwitch * Math.cos(speed), radiusSwitch * Math.sin(speed)];
		
		gl.uniform2fv(ctx.shd.kiwi.uniforms.offset, offset);
		gl.uniform1f(ctx.shd.kiwi.uniforms.kiwiSize, ui.rendering.kiwiSize.value);

		/* Draw kiwi to framebuffer */
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		
		/* Use blit shader */
		gl.useProgram(ctx.shd.blit.handle);
		
		/* Bind framebuffer texture with nearest neighbor for pixelated upscaling */
		gl.bindTexture(gl.TEXTURE_2D, renderTexture);
		
		/* Draw full-screen quad to upscale */
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	}

	let animationFrameId;

	/* Render at Native Resolution */
	function nativeResize() {
		const [width, height] = util.getNativeSize(canvas);

		if (width && canvas.width !== width || height && canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
			gl.viewport(0, 0, canvas.width, canvas.height);

			stopRendering();
			startRendering();
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
		gl.deleteTexture(renderTexture);
		gl.deleteFramebuffer(renderFramebuffer);
		buffersInitialized = false;
		ctx.flags.initComplete = false;
	}

	function handleIntersection(entries) {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				if (!ctx.flags.isRendering) startRendering();
			} else {
				stopRendering();
			}
		});
	}

	/* Only render when the canvas is actually on screen */
	let observer = new IntersectionObserver(handleIntersection);
	observer.observe(canvas);
}