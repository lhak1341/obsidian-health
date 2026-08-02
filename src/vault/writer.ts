import type { App, TFile } from "obsidian";
import { buildVisitFrontmatter } from "../core/entry";
import type { MarkerKind, MarkerNote, PersonSex } from "../core/types";
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

	await app.fileManager.processFrontMatter(file, (frontmatter) => {
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

	await app.fileManager.processFrontMatter(file, (frontmatter) => {
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
	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter.order = order;
	});
}

/** Renames a concern id across every marker note that references it in its `concern:` array --
 *  the id is the single source of truth for the dashboard column header, so this is a real
 *  rewrite, not a display-only overlay. De-dupes if `newConcern` is already one of the entries. */
export async function renameConcern(app: App, paths: VaultPaths, markers: MarkerNote[], oldConcern: string, newConcern: string): Promise<void> {
	for (const marker of markers) {
		if (!marker.concern.includes(oldConcern)) continue;
		const file = findMarkerFile(app, paths, marker.id);
		if (!file) continue;
		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			const concern = Array.isArray(frontmatter.concern) ? (frontmatter.concern as string[]) : [];
			frontmatter.concern = [...new Set(concern.map((c) => (c === oldConcern ? newConcern : c)))];
		});
	}
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

	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter.sex = input.sex;
		setOrDeleteKey(frontmatter, "dob", input.dob);
		setOrDeleteKey(frontmatter, "blood_type", input.bloodType);
		setOrDeleteKey(frontmatter, "allergies", input.allergies);
	});
}

/** Renames a profile id: the profile note file, its labs subfolder, and the `person:` field on
 *  every visit/plan note that references it. Uses `renameFile` (not raw `vault.rename`) so any
 *  wikilinks pointing at the profile note or a visit note get fixed up too. Throws if `newPerson`
 *  would collide with an existing profile note or labs folder. */
export async function renameProfile(app: App, paths: VaultPaths, oldPerson: string, newPerson: string): Promise<void> {
	if (findProfileFile(app, paths, newPerson) || app.vault.getAbstractFileByPath(personVisitsFolder(paths, newPerson))) {
		throw new Error(`"${newPerson}" already exists.`);
	}

	const profileFile = findProfileFile(app, paths, oldPerson);
	if (profileFile) await app.fileManager.renameFile(profileFile, `${paths.profilesFolder}/${newPerson}.md`);

	const labsFolder = app.vault.getAbstractFileByPath(personVisitsFolder(paths, oldPerson));
	if (labsFolder) await app.fileManager.renameFile(labsFolder, personVisitsFolder(paths, newPerson));

	for (const file of filesUnder(app, personVisitsFolder(paths, newPerson))) {
		const fm = app.metadataCache.getFileCache(file)?.frontmatter;
		if (fm?.person === oldPerson) await app.fileManager.processFrontMatter(file, (frontmatter) => (frontmatter.person = newPerson));
	}

	for (const file of filesUnder(app, paths.plansFolder)) {
		const fm = app.metadataCache.getFileCache(file)?.frontmatter;
		if (fm?.person === oldPerson) await app.fileManager.processFrontMatter(file, (frontmatter) => (frontmatter.person = newPerson));
	}
}
