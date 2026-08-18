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
}

export interface PlanNote {
	person: string;
	year: number;
	body: string;
	path: string;
}
