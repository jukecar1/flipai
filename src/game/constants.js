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

// Training: banked XP (earned from fights) spent to raise one stat point
// at a time. Cost scales with how high the stat already is — polishing
// an elite fighter costs a lot more than raising a raw prospect.
export const STAT_KEYS = ['striking', 'wrestling', 'submission', 'chin', 'cardio'];
export const STAT_LABELS = {
  striking: 'Striking',
  wrestling: 'Wrestling',
  submission: 'Submission',
  chin: 'Chin',
  cardio: 'Cardio',
};
export const TRAINING_XP_PER_STAT_POINT = 180;
export const MAX_STAT = 20;
// A coach specializing in a stat discounts training it.
export const COACH_SPECIALTY_DISCOUNT = 0.25;

export function trainingCost(statValue, isSpecialty) {
  const discount = isSpecialty ? 1 - COACH_SPECIALTY_DISCOUNT : 1;
  return Math.round(statValue * TRAINING_XP_PER_STAT_POINT * discount);
}

// Contracts: every signed fighter (starting roster, scouted, free agent,
// promoted amateur) has a contract that runs out — renew it before it
// does or a rival scoops them up, same as an unsigned free agent.
export const CONTRACT_LENGTH_RANGE = [40, 90];
export const CONTRACT_WARNING_WEEKS = 8;
export const CONTRACT_RENEWAL_MULTIPLIER = 1.5;

// Moving a fighter to an adjacent weight class costs a training-camp fee
// and takes a toll on their conditioning that week.
export const WEIGHT_MOVE_COST = 800;

// Stay broke too long and the bank shuts your promotion down.
export const BANKRUPTCY_WEEKS = 6;

// A rival won't sit still on a fighter they've marked as a champion —
// poaching one out from under a rival promotion costs a steep buyout
// with a success chance driven by your prestige relative to theirs.
export const POACH_COST_MULTIPLIER = 6;

// A free agent's asking price climbs as their countdown runs out — other
// promotions are circling too, so waiting costs you.
export function freeAgentCost(agent) {
  return Math.round(agent.purseFloor * (3 + Math.max(0, 8 - agent.weeksLeft) * 0.3));
}

// Booking a crossover fight against a rival's contracted fighter (up to
// and including their champion) costs an extra sanctioning fee on top
// of the venue, and pays a bigger prestige swing than a normal Main Event.
export const SUPER_FIGHT_SANCTION_FEE = 8000;

// A Fight Night card can host this many bouts sharing one venue booking.
export const CARD_MAX_FIGHTS = 5;

// Pre-fight gameplans nudge the sim by lightly reshaping your fighter's
// effective stats for that one fight — a real tradeoff, not a free bonus.
export const GAMEPLANS = [
  { id: 'balanced', label: 'Balanced', description: 'Fight your natural game — no adjustments.' },
  { id: 'pressure', label: 'Push the Pace', description: '+2 striking, -2 cardio. High output, gasses faster.' },
  { id: 'patient', label: 'Play It Safe', description: '+1 chin, +1 cardio, -1 striking. Safer, slower pace.' },
  { id: 'finish', label: 'Hunt the Finish', description: '+2 submission, +1 striking, -2 chin. Aggressive, exposed.' },
];
