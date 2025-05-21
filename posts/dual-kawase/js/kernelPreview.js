const NS = "http://www.w3.org/2000/svg";

/* Styles */
const STYLES = {
	bg: "fill:#eb99a1; fill-opacity:0.5;",
	centerPixel: "fill:#ffecee; stroke:#1F1A17; stroke-width:0.025;",
	sidePixel: "fill:#ffecee; fill-opacity:0.5; stroke:#1F1A17; stroke-width:0.025;",
	samplePosition: "fill:#292929;",
};

export function setupSVG() {
	const svg = document.getElementById("kernelSimple");
	const range = document.getElementById("svgKernelRange");

	svg.setAttribute("viewBox", "0 0 1 1");

	range.addEventListener("input", () => draw(range.value));
	draw(range.value);
}

function draw(k) {
	const kernelSize = 2 * k + 3;

	const svg = document.getElementById("kernelSimple");
	svg.innerHTML = "";

	/* BG */
	const bg = document.createElementNS(NS, "rect");
	bg.setAttribute("x", 0);
	bg.setAttribute("y", 0);
	bg.setAttribute("width", 1);
	bg.setAttribute("height", 1);
	bg.setAttribute("style", STYLES.bg);
	svg.appendChild(bg);

	const g = document.createElementNS(NS, "g");
	const scale = 1 / kernelSize;
	g.setAttribute("transform", `scale(${scale})`);
	svg.appendChild(g);

	const pixelSize = 0.9;
	const offset = 0.05;
	const center = (kernelSize - 1) / 2;

	/* Pixels */
	for (let y = 0; y < kernelSize; ++y) {
		for (let x = 0; x < kernelSize; ++x) {
			const r = document.createElementNS(NS, "rect");
			r.setAttribute("x", x + offset);
			r.setAttribute("y", y + offset);
			r.setAttribute("width", pixelSize);
			r.setAttribute("height", pixelSize);
			const isCenter = x === center && y === center;
			r.setAttribute("style", isCenter ? STYLES.centerPixel : STYLES.sidePixel);
			g.appendChild(r);
		}
	}

	/* Samples */
	for (let y = 1; y < kernelSize - 1; ++y) {
		for (let x = 1; x < kernelSize - 1; ++x) {
			const c = document.createElementNS(NS, "circle");
			c.setAttribute("cx", x + 0.5);
			c.setAttribute("cy", y + 0.5);
			c.setAttribute("r", 0.1);
			c.setAttribute("style", STYLES.samplePosition);
			g.appendChild(c);
		}
	}
}
