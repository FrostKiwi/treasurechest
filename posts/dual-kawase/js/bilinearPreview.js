const NS = "http://www.w3.org/2000/svg";
const viewBoxWidth = 5;
const viewBoxHeight = 3;

/* Grid constants */
const GRID_COLS = 6;
const GRID_ROWS = 4;
const ANIMATION_RADIUS = 0.6;
const SAMPLE_POINT_RADIUS = 0.15;

/* Configuration */
let squareSize = 0.85;

/* Colors for the 4 squares - in RGB format */
const SQUARE_COLORS = {
	topLeft: { r: 255, g: 255, b: 255 },
	topRight: { r: 0, g: 161, b: 229 },
	bottomLeft: { r: 218, g: 68, b: 83 },
	bottomRight: { r: 66, g: 122, b: 90 }
};

const STYLES = {
	square: "stroke:#111; stroke-width:0.03;",
	samplePoint: "stroke:#000000; stroke-width:0.03;",
};

/* Helper function to calculate grid positions */
function calculateGridPositions() {
	const gap = 1 - squareSize;
	const unitSize = squareSize + gap;
	const gridWidth = GRID_COLS * unitSize - gap;
	const gridHeight = GRID_ROWS * unitSize - gap;
	const startX = -gridWidth / 2;
	const startY = -gridHeight / 2;
	const halfSquare = squareSize / 2;
	
	const colPositions = [];
	const colCenters = [];
	for (let i = 0; i < GRID_COLS; i++) {
		colPositions.push(startX + i * unitSize);
		colCenters.push(startX + i * unitSize + halfSquare);
	}
	
	const rowPositions = [];
	const rowCenters = [];
	for (let i = 0; i < GRID_ROWS; i++) {
		rowPositions.push(startY + i * unitSize);
		rowCenters.push(startY + i * unitSize + halfSquare);
	}
	
	return { colPositions, colCenters, rowPositions, rowCenters, unitSize };
}

/* Helper function to generate the color grid pattern */
function generateColorGrid() {
	const colorGrid = [];
	for (let row = 0; row < GRID_ROWS; row++) {
		const rowColors = [];
		const isTopRow = row % 2 === 1;
		
		for (let col = 0; col < GRID_COLS; col++) {
			const isRightCol = col % 2 === 1;
			
			if (isTopRow) {
				rowColors.push(isRightCol ? SQUARE_COLORS.topRight : SQUARE_COLORS.topLeft);
			} else {
				rowColors.push(isRightCol ? SQUARE_COLORS.bottomRight : SQUARE_COLORS.bottomLeft);
			}
		}
		colorGrid.push(rowColors);
	}
	return colorGrid;
}

/* Helper function to calculate opacity based on position */
function calculateOpacity(col, row) {
	if ((col >= 2 && col <= 3) && (row >= 1 && row <= 2))
		return 1.0;
	if ((col >= 1 && col <= 4) && (row >= 0 && row <= 3))
		return 0.5;
	return 0.25;
}

/* Helper function to draw all squares */
function drawSquares() {
	const { colPositions, rowPositions } = calculateGridPositions();
	const colorGrid = generateColorGrid();
	let content = "";
	
	for (let row = 0; row < GRID_ROWS; row++) {
		for (let col = 0; col < GRID_COLS; col++) {
			const color = colorGrid[row][col];
			const opacity = calculateOpacity(col, row);
			const rgbColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
			
			content += `<rect x="${colPositions[col]}" y="${rowPositions[row]}" width="${squareSize}" height="${squareSize}" fill="${rgbColor}" style="${STYLES.square}" opacity="${opacity}"/>`;
		}
	}
	
	return content;
}

export function setupBilinearPreview() {
	const SVGBox = document.getElementById('SVGBox-bilinearPreview');
	const svg = SVGBox.querySelector('svg');
	const animate = SVGBox.querySelector('#animateCheck');
	
	let mode = "nearest";
	const modes = SVGBox.querySelectorAll('input[type="radio"]');
	modes.forEach(radio => {
		/* Force set to nearest to fix a reload bug in Firefox Android */
		if (radio.value === "nearest")
			radio.checked = true;
		radio.addEventListener('change', (event) => {
			mode = event.target.value;
			redraw();
		});
	});

	animate.addEventListener('change', () => {
		redraw();
	});

	svg.setAttribute("viewBox", `${-viewBoxWidth / 2} ${-viewBoxHeight / 2} ${viewBoxWidth} ${viewBoxHeight}`);

	/* Content group */
	const g = document.createElementNS(NS, "g");
	svg.appendChild(g);

	/* Sample point state */
	let samplePoint = { x: 0.2, y: -0.3 };

	/* Animation state */
	let animationStartTime = Date.now();

	let frameId = null;
	const redraw = () => {
		if (frameId !== null) cancelAnimationFrame(frameId);

		frameId = requestAnimationFrame(() => {
			frameId = null;
			
			if (animate.checked && !isDragging) {
				const elapsed = (Date.now() - animationStartTime) / 1000;
				const angle = -elapsed * Math.PI / 2;
				samplePoint = {
					x: Math.cos(angle) * ANIMATION_RADIUS,
					y: Math.sin(angle) * ANIMATION_RADIUS
				};
				redraw();
			}
			
			draw(g, samplePoint, mode);
		});
	};

	/* Mouse/touch interaction state */
	let isDragging = false;

	const updatePointFromEvent = (event) => {
		const rect = svg.getBoundingClientRect();
		const clientX = event.clientX || (event.touches && event.touches.length > 0 && event.touches[0].clientX);
		const clientY = event.clientY || (event.touches && event.touches.length > 0 && event.touches[0].clientY);
		
		if (clientX === undefined || clientY === undefined) return;
		
		/* Convert screen coordinates to SVG coordinates */
		const svgX = ((clientX - rect.left) / rect.width) * viewBoxWidth - viewBoxWidth / 2;
		const svgY = ((clientY - rect.top) / rect.height) * viewBoxHeight - viewBoxHeight / 2;
		
		samplePoint = { x: svgX, y: svgY };
		redraw();
	};

	/* Mouse events */
	svg.addEventListener("mousedown", (event) => {
		event.preventDefault();
		isDragging = true;
		animate.checked = false;
		updatePointFromEvent(event);
		svg.style.cursor = "none";
	});

	svg.addEventListener("mousemove", (event) => {
		if (isDragging) {
			event.preventDefault();
			updatePointFromEvent(event);
		}
	});

	svg.addEventListener("mouseup", () => {
		isDragging = false;
		svg.style.cursor = "pointer";
	});

	svg.addEventListener("mouseleave", () => {
		isDragging = false;
		svg.style.cursor = "pointer";
	});

	/* Touch events */
	svg.addEventListener("touchstart", (event) => {
		event.preventDefault();
		isDragging = true;
		animate.checked = false;
		updatePointFromEvent(event);
	});

	svg.addEventListener("touchmove", (event) => {
		if (isDragging) {
			event.preventDefault();
			updatePointFromEvent(event);
		}
	});

	svg.addEventListener("touchend", () => {
		isDragging = false;
	});

	svg.addEventListener("touchcancel", () => {
		isDragging = false;
	});

	svg.style.cursor = "pointer";

	/* Stop animation when SVG goes out of view */
	let observer = new IntersectionObserver(entries => {
		entries.forEach(entry => {
			if (!entry.isIntersecting) {
				animate.checked = false;
			}
		});
	});
	observer.observe(svg);

	redraw();
}

function draw(g, samplePoint, mode) {
	/* Draw all squares */
	let content = drawSquares();

	/* Calculate interpolated color and draw sample point */
	const interpolatedColor = mode === "bilinear" 
		? bilinearInterpolate(samplePoint.x, samplePoint.y)
		: nearestNeighborInterpolate(samplePoint.x, samplePoint.y);
	content += `<circle cx="${samplePoint.x}" cy="${samplePoint.y}" r="${SAMPLE_POINT_RADIUS}" fill="${interpolatedColor}" style="${STYLES.samplePoint}"/>`;

	g.innerHTML = content;
}

function bilinearInterpolate(x, y) {
	/* Get grid positions and color pattern */
	const { colCenters, rowCenters } = calculateGridPositions();
	const colorGrid = generateColorGrid();
	
	/* Find the 4 nearest square centers for bilinear interpolation */
	let leftCol = 0;
	for (let i = 0; i < GRID_COLS - 1; i++) {
		if (x >= colCenters[i] && x <= colCenters[i + 1]) {
			leftCol = i;
			break;
		}
	}
	if (x > colCenters[GRID_COLS - 1]) leftCol = GRID_COLS - 2;
	if (x < colCenters[0]) leftCol = 0;
	
	let topRow = 0;
	for (let i = 0; i < GRID_ROWS - 1; i++) {
		if (y >= rowCenters[i] && y <= rowCenters[i + 1]) {
			topRow = i;
			break;
		}
	}
	if (y > rowCenters[GRID_ROWS - 1]) topRow = GRID_ROWS - 2;
	if (y < rowCenters[0]) topRow = 0;
	
	/* Get the 4 corner colors - already in RGB format */
	const topLeft = colorGrid[topRow][leftCol];
	const topRight = colorGrid[topRow][leftCol + 1];
	const bottomLeft = colorGrid[topRow + 1][leftCol];
	const bottomRight = colorGrid[topRow + 1][leftCol + 1];
	
	/* Calculate interpolation weights */
	const xWeight = (x - colCenters[leftCol]) / (colCenters[leftCol + 1] - colCenters[leftCol]);
	const yWeight = (y - rowCenters[topRow]) / (rowCenters[topRow + 1] - rowCenters[topRow]);
	
	const clampedXWeight = Math.max(0, Math.min(1, xWeight));
	const clampedYWeight = Math.max(0, Math.min(1, yWeight));
	
	/* Bilinear interpolation */
	const top = interpolateRgb(topLeft, topRight, clampedXWeight);
	const bottom = interpolateRgb(bottomLeft, bottomRight, clampedXWeight);
	const final = interpolateRgb(top, bottom, clampedYWeight);
	
	return `rgb(${Math.round(final.r)}, ${Math.round(final.g)}, ${Math.round(final.b)})`;
}

function nearestNeighborInterpolate(x, y) {
	/* Get grid positions and color pattern */
	const { colCenters, rowCenters } = calculateGridPositions();
	const colorGrid = generateColorGrid();
	
	/* Find the nearest square center */
	let minDistance = Infinity;
	let nearestColor = SQUARE_COLORS.topLeft;
	
	for (let row = 0; row < GRID_ROWS; row++) {
		for (let col = 0; col < GRID_COLS; col++) {
			const centerX = colCenters[col];
			const centerY = rowCenters[row];
			const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
			
			if (distance < minDistance) {
				minDistance = distance;
				nearestColor = colorGrid[row][col];
			}
		}
	}
	
	return `rgb(${nearestColor.r}, ${nearestColor.g}, ${nearestColor.b})`;
}

function interpolateRgb(color1, color2, t) {
	return {
		r: color1.r + (color2.r - color1.r) * t,
		g: color1.g + (color2.g - color1.g) * t,
		b: color1.b + (color2.b - color1.b) * t
	};
}