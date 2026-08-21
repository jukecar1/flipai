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

// Your home city's size scales your starting resources — a promotion
// launched out of a small town starts scrappier, a megacity launch starts
// flush. Looked up by population against CITIES in namePool.js.
export const CITY_SIZE_TIERS = [
  { id: 'town', label: 'Small Town', maxPop: 100000, fundsMultiplier: 0.8 },
  { id: 'city', label: 'City', maxPop: 500000, fundsMultiplier: 1 },
  { id: 'metro', label: 'Metro', maxPop: 2000000, fundsMultiplier: 1.3 },
  { id: 'megacity', label: 'Megacity', maxPop: Infinity, fundsMultiplier: 1.75 },
];

export function cityTierForPopulation(pop) {
  return CITY_SIZE_TIERS.find(t => pop <= t.maxPop) || CITY_SIZE_TIERS[CITY_SIZE_TIERS.length - 1];
}

export function startingFundsForPopulation(pop) {
  return Math.round((STARTING_FUNDS * cityTierForPopulation(pop).fundsMultiplier) / 100) * 100;
}

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

// A fighter's true physical prime is their late 20s. Younger fighters are
// still developing (a 19-year-old prospect hasn't hit their ceiling yet)
// and past 30 they decline on an accelerating curve — barely noticeable
// right after their prime, clearly felt by their mid-30s, steep heading
// into retirement — rather than coasting on a flat plateau for years
// before suddenly falling off. This scales EFFECTIVE ability (what
// actually plays out in the cage, and what OVR reports) without ever
// touching the raw trained stat numbers on the Roster screen — training
// gains are real and permanent, age just determines how much of them
// you're currently fighting at.
const PRIME_START_AGE = 26;
const PRIME_END_AGE = 30;
const DECLINE_CURVE_POWER = 1.3; // >1 = decline accelerates the further past prime you are
const MAX_DECLINE = 0.35; // multiplier bottoms out at 1 - this, right at RETIREMENT_AGE

export function ageCurveMultiplier(age) {
  if (age < PRIME_START_AGE) {
    const t = Math.max(0, Math.min(1, (age - 19) / (PRIME_START_AGE - 19)));
    return 0.9 + t * 0.1; // ramps 0.90 -> 1.00 rising into their prime
  }
  if (age <= PRIME_END_AGE) return 1;
  const t = Math.max(0, Math.min(1, (age - PRIME_END_AGE) / (RETIREMENT_AGE - PRIME_END_AGE)));
  return 1 - Math.pow(t, DECLINE_CURVE_POWER) * MAX_DECLINE;
}

// The badge shown right on a fighter's profile — exactly where they sit
// on the age curve above, in plain language.
export function primeStatus(age) {
  if (age < PRIME_START_AGE) return { id: 'pre-prime', label: 'Pre-Prime' };
  if (age <= PRIME_END_AGE) return { id: 'prime', label: 'In Prime' };
  return { id: 'past-prime', label: 'Past Prime' };
}

// A flat average of the 5 stats would let a specialist (18 striking / 8
// submission) land on the exact same OVR as a fighter who's an even 13
// across the board — even though the fight engine treats those two very
// differently in a real matchup. Weighting a fighter's stats by rank (best
// stat counts most, worst counts least) means a real standout skill — or a
// glaring hole — actually shows up in the summary number instead of
// washing out in the average.
const OVR_STAT_WEIGHTS = [0.30, 0.25, 0.20, 0.15, 0.10];

// The single source of truth for a fighter's OVR — their trained stats,
// rank-weighted, then scaled by their current age curve. Reflects how much
// they've trained, how that training is distributed, AND how much of it
// they can still bring on fight night.
export function effectiveOverall(stats, age) {
  const sorted = [stats.striking, stats.wrestling, stats.submission, stats.chin, stats.cardio].sort((a, b) => b - a);
  const raw = sorted.reduce((sum, v, i) => sum + v * OVR_STAT_WEIGHTS[i], 0);
  return Math.max(1, Math.min(20, Math.round(raw * ageCurveMultiplier(age))));
}

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

// Training gets harder to convert into real gains as a fighter ages — the
// same rep counts for less once you're past your prime, so a veteran pays
// more XP for the same stat point a fighter in their 20s buys cheaper.
// Mirrors the same age-curve shape as ageCurveMultiplier, inverted.
export function trainingAgeMultiplier(age) {
  if (age < PRIME_START_AGE) return 0.92; // a young body adapts fast
  if (age <= PRIME_END_AGE) return 1;
  const t = Math.max(0, Math.min(1, (age - PRIME_END_AGE) / (RETIREMENT_AGE - PRIME_END_AGE)));
  return 1 + Math.pow(t, DECLINE_CURVE_POWER); // same acceleration as ageCurveMultiplier, up to 2x by retirement
}

export function trainingCost(statValue, isSpecialty, age) {
  const discount = isSpecialty ? 1 - COACH_SPECIALTY_DISCOUNT : 1;
  const ageMult = age === undefined ? 1 : trainingAgeMultiplier(age);
  return Math.round(statValue * TRAINING_XP_PER_STAT_POINT * discount * ageMult);
}

// Contracts: every signed fighter (starting roster, scouted, free agent,
// promoted amateur) is locked in for a set number of fights, not a length
// of time — it counts down only when they actually compete, so signing
// someone doesn't put them on a silent expiration clock. Sign (or renew)
// for 1, 3, or 5 fights at a time; run out and a rival scoops them up,
// same as an unsigned free agent.
export const CONTRACT_LENGTH_OPTIONS = [1, 3, 5];
export const DEFAULT_CONTRACT_FIGHTS = 3;
export const CONTRACT_WARNING_FIGHTS = 1; // flag the badge on their last fight under contract
const CONTRACT_COST_PER_FIGHT_MULTIPLIER = 0.5;

// Loyalty: how a fighter feels about the way you've managed their career
// lately — real opportunities and fair fights vs. being used as a
// stay-busy tune-up, thrown in over their head, or left to rot on the
// shelf. A fresh signing starts neutral; it drifts back toward that
// baseline over time so an old grievance eventually fades, but sustained
// bad booking can tank it, and a badly-treated fighter can flat-out
// refuse to re-sign — or demand a lot more to do it.
export const LOYALTY_BASELINE = 60;
export const LOYALTY_MIN = 0;
export const LOYALTY_MAX = 100;
export const INACTIVE_WEEKS_BEFORE_FRUSTRATION = 10;

export function clampLoyalty(n) {
  return Math.max(LOYALTY_MIN, Math.min(LOYALTY_MAX, Math.round(n)));
}

export function loyaltyStatus(loyalty) {
  if (loyalty >= 80) return { id: 'loyal', label: 'Loyal' };
  if (loyalty >= LOYALTY_BASELINE) return { id: 'content', label: 'Content' };
  if (loyalty >= 35) return { id: 'frustrated', label: 'Frustrated' };
  return { id: 'resentful', label: 'Resentful' };
}

// Comfortably confident at baseline and above; refusal risk grows as
// loyalty falls below it, becoming a real coinflip-or-worse once resentful.
export function renewalAcceptChance(loyalty) {
  if (loyalty >= LOYALTY_BASELINE) {
    const t = Math.min(1, (loyalty - LOYALTY_BASELINE) / (LOYALTY_MAX - LOYALTY_BASELINE));
    return 0.85 + t * 0.13;
  }
  const t = loyalty / LOYALTY_BASELINE;
  return Math.max(0.05, 0.85 * t);
}

// A frustrated fighter's camp drives a harder bargain.
export function loyaltyCostMultiplier(loyalty) {
  if (loyalty >= LOYALTY_BASELINE) return 1;
  if (loyalty >= 40) return 1.2;
  if (loyalty >= 20) return 1.5;
  return 2;
}

export function contractCost(purseFloor, fights, loyalty = LOYALTY_BASELINE) {
  return Math.round(purseFloor * CONTRACT_COST_PER_FIGHT_MULTIPLIER * fights * loyaltyCostMultiplier(loyalty));
}

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
