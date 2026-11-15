import type { LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from './button.tsx';
/** Put this class on the row element whose hover and focus reveal its actions. */
export declare const ROW_CLASS = "lk-row";
export type RowActionsProps = Omit<ComponentProps<'div'>, 'children'> & {
    /** Names the group, e.g. "Actions for 龍". */
    label: string;
    children: ReactNode;
};
export declare function RowActions({ label, className, ...props }: RowActionsProps): import("react").JSX.Element;
export type RowActionProps = Omit<ComponentProps<typeof Button>, 'variant' | 'iconOnly' | 'aria-label' | 'children'> & {
    icon: LucideIcon;
    /** Names the button, e.g. "Delete 龍"; also its tooltip. */
    label: string;
    /** `danger` colours the icon for a destructive action. */
    tone?: 'neutral' | 'danger';
};
export declare function RowAction({ icon, label, tone, className, ...props }: RowActionProps): import("react").JSX.Element;
