const fs = require('fs');
const path = require('path');

const postsDir = 'posts/';
const outputDir = '_site/'; // Change this to your output directory

fs.readdirSync(postsDir).forEach(dir => {
	const fullDirPath = path.join(postsDir, dir);
	if (fs.statSync(fullDirPath).isDirectory()) {
		const outputPostDir = path.join(outputDir, dir);

		// Create the directory in the output if it doesn't exist
		if (!fs.existsSync(outputPostDir)) {
			fs.mkdirSync(outputPostDir, { recursive: true });
		}

		fs.readdirSync(fullDirPath).forEach(file => {
			if (file !== `${dir}.md`) { // Exclude markdown files
				const srcPath = path.join(fullDirPath, file);
				const destPath = path.join(outputPostDir, file);
				fs.copyFileSync(srcPath, destPath); // Copy the file
			}
		});
	}
});