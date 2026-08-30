// Turn-based airline management simulation.
// Pure state + reducer, no React/RN dependencies — advanceWeek() runs the
// whole weekly simulation (revenue, cost, maintenance, aging) in one pass.

import { AIRCRAFT_TYPES, distanceKm } from './data';

const START_CASH = 60_000_000;
const FUEL_PRICE_PER_UNIT = 1.15; // $ per (fuelBurnPerKm unit * km)
const TICKET_RATE_PER_KM = 0.11; // $ per passenger-km
const TICKET_BASE_FARE = 40; // $ flat per passenger
const CARGO_RATE_PER_KG_KM = 0.00045;
const IDLE_PARKING_FEE = 20_000; // $/week per aircraft with no route
const WEEKLY_OVERHEAD = 60_000; // flat admin overhead
const MAINT_DOWN_WEEKS = 1;
const MAX_HISTORY = 24;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function typeOf(id) {
  return AIRCRAFT_TYPES.find((t) => t.id === id);
}

export function codesFromName(rawName) {
  const name = (rawName || '').trim() || 'New Airways';
  const words = name.split(/\s+/).filter(Boolean);
  const initials = words.map((w) => w[0].toUpperCase()).join('');
  const lettersOnly = (name.replace(/[^A-Za-z]/g, '').toUpperCase() || 'AIR');
  const icao = initials.length >= 3 ? initials.slice(0, 3) : (lettersOnly + 'XXX').slice(0, 3);
  const iata = initials.length >= 2 ? initials.slice(0, 2) : (lettersOnly + 'XX').slice(0, 2);
  const callsign = lettersOnly.slice(0, 8) || 'FLIPAIR';
  return { iata, icao, callsign };
}

function addWeeks(iso, weeks) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString();
}

function makeAircraft(id, typeId, tail) {
  return {
    id,
    tail,
    typeId,
    status: 'active',
    routeId: null,
    hoursSinceCheck: 0,
    totalHours: 0,
    cycles: 0,
    ageWeeks: 0,
    maintWeeksLeft: 0,
    lastWeek: null,
  };
}

export function newGameState(name, color) {
  const codes = codesFromName(name);
  const nowIso = new Date().toISOString();
  const starterId = 'AC1';
  const starterTail = `N-${codes.icao}01`;
  return {
    meta: { name: name?.trim() || 'New Airways', color, ...codes },
    dateIso: nowIso,
    weekIndex: 0,
    cash: START_CASH,
    aircraft: { [starterId]: makeAircraft(starterId, 'E195', starterTail) },
    routes: {},
    history: [],
    lastWeek: { revenue: 0, cost: 0, profit: 0, scheduled: 0, completed: 0, avgLoad: 0 },
    nextAircraftNum: 2,
    nextRouteNum: 1,
    selectedRouteAircraft: null,
  };
}

function reassignableAircraftList(state) {
  return Object.values(state.aircraft).filter((a) => a.status === 'active' && !a.routeId);
}

function doNextWeek(state) {
  state.weekIndex += 1;
  state.dateIso = addWeeks(state.dateIso, 1);

  let revenue = 0;
  let cost = 0;
  let scheduled = 0;
  let completed = 0;
  let loadSum = 0;
  let loadCount = 0;

  // Aircraft maintenance countdown resolves first so a plane coming off
  // maintenance this week can fly again.
  Object.values(state.aircraft).forEach((a) => {
    a.ageWeeks += 1;
    if (a.status === 'maintenance') {
      a.maintWeeksLeft -= 1;
      if (a.maintWeeksLeft <= 0) {
        a.status = 'active';
        a.maintWeeksLeft = 0;
      }
    }
  });

  Object.values(state.routes).forEach((route) => {
    const aircraft = route.aircraftId ? state.aircraft[route.aircraftId] : null;
    if (!aircraft) {
      route.lastWeek = { flights: 0, completed: 0, loadFactor: 0, revenue: 0, cost: 0, profit: 0 };
      return;
    }
    scheduled += route.frequency;
    if (aircraft.status !== 'active') {
      route.lastWeek = { flights: route.frequency, completed: 0, loadFactor: 0, revenue: 0, cost: 0, profit: 0 };
      return;
    }

    const type = typeOf(aircraft.typeId);
    const loadFactor = Math.max(0.35, Math.min(0.98, 0.68 + (Math.random() - 0.5) * 0.5));
    const flights = route.frequency;

    let flightRevenue;
    if (type.cargo) {
      const kg = type.capacity * loadFactor;
      flightRevenue = kg * route.distanceKm * CARGO_RATE_PER_KG_KM;
    } else {
      const pax = type.capacity * loadFactor;
      flightRevenue = pax * (TICKET_BASE_FARE + route.distanceKm * TICKET_RATE_PER_KM);
    }
    const weekRevenue = flightRevenue * flights;
    const fuelCost = type.fuelBurnPerKm * route.distanceKm * flights * FUEL_PRICE_PER_UNIT;
    const crewCost = type.crewCostPerFlight * flights;
    const maintCost = type.maintPerFlight * flights;
    const weekCost = fuelCost + crewCost + maintCost;

    route.lastWeek = {
      flights,
      completed: flights,
      loadFactor,
      revenue: weekRevenue,
      cost: weekCost,
      profit: weekRevenue - weekCost,
    };

    revenue += weekRevenue;
    cost += weekCost;
    completed += flights;
    loadSum += loadFactor;
    loadCount += 1;

    const flightHours = route.distanceKm / type.speedKmh;
    aircraft.totalHours += flightHours * flights;
    aircraft.hoursSinceCheck += flightHours * flights;
    aircraft.cycles += flights;

    if (aircraft.hoursSinceCheck >= type.checkIntervalHours) {
      aircraft.status = 'maintenance';
      aircraft.maintWeeksLeft = MAINT_DOWN_WEEKS;
      aircraft.hoursSinceCheck = 0;
    }
  });

  const idleFleet = Object.values(state.aircraft).filter((a) => a.status === 'active' && !a.routeId).length;
  const overhead = WEEKLY_OVERHEAD + idleFleet * IDLE_PARKING_FEE;
  cost += overhead;

  const profit = revenue - cost;
  state.cash += profit;

  const avgLoad = loadCount ? loadSum / loadCount : 0;
  state.lastWeek = { revenue, cost, profit, scheduled, completed, avgLoad, overhead };
  state.history = [...state.history, { weekIndex: state.weekIndex, dateIso: state.dateIso, revenue, cost, profit }].slice(
    -MAX_HISTORY
  );
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'NEW_GAME':
      return newGameState(action.name, action.color);
    case 'LOAD_STATE':
      return action.state;
    case 'NEXT_WEEK': {
      const next = clone(state);
      doNextWeek(next);
      return next;
    }
    case 'BUY_AIRCRAFT': {
      const type = typeOf(action.typeId);
      if (!type || state.cash < type.price) return state;
      const next = clone(state);
      const id = `AC${next.nextAircraftNum}`;
      const tail = `N-${next.meta.icao}${String(next.nextAircraftNum).padStart(2, '0')}`;
      next.aircraft[id] = makeAircraft(id, type.id, tail);
      next.cash -= type.price;
      next.nextAircraftNum += 1;
      return next;
    }
    case 'SELL_AIRCRAFT': {
      const aircraft = state.aircraft[action.id];
      if (!aircraft) return state;
      const type = typeOf(aircraft.typeId);
      const next = clone(state);
      if (aircraft.routeId && next.routes[aircraft.routeId]) {
        next.routes[aircraft.routeId].aircraftId = null;
      }
      next.cash += Math.round((type?.price || 0) * 0.5);
      delete next.aircraft[action.id];
      return next;
    }
    case 'CREATE_ROUTE': {
      const { origin, destination, aircraftId, frequency } = action;
      if (origin === destination) return state;
      const aircraft = aircraftId ? state.aircraft[aircraftId] : null;
      if (aircraftId && (!aircraft || aircraft.status !== 'active' || aircraft.routeId)) return state;
      const next = clone(state);
      const id = `R${next.nextRouteNum}`;
      next.routes[id] = {
        id,
        origin,
        destination,
        distanceKm: distanceKm(origin, destination),
        aircraftId: aircraftId || null,
        frequency,
        lastWeek: null,
      };
      if (aircraftId) next.aircraft[aircraftId].routeId = id;
      next.nextRouteNum += 1;
      return next;
    }
    case 'ASSIGN_AIRCRAFT_TO_ROUTE': {
      const route = state.routes[action.routeId];
      const aircraft = state.aircraft[action.aircraftId];
      if (!route || !aircraft || aircraft.status !== 'active' || aircraft.routeId) return state;
      if (route.aircraftId) return state;
      const next = clone(state);
      next.routes[action.routeId].aircraftId = action.aircraftId;
      next.aircraft[action.aircraftId].routeId = action.routeId;
      return next;
    }
    case 'UNASSIGN_ROUTE_AIRCRAFT': {
      const route = state.routes[action.routeId];
      if (!route || !route.aircraftId) return state;
      const next = clone(state);
      next.aircraft[route.aircraftId].routeId = null;
      next.routes[action.routeId].aircraftId = null;
      return next;
    }
    case 'SET_FREQUENCY': {
      const route = state.routes[action.routeId];
      if (!route) return state;
      const next = clone(state);
      next.routes[action.routeId].frequency = action.frequency;
      return next;
    }
    case 'REMOVE_ROUTE': {
      const route = state.routes[action.routeId];
      if (!route) return state;
      const next = clone(state);
      if (route.aircraftId && next.aircraft[route.aircraftId]) {
        next.aircraft[route.aircraftId].routeId = null;
      }
      delete next.routes[action.routeId];
      return next;
    }
    default:
      return state;
  }
}

export function unassignedAircraft(state) {
  return reassignableAircraftList(state);
}

export { typeOf as aircraftTypeOf };
