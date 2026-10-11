import { describe, expect, it, vi } from "vitest";
import { createRowOpenController, type RowInstance } from "./row-open";

/** One row instance's header + detail, with Set-backed class lists -- no DOM in the test env. */
function fakeInstance(opts: { hasLayout?: boolean } = {}) {
	const headerClasses = new Set<string>();
	const detailClasses = new Set<string>();
	const classList = (set: Set<string>) => ({
		add: (name: string) => void set.add(name),
		toggle: (name: string, force?: boolean) => {
			const on = force ?? !set.has(name);
			if (on) set.add(name);
			else set.delete(name);
			return on;
		},
	});
	const scrollIntoView = vi.fn();
	const instance = {
		header: { classList: classList(headerClasses), offsetParent: opts.hasLayout === false ? null : {}, scrollIntoView },
		detail: { classList: classList(detailClasses) },
	} as unknown as RowInstance;
	return {
		instance,
		scrollIntoView,
		isOpen: () => headerClasses.has("hlth-open") && detailClasses.has("hlth-open"),
		isHalfOpen: () => headerClasses.has("hlth-open") !== detailClasses.has("hlth-open"),
	};
}

describe("createRowOpenController", () => {
	it("opens a marker by marking both its header and detail", () => {
		const onChange = vi.fn();
		const rows = createRowOpenController(undefined, onChange);
		const a = fakeInstance();
		rows.register("a", a.instance);

		rows.toggle("a");

		expect(a.isOpen()).toBe(true);
		expect(a.isHalfOpen()).toBe(false);
		expect(onChange).toHaveBeenLastCalledWith("a");
	});

	it("keeps one row open at a time: opening a second closes the first", () => {
		const rows = createRowOpenController(undefined, vi.fn());
		const a = fakeInstance();
		const b = fakeInstance();
		rows.register("a", a.instance);
		rows.register("b", b.instance);

		rows.toggle("a");
		rows.toggle("b");

		expect(a.isOpen()).toBe(false);
		expect(b.isOpen()).toBe(true);
	});

	it("toggling the open row closes it and reports no open id", () => {
		const onChange = vi.fn();
		const rows = createRowOpenController(undefined, onChange);
		const a = fakeInstance();
		rows.register("a", a.instance);

		rows.toggle("a");
		rows.toggle("a");

		expect(a.isOpen()).toBe(false);
		expect(onChange).toHaveBeenLastCalledWith(undefined);
	});

	it("acts on every instance of a marker (one per responsive tier)", () => {
		const rows = createRowOpenController(undefined, vi.fn());
		const wide = fakeInstance();
		const narrow = fakeInstance();
		rows.register("a", wide.instance);
		rows.register("a", narrow.instance);

		rows.toggle("a");

		expect(wide.isOpen()).toBe(true);
		expect(narrow.isOpen()).toBe(true);
	});

	it("restores the initially open row as instances register", () => {
		const rows = createRowOpenController("a", vi.fn());
		const a = fakeInstance();
		const b = fakeInstance();

		rows.register("a", a.instance);
		rows.register("b", b.instance);

		expect(a.isOpen()).toBe(true);
		expect(b.isOpen()).toBe(false);
	});

	it("open() opens a marker, closing whatever was open", () => {
		const onChange = vi.fn();
		const rows = createRowOpenController(undefined, onChange);
		const a = fakeInstance();
		const b = fakeInstance();
		rows.register("a", a.instance);
		rows.register("b", b.instance);

		rows.open("a");
		rows.open("b");

		expect(a.isOpen()).toBe(false);
		expect(b.isOpen()).toBe(true);
		expect(onChange).toHaveBeenLastCalledWith("b");
	});

	it("open() on the already-open row is a no-op: stays open, reports nothing", () => {
		const onChange = vi.fn();
		const rows = createRowOpenController(undefined, onChange);
		const a = fakeInstance();
		rows.register("a", a.instance);
		rows.open("a");
		onChange.mockClear();

		rows.open("a");

		expect(a.isOpen()).toBe(true);
		expect(onChange).not.toHaveBeenCalled();
	});

	it("opens a BP-style pair registered under both ids from either id", () => {
		const rows = createRowOpenController(undefined, vi.fn());
		const pair = fakeInstance();
		rows.register("sbp", pair.instance);
		rows.register("dbp", pair.instance);

		rows.toggle("dbp");

		expect(pair.isOpen()).toBe(true);
	});

	it("scrolls only the instance that has layout (the other tiers are display:none)", () => {
		const rows = createRowOpenController(undefined, vi.fn());
		const hiddenTier = fakeInstance({ hasLayout: false });
		const visibleTier = fakeInstance();
		rows.register("a", hiddenTier.instance);
		rows.register("a", visibleTier.instance);

		rows.scrollIntoView("a");

		expect(visibleTier.scrollIntoView).toHaveBeenCalledOnce();
		expect(hiddenTier.scrollIntoView).not.toHaveBeenCalled();
	});

	it("scrollIntoView on an unregistered marker does nothing", () => {
		const rows = createRowOpenController(undefined, vi.fn());

		expect(() => rows.scrollIntoView("nope")).not.toThrow();
	});

	// A persisted open id can outlive its row (e.g. after switching person). Nothing renders it, and
	// the next open just replaces it -- no throw, no stray class.
	it("a stale initial open id is a harmless no-op that the next open replaces", () => {
		const onChange = vi.fn();
		const rows = createRowOpenController("gone", onChange);
		const a = fakeInstance();
		rows.register("a", a.instance);

		expect(a.isOpen()).toBe(false);
		expect(() => rows.toggle("a")).not.toThrow();
		expect(a.isOpen()).toBe(true);
		expect(onChange).toHaveBeenLastCalledWith("a");
	});
});
