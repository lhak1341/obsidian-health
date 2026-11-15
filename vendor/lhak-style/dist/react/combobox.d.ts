import { Combobox as BaseCombobox, type ComboboxPrimitiveValue } from '@base-ui/react/combobox';
import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';
export type ComboboxItem<Value> = {
    value: Value;
    /** Shown in the list and in the input once chosen; typing matches against it. */
    label: string;
    /** A lucide-react icon shown before the label, and in the input once chosen. */
    icon?: LucideIcon;
    disabled?: boolean;
};
export type ComboboxProps<Value extends ComboboxPrimitiveValue> = Omit<BaseCombobox.Root.Props<Value, false, ComboboxItem<Value>>, 'items' | 'filteredItems' | 'children' | 'multiple' | 'id'> & {
    items: readonly ComboboxItem<Value>[];
    /** A visible label. Without it, name the combobox with `aria-label`. */
    label?: ReactNode;
    'aria-label'?: string;
    /** Shown in the empty input. */
    placeholder?: string;
    /** Shown when nothing matches what was typed. */
    empty?: ReactNode;
    /** Classes for the input group. */
    className?: string;
};
export declare function Combobox<Value extends ComboboxPrimitiveValue>({ items, label, 'aria-label': ariaLabel, placeholder, empty, className, ...root }: ComboboxProps<Value>): import("react").JSX.Element;
