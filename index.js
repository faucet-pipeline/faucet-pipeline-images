let path = require("path");
let { abort, promisify } = require("faucet-pipeline-core/lib/util");
let FileFinder = require("faucet-pipeline-core/lib/util/files/finder");

let readFile = promisify(require("fs").readFile);
let stat = promisify(require("fs").stat);

module.exports = (pluginConfig, assetManager, { compact }) => {
	let minifiers = pluginConfig.map(minifyConfig =>
		buildMinifier(minifyConfig, assetManager, { compact }));

	return files => minifiers.forEach(copier => copier(files));
};

function buildMinifier(minifyConfig, assetManager, { compact }) {
	let source = assetManager.resolvePath(minifyConfig.source);
	let target = assetManager.resolvePath(minifyConfig.target, {
		enforceRelative: true
	});
	let fileFinder = new FileFinder(source, {
		filter: minifyConfig.filter || defaultFilter
	});
	let { fingerprint } = minifyConfig;

	let plugins = {};
	if(compact) {
		// The contract is quite simple: A plugin is a function that takes a
		// buffer of an image and returns a buffer (or promise of a buffer) of
		// an image
		plugins = minifyConfig.plugins || defaultPlugins();
	}

	return files => {
		return Promise.all([
			(files ? fileFinder.match(files) : fileFinder.all()),
			determineTargetDir(source, target)
		]).then(([fileNames, targetDir]) => {
			return processFiles(fileNames, {
				assetManager, source, target, targetDir, plugins, fingerprint
			});
		});
	};
}

// If `source` is a directory, `target` is used as target directory -
// otherwise, `target`'s parent directory is used
function determineTargetDir(source, target) {
	return stat(source).
		then(results => results.isDirectory() ? target : path.dirname(target));
}

function processFiles(fileNames, config) {
	return Promise.all(fileNames.map(fileName => processFile(fileName, config)));
}

function processFile(fileName,
		{ source, target, targetDir, assetManager, plugins, fingerprint }) {
	let sourcePath = path.join(source, fileName);
	let targetPath = path.join(target, fileName);

	return readFile(sourcePath).
		then(content => {
			let type = determineFileType(sourcePath);
			if(type && plugins.hasOwnProperty(type)) {
				return plugins[type](content);
			} else {
				return content;
			}
		}).
		then(content => {
			let options = { targetDir };
			if(fingerprint !== undefined) {
				options.fingerprint = fingerprint;
			}
			return assetManager.writeFile(targetPath, content, options);
		}).
		catch(abort);
}

function determineFileType(sourcePath) {
	return path.extname(sourcePath).substr(1).toLowerCase();
}

// Defaults to file extensions of common image formats
function defaultFilter(name) {
	let extension = determineFileType(name);
	return ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(extension);
}

// Defaults to recommendation by https://images.guide for JPG, PNG and SVG
function defaultPlugins() {
	return {
		jpg: require("imagemin-mozjpeg")({ quality: 80 }),
		png: require("imagemin-pngquant")(),
		svg: require("imagemin-svgo")()
	};
}
