import { jsx as _jsx } from "react/jsx-runtime";
// The stat figure (SPEC user stories 44 and 50): a number that rolls to its new
// value, on @number-flow/react. Number changes run at the slow tier on the enter
// curve, digits fading in half that time: the motion lab's accepted preset
// (wayfinder ticket 012, prototypes/motion-lab/src/App.jsx).
//
// Under the translator's CSP, NumberFlow's shadow-root <style> needs the hashes
// in `@lhak/style/csp` in `style-src`.
import NumberFlow, {} from '@number-flow/react';
// src/tokens/values.ts `duration-slow` and `ease-expo-out`, copied because the React build's
// rootDir is src/react; stat-figure.test.tsx pins them to values.ts.
const SLOW_MS = 300;
const EASE_EXPO_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const ROLL = { duration: SLOW_MS, easing: EASE_EXPO_OUT };
const FADE = { duration: SLOW_MS / 2, easing: 'ease-out' };
export function StatFigure(props) {
    return _jsx(NumberFlow, { ...props, transformTiming: ROLL, spinTiming: ROLL, opacityTiming: FADE });
}
