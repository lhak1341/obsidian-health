import type { MarkerNote } from "./types";

export type Status = "high" | "low" | "watch" | "good";
export type ArrowDirection = "up" | "down" | "flat";
export type ArrowTone = "good" | "bad" | "neutral";

export interface Arrow {
	direction: ArrowDirection;
	tone: ArrowTone;
}

export interface SeriesPoint {
	date: string;
	value: number | string;
}

export interface ResolvedRange {
	low?: number;
	high?: number;
}

export interface MarkerStatusInfo {
	marker: MarkerNote;
	status: Status;
	band: ResolvedRange;
	/** Effective personal target (profile override, else the marker's global optimal fields) --
	 *  see `resolveTarget` in dashboard.ts. */
	target: ResolvedRange;
	series: SeriesPoint[];
	latest?: SeriesPoint;
	arrow?: Arrow;
}

/** One dashboard row: a lone marker, or a BP-style pair (primary + secondary) shown together. */
export interface DashboardRow {
	primary: MarkerStatusInfo;
	secondary?: MarkerStatusInfo;
	/** Worst status across both members -- a pair is as flagged as its worst twin. */
	status: Status;
	/** Shown by default in Curated view: the primary's `curated:` flag (it is the pair's flag, the
	 *  secondary's is ignored) or either member being flagged -- flagged rows are always visible. */
	curated: boolean;
}

export interface ConcernGroup {
	/** Normalized identity key (concern.ts's normalizeConcernKey), not raw frontmatter text --
	 *  concern-registry.ts's labelForConcern resolves this to display text. */
	concern: string;
	status: Status;
	markers: MarkerStatusInfo[];
	/** Paired and deduped, ordered by `order:` frontmatter then name (unset `order:` sorts last). */
	rows: DashboardRow[];
}

export interface DashboardModel {
	markers: MarkerStatusInfo[];
	/** Marker ids, worst first. Per marker, unpaired -- the Bases view ranks its rows with it. */
	attentionOrder: string[];
	concernGroups: ConcernGroup[];
	/** Flagged rows (status !== "good"), paired and deduped, in attention order. */
	flagged: DashboardRow[];
}

export interface DashboardSettings {
	deadbandPct: number;
}

/** A marker's latest value, unit, series, band, and target resolved into one display unit
 *  (canonical or alt) -- see `toDisplay` in dashboard.ts. Non-numeric fields (qualitative
 *  readings, a marker with no target) pass through as `undefined`/unchanged rather than
 *  converting. */
export interface DisplayReading {
	value: number | string | undefined;
	unit: string | undefined;
	series: SeriesPoint[];
	band: ResolvedRange;
	target: ResolvedRange;
}
