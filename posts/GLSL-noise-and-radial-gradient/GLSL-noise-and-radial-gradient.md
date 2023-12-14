---
title: GLSL banding-free gradients
permalink: "/{{ page.fileSlug }}/"
date: 2023-10-19
last_modified: 2023-10-22
description: Smooth gradients with a clever Noise one-liner by SLEDGEHAMMER Games
publicTags:
  - OpenGL
  - WebGL
  - GameDev
image: threshold.png
---
The point of the Shader is to get banding free gradients, using a single pass and without sampling or texture taps to achieve banding free-ness. I'm using this for backgrounds with smooth gradients when doing graphics programming. It involves the best noise one-liner I have ever seen. That genius one-liner is not from me, but from  [Jorge Jimenez's presentation on how Gradient noise was implemented in Call of Duty Advanced Warfare](http://www.iryoku.com/next-generation-post-processing-in-call-of-duty-advanced-warfare). You can read it on the presentation's slide 123 onwards. It's described as:
> [...] a noise function that we could classify as being half way between dithered and random, and that we called Interleaved Gradient Noise.

| Threshold of gradient (zoomed) | Raw Noise (1:1 pixel size) |
| ----------------- | ------------------- |
|[![image](threshold.png)](threshold.png)|[![image](raw_noise.png)](raw_noise.png)|

Resulting Gradient: (Click image to view in 1:1 pixel scaling to properly judge the banding-freeness)
[![image](radial.png)](radial.png)
Technically the proper way to achieve this is to perform [error diffusion dithering](https://en.wikipedia.org/wiki/Error_diffusion), since that would breakup just the quantized steps of the gradient, without touching the color between the steps. But other than [ordered dithering](https://en.wikipedia.org/wiki/Ordered_dithering), there is no GPU friendly way to do this and [ordered dithering](https://en.wikipedia.org/wiki/Ordered_dithering) doesn't look nice. Adding noise in the context of gradients works just fine though, even though it's not proper error diffusion. Simply applying noise with the strength of one 8-bit grayscale value `(1.0 / 255.0) * gradientNoise(gl_FragCoord.xy)` side-steps a bunch of issues and the code footprint is tiny to boot.

<canvas id="canvas_1" style="width: 100%; height: 200px;"></canvas>
<script src="canvas_1.js"></script>

## Vertex Shader
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
## Fragment Shader
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