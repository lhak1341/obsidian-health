import type { DashboardModel } from "../core/model";
import type { WidgetTier } from "../settings";
import { statusColor } from "./format";
import { fillMarkerRowContent, flaggedRows, type RowEntry } from "./rows";

export interface WidgetRenderOptions {
	tier: WidgetTier;
	maxRows: number;
	showSparkline: boolean;
	onOpenDashboard: () => void;
	onOpenMarker?: (markerId: string) => void;
}

export function renderHealthWidget(root: HTMLElement, model: DashboardModel, opts: WidgetRenderOptions): void {
	root.textContent = "";
	root.className = "hlth-widget";

	const header = document.createElement("button");
	header.type = "button";
	header.className = "hlth-widget-header";
	header.textContent = "Health";
	header.addEventListener("click", () => opts.onOpenDashboard());
	root.appendChild(header);

	const rows = flaggedRows(model);
	root.appendChild(opts.tier === "chip" ? buildChip(rows) : buildList(rows, opts));
}

export function renderHealthWidgetEmpty(root: HTMLElement, message: string): void {
	root.textContent = "";
	root.className = "hlth-widget";
	const empty = document.createElement("div");
	empty.className = "hlth-widget-empty";
	empty.textContent = message;
	root.appendChild(empty);
}

/** Appends a status dot + "All clear" text directly into `el` (a flex container providing the gap). */
function fillAllClear(el: HTMLElement): void {
	const dot = document.createElement("span");
	dot.className = "hlth-dot";
	dot.style.background = statusColor("good");
	el.appendChild(dot);
	el.appendChild(document.createTextNode("All clear"));
}

function buildChip(rows: RowEntry[]): HTMLElement {
	const chip = document.createElement("div");
	chip.className = "hlth-widget-chip";

	if (rows.length === 0) {
		chip.classList.add("hlth-widget-chip-clear");
		fillAllClear(chip);
		return chip;
	}

	const count = document.createElement("span");
	count.className = "hlth-widget-chip-count";
	count.textContent = `${rows.length} flagged`;
	chip.appendChild(count);

	const pips = document.createElement("span");
	pips.className = "hlth-widget-chip-pips";
	for (const row of rows) {
		const pip = document.createElement("span");
		pip.className = "hlth-dot";
		pip.style.background = statusColor(row.primary.status);
		pips.appendChild(pip);
	}
	chip.appendChild(pips);

	return chip;
}

function buildList(rows: RowEntry[], opts: WidgetRenderOptions): HTMLElement {
	const list = document.createElement("div");
	list.className = "hlth-widget-list";

	if (rows.length === 0) {
		const clear = document.createElement("div");
		clear.className = "hlth-widget-clear";
		fillAllClear(clear);
		list.appendChild(clear);
		return list;
	}

	const shown = rows.slice(0, opts.maxRows);
	for (const row of shown) list.appendChild(buildListRow(row, opts));

	const overflow = rows.length - shown.length;
	if (overflow > 0) {
		const more = document.createElement("button");
		more.type = "button";
		more.className = "hlth-widget-more";
		more.textContent = `+${overflow} more · view all`;
		more.addEventListener("click", () => opts.onOpenDashboard());
		list.appendChild(more);
	}

	return list;
}

function buildListRow(row: RowEntry, opts: WidgetRenderOptions): HTMLElement {
	const { primary, secondary } = row;

	const el = document.createElement("button");
	el.type = "button";
	el.className = "hlth-widget-row";
	el.addEventListener("click", () => opts.onOpenMarker?.(primary.marker.id));
	fillMarkerRowContent(el, primary, secondary, { showSparkline: opts.showSparkline });

	return el;
}
