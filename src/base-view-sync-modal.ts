import { Modal, Notice, type App } from "obsidian";
import type { DesiredBaseView } from "./core/base-views";
import type { BaseViewSyncPlan } from "./vault/base-view-sync";

/** Confirm-preview for the settings tab's "Sync Base views" action -- one combined listing of
 *  every add/update/remove/collision, single OK/Cancel before anything is written (ticket 08's
 *  Resolution, decision 9). A collision (a pre-existing view under a name this sync wants to write,
 *  not yet in the ownership manifest -- decision 12) is listed as its own adopt/overwrite line;
 *  confirming here approves every collision shown, there's no per-item toggle. */
export class BaseViewSyncModal extends Modal {
	constructor(
		app: App,
		private readonly plan: BaseViewSyncPlan,
		private readonly onConfirm: (collisionsApproved: DesiredBaseView[]) => void,
	) {
		super(app);
	}

	onOpen(): void {
		const { diff } = this.plan;
		this.contentEl.createEl("h3", { text: "Sync base views" });

		if (diff.toAdd.length === 0 && diff.toUpdate.length === 0 && diff.toRemove.length === 0 && diff.collisions.length === 0) {
			this.contentEl.createEl("p", { text: "Already in sync -- nothing to do." });
			const buttons = this.contentEl.createDiv({ cls: "modal-button-container" });
			buttons.createEl("button", { text: "Close", cls: "mod-cta" }).addEventListener("click", () => this.close());
			return;
		}

		this.renderBucket("Add", diff.toAdd.map((v) => v.name));
		this.renderBucket("Update", diff.toUpdate.map((v) => v.name));
		this.renderBucket("Remove (orphaned)", diff.toRemove);
		this.renderBucket(
			"Adopt / overwrite (pre-existing, not yet managed by this plugin)",
			diff.collisions.map((v) => v.name),
		);

		const buttons = this.contentEl.createDiv({ cls: "modal-button-container" });
		buttons.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
		buttons
			.createEl("button", { text: "Sync", cls: "mod-cta" })
			.addEventListener("click", () => {
				this.close();
				this.onConfirm(diff.collisions);
			});
	}

	private renderBucket(title: string, names: string[]): void {
		if (names.length === 0) return;
		this.contentEl.createEl("h4", { text: `${title} (${names.length})` });
		const list = this.contentEl.createEl("ul");
		for (const name of names) list.createEl("li", { text: name });
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export function notifySyncAborted(): void {
	new Notice("Base file changed since the sync preview was built -- aborted, nothing written. Re-open sync base views to try again.");
}

export function notifySyncResult(diff: { toAdd: unknown[]; toUpdate: unknown[]; toRemove: unknown[]; collisions: unknown[] }): void {
	new Notice(`Base views synced: ${diff.toAdd.length} added, ${diff.toUpdate.length} updated, ${diff.toRemove.length} removed, ${diff.collisions.length} adopted.`);
}
