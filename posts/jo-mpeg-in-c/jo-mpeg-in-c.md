---
title: Jo_MPEG converted to C
permalink: "/{{ page.fileSlug }}/"
date: 2022-02-18
last_modified:
description: Single-header MPEG-1 Video library ported to C
publicTags:
  - C++
  - C
  - video
image: jo_mpeg.png
---
jo_mpeg is a C++ [single header library](https://github.com/nothings/single_file_libs) written by [Jon Olick](https://www.jonolick.com/home/mpeg-video-writer), which creates MPEG-1 videos (without audio). It is [listed as a C++ only library](https://github.com/nothings/single_file_libs#video) in stb's single header library collection. However, only the & reference format is what makes this library C++ only. Replacing those with simple pointers makes this compile with both C and C++: [jo_mpeg.h](jo_mpeg.h)

( I also found this: https://github.com/yui0/slibs/blob/master/jo_mpeg.h, but it is one version behind. )

<details>
<summary>Full source of the C compatible <a href="jo_mpeg.h">jo_mpeg.h</a></summary>

```c
{% rawFile "posts/jo-mpeg-in-c/jo_mpeg.h" %}
```
</details>