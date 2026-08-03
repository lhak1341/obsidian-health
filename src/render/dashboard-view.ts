import type { ConcernGroup, DashboardModel, MarkerStatusInfo, SeriesPoint, Status } from "../core/model";
import type { MarkerNote, ProfileNote } from "../core/types";
import { buildHistoryChart, buildSparkline } from "./charts";
import { columnForConcern, labelForConcern } from "./concern-registry";
import { formatFullDate, formatRangeText, formatRawValue, formatTargetText, formatYear, statusColor } from "./format";
import { iconFor, iconForConcern } from "./icons";
import { buildArrowCell, flaggedRows, formatRowValue, indexPairs, type RowEntry } from "./rows";
import { renderInlineMarkdown } from "./rich-text";
import { hideTooltip, showTooltip } from "./tooltip";

export interface DashboardRenderOptions {
	showAll: boolean;
	onToggleShowAll: () => void;
	onAddVisit: () => void;
	onOpenPlanner: () => void;
	/** Tries to switch the single configured Base file to the concern's view (key = normalized identity
	 *  for override lookup, label = display text and default view name); resolves false when the Base
	 *  file doesn't exist (caller degrades to in-plugin expand). */
	onOpenConcern: (key: string, label: string) => boolean | Promise<boolean>;
	profiles: string[];
	activePerson: string;
	onSwitchProfile: (person: string) => void;
	profile: ProfileNote;
	lastVisitDate?: string;
	concernIcons: Record<string, string>;
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

	dash.appendChild(buildHeader(opts, model.markers.length > 0));

	if (model.markers.length === 0) {
		dash.appendChild(buildEmptyState());
		return;
	}

	const rowByMarkerId = indexPairs(model.markers);
	const rowsById = new Map<string, RowRef>();

	const groups = buildGroups(model, opts, rowByMarkerId, rowsById);
	dash.appendChild(buildAttentionBar(model, rowsById));
	dash.appendChild(groups);
}

function buildEmptyState(): HTMLElement {
	const empty = document.createElement("div");
	empty.className = "hlth-empty";
	empty.textContent = "No visits recorded yet. Add the first lab visit to see your dashboard.";
	return empty;
}

function buildHeader(opts: DashboardRenderOptions, hasMarkers: boolean): HTMLElement {
	const top = document.createElement("div");
	top.className = "hlth-top";

	const left = document.createElement("div");
	left.className = "hlth-top-left";
	if (opts.profiles.length > 1) left.appendChild(buildProfileSwitcher(opts));
	left.appendChild(buildProfileInfo(opts));
	top.appendChild(left);

	const actions = document.createElement("div");
	actions.className = "hlth-top-actions";

	const plannerButton = document.createElement("button");
	plannerButton.type = "button";
	plannerButton.className = "hlth-showall-btn";
	plannerButton.textContent = "Planner";
	plannerButton.addEventListener("click", () => opts.onOpenPlanner());
	actions.appendChild(plannerButton);

	const addButton = document.createElement("button");
	addButton.type = "button";
	addButton.className = "hlth-showall-btn";
	addButton.textContent = "+ Add visit";
	addButton.addEventListener("click", () => opts.onAddVisit());
	actions.appendChild(addButton);

	if (hasMarkers) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "hlth-showall-btn";
		if (opts.showAll) button.classList.add("hlth-btn-on");
		button.appendChild(iconFor("eye"));
		button.appendChild(document.createTextNode(opts.showAll ? "Curated" : "Show all"));
		button.addEventListener("click", () => opts.onToggleShowAll());
		actions.appendChild(button);
	}

	top.appendChild(actions);

	return top;
}

function buildProfileSwitcher(opts: DashboardRenderOptions): HTMLElement {
	const ppl = document.createElement("div");
	ppl.className = "hlth-ppl";
	for (const person of opts.profiles) {
		const pill = document.createElement("button");
		pill.type = "button";
		pill.className = "hlth-pill";
		if (person === opts.activePerson) pill.classList.add("hlth-pill-active");
		pill.textContent = person;
		pill.addEventListener("click", () => opts.onSwitchProfile(person));
		ppl.appendChild(pill);
	}
	return ppl;
}

function buildProfileInfo(opts: DashboardRenderOptions): HTMLElement {
	const line = document.createElement("div");
	line.className = "hlth-profile-info";
	line.appendChild(iconFor("droplet"));

	const bits: string[] = [];
	if (opts.profile.bloodType) bits.push(opts.profile.bloodType);
	bits.push(opts.profile.allergies?.length ? opts.profile.allergies.join(", ") : "No known allergies");
	bits.push(opts.lastVisitDate ? `Last record: ${formatFullDate(opts.lastVisitDate)}` : "No records yet");

	const text = document.createElement("span");
	text.textContent = bits.join(" · ");
	line.appendChild(text);

	return line;
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

function buildAttentionBar(model: DashboardModel, rowsById: Map<string, RowRef>): HTMLElement {
	const flagged = flaggedRows(model);

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
		empty.appendChild(iconFor("heart"));
		empty.appendChild(document.createTextNode("All clear this visit — nothing outside range or past a target."));
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
		value.textContent = formatRowValue(primary, secondary);
		item.appendChild(value);

		item.appendChild(buildArrowCell(primary));

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

function buildGroups(model: DashboardModel, opts: DashboardRenderOptions, rowByMarkerId: Map<string, RowEntry>, rowsById: Map<string, RowRef>): HTMLElement {
	const container = document.createElement("div");
	container.className = "hlth-groups";

	const rankIndex = new Map(model.attentionOrder.map((id, i) => [id, i]));
	const curated = new Set(model.curated);
	const sorted = [...model.concernGroups].sort((a, b) => groupRank(a, rankIndex) - groupRank(b, rankIndex));

	const columns: ConcernGroup[][] = [[], [], []];
	for (const group of sorted) columns[columnForConcern(group.concern)].push(group);

	for (const columnGroups of columns) {
		const col = document.createElement("div");
		col.className = "hlth-col";
		for (const group of columnGroups) {
			col.appendChild(buildGroup(group, opts, curated, rowByMarkerId, rowsById));
		}
		container.appendChild(col);
	}

	return container;
}

function groupRank(group: ConcernGroup, rankIndex: Map<string, number>): number {
	return Math.min(...group.markers.map((info) => rankIndex.get(info.marker.id) ?? Number.POSITIVE_INFINITY));
}

function rowOrder(row: RowEntry): number {
	return row.primary.marker.order ?? Number.POSITIVE_INFINITY;
}

function buildGroup(group: ConcernGroup, opts: DashboardRenderOptions, curated: Set<string>, rowByMarkerId: Map<string, RowEntry>, rowsById: Map<string, RowRef>): HTMLElement {
	const rendered = new Set<string>();
	const rows: RowEntry[] = [];
	for (const info of group.markers) {
		const row = rowByMarkerId.get(info.marker.id)!;
		if (rendered.has(row.primary.marker.id)) continue;
		rendered.add(row.primary.marker.id);
		rows.push(row);
	}
	// Vault scan order is otherwise arbitrary (filesystem/cache enumeration, not alphabetical) --
	// `order:` frontmatter lets a marker note pin its row position; unset markers fall back to
	// alphabetical by name so the layout is still deterministic without it.
	rows.sort((a, b) => rowOrder(a) - rowOrder(b) || a.primary.marker.name.localeCompare(b.primary.marker.name));

	const hiddenCount = rows.filter((row) => !curated.has(row.primary.marker.id)).length;

	const wrap = document.createElement("div");
	wrap.className = "hlth-grp";
	const head = buildGroupHeader(group, hiddenCount, opts.showAll, opts.concernIcons);
	head.addEventListener("click", () => {
		void Promise.resolve(opts.onOpenConcern(group.concern, labelForConcern(group.concern))).then((opened) => {
			if (!opened) wrap.classList.toggle("hlth-grp-expanded");
		});
	});
	wrap.appendChild(head);

	for (const row of rows) {
		const hidden = !opts.showAll && !curated.has(row.primary.marker.id);
		const { header, detail, open } = buildRow(row, hidden);
		wrap.appendChild(header);
		wrap.appendChild(detail);
		const rowRef: RowRef = { header, open };
		rowsById.set(row.primary.marker.id, rowRef);
		if (row.secondary) rowsById.set(row.secondary.marker.id, rowRef);
	}

	return wrap;
}

function buildGroupHeader(group: ConcernGroup, hiddenCount: number, showAll: boolean, concernIcons: Record<string, string>): HTMLElement {
	const head = document.createElement("div");
	head.className = "hlth-grp-head";

	const icon = iconForConcern(group.concern, concernIcons);
	icon.classList.add("hlth-grp-icon");
	head.appendChild(icon);

	const label = document.createElement("span");
	label.className = "hlth-lbl hlth-grp-label";
	label.textContent = labelForConcern(group.concern);
	head.appendChild(label);

	const dot = document.createElement("span");
	dot.className = "hlth-dot";
	dot.style.background = statusColor(group.status);
	head.appendChild(dot);

	const hint = document.createElement("span");
	hint.className = "hlth-grp-hint";
	hint.appendChild(iconFor("external-link"));
	hint.appendChild(document.createTextNode("Base view"));
	head.appendChild(hint);

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

	header.appendChild(buildNameCell(primary));

	header.appendChild(buildSparkline(primary.series, primary.band, statusColor(primary.status), secondary?.series));

	// Arrow/value/unit each get their own fixed-width grid column so the sparkline, arrow,
	// value, and unit all line up into consistent vertical tracks across every row. Trade-off
	// (explicitly chosen over packing arrow+value together): the visible gap between the arrow
	// and a value's actual digits varies with the value's text length, since the value's box is
	// fixed-width but right-aligned -- e.g. "0.38" sits further from its box's left edge than
	// "453.56" does. Column alignment wins over that variance here.
	header.appendChild(buildArrowCell(primary));
	header.appendChild(buildValueOnlyCell(row));
	header.appendChild(buildUnitCell(primary));

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

	const target = formatTargetText(marker);
	const rangeText = `Normal ${formatRangeText(info.band, marker)}${target ? ` · ${target}` : ""}`;

	cell.addEventListener("mouseenter", () => showTooltip(cell, marker.blurb, rangeText));
	cell.addEventListener("mouseleave", hideTooltip);

	return cell;
}

function buildValueOnlyCell(row: RowEntry): HTMLElement {
	const { primary, secondary } = row;
	const value = document.createElement("span");
	value.className = "hlth-value";
	if (primary.marker.type === "qualitative") value.classList.add("hlth-value-qual");
	value.style.color = primary.status === "good" ? "var(--text-normal)" : statusColor(primary.status);
	value.textContent = formatRowValue(primary, secondary);
	return value;
}

function buildUnitCell(primary: MarkerStatusInfo): HTMLElement {
	const unit = document.createElement("span");
	unit.className = "hlth-unit";
	unit.textContent = primary.marker.unit ?? "";
	return unit;
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
	renderInlineMarkdown(meaning, marker.blurb);
	cap.appendChild(meaning);

	const now = document.createElement("span");
	now.className = "hlth-detail-now";
	now.style.color = primary.status === "good" ? "var(--text-normal)" : statusColor(primary.status);
	now.textContent = formatRowValue(primary, secondary);
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
