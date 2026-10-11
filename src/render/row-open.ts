/** The slice of an element the controller touches -- narrow so tests can pass plain fakes. */
export interface RowInstance {
	header: Pick<HTMLElement, "classList" | "offsetParent" | "scrollIntoView">;
	detail: Pick<HTMLElement, "classList">;
}

/** Each marker's row is rendered once per responsive tier (wide/medium/narrow -- see buildGroups),
 *  so "open" has to act on every instance at once, not just the one under the cursor, or resizing
 *  to a different tier would silently show it collapsed again. Also enforces the accordion (only
 *  one row open at a time): opening a new marker closes whichever was open before it.
 *
 *  `initialOpenId`/`onChange` let the caller (HealthView) persist which marker is open across a
 *  `renderDashboard` re-render -- this controller itself is rebuilt from scratch on every call, so
 *  without that round-trip an in-render state change (e.g. a unit toggle, which triggers a refresh
 *  same as showAll/profile-switch do) would silently re-fold whatever the user had open. */
export function createRowOpenController(initialOpenId: string | undefined, onChange: (markerId: string | undefined) => void) {
	const instances = new Map<string, RowInstance[]>();
	let openId: string | undefined = initialOpenId;

	const setInstancesOpen = (markerId: string, open: boolean) => {
		for (const inst of instances.get(markerId) ?? []) {
			inst.header.classList.toggle("hlth-open", open);
			inst.detail.classList.toggle("hlth-open", open);
		}
	};

	const show = (markerId: string) => {
		if (openId) setInstancesOpen(openId, false);
		setInstancesOpen(markerId, true);
		openId = markerId;
		onChange(markerId);
	};

	return {
		register(markerId: string, instance: RowInstance): void {
			const list = instances.get(markerId) ?? [];
			list.push(instance);
			instances.set(markerId, list);
			if (markerId === openId) {
				instance.header.classList.add("hlth-open");
				instance.detail.classList.add("hlth-open");
			}
		},
		/** Opens `markerId`, closing whatever was previously open; closes it instead if it's already open. */
		toggle(markerId: string): void {
			if (openId === markerId) {
				setInstancesOpen(markerId, false);
				openId = undefined;
				onChange(undefined);
				return;
			}
			show(markerId);
		},
		/** Opens `markerId` (closing whatever was open); a no-op if it's already the open one. */
		open(markerId: string): void {
			if (openId !== markerId) show(markerId);
		},
		/** Only one tier's instance has layout at a time (the other two are `display:none`) --
		 *  `offsetParent` is null for anything not currently rendered, so this finds the real one. */
		scrollIntoView(markerId: string): void {
			const visible = (instances.get(markerId) ?? []).find((inst) => inst.header.offsetParent !== null);
			visible?.header.scrollIntoView({ block: "center", behavior: "smooth" });
		},
	};
}

export type RowOpenController = ReturnType<typeof createRowOpenController>;
