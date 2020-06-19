"use strict";
let path = require("path");

module.exports = {
	images: [{
		source: "./src",
		target: "./dist"
	}, {
		source: "./src",
		target: "./dist",
		format: "webp"
	}, {
		source: "./src",
		target: "./dist",
		suffix: "-suffix"
	}, {
		source: "./src",
		target: "./dist",
		format: "webp",
		suffix: "-suffix"
	}],
	plugins: [path.resolve(__dirname, "../..")]
};
