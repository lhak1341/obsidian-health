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
	series: SeriesPoint[];
	latest?: SeriesPoint;
	arrow?: Arrow;
}

export interface ConcernGroup {
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
