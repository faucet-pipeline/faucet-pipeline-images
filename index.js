let path = require("path");
let FileFinder = require("faucet-pipeline-core/lib/util/files/finder");
let sharp = require("sharp");
let svgo = require("svgo");
let { stat, readFile } = require("fs").promises;
let { abort } = require("faucet-pipeline-core/lib/util");
let { exiftool } = require("exiftool-vendored");

// we can optimize the settings here, but some would require libvips
// to be compiled with additional stuff
let settings = {
	svg: {
		plugins: [
			"preset-default",

			// do not remove title and desc for accessibility reasons
			{
				name: "removeTitle",
				active: false
			},
			{
				name: "removeDesc",
				active: false
			},

			// configurations recommended by Cassie Evans to reduce problems
			// when you want to style or animate your SVGs
			{
				name: "cleanupIDs",
				active: false
			},
			{
				name: "mergePaths",
				active: false
			},
			{
				name: "collapseGroups",
				active: false
			}
		]
	},
	png: {
		compressionLevel: 9,
		adaptiveFiltering: true,
		palette: true
	},
	jpeg: {
		progressive: true,
		mozjpeg: true
	},
	webp: {},
	avif: {}
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
		filter: optimizerConfig.filter ||
			withFileExtension("avif", "jpg", "jpeg", "png", "webp", "svg")
	});
	let {
		autorotate,
		fingerprint,
		format,
		width,
		height,
		crop,
		quality,
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
				autorotate, format, width, height, crop, quality, scale, suffix
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
	let targetPath = determineTargetPath(path.join(target, fileName), variant);

	let format = variant.format ? variant.format : extname(fileName);

	let output = format === "svg" ?
		await optimizeSVG(sourcePath) :
		await optimizeBitmap(sourcePath, format, variant);

	let writeOptions = { targetDir };
	if(fingerprint !== undefined) {
		writeOptions.fingerprint = fingerprint;
	}

	let tags = await exiftool.read(sourcePath);
	let meta = {};
	if(tags) {
		meta.exif = tags;
	}

	writeOptions.meta = meta;
	return assetManager.writeFile(targetPath, output, writeOptions);
}

async function optimizeSVG(sourcePath) {
	let input = await readFile(sourcePath);

	try {
		let output = await svgo.optimize(input, settings.svg);
		return output.data;
	} catch(error) {
		abort(`Only SVG can be converted to SVG: ${sourcePath}`);
	}
}

async function optimizeBitmap(sourcePath, format,
		{ autorotate, width, height, scale, quality, crop }) {
	let image = sharp(sourcePath);
	if(autorotate) {
		image.rotate();
	}

	if(scale) {
		let metadata = await image.metadata();
		image.resize({ width: metadata.width * scale, height: metadata.height * scale });
	}

	if(width || height) {
		let fit = crop ? "cover" : "inside";
		image.resize({ width: width, height: height, fit: sharp.fit[fit] });
	}

	switch(format) {
	case "jpg":
	case "jpeg":
		image.jpeg({ ...settings.jpeg, quality });
		break;
	case "png":
		image.png(settings.png);
		break;
	case "webp":
		image.webp({ ...settings.webp, quality });
		break;
	case "avif":
		image.avif({ ...settings.avif, quality });
		break;
	default:
		abort(`unsupported format ${format}. We support: AVIF, JPG, PNG, WebP, SVG`);
	}
	return image.toBuffer();
}

function determineTargetPath(filepath, { format, suffix = "" }) {
	format = format ? `.${format}` : "";
	let directory = path.dirname(filepath);
	let extension = path.extname(filepath);
	let basename = path.basename(filepath, extension);
	return path.join(directory, `${basename}${suffix}${extension}${format}`);
}

function withFileExtension(...extensions) {
	return filename => extensions.includes(extname(filename));
}

// extname follows this annoying idea that the dot belongs to the extension
function extname(filename) {
	return path.extname(filename).slice(1).toLowerCase();
}
