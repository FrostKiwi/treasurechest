precision mediump float;

varying vec2 tex;
uniform sampler2D video;
uniform sampler2D lut;

/* 3D Texture Lookup from
   https://github.com/WebGLSamples/WebGLSamples.github.io/blob/master/color-adjust/color-adjust.html */
vec4 sampleAs3DTexture(sampler2D tex, vec3 texCoord, float size)
{
	float sliceSize = 1.0 / size;			 // space of 1 slice
	float slicePixelSize = sliceSize / size; // space of 1 pixel
	float width = size - 1.0;
	float sliceInnerSize = slicePixelSize * width; // space of size pixels
	float zSlice0 = floor(texCoord.z * width);
	float zSlice1 = min(zSlice0 + 1.0, width);
	float xOffset = slicePixelSize * 0.5 + texCoord.x * sliceInnerSize;
	float yRange = (texCoord.y * width + 0.5) / size;
	float s0 = xOffset + (zSlice0 * sliceSize);
	float s1 = xOffset + (zSlice1 * sliceSize);
	vec4 slice0Color = texture2D(tex, vec2(s0, yRange));
	vec4 slice1Color = texture2D(tex, vec2(s1, yRange));
	float zOffset = mod(texCoord.z * width, 1.0);
	return mix(slice0Color, slice1Color, zOffset);
}

void main(void)
{
	vec3 videoColor = texture2D(video, tex).rgb;
	vec4 correctedColor = sampleAs3DTexture(lut, videoColor, 32.0);

	gl_FragColor = correctedColor;
}