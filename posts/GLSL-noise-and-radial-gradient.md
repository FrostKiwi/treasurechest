---
title: GLSL Radial background
permalink: "/{{ page.fileSlug }}/"
---
I'm using this for backgrounds when drawing smooth gradients when doing graphics programming. The point of the Shader is to get banding free gradients, using a single pass and without sampling or texture taps to achive banding free-ness. It involves the best noise-oneliner I have ever seen. That genius one-liner is not from me, but from  [Jorge Jimenez's presentation on how Gradient noise was implemented in Call of Duty Advanced Warfare](http://www.iryoku.com/next-generation-post-processing-in-call-of-duty-advanced-warfare). You can read it on the presentation's slide 123 onwards. It's described as:
> [...] a noise function that we could classify as being half way between dithered and random, and that we called Interleaved Gradient Noise.

Thresholding the gradient image below, here is dither pattern, that is created:

[![image](https://github.com/FrostKiwi/treasurechest/assets/60887273/3c9b3bb9-d1d7-4906-9b53-02f4894b26c4)](https://github.com/FrostKiwi/treasurechest/assets/60887273/3c9b3bb9-d1d7-4906-9b53-02f4894b26c4)

Resulting Gradient: (View in 1:1 pixel scaling to properly judge the banding-freeness)
[![image](https://github.com/FrostKiwi/treasurechest/assets/60887273/70e345f0-e57f-49df-a07e-bcd6cfde9189)](https://github.com/FrostKiwi/treasurechest/assets/60887273/70e345f0-e57f-49df-a07e-bcd6cfde9189)
### Vertex Shader
Here is the Bufferless variant, but can be rewritten to work with even the most basic OpenGL or WebGL standard.
```glsl
#version 330
out vec2 tex;

const vec2 pos[3] = vec2[] (
    vec2(-1.0, -1.0),
    vec2( 3.0, -1.0),
    vec2(-1.0,  3.0)
);

void main()
{
    tex = pos[gl_VertexID];
    gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0);
}
```
### Fragment Shader
```glsl
#version 330
in vec2 tex;
out vec4 Out_Color;

/* Gradient noise from Jorge Jimenez's presentation: */
/* http://www.iryoku.com/next-generation-post-processing-in-call-of-duty-advanced-warfare */
float gradientNoise(in vec2 uv)
{
    return fract(52.9829189 * fract(dot(uv, vec2(0.06711056, 0.00583715))));
}

vec3 outsidecolor = vec3(0.22, 0.23, 0.25);
vec3 insidecolor = vec3(0.40, 0.41, 0.45);

void main()
{
    vec3 bgcolor = mix(insidecolor, outsidecolor,
                       sqrt(tex.x * tex.x + tex.y * tex.y));

    /* Add gradient noise to reduce banding. */
    bgcolor += (1.0 / 255.0) * gradientNoise(gl_FragCoord.xy) - (0.5 / 255.0);
    Out_Color = vec4(bgcolor, 1.0);
}
```