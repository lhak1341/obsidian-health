import { Slider as BaseSlider } from '@base-ui/react/slider';
import type { ComponentProps, ReactNode } from 'react';
export type SliderProps = Omit<ComponentProps<typeof BaseSlider.Root<number>>, 'className' | 'children'> & {
    /** A visible label. Without it, name the slider with `aria-label`. */
    label?: ReactNode;
    'aria-label'?: string;
    /** Shows the formatted value beside the label. */
    showValue?: boolean;
    className?: string;
};
export declare function Slider({ label, 'aria-label': ariaLabel, showValue, className, ...root }: SliderProps): import("react").JSX.Element;
