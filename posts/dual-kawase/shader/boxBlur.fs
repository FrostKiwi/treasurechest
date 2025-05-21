/* Kernel Size added during compilation */

/* Float precision to highp, if supported. Large Kernel Sizes result many color
   contributions and thus require the highest precision to avoid clipping.
   Required in WebGL 1 Shaders and depending on platform may have no effect */
precision highp float;
/* UV coordinates, passed in from the Vertex Shader */
varying vec2 uv;

uniform vec2 frameSizeRCP; /* Resolution Reciprocal */
uniform float samplePosMult; /* Multiply to push blur strength past the kernel size */

uniform float bloomStrength; /* bloom strength */

uniform sampler2D texture;

void main() {
	/* Variable to hold our final color for the current pixel */
	vec4 sum = vec4(0.0);
	/* How big one side of the sampled square is */
	const int size = 2 * KERNEL_SIZE + 1;
	/* Total number of samples we are going to read */
	const float totalSamples = float(size * size);

	/* Read from the texture y amount of pixels above and below */
	for (int y = -KERNEL_SIZE; y <= KERNEL_SIZE; ++y) {
	/* Read from the texture x amount of pixels to the left and the right */
		for (int x = -KERNEL_SIZE; x <= KERNEL_SIZE; ++x) {
			/* Offset from the current pixel, indicating which pixel to read */
			vec2 offset = vec2(x, y) * samplePosMult * frameSizeRCP;
			/* Read and sum up the contribution of that pixel */
			sum += texture2D(texture, uv + offset);
		}
	}

	/* Return the sum, divided by the number of samples (normalization) */
	gl_FragColor = (sum / totalSamples) * bloomStrength;
}