---
wip: true
title: Video Game Blurs (and how the best one works)
permalink: "/{{ page.fileSlug }}/"
date: 2025-09-01
last_modified:
description: How to build realtime blurs with good performance and how one of the best algorithms out there works - "Dual Kawase"
publicTags:
  - Graphics
  - WebGL
  - GameDev
image: img/thumbnail.png
---

<!-- 
- Setup
- Box Blur
- Ok, what is a convolution?
- Gaussian Blur
	- Binomial
- We have still a performance problem
  - How do we measure it?
- Slow down, what is even the difference between bokeh and gaussian like algorithms
- The magic of frequency space
- Separability
- What is Bilinear? What is Performance "Free"?
- Down sampling
- Kawase Blur
- Dual Kawase
- Talks, state of the art, CoD flickering fix vs CS2 still having that problem
 -->

{% include "./demos/init.htm" %}

Blurs are the basic building block for many [video game post processing effects](https://en.wikipedia.org/wiki/Video_post-processing#Uses_in_3D_rendering) and essential for sleek and modern [GUIs](https://en.wikipedia.org/wiki/Graphical_user_interface). Video game [Depth of Field](https://dev.epicgames.com/documentation/en-us/unreal-engine/depth-of-field-in-unreal-engine) and [Bloom](https://en.wikipedia.org/wiki/Bloom_(shader_effect)) or [frosted panels](https://blog.frost.kiwi/GLSL-noise-and-radial-gradient/#microsoft-windows-acrylic) in modern user interfaces - used subtly or obviously - they're everywhere. <span style="transition: filter 0.2s; filter: none" onmouseover="this.style.filter='blur(4px)'" onmouseout="this.style.filter='none'">Even your browser can do it, just tap this sentence!</span>

<figure>
	<img src="img/intro.png" alt="Texture coordinates, also called UV Coordinates or UVs for short" />
	<figcaption>Effect of "<a href="https://en.wikipedia.org/wiki/Bloom_(shader_effect)" target="_blank">Bloom</a>", one of many use-cases for blur algorithms</figcaption>
</figure>

Conceptually, *"Make thing go blurry"* is easy, boiling down to some form of *"average colors in radius"*. Doing so in [realtime](https://en.wikipedia.org/wiki/Real-time_computing) however, took many a graphics programmer through decades upon decades of research and experimentation, across computer science and maths. In this article, we'll follow their footsteps.

<blockquote class="reaction"><div class="reaction_text">A graphics programming time travel, if you will.</div><img class="kiwi" src="/assets/kiwis/cyber.svg"></blockquote>

Using the [GPU](https://en.wikipedia.org/wiki/Graphics_processing_unit) in the device you are reading this article on, and the [WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API) capability of your browser, we'll implement realtime blurring techniques and retrace the trade-offs graphics programmers had to make in order to marry two, sometimes opposing, worlds: **Mathematical theory** and **Technological reality**.

<blockquote class="reaction"><div class="reaction_text">This is my submission to this year's <a target="_blank" href="https://some.3b1b.co/">Summer of Math Exposition</a></div><img class="kiwi" src="img/SOMELogo.svg"></blockquote>

With many interactive visualizations to guide us, we'll journey through a bunch of blurs, make a detour through frequency space manipulations, torture your graphics processor to measure performance, before finally arriving at a product of years worth of cumulative graphics programmer sweat - The ✨ Dual Kawase Blur 🌟

## Setup - No blur yet
In the context of video game post processing, a 3D scene is drawn, also called [rendering](https://en.wikipedia.org/wiki/Rendering_(computer_graphics)), and saved to an intermediary image - a [framebuffer](https://learnopengl.com/Advanced-OpenGL/Framebuffers). In turn, this framebuffer is processed to achieve [various effects](https://en.wikipedia.org/wiki/Video_post-processing#Uses_in_3D_rendering). Since this *processing* happens *after* a 3D scene is rendered, it's called *post-processing*. All that, _many_ times a second.

<blockquote class="reaction"><div class="reaction_text"><strong>Depending on technique</strong>, framebuffers <a target="_blank" href="https://learnopengl.com/Advanced-Lighting/Deferred-Shading">can hold non-image data</a> and post-processing effects like <a target="_blank" href="https://en.wikipedia.org/wiki/Color_correction">Color-correction</a> or <a target="_blank" href="https://en.wikipedia.org/wiki/Tone_mapping">Tone-mapping</a> don't even require intermediate framebuffers: There's <a target="_blank" href="https://takahirox.github.io/three.js/examples/webgl_tonemapping.html">more</a> than <a target="_blank" href="https://gdcvault.com/play/1020631/The-Revolution-in-Mobile-Game">one way (@35:20)</a></div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

This is where we jump in: with a framebuffer in hand, after the 3D scene was drawn. We'll use a scene from a [mod](https://en.wikipedia.org/wiki/Video_game_modding) called [NEOTOKYO°](https://store.steampowered.com/app/244630/NEOTOKYO/). Each time we'll implement a blur, there will be a box, a [canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas) instructed with [WebGL 1.0](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API), rendering at [**native** resolution](https://en.wikipedia.org/wiki/1:1_pixel_mapping) of your device. Each box has controls and relevant parts of its code below.

<blockquote class="reaction"><div class="reaction_text">No coding or graphics programming knowledge required to follow along. But also no curtains! You can always see <a target="_blank" href="https://www.youtube.com/watch?v=ONH-pxBMJu4">how we talk</a> with your GPU. Terms and meanings will be explained, once it's relevant.</div><img class="kiwi" src="/assets/kiwis/speak.svg"></blockquote>

{% include "./demos/simple.htm" %}

We don't have a blur implemented yet, not much happening. Above the box you have an `Animate` button, which will move the scene around to tease out problems of upcoming algorithms. Movement happens **before** our blur will be applied, akin to the player character moving. To see our blur in different use-cases, there are 3 modes:

<blockquote class="reaction"><div class="reaction_text">Different blur algorithms behave differently based on use-case. Some are very performance efficient, but break under movement. Some reveal their flaws with small, high contrast regions like far-away lights</div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>

- In `Scene` mode the blur will be applied across the whole image
- In `Lights` mode we see and blur just the [Emission](https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/principled.html#emission) parts of the scene, referred to by its older name "[Self-Illumination](https://developer.valvesoftware.com/wiki/Glowing_textures_(Source)#$selfillum)" in the [3D game engine](Game_engine) used by the mod, the [Source Engine](https://developer.valvesoftware.com/wiki/Source)
  - This also unlocks the `lightBrightness` slider, where you can boost the energy output of the lights
- In `Bloom` mode, we use the original scene and add the blurred lights from the previous mode on top to create a moody scene. This implements the effect of [Bloom](https://en.wikipedia.org/wiki/Bloom_(shader_effect)), an important use-case for blurs in real-time 3D graphics

<blockquote class="reaction"><div class="reaction_text">Adding the blurred emission <a target="_blank" href="https://chrismillervfx.wordpress.com/2013/04/15/understanding-render-passes/">pass</a> as we do in this article, or <a target="_blank" href="https://en.wikipedia.org/wiki/Thresholding_(image_processing)">thresholding</a> the scene and blurring that, is <strong>not</strong> actually how modern video games do bloom. We'll get into that a bit later.</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

Finally, you see [Resolution](https://en.wikipedia.org/wiki/Image_resolution) of the canvas and [Frames per Second / time taken per frame, aka "frametime"](https://en.wikipedia.org/wiki/Frame_rate). A very important piece of the puzzle is ***performance***, which will become more and more important as the article continues and the [mother of invention](https://en.wikipedia.org/wiki/Necessity_is_the_mother_of_invention) behind our time travel story.

<blockquote class="reaction"><div class="reaction_text">Frame-rate will be capped at your screen's <a target="_blank" href="https://www.intel.com/content/www/us/en/gaming/resources/highest-refresh-rate-gaming.html">refresh rate</a>, most likely 60 fps / 16.6 ms. We'll get into proper <a target="_blank" href="https://en.wikipedia.org/wiki/Benchmark_(computing)">benchmarking</a> as our hero descents this article into blurry madness</div><img class="kiwi" src="/assets/kiwis/book.svg"></blockquote>

### Technical breakdown

<blockquote class="reaction"><div class="reaction_text">Understanding the GPU code is not necessary to follow this article, but if you do choose to peek behind the curtain, here is what you need to know</div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>

We'll implement our blurs as a [fragment shader](https://learnopengl.com/Getting-started/Hello-Triangle) written in [GLSL](https://en.wikipedia.org/wiki/OpenGL_Shading_Language). In a nut-shell, a fragment shader is code that runs on the GPU for every output-pixel, in-parallel. Image inputs in shaders are called [Textures](https://learnopengl.com/Getting-started/Textures). These textures have coordinates, often called [UV coordinates](https://en.wikipedia.org/wiki/UV_mapping) - _these_ are the numbers we care about.

<blockquote class="reaction"><div class="reaction_text">Technically, fragment shaders run per <a target="_blank" href="https://www.khronos.org/opengl/wiki/Fragment">fragment</a>, which aren't necessarily pixel sized and there are <a target="_blank" href="https://registry.khronos.org/OpenGL/extensions/EXT/EXT_shader_framebuffer_fetch.txt">other ways</a> to read framebuffers, but none of that matters in the context of this article.</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

<figure>
	<img src="img/UV.svg" alt="Texture coordinates, also called UV Coordinates or UVs for short" />
	<figcaption>Texture coordinates, also called "UV" Coordinates or "UVs" for short<br>Note the squished appearance of the image</figcaption>
</figure>

UV coordinates specify the position we read in the image, with bottom left being `0,0` and the top right being `1,1`. Neither UV coordinates, nor shaders themselves have any concept of image resolution, screen resolution or aspect ratio. If we want to address individual pixels, it's on us to express that in terms of UV coordinates.

<blockquote class="reaction"><div class="reaction_text">Although <a target="_blank" href="https://michaldrobot.com/2014/04/01/gcn-execution-patterns-in-full-screen-passes/">there are ways to find out</a>, we don't know which order output
 pixels are processed in and although the <a target="_blank" href="https://docs.gl/sl4/gl_FragCoord">graphics pipeline can tell us</a>, the shader doesn't even know which output pixel it currently processes</div><img class="kiwi" src="/assets/kiwis/book.svg"></blockquote>

The framebuffer is passed into the fragment shader in line `uniform sampler2D texture` as a texture. Using the blur shader, we draw a "Full Screen Quad", a rectangle covering the entire canvas, with matching `0,0` in the bottom-left and `1,1` in the top-right `varying vec2 uv` UV coordinates to read from the texture.

The texture's aspect-ratio and resolution are the same as the output canvas's aspect-ratio and resolution, thus there is a 1:1 pixel mapping between the texture we will process and our output canvas. The [graphics pipeline steps](js/blur/simple.js) and [vertex shader](shader/simpleQuad.vs) responsible for this are not important for this article.

The blur fragment shader accesses the color of the texture with `texture2D(texture, uv)`, at the matching output pixel's position. In following examples, we'll read from neighboring pixels, for which we'll need to calculate a UV coordinate offset, a decimal fraction corresponding to one pixel step with "one, divided by canvas resolution"

<blockquote class="reaction"><div class="reaction_text">One way to think of fragment shader code is "What are the instructions to construct this output pixel?"</div><img class="kiwi" src="/assets/kiwis/think.svg"></blockquote>

Graphics programming is [uniquely challenging](https://www.youtube.com/watch?v=xJQ0qXh1-m0) in the beginning, because of how many rules and limitations the hardware, [graphics APIs](https://en.wikipedia.org/wiki/Graphics_library) and the [rendering pipeline](https://fgiesen.wordpress.com/2011/07/09/a-trip-through-the-graphics-pipeline-2011-index/) impose. But it also unlocks incredible potential, as other limitations dissolve. Let's find out how graphics programmers have leveraged that potential.

## Box Blur
From a programmer's perspective, the most straight forward way is to average the neighbors of a pixel using a [for-loop](https://en.wikipedia.org/wiki/For_loop). What the fragment shader is expressing is: "_look X pixels up, down, left, right and average the colors_". The more we want to blur, the more we have to increase `kernelSize`, the bounds of our for-loop.

```glsl
/* Read from the texture y amount of pixels above and below */
for (int y = -kernel_size; y <= kernel_size; ++y) {
/* Read from the texture x amount of pixels to the left and the right */
	for (int x = -kernel_size; x <= kernel_size; ++x) {
		/* Offset from current pixel, indicating which pixel to read */
		vec2 offset = vec2(x, y) * samplePosMult * frameSizeRCP;
		/* Read and sum up the color contribution of that pixel */
		sum += texture2D(texture, uv + offset);
	}
}
```

The bigger the for-loop, the more texture reads we perform, **per output-pixel**. Each texture read is often called a "texture tap" and the total amount of those "taps" per-frame will now also be displayed. New controls, new `samplePosMultiplier`, new terms - Play around with them, get a feel for them, with a constant eye on FPS.

{% include "./demos/boxBlur.htm" %}

Visually, the result doesn't look very pleasant. The stronger the blur, the more "boxy" image features become. This is due to us reading and averaging the texture in a square shape. Especially in bloom mode, with strong `lightBrightness` and big `kernelSize`, lights become literally squares.

Performance is also really bad. With bigger `kernelSizes`, our `Texture Taps` count skyrockets and performance drops. Mobile devices will come to a slog. Even the worlds fastest PC graphics cards will fall below screen refresh-rate by cranking `kernelSize` and zooming the article on PC, thus raising canvas resolution.

<blockquote class="reaction"><div class="reaction_text">We kinda failed on all fronts. It looks bad <strong>and</strong> runs bad.</div><img class="kiwi" src="/assets/kiwis/tired.svg"></blockquote>

Then, there's this `samplePosMultiplier`. It seems to *also* seemingly increase blur strength, *without* increasing textureTaps or lowering performance (or lowering performance just a little on certain devices). But if we crank *that* too much, we get artifacts in the form of repeating patterns. Let's play with a schematic example:

<!-- <blockquote class="reaction"><div class="reaction_text">What you may have noticed, is that increasing the sample Multiplier just a little bit, between 100% and 150% does not introduce artifacts. Something deeper is happening. Put at a pin in that...</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote> -->

- The white center square represents the output pixel
- Grey squares are the pixels we would read, with the current `kernelSize`, with `samplePosMult` untouched
- the black dots are our *actual* texture reads ***per-output-pixel***, our "sample" positions

{% include "./demos/boxKernelViz.htm" %}

On can say, that an image is a "continous 2D signal". When we texture tap at a specific coordinate, we are _sampling the "image signal" at that coordinate_. As previously mentioned, we use UV coordinates and are not bound by concepts like "pixels". ***Where*** we place our samples is completely up to us.

A fundamental blur algorithm option is increasing the sample distance away from the center, thus increasing the amount of image we cover with our samples - more bang for your sample buck. This works by multiplying the offset distance. That is what `samplePosMult` does and is something you will have access to going forward.

Doing it too much, brings ugly repeating patterns. This of course leaves some fundamental questions, like where these artifacts come from and what it even means to read between two pixels. ***And*** on top of that we have to address performance and the boxyness of our blur! But first...

## What even _is_ a kernel?
What we have created with our for-loop, is a [convolution](https://www.youtube.com/watch?v=KuXjwB4LzSA0). Expressed simplified in the context of image processing, it's usually a square of numbers constructing an output pixel, by gathering and weighting pixels the square covers. The square is called a kernel and was the thing we visualized previously.

For blurs, the kernel weights must sum up to 1. If that were not the case, we would either brighten or darken the image. Ensuring that is the normalization step. In the box blur above, this happens by dividing the summed pixel color by `totalSamples`, the total amount of samples taken. A basic "calculate the average" expression.

The same can be expressed as weights of a kernel, a number multiplied with each sample at that position. Since the box blur weighs all sample the same regardless of position, all weights are the same. This is visualized next. The bigger the kernel size, the smaller the weights.

{% include "./demos/boxKernelVizWidthWeights.htm" %}

Kernels applied at the edges of our image will read from areas "outside" the image, with UV coordinates smaller than `0,0` and bigger than `1,1`. Luckily, the GPU handles this for us and we are free to decide what happens to those outside samples, by setting the [Texture Wrapping mode](https://learnopengl.com/Getting-started/Textures#:~:text=Texture%20Wrapping).

<figure>
	<img src="img/WrappingModes.png" alt="Texture Wrapping Modes and results on blurring" />
	<figcaption>Texture Wrapping Modes and results on blurring<br>Top: Framebuffer, zoomed out. Bottom: Framebuffer normal, with strong blur applied</figcaption>
</figure>

Among others, we can define a solid color to be used or to "clamp" to the nearest edge's color. If we choose a solid color, then we will get color bleeding at the edges. Thus for almost all post-processing use-cases, edge color clamping is used, as it prevents weird things happening at the edges. [This article does too](https://github.com/FrostKiwi/treasurechest/blob/main/posts/dual-kawase/js/utility.js#L49).

<blockquote class="reaction"><div class="reaction_text">You may have noticed a black "blob" streaking with stronger blur levels along the bottom. Specifically here, it happens because the lines between the floor tiles align with the bottom edge, extending black color to infinity</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

Convolution as a mathematical concept is surprisingly deep and [3blue1brown](https://www.youtube.com/@3blue1brown) has an excellent video on it, that even covers the image processing perspective. Theoretically, we won't depart from convolutions. We ***can*** dissect our code and express it as weights and kernels. With the for-loop box blur, that ***was*** quite easy!
<figure>
	<iframe width="100%" style="aspect-ratio: 1.78;" src="https://www.youtube-nocookie.com/embed/KuXjwB4LzSA" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>
	<figcaption>But what is a convolution?<br><a target="_blank" href="https://www.youtube.com/watch?v=KuXjwB4LzSA">YouTube Video</a> by <a target="_blank" href="https://www.youtube.com/@3blue1brown">3Blue1Brown</a></figcaption>
</figure>

On a practical level though, understanding where the convolution is, how many there are and what kernels are at play will become more and more difficult, except for the Gaussian blur in the next chapter. Speaking of which...

## Gaussian Blur
The most famous of blur algorithms is the Gaussian Blur. It uses the [normal distribution](https://en.wikipedia.org/wiki/Normal_distribution), also known as the [bell Curve](https://en.wikipedia.org/wiki/Normal_distribution) to weight the samples inside the kernel, with a new variable `sigma σ` to control the flatness of the curve. Other than generating the kernel weights, the algorithm is identical to the box blur algorithm.

<figure>
	{% include "./img/gaussianForumla.svg" %}
	<figcaption>Gaussian blur weights formula for point <code>(x,y)</code>, <a target="_blank" href="https://en.wikipedia.org/wiki/Gaussian_blur#Mathematics">Source</a></figcaption>
</figure>

To calculate the weights for point `(x,y)`, the [above formula is used](https://en.wikipedia.org/wiki/Gaussian_blur#Mathematics). The gaussian formula and has a weighting multiplier `1/√(2πσ²)`. In the code, there is no such thing though. The formula expresses the gaussian curve as a _continuous_ function going to _infinity_. But our code and its for-loop are different - ***discrete*** and ***finite***.

```glsl
float gaussianWeight(float x, float y, float sigma)
{
	/* (x² + y²) / 2 σ² */
	return exp(-(x * x + y * y) / (2.0 * sigma * sigma));
}
```

<blockquote class="reaction"><div class="reaction_text">For clarity, the kernel is generated in the fragment shader. Normally, that should be avoided. Code in the fragment shader runs on every pixel, but the kernel doesn't actually change, making this inefficient.</div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>

Just like with the box blur, weights are summed up and divided at the end, instead of the precalculated weighting term `1/√(2πσ²)`. `sigma` controls the sharpness of the curve and thus the blur strength, but wasn't that the job of `kernelSize`? Play around with all the values below and get a feel for how the various values behave.

{% include "./demos/gaussianBlur.htm" %}

The blur looks way smoother than our previous box blur, with things generally taking on a "rounder" appearance, due to the bell curve's smooth signal response. That is, unless you move the `sigma` slider down. If you move `sigma` too low, you will get our previous box blur like artifacts again. 

Let's clear up what the values actually represent and how they interact. The following visualization shows the kernel with their weights expressed as height in an [~~Isometric~~](https://en.wikipedia.org/wiki/Isometric_projection) [Dimetric](https://en.wikipedia.org/wiki/Axonometric_projection#Three_types) projection. There are two different `sigma` - `kernelSize` interaction modes and two ways to describe `sigma`.

{% include "./demos/gaussianKernelViz.htm" %}

`sigma` describes the flatness of our mathematical curve, a curve going to infinity. But our algorithm has a limited `kernelSize`. Where the kernel stops, no more contributions pixel contributions occur, leading box-like artifacts. In the context of image processing, there are two to setup a gaussian blur...

<blockquote class="reaction"><div class="reaction_text">A small sigma, thus a flat bell curve, paired with a small kernel size effectively <strong>is</strong> a box blur, with the weights making the kernel box-shaped.</div><img class="kiwi" src="/assets/kiwis/think.svg"></blockquote>

...with an [Absolute Sigma](https://www.youtube.com/watch?v=ueNY30Cs8Lk), an absolute value in pixels independent of `kernelSize`, with `kernelSize` acting as a "window into the curve" or as a value ***relative*** to the current `kernelSize`. For practical reasons of having to fiddle around in absolute sigma mode, the relative to `kernelSize` mode is used everywhere.

Eitherway, the infinite gaussian curve ***will*** have a cut-off _somewhere_. `sigma` too small? - We get box blur like artifacts. `sigma` too big? - We waste blur efficiency, as the same perceived blur strength requires bigger kernels, thus bigger for-loops with lower performance. An artistic trade-off every piece of software has to make.

<blockquote class="reaction"><div class="reaction_text">An optimal kernel would be one, where the outer weights are almost zero. Thus if we increased <code>kernelSize</code> in Absolute Sigma mode by one, it would make close to no more <strong>visual</strong> difference.</div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>

There are other ways of creating blur kernels, with other properties. One way is to follow [Pascal's triangle](https://en.wikipedia.org/wiki/Pascal%27s_triangle) to get a set of predefined kernel sizes and values. These are called [Binomial Filters](https://bartwronski.com/2021/10/31/practical-gaussian-filter-binomial-filter-and-small-sigma-gaussians/) and lock us into specific "kernel presets", but solve the infinity vs cut-off dilemma, by moving weights to zero within the sampling window.

Binomial Kernels are also Gaussian-like in their frequency response. We won't expand on these further, just know that we ***can*** choose kernels by different mathematical criteria, chasing different signal response properties. But speaking of which, what even *is* Gaussian Like? Why do we care?

### What is Gaussian-like?
In Post-Processing Blur algorithms you generally find two categories. [Bokeh](https://en.wikipedia.org/wiki/Bokeh) Blurs and Gaussian-Like Blurs. The gaussian is chosen for its natural appearance, its ability to smooth colors without "standout features". Gaussian Blurs are generally used as an ingredient in an overarching visual effect, be it frosted glass Interfaces or Bloom.

<figure>
	<img src="img/gaussianLike.png" alt="Bokeh blur, gaussian blur comparison" />
	<figcaption>Bokeh Blur and Gaussian Blur compared.</figcaption>
</figure>

In contrast to that, when emulating lenses and especially in the context of [Depth of Field](https://dev.epicgames.com/documentation/en-us/unreal-engine/depth-of-field-in-unreal-engine), is "[Bokeh Blur](https://dev.epicgames.com/documentation/en-us/unreal-engine/cinematic-depth-of-field-method?application_version=4.27)", also known as "Lens Blur" or "Cinematic Blur". This type of blur ***is*** the target visual effect. The challenges and approaches are very much related, but algorithms used differ.

Algorithms get really creative in this space, all with different trade-offs and visuals. Some sample using texture, some sample using a [poission disk distribution](https://mynameismjp.wordpress.com/2011/02/28/bokeh/) and some have cool out of the box thinking: Computerphile covered a comlex numbers based approach to creating Bokeh Blur, a fascinating number theory cross-over.

<figure>
	<iframe width="100%" style="aspect-ratio: 1.78;" src="https://www.youtube-nocookie.com/embed/vNG3ZAd8wCc" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>
	<figcaption>Video Game & Complex Bokeh Blurs<br><a target="_blank" href="https://www.youtube.com/watch?v=vNG3ZAd8wCc">YouTube Video</a> by <a target="_blank" href="https://www.youtube.com/@Computerphile">Computerphile</a></figcaption>
</figure>

This article though doesn't care about stylistics approaches. We are here to chase a basic building block of graphics programming and realtime visual effects, a "Gaussian-Like" with good performance. Speaking of which!

## Performance
The main motivator of our journey here, is the chase of realtime performance. Everything we do must happen within milliseconds. The expected performance of an algorithm and the practical cost once placed in the graphics pipeline, are sometimes surprisingly different numbers.

With performance being such a driving motivator going forward, it would be a shame if we couldn't measure it. Each WebGL Box has a benchmark function, which blurs random noise at a fixed resolution of `1600x1200` with the respective blur settings you chose and a fixed iteration count.

Benchmarking can be done by fixing time and performing 

Measuring performance on the Performance measurements via [`EXT_disjoint_timer_query_webgl2`](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/) are pretty reliable, but only supported on Desktop Chrome. So for the sake of comparability, we do it the only way that is guaranteed to sync, [`gl.readPixels()`](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/readPixels)

Normally, a benchmark would 
This feature is currently hidden and can be unhidden with the following button, for all WebGLBoxes with blurs.

On Desktop GPUs and Laptop GPUs, you will additionally see, that increasing `samplePosMultiplier` will negatively impact performance (up to a point), even though the required texture reads stay the same. This is due hardware texture caches accelerating texture reads which are spatially close together and not being able to do so effectively, if the texture reads are all too far apart.

<blockquote>⚠️ Especially on mobile, <strong>please</strong> increase iterations slowly and stay below a few seconds of execution time, or the browser will lock GPU access from this page and disable all blur examples, until a browser restart is performed.</blockquote>

With great power comes great responsibility.

<blockquote class="reaction"><div class="reaction_text">iOS and iPad OS are especially strict, will keep GPU access disabled, even on Tab Reload. You will have go to the App Switcher (Double Tap Home Button), Swipe Safari Up to close it and relaunch it from scratch.</div><img class="kiwi" src="/assets/kiwis/tired.svg"></blockquote>

{% include "./demos/benchmarkUnlock.htm" %}

From here on out, everything you see will be done by your device's GPU. You will see how many variables can be tuned and we will need to build quite a bunch of intuition.

We are in the realm of realtime graphics. Photoshop may only need to do one such iteration, but in real time graphics, we need this to work every frame.

When writing shaders, we don't care about execution order or.
These are convolutions, but we aren't actually bound by rules of the classical convolution implies.

Old info: In benchmark mode we run at 1600x1200. We _could_ use many [older](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/finish) and [newer](https://developer.mozilla.org/en-US/docs/Web/API/WebGLSync) GPU pipeline synchronization features of WebGL and measure just the time of the blur pass. Whilst you can double check if you get reliable numbers with platform specific debuggers like NV?? on one type of device, unfortunately, it's not possible in the general case and it's too easy to get not a number that measures now how long it took us to blur, but some other part of the GPU pipeline. Same goes for trying to find out how many iterations of blur we can run within X amount of time. Especially once on mobile Apple devices, getting reliable numbers goes out the window.

Especially dedicated Laptop GPUs are rather slow with getting out of their power saving state, so on some platforms, hitting the benchmark button twice in succession may produce faster results.

<blockquote class="reaction"><div class="reaction_text">The most basic of blur algorithms and <strong>already</strong> we have kernel size, sample placement, sigma, resolution - influencing visual style and performance. Changing one influences the others. It's too much. </div><img class="kiwi" src="/assets/kiwis/dead.svg"></blockquote>

## The magic of frequency space
There is actually an alternative way to perform blurring, by performing an [image Fast Fourier Transform](https://usage.imagemagick.org/fourier/#introduction), [masking high frequency areas to perform the blur](https://usage.imagemagick.org/fourier/#blurring) and finally performing the inverse transformation.

If we ignore the frequency domain transformation steps, then this makes the blurring step itself constant in time, regardless of blur radius! Small Radius Blur, Large Radius blur, all the same speed. But of course, we ***can't*** ignore the Frequency domain transformations.
Unfortunately, this cannot be used in practice, as the FFT and inverse FFT steps don't translate well into a graphics pipeline context at all. 

<figure>
	<iframe width="100%" style="aspect-ratio: 1.78;" src="https://www.youtube-nocookie.com/embed/spUNpyF58BY" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>
	<figcaption>But what is the Fourier Transform? A visual introduction.<br><a target="_blank" href="https://www.youtube.com/watch?v=spUNpyF58BY">YouTube Video</a> by <a target="_blank" href="https://www.youtube.com/@3blue1brown">3Blue1Brown</a></figcaption>
</figure>
3Blue1Brown covered what a Fourier Transform is, on its fundamental level was covered in [great detail in a video series already](https://www.youtube.com/watch?v=spUNpyF58BY).

Fourier code written by https://github.com/turbomaze/JS-Fourier-Image-Analysis

{% include "./demos/fftViz.htm" %}

As you see, the Magnitude representation holds mirrored information. This is because the Magnitude representation holds is in the complex plain, with X and Y.

<blockquote class="reaction"><div class="reaction_text">There is no standard on how you are supposed to plot the magnitude information, so you will see other software produce different meanings of X and Y. I changed the implementation by @turbomaze to follow the convention used by ImageMagick.</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

If you upload of grid paper, you will see strong points along the 

There *are* GPU implementations: https://github.com/rreusser/glsl-fft.

<blockquote class="reaction"><div class="reaction_text">Manipulations in frequency space are magic <strong>and</strong> cheap performance wise!</div><img class="kiwi" src="/assets/kiwis/party.svg"></blockquote>

<blockquote class="reaction"><div class="reaction_text">But taking the train to and from frequency space costs simply too much.</div><img class="kiwi" src="/assets/kiwis/sad.svg"></blockquote>

Make comparison to discrete cosine transform.

Besides the full fledged FFT, there is another frequency domain representation of image data you may know. DCT.

So in a way, our journey through frequency land was kinda useless in pursuit of good video game performance. But these techniques are established, highly useful techniques, which are irreplaceable pillars for many image processing techniques.

So there *is* a fundamental difference between cutting high frequencies in frequency space and the gaussian blur "taking high frequency energy and combining it to become low frequency energy". The two techniques are fundamentally different.

So Low Pass Filter ≠ Low Pass Filter

<blockquote class="reaction"><div class="reaction_text">This is a <strong>deep misunderstanding</strong> I held for years.<output></output></div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>


<blockquote class="reaction"><div class="reaction_text">Blurs and Bloom based on FFT Low Pass filtering would extinguish small lights like candles present in the 3D scene, by extinguishing the high frequency energy that is used to describe that light.<output></output></div><img class="kiwi" src="/assets/kiwis/think.svg"></blockquote>

## Gaussian Blur Separable

<figure>
	<iframe width="100%" style="aspect-ratio: 1.78;" src="https://www.youtube-nocookie.com/embed/SiJpkucGa1o" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>
	<figcaption>Separable Filters and a Bauble<br><a target="_blank" href="https://www.youtube.com/watch?v=SiJpkucGa1o">YouTube Video</a> by <a target="_blank" href="https://www.youtube.com/@Computerphile">Computerphile</a></figcaption>
</figure>

{% include "./demos/gaussianSeparable.htm" %}

Technically, there is a tradeoff with small kernels. Extra drawcall (Fullscreen drawcall, so actually really expensive), vs extra filtering.

Going forward, no reason to not be separable.

## Free Bilinear

{% include "./demos/bilinear.htm" %}

{% include "./demos/bilinearViz.htm" %}

Relate to https://www.youtube.com/watch?v=uRjf8ZP6rs8
Talk about gaussian linear.

## Downsampling

{% include "./demos/downsample.htm" %}

Skip Upsample has an effect, no way!
Illogical, but discovery by Masaki Kawase.

First time I read this, didn't understand it.

Smoother because, we interpolate multiple times.

Think, in a way, the jump directly up is more accurate! But also uglier.

## Kawase Blur

{% include "./demos/kawase.htm" %}

The diagonal sampling avoids harsh edges that pure box filters would create, leading to smoother gradients. Because of its diagonal nature, it is not separable.

https://gdcvault.com/play/1022664/Frame-Buffer-Postprocessing-Effects-in

## Dual Kawase Blur

{% include "./demos/dual-kawase.htm" %}

Invented by ARM's 

Added to KDE in 2018
https://web.archive.org/web/20220427124712/https://phabricator.kde.org/D9848

Still in KDE
https://invent.kde.org/plasma/kwin/-/tree/master/src/plugins/blur

Marius Bjørge picked it up and [did a talk in 2015](https://dl.acm.org/doi/10.1145/2776880.2787664) direct [video link](https://dl.acm.org/doi/suppl/10.1145/2776880.2787664/suppl_file/a184.mp4)

## Apple switches algorithms

Either reduced resolution, a switch to box blur with settings corresponding to the reduced resolution or guassian blur with a [small kernel but high sigma](https://usage.imagemagick.org/blur/#blur_args).
iPad 9th gen, iPadOS 18.4.1 10.2", 2160 x 1620 px --> 11x11 px
iPhone SE 34d gen, iOS 18.4.1, 1334 x 750 px --> 6x6 px

<figure>
	<video poster="vid/iPadSidebar_thumb.jpg" width="960" height="720" loop controls><source src="vid/iPadSidebar.mp4" type="video/mp4"></video>
	<figcaption>iPad sidebar blur</figcaption>
</figure>

<blockquote class="reaction"><div class="reaction_text">Apple misconfigured the blur switch on iPadOS, for the top right settings pull down. The switch happens too soon, regressing blur strength and resulting in a pulse like artifact.</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

Playdead used it to get HDR Bloom
[Low Complexity, High Fidelity - INSIDE Rendering](https://gdcvault.com/play/1023304/Low-Complexity-High-Fidelity-INSIDE)
Check against Jimenez 14 5:45 onwards

Main theory: https://www.rastergrid.com/blog/2010/09/efficient-gaussian-blur-with-linear-sampling/

This article kicked it off: [Link](https://www.rastergrid.com/blog/2010/09/efficient-gaussian-blur-with-linear-sampling/)

Marius Bjørge picked it up and [did a talk in 2015](https://dl.acm.org/doi/10.1145/2776880.2787664) direct [video link](https://dl.acm.org/doi/suppl/10.1145/2776880.2787664/suppl_file/a184.mp4)
Indepth article by Intel [link](https://www.intel.com/content/www/us/en/developer/articles/technical/an-investigation-of-fast-real-time-gpu-based-image-blur-algorithms.html) with Link to original ppt by Masaki Kawase.

Masaki Kawase 川瀬正樹 history goes back some time, including modding and a personal page with [high and low graphics settings](https://web.archive.org/web/20040201224946/http://www.daionet.gr.jp/~masa/index.html)

To be able to innovate in blurs today you need to be very deep in mathematics and signal theory **_and_** computer graphics. Just looking at the level of genius needed to get fast bokeh blur is kinda insane. Functions cancelling each-other out, complex number theory

https://www.youtube.com/watch?v=vNG3ZAd8wCc

CS2 has not handled highlights like Call of Duty's graphics team has, see ancient lights

To conclude this part, my recommendation is to *always consider the integral if you want to use any sigmas below 0.7*.

And for a further exercise for the reader, you can think of how this would change under some different reconstruction function (hint: it becomes a weighted integral, or an integral of convolution; for the box / nearest neighbor, the convolution is with a rectangular function).

[https://gangles.ca/2008/07/18/bloom-disasters/](https://gangles.ca/2008/07/18/bloom-disasters/)

## Bin

