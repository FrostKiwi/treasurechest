/* Our Vertex data for the Quad */
attribute vec2 vtx;
varying vec2 uv;

/* Position offset for the animation */
uniform vec2 offset;
uniform float kiwiSize;

void main()
{
	/* Make the texture Coordinates read in the fragment shader coordinates */
	uv = vtx * vec2(0.5, -0.5) + 0.5;
	
	/* Animate Quad in a circle */
	gl_Position = vec4(vtx * kiwiSize + offset, 0.0, 1.0);
}