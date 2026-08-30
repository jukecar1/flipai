// Static reference data for the airline sim: airports and the aircraft
// you can buy. Distances are computed from lat/lon so routes have a
// real-ish cost/revenue relationship to how far apart the airports are.

export const AIRPORTS = [
  { code: 'JFK', city: 'New York', lat: 40.6413, lon: -73.7781 },
  { code: 'LAX', city: 'Los Angeles', lat: 33.9416, lon: -118.4085 },
  { code: 'ORD', city: 'Chicago', lat: 41.9742, lon: -87.9073 },
  { code: 'MIA', city: 'Miami', lat: 25.7959, lon: -80.2870 },
  { code: 'DFW', city: 'Dallas', lat: 32.8998, lon: -97.0403 },
  { code: 'SEA', city: 'Seattle', lat: 47.4502, lon: -122.3088 },
  { code: 'DEN', city: 'Denver', lat: 39.8561, lon: -104.6737 },
  { code: 'ATL', city: 'Atlanta', lat: 33.6407, lon: -84.4277 },
  { code: 'BOS', city: 'Boston', lat: 42.3656, lon: -71.0096 },
  { code: 'LAS', city: 'Las Vegas', lat: 36.0840, lon: -115.1537 },
];

export const HOME_AIRPORT = 'JFK';

export function distanceKm(codeA, codeB) {
  const a = AIRPORTS.find((x) => x.code === codeA);
  const b = AIRPORTS.find((x) => x.code === codeB);
  if (!a || !b) return 0;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

// category matches the grouping used on the Fleet screen
export const AIRCRAFT_TYPES = [
  {
    id: 'E195',
    name: 'E195',
    category: 'Regional',
    capacity: 108,
    speedKmh: 830,
    rangeKm: 3900,
    price: 32_000_000,
    fuelBurnPerKm: 3.1,
    crewCostPerFlight: 900,
    maintPerFlight: 500,
    checkIntervalHours: 600,
  },
  {
    id: '737-300',
    name: '737-300',
    category: 'Narrowbody',
    capacity: 140,
    speedKmh: 850,
    rangeKm: 4400,
    price: 48_000_000,
    fuelBurnPerKm: 4.2,
    crewCostPerFlight: 1300,
    maintPerFlight: 750,
    checkIntervalHours: 750,
  },
  {
    id: '737-900',
    name: '737-900',
    category: 'Narrowbody',
    capacity: 178,
    speedKmh: 850,
    rangeKm: 5400,
    price: 62_000_000,
    fuelBurnPerKm: 4.6,
    crewCostPerFlight: 1500,
    maintPerFlight: 850,
    checkIntervalHours: 750,
  },
  {
    id: 'A320',
    name: 'A320',
    category: 'Narrowbody',
    capacity: 150,
    speedKmh: 840,
    rangeKm: 6100,
    price: 58_000_000,
    fuelBurnPerKm: 4.1,
    crewCostPerFlight: 1400,
    maintPerFlight: 800,
    checkIntervalHours: 750,
  },
  {
    id: '787-9',
    name: '787-9',
    category: 'Widebody',
    capacity: 296,
    speedKmh: 900,
    rangeKm: 14100,
    price: 250_000_000,
    fuelBurnPerKm: 6.8,
    crewCostPerFlight: 4200,
    maintPerFlight: 2200,
    checkIntervalHours: 900,
  },
  {
    id: '747-400',
    name: '747-400',
    category: 'Jumbo',
    capacity: 416,
    speedKmh: 910,
    rangeKm: 13400,
    price: 210_000_000,
    fuelBurnPerKm: 9.8,
    crewCostPerFlight: 5200,
    maintPerFlight: 2800,
    checkIntervalHours: 900,
  },
  {
    id: '767F',
    name: '767-300F',
    category: 'Cargo',
    capacity: 52_000, // kg of cargo instead of pax
    speedKmh: 850,
    rangeKm: 6000,
    price: 95_000_000,
    fuelBurnPerKm: 5.4,
    crewCostPerFlight: 1600,
    maintPerFlight: 1100,
    checkIntervalHours: 800,
    cargo: true,
  },
];

export const CATEGORIES = ['Narrowbody', 'Regional', 'Widebody', 'Jumbo', 'Cargo'];

export const BRAND_COLORS = [
  '#3b82f6', '#38bdf8', '#2563eb', '#14b8a6', '#22c55e',
  '#4ade80', '#eab308', '#f97316', '#ef4444', '#f87171',
  '#a855f7', '#94a3b8',
];

export function formatMoney(n, opts = {}) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(opts.short ? 1 : 2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(opts.short ? 1 : 2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${Math.round(abs)}`;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatDate(iso) {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}
