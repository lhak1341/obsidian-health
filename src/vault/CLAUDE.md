# Vault read/write conventions (src/vault)

- Every frontmatter write goes through `writer.ts`'s `writeFrontmatter()`, which does not
  resolve until `metadataCache`'s `"changed"` event fires for that file (with a timeout
  fallback). This exists because `getFileCache` can return pre-write data after
  `processFrontMatter` resolves. A caller doing `scanVault()`/`reload()` right after any
  `writer.ts` write can trust the result — no manual in-memory patching.
- Marker frontmatter keys are snake_case for camelCase `MarkerNote` fields (`alt_unit`,
  `alt_factor`, `source_url`, `year_planned`, `optimal_high`/`optimal_low`) — get the casing
  wrong and the field silently parses as `undefined`, no error.
- `fixtures/fake-app.ts` — minimal in-memory `App` fake (the `vault` / `metadataCache` /
  `fileManager` subset `reader.ts` and `writer.ts` use). Supports injecting a mid-batch write
  failure via `failOn`, and simulating re-index lag via `deferIndexing` +
  `flushMetadataCache(path)`. Also has `vault.read`/`vault.modify` for raw (non-frontmatter)
  file content, e.g. a `.base` file. Reuse it rather than rebuilding.
