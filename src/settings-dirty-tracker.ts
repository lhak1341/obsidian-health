/** Pairs every settings mutation with the dirty flag that gates the open-dashboard refresh on tab
 *  close, so a call site can't persist/rescan without marking dirty by omission. Obsidian-free --
 *  `persist`/`rescan` are supplied by the settings tab, which owns the actual saveSettings()/vault
 *  scan; this class only orchestrates the flag. `saveQuiet` is the deliberate escape hatch for the
 *  rare mutation that doesn't affect the open dashboard (Base-override CRUD in ConcernSection). */
export class SettingsDirtyTracker {
	private dirty = false;

	constructor(
		private readonly persist: () => Promise<void>,
		private readonly rescan: () => Promise<void>,
	) {}

	async save(): Promise<void> {
		this.dirty = true;
		await this.persist();
	}

	async saveQuiet(): Promise<void> {
		await this.persist();
	}

	async reload(): Promise<void> {
		this.dirty = true;
		await this.rescan();
	}

	markDirty(): void {
		this.dirty = true;
	}

	/** Returns whether a refresh is owed, then clears the flag. */
	consumeDirty(): boolean {
		const wasDirty = this.dirty;
		this.dirty = false;
		return wasDirty;
	}
}
