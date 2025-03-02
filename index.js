import path from "node:path";
import sharp from "sharp";
import svgo from "svgo";
import { readFile } from "node:fs/promises";
import { buildProcessPipeline } from "faucet-pipeline-assets/lib/util.js";
import { abort, repr } from "faucet-pipeline-core/lib/util/index.js";

export const key = "images";
export const bucket = "static";

export function plugin(config, assetManager) {
	let pipeline = config.map(optimizerConfig => {
		let processFile = buildProcessFile(optimizerConfig);
		let { source, target } = optimizerConfig;
		let filter = optimizerConfig.filter ||
			withFileExtension("avif", "jpg", "jpeg", "png", "webp", "svg");
		return buildProcessPipeline(source, target, processFile, assetManager, filter);
	});

	return filepaths => Promise.all(pipeline.map(optimize => optimize(filepaths)));
}

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
				name: "cleanupIds",
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

/**
 * Returns a function that processes a single file
 */
function buildProcessFile(config) {
	return async function(filename,
			{ source, target, targetDir, assetManager }) {
		let sourcePath = path.join(source, filename);
		let targetPath = determineTargetPath(path.join(target, filename), config);

		let format = config.format ? config.format : extname(filename);

		let output = format === "svg" ?
			await optimizeSVG(sourcePath) :
			await optimizeBitmap(sourcePath, format, config);

		let writeOptions = { targetDir };
		if(config.fingerprint !== undefined) {
			writeOptions.fingerprint = config.fingerprint;
		}
		return assetManager.writeFile(targetPath, output, writeOptions);
	};
}

/**
 * Optimize a single SVG
 *
 * @param {string} sourcePath
 * @returns {Promise<string>}
 */
async function optimizeSVG(sourcePath) {
	let input = await readFile(sourcePath);

	try {
		let output = await svgo.optimize(input, settings.svg);
		return output.data;
	} catch(error) {
		abort(`Only SVG can be converted to SVG: ${repr(sourcePath)}`);
	}
}

/**
 * Optimize a single bitmap image
 *
 * @param {string} sourcePath
 * @param {string} format
 * @param {Object} options
 * @returns {Promise<Buffer>}
 */
async function optimizeBitmap(sourcePath, format,
		{ autorotate, width, height, scale, quality, crop }) {
	let image = sharp(sourcePath);
	if(autorotate) {
		image.rotate();
	}

	if(scale) {
		let metadata = await image.metadata();
		if(metadata.width && metadata.height) {
			image.resize({
				width: metadata.width * scale,
				height: metadata.height * scale
			});
		}
	}

	if(width || height) {
		let fit = crop ? "cover" : "inside";
		image.resize({ width, height, fit: sharp.fit[fit] });
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
		abort(`unsupported format ${repr(format)}. We support: AVIF, JPG, PNG, WebP, SVG`);
	}

	return image.toBuffer();
}

/**
 * @param {string} filepath
 * @param {Object} options
 * @returns {string}
 */
function determineTargetPath(filepath, { format, suffix = "" }) {
	format = format ? `.${format}` : "";
	let directory = path.dirname(filepath);
	let extension = path.extname(filepath);
	let basename = path.basename(filepath, extension);
	return path.join(directory, `${basename}${suffix}${extension}${format}`);
}

/**
 * @param {...string} extensions
 * @returns {Filter}
 */
function withFileExtension(...extensions) {
	return filename => extensions.includes(extname(filename));
}

/**
 * File extension of a filename without the dot
 *
 * @param {string} filename
 * @returns {string}
 */
function extname(filename) {
	return path.extname(filename).slice(1).toLowerCase();
}
