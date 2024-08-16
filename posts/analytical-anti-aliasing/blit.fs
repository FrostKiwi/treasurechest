precision mediump float;

uniform sampler2D u_texture;
varying vec2 texCoord;

void main() {
	gl_FragColor = texture2D(u_texture, texCoord);
}