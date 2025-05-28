"use strict";
/* Vertex Buffer of a simple Quad */
export const unitQuad = new Float32Array([
	-1.0, 1.0,
	1.0, 1.0,
	1.0, -1.0,
	-1.0, -1.0
]);

/* Standard shader compilation */
export function compileAndLinkShader(gl, vtxSrc, fragSrc, uniforms = [], fragPrefix = "") {
	/* Vertex Shader */
	const vtxShd = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vtxShd, vtxSrc);
	gl.compileShader(vtxShd);
	if (!gl.getShaderParameter(vtxShd, gl.COMPILE_STATUS))
		console.error("Vertex shader compilation error: ", gl.getShaderInfoLog(vtxShd));

	/* Fragment Shader */
	const fragShd = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragShd, fragPrefix + "\n" + fragSrc);
	gl.compileShader(fragShd);
	if (!gl.getShaderParameter(fragShd, gl.COMPILE_STATUS))
		console.error("Fragment shader compilation error: ", gl.getShaderInfoLog(fragShd));

	/* Linking */
	const linkedShd = gl.createProgram();
	gl.attachShader(linkedShd, vtxShd);
	gl.attachShader(linkedShd, fragShd);
	gl.linkProgram(linkedShd);
	if (!gl.getProgramParameter(linkedShd, gl.LINK_STATUS))
		console.error("Shader linking error: ", gl.getProgramInfoLog(linkedShd));

	const uniformsLocations = {};
	for (const uniform of uniforms)
		uniformsLocations[uniform] = gl.getUniformLocation(linkedShd, uniform);

	return { handle: linkedShd, uniforms: uniformsLocations };
}

/* Standard Texture loading */
export function setupTexture(gl, width, height, target, filter, source) {
	gl.deleteTexture(target);
	target = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, target);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	if (source)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
	else
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, gl.RGB, gl.UNSIGNED_BYTE, null);

	return target;
}

/* Create Framebuffer */
export function setupFramebuffer(gl, w, h, filter = gl.LINEAR) {
	const tex = setupTexture(gl, w, h, null, filter);
	const fb = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
	return [fb, tex];
}

/* Upload and bind UnitQuad */
export function bindUnitQuad(gl) {
	const buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buf);
	gl.bufferData(gl.ARRAY_BUFFER, unitQuad, gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);
	return buf;
}

/* Fetch Shader Text */
export async function fetchShader(path) {
	const response = await fetch(path);
	return await response.text();
}

/* True pixel size of the canvas */
/* Awesome code from https://stackoverflow.com/a/23937767 by @Buster */
export function getNativeSize(canvas) {
	const dipRect = canvas.getBoundingClientRect();
	const width = Math.round(devicePixelRatio * dipRect.right) - Math.round(devicePixelRatio * dipRect.left);
	const height = Math.round(devicePixelRatio * dipRect.bottom) - Math.round(devicePixelRatio * dipRect.top);
	return [width, height]
}

function formatBytes(bytes) {
	const units = ["B", "KB", "MB", "GB", "TB"];
	let i = 0;
	while (bytes >= 1024 && i < units.length - 1) {
		bytes /= 1024;
		i++;
	}
	return `${bytes.toFixed(2)} ${units[i]}`;
}

export function reportMemory() {
	if (window.performance && window.performance.memory) {
		const memory = window.performance.memory;
		console.log("Total JS heap size (limit):", formatBytes(memory.jsHeapSizeLimit));
		console.log("Currently allocated JS heap size:", formatBytes(memory.totalJSHeapSize));
		console.log("JS heap size being used:", formatBytes(memory.usedJSHeapSize));
	} else {
		console.log("performance.memory is not supported in this browser.");
	}
}