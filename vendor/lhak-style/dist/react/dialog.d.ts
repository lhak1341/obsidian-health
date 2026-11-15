import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import type { ReactNode } from 'react';
export type DialogProps = BaseDialog.Root.Props;
/** The dialog's root: holds the open state (`open`/`onOpenChange`, or uncontrolled). */
export declare function Dialog(props: DialogProps): import("react").JSX.Element;
export type DialogTriggerProps = BaseDialog.Trigger.Props;
/** Opens the dialog. Pass `render={<Button />}` for the kit's button look. */
export declare function DialogTrigger(props: DialogTriggerProps): import("react").JSX.Element;
export type DialogCloseProps = BaseDialog.Close.Props;
/** Closes the dialog. Pass `render={<Button />}` for the kit's button look. */
export declare function DialogClose(props: DialogCloseProps): import("react").JSX.Element;
export type DialogPopupProps = Pick<BaseDialog.Popup.Props, 'initialFocus' | 'finalFocus' | 'onKeyDown'> & {
    /** Names the dialog (`aria-labelledby`). */
    title: ReactNode;
    /** Describes the dialog (`aria-describedby`). */
    description?: ReactNode;
    /** The header's close button is shown but inert, e.g. while a save runs. */
    closeDisabled?: boolean;
    /** Classes for the popup, e.g. its width. */
    className?: string;
    children?: ReactNode;
};
/** The scrim and the dialog box: a header (title, close button), then `children`. */
export declare function DialogPopup({ title, description, closeDisabled, className, children, ...popup }: DialogPopupProps): import("react").JSX.Element;
