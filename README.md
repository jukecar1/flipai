# Flip Airport

A click/tap-driven airport management sim built with [Expo](https://expo.dev) / React Native.

Guide inbound flights to land, dispatch fuel trucks and ramp crews to turn them around at the
gate, then clear them for takeoff — all before they run out of patience or reputation runs out.

## How to play

- **Approach Queue** — inbound planes hold and burn fuel patience. Tap one, then tap the runway
  to clear it to land. Wait too long and it diverts (money + reputation penalty).
- **Gates** — landed planes taxi in and run two parallel tasks, ⛽ fuel and 🧳 ramp/baggage.
  Unattended tasks crawl; an assigned crew finishes them much faster.
- **Ground Crew** — tap an idle crew, then tap a gate to dispatch it. Tap a busy crew to recall it.
- **Runway** — a single bottleneck. Select a plane, then tap the runway to land or depart it.
- **Economy** — on-time departures pay a bonus, late ones eat into the fare. Spend money to hire
  more crew or build more gates as daily traffic ramps up.
- Too many diversions tank your reputation and the airport gets grounded — tap **Restart** to
  try again.

## Testing it on your phone with Expo Go

1. Install the **Expo Go** app on your phone (iOS App Store / Google Play).
2. In this project, run:
   ```
   npm install
   npx expo start
   ```
3. Scan the QR code that prints in the terminal with your phone:
   - **iOS**: use the Camera app, tap the notification, it'll open in Expo Go.
   - **Android**: open Expo Go and use its built-in QR scanner.
4. The app loads on your phone. Metro keeps a live connection, so as the code changes and you
   re-run `npx expo start`, just reload the app (shake the phone → "Reload", or `r` in the
   terminal) to pick up the latest version — no rebuild needed for JS-only changes.

If your phone can't reach the dev server directly (different networks, restrictive Wi-Fi),
run `npx expo start --tunnel` instead — it's slower but works over the internet.

## Other scripts

- `npx expo start --android` / `--ios` — launch directly into a simulator/emulator if you have
  one set up.
- `npx expo export --platform android` (or `ios`) — produce a production JS bundle without a
  device, useful for a quick "does this actually compile" check.

## Project structure

```
App.js                    # Entry point (status bar + safe area wrapper)
src/
  AirportGame.js           # Main screen: game loop (tick interval), layout, modals
  theme.js                 # Shared color tokens
  game/engine.js           # Pure game state + reducer (no UI dependencies)
  components/
    HUD.js                 # Top bar: money, reputation, day, speed/pause controls
    AirportMap.js           # Gates, taxiway, runway
    Sidebar.js               # Approach queue, ground crew panel, shop, event log
```

`src/game/engine.js` has no React Native imports — it's a plain reducer over a plain-object game
state, so the simulation logic can be unit tested or reused outside the UI if needed.
