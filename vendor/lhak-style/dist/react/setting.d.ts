import { type ReactNode } from 'react';
import { type SwitchProps } from './choice.tsx';
export type SettingFollows = {
    /** The switch's label, e.g. "Follow Full Translation Box style". */
    label: ReactNode;
    checked: boolean;
    onCheckedChange: NonNullable<SwitchProps['onCheckedChange']>;
};
export type SettingGroupProps = {
    /** The section's heading; it also names the group. */
    title: ReactNode;
    /** A line under the title. */
    description?: ReactNode;
    /** The section this one can follow. While `checked`, the rows are disabled. */
    follows?: SettingFollows;
    /** Disables every row. */
    disabled?: boolean;
    className?: string;
    children?: ReactNode;
};
export declare function SettingGroup({ title, description, follows, disabled, className, children }: SettingGroupProps): import("react").JSX.Element;
export type SettingRowProps = {
    /** Labels the row's control (or, with `group`, names the row). */
    label: ReactNode;
    /** A line under the control; it also describes the control (or the row). */
    help?: ReactNode;
    /**
     * The control is a group that names its own parts (SegmentedControl,
     * RadioGroup, ThemeSwitch): the label names the row as a `role="group"`
     * instead. Inside a Field, Base UI labels every radio with the field's
     * label, so each option would be named "Size:" (probed in kit issue 15).
     */
    group?: boolean;
    /** Disables the row's Base UI controls (a group can disable them all). With `group`, only the label fades: disable the control itself. */
    disabled?: boolean;
    className?: string;
    /** The control, and anything after it (a reset button). */
    children: ReactNode;
};
/**
 * One setting: a Base UI Field, so its label names and its help describes a
 * kit control in it (TextField, Switch, Select, Slider, NumberStepper).
 */
export declare function SettingRow({ label, help, group, disabled, className, children }: SettingRowProps): import("react").JSX.Element;
