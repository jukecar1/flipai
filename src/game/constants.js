// Fight Empire — core game constants (MMA)

export const WEIGHT_CLASSES = [
  { id: 'HW', name: 'Heavyweight', limit: null, color: '#e11d2e' },
  { id: 'LHW', name: 'Light Heavyweight', limit: 205, color: '#f2622e' },
  { id: 'MW', name: 'Middleweight', limit: 185, color: '#f4b942' },
  { id: 'WW', name: 'Welterweight', limit: 170, color: '#2ec4b6' },
  { id: 'LW', name: 'Lightweight', limit: 155, color: '#3a86ff' },
  { id: 'FW', name: 'Featherweight', limit: 145, color: '#8338ec' },
  { id: 'BW', name: 'Bantamweight', limit: 135, color: '#ff5fa2' },
  { id: 'FLW', name: 'Flyweight', limit: 125, color: '#4ade80' },
  { id: 'STW', name: 'Strawweight', limit: 115, color: '#22c1c3' },
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

// Fictional rival organizations the player's promotion competes against.
// Standing in for the real top-tier / #2 / tournament-format / global-strikers
// tiers of the sport, without naming any real company.
export const RIVAL_PROMOTIONS = [
  { id: 'apex', name: 'Apex FC', tier: 'Global #1', color: '#e2263a', basePrestige: 9600, weeklyGrowth: [8, 22] },
  { id: 'vantage', name: 'Vantage MMA', tier: 'Global #2', color: '#3a86ff', basePrestige: 6200, weeklyGrowth: [5, 16] },
  { id: 'forge', name: 'Forge League', tier: 'Tournament Circuit', color: '#f4b942', basePrestige: 3400, weeklyGrowth: [3, 12] },
  { id: 'crown', name: 'Crown Championship', tier: 'Global Strikers', color: '#2ec4b6', basePrestige: 2600, weeklyGrowth: [2, 10] },
];

export const PRESTIGE_TIERS = [
  { min: 0, label: 'Regional Promotion' },
  { min: 500, label: 'National Promotion' },
  { min: 1500, label: 'Rising Contender' },
  { min: 3500, label: 'Major Promotion' },
  { min: 6000, label: 'Global Contender' },
  { min: 9000, label: 'Industry Leader' },
];

// Your gym's active roster capacity. You start at level 1 and spend funds
// to expand — each level raises how many fighters you can have signed at
// once. upgradeCost is the price to move from the previous level to this one.
export const GYM_LEVELS = [
  { level: 1, rosterLimit: 8, upgradeCost: 0 },
  { level: 2, rosterLimit: 10, upgradeCost: 18000 },
  { level: 3, rosterLimit: 12, upgradeCost: 40000 },
  { level: 4, rosterLimit: 15, upgradeCost: 75000 },
  { level: 5, rosterLimit: 18, upgradeCost: 130000 },
];

export function rosterLimitForGym(level) {
  const entry = GYM_LEVELS.find(g => g.level === level);
  return entry ? entry.rosterLimit : GYM_LEVELS[GYM_LEVELS.length - 1].rosterLimit;
}

// How many prospects you're shown to draft your starting roster from at
// career creation — you pick GYM_LEVELS[0].rosterLimit of them.
export const STARTING_ROSTER_POOL_SIZE = 20;

// Fighters retire once they hit this age — either into the Hall of Fame
// (if their career earns it) or just a quiet exit.
export const RETIREMENT_AGE = 39;

// The amateur feeder tier: cheap, unproven signings you can promote to
// the real roster once they've built a small amateur record.
export const AMATEUR_SIGN_COST = 400;
export const AMATEUR_PROMOTION_WINS = 3;
export const AMATEUR_POOL_LIMIT = 6;
