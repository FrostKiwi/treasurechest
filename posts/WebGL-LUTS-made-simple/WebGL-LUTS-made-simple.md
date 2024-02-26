---
title: Unreasonably effective - How video games use LUTs and how you can too
permalink: "/{{ page.fileSlug }}/"
date:
last_modified:
description: How to implement 1D LUTs to color grayscale thermal vision videos, 3D LUTs for color correct and smart hacks from video games
publicTags:
  - Graphics
  - WebGL
  - GameDev
image: thumb.jpg
---

<script src="fullscreen-tri.js"></script>
<script  id="vertex" type="x-shader/x-vertex">{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}</script>

[Look-up-tables](https://en.wikipedia.org/wiki/Lookup_table), more commonly referred to as LUTs, are as old as Mathematics itself. The act of precalculating things into a row or table is nothing new. But in the realm of graphics programming, this simple act unlocks some incredibly creative techniques, which both artists and programmers found when faced with tough technical hurdles.

We'll embark on a small journey, which will take us from simple things like turning grayscale footage into color, to creating limitless variations of blood-lusting zombies, with many interactive WebGL examples along the way, that you can try out with your own videos or webcam. Though this article uses [WebGL](https://en.wikipedia.org/wiki/WebGL), the techniques shown apply to any other graphics programming context, be it [DirectX](https://en.wikipedia.org/wiki/DirectX), [OpenGL](https://en.wikipedia.org/wiki/OpenGL), [Vulkan](https://en.wikipedia.org/wiki/Vulkan), game engines like [Unity](<https://en.wikipedia.org/wiki/Unity_(game_engine)>), or plain scientific data visualization.

<figure>
	<video width="1400" height="480" style="width: unset; max-width: 100%" autoplay playsinline muted controls loop><source src="preview.mp4" type="video/mp4"></video>
	<figcaption>Cold ice cream and hot tea. Left: Panasonic GH6, Right: TESTO 890 + 15°x11° Lens</figcaption>
</figure>

We'll be creating and modifying the video above, though you may substitute the footage with your own at any point in the article. The video is a capture of two cameras, a [Panasonic GH6](https://www.dpreview.com/reviews/panasonic-lumix-dc-gh6-review) and a [TESTO 890](https://www.testo.com/en/testo-890/p/0563-0890-X1) thermal camera. I'm eating cold ice cream and drinking hot tea to stretch the temperatures on display.

## The Setup

We'll first start with the thermal camera footage. The output of the [thermal camera](https://en.wikipedia.org/wiki/Thermographic_camera) is a grayscale video. Instead of this video, you may upload your own or activate the WebCam, which even allows you to live stream from a thermal camera using [OBS](https://obsproject.com/)'s virtual WebCam and various input methods.

<blockquote class="reaction"><div class="reaction_text">No data leaves your device, all processing happens on your GPU. Feel free to use videos exposing your most intimate secrets.</div><img class="kiwi" src="/assets/kiwis/happy.svg"></blockquote>

<input type="file" id="fileInput" accept="video/*" style="display: none;" onchange="changeVideo(this)">

<div class="center-child"><button onclick="document.getElementById('fileInput').click();">Upload Video</button><button onclick="startWebcam();">Connect Webcam</button></div>

<video width="100%" height="480" playsinline muted controls loop id="videoPlayer"><source src="bwvid.mp4" type="video/mp4"></video></div>

<script src="videoSource.js"></script>

Next we upload this footage to the graphics card using WebGL and redisplay it using a [shader](https://learnopengl.com/Getting-started/Hello-Triangle), which leaves the footage untouched. Each frame is transferred as a 2D [texture](https://learnopengl.com/Getting-started/Textures) to the GPU. Though we haven't actually done anything visually yet, we have established a graphics pipeline, which allows us to manipulate the video data in realtime. From here on out, we are mainly interested in the "[Fragment Shader](https://learnopengl.com/Getting-started/Hello-Triangle)". This is the piece of code that runs per pixel of the video to determine its final color.

<blockquote class="reaction"><div class="reaction_text">I'm hardcore simplifying here. Technically there are many shader stages, the fragment shader runs per <a href="https://www.khronos.org/opengl/wiki/Fragment">fragment</a> of the output resolution not per pixel of the input, etc.</div><img class="kiwi" src="/assets/kiwis/think.svg"></blockquote>

<script  id="fragment_2" type="x-shader/x-fragment">{% rawFile "posts/WebGL-LUTS-made-simple/video-simple.fs" %}</script>

<canvas width="100%" height="480" id="canvas_2"></canvas>

<script>setupTri("canvas_2", "vertex", "fragment_2", "videoPlayer", null);</script>

<blockquote>
<details><summary><a href="screenshot_passthrough.jpg">Screenshot</a>, in case WebGL doesn't work</summary>

![image](screenshot_passthrough.jpg)

</details>
<details><summary>WebGL Vertex Shader <a href="fullscreen-tri.vs">fullscreen-tri.vs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}
```

</details>
<details>	
<summary>WebGL Fragment Shader <a href="video-simple.fs">video-simple.fs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/video-simple.fs" %}
```

</details>
<details>	
<summary>WebGL Javascript <a href="fullscreen-tri.js">fullscreen-tri.js</a></summary>

```javascript
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.js" %}
```

</details>
</blockquote>

Both the video and its WebGL rendition should be identical and playing in sync.

## Tinting

Before we jump into how LUTs can help us, let's take a look a how we can manipulate this footage. The Fragment Shader below colors the image orange by multiplying the image with the color orange in line `21`. Coloring a texture that way is referred to as "tinting".

`vec3 finalColor = videoColor * vec3(1.0, 0.5, 0.0);` is the line that performs this transformation. `vec3(1.0, 0.5, 0.0)` is the color orange in RGB. Try changing this line and clicking "**Reload Shader**" to get a feel for how this works. Also try out different operations, like addition `+`, division `/` etc.

<pre id="tintingShader">{% rawFile "posts/WebGL-LUTS-made-simple/video-orange.fs" %}</pre>
<script src="/ace/ace.js" type="text/javascript" charset="utf-8"></script>
<script>
    var editor = ace.edit("tintingShader");
    editor.setTheme("ace/theme/gruvbox_dark_hard");
    editor.session.setMode("ace/mode/glsl");
	editor.session.setOptions({
        useWorker: false
    });
	editor.renderer.setOptions({
		showFoldWidgets: false,
        fontSize: "smaller",
        fontFamily: "Consolas, Monaco, \"Andale Mono\", monospace;",
		showPrintMargin: false,
		maxLines: 50
    })
</script>

<div class="center-child"><button id="shaderReload_3">Reload Shader</button></div>

<canvas width="100%" height="480" id="canvas_3"></canvas>

<script>setupTri("canvas_3", "vertex", "tintingShader", "videoPlayer", null, null, "shaderReload_3");</script>
<blockquote>
<details><summary>WebGL Vertex Shader <a href="fullscreen-tri.vs">fullscreen-tri.vs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}
```

</details>
<details>
<summary>WebGL Javascript <a href="fullscreen-tri.js">fullscreen-tri.js</a></summary>

```javascript
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.js" %}
```

</details>
</blockquote>

### Performance cost: Zero

**_Depending on the context_**, the multiplication introduced by the tinting has zero performance impact. On a theoretical level, the multiplication has a cost associated with it, since the chip has to perform this multiplication at some point. But you will probably not be able to measure it *in this context*, as the multiplication is affected by "[latency hiding](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2016/EECS-2016-143.pdf)". The act, cost and latency of pushing the video though the graphics pipeline unlocks a lot of manipulations we get for free this way. We can rationalize this from multiple levels, but the main point goes like:

- Fetching the texture from memory takes way more time than a multiplication
  - Even though the result depends on the texture tap, with multiple threads the multiplication is performed while waiting on the texture tap of another pixel

<blockquote class="reaction"><div class="reaction_text">This is about the difference tinting makes, not overall performance. Lot's left on the optimization table, like asynchronously loading the frames to a single-channel texture or processing on every frame, not display refresh</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

A similar vein, it was also talked about in the [recent blog post](https://rosenzweig.io/blog/conformant-gl46-on-the-m1.html) by [Alyssa Rosenzweig](https://rosenzweig.io), about her GPU reverse engineering project achieving proper standard conformant OpenGL Drivers on the Apple M1. Regarding performance implications of a specific additional operation she noted:

> **Alyssa Rosenzweig**: The difference should be small percentage-wise, as arithmetic is faster than memory. With thousands of threads running in parallel, the arithmetic cost may even be hidden by the load’s latency.

### Valve Software's use of tinting

Let's take a look how this is used in the wild. As an example, we have [Valve Software](https://www.valvesoftware.com/)'s [Left 4 Dead](https://en.wikipedia.org/wiki/Left_4_Dead). The in-game developer commentary feature unlocks much shared wisdom form artists and programmers alike. Here is the audio log of developer [Tristan Reidford](https://www.linkedin.com/in/tristan-reidford-b8474a2/) explaining how they utilized tinting to create car variations. In particular they use one extra texture channel to determine extra tinting regions, allowing one to use 2 colors to tint certain regions of the 3D model in a different color.

<audio controls><source src="Tristan-Reidford.mp3" type="audio/mpeg"></audio>

> **Tristan Reidford:** Usually each model in the game has its own unique texture maps painted specifically for that model, which give the object its surface colors and detail. To have a convincing variety of cars using this method would have required as many textures as varieties of car, plus multiple duplicates of the textures in different colors, which would have been far out of our allotted texture memory budget. So we had to find a more efficient way to bring about that same result. For example, the texture on this car is shared with 3 different car models distributed throughout the environment. In addition to this one color texture, there is also a 'mask' texture that allows each instance of the car's painted surfaces to be tinted a different color, without having to author a separate texture. So for the cost of two textures you can get four different car models in an unlimited variety of colors.

<figure>
	<img src="Left4Dead.jpg" alt="Screenshot: Left 4 Dead and its use of tinting the same car to get achieve new looks." />
	<figcaption>Screenshot: Left 4 Dead and its use of tinting the same car to get achieve new looks.</figcaption>
</figure>

Note, that it's not just cars. Essentially everything in the [Source Engine](<https://en.wikipedia.org/wiki/Source_(game_engine)>) can be tinted.

## The LUT - Simple, yet powerful

Now that we have gotten an idea of how we can interact and manipulate color in a graphics programming context, let's dive into how a LUT can elevate that. The core of the idea is this: Instead of defining how the colors are changed across their entire range, let's define what color range changes in what way. If you have replaced the above thermal image with an RGB video of your own, then just the red channel will be used going forward.

The following examples make more sense in context of thermal camera footage, so you can click the following button to revert to it, if you wish.

<div class="center-child">
<button onclick='changeVideoURL("bwvid.mp4")'>Reload thermal camera footage</button></div>

### The humble 1D LUT

A 1D LUT is a simple array of numbers. According that array, we will color our gray video according to that array. In the context of graphics programming, this gets uploaded as a 1D-texture to the graphics card, where it is used to color the grayscale video.

<div class="center-child">
<select id="lutSelector">
    <option value="/assets/LUTs/PerceptuallyUniform/inferno.png">Inferno - 256px wide</option>
    <option value="/assets/LUTs/InfernoSizes/inferno128.png">Inferno - 128px wide</option>
    <option value="/assets/LUTs/InfernoSizes/inferno64.png">Inferno - 64px wide</option>
    <option value="/assets/LUTs/InfernoSizes/inferno32.png">Inferno - 32px wide</option>
    <option value="/assets/LUTs/InfernoSizes/inferno16.png">Inferno - 16px wide</option>
    <option value="/assets/LUTs/InfernoSizes/inferno8.png">Inferno - 8px wide</option>
    <option value="/assets/LUTs/InfernoSizes/inferno4.png">Inferno - 4px wide</option>
    <option value="/assets/LUTs/InfernoSizes/inferno2.png">Inferno - 2px wide</option>
</select>
</div>

<img src="/assets/LUTs/PerceptuallyUniform/inferno.png" id="lut" style="width: 100%; height: 64px;">

<script  id="fragment_4" type="x-shader/x-fragment">{% rawFile "posts/WebGL-LUTS-made-simple/video-lut.fs" %}</script>

<canvas width="100%" height="480" id="canvas_4"></canvas>

<script>setupTri("canvas_4", "vertex", "fragment_4", "videoPlayer", "lut", "lutSelector")</script>
<blockquote>
<details><summary>WebGL Vertex Shader <a href="fullscreen-tri.vs">fullscreen-tri.vs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}
```

</details>
<details>	
<summary>WebGL Fragment Shader <a href="video-lut.fs">video-lut.fs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/video-lut.fs" %}
```

</details>
<details>	
<summary>WebGL Javascript <a href="fullscreen-tri.js">fullscreen-tri.js</a></summary>

```javascript
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.js" %}
```

</details>
</blockquote>

An here comes the neat part, looking at the fragment shader, we use the brightness of the video, which goes from `[0.0 - 1.0]` to index into the X-Axis of our 1D LUT, which also has texture coordinates corresponding to`[0.0 - 1.0]`, resulting in the expression `vec4 finalcolor = texture(lut, videoColor);`. In WebGL 1.0, we don't have 1D-Textures, so we use a 2D-Texture of 1px height. `vec4 finalColor = texture2D(lut, vec2(videoColor, 0.5));` Thus the resulting code actually needs the Y coordinate as well, neither of which particularly matters.

The `0.0` black in the video is mapped to the color on the left and `1.0` white in the video is mapped to the color on the right, with all colors in between being assigned to their corresponding values.

What makes this map so well to the GPU, is that on GPUs we get bilinear filtering for free when performing texture reads. So if our 8-bits per channel video has 256 distinct shades of grey, but our 1D-Lut is only 32 pixels wide, then the texture access in between two pixels gets linearly interpolated automatically. In the above selection box you can try setting the 1D Lut to different sizes and compare.

<blockquote class="reaction"><div class="reaction_text">Incredible how close the 256 pixel wide and very colorful gradient is reproduced, with only 8 pixels worth of information!</div><img class="kiwi" src="/assets/kiwis/surprised.svg"></blockquote>

#### So many colors
Here is every single colormap that [matlibplot](https://matplotlib.org/) supports, exported as a 1D LUT. Scroll through all of them and choose your favorite!

{% rawFile "posts/WebGL-LUTS-made-simple/select.html" %}

<img src="/assets/LUTs/PerceptuallyUniform/viridis.png" id="viridis" style="width: 100%; height: 64px;">

<script  id="fragment_5" type="x-shader/x-fragment">{% rawFile "posts/WebGL-LUTS-made-simple/video-lut.fs" %}</script>

<canvas width="684" height="480" style="width: unset; max-width: 100%" id="canvas_5"></canvas>

<script>setupTri("canvas_5", "vertex", "fragment_5", "videoPlayer", "viridis", "lutSelector2");</script>
<blockquote>
<details><summary>WebGL Vertex Shader <a href="fullscreen-tri.vs">fullscreen-tri.vs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}
```

</details>
<details>	
<summary>WebGL Fragment Shader <a href="video-lut.fs">video-lut.fs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/video-lut.fs" %}
```

</details>
<details>	
<summary>WebGL Javascript <a href="fullscreen-tri.js">fullscreen-tri.js</a></summary>

```javascript
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.js" %}
```

</details>
</blockquote>

Sike! It's a trick question. You don't get to choose. You may think, that you should choose what ever looks best, but in matters of taste, the customer *isn't* always right.

<img src="salty.jpg" style="max-height: 300px">

Unless your data has specific structure, there is actually one colormap type that you should be using or basing your color settings on - "Perceptually Uniform", like the [viridis](https://cran.r-project.org/web/packages/viridis/vignettes/intro-to-viridis.html) family of colormaps. We won't dive into such a deep topic here, but the main points are this:
- If you choose from the Perceptually Uniform ones, then printing your data in black and white will still have the "cold" parts dark and "hot" parts bright
  - This is not a given with colorful options like jet, which modify mainly just the hue whilst ignoring perceived lightness
- People with color blindness will still be able to interpret your data correctly

Reasons as for this and why other colormaps are dangerous for judging critical information are presented here by [Stefan van der Walt](https://github.com/stefanv) and [Nathaniel J. Smith](https://github.com/njsmith).
<div class="center-child"><iframe width="560" height="315" src="https://www.youtube.com/embed/xAoljeRJ3lU?si=vxcupZ7q-JhcCXFm&amp;start=50" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>

#### Still performance free?
We talked about tinting being essentially performance free. When talking about (small 1D-) LUTs it gets complicated, though the answer is still probably yes. The main concern comes from us creating something called a "dependant texture read". We are triggering one texture read based on the result of another. In graphics programming, a performance sin, as we eliminate a whole class of possible optimized paths, that graphics drivers consider.

GPUs have textures caches, which our LUT will have no problem fitting into and will probably make LUT textures read very cheap. To measure things performance this finely, how caches are hit and the like, we required advanced debugging tools, which are platform specific. There is [Nvidia NSight](https://developer.nvidia.com/blog/identifying-shader-limiters-with-the-shader-profiler-in-nvidia-nsight-graphics/), which allows you to break down the performance of each step in the shader, though OpenGL is unsupported for this. Either way, this is not the topic of this article. There *is* one more thing though...

You can perform polynomial approximations of a colormap and thus side-step the LUT texture read. The next WebGL fragment shader features a polynomial approximation of viridis. It was created by [Matt Zucker](https://mzucker.github.io/), available on [ShaderToy](https://www.shadertoy.com/view/WlfXRN) including polynomials for other colormaps. Compare both the original colormap exported as a LUT and the approximation exported as a LUT in the following two stripes. Remarkably close.

<script  id="fragment_9" type="x-shader/x-fragment">{% rawFile "posts/WebGL-LUTS-made-simple/video-lut_viridis.fs" %}</script>

<img src="/assets/LUTs/PerceptuallyUniform/viridis.png" style="width: 100%; height: 32px; margin-bottom: 8px">
<img src="viridis_from_function.png" style="width: 100%; height: 32px;">
<canvas width="684" height="480" style="width: unset; max-width: 100%" id="canvas_9"></canvas>

<script>setupTri("canvas_9", "vertex", "fragment_9", "videoPlayer", null);</script>
<blockquote>
<details><summary>WebGL Vertex Shader <a href="fullscreen-tri.vs">fullscreen-tri.vs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}
```

</details>
<details>	
<summary>WebGL Fragment Shader <a href="video-lut_viridis.fs">video-lut_viridis.fs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/video-lut_viridis.fs" %}
```

</details>
<details>	
<summary>WebGL Javascript <a href="fullscreen-tri.js">fullscreen-tri.js</a></summary>

```javascript
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.js" %}
```

</details>
</blockquote>

The resulting shader contains the polynomial in [Horner's method](https://en.wikipedia.org/wiki/Horner's_method) and performs a bunch of Multiply-Adds `c0+t*(c1+t*(c2+t*(c3+t*(c4+t*(c5+t*c6)))));` to get the color, instead of the texture lookup. This is a prime candidate for being optimized into a few [Fused Multiply-Add (FMA)](https://en.wikipedia.org/wiki/Multiply%E2%80%93accumulate_operation#Fused_multiply%E2%80%93add) instructions. Even considering [theoretical details](https://en.wikipedia.org/wiki/Horner%27s_method#Parallel_evaluation), this is as good as it gets. Whether or not this is actually faster than a LUT though, is difficult to judge without deep platform specific analysis.
<blockquote class="reaction"><div class="reaction_text">Saves you from handling the LUT texture, quite the time saver!</div><img class="kiwi" src="/assets/kiwis/happy.svg"></blockquote>

#### Diversity for Zombies
Let's take a look at how far this technique can be stretched. This time we are looking at the sequel [Left 4 Dead 2](https://en.wikipedia.org/wiki/Left_4_Dead_2). Here is [Bronwen Grimes](http://www.bronwengrimes.com) explaining how Valve Software achieved different color variations of different zombie parts, which simple tinting couldn't deliver well enough.

<figure>
	<video width="960" height="540" controls><source src="left4dead_Gradients.mp4" type="video/mp4"></video>
	<figcaption>Video: Creating Zombie variation using gradient ramps
	<br>
	Source: Excerpt from <a href="https://www.gdcvault.com/play/1012264/Shading-a-Bigger-Better-Sequel">"Shading a Bigger, Better Sequel: Techniques in Left 4 Dead 2"</a><br>GDC 2010 talk by <a href="http://www.bronwengrimes.com">Bronwen Grimes</a>
	</figcaption>
</figure>

Checkout the [full talk](https://www.gdcvault.com/play/1012264/Shading-a-Bigger-Better-Sequel) on the GDC page, if you are interested such techniques.
<blockquote class="reaction"><div class="reaction_text">The creativity of them using "Exclusive Masking" blew me away. First time I learned about it. Two textures in one channel, set to specific ranges<br>(Texture 1: 0-128, Texture 2: 128-256) at the cost of color precision</div><img class="kiwi" src="/assets/kiwis/love.svg"></blockquote>

#### Precalculating calculations
One more use for 1D LUTs in graphics programming is to cache expensive calculations. One such example is [Gamma correction](https://en.wikipedia.org/wiki/Gamma_correction), especially if the standard conform [sRGB piece-wise curve instead of the Gamma 2.2 approximation](https://www.colour-science.org/posts/srgb-eotf-pure-gamma-22-or-piece-wise-function/) is required.

Unless we talk about various approximations, gamma correction requires the use of the function [pow()](https://docs.gl/sl4/pow), which especially on older GPUs is a very expensive instruction. Add to that a branching path, if the piece-wise curve is needed. Or even worse, if you had to contend with the bananas level awful [4-segment piece-wise approximation the Xbox 360 uses](https://cdn.cloudflare.steamstatic.com/apps/valve/2008/GDC2008_PostProcessingInTheOrangeBox.pdf). Precalculating that into a 1D LUT is way to skip such per-pixel calculations. 

<img src="/assets/LUTs/Gamma/gamma2.2.png" id="lut" style="width: 100%; height: 64px;">
<img src="/assets/LUTs/Gamma/gamma2.2inv.png" id="lut" style="width: 100%; height: 64px;">

At the bottom of the LUT collection select box in chapter [So many colors](#so-many-colors), I included two gamma ramps for reference. Gamma 2.2 and inverse of Gamma 2.2. Whether or not there is benefit from accelerating gamma transformations via 1D LUTs is a question only answerable via benchmarking, but you could imagine other calculations, that would definitely benefit.

An example of this in the wild is tinting the monitor orange during night time [to prevent eye-strain](https://en.wikipedia.org/wiki/Biological_effects_of_high-energy_visible_light#Digital_filters), performed by Software like [Redshift](http://jonls.dk/redshift/). This works by changing the Gamma Ramp, a 1D LUT each for the Red, Green and Blue channel **of the monitor**. To do so it precalculates the Kelvin Warmth -> RGB and additional Gamma calculations by generating 3 1D LUTs, [as seen in Redshift's source code](https://github.com/jonls/redshift/blob/490ba2aae9cfee097a88b6e2be98aeb1ce990050/src/colorramp.c#L289).

<figure>
	<img src="nightlight.png" alt="Night Light feature in Android" />
	<figcaption>Night Light feature in Android</figcaption>
</figure>

The approach of Redshift and similar pieces of software is pretty awesome with its truly zero performance impact, as the calculations are done by the monitor, not the graphics card. Though support for this hardware interface is pretty horrible across the board these days and more often than not broken or unimplemented, with graphics stacks like the one of the Raspberry Pi working backwards and [losing support with newer updates](https://github.com/raspberrypi/firmware/issues/1274). Microsoft even warns [developers not to use that Gamma Hardware API](https://learn.microsoft.com/en-us/windows/win32/api/wingdi/nf-wingdi-setdevicegammaramp) with a warning box longer than the API documentation itself.

<blockquote class="reaction"><div class="reaction_text">Quite the sad state for a solution this elegant. A sign of the times, with hardware support deemed too shaky and more features becoming software filters.</div><img class="kiwi" src="/assets/kiwis/sad.svg"></blockquote>

### Camera 3D LUTs
Let's go 3D. 3D LUTs are well covered by many articles, blogs and videos, so I will plow though the basics and focus on more complex workflows.

#### The basic theory
The origin is in the top left, because in OpenGL and WebGL, the texture coordinates are layed out that way.
<figure>
	<img src="3DLut.png">
	<figcaption>3D LUT, in its 2D representation, 32³px cube as a 1024px x 32px strip</figcaption>
</figure>

<figure>
	<img src="32cube.png" alt="The above 3D LUT, displayed in 3D without interpolation" />
	<figcaption>The above 3D LUT, displayed in 3D without interpolation</figcaption>
</figure>


<blockquote class="reaction"><div class="reaction_text">You can change color balance with a 1D LUT for Red, Green and Blue. So what a 3D LUT can, that 3 1D LUTs cannot, isn't so obvious. 3D LUT cubes are needed for changes requiring a combination of RGB as input, like changes to saturation, hue, specific colors or to perform color isolation.</div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>

RGB Cube, where the cube X is Red, Y is Green, Blue is Z.
Some of them are even bought.

<figure>
	<video width="100%" height="480" autoplay playsinline muted controls loop id="gh6footage"><source src="Panasonic-Vlog.mp4" type="video/mp4"></video>
	<figcaption>Panasonic GH6 with "V-Log" logarithmic profile</figcaption>
</figure>

<img src="3DLut.png" id="3dlut" style="width: 100%">

<script  id="fragment_6" type="x-shader/x-fragment">{% rawFile "posts/WebGL-LUTS-made-simple/video-3Dlut.fs" %}</script>

<canvas width="100%" height="480" id="canvas_6"></canvas>

<script>setupTri("canvas_6", "vertex", "fragment_6", "gh6footage", "3dlut");</script>
<blockquote>
<details><summary>WebGL Vertex Shader <a href="fullscreen-tri.vs">fullscreen-tri.vs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}
```

</details>
<details>	
<summary>WebGL Fragment Shader <a href="video-3Dlut.fs">video-3Dlut.fs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/video-3Dlut.fs" %}
```

</details>
<details>	
<summary>WebGL Javascript <a href="fullscreen-tri.js">fullscreen-tri.js</a></summary>

```javascript
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.js" %}
```

</details>
</blockquote>

You may actually notice an issue with a blue shift, due to Z Slice precision
https://webglfundamentals.org/webgl/lessons/webgl-qna-how-to-simulate-a-3d-texture-in-webgl.html
version is wrong

<img src="3DLutDavinci.png" id="3dlutDavinci" style="width: 100%">

<script  id="fragment_7" type="x-shader/x-fragment">{% rawFile "posts/WebGL-LUTS-made-simple/video-3Dlut.fs" %}</script>

<canvas width="684" height="480" style="width: unset; max-width: 100%" id="canvas_7"></canvas>

<script>setupTri("canvas_7", "vertex", "fragment_7", "gh6footage", "3dlutDavinci");</script>
<blockquote>
<details><summary>WebGL Vertex Shader <a href="fullscreen-tri.vs">fullscreen-tri.vs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}
```

</details>
<details>	
<summary>WebGL Fragment Shader <a href="video-3Dlut.fs">video-3Dlut.fs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/video-3Dlut.fs" %}
```

</details>
<details>	
<summary>WebGL Javascript <a href="fullscreen-tri.js">fullscreen-tri.js</a></summary>

```javascript
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.js" %}
```

</details>
</blockquote>

<img src="3DLutDavinci_Film.png" id="3dlutDavinci_Film" style="width: 100%">

<script  id="fragment_8" type="x-shader/x-fragment">{% rawFile "posts/WebGL-LUTS-made-simple/video-3Dlut.fs" %}</script>

<canvas width="684" height="480" style="width: unset; max-width: 100%" id="canvas_8"></canvas>

<script>setupTri("canvas_8", "vertex", "fragment_8", "gh6footage", "3dlutDavinci_Film");</script>
<blockquote>
<details><summary>WebGL Vertex Shader <a href="fullscreen-tri.vs">fullscreen-tri.vs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}
```

</details>
<details>	
<summary>WebGL Fragment Shader <a href="video-3Dlut.fs">video-3Dlut.fs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/video-3Dlut.fs" %}
```

</details>
<details>	
<summary>WebGL Javascript <a href="fullscreen-tri.js">fullscreen-tri.js</a></summary>

```javascript
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.js" %}
```

</details>
</blockquote>

### 入力ファイル

使っているファイルは黒白のサーマルカメラの信号です。あの動画の設定は自動的に一番温かい温度白になって、一番温度が低い温度が黒になる。その範囲の最低限は各瞬間です。このファイルは下のシェーダーの入力ですので、ポーズしないでください。自分の動画を使いたい場合、下のボタンで動画を変更することができます。

<blockquote class="reaction"><div class="reaction_text">再生されない場合、<b>再生を自分でスタートしてください</b>。色々なブラウザーがスクロールの時に動画をストップするから、手動でスタートしなければいけません。</div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>

動画の由来： https://arxiv.org/abs/2308.10991

再生されない場合、**手動で上の動画をスタートしてください！** 私は`Autoplay`すると、スクロールの時にエネルギーの節約のために`Autoplay`の場合、デバイスによって、動画がストップされてしまう。

### グラフィクスカードへ！

今は、WebGL で一番シンプルなシェーダーで動画をグラフィクスチップにアップロードして、映っています。動画の内容はまだ同じですけど。下の部分で全部のコードを見えます。私達には大切なやつは「Fragment シェーダー」です。そのシェーダーはカラーに影響をする。

### パーフォーマンス

[グラフィックスパイプライン](https://ja.wikipedia.org/wiki/%E3%82%B0%E3%83%A9%E3%83%95%E3%82%A3%E3%83%83%E3%82%AF%E3%82%B9%E3%83%91%E3%82%A4%E3%83%97%E3%83%A9%E3%82%A4%E3%83%B3)ではそのステップは無料です。[冗談ではありません](https://www.youtube.com/watch?v=NFMmSOWPj_k&t=60s)、全部の世界のグラフィックスのチップで、テクスチャーサンプリング（または「タップ」）が比較的高いけど、あのカラーにするステップは「テクスチャーのタップ」と比べて、測定ができません。どっちにしろ、画面で何か見えるように、[サンプリング](https://docs.unity3d.com/ja/2018.4/Manual/SL-SamplerStates.html)が必要ですので、次のステップはパフォーマンスから見ると、無料。画像は 250x250px、4096x4096、２００億万ピクセル x ２００億万ピクセルでも、パフォーマンスには影響がありません。一番高いことは動画を見せることです。ですが、それはどっちにしろ必用です。グラフィックスパイプラインは具体的な固定な構築がありますから、あのオレンジの掛け算があるにもかかわらず、パーフォーマンスの変更がでありません。

```glsl
vec3 finaruKaraa = vec3(videoColor.rgb) * vec3(1.0, 0.5, 0.0);
```

<blockquote class="reaction"><div class="reaction_text">「無料」という単語はちょっと違うかも。計算時間は同じから、「測定ができない」はもっといいだろう。ですが、固定なグラフィックスパイプラインの計算時間から見ると、色々な計算が文脈のよって、計算時間に影響しない。だから、この文脈で、無料。</div><img class="kiwi" src="/assets/kiwis/think.svg"></blockquote>

[OpenLara DIV](https://github.com/XProger/OpenLara/commit/e9ba3a278499fd61768a6ab148b72d9f7d5d5828)

<iframe width="100%" style="aspect-ratio: 1.78;" src="https://www.youtube.com/embed/_GVSLcqGP7g?si=NST1tXJb7_oB3acl&amp;start=303" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>