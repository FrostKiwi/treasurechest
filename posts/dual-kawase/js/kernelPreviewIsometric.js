import * as util from './utility.js'
const NS = "http://www.w3.org/2000/svg";

/* Styles */
const STYLES = {
	sidePixel: "stroke:#1F1A17; stroke-width:0.5;",
};

const TILE_W = 30;
const TILE_H = 15;
const H_MAX = 100;
const MARGIN = 25;
const viewBoxX = 4;
const viewBoxY = 3;

let isDrawing = false;
let queuedArgs = null;

export function setupSVGIso() {
	const ui = {
		svg: document.getElementById("kernelIso"),
		kernelRange: document.getElementById("svgKernelIsoRange"),
		sigmaRange: document.getElementById("sigmaIso"),
		sigmaRangeRelative: document.getElementById("sigmaIsoRelative"),
		sigmaIsoRelativeOut: document.getElementById("sigmaIsoRelativeOut"),
		sigmaIsoOut: document.getElementById("sigmaIsoOut"),
		sigmaAbsoluteRadio: document.getElementById("sigmaAbsolute")
	};

	ui.svg.setAttribute("viewBox", `${-viewBoxX / 2} ${-viewBoxY / 2} ${viewBoxX} ${viewBoxY}`);

	const g = document.createElementNS(NS, "g");
	g.style.transformOrigin = "0 0";
	g.style.transition = "transform 0.5s ease";
	ui.svg.appendChild(g);

	ui.kernelRange.addEventListener("input", () => {
		if (ui.sigmaAbsoluteRadio.checked) {
			const sigmaAbsolute = parseFloat(ui.sigmaRange.value);
			const sigmaRelative = parseFloat(ui.kernelRange.value) / sigmaAbsolute;
			ui.sigmaRangeRelative.value = sigmaRelative;
			ui.sigmaIsoRelativeOut.value = sigmaRelative.toFixed(2);
			redraw(ui.kernelRange.value, sigmaAbsolute, g);
		} else {
			const sigmaRelative = parseFloat(ui.sigmaRangeRelative.value);
			const sigmaAbsolute = parseFloat(ui.kernelRange.value) / sigmaRelative;
			ui.sigmaRange.value = sigmaAbsolute;
			ui.sigmaIsoOut.value = sigmaAbsolute.toFixed(2);
			redraw(ui.kernelRange.value, sigmaAbsolute, g);
		}
	});
	ui.sigmaRange.addEventListener("input", () => {
		const sigmaAbsolute = parseFloat(ui.sigmaRange.value);
		const sigmaRelative = parseFloat(ui.kernelRange.value) / sigmaAbsolute;

		ui.sigmaRangeRelative.value = sigmaRelative;
		ui.sigmaIsoOut.value = sigmaAbsolute.toFixed(2);
		ui.sigmaIsoRelativeOut.value = sigmaRelative.toFixed(2);
		redraw(ui.kernelRange.value, sigmaAbsolute, g);
	});
	ui.sigmaRangeRelative.addEventListener("input", () => {
		const sigmaRelative = parseFloat(ui.sigmaRangeRelative.value);
		const sigmaAbsolute = parseFloat(ui.kernelRange.value) / sigmaRelative;

		ui.sigmaRange.value = sigmaAbsolute;
		ui.sigmaIsoOut.value = sigmaAbsolute.toFixed(2);
		ui.sigmaIsoRelativeOut.value = sigmaRelative.toFixed(2);
		redraw(ui.kernelRange.value, sigmaAbsolute, g);
	});
	redraw(ui.kernelRange.value, ui.sigmaRange.value, g);
}

/* Basic queue  */
function redraw(kernelSize, sigma, g) {
	if (isDrawing) {
		queuedArgs = [kernelSize, sigma];
		console.log("Snubbed")
		return;
	}

	isDrawing = true;
	drawIso(kernelSize, sigma, g);
	isDrawing = false;

	if (queuedArgs) {
		const [kernelQueued, sigmaQueued] = queuedArgs;
		console.log("DeQueued")
		queuedArgs = null;
		redraw(kernelQueued, sigmaQueued, g);
	}
}

function drawIso(kernelSize, sigma, g) {
	const radius = parseInt(kernelSize);
	/* Always force the 1x1 kernel case to display something by clamping sigma */
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

	util.reportMemory();
}

/* A bit ugly due to it's literal text nature, but doing the nice setAttributes
   and createElementNS angers Safari Apple Devices, so we don't modify the DOM
   too fast by doing it in text form here */
function poly(ptsArr, fill) {
	return `<polygon points="${ptsArr.map(pt => pt.join(",")).join(" ")}" fill="${fill}" style="${STYLES.sidePixel}"/>`;
}
