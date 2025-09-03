/* Float precision to highp, if supported. Large iterations result many color
   contributions and thus require the highest precision to avoid clipping.
   Required in WebGL 1 Shaders and depending on platform may have no effect */
precision highp float;
/* UV coordinates, passed in from the Vertex Shader */
varying vec2 uv;

uniform vec2 frameSizeRCP; /* Resolution Reciprocal */
uniform float samplePosMult; /* Multiply to push blur strength past the pixel offset */
uniform float pixelOffset; /* Pixel offset for this Kawase iteration */
uniform float bloomStrength; /* bloom strength */

uniform sampler2D texture;

void main() {
	/* Kawase blur samples 4 corners in a diamond pattern */
	vec2 o = vec2(pixelOffset + 0.5) * samplePosMult * frameSizeRCP;
	
	/* Sample the 4 diagonal corners with equal weight */
	vec4 color = vec4(0.0);
	color += texture2D(texture, uv + vec2( o.x,  o.y)); /* top-right */
	color += texture2D(texture, uv + vec2(-o.x,  o.y)); /* top-left   */
	color += texture2D(texture, uv + vec2(-o.x, -o.y)); /* bottom-left */
	color += texture2D(texture, uv + vec2( o.x, -o.y)); /* bottom-right */
	color /= 4.0;
	
	/* Apply bloom strength and output */
	gl_FragColor = color * bloomStrength;
}