/* Float precision to highp, if supported. Large Kernel Sizes result many color
   contributions and thus require the highest precision to avoid clipping.
   Required in WebGL 1 Shaders and depending on platform may have no effect */
precision highp float;
/* UV coordinates, passed in from the Vertex Shader */
varying vec2 uv;

uniform float bloomStrength; /* bloom strength */

uniform sampler2D texture;

void main() {
	gl_FragColor = texture2D(texture, uv) * bloomStrength;
}