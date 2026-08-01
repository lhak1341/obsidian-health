import type { App, TFile } from "obsidian";
import { buildVisitFrontmatter } from "../core/entry";
import type { MarkerKind, PersonSex } from "../core/types";
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
