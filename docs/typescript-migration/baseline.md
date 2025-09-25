# TypeScript Migration Baseline

This document captures the baseline state before starting the TypeScript migration. It records quality gate results, storage keys that need to be preserved, and operational checkpoints so that the migration can proceed incrementally without breaking existing features.

## Baseline Quality Gates

| Command | Status | Notes |
| --- | --- | --- |
| `pnpm check` | ⚠️ *Formatter diff only* | Fails on Node.js 20 because Biome wants to rewrite `.vscode/settings.json`. Run `pnpm fix` before landing migration changes or execute `pnpm check` with Node.js 22.19+ to avoid the engine warning. |
| `pnpm test` | ✅ Passed | Vitest suite (`tests/add_marker.test.js`, `tests/filter-manager.test.js`) passes with 100% statement/branch/function coverage. |
| `pnpm build` | ✅ Passed | Vite generates production assets under `dist/` (see artifact summary below). |

### Build Artifact Snapshot

| File | Size | gzip |
| --- | --- | --- |
| `dist/index.html` | 6.29 kB | 2.04 kB |
| `dist/about.html` | 3.07 kB | 1.21 kB |
| `dist/assets/main-BN4-vjHz.js` | 57.96 kB | 18.83 kB |
| `dist/assets/leaflet-BSbcx_7H.js` | 149.80 kB | 43.45 kB |
| `dist/assets/main-CIGW-MKW.css` | 15.61 kB | 6.46 kB |
| `dist/assets/styles-CH2StoYK.css` | 12.63 kB | 2.63 kB |

*(Values captured from the current build to detect unexpected growth during migration.)*

### Coverage Snapshot

- Coverage provider: V8
- Global coverage: **100% statements / 100% branches / 100% functions / 100% lines**

## LocalStorage Keys Inventory

These keys must remain compatible throughout the migration because existing users depend on the persisted data.

| Key | Purpose | Notes |
| --- | --- | --- |
| `collect-map:v1:{mapId}` | Marker collection toggles per map (`forest`, `desert`, `mountains`). | JSON object of `{ [markerId]: boolean }`. Invalid entries are automatically pruned. |
| `last-selected-map:v1` | Remembers the most recently viewed map. | Falls back to the default (`desert`) when absent or invalid. |
| `filter-categories:v1` | Stores the category filter state. | JSON object containing `selected` and `known` category lists. |
| `hide-collected:v1` | Persists the “Hide collected markers” toggle. | Boolean serialized as JSON.

## Screenshot Archive Checklist

Capture full-screen PNGs in `docs/typescript-migration/screenshots/` before the migration so regressions are easy to spot:

1. **Default load** – Desert map with untouched filters.
2. **Filter interaction** – Forest map with only Logs enabled to confirm icon visibility.
3. **Collection toggle** – Mountains map showing a mix of collected/uncollected states.
4. **Mobile layout** – Narrow viewport (~414px width) to capture responsive layout.

> Tip: Use `pnpm dev` and Leaflet’s built-in zoom controls to ensure identical framing across before/after screenshots.

## Migration Branch & Checkpoints

- Create a long-lived branch named `feature/typescript-migration` off `main`.
- Protect `main` by merging only via reviewed pull requests targeting the migration branch until the conversion stabilises.
- Recommended checkpoints:
  1. **Tooling foundation** – Add TypeScript, configure Vite + Vitest for `.ts`/`.tsx`, and introduce strict compiler options (`"strict": true`).
  2. **Shared utilities first** – Convert non-DOM modules (`validation`, `collection-store`, `preferences-store`, `filter-manager`) to TypeScript to surface type issues early.
  3. **Leaflet integration** – Migrate `map-view.js` with explicit Leaflet types and confirm the recording mode still logs coordinates.
  4. **Controller + entry point** – Convert `app-controller.js` and `main.js`, ensuring build output stays tree-shakeable.
  5. **Final clean-up** – Remove unused `.js` stubs, enable `noImplicitAny`, and rerun the baseline quality gates.

Document the results of each checkpoint (tests, lint, build, screenshots) in follow-up entries under this directory to keep the migration auditable.
