/* Float precision to highp, if supported. Large iterations result many color
   contributions and thus require the highest precision to avoid clipping.
   Required in WebGL 1 Shaders and depending on platform may have no effect */
precision highp float;
/* UV coordinates, passed in from the Vertex Shader */
varying vec2 uv;

uniform vec2 frameSizeRCP; /* Resolution Reciprocal */
uniform float offset; /* Offset multiplier for blur strength */
uniform float bloomStrength; /* bloom strength */

uniform sampler2D texture;

void main() {
	/* Dual Kawase upsample: sample 4 edge centers + 4 diagonal corners */
	vec2 halfpixel = frameSizeRCP * 0.5;
	vec2 o = halfpixel * offset;
	
	vec4 color = vec4(0.0);
	
	/* Sample 4 edge centers with 1x weight each */
	color += texture2D(texture, uv + vec2(-o.x * 2.0, 0.0)); // left
	color += texture2D(texture, uv + vec2( o.x * 2.0, 0.0)); // right
	color += texture2D(texture, uv + vec2(0.0, -o.y * 2.0)); // bottom
	color += texture2D(texture, uv + vec2(0.0,  o.y * 2.0)); // top
	
	/* Sample 4 diagonal corners with 2x weight each */
	color += texture2D(texture, uv + vec2(-o.x,  o.y)) * 2.0; // top-left
	color += texture2D(texture, uv + vec2( o.x,  o.y)) * 2.0; // top-right
	color += texture2D(texture, uv + vec2(-o.x, -o.y)) * 2.0; // bottom-left
	color += texture2D(texture, uv + vec2( o.x, -o.y)) * 2.0; // bottom-right
	
	/* Apply bloom strength and normalize by total weight (12) */
	gl_FragColor = (color / 12.0) * bloomStrength;
}