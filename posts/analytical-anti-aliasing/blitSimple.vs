attribute vec2 vtx;
varying vec2 texCoord;

uniform vec4 transform;
uniform vec2 offset;

void main()
{
	vec2 uv = vtx;
	uv += offset / (vec2(transform.x, transform.y) * vec2(transform.x, transform.y));
	uv *= vec2(transform.x, transform.y) * vec2(transform.x, transform.y);

	/* From NDC to UV space */
	texCoord = (uv * 0.5 + 0.5);

	vec2 vertex =
		vtx * vec2(transform.x, transform.y) + vec2(transform.z, transform.w);
	gl_Position = vec4(vertex, 0.0, 1.0);
}