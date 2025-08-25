/* Float precision to highp, if supported. Large Kernel Sizes result many color
   contributions and thus require the highest precision to avoid clipping.
   Required in WebGL 1 Shaders and depending on platform may have no effect */
precision highp float;
/* UV coordinates, passed in from the Vertex Shader */
varying vec2 uv;

uniform vec2 frameSizeRCP; /* Resolution Reciprocal */
uniform float samplePosMult; /* Multiply to push blur strength past the kernel size */
uniform float sigma;
uniform vec2 direction; /* Direction vector: (1,0) for horizontal, (0,1) for vertical */

uniform float bloomStrength; /* bloom strength */

uniform sampler2D texture;
/* `KERNEL_SIZE` added during compilation */
const int kernel_size = KERNEL_SIZE;

float gaussianWeight(float x, float sigma)
{
	/* x² / 2 σ² */
	return exp(-(x * x) / (2.0 * sigma * sigma));
}

void main() {
	/* Variable to hold our final color for the current pixel */
	vec4 sum = vec4(0.0);
	/* Sum of all weights */
	float weightSum = 0.0;
	
	/* How big one side of the sampled line is */
	const int size = 2 * kernel_size + 1;

	/* Sample along the direction vector (horizontal or vertical) */
	for (int i = -kernel_size; i <= kernel_size; ++i) {
		/* Calculate the required weight for this 1D sample */
		float w = gaussianWeight(float(i), sigma);
		
		/* Offset from the current pixel along the specified direction */
		vec2 offset = vec2(i) * direction * samplePosMult * frameSizeRCP;

		/* Read and sum up the contribution of that pixel, weighted */
		sum += texture2D(texture, uv + offset) * w;
		weightSum += w;
	}

	/* Return the sum, divided by the total weight (normalization) */
	gl_FragColor = (sum / weightSum) * bloomStrength;
}