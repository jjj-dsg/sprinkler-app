# Code Review Guidance — sprinkler-app (SprinklerSmart)

Steering doc for Claude cloud code-review agents. Read before reviewing a diff here.

## Severity policy
- **Important** = logic bugs, security holes, or data-loss/corruption risks only.
  Examples: wrong water-savings math, unvalidated input crashing the planner,
  entitlement bypass, secret leakage, broken CI gate.
- Style, formatting, naming, and preference opinions are **never Important**.
  File them as **Nit** or skip them.
- **Cap: max 5 nits per review.** Once you hit 5, drop the rest — don't pad the
  report. Prefer surfacing the most consequential nit over the most obvious one.

## Paths to skip
- `package-lock.json`, any other lockfile
- `dist/`, `coverage/`, `test-results/`, `playwright-report/`, `screenshots/`
- `node_modules/`
- Anything under `ios/` or `android/` that is Capacitor-generated boilerplate
  (not hand-edited native code)
- Generated docs/exports (`*.html` builds of markdown, e.g. `LAUNCH_CHECKLIST.html`)

## Repo-specific checks
- **Spec/test alignment**: this is spec-driven (BDD scenarios in `specs/` and
  `docs/specs/`, Vitest unit/coverage, Playwright E2E in `e2e/`, GitHub Actions
  CI). If a diff changes behavior in `src/lib/`, confirm the matching spec and
  tests were updated too — flag as Important if a spec/test now lies about
  behavior, not just "missing test."
- **Domain logic lives in `src/lib/`**: `App.tsx` and other view code should
  stay thin composition — flag business/math logic (geometry, savings, ET
  water model, recommendations) leaking into components as Important only if
  it duplicates or diverges from the `src/lib/` source of truth; otherwise nit.
- **Entitlement / Pro-plan gating**: this app has a Stripe Pro Plan tier. Any
  feature-gate check (Pro-only export, parts list, etc.) MUST be enforced
  server-side (`api/`), never trusted from client state alone. A client-only
  entitlement check is an Important finding (bypassable paywall).
- **Capacitor surface**: changes touching `capacitor.config.ts` or native
  bridge calls (geolocation, etc.) should degrade gracefully offline/on web —
  flag missing permission or platform-guard handling as Important if it can
  crash, not just warn.

## DSG standards to enforce
- **TypeScript strictness**: no new `any`, no unchecked type assertions on
  external data (API responses, geolocation, Stripe webhooks).
- **No swallowed errors**: no empty `catch {}` blocks or `.catch(() => {})`
  with no logging/handling. Flag as Important.
- **Validate at boundaries**: any data crossing a trust boundary (API routes
  in `api/`, Stripe webhook payloads, geolocation/geocode responses) should be
  validated with Zod, not assumed well-formed.
- **No secrets in frontend code**: Stripe secret key, any server-only key,
  must live in `api/` (server) code only, never in `src/`. Flag any secret
  reference or `import.meta.env` use of a non-`VITE_`-public key in `src/` as
  Important.
