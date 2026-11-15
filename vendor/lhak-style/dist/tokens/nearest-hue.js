// nearestHue: map a saved colour to the nearest of the 8 contract hues, by
// OKLab distance against the Capritarius light values (wayfinder ticket 016,
// adoption issue 01). LCAL and LEDG migrate their saved hex colours with it.
//
// Pure and dependency-free: it ships in the package root export, where culori
// (a dev dependency) is not available. src/tokens/nearest-hue.test.ts checks the
// conversion against culori.
import { HUES } from "./contract.js";
import { PRIMITIVES } from "./values.js";
const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
/** A hex colour as OKLab (formats: see nearestHue); alpha is dropped. */
function hexToOklab(hex) {
    const digits = HEX.exec(hex)?.[1];
    if (digits === undefined)
        return undefined;
    const full = digits.length <= 4 ? [...digits].map((d) => d + d).join('') : digits;
    const [r, g, b] = [0, 2, 4].map((i) => toLinear(parseInt(full.slice(i, i + 2), 16) / 255));
    // Björn Ottosson's linear sRGB to OKLab matrices (as culori and CSS Color 4 use).
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
}
/** The sRGB transfer function, inverted. */
function toLinear(c) {
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
const ANCHORS = HUES.map((hue) => [hue, hexToOklab(PRIMITIVES.capri.light.hues[hue])]);
/**
 * The contract hue nearest `colour`: a hex colour (`#rgb`, `#rgba`, `#rrggbb`,
 * `#rrggbbaa`, any case; alpha ignored) or a hue name, which maps to itself so a
 * migration can run twice. Returns `undefined` for anything else.
 * A later hue in `HUES` wins only when strictly nearer. No test pins this: no
 * 8-bit colour found ties exactly (the nearest, `#8b985c`, misses by 3.7e-8).
 */
export function nearestHue(colour) {
    if (HUES.includes(colour))
        return colour;
    const lab = hexToOklab(colour);
    if (lab === undefined)
        return undefined;
    let best;
    let bestDistance = Infinity;
    for (const [hue, anchor] of ANCHORS) {
        const distance = Math.hypot(lab[0] - anchor[0], lab[1] - anchor[1], lab[2] - anchor[2]);
        if (distance < bestDistance) {
            best = hue;
            bestDistance = distance;
        }
    }
    return best;
}
