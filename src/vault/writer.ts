import type { App, TFile } from "obsidian";
import { normalizeConcernKey } from "../core/dashboard";
import { buildVisitFrontmatter } from "../core/entry";
import type { MarkerKind, MarkerNote, PersonSex } from "../core/types";
import { renameConcernInSettings, type HealthPluginSettings } from "../settings";
import { filesUnder, type VaultPaths } from "./reader";

function personVisitsFolder(paths: VaultPaths, person: string): string {
	return `${paths.visitsFolder}/${person}`;
}

async function ensureFolder(app: App, path: string): Promise<void> {
	if (!app.vault.getAbstractFileByPath(path)) await app.vault.createFolder(path);
}

/** Create-or-edit: reuses an already-located file, or creates a fresh one in `folder`. */
async function getOrCreateFile(app: App, folder: string, filename: string, existing: TFile | null): Promise<TFile> {
	if (existing) return existing;
	await ensureFolder(app, folder);
	return app.vault.create(`${folder}/${filename}`, "");
}

/** Sets a frontmatter key, or removes it when the value is falsy/empty (optional fields never write empty). */
function setOrDeleteKey(frontmatter: Record<string, unknown>, key: string, value: string | string[] | undefined): void {
	if (value && value.length > 0) frontmatter[key] = value;
	else delete frontmatter[key];
}

const FRONTMATTER_SYNC_TIMEOUT_MS = 500;

/** Wraps `processFrontMatter` so the returned promise doesn't resolve until `metadataCache` has
 *  actually re-indexed the write -- `processFrontMatter`'s own promise resolving does NOT mean
 *  `getFileCache` reflects it yet (its re-index runs on a separate, unawaited pass), so a caller
 *  that rescans immediately after can read stale data for a beat. Every write in this module goes
 *  through this one seam so no call site has to independently judge whether an immediate rescan is
 *  safe. Falls back to resolving after `timeoutMs` if the "changed" event never fires for this file,
 *  so a missed event degrades to today's (pre-existing) staleness window instead of hanging forever. */
export async function writeFrontmatter(
	app: App,
	file: TFile,
	mutator: (frontmatter: Record<string, unknown>) => void,
	timeoutMs = FRONTMATTER_SYNC_TIMEOUT_MS,
): Promise<void> {
	const indexed = new Promise<void>((resolve) => {
		const timer = setTimeout(() => {
			app.metadataCache.offref(ref);
			resolve();
		}, timeoutMs);
		const ref = app.metadataCache.on("changed", (changedFile) => {
			if (changedFile.path !== file.path) return;
			clearTimeout(timer);
			app.metadataCache.offref(ref);
			resolve();
		});
	});

	await app.fileManager.processFrontMatter(file, mutator);
	await indexed;
}

/** Locates the visit note file for person+date, if one already exists (create-or-edit by date). */
export function findVisitFile(app: App, paths: VaultPaths, person: string, date: string): TFile | null {
	for (const file of filesUnder(app, personVisitsFolder(paths, person))) {
		const fm = app.metadataCache.getFileCache(file)?.frontmatter;
		if (fm?.type === "lab-visit" && fm.person === person && fm.date === date) return file;
	}
	return null;
}

/** Writes (creates or overwrites) a visit note's frontmatter values via Obsidian's own YAML writer. */
export async function saveVisitNote(app: App, paths: VaultPaths, person: string, date: string, values: Record<string, number | string>): Promise<void> {
	const target = buildVisitFrontmatter(person, date, values);
	const file = await getOrCreateFile(app, personVisitsFolder(paths, person), `${date}.md`, findVisitFile(app, paths, person, date));

	await writeFrontmatter(app, file, (frontmatter) => {
		for (const key of Object.keys(frontmatter)) delete frontmatter[key];
		Object.assign(frontmatter, target);
	});
}

export interface NewMarkerInput {
	id: string;
	name: string;
	type: MarkerKind;
	unit?: string;
	panel: string;
	concern: string[];
	curated: boolean;
}

/** Creates a new marker note inline from the entry modal's add-marker mini-form. */
export async function saveNewMarkerNote(app: App, paths: VaultPaths, input: NewMarkerInput): Promise<void> {
	await ensureFolder(app, paths.markersFolder);
	const file = await app.vault.create(`${paths.markersFolder}/${input.id}.md`, "");

	await writeFrontmatter(app, file, (frontmatter) => {
		frontmatter.name = input.name;
		frontmatter.type = input.type;
		if (input.unit) frontmatter.unit = input.unit;
		frontmatter.panel = input.panel;
		frontmatter.concern = input.concern;
		frontmatter.curated = input.curated;
	});
}

/** Locates the marker note file for an id (file basename = marker id), if one already exists. */
export function findMarkerFile(app: App, paths: VaultPaths, id: string): TFile | null {
	const target = app.vault.getAbstractFileByPath(`${paths.markersFolder}/${id}.md`);
	return target && "extension" in target ? (target as TFile) : null;
}

/** Sets a marker note's `order:` frontmatter -- used by the settings tab's drag-to-reorder list. */
export async function saveMarkerOrder(app: App, paths: VaultPaths, id: string, order: number): Promise<void> {
	const file = findMarkerFile(app, paths, id);
	if (!file) return;
	await writeFrontmatter(app, file, (frontmatter) => {
		frontmatter.order = order;
	});
}

/** Renames a concern id across every marker note that references it in its `concern:` array, and
 *  the settings-side pointers that key off it (Base overrides, icon override) -- one call for both
 *  halves so a future caller can't rewrite the notes and forget the settings, or vice versa. The id
 *  is the single source of truth for the dashboard column header, so the note side is a real
 *  rewrite, not a display-only overlay. De-dupes if `newConcern` is already one of the entries. */
/** `oldConcern` is a normalized identity key (see core/dashboard.ts's normalizeConcernKey); matching
 *  case-insensitively against raw frontmatter means a rename also self-heals any casing drift across
 *  markers that share the same concern identity but were authored with different casing. */
export async function renameConcern(app: App, settings: HealthPluginSettings, markers: MarkerNote[], oldConcern: string, newConcern: string): Promise<void> {
	await Promise.all(
		markers
			.filter((marker) => marker.concern.some((c) => normalizeConcernKey(c) === oldConcern))
			.map((marker) => findMarkerFile(app, settings, marker.id))
			.filter((file): file is TFile => file !== null)
			.map((file) =>
				writeFrontmatter(app, file, (frontmatter) => {
					const concern = Array.isArray(frontmatter.concern) ? (frontmatter.concern as string[]) : [];
					frontmatter.concern = [...new Set(concern.map((c) => (normalizeConcernKey(c) === oldConcern ? newConcern : c)))];
				}),
			),
	);
	renameConcernInSettings(settings, oldConcern, newConcern);
}

export interface ProfileInput {
	sex: PersonSex;
	dob?: string;
	bloodType?: string;
	allergies?: string[];
}

/** Locates the profile note file for a person (file basename = person id), if one already exists. */
export function findProfileFile(app: App, paths: VaultPaths, person: string): TFile | null {
	const target = app.vault.getAbstractFileByPath(`${paths.profilesFolder}/${person}.md`);
	return target && "extension" in target ? (target as TFile) : null;
}

/** Writes (creates or overwrites) a profile note's frontmatter, filename = person id (create-or-edit). */
export async function saveProfileNote(app: App, paths: VaultPaths, person: string, input: ProfileInput): Promise<void> {
	const file = await getOrCreateFile(app, paths.profilesFolder, `${person}.md`, findProfileFile(app, paths, person));

	await writeFrontmatter(app, file, (frontmatter) => {
		frontmatter.sex = input.sex;
		setOrDeleteKey(frontmatter, "dob", input.dob);
		setOrDeleteKey(frontmatter, "blood_type", input.bloodType);
		setOrDeleteKey(frontmatter, "allergies", input.allergies);
	});
}

/** Sets a profile note's `order:` frontmatter -- used by the settings tab's drag-to-reorder list. */
export async function saveProfileOrder(app: App, paths: VaultPaths, person: string, order: number): Promise<void> {
	const file = findProfileFile(app, paths, person);
	if (!file) return;
	await writeFrontmatter(app, file, (frontmatter) => {
		frontmatter.order = order;
	});
}

/** Renames a profile id: the profile note file, its labs subfolder, the `person:` field on every
 *  visit/plan note that references it, and `settings.defaultProfile` if it pointed at the old name
 *  -- one call for all of it so a future caller can't rename the vault side and leave the default
 *  profile pointer stale. Uses `renameFile` (not raw `vault.rename`) so any wikilinks pointing at
 *  the profile note or a visit note get fixed up too. Throws if `newPerson` would collide with an
 *  existing profile note or labs folder. */
export async function renameProfile(app: App, settings: HealthPluginSettings, oldPerson: string, newPerson: string): Promise<void> {
	if (findProfileFile(app, settings, newPerson) || app.vault.getAbstractFileByPath(personVisitsFolder(settings, newPerson))) {
		throw new Error(`"${newPerson}" already exists.`);
	}

	const profileFile = findProfileFile(app, settings, oldPerson);
	if (profileFile) await app.fileManager.renameFile(profileFile, `${settings.profilesFolder}/${newPerson}.md`);

	const labsFolder = app.vault.getAbstractFileByPath(personVisitsFolder(settings, oldPerson));
	if (labsFolder) await app.fileManager.renameFile(labsFolder, personVisitsFolder(settings, newPerson));

	await Promise.all(
		filesUnder(app, personVisitsFolder(settings, newPerson))
			.filter((file) => app.metadataCache.getFileCache(file)?.frontmatter?.person === oldPerson)
			.map((file) => writeFrontmatter(app, file, (frontmatter) => (frontmatter.person = newPerson))),
	);

	await Promise.all(
		filesUnder(app, settings.plansFolder)
			.filter((file) => app.metadataCache.getFileCache(file)?.frontmatter?.person === oldPerson)
			.map((file) => writeFrontmatter(app, file, (frontmatter) => (frontmatter.person = newPerson))),
	);

	if (settings.defaultProfile === oldPerson) settings.defaultProfile = newPerson;
}
