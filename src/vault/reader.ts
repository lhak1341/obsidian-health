import type { App, TFile } from "obsidian";
import type {
	CandidateStatus,
	Direction,
	MarkerKind,
	MarkerNote,
	MarkerRange,
	PersonSex,
	PlanNote,
	Priority,
	ProfileNote,
	RangeSex,
	VisitNote,
} from "../core/types";

export interface VaultPaths {
	markersFolder: string;
	profilesFolder: string;
	plansFolder: string;
	visitsFolder: string;
	basesFolder: string;
}

export const DEFAULT_VAULT_PATHS: VaultPaths = {
	markersFolder: "09 about-me/markers",
	profilesFolder: "09 about-me/profiles",
	plansFolder: "09 about-me/health/plans",
	visitsFolder: "09 about-me/health/labs",
	basesFolder: "09 about-me/health/bases",
};

export interface VaultSnapshot {
	markers: MarkerNote[];
	visits: VisitNote[];
	profiles: ProfileNote[];
	plans: PlanNote[];
}

export async function scanVault(app: App, paths: VaultPaths = DEFAULT_VAULT_PATHS): Promise<VaultSnapshot> {
	const [markers, visits, profiles, plans] = await Promise.all([
		collect(app, paths.markersFolder, async (file, fm) =>
			parseMarkerNote(file.basename, fm, stripFrontmatter(await app.vault.cachedRead(file))),
		),
		collect(app, paths.visitsFolder, (_file, fm) => parseVisitNote(fm)),
		collect(app, paths.profilesFolder, (file, fm) => parseProfileNote(file.basename, fm)),
		collect(app, paths.plansFolder, async (file, fm) =>
			parsePlanNote(fm, stripFrontmatter(await app.vault.cachedRead(file)), file.path),
		),
	]);

	return { markers, visits, profiles, plans };
}

async function collect<T>(
	app: App,
	folder: string,
	parse: (file: TFile, frontmatter: Record<string, unknown>) => T | null | Promise<T | null>,
): Promise<T[]> {
	const results: T[] = [];
	for (const file of filesUnder(app, folder)) {
		const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
		if (!frontmatter) continue;
		const parsed = await parse(file, frontmatter);
		if (parsed) results.push(parsed);
	}
	return results;
}

export function filesUnder(app: App, folder: string): TFile[] {
	const prefix = folder.endsWith("/") ? folder : `${folder}/`;
	return app.vault.getMarkdownFiles().filter((file) => file.path === folder || file.path.startsWith(prefix));
}

function stripFrontmatter(content: string): string {
	return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
}

const MARKER_KINDS: MarkerKind[] = ["numeric", "qualitative", "derived"];
const DIRECTIONS: Direction[] = ["lower_better", "higher_better", "within"];
const PRIORITIES: Priority[] = ["essential", "lifestyle", "secondary"];
const RANGE_SEXES: RangeSex[] = ["m", "f", "any"];

function parseMarkerNote(id: string, fm: Record<string, unknown>, blurb: string): MarkerNote | null {
	if (typeof fm.name !== "string") return null;
	if (typeof fm.type !== "string" || !MARKER_KINDS.includes(fm.type as MarkerKind)) return null;

	return {
		id,
		name: fm.name,
		aliases: asStringArray(fm.aliases),
		type: fm.type as MarkerKind,
		unit: asOptionalString(fm.unit),
		altUnit: asOptionalString(fm.alt_unit),
		altFactor: asOptionalNumber(fm.alt_factor),
		panel: typeof fm.panel === "string" ? fm.panel : "",
		concern: asStringArray(fm.concern),
		ranges: parseRanges(fm.ranges),
		normal: parseNormal(fm.normal),
		optimalLow: asOptionalNumber(fm.optimal_low),
		optimalHigh: asOptionalNumber(fm.optimal_high),
		direction: DIRECTIONS.includes(fm.direction as Direction) ? (fm.direction as Direction) : undefined,
		curated: fm.curated === true,
		formula: asOptionalString(fm.formula),
		pair: asOptionalString(fm.pair),
		order: asOptionalNumber(fm.order),
		status: fm.status === "candidate" ? (fm.status as CandidateStatus) : undefined,
		cost: asOptionalNumber(fm.cost),
		priority: PRIORITIES.includes(fm.priority as Priority) ? (fm.priority as Priority) : undefined,
		sourceUrl: asOptionalString(fm.source_url),
		yearPlanned: asOptionalNumber(fm.year_planned),
		blurb,
	};
}

function parseVisitNote(fm: Record<string, unknown>): VisitNote | null {
	if (fm.type !== "lab-visit") return null;
	if (typeof fm.person !== "string") return null;
	if (typeof fm.date !== "string") return null;

	const values: Record<string, number | string> = {};
	for (const [key, value] of Object.entries(fm)) {
		if (key === "type" || key === "person" || key === "date") continue;
		if (typeof value === "number" || typeof value === "string") {
			values[key] = value;
		}
	}

	return { person: fm.person, date: fm.date, values };
}

function parseProfileNote(person: string, fm: Record<string, unknown>): ProfileNote | null {
	if (fm.sex !== "m" && fm.sex !== "f") return null;

	return {
		person,
		sex: fm.sex as PersonSex,
		dob: asOptionalString(fm.dob),
		bloodType: asOptionalString(fm.blood_type),
		allergies: fm.allergies === undefined ? undefined : asStringArray(fm.allergies),
	};
}

function parsePlanNote(fm: Record<string, unknown>, body: string, path: string): PlanNote | null {
	if (typeof fm.person !== "string") return null;
	if (typeof fm.year !== "number") return null;

	return { person: fm.person, year: fm.year, body, path };
}

function parseRanges(raw: unknown): MarkerRange[] | undefined {
	if (!Array.isArray(raw)) return undefined;

	const ranges: MarkerRange[] = [];
	for (const entry of raw) {
		if (typeof entry !== "object" || entry === null) continue;
		const record = entry as Record<string, unknown>;
		if (!RANGE_SEXES.includes(record.sex as RangeSex)) continue;

		ranges.push({
			sex: record.sex as RangeSex,
			age: parseAgeBand(record.age),
			low: asOptionalNumber(record.low),
			high: asOptionalNumber(record.high),
		});
	}
	return ranges;
}

function parseAgeBand(raw: unknown): [number, number] | undefined {
	if (!Array.isArray(raw) || raw.length !== 2) return undefined;
	const [low, high] = raw;
	if (typeof low !== "number" || typeof high !== "number") return undefined;
	return [low, high];
}

function parseNormal(raw: unknown): string | string[] | undefined {
	if (typeof raw === "string") return raw;
	if (Array.isArray(raw)) return raw.map(String);
	return undefined;
}

function asStringArray(raw: unknown): string[] {
	return Array.isArray(raw) ? raw.map(String) : [];
}

function asOptionalString(raw: unknown): string | undefined {
	return typeof raw === "string" ? raw : undefined;
}

function asOptionalNumber(raw: unknown): number | undefined {
	return typeof raw === "number" ? raw : undefined;
}
