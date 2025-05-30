/* Our Vertex data for the Quad */
attribute vec2 vtx;
varying vec2 uv;

/* Position offset for the animation */
uniform vec2 offset;
uniform float radius;

void main()
{
	/* Vertex Output */
	vec2 vertex = vtx;
	vertex /= 1.0 + radius;
	vertex += offset;
	uv = vertex * vec2(0.5, -0.5) + 0.5;
	
	/* Animate Quad in a circle, scale to remove black bars */
	gl_Position = vec4(vtx, 0.0, 1.0);
}