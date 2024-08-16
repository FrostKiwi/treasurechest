attribute vec2 vtx;
varying vec2 texCoord;

void main()
{
	/* From NDC to UV space */
	texCoord = (vtx * 0.5 + 0.5);

	gl_Position = vec4(vtx, 0.0, 1.0);
}