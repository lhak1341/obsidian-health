import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { Radio as BaseRadio } from '@base-ui/react/radio';
import { type RadioGroupProps as BaseRadioGroupProps } from '@base-ui/react/radio-group';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import type { ComponentProps, ReactNode } from 'react';
type Labelled = {
    /** The label text. Without it, name the control with `aria-label`. */
    children?: ReactNode;
    className?: string;
};
export type CheckboxProps = Omit<ComponentProps<typeof BaseCheckbox.Root>, 'className' | 'children'> & Labelled;
export declare function Checkbox({ children, className, ...props }: CheckboxProps): string | number | bigint | boolean | Iterable<ReactNode> | Promise<string | number | bigint | boolean | import("react").ReactPortal | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | import("react").JSX.Element | null | undefined;
export type RadioGroupProps<Value = string> = Omit<BaseRadioGroupProps<Value>, 'className'> & {
    className?: string;
};
export declare function RadioGroup<Value = string>({ className, ...props }: RadioGroupProps<Value>): import("react").JSX.Element;
export type RadioProps<Value = string> = Omit<BaseRadio.Root.Props<Value>, 'className' | 'children'> & Labelled;
export declare function Radio<Value = string>({ children, className, ...props }: RadioProps<Value>): string | number | bigint | boolean | Iterable<ReactNode> | Promise<string | number | bigint | boolean | import("react").ReactPortal | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | import("react").JSX.Element | null | undefined;
export type SwitchProps = Omit<ComponentProps<typeof BaseSwitch.Root>, 'className' | 'children'> & Labelled;
export declare function Switch({ children, className, ...props }: SwitchProps): string | number | bigint | boolean | Iterable<ReactNode> | Promise<string | number | bigint | boolean | import("react").ReactPortal | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | import("react").JSX.Element | null | undefined;
export {};
