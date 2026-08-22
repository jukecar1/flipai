// Fight Empire — venue system.
//
// "Home" venues are generated for the player's own HQ city and scaled by
// its size tier (town/city/metro/megacity) — a promotion based in Denver
// books Denver venues, not whatever city happened to be hardcoded. A
// short, fixed list of real "on the road" marquee arenas and stadiums is
// also on offer for Main Events — the sport's biggest stages, available
// to any promotion (regardless of HQ) once it can afford the trip.

import { FIGHT_TYPES, CITY_SIZE_TIERS } from './constants';

function tierMultiplier(hqTier) {
  return (CITY_SIZE_TIERS.find(t => t.id === hqTier) || CITY_SIZE_TIERS[1]).fundsMultiplier;
}

// Rounds to a step sized for the number's own magnitude, so scaled
// capacities/fees land on clean, readable numbers at every city tier.
function niceRound(n) {
  if (n >= 100000) return Math.round(n / 5000) * 5000;
  if (n >= 10000) return Math.round(n / 500) * 500;
  if (n >= 1000) return Math.round(n / 100) * 100;
  return Math.round(n / 25) * 25;
}

// Base capacity/fee at a plain "city" tier (multiplier 1) — every other
// tier scales these up or down off the promotion's home city size.
const HOME_VENUE_TEMPLATES = [
  { tier: 'small_hall', suffix: 'Community Center', capacity: 600, fee: 900 },
  { tier: 'small_hall', suffix: 'Fairgrounds Pavilion', capacity: 950, fee: 1400 },
  { tier: 'theatre', suffix: 'Civic Theatre', capacity: 1800, fee: 3000 },
  { tier: 'arena', suffix: 'Arena', capacity: 8000, fee: 30000 },
  { tier: 'stadium', suffix: 'Stadium', capacity: 45000, fee: 200000 },
];

// A hometown stadium is only realistic once a city is big enough to
// plausibly fill one — smaller markets top out at a home arena and have
// to go on the road (see MARQUEE_VENUES) for a stadium-sized show.
const STADIUM_MIN_TIERS = ['metro', 'megacity'];

export function homeVenues(hqLabel, hqTier) {
  const mult = tierMultiplier(hqTier);
  const cityName = (hqLabel || '').split(',')[0].trim() || 'Home';
  return HOME_VENUE_TEMPLATES
    .filter(t => t.tier !== 'stadium' || STADIUM_MIN_TIERS.includes(hqTier))
    .map(t => ({
      id: `home-${t.tier}-${t.suffix.replace(/\s+/g, '')}`,
      name: `${cityName} ${t.suffix}`,
      city: cityName,
      tier: t.tier,
      capacity: niceRound(t.capacity * mult),
      fee: niceRound(t.fee * mult),
      home: true,
    }));
}

// Real, fixed marquee arenas and stadiums — the biggest stages in the
// sport. Always "on the road" relative to the player's HQ.
export const MARQUEE_VENUES = [
  { id: 'v10', name: 'MGM Grand Garden Arena', city: 'Las Vegas', tier: 'arena', capacity: 12000, fee: 42000 },
  { id: 'v11', name: 'T-Mobile Arena', city: 'Las Vegas', tier: 'arena', capacity: 20000, fee: 68000 },
  { id: 'v12', name: 'Madison Square Garden', city: 'New York', tier: 'arena', capacity: 20789, fee: 95000 },
  { id: 'v13', name: 'Crypto.com Arena', city: 'Los Angeles', tier: 'arena', capacity: 19000, fee: 88000 },
  { id: 'v14', name: 'United Center', city: 'Chicago', tier: 'arena', capacity: 20900, fee: 91000 },
  { id: 'v15', name: 'AT&T Stadium', city: 'Arlington', tier: 'stadium', capacity: 80000, fee: 350000 },
  { id: 'v17', name: 'The O2 Arena', city: 'London', tier: 'arena', capacity: 20000, fee: 92000 },
  { id: 'v18', name: 'AO Arena', city: 'Manchester', tier: 'arena', capacity: 21000, fee: 89000 },
  { id: 'v19', name: '3Arena', city: 'Dublin', tier: 'arena', capacity: 13000, fee: 51000 },
  { id: 'v21', name: 'Arena Ciudad de Mexico', city: 'Mexico City', tier: 'arena', capacity: 22300, fee: 61000 },
  { id: 'v22', name: 'Ryogoku Kokugikan', city: 'Tokyo', tier: 'arena', capacity: 11000, fee: 47000 },
  { id: 'v23', name: 'Qudos Bank Arena', city: 'Sydney', tier: 'arena', capacity: 18000, fee: 63000 },
].map(v => ({ ...v, home: false }));

// A Single Fight is a no-frills local booking, a Showcase is an undercard
// slot on a proper Fight Night, and a Main Event is the headline slot —
// each is scoped to venues sized for that billing, small local halls up
// through the big arenas and stadiums.
const TIERS_BY_FIGHT_TYPE = {
  [FIGHT_TYPES.SINGLE]: ['small_hall'],
  [FIGHT_TYPES.SHOWCASE]: ['small_hall', 'theatre'],
  [FIGHT_TYPES.MAIN_EVENT]: ['arena', 'stadium'],
};

// Returns { home, away } venue lists appropriate for the fight type. Home
// venues are always scaled to the player's own city and shown first;
// "on the road" marquee options only make sense once a fight is big
// enough to be a destination event, so they're offered for Main Events
// (and for the card builder, which can carry a Main Event bout) — a
// Single Fight or Showcase stays a local, no-travel booking.
export function venueOptions(fightType, hqLabel, hqTier) {
  const allowedTiers = fightType ? TIERS_BY_FIGHT_TYPE[fightType] : null;
  const home = homeVenues(hqLabel, hqTier).filter(v => !allowedTiers || allowedTiers.includes(v.tier));
  const includeAway = !fightType || fightType === FIGHT_TYPES.MAIN_EVENT;
  const away = includeAway ? MARQUEE_VENUES : [];
  return { home, away };
}
