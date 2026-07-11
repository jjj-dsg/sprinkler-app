# SprinklerSmart — Mobile (Capacitor) & TestFlight Runbook

The web app is the source of truth. Capacitor wraps the built `dist/` in a native
iOS shell. **The iOS build/archive/upload step can only run on macOS with Xcode**
— not on this Asahi/Fedora ARM box. There are two ways to get that macOS step done,
matching the pattern already proven on neon-merge/pochi_game_project/road-trivia:

- **Path A — cloud macOS via GitHub Actions (recommended, no physical Mac needed).**
  `.github/workflows/ios.yml` + `fastlane/` are already written (2026-07-10), copied
  from neon-merge's working pipeline and simplified for this app (no ads/RevenueCat).
  See "Cloud CI path" below.
- **Path B — a real Mac with Xcode**, doing the archive/upload by hand. See "Manual
  Mac path" below. Keep this as a fallback; Path A is faster and repeatable.

## Cloud CI path (Path A) — one-time setup, then a click per release

The App Store Connect API key is already in the vault
(`appstore-connect/issuer-id`, `appstore-connect/key-id`, `appstore-connect/private-key`).
To wire it into GitHub Actions, add these **repo secrets** at
`github.com/jjj-dsg/sprinkler-app` → Settings → Secrets and variables → Actions:

```
APPSTORE_API_KEY_ID      = $(secret-tool lookup service appstore-connect account key-id)
APPSTORE_API_ISSUER_ID   = $(secret-tool lookup service appstore-connect account issuer-id)
APPSTORE_API_KEY_P8_B64  = $(secret-tool lookup service appstore-connect account private-key | base64 -w0)
MATCH_PASSWORD           = <a new passphrase you choose — encrypts the signing certs
                             match stores in the fastlane-certs branch>
```

Then, once the App Store Connect app record exists (bundle id
`com.desertservicesgroup.sprinklersmart` — see checklist below), trigger a build:

```bash
gh workflow run ios.yml --ref master -f lane=beta --repo jjj-dsg/sprinkler-app
```

First run creates the distribution cert + provisioning profile (via fastlane `match`,
stored encrypted in a new `fastlane-certs` branch) and uploads to TestFlight. Every
later run reuses the same cert — no manual cert management, no physical Mac, ~10-15
min per build on a macOS runner (bills 10x normal minutes — that's why it's manual-
trigger only, not on every push).

**This step mutates real Apple Developer account state** (consumes one of Apple's 2
distribution-cert slots, creates a live TestFlight build) — confirm with Jeff before
the first real trigger, per the workspace's standing rule on external/production
mutations.

## What's already done (off-Mac)
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/geolocation` installed.
- `capacitor.config.ts` — appId `com.desertservicesgroup.sprinklersmart`, `webDir: dist`.
- `npm run build:mobile` → `npm run build && cap sync` (builds web + syncs into native).
- `index.html` has `viewport-fit=cover` + `apple-mobile-web-app-*` tags for the notch/status bar.
- Landing screen "use my location" already calls `navigator.geolocation` (works in the
  iOS WebView once the Info.plist usage string below is set).

## Manual Mac path (Path B) — fallback if you'd rather do it by hand

### One-time iOS bootstrap (on a real Mac)
```bash
npm ci
npm run build           # produce dist/
npx cap add ios         # generates ios/ (Xcode project) — Mac only
npx cap sync ios
```
Then in `ios/App/App/Info.plist` add the location usage string (required or the
app is rejected and geolocation silently fails):
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>SprinklerSmart uses your location to center the map on your property.</string>
```

## Per-release build → TestFlight
```bash
npm run build:mobile    # build web + cap sync
npx cap open ios        # opens Xcode
```
In Xcode:
1. Set the Team (Apple Developer account) and a unique bundle id matching `appId`.
2. Bump **Version** (marketing, e.g. 1.0.0) and **Build** (increment every upload).
3. Product → Archive → Distribute App → **App Store Connect** → Upload.
4. In App Store Connect → TestFlight, add the build to an internal testing group.

## App Store Connect checklist (gating real TestFlight invites)
- [ ] App record created (bundle id `com.desertservicesgroup.sprinklersmart`).
- [x] Privacy policy written — `docs/PRIVACY_POLICY.md` (source) / `public/privacy.html`
      (servable page, ships to `dist/privacy.html` on every build). Once deployed to prod,
      the real URL is `https://sprinkler-app-psi.vercel.app/privacy.html` — paste that into
      App Store Connect's Privacy Policy URL field. Replace the `[DATE]` placeholder in both
      files with the actual submission date first.
- [x] Privacy "nutrition label" answers — table at the bottom of `docs/PRIVACY_POLICY.md`.
      Copy directly into ASC's App Privacy questionnaire: Location (Yes/not linked/not
      tracking/App Functionality), Purchases (Yes/not linked/not tracking/App Functionality),
      Usage Data (Yes/not linked/not tracking/Analytics), Identifiers (No).
- [x] Export-compliance answer — "No" (exempt): standard HTTPS/TLS only, no proprietary
      encryption.
- [x] Screenshots regenerated (`npm run screenshots` → `screenshots/*.png`, 2026-07-10) as a
      content reference. **These are browser-viewport captures (1280×720 etc.), not Apple's
      required fixed device-frame pixel dimensions.** For actual ASC upload, take fresh
      screenshots from the Xcode Simulator during the Mac-side build below — Simulator
      captures are already the exact size Apple wants, so there's no separate resize step.
- [ ] Pricing tier / free — Jeff's call at submission time.

## Notes
- Native geolocation upgrade path: swap `navigator.geolocation` for
  `@capacitor/geolocation`'s `Geolocation.getCurrentPosition()` for better permission
  handling. The web API is sufficient for v1.
- `ios/` and `android/` are gitignored — they're regenerated from the web build, so
  the repo stays Tier-0 and the native projects never drift from `dist/`.
