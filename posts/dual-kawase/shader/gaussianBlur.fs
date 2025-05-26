/* Float precision to highp, if supported. Large Kernel Sizes result many color
   contributions and thus require the highest precision to avoid clipping.
   Required in WebGL 1 Shaders and depending on platform may have no effect */
precision highp float;
/* UV coordinates, passed in from the Vertex Shader */
varying vec2 uv;

uniform vec2 frameSizeRCP; /* Resolution Reciprocal */
uniform float samplePosMult; /* Multiply to push blur strength past the kernel size */
uniform float sigma;

uniform float bloomStrength; /* bloom strength */

uniform sampler2D texture;
/* `KERNEL_SIZE` added during compilation */
const int kernel_size = KERNEL_SIZE;

float gaussianWeight(float x, float y, float sigma)
{
	/* (x² + y²) / 2 σ² */
	return exp(-(x * x + y * y) / (2.0 * sigma * sigma));
}

void main() {
	/* Variable to hold our final color for the current pixel */
	vec4 sum = vec4(0.0);
	/* Sum of all weights */

	float weightSum = 0.0;
	/* How big one side of the sampled square is */
	const int size = 2 * kernel_size + 1;
	/* Total number of samples we are going to read */
	const float totalSamples = float(size * size);

	/* Read from the texture y amount of pixels above and below */
	for (int y = -kernel_size; y <= kernel_size; ++y) {
	/* Read from the texture x amount of pixels to the left and the right */
		for (int x = -kernel_size; x <= kernel_size; ++x) {

			/* Calculate the required weight */
			float w = gaussianWeight(float(x), float(y), sigma);
			/* Offset from the current pixel, indicating which pixel to read */
			vec2 offset  = vec2(x, y) * samplePosMult * frameSizeRCP;

			/* Read and sum up the contribution of that pixel, weighted */
			sum += texture2D(texture, uv + offset) * w;
			weightSum += w;
		}
	}

	/* Return the sum, divided by the number of samples (normalization) */
	gl_FragColor = (sum / weightSum) * bloomStrength;
}