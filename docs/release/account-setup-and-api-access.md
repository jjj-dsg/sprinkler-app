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
- **App Store Connect app record** — created manually by Jeff (2026-07-11) after the
  403-on-CREATE finding turned out to be a genuine Apple API limitation (app records
  can't be created via API, regardless of key type/role — confirmed both Team key
  and App Manager role were already correct). App id `6790022732`, name "Sprinkler
  Smart" (listing name in metadata is "Sprinkler Smart Planner" — will sync on the
  next `listing_text` deliver run).
- **ASC IAP product** — `com.desertservicesgroup.sprinklersmart.proplan`, non-
  consumable, $19.00, localized + priced (2026-07-11), via
  `app-store-runbook/scripts/create_asc_iap.py --skip-monthly`.
- **RevenueCat** — app entry, `sprinkler_pro` entitlement, the `proplan` product,
  `sprinkler_default` offering with a `$rc_lifetime` package (2026-07-11), via
  `configure_revenuecat.py --skip-monthly`. Deliberately its own entitlement/offering
  namespace, NOT the shared `premium`/`default` already used by other DSG apps in
  the same RC project (`desert services group llc`, id `proj9310da97`).
- **App-store-runbook script fixes** — found and fixed while running these for real:
  IAP localization description has an undocumented 55-char limit; the price-schedule
  existence check 404s when unset instead of returning empty (was fatal, now
  handled); `--skip-monthly` wasn't fully wired into `configure_revenuecat.py`'s
  `main()`. All pushed to `app-store-runbook` so future single-product apps benefit.

## Still needed — only you can do these

- **Stripe live secret + publishable keys** — Dashboard → Developers → API keys
  (already exist, nothing to create). Paste both here; I'll vault them as
  `sprinkler-app-stripe/secret-key` + `sprinkler-app-stripe/publishable-key` and push
  `STRIPE_SECRET_KEY` / `VITE_STRIPE_PK` to Vercel production. The Stripe API/MCP
  cannot retrieve either value — Dashboard-only, confirmed by searching the full API
  surface (no list/retrieve/create-key operation exists).
- **Connect the ASC In-App Purchase key to RevenueCat** — RevenueCat dashboard →
  the Sprinkler Smart Planner app → App Store Connect settings → upload the
  in-app-purchase key. This is likely what `SubscriptionKey_KA94U592AH.p8`
  (`~/Downloads`, vaulted as `appstore-connect/subscription-key`) is for — no v2 API
  endpoint exists for this, dashboard-only.
- **RevenueCat public SDK key** — the v2 API didn't expose the new app's public
  `appl_` key in its response. RevenueCat dashboard → API keys → copy the iOS public
  key → paste here, I'll set it as the `VITE_REVENUECAT_IOS_KEY` GitHub repo
  Variable (public client config, not a secret).
- **DNS record for the custom domain** — Vercel wants
  `A sprinklersmart.desertservicesgroup.com → 76.76.21.21` on Cloudflare (DNS host
  confirmed via public NS lookup). The vaulted `cloudflare/api-token` has zero zone
  access (misconfigured or wrong account) — needs either a token with Zone:DNS:Edit
  on `desertservicesgroup.com`, or finish the Cloudflare MCP OAuth (link sent
  earlier — let me know if you need it resent).
- **App code**: still need to wire the native/web billing router (`isNativeApp()` +
  RevenueCat purchase flow for the iOS build, Stripe unchanged for web) per
  `REVENUECAT_IAP.md` §4 — not started yet.
