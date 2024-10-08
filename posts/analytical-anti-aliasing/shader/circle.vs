/* Our Vertex data for the Quad */
attribute vec2 vtx;
attribute vec3 col;

/* The coordinates that will be used to for our drawing operations */
varying vec2 uv;
/* Color for the fragment shader */
varying vec3 color;

/* Aspect ratio */
uniform float aspect_ratio;
/* Position offset for the animation */
uniform vec2 offset;
/* Size of the Unit Quad */
uniform float size;

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
	/* Shrink the Quad and thus the "canvas", that the circle is drawn on */
	vertex *= size;
	/* Make the circle move in a circle, heh :] */
	vertex += offset;

	/* Vertex Output */
	gl_Position = vec4(vertex, 0.0, 1.0);
}