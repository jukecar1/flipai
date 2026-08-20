import { SAVE_SLOT_COUNT } from './constants';

const KEY = 'fightEmpire.saves.v1';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(saves) {
  try {
    localStorage.setItem(KEY, JSON.stringify(saves));
  } catch {
    // storage full or unavailable — fail silently, game still playable this session
  }
}

export function listSaves() {
  const saves = readAll();
  const slots = [];
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    slots.push(saves.find(s => s.slot === i) || null);
  }
  return slots;
}

export function saveToSlot(slot, state) {
  const saves = readAll().filter(s => s.slot !== slot);
  saves.push({
    slot,
    savedAt: Date.now(),
    meta: {
      promotionName: state.meta.promotionName,
      managerName: state.meta.managerName,
      hq: state.meta.hq,
      week: state.week,
      funds: state.funds,
      record: state.record,
    },
    state,
  });
  writeAll(saves);
}

export function loadFromSlot(slot) {
  const saves = readAll();
  const entry = saves.find(s => s.slot === slot);
  return entry ? entry.state : null;
}

export function deleteSlot(slot) {
  const saves = readAll().filter(s => s.slot !== slot);
  writeAll(saves);
}
