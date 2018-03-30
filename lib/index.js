let path = require("path");
let { readFile, stat } = require("./promisified-fs");
let buildDetermineFiles = require("faucet-pipeline/lib/util/determine-files");
let imageType = require("image-type");
let isSvg = require("is-svg");

module.exports = (pluginConfig, assetManager, { watcher, compact }) => {
	buildCopyAll(pluginConfig, assetManager, { compact }).
		then(copyAll => {
			// Run once for all files
			copyAll();

			if(watcher) {
				watcher.on("edit", copyAll);
			}
		});
};

function buildCopyAll(copyConfigs, assetManager, options) {
	let futureCopiers = copyConfigs.map(copyConfig =>
		buildCopier(copyConfig, assetManager, options));

	return Promise.all(futureCopiers).then(copiers => {
		return files => copiers.forEach(copier => copier(files));
	});
}

function buildCopier(copyConfig, assetManager, { compact }) {
	let source = assetManager.resolvePath(copyConfig.source);
	let target = assetManager.resolvePath(copyConfig.target, {
		enforceRelative: true
	});
	let determineFiles = buildDetermineFiles(source, copyConfig.filter ||
		defaultFilter);

	let plugins = {};
	if(compact) {
		// TODO: Let the user pass in this object optionally
		// The contract is quite simple: A plugin is a function that takes a
		// buffer of an image and returns a buffer (or promise of a buffer) of
		// an image
		// Default to the same plugins as imagemin-cli
		// https://github.com/imagemin/imagemin-cli/blob/master/cli.js#L37-L42
		plugins = {
			gif: require("imagemin-gifsicle")(),
			jpg: require("imagemin-jpegtran")(),
			// TODO: This writes a checkmark on stdout
			png: require("imagemin-optipng")(),
			svg: require("imagemin-svgo")()
		};
	}

	return stat(source).then(results => {
		// If `source` is a directory, `target` is used as target directory -
		// otherwise, `target`'s parent directory is used
		return results.isDirectory() ? target : path.dirname(target);
	}).then(targetDir => {
		return files => {
			return determineFiles(files).
				then(fileNames => processFiles(fileNames, {
					assetManager, source, target, targetDir, plugins
				}));
		};
	});
}

function processFiles(fileNames, config) {
	return Promise.all(fileNames.map(fileName => processFile(fileName, config)));
}

function processFile(fileName, { source, target, targetDir, assetManager, plugins }) {
	let sourcePath = path.join(source, fileName);
	let targetPath = path.join(target, fileName);

	return readFile(sourcePath).
		then(content => {
			let type = determineFileType(content);
			if(type && plugins.hasOwnProperty(type)) {
				return plugins[type](content);
			} else {
				return content;
			}
		}).
		then(content => assetManager.writeFile(targetPath, content, {
			targetDir
		}));
}

function determineFileType(content) {
	let type = imageType(content);
	if(type) {
		return type.ext;
	} else if(isSvg(content)) {
		return "svg";
	} else {
		return false;
	}
}

function defaultFilter(name) {
	let extension = path.extname(name).substr(1).toLowerCase();
	return ["jpg", "jpeg", "png", "gif", "svg"].includes(extension);
}
