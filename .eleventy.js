import fs from "fs";
import CleanCSS from "clean-css";
import { DateTime } from "luxon";
import Image from "@11ty/eleventy-img";
import { execSync } from "child_process";
import slugify from "@sindresorhus/slugify";
import pluginRss from "@11ty/eleventy-plugin-rss";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import eleventyPluginFilesMinifier from "@sherby/eleventy-plugin-files-minifier";

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
	/* Syntax Highlighting */
	eleventyConfig.addPlugin(syntaxHighlight);
	/* The required CSS for the PrismJS color theme */
	eleventyConfig.addPassthroughCopy("assets");
	eleventyConfig.addPassthroughCopy({
		"style/ace/theme-gruvbox_dark_hard.js": "ace/theme-gruvbox_dark_hard.js",
		"node_modules/ace-builds/src-min/ace.js": "ace/ace.js",
		"style/ace/mode-glsl.js": "ace/mode-glsl.js",
	});
	eleventyConfig.on('beforeBuild', () => {
		// Run the custom script before building the site
		execSync('node moveAssets.js');
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

	/* 🐌 🤘 */
	const slugRules = [['+', 'plus']];

	eleventyConfig.addFilter('slug', function (str) {
		return slugify(str, { customReplacements: slugRules });
	});

	eleventyConfig.addFilter("modifyTOC", function (tocHtml, postTitle) {
		if (!tocHtml)
			tocHtml = `<nav class="toc"><ul></ul></nav>`;
		/* Clear whitespace before string matching */
		tocHtml = tocHtml.replace(/>\s+</g, '><');
		/* Header */
		const h1Link = slugify(postTitle, { customReplacements: slugRules });
		tocHtml = tocHtml.replace('<ul>', `<ul><li><a href="#${h1Link}">${postTitle}</a><ul>`);
		/* Comments */
		tocHtml = tocHtml.replace('</ul></nav>', '</ul></li><li><a href="#comments">Comments</a></li></ul></nav>');
		return tocHtml;
	});

	/* CSS minifier as per https://www.11ty.dev/docs/quicktips/inline-css/ */
	eleventyConfig.addFilter("cssmin", function (code) {
		return new CleanCSS({}).minify(code).styles;
	});
	/* Reload on CSS changes, since 11ty doesn't see them */
	eleventyConfig.addWatchTarget("style");
	eleventyConfig.addWatchTarget("assets");
	eleventyConfig.addWatchTarget("posts");

	/* HTML minifier */
	eleventyConfig.addPlugin(eleventyPluginFilesMinifier);

	/* RSS Plugin */
	eleventyConfig.addPlugin(pluginRss);

	eleventyConfig.addShortcode("rawFile", (filename) => {
		const bytesOfFile = fs.readFileSync(filename);
		return bytesOfFile.toString();
	});

	eleventyConfig.addShortcode("rawFileTrim", (filename) => {
		const bytesOfFile = fs.readFileSync(filename, "utf-8");
		return bytesOfFile
			.replace(/\n|\r/g, "")
			.replace(/\s{2,}/g, " ")
			.trim();
	})

	eleventyConfig.addFilter("find", (collection, key, value) => {
		return collection.find(item => item[key] === value);
	});


	/* Thumbnail maker */
	eleventyConfig.addCollection("thumbnail", async function (collectionApi) {
		// Get all posts
		const posts = collectionApi.getFilteredByTag("post");

		for (const post of posts) {
			if (post.data.image) {
				const image = await Image('./posts/' + post.url + '/' + post.data.image, {
					widths: [256, "auto"],
					formats: ['jpeg'],
					outputDir: './_site/' + post.url
				});
				post.data.image = post.url + image.jpeg[0].filename;
				if (image.jpeg[1])
					post.data.social = post.url + image.jpeg[1].filename;
				else
					post.data.social = post.url + image.jpeg[0].filename;
			}
		}

		return posts;
	});

	/* Tags */
	eleventyConfig.addCollection("publicTagsWithIndex", function (collectionApi) {
		const tags = [null];
		let tagSet = new Set();

		collectionApi.getAll().forEach(function (item) {
			if ("publicTags" in item.data) {
				item.data.publicTags.forEach((tag) => tagSet.add(tag));
			}
		});

		return tags.concat([...tagSet]);
	});

	return {
		htmlTemplateEngine: "njk",
		markdownTemplateEngine: "njk",
	};
};