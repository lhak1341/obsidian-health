import { Menu as BaseMenu } from '@base-ui/react/menu';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
export type MenuProps = BaseMenu.Root.Props;
/** The menu's root: holds the open state (`open`/`onOpenChange`, or uncontrolled). */
export declare function Menu(props: MenuProps): import("react").JSX.Element;
export type MenuTriggerProps = BaseMenu.Trigger.Props;
/** Opens the menu. Pass `render={<Button />}` for the kit's button look. */
export declare function MenuTrigger(props: MenuTriggerProps): import("react").JSX.Element;
export type MenuPopupProps = Pick<BaseMenu.Positioner.Props, 'side' | 'align' | 'sideOffset'> & Pick<BaseMenu.Popup.Props, 'finalFocus'> & {
    /** Names the menu. */
    'aria-label'?: string;
    /** Classes for the popup. */
    className?: string;
    children?: ReactNode;
};
/** The floating list of items, placed next to its trigger (default: below, 4px away). */
export declare function MenuPopup({ side, align, sideOffset, className, children, ...popup }: MenuPopupProps): import("react").JSX.Element;
export type MenuItemProps = Omit<BaseMenu.Item.Props, 'className' | 'render' | 'nativeButton'> & {
    /** A lucide-react icon shown before the label. */
    icon?: LucideIcon;
    /** `danger` for a destructive action (delete, discard). */
    variant?: 'default' | 'danger';
    className?: string;
};
/** One action. It closes the menu when chosen unless `closeOnClick={false}`. */
export declare function MenuItem({ icon, variant, className, children, ...item }: MenuItemProps): import("react").JSX.Element;
/** A line between groups of items. */
export declare function MenuSeparator({ className }: {
    className?: string;
}): import("react").JSX.Element;
