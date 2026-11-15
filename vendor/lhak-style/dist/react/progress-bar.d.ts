import { Progress } from '@base-ui/react/progress';
import type { ComponentProps } from 'react';
export type ProgressBarProps = Omit<ComponentProps<typeof Progress.Root>, 'className' | 'children' | 'aria-valuetext'> & {
    /** Names the bar. */
    label: string;
    /** Keep the label for assistive tech only, with no row above the track. */
    hideLabel?: boolean;
    /** Replaces the formatted percentage, on screen and for assistive tech, e.g. "3 of 8 chunks". */
    valueText?: string;
    className?: string;
};
export declare function ProgressBar({ label, hideLabel, valueText, className, ...props }: ProgressBarProps): import("react").JSX.Element;
