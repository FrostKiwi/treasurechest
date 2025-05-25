precision highp float;
varying vec2  uv;

uniform vec2  frameSizeRCP;
uniform float samplePosMult;
uniform float bloomStrength;
uniform sampler2D texture;

void main() {
    vec4 sum = vec4(0.0);
    KERNEL_ACCUMULATE
    gl_FragColor = sum * bloomStrength;
}