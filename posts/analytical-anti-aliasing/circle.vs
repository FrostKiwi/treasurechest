/* Our Vertex data for the Quad */
attribute vec2 vtx;
attribute vec3 col;
/* The coordinates that will be used to for our drawing operations */
varying vec2 uv;
varying vec3 color;

/* Aspect ratio */
uniform float aspect_ratio;
/* Position offset for the animation */
uniform vec2 offset;

void main()
{
	/* Assign the verticies to be used as the distance field for drawing. This
	   will be linearly interpolated before going to the fragment shader */
	uv = vtx;
	/* Some nice color */
	color = col;

	/* Make Circle smaller and correct aspect ratio */
	vec2 vertex = vtx;
	vertex.x *= aspect_ratio;
	vertex *= 0.7;

	/* Make the circle move in a circle */
	vertex += offset;

	gl_Position = vec4(vertex, 0.0, 1.0);
}