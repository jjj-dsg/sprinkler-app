# Specs — Sprinkler App

Spec-driven development per [`../../../ops/playbooks/spec-driven-development.md`](../../../ops/playbooks/spec-driven-development.md).

**Rule:** anything that changes user-visible behavior, touches money/auth/data, or spans >2 files
gets a spec here *before* code. Pure typo/style fixes don't — just open an Issue.

- **Template:** [`0000-template.md`](0000-template.md) — copy it to `NNNN-short-title.md` (next number).
- **Lifecycle:** Draft → Ready (Definition of Ready met) → In progress → Shipped (frozen as the record).
- Each spec's acceptance criteria must be testable; `qa-lead` maps them to automated checks.
- Link the spec to its tracking Issue (`app:sprinkler` + `spec`/`feat`/`fix`).

Current specs:
- [`0001-test-pyramid-and-release-readiness.md`](0001-test-pyramid-and-release-readiness.md) — **Shipped** — lib refactor, test pyramid, Vercel/TestFlight readiness ([ADR 0001](../adr/0001-lib-refactor-and-test-pyramid.md)).
