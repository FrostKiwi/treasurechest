/* Our Vertex data for the Quad */
attribute vec2 vtx;

void main()
{
	/* Vertex Output */
	gl_Position = vec4(vtx, 0.0, 1.0);
}