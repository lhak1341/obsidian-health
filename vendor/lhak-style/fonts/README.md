# Bundled fonts

`dist/fonts.css` declares these faces for the Tauri apps. Plugins take no fonts (ticket 015).

| File | Family | Version | Licence |
|---|---|---|---|
| `WorkSans-wght.woff2` | Work Sans, upright, variable wght 100–900 | 2.012 | OFL 1.1, `OFL-WorkSans.txt` |
| `SUSE-wght.woff2` | SUSE, upright, variable wght 100–900 | 2.001 | OFL 1.1, `OFL-SUSE.txt` |
| `SUSE-Italic-wght.woff2` | SUSE, italic, variable wght 100–900 | 2.001 | OFL 1.1, `OFL-SUSE.txt` |
| `RoundedMplus1c-Regular.woff2` | Rounded Mplus 1c, 400 | 1.059 | OFL 1.1, `OFL-RoundedMplus1c.txt` |
| `RoundedMplus1c-Bold.woff2` | Rounded Mplus 1c, 700 | 1.059 | OFL 1.1, `OFL-RoundedMplus1c.txt` |

**Licences verified (2026-11-12)** from each font's own `name` table (ID 0 copyright, ID 13 licence), read with fontTools from the copies installed in `~/Library/Fonts`:
- Work Sans: "Copyright 2019 The Work Sans Project Authors", "licensed under the SIL Open Font License, Version 1.1".
- SUSE: "Copyright 2025 The SUSE Project Authors", OFL 1.1.
- Rounded Mplus 1c (`MPLUSRounded1c-*.ttf`, family name "Rounded Mplus 1c"): "Copyright 2016 The Rounded M+ Project Authors", OFL 1.1. This is the Google Fonts release, so the M+ licence that ticket 007 suspected does not apply to these files.

None of the names are Reserved Font Names, so converting to woff2 under the same names is allowed. Each `OFL-*.txt` is the OFL 1.1 text under that font's copyright line.

**Converted** with `fontTools` (`TTFont(src).flavor = 'woff2'`), no subsetting. Work Sans Italic is left out: Work Sans's italic partner is SUSE (ticket 007).

**Never bundled:** Bookerly (Amazon's, not redistributable; falls back to Iowan Old Style) and Noto Sans SC (too large; falls back to PingFang SC). Both stay installed-only.
