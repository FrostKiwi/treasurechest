const NS = "http://www.w3.org/2000/svg";

/* Styles */
const STYLES = {
	sidePixel: "stroke:#1F1A17; stroke-width:0.5;",
};

const TILE_W = 30;
const TILE_H = 15;
const H_MAX = 100;
const MARGIN = 25;

export function setupSVGIso() {
	const svg = document.getElementById("kernelIso");
	const kernelRange = document.getElementById("svgKernelIsoRange");
	const sigmaRange = document.getElementById("sigmaIso");

	svg.setAttribute("viewBox", "-1 -1 2 2");

	const g = document.createElementNS(NS, "g");
	g.style.transformOrigin = "0 0";
	g.style.transition = "transform 0.5s ease";
	svg.appendChild(g);

	const redraw = () => drawIso(kernelRange.value, sigmaRange.value, g);
	kernelRange.addEventListener("input", redraw);
	sigmaRange.addEventListener("input", redraw);
	redraw();
}

function drawIso(k, sigma, g) {
	g.innerHTML = "";

	const radius = parseInt(k, 10);
	const sigmaSq = (sigma || 1e-6) ** 2;
	const twoSig2 = 2 * sigmaSq;

	/* Build Kernel */
	const bars = [];
	let sumW = 0;

	for (let y = -radius; y <= radius; ++y) {
		for (let x = -radius; x <= radius; ++x) {
			const w = Math.exp(-(x * x + y * y) / twoSig2);
			bars.push({ x, y, w });
			sumW += w;
		}
	}
	bars.forEach(b => (b.w /= sumW));
	const maxW = Math.max(...bars.map(b => b.w));

	/* Scene bounds */
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
	const scale = 2 / Math.max(sceneW, sceneH);

	const slackX = Math.max(0, 2 - sceneW * scale);
	const slackY = Math.max(0, 2 - sceneH * scale);

	const offsetX = (-minX + MARGIN) * scale - 1 + slackX / 2;
	const offsetY = (-minY + MARGIN) * scale - 1 + slackY / 2;

	g.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;

	const rgb = v => `rgb(${v | 0},${v | 0},${v | 0})`;

	/* Back to front */
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
			appendPoly(g, [RR, BB, B, R], colR);
			/* Left Face */
			appendPoly(g, [LL, BB, B, L], colL);
			/* Top Face */
			appendPoly(g, [TT, RR, BB, LL], colT);
		});
}

function appendPoly(parent, ptsArr, fill) {
	const p = document.createElementNS(NS, "polygon");
	p.setAttribute("points", ptsArr.map(pt => pt.join(",")).join(" "));
	p.setAttribute("fill", fill);
	p.setAttribute("style", STYLES.sidePixel);
	parent.appendChild(p);
}
