import type { App } from "obsidian";

export interface FakeNoteInput {
	path: string;
	frontmatter: Record<string, unknown>;
	/** Text below the `---` frontmatter block (what `parseMarkerNote`/`parsePlanNote` treat as the blurb/body). */
	body?: string;
}

interface FakeFile {
	path: string;
	basename: string;
	extension: string;
}

/** Minimal in-memory stand-in for the slice of Obsidian's `App` that vault/reader.ts and
 *  vault/writer.ts actually call -- just enough to characterize scanVault and renameProfile
 *  without a real Obsidian runtime. Folders are inferred from file path prefixes, not stored
 *  separately. `failOn` lets a test simulate a write throwing partway through a batch rename. */
export function createFakeApp(initialFiles: FakeNoteInput[], opts?: { failOn?: (path: string) => boolean }): App {
	const notes = new Map<string, { frontmatter: Record<string, unknown>; body: string }>();
	for (const note of initialFiles) notes.set(note.path, { frontmatter: note.frontmatter, body: note.body ?? "" });

	const toFakeFile = (path: string): FakeFile => {
		const basename = path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/, "");
		return { path, basename, extension: "md" };
	};

	const getAbstractFileByPath = (path: string): FakeFile | { path: string } | null => {
		if (notes.has(path)) return toFakeFile(path);
		const folderPrefix = `${path}/`;
		if ([...notes.keys()].some((p) => p.startsWith(folderPrefix))) return { path };
		return null;
	};

	const renameEntry = (file: { path: string }, newPath: string): void => {
		if (notes.has(file.path)) {
			const entry = notes.get(file.path)!;
			notes.delete(file.path);
			notes.set(newPath, entry);
			return;
		}
		// Folder rename: move every descendant to the same relative path under `newPath`.
		const oldPrefix = `${file.path}/`;
		for (const path of [...notes.keys()]) {
			if (!path.startsWith(oldPrefix)) continue;
			const entry = notes.get(path)!;
			notes.delete(path);
			notes.set(`${newPath}/${path.slice(oldPrefix.length)}`, entry);
		}
	};

	return {
		vault: {
			getMarkdownFiles: () => [...notes.keys()].map(toFakeFile),
			getAbstractFileByPath,
			cachedRead: async (file: FakeFile) => notes.get(file.path)?.body ?? "",
		},
		metadataCache: {
			getFileCache: (file: FakeFile) => {
				const entry = notes.get(file.path);
				return entry ? { frontmatter: entry.frontmatter } : null;
			},
		},
		fileManager: {
			processFrontMatter: async (file: FakeFile, fn: (frontmatter: Record<string, unknown>) => void) => {
				if (opts?.failOn?.(file.path)) throw new Error(`simulated failure writing ${file.path}`);
				const entry = notes.get(file.path);
				if (!entry) throw new Error(`no such file: ${file.path}`);
				fn(entry.frontmatter);
			},
			renameFile: async (file: { path: string }, newPath: string) => renameEntry(file, newPath),
		},
	} as unknown as App;
}
