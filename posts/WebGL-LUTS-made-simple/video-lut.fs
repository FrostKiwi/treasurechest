precision mediump float;
varying vec2 tex;
uniform sampler2D video;
uniform sampler2D lut;

void main(void)
{
	/* We'll just take the red channel .r */
    float videoColor = texture2D(video, tex).r;
    vec4 finalColor = texture2D(lut, vec2(videoColor, 0.5));
    gl_FragColor = finalColor;
}
