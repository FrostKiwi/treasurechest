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
	svg.setAttribute("viewBox", "-1 -1 2 2");

	/* BG */
	const bg = document.createElementNS(NS, "rect");
	bg.setAttribute("x", -1);
	bg.setAttribute("y", -1);
	bg.setAttribute("width", 2);
	bg.setAttribute("height", 2);
	bg.setAttribute("style", STYLES.bg);
	svg.appendChild(bg);

	/* Animated and transformed group */
	const g = document.createElementNS(NS, "g");
	g.style.transformOrigin = "0 0";
	g.style.transition = "transform 0.3s ease";
	svg.appendChild(g);

	range.addEventListener("input", () => draw(range.value, g));
	draw(range.value, g);
}

function draw(k, g) {
	const kernelSize = 2 * k + 1;
	const scale = 1 / (kernelSize * 0.5 + 1.5);
	g.style.transform = `scale(${scale})`;

	const pixelSize = 0.9;

	/* Clear group */
	g.innerHTML = "";

	/* Center Pixel */
	const centerPixel = document.createElementNS(NS, "rect");
	centerPixel.setAttribute("x", -0.5 + (0.5 - pixelSize / 2));
	centerPixel.setAttribute("y", -0.5 + (0.5 - pixelSize / 2));
	centerPixel.setAttribute("width", pixelSize);
	centerPixel.setAttribute("height", pixelSize);
	centerPixel.setAttribute("style", STYLES.centerPixel);
	g.appendChild(centerPixel);

	/* Side Pixels */
	const extraRows = 5;
	const half = (kernelSize - 1) / 2;
	for (let y = -half - extraRows; y <= half + extraRows; ++y) {
		for (let x = -half - extraRows; x <= half + extraRows; ++x) {
			if (x === 0 && y === 0) continue;
			const r = document.createElementNS(NS, "rect");
			r.setAttribute("x", x - 0.5 + (0.5 - pixelSize / 2));
			r.setAttribute("y", y - 0.5 + (0.5 - pixelSize / 2));
			r.setAttribute("width", pixelSize);
			r.setAttribute("height", pixelSize);
			r.setAttribute("style", STYLES.sidePixel);

			const distance = Math.max(Math.abs(x) - half, Math.abs(y) - half);
			const opacity = Math.pow(0.5, distance);
			r.setAttribute("opacity", opacity);
			g.appendChild(r);
		}
	}

	/* Sample Positions */
	for (let y = -half; y <= half; ++y) {
		for (let x = -half; x <= half; ++x) {
			const c = document.createElementNS(NS, "circle");
			c.setAttribute("cx", x);
			c.setAttribute("cy", y);
			c.setAttribute("r", 0.1);
			c.setAttribute("style", STYLES.samplePosition);
			g.appendChild(c);
		}
	}
}
