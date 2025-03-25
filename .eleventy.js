import * as sass from "sass";
import { DateTime } from "luxon";
import * as crypto from "node:crypto";
import Image from "@11ty/eleventy-img";
import pluginRss from "@11ty/eleventy-plugin-rss";
import eleventyPluginFilesMinifier from "@sherby/eleventy-plugin-files-minifier";

/* Styling */
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import "prismjs/components/prism-bash.js";
import "prismjs/components/prism-shell-session.js";

/* Navigation */
import markdownIt from "markdown-it"
import pluginTOC from "eleventy-plugin-toc";
import markdownItAnchor from "markdown-it-anchor";
import markdownItLinkAttributes from "markdown-it-link-attributes";

const mdOptions = {
	html: true,
	breaks: true,
	linkify: true,
	typographer: true
}
const mdAnchorOpts = {
	level: [1, 2, 3, 4],
	permalink: markdownItAnchor.permalink.linkInsideHeader({
		class: "anchor-link",
	}),
};

export default function (eleventyConfig) {
	/* Assets */
	eleventyConfig.addPassthroughCopy("assets");
	eleventyConfig.addPassthroughCopy({ "posts": "." });
	/* Syntax Highlighting */
	eleventyConfig.addPlugin(syntaxHighlight, {
		init: function ({ Prism }) {
			/* Tunneling Article console highlight */
			Prism.languages["tunnelingArticleShell"] = Prism.languages.extend("shell-session", {});
			const tunnelingArticleShell = Prism.languages["tunnelingArticleShell"];
			tunnelingArticleShell.command.inside.bash.inside.number = /\b\d+(?:\.\d+)*\b/;
			tunnelingArticleShell.command.inside.bash.inside["function"].pattern = /\b(?:ssh|proxytunnel|connect|corkscrew)\b(?=\s)/;
		}
	});
	/* The required CSS for the PrismJS color theme */
	eleventyConfig.addPassthroughCopy({
		"style/ace/theme-gruvbox_dark_hard.js": "ace/theme-gruvbox_dark_hard.js",
		"node_modules/ace-builds/src-min/ace.js": "ace/ace.js",
		"style/ace/mode-glsl.js": "ace/mode-glsl.js",
	});

	eleventyConfig.addFilter("dateFormat", (dateObj, format) => {
		return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat(format);
	});

	eleventyConfig.setLibrary(
		"md",
		markdownIt(mdOptions)
			.use(markdownItAnchor, mdAnchorOpts)
			.use(markdownItLinkAttributes, {
				matcher(href) {
					return href.startsWith("http://") || href.startsWith("https://");
				},
				attrs: {
					target: "_blank",
				},
			})
	);

	eleventyConfig.addPlugin(pluginTOC);

	/* Header and comments are not part of the post markdown and are thus
	   missing in the table of contents. Shift the bullet points TOC inwards and
	   apply a point at the top for the header and comments. */
	eleventyConfig.addFilter("modifyTOC", function (tocHtml, postTitle) {
		if (!tocHtml)
			tocHtml = `<nav class="toc"><ul></ul></nav>`;
		/* Clear whitespace before string matching */
		tocHtml = tocHtml.replace(/>\s+</g, '><');
		/* Header */
		tocHtml = tocHtml.replace('<ul>', `<ul><li><a href="#">${postTitle}</a><ul>`);
		/* Comments */
		tocHtml = tocHtml.replace('</ul></nav>', '</ul></li><li><a href="#comments">Comments</a></li></ul></nav>');
		return tocHtml;
	});

	eleventyConfig.addShortcode("inlineSass", function (scssFilePath) {
		return sass.compile(scssFilePath,
			{
				loadPaths: ["node_modules"],
				silenceDeprecations: ["color-functions", "global-builtin", "import"],
				style: "compressed",
			}).css;
	});

	eleventyConfig.addShortcode("clickableImage", function (imgPath, description) {
		const uniqueID = crypto.randomBytes(20).toString('hex');
		const figureID = `fig-${uniqueID}`;
		const imgID = `img-${uniqueID}`;

		return `<figure id="${figureID}">
        	<a id="${imgID}" href="#${imgID}">
        	    <img src="${imgPath}" alt="${description}" />
        	</a>
        	<a href="#${figureID}" class="overlay"></a>
        	<figcaption>${description}</figcaption>
    	</figure>`;
	});

	/* Reload on CSS changes, since 11ty doesn't see them */
	eleventyConfig.addWatchTarget("style");
	eleventyConfig.addWatchTarget("assets");
	eleventyConfig.addWatchTarget("posts");

	/* HTML minifier */
	if (process.env.BUILDMODE === "production") {
		eleventyConfig.addPlugin(eleventyPluginFilesMinifier);
	}

	/* RSS Plugin */
	eleventyConfig.addPlugin(pluginRss);

	/* Thumbnail maker */
	eleventyConfig.addCollection("thumbnail", async function (collectionApi) {
		const posts = collectionApi.getFilteredByTag("post");

		for (const post of posts) {
			if (post.data.image) {
				const image = await Image('posts/' + post.url + '/' + post.data.image, {
					widths: [256, "auto"],
					formats: ['jpeg'],
					outputDir: eleventyConfig.dir.output + '/' + post.url
				});
				/* Thumbnail */
				post.data.image = post.url + image.jpeg[0].filename;
				/* Opengraph social media image */
				post.data.social = post.url + image.jpeg[1].filename;
			}
		}

		return posts;
	});

	return {
		htmlTemplateEngine: "njk",
		markdownTemplateEngine: "njk",
	};
};