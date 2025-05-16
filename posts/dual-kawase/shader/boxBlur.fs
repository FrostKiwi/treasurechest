/* Kernel Size added by during compilation */
precision highp float;
varying vec2 uv;

uniform vec2 frameSizeRCP; /* Resolution Reciprocal */
uniform float samplePosMult; /* Multiplier, to push blur strength past the kernel size, if wished */
uniform float sigma; /* Sigma in Pixels */

uniform sampler2D texture;

void main() {
	vec4 sum = vec4(0.0);
	int samples = 0;

	for (int x = -KERNEL_SIZE; x <= KERNEL_SIZE; ++x) {
		for (int y = -KERNEL_SIZE; y <= KERNEL_SIZE; ++y) {
			vec2 offset = vec2(float(x), float(y)) * samplePosMult * frameSizeRCP;
			sum += texture2D(texture, uv + offset);
			samples++;
		}
	}

	gl_FragColor = sum / float(samples);
}