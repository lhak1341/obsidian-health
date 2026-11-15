import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import type { ComponentProps } from 'react';
type WithClass<P> = Omit<P, 'className'> & {
    className?: string;
};
export type TabsProps = WithClass<ComponentProps<typeof BaseTabs.Root>>;
export declare function Tabs({ className, ...props }: TabsProps): import("react").JSX.Element;
/** Name the list with `aria-label` (or `aria-labelledby`). */
export type TabListProps = WithClass<ComponentProps<typeof BaseTabs.List>>;
export declare function TabList({ className, children, ...props }: TabListProps): import("react").JSX.Element;
export type TabProps = WithClass<ComponentProps<typeof BaseTabs.Tab>>;
export declare function Tab({ className, ...props }: TabProps): import("react").JSX.Element;
export type TabPanelProps = WithClass<ComponentProps<typeof BaseTabs.Panel>>;
export declare function TabPanel({ className, ...props }: TabPanelProps): import("react").JSX.Element;
export {};
