import { concernViewNameForProfile, normalizeConcernKey, resolveConcernViewName } from "./dashboard";
import type { MarkerNote, ProfileNote } from "./types";

export interface DesiredBaseView {
	name: string;
	/** Raw field ids in column order, "date" always first. */
	order: string[];
	/** Unset for the unsuffixed base concern view; one clause for a per-profile view. */
	personFilter?: string;
}

/** Every concern's desired Base view content, base and per-profile, derived purely from current
 *  vault state -- the one place `views:` content is decided (ticket 08's Resolution, decisions 4,
 *  6, 10), so the sync action and its tests never hand-roll the shape independently. Concern set is
 *  the live union of every `MarkerNote.concern` value, not the static `CONCERN_CONFIG` registry.
 *  Order: base views first (alphabetical by concern key), then each concern's per-profile views (in
 *  `profiles` order) -- stable so a no-op sync diffs to empty. */
export function computeDesiredBaseViews(markers: MarkerNote[], profiles: ProfileNote[], concernViewOverrides: Record<string, string>): DesiredBaseView[] {
	const concernKeys = [...new Set(markers.flatMap((m) => m.concern.map(normalizeConcernKey)))].sort();

	const views: DesiredBaseView[] = [];
	for (const key of concernKeys) {
		const baseName = resolveConcernViewName(key, concernViewOverrides);
		const order = columnOrder(markers, key);
		views.push({ name: baseName, order });
		for (const profile of profiles) {
			views.push({ name: concernViewNameForProfile(baseName, profile.person), order, personFilter: `person == "${profile.person}"` });
		}
	}
	return views;
}

/** Sorts by `MarkerNote.baseOrder` (unset sorts last), tie-broken alphabetically by id -- distinct
 *  from `order`, which drives dashboard/visit-editor sequencing (see `baseOrder`'s doc comment on
 *  `MarkerNote`). */
function columnOrder(markers: MarkerNote[], concernKey: string): string[] {
	const inConcern = markers.filter((m) => m.concern.some((c) => normalizeConcernKey(c) === concernKey));
	const sorted = [...inConcern].sort(
		(a, b) => (a.baseOrder ?? Number.POSITIVE_INFINITY) - (b.baseOrder ?? Number.POSITIVE_INFINITY) || a.id.localeCompare(b.id),
	);
	return ["date", ...sorted.map((m) => m.id)];
}

/** Renders one view's exact YAML block text (2-space list item under a `views:` key), matching the
 *  hand-authored shape from ticket 05/08. Always double-quotes `name:`, even when unquoted would be
 *  legal YAML -- a stable, unambiguous serialization matters more here than mirroring hand-authored
 *  style, since this string is also what `diffBaseViews` compares against to decide "unchanged". */
export function serializeBaseView(view: DesiredBaseView): string {
	const lines = [`  - type: table`, `    name: "${escapeYamlDoubleQuoted(view.name)}"`];
	if (view.personFilter) {
		lines.push(`    filters:`, `      and:`, `        - ${view.personFilter}`);
	}
	lines.push(`    order:`, ...view.order.map((field) => `      - ${field}`));
	lines.push(`    sort:`, `      - property: date`, `        direction: DESC`);
	return lines.join("\n");
}

function escapeYamlDoubleQuoted(s: string): string {
	return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function unescapeYamlDoubleQuoted(s: string): string {
	return s.replace(/\\(.)/g, "$1");
}

export interface ExistingViewBlock {
	name: string;
	/** Line index (0-based, inclusive) of the block's `  - type:` line. */
	startLine: number;
	/** Line index (0-based, exclusive) where the block ends. */
	endLine: number;
}

/** Locates each top-level `views:` list item's line range and name by scanning raw text --
 *  deliberately not a full YAML parse (ticket 08's Resolution, decision 2): a `parseYaml`/
 *  `stringifyYaml` round-trip would re-serialize every view in the file, not just the ones this
 *  module manages, risking reformatting hand-authored content it doesn't own. Only understands this
 *  file's own indentation convention (2-space list items under a top-level `views:` key, 4-space
 *  `name:` inside each) -- matches every view in this vault's Base file and everything
 *  `serializeBaseView` itself produces. A view item with no `name:` line is skipped (can't be
 *  addressed by name, so it's neither manageable nor a collision risk). */
export function parseViewBlocks(text: string): ExistingViewBlock[] {
	const lines = text.split("\n");
	const viewsLine = lines.indexOf("views:");
	if (viewsLine === -1) return [];

	const blocks: ExistingViewBlock[] = [];
	let start: number | null = null;
	let name: string | undefined;

	const closeBlock = (end: number): void => {
		if (start !== null && name !== undefined) blocks.push({ name, startLine: start, endLine: end });
		start = null;
		name = undefined;
	};

	for (let i = viewsLine + 1; i < lines.length; i++) {
		const line = lines[i];
		if (/^ {2}- type: /.test(line)) {
			closeBlock(i);
			start = i;
			continue;
		}
		if (line.length > 0 && !/^\s/.test(line)) {
			// Dedented back to a top-level key -- the `views:` section has ended.
			closeBlock(i);
			return blocks;
		}
		if (start !== null) {
			const m = /^ {4}name: (?:"((?:[^"\\]|\\.)*)"|(.+))$/.exec(line);
			if (m) name = m[1] !== undefined ? unescapeYamlDoubleQuoted(m[1]) : m[2];
		}
	}
	// A trailing blank line (the file's final newline) isn't part of the last block's content --
	// exclude it so replacing/removing the last view never eats the file's trailing newline.
	const eof = lines.length > 0 && lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
	closeBlock(eof);
	return blocks;
}

function blockText(lines: string[], block: ExistingViewBlock): string {
	return lines.slice(block.startLine, block.endLine).join("\n");
}

export interface ViewDiff {
	toAdd: DesiredBaseView[];
	toUpdate: DesiredBaseView[];
	/** Names present in `managedNames` with no matching desired view anymore -- orphaned by a
	 *  removed profile or concern. */
	toRemove: string[];
	/** Desired views whose name already exists in the file but isn't in `managedNames` yet -- a
	 *  pre-existing hand-authored (or not-yet-adopted) view under the same name. Never silently
	 *  folded into `toUpdate` (ticket 08's Resolution, decision 12) -- always surfaced separately so
	 *  the confirm step can show it as its own adopt/overwrite line. */
	collisions: DesiredBaseView[];
}

/** Diffs the desired view set against the file's current content and the sync manifest
 *  (`managedNames` -- ticket 08's Resolution, decision 3). Pure string comparison, so a no-op
 *  re-run (nothing changed since the last sync) always produces every bucket empty. */
export function diffBaseViews(desired: DesiredBaseView[], fileText: string, managedNames: string[]): ViewDiff {
	const lines = fileText.split("\n");
	const existingByName = new Map(parseViewBlocks(fileText).map((b) => [b.name, b]));
	const managed = new Set(managedNames);

	const toAdd: DesiredBaseView[] = [];
	const toUpdate: DesiredBaseView[] = [];
	const collisions: DesiredBaseView[] = [];

	for (const view of desired) {
		const block = existingByName.get(view.name);
		if (!block) {
			toAdd.push(view);
		} else if (!managed.has(view.name)) {
			collisions.push(view);
		} else if (blockText(lines, block) !== serializeBaseView(view)) {
			toUpdate.push(view);
		}
	}

	const desiredNames = new Set(desired.map((v) => v.name));
	const toRemove = managedNames.filter((name) => !desiredNames.has(name));

	return { toAdd, toUpdate, toRemove, collisions };
}

/** Applies a set of writes/removals to the file text via targeted splice -- never a full-file
 *  regenerate (ticket 08's Resolution, decision 2). Every name in `toWrite` either replaces its
 *  existing block in place or, if new, is appended at the end of the `views:` list (this file's
 *  `views:` section is always last, matching where a hand-authored addition would naturally land).
 *  `toRemoveNames` deletes blocks outright; a name present in both is written, not removed (the
 *  caller should never pass overlapping sets, but this ordering makes the safer outcome the
 *  default). Callers must re-derive `toWrite`/`toRemoveNames` from a fresh read of `text`
 *  immediately before calling this (ticket 08's Resolution, decision 11) -- this function trusts
 *  its input completely and does no staleness check of its own. */
export function applyBaseViewSplice(text: string, toWrite: DesiredBaseView[], toRemoveNames: string[]): string {
	const lines = text.split("\n");
	const blockByName = new Map(parseViewBlocks(text).map((b) => [b.name, b]));
	const writeByName = new Map(toWrite.map((v) => [v.name, v]));

	const toInsert: DesiredBaseView[] = [];
	const ops: { start: number; end: number; replacement: string[] }[] = [];

	for (const view of toWrite) {
		const block = blockByName.get(view.name);
		if (block) ops.push({ start: block.startLine, end: block.endLine, replacement: serializeBaseView(view).split("\n") });
		else toInsert.push(view);
	}
	for (const name of toRemoveNames) {
		if (writeByName.has(name)) continue;
		const block = blockByName.get(name);
		if (block) ops.push({ start: block.startLine, end: block.endLine, replacement: [] });
	}

	ops.sort((a, b) => b.start - a.start);
	for (const op of ops) lines.splice(op.start, op.end - op.start, ...op.replacement);

	if (toInsert.length > 0) {
		const insertionLines = toInsert.flatMap((v) => serializeBaseView(v).split("\n"));
		const insertAt = lines.length > 0 && lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
		lines.splice(insertAt, 0, ...insertionLines);
	}

	return lines.join("\n");
}
