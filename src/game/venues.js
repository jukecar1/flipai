// Fight Empire — venue list used when booking shows

import { FIGHT_TYPES } from './constants';

export const VENUES = [
  { id: 'v1', name: 'Jacksonville Activity Center', city: 'Jacksonville', country: 'USA', tier: 'small_hall', capacity: 500, fee: 825, indoor: true },
  { id: 'v2', name: 'Riverside Community Hall', city: 'Jacksonville', country: 'USA', tier: 'small_hall', capacity: 650, fee: 900, indoor: true },
  { id: 'v3', name: 'Bryan Glazer Family Auditorium', city: 'Tampa', country: 'USA', tier: 'small_hall', capacity: 1080, fee: 1450, indoor: true },
  { id: 'v4', name: 'Hilton Tampa Downtown', city: 'Tampa', country: 'USA', tier: 'small_hall', capacity: 2000, fee: 2600, indoor: true },
  { id: 'v5', name: 'Wyndham Orlando Resort', city: 'Orlando', country: 'USA', tier: 'small_hall', capacity: 1500, fee: 2100, indoor: true },
  { id: 'v6', name: 'Miccosukee Casino & Resort', city: 'Miami', country: 'USA', tier: 'theatre', capacity: 1800, fee: 3200, indoor: true },
  { id: 'v7', name: 'Fillmore Miami Beach', city: 'Miami', country: 'USA', tier: 'theatre', capacity: 2700, fee: 4800, indoor: true },
  { id: 'v8', name: 'The Moon', city: 'Tallahassee', country: 'USA', tier: 'small_hall', capacity: 500, fee: 700, indoor: true },
  { id: 'v9', name: 'Hanford Fairgrounds Pavilion', city: 'Hanford', country: 'USA', tier: 'small_hall', capacity: 900, fee: 1100, indoor: false },
  { id: 'v10', name: 'MGM Grand Garden Arena', city: 'Las Vegas', country: 'USA', tier: 'arena', capacity: 12000, fee: 42000, indoor: true },
  { id: 'v11', name: 'T-Mobile Arena', city: 'Las Vegas', country: 'USA', tier: 'arena', capacity: 20000, fee: 68000, indoor: true },
  { id: 'v12', name: 'Madison Square Garden', city: 'New York', country: 'USA', tier: 'arena', capacity: 20789, fee: 95000, indoor: true },
  { id: 'v13', name: 'Crypto.com Arena', city: 'Los Angeles', country: 'USA', tier: 'arena', capacity: 19000, fee: 88000, indoor: true },
  { id: 'v14', name: 'United Center', city: 'Chicago', country: 'USA', tier: 'arena', capacity: 20900, fee: 91000, indoor: true },
  { id: 'v15', name: 'AT&T Stadium', city: 'Los Angeles', country: 'USA', tier: 'stadium', capacity: 80000, fee: 350000, indoor: false },
  { id: 'v16', name: 'York Hall', city: 'London', country: 'UK', tier: 'small_hall', capacity: 1200, fee: 3400, indoor: true },
  { id: 'v17', name: 'The O2 Arena', city: 'London', country: 'UK', tier: 'arena', capacity: 20000, fee: 92000, indoor: true },
  { id: 'v18', name: 'AO Arena', city: 'Manchester', country: 'UK', tier: 'arena', capacity: 21000, fee: 89000, indoor: true },
  { id: 'v19', name: '3Arena', city: 'Dublin', country: 'Ireland', tier: 'arena', capacity: 13000, fee: 51000, indoor: true },
  { id: 'v20', name: 'General Pico Fairgrounds', city: 'General Pico', country: 'Argentina', tier: 'small_hall', capacity: 500, fee: 650, indoor: false },
  { id: 'v21', name: 'Arena Ciudad de Mexico', city: 'Mexico City', country: 'Mexico', tier: 'arena', capacity: 22300, fee: 61000, indoor: true },
  { id: 'v22', name: 'Ryogoku Kokugikan', city: 'Tokyo', country: 'Japan', tier: 'arena', capacity: 11000, fee: 47000, indoor: true },
  { id: 'v23', name: 'Qudos Bank Arena', city: 'Sydney', country: 'Australia', tier: 'arena', capacity: 18000, fee: 63000, indoor: true },
];

export function venuesNear(city) {
  return [...VENUES].sort((a, b) => (a.city === city ? -1 : 0) - (b.city === city ? -1 : 0));
}

// A Single Fight is a no-frills local booking, a Showcase is an undercard
// slot on a proper Fight Night, and a Main Event is the headline slot —
// each is scoped to venues sized for that billing, small local halls up
// through the big arenas and stadiums.
const TIERS_BY_FIGHT_TYPE = {
  [FIGHT_TYPES.SINGLE]: ['small_hall'],
  [FIGHT_TYPES.SHOWCASE]: ['small_hall', 'theatre'],
  [FIGHT_TYPES.MAIN_EVENT]: ['arena', 'stadium'],
};

export function venuesForFightType(fightType, city) {
  const allowedTiers = TIERS_BY_FIGHT_TYPE[fightType];
  const pool = allowedTiers ? VENUES.filter(v => allowedTiers.includes(v.tier)) : VENUES;
  return [...pool].sort((a, b) => (a.city === city ? -1 : 0) - (b.city === city ? -1 : 0));
}
