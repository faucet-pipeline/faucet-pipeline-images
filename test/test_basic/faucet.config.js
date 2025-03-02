import { resolve } from "node:path";

export const images = [{
	source: "./src",
	target: "./dist"
}];

export const plugins = [resolve(import.meta.dirname, "../..")];
