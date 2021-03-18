"use strict";
let path = require("path");

module.exports = {
	images: [{
		source: "./src",
		target: "./dist",
		format: "avif"
	}],
	plugins: [path.resolve(__dirname, "../..")]
};
