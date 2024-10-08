/* Our Vertex data for the Quad */
attribute vec2 vtx;
attribute vec3 col;
/* The coordinates that will be used to for our drawing operations */
varying vec2 uv;
varying vec3 color;
uniform mat4 perspective;

void main()
{
	/* Assign the verticies to be used as the distance field for drawing. This
	   will be linearly interpolated before going to the fragment shader */
	uv = vtx;
	/* Some nice color */
	color = col;

	/* Make Circle smaller and correct aspect ratio */
    vec4 pos = vec4(vtx, 0.0, 1.0);
    gl_Position = perspective * pos;
}