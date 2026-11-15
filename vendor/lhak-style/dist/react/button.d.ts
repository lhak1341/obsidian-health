import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps } from 'react';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type BaseProps = Omit<ComponentProps<typeof BaseButton>, 'className'> & {
    /** Default `secondary`. */
    variant?: ButtonVariant;
    className?: string;
};
/** An icon-only button has no text, so it needs an `aria-label`. */
export type ButtonProps = (BaseProps & {
    iconOnly?: false;
}) | (BaseProps & {
    iconOnly: true;
    'aria-label': string;
});
export declare function Button({ variant, iconOnly, className, type, ...props }: ButtonProps): import("react").JSX.Element;
export {};
