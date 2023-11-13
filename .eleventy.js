const CleanCSS = require("clean-css");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

module.exports = function (eleventyConfig) {
	/* Syntax Highlighting */
	eleventyConfig.addPlugin(syntaxHighlight);
	/* The required CSS for the PrimJS color theme */
	eleventyConfig.addPassthroughCopy("style/prism-gruvbox-dark.css");

	/* CSS minifier as per https://www.11ty.dev/docs/quicktips/inline-css/ */
	eleventyConfig.addFilter("cssmin", function (code) {
		return new CleanCSS({}).minify(code).styles;
	});
};