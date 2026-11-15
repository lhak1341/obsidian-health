// esbuild options for the stylesheet: styles.src.css -> styles.css.
// The source @imports the @lhak/style plugin alias layer, which esbuild
// inlines, so deploy keeps shipping one self-contained styles.css.
// Shared by esbuild.config.mjs and src/styles.test.ts.

/** @type {import('esbuild').BuildOptions} */
export const stylesOptions = {
	entryPoints: ["styles.src.css"],
	bundle: true,
	outfile: "styles.css",
	logLevel: "info",
};
