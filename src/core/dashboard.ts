import type { MarkerNote, MarkerRange, ProfileNote, VisitNote } from "./types";
import type {
	Arrow,
	ArrowDirection,
	ConcernGroup,
	DashboardModel,
	DashboardSettings,
	DisplayReading,
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
		if (marker.sex && marker.sex !== profile.sex) continue;
		const series = buildSeries(marker, sortedVisits);
		if (series.length === 0) continue;

		const latest = series[series.length - 1];
		const band = marker.type === "numeric" ? resolve(marker, profile, latest.date) : {};
		const target = marker.type === "numeric" ? resolveTarget(marker, profile) : {};
		const { status, excess } = deriveStatus(marker, band, target, latest);
		const arrow = deriveArrow(marker, series, settings);

		const info: MarkerStatusInfo = { marker, status, band, target, series, latest, arrow };
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

/** Resolves which profile a stateless view should default to: `settings.defaultProfile` if it
 *  still matches a real profile, else the first one, else `undefined` when there are none. Every
 *  caller here is stateless (recomputed fresh each time) -- a caller that needs to remember a
 *  user's in-session pick across repaints (`HealthView`) layers that on top of this, it doesn't
 *  belong in this function. Guards against a stale `defaultProfile` (pointing at a renamed/deleted
 *  person) explicitly: a naive `defaultProfile ?? profiles[0]` would keep the stale id forever
 *  instead of falling back, since `??` only substitutes on `null`/`undefined`, not on "doesn't
 *  match anything". */
export function resolveDefaultProfile(profiles: ProfileNote[], defaultPerson: string | undefined): ProfileNote | undefined {
	return (defaultPerson && profiles.find((p) => p.person === defaultPerson)) || profiles[0];
}

/** Composes a concern header's already-resolved Base view name (label, or a `concernViewOverrides`
 *  entry) with the active profile, so a concern click opens a per-profile view instead of the
 *  single shared one. */
export function concernViewNameForProfile(viewName: string, person: string): string {
	return `${viewName} — ${person}`;
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

/** Keeps a legacy string reading on an otherwise-numeric marker (e.g. `hbsab: Immune` recorded
 *  back when that assay was only ever reported qualitatively) instead of dropping it -- every
 *  numeric-only consumer downstream (deriveArrow, buildHistoryChart's numericPoints, deriveStatus's
 *  `typeof latest.value !== "number"` guard) already filters/degrades safely on a mixed series, so
 *  dropping it here only cost the row its visibility: `series.length === 0` skips the marker
 *  entirely below, so a marker whose *only* history is a legacy string value vanished from the
 *  dashboard outright instead of just not plotting on the trend line. */
function buildSeries(marker: MarkerNote, visits: VisitNote[]): SeriesPoint[] {
	const points: SeriesPoint[] = [];
	for (const visit of visits) {
		const raw = visit.values[marker.id];
		if (raw === undefined) continue;
		const value = typeof raw === "number" ? toCanonicalReading(raw, visit.units?.[marker.id], marker) : raw;
		points.push({ date: visit.date, value });
	}
	return points;
}

/** Normalizes a visit's raw reported number into the marker's canonical unit -- every downstream
 *  consumer (band checks, status, trend arrow, sparkline/chart) works off canonical values, so this
 *  is the single seam that converts. A visit's `units[id]` records the unit it was actually entered
 *  in; absent means it's already canonical. Falls back to the raw number on an unrecognized unit
 *  (stale/hand-edited frontmatter) rather than dropping the reading entirely. */
function toCanonicalReading(raw: number, unit: string | undefined, marker: MarkerNote): number {
	if (!unit || unit === marker.unit) return raw;
	try {
		return convert(raw, unit, marker);
	} catch {
		return raw;
	}
}

function deriveStatus(
	marker: MarkerNote,
	band: ResolvedRange,
	target: ResolvedRange,
	latest: SeriesPoint,
): { status: Status; excess: number } {
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
	if (target.high !== undefined && value > target.high) {
		return { status: "watch", excess: (value - target.high) / width };
	}
	if (target.low !== undefined && value < target.low) {
		return { status: "watch", excess: (target.low - value) / width };
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

/** Resolves a marker's effective personal target for a profile: the profile's `targets`
 *  override if one exists for this marker (whole-pair replacement of the marker's global
 *  optimal fields -- a partial override does not inherit the missing side from the global
 *  value), else the marker's global `optimalLow`/`optimalHigh`. */
export function resolveTarget(marker: MarkerNote, profile: ProfileNote): ResolvedRange {
	const override = profile.targets?.[marker.id];
	if (override) return { low: override.low, high: override.high };
	return { low: marker.optimalLow, high: marker.optimalHigh };
}

function rangeScore(range: MarkerRange, sex: ProfileNote["sex"]): number {
	return (range.sex === sex ? 2 : 0) + (range.age ? 1 : 0);
}

export function convert(value: number, fromUnit: string, marker: MarkerNote): number {
	if (fromUnit === marker.unit) return value;
	if (fromUnit === marker.altUnit && marker.altFactor !== undefined) return value * marker.altFactor;
	throw new Error(`Marker "${marker.id}" has no known unit "${fromUnit}"`);
}

/** Inverse of `convert`: canonical-unit value -> `toUnit` (the marker's unit or altUnit). */
export function convertTo(value: number, toUnit: string, marker: MarkerNote): number {
	if (toUnit === marker.unit) return value;
	if (toUnit === marker.altUnit && marker.altFactor !== undefined) return value / marker.altFactor;
	throw new Error(`Marker "${marker.id}" has no known unit "${toUnit}"`);
}

/** Whether `marker` has a defined alt unit to toggle into (Uric Acid mg/dL <-> µmol/L, etc). */
export function isToggleable(marker: MarkerNote): boolean {
	return marker.altUnit !== undefined && marker.altFactor !== undefined;
}

/** Bundles a marker's latest value, unit, series, band, and target into whichever unit is
 *  currently selected (canonical, or alt when `toggled` and `isToggleable`) -- the single place
 *  that decides which fields convert, so a row and its detail panel can never show one converted
 *  and the other not. Guards per-field like the values it replaced: a qualitative reading or a
 *  missing point passes through unchanged rather than converting. */
export function toDisplay(info: MarkerStatusInfo, toggled: boolean): DisplayReading {
	const marker = info.marker;
	const canConvert = toggled && isToggleable(marker);
	const altUnit = marker.altUnit!;

	const latestValue = info.latest?.value;
	const value = canConvert && typeof latestValue === "number" ? convertTo(latestValue, altUnit, marker) : latestValue;

	const series = !canConvert
		? info.series
		: info.series.map((point) => (typeof point.value === "number" ? { ...point, value: convertTo(point.value, altUnit, marker) } : point));

	const band = !canConvert
		? info.band
		: {
				low: info.band.low !== undefined ? convertTo(info.band.low, altUnit, marker) : undefined,
				high: info.band.high !== undefined ? convertTo(info.band.high, altUnit, marker) : undefined,
			};

	const target = !canConvert
		? info.target
		: {
				low: info.target.low !== undefined ? convertTo(info.target.low, altUnit, marker) : undefined,
				high: info.target.high !== undefined ? convertTo(info.target.high, altUnit, marker) : undefined,
			};

	return { value, unit: canConvert ? altUnit : marker.unit, series, band, target };
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
