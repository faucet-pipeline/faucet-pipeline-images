"use strict";
let path = require("path");

module.exports = {
	images: [{
		source: "./src",
		target: "./dist",
		scale: 0.5
	}],
	plugins: [path.resolve(__dirname, "../..")]
};
