attribute vec2 vtx;
void main()
{
	gl_Position = vec4(vtx, 0.0, 1.0);
}