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
  ['New York', 'NY', 8300000],
  ['Los Angeles', 'CA', 3900000],
  ['Chicago', 'IL', 2700000],

  // Metro (500k-2M)
  ['Houston', 'TX', 2300000],
  ['Phoenix', 'AZ', 1650000],
  ['Philadelphia', 'PA', 1580000],
  ['San Antonio', 'TX', 1470000],
  ['San Diego', 'CA', 1380000],
  ['Dallas', 'TX', 1290000],
  ['Austin', 'TX', 970000],
  ['Jacksonville', 'FL', 950000],
  ['Fort Worth', 'TX', 940000],
  ['Columbus', 'OH', 900000],
  ['Indianapolis', 'IN', 880000],
  ['Charlotte', 'NC', 890000],
  ['San Francisco', 'CA', 870000],
  ['Seattle', 'WA', 740000],
  ['Denver', 'CO', 715000],
  ['Washington', 'DC', 690000],
  ['Nashville', 'TN', 690000],
  ['Oklahoma City', 'OK', 680000],
  ['El Paso', 'TX', 680000],
  ['Boston', 'MA', 650000],
  ['Portland', 'OR', 640000],
  ['Las Vegas', 'NV', 640000],
  ['Detroit', 'MI', 630000],
  ['Memphis', 'TN', 620000],
  ['Louisville', 'KY', 620000],
  ['Baltimore', 'MD', 570000],
  ['Milwaukee', 'WI', 560000],
  ['Albuquerque', 'NM', 560000],
  ['Tucson', 'AZ', 545000],
  ['Fresno', 'CA', 540000],
  ['Sacramento', 'CA', 525000],
  ['Mesa', 'AZ', 510000],
  ['Kansas City', 'MO', 510000],
  ['Atlanta', 'GA', 500000],

  // City (100k-500k)
  ['Omaha', 'NE', 490000],
  ['Colorado Springs', 'CO', 480000],
  ['Raleigh', 'NC', 470000],
  ['Long Beach', 'CA', 450000],
  ['Virginia Beach', 'VA', 450000],
  ['Miami', 'FL', 440000],
  ['Oakland', 'CA', 430000],
  ['Minneapolis', 'MN', 425000],
  ['Tulsa', 'OK', 410000],
  ['Bakersfield', 'CA', 405000],
  ['Tampa', 'FL', 400000],
  ['Arlington', 'TX', 400000],
  ['Wichita', 'KS', 395000],
  ['Aurora', 'CO', 390000],
  ['New Orleans', 'LA', 380000],
  ['Cleveland', 'OH', 370000],
  ['Honolulu', 'HI', 350000],
  ['Anaheim', 'CA', 345000],
  ['Riverside', 'CA', 315000],
  ['Corpus Christi', 'TX', 320000],
  ['Lexington', 'KY', 320000],
  ['Henderson', 'NV', 320000],
  ['Stockton', 'CA', 310000],
  ['Saint Paul', 'MN', 310000],
  ['Cincinnati', 'OH', 310000],
  ['Irvine', 'CA', 310000],
  ['Orlando', 'FL', 310000],
  ['Santa Ana', 'CA', 310000],
  ['Newark', 'NJ', 305000],
  ['St. Louis', 'MO', 300000],
  ['Pittsburgh', 'PA', 300000],
  ['Greensboro', 'NC', 300000],
  ['Anchorage', 'AK', 290000],
  ['Plano', 'TX', 290000],
  ['Lincoln', 'NE', 290000],
  ['Jersey City', 'NJ', 290000],
  ['Durham', 'NC', 285000],
  ['Chula Vista', 'CA', 275000],
  ['Chandler', 'AZ', 275000],
  ['Buffalo', 'NY', 275000],
  ['Gilbert', 'AZ', 275000],
  ['Toledo', 'OH', 270000],
  ['Fort Wayne', 'IN', 270000],
  ['Madison', 'WI', 270000],
  ['Reno', 'NV', 270000],
  ['Lubbock', 'TX', 260000],
  ['St. Petersburg', 'FL', 260000],
  ['Laredo', 'TX', 260000],
  ['North Las Vegas', 'NV', 260000],
  ['Irving', 'TX', 260000],
  ['Winston-Salem', 'NC', 250000],
  ['Glendale', 'AZ', 250000],
  ['Chesapeake', 'VA', 250000],
  ['Scottsdale', 'AZ', 240000],
  ['Norfolk', 'VA', 235000],
  ['Boise', 'ID', 235000],
  ['Fremont', 'CA', 230000],
  ['Richmond', 'VA', 230000],
  ['Spokane', 'WA', 230000],
  ['San Bernardino', 'CA', 220000],
  ['Baton Rouge', 'LA', 220000],
  ['Tacoma', 'WA', 220000],
  ['Modesto', 'CA', 220000],
  ['Frisco', 'TX', 220000],
  ['Huntsville', 'AL', 220000],
  ['Santa Clarita', 'CA', 220000],
  ['Des Moines', 'IA', 215000],
  ['Fontana', 'CA', 210000],
  ['Rochester', 'NY', 210000],
  ['Yonkers', 'NY', 210000],
  ['Moreno Valley', 'CA', 210000],
  ['Fayetteville', 'NC', 210000],
  ['Columbus', 'GA', 205000],
  ['Worcester', 'MA', 205000],
  ['Amarillo', 'TX', 200000],
  ['Little Rock', 'AR', 200000],
  ['Grand Rapids', 'MI', 200000],
  ['Salt Lake City', 'UT', 200000],
  ['Overland Park', 'KS', 200000],
  ['Tallahassee', 'FL', 200000],
  ['Grand Prairie', 'TX', 200000],
  ['Huntington Beach', 'CA', 195000],
  ['Glendale', 'CA', 195000],
  ['Knoxville', 'TN', 195000],
  ['Tempe', 'AZ', 195000],
  ['Akron', 'OH', 190000],
  ['Providence', 'RI', 190000],
  ['Vancouver', 'WA', 190000],
  ['Newport News', 'VA', 185000],
  ['Brownsville', 'TX', 185000],
  ['Fort Lauderdale', 'FL', 185000],
  ['Chattanooga', 'TN', 180000],
  ['Oceanside', 'CA', 175000],
  ['Rancho Cucamonga', 'CA', 175000],
  ['Santa Rosa', 'CA', 175000],
  ['Garden Grove', 'CA', 170000],
  ['Charleston', 'SC', 155000],
  ['Jackson', 'MS', 150000],
  ['Fargo', 'ND', 125000],
  ['Manchester', 'NH', 115000],
  ['Billings', 'MT', 110000],
  ['Hartford', 'CT', 120000],

  // Small towns (<100k) — every region needs a scrappy underdog HQ
  ['Hanford', 'CA', 57000],
  ['Wilmington', 'DE', 70000],
  ['Charleston', 'WV', 48000],
  ['Key West', 'FL', 25000],
  ['Bar Harbor', 'ME', 5500],
  ['Aspen', 'CO', 7000],
  ['Sedona', 'AZ', 9500],
  ['Jackson', 'WY', 10700],
  ['Cooperstown', 'NY', 1800],
  ['Woodstock', 'VT', 3000],
  ['Telluride', 'CO', 2500],
  ['Provincetown', 'MA', 3000],
  ['Deadwood', 'SD', 1300],
  ['Bisbee', 'AZ', 5100],
];

// International flavor picks — not part of the "any US city" expansion,
// but kept for players who want a global promotion.
const INTL_CITY_DATA = [
  ['London', 'UK', 8900000],
  ['Manchester', 'UK', 550000],
  ['Dublin', 'Ireland', 1200000],
  ['General Pico', 'Argentina', 65000],
  ['Mexico City', 'Mexico', 9200000],
  ['Tokyo', 'Japan', 14000000],
  ['Sydney', 'Australia', 5300000],
];

function slugify(...parts) {
  return parts.join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
}

export const CITIES = [
  ...US_CITY_DATA.map(([city, state, pop]) => ({ id: slugify(city, state), city, state, country: 'USA', pop })),
  ...INTL_CITY_DATA.map(([city, country, pop]) => ({ id: slugify(city, country), city, state: null, country, pop })),
];

// "Columbus, OH" for a US city, "Tokyo, Japan" for an international one —
// used anywhere a city needs to read unambiguously (duplicate city names
// across states are common: Columbus OH/GA, Glendale AZ/CA, ...).
export function cityLabel(entry) {
  if (!entry) return '';
  return `${entry.city}, ${entry.state || entry.country}`;
}
