import { ItemView, WorkspaceLeaf } from "obsidian";

export const HEALTH_VIEW_TYPE = "health-dashboard";

export class HealthView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return HEALTH_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Health";
	}

	getIcon(): string {
		return "heart-pulse";
	}

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.createDiv({ cls: "health-dashboard" });
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}
}
