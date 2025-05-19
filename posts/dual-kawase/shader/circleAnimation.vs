/* Our Vertex data for the Quad */
attribute vec2 vtx;
varying vec2 uv;

/* Position offset for the animation */
uniform vec2 offset;
uniform float radius;

void main()
{
	/* Vertex Output */
	uv = vtx.xy * vec2(0.5, -0.5) + 0.5;
	
	/* Animate Quad in a circle, scale to remove black bars */
	vec2 vertex = vtx;
	vertex *= 1.0 + radius;
	vertex += offset;
	gl_Position = vec4(vertex, 0.0, 1.0);
}