# FrostKiwi's treasure chest
This is a collection of useful things I want to share with the world.
 - [Genshin Impact Anki deck](https://github.com/FrostKiwi/treasurechest#genshin-impact-anki-deck)
   - subpoint
 - [Jōyō kanji Unicodes lists](https://github.com/FrostKiwi/treasurechest#j%C5%8Dy%C5%8D-kanji-unicodes-lists)
   - [Regional variants](https://github.com/FrostKiwi/treasurechest#regional-variants)
 - [Jo_MPEG converted to C](https://github.com/FrostKiwi/treasurechest#jo_mpeg-converted-to-c)
 - [Just-a-textbox](https://github.com/FrostKiwi/treasurechest#just-a-textbox)
## Genshin Impact Anki deck
It's quite the tradition among Japanese learners to publish parts of their Anki [Mining](https://animecards.site/yomichansetup/#setting-up-yomichan) decks, so others may get inspired by them or straight up use them. This ~1000 note deck is an excerpt of my Mining deck, which was/is being created in-part from the video game [Genshin Impact](https://genshin.hoyoverse.com/en/home). This post will go into the thought process behind the deck, how it was created and has sound clips in this GitHub page below every screenshot for reference. Of course, using a someone else's Mining deck doesn't carry the same benefit as making one yourself, so this is mainly to document my workflow. [**Link to the deck on Ankiweb**]()

All cards have in-game sound + screenshot and almost all have additionally a dictionary sound file + pitch accent.
![image](https://user-images.githubusercontent.com/60887273/167257089-8ebc1518-8e91-4b0d-b19b-e23da4e2fb74.png)

https://user-images.githubusercontent.com/60887273/167257204-32647df3-6c05-4828-bd0a-3fffbb9a3e7d.mov

https://user-images.githubusercontent.com/60887273/167257205-b48096e7-be3e-459b-a358-e302c45f6bf6.mov
### Info and Structure
 - Since this is a mining vocabulary deck, it carries words \*I\* did not know during in-game dialog. I already finished the [Improved Core3k](https://ankiweb.net/shared/info/1060896809) deck, so there are zero duplicates between this deck and Core3k. Besides that, I started the deck shortly before my N4 exam and am now N3. Words in the deck are essentially N3 and up, with some easy ones sprinkled in. No in-universe words are saved, like モラ or 目狩り令.
 - The deck captures the main story-line and a few side-quests / story-quests from the beginning up to Inzuma's second chapter.
 - I always learn both Japanese -> English, as well as English -> Japanese. This point is hotly debated, whether or not it's useful or a massive waste of time. For me switching to learning both directions has been nothing but great, but it is not the default on Anki Web and not a popular opinion it seems. (If I can name a synonym in the English -> Japanese direction, I still let it pass as HARD and as AGAIN if I can only name a synonym once the card returns) To fit with the default, I have disabled the English -> Japanese Card type.
 - For the in-game subtitles OCR sometimes failed. I corrected small mistakes, but when it output complete garbage, I added a cropped version of just the text in the screenshot in the sentence section. I did not always double check the OCR output, so mistakes will come up occasionally. If something looks weird with the example sentences, check the in-game screenshot for the correct subtitle. 
 - To fit inside the AnkiWeb limit of 256 MB, all images were resized from the 1080p originals to fit a 1366x768 rectangle with aggressive 81% JPEG Quality and in-game dialog are mono MP3 files.
 - When I write "here: ..." I am referring to a word being used in a more specialized sense in the in-game dialog, like 物心 vs 物心がつく. In those cases two definitions are provided. This is to make the learning process a bit more compact and to prevent not being able to translate a sentence whilst having just half of the definition.

![hitome](https://user-images.githubusercontent.com/60887273/167301152-40a0d15a-20f1-40ab-93ab-b7d86a6e591e.png)

https://user-images.githubusercontent.com/60887273/167292140-f3489c91-71b7-40d9-aedc-c630adc47da9.mov

https://user-images.githubusercontent.com/60887273/167292143-10c8668d-da68-404a-9b93-aeec9fabedc8.mov
- Characters speaking Kansai dialect have received there own tag "Kansaidialect".

![meccha](https://user-images.githubusercontent.com/60887273/167292541-94b7a289-e5fd-4a07-a80a-6b3f70381af1.png)

https://user-images.githubusercontent.com/60887273/167292350-45546385-7418-4d26-867e-cc020047a027.mov
#### Grammar
I also have a bunch of grammar cards mixed in, when I encountered new pieces of grammar and recognized it as such. For those I pasted the excellent [JLPT Sensei](https://jlptsensei.com/) summary images.

![kireicake](https://user-images.githubusercontent.com/60887273/167289347-d798a637-fd49-46c7-a2fd-2a2170cce7ec.png)

https://user-images.githubusercontent.com/60887273/167289579-61ae0167-825f-45a9-8161-795d8597073c.mov

https://user-images.githubusercontent.com/60887273/167289574-6af26096-7501-45bb-a5ae-8d6cd16d3eed.mov

A big surprise to me was the [YomiChan](https://github.com/FooSoft/yomichan) dictionary ["KireiCake"](https://foosoft.net/projects/yomichan/#dictionaries) having URL-shortened links from time to time, like [waa.ai/v4YY](https://waa.ai/v4YY) in the above card. In this case it leads to an [in-depth discussion on Yahoo](https://detail.chiebukuro.yahoo.co.jp/qa/question_detail/q1317655948) about that grammar point. [(Archive Link, in case it goes down)](http://web.archive.org/web/20220508092155/https://detail.chiebukuro.yahoo.co.jp/qa/question_detail/q1317655948) The love and patience of the Japanese learning online community is truly magnificent. From /djt/ threads on image-boards to [user-scripts connecting Kanji learn services to a collection of example recordings from Anime.](https://community.wanikani.com/t/userscript-anime-context-sentences/54003?u=frostkiwi) Stuff like that has me in awe.
#### To translate or not to translate
In the beginning I did toggle to English to screenshot the English translation for the card's back-side, see the example card below. However, on recommendation from members of the [English-Japanese Language Exchange discord server](https://discord.com/invite/japanese), I stopped doing so. Mainly, because of localization discrepancies between both versions. Differences got especially heavy, when more stylized dialogue got involved. But also in part, because this is not recommended for mining in general. Quoting from the Core3k description:
> Don't use the field 'Sentence-English' in your mined cards. In fact, get rid of it once you have a solid understanding of Japanese. When you mine something you should already have understood the sentence using the additional information on your cards.

![image](https://user-images.githubusercontent.com/60887273/167288657-68cde527-88a7-480c-9aef-3f78191781b4.png)

https://user-images.githubusercontent.com/60887273/167288822-9bb1ab4d-de23-481f-a7bc-9dd4fc41b6e2.mov

https://user-images.githubusercontent.com/60887273/167288831-f7dbbb64-b75d-4245-a61c-6141a718eb23.mov
### Why Genshin Impact?
Whilst not all, Genshin makes up a big chunk of
### How it was captured
The main
#### Handling Audio
Originally, I set all audio to be normalized based on setting the peak sample to -3db via Audacity. This turned out to be not quite optimal, as the amount of voice profiles is very broad. With peak sample normalization bright and dark voices did not end up playing back at the same loudness. I batch-reencoded every audio file to be normalized to -15LUFS loudness instead, the more modern approach. Although the difference was subtle, the dialogue sounded a bit more balanced from card to card after that.

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
