#extension GL_OES_standard_derivatives : enable
precision mediump float;
varying vec2 uv;
varying vec3 color;

float roundedBoxSDF(vec2 uv, float Size, float Radius)
{
    return length(max(abs(uv) - Size + Radius, 0.0)) - Radius;
}

void main(void)
{
	float dist = roundedBoxSDF(uv, 0.75, 0.25);

	/* Fade out near the edge of the circle */
	float alpha = dist / length(vec2(dFdx(dist), dFdy(dist)));

	/* Clamped and scaled uv.y added to color simply to make the bottom of the
	   circle white, so the contrast is high and you can see strong aliasing */
    gl_FragColor = vec4(color + clamp( - uv.y * 0.4, 0.0, 1.0), 1.0 - alpha);
}