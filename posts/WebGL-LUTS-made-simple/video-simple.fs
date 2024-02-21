/* In WebGL 1.0, having no #version implies #version 100 */
/* In WebGL we have to set the float precision. On some devices it doesn't
   change anything. For color manipulation, having mediump is ample. For
   precision trigonometry, bumping to highp is often needed. */
precision mediump float;
/* Our vexture coordinates */
varying vec2 tex;
/* Our video texture */
uniform sampler2D video;

void main(void)
{
	/* The texture read, also called "Texture Tap" with the coordinate for
	   the current pixel. */
	vec3 videoColor = texture2D(video, tex).rgb;
	/* Our final color. In WebGL 1.0 this output is always RGBA and always
	   named "gl_FragColor" */
	gl_FragColor = vec4(videoColor, 1.0);
}