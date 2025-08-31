const NS = "http://www.w3.org/2000/svg";
const viewBoxX = 4;
const viewBoxY = 3;

/* Styles */
const STYLES = {
	bg: "fill:#eb99a1; fill-opacity:0.5;",
	centerPixel: "fill:#ffecee; stroke:#1F1A17; stroke-width:0.03;",
	sidePixel: "fill:#ffecee; fill-opacity:0.5; stroke:#1F1A17; stroke-width:0.03;",
	samplePosition: "fill:#292929;",
};

export function setupKernelPreview() {
	const SVGBox = document.getElementById('SVGBox-kernelPreview');
	const svg = SVGBox.querySelector('svg');

	/* UI */
	const kernelRange = SVGBox.querySelector("#kernelRange");
	const sampleMultRange = SVGBox.querySelector("#samplePosMult");
	const sampleMultRangeReset = SVGBox.querySelector("#samplePosMultReset");

	svg.setAttribute("viewBox", `${-viewBoxX / 2} ${-viewBoxY / 2} ${viewBoxX} ${viewBoxY}`);

	/* BG */
	const bg = document.createElementNS(NS, "rect");
	bg.setAttribute("x", -viewBoxX / 2);
	bg.setAttribute("y", -viewBoxY / 2);
	bg.setAttribute("width", viewBoxX);
	bg.setAttribute("height", viewBoxY);
	bg.setAttribute("style", "fill:#eb99a1; fill-opacity:0.5;");
	svg.appendChild(bg);

	/* Animated and transformed group */
	const g = document.createElementNS(NS, "g");
	g.style.transformOrigin = "0 0";
	g.style.transition = "transform 0.3s ease";
	svg.appendChild(g);

	let frameId = null;
	const redraw = () => {
		if (frameId !== null) cancelAnimationFrame(frameId);

		frameId = requestAnimationFrame(() => {
			frameId = null;
			draw(kernelRange.value, g, sampleMultRange.value);
		});
	};

	kernelRange.addEventListener("input", () => {
		redraw();
		sampleMultRange.disabled = kernelRange.value == 0;
		sampleMultRangeReset.disabled = kernelRange.value == 0;
	});
	sampleMultRange.addEventListener("input", redraw);

	redraw();
}

function draw(k, g, mult) {
	const kernelSize = 2 * k + 1;
	const scale = viewBoxY / 2 / (kernelSize * mult * 0.5 + 1.5);
	g.style.transform = `scale(${scale})`;

	const pixelSize = 0.9;

	let content = "";

	/* A bit ugly due to it's literal text nature, but doing the nice setAttributes
	and createElementNS angers Safari Apple Devices, so we don't modify the DOM
	too fast by doing it in text form here */

	/* Pixels */
	const extraRows = 8;
	const half = (kernelSize - 1) / 2;
	const offset = pixelSize * 0.5;

	for (let y = -half - extraRows; y <= half + extraRows; ++y) {
		for (let x = -half - extraRows; x <= half + extraRows; ++x) {

			const dx = Math.max(Math.abs(x) - half, 0);
			const dy = Math.max(Math.abs(y) - half, 0);
			const radial = Math.sqrt(dx * dx + dy * dy);
			const opacity = Math.pow(0.35, radial);

			if (x === 0 && y === 0)
				/* Center Pixel */
				content += `<rect x="${x - offset}" y="${y - offset}" width="${pixelSize}" height="${pixelSize}" style="${STYLES.centerPixel}"/>`;
			else if (Math.abs(x) <= half && Math.abs(y) <= half)
				/* Native Sample Pixel */
				content += `<rect x="${x - offset}" y="${y - offset}" width="${pixelSize}" height="${pixelSize}" style="${STYLES.sidePixel}; fill: #fcfcfc"/>`;
			else
				/* Other Pixels */
				content += `<rect x="${x - offset}" y="${y - offset}" width="${pixelSize}" height="${pixelSize}" style="${STYLES.sidePixel}" opacity="${opacity}"/>`;
		}
	}

	/* Sample Positions */
	for (let y = -half; y <= half; ++y) {
		for (let x = -half; x <= half; ++x) {
			content += `<circle cx="${x * mult}" cy="${y * mult}" r="0.15" style="${STYLES.samplePosition}"/>`;
		}
	}

	g.innerHTML = content;
}
