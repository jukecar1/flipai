// Fight Empire — procedural fighter name / nationality generation

const FLAVORS = [
  {
    id: 'western',
    countries: [
      { code: 'US', name: 'USA', flag: '🇺🇸' },
      { code: 'GB', name: 'UK', flag: '🇬🇧' },
      { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
      { code: 'AU', name: 'Australia', flag: '🇦🇺' },
      { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    ],
    first: ['Marcus', 'Jake', 'Tyler', 'Connor', 'Ryan', 'Dylan', 'Ethan', 'Liam', 'Cody', 'Shane', 'Aaron', 'Brandon', 'Curtis', 'Julian', 'Kevin', 'Charles', 'Anthony', 'Vinnie', 'Keenan', 'Damien'],
    last: ['Carter', 'Moore', 'Reilly', 'Sullivan', 'Walsh', 'Booker', 'Hernandez', 'Thomas', 'Vue', 'Russell', 'Gallegos', 'Horn', 'Fielding', 'Wallace', 'Mercer', 'Doyle', 'Hayes', 'Whitfield'],
  },
  {
    id: 'latino',
    countries: [
      { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
      { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷' },
      { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
      { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
      { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
      { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
    ],
    first: ['Julio', 'Miguel', 'Rafael', 'Diego', 'Emilio', 'Santos', 'Alejandro', 'Mateo', 'Walter', 'Hector', 'Andres', 'Gael', 'Rico', 'Fernando', 'Luis', 'Oscar'],
    last: ['Zarzar', 'Ojeda', 'Delgado', 'Reyes', 'Salcedo', 'Marquez', 'Valdez', 'Campfort', 'Rundle', 'Perono', 'Cardenas', 'Estrada', 'Rosales', 'Bautista'],
  },
  {
    id: 'slavic',
    countries: [
      { code: 'RU', name: 'Russia', flag: '🇷🇺' },
      { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
      { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿' },
      { code: 'PL', name: 'Poland', flag: '🇵🇱' },
      { code: 'GE', name: 'Georgia', flag: '🇬🇪' },
      { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
    ],
    first: ['Gino', 'Mickey', 'Arno', 'Merab', 'Georgi', 'Vitaly', 'Igor', 'Oleksandr', 'Dmitri', 'Andrei', 'Yaroslav', 'Pavel'],
    last: ['Portuondo', 'Holyk', 'Neuhaus', 'Mtchedlishvili', 'Patsov', 'Volkov', 'Sokolov', 'Kravets', 'Petrenko', 'Wojcik'],
  },
  {
    id: 'african',
    countries: [
      { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
      { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
      { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
      { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
      { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
    ],
    first: ['Emeka', 'Kwame', 'Sipho', 'Femi', 'Chidi', 'Ola', 'Kofi', 'Tendai', 'Jabari', 'Zola'],
    last: ['Okafor', 'Mensah', 'Dlamini', 'Adeyemi', 'Nkosi', 'Owusu', 'Achebe', 'Mbeki', 'Osei'],
  },
  {
    id: 'asian',
    countries: [
      { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
      { code: 'JP', name: 'Japan', flag: '🇯🇵' },
      { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
      { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
      { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
    ],
    first: ['Jonny', 'Kenji', 'Ren', 'Arjo', 'Rizal', 'Minjun', 'Hiro', 'Anton', 'Dio', 'Yuto'],
    last: ['Gibilisco', 'Tanaka', 'Santos', 'Bautista', 'Nakamura', 'Widodo', 'Park', 'Suzuki', 'Cruz'],
  },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomNationality() {
  const flavor = pick(FLAVORS);
  return pick(flavor.countries);
}

export function randomFighterName() {
  const flavor = pick(FLAVORS);
  const country = pick(flavor.countries);
  const first = pick(flavor.first);
  const last = pick(flavor.last);
  return { name: `${first} ${last}`, nationality: country };
}

const PROMOTION_WORDS = [
  'Apex', 'Vanguard', 'Ironclad', 'Redline', 'Warfront', 'Fury', 'Steel', 'Grit',
  'Blackout', 'Rampart', 'Frontline', 'Overdrive', 'Titan', 'Renegade', 'Bedrock',
  'Skyline', 'Grudge', 'Hazard', 'Wolfpack', 'Insurgent',
];

const PROMOTION_SUFFIXES = ['Fighting Championship', 'MMA', 'Fight League', 'Combat Series', 'Fighting Alliance'];

function surnameOf(fullName = '') {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || fullName;
}

// A handful of promotion-name suggestions to click instead of typing one
// from scratch — mixes the manager's surname and HQ city in with a bank
// of invented, trademark-safe fight-promotion words.
export function suggestPromotionNames(managerName, hqCity, count = 4) {
  const surname = surnameOf(managerName) || 'Empire';
  const candidates = new Set();
  const templates = [
    () => `${surname} Fighting Championship`,
    () => `${surname} MMA`,
    () => `${pick(PROMOTION_WORDS)} ${pick(PROMOTION_SUFFIXES)}`,
    () => `${hqCity || pick(CITIES).city} Fight League`,
    () => `${surname} ${pick(PROMOTION_SUFFIXES)}`,
    () => `${pick(PROMOTION_WORDS)} ${surname} MMA`,
  ];
  let guard = 0;
  while (candidates.size < count && guard++ < 40) {
    candidates.add(pick(templates)());
  }
  return [...candidates];
}

// Home-base options for Create Career — deliberately broad US coverage
// (every state plus DC, across every size tier) since your HQ's
// population drives your starting resources (see cityTierForPopulation in
// constants.js), plus a handful of international cities for flavor. `pop`
// is an approximate city-proper population, not metro-area. Listed as
// [city, state, pop] tuples so duplicate city names across states
// (Columbus OH/GA, Glendale AZ/CA, Charleston SC/WV, ...) stay unambiguous.
const US_CITY_DATA = [
  // Megacities (2M+)
  ['New York', 'NY', 8300000, 40.71, -74.01],
  ['Los Angeles', 'CA', 3900000, 34.05, -118.24],
  ['Chicago', 'IL', 2700000, 41.88, -87.63],

  // Metro (500k-2M)
  ['Houston', 'TX', 2300000, 29.76, -95.37],
  ['Phoenix', 'AZ', 1650000, 33.45, -112.07],
  ['Philadelphia', 'PA', 1580000, 39.95, -75.17],
  ['San Antonio', 'TX', 1470000, 29.42, -98.49],
  ['San Diego', 'CA', 1380000, 32.72, -117.16],
  ['Dallas', 'TX', 1290000, 32.78, -96.8],
  ['Austin', 'TX', 970000, 30.27, -97.74],
  ['Jacksonville', 'FL', 950000, 30.33, -81.66],
  ['Fort Worth', 'TX', 940000, 32.75, -97.33],
  ['Columbus', 'OH', 900000, 39.96, -83.0],
  ['Indianapolis', 'IN', 880000, 39.77, -86.16],
  ['Charlotte', 'NC', 890000, 35.23, -80.84],
  ['San Francisco', 'CA', 870000, 37.77, -122.42],
  ['Seattle', 'WA', 740000, 47.61, -122.33],
  ['Denver', 'CO', 715000, 39.74, -104.99],
  ['Washington', 'DC', 690000, 38.91, -77.04],
  ['Nashville', 'TN', 690000, 36.16, -86.78],
  ['Oklahoma City', 'OK', 680000, 35.47, -97.52],
  ['El Paso', 'TX', 680000, 31.76, -106.49],
  ['Boston', 'MA', 650000, 42.36, -71.06],
  ['Portland', 'OR', 640000, 45.52, -122.68],
  ['Las Vegas', 'NV', 640000, 36.17, -115.14],
  ['Detroit', 'MI', 630000, 42.33, -83.05],
  ['Memphis', 'TN', 620000, 35.15, -90.05],
  ['Louisville', 'KY', 620000, 38.25, -85.76],
  ['Baltimore', 'MD', 570000, 39.29, -76.61],
  ['Milwaukee', 'WI', 560000, 43.04, -87.91],
  ['Albuquerque', 'NM', 560000, 35.08, -106.65],
  ['Tucson', 'AZ', 545000, 32.22, -110.93],
  ['Fresno', 'CA', 540000, 36.75, -119.77],
  ['Sacramento', 'CA', 525000, 38.58, -121.49],
  ['Mesa', 'AZ', 510000, 33.42, -111.83],
  ['Kansas City', 'MO', 510000, 39.1, -94.58],
  ['Atlanta', 'GA', 500000, 33.75, -84.39],

  // City (100k-500k)
  ['Omaha', 'NE', 490000, 41.26, -95.94],
  ['Colorado Springs', 'CO', 480000, 38.83, -104.82],
  ['Raleigh', 'NC', 470000, 35.78, -78.64],
  ['Long Beach', 'CA', 450000, 33.77, -118.19],
  ['Virginia Beach', 'VA', 450000, 36.85, -75.98],
  ['Miami', 'FL', 440000, 25.76, -80.19],
  ['Oakland', 'CA', 430000, 37.8, -122.27],
  ['Minneapolis', 'MN', 425000, 44.98, -93.27],
  ['Tulsa', 'OK', 410000, 36.15, -95.99],
  ['Bakersfield', 'CA', 405000, 35.37, -119.02],
  ['Tampa', 'FL', 400000, 27.95, -82.46],
  ['Arlington', 'TX', 400000, 32.74, -97.11],
  ['Wichita', 'KS', 395000, 37.69, -97.34],
  ['Aurora', 'CO', 390000, 39.73, -104.83],
  ['New Orleans', 'LA', 380000, 29.95, -90.07],
  ['Cleveland', 'OH', 370000, 41.5, -81.69],
  ['Honolulu', 'HI', 350000, 21.31, -157.86],
  ['Anaheim', 'CA', 345000, 33.84, -117.91],
  ['Riverside', 'CA', 315000, 33.95, -117.4],
  ['Corpus Christi', 'TX', 320000, 27.8, -97.4],
  ['Lexington', 'KY', 320000, 38.04, -84.5],
  ['Henderson', 'NV', 320000, 36.04, -114.98],
  ['Stockton', 'CA', 310000, 37.96, -121.29],
  ['Saint Paul', 'MN', 310000, 44.95, -93.09],
  ['Cincinnati', 'OH', 310000, 39.1, -84.51],
  ['Irvine', 'CA', 310000, 33.68, -117.83],
  ['Orlando', 'FL', 310000, 28.54, -81.38],
  ['Santa Ana', 'CA', 310000, 33.75, -117.87],
  ['Newark', 'NJ', 305000, 40.74, -74.17],
  ['St. Louis', 'MO', 300000, 38.63, -90.2],
  ['Pittsburgh', 'PA', 300000, 40.44, -79.99],
  ['Greensboro', 'NC', 300000, 36.07, -79.79],
  ['Anchorage', 'AK', 290000, 61.22, -149.9],
  ['Plano', 'TX', 290000, 33.02, -96.7],
  ['Lincoln', 'NE', 290000, 40.81, -96.68],
  ['Jersey City', 'NJ', 290000, 40.72, -74.08],
  ['Durham', 'NC', 285000, 35.99, -78.9],
  ['Chula Vista', 'CA', 275000, 32.64, -117.08],
  ['Chandler', 'AZ', 275000, 33.31, -111.84],
  ['Buffalo', 'NY', 275000, 42.89, -78.88],
  ['Gilbert', 'AZ', 275000, 33.35, -111.79],
  ['Toledo', 'OH', 270000, 41.66, -83.56],
  ['Fort Wayne', 'IN', 270000, 41.08, -85.14],
  ['Madison', 'WI', 270000, 43.07, -89.4],
  ['Reno', 'NV', 270000, 39.53, -119.81],
  ['Lubbock', 'TX', 260000, 33.58, -101.86],
  ['St. Petersburg', 'FL', 260000, 27.77, -82.64],
  ['Laredo', 'TX', 260000, 27.51, -99.51],
  ['North Las Vegas', 'NV', 260000, 36.2, -115.12],
  ['Irving', 'TX', 260000, 32.81, -96.95],
  ['Winston-Salem', 'NC', 250000, 36.1, -80.24],
  ['Glendale', 'AZ', 250000, 33.54, -112.19],
  ['Chesapeake', 'VA', 250000, 36.77, -76.29],
  ['Scottsdale', 'AZ', 240000, 33.49, -111.93],
  ['Norfolk', 'VA', 235000, 36.85, -76.29],
  ['Boise', 'ID', 235000, 43.62, -116.2],
  ['Fremont', 'CA', 230000, 37.55, -121.99],
  ['Richmond', 'VA', 230000, 37.54, -77.44],
  ['Spokane', 'WA', 230000, 47.66, -117.43],
  ['San Bernardino', 'CA', 220000, 34.11, -117.29],
  ['Baton Rouge', 'LA', 220000, 30.45, -91.19],
  ['Tacoma', 'WA', 220000, 47.25, -122.44],
  ['Modesto', 'CA', 220000, 37.64, -120.99],
  ['Frisco', 'TX', 220000, 33.15, -96.82],
  ['Huntsville', 'AL', 220000, 34.73, -86.59],
  ['Santa Clarita', 'CA', 220000, 34.39, -118.54],
  ['Des Moines', 'IA', 215000, 41.59, -93.62],
  ['Fontana', 'CA', 210000, 34.09, -117.44],
  ['Rochester', 'NY', 210000, 43.16, -77.61],
  ['Yonkers', 'NY', 210000, 40.94, -73.9],
  ['Moreno Valley', 'CA', 210000, 33.94, -117.23],
  ['Fayetteville', 'NC', 210000, 35.05, -78.88],
  ['Columbus', 'GA', 205000, 32.46, -84.99],
  ['Worcester', 'MA', 205000, 42.26, -71.8],
  ['Amarillo', 'TX', 200000, 35.2, -101.83],
  ['Little Rock', 'AR', 200000, 34.75, -92.29],
  ['Grand Rapids', 'MI', 200000, 42.96, -85.67],
  ['Salt Lake City', 'UT', 200000, 40.76, -111.89],
  ['Overland Park', 'KS', 200000, 38.98, -94.67],
  ['Tallahassee', 'FL', 200000, 30.44, -84.28],
  ['Grand Prairie', 'TX', 200000, 32.75, -97.02],
  ['Huntington Beach', 'CA', 195000, 33.66, -117.98],
  ['Glendale', 'CA', 195000, 34.14, -118.26],
  ['Knoxville', 'TN', 195000, 35.96, -83.92],
  ['Tempe', 'AZ', 195000, 33.43, -111.94],
  ['Akron', 'OH', 190000, 41.08, -81.52],
  ['Providence', 'RI', 190000, 41.82, -71.41],
  ['Vancouver', 'WA', 190000, 45.64, -122.6],
  ['Newport News', 'VA', 185000, 37.09, -76.47],
  ['Brownsville', 'TX', 185000, 25.9, -97.5],
  ['Fort Lauderdale', 'FL', 185000, 26.12, -80.14],
  ['Chattanooga', 'TN', 180000, 35.05, -85.31],
  ['Oceanside', 'CA', 175000, 33.2, -117.38],
  ['Rancho Cucamonga', 'CA', 175000, 34.11, -117.59],
  ['Santa Rosa', 'CA', 175000, 38.44, -122.71],
  ['Garden Grove', 'CA', 170000, 33.77, -117.94],
  ['Charleston', 'SC', 155000, 32.78, -79.93],
  ['Jackson', 'MS', 150000, 32.3, -90.18],
  ['Fargo', 'ND', 125000, 46.88, -96.79],
  ['Manchester', 'NH', 115000, 42.99, -71.46],
  ['Billings', 'MT', 110000, 45.78, -108.5],
  ['Hartford', 'CT', 120000, 41.76, -72.69],
  ['Fort Collins', 'CO', 170000, 40.59, -105.08],
  ['Boulder', 'CO', 105000, 40.01, -105.27],

  // Small towns (<100k) — every region needs a scrappy underdog HQ
  ['Hanford', 'CA', 57000, 36.33, -119.65],
  ['Grand Junction', 'CO', 65000, 39.06, -108.55],
  ['Wilmington', 'DE', 70000, 39.74, -75.55],
  ['Charleston', 'WV', 48000, 38.35, -81.63],
  ['Key West', 'FL', 25000, 24.56, -81.78],
  ['Bar Harbor', 'ME', 5500, 44.39, -68.2],
  ['Aspen', 'CO', 7000, 39.19, -106.82],
  ['Sedona', 'AZ', 9500, 34.87, -111.76],
  ['Jackson', 'WY', 10700, 43.48, -110.76],
  ['Cooperstown', 'NY', 1800, 42.7, -74.93],
  ['Woodstock', 'VT', 3000, 43.62, -72.52],
  ['Telluride', 'CO', 2500, 37.94, -107.81],
  ['Provincetown', 'MA', 3000, 42.05, -70.18],
  ['Deadwood', 'SD', 1300, 44.38, -103.73],
  ['Bisbee', 'AZ', 5100, 31.45, -109.93],
];

// International flavor picks — not part of the "any US city" expansion,
// but kept for players who want a global promotion.
const INTL_CITY_DATA = [
  ['London', 'UK', 8900000, 51.51, -0.13],
  ['Manchester', 'UK', 550000, 53.48, -2.24],
  ['Dublin', 'Ireland', 1200000, 53.35, -6.26],
  ['General Pico', 'Argentina', 65000, -35.66, -63.76],
  ['Mexico City', 'Mexico', 9200000, 19.43, -99.13],
  ['Tokyo', 'Japan', 14000000, 35.68, 139.65],
  ['Sydney', 'Australia', 5300000, -33.87, 151.21],
];

function slugify(...parts) {
  return parts.join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
}

export const CITIES = [
  ...US_CITY_DATA.map(([city, state, pop, lat, lon]) => ({ id: slugify(city, state), city, state, country: 'USA', pop, lat, lon })),
  ...INTL_CITY_DATA.map(([city, country, pop, lat, lon]) => ({ id: slugify(city, country), city, state: null, country, pop, lat, lon })),
];

// "Columbus, OH" for a US city, "Tokyo, Japan" for an international one —
// used anywhere a city needs to read unambiguously (duplicate city names
// across states are common: Columbus OH/GA, Glendale AZ/CA, ...).
export function cityLabel(entry) {
  if (!entry) return '';
  return `${entry.city}, ${entry.state || entry.country}`;
}

export function cityByLabel(label) {
  return CITIES.find(c => cityLabel(c) === label);
}

// Great-circle distance in miles between two lat/lon points — used to find
// real cities near a promotion's HQ for regional "on the road, but not far"
// venues.
function milesBetween(a, b) {
  const R = 3958.8;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// The closest other real cities to a given HQ (by its "City, ST" label),
// within a reasonable regional drive (default 150 miles) — Denver's HQ
// turns up Boulder, Fort Collins, Colorado Springs, not some city on the
// other side of the country. Cities with no coordinates (or an HQ label
// that doesn't resolve — e.g. a test fixture) just yield no neighbors.
export function nearbyCities(hqLabel, { maxMiles = 150, limit = 4 } = {}) {
  const hq = cityByLabel(hqLabel);
  if (!hq) return [];
  return CITIES
    .filter(c => c.id !== hq.id)
    .map(c => ({ city: c, miles: milesBetween(hq, c) }))
    .filter(c => c.miles <= maxMiles)
    .sort((a, b) => a.miles - b.miles)
    .slice(0, limit)
    .map(c => c.city);
}
