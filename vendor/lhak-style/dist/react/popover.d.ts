import { Popover as BasePopover } from '@base-ui/react/popover';
import type { ReactNode } from 'react';
export type PopoverProps = BasePopover.Root.Props;
/** The popover's root: holds the open state (`open`/`onOpenChange`, or uncontrolled). */
export declare function Popover(props: PopoverProps): import("react").JSX.Element;
export type PopoverTriggerProps = BasePopover.Trigger.Props;
/** Opens the popover. Pass `render={<Button />}` for the kit's button look. */
export declare function PopoverTrigger(props: PopoverTriggerProps): import("react").JSX.Element;
export type PopoverPopupProps = Pick<BasePopover.Positioner.Props, 'side' | 'align' | 'sideOffset'> & Pick<BasePopover.Popup.Props, 'initialFocus' | 'finalFocus'> & {
    /** Names the popup (`aria-labelledby`). Without it, pass `aria-label`. */
    title?: ReactNode;
    'aria-label'?: string;
    /** Classes for the popup. */
    className?: string;
    children?: ReactNode;
};
/** The floating box, placed next to its trigger (default: below, 4px away). */
export declare function PopoverPopup({ side, align, sideOffset, title, className, children, ...popup }: PopoverPopupProps): import("react").JSX.Element;
