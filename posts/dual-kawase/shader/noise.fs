precision highp float;

/* Gradient noise from Jorge Jimenez's presentation: */
/* http://www.iryoku.com/next-generation-post-processing-in-call-of-duty-advanced-warfare */
float gradientNoise(in vec2 uv)
{
	return fract(52.9829189 * fract(dot(uv, vec2(0.06711056, 0.00583715))));
}

void main(void)
{
	gl_FragColor = vec4(vec3(0.0) + gradientNoise(gl_FragCoord.xy), 1.0);
}