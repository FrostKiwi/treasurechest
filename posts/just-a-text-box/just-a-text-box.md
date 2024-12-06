---
title: Just-a-Textbox
permalink: "/{{ page.fileSlug }}/"
date: 2022-02-15
last_modified: 2023-12-01
description: A simple fullscreen textbox to interface with browser-based translation tools
publicTags:
  - Language
  - i18n
  - Japanese
image: hello-textbox.png
---
As the name suggests, it's [just a minimal HTML](just-a-textbox.html) file serving up a single textbox with a large font size.
* Why would this be useful?
  * Several screen readers and translation tools like [YomiChan](https://github.com/FooSoft/yomichan) or the new active community fork [YomiTan](https://github.com/themoeway/yomitan) are browser based. As such it's convinient to copy paste something into a browser to interface with those readers and plugins. In fact, software like [Game2Text](https://game2text.com/) run a local webserver to interface with your default web browser for this very reason.
* Why not just use any textbox of any online translator like deepl.com? 
  * I constantly use YomiChan to help me read Japanese content, including client's E-Mails with confidential Company information. Pasting client information to an online translator, which phones home to offshore servers for their translations brakes privacy laws on so many levels, it's not even funny. All that just to get text into a textbox. Thus this simple textbox html ensures everything stays offline. There are of course bigger software packages that solve this OS wide, but I'm very much used to YomiChan now and a single TextBox is all I need.

<details>
<summary>Source of <a target="_blank" href="just-a-textbox.html">just-a-textbox.html</a></summary>

```html
{% include "posts/just-a-text-box/just-a-textbox.html" %}
```
</details>

## Usage example
![](hello-textbox.png)