#extension GL_OES_standard_derivatives : enable
precision mediump float;
varying vec2 uv;
varying vec3 color;

void main(void)
{

	//float dist = length(uv) - 1.0 + pixelSize;
	float dist = length(uv) - 1.0 + fwidth(uv.x) * 1.5;
	
	/* Fade out near the edge of the circle */
	// float alpha = smoothstep(1.0, 1.0 - 0.01, dist);
    // float alpha = dist / length(vec2(dFdx(dist), dFdy(dist))) + 1.0;
	//float alpha = dist / pixelSize;
	float alpha = dist / fwidth(dist);

	/* Clamped and scaled uv.y added to color simply to make the bottom of the
	   circle white, so the contrast is high and you can see strong aliasing */
    gl_FragColor = vec4(color + clamp( - uv.y * 0.4, 0.0, 1.0), 1.0 - alpha);
}