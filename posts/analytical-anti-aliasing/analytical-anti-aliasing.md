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

From the simple but resource intensive [**SSAA**](https://en.wikipedia.org/wiki/Supersampling), over theory dense [**SMAA**](https://www.iryoku.com/smaa/), to using machine learning with [**DLAA**](https://en.wikipedia.org/wiki/Deep_learning_anti-aliasing). Same goal - ***vastly*** different approaches. We'll take a look at how they work, before introducing a new way to look a the problem - the ✨***analytical***🌟 way. The perfect Anti-Aliasing exists and is simpler than you think. Let's find out when and if you should use it.

<blockquote class="reaction"><div class="reaction_text">Having implemented it multiple times over the years, I'll also share some juicy secrets I have never read anywhere before.</div><img class="kiwi" src="/assets/kiwis/book.svg"></blockquote>

## The Setup
To understand the Anti-Aliasing algorithms, we will implement them along the way! That's what the WebGL + Source code boxes are for. Each [WebGL canvas](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Getting_started_with_WebGL) draws a moving circle. Anti-Aliasing cannot be fully understood with just images, movement is *essential* to see pixel crawling and sub-pixel filtering. The red box shows part of the circle's border with 4x zoom. Rendering is done without scaling at **native** resolution of your device, essential to judge Anti-aliasing properly. Results will depend on screen resolution.
<blockquote class="reaction"><div class="reaction_text">Please pixel-peep and judge sharpness and aliasing closely. Resolution of your screen too high to see aliasing? Lower the resolution with the following buttons, which will <a href="https://tanalin.com/en/articles/integer-scaling/">integer-scale</a> the rendering.</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

<script src="utility.js"></script>
<script src="circleSimple.js"></script>
<script src="circle.js"></script>
<script id="vertexBlit" type="x-shader/x-vertex">{% rawFile "posts/analytical-anti-aliasing/blit.vs" %}</script>
<script id="vertexBlitSimple" type="x-shader/x-vertex">{% rawFile "posts/analytical-anti-aliasing/blitSimple.vs" %}</script>
<script id="fragmentBlit" type="x-shader/x-fragment">{% rawFile "posts/analytical-anti-aliasing/blit.fs" %}</script>

<script id="vertexPost" type="x-shader/x-vertex">{% rawFile "posts/analytical-anti-aliasing/post.vs" %}</script>
<script id="fragmentPost" type="x-shader/x-fragment">{% rawFile "posts/analytical-anti-aliasing/post.fs" %}</script>
<script id="fragmentPostFXAA" type="x-shader/x-fragment">{% rawFile "posts/analytical-anti-aliasing/post-FXAA.fs" %}</script>

<script id="vertexRedBox" type="x-shader/x-vertex">{% rawFile "posts/analytical-anti-aliasing/red.vs" %}</script>
<script id="fragmentRedBox" type="x-shader/x-vertex">{% rawFile "posts/analytical-anti-aliasing/red.fs" %}</script>

<script id="vertex_0" type="x-shader/x-vertex">{% rawFile "posts/analytical-anti-aliasing/circle.vs" %}</script>
<script id="fragment_0" type="x-shader/x-fragment">{% rawFile "posts/analytical-anti-aliasing/circle.fs" %}</script>
<div class="toggleRes">
	<div>
	  <input type="radio" id="native" name="resSimple" value="1" checked />
	  <label for="native">Native<div>Resolution</div></label>
	</div>
	<div>
	  <input type="radio" id="half" name="resSimple" value="2" />
	  <label for="half">½<div>Resolution</div></label>
	</div>
	<div>
	  <input type="radio" id="quarter" name="resSimple" value="4" />
	  <label for="quarter">¼<div>Resolution</div></label>
	</div>
	<div>
	  <input type="radio" id="eight" name="resSimple" value="8" />
	  <label for="eight">⅛<div>Resolution</div></label>
	</div>
</div>
<canvas width="100%" height="400px" style="max-height: 400px; aspect-ratio: 1.71" id="canvasSimple"></canvas>
<script>setupSimple("canvasSimple", "vertex_0", "fragment_0", "vertexBlit", "fragmentBlit", "vertexRedBox", "fragmentRedBox", "resSimple");</script>

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
<summary>WebGL Javascript <a href="circleSimple.js">circleSimple.js</a></summary>

```javascript
{% rawFile "posts/analytical-anti-aliasing/circleSimple.js" %}
```

</details>
</blockquote>

Let's start out simple. Using [GLSL](https://en.wikipedia.org/wiki/OpenGL_Shading_Language) Shaders we tell the GPU of your device to draw a circle in the most simple and naive way possible, as seen in [circle.fs](circle.fs) above: If the [`length()`](https://docs.gl/sl4/length) from the middle point is bigger than 1.0, we [`discard`](https://www.khronos.org/opengl/wiki/Fragment_Shader#Special_operations) the pixel.

### Technical breakdown

<blockquote class="reaction"><div class="reaction_text">Understanding the GPU code is not necessary to follow this article, but will help to grasp whats happening when we get to the analytical bits.</div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>

4 vertices making up a quad are sent to the GPU in the vertex shader [circle.vs](circle.vs), where they are received as `attribute vec2 vtx`. The coordinates are of a unit quad, meaning the coordinates look like the following image. With [one famous exception](https://www.copetti.org/writings/consoles/sega-saturn/#segas-offering), all GPUs use triangles, so the quad is actually made up of two triangles.

![](unit.svg)

The vertices are given to the fragment shader [circle.fs](circle.fs) via `varying vec2 uv`. The fragment shader is called per [fragment](https://www.khronos.org/opengl/wiki/Fragment) (here fragments are pixel-sized) and the `varying` is interpolated linearly with [perspective corrected](https://en.wikipedia.org/wiki/Texture_mapping#Affine_texture_mapping), [barycentric coordinates](https://en.wikipedia.org/wiki/Barycentric_coordinate_system), giving us a `uv` coordinate per pixel from `-1` to `+1` with zero at the center.

By performing the check `if (length(uv) < 1.0)` we draw our color for fragments inside the circle and reject fragments outside of it. What we are doing is known as "Alpha testing". Without diving too deeply and just to hint at what's to come, what we have created with `length(uv)` is the [signed distance field](https://en.wikipedia.org/wiki/Signed_distance_function#Applications) of a point.

<blockquote class="reaction"><div class="reaction_text">Just to clarify, the circle isn't "drawn with geometry", which would have finite resolution of the shape, depending on how many vertices we use. It is "drawn by the shader".</div><img class="kiwi" src="/assets/kiwis/speak.svg"></blockquote>

## SSAA
SSAA stands for [Super Sampling Anti-Aliasing](https://en.wikipedia.org/wiki/Supersampling). Render it bigger, downsample to be smaller. . Implemented in mere seconds.
<div class="toggleRes">
	<div>
	  <input type="radio" id="nativeSSAA" name="resSSAA" value="1" checked />
	  <label for="nativeSSAA">Native<div>Resolution</div></label>
	</div>
	<div>
	  <input type="radio" id="halfSSAA" name="resSSAA" value="2" />
	  <label for="halfSSAA">½<div>Resolution</div></label>
	</div>
	<div>
	  <input type="radio" id="quarterSSAA" name="resSSAA" value="4" />
	  <label for="quarterSSAA">¼<div>Resolution</div></label>
	</div>
	<div>
	  <input type="radio" id="eightSSAA" name="resSSAA" value="8" />
	  <label for="eightSSAA">⅛<div>Resolution</div></label>
	</div>
</div>
<canvas width="100%" height="400px" style="max-height: 400px; aspect-ratio: 1.71" id="canvasSSAA"></canvas>
<script src="circleSSAA.js"></script>
<script>setupSSAA("canvasSSAA", "vertex_0", "fragment_0", "vertexPost", "fragmentPost", "vertexBlit", "fragmentBlit", "vertexRedBox", "fragmentRedBox", "resSSAA");</script>

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
There is definitely Anti-Aliasing happening, but not enough. We have 4 input pixels for every 1 output pixel we draw to the screen. There should be 4 steps of transparency, but we only get two!

### Conceptually simple - actually hard
We aren't sampling against the circle shape at twice the resolution, we are sampling against the quantized result of the circle shape at twice the resolution. Twice the resolution, but discrete pixels nonetheless. The pixelation doesn't hold enough information where we need it the most: at the axis-aligned "flat parts". We simply approached the problem too naively, paying with four times the memory ***and*** four times the calculation requirement, but only a half-assed result.

There are [multiple ways to sample with SSAA](https://en.wikipedia.org/wiki/Supersampling#Supersampling_patterns), all with pros and cons. So in reality, to implement SSAA properly, we need deep integration with the rendering pipeline.

And some of the biggest ones were even discovered on accident.
```
https://web.archive.org/web/20180716171211/https://naturalviolence.webs.com/sgssaa.htm
```

There are so many ways to do a seemingly simple task.

There is more: Bilinear interpolation is based on a 2x2 texel read, so you won't be able to downscale beyond 50%, without new aliasing being introduced.
#### The dreaded blur
There are more problems.

## MSAA
Choose MSAA sample count. Your hardware [may support up to MSAA x64](https://opengl.gpuinfo.org/displaycapability.php?name=GL_MAX_SAMPLES), but what is available to WebGL is implementation defined. WebGL 1 doesn't support MSAA at all, which is why the next windows will initialize a WebGL 2 context. NVIDIA limits the maximum Sample count to 4x, even if more is supported. On smartphones you will most likely get 4x.
```
https://github.com/KhronosGroup/Vulkan-Samples/tree/main/samples/performance/msaa#color-resolve
```

<div class="center-child">
<select id="MSAA">.
    <option value="1">No MSAA</option>
    <option disabled value="2">MSAA -   2x</option>
    <option selected disabled value="4">MSAA -   4x</option>
    <option disabled value="8">MSAA -   8x</option>
    <option disabled value="16">MSAA - 16x</option>
    <option disabled value="32">MSAA - 32x</option>
    <option disabled value="64">MSAA - 64x</option>
</select>
</div>

<script id="vertexMSAA" type="x-shader/x-vertex">{% rawFile "posts/analytical-anti-aliasing/circle-MSAA.vs" %}</script>
<script id="fragmentMSAA" type="x-shader/x-fragment">{% rawFile "posts/analytical-anti-aliasing/circle-MSAA.fs" %}</script>
<div class="toggleRes">
	<div>
	  <input type="radio" id="nativeMSAA" name="resMSAA" value="1" checked />
	  <label for="nativeMSAA">Native<div>Resolution</div></label>
	</div>
	<div>
	  <input type="radio" id="halfMSAA" name="resMSAA" value="2" />
	  <label for="halfMSAA">½<div>Resolution</div></label>
	</div>
	<div>
	  <input type="radio" id="quarterMSAA" name="resMSAA" value="4" />
	  <label for="quarterMSAA">¼<div>Resolution</div></label>
	</div>
	<div>
	  <input type="radio" id="eightMSAA" name="resMSAA" value="8" />
	  <label for="eightMSAA">⅛<div>Resolution</div></label>
	</div>
</div>
<canvas width="100%" height="400px" style="max-height: 400px; aspect-ratio: 1.71" id="canvasMSAA"></canvas>
<script src="circleMSAA.js"></script>
<script>setupMSAA("canvasMSAA", "vertexMSAA", "fragmentMSAA", "vertexPost", "fragmentPost", "vertexBlit", "fragmentBlit", "vertexRedBox", "fragmentRedBox", "resMSAA");</script>

This requires a more modern device supporting [WebGL2](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext). MSAA predates even WebGL 1, but wasn't standardized until WebGL 2.


The brain-melting lengths to which graphics programmers go to utilize hardware acceleration to the last drop has me sometimes in awe.

### Performance cost: (maybe) Zero 
Looking at modern video games, one might be led to believe that this technique is of the past. Enabling it usually brings a hefty performance penalty after all. Surprisingly, it's still the king under certain circumstances and in very specific situations, even performance free.

<blockquote class="reaction"><div class="reaction_text">As a gamer, this goes against instinct!</div><img class="kiwi" src="/assets/kiwis/surprised.svg"></blockquote>
<figure>
	<video width="960" height="540" controls><source src="MSAA-PerformanceFree.mp4" type="video/mp4"></video>
	<figcaption>Video: MSAA 4x is performance free in certain contexts
	<br>
	Excerpt from <a href="https://gdcvault.com/play/1024538">"Developing High Performance Games for Different Mobile VR Platforms"</a><br> GDC 2017 talk by <a href="https://www.linkedin.com/in/rahulprasad2/	">Rahul Prasad</a>
	</figcaption>
</figure>

> [Rahul Prasad:](https://www.linkedin.com/in/rahulprasad2/) Use MSAA [...] It's actually not as expensive on mobile as it is on desktop, it's one of the nice things you get on mobile. [...] On some (mobile) GPUs 4x (MSAA) is free, so use it when you have it.

As explained by [Rahul Prasad](https://www.linkedin.com/in/rahulprasad2/) in the above talk, in VR 4xMSAA is a must and may come free on certain mobile GPUs. The specific reason would derail the blog post, but in case you want to go down that particular rabbit hole, here is Epic Games' [Niklas Smedberg](https://www.linkedin.com/in/niklas-smedberg-a96466/) explaining giving a run-down.

<figure>
	<video width="960" height="540" controls><source src="tile-based-gpus.mp4" type="video/mp4"></video>
	<figcaption>Video: Tiled based rendering GPU architecture
	<br>
	Excerpt from <a href="https://gdcvault.com/play/1020756">"Next-Generation AAA Mobile Rendering"</a><br> GDC 2014 talk by <a href="https://www.linkedin.com/in/niklas-smedberg-a96466/">Niklas Smedberg</a> and <a href="https://www.linkedin.com/in/niklas-smedberg-a96466/">Timothy Lottes</a>
	</figcaption>
</figure>

The one sentence version is: This is possible under the condition of [forward rendering](https://gamedevelopment.tutsplus.com/forward-rendering-vs-deferred-rendering--gamedev-12342a) with geometry that is not too dense and the GPU having [tiled-based rendering architecture](https://developer.arm.com/documentation/102662/0100/Tile-based-GPUs), which allows the GPU to perform MSAA calculations without heavy memory access and thus [latency hiding](/WebGL-LUTS-made-simple/#performance-cost%3A-zero) the cost of the calculation.

### MSAA - Conclusion
- ✅ No extra framebuffer needed
- ✅❌ Performance cheap in certain cirumstances

## FXAA
<div class="toggleRes">
	<div>
	  <input type="radio" id="nativeFXAA" name="resFXAA" value="1" checked />
	  <label for="nativeFXAA">Native<div>Resolution</div></label>
	</div>
	<div>
	  <input type="radio" id="halfFXAA" name="resFXAA" value="2" />
	  <label for="halfFXAA">½<div>Resolution</div></label>
	</div>
	<div>
	  <input type="radio" id="quarterFXAA" name="resFXAA" value="4" />
	  <label for="quarterFXAA">¼<div>Resolution</div></label>
	</div>
	<div>
	  <input type="radio" id="eightFXAA" name="resFXAA" value="8" />
	  <label for="eightFXAA">⅛<div>Resolution</div></label>
	</div>
</div>
<canvas width="100%" height="400px" style="max-height: 400px; aspect-ratio: 1.71" id="canvasFXAA"></canvas>
<script src="circleFXAA.js"></script>
<script>setupFXAA("canvasFXAA", "vertex_0", "fragment_0", "vertexPost", "fragmentPostFXAA", "vertexBlit", "fragmentBlit", "vertexRedBox", "fragmentRedBox", "resFXAA");</script>

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

```
Choose the amount of sub-pixel aliasing removal.
This can effect sharpness.
```

### FXAA Live Demo

<script id="vertexInteractive" type="x-shader/x-vertex">{% rawFile "posts/analytical-anti-aliasing/FXAA-interactive.vs" %}</script>
<script id="fragmentInteractive" type="x-shader/x-fragment">{% rawFile "posts/analytical-anti-aliasing/FXAA-interactive.fs" %}</script>
<script id="vertexLuma" type="x-shader/x-fragment">{% rawFile "posts/analytical-anti-aliasing/FXAA-Luma.vs" %}</script>
<script id="fragmentLuma" type="x-shader/x-fragment">{% rawFile "posts/analytical-anti-aliasing/FXAA-Luma.fs" %}</script>

<div style="display: flex; flex-wrap: wrap; gap: 0px 12px; justify-content: space-around;">
    <span style="display: flex; gap: 8px; white-space: nowrap">
        <label style="font-weight: unset; display: flex; gap: 8px; align-items: center;">
            <input style="margin-bottom: unset;" type="checkbox" id="fxaaCheck" name="Enable FXAA" checked />
            Enable FXAA
        </label>
    </span>
    <span style="display: flex; gap: 8px; white-space: nowrap">
        <label style="font-weight: unset; display: flex; gap: 8px; align-items: center;">
            <input style="margin-bottom: unset;" type="checkbox" id="redCheck" name="Enable Red Box" checked />
            Enable Red Box
        </label>
    </span>
    <span style="display: flex; gap: 8px; white-space: nowrap">
        <label style="font-weight: unset; display: flex; gap: 8px; align-items: center;">
            <input style="margin-bottom: unset;" type="checkbox" id="pauseCheck" name="Play / Pause" checked />
            Play / Pause
        </label>
    </span>
</div>


<canvas width="100%" style="aspect-ratio: 1.425" id="canvasFXAAInteractive"></canvas>

<select id="FXAA_QUALITY_PRESET">
	<optgroup label="Default medium dither">
		<option value="10">10 (fastest)</option>
		<option value="11">11</option>
		<option value="12" selected>12 (default)</option>
		<option value="13">13</option>
		<option value="14">14</option>
		<option value="15">15 (highest quality)</option>
	</optgroup>
	<optgroup label="Less dither, more expensive">
		<option value="20">20 (fastest)</option>
		<option value="21">21</option>
		<option value="22">22</option>
		<option value="23">23</option>
		<option value="24">24</option>
		<option value="25">25</option>
		<option value="26">26</option>
		<option value="27">27</option>
		<option value="28">28</option>
		<option value="29">29 (highest quality)</option>
	<optgroup label="No dither, very expensive">
		<option value="39">39 (EXTREME QUALITY)</option>
	</optgroup>
</select>
<div style="display: flex; flex-wrap: wrap; gap: 0px 12px; justify-content: space-around;">
    <span style="display: flex; gap: 8px; white-space: nowrap">
        <label style="font-weight: unset; display: flex; gap: 8px; align-items: center;">
            <input style="margin-bottom: unset;" type="checkbox" id="lumaCheck" name="Show Luma" />
            Show Luma
        </label>
    </span>
    <span style="display: flex; gap: 8px; white-space: nowrap">
        <label style="font-weight: unset; display: flex; gap: 8px; align-items: center;">
            <input style="margin-bottom: unset;" type="checkbox" id="greenCheck" name="Green as Luma" />
            Green as Luma
        </label>
    </span>
</div>

<div class="slider">
    <span>
		<code>fxaaQualitySubpix</code>
		<output id="fxaaQualitySubpixValue">0.75</output>
	</span>
    <div class="row">
        <span>Min</span>
        <input type="range" step="0.01" min="0" max="1" value="0.75" id="fxaaQualitySubpixRange" oninput="fxaaQualitySubpixValue.value = fxaaQualitySubpixRange.value">
        <span>Max</span>
    </div>
</div>

<div class="slider">
    <span>
		<code>fxaaQualityEdgeThreshold</code>
		<output id="fxaaQualityEdgeThresholdValue">0.166</output>
	</span>
    <div class="row">
        <span>Min</span>
        <input type="range" step="0.001" min="0" max="1" value="0.166" id="fxaaQualityEdgeThresholdRange" oninput="fxaaQualityEdgeThresholdValue.value = fxaaQualityEdgeThresholdRange.value">
        <span>Max</span>
    </div>
</div>

<div class="slider">
    <span>
		<code>fxaaQualityEdgeThresholdMin</code>
		<output id="fxaaQualityEdgeThresholdMinValue">0.0833</output>
	</span>
    <div class="row">
        <span>Min</span>
        <input type="range" step="0.0001" min="0" max="1" value="0.0833" id="fxaaQualityEdgeThresholdMinRange" oninput="fxaaQualityEdgeThresholdMinValue.value = fxaaQualityEdgeThresholdMinRange.value">
        <span>Max</span>
    </div>
</div>

<details><summary><code>fxaaQualitySubpix</code> Explanation</summary>
<pre>
Choose the amount of sub-pixel aliasing removal.
This can effect sharpness.
  1.00 - upper limit (softer)
  0.75 - default amount of filtering
  0.50 - lower limit (sharper, less sub-pixel aliasing removal)
  0.25 - almost off
  0.00 - completely off</pre>
</details>
<details><summary><code>fxaaQualityEdgeThreshold</code> Explanation</summary>
<pre>
The minimum amount of local contrast required to apply algorithm.
  0.333 - too little (faster)
  0.250 - low quality
  0.166 - default
  0.125 - high quality 
  0.063 - overkill (slower)</pre>
</details>
<details><summary><code>fxaaQualityEdgeThresholdMin</code> Explanation</summary>
<pre>
Trims the algorithm from processing darks.
  0.0833 - upper limit (default, the start of visible unfiltered edges)
  0.0625 - high quality (faster)
  0.0312 - visible limit (slower)
Special notes when using FXAA_GREEN_AS_LUMA,
  Likely want to set this to zero.
  As colors that are mostly not-green
  will appear very dark in the green channel!
  Tune by looking at mostly non-green content,
  then start at zero and increase until aliasing is a problem.</pre>
</details>
<details><summary><code>FXAA_QUALITY_PRESET</code> Explanation</summary>
<pre>
Trades performance for quality, with 3 different "styles" of dither.
 _ = the lowest digit is directly related to performance
_  = the highest digit is directly related to style</pre>
</details>

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

<script src="FXAA-interactive.js"></script>
<script>setupFXAAInteractive("canvasFXAAInteractive", "vertexInteractive", "fragmentInteractive", "vertexLuma", "fragmentLuma", "vertexBlitSimple", "fragmentBlit", "vertexRedBox", "fragmentRedBox");</script>


## What makes it analytical?

<div class="toggleRes">
	<div>
	  <input type="radio" id="nativeAnalytical" name="resAnalytical" value="1" checked />
	  <label for="nativeAnalytical">Native<div>Resolution</div></label>
	</div>
	<div>
	  <input type="radio" id="halfAnalytical" name="resAnalytical" value="2" />
	  <label for="halfAnalytical">½<div>Resolution</div></label>
	</div>
	<div>
	  <input type="radio" id="quarterAnalytical" name="resAnalytical" value="4" />
	  <label for="quarterAnalytical">¼<div>Resolution</div></label>
	</div>
	<div>
	  <input type="radio" id="eightAnalytical" name="resAnalytical" value="8" />
	  <label for="eightAnalytical">⅛<div>Resolution</div></label>
	</div>
</div>

<script id="fragmentAnalytical" type="x-shader/x-fragment">{% rawFile "posts/analytical-anti-aliasing/circle-analytical.fs" %}</script>

<script src="circleAnalytical.js"></script>

<canvas width="100%" height="400px" style="max-height: 400px; aspect-ratio: 1.71" id="canvasAnalytical"></canvas>
<!-- <script>setup("canvasAnalytical", "vertex_0", "fragmentAnalytical", "vertexPost", "fragmentPost", "vertexBlit", "fragmentBlit", "vertexRedBox", "fragmentRedBox");</script> -->
<script>setupAnalytical("canvasAnalytical", "vertex_0", "fragmentAnalytical", "vertexBlit", "fragmentBlit", "vertexRedBox", "fragmentRedBox", "resAnalytical");</script>

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

![image](compare.png)

## Signed distance field rendering
[Signed distance functions](https://en.wikipedia.org/wiki/Signed_distance_function#Applications)
### [Valve Software](https://www.valvesoftware.com/)'s implementation
Valve introduced extensive use of signed distance field rendering to the [Source engine](https://en.wikipedia.org/wiki/Source_(game_engine)) during the development of the [Orange Box](https://en.wikipedia.org/wiki/The_Orange_Box). Most prominently in [Team Fortress 2](https://www.teamfortress.com/), where it was used to create smooth yet sharp UI elements on the HUD and decals in the game world. It received even its own [Developer Commentary](https://wiki.teamfortress.com/wiki/Developer_commentary) entry.

![](tf2hud.png)

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


## Secret sauce 💦
When following graphics programming literature while implementing analytical anti-aliasing in various shaders, I discovered many implementation details that I don't agree with. So from here on out, we'll go into the nitty gritty, as I spill the tea on some juicy GPU code secrets.
### Don't use [`smoothstep()`](https://en.wikipedia.org/wiki/Smoothstep)
Its use is [often associated](http://www.numb3r23.net/2015/08/17/using-fwidth-for-distance-based-anti-aliasing/) with implementing anti-aliasing in `GLSL`, but its use doesn't make sense. It performs a hermite interpolation, but the we are dealing with a function applied across 2 pixels or just inside 1. There is no curve to be witnessed here.
<blockquote class="reaction"><div class="reaction_text">To be precise, both sampling and blending witness the smoothstep curve in the sub-pixel make-up of the edge, but even after pixel peeping, it just doesn't make any difference.</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

Though the slight performance difference doesn't particularly matter on modern graphics cards so wasting cycles on performing the hermite interpolation doesn't make sense to me.

We can implement it ourselves, without the hermite interpolation

```
implement
```

But wait! If all we want know is the pixel size, then most of this cancels out! Infact, we don't need any kind of step function.



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

### fwidth vs length + dFdx + dFdy
`length(vec2(dFdx(dist), dFdy(dist)))`

 https://acegikmo.com/shapes/
 https://acegikmo.com/shapes/docs/#anti-aliasing
 
 > The difference between Fast and Corrected LAA is subtle - Fast LAA has a slight bias in the diagonal directions, making circular shapes appear ever so slightly rhombous and have a slightly sharper curvature in the orthogonal directions, especially when small.

 Screen space derivatives are free, but what we do with them is not. Things are shaded in 2x2 fragment packs to get screen space derivatives. That's one of the reasons using [a full-screen triangle is faster than using a full-screen quad](https://wallisc.github.io/rendering/2021/04/18/Fullscreen-Pass.html), because the triangle diagonals are shaded more than needed.

 But wait a moment, wouldn't it be smarter to draw the shapes on a triangle instead of a quad, saving the double shaded diagonals in the middle? As per usual, the true answer is *it depends*, but long story short: no. The full screen triangle isn't shaded beyond the screen's borders, because the GPU's rasterization step that happens before the fragment shader is invoked, will clip the triangle and prevent calculations which aren't visible in the first place. That is not the case with shapes that move within the confines of screen, leading to lots of overdraw in the invisible parts outside the shape.
### OpenGL and WebGL compatibility
This is compatible with all OpenGL and GLSL versions that use shaders. For OpenGL ***ES*** 2.0 and WebGL 1.0 you have to check for the existance of [OES_standard_derivatives](https://registry.khronos.org/OpenGL/extensions/OES/OES_standard_derivatives.txt) and perform `#extension GL_OES_standard_derivatives : enable`, though I have never seen a device OpenGL ES 2.0 device, that did not support screen space derivatives.

Advanced font rendering uses `GL_EXT_blend_func_extended` sometimes to perform advanced blending, but that is not required for our Anti-Aliasing case.

Mention Assassin Creed Unity Depth reprojection talk and how they MSAA the hell out of a small render target and blow and reconstruct the fullres version out of that info.
[Talk](https://advances.realtimerendering.com/s2015/aaltonenhaar_siggraph2015_combined_final_footer_220dpi.pdf)[Ulrich Haar](https://www.linkedin.com/in/ulrich-haar-730407218) and [Sebastian Aaltonen](https://x.com/SebAaltonen)


```
https://www.youtube.com/watch?v=1J6aAHLCbWg
https://www.shadertoy.com/view/3stcD4
http://miciwan.com/SIGGRAPH2013/Lighting%20Technology%20of%20The%20Last%20Of%20Us.pdf
```

FXAA

In fact, when FXAA came into wide circulation, it received some incredibly praising press releases. [Jeff Atwood](https://blog.codinghorror.com/about-me/) pulled neither bold fonts nor punches in his [2011 blog post](https://blog.codinghorror.com/fast-approximate-anti-aliasing-fxaa/) about that topic, which was later [republished by Kotaku](http://kotaku.com/5866780/).

> [**Jeff Atwood**](https://blog.codinghorror.com/about-me/): The FXAA method is so good, in fact, it makes all other forms of full-screen anti-aliasing pretty much obsolete overnight. **If you have an FXAA option in your game, you should enable it immediately** and ignore any other AA options.

The final version publicly released was FXAA 3.11 on [August 12th 2011](https://web.archive.org/web/20120121124756/http://timothylottes.blogspot.com/2011/08/fxaa-311-bug-fixes-for-360.html).

A little history tour, since this information is almost lost due to [link rot](https://en.wikipedia.org/wiki/Link_rot) so severe, that graphics researcher were forced to [use archive links](http://behindthepixels.io/assets/files/TemporalAA.pdf#page=14). By that time Timothy Lottes was already experimenting with temporal anti-aliasing, a technique of 
In fact, FXAA was supposed to [evole into FXXA v4](https://web.archive.org/web/20120120082725/http://timothylottes.blogspot.com/2011/12/fxaa-40-stills-and-features.html) and [incorporate temporal anti aliasing](https://web.archive.org/web/20120120070945/http://timothylottes.blogspot.com/2011/12/big-fxaa-update-soon.html), but instead it evolved and rebranded into [TXAA](https://web.archive.org/web/20210116205348/https://www.nvidia.com/en-gb/geforce/technologies/txaa/technology/).

```
TSSAA http://web.archive.org/web/20120120082628/http://timothylottes.blogspot.com/2011_04_01_archive.html
```

April 2011 

```
https://web.archive.org/web/20110903074855/http://www.eurogamer.net/articles/digital-foundry-future-of-anti-aliasing?page=3
https://web.archive.org/web/20120120070945/http://timothylottes.blogspot.com/2011/12/big-fxaa-update-soon.html
https://web.archive.org/web/20120120082725/http://timothylottes.blogspot.com/2011/12/fxaa-40-stills-and-features.html
https://web.archive.org/web/20120120080002/http://timothylottes.blogspot.com/2011/12/fxaa-40-stills-and-features-part-2.html
https://web.archive.org/web/20120120051227/http://timothylottes.blogspot.com/2011/12/kotaku-what-is-fxaa.html
https://web.archive.org/web/20120120072820/http://timothylottes.blogspot.com/2011/12/fxaa-40-will-have-new-spatial-only.html
https://web.archive.org/web/20120120085634/http://timothylottes.blogspot.com/2011/12/fxaa-40-development-update-stills.html
https://web.archive.org/web/20120120075218/http://timothylottes.blogspot.com/2011/12/fxaa-40-with-178x-ssaa.html
```

Capsule shadows

```
https://github.com/godotengine/godot-proposals/issues/5262
https://docs.unrealengine.com/4.27/en-US/BuildingWorlds/LightingAndShadows/CapsuleShadows/Overview/
```