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

export interface ConcernGroup {
	/** Normalized identity key (dashboard.ts's normalizeConcernKey), not raw frontmatter text --
	 *  render/concern-registry.ts's labelForConcern resolves this to display text. */
	concern: string;
	status: Status;
	markers: MarkerStatusInfo[];
}

export interface DashboardModel {
	markers: MarkerStatusInfo[];
	attentionOrder: string[];
	concernGroups: ConcernGroup[];
	curated: string[];
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
