precision mediump float;
varying vec2 uv;

uniform vec2 frameSizeRCP;
uniform float blurSize;

uniform sampler2D texture;

void main() {
	vec4 sum = vec4(0.0);
	int samples = 0;

	for (int x = -KERNEL_SIZE; x <= KERNEL_SIZE; ++x) {
		for (int y = -KERNEL_SIZE; y <= KERNEL_SIZE; ++y) {
			vec2 offset = vec2(float(x), float(y)) * blurSize * frameSizeRCP;
			sum += texture2D(texture, uv + offset);
			samples += 1;
		}
	}

	gl_FragColor = sum / float(samples);
}