// @lhak/style stylelint: the adoption check (SPEC "Stylelint config", wayfinder
// ticket 016). CSS is "adopted" when it passes: no raw colour literals, no `px`
// font sizes and none of the retired prefixes, outside token files.
//
// Hand-written, not generated. Consumers extend it:
//   export default { extends: ['@lhak/style/stylelint'] };
//
// stylelint anchors an extended config's relative `ignoreFiles` globs at this
// file's directory, so `*.css` means the package's own CSS wherever it is
// installed, and globs meant for the consumer's tree start with `/**/`.

/** Custom-property prefixes the apps used before `--lk-`. */
const RETIRED_PREFIXES = ['lhk', 'ltk', 'hlth', 'cp', 'pkx'];

const retired = RETIRED_PREFIXES.join('|');

/** CSS colour functions. A call is a raw literal unless its channels read a var(). */
const COLOUR_FUNCTIONS = ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color'];

// A colour function call with no var() before its first `)`, so Obsidian's
// `rgba(var(--mono-rgb-100), 0.1)` passes and `rgb(0 0 0 / 50%)` does not.
const literalColourFunction = `/\\b(${COLOUR_FUNCTIONS.join('|')})\\((?![^)]*\\bvar\\()/i`;

export default {
  ignoreFiles: [
    '*.css',
    // node_modules needs no entry: stylelint skips it by default.
    '/**/vendor/lhak-style/**',
    '/**/*tokens*.css',
    '/**/tokens/**/*.css',
  ],
  rules: {
    'color-no-hex': [true, { message: 'Use a --lk- colour role, not a hex literal' }],
    'color-named': ['never', { message: 'Use a --lk- colour role, not a named colour' }],
    'declaration-property-value-disallowed-list': [
      { '/.*/': [literalColourFunction] },
      { message: (prop, value) => `Use a --lk- colour role, not a colour literal in ${prop}: ${value}` },
    ],
    'declaration-property-unit-disallowed-list': [
      { 'font-size': ['px'], font: ['px'] },
      { message: 'Use rem, em or a type token for font sizes, not px' },
    ],
    // Checks declarations and var() reads alike.
    'custom-property-pattern': [
      `^(?!(${retired})-)`,
      { message: (name) => `${name} uses a retired prefix: rename it to --lk- or the app's own prefix` },
    ],
  },
};
