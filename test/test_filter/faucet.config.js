import { resolve } from "node:path";

export const images = [{
	source: "./src",
	target: "./dist",
	filter: file => file.endsWith(".jpg")
}];

export const plugins = [resolve(import.meta.dirname, "../..")];
