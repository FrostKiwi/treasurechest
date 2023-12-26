---
title: How to (and how not to) fix color banding
permalink: "/{{ page.fileSlug }}/"
date: 2023-10-19
last_modified: 2023-12-25
description: Discovering color banding solutions & Smooth gradients with a clever Noise one-liner by SLEDGEHAMMER Games
publicTags:
  - OpenGL
  - WebGL
  - GameDev
image: threshold.png
---
I **love** to use soft gradients as backdrops when doing graphic programming, a love started by a [Corona Renderer](https://corona-renderer.com/) product shot [sample scene](https://forum.corona-renderer.com/index.php?topic=11345) shared by user [romullus](https://forum.corona-renderer.com/index.php?action=profile;u=9510) and its use of radial gradients to highlight the product. But they are quite horrible from a design standpoint, since they produce awful [color banding](https://en.wikipedia.org/wiki/Colour_banding), also referred to as [posterization](https://en.wikipedia.org/wiki/Posterization). Depending on things like screen type, gradient colors, viewing environment, etc., the effect can be sometimes not present at all, yet sometimes painfully obvious. Let's take a look at what I mean. The following is a WebGL Canvas drawing a black & white, dark and soft half-circle gradient.

<script src="fullscreen-tri.js"></script>
<script  id="vertex_2" type="x-shader/x-vertex">{% rawFile "posts/GLSL-noise-and-radial-gradient/fullscreen-tri.vs" %}</script>
<script  id="fragment_2" type="x-shader/x-fragment">{% rawFile "posts/GLSL-noise-and-radial-gradient/banding.fs" %}</script>

<canvas height="200px" id="canvas_2"></canvas>

<script>setupTri("canvas_2", "vertex_2", "fragment_2");</script>
<blockquote>
<details><summary><a href="screenshot_gradient.png">Screenshot</a>, in case WebGL doesn't work</summary>

![](screenshot_gradient.png)

</details>
<details><summary>WebGL Vertex Shader <a href="fullscreen-tri.vs">fullscreen-tri.vs</a></summary>

```glsl
{% rawFile "posts/GLSL-noise-and-radial-gradient/fullscreen-tri.vs" %}
```

</details>
<details>	
<summary>WebGL Fragment Shader <a href="banding.fs">banding.fs</a></summary>

```glsl
{% rawFile "posts/GLSL-noise-and-radial-gradient/banding.fs" %}
```

</details>
<details>	
<summary>WebGL Javascript <a href="fullscreen-tri.js">fullscreen-tri.js</a></summary>

```javascript
{% rawFile "posts/GLSL-noise-and-radial-gradient/fullscreen-tri.js" %}
```

</details>
</blockquote>

This produces a 24-bit (8-bits per channel) image with clearly visible banding steps. If you don't see the banding due to being a bright environment or having the screen brightness set to very low, reference the pictures below. Here is what it should look like on an 8-bit panel, specifically the [HP Z24n G2](https://jp.ext.hp.com/monitors/business/z_z24n_g2/) monitor that is connected to my laptop. It should also look the same on a high-end 10-bit or 12-bit panel, since WebGL doesn't allow high bit-depth output. The image is brightness and contrast boosted, to make the steps obvious.

<figure>
	<img src="Banding.jpg" alt="Photo: WebGL color banding, on an 8-bit panel, contrast and brightness boosted" />
  <figcaption>Photo: WebGL color banding, on a 8-bit panel, contrast and brightness boosted</figcaption>
</figure>

Many Laptop screens are in-fact 6-bit panels performing dithering to fake an 8-bit output. This includes even high-priced workstations replacements, like the [HP Zbook Fury 15 G7](https://support.hp.com/us-en/document/c06909298#AbT5) and its [6-bit LCD panel](https://www.panelook.com/N156HCA-GA3__15.6__overview_33518.html), that I sit in front of right now. What you can see are *some* banding steps being a clean uniform color and *some* of them being dithered via the panel's integrated look-up table to achieve a perceived 8-bit output via [ordered dithering](https://en.wikipedia.org/wiki/Ordered_dithering). Though note, how the dithering does **not** result in the banding steps being broken up, it just dithers the color step itself. Capturing this via a photo is a bit difficult, since there is also the pattern of individual pixels messing with the capture and introducing [moiré ](https://en.wikipedia.org/wiki/Moir%C3%A9_pattern) and interference patterns. The dither pattern is distinctly visible when looking closely with the naked eye though.

<figure>
	<img src="Dithering.jpg" alt="Photo: Above WebGL color banding sample, on a 6-bit panel, contrast and brightness boosted" />
  <figcaption>Photo: WebGL color banding, on a 6-bit panel, contrast and brightness boosted.
	<br>Panel's built-in dithering visualized.</figcaption>
</figure>

## Magic GLSL One-liner

Let's fix this. The main point of this article is to share how I get banding free gradients in one GLSL fragment shader, rendering in a single pass and without sampling or texture taps to achieve banding free-ness. It involves the best noise one-liner I have ever seen. That genius one-liner is not from me, but from [Jorge Jimenez's presentation on how Gradient noise was implemented in Call of Duty Advanced Warfare](http://www.iryoku.com/next-generation-post-processing-in-call-of-duty-advanced-warfare). You can read it on the presentation's slide 123 onwards. It's described as:

> [...] a noise function that we could classify as being half way between dithered and random, and that we called **_Interleaved Gradient Noise_**.

Here is what the raw noise looks like. The following WebGL Canvas is set to render at the same pixel density as your screen. (Though some Screen DPI and Browser zoom levels will result in it being one pixel off and there being a tiny bit of interpolation)

<canvas id="canvas_noise"></canvas>
<script id="vertex_noise" type="x-shader/x-vertex">{% rawFile "posts/GLSL-noise-and-radial-gradient/noise.vs" %}</script>
<script id="fragment_noise" type="x-shader/x-fragment">{% rawFile "posts/GLSL-noise-and-radial-gradient/noise.fs" %}</script>
<script>setupTri("canvas_noise", "vertex_noise", "fragment_noise");</script>
<blockquote>
<details><summary><a href="raw_noise.png">Screenshot</a>, in case WebGL doesn't work</summary>

![image](raw_noise.png)

</details>
<details><summary>WebGL Vertex Shader <a href="noise.vs">noise.vs</a></summary>

```glsl
{% rawFile "posts/GLSL-noise-and-radial-gradient/noise.vs" %}
```

</details>
<details>	
<summary>WebGL Fragment Shader <a href="noise.fs">noise.fs</a></summary>

```glsl
{% rawFile "posts/GLSL-noise-and-radial-gradient/noise.fs" %}
```

</details>
<details>	
<summary>WebGL Javascript <a href="fullscreen-tri.js">fullscreen-tri.js</a></summary>

```javascript
{% rawFile "posts/GLSL-noise-and-radial-gradient/fullscreen-tri.js" %}
```

</details>
</blockquote>

| Threshold of gradient (zoomed)           | Raw Noise (1:1 pixel size)               |
| ---------------------------------------- | ---------------------------------------- |
| [![image](threshold.png)](threshold.png) | [![image](raw_noise.png)](raw_noise.png) |

Resulting Gradient: (Click image to view in 1:1 pixel scaling to properly judge the banding-freeness)
[![image](radial.png)](radial.png)
Technically the proper way to achieve banding free-ness is to perform [error diffusion dithering](https://en.wikipedia.org/wiki/Error_diffusion), since that would breakup just the quantized steps of the gradient, without touching the color between the steps. But other than [ordered dithering](https://en.wikipedia.org/wiki/Ordered_dithering), there is no GPU friendly way to do this and [ordered dithering](https://en.wikipedia.org/wiki/Ordered_dithering) doesn't look nice. When talking about gradients, adding noise works just fine though, even though it's not proper error diffusion. Simply applying noise with the strength of one 8-bit grayscale value `(1.0 / 255.0) * gradientNoise(gl_FragCoord.xy)` side-steps a bunch of issues and the code footprint is tiny to boot. Additionally it subtracts the average added brightness of `(0.5 / 255.0)` to keep the brightness the same since we are introducing the noise via addition, though the difference is barely noticeable.

<canvas height="200px" id="canvas_banding_free"></canvas>
<script  id="vertex_banding_free" type="x-shader/x-vertex">{% rawFile "posts/GLSL-noise-and-radial-gradient/fullscreen-tri.vs" %}</script>
<script  id="fragment_banding_free" type="x-shader/x-fragment">{% rawFile "posts/GLSL-noise-and-radial-gradient/gradient.fs" %}</script>
<script>setupTri("canvas_banding_free", "vertex_banding_free", "fragment_banding_free");</script>
<blockquote>
<details><summary><a href="screenshot_gradient.png">Screenshot</a>, in case WebGL doesn't work</summary>

![](screenshot_gradient.png)

</details>
<details><summary>WebGL Vertex Shader <a href="fullscreen-tri.vs">fullscreen-tri.vs</a></summary>

```glsl
{% rawFile "posts/GLSL-noise-and-radial-gradient/fullscreen-tri.vs" %}
```

</details>
<details>	
<summary>WebGL Fragment Shader <a href="gradient.fs">gradient.fs</a></summary>

```glsl
{% rawFile "posts/GLSL-noise-and-radial-gradient/gradient.fs" %}
```

</details>
<details>	
<summary>WebGL Javascript <a href="fullscreen-tri.js">fullscreen-tri.js</a></summary>

```javascript
{% rawFile "posts/GLSL-noise-and-radial-gradient/fullscreen-tri.js" %}
```

</details>
</blockquote>

![](6-bit_banding_8-bit_noise.jpg)
![](6-bit_banding_6-bit_noise.jpg)
## Bufferless Version

Here is what the shaders look like if you use OpenGL 3.3, OpenGL 2.1 with the [`GL_EXT_gpu_shader4`](https://registry.khronos.org/OpenGL/extensions/EXT/EXT_gpu_shader4.txt) extension (`#version` would have to change) or WebGL2 and want to skip the Vertex Buffer setup by putting the fullscreen triangle into the vertex shader. If you get an error around `gl_VertexID` missing, you don't have [`GL_EXT_gpu_shader4`](https://registry.khronos.org/OpenGL/extensions/EXT/EXT_gpu_shader4.txt) enabled.

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

## What are the big-boys doing?
asdf
### Alien Isolation SweetFX
Deband.fx Shader
Deep Color does not work with Anti-Aliasing
deep color sends a higher signal Monitor, switches automatically!

<details>	
<summary><a href="https://reshade.me">ReShade</a>'s <a href="https://github.com/crosire/reshade-shaders/blob/slim/Shaders/Deband.fx">Deband.fx</a></summary>

```hlsl
{% rawFile "posts/GLSL-noise-and-radial-gradient/Deband.fx" %}
```

</details>

Adobe After Effects Gradient Error Diffusion
Perforamnce crap
### After Effects
### Windows Terminal
### KDE Blur