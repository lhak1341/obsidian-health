import type { MarkerNote, MarkerRange, ProfileNote, VisitNote } from "./types";
import type {
	Arrow,
	ArrowDirection,
	ConcernGroup,
	DashboardModel,
	DashboardSettings,
	MarkerStatusInfo,
	ResolvedRange,
	SeriesPoint,
	Status,
} from "./model";

export function computeDashboardModel(
	markers: MarkerNote[],
	visits: VisitNote[],
	profile: ProfileNote,
	settings: DashboardSettings,
): DashboardModel {
	const sortedVisits = visits.filter((v) => v.person === profile.person).sort((a, b) => a.date.localeCompare(b.date));

	const markerInfos: MarkerStatusInfo[] = [];
	// attentionOrder's sort needs each marker's out-of-range magnitude as a tie-breaker below
	// statusTier; deriveStatus already computes it alongside status, so it's captured here by
	// object identity instead of re-deriving it a second time per marker during the sort.
	const magnitudeByInfo = new Map<MarkerStatusInfo, number>();
	for (const marker of markers) {
		const series = buildSeries(marker, sortedVisits);
		if (series.length === 0) continue;

		const latest = series[series.length - 1];
		const band = marker.type === "numeric" ? resolve(marker, profile, latest.date) : {};
		const { status, excess } = deriveStatus(marker, band, latest);
		const arrow = deriveArrow(marker, series, settings);

		const info: MarkerStatusInfo = { marker, status, band, series, latest, arrow };
		markerInfos.push(info);
		magnitudeByInfo.set(info, marker.type === "qualitative" ? (status === "good" ? 0 : Number.POSITIVE_INFINITY) : excess);
	}

	const attentionOrder = [...markerInfos]
		.sort(
			(a, b) =>
				statusTier(a.status) - statusTier(b.status) ||
				magnitudeByInfo.get(b)! - magnitudeByInfo.get(a)! ||
				trendWeight(b) - trendWeight(a),
		)
		.map((info) => info.marker.id);

	const concernGroups = buildConcernGroups(markerInfos);

	// Flagged markers are always visible regardless of the curated flag -- "curated"
	// only decides which *additional*, otherwise-good markers show by default.
	const curated = markerInfos.filter((info) => info.marker.curated || info.status !== "good").map((info) => info.marker.id);

	return {
		markers: markerInfos,
		attentionOrder,
		concernGroups,
		curated,
	};
}

/** Folds a raw frontmatter concern string to its identity key -- the single definition of "same
 *  concern" regardless of authored casing/whitespace. Display text is a presentation concern
 *  (render/concern-registry.ts's labelForConcern), kept separate so this stays Obsidian-free. */
export function normalizeConcernKey(raw: string): string {
	return raw.trim().toLowerCase();
}

/** Groups items by every concern id they carry (multi-membership: an item with 2 concerns lands
 *  in 2 groups) -- shared by the domain core's concern grouping and the settings tab's row-order UI. */
export function groupByConcern<T>(items: T[], getConcern: (item: T) => string[]): Map<string, T[]> {
	const byConcern = new Map<string, T[]>();
	for (const item of items) {
		for (const concern of getConcern(item)) {
			const group = byConcern.get(concern) ?? [];
			group.push(item);
			byConcern.set(concern, group);
		}
	}
	return byConcern;
}

function buildConcernGroups(markerInfos: MarkerStatusInfo[]): ConcernGroup[] {
	const byConcern = groupByConcern(markerInfos, (info) => info.marker.concern.map(normalizeConcernKey));

	return [...byConcern.entries()].map(([concern, members]) => ({
		concern,
		status: members.reduce<Status>(
			(worst, member) => (statusTier(member.status) < statusTier(worst) ? member.status : worst),
			"good",
		),
		markers: members,
	}));
}

function trendWeight(info: MarkerStatusInfo): number {
	return info.arrow?.tone === "bad" ? 1 : 0;
}

function statusTier(status: Status): number {
	switch (status) {
		case "high":
			return 0;
		case "low":
			return 1;
		case "watch":
			return 2;
		case "good":
			return 3;
	}
}

function buildSeries(marker: MarkerNote, visits: VisitNote[]): SeriesPoint[] {
	const points: SeriesPoint[] = [];
	for (const visit of visits) {
		const value = visit.values[marker.id];
		if (value === undefined) continue;
		if (marker.type === "numeric" && typeof value !== "number") continue;
		points.push({ date: visit.date, value });
	}
	return points;
}

function deriveStatus(marker: MarkerNote, band: ResolvedRange, latest: SeriesPoint): { status: Status; excess: number } {
	if (marker.type === "qualitative") {
		const normal = marker.normal === undefined ? [] : ([] as string[]).concat(marker.normal);
		const status: Status = normal.includes(String(latest.value)) ? "good" : "high";
		return { status, excess: 0 };
	}

	if (marker.type !== "numeric" || typeof latest.value !== "number") return { status: "good", excess: 0 };

	const value = latest.value;
	const width = band.high !== undefined && band.low !== undefined ? band.high - band.low || 1 : 1;

	if (band.low !== undefined && value < band.low) return { status: "low", excess: (band.low - value) / width };
	if (band.high !== undefined && value > band.high) return { status: "high", excess: (value - band.high) / width };
	if (marker.optimalHigh !== undefined && value > marker.optimalHigh) {
		return { status: "watch", excess: (value - marker.optimalHigh) / width };
	}
	if (marker.optimalLow !== undefined && value < marker.optimalLow) {
		return { status: "watch", excess: (marker.optimalLow - value) / width };
	}
	return { status: "good", excess: 0 };
}

export function resolve(marker: MarkerNote, profile: ProfileNote, atDate: string): ResolvedRange {
	const age = ageAt(profile.dob, atDate);

	const candidates = (marker.ranges ?? []).filter((range) => {
		if (range.sex !== "any" && range.sex !== profile.sex) return false;
		if (range.age && (age === undefined || age < range.age[0] || age > range.age[1])) return false;
		return true;
	});

	const best = candidates.reduce<MarkerRange | undefined>((current, candidate) => {
		if (!current) return candidate;
		return rangeScore(candidate, profile.sex) > rangeScore(current, profile.sex) ? candidate : current;
	}, undefined);

	if (!best) return {};
	return { low: best.low, high: best.high };
}

function rangeScore(range: MarkerRange, sex: ProfileNote["sex"]): number {
	return (range.sex === sex ? 2 : 0) + (range.age ? 1 : 0);
}

export function convert(value: number, fromUnit: string, marker: MarkerNote): number {
	if (fromUnit === marker.unit) return value;
	if (fromUnit === marker.altUnit && marker.altFactor !== undefined) return value * marker.altFactor;
	throw new Error(`Marker "${marker.id}" has no known unit "${fromUnit}"`);
}

export function isSoftWarn(value: number, band: ResolvedRange): boolean {
	if (band.high !== undefined && value > band.high * 5) return true;
	if (band.low !== undefined && band.low > 0 && value < band.low / 5) return true;
	return false;
}

function deriveArrow(marker: MarkerNote, series: SeriesPoint[], settings: DashboardSettings): Arrow | undefined {
	if (marker.type !== "numeric") return undefined;

	const numeric = series.filter((point): point is { date: string; value: number } => typeof point.value === "number");
	if (numeric.length < 2) return undefined;

	const prior = numeric[numeric.length - 2].value;
	const latest = numeric[numeric.length - 1].value;

	const pctChange = prior === 0 ? (latest === 0 ? 0 : Infinity) : Math.abs(latest - prior) / Math.abs(prior);
	const direction: ArrowDirection = pctChange <= settings.deadbandPct ? "flat" : latest > prior ? "up" : "down";

	return { direction, tone: arrowTone(direction, marker.direction) };
}

function arrowTone(direction: ArrowDirection, markerDirection: MarkerNote["direction"]): Arrow["tone"] {
	if (direction === "flat" || markerDirection === undefined || markerDirection === "within") return "neutral";
	const goingUp = direction === "up";
	const better = markerDirection === "higher_better" ? goingUp : !goingUp;
	return better ? "good" : "bad";
}

function ageAt(dob: string | undefined, atDate: string): number | undefined {
	if (!dob) return undefined;
	const birth = new Date(dob);
	const at = new Date(atDate);
	let age = at.getFullYear() - birth.getFullYear();
	const hasHadBirthdayThisYear =
		at.getMonth() > birth.getMonth() || (at.getMonth() === birth.getMonth() && at.getDate() >= birth.getDate());
	if (!hasHadBirthdayThisYear) age -= 1;
	return age;
}
