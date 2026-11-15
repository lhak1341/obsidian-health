import { NumberField } from '@base-ui/react/number-field';
import { type ComponentProps, type ReactNode } from 'react';
export type NumberStepperProps = Omit<ComponentProps<typeof NumberField.Root>, 'className' | 'children'> & {
    /** A visible label. Without it, name the stepper with `aria-label`. */
    label?: ReactNode;
    'aria-label'?: string;
    /** Classes for the − value + group. */
    className?: string;
};
export declare function NumberStepper({ label, 'aria-label': ariaLabel, id, className, ...root }: NumberStepperProps): import("react").JSX.Element;
