# ADR 0001 — Extract domain logic into `src/lib` and adopt a real test pyramid

- **Status:** Accepted
- **Date:** 2026-06-12
- **App:** sprinkler

## Context
`src/App.tsx` was a 631-line monolith carrying all domain logic (geometry,
water-savings, recommendations, geocoding), the static data tables, the React
view, **and** a hand-rolled `runTests()` harness — behind a `// @ts-nocheck` and
a blanket `eslint-disable`. Symptoms:

- 34 lint errors hidden by the disable comments; no type safety in the largest file.
- Unit tests imported from `../App`, forcing the whole component (Leaflet shim,
  lucide-react, ProPlanCard) to load just to test a pure function.
- Two parallel sources of truth: `runTests()` in the component vs. the Vitest suite.
- Areas/savings were computed at a hard-coded `PX_PER_FT = 3` regardless of the
  live map zoom — a latent correctness bug.
- The `scale.test.ts` suite asserted literal constants (`expect(25).toBe(25)`),
  giving green checks with ~zero real coverage.

## Decision
1. **Move all pure logic to `src/lib/`** — `types`, `data`, `geometry`, `savings`,
   `recommendations`, `location`, plus a minimal `leaflet` type surface (Leaflet
   loads from CDN, so we type only the subset we call rather than bundle it).
   `App.tsx` becomes a typed view that imports these. `@ts-nocheck` and the
   eslint-disable are removed.
2. **Single source of truth for the in-app self-test.** `selftest.ts` runs its
   assertions against the *same* lib functions the Vitest suite uses, so the
   landing-page "Self-test: N/N passing" badge can never disagree with CI. A
   Vitest test (`selftest.test.ts`) asserts the badge is all-green.
3. **Thread the live map scale (`pxPerFt`)** through `polyAreaFt`/`areaSplit`/
   `savings`/`buildRecs`, defaulting to `PX_PER_FT` for tests. Fixes zoom-dependent area math.
4. **Test pyramid:** Vitest unit/regression suites per lib module with a coverage
   gate (90/85/90/90); Playwright E2E/BDD against the built app in deterministic
   offline grid mode; a Playwright visual harness that emits labeled PNGs for
   human/AI inspection. CI runs lint → coverage → build → E2E as release gates.

## Consequences
- **+** `App.tsx` is type-checked; lint is 0 errors and now *blocking* in CI.
- **+** Logic is testable in isolation; coverage on `src/lib` is ~99% statements.
- **+** Deterministic, network-free E2E (the CDN/geocoder are route-aborted).
- **+** Found & fixed a real bug: the SVG overlay's permanent `pointerEvents:none`
  meant offline grid-mode drawing never worked. The overlay now captures clicks
  whenever Leaflet isn't handling them.
- **−** More files to navigate (mitigated by clear module boundaries).
- **−** `autoPlace` ids changed from `Date.now()+random` to a deterministic
  sequence so output is snapshot-stable; any external code depending on the old
  id shape must not assume randomness (none does today).

## Alternatives considered
- *Keep the monolith, just add types* — rejected; the test-import coupling and the
  duplicated harness would remain.
- *Bundle Leaflet via npm + `@types/leaflet`* — rejected for now; the CDN load keeps
  the JS bundle small and the minimal local type surface is enough.
