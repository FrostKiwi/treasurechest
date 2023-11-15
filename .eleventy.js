const CleanCSS = require("clean-css");
const faviconPlugin = require("eleventy-favicon");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const eleventyPluginFilesMinifier = require("@sherby/eleventy-plugin-files-minifier");

module.exports = function (eleventyConfig) {
	/* Syntax Highlighting */
	eleventyConfig.addPlugin(syntaxHighlight);
	/* The required CSS for the PrimJS color theme */
	eleventyConfig.addPassthroughCopy("assets");

	/* CSS minifier as per https://www.11ty.dev/docs/quicktips/inline-css/ */
	eleventyConfig.addFilter("cssmin", function (code) {
		return new CleanCSS({}).minify(code).styles;
	});
	/* Reload on CSS changes, since 11ty doesn't see them */
	eleventyConfig.addWatchTarget("style");

	/* HTML minifier */
	eleventyConfig.addPlugin(eleventyPluginFilesMinifier);
	
	/* SVG -> All Favicon variants packer */
	eleventyConfig.addPlugin(faviconPlugin);
};