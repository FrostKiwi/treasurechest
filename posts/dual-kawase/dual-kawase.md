---
wip: true
title: At the limit of hardware - Dual Kawase
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
Apple is bad at blur, switching to box blur. With higher kernels

YouTube Channel [Computerphile](https://www.youtube.com/@Computerphile) did a lot on blurs and covered the mathematics behind them. I won't jump deep into the basic building blocks of kernels, convolutions and separability, as they have covered it already really well.

https://www.youtube.com/watch?v=SiJpkucGa1o

Playdead used it to get HDR Bloom
[Low Complexity, High Fidelity - INSIDE Rendering](https://gdcvault.com/play/1023304/Low-Complexity-High-Fidelity-INSIDE)
Check against Jimenez 14

This article kicked it off: [Link](https://www.rastergrid.com/blog/2010/09/efficient-gaussian-blur-with-linear-sampling/)

Marius Bjørge picked it up and [did a talk in 2015](https://dl.acm.org/doi/10.1145/2776880.2787664) direct [video link](https://dl.acm.org/doi/suppl/10.1145/2776880.2787664/suppl_file/a184.mp4) 
Indepth article by Intel [link](https://www.intel.com/content/www/us/en/developer/articles/technical/an-investigation-of-fast-real-time-gpu-based-image-blur-algorithms.html) with Link to original ppt by Masaki Kawase.

Masanori Kakimoto 柿本 正憲 kakimotoms@stf.teu.ac.jp
Yoshiharu Gotanda 五反田義治  ceo of https://www.tri-ace.co.jp/en/
Masaki Kawase 川瀬正樹 history goes back some time, including modding and a personal page with [high and low graphics settings](https://web.archive.org/web/20040201224946/http://www.daionet.gr.jp/~masa/index.html)

To be able to innovate in blurs today you need to be very deep in mathematics and signal theory ***and*** computer graphics. Just looking at the level of genius needed to get fast bokeh blur is kinda insane. Functions cancelling each-other out, complex number theory

https://www.youtube.com/watch?v=vNG3ZAd8wCc