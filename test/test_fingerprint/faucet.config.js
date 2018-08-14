"use strict";
let path = require("path");

module.exports = {
	images: [{
		source: "./src",
		target: "./dist/fingerprint"
	}, {
		source: "./src",
		target: "./dist/no-fingerprint",
		fingerprint: false
	}],
	plugins: {
		"images": {
			package: path.resolve("../.."),
			bucket: "static"
		}
	}
};
