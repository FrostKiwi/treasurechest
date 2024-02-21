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

[Look-up-tables](https://en.wikipedia.org/wiki/Lookup_table), more commonly referred to as LUTs, are as old as Mathematics itself. The act of precalculating things into a row or table is nothing new. But in the realm of graphics programming, this simple act unlocks some incredibly creative techniques, which both artists and programmers found when faced with tough technical hurdles. It also just so happens, that these techniques map incredibly well to how GPUs work, with some ending up having zero performance impact.

We'll embark on a small journey, which will take us from simple things like turning grayscale footage into color, to creating limitless variations of blood-lusting zombies, with many interactive examples illustrated in WebGL along the way, that you can try out with your own videos or webcam. Though this article uses [WebGL](https://en.wikipedia.org/wiki/WebGL), the techniques shown apply to any other graphics programming context, be it [DirectX](https://en.wikipedia.org/wiki/DirectX), [OpenGL](https://en.wikipedia.org/wiki/OpenGL), [Vulkan](https://en.wikipedia.org/wiki/Vulkan), game engines like [Unity](<https://en.wikipedia.org/wiki/Unity_(game_engine)>), or plain scientific data visualization.

<figure>
	<video width="1400" height="480" style="width: unset; max-width: 100%" autoplay playsinline muted controls loop><source src="preview.mp4" type="video/mp4"></video>
	<figcaption>Cold ice cream and hot tea. Left: Panasonic GH6, Right: TESTO 890 + 15°x11° Lens</figcaption>
</figure>

First, let's nail down the basics. We'll be creating and modifying the video above, though you may substitute the footage with your own at any point in the article. The video is a capture of two cameras, a [Panasonic GH6](https://www.dpreview.com/reviews/panasonic-lumix-dc-gh6-review) and a [TESTO 890](https://www.testo.com/en/testo-890/p/0563-0890-X1) thermal camera. I'm eating cold ice cream and drinking hot tea to stretch the temperatures on display.

## The Setup

We'll first start with the thermal camera footage. The output of the [thermal camera](https://en.wikipedia.org/wiki/Thermographic_camera) is a grayscale video. Instead of this video, you may upload your own or activate the WebCam, which allows you to live stream from a thermal camera using OBS's various input methods and output a virtual camera.

<blockquote class="reaction"><div class="reaction_text">No data leaves your device, all processing happens on your GPU. Feel free to use videos exposing your most intimate secrets.</div><img class="kiwi" src="/assets/kiwis/happy.svg"></blockquote>

<input type="file" id="fileInput" accept="video/*" style="display: none;" onchange="changeVideo(this)">

<div class="center-child"><button onclick="document.getElementById('fileInput').click();">Upload Video</button><button onclick="startWebcam();">Connect Webcam</button></div>

<video width="100%" height="480" playsinline muted controls loop id="videoPlayer"><source src="bwvid.mp4" type="video/mp4"></video></div>

<script src="videoSource.js"></script>

Next we upload this footage to the graphics card using WebGL and redisplay it using a [shader](https://learnopengl.com/Getting-started/Hello-Triangle), which leaves the footage untouched. Each frame is transferred as a 2D [texture](https://learnopengl.com/Getting-started/Textures) to the GPU. We haven't actually done anything visual yet, but now a have graphics pipeline, which allows us to manipulate the video data in realtime. From here on out, we are mainly interested in the "[Fragment Shader](https://learnopengl.com/Getting-started/Hello-Triangle)". This is the piece of code that runs per pixel of the video to determine its final color.

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

### Performance is free

**_Depending on the context_**, the multiplication introduced by the tinting has zero performance impact. On a theoretical level, the multiplication has a cost associated with it, since the chip has to perform this multiplication at some point. But you will probably not be able to measure it, as the multiplication is affected by "[latency hiding](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2016/EECS-2016-143.pdf)". The act, cost and latency of pushing the video though the graphics pipeline unlocks a lot of manipulations we get for free this way. We can rationalize this from multiple levels:

- Fetching the texture from memory takes way more time than a multiplication
  - Even though the result depends on the texture tap, with multiple threads the multiplication can performed while waiting on the texture tap of another pixel
- Depending on implementation of video decoding, the CPU has to upload each frame to the GPU
  - Transfers between CPU and GPU are very costly and take time
- We are locked to the display's refresh rate
  - It's a bit mental gymnastics, but considering that, anything is "free" as long as we are faster than the display

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

Now that we have gotten an idea of how we can interact and manipulate color in a graphics programming context, let's dive into how the LUT can elevate that. There core of the idea is this: Instead of defining how the colors are changed across their entire range, let's define what color range changes in what way. If you have replaced the above thermal image with an RGB video of your own, then just the red channel will be used going forward.

The following examples make more sense in context of thermal camera footage, so you can click the following button to revert to it, if you wish.

<div class="center-child">
<button onclick='changeVideoURL("bwvid.mp4")'>Reload thermal camera footage</button></div>

### The humble 1D LUT

A 1D LUT is a simple array of numbers. According that array, we will color our gray video according to that array. In the context of graphics programming, this gets uploaded as a 1D-texture to the graphics card, where it is used to color the grayscale video.

<div class="center-child">
<select id="lutSelector">
    <option value="LUTs/inferno.png">Inferno - 256 wide</option>
    <option value="LUTs/inferno128.png">Inferno - 128 wide</option>
    <option value="LUTs/inferno64.png">Inferno - 64 wide</option>
    <option value="LUTs/inferno32.png">Inferno - 32 wide</option>
    <option value="LUTs/inferno16.png">Inferno - 16 wide</option>
    <option value="LUTs/inferno8.png">Inferno - 8 wide</option>
    <option value="LUTs/inferno4.png">Inferno - 4 wide</option>
    <option value="LUTs/inferno2.png">Inferno - 2 wide</option>
</select>
</div>

<img src="LUTs/inferno.png" id="lut" style="width: 100%; height: 64px;">

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

### Still performance free?

The main concern comes from us creating something called a "dependant texture read". We are triggering one texture read based on the result of another. In graphics programming, a performance sin, as we eliminate a whole class of possible optimized paths, that graphics drivers consider.

### Precalculating calculations

Another use is in accelerating calculations. One such example is [Gamma](https://en.wikipedia.org/wiki/Gamma_correction). It contains [as Gamma 2.2, instead of the piece-wise curve](https://www.colour-science.org/posts/srgb-eotf-pure-gamma-22-or-piece-wise-function/)
Especially older GPUs

### Camera 3D LUTs

As with the previous example, we can have three 1D LUTs for each color channel, so why would we even need a whole RGB cube?

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

### Redshift

Tinting the monitor orange during night time to prevent eye-strain, performed by Software like [Redshift](http://jonls.dk/redshift/) works by changing the Gamma Ramp, a 1-D LUT each for the Red, Green and Blue channel of the monitor. To do so it precalculates the Kelvin Warmth -> RGB and additional Gamma calculations by generating 3 LUTs, as seen in the code here: https://github.com/jonls/redshift/blob/490ba2aae9cfee097a88b6e2be98aeb1ce990050/src/colorramp.c#L289

This approach is pretty awesome with its has zero performance impact, as the calculations are done by the monitor, not the graphics card. Though support for this hardware interface is pretty horrible across the board and more often than not broken or unimplemented, with graphics stacks like the one of the Raspberry Pi working backwards and losing support.

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

#### Valve Software's genius in optimizing

<audio controls><source src="Tristan-Reidford.mp3" type="audio/mpeg"></audio>

> **Tristan Reidford:** Usually each model in the game has its own unique texture maps painted specifically for that model, which give the object its surface colors and detail. To have a convincing variety of cars using this method would have required as many textures as varieties of car, plus multiple duplicates of the textures in different colors, which would have been far out of our allotted texture memory budget. So we had to find a more efficient way to bring about that same result. For example, the texture on this car is shared with 3 different car models distributed throughout the environment. In addition to this one color texture, there is also a 'mask' texture that allows each instance of the car's painted surfaces to be tinted a different color, without having to author a separate texture. So for the cost of two textures you can get four different car models in an unlimited variety of colors.

<figure>
	<img src="Left4Dead.jpg" alt="Screenshot: Left4Dead and its use tinting cars the same material to get achieve new looks." />
	<figcaption>Screenshot: Left4Dead and its use tinting cars the same material to get achieve new looks.</figcaption>
</figure>

Note, that it's not just cars. Essentially everything in the [Source Engine](<https://en.wikipedia.org/wiki/Source_(game_engine)>) can be tinted.

<figure>
	<video width="960" height="540" controls><source src="left4dead_Gradients.mp4" type="video/mp4"></video>
	<figcaption>Video: Creating Zombie variation using gradient ramps
	<br>
	Source: Excerpt from <a href="https://www.gdcvault.com/play/1012264/Shading-a-Bigger-Better-Sequel">"Shading a Bigger, Better Sequel: Techniques in Left 4 Dead 2"</a>, GDC 2010 talk by [Bronwen Grimes](http://www.bronwengrimes.com)
	</figcaption>
</figure>

[OpenLara DIV](https://github.com/XProger/OpenLara/commit/e9ba3a278499fd61768a6ab148b72d9f7d5d5828)

<iframe width="100%" style="aspect-ratio: 1.78;" src="https://www.youtube.com/embed/_GVSLcqGP7g?si=NST1tXJb7_oB3acl&amp;start=303" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

### サーマルカラー

ですが、オレンジは比較的つまらんですので、「[LUT](https://ja.wikipedia.org/wiki/%E3%83%AB%E3%83%83%E3%82%AF%E3%82%A2%E3%83%83%E3%83%97%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB)」という画像または表を使います。その画像は 1 次元の行です。あの画像の高さは 1px です。見えるように、下の画像が 1px の高さから 64px の高さにストレッチされます。

### カラーリングのおすすめ

科学の世界は具体的なカラーリングのマップを定義した。「[Viridis](https://cran.r-project.org/web/packages/viridis/vignettes/intro-to-viridis.html)」というカラー。そのカラーを使うべきです。理由が多い、一番大切：色覚異常の人が温度が高いと温度が低いの場所をわかります。そして、虹のマップを黒白プリンターで印刷すると、温度が低いと温度が高いは黒と白として印刷されません。「Viridis」なら、黒白プリンターで印刷すると、温度が低い場所はいつもくらい、温度が高い場所はいつも眩しい。

cividis developed it further: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0199239#pone.0199239.ref001

<div class="center-child">
<select id="lutSelector2">
    <option value="LUTs/viridis.png">Viridis</option>
	<option value="LUTs/Accent.png">Accent</option>
	<option value="LUTs/afmhot.png">afmhot</option>
	<option value="LUTs/autumn.png">autumn</option>
	<option value="LUTs/binary.png">binary</option>
	<option value="LUTs/Blues.png">Blues</option>
	<option value="LUTs/bone.png">bone</option>
	<option value="LUTs/BrBG.png">BrBG</option>
	<option value="LUTs/brg.png">brg</option>
	<option value="LUTs/BuGn.png">BuGn</option>
	<option value="LUTs/BuPu.png">BuPu</option>
	<option value="LUTs/bwr.png">bwr</option>
	<option value="LUTs/cividis.png">cividis</option>
	<option value="LUTs/CMRmap.png">CMRmap</option>
	<option value="LUTs/cool.png">cool</option>
	<option value="LUTs/coolwarm.png">coolwarm</option>
	<option value="LUTs/copper.png">copper</option>
	<option value="LUTs/cubehelix.png">cubehelix</option>
	<option value="LUTs/Dark2.png">Dark2</option>
	<option value="LUTs/flag.png">flag</option>
	<option value="LUTs/gist_earth.png">gist_earth</option>
	<option value="LUTs/gist_gray.png">gist_gray</option>
	<option value="LUTs/gist_grey.png">gist_grey</option>
	<option value="LUTs/gist_heat.png">gist_heat</option>
	<option value="LUTs/gist_ncar.png">gist_ncar</option>
	<option value="LUTs/gist_rainbow.png">gist_rainbow</option>
	<option value="LUTs/gist_stern.png">gist_stern</option>
	<option value="LUTs/gist_yarg.png">gist_yarg</option>
	<option value="LUTs/gist_yerg.png">gist_yerg</option>
	<option value="LUTs/GnBu.png">GnBu</option>
	<option value="LUTs/gnuplot.png">gnuplot</option>
	<option value="LUTs/gnuplot2.png">gnuplot2</option>
	<option value="LUTs/gray.png">gray</option>
	<option value="LUTs/Grays.png">Grays</option>
	<option value="LUTs/Greens.png">Greens</option>
	<option value="LUTs/grey.png">grey</option>
	<option value="LUTs/Greys.png">Greys</option>
	<option value="LUTs/hot.png">hot</option>
	<option value="LUTs/hsv.png">hsv</option>
	<option value="LUTs/inferno.png">inferno</option>
	<option value="LUTs/inferno2.png">inferno2</option>
	<option value="LUTs/inferno4.png">inferno4</option>
	<option value="LUTs/inferno8.png">inferno8</option>
	<option value="LUTs/inferno16.png">inferno16</option>
	<option value="LUTs/inferno32.png">inferno32</option>
	<option value="LUTs/inferno64.png">inferno64</option>
	<option value="LUTs/inferno128.png">inferno128</option>
	<option value="LUTs/jet.png">jet</option>
	<option value="LUTs/magma.png">magma</option>
	<option value="LUTs/nipy_spectral.png">nipy_spectral</option>
	<option value="LUTs/ocean.png">ocean</option>
	<option value="LUTs/Oranges.png">Oranges</option>
	<option value="LUTs/OrRd.png">OrRd</option>
	<option value="LUTs/Paired.png">Paired</option>
	<option value="LUTs/Pastel1.png">Pastel1</option>
	<option value="LUTs/Pastel2.png">Pastel2</option>
	<option value="LUTs/pink.png">pink</option>
	<option value="LUTs/PiYG.png">PiYG</option>
	<option value="LUTs/plasma.png">plasma</option>
	<option value="LUTs/PRGn.png">PRGn</option>
	<option value="LUTs/prism.png">prism</option>
	<option value="LUTs/PuBu.png">PuBu</option>
	<option value="LUTs/PuBuGn.png">PuBuGn</option>
	<option value="LUTs/PuOr.png">PuOr</option>
	<option value="LUTs/PuRd.png">PuRd</option>
	<option value="LUTs/Purples.png">Purples</option>
	<option value="LUTs/rainbow.png">rainbow</option>
	<option value="LUTs/RdBu.png">RdBu</option>
	<option value="LUTs/RdGy.png">RdGy</option>
	<option value="LUTs/RdPu.png">RdPu</option>
	<option value="LUTs/RdYlBu.png">RdYlBu</option>
	<option value="LUTs/RdYlGn.png">RdYlGn</option>
	<option value="LUTs/Reds.png">Reds</option>
	<option value="LUTs/seismic.png">seismic</option>
	<option value="LUTs/Set1.png">Set1</option>
	<option value="LUTs/Set2.png">Set2</option>
	<option value="LUTs/Set3.png">Set3</option>
	<option value="LUTs/Spectral.png">Spectral</option>
	<option value="LUTs/spring.png">spring</option>
	<option value="LUTs/summer.png">summer</option>
	<option value="LUTs/tab10.png">tab10</option>
	<option value="LUTs/tab20.png">tab20</option>
	<option value="LUTs/tab20b.png">tab20b</option>
	<option value="LUTs/tab20c.png">tab20c</option>
	<option value="LUTs/terrain.png">terrain</option>
	<option value="LUTs/turbo.png">turbo</option>
	<option value="LUTs/twilight_shifted.png">twilight_shifted</option>
	<option value="LUTs/twilight.png">twilight</option>
	<option value="LUTs/viridis.png">viridis</option>
	<option value="LUTs/winter.png">winter</option>
	<option value="LUTs/Wistia.png">Wistia</option>
	<option value="LUTs/YlGn.png">YlGn</option>
	<option value="LUTs/YlGnBu.png">YlGnBu</option>
	<option value="LUTs/YlOrBr.png">YlOrBr</option>
	<option value="LUTs/YlOrRd.png">YlOrRd</option>
</select>
</div>

<img src="LUTs/viridis.png" id="viridis" style="width: 100%; height: 64px;">

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

### Still performance free?

Matt Zucker
https://mzucker.github.io/

https://www.shadertoy.com/view/WlfXRN

<script  id="fragment_9" type="x-shader/x-fragment">{% rawFile "posts/WebGL-LUTS-made-simple/video-lut_viridis.fs" %}</script>

<img src="viridis_from_function.png" style="width: 100%; height: 64px;">
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
