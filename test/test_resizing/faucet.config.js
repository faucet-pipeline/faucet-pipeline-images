import { resolve } from "node:path";

export const images = [{
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
}];

export const plugins = [resolve(import.meta.dirname, "../..")];
