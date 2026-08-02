import type { DashboardModel } from "../core/model";
import type { WidgetTier } from "../settings";
import { statusColor } from "./format";
import { iconFor } from "./icons";
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

	const rows = flaggedRows(model);
	if (opts.tier === "chip") {
		// The chip is a self-contained pill (heart + count + pips), not a card -- no "Health"
		// header/chevron row above it like the list tier gets.
		root.className = "hlth-widget-chip-root";
		root.appendChild(buildChip(rows, opts));
		return;
	}

	root.className = "hlth-widget";
	root.appendChild(buildHeader(model, rows.length, opts));
	root.appendChild(buildList(rows, opts));
}

export function renderHealthWidgetEmpty(root: HTMLElement, message: string): void {
	root.textContent = "";
	root.className = "hlth-widget";
	const empty = document.createElement("div");
	empty.className = "hlth-widget-empty";
	empty.textContent = message;
	root.appendChild(empty);
}

function buildHeart(ok: boolean): SVGSVGElement {
	const heart = iconFor("heart");
	heart.classList.add("hlth-widget-heart");
	if (ok) heart.classList.add("hlth-widget-heart-ok");
	return heart;
}

function buildInlineIcon(name: string, cls: string): SVGSVGElement {
	const icon = iconFor(name);
	icon.classList.add(cls);
	return icon;
}

/** "Health" label + flagged/tracked count + chevron -- the whole row opens the full Dashboard. */
function buildHeader(model: DashboardModel, flaggedCount: number, opts: WidgetRenderOptions): HTMLElement {
	const head = document.createElement("button");
	head.type = "button";
	head.className = "hlth-widget-header";
	head.addEventListener("click", () => opts.onOpenDashboard());

	head.appendChild(buildHeart(flaggedCount === 0));

	const label = document.createElement("span");
	label.className = "hlth-widget-lbl";
	label.textContent = "Health";
	head.appendChild(label);

	const count = document.createElement("span");
	count.className = "hlth-widget-count";
	if (flaggedCount > 0) {
		count.appendChild(document.createTextNode(`${flaggedCount} `));
		count.appendChild(buildInlineIcon("flag", "hlth-widget-count-flag"));
		count.appendChild(document.createTextNode(` · ${model.markers.length} `));
	} else {
		count.appendChild(document.createTextNode(`${model.markers.length} `));
	}
	count.appendChild(buildInlineIcon("folder-archive", "hlth-widget-count-flag"));
	head.appendChild(count);

	const chevron = iconFor("chevron-right");
	chevron.classList.add("hlth-widget-chevron");
	head.appendChild(chevron);

	return head;
}

/** Appends a status dot + "All clear" text directly into `el` (a flex container providing the gap). */
function fillAllClear(el: HTMLElement): void {
	const dot = document.createElement("span");
	dot.className = "hlth-dot";
	dot.style.background = statusColor("good");
	el.appendChild(dot);
	el.appendChild(document.createTextNode("All clear"));
}

function buildChip(rows: RowEntry[], opts: WidgetRenderOptions): HTMLElement {
	const chip = document.createElement("button");
	chip.type = "button";
	chip.className = "hlth-widget-chip";
	chip.addEventListener("click", () => opts.onOpenDashboard());

	const ok = rows.length === 0;
	chip.appendChild(buildHeart(ok));

	const count = document.createElement("span");
	count.className = "hlth-widget-chip-count";
	count.textContent = ok ? "✓" : String(rows.length);
	if (ok) count.classList.add("hlth-widget-chip-count-ok");
	chip.appendChild(count);

	const unit = document.createElement("span");
	unit.className = "hlth-widget-chip-unit";
	if (ok) unit.textContent = "in range";
	else unit.appendChild(buildInlineIcon("flag", "hlth-widget-chip-unit-flag"));
	chip.appendChild(unit);

	if (!ok) {
		const pips = document.createElement("span");
		pips.className = "hlth-widget-chip-pips";
		for (const row of rows) {
			const pip = document.createElement("span");
			pip.className = "hlth-dot";
			pip.style.background = statusColor(row.primary.status);
			pips.appendChild(pip);
		}
		chip.appendChild(pips);
	}

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
	fillMarkerRowContent(el, primary, secondary, { showSparkline: opts.showSparkline, colorValue: false });

	return el;
}
