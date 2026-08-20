# Fight Empire

A boxing-promoter career sim: sign prospects, book fights, watch them
play out round-by-round in an animated ring, and chase your roster up
the rankings. Built as a React web app and wrapped natively for iOS
with [Capacitor](https://capacitorjs.com/).

## Playing / developing

```bash
npm install
npm start        # http://localhost:3000
```

- `npm test` — runs the unit tests (game engine + a smoke render test).
- `npm run build` — production web build.

Progress autosaves to the browser's local storage across up to three
promotion slots — nothing leaves the device.

## How it's put together

```
src/
  game/         data + pure logic: constants, name/venue generation,
                boxer generation, the fight-simulation engine, the
                central reducer, and localStorage save/load
  context/      React context wiring the reducer + persistence to screens
  screens/      one component per screen (Hub, Roster, Make Fights,
                Rankings, News, the animated Fight Sim, Fight Result)
  components/   shared UI chrome (top bar, sidebar, buttons/panels)
  styles/       the "Fight Empire" visual theme
```

The fight engine (`src/game/engine.js`) simulates a full bout up front —
round by round, punch by punch, with knockdown/decision logic and full
punch-type stat tracking — and the Fight Sim screen plays that back as
an animated ring view with live commentary and stats, at adjustable
speed, with a skip-to-result option.

## Shipping to the App Store

See [`docs/APP_STORE_SUBMISSION.md`](docs/APP_STORE_SUBMISSION.md) for
the full walkthrough — registering the app with Apple, the local Xcode
loop, screenshots/listing requirements, and an automated
GitHub-Actions-to-TestFlight pipeline you can run once you've added
your Apple signing secrets.

Quick reference:

```bash
npm run cap:sync       # build the web app + copy it into the iOS project
npm run cap:open:ios   # open ios/App/App.xcworkspace in Xcode
npm run icons          # regenerate app icons from scripts/icon.svg
```

## Monetization

No real purchases are wired up yet — the UI is scoped to a complete,
free core loop first. StoreKit/subscriptions are a deliberate follow-up
once the app has a real App Store Connect record to configure them
against (see §6 of the submission doc).
