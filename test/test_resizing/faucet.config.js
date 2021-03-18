"use strict";
let path = require("path");

module.exports = {
	images: [{
		source: "./src",
		target: "./dist",
		scale: 0.5,
		suffix: "-small"
	}, {
		source: "./src",
		target: "./dist",
		width: 300,
		height: 300,
		suffix: "-thumbnail"
	}, {
		source: "./src",
		target: "./dist",
		width: 300,
		height: 300,
		crop: true,
		suffix: "-square"
	}],
	plugins: [path.resolve(__dirname, "../..")]
};
