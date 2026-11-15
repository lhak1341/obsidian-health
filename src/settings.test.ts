import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, settingsFromSaved } from "./settings";

describe("settingsFromSaved", () => {
	it("reads nothing saved as the defaults, with fonts following the theme", () => {
		const settings = settingsFromSaved(undefined);
		expect(settings).toEqual(DEFAULT_SETTINGS);
		expect([settings.fontHeading, settings.fontBody, settings.fontMono]).toEqual(["default", "default", "default"]);
	});

	it("keeps saved font choices through the switch to the shared font-role helper", () => {
		const settings = settingsFromSaved({
			fontHeading: "custom",
			fontHeadingCustom: "Space Grotesk",
			fontBody: "obsidian-text",
			fontBodyCustom: "",
			fontMono: "obsidian-monospace",
			fontMonoCustom: "Maple Mono",
		});
		expect(settings).toMatchObject({
			fontHeading: "custom",
			fontHeadingCustom: "Space Grotesk",
			fontBody: "obsidian-text",
			fontMono: "obsidian-monospace",
			fontMonoCustom: "Maple Mono",
		});
	});

	it("reads the old \"health\" default choice as the shared default", () => {
		const settings = settingsFromSaved({ fontHeading: "health", fontBody: "health", fontMono: "health" });
		expect([settings.fontHeading, settings.fontBody, settings.fontMono]).toEqual(["default", "default", "default"]);
	});

	it("keeps saved concern icons, which the shared icon picker writes in the same bare-name form", () => {
		const settings = settingsFromSaved({ concernIcons: { kidney: "bean", liver: "lucide-flask-conical" } });
		expect(settings.concernIcons).toEqual({ kidney: "bean", liver: "lucide-flask-conical" });
	});

	it("never shares a nested map with the defaults", () => {
		const settings = settingsFromSaved({});
		settings.concernIcons.kidney = "bean";
		settings.concernViewOverrides.kidney = "Kidney";
		settings.managedBaseViews.push("Kidney");
		expect(DEFAULT_SETTINGS.concernIcons).toEqual({});
		expect(DEFAULT_SETTINGS.concernViewOverrides).toEqual({});
		expect(DEFAULT_SETTINGS.managedBaseViews).toEqual([]);
	});
});
