import { resolve } from "node:path";

export const images = [{
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
}];

export const plugins = [resolve(import.meta.dirname, "../..")];
