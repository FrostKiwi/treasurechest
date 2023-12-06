const fs = require("fs");
const CleanCSS = require("clean-css");
const Image = require("@11ty/eleventy-img");
const { execSync } = require('child_process');
const faviconPlugin = require("eleventy-favicon");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const eleventyPluginFilesMinifier = require("@sherby/eleventy-plugin-files-minifier");

module.exports = function (eleventyConfig) {
	/* Syntax Highlighting */
	eleventyConfig.addPlugin(syntaxHighlight);
	/* The required CSS for the PrimJS color theme */
	eleventyConfig.addPassthroughCopy("assets");
	eleventyConfig.on('beforeBuild', () => {
		// Run the custom script before building the site
		execSync('node moveAssets.js');
	});

	/* CSS minifier as per https://www.11ty.dev/docs/quicktips/inline-css/ */
	eleventyConfig.addFilter("cssmin", function (code) {
		return new CleanCSS({}).minify(code).styles;
	});
	/* Reload on CSS changes, since 11ty doesn't see them */
	eleventyConfig.addWatchTarget("style");
	eleventyConfig.addWatchTarget("assets");

	/* HTML minifier */
	eleventyConfig.addPlugin(eleventyPluginFilesMinifier);

	/* SVG -> All Favicon variants packer */
	eleventyConfig.addPlugin(faviconPlugin);

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
					widths: [150],
					formats: ['jpeg'],
					outputDir: './_site/' + post.url
				});
				post.data.image = post.url + '/' + image.jpeg[0].filename;
			}
		}

		return posts;
	});
};