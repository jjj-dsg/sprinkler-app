# SprinklerSmart — Credentials & Account-Setup Tracker

> Mirrors the pattern in `../../neon-merge/docs/release/account-setup-and-api-access.md`.
> Store each credential in the vault (never in a file), then tell me it's done.

## Done

- **Amazon Associates tracking ID** — `desertservi08-20`. Stored in the vault
  (`secret-tool lookup service amazon-associates account tag`) and pushed to Vercel
  production as `VITE_AFFILIATE_TAG` (2026-07-10). Affiliate links now earn commission.
- **App Store Connect issuer-id / key-id / private-key** — in the vault under
  `appstore-connect/*`. Bundle ID `com.desertservicesgroup.sprinklersmart` registered
  on Apple's servers (resource `U2PXNXN9SN`, 2026-07-10).
- **GitHub Actions secrets** (iOS CI pipeline) — `APPSTORE_API_KEY_ID`,
  `APPSTORE_API_ISSUER_ID`, `APPSTORE_API_KEY_P8_B64`, `MATCH_PASSWORD` all set on
  `jjj-dsg/sprinkler-app` (2026-07-10).
- **Stripe live Price** — `price_1TrmBHPBl1F1M27lCjy8eX5T` ($19 SprinklerSmart Pro
  Plan, one-time), created via the Stripe MCP OAuth connection, pushed to Vercel as
  `STRIPE_PRICE_ID` (2026-07-10). An earlier accidental live price
  (`price_1Trk1CPBl1F1M27lVbmH6jvc`) was created and deactivated the same session —
  harmless, no charge occurred.
- **Custom domain** — `sprinklersmart.desertservicesgroup.com` added to the Vercel
  project (2026-07-10). DNS record still needed (see below).

## Still needed — only you can do these

- **Stripe live secret + publishable keys** — Dashboard → Developers → API keys
  (already exist, nothing to create). Paste both here; I'll vault them as
  `sprinkler-app-stripe/secret-key` + `sprinkler-app-stripe/publishable-key` and push
  `STRIPE_SECRET_KEY` / `VITE_STRIPE_PK` to Vercel production. The Stripe API/MCP
  cannot retrieve either value — Dashboard-only, confirmed by searching the full API
  surface (no list/retrieve/create-key operation exists).
- **App Store Connect API key must be a Team key with App Manager role, not an
  Individual key.** Confirmed against `../../app-store-runbook/README.md` Phase 0 —
  the vaulted key (`B77N8Y2RJU`) returned `403 FORBIDDEN` trying to create the app
  record ("apps does not allow CREATE, allowed: GET/UPDATE"), which is exactly the
  symptom of an Individual-scoped key. Fix:
  1. App Store Connect → **Users and Access** → **Integrations** tab → **App Store
     Connect API**.
  2. Check whether key `B77N8Y2RJU` is listed under "Team Keys" or under an
     individual user's keys. If it's an Individual key, it can't be converted —
     generate a new one instead.
  3. Click **Generate API Key** (or the **+** under Team Keys specifically — not
     via your personal account page), name it (e.g. "sprinkler-app CI"), and set
     **Access: App Manager**.
  4. Download the new `AuthKey_XXXXXXXXXX.p8` immediately — Apple shows it exactly
     once.
  5. Tell me the file's in `~/Downloads` (or paste the Key ID / Issuer ID if they
     differ) and I'll vault it and update the GitHub secret myself — no need to
     hand me the raw key contents in chat.
  Once it's a Team key with App Manager, the same `POST /v1/apps` call that
  returned 403 should succeed, and the app record can be created via API instead
  of manually in the ASC UI.
- **DNS record for the custom domain** — Vercel wants
  `A sprinklersmart.desertservicesgroup.com → 76.76.21.21` on Cloudflare (DNS host
  confirmed via public NS lookup). The vaulted `cloudflare/api-token` has zero zone
  access (misconfigured or wrong account) — needs either a token with Zone:DNS:Edit
  on `desertservicesgroup.com`, or the Cloudflare MCP OAuth (same pattern as Stripe).
