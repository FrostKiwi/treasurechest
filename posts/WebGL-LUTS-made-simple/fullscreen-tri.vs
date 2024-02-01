attribute vec2 vtx;
attribute vec2 UVs;
varying vec2 tex;

void main()
{
    tex = UVs;
	gl_Position = vec4(vtx, 0.0, 1.0);
}