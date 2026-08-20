import { WEIGHT_CLASSES } from './constants';
import { randomBoxerName } from './namePool';

let boxerCounter = 1;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function makeBoxer({ weightClassId, level = 'prospect', seedId } = {}) {
  const wc = weightClassId
    ? WEIGHT_CLASSES.find(w => w.id === weightClassId)
    : WEIGHT_CLASSES[randInt(0, WEIGHT_CLASSES.length - 1)];

  const { name, nationality } = randomBoxerName();

  const baseFloor = level === 'contender' ? 12 : level === 'gatekeeper' ? 9 : 5;
  const baseCeil = level === 'contender' ? 19 : level === 'gatekeeper' ? 15 : 12;

  const stats = {
    power: randInt(baseFloor, baseCeil),
    speed: randInt(baseFloor, baseCeil),
    chin: randInt(baseFloor, baseCeil),
    stamina: randInt(baseFloor, baseCeil),
    defense: randInt(baseFloor, baseCeil),
  };

  const overall = Math.round(
    (stats.power + stats.speed + stats.chin + stats.stamina + stats.defense) / 5
  );

  const age = randInt(19, 34);
  const wins = level === 'prospect' ? randInt(0, 3) : level === 'gatekeeper' ? randInt(8, 18) : randInt(15, 35);
  const losses = level === 'prospect' ? (Math.random() < 0.15 ? 1 : 0) : randInt(0, 5);
  const draws = Math.random() < 0.08 ? 1 : 0;
  const kos = Math.round(wins * (0.3 + Math.random() * 0.4));

  return {
    id: seedId || `bx_${boxerCounter++}_${Date.now().toString(36)}`,
    name,
    nationality,
    weightClass: wc.id,
    age,
    stats,
    overall: clamp(overall, 1, 20),
    record: { wins, losses, draws, kos },
    fatigue: 0,
    injuryWeeks: 0,
    xp: randInt(0, 5000),
    purseFloor: Math.round(500 + overall * 150 + (wins + losses) * 40),
    signed: false,
    retired: false,
  };
}

export function makeStartingRoster(count = 3) {
  const classes = [...WEIGHT_CLASSES].sort(() => Math.random() - 0.5).slice(0, count);
  return classes.map(wc => makeBoxer({ weightClassId: wc.id, level: 'prospect' }));
}

export function makeOpponentPool(weightClassId, count = 6) {
  const roll = () => {
    const r = Math.random();
    if (r < 0.55) return 'prospect';
    if (r < 0.85) return 'gatekeeper';
    return 'contender';
  };
  return Array.from({ length: count }, () => makeBoxer({ weightClassId, level: roll() }));
}
