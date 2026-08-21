export type PersonSex = "m" | "f";
export type RangeSex = PersonSex | "any";
export type MarkerKind = "numeric" | "qualitative" | "derived";
export type Direction = "lower_better" | "higher_better" | "within";
export type Priority = "essential" | "lifestyle" | "secondary";
export type CandidateStatus = "candidate";

export interface MarkerRange {
	sex: RangeSex;
	age?: [number, number];
	low?: number;
	high?: number;
}

export interface MarkerNote {
	id: string;
	name: string;
	aliases: string[];
	type: MarkerKind;
	unit?: string;
	altUnit?: string;
	altFactor?: number;
	panel: string;
	/** Restricts this marker to one sex (e.g. a gynecological marker) -- unset means it applies to
	 *  everyone. Separate from `ranges[].sex`, which picks a reference band for a marker every
	 *  profile still sees; this decides whether the marker is shown at all. */
	sex?: PersonSex;
	concern: string[];
	ranges?: MarkerRange[];
	normal?: string | string[];
	optimalLow?: number;
	optimalHigh?: number;
	direction?: Direction;
	curated: boolean;
	formula?: string;
	pair?: string;
	order?: number;
	/** Column position within its concern's generated Base view (`core/base-views.ts`) --
	 *  deliberately separate from `order`, which drives dashboard curated-row and visit-editor field
	 *  order. The two diverge in practice: `order` reflects attention/curation priority, while a
	 *  lab-report-style Base table wants the physical report's column sequence. Unset markers sort
	 *  alphabetically by id after every marker that has one. */
	baseOrder?: number;
	status?: CandidateStatus;
	cost?: number;
	priority?: Priority;
	sourceUrl?: string;
	yearPlanned?: number;
	blurb: string;
}

export interface VisitNote {
	person: string;
	date: string;
	values: Record<string, number | string>;
	/** Marker id -> unit originally reported for that value, only present when it differs from the
	 *  marker's canonical `unit` (e.g. a lab reporting Uric Acid in mg/dL for a µmol/L-canonical marker). */
	units?: Record<string, string>;
	facility?: string;
}

export interface ProfileNote {
	person: string;
	sex: PersonSex;
	dob?: string;
	bloodType?: string;
	allergies?: string[];
	order?: number;
	/** Per-marker personal target override, keyed by marker id. A whole-pair replacement of the
	 *  marker's global `optimalLow`/`optimalHigh` -- setting only one bound leaves the other absent
	 *  for this profile rather than inheriting the marker's global value for the missing side.
	 *  Absent entry falls back to the marker's global optimal fields. */
	targets?: Record<string, { low?: number; high?: number }>;
}

export interface PlanNote {
	person: string;
	year: number;
	body: string;
	path: string;
}
