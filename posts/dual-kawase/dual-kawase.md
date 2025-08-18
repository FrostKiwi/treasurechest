---
wip: true
title: Video Game Blurs (and how the best one works)
permalink: "/{{ page.fileSlug }}/"
date:
last_modified:
description:
publicTags:
  - Graphics
  - WebGL
  - GameDev
image:
---
Blurs are the basic building block for many [video game post processing effects](https://en.wikipedia.org/wiki/Video_post-processing#Uses_in_3D_rendering) and essential for sleek and modern [GUIs](https://en.wikipedia.org/wiki/Graphical_user_interface). Video game [Depth of Field](https://dev.epicgames.com/documentation/en-us/unreal-engine/depth-of-field-in-unreal-engine) and [Bloom](https://en.wikipedia.org/wiki/Bloom_(shader_effect)) or [frosted panels](https://blog.frost.kiwi/GLSL-noise-and-radial-gradient/#microsoft-windows-acrylic) in modern user interfaces - used subtly or obviously - they're everywhere. <span style="transition: filter 0.2s; filter: none" onmouseover="this.style.filter='blur(4px)'" onmouseout="this.style.filter='none'">Even your browser can do it, just tap this sentence!</span>

Conceptually, *"Make thing go blurry"* is easy, boiling down to some form of *"average colors in radius"*. Doing so in realtime however, took many a graphics programmer through decades upon decades of research and experimentation, across computer science and maths. In this article, we'll follow their footsteps.

<blockquote class="reaction"><div class="reaction_text">A graphics programming time travel, if you will.</div><img class="kiwi" src="/assets/kiwis/cyber.svg"></blockquote>

Using the [GPU](https://en.wikipedia.org/wiki/Graphics_processing_unit) in the device you are reading this article on, and the [WebGL](https://en.wikipedia.org/wiki/WebGL) capability of your browser, we'll implement realtime blurring techniques and retrace the trade-offs graphics programmers had to make in order to marry two, sometimes opposing, worlds: **Mathematical theory** and **Technological reality**. Let's dig in!

<blockquote class="reaction"><div class="reaction_text">This is my submission to this year's <a target="_blank" href="https://some.3b1b.co/">Summer of Math Exposition</a></div><img class="kiwi" src="img/SOMELogo.svg"></blockquote>

[https://gangles.ca/2008/07/18/bloom-disasters/](https://gangles.ca/2008/07/18/bloom-disasters/)

## Setup
In the context of video game post processing, a 3D scene is drawn (a step called rendering) and saved to an intermediary image - a [framebuffer](https://learnopengl.com/Advanced-OpenGL/Framebuffers). In turn this framebuffer's content can be processed to achieve [various effects](https://en.wikipedia.org/wiki/Video_post-processing#Uses_in_3D_rendering). Since this *processing* happens *after* a 3D scene is rendered, it's called *post-processing*.

<blockquote class="reaction"><div class="reaction_text"><strong>Depending on technique</strong>, framebuffers <a target="_blank" href="https://en.wikipedia.org/wiki/Deferred_shading">can hold non-image data</a> and post-processing effects like <a target="_blank" href="https://en.wikipedia.org/wiki/Color_correction">Color-correction</a> or <a target="_blank" href="https://en.wikipedia.org/wiki/Tone_mapping">Tone-mapping</a> don't even require intermediate framebuffers. <a target="_blank" href="https://takahirox.github.io/three.js/examples/webgl_tonemapping.html">More</a> than <a target="_blank" href="https://developer.arm.com/documentation/100587/0101/Pixel-Local-Storage/About-Pixel-Local-Storage">one way</a> to skin a cat.</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

This is where we jump in, with a framebuffer in hand, after the 3D scene was drawn. We will use a scene from the mod [NeoTokyo°](https://store.steampowered.com/app/244630/NEOTOKYO/). Each time we implement something, there will be a WebGL box, rendering at [native resolution](https://en.wikipedia.org/wiki/1:1_pixel_mapping) of your device.

<blockquote class="reaction"><div class="reaction_text">According to WebGL, your GPU is a <output></output></div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>

Compared to other disciplines, graphics programming is [uniquely challenging](https://www.youtube.com/watch?v=xJQ0qXh1-m0) in the beginning, because of how many rules and limitations the hardware, [graphics APIs](https://en.wikipedia.org/wiki/Graphics_library) and the [rendering pipeline](https://fgiesen.wordpress.com/2011/07/09/a-trip-through-the-graphics-pipeline-2011-index/) impose.

<blockquote class="reaction"><div class="reaction_text">No graphics programming knowledge required to follow along.</div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>

We'll implement our blurs as a [WebGL 1.0](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API) fragment shader written in [GLSL](https://en.wikipedia.org/wiki/OpenGL_Shading_Language). Shaders work in [NDC Coordinates](https://learnopengl.com/Getting-started/Coordinate-Systems). Fragment shaders run in per-pixel, with no concept of things like resolution, aspect ratio or which pixel is being processed. This is information we must provide or ask the graphics pipeline to do so.

## Convolution
A Convolution


[In hardware, division is slower than multiplication. That is the reason resolution is passed in as ]

Living in Japan, I got the chance to interview an idol of me: Graphics Programmer Masaki Kawase.

<style>
    .settingsTable .noborder td {
        border-bottom: unset;
    }
    .variable-name-row {
        display: none;
    }
    @media screen and (max-width: 500px) {
        .variable-name-row {
            display: table-row;
			text-align: center;
        }
        .variable-name-cell {
            display: none;
        }
    }
	.settingsTable pre {
    	overflow-x: auto;
    	max-width: 100%;
    	white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.precolumn {
		padding: 0px;
	}
</style>

<script src="https://cdn.jsdelivr.net/npm/eruda"></script>
<script>eruda.init();</script>

<svg id="kernelSimple"></svg>

<table class="settingsTable" style="width: 100%; max-width: 100%;">
	<tr class="variable-name-row noborder">
		<td colspan=4>
			<code>kernelSize</code>
		</td>
	</tr>
	<tr class="noborder">
		<td class="variable-name-cell">
			<code>kernelSize</code>
		</td>
		<td style="width:100%">
			<input class="slider" type="range" step="1" min="0" max="16" value="1" id="svgKernelRange" oninput="svgKernelSize.textContent = `${parseInt(this.value) * 2 + 1}×${parseInt(this.value) * 2 + 1}`">
		</td>
		<td style="text-align: center;">
			<output id="svgKernelSize">3×3</output>
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="svgKernelRange.value = 1; svgKernelSize.textContent = '3×3';svgKernelRange.dispatchEvent(new Event('input'));">{% include "style/icons/rotate-right.svg" %}</button>
		</td>
	</tr>
	<tr class="variable-name-row noborder">
		<td colspan=4>
			<code>samplePosMult</code>
		</td>
	</tr>
	<tr class="noborder">
		<td class="variable-name-cell">
			<code>samplePosMult</code>
		</td>
		<td style="width:100%">
			<input class="slider" type="range" step="any" min="0" max="10" value="1" id="svgSamplePosMult" oninput="svgSamplePosOut.textContent = parseInt(this.value * 100)">
		</td>
		<td style="text-align: center;">
			<output id="svgSamplePosOut">100</output>%
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="svgSamplePosMult.value = 1; svgSamplePosOut.textContent = 100; svgSamplePosMult.dispatchEvent(new Event('input'));">{% include "style/icons/rotate-right.svg" %}</button>
		</td>
	</tr>
</table>

<script type="module">
	import { setupSVG } from "./js/kernelPreview.js";
	setupSVG();
</script>

We can express sigma as it is usually done. Insert Sigma joke.
Here in [~~Isometric~~](https://en.wikipedia.org/wiki/Isometric_projection) [Dimetric](https://en.wikipedia.org/wiki/Axonometric_projection#Three_types) projection.

<svg id="kernelIso"></svg>

<div style="margin-bottom: 0.5rem" class="toggleRes">
	<div>
	  <input type="radio" id="sigmaAbsolute" name="modeSigma" value="absolute" checked />
	  <label for="sigmaAbsolute">Absolute Sigma</label>
	</div>
	<div>
	  <input type="radio" id="sigmaRelative" name="modeSigma" value="relative" />
	  <label for="sigmaRelative">Relative Sigma</label>
	</div>
</div>
<table class="settingsTable" style="width: 100%; max-width: 100%;">
	<tr class="variable-name-row noborder">
		<td colspan=5>
			<code>kernelSizeIso</code>
		</td>
	</tr>
	<tr class="noborder">
		<td class="variable-name-cell">
			<code>kernelSizeIso</code>
		</td>
		<td style="width:100%">
			<input class="slider" type="range" step="1" min="0" max="16" value="3" id="svgKernelIsoRange" oninput="svgKernelIsoSize.textContent = `${parseInt(this.value) * 2 + 1}×${parseInt(this.value) * 2 + 1}`">
		</td>
		<td style="text-align: center;">
			<output id="svgKernelIsoSize">7×7</output>
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="svgKernelIsoRange.value = 3; svgKernelIsoSize.textContent = '7×7';svgKernelIsoRange.dispatchEvent(new Event('input'));">{% include "style/icons/rotate-right.svg" %}</button>
		</td>
	</tr>
	<tr class="variable-name-row noborder">
		<td colspan=5>
			<code>sigma</code>
		</td>
	</tr>
	<tr class="noborder">
		<td class="variable-name-cell">
			<code>sigma</code>
		</td>
		<td style="width:100%;">
			<input class="slider" type="range" step="0.1" min="0.1" max="10" value="3" id="sigmaIsoRelative">
			<input class="slider" type="range" step="0.1" min="0.1" max="10" value="1" id="sigmaIso">
		</td>
		<td style="text-align: center;">
			<span style="display: flex; flex-direction: column">
				<span style="white-space: nowrap">
					± <output id="sigmaIsoRelativeOut">3.00</output> σ
				</span>
				<span style="white-space: nowrap">
					<output id="sigmaIsoOut">1.00</output> px
				</span>
			</span>
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="
				if(sigmaAbsolute.checked){ sigmaIso.value = 1; sigmaIso.dispatchEvent(new Event('input')); } else { sigmaIsoRelative.value = 3; sigmaIsoRelative.dispatchEvent(new Event('input')); };
			">{% include "style/icons/rotate-right.svg" %}</button>
		</td>
	</tr>
</table>

<script type="module">
	import { setupSVGIso } from "./js/kernelPreviewIsometric.js";
	setupSVGIso();
</script>


## Setup

From here on out, everything you see will be done by your device's GPU. You will see how many variables can be tuned and we will need to build quite a bunch of intuition.

We are in the realm of realtime graphics. Photoshop may only need to do one such iteration, but in real time graphics, we need this to work every frame.

When writing shaders, we don't care about execution order or.
These are convolutions, but we aren't actually bound by rules of the classical convolution implies.

Old info: In benchmark mode we run at 1600x1200. We _could_ use many [older](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/finish) and [newer](https://developer.mozilla.org/en-US/docs/Web/API/WebGLSync) GPU pipeline synchronization features of WebGL and measure just the time of the blur pass. Whilst you can double check if you get reliable numbers with platform specific debuggers like NV?? on one type of device, unfortunately, it's not possible in the general case and it's too easy to get not a number that measures now how long it took us to blur, but some other part of the GPU pipeline. Same goes for trying to find out how many iterations of blur we can run within X amount of time. Especially once on mobile Apple devices, getting reliable numbers goes out the window.

Performance measurements via [`EXT_disjoint_timer_query_webgl2`](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/) are pretty reliable, but only supported on Desktop Chrome. So for the sake of comparability, we do it the only way that is guaranteed to sync, [`gl.readPixels()`](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/readPixels)

Especially dedicated Laptop GPUs are rather slow with getting out of their power saving state, so on some platforms, hitting the benchmark button twice in succession may produce faster results.

If you set the benchmark with parameters resulting in 10s+ run times, then you'll see just how brittle browsers on even the most premium Apple devices become, once we load the GPU mercilessly. Even though the main thread does nothing during a benchmark run, we'll trigger interesting error states.

On Desktop GPUs and Laptop GPUs, you will additionally see, that increasing `samplePosMultiplier` will negatively impact performance (up to a point), even though the required texture reads stay the same. This is due hardware texture caches accelerating texture reads which are spatially close together and not being able to do so effectively, if the texture reads are all too far apart.

<blockquote class="reaction"><div class="reaction_text">The most basic of blur algorithms and <strong>already</strong> we have kernel size, sample placement, sigma, resolution - influencing visual style and performance. Changing one influences the others. It's too much. </div><img class="kiwi" src="/assets/kiwis/dead.svg"></blockquote>

## Alternative ways FFT
There is actually an alternative way to perform blurring, by performing an [image Fast Fourier Transform](https://usage.imagemagick.org/fourier/#introduction), [masking high frequency areas to perform the blur](https://usage.imagemagick.org/fourier/#blurring) and finally performing the inverse transformation.

If we ignore the frequency domain transformation steps, then this makes the blurring step itself constant in time, regardless of blur radius! Small Radius Blur, Large Radius blur, all the same speed. But of course, we ***can't*** ignore the Frequency domain transformations.
Unfortunately, this cannot be used in practice, as the FFT and inverse FFT steps don't translate well into a graphics pipeline context at all. 

3Blue1Brown covered what a Fourier Transform is in [great detail in a video series already](https://www.youtube.com/watch?v=spUNpyF58BY).

## Box Blur
Let's start with the simplest of algorithms. From a programmer's perspective, the most straight forward way is to average the neighbors of a pixel. What the fragment shader is expressing is 

<blockquote>
<details><summary><a target="_blank" href="screenshots/fxaainteractive.png">Screenshot</a>, in case WebGL doesn't work</summary>

![image](screenshots/fxaainteractive.png)

</details>
<details>	
<summary>WebGL Fragment Shader <a target="_blank" href="shader/FXAA-interactive.fs">FXAA-interactive.fs</a></summary>

```glsl
{% include "posts/dual-kawase/shader/boxBlur.fs" %}
```

</details>
<details>	
<summary>WebGL Javascript <a target="_blank" href="js/boxBlur.js">boxBlur.js</a></summary>

```javascript
{% include "posts/dual-kawase/js/boxBlur.js" %}
```

</details>
</blockquote>


<div style="display: flex; gap: 8px">
	<div class="toggleRes" style="width: 100%">
		<div>
		  <input type="radio" id="sceneBox" name="modeBox" value="scene" checked />
		  <label for="sceneBox">Scene</label>
		</div>
		<div>
		  <input type="radio" id="selfIllumBox" name="modeBox" value="selfIllum" />
		  <label for="selfIllumBox">Lights</label>
		</div>
		<div>
		  <input type="radio" id="bloomBox" name="modeBox" value="bloom" />
		  <label for="bloomBox">Bloom</label>
		</div>
	</div>
	<div class="toggleRes toggleCheckbox" style="flex:0 0 auto; white-space:nowrap;">
		<div>
		  <input type="checkbox" id="animateCheck_Boxblur" checked />
		  <label for="animateCheck_Boxblur">Animate</label>
		</div>
	</div>
</div>

<div style="margin-top: 13px" class="canvasParent">
	<canvas style="width: round(down, 100%, 8px); aspect-ratio: 4 / 3;" id="canvasBoxBlur"></canvas>
	<div class="contextLoss" id="contextLoss">❌ The browser killed this WebGL Context, please reload the page. If this happened as the result of a long benchmark, decrease the iteration count. On some platforms you may have to restart the browser completely.</div>
	{% include "style/icons/clock.svg" %}
</div>

<table class="settingsTable" style="width: 100%; max-width: 100%;">
	<tr>
		<td colspan=4 style="width:100%">
			<div style="display: flex; gap: 0px 12px; align-items: center;">
			    <div style="display: flex; flex-wrap: wrap; gap: 0px 12px; flex: 1; justify-content: space-around;  font-size: smaller">
			        <span style="display: flex; gap: 8px; white-space: nowrap;">
						<strong>FPS:</strong> <output id="fpsBoxBlur">?</output> / <output id="msBoxBlur">?</output> ms
					</span>
			        <span style="display: flex; gap: 8px; white-space: nowrap;">
						<strong>Resolution:</strong> <output id="widthBoxBlur">?</output>x<output id="heightBoxBlur">?</output>
					</span>
			        <span style="display: flex; gap: 8px; white-space: nowrap;">
						<strong>Texture Taps:</strong> <output id="tapsBoxBlur">?</output>
					</span>
				</div>
			</div>
		</td>
	</tr>
	<tr class="variable-name-row noborder">
		<td colspan=4>
			<code>kernelSize</code>
		</td>
	</tr>
	<tr class="noborder">
		<td class="variable-name-cell">
			<code>kernelSize</code>
		</td>
		<td style="width:100%">
			<input class="slider" type="range" step="1" min="0" max="32" value="3" id="boxKernelSizeRange" oninput="boxKernelSize.textContent = `${parseInt(this.value) * 2 + 1}×${parseInt(this.value) * 2 + 1}`">
		</td>
		<td style="text-align: center;">
			<output id="boxKernelSize">7x7</output> px
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="boxKernelSizeRange.value = 3; boxKernelSize.textContent = '7x7';boxKernelSizeRange.dispatchEvent(new Event('input'));">{% include "style/icons/rotate-right.svg" %}</button>
		</td>
	</tr>
	<tr class="variable-name-row noborder">
		<td colspan=4>
			<code>downSample</code>
		</td>
	</tr>
	<tr class="noborder">
		<td class="variable-name-cell">
			<code>downSample</code>
		</td>
		<td style="width:100%">
			<input class="slider" type="range" step="1" min="0" max="8" value="0" id="downSampleRange" oninput="downSampleOut.textContent = this.value">
		</td>
		<td style="text-align: center;">
			<output id="downSampleOut">1</output>
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="downSampleRange.value = 1; downSampleRange.dispatchEvent(new Event('input'));">{% include "style/icons/rotate-right.svg" %}</button>
		</td>
	</tr>
	<tr class="variable-name-row noborder">
		<td colspan=4>
			<code>samplePosMultiplier</code>
		</td>
	</tr>
	<tr>
		<td class="variable-name-cell">
			<code>samplePosMultiplier</code>
		</td>
		<td style="width:100%">
			<input class="slider" type="range" step="0.01" min="0" max="20" value="1" id="samplePosRange" oninput="samplePos.textContent = parseInt(this.value * 100)">
		</td>
		<td style="text-align: center;">
			<output id="samplePos">100</output> %
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="samplePosRange.value = 1;samplePos.textContent = 100;samplePosRange.dispatchEvent(new Event('input'));">{% include "style/icons/rotate-right.svg" %}</button>
		</td>
	</tr>
	<tr class="variable-name-row noborder">
		<td colspan=4>
			<code>bloomBrightness</code>
		</td>
	</tr>
	<tr>
		<td class="variable-name-cell">
			<code>bloomBrightness</code>
		</td>
		<td style="width:100%">
			<input class="slider" type="range" step="0.01" min="0" max="20" value="1" id="bloomBrightnessRange" oninput="bloomBrightness.textContent = parseInt(this.value * 100)">
		</td>
		<td style="text-align: center;">
			<output id="bloomBrightness">100</output> %
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="bloomBrightnessRange.value = 1; bloomBrightness.textContent = 100;bloomBrightnessRange.dispatchEvent(new Event('input'));">{% include "style/icons/rotate-right.svg" %}</button>
		</td>
	</tr>
	<tr class="variable-name-row noborder">
		<td colspan=4>
			<code>sigma</code>
		</td>
	</tr>
	<tr>
		<td class="variable-name-cell">
			<code>sigma</code>
		</td>
		<td style="width:100%">
			<input class="slider" type="range" step="0.1" min="0.1" max="10" value="2" id="sigmaRangeGauss" oninput="sigmaGaussRelativeOut.value = Number(this.value).toFixed(2)">
		</td>
		<td style="text-align: center; white-space: nowrap">
			± <output id="sigmaGaussRelativeOut">2.00</output> σ
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="sigmaRangeGauss.value = 2; sigmaRangeGauss.dispatchEvent(new Event('input'));">{% include "style/icons/rotate-right.svg" %}</button>
		</td>
	</tr>
	<tr>
		<td colspan="4" style="width: 100%;">
			<div style="display: flex; flex-wrap: nowrap; gap: 0px 12px; width: 100%; justify-content: space-between;">
				<div style="white-space: normal; word-break: break-word; font-size: smaller;">
					<div>
						~<output id="iterTimeBox">?</output> / iteration
					</div>
					<div>
						<output id="tapsCountBenchBox">?</output> Million texture reads / iteration
					</div>
					<div>
						GPU info: <code id="rendererBox"></code>
					</div>
				</div>
				<div class="multiButton">
					<button type="button" class="main" id="benchmarkBoxBlur">
						<span id="benchmarkBoxBlurLabel">Benchmark</span>
						<span>
							<output id="iterOutBoxBlur">100</output> Iterations
						</span>
					</button>
					<div class="arrowWrap">
						<select id="iterations" onchange="iterOutBoxBlur.textContent=this.value; benchmarkBoxBlurLabel.textContent='Benchmark'">
							<optgroup label="Iterations at 1600x1200">
								<option value="10">10</option>
								<option value="100" selected>100</option>
								<option value="1000">1000</option>
								<option value="10000">10000</option>
								<option value="100000">100000</option>
		    				</optgroup>
						</select>
						<span class="arrow">
							{% include "style/icons/arrow-down.svg" %}
						</span>
					</div>
				</div>
			</div>
		</td>
	</tr>
</table>

<img id="debugIMG"></img>

<script type="module">
	import { setupBoxBlur } from "./js/boxBlur.js";
	setupBoxBlur();
</script>

So what did we achieve? A bad looking blur, that wrecks even my RTX 4090.

Apple devices are very strict with 3D in the browser usage, so if you overdo the next part, the browser will disable WebGL for this site refuse

When talking about blurs and especially bloom, motion stability is incredibly important. Our image will rotate slowly to tease out artifacts when bright highlights move across the frame. You can toggle this above each WebGL Canvas.

<blockquote class="reaction"><div class="reaction_text">The most basic of blur algorithms and <strong>already</strong> we have kernel size, sample placement, sigma, resolution - influencing visual style and performance. Changing one influences the others. It's too much. </div><img class="kiwi" src="/assets/kiwis/tired.svg"></blockquote>

## Apple switches algorithms

Either reduced resolution, a switch to box blur with settings corresponding to the reduced resolution or guassian blur with a [small kernel but high sigma](https://usage.imagemagick.org/blur/#blur_args).
iPad 9th gen, iPadOS 18.4.1 10.2", 2160 x 1620 px --> 11x11 px
iPhone SE 34d gen, iOS 18.4.1, 1334 x 750 px --> 6x6 px

<figure>
	<video poster="vid/iPadSidebar_thumb.jpg" width="960" height="720" loop controls><source src="vid/iPadSidebar.mp4" type="video/mp4"></video>
	<figcaption>iPad sidebar blur</figcaption>
</figure>

<blockquote class="reaction"><div class="reaction_text">Apple misconfigured the blur switch on iPadOS, for the top right settings pull down. The switch happens too soon, regressing blur strength and resulting in a pulse like artifact.</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

YouTube Channel [Computerphile](https://www.youtube.com/@Computerphile) did a lot on blurs and covered the mathematics behind them. I won't jump deep into the basic building blocks of kernels, convolutions and separability, as they have covered it already really well.

https://www.youtube.com/watch?v=SiJpkucGa1o

Playdead used it to get HDR Bloom
[Low Complexity, High Fidelity - INSIDE Rendering](https://gdcvault.com/play/1023304/Low-Complexity-High-Fidelity-INSIDE)
Check against Jimenez 14 5:45 onwards

Main theory: https://www.rastergrid.com/blog/2010/09/efficient-gaussian-blur-with-linear-sampling/

This article kicked it off: [Link](https://www.rastergrid.com/blog/2010/09/efficient-gaussian-blur-with-linear-sampling/)

Marius Bjørge picked it up and [did a talk in 2015](https://dl.acm.org/doi/10.1145/2776880.2787664) direct [video link](https://dl.acm.org/doi/suppl/10.1145/2776880.2787664/suppl_file/a184.mp4)
Indepth article by Intel [link](https://www.intel.com/content/www/us/en/developer/articles/technical/an-investigation-of-fast-real-time-gpu-based-image-blur-algorithms.html) with Link to original ppt by Masaki Kawase.

Yoshiharu Gotanda 五反田義治 ceo of https://www.tri-ace.co.jp/en/
Masaki Kawase 川瀬正樹 history goes back some time, including modding and a personal page with [high and low graphics settings](https://web.archive.org/web/20040201224946/http://www.daionet.gr.jp/~masa/index.html)

To be able to innovate in blurs today you need to be very deep in mathematics and signal theory **_and_** computer graphics. Just looking at the level of genius needed to get fast bokeh blur is kinda insane. Functions cancelling each-other out, complex number theory

https://www.youtube.com/watch?v=vNG3ZAd8wCc

CS2 has not handled highlights like Call of Duty's graphics team has, see ancient lights