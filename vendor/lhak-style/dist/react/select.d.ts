import { Select as BaseSelect } from '@base-ui/react/select';
import type { ReactNode, Ref } from 'react';
export type SelectItem<Value> = {
    value: Value;
    label: string;
    disabled?: boolean;
};
export type SelectProps<Value> = Omit<BaseSelect.Root.Props<Value, false>, 'items' | 'children' | 'multiple'> & {
    items: readonly SelectItem<Value>[];
    /** A visible label. Without it, name the select with `aria-label`. */
    label?: ReactNode;
    'aria-label'?: string;
    /** Shown while no item is chosen. */
    placeholder?: ReactNode;
    /** Classes for the trigger. */
    className?: string;
    /**
     * Open the list over the trigger with the chosen item on the trigger's text
     * (macOS's own pop-up). Off by default: near the top of a view that left
     * the list only the room around the trigger, so a long list scrolled
     * (user report, kit issue 15). Off, it opens below with all the room there.
     */
    alignItemWithTrigger?: boolean;
    /** The trigger's id, so a `<label htmlFor>` outside the select names it. */
    id?: string;
    /** The trigger element, e.g. for a dialog's `initialFocus`. */
    triggerRef?: Ref<HTMLButtonElement>;
};
export declare function Select<Value>({ items, label, 'aria-label': ariaLabel, placeholder, className, alignItemWithTrigger, id, triggerRef, ...root }: SelectProps<Value>): import("react").JSX.Element;
