# SprinklerSmart — Mobile (Capacitor) & TestFlight Runbook

The web app is the source of truth. Capacitor wraps the built `dist/` in a native
iOS shell. **The iOS platform and the TestFlight build can only be produced on
macOS with Xcode** — not on this Asahi/Fedora ARM box. Everything that *can* be
done off-Mac is already wired here; this doc is the Mac-side checklist.

## What's already done (off-Mac)
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/geolocation` installed.
- `capacitor.config.ts` — appId `com.desertservicesgroup.sprinklersmart`, `webDir: dist`.
- `npm run build:mobile` → `npm run build && cap sync` (builds web + syncs into native).
- `index.html` has `viewport-fit=cover` + `apple-mobile-web-app-*` tags for the notch/status bar.
- Landing screen "use my location" already calls `navigator.geolocation` (works in the
  iOS WebView once the Info.plist usage string below is set).

## One-time iOS bootstrap (on the cloud-Mac)
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
- [ ] Privacy policy URL (data: device location only, not stored server-side; see `legal-privacy-lead`).
- [ ] Privacy "nutrition label": Location (used, not linked, not for tracking).
- [ ] Export-compliance answer (no non-exempt encryption → usually "No").
- [ ] Screenshots (the `npm run screenshots` PNGs are a starting point; store needs device-frame sizes).
- [ ] Pricing tier / free.

## Notes
- Native geolocation upgrade path: swap `navigator.geolocation` for
  `@capacitor/geolocation`'s `Geolocation.getCurrentPosition()` for better permission
  handling. The web API is sufficient for v1.
- `ios/` and `android/` are gitignored — they're regenerated from the web build, so
  the repo stays Tier-0 and the native projects never drift from `dist/`.
