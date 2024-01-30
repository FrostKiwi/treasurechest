attribute vec2 vtx;
varying vec2 tex;
void main()
{
	tex = vec2((vtx.x + 1.0) / 2.0, 1.0 - (vtx.y + 1.0) / 2.0);
	gl_Position = vec4(vtx, 0.0, 1.0);
}