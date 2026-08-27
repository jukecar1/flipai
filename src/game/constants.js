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

// The career ladder every promotion climbs, bottom to top. Prestige alone
// doesn't rank you up a rung — each tier also expects something concrete
// from your promotion (a title, a run of wins, a PPV under your belt)
// before you're actually recognized at that level, the same way a real
// organization can't just buy its way onto pay-per-view. Climb it in
// order: see currentPromotionTier() in gameReducer.js for how a tier is
// only "achieved" once every earlier rung, and this one's own
// requirements, are cleared — a big prestige number alone can't skip you
// past a rung whose stipulations you haven't met yet.
//
// requirements[].metric keys into TIER_METRICS in gameReducer.js.
// purseBonusPct is a standing gate/sponsorship bonus applied to every
// purse once you've actually earned that rung (see purseForFight).
export const PROMOTION_TIERS = [
  {
    id: 'regional', label: 'Regional Promotion', minPrestige: 0, requirements: [], purseBonusPct: 0,
    blurb: 'Every empire starts in a half-empty community center.',
  },
  {
    id: 'circuit', label: 'Local Circuit', minPrestige: 400, purseBonusPct: 5,
    requirements: [{ metric: 'rosterSize', target: 4, label: 'Sign at least 4 fighters' }],
    blurb: 'Regional press is starting to cover your cards.',
  },
  {
    id: 'national', label: 'National Circuit', minPrestige: 1200, purseBonusPct: 10,
    requirements: [{ metric: 'titles', target: 1, label: 'Crown at least 1 divisional champion' }],
    blurb: "You're a name outside your hometown now.",
  },
  {
    id: 'contender', label: 'Rising Contender', minPrestige: 2600, purseBonusPct: 16,
    requirements: [
      { metric: 'wins', target: 25, label: '25 promotion wins' },
      { metric: 'avgOverall', target: 11, label: 'Roster average OVR 11+' },
    ],
    blurb: 'Bigger networks are starting to circle your cards.',
  },
  {
    id: 'major', label: 'Major Promotion', minPrestige: 4500, purseBonusPct: 24,
    requirements: [
      { metric: 'titles', target: 3, label: 'Hold 3 divisional titles' },
      { metric: 'ppvEvents', target: 1, label: 'Headline a PPV event' },
    ],
    blurb: 'A genuine national threat to the established order.',
  },
  {
    id: 'global', label: 'Global Contender', minPrestige: 7000, purseBonusPct: 32,
    requirements: [
      { metric: 'wins', target: 70, label: '70 promotion wins' },
      { metric: 'avgOverall', target: 13, label: 'Roster average OVR 13+' },
    ],
    blurb: 'You share marquees with the sport’s biggest names.',
  },
  {
    id: 'leader', label: 'Industry Leader', minPrestige: 9500, purseBonusPct: 40,
    requirements: [{ metric: 'titles', target: 5, label: 'Hold 5 divisional titles' }],
    blurb: 'One step from the very top of the sport.',
  },
  {
    id: 'apex', label: "Sport's #1 Promotion", minPrestige: 9500, purseBonusPct: 50,
    requirements: [{ metric: 'dethroneTopRival', target: 1, label: "Surpass every rival's prestige" }],
    blurb: "You didn't just make it — you're the promotion every fighter dreams of signing with.",
  },
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
// with a success chance driven by your prestige relative to theirs, and
// by how happy that fighter already is under their current management —
// an unhappy fighter is that much easier to pull away.
export const POACH_COST_MULTIPLIER = 6;

// On top of the flat multiplier, an actual top fighter costs real money
// to pry loose: holding a division's belt is a rival's single biggest
// asset, and a fighter with a huge following brings their whole audience
// with them — both stack on the base buyout rather than replacing it, so
// a star champion can run many times the price of an anonymous gatekeeper
// with the same purse floor.
const POACH_CHAMPION_PREMIUM = 1.8;
const POACH_STAR_FOLLOWER_SCALE = 60000; // followers to reach the full stardom premium
const POACH_STAR_PREMIUM_CAP = 1.5;

export function poachCostFor(fighter) {
  const isChampion = !!(fighter.champion || fighter.title);
  const championMult = isChampion ? POACH_CHAMPION_PREMIUM : 1;
  const starMult = 1 + Math.min(POACH_STAR_PREMIUM_CAP, (fighter.followers || 0) / POACH_STAR_FOLLOWER_SCALE);
  return Math.round(fighter.purseFloor * POACH_COST_MULTIPLIER * championMult * starMult);
}

export function poachChance(prestigeDelta, targetLoyalty = LOYALTY_BASELINE) {
  const loyaltyFactor = (LOYALTY_BASELINE - targetLoyalty) / 250;
  return Math.max(0.05, Math.min(0.75, 0.15 + prestigeDelta / 20000 + loyaltyFactor));
}

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

// Pay-per-view: a Main Event card can be sold as a premium broadcast on
// top of the gate — real upfront revenue from your promotion's own reach
// plus the headliner's star power, at the cost of a production fee paid
// whether or not the numbers come in. See ppvBuys/ppvRevenue in
// gameReducer.js for the payout math.
export const PPV_PRICE_OPTIONS = [29.99, 39.99, 49.99, 59.99];
export const DEFAULT_PPV_PRICE = 49.99;
export const PPV_PRODUCTION_FEE = 12000;

// Pre-fight gameplans nudge the sim by lightly reshaping your fighter's
// effective stats for that one fight — a real tradeoff, not a free bonus.
export const GAMEPLANS = [
  { id: 'balanced', label: 'Balanced', description: 'Fight your natural game — no adjustments.' },
  { id: 'pressure', label: 'Push the Pace', description: '+2 striking, -2 cardio. High output, gasses faster.' },
  { id: 'patient', label: 'Play It Safe', description: '+1 chin, +1 cardio, -1 striking. Safer, slower pace.' },
  { id: 'finish', label: 'Hunt the Finish', description: '+2 submission, +1 striking, -2 chin. Aggressive, exposed.' },
];

// A training camp is chosen once at booking time, weeks before the fight
// actually happens — a real tradeoff made up front, distinct from the
// pre-fight gameplan (which is a fight-night strategy, chosen right
// before the bell). A hard camp sharpens the fighter's best tool, but
// carries a real chance of a camp injury that quietly works against them
// instead — see applyCamp() in gameReducer.js for how that plays out.
export const CAMPS = [
  { id: 'standard', label: 'Standard Camp', description: 'Balanced preparation. No real risk, no real reward.' },
  { id: 'hard', label: 'Hard Camp', description: `Push harder in the room to sharpen your fighter's best tool — at a real risk of a camp injury instead.` },
  { id: 'light', label: 'Light Camp', description: 'Ease off and protect the body. Walks in fresher, but without the extra edge.' },
];
export const HARD_CAMP_STAT_DELTA = 2;
export const HARD_CAMP_INJURY_CHANCE = 0.18;
export const LIGHT_CAMP_FATIGUE_RELIEF = 15;

// ---------- Post-fight bonuses ----------
// Modeled loosely on real fight-night bonuses: Performance of the Night
// only goes to the fighter who actually delivered a finish; Fight of the
// Night can land on either side of a fight that goes the distance — a
// great fight is a great fight regardless of who won it. Both are a
// chance, not a guarantee, same as the real thing.
export const POTN_BONUS_PCT = 25;
export const FOTN_BONUS_PCT = 20;

export function potnChance(roundEnded) {
  if (roundEnded <= 1) return 0.55;
  if (roundEnded === 2) return 0.4;
  return 0.25;
}

export function fotnChance(method, draw) {
  if (draw) return 0.5;
  if (method === 'SD' || method === 'MD') return 0.3;
  if (method === 'UD') return 0.1;
  return 0;
}

// ---------- Sponsorship income ----------
// Real fighters get walkout-gear and energy-drink money on top of their
// purse, scaled by how big a following they bring with them — paid out
// per fight (like everything else that moves money in this game), never
// just for existing week to week.
export function sponsorIncome(followers = 0) {
  return Math.round(150 + followers * 0.04);
}

// ---------- Fighter callouts ----------
// After a big win, a fighter sometimes calls out a specific next
// opponent — real callout culture. Book that exact matchup later and it
// pays off; ignore it and it just quietly expires.
export const CALLOUT_CHANCE = 0.3;
export const CALLOUT_EXPIRY_WEEKS = 8;
export const CALLOUT_PRESTIGE_BONUS = 10;

// ---------- Chirp (social media) ----------
// A chirp that clears this like count "goes viral" — its poster gets a
// modest, one-time follower bump on top of whatever the underlying
// event (a win, a loss, a callout) already earned them.
export const VIRAL_CHIRP_LIKES = 4500;
export const VIRAL_FOLLOWER_BONUS = 300;
// Per-week chance a rival-contracted fighter posts something unprompted
// — hyping their own run or shading your current champion — independent
// of anything you actually booked that week.
export const RIVAL_CHIRP_CHANCE = 0.15;

// ---------- Rival promotions' own cards ----------
// Each rival promotion independently rolls this chance, every week, to
// host a card of its own — a background fight between two world-pool
// fighters that moves real records and followers, and can even change
// hands who holds a division's #1 spot, all without you touching it.
export const RIVAL_CARD_CHANCE = 0.2;

// ---------- Judges' controversy ----------
// A split or majority decision sometimes reads as a robbery — the winner
// doesn't get the full credit fans think they deserved, and the fighter
// on the wrong end of it gets a sympathy bump instead. Only close-margin
// decision methods can trigger this; a clean unanimous decision, a
// finish, or a draw never does.
export function controversyChance(method) {
  if (method === 'SD') return 0.35;
  if (method === 'MD') return 0.2;
  return 0;
}

// ---------- Ranked-fighter matchmaking pressure ----------
// A fighter who's actually made a name for themselves — real skill, a
// real following, or an actual title — starts to mind being fed an
// obviously overmatched opponent outside of a Main Event. It doesn't
// block the booking, it just wears on how they feel about your
// management the same way a bad re-sign offer would.
export const MISMATCH_OVERALL_GAP = 5;
export const NOTABLE_FIGHTER_OVERALL = 14;
export const NOTABLE_FIGHTER_FOLLOWERS = 5000;

export function isNotableFighter(fighter) {
  return !!fighter && (fighter.overall >= NOTABLE_FIGHTER_OVERALL || (fighter.followers || 0) >= NOTABLE_FIGHTER_FOLLOWERS || !!fighter.title);
}

export function isMismatchedBooking(fighter, opponent, fightType) {
  if (!fighter || !opponent || fightType === FIGHT_TYPES.MAIN_EVENT) return false;
  return isNotableFighter(fighter) && fighter.overall - opponent.overall >= MISMATCH_OVERALL_GAP;
}

// ---------- Legacy fights ----------
// A veteran within sight of retirement headlining a Main Event is a
// bigger draw than the same booking would be at 27 — this could be one
// of their last walks, and everyone knows it.
export const LEGACY_FIGHT_AGE_WINDOW = 2;
export const LEGACY_FIGHT_PURSE_BONUS_PCT = 25;

export function isLegacyFight(age) {
  return age >= RETIREMENT_AGE - LEGACY_FIGHT_AGE_WINDOW;
}

// ---------- Rivalries & rematches ----------
// Fans pay more to see a rubber match than a fresh matchup — the extra
// draw of unfinished business between two people who've already fought.
export const REMATCH_PURSE_BONUS_PCT = 20;
// A win/loss streak this long is notable enough to actually talk about.
export const NOTABLE_STREAK_LENGTH = 3;

// ---------- Title implications ----------
// A title fight needs a real ranked contender on the other side of the
// cage — how deep into the rankings still counts as a live threat.
export const TITLE_CONTENDER_SLOTS = 5;
export const INTERIM_TITLE_PURSE_BONUS_PCT = 30;
