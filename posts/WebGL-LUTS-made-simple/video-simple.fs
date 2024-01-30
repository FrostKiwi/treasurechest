precision mediump float;
varying vec2 tex;
uniform sampler2D video;

void main(void)
{
	vec4 videoColor = texture2D(video, tex);
	gl_FragColor = vec4(videoColor);
}