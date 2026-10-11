import type { MarkerNote, PersonSex } from "./types";

/** A marker's normal values as a list -- `MarkerNote.normal` is a bare string or a list of them
 *  (frontmatter allows either), so every consumer would otherwise re-normalise it. */
export function normalValues(marker: MarkerNote): string[] {
	return marker.normal === undefined ? [] : ([] as string[]).concat(marker.normal);
}

/** Whether a qualitative reading counts as normal: listed in the marker's normal values. The one
 *  definition behind both the status dot (`deriveStatus`) and each history chip's colour. */
export function isNormalValue(marker: MarkerNote, value: number | string): boolean {
	return normalValues(marker).includes(String(value));
}

/** Whether a marker is shown for a profile of this sex -- unset `MarkerNote.sex` means everyone.
 *  `sex` is undefined when there is no profile yet (the visit editor), which hides every
 *  sex-restricted marker. Separate from `ranges[].sex`, which only picks a reference band. */
export function markerAppliesToSex(marker: MarkerNote, sex: PersonSex | undefined): boolean {
	return !marker.sex || marker.sex === sex;
}
