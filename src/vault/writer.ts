import type { App, TFile } from "obsidian";
import { buildVisitFrontmatter } from "../core/entry";
import type { MarkerKind } from "../core/types";
import { filesUnder, type VaultPaths } from "./reader";

function personVisitsFolder(paths: VaultPaths, person: string): string {
	return `${paths.visitsFolder}/${person}`;
}

async function ensureFolder(app: App, path: string): Promise<void> {
	if (!app.vault.getAbstractFileByPath(path)) await app.vault.createFolder(path);
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

	let file = findVisitFile(app, paths, person, date);
	if (!file) {
		const folder = personVisitsFolder(paths, person);
		await ensureFolder(app, folder);
		file = await app.vault.create(`${folder}/${date}.md`, "");
	}

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
