// The settings-tab row for one font role (kit issue 16), as TASK drew it:
// a dropdown of sources, then a custom family row shown only for "Custom…".
import { Setting } from 'obsidian';
import { FONT_ROLE_KEYS, fontSourceOptions } from "./font-roles.js";
export function addFontRoleSetting(containerEl, opts) {
    const keys = FONT_ROLE_KEYS[opts.role];
    const options = fontSourceOptions(opts.defaultLabel);
    // Obsidian's `.setting-item` sets `display`, which a `hidden` attribute would not beat.
    const showCustom = (source) => {
        customRow.settingEl.style.display = source === 'custom' ? '' : 'none';
    };
    new Setting(containerEl)
        .setName(opts.name)
        .setDesc(opts.desc)
        .addDropdown((drop) => {
        for (const [value, label] of Object.entries(options))
            drop.addOption(value, label);
        drop.setValue(opts.settings[keys.source]).onChange((value) => {
            const source = value;
            opts.settings[keys.source] = source;
            showCustom(source);
            opts.onChange();
        });
    });
    const customRow = new Setting(containerEl).setName('').addText((text) => text
        .setPlaceholder('Font family name')
        .setValue(opts.settings[keys.custom])
        .onChange((value) => {
        opts.settings[keys.custom] = value.trim();
        opts.onChange();
    }));
    showCustom(opts.settings[keys.source]);
}
