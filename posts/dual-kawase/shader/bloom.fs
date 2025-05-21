precision highp float;
varying vec2 uv;
varying vec2 uvAnimated;

uniform sampler2D texture;
uniform sampler2D textureAdd;

void main() {
	gl_FragColor = texture2D(texture, uvAnimated) + texture2D(textureAdd, uv);
}