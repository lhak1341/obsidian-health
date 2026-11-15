import type { LucideIcon, LucideProps } from 'lucide-react';
export type IconStep = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type IconProps = Omit<LucideProps, 'size' | 'strokeWidth' | 'absoluteStrokeWidth' | 'ref'> & {
    /** A lucide-react icon, e.g. `RotateCcw`. */
    icon: LucideIcon;
    /**
     * The UI step of the text the icon sits next to. Leave it out when the icon
     * shares an element with that text: it then follows the font size it inherits.
     */
    step?: IconStep;
    /** Names a meaningful icon. Without it the icon is decorative and hidden from assistive tech. */
    label?: string;
};
export declare function Icon({ icon: Glyph, step, label, className, ...props }: IconProps): import("react").JSX.Element;
