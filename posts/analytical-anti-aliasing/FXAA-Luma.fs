precision highp float;
varying vec2 uv;

uniform sampler2D texture;

/* Calculate Luma as explained in the FXAA Shader... */

/* ------------------------------------------------------------------------------
                    INTEGRATION - RGBL AND COLORSPACE
------------------------------------------------------------------------------
FXAA3 requires RGBL as input unless the following is set, 

  #define FXAA_GREEN_AS_LUMA 1

In which case the engine uses green in place of luma,
and requires RGB input is in a non-linear colorspace.

RGB should be LDR (low dynamic range).
Specifically do FXAA after tonemapping.

RGB data as returned by a texture fetch can be non-linear,
or linear when FXAA_GREEN_AS_LUMA is not set.
Note an "sRGB format" texture counts as linear,
because the result of a texture fetch is linear data.
Regular "RGBA8" textures in the sRGB colorspace are non-linear.

If FXAA_GREEN_AS_LUMA is not set,
luma must be stored in the alpha channel prior to running FXAA.
This luma should be in a perceptual space (could be gamma 2.0).
Example pass before FXAA where output is gamma 2.0 encoded,

  color.rgb = ToneMap(color.rgb); // linear color output
  color.rgb = sqrt(color.rgb);    // gamma 2.0 color output
  return color;

To use FXAA,

  color.rgb = ToneMap(color.rgb);  // linear color output
  color.rgb = sqrt(color.rgb);     // gamma 2.0 color output
  color.a = dot(color.rgb, FxaaFloat3(0.299, 0.587, 0.114)); // compute luma
  return color;

Another example where output is linear encoded,
say for instance writing to an sRGB formated render target,
where the render target does the conversion back to sRGB after blending,

  color.rgb = ToneMap(color.rgb); // linear color output
  return color;

To use FXAA,

  color.rgb = ToneMap(color.rgb); // linear color output
  color.a = sqrt(dot(color.rgb, FxaaFloat3(0.299, 0.587, 0.114))); // compute luma
  return color;

Getting luma correct is required for the algorithm to work correctly. */

void main(void)
{
	vec3 color = texture2D(texture, uv).rgb;
	float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
	gl_FragColor = vec4(color, luma);
}