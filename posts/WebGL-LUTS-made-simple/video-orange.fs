precision mediump float;
varying vec2 tex;
uniform sampler2D video;

void main(void)
{
	vec4 videoColor = texture2D(video, tex);
	vec3 finaruKaraa = vec3(videoColor.rgb) * vec3(1.0, 0.5, 0.0);
	gl_FragColor = vec4(finaruKaraa, 1.0);
}