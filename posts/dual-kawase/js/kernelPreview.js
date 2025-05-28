const NS = "http://www.w3.org/2000/svg";
const viewBoxX = 4;
const viewBoxY = 3;

let isDrawing = false;
let queuedArgs = null;

/* Styles */
const STYLES = {
	bg: "fill:#eb99a1; fill-opacity:0.5;",
	centerPixel: "fill:#ffecee; stroke:#1F1A17; stroke-width:0.025;",
	sidePixel: "fill:#ffecee; fill-opacity:0.5; stroke:#1F1A17; stroke-width:0.025;",
	samplePosition: "fill:#292929;",
};

export function setupSVG() {
	const svg = document.getElementById("kernelSimple");
	const kernelRange = document.getElementById("svgKernelRange");
	const sampleMultRange = document.getElementById("svgSamplePosMult");
	svg.setAttribute("viewBox", `${-viewBoxX / 2} ${-viewBoxY / 2} ${viewBoxX} ${viewBoxY}`);

	/* BG */
	const bg = document.createElementNS(NS, "rect");
	bg.setAttribute("x", -viewBoxX / 2);
	bg.setAttribute("y", -viewBoxY / 2);
	bg.setAttribute("width", viewBoxX);
	bg.setAttribute("height", viewBoxY);
	bg.setAttribute("style", STYLES.bg);
	svg.appendChild(bg);

	/* Animated and transformed group */
	const g = document.createElementNS(NS, "g");
	g.style.transformOrigin = "0 0";
	g.style.transition = "transform 0.3s ease";
	svg.appendChild(g);

	kernelRange.addEventListener("input", () => redraw(kernelRange.value, sampleMultRange.value, g));
	sampleMultRange.addEventListener("input", () => redraw(kernelRange.value, sampleMultRange.value, g));

	redraw(kernelRange.value, sampleMultRange.value, g);
}

/* Basic queue  */
function redraw(kernelSize, mult, g) {
	if (isDrawing) {
		queuedArgs = [kernelSize, mult];
		console.log("Snubbed")
		return;
	}

	isDrawing = true;
	draw(kernelSize, g, mult);
	isDrawing = false;

	if (queuedArgs) {
		const [kernelQueued, multQueued] = queuedArgs;
		console.log("DeQueued")
		queuedArgs = null;
		redraw(kernelQueued, multQueued, g);
	}
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
	/* Center Pixel */
	content += `<rect x="${-0.5 + (0.5 - pixelSize / 2)}" y="${-0.5 + (0.5 - pixelSize / 2)}" width="${pixelSize}" height="${pixelSize}" style="${STYLES.centerPixel}"/>`;

	/* Side Pixels */
	const extraRows = 4;
	const half = (kernelSize - 1) / 2;
	for (let y = -half - extraRows; y <= half + extraRows; ++y) {
		for (let x = -half - extraRows; x <= half + extraRows; ++x) {
			if (x === 0 && y === 0) continue;
			const dx = Math.max(Math.abs(x) - half, 0);
			const dy = Math.max(Math.abs(y) - half, 0);
			const radial = Math.sqrt(dx * dx + dy * dy);
			const opacity = radial > 0 ? Math.pow(0.35, radial) : 1;
			content += `<rect x="${x - 0.5 + (0.5 - pixelSize / 2)}" y="${y - 0.5 + (0.5 - pixelSize / 2)}" width="${pixelSize}" height="${pixelSize}" style="${STYLES.sidePixel}" opacity="${opacity}"/>`;
		}
	}

	/* Sample Positions */
	for (let y = -half; y <= half; ++y) {
		for (let x = -half; x <= half; ++x) {
			content += `<circle cx="${x * mult}" cy="${y * mult}" r="0.12" style="${STYLES.samplePosition}"/>`;
		}
	}

	g.innerHTML = content;
}
