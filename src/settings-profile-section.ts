import { Notice, Setting } from "obsidian";
import { parseAllergies, validateProfileInput } from "./core/entry";
import type { PersonSex, ProfileNote } from "./core/types";
import { renderDragReorderList } from "./render/drag-reorder";
import type { SettingsSectionContext } from "./settings-context";
import type { VaultSnapshot } from "./vault/reader";
import { renameProfile as renameProfileInVault, saveProfileNote, saveProfileOrder as saveProfileOrderInVault } from "./vault/writer";

interface NewProfileDraft {
	person: string;
	sex: PersonSex;
	dob: string;
	bloodType: string;
	allergies: string;
}

/** Profile order, CRUD, and rename -- the profile-management half of the settings tab, split out
 *  from concern taxonomy (settings-concern-section.ts). Owns the "add a profile" draft itself so
 *  it survives a tab-wide re-render triggered by an unrelated section. */
export class ProfileSection {
	private newProfile: NewProfileDraft = { person: "", sex: "m", dob: "", bloodType: "", allergies: "" };
	private snapshot: VaultSnapshot | undefined;

	constructor(private readonly ctx: SettingsSectionContext) {}

	render(root: HTMLElement, snapshot: VaultSnapshot | undefined): void {
		this.snapshot = snapshot;
		this.renderProfileOrder(root, snapshot);
		this.renderProfiles(root, snapshot);
	}

	private renderProfileOrder(root: HTMLElement, snapshot: VaultSnapshot | undefined): void {
		new Setting(root).setName("Profile order").setHeading();
		root.createEl("p", {
			cls: "setting-item-description",
			text: "Drag to reorder the profile switcher buttons on the dashboard.",
		});
		const list = root.createDiv("setting-group").createDiv("setting-items").createDiv({ cls: "hlth-order-list" });
		const profiles = snapshot?.profiles ?? [];
		renderDragReorderList(list, profiles, { getId: (p) => p.person, getLabel: (p) => p.person }, (order) => void this.saveProfileOrder(order));
	}

	/** Writes sparse `order:` values (10, 20, 30…) for the full profile list, mirroring ConcernSection.saveConcernOrder. */
	private async saveProfileOrder(order: ProfileNote[]): Promise<void> {
		const paths = this.ctx.plugin.settings;
		order.forEach((profile, i) => (profile.order = (i + 1) * 10));
		await Promise.all(order.map((profile) => saveProfileOrderInVault(this.ctx.app, paths, profile.person, profile.order!)));
		this.ctx.markDirty();
	}

	private renderProfiles(root: HTMLElement, snapshot: VaultSnapshot | undefined): void {
		new Setting(root).setName("Profiles").setHeading();
		const items = root.createDiv("setting-group").createDiv("setting-items");

		for (const profile of snapshot?.profiles ?? []) this.renderProfileEditor(items, profile);
		this.renderAddProfileForm(items);
	}

	private renderProfileEditor(root: HTMLElement, profile: ProfileNote): void {
		const details = root.createEl("details", { cls: "hlth-settings-details" });
		details.createEl("summary", { text: profile.person });
		const body = details.createDiv();

		let renameTo = "";
		new Setting(body)
			.setName("Rename profile")
			.setDesc("Renames the profile note, its labs subfolder, and person: on every visit/plan note that references it.")
			.addText((text) => text.setPlaceholder(profile.person).onChange((value) => (renameTo = value)))
			.addButton((btn) => btn.setButtonText("Rename").onClick(() => void this.renameProfile(profile.person, renameTo)));

		let sex: PersonSex = profile.sex;
		let dob = profile.dob ?? "";
		let bloodType = profile.bloodType ?? "";
		let allergies = (profile.allergies ?? []).join(", ");

		new Setting(body).setName("Sex").addDropdown((dropdown) =>
			dropdown
				.addOption("m", "Male")
				.addOption("f", "Female")
				.setValue(sex)
				.onChange((value) => (sex = value as PersonSex)),
		);
		new Setting(body).setName("Date of birth").addText((text) => {
			text.inputEl.type = "date";
			text.setValue(dob);
			text.onChange((value) => (dob = value));
		});
		new Setting(body).setName("Blood type").addText((text) => text.setValue(bloodType).onChange((value) => (bloodType = value)));
		new Setting(body)
			.setName("Allergies")
			.setDesc("Comma-separated.")
			.addText((text) => text.setValue(allergies).onChange((value) => (allergies = value)));

		new Setting(body).addButton((btn) =>
			btn
				.setButtonText("Save")
				.setCta()
				.onClick(() =>
					void this.saveProfile(profile.person, sex, dob, bloodType, allergies).then(() => {
						new Notice(`Saved profile for ${profile.person}.`);
					}),
				),
		);
	}

	private renderAddProfileForm(root: HTMLElement): void {
		const details = root.createEl("details", { cls: "hlth-settings-details" });
		details.createEl("summary", { text: "+ Add a profile" });
		const body = details.createDiv();

		const draft = this.newProfile;
		new Setting(body).setName("Person").addText((text) => text.setValue(draft.person).onChange((value) => (draft.person = value)));
		new Setting(body).setName("Sex").addDropdown((dropdown) =>
			dropdown
				.addOption("m", "Male")
				.addOption("f", "Female")
				.setValue(draft.sex)
				.onChange((value) => (draft.sex = value as PersonSex)),
		);
		new Setting(body).setName("Date of birth").addText((text) => {
			text.inputEl.type = "date";
			text.setValue(draft.dob);
			text.onChange((value) => (draft.dob = value));
		});
		new Setting(body).setName("Blood type").addText((text) => text.setValue(draft.bloodType).onChange((value) => (draft.bloodType = value)));
		new Setting(body)
			.setName("Allergies")
			.setDesc("Comma-separated.")
			.addText((text) => text.setValue(draft.allergies).onChange((value) => (draft.allergies = value)));

		new Setting(body).addButton((btn) =>
			btn
				.setButtonText("Add profile")
				.setCta()
				.onClick(() => void this.addProfile()),
		);
	}

	private async saveProfile(person: string, sex: PersonSex, dob: string, bloodType: string, allergies: string): Promise<void> {
		await saveProfileNote(this.ctx.app, this.ctx.plugin.settings, person, {
			sex,
			dob: dob || undefined,
			bloodType: bloodType || undefined,
			allergies: parseAllergies(allergies),
		});
		await this.ctx.reload();
	}

	private async addProfile(): Promise<void> {
		const draft = this.newProfile;
		const person = draft.person.trim();
		const error = validateProfileInput(person, draft.sex);
		if (error) {
			new Notice(error);
			return;
		}
		if (this.snapshot?.profiles.some((p) => p.person === person)) {
			new Notice(`Profile "${person}" already exists.`);
			return;
		}

		await this.saveProfile(person, draft.sex, draft.dob, draft.bloodType, draft.allergies);
		this.newProfile = { person: "", sex: "m", dob: "", bloodType: "", allergies: "" };
		new Notice(`Added profile for ${person}.`);
	}

	private async renameProfile(oldPerson: string, newPersonRaw: string): Promise<void> {
		const newPerson = newPersonRaw.trim();
		if (!newPerson || newPerson === oldPerson) {
			new Notice("Enter a different name.");
			return;
		}

		try {
			await renameProfileInVault(this.ctx.app, this.ctx.plugin.settings, oldPerson, newPerson);
		} catch (err) {
			new Notice(err instanceof Error ? err.message : String(err));
			return;
		}

		await this.ctx.save();
		this.ctx.markDirty();
		new Notice(`Renamed profile "${oldPerson}" to "${newPerson}".`);
		await this.ctx.reload();
	}
}
