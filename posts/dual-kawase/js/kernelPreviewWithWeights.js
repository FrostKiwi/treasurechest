const NS = "http://www.w3.org/2000/svg";
const viewBoxX = 400;
const viewBoxY = 300;

/* Styles */
const STYLES = {
	bg: "fill:#eb99a1; fill-opacity:0.5;",
	centerPixel: "fill:#ffecee; stroke:#1F1A17; stroke-width:3;",
	sidePixel: "fill:#ffecee; fill-opacity:0.5; stroke:#1F1A17; stroke-width:3;",
	samplePosition: "fill:#292929;",
};

export function setupKernelPreviewWithWeights() {
	const SVGBox = document.getElementById('SVGBox-kernelPreviewWithWeights');
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
	const scale = viewBoxY / 2 / (kernelSize * mult * 50 + 50);
	g.style.transform = `scale(${scale})`;

	const pixelSize = 90;

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

			const pixelX = x * 100;
			const pixelY = y * 100;

			if (x === 0 && y === 0)
				/* Center Pixel */
				content += `<rect x="${pixelX - offset}" y="${pixelY - offset}" width="${pixelSize}" height="${pixelSize}" style="${STYLES.centerPixel}"/>`;
			else if (Math.abs(x) <= half && Math.abs(y) <= half)
				/* Native Sample Pixel */
				content += `<rect x="${pixelX - offset}" y="${pixelY - offset}" width="${pixelSize}" height="${pixelSize}" style="${STYLES.sidePixel}; fill: #fcfcfc"/>`;
			else
				/* Other Pixels */
				content += `<rect x="${pixelX - offset}" y="${pixelY - offset}" width="${pixelSize}" height="${pixelSize}" style="${STYLES.sidePixel}" opacity="${opacity}"/>`;
		}
	}

	/* Sample Positions */
	for (let y = -half; y <= half; ++y) {
		for (let x = -half; x <= half; ++x) {
			const weight = 1 / (kernelSize * kernelSize);
			const weightText = weight.toFixed(3);
			content += `<circle cx="${x * mult * 100}" cy="${y * mult * 100}" r="35" style="${STYLES.samplePosition}"/>`;
			content += `<text x="${x * mult * 100}" y="${y * mult * 100}" text-anchor="middle" dominant-baseline="central" fill="white" font-size="18" font-family="monospace">${weightText}</text>`;
		}
	}

	g.innerHTML = content;
}
