precision mediump float;
varying vec2 uv;

void main(void)
{
	if (length(uv) < 1.0)
		gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
	else
		discard;
}