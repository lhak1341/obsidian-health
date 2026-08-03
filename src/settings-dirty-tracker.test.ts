import { describe, expect, it, vi } from "vitest";
import { SettingsDirtyTracker } from "./settings-dirty-tracker";

function makeTracker() {
	const persist = vi.fn(async () => {});
	const rescan = vi.fn(async () => {});
	const tracker = new SettingsDirtyTracker(persist, rescan);
	return { tracker, persist, rescan };
}

describe("SettingsDirtyTracker", () => {
	it("starts clean", () => {
		const { tracker } = makeTracker();
		expect(tracker.consumeDirty()).toBe(false);
	});

	it("save() persists and marks dirty", async () => {
		const { tracker, persist } = makeTracker();
		await tracker.save();
		expect(persist).toHaveBeenCalledOnce();
		expect(tracker.consumeDirty()).toBe(true);
	});

	it("saveQuiet() persists without marking dirty", async () => {
		const { tracker, persist } = makeTracker();
		await tracker.saveQuiet();
		expect(persist).toHaveBeenCalledOnce();
		expect(tracker.consumeDirty()).toBe(false);
	});

	it("reload() rescans and marks dirty", async () => {
		const { tracker, rescan } = makeTracker();
		await tracker.reload();
		expect(rescan).toHaveBeenCalledOnce();
		expect(tracker.consumeDirty()).toBe(true);
	});

	it("markDirty() marks dirty without persisting or rescanning", () => {
		const { tracker, persist, rescan } = makeTracker();
		tracker.markDirty();
		expect(persist).not.toHaveBeenCalled();
		expect(rescan).not.toHaveBeenCalled();
		expect(tracker.consumeDirty()).toBe(true);
	});

	it("consumeDirty() clears the flag", async () => {
		const { tracker } = makeTracker();
		await tracker.save();
		expect(tracker.consumeDirty()).toBe(true);
		expect(tracker.consumeDirty()).toBe(false);
	});
});
