import esbuild from "esbuild";
import process from "process";
import { builtinModules } from "module";
import { stylesOptions } from "./scripts/styles.mjs";

const production = process.argv[2] === "production";

const context = await esbuild.context({
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtinModules,
	],
	format: "cjs",
	target: "es2020",
	logLevel: "info",
	sourcemap: production ? false : "inline",
	treeShaking: true,
	outfile: "main.js",
	minify: production,
});

// Second entry: styles.src.css -> styles.css, inlining the @lhak/style alias layer.
const cssContext = await esbuild.context(stylesOptions);

if (production) {
	await context.rebuild();
	await cssContext.rebuild();
	process.exit(0);
} else {
	await context.watch();
	await cssContext.watch();
}
