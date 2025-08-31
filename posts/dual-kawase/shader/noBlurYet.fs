/* This is the blur "fragment shader", a program that runs on the GPU.
   In *this* article, the blur fragment shader runs once per output pixel of the
   canvas */

/* Required in WebGL 1 Shaders and depending on platform may have no effect.
   For Later: Strong blurs may have a lot of minute color contributions, so we
   set it "highp" here, the maximum. */
precision highp float;

/* UV coordinates, passed in from the Vertex Shader "simpleQuad.vs".
   This tells our current output pixel where to read our texture from. */
varying vec2 uv;

/* lightBrightness input. The reason light brightness is in the fragment shader
   of the blur and not a value applied in a step before our blur shader before,
   is due to color precision limits. */
uniform float lightBrightness;

/* Out texture input */
uniform sampler2D texture;

/* The "main" function, where which is executed by our GPU */
void main() {
	/* gl_FragColor is the output of our shader. texture2D is the texture read,
	   performed with the current 'uv' coordinate. Then multiplied by
	   our lightBrightness value (a multiplier with eg. 1.0 at 100%, 0.5 at 50%)
	   In "scene" mode, this value is locked to 1.0 so it has no effect */
	gl_FragColor = texture2D(texture, uv) * lightBrightness;
}