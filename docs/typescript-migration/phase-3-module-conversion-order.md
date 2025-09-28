# Phase 3 – Module Conversion Order

This playbook defines the conversion sequence for migrating the existing JavaScript modules to TypeScript. It keeps the blast radius small by upgrading the least-connected utilities first, then moving outward toward components that coordinate DOM behaviour. Each wave should land as an individually reviewable pull request that compiles, passes tests, and preserves the current localStorage data contracts.

## Goals

- Surface typing issues early by converting foundational utilities before UI controllers.
- Keep the app working at every checkpoint so the migration can ship incrementally.
- Rename co-located tests from `*.test.js` to `*.test.ts`/`*.spec.ts` when their subject module switches to TypeScript.
- Require `pnpm check`, `pnpm test`, and `pnpm build` to succeed after each wave.

## Guiding Principles

1. **Stabilise shared primitives first.** Modules such as `constants` and `asset-path` have no DOM coupling and feed many downstream imports, so convert them before higher-level features.
2. **Respect dependency direction.** Only upgrade a consumer after its providers already expose TypeScript types.
3. **Keep pull requests focused.** Each wave should modify a tight set of modules plus their associated tests and type definitions.
4. **Use `.d.ts` authoring as a stop-gap.** When a module cannot yet be converted because a dependency is still JavaScript, add or adjust ambient declarations so TypeScript consumers remain typed.

## Conversion Waves

### Wave 1 – Core constants and helpers

| Module | Notes |
| --- | --- |
| `src/constants.js` → `constants.ts` | Standalone data bag consumed across the app. Generates shared literal types (categories) once converted. |
| `src/asset-path.js` → `asset-path.ts` | Pure helper with no dependencies except `import.meta`. Conversion unlocks type-safe asset references for later waves. |
| `src/types/` updates | Promote reusable literal/utility types extracted from the converted modules. Keep ambient `.d.ts` definitions in sync. |

*Validation*: Run `pnpm check`, `pnpm test`, `pnpm build`.

### Wave 2 – Data validation and map metadata

| Module | Depends on | Notes |
| --- | --- | --- |
| `src/validation.js` → `validation.ts` | `constants.ts` | Provides reusable guards. Converting after `constants` exposes typed category unions and refines DOMPurify usage signatures. |
| `src/map-definitions.js` → `map-definitions.ts` | `asset-path.ts`, `validation.ts` types | Converts static map config and helper selectors. Confirm exported functions continue reading from localStorage safely. |
| `tests/filter-manager.test.js` rename | Updated helper types ripple into tests that import validators; rename to `.test.ts` and fix import paths. |

*Validation*: `pnpm check`, `pnpm test`, `pnpm build`.

### Wave 3 – Persistence stores

| Module | Depends on | Notes |
| --- | --- | --- |
| `src/collection-store.js` → `collection-store.ts` | `map-definitions.ts`, `validation.ts` | Handles localStorage IO; conversion clarifies serialised shape (`Record<MarkerId, boolean>`). |
| `src/preferences-store.js` → `preferences-store.ts` | `validation.ts`, storage keys | Ensure discriminated unions represent the persisted structure. |
| `tests/add_marker.test.js` rename | Align test filename once the collection store is typed. Update mocks for localStorage typings if needed. |

*Validation*: `pnpm check`, `pnpm test`, `pnpm build`.

### Wave 4 – Icon and filter utilities

| Module | Depends on | Notes |
| --- | --- | --- |
| `src/icons.js` → `icons.ts` | `constants.ts` | Produces Leaflet `DivIcon` instances. Type definitions ensure mask/color options remain explicit. |
| `src/filter-manager.js` → `filter-manager.ts` | `icons.ts`, stores | Converts orchestration logic for category toggles. Update any helper types reused by UI panes. |
| `src/url-state.js` → `url-state.ts` | filter + store types | Converts query parameter helpers to typed interfaces, enabling strict URL synchronisation. |

*Validation*: `pnpm check`, `pnpm test`, `pnpm build`.

### Wave 5 – UI panels and controllers

| Module | Depends on | Notes |
| --- | --- | --- |
| `src/filter-pane.js` → `filter-pane.ts` | `filter-manager.ts`, icons | DOM-binding logic for filter checkboxes. Introduce discriminated unions for event payloads. |
| `src/search-panel.js` → `search-panel.ts` | stores, validators | Type the search results pipeline to guard DOM template generation. |
| `src/about.js` → `about.ts` | static content | Simple view script; low risk once shared utilities are typed. |

*Validation*: `pnpm check`, `pnpm test`, `pnpm build`.

### Wave 6 – Map rendering and application entrypoint

| Module | Depends on | Notes |
| --- | --- | --- |
| `src/map-view.js` → `map-view.ts` | `icons.ts`, Leaflet ambient types | Largest Leaflet integration point. Ensure the existing `src/types/leaflet-extensions.d.ts` declarations cover custom controls. |
| `src/app-controller.js` → `app-controller.ts` | map view, stores, panes | Central coordinator tying everything together. Prior waves must be complete first. |
| `src/main.js` → `main.ts` | controller | Final entry point; confirm Vite resolves `.ts` entry without extra config beyond baseline. |

*Validation*: `pnpm check`, `pnpm test`, `pnpm build`, verify manual smoke test via `pnpm dev` if possible.

## Post-conversion Cleanup

- Enable `noImplicitAny` and `strictNullChecks` if not already enforced once all modules are typed.
- Remove obsolete `.js` stubs and ensure package exports point to `.ts` outputs (or compiled `.js` equivalents in `dist/`).
- Audit `docs/typescript-migration/baseline.md` and update coverage/build snapshots after the final wave.
- Capture fresh screenshots matching the baseline checklist to confirm no UI regressions.
