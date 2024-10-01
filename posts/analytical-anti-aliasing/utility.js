"use strict";
/* Vertex Buffer of a simple Quad with some colors */
const unitQuad = new Float32Array([
	-1.0, 1.0, 1.0, 1.0, 0.0,
	1.0, 1.0, 1.0, 0.0, 1.0,
	1.0, -1.0, 0.0, 1.0, 1.0,
	-1.0, -1.0, 1.0, 1.0, 1.0
]);

/* Make the circle smaller */
const circleSize = 0.68;

/* Standard shader compilation */
function compileAndLinkShader(gl, vtxShdSrc, FragShdSrc, FragPrefix) {
	/* Vertex Shader Compilation */
	const vtxShd = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vtxShd, document.getElementById(vtxShdSrc).text);
	gl.compileShader(vtxShd);

	if (!gl.getShaderParameter(vtxShd, gl.COMPILE_STATUS))
		console.error("Vertex shader compilation error: ", gl.getShaderInfoLog(vtxShd));

	/* Fragment Shader Compilation */
	const FragShd = gl.createShader(gl.FRAGMENT_SHADER);
	let fragmentSource = document.getElementById(FragShdSrc).text;

	if (FragPrefix)
		fragmentSource = FragPrefix + '\n' + fragmentSource;

	gl.shaderSource(FragShd, fragmentSource);
	gl.compileShader(FragShd);

	if (!gl.getShaderParameter(FragShd, gl.COMPILE_STATUS))
		console.error("Fragment shader compilation error: ", gl.getShaderInfoLog(FragShd));

	/* Shader Linking */
	const LinkedShd = gl.createProgram();
	gl.attachShader(LinkedShd, vtxShd);
	gl.attachShader(LinkedShd, FragShd);
	gl.linkProgram(LinkedShd);

	if (!gl.getProgramParameter(LinkedShd, gl.LINK_STATUS))
		console.error("Shader program linking error: ", gl.getProgramInfoLog(LinkedShd));

	return LinkedShd;
}

/* Standard Texture loading */
function setupTexture(gl, width, height, target, filter) {
	gl.deleteTexture(target);
	target = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, target);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	return target;
}