import { Menu } from "obsidian";
import { isToggleable, toDisplay } from "../core/dashboard";
import type { ConcernGroup, DashboardModel, DisplayReading, MarkerStatusInfo, SeriesPoint, Status } from "../core/model";
import type { MarkerKind, MarkerNote, ProfileNote } from "../core/types";
import { buildHistoryChart, buildSparkline } from "./charts";
import { labelForConcern } from "./concern-registry";
import { formatFullDate, formatRangeText, formatRawValue, formatTargetText, formatYear, statusColor } from "./format";
import { iconFor, iconForConcern } from "./icons";
import { buildArrowCell, collectGroupRows, countVisibleRows, flaggedRows, formatRowValue, indexPairs, rowOrder, type RowEntry } from "./rows";
import { renderInlineMarkdown } from "./rich-text";
import { groupRank, MEDIUM_LANES, NARROW_LANES, packLanes, resolveLane, type Segment, WIDE_LANES } from "./tier-lanes";
import { hideTooltip, showTooltip } from "./tooltip";

/** Session-only UI state that must survive a repaint instead of resetting -- owned by the adapter
 *  (HealthView), passed by reference, mutated in place by the handlers below. `activePerson` is
 *  undefined only before the first profile resolves; by the time `renderDashboard` is ever called
 *  a profile has already been picked. */
export interface DashboardViewState {
	showAll: boolean;
	/** Marker ids currently displayed in their alt unit. Only markers with both `altUnit` and
	 *  `altFactor` are click-toggleable in the first place. */
	unitToggles: Set<string>;
	/** Which marker's row is expanded, if any. */
	openMarkerId: string | undefined;
	activePerson: string | undefined;
}

export interface DashboardRenderOptions {
	onAddVisit: () => void;
	onEditVisit?: () => void;
	onOpenPlanner: () => void;
	/** Exports a full (Show all, not Curated) screenshot of the dashboard to a PNG file. */
	onExportScreenshot: () => void;
	/** Tries to switch the single configured Base file to the concern's view (key = normalized identity
	 *  for override lookup, label = display text and default view name); resolves false when the Base
	 *  file doesn't exist (caller degrades to in-plugin expand). */
	onOpenConcern: (key: string, label: string) => boolean | Promise<boolean>;
	/** Right-click on a row -- flips the marker note's `curated:` frontmatter, then rescans. */
	onToggleCurated: (markerId: string) => void;
	/** Right-click "Edit target…" on a numeric marker row -- opens a form for that marker's
	 *  personal target override, scoped to the active profile. */
	onEditTarget: (markerId: string) => void;
	profiles: string[];
	profile: ProfileNote;
	lastVisitDate?: string;
	concernIcons: Record<string, string>;
	viewState: DashboardViewState;
	/** Fired after a `viewState` mutation that needs a full repaint (showAll, unit toggle, profile
	 *  switch). Deliberately NOT fired for row open/close -- `createRowOpenController` below already
	 *  self-handles that via CSS class toggles on already-built DOM, no repaint needed at all. */
	onViewStateChange: () => void;
}

interface RowInstance {
	header: HTMLElement;
	detail: HTMLElement;
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
function createRowOpenController(initialOpenId: string | undefined, onChange: (markerId: string | undefined) => void) {
	const instances = new Map<string, RowInstance[]>();
	let openId: string | undefined = initialOpenId;

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
			if (openId) setInstancesOpen(openId, false);
			setInstancesOpen(markerId, true);
			openId = markerId;
			onChange(markerId);
		},
		/** Opens `markerId` (closing whatever was open); a no-op if it's already the open one. */
		open(markerId: string): void {
			if (openId === markerId) return;
			if (openId) setInstancesOpen(openId, false);
			setInstancesOpen(markerId, true);
			openId = markerId;
			onChange(markerId);
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
	const rowOpen = createRowOpenController(opts.viewState.openMarkerId, (markerId) => {
		opts.viewState.openMarkerId = markerId;
	});

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

	if (hasMarkers) {
		const exportButton = createEl("button");
		exportButton.type = "button";
		exportButton.className = "hlth-showall-btn";
		exportButton.appendChild(iconFor("camera"));
		exportButton.appendChild(document.createTextNode("Export"));
		exportButton.addEventListener("click", () => opts.onExportScreenshot());
		actions.appendChild(exportButton);
	}

	const plannerButton = createEl("button");
	plannerButton.type = "button";
	plannerButton.className = "hlth-showall-btn";
	plannerButton.appendChild(iconFor("clipboard-list"));
	plannerButton.appendChild(document.createTextNode("Planner"));
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
		if (opts.viewState.showAll) button.classList.add("hlth-btn-on");
		button.appendChild(iconFor("eye"));
		button.appendChild(document.createTextNode(opts.viewState.showAll ? "Curated" : "Show all"));
		button.addEventListener("click", () => {
			opts.viewState.showAll = !opts.viewState.showAll;
			opts.onViewStateChange();
		});
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
		if (person === opts.viewState.activePerson) pill.classList.add("hlth-pill-active");
		pill.textContent = person;
		pill.addEventListener("click", () => {
			opts.viewState.activePerson = person;
			opts.onViewStateChange();
		});
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

/** Qualitative markers only ever resolve to "good" or "high" (see core/dashboard.ts's normal-list
 *  check -- no real above/below-range concept for e.g. a "Positive" Trichomonas result), so "above
 *  range" would misdescribe them; they get a type-neutral "abnormal" instead. */
function attentionReason(status: Status, markerType: MarkerKind): string {
	if (markerType === "qualitative") return status === "good" ? "" : "abnormal";
	switch (status) {
		case "high":
			return ">range";
		case "low":
			return "<range";
		case "watch":
			return ">target";
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
		value.textContent = formatRowValue(primary.latest?.value, secondary);
		item.appendChild(value);

		// Skip entirely (not just an empty glyph) when there's no arrow to show -- an empty-but-present
		// `.hlth-arrow` span still claims its own `gap` slot on both sides, reading as a stray gap
		// before "why" on rows (e.g. qualitative markers, single-reading numerics) that have none.
		if (primary.arrow) item.appendChild(buildArrowCell(primary));

		const why = createSpan();
		why.className = "hlth-attn-why";
		why.textContent = attentionReason(primary.status, primary.marker.type);
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

/** Builds one responsive tier from a lane table -- each entry in `lanes` is one lane's ordered
 *  segment list (see `resolveLane`). Flex, not CSS grid -- grid's row tracks are shared across
 *  every column, so a very tall item in one lane would inflate every other lane's row height at
 *  that index; flex has no such cross-lane coupling. Used for Show all, which keeps the
 *  pinned-column system; Curated view uses `buildPackedTier` instead (see docs/adr/0003). */
function buildTier(className: string, sorted: ConcernGroup[], build: (group: ConcernGroup) => HTMLElement, lanes: Segment[][]): HTMLElement {
	const tier = createDiv();
	tier.className = `hlth-tier ${className}`;
	const laneEls = makeLanes(tier, lanes.length);
	lanes.forEach((segments, i) => {
		for (const group of resolveLane(sorted, segments)) laneEls[i].appendChild(build(group));
	});
	return tier;
}

/** Builds one responsive tier from `packLanes`' already-assigned lane groups (Curated view only). */
function buildPackedTier(className: string, laneGroups: ConcernGroup[][], build: (group: ConcernGroup) => HTMLElement): HTMLElement {
	const tier = createDiv();
	tier.className = `hlth-tier ${className}`;
	const laneEls = makeLanes(tier, laneGroups.length);
	laneGroups.forEach((groups, i) => {
		for (const group of groups) laneEls[i].appendChild(build(group));
	});
	return tier;
}

function buildGroups(model: DashboardModel, opts: DashboardRenderOptions, rowByMarkerId: Map<string, RowEntry>, rowOpen: RowOpenController): HTMLElement {
	const container = createDiv();
	container.className = "hlth-groups";

	const rankIndex = new Map(model.attentionOrder.map((id, i) => [id, i]));
	const curated = new Set(model.curated);
	const sorted = [...model.concernGroups].sort((a, b) => groupRank(a, rankIndex) - groupRank(b, rankIndex));
	const build = (group: ConcernGroup) => buildGroup(group, opts, curated, rowByMarkerId, rowOpen);

	if (opts.viewState.showAll) {
		container.appendChild(buildTier("hlth-tier-wide", sorted, build, WIDE_LANES));
		container.appendChild(buildTier("hlth-tier-medium", sorted, build, MEDIUM_LANES));
		container.appendChild(buildTier("hlth-tier-narrow", sorted, build, NARROW_LANES));
	} else {
		const visibleRows = countVisibleRows(sorted, rowByMarkerId, curated);
		container.appendChild(buildPackedTier("hlth-tier-wide", packLanes(sorted, visibleRows, 3, "vitals"), build));
		container.appendChild(buildPackedTier("hlth-tier-medium", packLanes(sorted, visibleRows, 2, "vitals"), build));
		container.appendChild(buildPackedTier("hlth-tier-narrow", packLanes(sorted, visibleRows, 1, "vitals"), build));
	}

	return container;
}

function buildGroup(group: ConcernGroup, opts: DashboardRenderOptions, curated: Set<string>, rowByMarkerId: Map<string, RowEntry>, rowOpen: RowOpenController): HTMLElement {
	const rows = collectGroupRows(group, rowByMarkerId);
	// Vault scan order is otherwise arbitrary (filesystem/cache enumeration, not alphabetical) --
	// `order:` frontmatter lets a marker note pin its row position; unset markers fall back to
	// alphabetical by name so the layout is still deterministic without it.
	rows.sort((a, b) => rowOrder(a) - rowOrder(b) || a.primary.marker.name.localeCompare(b.primary.marker.name));

	const hiddenCount = rows.filter((row) => !curated.has(row.primary.marker.id)).length;

	const wrap = createDiv();
	wrap.className = "hlth-grp";
	const head = buildGroupHeader(group, hiddenCount, opts.viewState.showAll, opts.concernIcons);
	head.addEventListener("click", () => {
		void Promise.resolve(opts.onOpenConcern(group.concern, labelForConcern(group.concern))).then((opened) => {
			if (!opened) wrap.classList.toggle("hlth-grp-expanded");
		});
	});
	wrap.appendChild(head);

	for (const row of rows) {
		const hidden = !opts.viewState.showAll && !curated.has(row.primary.marker.id);
		const { header, detail } = buildRow(row, hidden, rowOpen, opts);
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

function buildRow(row: RowEntry, hidden: boolean, rowOpen: RowOpenController, opts: DashboardRenderOptions): { header: HTMLElement; detail: HTMLElement } {
	const { primary, secondary } = row;
	const toggled = opts.viewState.unitToggles.has(primary.marker.id);
	// Computed once per row and threaded down -- the row and its detail panel read the same
	// bundle, so they can't drift into showing different units for the same marker.
	const display = toDisplay(primary, toggled);

	const header = createDiv();
	header.className = "hlth-row";
	if (hidden) header.classList.add("hlth-hidden");

	header.appendChild(buildNameCell(primary, display));

	header.appendChild(buildSparkline(primary.series, primary.band, statusColor(primary.status), secondary?.series));

	// Arrow/value/unit each get their own fixed-width grid column so the sparkline, arrow,
	// value, and unit all line up into consistent vertical tracks across every row. Trade-off
	// (explicitly chosen over packing arrow+value together): the visible gap between the arrow
	// and a value's actual digits varies with the value's text length, since the value's box is
	// fixed-width but right-aligned -- e.g. "0.38" sits further from its box's left edge than
	// "453.56" does. Column alignment wins over that variance here.
	header.appendChild(buildArrowCell(primary));
	header.appendChild(buildValueOnlyCell(row, display));
	header.appendChild(
		buildUnitCell(primary.marker, display, (markerId) => {
			if (!opts.viewState.unitToggles.delete(markerId)) opts.viewState.unitToggles.add(markerId);
			opts.onViewStateChange();
		}),
	);

	const detail = createDiv();
	detail.className = "hlth-detail";
	detail.appendChild(buildDetailContent(row, display));

	const markerId = primary.marker.id;
	header.addEventListener("click", () => rowOpen.toggle(markerId));
	header.addEventListener("contextmenu", (evt) => {
		evt.preventDefault();
		const menu = new Menu();
		menu.addItem((item) =>
			item
				.setTitle(primary.marker.curated ? "Un-curate" : "Curate")
				.setIcon("bookmark")
				.onClick(() => opts.onToggleCurated(markerId)),
		);
		// Low/high targets only apply to numeric markers -- a qualitative marker has no band to edit.
		if (primary.marker.type === "numeric") {
			menu.addItem((item) =>
				item
					.setTitle("Edit target…")
					.setIcon("target")
					.onClick(() => opts.onEditTarget(markerId)),
			);
		}
		menu.showAtMouseEvent(evt);
	});
	rowOpen.register(markerId, { header, detail });
	if (secondary) rowOpen.register(secondary.marker.id, { header, detail });

	return { header, detail };
}

function buildNameCell(info: MarkerStatusInfo, display: DisplayReading): HTMLElement {
	const marker = info.marker;
	const cell = createDiv();
	cell.className = "hlth-name";

	const text = createSpan();
	text.className = "hlth-name-text";
	text.textContent = marker.name;
	cell.appendChild(text);

	const targetText = formatTargetText(display.target) || undefined;
	const rangeText = `Normal ${formatRangeText(display.band, marker, display.unit)}${targetText ? ` · ${targetText}` : ""}`;

	// Skip the tooltip when this row is already unfolded -- the detail panel (buildDetailContent)
	// shows the same blurb, so the tooltip on top of it is just duplicated information.
	cell.addEventListener("mouseenter", () => {
		if (cell.closest(".hlth-row")?.classList.contains("hlth-open")) return;
		showTooltip(cell, marker.blurb, rangeText);
	});
	cell.addEventListener("mouseleave", hideTooltip);

	return cell;
}

function buildValueOnlyCell(row: RowEntry, display: DisplayReading): HTMLElement {
	const { primary, secondary } = row;
	const value = createSpan();
	value.className = "hlth-value";
	// Off the actual displayed value's type, not `marker.type` -- a numeric marker can still show a
	// legacy string reading (e.g. `hbsab: Immune`, recorded back when that assay was qualitative-only),
	// which needs the same compact text sizing a genuinely qualitative marker's value gets, not the
	// bigger digit-sized default meant for numbers.
	if (typeof display.value !== "number") value.classList.add("hlth-value-qual");
	value.style.color = primary.status === "good" ? "var(--text-normal)" : statusColor(primary.status);
	value.textContent = formatRowValue(display.value, secondary);
	return value;
}

function buildUnitCell(marker: MarkerNote, display: DisplayReading, onToggle: (markerId: string) => void): HTMLElement {
	const unit = createSpan();
	unit.className = "hlth-unit";
	unit.textContent = display.unit ?? "";

	if (isToggleable(marker)) {
		unit.classList.add("hlth-unit-toggle");
		unit.title = `Click to show in ${display.unit === marker.unit ? marker.altUnit : marker.unit}`;
		unit.addEventListener("click", (evt) => {
			// The row header itself toggles open/closed on click -- stop that from also firing.
			evt.stopPropagation();
			onToggle(marker.id);
		});
	}

	return unit;
}

function buildDetailContent(row: RowEntry, display: DisplayReading): HTMLElement {
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
	now.textContent = formatRowValue(display.value, secondary);
	if (display.unit) {
		const unit = createSpan();
		unit.className = "hlth-unit";
		unit.textContent = ` ${display.unit}`;
		now.appendChild(unit);
	}
	cap.appendChild(now);
	wrap.appendChild(cap);

	if (marker.type === "qualitative") {
		wrap.appendChild(buildQualitativeChips(marker, primary.series));
		return wrap;
	}

	// A single reading still draws the full chart -- band + point position is useful on its own
	// (buildHistoryChart's domain math already handles count === 1 fine), not just a trend line
	// that needs a second visit to exist. computeDashboardModel drops markers with an empty series
	// entirely, so a numeric row reaching here always has at least one point.
	wrap.appendChild(
		buildHistoryChart(display.series, secondary?.series, {
			band: display.band,
			target: display.target,
			targetLabel: formatTargetText(display.target) || undefined,
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
