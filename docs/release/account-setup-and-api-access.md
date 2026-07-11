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
- **App Store Connect API key role** — the vaulted key (`B77N8Y2RJU`) returned
  `403 FORBIDDEN` trying to create the app record ("apps does not allow CREATE,
  allowed: GET/UPDATE"). Check its role at App Store Connect → Users and Access →
  Integrations → App Store Connect API — needs **App Manager** (or Admin). Either
  change the existing key's role or issue a new one with that role and I'll swap the
  vault entry.
- **DNS record for the custom domain** — Vercel wants
  `A sprinklersmart.desertservicesgroup.com → 76.76.21.21` on Cloudflare (DNS host
  confirmed via public NS lookup). The vaulted `cloudflare/api-token` has zero zone
  access (misconfigured or wrong account) — needs either a token with Zone:DNS:Edit
  on `desertservicesgroup.com`, or the Cloudflare MCP OAuth (same pattern as Stripe).
