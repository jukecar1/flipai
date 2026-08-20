import { WEIGHT_CLASSES } from './constants';
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

  const baseFloor = level === 'contender' ? 12 : level === 'gatekeeper' ? 9 : 5;
  const baseCeil = level === 'contender' ? 19 : level === 'gatekeeper' ? 15 : 12;
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

  const overall = Math.round(
    (stats.striking + stats.wrestling + stats.submission + stats.chin + stats.cardio) / 5
  );

  const age = randInt(19, 36);
  const wins = level === 'prospect' ? randInt(0, 3) : level === 'gatekeeper' ? randInt(8, 18) : randInt(15, 30);
  const losses = level === 'prospect' ? (Math.random() < 0.15 ? 1 : 0) : randInt(0, 6);
  const draws = Math.random() < 0.05 ? 1 : 0;
  const finishes = Math.round(wins * (0.35 + Math.random() * 0.4));
  const kos = Math.round(finishes * (archetype === 'wrestler' ? 0.3 : 0.6));
  const subs = finishes - kos;

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
    fatigue: 0,
    injuryWeeks: 0,
    xp: randInt(0, 5000),
    purseFloor: Math.round(600 + overall * 170 + (wins + losses) * 45),
    promotionId: null, // which rival promotion (if any) holds this fighter's contract
    champion: false, // holds a rival promotion's divisional belt
    signed: false,
    retired: false,
  };
}

export function makeStartingRoster(count = 3) {
  const classes = [...WEIGHT_CLASSES].sort(() => Math.random() - 0.5).slice(0, count);
  return classes.map(wc => makeFighter({ weightClassId: wc.id, level: 'prospect' }));
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
