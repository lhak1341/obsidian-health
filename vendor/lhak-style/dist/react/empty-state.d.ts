import { type ComponentProps, type ReactNode } from 'react';
export type SpinnerProps = Omit<ComponentProps<'span'>, 'children'> & {
    /** Names the spinner and makes it a status. Leave it out when text beside it says what is loading. */
    label?: string;
};
export declare function Spinner({ label, className, ...props }: SpinnerProps): import("react").JSX.Element;
export type EmptyStateProps = Omit<ComponentProps<'div'>, 'title' | 'children'> & {
    /** What is (not) here, e.g. "Dictionary is empty" or "Loading configuration…". */
    title: ReactNode;
    /** What to do about it. */
    description?: ReactNode;
    /** A decorative icon above the title, e.g. `<Icon icon={Inbox} />`. */
    icon?: ReactNode;
    /** A button or two below the description. */
    action?: ReactNode;
    /** Shows a spinner instead of the icon, and makes the whole state a status named by its title. */
    loading?: boolean;
};
export declare function EmptyState({ title, description, icon, action, loading, className, ...props }: EmptyStateProps): import("react").JSX.Element;
