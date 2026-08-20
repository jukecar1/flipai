// Fight Empire — core game constants

export const WEIGHT_CLASSES = [
  { id: 'H', name: 'Heavyweight', limit: null, color: '#e11d2e' },
  { id: 'LH', name: 'Light Heavyweight', limit: 175, color: '#f2622e' },
  { id: 'M', name: 'Middleweight', limit: 160, color: '#f4b942' },
  { id: 'W', name: 'Welterweight', limit: 147, color: '#2ec4b6' },
  { id: 'L', name: 'Lightweight', limit: 135, color: '#3a86ff' },
  { id: 'F', name: 'Featherweight', limit: 126, color: '#8338ec' },
  { id: 'B', name: 'Bantamweight', limit: 118, color: '#ff5fa2' },
  { id: 'FL', name: 'Flyweight', limit: 112, color: '#4ade80' },
];

export const WEIGHT_CLASS_MAP = Object.fromEntries(WEIGHT_CLASSES.map(w => [w.id, w]));

export const FIGHT_TYPES = {
  SINGLE: 'single',
  SHOWCASE: 'showcase',
  MAIN_EVENT: 'main_event',
};

export const VENUE_TIERS = [
  { id: 'small_hall', name: 'Small Hall', minCapacity: 300, maxCapacity: 1200 },
  { id: 'theatre', name: 'Theatre & Casino', minCapacity: 1200, maxCapacity: 3500 },
  { id: 'arena', name: 'Arena', minCapacity: 3500, maxCapacity: 15000 },
  { id: 'stadium', name: 'Stadium', minCapacity: 15000, maxCapacity: 80000 },
];

export const SAVE_SLOT_COUNT = 3;

export const STARTING_FUNDS = 25000;

export const WEEKS_PER_YEAR = 52;
