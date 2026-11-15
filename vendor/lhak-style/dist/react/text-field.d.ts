import { Input } from '@base-ui/react/input';
import type { ComponentProps } from 'react';
type Invalid = {
    /** Marks the value invalid: sets `aria-invalid` and the danger border. */
    invalid?: boolean;
};
export type TextFieldProps = Omit<ComponentProps<typeof Input>, 'className'> & Invalid & {
    className?: string;
};
export declare function TextField({ invalid, className, ...props }: TextFieldProps): import("react").JSX.Element;
export type TextareaProps = ComponentProps<'textarea'> & Invalid;
export declare function Textarea({ invalid, className, ...props }: TextareaProps): import("react").JSX.Element;
export {};
