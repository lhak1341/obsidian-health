import type { App, EventRef } from "obsidian";

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

export interface FakeApp extends App {
	/** Test-only: simulates `metadataCache`'s own re-index catching up with a committed write --
	 *  syncs the cached/indexed frontmatter to the committed write and fires a "changed" event for
	 *  the path. Only meaningful when `deferIndexing` is set; otherwise every write auto-flushes. */
	flushMetadataCache(path: string): void;
}

/** Minimal in-memory stand-in for the slice of Obsidian's `App` that vault/reader.ts and
 *  vault/writer.ts actually call -- just enough to characterize scanVault and renameProfile
 *  without a real Obsidian runtime. Folders are inferred from file path prefixes, not stored
 *  separately. `failOn` lets a test simulate a write throwing partway through a batch rename.
 *  `deferIndexing` lets a test simulate `metadataCache`'s real-world re-index lag: a committed
 *  write no longer auto-syncs to the cached/indexed read and fire "changed" -- the test must call
 *  `flushMetadataCache` itself, so `writeFrontmatter`'s wait-for-"changed" behavior is directly
 *  exercisable without real timers. */
export function createFakeApp(initialFiles: FakeNoteInput[], opts?: { failOn?: (path: string) => boolean; deferIndexing?: boolean }): FakeApp {
	const notes = new Map<string, { committed: Record<string, unknown>; cached: Record<string, unknown>; body: string }>();
	for (const note of initialFiles) notes.set(note.path, { committed: note.frontmatter, cached: { ...note.frontmatter }, body: note.body ?? "" });

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

	type ChangeListener = (file: FakeFile) => void;
	const listeners = new Map<number, ChangeListener>();
	let nextRefId = 0;

	const flushMetadataCache = (path: string): void => {
		const entry = notes.get(path);
		if (!entry) return;
		entry.cached = { ...entry.committed };
		const file = toFakeFile(path);
		for (const cb of listeners.values()) cb(file);
	};

	return {
		vault: {
			getMarkdownFiles: () => [...notes.keys()].map(toFakeFile),
			getAbstractFileByPath,
			cachedRead: async (file: FakeFile) => notes.get(file.path)?.body ?? "",
			create: async (path: string, content: string): Promise<FakeFile> => {
				notes.set(path, { committed: {}, cached: {}, body: content });
				return toFakeFile(path);
			},
			// No-op: folders are inferred from file path prefixes (see getAbstractFileByPath above),
			// so a folder "exists" the moment a note is created under it.
			createFolder: async (_path: string): Promise<void> => {},
		},
		metadataCache: {
			getFileCache: (file: FakeFile) => {
				const entry = notes.get(file.path);
				return entry ? { frontmatter: entry.cached } : null;
			},
			on: (event: string, cb: ChangeListener): EventRef => {
				const id = nextRefId++;
				if (event === "changed") listeners.set(id, cb);
				return { id } as unknown as EventRef;
			},
			offref: (ref: EventRef) => {
				listeners.delete((ref as unknown as { id: number }).id);
			},
		},
		fileManager: {
			processFrontMatter: async (file: FakeFile, fn: (frontmatter: Record<string, unknown>) => void) => {
				if (opts?.failOn?.(file.path)) throw new Error(`simulated failure writing ${file.path}`);
				const entry = notes.get(file.path);
				if (!entry) throw new Error(`no such file: ${file.path}`);
				fn(entry.committed);
				if (!opts?.deferIndexing) flushMetadataCache(file.path);
			},
			renameFile: async (file: { path: string }, newPath: string) => renameEntry(file, newPath),
		},
		flushMetadataCache,
	} as unknown as FakeApp;
}
