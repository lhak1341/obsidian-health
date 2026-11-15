import { jsx as _jsx } from "react/jsx-runtime";
// The kit root (SPEC "Kit"): mount it once, around the whole app.
// It is the theme provider, and it stops Base UI injecting <style> elements,
// which the translator's `style-src 'self'` blocks. kit.css ships the rules
// Base UI would have injected, so an app imports `@lhak/style/kit.css` with it.
import { CSPProvider } from '@base-ui/react/csp-provider';
import { ThemeProvider } from "./theme.js";
export function KitRoot({ children, ...theme }) {
    return (_jsx(ThemeProvider, { ...theme, children: _jsx(CSPProvider, { disableStyleElements: true, children: children }) }));
}
