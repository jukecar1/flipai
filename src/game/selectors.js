// Derived read-only views over game state — kept separate from the
// reducer so screens can compute what they need without duplicating logic.
import { AIRCRAFT_TYPES, CATEGORIES } from './data';

function typeOf(id) {
  return AIRCRAFT_TYPES.find((t) => t.id === id);
}

export function fleetList(state) {
  return Object.values(state.aircraft).map((a) => ({ ...a, type: typeOf(a.typeId) }));
}

export function fleetStats(state) {
  const list = fleetList(state);
  const total = list.length;
  const utilized = list.filter((a) => a.routeId).length;
  const aog = list.filter((a) => a.status === 'maintenance').length;
  const avgAgeYears = total ? list.reduce((s, a) => s + a.ageWeeks, 0) / total / 52 : 0;
  return {
    total,
    utilizedPct: total ? Math.round((utilized / total) * 100) : 0,
    aog,
    avgAgeYears,
  };
}

export function fleetByCategory(state) {
  const list = fleetList(state);
  return CATEGORIES.map((cat) => ({
    category: cat,
    items: list.filter((a) => a.type.category === cat).sort((a, b) => a.tail.localeCompare(b.tail)),
  })).filter((g) => g.items.length > 0);
}

export function routeList(state) {
  return Object.values(state.routes).map((r) => ({
    ...r,
    aircraft: r.aircraftId ? { ...state.aircraft[r.aircraftId], type: typeOf(state.aircraft[r.aircraftId].typeId) } : null,
  }));
}

export function needsAttention(state) {
  const routes = routeList(state);
  const { scheduled = 0, completed = 0 } = state.lastWeek || {};
  const cancelled = Math.max(0, scheduled - completed);
  const completionRate = scheduled ? completed / scheduled : 1;

  const items = [];
  if (state.weekIndex > 0 && cancelled > 0) {
    items.push({
      id: 'cancelled',
      severity: 'bad',
      title: `${cancelled} flight${cancelled === 1 ? '' : 's'} cancelled this week`,
      detail: `Completion rate ${(completionRate * 100).toFixed(1)}%. Check aircraft in maintenance.`,
      tag: 'This week',
    });
  }

  const lowLoad = routes.filter((r) => r.aircraft && r.lastWeek && r.lastWeek.loadFactor > 0 && r.lastWeek.loadFactor < 0.55);
  if (lowLoad.length > 0) {
    items.push({
      id: 'lowload',
      severity: 'warn',
      title: `${lowLoad.length} route${lowLoad.length === 1 ? '' : 's'} below 55% load factor`,
      detail: 'Multiple routes are underperforming. Consider adjusting frequency.',
      tag: 'Ongoing',
    });
  }

  const idle = fleetList(state).filter((a) => a.status === 'active' && !a.routeId);
  if (idle.length > 0) {
    items.push({
      id: 'idle',
      severity: 'accent',
      title: `${idle.length} aircraft with no active routes`,
      detail: 'Idle aircraft still cost money. Assign them to a route.',
      tag: 'Action',
    });
  }

  return items;
}

export { typeOf };
