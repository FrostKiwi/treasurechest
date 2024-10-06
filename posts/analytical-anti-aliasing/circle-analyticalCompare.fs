#if defined(FWIDTH) || defined(DFD)
	#extension GL_OES_standard_derivatives : enable
#endif

precision mediump float;
/* uv coordinates from the vertex shader */
varying vec2 uv;
/* color from the vertex shader */
varying vec3 color;
/* pixel size from the vertex shader, corrected for resizing */
varying float pixelSizeAdjusted;
/* How many pixels to shrink */
uniform float shrinkAmount;
/* How many pixels to smooth */
uniform float smoothingAmount;

/* Step function with Linear Interpolation, instead of Hermite Interpolation */
float linearstep(float edge0, float edge1, float x) {
    return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

/* Step function with Linear Interpolation, but no clamping */
float linearstepNoclamp(float edge0, float edge1, float x) {
    return (x - edge0) / (edge1 - edge0);
}

void main(void)
{
	/* The basic signed distance field of a point */
	float dist = length(uv);
	
	/* Pixel size method */
	#if defined(SIMPLE)
	    float pixelSize = pixelSizeAdjusted;
	#elif defined(DFD)
	    float pixelSize = length(vec2(dFdx(dist), dFdy(dist)));
	#elif defined(FWIDTH)
	    float pixelSize = fwidth(dist);
	#endif

	/* Radius Adjust */
	dist += pixelSize * shrinkAmount;

	/* Blend method */	
	#if defined(DIVISION)
	    float alpha = (1.0 - dist) / (pixelSize * smoothingAmount);
	#elif defined(SMOOTHSTEP)
	    float alpha = smoothstep(1.0, 1.0 - pixelSize * smoothingAmount, dist);
	#elif defined(LINSTEP)
	    float alpha = linearstep(1.0, 1.0 - pixelSize * smoothingAmount, dist);
	#elif defined(LINSTEP_NO_CLAMP)
	    float alpha = linearstepNoclamp(1.0, 1.0 - pixelSize * smoothingAmount, dist);
	#endif

	/* Clamped and scaled uv.y added to color simply to make the bottom of the
	   circle white, so the contrast is high and you can see strong aliasing */
    gl_FragColor = vec4(color + clamp( - uv.y * 0.4, 0.0, 1.0), alpha);
}