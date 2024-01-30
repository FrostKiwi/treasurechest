precision mediump float;
varying vec2 tex;
uniform sampler2D video;
uniform sampler2D lut;

void main(void)
{
    float videoColor = texture2D(video, tex).r;
    vec4 lutColor = texture2D(lut, vec2(videoColor, 0.5));
    gl_FragColor = lutColor;
}
