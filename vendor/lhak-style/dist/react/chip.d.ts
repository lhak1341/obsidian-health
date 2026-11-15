import { Toggle } from '@base-ui/react/toggle';
import type { ComponentProps, ReactNode } from 'react';
/** The contract's category hues (src/tokens/contract.ts `HUES`; chip.test.tsx pins them). */
export declare const CHIP_HUES: readonly ["blue", "orange", "green", "purple", "cyan", "pink", "yellow", "red"];
export type ChipHue = (typeof CHIP_HUES)[number];
export type ChipStatus = 'success' | 'warning' | 'danger' | 'info';
type Common = {
    /** A number after the label, in tabular figures (e.g. how many rows a filter matches). */
    count?: number;
    className?: string;
    children?: ReactNode;
};
type Category = {
    /** A category hue, shown as a dot before the label (or as a soft tint with `tint`). Category only, never state. */
    hue: ChipHue;
    /** Tint the chip with the hue's soft colour instead of a dot. */
    tint?: boolean;
    status?: never;
};
type Status = {
    /** A status: the chip carries the status icon, named by a word. */
    status: ChipStatus;
    hue?: never;
    tint?: never;
};
type Plain = {
    hue?: never;
    tint?: never;
    status?: never;
};
export type ChipProps = Omit<ComponentProps<'span'>, 'className' | 'children'> & Common & (Category | Status | Plain);
export declare function Chip({ hue, tint, status, count, className, children, ...props }: ChipProps): import("react").JSX.Element;
export type ToggleChipProps = Omit<ComponentProps<typeof Toggle>, 'className' | 'children'> & {
    count?: number;
    className?: string;
    children?: ReactNode;
};
/** A chip that turns a filter on and off: a button with `aria-pressed`. */
export declare function ToggleChip({ count, className, children, ...props }: ToggleChipProps): import("react").JSX.Element;
export {};
