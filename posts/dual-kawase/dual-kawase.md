---
wip: true
title: Dual Kawase - A blur to rule them all & interview with Masaki Kawase 
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

<script src="js/simple.js"></script>
<script src="js/utility.js"></script>

<script id="simpleVert" type="x-shader/x-vertex">{% include "posts/dual-kawase/shader/simple.vs" %}</script>
<script id="simpleFrag" type="x-shader/x-fragment">{% include "posts/dual-kawase/shader/simple.fs" %}</script>

<div style="display: flex; flex-wrap: wrap; gap: 0px 12px; justify-content: space-around;">
    <span style="display: flex; gap: 8px; white-space: nowrap">
        <label style="font-weight: unset; display: flex; gap: 8px; align-items: center;">
            <input style="margin-bottom: unset;" type="checkbox" id="pauseCheck" name="Play / Pause" checked />
            Animate
        </label>
    </span>
</div>
<canvas width="100%" height="400px" style="aspect-ratio: 4/3" id="canvasSimple"></canvas>
<script>setupSimple("canvasSimple", "simpleVert", "simpleFrag", "pauseCheck");</script>

Blur is essential - a fundamental tool, that a lot of graphics programming builds upon. [Depth of Field](https://en.wikipedia.org/wiki/Depth_of_field), [Bloom](https://learnopengl.com/Guest-Articles/2022/Phys.-Based-Bloom), [Frosted glass in UI elements](https://blog.frost.kiwi/GLSL-noise-and-radial-gradient/#kde-kwin-blur) all make use of it.

When talking about blurs and especially bloom, motion stability is incredibly important. Our image will rotate slowly to tease out artifacts when bright highlights move across the frame. You can toggle this above each WebGL Canvas.

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
Check against Jimenez 14  5:45 onwards

This article kicked it off: [Link](https://www.rastergrid.com/blog/2010/09/efficient-gaussian-blur-with-linear-sampling/)

Marius Bjørge picked it up and [did a talk in 2015](https://dl.acm.org/doi/10.1145/2776880.2787664) direct [video link](https://dl.acm.org/doi/suppl/10.1145/2776880.2787664/suppl_file/a184.mp4) 
Indepth article by Intel [link](https://www.intel.com/content/www/us/en/developer/articles/technical/an-investigation-of-fast-real-time-gpu-based-image-blur-algorithms.html) with Link to original ppt by Masaki Kawase.

Yoshiharu Gotanda 五反田義治  ceo of https://www.tri-ace.co.jp/en/
Masaki Kawase 川瀬正樹 history goes back some time, including modding and a personal page with [high and low graphics settings](https://web.archive.org/web/20040201224946/http://www.daionet.gr.jp/~masa/index.html)

To be able to innovate in blurs today you need to be very deep in mathematics and signal theory ***and*** computer graphics. Just looking at the level of genius needed to get fast bokeh blur is kinda insane. Functions cancelling each-other out, complex number theory

https://www.youtube.com/watch?v=vNG3ZAd8wCc