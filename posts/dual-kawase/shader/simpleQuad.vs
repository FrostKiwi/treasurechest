/* Our Vertex data for the Quad */
attribute vec2 vtx;
varying vec2 uv;

void main()
{
	/* Vertex Output */
	uv = vtx * 0.5 + 0.5;
	gl_Position = vec4(vtx, 0.0, 1.0);
}