"use strict";
let path = require("path");

module.exports = {
	images: [{
		source: "./src",
		target: "./dist"
	}],
	plugins: {
		"images": {
			plugin: path.resolve("../.."),
			bucket: "static"
		}
	}
};
