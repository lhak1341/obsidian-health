import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu';
import { type ReactNode } from 'react';
export type ContextMenuProps = BaseContextMenu.Root.Props;
/** The context menu's root: holds the open state. */
export declare function ContextMenu({ actionsRef, ...props }: ContextMenuProps): import("react").JSX.Element;
export type ContextMenuTriggerProps = BaseContextMenu.Trigger.Props;
/**
 * The area a right click opens the menu on. Renders a `<div>`; pass `render`
 * to make an existing element (a row) the area.
 */
export declare function ContextMenuTrigger(props: ContextMenuTriggerProps): import("react").JSX.Element;
export type ContextMenuPopupProps = {
    /** Names the menu. */
    'aria-label'?: string;
    /** Classes for the popup. */
    className?: string;
    children?: ReactNode;
};
/** The floating list of items, opened at the pointer. */
export declare function ContextMenuPopup({ className, children, ...popup }: ContextMenuPopupProps): import("react").JSX.Element;
