// Core simulation engine for the Airport Manager game.
// Pure state + reducer, no rendering concerns live here.
// (Uses a JSON-based deep clone instead of structuredClone for
// compatibility with the Hermes engine used by React Native/Expo.)

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export const DAY_LENGTH = 60; // ticks per in-game "day"
export const LANDING_TICKS = 3;
export const DEPART_TICKS = 3;
export const HOLD_PATIENCE = 45; // ticks a plane will circle before diverting
export const EMERGENCY_THRESHOLD = 15; // patience left when it starts flashing red
export const MAX_LOG = 40;
export const MAX_GATES = 8;
export const MAX_CREW = 8;

const SIZES = {
  S: { label: 'Regional', fare: 300, task: 10, weight: 5 },
  M: { label: 'Narrowbody', fare: 550, task: 14, weight: 4 },
  L: { label: 'Widebody', fare: 850, task: 18, weight: 2 },
};

const AIRLINES = ['FlipAir', 'BlueWing', 'SunJet', 'Coastal', 'NorthStar', 'Vantage'];

function pickSize() {
  const total = Object.values(SIZES).reduce((s, v) => s + v.weight, 0);
  let r = Math.random() * total;
  for (const [key, v] of Object.entries(SIZES)) {
    r -= v.weight;
    if (r <= 0) return key;
  }
  return 'S';
}

let uid = 1;
function nextId(prefix) {
  return `${prefix}${uid++}`;
}

function makePlane(tick) {
  const size = pickSize();
  const meta = SIZES[size];
  const airline = AIRLINES[Math.floor(Math.random() * AIRLINES.length)];
  const callsign = `${airline.slice(0, 2).toUpperCase()}${100 + Math.floor(Math.random() * 899)}`;
  const groundEstimate = Math.round(meta.task * 1.3) + 12; // rough unattended-ish estimate
  return {
    id: nextId('P'),
    callsign,
    airline,
    size,
    label: meta.label,
    fare: meta.fare,
    spawnTick: tick,
    scheduledDeparture: tick + HOLD_PATIENCE * 0.4 + groundEstimate,
    status: 'holding',
    fuelPatience: HOLD_PATIENCE,
    emergency: false,
    gateId: null,
    fuelTask: { remaining: meta.task, total: meta.task },
    rampTask: { remaining: meta.task, total: meta.task },
  };
}

export function initialState() {
  const gates = [0, 1, 2, 3].map((i) => ({ id: `G${i + 1}`, planeId: null }));
  const crews = [
    { id: 'C1', type: 'fuel', gateId: null },
    { id: 'C2', type: 'fuel', gateId: null },
    { id: 'C3', type: 'ramp', gateId: null },
    { id: 'C4', type: 'ramp', gateId: null },
  ];
  return {
    tick: 0,
    day: 1,
    money: 2000,
    reputation: 100,
    speed: 1,
    paused: false,
    gameOver: false,
    gates,
    crews,
    runway: { occupantId: null, mode: null, freeAtTick: 0 },
    planes: {},
    selected: null,
    log: [{ tick: 0, kind: 'info', text: 'Welcome to Flip Airport. Clear arrivals to land and get them turned around!' }],
    gateCost: 1500,
    crewCost: 800,
    stats: { completed: 0, diverted: 0 },
  };
}

function addLog(state, kind, text) {
  const entry = { tick: state.tick, kind, text };
  state.log = [entry, ...state.log].slice(0, MAX_LOG);
}

function freeCrewsForGate(state, gateId) {
  state.crews.forEach((c) => {
    if (c.gateId === gateId) c.gateId = null;
  });
}

function spawnRate(day) {
  return Math.min(0.05 + day * 0.012, 0.32);
}

function doTick(state) {
  state.tick += 1;
  const newDay = 1 + Math.floor(state.tick / DAY_LENGTH);
  if (newDay !== state.day) {
    state.day = newDay;
    addLog(state, 'day', `Day ${newDay} begins. Traffic is picking up.`);
  }

  // --- Spawn arrivals ---
  const activeCount = Object.values(state.planes).length;
  if (activeCount < 14 && Math.random() < spawnRate(state.day)) {
    const p = makePlane(state.tick);
    state.planes[p.id] = p;
    addLog(state, 'arrival', `${p.callsign} (${p.label}) is inbound, requesting to land.`);
  }

  // --- Runway resolution ---
  const rw = state.runway;
  if (rw.occupantId && state.tick >= rw.freeAtTick) {
    const plane = state.planes[rw.occupantId];
    if (plane) {
      if (rw.mode === 'landing') {
        const freeGate = state.gates.find((g) => !g.planeId);
        if (freeGate) {
          freeGate.planeId = plane.id;
          plane.gateId = freeGate.id;
          plane.status = 'atGate';
          addLog(state, 'taxi', `${plane.callsign} landed and is taxiing to ${freeGate.id}.`);
        } else {
          plane.status = 'waitingForGate';
          addLog(state, 'taxi', `${plane.callsign} landed and is holding on the taxiway for an open gate.`);
        }
      } else if (rw.mode === 'departing') {
        const lateness = Math.max(0, state.tick - plane.scheduledDeparture);
        const onTimeBonus = lateness === 0 ? Math.round(plane.fare * 0.3) : 0;
        const latePenalty = Math.min(plane.fare * 0.8, lateness * 8);
        const payout = Math.round(plane.fare + onTimeBonus - latePenalty);
        state.money += payout;
        state.reputation = Math.max(0, Math.min(100, state.reputation + (lateness === 0 ? 1 : lateness > 20 ? -3 : 0)));
        state.stats.completed += 1;
        if (plane.gateId) {
          const g = state.gates.find((x) => x.id === plane.gateId);
          if (g) g.planeId = null;
          freeCrewsForGate(state, plane.gateId);
        }
        addLog(
          state,
          lateness === 0 ? 'success' : 'warn',
          `${plane.callsign} departed ${lateness === 0 ? 'on time' : `${lateness}t late`}. +$${payout}.`
        );
        delete state.planes[plane.id];
      }
      rw.occupantId = null;
      rw.mode = null;
    } else {
      rw.occupantId = null;
      rw.mode = null;
    }
  }

  // --- Assign free gates to planes waiting on the taxiway ---
  const waiting = Object.values(state.planes)
    .filter((p) => p.status === 'waitingForGate')
    .sort((a, b) => a.spawnTick - b.spawnTick);
  for (const p of waiting) {
    const freeGate = state.gates.find((g) => !g.planeId);
    if (!freeGate) break;
    freeGate.planeId = p.id;
    p.gateId = freeGate.id;
    p.status = 'atGate';
    addLog(state, 'taxi', `${p.callsign} is now taxiing into ${freeGate.id}.`);
  }

  // --- Ground service progress ---
  Object.values(state.planes).forEach((p) => {
    if (p.status !== 'atGate') return;
    const fuelCrew = state.crews.some((c) => c.gateId === p.gateId && c.type === 'fuel');
    const rampCrew = state.crews.some((c) => c.gateId === p.gateId && c.type === 'ramp');
    p.fuelTask.remaining = Math.max(0, p.fuelTask.remaining - (fuelCrew ? 3 : 1));
    p.rampTask.remaining = Math.max(0, p.rampTask.remaining - (rampCrew ? 3 : 1));
    if (p.fuelTask.remaining === 0 && p.rampTask.remaining === 0) {
      p.status = 'ready';
      addLog(state, 'ready', `${p.callsign} is fueled, loaded, and ready for departure.`);
    }
  });

  // --- Holding pattern fuel pressure ---
  Object.values(state.planes).forEach((p) => {
    if (p.status !== 'holding') return;
    p.fuelPatience -= 1;
    if (p.fuelPatience === EMERGENCY_THRESHOLD) {
      p.emergency = true;
      addLog(state, 'warn', `${p.callsign} is burning fuel fast — land it soon!`);
    }
    if (p.fuelPatience <= 0) {
      state.money = Math.max(0, state.money - Math.round(p.fare * 0.7));
      state.reputation = Math.max(0, state.reputation - 8);
      state.stats.diverted += 1;
      addLog(state, 'error', `${p.callsign} ran low on fuel and diverted to another airport. Reputation hit.`);
      delete state.planes[p.id];
    }
  });

  if (state.reputation <= 0) {
    state.gameOver = true;
    state.paused = true;
    addLog(state, 'error', 'Reputation has collapsed. The airport is grounded. Game over.');
  }
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'TICK': {
      if (state.paused || state.gameOver) return state;
      const next = clone(state);
      doTick(next);
      return next;
    }
    case 'SET_SPEED':
      return { ...state, speed: action.speed };
    case 'TOGGLE_PAUSE':
      return state.gameOver ? state : { ...state, paused: !state.paused };
    case 'SELECT_PLANE': {
      if (state.selected && state.selected.kind === 'plane' && state.selected.id === action.id) {
        return { ...state, selected: null };
      }
      return { ...state, selected: { kind: 'plane', id: action.id } };
    }
    case 'SELECT_CREW': {
      if (state.selected && state.selected.kind === 'crew' && state.selected.id === action.id) {
        return { ...state, selected: null };
      }
      const crew = state.crews.find((c) => c.id === action.id);
      if (!crew || crew.gateId) return state;
      return { ...state, selected: { kind: 'crew', id: action.id } };
    }
    case 'UNASSIGN_CREW': {
      const next = clone(state);
      const crew = next.crews.find((c) => c.id === action.id);
      if (crew) crew.gateId = null;
      return next;
    }
    case 'CLICK_RUNWAY': {
      if (!state.selected || state.selected.kind !== 'plane') return state;
      const plane = state.planes[state.selected.id];
      if (!plane) return { ...state, selected: null };
      const next = clone(state);
      const p = next.planes[plane.id];
      if (p.status === 'holding' && !next.runway.occupantId) {
        p.status = 'landing';
        next.runway.occupantId = p.id;
        next.runway.mode = 'landing';
        next.runway.freeAtTick = next.tick + LANDING_TICKS;
        addLog(next, 'info', `${p.callsign} cleared to land.`);
      } else if (p.status === 'ready' && !next.runway.occupantId) {
        p.status = 'departing';
        next.runway.occupantId = p.id;
        next.runway.mode = 'departing';
        next.runway.freeAtTick = next.tick + DEPART_TICKS;
        addLog(next, 'info', `${p.callsign} cleared for takeoff.`);
      } else {
        return { ...state, selected: null };
      }
      next.selected = null;
      return next;
    }
    case 'CLICK_GATE': {
      const gate = state.gates.find((g) => g.id === action.gateId);
      if (!gate) return state;
      if (state.selected && state.selected.kind === 'crew') {
        const crew = state.crews.find((c) => c.id === state.selected.id);
        const plane = gate.planeId ? state.planes[gate.planeId] : null;
        if (!crew || !plane || plane.status !== 'atGate') return { ...state, selected: null };
        const task = crew.type === 'fuel' ? plane.fuelTask : plane.rampTask;
        const alreadyAssigned = state.crews.some((c) => c.gateId === gate.id && c.type === crew.type);
        if (task.remaining <= 0 || alreadyAssigned) return { ...state, selected: null };
        const next = clone(state);
        next.crews.find((c) => c.id === crew.id).gateId = gate.id;
        next.selected = null;
        addLog(next, 'info', `${crew.type === 'fuel' ? 'Fuel truck' : 'Ramp crew'} dispatched to ${gate.id}.`);
        return next;
      }
      if (gate.planeId) {
        return { ...state, selected: { kind: 'plane', id: gate.planeId } };
      }
      return { ...state, selected: null };
    }
    case 'DESELECT':
      return { ...state, selected: null };
    case 'BUY_GATE': {
      if (state.gates.length >= MAX_GATES || state.money < state.gateCost) return state;
      const next = clone(state);
      next.money -= next.gateCost;
      next.gates.push({ id: `G${next.gates.length + 1}`, planeId: null });
      next.gateCost = Math.round(next.gateCost * 1.5);
      addLog(next, 'success', `New gate built: ${next.gates[next.gates.length - 1].id}.`);
      return next;
    }
    case 'BUY_CREW': {
      if (state.crews.length >= MAX_CREW || state.money < state.crewCost) return state;
      const next = clone(state);
      next.money -= next.crewCost;
      const fuelCount = next.crews.filter((c) => c.type === 'fuel').length;
      const rampCount = next.crews.filter((c) => c.type === 'ramp').length;
      const type = fuelCount <= rampCount ? 'fuel' : 'ramp';
      next.crews.push({ id: `C${next.crews.length + 1}`, type, gateId: null });
      next.crewCost = Math.round(next.crewCost * 1.5);
      addLog(next, 'success', `Hired a new ${type === 'fuel' ? 'fuel truck crew' : 'ramp crew'}.`);
      return next;
    }
    case 'RESTART':
      return initialState();
    default:
      return state;
  }
}
