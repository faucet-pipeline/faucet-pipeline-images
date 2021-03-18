"use strict";
let path = require("path");

module.exports = {
	images: [{
		source: "./src",
		target: "./dist",
		filter: file => file.endsWith(".jpg")
	}],
	plugins: [path.resolve(__dirname, "../..")]
};
