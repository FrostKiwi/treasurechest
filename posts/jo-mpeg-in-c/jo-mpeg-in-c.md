---
title: Jo_MPEG converted to C
permalink: "/{{ page.fileSlug }}/"
date: 2022-02-18
last_modified: 2024-08-15
description: Single-header MPEG-1 Video library ported to C
publicTags:
  - C++
  - C
  - video
image: jo_mpeg.png
---
jo_mpeg is a C++ [single header library](https://github.com/nothings/single_file_libs) written by [Jon Olick](https://www.jonolick.com/home/mpeg-video-writer), which creates MPEG-1 videos (without audio). It is [listed as a C++ only library](https://github.com/nothings/single_file_libs#video) in stb's single header library collection. However, only the & reference format is what makes this library C++ only. Replacing those with simple pointers makes this compile with both C and C++. I'm also a big fan of [stb-type of library code](https://github.com/nothings/stb?tab=readme-ov-file#why-single-file-headers), so I converted the library to C.

<details>
<summary>Full source of the C compatible <a href="jo_mpeg.h">jo_mpeg.h</a></summary>

```c
{% rawFile "posts/jo-mpeg-in-c/jo_mpeg.h" %}
```
</details>

## Results
I encoded a couple of seconds from [Big Buck Bunny](https://peach.blender.org/) as a sample: [sample.mpeg](sample.mpeg)

<blockquote class="reaction"><div class="reaction_text">Can't show it directly in browser, as MPEG1 is not supported anymore. Also there is <a href="https://jsmpeg.com/">jsmpeg</a>, but it also [doesn't support](https://github.com/phoboslab/jsmpeg/issues/432) this output.</div><img class="kiwi" src="/assets/kiwis/facepalm.svg"></blockquote>

<figure>
	<img src="comparison.png" alt="Input frame vs Output frame. Side effect of conversion: Increased saturation and contrast." />
	<figcaption>Input frame vs Output frame. Side effect of conversion: Increased saturation and contrast.</figcaption>
</figure>

Unfortunately, the output has increased saturation and contrast. This is due to RGB -> [YCbCr](https://en.wikipedia.org/wiki/YCbCr#RGB_conversion) conversion in line `230` - `232` scaling the final color vectors scaled too much. I [fixed this by reverting](https://github.com/FrostKiwi/treasurechest/commit/d312b20f37e91fe818692c75a0a7cbba91601114#diff-06f83bdf1cb85a74bec97a3f11b76e759a46aa77d29454544206af7cd7efd3c8L230) the color space math changes that happened with the update to `v1.02`.

<figure>
	<img src="comparisonNew.png" alt="Input frame vs Output frame. Reverted to old color math." />
	<figcaption>Input frame vs Output frame. Reverted to old color math.</figcaption>
</figure>

I'm not sure why the code change credited to `r- lyeh` happened, but I guess the used video player handled color space incorrectly. Both [VLC](https://www.videolan.org/) and [MPV](https://mpv.io/) playback the colors correctly with `v1.03`.

Quality is hardcoded and results in roughly `8mbps` at a resolution of `684x385`. Quality measurements are at roughly `27db` [PSNR](https://en.wikipedia.org/wiki/Peak_signal-to-noise_ratio#Quality_estimation_with_PSNR) and `0.9` [SSIM](https://medium.com/srm-mic/all-about-structural-similarity-index-ssim-theory-code-in-pytorch-6551b455541e)...

<figure>
	<video width="684" height="342" controls><source src="not-terrible.mp4" type="video/mp4"></video>
	<figcaption>...Or in other words</figcaption>
</figure>
