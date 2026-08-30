# Flip Airways

A turn-based airline management sim built with [Expo](https://expo.dev) / React Native, styled
after games like Airline Executive: dark navy UI, a hamburger-drawer nav, a dashboard with a
profit chart and alerts, and a fleet/routes screen with status-pill cards.

Found, staff, and grow your own airline: buy aircraft, open routes between cities, and advance
week by week to see revenue, costs, and load factor play out.

## How it works

- **New Game** — name your airline; an IATA/ICAO code and radio callsign are generated from it.
  You start with $60M and one E195 to get your first route going.
- **Fleet** — buy aircraft (Regional/Narrowbody/Widebody/Jumbo/Cargo, each with its own price,
  range, and operating cost), see their status (Active / Idle / In Maintenance), hours, cycles,
  and time to next check.
- **Routes** — connect two of the ten built-in airports, assign an idle aircraft, and set a
  weekly frequency. Revenue and cost are computed from real-ish distance, aircraft capacity, and
  a randomized load factor each week.
- **Next Week** (top bar) — advances the simulation: every route with an assigned aircraft flies,
  aircraft accrue hours/cycles and periodically go into maintenance, cash updates, and a new
  weekly history entry is recorded.
- **Dashboard** — cash/profit/load/fleet stat tiles, a weekly profit bar chart, a "Needs
  Attention" feed (cancelled flights, underperforming routes, idle aircraft), and a fleet-by-type
  breakdown.
- **Finances** — revenue/cost/profit breakdown for the last week plus lifetime P&L.
- The rest of the drawer (Planning, Map, Engineering, Network, Markets, Management, Competitors,
  Cargo) is stubbed as "coming soon" screens — the nav is all there, those systems aren't built
  yet.
- Progress autosaves to on-device storage; **Continue** on the title screen picks up where you
  left off.

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
4. The app loads on your phone. As the code changes and you re-run `npx expo start`, reload the
   app (shake the phone → "Reload", or `r` in the terminal) to pick up the latest version.

If your phone can't reach the dev server directly (different networks, restrictive Wi-Fi), run
`npx expo start --tunnel` instead — it's slower but works over the internet.

## Other scripts

- `npx expo start --android` / `--ios` — launch directly into a simulator/emulator if you have
  one set up.
- `npx expo export --platform android` (or `ios`) — produce a production JS bundle without a
  device, useful for a quick "does this actually compile" check.

## Project structure

```
App.js                          # Entry: loads any saved game, routes between Title/NewGame/Game
src/
  theme.js                       # Color tokens (dark navy theme)
  navConfig.js                   # Drawer nav sections/items, which screens are built vs stubbed
  AppShell.js                    # Post-launch shell: top bar, drawer, current screen, autosave
  game/
    data.js                       # Airports, aircraft catalog, money/date formatting
    engine.js                     # Pure reducer: NEW_GAME, BUY_AIRCRAFT, CREATE_ROUTE,
                                   # NEXT_WEEK (the weekly simulation), etc. No RN dependencies.
    selectors.js                  # Derived views: fleet stats, grouped fleet, routes, alerts
    storage.js                    # AsyncStorage save/load/clear
  components/                     # Reusable UI: TopBar, Drawer, Badge, StatTile, BarChart,
                                   # BuyAircraftModal, CreateRouteModal, AircraftDetailModal
  screens/                        # TitleScreen, NewGameScreen, DashboardScreen, FleetScreen,
                                   # RoutesScreen, FinancesScreen, PlaceholderScreen
```

`src/game/engine.js` and `selectors.js` have no React Native imports — the simulation is a plain
reducer over a plain-object game state, verified independently of the UI (see commit history for
the headless multi-week simulation used to test it).

## Known simplifications vs. the reference app

To keep the first playable version scoped, a few things are simpler than a full airline sim:
- No leasing — aircraft are purchased outright only.
- Ticket pricing is automatic (distance-based), not player-set.
- Maintenance is a flat 1-week grounding when an hours threshold is hit, not a full
  check-type/parts system.
- Planning, Map, Engineering, Network, Markets, Management, Competitors, and Cargo are nav
  placeholders, not implemented systems.

Good candidates for a next pass if the core loop feels right: player-adjustable ticket prices,
competitor airlines, a route-demand map, and crew/staff management.
