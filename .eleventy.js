const fs = require("fs");
const path = require('path');
const CleanCSS = require("clean-css");
const Image = require("@11ty/eleventy-img");
const { execSync } = require('child_process');
const pluginRss = require("@11ty/eleventy-plugin-rss");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const eleventyPluginFilesMinifier = require("@sherby/eleventy-plugin-files-minifier");

/* Navigation */
const markdownIt = require('markdown-it')
const pluginTOC = require('eleventy-plugin-toc')
const markdownItAnchor = require('markdown-it-anchor');

const mdOptions = {
	html: true,
	breaks: true,
	linkify: true,
	typographer: true
}
const mdAnchorOpts = {
	permalink: true,
	permalinkClass: 'anchor-link',
	permalinkSymbol: '#',
	level: [1, 2, 3, 4]
}

module.exports = function (eleventyConfig) {
	/* Syntax Highlighting */
	eleventyConfig.addPlugin(syntaxHighlight);
	/* The required CSS for the PrimJS color theme */
	eleventyConfig.addPassthroughCopy("assets");
	eleventyConfig.addPassthroughCopy("ace");
	eleventyConfig.on('beforeBuild', () => {
		// Run the custom script before building the site
		execSync('node moveAssets.js');
	});

	eleventyConfig.setLibrary(
		'md',
		markdownIt(mdOptions)
			.use(markdownItAnchor, mdAnchorOpts)
	);

	eleventyConfig.addPlugin(pluginTOC);

	eleventyConfig.addFilter("modifyTOC", function (tocHtml, postTitle) {
		if (!tocHtml)
			tocHtml = `<nav class="toc"><ul></ul></nav>`;
		/* Clear whitespace before string matching */
		tocHtml = tocHtml.replace(/>\s+</g, '><');
		/* Header */
		tocHtml = tocHtml.replace('<ul>', `<ul><li><a href="#${postTitle}">${postTitle}</a><ul>`);
		/* Comments */
		tocHtml = tocHtml.replace('</ul></nav>', '</ul></li><li><a href="#comments">Comments</a></li></ul></nav>');
		return tocHtml;
	});

	eleventyConfig.addFilter('generatePreloadLinks', function (directory) {
		const dirPath = path.join(__dirname, directory);
		const files = fs.readdirSync(dirPath);
		return files.map(file => `<link rel="preload" href="${directory}/${file}" as="image">`).join('\n');
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

	/* SVG -> All Favicon variants packer */
	/* eleventyConfig.addPlugin(faviconPlugin); */

	/* RSS Plugin */
	eleventyConfig.addPlugin(pluginRss);

	eleventyConfig.addShortcode("rawFile", (filename) => {
		const bytesOfFile = fs.readFileSync(filename);
		return bytesOfFile.toString();
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
};