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
	onEditVisit?: () => void;
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

interface RowInstance {
	header: HTMLElement;
	detail: HTMLElement;
}

/** Each marker's row is rendered once per responsive tier (wide/medium/narrow -- see buildGroups),
 *  so "open" has to act on every instance at once, not just the one under the cursor, or resizing
 *  to a different tier would silently show it collapsed again. Also enforces the accordion (only
 *  one row open at a time): opening a new marker closes whichever was open before it. */
function createRowOpenController() {
	const instances = new Map<string, RowInstance[]>();
	let openId: string | undefined;

	const setInstancesOpen = (markerId: string, open: boolean) => {
		for (const inst of instances.get(markerId) ?? []) {
			inst.header.classList.toggle("hlth-open", open);
			inst.detail.classList.toggle("hlth-open", open);
		}
	};

	return {
		register(markerId: string, instance: RowInstance): void {
			const list = instances.get(markerId) ?? [];
			list.push(instance);
			instances.set(markerId, list);
		},
		/** Opens `markerId`, closing whatever was previously open; closes it instead if it's already open. */
		toggle(markerId: string): void {
			if (openId === markerId) {
				setInstancesOpen(markerId, false);
				openId = undefined;
				return;
			}
			if (openId) setInstancesOpen(openId, false);
			setInstancesOpen(markerId, true);
			openId = markerId;
		},
		/** Opens `markerId` (closing whatever was open); a no-op if it's already the open one. */
		open(markerId: string): void {
			if (openId === markerId) return;
			if (openId) setInstancesOpen(openId, false);
			setInstancesOpen(markerId, true);
			openId = markerId;
		},
		/** Only one tier's instance has layout at a time (the other two are `display:none`) --
		 *  `offsetParent` is null for anything not currently rendered, so this finds the real one. */
		scrollIntoView(markerId: string): void {
			const visible = (instances.get(markerId) ?? []).find((inst) => inst.header.offsetParent !== null);
			visible?.header.scrollIntoView({ block: "center", behavior: "smooth" });
		},
	};
}

type RowOpenController = ReturnType<typeof createRowOpenController>;

export function renderDashboard(root: HTMLElement, model: DashboardModel, opts: DashboardRenderOptions): void {
	root.textContent = "";

	// A dedicated child carries layout/padding -- `root` is Obsidian's own `.view-content`
	// element, and themes routinely pin `div.view-content { padding: 0 !important }`.
	const dash = createDiv();
	dash.className = "hlth-dash";
	root.appendChild(dash);

	dash.appendChild(buildHeader(opts, model.markers.length > 0));

	if (model.markers.length === 0) {
		dash.appendChild(buildEmptyState());
		return;
	}

	const rowByMarkerId = indexPairs(model.markers);
	const rowOpen = createRowOpenController();

	const groups = buildGroups(model, opts, rowByMarkerId, rowOpen);
	dash.appendChild(buildAttentionBar(model, rowOpen));
	dash.appendChild(groups);
}

function buildEmptyState(): HTMLElement {
	const empty = createDiv();
	empty.className = "hlth-empty";
	empty.textContent = "No visits recorded yet. Add the first lab visit to see your dashboard.";
	return empty;
}

function buildHeader(opts: DashboardRenderOptions, hasMarkers: boolean): HTMLElement {
	const top = createDiv();
	top.className = "hlth-top";

	const left = createDiv();
	left.className = "hlth-top-left";
	if (opts.profiles.length > 1) left.appendChild(buildProfileSwitcher(opts));
	left.appendChild(buildProfileInfo(opts));
	top.appendChild(left);

	const actions = createDiv();
	actions.className = "hlth-top-actions";

	const plannerButton = createEl("button");
	plannerButton.type = "button";
	plannerButton.className = "hlth-showall-btn";
	plannerButton.textContent = "Planner";
	plannerButton.addEventListener("click", () => opts.onOpenPlanner());
	actions.appendChild(plannerButton);

	const addButton = createEl("button");
	addButton.type = "button";
	addButton.className = "hlth-showall-btn";
	addButton.appendChild(iconFor("plus-circle"));
	addButton.appendChild(document.createTextNode("Add Visit"));
	addButton.addEventListener("click", () => opts.onAddVisit());
	actions.appendChild(addButton);

	if (opts.onEditVisit) {
		const editButton = createEl("button");
		editButton.type = "button";
		editButton.className = "hlth-showall-btn";
		editButton.appendChild(iconFor("pencil"));
		editButton.appendChild(document.createTextNode("Edit Visit"));
		editButton.addEventListener("click", () => opts.onEditVisit?.());
		actions.appendChild(editButton);
	}

	if (hasMarkers) {
		const button = createEl("button");
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
	const ppl = createDiv();
	ppl.className = "hlth-ppl";
	for (const person of opts.profiles) {
		const pill = createEl("button");
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
	const line = createDiv();
	line.className = "hlth-profile-info";
	line.appendChild(iconFor("droplet"));

	const bits: string[] = [];
	if (opts.profile.bloodType) bits.push(opts.profile.bloodType);
	bits.push(opts.profile.allergies?.length ? opts.profile.allergies.join(", ") : "No known allergies");
	bits.push(opts.lastVisitDate ? `Last record: ${formatFullDate(opts.lastVisitDate)}` : "No records yet");

	const text = createSpan();
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

function buildAttentionBar(model: DashboardModel, rowOpen: RowOpenController): HTMLElement {
	const flagged = flaggedRows(model);

	const bar = createDiv();
	bar.className = "hlth-attn";

	const lead = createDiv();
	lead.className = "hlth-attn-lead";
	const label = createSpan();
	label.className = "hlth-lbl";
	label.textContent = "Needs attention";
	lead.appendChild(label);
	if (flagged.length > 0) {
		const count = createSpan();
		count.className = "hlth-attn-count";
		count.textContent = `${flagged.length} marker${flagged.length === 1 ? "" : "s"}`;
		lead.appendChild(count);
	}
	bar.appendChild(lead);

	if (flagged.length === 0) {
		const empty = createDiv();
		empty.className = "hlth-attn-empty";
		empty.appendChild(iconFor("heart"));
		empty.appendChild(document.createTextNode("All clear this visit — nothing outside range or past a target."));
		bar.appendChild(empty);
		return bar;
	}

	const items = createDiv();
	items.className = "hlth-attn-items";
	for (const row of flagged) {
		const { primary, secondary } = row;
		const item = createDiv();
		item.className = "hlth-attn-item";

		const dot = createSpan();
		dot.className = "hlth-dot";
		dot.style.background = statusColor(primary.status);
		item.appendChild(dot);

		const name = createSpan();
		name.className = "hlth-attn-name";
		name.textContent = primary.marker.name;
		item.appendChild(name);

		const value = createSpan();
		value.className = "hlth-attn-value";
		value.style.color = statusColor(primary.status);
		value.textContent = formatRowValue(primary, secondary);
		item.appendChild(value);

		item.appendChild(buildArrowCell(primary));

		const why = createSpan();
		why.className = "hlth-attn-why";
		why.textContent = attentionReason(primary.status);
		item.appendChild(why);

		item.addEventListener("click", () => {
			rowOpen.open(primary.marker.id);
			rowOpen.scrollIntoView(primary.marker.id);
		});

		items.appendChild(item);
	}
	bar.appendChild(items);

	return bar;
}

/** Left column's own groups always read in this fixed editorial sequence, not attention-rank --
 *  an urgent Cancer marker shouldn't reorder Vitals/Cardiometabolic/Cancer/Immunity relative to
 *  each other. Applied everywhere those 4 groups appear together (all 3 tiers below). */
const COL0_ORDER = ["vitals", "cardiometabolic", "cancer", "immunity"];

/** Appends whichever of `sorted`'s col0-pinned groups pass `include`, in `COL0_ORDER` -- not the
 *  order they appear in `sorted` (attention-rank). */
function appendCol0(lane: HTMLElement, sorted: ConcernGroup[], build: (group: ConcernGroup) => HTMLElement, include: (concern: string) => boolean = () => true): void {
	for (const concern of COL0_ORDER) {
		for (const group of sorted) if (group.concern === concern && include(concern)) lane.appendChild(build(group));
	}
}

function makeLanes(tier: HTMLElement, count: number): HTMLElement[] {
	const lanes: HTMLElement[] = [];
	for (let i = 0; i < count; i++) {
		const lane = createDiv();
		lane.className = "hlth-lane";
		lanes.push(lane);
		tier.appendChild(lane);
	}
	return lanes;
}

/** Wide tier: 3 lanes, the CLAUDE.md-pinned left/center/right split (not CSS grid -- grid's row
 *  tracks are shared across every column, so a very tall item in one lane would inflate every
 *  other lane's row height at that index; flex has no such cross-lane coupling). Center/right
 *  stay in attention-rank order; only the left lane (Vitals/Cardiometabolic/Cancer/Immunity) has
 *  a fixed sequence, via `appendCol0`. */
function buildWideTier(sorted: ConcernGroup[], build: (group: ConcernGroup) => HTMLElement): HTMLElement {
	const tier = createDiv();
	tier.className = "hlth-tier hlth-tier-wide";
	const [left, center, right] = makeLanes(tier, 3);

	appendCol0(left, sorted, build);
	for (const group of sorted) if (columnForConcern(group.concern) === 1) center.appendChild(build(group));
	for (const group of sorted) if (columnForConcern(group.concern) === 2) right.appendChild(build(group));

	return tier;
}

/** Medium tier: CBC/Blood keeps its own lane (by far the longest single group), joined there by
 *  Cancer/Immunity in fixed order after it -- leaves the other lane as just Vitals/Cardiometabolic
 *  (also fixed order) above Everything Else (attention-rank), instead of one lane carrying 4 groups
 *  against the other's 1. */
function buildMediumTier(sorted: ConcernGroup[], build: (group: ConcernGroup) => HTMLElement): HTMLElement {
	const tier = createDiv();
	tier.className = "hlth-tier hlth-tier-medium";
	const [left, right] = makeLanes(tier, 2);

	const isBlood = (concern: string) => columnForConcern(concern) === 1;
	for (const group of sorted) if (isBlood(group.concern)) right.appendChild(build(group));
	appendCol0(right, sorted, build, (c) => c === "cancer" || c === "immunity");

	appendCol0(left, sorted, build, (c) => c !== "cancer" && c !== "immunity");
	for (const group of sorted) if (columnForConcern(group.concern) === 2) left.appendChild(build(group));

	return tier;
}

/** Narrow tier is one lane, but must still read as 3 stacked pinned blocks (left, then center,
 *  then right), not flat attention-rank order across every group, which would interleave the 3
 *  pinned columns together. The left block uses the same fixed sequence as the other two tiers. */
function buildNarrowTier(sorted: ConcernGroup[], build: (group: ConcernGroup) => HTMLElement): HTMLElement {
	const tier = createDiv();
	tier.className = "hlth-tier hlth-tier-narrow";
	const [lane] = makeLanes(tier, 1);

	appendCol0(lane, sorted, build);
	for (const group of sorted) if (columnForConcern(group.concern) === 1) lane.appendChild(build(group));
	for (const group of sorted) if (columnForConcern(group.concern) === 2) lane.appendChild(build(group));

	return tier;
}

function buildGroups(model: DashboardModel, opts: DashboardRenderOptions, rowByMarkerId: Map<string, RowEntry>, rowOpen: RowOpenController): HTMLElement {
	const container = createDiv();
	container.className = "hlth-groups";

	const rankIndex = new Map(model.attentionOrder.map((id, i) => [id, i]));
	const curated = new Set(model.curated);
	const sorted = [...model.concernGroups].sort((a, b) => groupRank(a, rankIndex) - groupRank(b, rankIndex));
	const build = (group: ConcernGroup) => buildGroup(group, opts, curated, rowByMarkerId, rowOpen);

	container.appendChild(buildWideTier(sorted, build));
	container.appendChild(buildMediumTier(sorted, build));
	container.appendChild(buildNarrowTier(sorted, build));

	return container;
}

function groupRank(group: ConcernGroup, rankIndex: Map<string, number>): number {
	return Math.min(...group.markers.map((info) => rankIndex.get(info.marker.id) ?? Number.POSITIVE_INFINITY));
}

function rowOrder(row: RowEntry): number {
	return row.primary.marker.order ?? Number.POSITIVE_INFINITY;
}

function buildGroup(group: ConcernGroup, opts: DashboardRenderOptions, curated: Set<string>, rowByMarkerId: Map<string, RowEntry>, rowOpen: RowOpenController): HTMLElement {
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

	const wrap = createDiv();
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
		const { header, detail } = buildRow(row, hidden, rowOpen);
		wrap.appendChild(header);
		wrap.appendChild(detail);
	}

	return wrap;
}

function buildGroupHeader(group: ConcernGroup, hiddenCount: number, showAll: boolean, concernIcons: Record<string, string>): HTMLElement {
	const head = createDiv();
	head.className = "hlth-grp-head";

	const icon = iconForConcern(group.concern, concernIcons);
	icon.classList.add("hlth-grp-icon");
	head.appendChild(icon);

	const label = createSpan();
	label.className = "hlth-lbl hlth-grp-label";
	label.textContent = labelForConcern(group.concern);
	head.appendChild(label);

	const dot = createSpan();
	dot.className = "hlth-dot";
	dot.style.background = statusColor(group.status);
	head.appendChild(dot);

	const hint = createSpan();
	hint.className = "hlth-grp-hint";
	hint.appendChild(iconFor("external-link"));
	hint.appendChild(document.createTextNode("Base view"));
	head.appendChild(hint);

	if (!showAll && hiddenCount > 0) {
		const tag = createSpan();
		tag.className = "hlth-grp-tag";
		tag.textContent = `+${hiddenCount} hidden`;
		head.appendChild(tag);
	}

	return head;
}

function buildRow(row: RowEntry, hidden: boolean, rowOpen: RowOpenController): { header: HTMLElement; detail: HTMLElement } {
	const { primary, secondary } = row;

	const header = createDiv();
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

	const detail = createDiv();
	detail.className = "hlth-detail";
	detail.appendChild(buildDetailContent(row));

	const markerId = primary.marker.id;
	header.addEventListener("click", () => rowOpen.toggle(markerId));
	rowOpen.register(markerId, { header, detail });
	if (secondary) rowOpen.register(secondary.marker.id, { header, detail });

	return { header, detail };
}

function buildNameCell(info: MarkerStatusInfo): HTMLElement {
	const marker = info.marker;
	const cell = createDiv();
	cell.className = "hlth-name";

	const text = createSpan();
	text.className = "hlth-name-text";
	text.textContent = marker.name;
	cell.appendChild(text);

	const target = formatTargetText(marker);
	const rangeText = `Normal ${formatRangeText(info.band, marker)}${target ? ` · ${target}` : ""}`;

	// Skip the tooltip when this row is already unfolded -- the detail panel (buildDetailContent)
	// shows the same blurb, so the tooltip on top of it is just duplicated information.
	cell.addEventListener("mouseenter", () => {
		if (cell.closest(".hlth-row")?.classList.contains("hlth-open")) return;
		showTooltip(cell, marker.blurb, rangeText);
	});
	cell.addEventListener("mouseleave", hideTooltip);

	return cell;
}

function buildValueOnlyCell(row: RowEntry): HTMLElement {
	const { primary, secondary } = row;
	const value = createSpan();
	value.className = "hlth-value";
	if (primary.marker.type === "qualitative") value.classList.add("hlth-value-qual");
	value.style.color = primary.status === "good" ? "var(--text-normal)" : statusColor(primary.status);
	value.textContent = formatRowValue(primary, secondary);
	return value;
}

function buildUnitCell(primary: MarkerStatusInfo): HTMLElement {
	const unit = createSpan();
	unit.className = "hlth-unit";
	unit.textContent = primary.marker.unit ?? "";
	return unit;
}

function buildDetailContent(row: RowEntry): HTMLElement {
	const { primary, secondary } = row;
	const marker = primary.marker;
	const wrap = createDiv();
	wrap.className = "hlth-detail-in";

	const cap = createDiv();
	cap.className = "hlth-detail-cap";
	const meaning = createSpan();
	meaning.className = "hlth-detail-meaning";
	renderInlineMarkdown(meaning, marker.blurb);
	cap.appendChild(meaning);

	const now = createSpan();
	now.className = "hlth-detail-now";
	now.style.color = primary.status === "good" ? "var(--text-normal)" : statusColor(primary.status);
	now.textContent = formatRowValue(primary, secondary);
	if (marker.unit) {
		const unit = createSpan();
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
		const note = createDiv();
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
	const list = createDiv();
	list.className = "hlth-qhist";

	const normal = marker.normal === undefined ? [] : ([] as string[]).concat(marker.normal);
	for (const point of series) {
		const chip = createSpan();
		const good = normal.includes(String(point.value));
		chip.className = `hlth-qchip ${good ? "hlth-qchip-good" : "hlth-qchip-bad"}`;

		const year = createEl("b");
		year.textContent = formatYear(point.date);
		chip.appendChild(year);

		const value = createSpan();
		value.textContent = String(point.value);
		chip.appendChild(value);

		list.appendChild(chip);
	}

	return list;
}
