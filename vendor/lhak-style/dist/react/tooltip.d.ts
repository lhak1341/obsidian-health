import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import type { ReactElement, ReactNode } from 'react';
export type TooltipProps = Pick<BaseTooltip.Positioner.Props, 'side' | 'align'> & Pick<BaseTooltip.Trigger.Props, 'delay' | 'closeDelay'> & Pick<BaseTooltip.Root.Props, 'disabled'> & {
    /** What the tooltip shows. */
    content: ReactNode;
    /**
     * The trigger's accessible name (`aria-label`). Defaults to `content` when
     * that is a string; required otherwise, unless the trigger has a text name.
     */
    label?: string;
    /** The trigger: one element that takes a ref and DOM props, e.g. a button. */
    children: ReactElement;
    /** Classes for the tooltip box. */
    className?: string;
};
export declare function Tooltip({ content, label, children, side, align, delay, closeDelay, disabled, className }: TooltipProps): import("react").JSX.Element;
export type TooltipProviderProps = BaseTooltip.Provider.Props;
/**
 * Groups tooltips (a toolbar): once one shows, its neighbours show at once.
 * Optional; a lone tooltip needs none.
 */
export declare function TooltipProvider(props: TooltipProviderProps): import("react").JSX.Element;
