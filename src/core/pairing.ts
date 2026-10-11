/** Pairs items sharing a partner key (e.g. BP systolic/diastolic sharing a `pair` id) into one row,
 *  ordered by `getOrder` (missing order treated as primary=0/secondary=1). Shared by the entry
 *  form's marker pairing and the dashboard's row pairing -- same algorithm, different types. */
export function pairByPartner<T>(
	items: T[],
	getId: (item: T) => string,
	getPair: (item: T) => string | undefined,
	getOrder: (item: T) => number | undefined,
): { primary: T; secondary?: T }[] {
	const consumed = new Set<string>();
	const rows: { primary: T; secondary?: T }[] = [];

	for (const item of items) {
		const id = getId(item);
		if (consumed.has(id)) continue;
		consumed.add(id);

		const pairKey = getPair(item);
		// Excludes already-consumed candidates (which, since `id` is already in `consumed` at this
		// point, also excludes self-matching): without this, a 3rd+ item sharing the same pair id
		// (a plausible typo since `pair` is unvalidated free text) could re-match an already-paired
		// item, producing two rows that both contain it instead of one item falling back to solo.
		const partner = pairKey ? items.find((other) => !consumed.has(getId(other)) && getPair(other) === pairKey) : undefined;

		if (partner) {
			consumed.add(getId(partner));
			const order = getOrder(item) ?? 0;
			const partnerOrder = getOrder(partner) ?? 1;
			rows.push(order <= partnerOrder ? { primary: item, secondary: partner } : { primary: partner, secondary: item });
		} else {
			rows.push({ primary: item });
		}
	}

	return rows;
}
