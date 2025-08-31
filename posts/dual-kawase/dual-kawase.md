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

<style>
	.settingsTable .noborder td {
		border-bottom: unset;
	}
	.settingsTable td {
		white-space: nowrap;
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

	.stats > div {
	    display: flex;
	    gap: 0px 12px;
	    flex-wrap: wrap;
	    flex: 1;
	    justify-content: space-around;
	    font-size: smaller;
	}

	.stats span {
	    display: flex;
	    gap: 8px;
	    white-space: nowrap;
	}
</style>

<script>
function resetSlider(button, defaultValue, outputFormat = defaultValue) {
	const row = button.closest('tr');
	const input = row.querySelector('input');
	const output = row.querySelector('output');
	
	input.value = defaultValue;
	output.value = outputFormat;
	input.dispatchEvent(new Event('input'));
}
</script>

Blurs are the basic building block for many [video game post processing effects](https://en.wikipedia.org/wiki/Video_post-processing#Uses_in_3D_rendering) and essential for sleek and modern [GUIs](https://en.wikipedia.org/wiki/Graphical_user_interface). Video game [Depth of Field](https://dev.epicgames.com/documentation/en-us/unreal-engine/depth-of-field-in-unreal-engine) and [Bloom](https://en.wikipedia.org/wiki/Bloom_(shader_effect)) or [frosted panels](https://blog.frost.kiwi/GLSL-noise-and-radial-gradient/#microsoft-windows-acrylic) in modern user interfaces - used subtly or obviously - they're everywhere. <span style="transition: filter 0.2s; filter: none" onmouseover="this.style.filter='blur(4px)'" onmouseout="this.style.filter='none'">Even your browser can do it, just tap this sentence!</span>

<figure>
	<img src="img/intro.png" alt="Texture coordinates, also called UV Coordinates or UVs for short" />
	<figcaption>Effect of "<a href="https://en.wikipedia.org/wiki/Bloom_(shader_effect)" target="_blank">Bloom</a>", one of many use-cases for blur algorithms</figcaption>
</figure>

Conceptually, *"Make thing go blurry"* is easy, boiling down to some form of *"average colors in radius"*. Doing so in [realtime](https://en.wikipedia.org/wiki/Real-time_computing) however, took many a graphics programmer through decades upon decades of research and experimentation, across computer science and maths. In this article, we'll follow their footsteps.

<blockquote class="reaction"><div class="reaction_text">A graphics programming time travel, if you will.</div><img class="kiwi" src="/assets/kiwis/cyber.svg"></blockquote>

Using the [GPU](https://en.wikipedia.org/wiki/Graphics_processing_unit) in the device you are reading this article on, and the [WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API) capability of your browser, we'll implement realtime blurring techniques and retrace the trade-offs graphics programmers had to make in order to marry two, sometimes opposing, worlds: **Mathematical theory** and **Technological reality**. Let's dig in!

<blockquote class="reaction"><div class="reaction_text">This is my submission to this year's <a target="_blank" href="https://some.3b1b.co/">Summer of Math Exposition</a></div><img class="kiwi" src="img/SOMELogo.svg"></blockquote>

## Setup - No blur yet
In the context of video game post processing, a 3D scene is drawn, also called [rendering](https://en.wikipedia.org/wiki/Rendering_(computer_graphics)), and saved to an intermediary image - a [framebuffer](https://learnopengl.com/Advanced-OpenGL/Framebuffers). In turn, this framebuffer is processed to achieve [various effects](https://en.wikipedia.org/wiki/Video_post-processing#Uses_in_3D_rendering). Since this *processing* happens *after* a 3D scene is rendered, it's called *post-processing*. All that, _many_ times a second

<blockquote class="reaction"><div class="reaction_text"><strong>Depending on technique</strong>, framebuffers <a target="_blank" href="https://learnopengl.com/Advanced-Lighting/Deferred-Shading">can hold non-image data</a> and post-processing effects like <a target="_blank" href="https://en.wikipedia.org/wiki/Color_correction">Color-correction</a> or <a target="_blank" href="https://en.wikipedia.org/wiki/Tone_mapping">Tone-mapping</a> don't even require intermediate framebuffers: There's <a target="_blank" href="https://takahirox.github.io/three.js/examples/webgl_tonemapping.html">more</a> than <a target="_blank" href="https://gdcvault.com/play/1020631/The-Revolution-in-Mobile-Game">one way (@35:20)</a></div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

This is where we jump in: with a framebuffer in hand, after the 3D scene was drawn. We'll use a scene from a [mod](https://en.wikipedia.org/wiki/Video_game_modding) called [NEOTOKYO°](https://store.steampowered.com/app/244630/NEOTOKYO/). Each time we'll implement a blur, there will be a box, a [canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas) instructed with [WebGL 1.0](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API), rendering at [**native** resolution](https://en.wikipedia.org/wiki/1:1_pixel_mapping) of your device. Each box has controls and relevant parts of its code below.

<blockquote class="reaction"><div class="reaction_text">No coding or graphics programming knowledge required to follow along. But also no curtains! You can always see <a target="_blank" href="https://www.youtube.com/watch?v=ONH-pxBMJu4">how we talk</a> with your GPU. Terms and meanings will be explained, once it's relevant.</div><img class="kiwi" src="/assets/kiwis/speak.svg"></blockquote>

<div style="margin-top: 1.5em" id="WebGLBox-Simple">
<div style="display: flex; gap: 8px">
	<div class="toggleRes" style="width: 100%">
		<label>
			<input type="radio" name="modeSimple" value="scene" checked />
			Scene
		</label>
		<label>
			<input type="radio" name="modeSimple" value="lights" />
			Lights
		</label>
		<label>
			<input type="radio" name="modeSimple" value="bloom" />
			Bloom
		</label>
	</div>
	<div class="toggleRes toggleCheckbox" style="flex:0 0 auto; white-space:nowrap;">
		  <label>
		  	<input type="checkbox" id="animateCheck" checked/>
		  		Animate
		  </label>
	</div>
</div>
<div style="margin-top: 13px" class="canvasParent">
	<canvas style="width: round(down, 100%, 8px); aspect-ratio: 4 / 3;"></canvas>
	<div class="contextLoss" id="contextLoss">❌ The browser killed this WebGL Context, please reload the page. If this happened as the result of a long benchmark, decrease the iteration count. On some platforms (iOS / iPad) you may have to restart the browser App completely, as the browser will temporarily refuse to allow this site to run WebGL again.</div>
	{% include "style/icons/clock.svg" %}
</div>
<table class="settingsTable" style="width: 100%; max-width: 100%;">
	<tr>
	    <td colspan=4 class="stats">
	        <div>
	            <span>
	                <strong>FPS:</strong> <output id="fps">?</output> / <output id="ms">?</output> ms
	            </span>
	            <span>
	                <strong>Resolution:</strong> <output id="width">?</output>x<output id="height">?</output>
	            </span>
	        </div>
	    </td>
	</tr>
	<tr class="variable-name-row noborder">
		<td colspan=4>
			<code>lightBrightness</code>
		</td>
	</tr>
	<tr>
		<td class="variable-name-cell">
			<code>lightBrightness</code>
		</td>
		<td style="width:100%">
			<input disabled class="slider" type="range" step="0.01" min="0" max="20" value="1" id="lightBrightness" oninput="
			this.closest('tr').querySelector('output').value = parseInt(this.value * 100) ">
		</td>
		<td style="text-align: center;">
			<output>100</output> %
		</td>
		<td style="text-align: center;">
			<button disabled id="lightBrightnessReset" class="roundButton" onclick="resetSlider(this, '1', '100')">
				{% include "style/icons/rotate-right.svg" %}
			</button>
		</td>
	</tr>
</table>
<script type="module">
	import { setupSimple } from "./js/simple.js";
	setupSimple();
</script>
</div>
<!-- Benchmark in 1feb0231a940d3dd9989103795f199b4baedb535 -->
<blockquote>
<details><summary><a target="_blank" href="screenshots/fxaainteractive.png">Screenshot</a>, in case WebGL doesn't work</summary>

<!-- ![image](screenshots/fxaainteractive.png) -->

</details>
<details>	
<summary>Blur Fragment Shader <a target="_blank" href="shader/noBlurYet.fs">noBlurYet.fs</a></summary>

```glsl
{% include "posts/dual-kawase/shader/noBlurYet.fs" %}
```

</details>
<details>	
<summary>WebGL Javascript <a target="_blank" href="js/simple.js">simple.js</a></summary>

```javascript
{% include "posts/dual-kawase/js/simple.js" %}
```

</details>
</blockquote>

We don't have a blur implemented yet, not much happening. Above the box you have an `Animate` button, which will move the scene around to tease out problems of upcoming algorithms. Movement happens **before** our blur will be applied, akin to the player character moving. To see our blur in different use-cases, there are 3 modes:

<blockquote class="reaction"><div class="reaction_text">Different blur algorithms behave differently based on use-case. Some are very performance efficient, but break under movement. Some reveal their flaws with small, high contrast regions like far-away lights</div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>

- In `Scene` mode the blur will be applied across the whole image
- In `Lights` mode we see and blur just the [Emission](https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/principled.html#emission) parts of the scene, referred to by its older name "[Self-Illumination](https://developer.valvesoftware.com/wiki/Glowing_textures_(Source)#$selfillum)" in the [3D game engine](Game_engine) used by the mod, the [Source Engine](https://developer.valvesoftware.com/wiki/Source)
  - This also unlocks the `lightBrightness` slider, where you can boost the energy output of the lights
- In `Bloom` mode, we use the original scene and add the blurred lights from the previous mode on top to create a moody scene. This implements the effect of [Bloom](https://en.wikipedia.org/wiki/Bloom_(shader_effect)), an important use-case for blurs in real-time 3D graphics

<blockquote class="reaction"><div class="reaction_text">Adding the blurred emission <a target="_blank" href="https://chrismillervfx.wordpress.com/2013/04/15/understanding-render-passes/">pass</a> as we do in this article, or <a target="_blank" href="https://en.wikipedia.org/wiki/Thresholding_(image_processing)">thresholding</a> the scene and blurring that is <strong>not</strong> actually how modern video games do bloom. We'll get into that a bit later.</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

Finally, you see [Resolution](https://en.wikipedia.org/wiki/Image_resolution) of the canvas and [Frames per Second / time taken per frame, aka "frametime"](https://en.wikipedia.org/wiki/Frame_rate). A very important piece of the puzzle is ***performance***, which will become more and more important as the article continues and the [mother of invention](https://en.wikipedia.org/wiki/Necessity_is_the_mother_of_invention) behind our time travel story.

<blockquote class="reaction"><div class="reaction_text">Frame-rate will be capped at your screen's <a target="_blank" href="https://www.intel.com/content/www/us/en/gaming/resources/highest-refresh-rate-gaming.html">refresh rate</a>, most likely 60 fps / 16.6 ms. We'll get into proper <a target="_blank" href="https://en.wikipedia.org/wiki/Benchmark_(computing)">benchmarking</a> as our hero descents this article into blurry madness</div><img class="kiwi" src="/assets/kiwis/book.svg"></blockquote>

### Technical breakdown

<blockquote class="reaction"><div class="reaction_text">Understanding the GPU code is not necessary to follow this article, but if you do choose to peek behind the curtain, here is what you need to know</div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>

We'll implement our blurs as a [fragment shader](https://learnopengl.com/Getting-started/Hello-Triangle) written in [GLSL](https://en.wikipedia.org/wiki/OpenGL_Shading_Language). In a nut-shell, a fragment shader is code that runs on the GPU for every output-pixel, in-parallel. Image inputs in shaders are called [Textures](https://learnopengl.com/Getting-started/Textures). These textures have coordinates, often called [UV coordinates](https://en.wikipedia.org/wiki/UV_mapping) - _these_ are the numbers we care about

<blockquote class="reaction"><div class="reaction_text">Technically, fragment shaders run per <a target="_blank" href="https://www.khronos.org/opengl/wiki/Fragment">fragment</a>, which aren't necessarily pixel sized and there are <a target="_blank" href="https://registry.khronos.org/OpenGL/extensions/EXT/EXT_shader_framebuffer_fetch.txt">other ways</a> to read framebuffers, but none of that matters in the context of this article.</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

<figure>
	<img src="img/UV.svg" alt="Texture coordinates, also called UV Coordinates or UVs for short" />
	<figcaption>Texture coordinates, also called "UV" Coordinates or "UVs" for short<br>Note the squished appearance of the image</figcaption>
</figure>

UV coordinates specify the position we read in the image, with bottom left being `0,0` and the top right being `1,1`. Neither UV coordinates, nor shaders themselves have any concept of image resolution, screen resolution or aspect ratio. If we want to address individual pixels, it's on us to express that in terms of UV coordinates.

<blockquote class="reaction"><div class="reaction_text">Although <a target="_blank" href="https://michaldrobot.com/2014/04/01/gcn-execution-patterns-in-full-screen-passes/">there are ways to find out</a>, we don't know which order output
 pixels are processed in and although the <a target="_blank" href="https://docs.gl/sl4/gl_FragCoord">graphics pipeline can tell us</a>, the shader doesn't even know which output pixel it currently processes</div><img class="kiwi" src="/assets/kiwis/book.svg"></blockquote>

The framebuffer, is passed into the fragment shader in line `uniform sampler2D texture` as a texture. Using the blur framebuffer, we draw a "Full Screen Quad", a rectangle to cover the entire canvas, with matching `varying vec2 uv` UV coordinates `0, 0` in the bottom-left and `1, 1` in the top-right to read from the texture.

The texture's aspect-ratio and resolution are the same as the output canvas's aspect-ratio and resolution, thus there is a 1:1 pixel mapping between the texture we will process and our output canvas. The [graphics pipeline steps](js/simple.js) and [vertex shader](shader/simpleQuad.vs) responsible for this are not important for this article.

The blur fragment shader accesses the color of the texture with `texture2D(texture, uv)`, at the matching output pixel's position. In following examples, we'll read from neighboring pixels, for which we'll need to calculate a UV coordinate offset, a decimal fraction corresponding to one pixel step with "one, divided by canvas resolution"

<blockquote class="reaction"><div class="reaction_text">One way to think of fragment shader code is "What are the instructions to construct this output pixel?"</div><img class="kiwi" src="/assets/kiwis/think.svg"></blockquote>

Graphics programming is [uniquely challenging](https://www.youtube.com/watch?v=xJQ0qXh1-m0) in the beginning, because of how many rules and limitations the hardware, [graphics APIs](https://en.wikipedia.org/wiki/Graphics_library) and the [rendering pipeline](https://fgiesen.wordpress.com/2011/07/09/a-trip-through-the-graphics-pipeline-2011-index/) impose. But it also unlocks incredible potential, as other limitations dissolve. Let's find out how graphics programmers have leveraged that potential.

## Box Blur
From a programmer's perspective, the most straight forward way is to average the neighbors of a pixel using a [for-loop](https://en.wikipedia.org/wiki/For_loop). What the fragment shader is expressing is: "_look X pixels up, down, left, right and average the colors_". The more we want to blur, the more we have to increase `kernelSize`, the bounds of our for-loop.

The bigger the for-loop, the more texture reads we perform, **per output-pixel**. Each texture read is often called a "texture tap" and the total amount of those "taps" per-frame will now also be displayed. New controls, new `samplePosMultiplier`, new terms - Play around with them, get a feel for them, with a constant eye on FPS.

<div id="WebGLBox-BoxBlur">
<div style="display: flex; gap: 8px">
	<div class="toggleRes" style="width: 100%">
		<label>
			<input type="radio" name="modeBox" value="scene" checked />
			Scene
		</label>
		<label>
			<input type="radio" name="modeBox" value="lights" />
			Lights
		</label>
		<label>
			<input type="radio" name="modeBox" value="bloom" />
			Bloom
		</label>
	</div>
	<div class="toggleRes toggleCheckbox" style="flex:0 0 auto; white-space:nowrap;">
		  <label>
		  	<input type="checkbox" id="animateCheck" checked />
		  		Animate
		  </label>
	</div>
</div>
<div style="margin-top: 13px" class="canvasParent">
	<canvas style="width: round(down, 100%, 8px); aspect-ratio: 4 / 3;"></canvas>
	<div class="contextLoss" id="contextLoss">❌ The browser killed this WebGL Context, please reload the page. If this happened as the result of a long benchmark, decrease the iteration count. On some platforms (iOS / iPad) you may have to restart the browser App completely, as the browser will temporarily refuse to allow this site to run WebGL again.</div>
	{% include "style/icons/clock.svg" %}
</div>
<table class="settingsTable" style="width: 100%; max-width: 100%;">
	<tr>
	    <td colspan=4 class="stats">
	        <div>
	            <span>
	                <strong>FPS:</strong> <output id="fps">?</output> / <output id="ms">?</output> ms
	            </span>
	            <span>
	                <strong>Resolution:</strong> <output id="width">?</output>x<output id="height">?</output>
	            </span>
	            <span>
	                <strong>Texture Taps:</strong> <output id="taps">?</output>
	            </span>
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
			<input class="slider" type="range" step="1" min="0" max="32" value="3" id="sizeRange"
			oninput="this.closest('tr').querySelector('output').value = `${parseInt(this.value) * 2 + 1}×${parseInt(this.value) * 2 + 1}`">
		</td>
		<td style="text-align: center;">
			<output>7x7</output> px
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="resetSlider(this, '3', '7×7')">
				{% include "style/icons/rotate-right.svg" %}
			</button>
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
			<input class="slider" type="range" step="0.01" min="0" max="20" value="1" id="samplePosRange"
			oninput="this.closest('tr').querySelector('output').value = parseInt(this.value * 100)">
		</td>
		<td style="text-align: center;">
			<output>100</output> %
		</td>
		<td style="text-align: center;">
			<button id="samplePosRangeReset" class="roundButton" onclick="resetSlider(this, '1', '100')">
					{% include "style/icons/rotate-right.svg" %}
				</button>
		</td>
	</tr>
	<tr class="variable-name-row noborder">
		<td colspan=4>
			<code>lightBrightness</code>
		</td>
	</tr>
	<tr>
		<td class="variable-name-cell">
			<code>lightBrightness</code>
		</td>
		<td style="width:100%">
			<input disabled class="slider" type="range" step="0.01" min="0" max="20" value="1" id="lightBrightness" oninput="
			this.closest('tr').querySelector('output').value = parseInt(this.value * 100) ">
		</td>
		<td style="text-align: center;">
			<output>100</output> %
		</td>
		<td style="text-align: center;">
			<button disabled id="lightBrightnessReset" class="roundButton" onclick="resetSlider(this, '1', '100')">
				{% include "style/icons/rotate-right.svg" %}
			</button>
		</td>
	</tr>
</table>
<script type="module">
	import { setupBoxBlur } from "./js/boxBlur.js";
	setupBoxBlur();
</script>
</div>
<!-- Benchmark in 1feb0231a940d3dd9989103795f199b4baedb535 -->
<blockquote>
<details><summary><a target="_blank" href="screenshots/fxaainteractive.png">Screenshot</a>, in case WebGL doesn't work</summary>

<!-- ![image](screenshots/fxaainteractive.png) -->

</details>
<details>	
<summary>Blur Fragment Shader <a target="_blank" href="shader/boxBlur.fs">boxBlur.fs</a></summary>

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

Visually, the result doesn't look very pleasant. The stronger the blur, the more "boxy" image features become. This is due to us reading and averaging the texture in a square shape. Especially, in bloom mode, with strong `lightBrightness` and big `kernelSize`, lights become literally square.

Performance is also really bad. With bigger `kernelSizes`, our `Texture Taps` count skyrockets and performance drops. Mobile devices will come to a slog. Even the worlds fastest PC graphics cards will fall below screen refresh-rate by cranking `kernelSize` and zooming the article on PC, thus raising canvas resolution.

<blockquote class="reaction"><div class="reaction_text">We kinda failed on all fronts. It looks bad <strong>and</strong> runs bad.</div><img class="kiwi" src="/assets/kiwis/tired.svg"></blockquote>

Then, there's this `samplePosMultiplier`. It seems to *also* seemingly increase blur strength, *without* increasing textureTaps or lowering performance (or lowering performance just a little on certain devices). But if we crank *that* too much, we get artifacts in the form of repeating patterns. Let's play with a schematic example:

<blockquote class="reaction"><div class="reaction_text">What you may have noticed, is that increasing the sample Multiplier just a little bit, between 100% and 150% does not introduce artifacts. Something deeper is happening. Put at a pin in that...</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

- The white center square represents the output pixel
- Grey squares are the pixels we would read, with the current `kernelSize`, with `samplePosMult` untouched
- the black dots are our *actual* texture reads ***per-output-pixel***, our "sample" positions
<div id="SVGBox-kernelPreview">
	<svg></svg>
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
				<input class="slider" type="range" step="1" min="0" max="16" value="1" id="kernelRange" oninput="
				this.closest('tr').querySelector('output').value = `${parseInt(this.value) * 2 + 1}×${parseInt(this.value) * 2 + 1}`">
			</td>
			<td style="text-align: center;">
				<output>3×3</output>
			</td>
			<td style="text-align: center;">
				<button class="roundButton" onclick="resetSlider(this, '1', '3×3')">
					{% include "style/icons/rotate-right.svg" %}
				</button>
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
				<input class="slider" type="range" step="any" min="0" max="10" value="1" id="samplePosMult" oninput="
				this.closest('tr').querySelector('output').value = parseInt(this.value * 100)">
			</td>
			<td style="text-align: center;">
				<output>100</output>%
			</td>
			<td style="text-align: center;">
				<button id="samplePosMultReset" class="roundButton" onclick="resetSlider(this, '1', '100')">{% include "style/icons/rotate-right.svg" %}</button>
			</td>
		</tr>
	</table>
	<script type="module">
		import { setupKernelPreview } from "./js/kernelPreview.js";
		setupKernelPreview();
	</script>
</div>

On can say, that an image is a "continous 2D signal". When we texture tap at a specific coordinate, we are _sampling the "image signal" at that coordinate_. As previously mentioned, we use UV coordinates and are not bound concepts like "pixels". ***Where*** we place our samples is completely up to us.

A fundamental blur algorithm option is increasing the sample distance away from the center, thus increasing the amount of image we cover with our samples - more bang for your sample buck. This works by multiplying the offset distance. That is what `samplePosMult` does and is something you will have access to going forward.

Doing it too much, brings ugly repeating patterns. This of course leaves some fundamental questions, like where these artifacts come from and what it even means to read between two pixels. ***And*** on top of that we have to address performance and the boxyness of our blur! But first...

## What even _is_ a kernel?

## Gaussian Blur

<div id="WebGLBox-GaussianBlur">
<div style="display: flex; gap: 8px">
	<div class="toggleRes" style="width: 100%">
		<label>
			<input type="radio" name="modeGauss" value="scene" checked />
			Scene
		</label>
		<label>
			<input type="radio" name="modeGauss" value="lights" />
			Lights
		</label>
		<label>
			<input type="radio" name="modeGauss" value="bloom" />
			Bloom
		</label>
	</div>
	<div class="toggleRes toggleCheckbox" style="flex:0 0 auto; white-space:nowrap;">
		  <label>
		  	<input type="checkbox" id="animateCheck" checked />
		  		Animate
		  </label>
	</div>
</div>
<div style="margin-top: 13px" class="canvasParent">
	<canvas style="width: round(down, 100%, 8px); aspect-ratio: 4 / 3;"></canvas>
	<div class="contextLoss" id="contextLoss">❌ The browser killed this WebGL Context, please reload the page. If this happened as the result of a long benchmark, decrease the iteration count. On some platforms (iOS / iPad) you may have to restart the browser App completely, as the browser will temporarily refuse to allow this site to run WebGL again.</div>
	{% include "style/icons/clock.svg" %}
</div>
<table class="settingsTable" style="width: 100%; max-width: 100%;">
	<tr>
	    <td colspan=4 class="stats">
	        <div>
	            <span>
	                <strong>FPS:</strong> <output id="fps">?</output> / <output id="ms">?</output> ms
	            </span>
	            <span>
	                <strong>Resolution:</strong> <output id="width">?</output>x<output id="height">?</output>
	            </span>
	            <span>
	                <strong>Texture Taps:</strong> <output id="taps">?</output>
	            </span>
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
			<input class="slider" type="range" step="1" min="0" max="32" value="3" id="sizeRange"
			oninput="this.closest('tr').querySelector('output').value = `${parseInt(this.value) * 2 + 1}×${parseInt(this.value) * 2 + 1}`">
		</td>
		<td style="text-align: center;">
			<output>7x7</output> px
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="resetSlider(this, '3', '7×7')">
				{% include "style/icons/rotate-right.svg" %}
			</button>
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
			<input class="slider" type="range" step="0.01" min="0" max="20" value="1" id="samplePosRange"
			oninput="this.closest('tr').querySelector('output').value = parseInt(this.value * 100)">
		</td>
		<td style="text-align: center;">
			<output>100</output> %
		</td>
		<td style="text-align: center;">
			<button id="samplePosRangeReset" class="roundButton" onclick="resetSlider(this, '1', '100')">
					{% include "style/icons/rotate-right.svg" %}
				</button>
		</td>
	</tr>
	<tr class="variable-name-row noborder">
		<td colspan=4>
			<code>lightBrightness</code>
		</td>
	</tr>
	<tr>
		<td class="variable-name-cell">
			<code>lightBrightness</code>
		</td>
		<td style="width:100%">
			<input disabled class="slider" type="range" step="0.01" min="0" max="20" value="1" id="lightBrightness" oninput="
			this.closest('tr').querySelector('output').value = parseInt(this.value * 100) ">
		</td>
		<td style="text-align: center;">
			<output>100</output> %
		</td>
		<td style="text-align: center;">
			<button disabled id="lightBrightnessReset" class="roundButton" onclick="resetSlider(this, '1', '100')">
				{% include "style/icons/rotate-right.svg" %}
			</button>
		</td>
	</tr>
	<tr class="variable-name-row noborder">
		<td colspan=4>
			<code>sigma</code>
		</td>
	</tr>
	<tr class="noborder">
		<td class="variable-name-cell">
			<code>sigma</code>
		</td>
		<td style="width:100%">
			<input class="slider" type="range" step="0.1" min="0.1" max="10" value="2" id="sigmaRange" oninput="
			this.closest('tr').querySelector('output').value = Number(this.value).toFixed(2)">
		</td>
		<td style="text-align: center">
			± <output>2.00</output> σ
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="resetSlider(this, '2')">
				{% include "style/icons/rotate-right.svg" %}
			</button>
		</td>
	</tr>
</table>
<script type="module">
	import { setupGaussianBlur } from "./js/gaussianBlur.js";
	setupGaussianBlur();
</script>
</div>
<!-- Benchmark in 1feb0231a940d3dd9989103795f199b4baedb535 -->
<blockquote>
<details><summary><a target="_blank" href="screenshots/fxaainteractive.png">Screenshot</a>, in case WebGL doesn't work</summary>

<!-- ![image](screenshots/fxaainteractive.png) -->

</details>
<details>	
<summary>WebGL Fragment Shader <a target="_blank" href="shader/gaussianBlur.fs">gaussianBlur.fs</a></summary>

```glsl
{% include "posts/dual-kawase/shader/boxBlur.fs" %}
```

</details>
<details>	
<summary>WebGL Javascript <a target="_blank" href="js/gaussianBlur.js">gaussianBlur.js</a></summary>

```javascript
{% include "posts/dual-kawase/js/gaussianBlur.js" %}
```

</details>
</blockquote>

## Free Bilinear
<div id="WebGLBox-Bilinear">
	<div style="display: flex; gap: 8px">
		<div class="toggleRes" style="width: 100%">
			<label>
				<input type="radio" name="modeBilinear" value="nearest" checked />
				Nearest Neighbor
			</label>
			<label>
				<input type="radio" name="modeBilinear" value="bilinear" />
				Bilinear
			</label>
		</div>
		<div class="toggleRes toggleCheckbox" style="flex:0 0 auto; white-space:nowrap;">
			  <label>
			  	<input type="checkbox" id="animateCheck" checked />
			  		Animate
			  </label>
		</div>
	</div>
	<div style="margin-top: 13px" class="canvasParent">
		<canvas style="width: 100%; aspect-ratio: 4 / 3;"></canvas>
		<div class="contextLoss" id="contextLoss">❌ The browser killed this WebGL Context, please reload the page. If this happened as the result of a long benchmark, decrease the iteration count. On some platforms (iOS / iPad) you may have to restart the browser App completely, as the browser will temporarily refuse to allow this site to run WebGL again.</div>
		{% include "style/icons/clock.svg" %}
	</div>
	<table class="settingsTable" style="width: 100%; max-width: 100%;">
		<tr class="variable-name-row noborder">
			<td colspan=4>
				<code>kiwiSize</code>
			</td>
		</tr>
		<tr class="noborder">
			<td class="variable-name-cell">
				<code>kiwiSize</code>
			</td>
			<td style="width:100%">
				<input class="slider" type="range" step="0.01" min="0.01" max="1" value="1" id="kiwiSize"
				oninput="this.closest('tr').querySelector('output').value = parseInt(this.value * 100)">
			</td>
			<td style="text-align: center;">
				<output>100</output> %
			</td>
			<td style="text-align: center;">
				<button class="roundButton" onclick="resetSlider(this, '1', '100')">
					{% include "style/icons/rotate-right.svg" %}
				</button>
			</td>
		</tr>
	</table>
	<script type="module">
		import { setupBilinear } from "./js/bilinear.js";
		setupBilinear();
	</script>
</div>

<blockquote>
<details><summary><a target="_blank" href="screenshots/simple.png">Screenshot</a>, in case WebGL doesn't work</summary>

<!-- ![image](screenshots/simple.png) -->

</details>
<details>
<summary>WebGL Vertex Shader <a target="_blank" href="shader/circleAnimationSize.vs">circleAnimationSize.vs</a></summary>

```glsl
{% include "posts/dual-kawase/shader/circleAnimationSize.vs" %}
```

</details>
<details>
<summary>WebGL Fragment Shader <a target="_blank" href="shader/simpleTexture.fs">simpleTexture.fs</a></summary>

```glsl
{% include "posts/dual-kawase/shader/simpleTexture.fs" %}
```

</details>
<details>
<summary>WebGL Javascript <a target="_blank" href="js/bilinear.js">bilinear.js</a></summary>

```javascript
{% include "posts/dual-kawase/js/bilinear.js" %}
```

</details>
</blockquote>

<div id="SVGBox-bilinearPreview">
	<div style="display: flex; gap: 8px; margin-bottom: 13px">
		<div class="toggleRes" style="width: 100%">
			<label>
				<input type="radio" name="modeBilinearPrev" value="nearest" checked />
				Nearest Neighbor
			</label>
			<label>
				<input type="radio" name="modeBilinearPrev" value="bilinear" />
				Bilinear
			</label>
		</div>
		<div class="toggleRes toggleCheckbox" style="flex:0 0 auto; white-space:nowrap;">
			  <label>
			  	<input type="checkbox" id="animateCheck"/>
			  		Animate
			  </label>
		</div>
	</div>
	<svg></svg>
	<script type="module">
		import { setupBilinearPreview } from "./js/bilinearPreview.js";
		setupBilinearPreview();
	</script>
</div>

Relate to https://www.youtube.com/watch?v=uRjf8ZP6rs8

## Convolution
A Convolution


[In hardware, division is slower than multiplication. That is the reason resolution is passed in as ]

Living in Japan, I got the chance to interview an idol of me: Graphics Programmer Masaki Kawase.

<!-- <script src="https://cdn.jsdelivr.net/npm/eruda"></script>
<script>eruda.init();</script> -->

We can express sigma as it is usually done. Insert Sigma joke.
Here in [~~Isometric~~](https://en.wikipedia.org/wiki/Isometric_projection) [Dimetric](https://en.wikipedia.org/wiki/Axonometric_projection#Three_types) projection.

<div id="SVGBox-kernelIsometric">
	<svg id="kernelIso"></svg>
	<div style="margin-bottom: 0.5rem" class="toggleRes">
		<label>
		  <input type="radio" id="sigmaAbsolute" name="modeSigma" value="absolute" checked />
		  Absolute Sigma
		</label>
		<label>
		  <input type="radio" id="sigmaRelative" name="modeSigma" value="relative" />
		  Relative Sigma
		</label>
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
			<td style="width:100%; white-space: unset;">
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
</div>

We have this issue of sigma too small? We get box blur like artifacts. Sigma too big? We waste blur strength, have to go with bigger kernels and sacrifice performance. This is an artistic trade-off, that every piece of software has to make. There are different ways of choosing these kernels.

Where is the optimum? Eg. we can choose a kernel level, where the last rows are almost zero, thus "if we increased the kernel size in absolute Sigma mode, it would make no more *visual* difference". There are other ways of creating kernels, with other properties. One way is to deviate from the gaussian blur and follow Pascal's triangle to get predefined kernel sizes and values. These are called [Binomial Filters](https://bartwronski.com/2021/10/31/practical-gaussian-filter-binomial-filter-and-small-sigma-gaussians/). These lock us into specific "kernel presets", but have properties which are useful for image resampling. We won't expand on these further, just know that we can choose kernels by different mathematical criteria.

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

## The magic of frequency space
There is actually an alternative way to perform blurring, by performing an [image Fast Fourier Transform](https://usage.imagemagick.org/fourier/#introduction), [masking high frequency areas to perform the blur](https://usage.imagemagick.org/fourier/#blurring) and finally performing the inverse transformation.

If we ignore the frequency domain transformation steps, then this makes the blurring step itself constant in time, regardless of blur radius! Small Radius Blur, Large Radius blur, all the same speed. But of course, we ***can't*** ignore the Frequency domain transformations.
Unfortunately, this cannot be used in practice, as the FFT and inverse FFT steps don't translate well into a graphics pipeline context at all. 

3Blue1Brown covered what a Fourier Transform is, on its fundamental level was covered in [great detail in a video series already](https://www.youtube.com/watch?v=spUNpyF58BY).

Fourier code written by https://github.com/turbomaze/JS-Fourier-Image-Analysis

<div id="FFTBox">
	<div style="display: flex; gap: 8px">
		<div class="toggleRes iconButton" style="flex:0 0 auto; white-space:nowrap;">
			<label>
				<div>
					<input type="file" id="upload" accept="image/*">
					Upload
					<span>Image</span>
				</div>
				{% include "style/icons/upload.svg" %}
			</label>
		</div>
		<div class="toggleRes" style="width: 100%">
			<label>
				<input type="radio" name="brushMode" value="black" checked />
				Remove<span>Frequency Energy</span>
			</label>
			<label>
				<input type="radio" name="brushMode" value="white" />
				Add<span>Frequency Energy</span>
			</label>
		</div>
		<div class="toggleRes" style="flex:0 0 auto; white-space:nowrap;">
			<label>
				<button id="reset" style="display: none" onclick="
				document.getElementById('resetFFTRadius').dispatchEvent(new Event('click'))"
				></button>
				Reset<span>Magnitude</span>
			</label>
		</div>
	</div>
	<div style="margin-top: 13px">
		<div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 8px">
			<canvas style="width: unset" id="magnitude" width="256" height="256"></canvas>
			<canvas style="width: unset" id="output" width="256" height="256"></canvas>
		</div>
	</div>
	<table class="settingsTable" style="width: 100%; max-width: 100%;">
		<tr class="variable-name-row noborder">
			<td colspan=4>
				<code>frequencyCutRadius</code>
			</td>
		</tr>
		<tr class="noborder">
			<td class="variable-name-cell">
				<code>frequencyCutRadius</code>
			</td>
			<td style="width:100%">
				<input class="slider" type="range" step="1" min="0" max="128" value="128" id="radius"
				oninput="
					this.closest('tr').querySelector('output').value = this.value + ' px';
					if(this.value == 128)
						this.closest('tr').querySelector('output').value = 'off';
				">
			</td>
			<td style="text-align: center; min-width: 53px">
				<output>off</output>
			</td>
			<td style="text-align: center;">
				<button id="resetFFTRadius" class="roundButton" onclick="resetSlider(this, '128', 'off');">
					{% include "style/icons/rotate-right.svg" %}
				</button>
			</td>
		</tr>
		<tr class="variable-name-row noborder">
			<td colspan=4>
				<code>feather</code>
			</td>
		</tr>
		<tr>
			<td class="variable-name-cell">
				<code>feather</code>
			</td>
			<td style="width:100%">
				<input class="slider" type="range" step="1" min="0" max="32" value="0" id="feather"
				oninput="this.closest('tr').querySelector('output').value = this.value">
			</td>
			<td style="text-align: center;">
				<output id="featherVal">0</output>
			</td>
			<td style="text-align: center;">
				<button class="roundButton" onclick="resetSlider(this, '0')">
					{% include "style/icons/rotate-right.svg" %}
				</button>
			</td>
		</tr>
	</table>
</div>

<script src="js/fourier.js"></script>
<script type="module">
	import { setupFFT } from "./js/fftImageViz.js";
	setupFFT();
</script>

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

<blockquote class="reaction"><div class="reaction_text">This is a <strong>deep misunderstanding</strong> I held for years.<output></output></div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>


<blockquote class="reaction"><div class="reaction_text">Blurs and Bloom based on FFT Low Pass filtering would extinguish small lights like candles present in the 3D scene, by extinguishing the high frequency energy that is used to describe that light.<output></output></div><img class="kiwi" src="/assets/kiwis/think.svg"></blockquote>

## Gaussian Blur Separable

<div id="WebGLBox-GaussianSeparableBlur">
<div style="display: flex; gap: 8px">
	<div class="toggleRes" style="width: 100%">
		<label>
			<input type="radio" name="modeGaussSep" value="scene" checked />
			Scene
		</label>
		<label>
			<input type="radio" name="modeGaussSep" value="lights" />
			Lights
		</label>
		<label>
			<input type="radio" name="modeGaussSep" value="bloom" />
			Bloom
		</label>
	</div>
	<div class="toggleRes toggleCheckbox" style="flex:0 0 auto; white-space:nowrap;">
		  <label>
		  	<input type="checkbox" id="animateCheck" checked/>
		  		Animate
		  </label>
	</div>
</div>
<div style="margin-top: 13px; margin-bottom: 13px" class="canvasParent">
	<canvas style="width: round(down, 100%, 8px); aspect-ratio: 4 / 3;"></canvas>
	<div class="contextLoss" id="contextLoss">❌ The browser killed this WebGL Context, please reload the page. If this happened as the result of a long benchmark, decrease the iteration count. On some platforms (iOS / iPad) you may have to restart the browser App completely, as the browser will temporarily refuse to allow this site to run WebGL again.</div>
	{% include "style/icons/clock.svg" %}
</div>
<div class="toggleRes" style="width: 100%; border-radius: 50px">
	<label>
		<input type="radio" name="passMode" value="pass1" checked />
		Pass 1
	</label>
	<label>
		<input type="radio" name="passMode" value="pass2"/>
		Pass 2
	</label>
	<label>
		<input type="radio" name="passMode" value="combined"/>
		Both
	</label>
</div>
<table class="settingsTable" style="width: 100%; max-width: 100%;">
	<tr>
	    <td colspan=4 class="stats">
	        <div>
	            <span>
	                <strong>FPS:</strong> <output id="fps">?</output> / <output id="ms">?</output> ms
	            </span>
	            <span>
	                <strong>Resolution:</strong> <output id="width">?</output>x<output id="height">?</output>
	            </span>
	            <span>
	                <strong>Texture Taps:</strong> <output id="taps">?</output>
	            </span>
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
			<input class="slider" type="range" step="1" min="0" max="32" value="3" id="sizeRange"
			oninput="this.closest('tr').querySelector('output').value = `${parseInt(this.value) * 2 + 1}×${parseInt(this.value) * 2 + 1}`">
		</td>
		<td style="text-align: center;">
			<output>7x7</output> px
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="resetSlider(this, '3', '7×7')">
				{% include "style/icons/rotate-right.svg" %}
			</button>
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
			<input class="slider" type="range" step="0.01" min="0" max="20" value="1" id="samplePosRange"
			oninput="this.closest('tr').querySelector('output').value = parseInt(this.value * 100)">
		</td>
		<td style="text-align: center;">
			<output>100</output> %
		</td>
		<td style="text-align: center;">
			<button id="samplePosRangeReset" class="roundButton" onclick="resetSlider(this, '1', '100')">
					{% include "style/icons/rotate-right.svg" %}
				</button>
		</td>
	</tr>
	<tr class="variable-name-row noborder">
		<td colspan=4>
			<code>lightBrightness</code>
		</td>
	</tr>
	<tr>
		<td class="variable-name-cell">
			<code>lightBrightness</code>
		</td>
		<td style="width:100%">
			<input disabled class="slider" type="range" step="0.01" min="0" max="20" value="1" id="lightBrightness" oninput="
			this.closest('tr').querySelector('output').value = parseInt(this.value * 100) ">
		</td>
		<td style="text-align: center;">
			<output>100</output> %
		</td>
		<td style="text-align: center;">
			<button disabled id="lightBrightnessReset" class="roundButton" onclick="resetSlider(this, '1', '100')">
				{% include "style/icons/rotate-right.svg" %}
			</button>
		</td>
	</tr>
	<tr class="variable-name-row noborder">
		<td colspan=4>
			<code>sigma</code>
		</td>
	</tr>
	<tr class="noborder">
		<td class="variable-name-cell">
			<code>sigma</code>
		</td>
		<td style="width:100%">
			<input class="slider" type="range" step="0.1" min="0.1" max="10" value="2" id="sigmaRange" oninput="
			this.closest('tr').querySelector('output').value = Number(this.value).toFixed(2)">
		</td>
		<td style="text-align: center">
			± <output>2.00</output> σ
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="resetSlider(this, '2')">
				{% include "style/icons/rotate-right.svg" %}
			</button>
		</td>
	</tr>
</table>
<script type="module">
	import { setupGaussianSeparableBlur } from "./js/gaussianSeparableBlur.js";
	setupGaussianSeparableBlur();
</script>
</div>
<!-- Benchmark in 1feb0231a940d3dd9989103795f199b4baedb535 -->
<blockquote>
<details><summary><a target="_blank" href="screenshots/fxaainteractive.png">Screenshot</a>, in case WebGL doesn't work</summary>

<!-- ![image](screenshots/fxaainteractive.png) -->

</details>
<details>	
<summary>WebGL Fragment Shader <a target="_blank" href="shader/gaussianBlur.fs">gaussianBlur.fs</a></summary>

```glsl
{% include "posts/dual-kawase/shader/boxBlur.fs" %}
```

</details>
<details>	
<summary>WebGL Javascript <a target="_blank" href="js/gaussianSeparableBlur.js">gaussianSeparableBlur.js</a></summary>

```javascript
{% include "posts/dual-kawase/js/gaussianSeparableBlur.js" %}
```

</details>
</blockquote>

Technically, there is a tradeoff with small kernels. Extra drawcall (Fullscreen drawcall, so actually really expensive), vs extra filtering.

Going forward, no reason to not be separable.

## Downsampling

<div id="WebGLBox-GaussianDownsampleBlur">
<div style="display: flex; gap: 8px">
	<div class="toggleRes" style="width: 100%">
		<label>
			<input type="radio" name="modeDownsample" value="scene" checked />
			Scene
		</label>
		<label>
			<input type="radio" name="modeDownsample" value="lights" />
			Lights
		</label>
		<label>
			<input type="radio" name="modeDownsample" value="bloom" />
			Bloom
		</label>
	</div>
	<div class="toggleRes toggleCheckbox" style="flex:0 0 auto; white-space:nowrap;">
		  <label>
		  	<input type="checkbox" id="animateCheck" checked />
		  		Animate
		  </label>
	</div>
</div>
<div style="margin-top: 13px; margin-bottom: 13px" class="canvasParent">
	<canvas style="width: round(down, 100%, 8px); aspect-ratio: 4 / 3;"></canvas>
	<div class="contextLoss" id="contextLoss">❌ The browser killed this WebGL Context, please reload the page. If this happened as the result of a long benchmark, decrease the iteration count. On some platforms (iOS / iPad) you may have to restart the browser App completely, as the browser will temporarily refuse to allow this site to run WebGL again.</div>
	{% include "style/icons/clock.svg" %}
</div>
<div class="toggleRes" style="width: 100%; border-radius: 50px">
	<label>
		<input type="radio" name="skipMode" value="Normal" checked />
		Normal
	</label>
	<label>
		<input type="radio" name="skipMode" value="skipDown"/>
		Skip Downsample Steps
	</label>
	<label>
		<input type="radio" name="skipMode" value="skipUp"/>
		Skip Upsample Steps
	</label>
</div>
<table class="settingsTable" style="width: 100%; max-width: 100%;">
	<tr>
	    <td colspan=4 class="stats">
	        <div>
	            <span>
	                <strong>FPS:</strong> <output id="fps">?</output> / <output id="ms">?</output> ms
	            </span>
	            <span>
	                <strong>Resolution:</strong> <output id="width">?</output>x<output id="height">?</output>
	            </span>
	            <span>
	                <strong>Texture Taps:</strong> <output id="taps">?</output>
	            </span>
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
			<input class="slider" type="range" step="1" min="0" max="32" value="3" id="sizeRange"
			oninput="this.closest('tr').querySelector('output').value = `${parseInt(this.value) * 2 + 1}×${parseInt(this.value) * 2 + 1}`">
		</td>
		<td style="text-align: center;">
			<output>7x7</output> px
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="resetSlider(this, '3', '7×7')">
				{% include "style/icons/rotate-right.svg" %}
			</button>
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
			<input class="slider" type="range" step="0.01" min="0" max="20" value="1" id="samplePosRange"
			oninput="this.closest('tr').querySelector('output').value = parseInt(this.value * 100)">
		</td>
		<td style="text-align: center;">
			<output>100</output> %
		</td>
		<td style="text-align: center;">
			<button id="samplePosRangeReset" class="roundButton" onclick="resetSlider(this, '1', '100')">
					{% include "style/icons/rotate-right.svg" %}
				</button>
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
			<input class="slider" type="range" step="1" min="0" max="8" value="0" id="downSampleRange"
			oninput="this.closest('tr').querySelector('output').value = this.value">
		</td>
		<td style="text-align: center;">
			<output>0</output>
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="resetSlider(this, '0')">
				{% include "style/icons/rotate-right.svg" %}
			</button>
		</td>
	</tr>
	<tr class="variable-name-row noborder">
		<td colspan=4>
			<code>lightBrightness</code>
		</td>
	</tr>
	<tr>
		<td class="variable-name-cell">
			<code>lightBrightness</code>
		</td>
		<td style="width:100%">
			<input disabled class="slider" type="range" step="0.01" min="0" max="20" value="1" id="lightBrightness" oninput="
			this.closest('tr').querySelector('output').value = parseInt(this.value * 100) ">
		</td>
		<td style="text-align: center;">
			<output>100</output> %
		</td>
		<td style="text-align: center;">
			<button disabled id="lightBrightnessReset" class="roundButton" onclick="resetSlider(this, '1', '100')">
				{% include "style/icons/rotate-right.svg" %}
			</button>
		</td>
	</tr>
	<tr class="variable-name-row noborder">
		<td colspan=4>
			<code>sigma</code>
		</td>
	</tr>
	<tr class="noborder">
		<td class="variable-name-cell">
			<code>sigma</code>
		</td>
		<td style="width:100%">
			<input class="slider" type="range" step="0.1" min="0.1" max="10" value="2" id="sigmaRange" oninput="
			this.closest('tr').querySelector('output').value = Number(this.value).toFixed(2)">
		</td>
		<td style="text-align: center">
			± <output>2.00</output> σ
		</td>
		<td style="text-align: center;">
			<button class="roundButton" onclick="resetSlider(this, '2')">
				{% include "style/icons/rotate-right.svg" %}
			</button>
		</td>
	</tr>
</table>
<script type="module">
	import { setupGaussianDownsampleBlur } from "./js/downsample.js";
	setupGaussianDownsampleBlur();
</script>
</div>
<!-- Benchmark in 1feb0231a940d3dd9989103795f199b4baedb535 -->
<blockquote>
<details><summary><a target="_blank" href="screenshots/fxaainteractive.png">Screenshot</a>, in case WebGL doesn't work</summary>

<!-- ![image](screenshots/fxaainteractive.png) -->

</details>
<details>	
<summary>WebGL Fragment Shader <a target="_blank" href="shader/gaussianBlur.fs">gaussianBlur.fs</a></summary>

```glsl
{% include "posts/dual-kawase/shader/boxBlur.fs" %}
```

</details>
<details>	
<summary>WebGL Javascript <a target="_blank" href="js/gaussianBlur.js">gaussianBlur.js</a></summary>

```javascript
{% include "posts/dual-kawase/js/gaussianBlur.js" %}
```

</details>
</blockquote>

Skip Upsample has an effect, no way!
Illogical, but discovery by Masaki Kawase.

First time I read this, didn't understand it.

Smoother because, we interpolate multiple times.

Think, in a way, the jump directly up is more accurate! But also uglier.

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

To conclude this part, my recommendation is to *always consider the integral if you want to use any sigmas below 0.7*.

And for a further exercise for the reader, you can think of how this would change under some different reconstruction function (hint: it becomes a weighted integral, or an integral of convolution; for the box / nearest neighbor, the convolution is with a rectangular function).

[https://gangles.ca/2008/07/18/bloom-disasters/](https://gangles.ca/2008/07/18/bloom-disasters/)

## Bin

<blockquote class="reaction"><div class="reaction_text">You may notice a black streak with stronger blur levels along the bottom. This is when a line aligns with the bottom of the frame, extending the black color to infinity.</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>