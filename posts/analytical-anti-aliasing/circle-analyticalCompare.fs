//#if defined(FWIDTH) || defined(dFd)
//	#extension GL_OES_standard_derivatives : enable
//#endif

precision mediump float;
/* uv coordinates from the vertex shader */
varying vec2 uv;
/* color from the vertex shader */
varying vec3 color;
/* pixel size from the vertex shader, corrected for influence from of the 1px
   dialation */
varying float pixelSizeAdjusted;

uniform float shrinkAmount;
uniform float smoothingAmount;

float linearstep(float edge0, float edge1, float x) {
    return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

float linearstepNoclamp(float edge0, float edge1, float x) {
    return (x - edge0) / (edge1 - edge0);
}

void main(void)
{

	float dist = length(uv) + pixelSizeAdjusted * shrinkAmount;
	//float dist = length(uv) - 1.0 + fwidth(uv.x) * 1.5;
	
	/* Fade out near the edge of the circle */
	// float alpha = smoothstep(1.0, 1.0 - 0.01, dist);
    // float alpha = dist / length(vec2(dFdx(dist), dFdy(dist))) + 1.0;
	
	float alpha = (1.0 - dist) / (pixelSizeAdjusted * smoothingAmount);
	
	//float alpha = smoothstep(1.0, 1.0 - pixelSizeAdjusted * smoothingAmount, length(uv));
	
	//float alpha = dist / fwidth(dist);

	/* Clamped and scaled uv.y added to color simply to make the bottom of the
	   circle white, so the contrast is high and you can see strong aliasing */
    gl_FragColor = vec4(color + clamp( - uv.y * 0.4, 0.0, 1.0), alpha);
}