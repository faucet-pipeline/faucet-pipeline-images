import { resolve } from "node:path";

export const images = [{
	source: "./src",
	target: "./dist",
	quality: 20
}];

export const plugins = [resolve(import.meta.dirname, "../..")];
