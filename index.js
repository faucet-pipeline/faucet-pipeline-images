let path = require("path");
let FileFinder = require("faucet-pipeline-core/lib/util/files/finder");
let sharp = require("sharp");
let SVGO = require("svgo");
let { stat, readFile } = require("fs").promises;
let { abort } = require("faucet-pipeline-core/lib/util");

// we can optimize the settings here, but some would require libvips
// to be compiled with additional stuff
let settings = {
	svg: {},
	png: { adaptiveFiltering: true },
	jpeg: { progressive: true },
	webp: {}
};

module.exports = {
	key: "images",
	bucket: "static",
	plugin: faucetImages
};

function faucetImages(config, assetManager) {
	let optimizers = config.map(optimizerConfig =>
		makeOptimizer(optimizerConfig, assetManager));

	return filepaths => Promise.all(optimizers.map(optimize => optimize(filepaths)));
}

function makeOptimizer(optimizerConfig, assetManager) {
	let source = assetManager.resolvePath(optimizerConfig.source);
	let target = assetManager.resolvePath(optimizerConfig.target, {
		enforceRelative: true
	});
	let fileFinder = new FileFinder(source, {
		skipDotfiles: true,
		// TODO: make configurable
		filter: withFileExtension("jpg", "jpeg", "png", "webp", "svg")
	});
	let {
		fingerprint,
		format,
		width,
		height,
		keepRatio,
		scale,
		suffix
	} = optimizerConfig;

	return async filepaths => {
		let [fileNames, targetDir] = await Promise.all([
			(filepaths ? fileFinder.match(filepaths) : fileFinder.all()),
			determineTargetDir(source, target)
		]);
		return processFiles(fileNames, {
			assetManager,
			source,
			target,
			targetDir,
			fingerprint,
			variant: {
				format, width, height, keepRatio, scale, suffix
			}
		});
	};
}

// If `source` is a directory, `target` is used as target directory -
// otherwise, `target`'s parent directory is used
async function determineTargetDir(source, target) {
	let results = await stat(source);
	return results.isDirectory() ? target : path.dirname(target);
}

async function processFiles(fileNames, config) {
	return Promise.all(fileNames.map(fileName => processFile(fileName, config)));
}

async function processFile(fileName,
		{ source, target, targetDir, fingerprint, assetManager, variant }) {
	let sourcePath = path.join(source, fileName);
	let targetPath = addSuffix(path.join(target, fileName), variant.suffix);

	let format = variant.format ? variant.format : extname(fileName);

	let output = format === "svg" ?
		await optimizeSVG(sourcePath) :
		await optimizeBitmap(sourcePath, format, variant);

	let writeOptions = { targetDir };
	if(fingerprint !== undefined) {
		writeOptions.fingerprint = fingerprint;
	}
	return assetManager.writeFile(targetPath, output, writeOptions);
}

async function optimizeSVG(sourcePath) {
	let input = await readFile(sourcePath);

	try {
		let svgo = new SVGO(settings.svg);
		let output = await svgo.optimize(input);
		return output.data;
	} catch(error) {
		abort(`Only SVG can be converted to SVG: ${sourcePath}`);
	}
}

async function optimizeBitmap(sourcePath, format,
		{ width, height, scale, keepRatio = true }) {
	let image = sharp(sourcePath);

	if(scale) {
		let metadata = await image.metadata();
		image.resize({ width: metadata.width * scale, height: metadata.height * scale });
	}

	if(width || height) {
		let fit = keepRatio ? "inside" : "cover";
		image.resize({ width: width, height: height, fit: sharp.fit[fit] });
	}

	switch(format) {
	case "jpg":
	case "jpeg":
		image.jpeg(settings.jpeg);
		break;
	case "png":
		image.png(settings.png);
		break;
	case "webp":
		image.webp(settings.webp);
		break;
	default:
		abort(`unsupported format ${format}. We support: JPG, PNG, WebP, SVG`);
	}

	return image.toBuffer();
}

function addSuffix(filepath, suffix = "") {
	let directory = path.dirname(filepath);
	let extension = path.extname(filepath);
	let basename = path.basename(filepath, extension);
	return path.join(directory, `${basename}${suffix}${extension}`);
}

function withFileExtension(...extensions) {
	return filename => extensions.includes(extname(filename));
}

// extname follows this annoying idea that the dot belongs to the extension
function extname(filename) {
	return path.extname(filename).slice(1).toLowerCase();
}
