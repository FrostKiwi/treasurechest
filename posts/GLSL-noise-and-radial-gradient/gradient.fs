precision mediump float;
varying vec2 tex;

/* Gradient noise from Jorge Jimenez's presentation: */
/* http://www.iryoku.com/next-generation-post-processing-in-call-of-duty-advanced-warfare */
float gradientNoise(in vec2 uv)
{
	return fract(52.9829189 * fract(dot(uv, vec2(0.06711056, 0.00583715))));
}

void main(void)
{
	vec3 outsidecolor = vec3(0.22, 0.23, 0.25);
	vec3 insidecolor = vec3(0.40, 0.41, 0.45);
	vec3 bgcolor = mix(insidecolor, outsidecolor,
					   sqrt(tex.x * tex.x + tex.y * tex.y));
	bgcolor += (1.0 / 255.0) * gradientNoise(gl_FragCoord.xy) - (0.5 / 255.0);

	gl_FragColor = vec4(bgcolor, 1.0);
}