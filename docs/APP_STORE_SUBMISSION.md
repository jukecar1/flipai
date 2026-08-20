# Shipping Fight Empire to the App Store

This repo builds a React web app and wraps it natively for iOS with
[Capacitor](https://capacitorjs.com/) (see `ios/App`). Everything up to
"produces a signed build" can be automated; the steps that require your
Apple identity — accepting agreements, creating records, approving a
review — have to happen under your own Apple Developer account.

## 0. One-time prerequisites

- An active [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/year), enrolled as yourself or an org you control.
- A Mac with Xcode installed (App Store or [developer.apple.com/xcode](https://developer.apple.com/xcode/)) — needed for local builds, signing, and Simulator screenshots. This repo's CI can do signed builds too (see §4), but you'll still want Xcode once for setup and screenshots.
- Node 20+ and npm on whatever machine you develop from.

## 1. Register the app with Apple

1. **Apple Developer portal → Certificates, IDs & Profiles → Identifiers**: register an App ID with bundle identifier `com.fightempire.app` (matches `capacitor.config.json` and `ios/App/App.xcodeproj`). If you want a different bundle ID, change it in both places plus `ios/App/fastlane/Appfile`.
2. **App Store Connect → Apps → +**: create a new app record.
   - Platform: iOS
   - Name: `Fight Empire` (or whatever you'd like the storefront listing to say — must be unique across the App Store)
   - Bundle ID: the one you just registered
   - SKU: any unique string, e.g. `fightempire001`
3. Note your **Team ID** (Developer portal → Membership) — you'll need it below.

## 2. Local dev loop

```bash
npm install
npm run cap:sync        # builds the web app, copies it into ios/App/App/public
npm run cap:open:ios     # opens ios/App/App.xcworkspace in Xcode
```

In Xcode: select the `App` target → Signing & Capabilities → check
"Automatically manage signing" → pick your Team. Run on a Simulator or a
plugged-in device to try it for real. Re-run `npm run cap:sync` any time
you change `src/` or `public/` and want the native shell to pick it up.

**App icon & splash**: the app icon is generated from `scripts/icon.svg`
via `npm run icons` (uses `sharp`) and already copied into
`ios/App/App/Assets.xcassets/AppIcon.appiconset/`. Regenerate + re-copy
after editing the SVG. The launch screen still uses Capacitor's default
splash asset (`ios/App/App/Assets.xcassets/Splash.imageset`) — swap that
image for branded artwork whenever you're ready; it's not required for
submission.

## 3. Screenshots & listing metadata

App Store Connect requires screenshots per device size class (at minimum
one 6.9"/6.7" iPhone set; add 6.5", 5.5", and iPad sizes if you want the
listing to look native on older/larger devices). Easiest path: run the
app in the matching Xcode Simulator, play through a few screens (Hub,
Make Fights, a fight in progress, Rankings), and use **Simulator → Device
→ Screenshot** (⌘S) for each size.

You'll also need, before you can submit:
- App description, subtitle, keywords, support URL, marketing URL (optional)
- A privacy policy URL — required even for apps that collect nothing
- Age rating questionnaire
- Pricing (Free, unless/until real in-app purchases ship — see §6)
- Privacy "nutrition label": as shipped, Fight Empire only stores your save data in local device storage — no analytics, no network calls, no account system — so this can be answered as "Data Not Collected."

## 4. Automated signed builds (GitHub Actions → TestFlight)

`.github/workflows/ios-testflight.yml` is a manual (`workflow_dispatch`)
pipeline that builds a signed release and uploads it to TestFlight via
fastlane. It needs these repository secrets
(Settings → Secrets and variables → Actions → New repository secret):

| Secret | What it is |
|---|---|
| `APPLE_TEAM_ID` | Your Developer Team ID |
| `APPLE_CERTIFICATE_P12_BASE64` | Your Apple Distribution certificate + private key, exported as `.p12`, base64-encoded |
| `APPLE_CERTIFICATE_PASSWORD` | The password you set when exporting that `.p12` |
| `APPLE_PROVISIONING_PROFILE_BASE64` | An App Store distribution provisioning profile for `com.fightempire.app`, base64-encoded |
| `APPLE_PROVISIONING_PROFILE_NAME` | That profile's exact name (as shown in the Developer portal) |
| `APP_STORE_CONNECT_KEY_ID` | Key ID of an App Store Connect API key ("Users and Access" → Integrations → App Store Connect API) |
| `APP_STORE_CONNECT_ISSUER_ID` | The Issuer ID shown on that same API Keys page |
| `APP_STORE_CONNECT_KEY_CONTENT_BASE64` | The downloaded `.p8` key file, base64-encoded |

To produce the base64 values locally: `base64 -i file.p12 | pbcopy` (macOS)
or `base64 -w0 file.p12` (Linux), then paste into the secret.

Once those secrets exist, run the workflow from the **Actions** tab →
"iOS TestFlight release" → **Run workflow**. It builds the web app,
syncs Capacitor, imports the certificate/profile into a temporary
keychain, builds and archives with `fastlane`, and uploads to
TestFlight. `.github/workflows/ios-build-check.yml` runs automatically
on pushes/PRs that touch the app and does an unsigned compile check —
no secrets needed — so you get a build-health signal on every change
even before secrets are configured.

**Without a Mac at all**, this workflow is genuinely how you'd ship —
it's the substitute for a local Xcode archive step. With a Mac, you can
equally do **Xcode → Product → Archive → Distribute App** and skip CI
entirely for a one-off release.

## 5. Submit for review

In App Store Connect, once a build (from TestFlight or a direct archive
upload) shows up under your app: attach it to a new version, fill in
"What's New", finish any incomplete metadata from §3, and hit **Submit
for Review**. Turnaround is typically well under 48 hours.

## 6. About monetization

The UI has upsell-shaped hooks (see `README.md`) but no real purchases
are wired up yet — StoreKit configuration, product IDs, and receipt
handling need an actual App Store Connect app record and a device to
test against, which only exist once you've done §1–§2. Revisit this
once the free game is live; it's a separate, smaller follow-up.
