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

	/* Here is where the tinting happens. We multiply with (1.0, 0.5, 0.0),
	   which is orange (100% Red, 50% Green, 0% Blue). White becomes Orange,
	   since muplitplying 1 with X gives you X. Black stays black, since 0
	   times X is 0. Try out different things! */
	vec3 finalColor = videoColor * vec3(1.0, 0.5, 0.0);

	/* Our final color. In WebGL 1.0 this output is always RGBA and always
	   named "gl_FragColor" */
	gl_FragColor = vec4(finalColor, 1.0);
}