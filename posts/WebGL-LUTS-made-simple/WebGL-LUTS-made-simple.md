---
wip: true
title: LUTSを簡単に
permalink: "/{{ page.fileSlug }}/"
date: 2024-01-30
last_modified:
description:
publicTags:
  - OpenGL
  - WebGL
  - GameDev
image:
---
インターネットの[WebGL](https://ja.wikipedia.org/wiki/WebGL)でも、Unityというゲームエンジンでも灰色からカラーにするのことを説明します。[グラフィックスパイプライン](https://ja.wikipedia.org/wiki/%E3%82%B0%E3%83%A9%E3%83%95%E3%82%A3%E3%83%83%E3%82%AF%E3%82%B9%E3%83%91%E3%82%A4%E3%83%97%E3%83%A9%E3%82%A4%E3%83%B3)そのステップは無料です。[冗談ではありません](www.youtube.com/watch?v=NFMmSOWPj_k&t=60s)、全部の世界のグラフィックスのチップで、テクスチャーロード（または「タップ」）が比較的高いけど、あのカラーにするステップは「テクスチャーのタップ」と比べて、測定ができません。どっちにしろ、画面で何か見えるように、[サンプリング](https://docs.unity3d.com/ja/2018.4/Manual/SL-SamplerStates.html)が必要ですので、次のステップはパフォーマンスから見ると、無料。画像は250x250px、4096x4096、２００億万ピクセルx２００億万ピクセルでも、パフォーマンスには影響がありません。

下にコードを直接を見て、変更ができる。



I **love** to use soft gradients as backdrops when doing graphics programming, a love started by a [Corona Renderer](https://corona-renderer.com/) product shot [sample scene](https://forum.corona-renderer.com/index.php?topic=11345) shared by user [romullus](https://forum.corona-renderer.com/index.php?action=profile;u=9510) and its use of radial gradients to highlight the product. But they are quite horrible from a design standpoint, since they produce awful [color banding](https://en.wikipedia.org/wiki/Colour_banding), also referred to as [posterization](https://en.wikipedia.org/wiki/Posterization). Depending on things like screen type, gradient colors, viewing environment, etc., the effect can be sometimes not present at all, yet sometimes painfully obvious. Let's take a look at what I mean. The following is a WebGL Canvas drawing a black & white, dark and soft half-circle gradient.