"use strict";
let path = require("path");

module.exports = {
	images: [{
		source: "./src",
		target: "./dist",
		filter: name => {
			let extension = path.extname(name).substr(1).toLowerCase();
			return ["jpg", "png"].includes(extension);
		},
		plugins: {
			jpg: customPlugin,
			png: customPlugin
		}
	}],
	plugins: {
		"images": {
			plugin: path.resolve("../.."),
			bucket: "static"
		}
	}
};

// converts every picture to a text file containing lol
function customPlugin(_) {
	return new Promise(resolve => {
		resolve(Buffer.from([0x6c, 0x6f, 0x6c, 0xA]));
	});
}
