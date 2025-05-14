precision mediump float;
varying vec2 uv;

uniform vec2 frameSizeRCP;
uniform int blurSize;

const int size = 1;

uniform sampler2D texture;

void main() {
	vec4 sum = vec4(0.0);
	int samples = 0;

	for (int x = -size; x <= size; ++x) {
		for (int y = -size; y <= size; ++y) {
			vec2 offset = vec2(float(x), float(y)) * frameSizeRCP;
			sum += texture2D(texture, uv + offset);
			samples += 1;
		}
	}

	gl_FragColor = sum / float(samples);
}