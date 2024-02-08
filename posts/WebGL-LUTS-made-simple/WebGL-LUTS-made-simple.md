---
wip: true
title: LUTSを簡単に
permalink: "/{{ page.fileSlug }}/"
date: 2024-01-30
last_modified: 2024-01-31
description:
publicTags:
  - OpenGL
  - WebGL
  - GameDev
image:
---

<script src="//cdn.jsdelivr.net/npm/eruda"></script>
<script>eruda.init();</script>

インターネットの[WebGL](https://ja.wikipedia.org/wiki/WebGL)でも、Unityというゲームエンジンでも灰色からカラーにするのことを説明します。
情報はWebGLに対するけど、生のDirect X、Unityゲームエンジン、現代的なPC、10年間の古来スマホ、情報と実装仕方は同じです。
PC、スマホ、Oculus、このページをどこでも有効です。

### 入力ファイル
使っているファイルは黒白のサーマルカメラの信号です。あの動画の設定は自動的に一番温かい温度白になって、一番温度が低い温度が黒になる。その範囲の最低限は各瞬間です。このファイルは下のシェーダーの入力ですので、ポーズしないでください。自分の動画を使いたい場合、下のボタンで動画を変更することができます。

<blockquote class="reaction"><div class="reaction_text">再生されない場合、<b>再生を自分でスタートしてください</b>。色々なブラウザーがスクロールの時に動画をストップするから、手動でスタートしなければいけません。</div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>

<input type="file" id="fileInput" accept="video/*" style="display: none;" onchange="changeVideo(this)">

<div style="width: 100%; display: flex; justify-content: space-around; padding-bottom: 8px"><button onclick="document.getElementById('fileInput').click();">動画を変更</button><button onclick="startWebcam();">ウェブカメラを接続する</button></div>

<div style="width: 100%; display: flex; justify-content: center"><video width="680" height="480" style="width: unset; max-width: 100%" controls loop id="videoPlayer"><source src="bwvid.mp4" type="video/mp4"></video></div>

動画の由来： https://arxiv.org/abs/2308.10991

再生されない場合、**手動で上の動画をスタートしてください！** 私は`Autoplay`すると、スクロールの時にエネルギーの節約のために`Autoplay`の場合、デバイスによって、動画がストップされてしまう。

<script>
	const videoPlayer = document.getElementById('videoPlayer');
	videoPlayer.setAttribute("playsinline", true);
	videoPlayer.setAttribute("muted", true);
	videoPlayer.setAttribute("loop", true);

    function changeVideo(input) {
        var file = input.files[0];
        var url = URL.createObjectURL(file);
        var videoPlayer = document.getElementById('videoPlayer');
        videoPlayer.src = url;
        videoPlayer.play();
    }

	function startWebcam() {
        var videoPlayer = document.getElementById('videoPlayer');
		videoPlayer.setAttribute("autoplay", true);
        if (navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: false, video: true })
                .then(function(stream) {
                    videoPlayer.srcObject = stream;
                    videoPlayer.play();
					videoPlayer.onloadedmetadata = function(e) {
            			videoPlayer.play()
        			}
                })
                .catch(function(error) {
                    alert(error);
                });
        } else {
            alert('Your browser does not support accessing the webcam.');
        }
    }
</script>

### グラフィクスカードへ！
今は、WebGLで一番シンプルなシェーダーで動画をグラフィクスチップにアップロードして、映っています。動画の内容はまだ同じですけど。下の部分で全部のコードを見えます。私達には大切なやつは「Fragment シェーダー」です。そのシェーダーはカラーに影響をする。

<script src="fullscreen-tri.js"></script>
<script  id="vertex_2" type="x-shader/x-vertex">{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}</script>
<script  id="fragment_2" type="x-shader/x-fragment">{% rawFile "posts/WebGL-LUTS-made-simple/video-simple.fs" %}</script>

<div style="width: 100%; display: flex; justify-content: center"><canvas width="680" height="480" style="width: unset; max-width: 100%" id="canvas_2"></canvas></div>

<script>setupTri("canvas_2", "vertex_2", "fragment_2", null);</script>
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

<div style="width: 100%; display: flex; justify-content: center"><canvas width="680" height="480" style="width: unset; max-width: 100%" id="canvas_3"></canvas></div>

<script>setupTri("canvas_3", "vertex_3", "fragment_3", null);</script>
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
[グラフィックスパイプライン](https://ja.wikipedia.org/wiki/%E3%82%B0%E3%83%A9%E3%83%95%E3%82%A3%E3%83%83%E3%82%AF%E3%82%B9%E3%83%91%E3%82%A4%E3%83%97%E3%83%A9%E3%82%A4%E3%83%B3)ではそのステップは無料です。[冗談ではありません](https://www.youtube.com/watch?v=NFMmSOWPj_k&t=60s)、全部の世界のグラフィックスのチップで、テクスチャーサンプリング（または「タップ」）が比較的高いけど、あのカラーにするステップは「テクスチャーのタップ」と比べて、測定ができません。どっちにしろ、画面で何か見えるように、[サンプリング](https://docs.unity3d.com/ja/2018.4/Manual/SL-SamplerStates.html)が必要ですので、次のステップはパフォーマンスから見ると、無料。画像は250x250px、4096x4096、２００億万ピクセルx２００億万ピクセルでも、パフォーマンスには影響がありません。一番高いことは動画を見せることです。ですが、それはどっちにしろ必用です。グラフィックスパイプラインは具体的な固定な構築がありますから、あのオレンジの掛け算があるにもかかわらず、パーフォーマンスの変更がでありません。

```glsl
vec3 finaruKaraa = vec3(videoColor.rgb) * vec3(1.0, 0.5, 0.0);
```

<blockquote class="reaction"><div class="reaction_text">「無料」という単語はちょっと違うかも。計算時間は同じから、「測定ができない」はもっといいだろう。ですが、固定なグラフィックスパイプラインの計算時間から見ると、色々な計算が文脈のよって、計算時間に影響しない。だから、この文脈で、無料。</div><img class="kiwi" src="/assets/kiwis/think.svg"></blockquote>

<!-- 
#### Valve Software's genius in optimizing
<audio controls><source src="Tristan-Reidford.mp3" type="audio/mpeg"></audio>
> **Tristan Reidford:** Usually each model in the game has its own unique texture maps painted specifically for that model, which give the object its surface colors and detail. To have a convincing variety of cars using this method would have required as many textures as varieties of car, plus multiple duplicates of the textures in different colors, which would have been far out of our allotted texture memory budget. So we had to find a more efficient way to bring about that same result. For example, the texture on this car is shared with 3 different car models distributed throughout the environment. In addition to this one color texture, there is also a 'mask' texture that allows each instance of the car's painted surfaces to be tinted a different color, without having to author a separate texture. So for the cost of two textures you can get four different car models in an unlimited variety of colors.
 -->
### サーマルカラー
ですが、オレンジは比較的つまらんですので、「[LUT](https://ja.wikipedia.org/wiki/%E3%83%AB%E3%83%83%E3%82%AF%E3%82%A2%E3%83%83%E3%83%97%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB)」という画像または表を使います。その画像は1次元の行です。あの画像の高さは1pxです。見えるように、下の画像が1pxの高さから64pxの高さにストレッチされます。

<img src="infernoLut.png" id="lut" style="width: 100%; height: 64px;">

ほしいカラーはをあの画像によって見せます。左は黒、右は白。黒は青になります、白は赤になります。

<script src="fullscreen-tri.js"></script>
<script  id="vertex_4" type="x-shader/x-vertex">{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}</script>
<script  id="fragment_4" type="x-shader/x-fragment">{% rawFile "posts/WebGL-LUTS-made-simple/video-lut.fs" %}</script>

<div style="width: 100%; display: flex; justify-content: center"><canvas width="680" height="480" style="width: unset; max-width: 100%" id="canvas_4"></canvas></div>

<script>setupTri("canvas_4", "vertex_4", "fragment_4", "lut");</script>
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

動画のグレイの輝度ををX軸として使う。そのX軸でLUTの画像に見えます。黒、0、左はLUTの左のカラーになります。白、1、右はLUTの右のカラーになります。その方法でどこでも、何デバイスでもパーフォーマンスの無料の方法で画像をカラーリングします。

<blockquote class="reaction"><div class="reaction_text">カラーリングをできました！</div><img class="kiwi" src="/assets/kiwis/party.svg"></blockquote>

### カラーリングのおすすめ
科学の世界は具体的なカラーリングのマップを定義した。「[Viridis](https://cran.r-project.org/web/packages/viridis/vignettes/intro-to-viridis.html)」というカラー。そのカラーを使うべきです。理由が多い、一番大切：色覚異常の人が温度が高いと温度が低いの場所をわかります。そして、虹のマップを黒白プリンターで印刷すると、温度が低いと温度が高いは黒と白として印刷されません。「Viridis」なら、黒白プリンターで印刷すると、温度が低い場所はいつもくらい、温度が高い場所はいつも眩しい。

cividis developed it further: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0199239#pone.0199239.ref001

<img src="viridis.png" id="viridis" style="width: 100%; height: 64px;">

<script src="fullscreen-tri.js"></script>
<script  id="vertex_5" type="x-shader/x-vertex">{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}</script>
<script  id="fragment_5" type="x-shader/x-fragment">{% rawFile "posts/WebGL-LUTS-made-simple/video-lut.fs" %}</script>

<div style="width: 100%; display: flex; justify-content: center"><canvas width="680" height="480" style="width: unset; max-width: 100%" id="canvas_5"></canvas></div>

<script>setupTri("canvas_5", "vertex_5", "fragment_5", "viridis");</script>
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