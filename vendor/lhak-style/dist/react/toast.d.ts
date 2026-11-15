import { Toast as BaseToast } from '@base-ui/react/toast';
import type { ReactNode } from 'react';
/** A toast's status, passed as its `type`. Each shows an icon named by a word, never colour alone. */
export type ToastStatus = 'success' | 'error' | 'warning' | 'info';
/** Queues toasts from outside React (pass it to `ToastProvider`). */
export declare const createToastManager: typeof BaseToast.createToastManager;
export type ToastManager = ReturnType<typeof createToastManager>;
/** Adds, updates and closes toasts from inside `ToastProvider`. */
export declare const useToastManager: typeof BaseToast.useToastManager;
export type ToastProviderProps = {
    children?: ReactNode;
    /** A manager from `createToastManager`, to add toasts from outside React. */
    toastManager?: ToastManager;
    /** Toasts shown at once; older ones are put out of reach. Default 3. */
    limit?: number;
    /** Milliseconds before a toast closes itself; `0` keeps it. Default 4000; a toast's own `timeout` wins. */
    timeout?: number;
};
/** Holds the toasts and renders the stack in the bottom-right corner. Wrap the app once. */
export declare function ToastProvider({ children, toastManager, limit, timeout }: ToastProviderProps): import("react").JSX.Element;
