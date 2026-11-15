import { type BaseStep, type Flavor, type Hue, type Mode, type Role, type StaticToken } from './contract.ts';
export type Primitives = {
    base: Record<BaseStep, string>;
    hues: Record<Hue, string>;
    accent: string;
};
/**
 * Computed at build: the accent's hue and chroma (OKLCH), lightened just
 * enough to reach `minContrast` against `on` (ticket 008, Capritarius dark link).
 */
export type LightenedAccent = {
    lightenAccent: {
        on: Role;
        minContrast: number;
    };
};
export type RoleValue = string | LightenedAccent;
/** The one soft-tint recipe (tickets 006, 013); obsidian.css uses it too. */
export declare const soft: (name: string) => string;
export declare const PRIMITIVES: Record<Flavor, Record<Mode, Primitives>>;
export declare function roleValues(flavor: Flavor, mode: Mode): Record<Role, RoleValue>;
export declare const STATIC_VALUES: Record<StaticToken, string>;
