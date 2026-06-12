# CLAUDE.md — Sprinkler App

> App-specific guide. Workspace [`../CLAUDE.md`](../CLAUDE.md), [`../EPIC.md`](../EPIC.md), and
> [`../ops/`](../ops/README.md) still apply — this adds only what's specific to the Sprinkler app.

## What this is
- **Repo:** `jjj-dsg/sprinkler-app` · **Tier:** 0 today (client-only) → **Tier 1 if it adds accounts/sync**
- **Stack:** React / TS / Vite · `build:mobile` (Capacitor) · CI with `deploy:prod` + preview-deploy
- **Monetization:** TBD — paid app, one-off pro unlock, or freemium. **Decide with `finance-lead` before adding any backend.**
- **Definition of demoable:** a homeowner lays out an irrigation plan and gets a usable schedule.

## How to work here (the loop)
1. **Spec first** → `docs/specs/` (see [docs/specs/README.md](docs/specs/README.md)).
2. **Track** as an Issue with `app:sprinkler` + type + priority on the DSG Portfolio board.
3. **Build** to spec; telemetry events part of "done" (`../ops/playbooks/telemetry-and-monitoring.md`).
4. **Gate:** existing CI (`ci.yml` test + deploy) green + unit/coverage; `/code-review`; `qa-lead` sign-off.
5. **Release:** web deploys via CI on merge to main; mobile via `build:mobile` when targeting stores.

## The team to call (`../.claude/agents/`)
`product-owner` · `engineering-lead` · `qa-lead` · `release-manager` · `finance-lead` (monetization model).

## App-specific watch-items
- **Resist backend creep.** Staying Tier 0 is the cheapest, lowest-toil path. Only add accounts/cloud-sync
  if the economics justify it — that decision promotes it to Tier 1 and inherits billing/account support.
- Keep it simple; this is a utility proof point, not a platform.
