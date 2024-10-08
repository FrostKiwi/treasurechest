/* Our Vertex data for the Quad */
attribute vec2 vtx;
varying vec2 uv;

void main()
{
	/* Assign the verticies to be used as the distance field for drawing. This
	   will be linearly interpolated before going to the fragment shader */
	uv = vtx * vec2(0.5, 0.5) + 0.5;
	gl_Position = vec4(vtx, 0.0, 1.0);
}