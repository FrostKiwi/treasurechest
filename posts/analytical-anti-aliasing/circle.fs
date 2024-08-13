precision mediump float;
varying vec2 uv;
varying vec3 color;

void main(void)
{
	/* Clamped and scaled uv.y added to color simply to make the bottom of the
	   circle white, so the contrast is high and you can see strong aliasing */
	vec3 finalColor = color + clamp( - uv.y * 0.4, 0.0, 1.0);

	/* Discard fragments outside the circle */
	if (length(uv) < 1.0)
		gl_FragColor = vec4(finalColor, 1.0);
	else
		discard;
}