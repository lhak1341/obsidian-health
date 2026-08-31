import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// One glob covering all of `src` on purpose: a per-directory `include` list silently skips
		// any test file in a directory nobody remembered to add, and a skipped test file reads as
		// a green suite. Vitest errors on an `include` that matches nothing, so this cannot go blind.
		include: ["src/**/*.test.ts"],
	},
});
