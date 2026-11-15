// The @lhak/style adoption check: no raw colours, px font sizes or retired
// prefixes. styles.css is generated from styles.src.css, so only the source is
// linted (see the `lint` script).
export default { extends: ["@lhak/style/stylelint"] };
