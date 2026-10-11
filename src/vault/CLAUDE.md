# Vault read/write conventions (src/vault)

- Every frontmatter write goes through `writer.ts`'s `writeFrontmatter()`, which does not
  resolve until `metadataCache`'s `"changed"` event fires for that file (with a timeout
  fallback). This exists because `getFileCache` can return pre-write data after
  `processFrontMatter` resolves. A caller doing `scanVault()`/`reload()` right after any
  `writer.ts` write can trust the result — no manual in-memory patching.
- Marker frontmatter keys are snake_case for camelCase `MarkerNote` fields (`alt_unit`,
  `alt_factor`, `source_url`, `year_planned`, `optimal_high`/`optimal_low`) — get the casing
  wrong and the field silently parses as `undefined`, no error. Stayed prose (mechanize sweep
  2026-08-31): the typo happens in hand-authored vault notes, outside the repo, so no build-time
  gate can see it. Reversed by a read-time validator in `reader.ts` that warns on an unknown
  camelCase key — a product change, not a gate.
- `fixtures/fake-app.ts` — minimal in-memory `App` fake (the `vault` / `metadataCache` /
  `fileManager` subset `reader.ts` and `writer.ts` use). Supports injecting a mid-batch write
  failure via `failOn`, and simulating re-index lag via `deferIndexing` +
  `flushMetadataCache(path)`. Also has `vault.read`/`vault.modify` for raw (non-frontmatter)
  file content, e.g. a `.base` file. Reuse it rather than rebuilding.
- Patch, don't round-trip: a writer that changes one field mutates only that key inside the live `writeFrontmatter` callback (`saveMarkerOrder`, `saveMarkerTarget`). Rebuilding the note from a parsed
  `ProfileNote`/`MarkerNote` writes a stale snapshot over newer edits and drops keys the reader doesn't model. Full-form saves (`saveProfileNote`) are the exception.
