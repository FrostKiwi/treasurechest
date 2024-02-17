---
title: Unreasonably effective - How video games use LUTs and how you can too in WebGL
permalink: "/{{ page.fileSlug }}/"
date:
last_modified:
description: How to implement 1D LUTs to color grayscale thermal vision videos, 3D LUTs for color correct and smart hacks from the video game industry
publicTags:
  - OpenGL
  - WebGL
  - GameDev
image: thumb.jpg
---
[Look-up-tables](https://en.wikipedia.org/wiki/Lookup_table) or more commonly referred to as LUTs are as old as Mathematics. 

インターネットの[WebGL](https://ja.wikipedia.org/wiki/WebGL)でも、Unity というゲームエンジンでも灰色からカラーにするのことを説明します。
情報は WebGL に対するけど、生の Direct X、Unity ゲームエンジン、現代的な PC、10 年間の古来スマホ、情報と実装仕方は同じです。
PC、スマホ、Oculus、このページをどこでも有効です。

<figure>
	<video width="1400" height="480" style="width: unset; max-width: 100%" autoplay playsinline muted controls loop><source src="preview.mp4" type="video/mp4"></video>
	<figcaption>Cold ice cream and hot tea. Left: Panasonic GH6, Right: TESTO 890 + 15°x11° Lens</figcaption>
</figure>


### Camera 3D LUTs

Some of them are even bought.

<figure>
	<video width="684" height="480" style="width: unset; max-width: 100%" autoplay playsinline muted controls loop id="gh6footage"><source src="Panasonic-Vlog.mp4" type="video/mp4"></video>
	<figcaption>Panasonic GH6 with "V-Log" logarithmic profile</figcaption>
</figure>

<img src="3DLut.png" id="3dlut" style="width: 100%">

<script src="fullscreen-tri.js"></script>
<script  id="vertex_6" type="x-shader/x-vertex">{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}</script>
<script  id="fragment_6" type="x-shader/x-fragment">{% rawFile "posts/WebGL-LUTS-made-simple/video-3Dlut.fs" %}</script>

<canvas width="684" height="480" style="width: unset; max-width: 100%" id="canvas_6"></canvas>

<script>setupTri("canvas_6", "vertex_6", "fragment_6", "gh6footage", "3dlut");</script>
<blockquote>
<details><summary>WebGL Vertex シェーダー <a href="fullscreen-tri.vs">fullscreen-tri.vs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}
```

</details>
<details>	
<summary>WebGL Fragment シェーダー <a href="video-3Dlut.fs">video-3Dlut.fs</a></summary>

```glsls
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

<script src="fullscreen-tri.js"></script>
<script  id="vertex_7" type="x-shader/x-vertex">{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}</script>
<script  id="fragment_7" type="x-shader/x-fragment">{% rawFile "posts/WebGL-LUTS-made-simple/video-3Dlut.fs" %}</script>

<canvas width="684" height="480" style="width: unset; max-width: 100%" id="canvas_7"></canvas>

<script>setupTri("canvas_7", "vertex_7", "fragment_7", "gh6footage", "3dlutDavinci");</script>
<blockquote>
<details><summary>WebGL Vertex シェーダー <a href="fullscreen-tri.vs">fullscreen-tri.vs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}
```

</details>
<details>	
<summary>WebGL Fragment シェーダー <a href="video-3Dlut.fs">video-3Dlut.fs</a></summary>

```glsls
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

<input type="file" id="fileInput" accept="video/*" style="display: none;" onchange="changeVideo(this)">

<div style="width: 100%; display: flex; justify-content: space-around; padding-bottom: 8px"><button onclick="document.getElementById('fileInput').click();">動画を変更</button><button onclick="startWebcam();">ウェブカメラを接続する</button></div>

<video width="684" height="480" style="width: unset; max-width: 100%" playsinline muted controls loop id="videoPlayer"><source src="bwvid.mp4" type="video/mp4"></video></div>
<script src="videoSource.js"></script>

動画の由来： https://arxiv.org/abs/2308.10991

再生されない場合、**手動で上の動画をスタートしてください！** 私は`Autoplay`すると、スクロールの時にエネルギーの節約のために`Autoplay`の場合、デバイスによって、動画がストップされてしまう。

### グラフィクスカードへ！

今は、WebGL で一番シンプルなシェーダーで動画をグラフィクスチップにアップロードして、映っています。動画の内容はまだ同じですけど。下の部分で全部のコードを見えます。私達には大切なやつは「Fragment シェーダー」です。そのシェーダーはカラーに影響をする。

<script src="fullscreen-tri.js"></script>
<script  id="vertex_2" type="x-shader/x-vertex">{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}</script>
<script  id="fragment_2" type="x-shader/x-fragment">{% rawFile "posts/WebGL-LUTS-made-simple/video-simple.fs" %}</script>

<canvas width="684" height="480" style="width: unset; max-width: 100%" id="canvas_2"></canvas>

<script>setupTri("canvas_2", "vertex_2", "fragment_2", "videoPlayer", null);</script>
<blockquote>
<details><summary>WebGL Vertex シェーダー <a href="fullscreen-tri.vs">fullscreen-tri.vs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}
```

</details>
<details>	
<summary>WebGL Fragment シェーダー <a href="video-simple.fs">video-simple.fs</a></summary>

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

<blockquote class="reaction"><div class="reaction_text">電子レンジのドアを開けた瞬間に、他の動画の部分が暗くなるね？</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

### 動画を改造しましょう

私達は画面に見せるの前出力するピクセルを`1.0, 0.5, 0.0`というカラーと掛け算すると、動画はオレンジになります。

<script src="fullscreen-tri.js"></script>
<script  id="vertex_3" type="x-shader/x-vertex">{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}</script>
<script  id="fragment_3" type="x-shader/x-fragment">{% rawFile "posts/WebGL-LUTS-made-simple/video-orange.fs" %}</script>

<canvas width="684" height="480" style="width: unset; max-width: 100%" id="canvas_3"></canvas>

<script>setupTri("canvas_3", "vertex_3", "fragment_3", "videoPlayer", null);</script>
<blockquote>
<details><summary>WebGL Vertex シェーダー <a href="fullscreen-tri.vs">fullscreen-tri.vs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}
```

</details>
<details>	
<summary>WebGL Fragment シェーダー <a href="video-orange.fs">video-orange.fs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/video-orange.fs" %}
```

</details>
<details>	
<summary>WebGL Javascript <a href="fullscreen-tri.js">fullscreen-tri.js</a></summary>

```javascript
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.js" %}
```

</details>
</blockquote>

<blockquote class="reaction"><div class="reaction_text">忘れないで、それは<b>リアルタイム。</b></div><img class="kiwi" src="/assets/kiwis/happy.svg"></blockquote>

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

<img src="infernoLut.png" id="lut" style="width: 100%; height: 64px;">

ほしいカラーはをあの画像によって見せます。左は黒、右は白。黒は青になります、白は赤になります。

<script src="fullscreen-tri.js"></script>
<script  id="vertex_4" type="x-shader/x-vertex">{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}</script>
<script  id="fragment_4" type="x-shader/x-fragment">{% rawFile "posts/WebGL-LUTS-made-simple/video-lut.fs" %}</script>

<canvas width="684" height="480" style="width: unset; max-width: 100%" id="canvas_4"></canvas>

<script>setupTri("canvas_4", "vertex_4", "fragment_4", "videoPlayer", "lut");</script>
<blockquote>
<details><summary>WebGL Vertex シェーダー <a href="fullscreen-tri.vs">fullscreen-tri.vs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}
```

</details>
<details>	
<summary>WebGL Fragment シェーダー <a href="video-lut.fs">video-lut.fs</a></summary>

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

動画のグレイの輝度をを X 軸として使う。その X 軸で LUT の画像に見えます。黒、0、左は LUT の左のカラーになります。白、1、右は LUT の右のカラーになります。その方法でどこでも、何デバイスでもパーフォーマンスの無料の方法で画像をカラーリングします。

<blockquote class="reaction"><div class="reaction_text">カラーリングをできました！</div><img class="kiwi" src="/assets/kiwis/party.svg"></blockquote>

### カラーリングのおすすめ

科学の世界は具体的なカラーリングのマップを定義した。「[Viridis](https://cran.r-project.org/web/packages/viridis/vignettes/intro-to-viridis.html)」というカラー。そのカラーを使うべきです。理由が多い、一番大切：色覚異常の人が温度が高いと温度が低いの場所をわかります。そして、虹のマップを黒白プリンターで印刷すると、温度が低いと温度が高いは黒と白として印刷されません。「Viridis」なら、黒白プリンターで印刷すると、温度が低い場所はいつもくらい、温度が高い場所はいつも眩しい。

cividis developed it further: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0199239#pone.0199239.ref001

<img src="viridis.png" id="viridis" style="width: 100%; height: 64px;">

<script src="fullscreen-tri.js"></script>
<script  id="vertex_5" type="x-shader/x-vertex">{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}</script>
<script  id="fragment_5" type="x-shader/x-fragment">{% rawFile "posts/WebGL-LUTS-made-simple/video-lut.fs" %}</script>

<canvas width="684" height="480" style="width: unset; max-width: 100%" id="canvas_5"></canvas>

<script>setupTri("canvas_5", "vertex_5", "fragment_5", "videoPlayer", "viridis");</script>
<blockquote>
<details><summary>WebGL Vertex シェーダー <a href="fullscreen-tri.vs">fullscreen-tri.vs</a></summary>

```glsl
{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}
```

</details>
<details>	
<summary>WebGL Fragment シェーダー <a href="video-lut.fs">video-lut.fs</a></summary>

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
