precision mediump float;
/* uv coordinates from the vertex shader */
varying vec2 uv;
/* color from the vertex shader */
varying vec3 color;
/* pixel size from the vertex shader, corrected for influence of size changes */
varying float pixelSizeAdjusted;

void main(void)
{
	/* Our signed distance field of a point */
	float dist = length(uv);

	/* We add half a pixel of breathing room. This is only required for the MSAA
	   case. Depending on Hardware implementation, rasterization, MSAA sample
	   count and placement, one row of pixels may or may not disappear too soon,
	   when the circle's edge is right up against the unit quad's border */
	dist += pixelSizeAdjusted * 0.5;
	
	/* Fade out the pixels near the edge of the circle with exactly the size of
	   one pixel, so we get pixel perfect Anti-Aliasing. */
	float alpha = (1.0 - dist) / pixelSizeAdjusted;

	/* Clamped and scaled uv.y added to color simply to make the bottom of the
	   circle white, so the contrast is high and you can see strong aliasing */
    gl_FragColor = vec4(color + clamp( - uv.y * 0.4, 0.0, 1.0), alpha);
}