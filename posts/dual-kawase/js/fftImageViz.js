export async function setupFFT() {
	const FFTBox = document.getElementById('FFTBox');
	const SIZE = 256;

	/* State and Objects */
	const ctx = {
		mode: 'white',
		flags: { isDrawing: false, initComplete: false },
		data: {
			complex: { r: null, g: null, b: null },
			original: { r: null, g: null, b: null }
		},
		params: {
			brushSize: 10,
			intensity: 50,
			radius: 100,
			feather: 0
		},
		frame: null
	};

	/* UI Elements */
	const ui = {
		input: {
			upload: FFTBox.querySelector('#upload'),
			brushModes: FFTBox.querySelectorAll('input[name="brushMode"]'),
			brushSize: FFTBox.querySelector('#brushSize'),
			intensity: FFTBox.querySelector('#intensity'),
			radius: FFTBox.querySelector('#radius'),
			feather: FFTBox.querySelector('#feather'),
			reset: FFTBox.querySelector('#reset')
		},
		output: {
			sizeVal: FFTBox.querySelector('#sizeVal'),
			intVal: FFTBox.querySelector('#intVal'),
			radVal: FFTBox.querySelector('#radVal'),
			featherVal: FFTBox.querySelector('#featherVal'),
		},
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
	function redraw() {
		if (frameId !== null) cancelAnimationFrame(frameId);

		frameId = requestAnimationFrame(() => {
			frameId = null;
			update();
		});
	}

	function update() {
		if (!ctx.data.complex.r) return;
		
		/*  Render magnitude display and reconstruct output in one go */
		const displayData = {};
		const result = {};

		['r', 'g', 'b'].forEach(ch => {
			/*  Apply filter once and use for both displays */
			const filtered = [...ctx.data.complex[ch]];
			Fourier.filter(filtered, [SIZE, SIZE], ctx.params.radius, NaN, ctx.params.feather);

			/*  Magnitude display calculation */
			let max = 0;
			for (let i = 0; i < SIZE * SIZE; i++) {
				max = Math.max(max, filtered[i].magnitude());
			}
			displayData[ch] = [];
			for (let i = 0; i < SIZE * SIZE; i++) {
				const n = filtered[i].magnitude() / (max + 1);
				displayData[ch][i] = Math.pow(Math.log(1 + n * 50) / Math.log(51), 0.5) * 180;
			}

			/*  Reconstruction calculation */
			const unshifted = Fourier.unshift(filtered, [SIZE, SIZE]);
			result[ch] = [];
			Fourier.invert(unshifted, result[ch]);
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
		const outImg = oCtx.createImageData(SIZE, SIZE);
		for (let i = 0; i < SIZE * SIZE; i++) {
			outImg.data[i * 4] = Math.max(0, Math.min(255, result.r[i]));
			outImg.data[i * 4 + 1] = Math.max(0, Math.min(255, result.g[i]));
			outImg.data[i * 4 + 2] = Math.max(0, Math.min(255, result.b[i]));
			outImg.data[i * 4 + 3] = 255;
		}
		oCtx.putImageData(outImg, 0, 0);
	}


	function draw(ex, ey) {
		const rect = ui.canvas.magnitude.getBoundingClientRect();
		const x = ex * SIZE / rect.width;
		const y = ey * SIZE / rect.height;
		const dcIndex = (SIZE >> 1) * SIZE + (SIZE >> 1);
		const dc = ctx.data.complex.r?.[dcIndex]?.magnitude() || 10000;
		const logVal = Math.pow(10, ctx.params.intensity / 100 * 3 - 3);
		const val = ctx.mode === 'white' ? dc * logVal : 0;


		for (let dy = -ctx.params.brushSize; dy <= ctx.params.brushSize; dy++) {
			for (let dx = -ctx.params.brushSize; dx <= ctx.params.brushSize; dx++) {
				const px = Math.floor(x + dx);
				const py = Math.floor(y + dy);
				if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
					const dist = Math.sqrt(dx * dx + dy * dy);
					if (dist <= ctx.params.brushSize) {
						let a = 1 - dist / ctx.params.brushSize;
						if (dist > ctx.params.brushSize * 0.5) {
							const t = (dist - ctx.params.brushSize * 0.5) / (ctx.params.brushSize * 0.5);
							a *= Math.cos(t * Math.PI / 2);
						}

						['r', 'g', 'b'].forEach(ch => {
							const idx = py * SIZE + px;
							if (ctx.mode === 'white') {
								/*  Add to magnitude of complex data */
								const current = ctx.data.complex[ch][idx];
								const newMag = current.magnitude() + val * a;
								const phase = Math.atan2(current.imag, current.real);
								ctx.data.complex[ch][idx] = new Fourier.Complex(
									newMag * Math.cos(phase),
									newMag * Math.sin(phase)
								);
							} else {
								/*  Scale down magnitude */
								ctx.data.complex[ch][idx] = ctx.data.complex[ch][idx].times(1 - a);
							}
						});
					}
				}
			}
		}
	}

	/* Event Handlers */
	ui.input.upload.addEventListener('change', event => {
		const file = event.target.files[0];
		if (file) processImage(file);
	});

	ui.input.brushModes.forEach(radio => {
		radio.addEventListener('change', event => {
			ctx.mode = event.target.value;
		});
	});

	ui.input.brushSize.addEventListener('input', event => {
		ctx.params.brushSize = parseInt(event.target.value);
		ui.output.sizeVal.textContent = event.target.value;
	});

	ui.input.intensity.addEventListener('input', event => {
		ctx.params.intensity = parseInt(event.target.value);
		ui.output.intVal.textContent = event.target.value;
	});

	ui.input.radius.addEventListener('input', event => {
		ctx.params.radius = parseInt(event.target.value);
		ui.output.radVal.textContent = event.target.value;
		redraw();
	});

	ui.input.feather.addEventListener('input', event => {
		ctx.params.feather = parseInt(event.target.value);
		ui.output.featherVal.textContent = event.target.value;
		redraw();
	});

	ui.input.reset.addEventListener('click', () => {
		if (!ctx.data.original.r) return;
		/*  Restore original complex data */
		['r', 'g', 'b'].forEach(ch => {
			ctx.data.complex[ch] = [...ctx.data.original[ch]];
		});
		redraw();
	});

	ui.canvas.magnitude.addEventListener('mousedown', event => {
		if (ctx.data.complex.r) {
			ctx.flags.isDrawing = true;
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
		}
	});

	ui.canvas.magnitude.addEventListener('mouseleave', () => {
		if (ctx.flags.isDrawing) {
			ctx.flags.isDrawing = false;
		}
	});

	/*  Load default image */
	try {
		const response = await fetch("/dual-kawase/img/SDR_No_Sprite.png");
		if (response.ok) {
			const blob = await response.blob();
			await processImage(blob);
		}
	} catch (error) {
		console.warn("Could not load default image:", error);
	}
}