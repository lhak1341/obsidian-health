import { type ReactNode, type Ref } from 'react';
export type SearchBarFilter = {
    /** Names the toggle, e.g. "Filters". */
    label: string;
    /** Whether the filter panel is open: the toggle shows pressed. */
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Whether any filter applies: the toggle shows a dot and its name says "(active)". */
    active?: boolean;
};
export type SearchBarProps = {
    /** Names the search field. */
    label: string;
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    /** The field itself, e.g. for a shortcut that focuses it. */
    inputRef?: Ref<HTMLInputElement>;
    /** Adds a filter toggle after the field. */
    filter?: SearchBarFilter;
    /** Trailing actions, after the filter toggle. */
    children?: ReactNode;
    className?: string;
};
export declare function SearchBar({ label, value, onValueChange, placeholder, inputRef, filter, children, className }: SearchBarProps): import("react").JSX.Element;
