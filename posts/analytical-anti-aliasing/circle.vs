/* Our Vertex data for the Quad */
attribute vec2 vtx;
/* The coordinates that will be used to for our drawing operations */
varying vec2 uv;

/* Aspect ratio */
uniform float aspect_ratio;
/* Time for the animation */
uniform float time;

void main()
{
	/* Assign the verticies to be used as the distance field for drawing. This
	   will be linearly interpolated before foing to the fragment shader */
	uv = vtx;

	/* Make Circle smaller and correct aspect ratio */
	vec2 vertex = vtx;
	vertex.x *= aspect_ratio;
	vertex *= 0.5;

	/* Make the circle move in a circle */
	/* Optimization wise, this is not good, as it's calculated per vertex. It
	   should be pre-calculated before going to the GPU and only one
	   transformation matrix should be used. But this is a simple example, so we
	   will keep it for simplicity's sake. */
	float radius = 0.1;
	vec2 offset = vec2(radius * cos(time), radius * sin(time));
	vertex += offset;

	gl_Position = vec4(vertex, 0.0, 1.0);
}