import { type FontRole, type FontRoleSettings } from './font-roles.ts';
export interface FontRoleSettingOptions {
    role: FontRole;
    name: string;
    desc: string;
    /** The plugin's settings object; the row writes the role's two keys into it. */
    settings: FontRoleSettings;
    /** Label of the theme-following choice, such as `'Task default (theme fonts)'`. */
    defaultLabel?: string;
    /** Called after every write: save the settings and re-apply the roles to open roots. */
    onChange: () => void;
}
export declare function addFontRoleSetting(containerEl: HTMLElement, opts: FontRoleSettingOptions): void;
