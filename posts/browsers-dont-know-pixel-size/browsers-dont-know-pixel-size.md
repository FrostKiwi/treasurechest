---
wip: true
title:
permalink: "/{{ page.fileSlug }}/"
date:
last_modified:
description:
publicTags:
image:
---
I love graphics, write a lot about rendering with WebGL and friends. One thing that constantly baffles me, is how brittle everything between modern browsers and the GPU is.

In a way, this is understandable. The Graphics APIs are notoriously moving targets. However, one thing that the browsers very much know about but don't tell you is: How big a pixel is.

Or rather, what I want to deep dive is: There exists no reliable way to get the size of a pixel.