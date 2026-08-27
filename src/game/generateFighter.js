import { WEIGHT_CLASSES, STARTING_ROSTER_POOL_SIZE, effectiveOverall, LOYALTY_BASELINE, clampLoyalty } from './constants';
import { randomFighterName } from './namePool';

let fighterCounter = 1;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// A fighter leans striker, wrestler, or well-rounded — this skews which
// stats roll high and flavors how the engine plays them out.
const ARCHETYPES = ['striker', 'wrestler', 'allrounder'];

export function makeFighter({ weightClassId, level = 'prospect', seedId } = {}) {
  const wc = weightClassId
    ? WEIGHT_CLASSES.find(w => w.id === weightClassId)
    : WEIGHT_CLASSES[randInt(0, WEIGHT_CLASSES.length - 1)];

  const { name, nationality } = randomFighterName();

  const baseFloor = level === 'contender' ? 12 : level === 'gatekeeper' ? 9 : level === 'amateur' ? 3 : 5;
  const baseCeil = level === 'contender' ? 19 : level === 'gatekeeper' ? 15 : level === 'amateur' ? 9 : 12;
  const archetype = ARCHETYPES[randInt(0, ARCHETYPES.length - 1)];

  const roll = () => randInt(baseFloor, baseCeil);
  const boost = n => clamp(n + randInt(2, 4), 1, 20);

  let striking = roll();
  let wrestling = roll();
  let submission = roll();
  const chin = roll();
  const cardio = roll();

  if (archetype === 'striker') striking = boost(striking);
  if (archetype === 'wrestler') wrestling = boost(wrestling);
  if (archetype === 'allrounder') submission = boost(submission);

  const stats = { striking, wrestling, submission, chin, cardio };
  const age = level === 'amateur' ? randInt(18, 23) : randInt(19, 36);
  // OVR always reflects trained stats scaled by the age curve — see
  // effectiveOverall in constants.js for the rookie-ramp/prime/decline math.
  const overall = effectiveOverall(stats, age);
  const wins = level === 'amateur' ? 0 : level === 'prospect' ? randInt(0, 3) : level === 'gatekeeper' ? randInt(8, 18) : randInt(15, 30);
  const losses = level === 'amateur' ? 0 : level === 'prospect' ? (Math.random() < 0.15 ? 1 : 0) : randInt(0, 6);
  const draws = level === 'amateur' ? 0 : (Math.random() < 0.05 ? 1 : 0);
  const finishes = Math.round(wins * (0.35 + Math.random() * 0.4));
  const kos = Math.round(finishes * (archetype === 'wrestler' ? 0.3 : 0.6));
  const subs = finishes - kos;

  // A fresh prospect (or an unproven amateur) has no following yet — a
  // proven gatekeeper or contender has already built an audience through
  // their record.
  const followers = level === 'prospect' || level === 'amateur' ? 0 : level === 'gatekeeper' ? randInt(500, 3000) : randInt(3000, 15000);

  return {
    id: seedId || `fx_${fighterCounter++}_${Date.now().toString(36)}`,
    name,
    nationality,
    weightClass: wc.id,
    age,
    archetype,
    stats,
    overall: clamp(overall, 1, 20),
    record: { wins, losses, draws, kos, subs },
    // A freshly generated fighter's streak starts neutral — we don't know
    // their real recent form, just their career-to-date record.
    winStreak: 0,
    lossStreak: 0,
    followers,
    fatigue: 0,
    injuryWeeks: 0,
    xp: randInt(0, 5000),
    purseFloor: Math.round(600 + overall * 170 + (wins + losses) * 45),
    promotionId: null, // which rival promotion (if any) holds this fighter's contract
    champion: false, // holds a rival promotion's divisional belt
    signed: false,
    retired: false,
    // How content this fighter is with their current management — only
    // meaningful for rival-owned fighters sitting in the world pool (any
    // fighter you actually sign has this reset to a fresh baseline). Gives
    // real variance to poach odds instead of every rival fighter being an
    // identical coin flip.
    loyalty: clampLoyalty(LOYALTY_BASELINE + randInt(-30, 25)),
  };
}

export function makeStartingRoster(count = 3) {
  const classes = [...WEIGHT_CLASSES].sort(() => Math.random() - 0.5).slice(0, count);
  return classes.map(wc => makeFighter({ weightClassId: wc.id, level: 'prospect' }));
}

// A wide, visible spread of prospects to draft a starting roster from —
// weight classes are cycled and shuffled so the pool doesn't clump into
// just a couple of divisions, and archetype/stats fall out naturally from
// makeFighter's own randomization.
export function makeRosterCandidates(count = STARTING_ROSTER_POOL_SIZE) {
  const classes = [];
  while (classes.length < count) classes.push(...WEIGHT_CLASSES.map(w => w.id));
  const shuffled = classes.slice(0, count).sort(() => Math.random() - 0.5);
  return shuffled.map(wcId => makeFighter({ weightClassId: wcId, level: 'prospect' }));
}

// A scouting trip turns up a small handful of prospects at one weight
// class to choose between, instead of silently handing you one.
export function makeScoutCandidates(weightClassId, count = 3) {
  return Array.from({ length: count }, () => makeFighter({ weightClassId, level: 'prospect' }));
}

// Raw, unproven amateur talent — cheap to sign, no record or following
// yet. A few of these turn up whenever you go looking for amateurs.
export function makeAmateurCandidates(weightClassId, count = 3) {
  return Array.from({ length: count }, () => makeFighter({ weightClassId, level: 'amateur' }));
}

export function makeOpponentPool(weightClassId, count = 12) {
  const rollLevel = () => {
    const r = Math.random();
    if (r < 0.55) return 'prospect';
    if (r < 0.85) return 'gatekeeper';
    return 'contender';
  };
  return Array.from({ length: count }, () => makeFighter({ weightClassId, level: rollLevel() }));
}
