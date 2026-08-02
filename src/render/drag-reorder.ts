/** Renders a drag-to-reorder list into `container`: drag handle, live hover feedback, and a splice-on-drop
 *  reorder. Owns its own row state and re-renders itself on every drop; `onReorder` is a fire-and-forget
 *  effect notification for the caller to persist (this module has no opinion on what "saving" means). */
export function renderDragReorderList<T>(
	container: HTMLElement,
	items: T[],
	keys: { getId: (item: T) => string; getLabel: (item: T) => string },
	onReorder: (newOrder: T[]) => void,
): void {
	const order = [...items];
	let dragId: string | undefined;

	const renderRows = () => {
		container.empty();
		for (const item of order) {
			const id = keys.getId(item);
			const row = container.createDiv({ cls: "hlth-order-row" });
			row.draggable = true;
			row.dataset.id = id;

			row.createSpan({ cls: "hlth-order-handle", text: "⠿" });
			row.createSpan({ cls: "hlth-order-name", text: keys.getLabel(item) });

			row.addEventListener("dragstart", (evt) => {
				dragId = id;
				row.classList.add("hlth-order-dragging");
				evt.dataTransfer?.setData("text/plain", id);
			});
			row.addEventListener("dragend", () => row.classList.remove("hlth-order-dragging"));
			row.addEventListener("dragover", (evt) => {
				evt.preventDefault();
				if (dragId && dragId !== id) row.classList.add("hlth-order-over");
			});
			row.addEventListener("dragleave", () => row.classList.remove("hlth-order-over"));
			row.addEventListener("drop", (evt) => {
				evt.preventDefault();
				row.classList.remove("hlth-order-over");
				if (!dragId || dragId === id) return;
				const fromIdx = order.findIndex((entry) => keys.getId(entry) === dragId);
				const toIdx = order.findIndex((entry) => keys.getId(entry) === id);
				if (fromIdx < 0 || toIdx < 0) return;
				const [moved] = order.splice(fromIdx, 1);
				order.splice(toIdx, 0, moved);
				dragId = undefined;
				renderRows();
				onReorder([...order]);
			});
		}
	};

	renderRows();
}
