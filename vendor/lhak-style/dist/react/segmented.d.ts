import { type RadioGroupProps as BaseRadioGroupProps } from '@base-ui/react/radio-group';
import { type ReactNode } from 'react';
export type SegmentedItem<Value> = {
    value: Value;
    label: ReactNode;
    disabled?: boolean;
};
export type SegmentedControlProps<Value extends string> = Omit<BaseRadioGroupProps<Value>, 'className' | 'children' | 'aria-labelledby'> & {
    items: readonly SegmentedItem<Value>[];
    /** A visible label. Without it, name the group with `aria-label`. */
    label?: ReactNode;
    'aria-label'?: string;
    /** Classes for the group. */
    className?: string;
};
export declare function SegmentedControl<Value extends string>({ items, label, className, ...props }: SegmentedControlProps<Value>): import("react").JSX.Element;
