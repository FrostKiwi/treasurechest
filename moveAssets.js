const fs = require('fs');
const path = require('path');

const postsDir = 'posts/';
const outputDir = '_site/';

function copyAssetsRecursively(srcDir, destDir) {
	if (!fs.existsSync(destDir)) {
		fs.mkdirSync(destDir, { recursive: true });
	}

	fs.readdirSync(srcDir, { withFileTypes: true }).forEach(entry => {
		const srcPath = path.join(srcDir, entry.name);
		const destPath = path.join(destDir, entry.name);

		if (entry.isDirectory()) {
			copyAssetsRecursively(srcPath, destPath);
		} else {
			if (path.extname(entry.name) !== '.md') {
				fs.copyFileSync(srcPath, destPath);
			}
		}
	});
}

fs.readdirSync(postsDir, { withFileTypes: true }).forEach(entry => {
	if (entry.isDirectory()) {
		const fullDirPath = path.join(postsDir, entry.name);
		const outputPostDir = path.join(outputDir, entry.name);

		copyAssetsRecursively(fullDirPath, outputPostDir);
	}
});
