attribute vec2 vtx;
varying vec2 uv;
uniform mat2 transform;
void main()
{
	uv = vtx * transform;
	gl_Position = vec4(vtx, 0.0, 1.0);
}