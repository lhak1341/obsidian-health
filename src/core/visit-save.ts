import { evaluateNumericField, evaluateQualitativeField, resolveBandForEntry, validateDate, type FieldOutcome, type FieldState } from "./entry";
import { markerAppliesToSex } from "./marker";
import type { MarkerNote, ProfileNote } from "./types";

/** What the visit editor hands over at save time. */
export interface VisitForm {
	person: string;
	date: string;
	facility: string;
	fields: Map<string, FieldState>;
}

/** Frontmatter keys to write (`set`) and to delete (`remove`). Every other key in the note is left
 *  alone -- the editor only owns what it can change. */
export interface VisitPatch {
	set: Record<string, unknown>;
	remove: string[];
}

export type VisitSavePlan = { ok: false; errors: string[] } | { ok: true; patch: VisitPatch; softWarnLabels: string[] };

/** Whether the visit editor shows a field for `marker`: derived markers are computed, never
 *  entered, and a sex-restricted marker only shows for that sex. Also the ownership rule for a
 *  save -- only these markers' keys are ever written or deleted. */
export function isVisitFormMarker(marker: MarkerNote, profile: ProfileNote | undefined): boolean {
	return marker.type !== "derived" && markerAppliesToSex(marker, profile?.sex);
}

interface FieldEvaluation {
	marker: MarkerNote;
	outcome: FieldOutcome;
	/** Unit `outcome.value` is expressed in (numeric fields only) -- the unit the lab actually
	 *  reported, not necessarily the marker's canonical unit. */
	unit?: string;
}

/** Turns the editor's form state into either the errors that block saving or the frontmatter patch
 *  to apply. Owns `type`/`person`/`date`/`facility` and, for every marker the form shows, the
 *  `<id>` value key and its `<id>_unit` sibling: a blank field deletes both. Values are written
 *  raw-as-entered, with `<id>_unit` only when the entered unit differs from the canonical one, so
 *  the note keeps exactly what the lab reported. A field with no state counts as blank. */
export function planVisitSave(form: VisitForm, markers: MarkerNote[], profile: ProfileNote | undefined): VisitSavePlan {
	const owned = markers.filter((marker) => isVisitFormMarker(marker, profile));
	const errors: string[] = [];

	const dateError = validateDate(form.date);
	if (dateError) errors.push(dateError);

	const evaluations: FieldEvaluation[] = [];
	for (const marker of owned) {
		const state = form.fields.get(marker.id);
		if (!state) continue;
		const outcome =
			marker.type === "qualitative"
				? evaluateQualitativeField(state.raw)
				: evaluateNumericField(state.raw, state.unit, marker, profile ? resolveBandForEntry(marker, profile, form.date) : {});
		if (outcome.kind === "blocked") errors.push(`${marker.name}: ${outcome.reason}`);
		evaluations.push({ marker, outcome, unit: marker.type === "numeric" ? state.unit : undefined });
	}

	if (errors.length > 0) return { ok: false, errors };

	const facility = form.facility.trim();
	const set: Record<string, unknown> = { type: "lab-visit", person: form.person, date: form.date, ...(facility ? { facility } : {}) };
	const softWarnLabels: string[] = [];
	for (const { marker, outcome, unit } of evaluations) {
		if (outcome.kind !== "ok") continue;
		set[marker.id] = outcome.value;
		if (unit && marker.unit !== undefined && unit !== marker.unit) set[`${marker.id}_unit`] = unit;
		if (outcome.softWarn) softWarnLabels.push(marker.name);
	}

	const ownedKeys = [...(facility ? [] : ["facility"]), ...owned.flatMap((marker) => [marker.id, `${marker.id}_unit`])];
	const remove = ownedKeys.filter((key) => !(key in set));

	return { ok: true, patch: { set, remove }, softWarnLabels };
}
