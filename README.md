# FrostKiwi's treasure chest
This is a collection of useful things I want to share with the world.
 - [Jōyō kanji Unicodes lists](https://github.com/FrostKiwi/treasurechest/blob/main/README.md#j%C5%8Dy%C5%8D-kanji-unicodes-lists)
   - [Regional variants](https://github.com/FrostKiwi/treasurechest/blob/main/README.md#regional-variants)
 - [Jo_MPEG converted to C](https://github.com/FrostKiwi/treasurechest/blob/main/README.md#jo_mpeg-converted-to-c)
 - [Just-a-textbox](https://github.com/FrostKiwi/treasurechest/blob/main/README.md#just-a-textbox)
## Jōyō kanji Unicodes lists
These files allow you to select or subset just the  2136 [Jōyō kanji](https://en.wikipedia.org/wiki/J%C5%8Dy%C5%8D_kanji) Unicode codepoints for Japanese. It's a good middle ground between having only Kana and including the all 21000 characters of the complete [CJK block](https://en.wikipedia.org/wiki/CJK_Unified_Ideographs_(Unicode_block)) for embedded use-cases. How to use these files and how to subset fonts is [covered here](https://github.com/Immediate-Mode-UI/Nuklear/wiki/Complete-font-guide#subsetting-compressing-appending-to-the-binary). Note, that not all HEX codes are 4 digit, the last one 𠮟 is HEX 20B9F. Eyes open, in case your program you use these HEX values in is picky about formatting. It's a late edition to the Unicode standard [because reasons (article “𠮟る” と “叱る” by @hydrocul)](https://hydrocul.github.io/wiki/blog/2014/1201-shikaru.html) and is thus the only 5 digit HEX Jōyō kanji. The variant 叱 53F1 is also listed, since it's usually the assumed default. ([Archive link in case that article goes down](https://web.archive.org/web/20210405065949/https://hydrocul.github.io/wiki/blog/2014/1201-shikaru.html)).
* [Nuklear](https://github.com/Immediate-Mode-UI/Nuklear) Codepoints: [joyo-kanji-unicode-nuklear.txt](https://raw.githubusercontent.com/FrostKiwi/treasurechest/main/joyo-kanji-unicode-nuklear.txt)
* [PyFTsubset](https://fonttools.readthedocs.io/en/latest/subset/index.html) Codepoints: [joyo-kanji-unicode-pyftsubset.txt](https://raw.githubusercontent.com/FrostKiwi/treasurechest/main/joyo-kanji-unicode-pyftsubset.txt)
* Raw-Hex Codepoints: [joyo-kanji-unicode-unformatted-hex.txt](https://raw.githubusercontent.com/FrostKiwi/treasurechest/main/joyo-kanji-unicode-unformatted-hex.txt)
### Regional variants
Finally, the usual applies if your are working with CJK fonts: Double, triple and quadruple check the font's intended region or in rare cases, how the font file organizes those regions internally. Eg. Google's Noto [offers their CJK fonts](https://github.com/googlefonts/noto-cjk) in 'CJK SC (Simplified Chinese)', 'CJK TC (Traditional Chinese)', 'CJK JP (Japanese)', etc. Thanks to Unicode's aweful decision of [Han unification](https://en.wikipedia.org/wiki/Han_unification), regional Sinograph variants are mapped to the same Unicode code point.

When my smartphone didn't have Japanese set as an optional language, the OS assumed the chinese variants by default and I was suddenly confused as to why I could not read some "Japanese" words in some apps. Such presumed defaults create issues in many [other](https://community.wanikani.com/t/userscript-anime-context-sentences/54003/83?u=frostkiwi) circumstances as well. Here is the difference with my Anki decks.
![](https://raw.githubusercontent.com/FrostKiwi/treasurechest/main/readme-img/anki-regional-example.png)
# Jo_MPEG converted to C
jo_mpeg is a C++ [single header library](https://github.com/nothings/single_file_libs) written by [Jon Olick](https://www.jonolick.com/home/mpeg-video-writer), which creates MPEG videos (without audio). It is [listed as a C++ only library](https://github.com/nothings/single_file_libs#video) in stb's single header library collection. However, only the & reference format is what makes this library C++ only. Replacing those with simple pointers makes this compile with both C and C++: [jo_mpeg.h](https://github.com/FrostKiwi/treasurechest/blob/main/jo_mpeg.h)

( I also found this: https://github.com/yui0/slibs/blob/master/jo_mpeg.h, but it is one version behind. )
# Just-a-textbox
![](https://raw.githubusercontent.com/FrostKiwi/treasurechest/main/readme-img/hello-textbox.png)

As the name suggests, it's [just a minimal HTML](https://raw.githubusercontent.com/FrostKiwi/treasurechest/main/just-a-textbox.html) file serving up a single textbox with a large font size.
* Why would this be useful?
  * Several screen readers and translation tools like [YomiChan](https://github.com/FooSoft/yomichan) are browser based. As such it's convinient to copy paste something into a browser to interface with those readers and plugins. In fact, software like [Game2Text](https://game2text.com/) run a local webserver to interface with your default web browser for this very reason.
* Why not just use any textbox of any online translator like deepl.com? 
  * I constantly use YomiChan to help me read Japanese content, including client's E-Mails with confidential Company information. Pasting client information to an online translator, which phones home to offshore servers for their translations brakes privacy laws on so many levels, it's not even funny. All that just to get text into a textbox. Thus this simple textbox html ensures everything stays offline. There are of course bigger software packages that solve this OS wide, but I'm very much used to YomiChan now and a single TextBox is all I need.

![](https://raw.githubusercontent.com/FrostKiwi/treasurechest/main/readme-img/Textbox%2BYomichan.png)
