attribute vec2 vtx;
varying vec2 tex;
void main()
{
	tex = vtx;
	gl_Position = vec4(vtx, 0.0, 1.0);
}