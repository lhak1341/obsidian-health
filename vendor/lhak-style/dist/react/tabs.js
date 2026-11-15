import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Tabs (SPEC user stories 38, 40): Base UI's Tabs with the kit's classes
// (src/styles/tabs.css). TabList draws the sliding indicator itself, so a
// consumer writes only Tabs, TabList, Tab and TabPanel.
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { cx } from "./cx.js";
export function Tabs({ className, ...props }) {
    return _jsx(BaseTabs.Root, { ...props, className: cx('lk-tabs', className) });
}
export function TabList({ className, children, ...props }) {
    return (_jsxs(BaseTabs.List, { ...props, className: cx('lk-tabs__list', className), children: [children, _jsx(BaseTabs.Indicator, { className: "lk-tabs__indicator" })] }));
}
export function Tab({ className, ...props }) {
    return _jsx(BaseTabs.Tab, { ...props, className: cx('lk-tab', className) });
}
export function TabPanel({ className, ...props }) {
    return _jsx(BaseTabs.Panel, { ...props, className: cx('lk-tab-panel', className) });
}
