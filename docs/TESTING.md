# Testing — SprinklerSmart

A pyramid: fast pure-logic units at the base, BDD end-to-end over the real UI at
the top, and a visual harness so a human **or an AI** can see any state directly.

## Commands
| Command | What it does |
|---|---|
| `npm run test` | Vitest unit/regression suites (one run). |
| `npm run test:unit` | Vitest in watch mode. |
| `npm run coverage` | Vitest + v8 coverage; **fails** under 90/85/90/90 on `src/lib`. |
| `npm run test:e2e` | Playwright BDD E2E against the built app (Chromium). |
| `npm run screenshots` | Playwright visual harness → labeled PNGs in `screenshots/`. |
| `npm run verify` | lint → coverage → e2e (the local pre-push gate). |

Locally the Playwright config reuses the system Chromium at
`/usr/bin/chromium-browser` (override with `CHROMIUM_BIN`); CI installs the
bundled browser. E2E runs on a dedicated port (4317) to avoid colliding with
sibling projects' preview servers.

## Layer 1 — unit / regression (Vitest)
`src/lib/__tests__/*.test.ts`, one suite per module. Pure functions only, no DOM
needed for most. Includes a **data-integrity** suite (catches typos/bad refs in
the static tables) and a **self-test** suite that asserts the in-app
"Self-test: N/N" badge is all-green — so the badge and CI can never disagree.

Add a test when you add or change a lib function. Keep them pure: build fixtures
with the `sq(x, y, ftSide)` helper (a square at the default px/ft scale).

## Layer 2 — BDD end-to-end (Playwright)
`e2e/planner.spec.ts` drives the **built** app through the core loop, mapped to
`specs/SPRINKLER_PLANNER.spec.md`. Tests force deterministic **offline grid mode**
by aborting the Leaflet CDN, Google tiles, and Nominatim (`forceGridMode`), so
they're network-free and fast. Shared steps live in `e2e/helpers.ts`.

## Layer 3 — visual inspection (humans + AI)
`e2e/visual.spec.ts` captures `screenshots/01-landing.png` … `06-mobile-plan.png`.
These are **not** assertions — they're a fast way to *see* the app:
- A human opens the PNGs (or the Playwright HTML report).
- An AI agent reads the PNG files directly to verify a change looks right.

`screenshots/` is gitignored; regenerate any time with `npm run screenshots`.

## CI gate
`.github/workflows/ci.yml`: lint → coverage (gate) → build → Playwright E2E.
Any failure blocks deploy. Coverage and the Playwright report upload as artifacts.

## When you touch the app
1. Update/author the spec (`docs/specs/`) if behavior changes.
2. Add/adjust the unit test(s) for any lib change.
3. Add/adjust an E2E scenario for any user-visible flow change.
4. `npm run verify` green, then eyeball `npm run screenshots`.
