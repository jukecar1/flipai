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

export const CITIES = [
  { city: 'Jacksonville', country: 'USA' },
  { city: 'Tampa', country: 'USA' },
  { city: 'Orlando', country: 'USA' },
  { city: 'Miami', country: 'USA' },
  { city: 'Hanford', country: 'USA' },
  { city: 'Las Vegas', country: 'USA' },
  { city: 'New York', country: 'USA' },
  { city: 'Los Angeles', country: 'USA' },
  { city: 'Chicago', country: 'USA' },
  { city: 'Tallahassee', country: 'USA' },
  { city: 'London', country: 'UK' },
  { city: 'Manchester', country: 'UK' },
  { city: 'Dublin', country: 'Ireland' },
  { city: 'General Pico', country: 'Argentina' },
  { city: 'Mexico City', country: 'Mexico' },
  { city: 'Tokyo', country: 'Japan' },
  { city: 'Sydney', country: 'Australia' },
];
