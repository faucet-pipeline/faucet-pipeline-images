"use strict";
let path = require("path");

module.exports = {
	images: [{
		source: "./src",
		target: "./dist",
		quality: 20
	}],
	plugins: [path.resolve(__dirname, "../..")]
};
