attribute vec2 vtx;
varying vec2 uv;

uniform vec4 transform;
uniform vec2 offset;

void main()
{
	uv = vtx;
	
	vec2 vertex = vtx;
	vertex += offset / (vec2(transform.x, transform.y) * vec2(transform.x, transform.y));
	vertex.y += transform.w * 14.7;
	vertex.x += transform.z * 0.5;
	vertex *= vec2(transform.x, transform.y) * vec2(transform.x, transform.y);
	gl_Position = vec4(vertex, 0.0, 1.0);
}