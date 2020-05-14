"use strict";
let path = require("path");

module.exports = {
	images: [{
		source: "./src",
		target: "./dist"
	}],
	plugins: [path.resolve(__dirname, "../..")]
};
