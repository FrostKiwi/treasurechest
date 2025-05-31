const NS = "http://www.w3.org/2000/svg";

const TILE_W = 30;
const TILE_H = 15;
const H_MAX = 100;
const MARGIN = 25;
const viewBoxX = 4;
const viewBoxY = 3;

const ui = {
	svg: document.getElementById("kernelIso"),
	kernelSizeRange: document.getElementById("svgKernelIsoRange"),
	sigmaAbsoluteRange: document.getElementById("sigmaIso"),
	sigmaRelativeRange: document.getElementById("sigmaIsoRelative"),
	sigmaAbsoluteLabel: document.getElementById("sigmaIsoOut"),
	sigmaRelativeLabel: document.getElementById("sigmaIsoRelativeOut"),
	sigmaAbsoluteMode: document.getElementById("sigmaAbsolute")
};

export function setupSVGIso() {

	ui.svg.setAttribute("viewBox", `${-viewBoxX / 2} ${-viewBoxY / 2} ${viewBoxX} ${viewBoxY}`);

	const g = document.createElementNS(NS, "g");
	g.style.transformOrigin = "0 0";
	g.style.transition = "transform 0.5s ease";
	ui.svg.appendChild(g);

	let frameId = null;
	function redraw(sigma) {
		if (frameId !== null) cancelAnimationFrame(frameId);

		frameId = requestAnimationFrame(() => {
			frameId = null;
			drawIsometricSVG(ui.kernelSizeRange.value, sigma, g);
		});
	}

	function updateSigma(absoluteMode) {
		const sigmaAbsolute = absoluteMode ? Number(ui.sigmaAbsoluteRange.value) : ui.kernelSizeRange.value / Number(ui.sigmaRelativeRange.value);
		const sigmaRelative = ui.kernelSizeRange.value / sigmaAbsolute;

		ui.sigmaAbsoluteRange.value = sigmaAbsolute;
		ui.sigmaRelativeRange.value = sigmaRelative;
		ui.sigmaAbsoluteLabel.value = sigmaAbsolute.toFixed(2);
		ui.sigmaRelativeLabel.value = sigmaRelative.toFixed(2);

		redraw(sigmaAbsolute);
	}

	ui.kernelSizeRange.addEventListener('input', () => updateSigma(ui.sigmaAbsoluteMode.checked));
	ui.sigmaAbsoluteRange.addEventListener('input', () => updateSigma(true));
	ui.sigmaRelativeRange.addEventListener('input', () => updateSigma(false));

	const sigmaAbsolute = parseFloat(ui.sigmaAbsoluteRange.value);
	redraw(sigmaAbsolute);
}

function drawIsometricSVG(kernelSize, sigma, g) {
	const radius = parseInt(kernelSize);
	/* Always force the 1x1 kernel case to display something */
	if (!radius) sigma = 1;

	/* Gaussian kernel */
	const bars = [];
	let sumW = 0;
	for (let y = -radius; y <= radius; ++y) {
		for (let x = -radius; x <= radius; ++x) {
			const w = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
			bars.push({ x, y, w });
			sumW += w;
		}
	}
	bars.forEach(b => (b.w /= sumW));
	const maxW = Math.max(...bars.map(b => b.w));

	/* Calculate Scene bounds */
	let minX = Infinity, minY = Infinity;
	let maxX = -Infinity, maxY = -Infinity;
	bars.forEach(b => {
		b.isoX = (b.x - b.y) * TILE_W / 2;
		b.isoY = (b.x + b.y) * TILE_H / 2;
		b.h = (b.w / maxW) * H_MAX;

		minX = Math.min(minX, b.isoX - TILE_W / 2);
		maxX = Math.max(maxX, b.isoX + TILE_W / 2);
		minY = Math.min(minY, b.isoY - TILE_H / 2 - b.h);
		maxY = Math.max(maxY, b.isoY + TILE_H / 2);
	});

	const sceneW = maxX - minX + 2 * MARGIN;
	const sceneH = maxY - minY + 2 * MARGIN;
	const scale = Math.min(viewBoxX / sceneW, viewBoxY / sceneH);

	const slackX = Math.max(0, viewBoxX - sceneW * scale);
	const slackY = Math.max(0, viewBoxY - sceneH * scale);

	const offsetX = (-minX + MARGIN) * scale - (viewBoxX / 2) + slackX / 2;
	const offsetY = (-minY + MARGIN) * scale - (viewBoxY / 2) + slackY / 2;

	g.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;

	const rgb = v => `rgb(${v | 0},${v | 0},${v | 0})`;

	/* Generate SVG string */
	let content = "";
	bars
		.sort((a, b) => (a.x + a.y) - (b.x + b.y))
		.forEach(b => {
			const X = b.isoX, Y = b.isoY, h = b.h;

			const T = [X, Y - TILE_H / 2];
			const R = [X + TILE_W / 2, Y];
			const B = [X, Y + TILE_H / 2];
			const L = [X - TILE_W / 2, Y];
			const TT = [T[0], T[1] - h];
			const RR = [R[0], R[1] - h];
			const BB = [B[0], B[1] - h];
			const LL = [L[0], L[1] - h];

			const base = 55 + 200 * (b.w / maxW);
			const colT = rgb(base);
			const colR = rgb(base * 0.8);
			const colL = rgb(base * 0.6);

			/* Right Face */
			content += poly([RR, BB, B, R], colR);
			/* Left Face */
			content += poly([LL, BB, B, L], colL);
			/* Top Face */
			content += poly([TT, RR, BB, LL], colT);
		});
	g.innerHTML = content;
}

/* A bit ugly due to it's literal text nature, but doing the nice setAttributes
   and createElementNS angers Safari Apple Devices, so we don't modify the DOM
   too fast by doing it in text form here */
function poly(ptsArr, fill) {
	return `<polygon points="${ptsArr.map(pt => pt.join(",")).join(" ")}" fill="${fill}" style="stroke:#1F1A17; stroke-width:0.5;"/>`;
}
