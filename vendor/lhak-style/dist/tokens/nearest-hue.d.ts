import { type Hue } from './contract.ts';
/**
 * The contract hue nearest `colour`: a hex colour (`#rgb`, `#rgba`, `#rrggbb`,
 * `#rrggbbaa`, any case; alpha ignored) or a hue name, which maps to itself so a
 * migration can run twice. Returns `undefined` for anything else.
 * A later hue in `HUES` wins only when strictly nearer. No test pins this: no
 * 8-bit colour found ties exactly (the nearest, `#8b985c`, misses by 3.7e-8).
 */
export declare function nearestHue(colour: string): Hue | undefined;
