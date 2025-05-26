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

Blurs are the basic building block of many post processing effects and essential for sleek and modern UIs.

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

<!-- <script src="https://cdn.jsdelivr.net/npm/eruda"></script>
<script>eruda.init();</script> -->

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

<svg id="kernelIso"></svg>

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
			<input class="slider" type="range" step="1" min="0" max="16" value="1" id="svgKernelIsoRange" oninput="svgKernelIsoSize.textContent = `${parseInt(this.value) * 2 + 1}×${parseInt(this.value) * 2 + 1}`">
		</td>
		<td style="text-align: center;">
			<output id="svgKernelIsoSize">3×3</output>
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="svgKernelIsoRange.value = 1; svgKernelIsoSize.textContent = '3×3';svgKernelIsoRange.dispatchEvent(new Event('input'));">{% include "style/icons/rotate-right.svg" %}</button>
		</td>
	</tr>
	<tr class="variable-name-row noborder">
		<td colspan=5>
			<code>sigma</code>
		</td>
	</tr>
	<tr class="noborder">
		<td colspan=5>
			<span style="display: flex; gap: 8px; white-space: nowrap; justify-content: center">
				<label style="display: flex; gap: 8px; margin-bottom: 0px">
        	    	<input style="margin-bottom: 0px;" type="checkbox" id="sigmaAbsoluteExplain" name="Absolute / Relative" checked />
        	    	Absolute Sigma
        		</label>
			</span>
		</td>
	</tr>
	<tr class="noborder">
		<td class="variable-name-cell">
			<code>sigma</code>
		</td>
		<td style="width:100%">
			<input class="slider" type="range" step="0.01" min="0.01" max="10" value="1" id="sigmaIso" oninput="sigmaIsoOut.value = this.value">
		</td>
		<td style="text-align: center;">
			<output id="sigmaIsoOut">1</output>
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="
				sigmaIso.value = 1; sigmaIsoOut.value = 1; sigmaIso.dispatchEvent(new Event('input'));
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

We are in the realm of realtime graphics.

When writing shaders, we don't care about execution order or.
These are convolutions, but we aren't actually bound by rules of the classical convolution implies.

Old info: In benchmark mode we run at 1600x1200. We _could_ use many [older](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/finish) and [newer](https://developer.mozilla.org/en-US/docs/Web/API/WebGLSync) GPU pipeline synchronization features of WebGL and measure just the time of the blur pass. Whilst you can double check if you get reliable numbers with platform specific debuggers like NV?? on one type of device, unfortunately, it's not possible in the general case and it's too easy to get not a number that measures now how long it took us to blur, but some other part of the GPU pipeline. Same goes for trying to find out how many iterations of blur we can run within X amount of time. Especially once on mobile Apple devices, getting reliable numbers goes out the window.

Performance measurements via [`EXT_disjoint_timer_query_webgl2`](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/) are pretty reliable, but only supported on Desktop Chrome. So for the sake of comparability, we do it the only way that is guaranteed to sync, [`gl.readPixels()`](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/readPixels)

Especially dedicated Laptop GPUs are rather slow with getting out of their power saving state, so on some platforms, hitting the benchmark button twice in succession may produce faster results.

If you set the benchmark with parameters resulting in 10s+ run times, then you'll see just how brittle browsers on even the most premium Apple devices become, once we load the GPU mercilessly. Even though the main thread does nothing during a benchmark run, we'll trigger interesting error states.

On Desktop GPUs and Laptop GPUs, you will additionally see, that increasing `samplePosMultiplier` will negatively impact performance (up to a point), even though the required texture reads stay the same. This is due hardware texture caches accelerating texture reads which are spatially close together and not being able to do so effectively, if the texture reads are all too far apart.

<blockquote class="reaction"><div class="reaction_text">The most basic of blur algorithms and <strong>already</strong> we have kernel size, sample placement, sigma, resolution - influencing visual style and performance. Changing one influences the others. It's too much. </div><img class="kiwi" src="/assets/kiwis/dead.svg"></blockquote>

<div style="display: flex; flex-wrap: wrap; gap: 0px 12px; justify-content: space-around;">
    <span style="display: flex; gap: 8px; white-space: nowrap">
        <label style="font-weight: unset; display: flex; gap: 8px; align-items: center;">
            <input style="margin-bottom: unset;" type="checkbox" id="pauseCheckSimple" name="Play / Pause" checked />
            Animate
        </label>
    </span>
</div>
<canvas width="100%" height="400px" style="aspect-ratio: 4/3" id="canvasSimple"></canvas>
<!-- <script>setupSimple("canvasSimple", "simpleVert", "simpleFrag", "blitVert", "blitFrag", "pauseCheckSimple");</script> -->

## Box Blur

<div class="toggleRes">
	<div>
	  <input type="radio" id="sceneBox" name="modeBox" value="scene" checked />
	  <label for="sceneBox">Scene</label>
	</div>
	<div>
	  <input type="radio" id="selfIllumBox" name="modeBox" value="selfIllum" />
	  <label for="selfIllumBox">Self Illumination</label>
	</div>
	<div>
	  <input type="radio" id="bloomBox" name="modeBox" value="bloom" />
	  <label for="bloomBox">Bloom</label>
	</div>
</div>
<div style="margin-top: 13px" class="canvasParent">
	<canvas width="100%" height="400px" style="aspect-ratio: 4/3;" id="canvasBoxBlur"></canvas>
	<div class="contextLoss" id="contextLoss">❌ The browser killed this WebGL Context, please reload the page. If this happened as the result of a long benchmark, decrease the iteration count. On some platforms you may have to restart the browser completely.</div>
	{% include "style/icons/clock.svg" %}
</div>
<table class="settingsTable" style="width: 100%; max-width: 100%;">
	<tr>
		<td colspan=4 style="width:100%">
			<div style="display: flex; gap: 0px 12px; align-items: center;">
			    <div style="display: flex; flex-wrap: wrap; gap: 0px 12px; flex: 1; justify-content: space-around;">
			        <span style="display: flex; gap: 8px; white-space: nowrap;">
        				<label style="font-weight: unset; display: flex; gap: 8px; align-items: center;">
            				<input style="margin-bottom: unset;" type="checkbox" id="animateCheck_Boxblur" name="Play / Pause" checked />
            				Animate
        				</label>
					</span>
				</div>
			</div>
		</td>
	</tr>
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
			<input class="slider" type="range" step="1" min="0" max="32" value="1" id="sigmaRange" oninput="sigma.textContent = this.value">
		</td>
		<td style="text-align: center;">
			<output id="sigma">1</output> px
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="sigmaRange.value = 3; sigma.textContent = '7x7';sigmaRange.dispatchEvent(new Event('input'));">{% include "style/icons/rotate-right.svg" %}</button>
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
					<div id="floatTest"></div>
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

Blur is essential - a fundamental tool, that a lot of graphics programming builds upon. [Depth of Field](https://en.wikipedia.org/wiki/Depth_of_field), [Bloom](https://learnopengl.com/Guest-Articles/2022/Phys.-Based-Bloom), [Frosted glass in UI elements](https://blog.frost.kiwi/GLSL-noise-and-radial-gradient/#kde-kwin-blur) all make use of it.

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
