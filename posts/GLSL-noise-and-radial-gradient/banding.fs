precision mediump float;
varying vec2 tex;

void main(void)
{
	vec3 outsidecolor = vec3(0.15);
	vec3 insidecolor = vec3(0.2);
	vec3 bgcolor = mix(insidecolor, outsidecolor,
					   sqrt(tex.x * tex.x + (tex.y * 0.5 + 1.0) * (tex.y * 0.5 + 1.0)));
	gl_FragColor = vec4(bgcolor, 1.0);
}