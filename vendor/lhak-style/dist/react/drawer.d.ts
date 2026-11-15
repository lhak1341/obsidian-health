import { Drawer as BaseDrawer } from '@base-ui/react/drawer';
import { type ReactNode } from 'react';
type Side = 'left' | 'right';
export type DrawerProps = Omit<BaseDrawer.Root.Props, 'swipeDirection' | 'snapPoints' | 'modal'> & {
    /** The edge it slides in from, and the direction a swipe dismisses it. Default `right`. */
    side?: Side;
    /** Trap focus behind a scrim (default), or leave the page usable beside it. */
    modal?: boolean;
};
/** The drawer's root: holds the open state (`open`/`onOpenChange`, or uncontrolled). */
export declare function Drawer({ side, modal, ...props }: DrawerProps): import("react").JSX.Element;
export type DrawerTriggerProps = BaseDrawer.Trigger.Props;
/** Opens the drawer. Pass `render={<Button />}` for the kit's button look. */
export declare function DrawerTrigger(props: DrawerTriggerProps): import("react").JSX.Element;
export type DrawerCloseProps = BaseDrawer.Close.Props;
/** Closes the drawer. Pass `render={<Button />}` for the kit's button look. */
export declare function DrawerClose(props: DrawerCloseProps): import("react").JSX.Element;
export type DrawerPopupProps = Pick<BaseDrawer.Popup.Props, 'initialFocus' | 'finalFocus'> & {
    /** Names the drawer (`aria-labelledby`). */
    title: ReactNode;
    /** Describes the drawer (`aria-describedby`). */
    description?: ReactNode;
    /** Names the header's close button. Default "Close". */
    closeLabel?: string;
    /** Classes for the panel, e.g. its width. */
    className?: string;
    children?: ReactNode;
};
/** The scrim (modal only) and the panel: a header (title, close button), then `children`. */
export declare function DrawerPopup({ title, description, closeLabel, className, children, ...popup }: DrawerPopupProps): import("react").JSX.Element;
export {};
