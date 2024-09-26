precision mediump float;
/* uv coordinates from the vertex shader */
varying vec2 uv;
/* color from the vertex shader */
varying vec3 color;
/* pixel size from the vertex shader, corrected for influence from of the 1px
   dialation */
varying float pixelSizeAdjusted;

void main(void)
{
	/* We shrink the cirle by 1px (pixelSizeAdjusted) to prevent cut-off.
	
	   We actually shrink by 1.5px to move the border into the pixel center, so
	   mathematically it has the same size as the noAA circle. This * 1.5 isn't
	   actually required and a bit pedantic, but when flicking between noAA this
	   corrects for a tiny mis-allignment seen at very small resolutions. */
	float dist = length(uv) - 1.0 + pixelSizeAdjusted * 1.5;
	
	/* Fade out the pixels near the edge of the circle with exactly the size of
	   one pixel, so we get pixel perfect Anti-Aliasing. */
	float alpha = dist / pixelSizeAdjusted;

	/* Clamped and scaled uv.y added to color simply to make the bottom of the
	   circle white, so the contrast is high and you can see strong aliasing */
    gl_FragColor = vec4(color + clamp( - uv.y * 0.4, 0.0, 1.0), 1.0 - alpha);
}