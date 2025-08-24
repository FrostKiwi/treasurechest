export async function setupFFT() {
	const FFTBox = document.getElementById('FFTBox');
	const SIZE = 256;

	/* State and Objects */
	const ctx = {
		mode: 'black',
		flags: { isDrawing: false, initComplete: false, isInteracting: false },
		data: {
			complex: { r: null, g: null, b: null },
			original: { r: null, g: null, b: null }
		},
		frame: null
	};

	/* UI Elements */
	const ui = {
		upload: FFTBox.querySelector('#upload'),
		brushModes: FFTBox.querySelectorAll('input[name="brushMode"]'),
		radius: FFTBox.querySelector('#radius'),
		feather: FFTBox.querySelector('#feather'),
		reset: FFTBox.querySelector('#reset'),

		canvas: {
			magnitude: FFTBox.querySelector('#magnitude'),
			output: FFTBox.querySelector('#output')
		}
	};

	const mCtx = ui.canvas.magnitude.getContext('2d');
	const oCtx = ui.canvas.output.getContext('2d');

	/* Image Processing */
	async function processImage(file) {
		ctx.flags.initComplete = false;

		const blob = file;
		const bitmap = await createImageBitmap(blob);

		const scale = Math.max(SIZE / bitmap.width, SIZE / bitmap.height);
		const scaledW = bitmap.width * scale;
		const scaledH = bitmap.height * scale;
		const offsetX = (SIZE - scaledW) / 2;
		const offsetY = (SIZE - scaledH) / 2;

		const tmp = document.createElement('canvas');
		tmp.width = tmp.height = SIZE;
		const tmpCtx = tmp.getContext('2d');
		tmpCtx.drawImage(bitmap, offsetX, offsetY, scaledW, scaledH);
		const imageData = tmpCtx.getImageData(0, 0, SIZE, SIZE);
		const px = imageData.data;

		bitmap.close();

		['r', 'g', 'b'].forEach((ch, idx) => {
			/*  Extract channel data as 1D real array */
			const data = [];
			for (let i = 0; i < SIZE * SIZE; i++) {
				data.push(px[i * 4 + idx]);
			}

			/*  Forward FFT and shift - store as complex data */
			const fftResult = [];
			Fourier.transform(data, fftResult);
			const freqData = Fourier.shift(fftResult, [SIZE, SIZE]);
			ctx.data.complex[ch] = [...freqData]; /*  Working copy */
			ctx.data.original[ch] = [...freqData]; /*  Backup for reset */
		});

		ctx.flags.initComplete = true;
		update();
	}

	let frameId = null;
	function redraw(fullUpdate = false) {
		if (frameId !== null) cancelAnimationFrame(frameId);

		frameId = requestAnimationFrame(() => {
			frameId = null;
			update(fullUpdate || !ctx.flags.isInteracting);
		});
	}

	function update(doReconstruction = true) {
		if (!ctx.data.complex.r) return;

		const displayData = {};
		const result = doReconstruction ? {} : null;

		['r', 'g', 'b'].forEach(ch => {
			/*  Apply filter once and use for both displays */
			const filtered = [...ctx.data.complex[ch]];
			Fourier.filter(filtered, [SIZE, SIZE], parseInt(ui.radius.value >= 128 ? 4096 : ui.radius.value), NaN, parseInt(ui.feather.value));

			/*  Magnitude display calculation */
			const LOG_SCALE = 10000;
			let max = 0;
			for (let i = 0; i < SIZE * SIZE; i++) {
				max = Math.max(max, filtered[i].magnitude());
			}
			displayData[ch] = [];
			for (let i = 0; i < SIZE * SIZE; i++) {
				const n = filtered[i].magnitude() / max;
				displayData[ch][i] = Math.log(1 + n * LOG_SCALE) / Math.log(1 + LOG_SCALE) * 255;
			}

			/*  Reconstruction calculation */
			if (doReconstruction) {
				const unshifted = Fourier.unshift(filtered, [SIZE, SIZE]);
				result[ch] = [];
				Fourier.invert(unshifted, result[ch]);
			}
		});

		/*  Render magnitude display */
		const magImg = mCtx.createImageData(SIZE, SIZE);
		for (let i = 0; i < SIZE * SIZE; i++) {
			magImg.data[i * 4] = Math.min(255, displayData.r[i]);
			magImg.data[i * 4 + 1] = Math.min(255, displayData.g[i]);
			magImg.data[i * 4 + 2] = Math.min(255, displayData.b[i]);
			magImg.data[i * 4 + 3] = 255;
		}
		mCtx.putImageData(magImg, 0, 0);

		/*  Render reconstructed output */
		if (doReconstruction) {
			const outImg = oCtx.createImageData(SIZE, SIZE);
			for (let i = 0; i < SIZE * SIZE; i++) {
				outImg.data[i * 4] = Math.max(0, Math.min(255, result.r[i]));
				outImg.data[i * 4 + 1] = Math.max(0, Math.min(255, result.g[i]));
				outImg.data[i * 4 + 2] = Math.max(0, Math.min(255, result.b[i]));
				outImg.data[i * 4 + 3] = 255;
			}
			oCtx.putImageData(outImg, 0, 0);
		}
	}


	function draw(ex, ey) {
		const rect = ui.canvas.magnitude.getBoundingClientRect();
		const x = ex * SIZE / rect.width;
		const y = ey * SIZE / rect.height;
		
		const dc = ctx.data.complex.r?.[(SIZE >> 1) * SIZE + (SIZE >> 1)]?.magnitude() || 10000;
		const val = ctx.mode === 'white' ? dc * 0.01 : 0;

		function drawAt(centerX, centerY) {
			for (let dy = -8; dy <= 8; dy++) {
				for (let dx = -8; dx <= 8; dx++) {
					if (dx * dx + dy * dy <= 64) {
						const px = Math.floor(centerX + dx);
						const py = Math.floor(centerY + dy);
						if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
							['r', 'g', 'b'].forEach(ch => {
								const current = ctx.data.complex[ch][py * SIZE + px];
								ctx.data.complex[ch][py * SIZE + px] = ctx.mode === 'white' 
									? new Fourier.Complex(
										(current.magnitude() + val) * Math.cos(Math.atan2(current.imag, current.real)),
										(current.magnitude() + val) * Math.sin(Math.atan2(current.imag, current.real))
									)
									: new Fourier.Complex(0, 0);
							});
						}
					}
				}
			}
		}

		drawAt(x, y);
		drawAt(SIZE - 1 - x, SIZE - 1 - y);
	}

	/* Event Handlers */
	ui.upload.addEventListener('change', event => {
		const file = event.target.files[0];
		if (file) processImage(file);
	});

	ui.brushModes.forEach(radio => {
		radio.addEventListener('change', event => {
			ctx.mode = event.target.value;
		});
	});

	ui.radius.addEventListener('input', () => {
		ctx.flags.isInteracting = true;
		redraw();
	});

	ui.radius.addEventListener('change', () => {
		ctx.flags.isInteracting = false;
		redraw(true);
	});

	ui.feather.addEventListener('input', () => {
		ctx.flags.isInteracting = true;
		redraw();
	});

	ui.feather.addEventListener('change', () => {
		ctx.flags.isInteracting = false;
		redraw(true);
	});

	ui.reset.addEventListener('click', () => {
		if (!ctx.data.original.r) return;
		/*  Restore original complex data */
		['r', 'g', 'b'].forEach(ch => {
			ctx.data.complex[ch] = [...ctx.data.original[ch]];
		});
		redraw(true);
	});

	ui.canvas.magnitude.addEventListener('mousedown', event => {
		if (ctx.data.complex.r) {
			ctx.flags.isDrawing = true;
			ctx.flags.isInteracting = true;
			draw(event.offsetX, event.offsetY);
			redraw();
		}
	});

	ui.canvas.magnitude.addEventListener('mousemove', event => {
		if (ctx.flags.isDrawing) {
			draw(event.offsetX, event.offsetY);
			redraw();
		}
	});

	ui.canvas.magnitude.addEventListener('mouseup', () => {
		if (ctx.flags.isDrawing) {
			ctx.flags.isDrawing = false;
			ctx.flags.isInteracting = false;
			redraw(true);
		}
	});

	ui.canvas.magnitude.addEventListener('mouseleave', () => {
		if (ctx.flags.isDrawing) {
			ctx.flags.isDrawing = false;
			ctx.flags.isInteracting = false;
			redraw(true);
		}
	});

	/*  Load default image */
	const response = await fetch("/dual-kawase/img/256ScreenOverlay.png");
	const blob = await response.blob();
	await processImage(blob);
}