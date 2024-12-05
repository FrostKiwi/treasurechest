---
title: Thermal Camera LUTs and colormaps for DaVinci Resolve
permalink: "/{{ page.fileSlug }}/"
date: 2024-03-01
last_modified:
description: Matplotlib colormaps exported for DaVinci Resolve
publicTags:
  - Video Editing
image: thumb.png
---
<script src="/WebGL-LUTS-made-simple/fullscreen-tri.js"></script>
<script  id="vertex" type="x-shader/x-vertex">{% rawFile "posts/WebGL-LUTS-made-simple/fullscreen-tri.vs" %}</script>

When writing [my previous article about LUTs in video games](/WebGL-LUTS-made-simple), I noticed that there is no straight forward way to colormap grayscale footage in [DaVinci Resolve](https://www.blackmagicdesign.com/products/davinciresolve), a popular video editing and color grading suite for Windows, Linux and MacOS. On the internet you can find LUTs which attempt to color RGB video in the style of thermal camera footage, but I didn't find standard colormaps.

<figure>
<video autoplay playsinline muted controls loop><source src="preview.mp4" type="video/mp4"></video>
	<figcaption>Cold ice cream and hot tea, Camera: TESTO 890, colormap LUT "inferno"</figcaption>
</figure>

I exported every colormap that [matplotlib](https://matplotlib.org/) supports as a 1D .cube file, so you can colormap footage in DaVinci Resolve. This is especially needed for thermal camera footage, when you want to adjust the color mapping more finely. The input is expected to be grayscale. You can [preview](#preview) them and [download](#download) the ones you need. Since it's a .cube file, it should work for other Software with .cube input as well.

## Export Python script
Luckily, Python package [colour-science](https://www.colour-science.org/) supports exporting to the .cube ["Iridas/Adobe" format](https://drive.google.com/file/d/143Eh08ZYncCAMwJ1q4gWxVOqR_OSWYvs/view), which DaVinci Resolve uses for its LUTs. Double luckily, the format supports 1D LUTs, so no extra manipulation is needed.

If you want to perform the export yourself or need a colormap not listed, then you can use the Python script below. Required dependencies can be installed via `pip install colour-science matplotlib`.

<details>
<summary>Python export script <a target="_blank" href="colormap-as-cube-lut.py">colormap-as-cube-lut.py</a></summary>

```python
{% rawFile "posts/Davinci-Resolve-thermal-luts/colormap-as-cube-lut.py" %}
```

</details>

## Usage
In the DaVinci Resolve **Settings** and **General**, you can add new LUT Folders. **Add** a Folder. In that folder create a subfolder, where your color maps will be in.

![](settings.png)

Download the required LUTs and put them into that subfolder. In DaVinci Resolve you can go to the color page, click on the **LUTs** tab and select our subfolder. If needed, you can right click in the folder pane and **Refresh** to re-scan the folder for LUTs.

![](lut_application.png)

That's it, now you can apply colormaps to grayscale footage, coloring the footage.

## Preview
Here you can preview all available colormaps, with the following video and the selectbox. Unless you have specific artistic goals or special data layout, you should use should use the perceptually uniform LUTs, because [reasons](/WebGL-LUTS-made-simple/#so-many-colors).
<video style="display: none" width="100%" height="480px" autoplay playsinline muted controls loop id="videoPlayer"><source src="/WebGL-LUTS-made-simple/bwvid.mp4" type="video/mp4"></video>

{% rawFile "posts/WebGL-LUTS-made-simple/select.html" %}

<img src="/assets/LUTs/PerceptuallyUniform/viridis.png" id="viridis" style="width: 100%; height: 64px;">

<script  id="fragment_5" type="x-shader/x-fragment">{% rawFile "posts/WebGL-LUTS-made-simple/video-lut.fs" %}</script>

<canvas width="684" height="480px" style="width: unset; max-width: 100%; max-height: 480px" id="canvas_5"></canvas>

<script>setupTri("canvas_5", "vertex", "fragment_5", "videoPlayer", "viridis", "lutSelector2");</script>

<blockquote class="reaction"><div class="reaction_text">Unless you are on  <a target="_blank" href="https://www.mozilla.org/en-US/firefox/browsers/mobile/android/">Firefox Android</a>, where <a target="_blank" href="https://bugzilla.mozilla.org/show_bug.cgi?id=1884282">video is broken for WebGL</a></div><img class="kiwi" src="/assets/kiwis/miffed.svg"></blockquote>

## LUT collection
Here you can download the .cube files individually or [as one .zip](colormaps-as-cube/colormaps-as-cube.zip)

<style>table td {white-space: nowrap;}</style>
<table>
<tr><th>Preview</th><th>Download</th></tr>
<tr><td colspan="2" style="text-align: center;">Perceptually Uniform Sequential</td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/PerceptuallyUniform/viridis.png"></td><td><a download href="colormaps-as-cube/viridis.cube">viridis</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/PerceptuallyUniform/plasma.png"></td><td><a download href="colormaps-as-cube/plasma.cube">plasma</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/PerceptuallyUniform/inferno.png"></td><td><a download href="colormaps-as-cube/inferno.cube">inferno</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/PerceptuallyUniform/magma.png"></td><td><a download href="colormaps-as-cube/magma.cube">magma</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/PerceptuallyUniform/cividis.png"></td><td><a download href="colormaps-as-cube/cividis.cube">cividis</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/PerceptuallyUniform/viridis_r.png"></td><td><a download href="colormaps-as-cube/viridis_r.cube">viridis - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/PerceptuallyUniform/plasma_r.png"></td><td><a download href="colormaps-as-cube/plasma_r.cube">plasma - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/PerceptuallyUniform/inferno_r.png"></td><td><a download href="colormaps-as-cube/inferno_r.cube">inferno - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/PerceptuallyUniform/magma_r.png"></td><td><a download href="colormaps-as-cube/magma_r.cube">magma - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/PerceptuallyUniform/cividis_r.png"></td><td><a download href="colormaps-as-cube/cividis_r.cube">cividis - flipped</a></td></tr>
<tr><td colspan="2" style="text-align: center;">Sequential</td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/Greys_r.png"></td><td><a download href="colormaps-as-cube/Greys_r.cube">Greys</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/Purples_r.png"></td><td><a download href="colormaps-as-cube/Purples_r.cube">Purples</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/Blues_r.png"></td><td><a download href="colormaps-as-cube/Blues_r.cube">Blues</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/Greens_r.png"></td><td><a download href="colormaps-as-cube/Greens_r.cube">Greens</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/Oranges_r.png"></td><td><a download href="colormaps-as-cube/Oranges_r.cube">Oranges</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/Reds_r.png"></td><td><a download href="colormaps-as-cube/Reds_r.cube">Reds</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/YlOrBr_r.png"></td><td><a download href="colormaps-as-cube/YlOrBr_r.cube">YlOrBr</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/YlOrRd_r.png"></td><td><a download href="colormaps-as-cube/YlOrRd_r.cube">YlOrRd</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/OrRd_r.png"></td><td><a download href="colormaps-as-cube/OrRd_r.cube">OrRd</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/PuRd_r.png"></td><td><a download href="colormaps-as-cube/PuRd_r.cube">PuRd</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/RdPu_r.png"></td><td><a download href="colormaps-as-cube/RdPu_r.cube">RdPu</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/BuPu_r.png"></td><td><a download href="colormaps-as-cube/BuPu_r.cube">BuPu</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/GnBu_r.png"></td><td><a download href="colormaps-as-cube/GnBu_r.cube">GnBu</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/PuBu_r.png"></td><td><a download href="colormaps-as-cube/PuBu_r.cube">PuBu</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/YlGnBu_r.png"></td><td><a download href="colormaps-as-cube/YlGnBu_r.cube">YlGnBu</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/PuBuGn_r.png"></td><td><a download href="colormaps-as-cube/PuBuGn_r.cube">PuBuGn</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/BuGn_r.png"></td><td><a download href="colormaps-as-cube/BuGn_r.cube">BuGn</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/YlGn_r.png"></td><td><a download href="colormaps-as-cube/YlGn_r.cube">YlGn</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/Greys.png"></td><td><a download href="colormaps-as-cube/Greys.cube">Greys - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/Purples.png"></td><td><a download href="colormaps-as-cube/Purples.cube">Purples - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/Blues.png"></td><td><a download href="colormaps-as-cube/Blues.cube">Blues - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/Greens.png"></td><td><a download href="colormaps-as-cube/Greens.cube">Greens - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/Oranges.png"></td><td><a download href="colormaps-as-cube/Oranges.cube">Oranges - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/Reds.png"></td><td><a download href="colormaps-as-cube/Reds.cube">Reds - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/YlOrBr.png"></td><td><a download href="colormaps-as-cube/YlOrBr.cube">YlOrBr - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/YlOrRd.png"></td><td><a download href="colormaps-as-cube/YlOrRd.cube">YlOrRd - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/OrRd.png"></td><td><a download href="colormaps-as-cube/OrRd.cube">OrRd - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/PuRd.png"></td><td><a download href="colormaps-as-cube/PuRd.cube">PuRd - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/RdPu.png"></td><td><a download href="colormaps-as-cube/RdPu.cube">RdPu - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/BuPu.png"></td><td><a download href="colormaps-as-cube/BuPu.cube">BuPu - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/GnBu.png"></td><td><a download href="colormaps-as-cube/GnBu.cube">GnBu - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/PuBu.png"></td><td><a download href="colormaps-as-cube/PuBu.cube">PuBu - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/YlGnBu.png"></td><td><a download href="colormaps-as-cube/YlGnBu.cube">YlGnBu - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/PuBuGn.png"></td><td><a download href="colormaps-as-cube/PuBuGn.cube">PuBuGn - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/BuGn.png"></td><td><a download href="colormaps-as-cube/BuGn.cube">BuGn - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential/YlGn.png"></td><td><a download href="colormaps-as-cube/YlGn.cube">YlGn - flipped</a></td></tr>
<tr><td colspan="2" style="text-align: center;">Sequential 2</td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/binary.png"></td><td><a download href="colormaps-as-cube/binary.cube">binary</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/gist_yarg.png"></td><td><a download href="colormaps-as-cube/gist_yarg.cube">gist_yarg</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/gist_gray.png"></td><td><a download href="colormaps-as-cube/gist_gray.cube">gist_gray</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/gray.png"></td><td><a download href="colormaps-as-cube/gray.cube">gray</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/bone.png"></td><td><a download href="colormaps-as-cube/bone.cube">bone</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/pink.png"></td><td><a download href="colormaps-as-cube/pink.cube">pink</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/spring.png"></td><td><a download href="colormaps-as-cube/spring.cube">spring</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/summer.png"></td><td><a download href="colormaps-as-cube/summer.cube">summer</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/autumn.png"></td><td><a download href="colormaps-as-cube/autumn.cube">autumn</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/winter.png"></td><td><a download href="colormaps-as-cube/winter.cube">winter</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/cool.png"></td><td><a download href="colormaps-as-cube/cool.cube">cool</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/Wistia.png"></td><td><a download href="colormaps-as-cube/Wistia.cube">Wistia</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/hot.png"></td><td><a download href="colormaps-as-cube/hot.cube">hot</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/afmhot.png"></td><td><a download href="colormaps-as-cube/afmhot.cube">afmhot</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/gist_heat.png"></td><td><a download href="colormaps-as-cube/gist_heat.cube">gist_heat</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/copper.png"></td><td><a download href="colormaps-as-cube/copper.cube">copper</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/binary_r.png"></td><td><a download href="colormaps-as-cube/binary_r.cube">binary - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/gist_yarg_r.png"></td><td><a download href="colormaps-as-cube/gist_yarg_r.cube">gist_yarg - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/gist_gray_r.png"></td><td><a download href="colormaps-as-cube/gist_gray_r.cube">gist_gray - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/gray_r.png"></td><td><a download href="colormaps-as-cube/gray_r.cube">gray - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/bone_r.png"></td><td><a download href="colormaps-as-cube/bone_r.cube">bone - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/pink_r.png"></td><td><a download href="colormaps-as-cube/pink_r.cube">pink - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/spring_r.png"></td><td><a download href="colormaps-as-cube/spring_r.cube">spring - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/summer_r.png"></td><td><a download href="colormaps-as-cube/summer_r.cube">summer - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/autumn_r.png"></td><td><a download href="colormaps-as-cube/autumn_r.cube">autumn - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/winter_r.png"></td><td><a download href="colormaps-as-cube/winter_r.cube">winter - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/cool_r.png"></td><td><a download href="colormaps-as-cube/cool_r.cube">cool - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/Wistia_r.png"></td><td><a download href="colormaps-as-cube/Wistia_r.cube">Wistia - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/hot_r.png"></td><td><a download href="colormaps-as-cube/hot_r.cube">hot - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/afmhot_r.png"></td><td><a download href="colormaps-as-cube/afmhot_r.cube">afmhot - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/gist_heat_r.png"></td><td><a download href="colormaps-as-cube/gist_heat_r.cube">gist_heat - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Sequential2/copper_r.png"></td><td><a download href="colormaps-as-cube/copper_r.cube">copper - flipped</a></td></tr>
<tr><td colspan="2" style="text-align: center;">Qualitative</td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/Pastel1.png"></td><td><a download href="colormaps-as-cube/Pastel1.cube">Pastel1</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/Pastel2.png"></td><td><a download href="colormaps-as-cube/Pastel2.cube">Pastel2</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/Paired.png"></td><td><a download href="colormaps-as-cube/Paired.cube">Paired</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/Accent.png"></td><td><a download href="colormaps-as-cube/Accent.cube">Accent</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/Dark2.png"></td><td><a download href="colormaps-as-cube/Dark2.cube">Dark2</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/Set1.png"></td><td><a download href="colormaps-as-cube/Set1.cube">Set1</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/Set2.png"></td><td><a download href="colormaps-as-cube/Set2.cube">Set2</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/Set3.png"></td><td><a download href="colormaps-as-cube/Set3.cube">Set3</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/tab10.png"></td><td><a download href="colormaps-as-cube/tab10.cube">tab10</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/tab20.png"></td><td><a download href="colormaps-as-cube/tab20.cube">tab20</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/tab20b.png"></td><td><a download href="colormaps-as-cube/tab20b.cube">tab20b</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/Paired_r.png"></td><td><a download href="colormaps-as-cube/Paired_r.cube">Paired - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/Set1_r.png"></td><td><a download href="colormaps-as-cube/Set1_r.cube">Set1 - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/Set2_r.png"></td><td><a download href="colormaps-as-cube/Set2_r.cube">Set2 - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/Set3_r.png"></td><td><a download href="colormaps-as-cube/Set3_r.cube">Set3 - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/tab10_r.png"></td><td><a download href="colormaps-as-cube/tab10_r.cube">tab10 - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/tab20_r.png"></td><td><a download href="colormaps-as-cube/tab20_r.cube">tab20 - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/tab20b_r.png"></td><td><a download href="colormaps-as-cube/tab20b_r.cube">tab20b - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Qualitative/tab20c_r.png"></td><td><a download href="colormaps-as-cube/tab20c_r.cube">tab20c - flipped</a></td></tr>
<tr><td colspan="2" style="text-align: center;">Miscellaneous</td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/flag.png"></td><td><a download href="colormaps-as-cube/flag.cube">flag</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/prism.png"></td><td><a download href="colormaps-as-cube/prism.cube">prism</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/ocean.png"></td><td><a download href="colormaps-as-cube/ocean.cube">ocean</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/gist_earth.png"></td><td><a download href="colormaps-as-cube/gist_earth.cube">gist_earth</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/terrain.png"></td><td><a download href="colormaps-as-cube/terrain.cube">terrain</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/gist_stern.png"></td><td><a download href="colormaps-as-cube/gist_stern.cube">gist_stern</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/gnuplot.png"></td><td><a download href="colormaps-as-cube/gnuplot.cube">gnuplot</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/gnuplot2.png"></td><td><a download href="colormaps-as-cube/gnuplot2.cube">gnuplot2</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/CMRmap.png"></td><td><a download href="colormaps-as-cube/CMRmap.cube">CMRmap</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/cubehelix.png"></td><td><a download href="colormaps-as-cube/cubehelix.cube">cubehelix</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/brg.png"></td><td><a download href="colormaps-as-cube/brg.cube">brg</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/gist_rainbow.png"></td><td><a download href="colormaps-as-cube/gist_rainbow.cube">gist_rainbow</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/rainbow.png"></td><td><a download href="colormaps-as-cube/rainbow.cube">rainbow</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/jet.png"></td><td><a download href="colormaps-as-cube/jet.cube">jet</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/turbo.png"></td><td><a download href="colormaps-as-cube/turbo.cube">turbo</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/nipy_spectral.png"></td><td><a download href="colormaps-as-cube/nipy_spectral.cube">nipy_spectral</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/gist_ncar.png"></td><td><a download href="colormaps-as-cube/gist_ncar.cube">gist_ncar</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/flag_r.png"></td><td><a download href="colormaps-as-cube/flag_r.cube">flag - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/prism_r.png"></td><td><a download href="colormaps-as-cube/prism_r.cube">prism - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/ocean_r.png"></td><td><a download href="colormaps-as-cube/ocean_r.cube">ocean - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/gist_earth_r.png"></td><td><a download href="colormaps-as-cube/gist_earth_r.cube">gist_earth - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/terrain_r.png"></td><td><a download href="colormaps-as-cube/terrain_r.cube">terrain - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/gist_stern_r.png"></td><td><a download href="colormaps-as-cube/gist_stern_r.cube">gist_stern - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/gnuplot_r.png"></td><td><a download href="colormaps-as-cube/gnuplot_r.cube">gnuplot - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/gnuplot2_r.png"></td><td><a download href="colormaps-as-cube/gnuplot2_r.cube">gnuplot2 - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/CMRmap_r.png"></td><td><a download href="colormaps-as-cube/CMRmap_r.cube">CMRmap - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/cubehelix_r.png"></td><td><a download href="colormaps-as-cube/cubehelix_r.cube">cubehelix - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/brg_r.png"></td><td><a download href="colormaps-as-cube/brg_r.cube">brg - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/gist_rainbow_r.png"></td><td><a download href="colormaps-as-cube/gist_rainbow_r.cube">gist_rainbow - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/rainbow_r.png"></td><td><a download href="colormaps-as-cube/rainbow_r.cube">rainbow - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/jet_r.png"></td><td><a download href="colormaps-as-cube/jet_r.cube">jet - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/turbo_r.png"></td><td><a download href="colormaps-as-cube/turbo_r.cube">turbo - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/nipy_spectral_r.png"></td><td><a download href="colormaps-as-cube/nipy_spectral_r.cube">nipy_spectral - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Miscellaneous/gist_ncar_r.png"></td><td><a download href="colormaps-as-cube/gist_ncar_r.cube">gist_ncar - flipped</a></td></tr>
<tr><td colspan="2" style="text-align: center;">Diverging</td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/PiYG.png"></td><td><a download href="colormaps-as-cube/PiYG.cube">PiYG</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/PRGn.png"></td><td><a download href="colormaps-as-cube/PRGn.cube">PRGn</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/BrBG.png"></td><td><a download href="colormaps-as-cube/BrBG.cube">BrBG</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/PuOr.png"></td><td><a download href="colormaps-as-cube/PuOr.cube">PuOr</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/RdGy.png"></td><td><a download href="colormaps-as-cube/RdGy.cube">RdGy</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/RdBu.png"></td><td><a download href="colormaps-as-cube/RdBu.cube">RdBu</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/RdYlBu.png"></td><td><a download href="colormaps-as-cube/RdYlBu.cube">RdYlBu</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/RdYlGn.png"></td><td><a download href="colormaps-as-cube/RdYlGn.cube">RdYlGn</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/Spectral.png"></td><td><a download href="colormaps-as-cube/Spectral.cube">Spectral</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/coolwarm.png"></td><td><a download href="colormaps-as-cube/coolwarm.cube">coolwarm</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/bwr.png"></td><td><a download href="colormaps-as-cube/bwr.cube">bwr</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/seismic.png"></td><td><a download href="colormaps-as-cube/seismic.cube">seismic</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/PiYG_r.png"></td><td><a download href="colormaps-as-cube/PiYG_r.cube">PiYG - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/PRGn_r.png"></td><td><a download href="colormaps-as-cube/PRGn_r.cube">PRGn - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/BrBG_r.png"></td><td><a download href="colormaps-as-cube/BrBG_r.cube">BrBG - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/PuOr_r.png"></td><td><a download href="colormaps-as-cube/PuOr_r.cube">PuOr - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/RdGy_r.png"></td><td><a download href="colormaps-as-cube/RdGy_r.cube">RdGy - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/RdBu_r.png"></td><td><a download href="colormaps-as-cube/RdBu_r.cube">RdBu - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/RdYlBu_r.png"></td><td><a download href="colormaps-as-cube/RdYlBu_r.cube">RdYlBu - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/RdYlGn_r.png"></td><td><a download href="colormaps-as-cube/RdYlGn_r.cube">RdYlGn - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/Spectral_r.png"></td><td><a download href="colormaps-as-cube/Spectral_r.cube">Spectral - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/coolwarm_r.png"></td><td><a download href="colormaps-as-cube/coolwarm_r.cube">coolwarm - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/bwr_r.png"></td><td><a download href="colormaps-as-cube/bwr_r.cube">bwr - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Diverging/seismic_r.png"></td><td><a download href="colormaps-as-cube/seismic_r.cube">seismic - flipped</a></td></tr>
<tr><td colspan="2" style="text-align: center;">Cyclic</td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Cyclic/twilight.png"></td><td><a download href="colormaps-as-cube/twilight.cube">twilight</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Cyclic/twilight_r.png"></td><td><a download href="colormaps-as-cube/twilight_r.cube">twilight - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Cyclic/twilight_shifted.png"></td><td><a download href="colormaps-as-cube/twilight_shifted.cube">twilight_shifted</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Cyclic/twilight_shifted_r.png"></td><td><a download href="colormaps-as-cube/twilight_shifted_r.cube">twilight_shifted - flipped</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Cyclic/hsv.png"></td><td><a download href="colormaps-as-cube/hsv.cube">hsv</a></td></tr>
<tr><td><img style="width: 100%; height: 32px" src="/assets/LUTs/Cyclic/hsv_r.png"></td><td><a download href="colormaps-as-cube/hsv_r.cube">hsv - flipped</a></td></tr>
</table>