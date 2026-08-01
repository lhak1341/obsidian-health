import type { ConcernGroup, DashboardModel, MarkerStatusInfo, SeriesPoint, Status } from "../core/model";
import type { MarkerNote } from "../core/types";
import { buildHistoryChart, buildSparkline } from "./charts";
import { formatArrow, formatRangeText, formatRawValue, formatTargetText, formatYear, statusColor } from "./format";

export interface DashboardRenderOptions {
	showAll: boolean;
	onToggleShowAll: () => void;
	onAddVisit: () => void;
}

interface RowEntry {
	primary: MarkerStatusInfo;
	secondary?: MarkerStatusInfo;
}

interface RowRef {
	header: HTMLElement;
	open: () => void;
}

export function renderDashboard(root: HTMLElement, model: DashboardModel, opts: DashboardRenderOptions): void {
	root.textContent = "";

	// A dedicated child carries layout/padding -- `root` is Obsidian's own `.view-content`
	// element, and themes routinely pin `div.view-content { padding: 0 !important }`.
	const dash = document.createElement("div");
	dash.className = "hlth-dash";
	root.appendChild(dash);

	if (model.markers.length === 0) {
		dash.appendChild(buildEmptyState(opts));
		return;
	}

	const rowByMarkerId = indexPairs(model.markers);
	const rowsById = new Map<string, RowRef>();

	dash.appendChild(buildHeader(opts));
	const groups = buildGroups(model, opts.showAll, rowByMarkerId, rowsById);
	dash.appendChild(buildAttentionBar(model, rowByMarkerId, rowsById));
	dash.appendChild(groups);
}

function buildEmptyState(opts: DashboardRenderOptions): HTMLElement {
	const empty = document.createElement("div");
	empty.className = "hlth-empty";

	const text = document.createElement("div");
	text.textContent = "No visits recorded yet. Add the first lab visit to see your dashboard.";
	empty.appendChild(text);

	const button = document.createElement("button");
	button.type = "button";
	button.className = "hlth-showall-btn";
	button.textContent = "+ Add visit";
	button.addEventListener("click", () => opts.onAddVisit());
	empty.appendChild(button);

	return empty;
}

function buildHeader(opts: DashboardRenderOptions): HTMLElement {
	const top = document.createElement("div");
	top.className = "hlth-top";

	const title = document.createElement("span");
	title.className = "hlth-title";
	title.textContent = "Health";
	top.appendChild(title);

	const actions = document.createElement("div");
	actions.className = "hlth-top-actions";

	const addButton = document.createElement("button");
	addButton.type = "button";
	addButton.className = "hlth-showall-btn";
	addButton.textContent = "+ Add visit";
	addButton.addEventListener("click", () => opts.onAddVisit());
	actions.appendChild(addButton);

	const button = document.createElement("button");
	button.type = "button";
	button.className = "hlth-showall-btn";
	button.textContent = opts.showAll ? "Curated" : "Show all";
	button.addEventListener("click", () => opts.onToggleShowAll());
	actions.appendChild(button);

	top.appendChild(actions);

	return top;
}

function attentionReason(status: Status): string {
	switch (status) {
		case "high":
			return "above range";
		case "low":
			return "below range";
		case "watch":
			return "past your target";
		case "good":
			return "";
	}
}

function buildAttentionBar(model: DashboardModel, rowByMarkerId: Map<string, RowEntry>, rowsById: Map<string, RowRef>): HTMLElement {
	const infoById = new Map(model.markers.map((info) => [info.marker.id, info]));
	const seen = new Set<string>();
	const flagged: RowEntry[] = [];
	for (const id of model.attentionOrder) {
		const info = infoById.get(id)!;
		if (info.status === "good") continue;
		const row = rowByMarkerId.get(id)!;
		if (seen.has(row.primary.marker.id)) continue;
		seen.add(row.primary.marker.id);
		flagged.push(row);
	}

	const bar = document.createElement("div");
	bar.className = "hlth-attn";

	const lead = document.createElement("div");
	lead.className = "hlth-attn-lead";
	const label = document.createElement("span");
	label.className = "hlth-lbl";
	label.textContent = "Needs attention";
	lead.appendChild(label);
	if (flagged.length > 0) {
		const count = document.createElement("span");
		count.className = "hlth-attn-count";
		count.textContent = `${flagged.length} marker${flagged.length === 1 ? "" : "s"}`;
		lead.appendChild(count);
	}
	bar.appendChild(lead);

	if (flagged.length === 0) {
		const empty = document.createElement("div");
		empty.className = "hlth-attn-empty";
		empty.textContent = "All clear this visit — nothing outside range or past a target.";
		bar.appendChild(empty);
		return bar;
	}

	const items = document.createElement("div");
	items.className = "hlth-attn-items";
	for (const row of flagged) {
		const { primary, secondary } = row;
		const item = document.createElement("div");
		item.className = "hlth-attn-item";

		const dot = document.createElement("span");
		dot.className = "hlth-dot";
		dot.style.background = statusColor(primary.status);
		item.appendChild(dot);

		const name = document.createElement("span");
		name.className = "hlth-attn-name";
		name.textContent = primary.marker.name;
		item.appendChild(name);

		const value = document.createElement("span");
		value.className = "hlth-attn-value";
		value.style.color = statusColor(primary.status);
		value.textContent = formatLatestValue(primary, secondary);
		item.appendChild(value);

		const arrow = formatArrow(primary.arrow);
		const arrowEl = document.createElement("span");
		arrowEl.className = "hlth-arrow";
		arrowEl.style.color = arrow.color;
		arrowEl.textContent = arrow.glyph;
		item.appendChild(arrowEl);

		const why = document.createElement("span");
		why.className = "hlth-attn-why";
		why.textContent = attentionReason(primary.status);
		item.appendChild(why);

		item.addEventListener("click", () => {
			const rowRef = rowsById.get(primary.marker.id);
			if (!rowRef) return;
			rowRef.open();
			rowRef.header.scrollIntoView({ block: "center", behavior: "smooth" });
		});

		items.appendChild(item);
	}
	bar.appendChild(items);

	return bar;
}

function indexPairs(markers: MarkerStatusInfo[]): Map<string, RowEntry> {
	const rows = pairEntries(markers);
	const index = new Map<string, RowEntry>();
	for (const row of rows) {
		index.set(row.primary.marker.id, row);
		if (row.secondary) index.set(row.secondary.marker.id, row);
	}
	return index;
}

function pairEntries(markers: MarkerStatusInfo[]): RowEntry[] {
	const consumed = new Set<string>();
	const rows: RowEntry[] = [];

	for (const info of markers) {
		if (consumed.has(info.marker.id)) continue;
		consumed.add(info.marker.id);

		const partner = info.marker.pair ? markers.find((other) => other.marker.id !== info.marker.id && other.marker.pair === info.marker.pair) : undefined;

		if (partner) {
			consumed.add(partner.marker.id);
			const infoOrder = info.marker.order ?? 0;
			const partnerOrder = partner.marker.order ?? 1;
			rows.push(infoOrder <= partnerOrder ? { primary: info, secondary: partner } : { primary: partner, secondary: info });
		} else {
			rows.push({ primary: info });
		}
	}

	return rows;
}

function buildGroups(model: DashboardModel, showAll: boolean, rowByMarkerId: Map<string, RowEntry>, rowsById: Map<string, RowRef>): HTMLElement {
	const container = document.createElement("div");
	container.className = "hlth-groups";

	const rankIndex = new Map(model.attentionOrder.map((id, i) => [id, i]));
	const curated = new Set(model.curated);
	const groups = [...model.concernGroups].sort((a, b) => groupRank(a, rankIndex) - groupRank(b, rankIndex));

	for (const group of groups) {
		container.appendChild(buildGroup(group, showAll, curated, rowByMarkerId, rowsById));
	}

	return container;
}

function groupRank(group: ConcernGroup, rankIndex: Map<string, number>): number {
	return Math.min(...group.markers.map((info) => rankIndex.get(info.marker.id) ?? Number.POSITIVE_INFINITY));
}

function buildGroup(group: ConcernGroup, showAll: boolean, curated: Set<string>, rowByMarkerId: Map<string, RowEntry>, rowsById: Map<string, RowRef>): HTMLElement {
	const rendered = new Set<string>();
	const rows: RowEntry[] = [];
	for (const info of group.markers) {
		const row = rowByMarkerId.get(info.marker.id)!;
		if (rendered.has(row.primary.marker.id)) continue;
		rendered.add(row.primary.marker.id);
		rows.push(row);
	}

	const hiddenCount = rows.filter((row) => !curated.has(row.primary.marker.id)).length;

	const wrap = document.createElement("div");
	wrap.className = "hlth-grp";
	wrap.appendChild(buildGroupHeader(group, hiddenCount, showAll));

	for (const row of rows) {
		const hidden = !showAll && !curated.has(row.primary.marker.id);
		const { header, detail, open } = buildRow(row, hidden);
		wrap.appendChild(header);
		wrap.appendChild(detail);
		const rowRef: RowRef = { header, open };
		rowsById.set(row.primary.marker.id, rowRef);
		if (row.secondary) rowsById.set(row.secondary.marker.id, rowRef);
	}

	return wrap;
}

function buildGroupHeader(group: ConcernGroup, hiddenCount: number, showAll: boolean): HTMLElement {
	const head = document.createElement("div");
	head.className = "hlth-grp-head";

	const label = document.createElement("span");
	label.className = "hlth-lbl hlth-grp-label";
	label.textContent = group.concern;
	head.appendChild(label);

	const dot = document.createElement("span");
	dot.className = "hlth-dot";
	dot.style.background = statusColor(group.status);
	head.appendChild(dot);

	if (!showAll && hiddenCount > 0) {
		const tag = document.createElement("span");
		tag.className = "hlth-grp-tag";
		tag.textContent = `+${hiddenCount} hidden`;
		head.appendChild(tag);
	}

	return head;
}

function buildRow(row: RowEntry, hidden: boolean): { header: HTMLElement; detail: HTMLElement; open: () => void } {
	const { primary, secondary } = row;

	const header = document.createElement("div");
	header.className = "hlth-row";
	if (hidden) header.classList.add("hlth-hidden");

	const chevron = document.createElement("span");
	chevron.className = "hlth-chevron";
	chevron.textContent = "▸";
	header.appendChild(chevron);

	header.appendChild(buildNameCell(primary));

	header.appendChild(buildSparkline(primary.series, primary.band, statusColor(primary.status), secondary?.series));

	header.appendChild(buildValueCell(row));

	const detail = document.createElement("div");
	detail.className = "hlth-detail";
	detail.appendChild(buildDetailContent(row));

	const setOpen = (open: boolean) => {
		header.classList.toggle("hlth-open", open);
		detail.classList.toggle("hlth-open", open);
	};
	header.addEventListener("click", () => setOpen(!header.classList.contains("hlth-open")));

	return { header, detail, open: () => setOpen(true) };
}

function buildNameCell(info: MarkerStatusInfo): HTMLElement {
	const marker = info.marker;
	const cell = document.createElement("div");
	cell.className = "hlth-name";

	const text = document.createElement("span");
	text.className = "hlth-name-text";
	text.textContent = marker.name;
	cell.appendChild(text);

	const tip = document.createElement("span");
	tip.className = "hlth-tip";
	if (marker.blurb) tip.appendChild(document.createTextNode(marker.blurb));

	const range = document.createElement("span");
	range.className = "hlth-tip-range";
	const target = formatTargetText(marker);
	range.textContent = `Normal ${formatRangeText(info.band, marker)}${target ? ` · ${target}` : ""}`;
	tip.appendChild(range);

	cell.appendChild(tip);

	return cell;
}

function buildValueCell(row: RowEntry): HTMLElement {
	const { primary, secondary } = row;
	const cell = document.createElement("div");
	cell.className = "hlth-value-group";

	const arrow = formatArrow(primary.arrow);
	const arrowEl = document.createElement("span");
	arrowEl.className = "hlth-arrow";
	arrowEl.style.color = arrow.color;
	arrowEl.textContent = arrow.glyph;
	cell.appendChild(arrowEl);

	const value = document.createElement("span");
	value.className = "hlth-value";
	if (primary.marker.type === "qualitative") value.classList.add("hlth-value-qual");
	value.style.color = primary.status === "good" ? "var(--text-normal)" : statusColor(primary.status);
	value.textContent = formatLatestValue(primary, secondary);
	cell.appendChild(value);

	if (primary.marker.unit) {
		const unit = document.createElement("span");
		unit.className = "hlth-unit";
		unit.textContent = primary.marker.unit;
		cell.appendChild(unit);
	}

	return cell;
}

function formatLatestValue(primary: MarkerStatusInfo, secondary?: MarkerStatusInfo): string {
	if (!primary.latest) return "—";
	const primaryText = formatRawValue(primary.latest.value);
	if (secondary?.latest) return `${primaryText}/${formatRawValue(secondary.latest.value)}`;
	return primaryText;
}

function buildDetailContent(row: RowEntry): HTMLElement {
	const { primary, secondary } = row;
	const marker = primary.marker;
	const wrap = document.createElement("div");
	wrap.className = "hlth-detail-in";

	const cap = document.createElement("div");
	cap.className = "hlth-detail-cap";
	const meaning = document.createElement("span");
	meaning.className = "hlth-detail-meaning";
	meaning.textContent = marker.blurb;
	cap.appendChild(meaning);

	const now = document.createElement("span");
	now.className = "hlth-detail-now";
	now.style.color = primary.status === "good" ? "var(--text-normal)" : statusColor(primary.status);
	now.textContent = formatLatestValue(primary, secondary);
	if (marker.unit) {
		const unit = document.createElement("span");
		unit.className = "hlth-unit";
		unit.textContent = ` ${marker.unit}`;
		now.appendChild(unit);
	}
	cap.appendChild(now);
	wrap.appendChild(cap);

	if (marker.type === "qualitative") {
		wrap.appendChild(buildQualitativeChips(marker, primary.series));
		return wrap;
	}

	const numericCount = primary.series.filter((point) => typeof point.value === "number").length;
	if (numericCount < 2) {
		const note = document.createElement("div");
		note.className = "hlth-single-note";
		const readings = primary.series.map((point) => `${formatYear(point.date)} · ${formatRawValue(point.value)}${marker.unit ? ` ${marker.unit}` : ""}`).join(", ");
		note.textContent = `Single reading so far — ${readings}. Trend appears after the next visit.`;
		wrap.appendChild(note);
		return wrap;
	}

	const target = marker.optimalHigh ?? marker.optimalLow;
	wrap.appendChild(
		buildHistoryChart(primary.series, secondary?.series, {
			band: primary.band,
			target,
			targetLabel: formatTargetText(marker) || undefined,
			statusColor: statusColor(primary.status),
			pairFormat: secondary ? (p, s) => `${formatRawValue(p)}${s !== undefined ? `/${formatRawValue(s)}` : ""}` : undefined,
		}),
	);

	return wrap;
}

function buildQualitativeChips(marker: MarkerNote, series: SeriesPoint[]): HTMLElement {
	const list = document.createElement("div");
	list.className = "hlth-qhist";

	const normal = marker.normal === undefined ? [] : ([] as string[]).concat(marker.normal);
	for (const point of series) {
		const chip = document.createElement("span");
		const good = normal.includes(String(point.value));
		chip.className = `hlth-qchip ${good ? "hlth-qchip-good" : "hlth-qchip-bad"}`;

		const year = document.createElement("b");
		year.textContent = formatYear(point.date);
		chip.appendChild(year);

		const value = document.createElement("span");
		value.textContent = String(point.value);
		chip.appendChild(value);

		list.appendChild(chip);
	}

	return list;
}
