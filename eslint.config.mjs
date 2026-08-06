import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: ["main.js", "node_modules/**", "esbuild.config.mjs", "vitest.config.ts"],
	},
	...obsidianmd.configs.recommended,
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		// writer.ts's timeout guards no popout-window UI, and vault tests run this
		// module without a `window` global.
		files: ["src/vault/writer.ts"],
		rules: {
			"obsidianmd/prefer-window-timers": "off",
		},
	},
	{
		// `obsidian` ships no runtime (package.json "main" is ""), so importing TFile
		// as a value for `instanceof` breaks vitest, which loads these modules directly.
		files: ["src/vault/writer.ts", "src/vault/writer.test.ts", "src/vault/reader.ts"],
		rules: {
			"obsidianmd/no-tfile-tfolder-cast": "off",
		},
	},
	{
		// Command ids are documented in CLAUDE.md and referenced by obsidian-cli scripts
		// and vault hotkeys; the plugin-id prefix is intentional and stable, not an oversight.
		files: ["src/main.ts"],
		rules: {
			"obsidianmd/commands/no-plugin-id-in-command-id": "off",
		},
	},
	{
		// vitest/jest matchers like expect.objectContaining() are typed `any` by design;
		// that's not a real type-safety hole in the test itself.
		files: ["**/*.test.ts"],
		rules: {
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
		},
	},
	{
		// Deliberately staying on the classic display() API rather than getSettingDefinitions():
		// the declarative renderer wraps the whole tab in one framework-owned card with
		// zero-padding, same-weight headings, which reads worse than this plugin's sibling
		// (obsidian-lhak-dashboard, obsidian-linear-calendar) settings tabs -- confirmed by direct
		// visual comparison against the running app. A single-vault personal plugin doesn't need
		// 1.13+ settings-search indexing enough to trade away a consistent look across plugins.
		files: ["src/settings-tab.ts"],
		rules: {
			"obsidianmd/settings-tab/prefer-setting-definitions": "off",
		},
	},
);
