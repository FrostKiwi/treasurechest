attribute vec2 vtx;
varying vec2 uv;
void main()
{
	uv = vtx;
	gl_Position = vec4(vtx, 0.0, 1.0);
}