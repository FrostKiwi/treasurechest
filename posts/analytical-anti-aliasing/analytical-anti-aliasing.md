---
title: Analytical Anti-Aliasing
permalink: "/{{ page.fileSlug }}/"
date:
last_modified:
description:
publicTags:
  - OpenGL
  - WebGL
  - GameDev
image:
---
<audio controls><source src="tf2-dev-commentary.mp3" type="audio/mpeg"></audio>
> **Alden Kroll:** Two-dimensional HUD elements present a particular art problem, because they have to look good and sharp no matter what resolution the user is running their game at. Given today's availability of high resolution wide-screen displays, this can require a lot of texture memory and a lot of work anticipating different display resolutions. The problem for Team Fortress 2 was even more daunting because of our desire to include a lot of smooth curved elements in our HUD. We developed a new shader system for drawing 'line art' images. The system allows us to create images at a fixed resolution that produced smooth silhouettes even when scaled up to a very high resolution. This shader system also handles outlining and drop-shadows, and can be applied in the 3D space to world elements such as signs.