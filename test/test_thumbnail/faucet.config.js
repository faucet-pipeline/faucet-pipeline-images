"use strict";
let path = require("path");

module.exports = {
	images: [{
		source: "./src",
		target: "./dist",
		width: 300,
		height: 300
	}],
	plugins: [path.resolve(__dirname, "../..")]
};
