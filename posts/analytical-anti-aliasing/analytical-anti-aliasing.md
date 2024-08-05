---
wip: true
title: Analytical Anti-Aliasing
permalink: "/{{ page.fileSlug }}/"
date: 2999-12-09
last_modified:
description: How to fix jaggies the analytical way with some juicy secrets
publicTags:
  - Graphics
  - WebGL
  - GameDev
image: thumbnail.png
---
Today's journey is [Anti-Aliasing](https://en.wikipedia.org/wiki/Spatial_anti-aliasing) and the destination is **Analytical Anti-Aliasing**. Getting rid of rasterization [jaggies](https://en.wikipedia.org/wiki/Jaggies) is an art-form with decades upon decades of maths, creative techniques and non-stop innovation. With so many years of research and development, there are many flavors.

From the [simple but resource intensive **SSAA**](https://en.wikipedia.org/wiki/Supersampling), over [theory dense **SMAA**](https://www.iryoku.com/smaa/), to using [machine learning with **DLAA**](https://en.wikipedia.org/wiki/Deep_learning_anti-aliasing). We'll take a look at how they work, before introducing a new way to look a the problem - the ✨***analytical***🌟 way. The perfect Anti-Aliasing exists and is simpler than you think. Let's find out when and if you should use it.

## The test case
To explain the Anti-Aliasing algorithms, we will implement them along the way. That's what the WebGL Boxes are for. 
Let's setup our test scene. 

Along the article are WebGL boxes, which implement all the anti-aliasing techniques we will be talking about.
- [Supersampling anti-aliasing [**SSAA**]](https://en.wikipedia.org/wiki/Supersampling)
- [Multisampling anti-aliasing [**MSAA**]](https://en.wikipedia.org/wiki/Multisample_anti-aliasing)


What this article talks about is a set of techniques with the same goal, but vastly different approach - using the make-up of the geometry itself to draw anti-aliased shapes in one single sample.

<script src="circle.js"></script>
<script id="vertexPass" type="x-shader/x-vertex">{% rawFile "posts/analytical-anti-aliasing/post.vs" %}</script>
<script id="fragmentPass" type="x-shader/x-fragment">{% rawFile "posts/analytical-anti-aliasing/post.fs" %}</script>

<script id="vertexRedBox" type="x-shader/x-vertex">{% rawFile "posts/analytical-anti-aliasing/red.vs" %}</script>
<script id="fragmentRedBox" type="x-shader/x-vertex">{% rawFile "posts/analytical-anti-aliasing/red.fs" %}</script>

<script id="vertex_0" type="x-shader/x-vertex">{% rawFile "posts/analytical-anti-aliasing/circle.vs" %}</script>
<script id="fragment_0" type="x-shader/x-fragment">{% rawFile "posts/analytical-anti-aliasing/circle.fs" %}</script>
<canvas width="100%" height="480px" style="max-height: 480px" id="canvas_0"></canvas>
<script>setupTri("canvas_0", "vertex_0", "fragment_0", "vertexPass", "fragmentPass", "vertexRedBox", "fragmentRedBox");</script>

<blockquote>
<details><summary><a href="screenshot_passthrough.jpg">Screenshot</a>, in case WebGL doesn't work</summary>

<!-- ![image](screenshot_passthrough.jpg) -->

</details>
<details><summary>WebGL Vertex Shader <a href="circle.vs">circle.vs</a></summary>

```glsl
{% rawFile "posts/analytical-anti-aliasing/circle.vs" %}
```

</details>
<details>	
<summary>WebGL Fragment Shader <a href="circle.fs">circle.fs</a></summary>

```glsl
{% rawFile "posts/analytical-anti-aliasing/circle.fs" %}
```

</details>
<details>	
<summary>WebGL Javascript <a href="circle.js">circle.js</a></summary>

```javascript
{% rawFile "posts/analytical-anti-aliasing/circle.js" %}
```

</details>
</blockquote>
Let's start out simple. Using GLSL Shaders, we draw the circle in the most simple and naive way possible: 4 vertices making up a Quad are sent to the vertex shader <a href="circle.vs">circle.vs</a>.   : `if (length(uv) < 1.0)` we draw our color and if it is outside the circle, we reject the fragment. What we are doing is known as Alpha testing.

## What makes it analytical?

![image](compare.png)

## Signed distance field rendering
[Signed distance functions](https://en.wikipedia.org/wiki/Signed_distance_function#Applications)
### [Valve Software](https://www.valvesoftware.com/)'s implementation
Valve introduced extensive use of signed distance field rendering to the [Source engine](https://en.wikipedia.org/wiki/Source_(game_engine)) during the development of the [Orange Box](https://en.wikipedia.org/wiki/The_Orange_Box). Most prominently in [Team Fortress 2](https://www.teamfortress.com/), where it was used to create smooth yet sharp UI elements on the HUD and decals in the game world. It received even its own [Developer Commentary](https://wiki.teamfortress.com/wiki/Developer_commentary) entry.

<audio controls><source src="tf2-dev-commentary.mp3" type="audio/mpeg"></audio>
> **Alden Kroll:** Two-dimensional HUD elements present a particular art problem, because they have to look good and sharp no matter what resolution the user is running their game at. Given today's availability of high resolution wide-screen displays, this can require a lot of texture memory and a lot of work anticipating different display resolutions. The problem for Team Fortress 2 was even more daunting because of our desire to include a lot of smooth curved elements in our HUD. We developed a new shader system for drawing 'line art' images. The system allows us to create images at a fixed resolution that produced smooth silhouettes even when scaled up to a very high resolution. This shader system also handles outlining and drop-shadows, and can be applied in the 3D space to world elements such as signs.

They also released [a paper](https://steamcdn-a.akamaihd.net/apps/valve/2007/SIGGRAPH2007_AlphaTestedMagnification.pdf) describing the specific implementation.

Added as a mere footnote to the paper, was described a way to do perform this 
### The future of all things font?
Picking up on that foot note and bringing the technique to its logical conclusion was the most thorough and well composed Master Thesis I ever read: "[Shape Decomposition for Multi-channel
Distance Fields](https://github.com/Chlumsky/msdfgen/files/3050967/thesis.pdf)" by [Viktor Chlumský](https://github.com/Chlumsky).


This technique is built with either the use of GLSL's [`fwidth()`](https://docs.gl/sl4/fwidth) or a combination of [`length()`](https://docs.gl/sl4/length) + [`dFdx()`](https://docs.gl/sl4/dFdx) + [`dFdy()`](https://docs.gl/sl4/dFdy).
This has been documented many times over, by many people in different forms. I use it so often, that I wanna write it down myself.

Mention connection to Freya the stray and https://acegikmo.com/shapes/

### Don't use [`smoothstep()`](https://en.wikipedia.org/wiki/Smoothstep)
Its use is [often associated](http://www.numb3r23.net/2015/08/17/using-fwidth-for-distance-based-anti-aliasing/) with implementing anti-aliasing in `GLSL`, but its use doesn't make sense. It performs a hermite interpolation, but the we are dealing with a function applied across 2 pixels or just inside 1. There is no curve to be witnessed here. Though the slight performance difference doesn't particularly matter on modern graphics cards so wasting cycles on performing the hermite interpolation doesn't make sense to me.



### We gotta talk 
See my Stackoverflow question '[How to ensure screen space derivatives are present on triangle edges?](https://stackoverflow.com/questions/73903568/how-to-ensure-screen-space-derivatives-are-present-on-triangle-edges)' for more details around the case of using this under 3D perspectives, not just 2D.
```glsl
	float dist = length(vtx_fs) - 0.9;
	float smoothedAlpha = dist / length(vec2(dFdx(dist), dFdy(dist)));
	/* float smoothedAlpha = dist / fwidth(dist); */
	gl_FragColor = vec4(color, alpha - smoothedAlpha);
```
```glsl
void main()
{
    float pixelsize = 0.5 * (fwidth(vtx_fs.x) + fwidth(vtx_fs.y));
    float dist = length(vtx_fs) - (1.0 - pixelsize);
    float smoothedAlpha = 1.5 * dist / fwidth(dist);
    gl_FragColor = vec4(color, alpha - smoothedAlpha);
}
```
```glsl
void main()
{
	float pixelsize = length(vec2(dFdx(vtx_fs.x), dFdy(vtx_fs.y)));
	float dist = length(vtx_fs) - (1.0 - pixelsize);
	float smoothedAlpha = dist / length(vec2(dFdx(dist), dFdy(dist)));
	gl_FragColor = vec4(color, alpha - smoothedAlpha);
}
```
### OpenGL and WebGL compatibility
This is compatible with all OpenGL and GLSL versions that use shaders. For OpenGL ***ES*** 2.0 and WebGL 1.0 you have to check for the existance of [OES_standard_derivatives](https://registry.khronos.org/OpenGL/extensions/OES/OES_standard_derivatives.txt) and perform `#extension GL_OES_standard_derivatives : enable`, though I have never seen a device OpenGL ES 2.0 device, that did not support screen space derivatives.

Advanced font rendering uses `GL_EXT_blend_func_extended` sometimes to perform advanced blending, but that is not required for our Anti-Aliasing case.

Mention Assassin Creed Unity Depth reprojection talk and how they MSAA the hell out of a small render target and blow and reconstruct the fullres version out of that info.

https://www.youtube.com/watch?v=1J6aAHLCbWg
https://www.shadertoy.com/view/3stcD4
http://miciwan.com/SIGGRAPH2013/Lighting%20Technology%20of%20The%20Last%20Of%20Us.pdf

FXAA

https://web.archive.org/web/20110903074855/http://www.eurogamer.net/articles/digital-foundry-future-of-anti-aliasing?page=3
https://web.archive.org/web/20120120070945/http://timothylottes.blogspot.com/2011/12/big-fxaa-update-soon.html
https://web.archive.org/web/20120120082725/http://timothylottes.blogspot.com/2011/12/fxaa-40-stills-and-features.html
https://web.archive.org/web/20120120080002/http://timothylottes.blogspot.com/2011/12/fxaa-40-stills-and-features-part-2.html
https://web.archive.org/web/20120120051227/http://timothylottes.blogspot.com/2011/12/kotaku-what-is-fxaa.html
https://web.archive.org/web/20120120072820/http://timothylottes.blogspot.com/2011/12/fxaa-40-will-have-new-spatial-only.html
https://web.archive.org/web/20120120085634/http://timothylottes.blogspot.com/2011/12/fxaa-40-development-update-stills.html
https://web.archive.org/web/20120120075218/http://timothylottes.blogspot.com/2011/12/fxaa-40-with-178x-ssaa.html

Capsule shadows

https://github.com/godotengine/godot-proposals/issues/5262
https://docs.unrealengine.com/4.27/en-US/BuildingWorlds/LightingAndShadows/CapsuleShadows/Overview/