/* Our Vertex data for the Quad */
attribute vec2 vtx;
attribute vec3 col;

/* The coordinates that will be used to for our drawing operations */
varying vec2 uv;
/* Color for the fragment shader */
varying vec3 color;
/* Fragment shader needs to know the pixel size and since we mess with the quad
   to expand it by 1 pixel to not change the final pixel size, we need to give
   the fragment shader the corrected pixel size */
varying float pixelSizeAdjusted;

/* Aspect ratio */
uniform float aspect_ratio;
/* Position offset for the animation */
uniform vec2 offset;
/* Size of the Unit Quad */
uniform float size;
/* Pixel size in regards to the Quad */
uniform float pixelSize;

void main()
{
	/* Assign the verticies to be used as the distance field for drawing. This
	   will be linearly interpolated before going to the fragment shader */
	uv = vtx;
	/* Sending some nice color to the fragment shader */
	color = col;

	vec2 vertex = vtx;
	/* correct for aspect ratio  */
	vertex.x *= aspect_ratio;
	/* Shrink the Quad and thus the "canvas", that the circle is drawn on. The
	   pixelSize is added for two reasons: 0.5px to get the original circle size
	   again, as the AAA fading is set to fade the edge on the circle inside,
	   preventing hard edges due to unrasterized pixels. And another 0.5px is
	   to correct the "breathing room" added in the fragment shader,
	   specifically for the MSAA sampling case, as hardware specific issues
	   around MSAA sampling may or may not result in transparent pixels
	   disappearing too soon. */
	vertex *= size + pixelSize;
	/* Calculate the true pixel size, after we messed with the quad's size */
	pixelSizeAdjusted = pixelSize / (size + pixelSize);
	/* Make the circle move in a circle, heh :] */
	vertex += offset;

	/* Vertex Output */
	gl_Position = vec4(vertex, 0.0, 1.0);
}