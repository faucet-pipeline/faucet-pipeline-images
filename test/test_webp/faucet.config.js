"use strict";
let path = require("path");

module.exports = {
	images: [{
		source: "./src",
		target: "./dist",
		format: "webp"
	}],
	plugins: [path.resolve(__dirname, "../..")]
};
