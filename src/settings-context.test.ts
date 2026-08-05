import { describe, expect, it, vi } from "vitest";
import { saveOrder, type SettingsSectionContext } from "./settings-context";

interface Item {
	id: string;
	order?: number;
}

function makeCtx() {
	const markDirty = vi.fn();
	const ctx = { markDirty } as unknown as SettingsSectionContext;
	return { ctx, markDirty };
}

describe("saveOrder", () => {
	it("assigns sparse order values (10, 20, 30…) in list order", async () => {
		const { ctx } = makeCtx();
		const order: Item[] = [{ id: "a" }, { id: "b" }, { id: "c" }];

		await saveOrder(ctx, order, (item) => item.id, async () => {});

		expect(order.map((item) => item.order)).toEqual([10, 20, 30]);
	});

	it("persists each item's new id/order via persistOne", async () => {
		const { ctx } = makeCtx();
		const order: Item[] = [{ id: "a" }, { id: "b" }];
		const persistOne = vi.fn(async () => {});

		await saveOrder(ctx, order, (item) => item.id, persistOne);

		expect(persistOne).toHaveBeenCalledWith("a", 10);
		expect(persistOne).toHaveBeenCalledWith("b", 20);
	});

	it("marks the tab dirty, not reload-worthy", async () => {
		const { ctx, markDirty } = makeCtx();

		await saveOrder(ctx, [{ id: "a" }] as Item[], (item) => item.id, async () => {});

		expect(markDirty).toHaveBeenCalledOnce();
	});

	it("doesn't mark dirty when a persist call rejects", async () => {
		const { ctx, markDirty } = makeCtx();

		await expect(
			saveOrder(ctx, [{ id: "a" }] as Item[], (item) => item.id, async () => {
				throw new Error("write failed");
			}),
		).rejects.toThrow("write failed");
		expect(markDirty).not.toHaveBeenCalled();
	});
});
