/* Float precision to highp, if supported. Large iterations result many color
   contributions and thus require the highest precision to avoid clipping.
   Required in WebGL 1 Shaders and depending on platform may have no effect */
precision highp float;
/* UV coordinates, passed in from the Vertex Shader */
varying vec2 uv;

uniform vec2 halfpixel; /* Half pixel size for anti-aliasing */
uniform float offset; /* Offset multiplier for blur strength */
uniform float bloomStrength; /* bloom strength */

uniform sampler2D texture;

void main() {
	/* Dual Kawase downsample: sample center + 4 diagonal corners */
	vec2 o = halfpixel * offset;
	
	/* Sample center with 4x weight */
	vec4 color = texture2D(texture, uv) * 4.0;
	
	/* Sample 4 diagonal corners with 1x weight each */
	color += texture2D(texture, uv + vec2(-o.x, -o.y)); // bottom-left
	color += texture2D(texture, uv + vec2( o.x, -o.y)); // bottom-right  
	color += texture2D(texture, uv + vec2(-o.x,  o.y)); // top-left
	color += texture2D(texture, uv + vec2( o.x,  o.y)); // top-right
	
	/* Apply bloom strength and normalize by total weight (8) */
	gl_FragColor = (color / 8.0) * bloomStrength;
}