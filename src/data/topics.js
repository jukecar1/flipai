// Starter content backlog for the "How Money Works" channel.
// Statuses move left to right: idea -> scripted -> recorded -> published.

export const STATUSES = ['idea', 'scripted', 'recorded', 'published'];

export const SERIES = [
  {
    id: 'how-they-make-money',
    name: 'How They Make Money',
    description: 'The core series — what a business actually profits from, underneath the obvious product.',
  },
  {
    id: 'what-x-gets-you',
    name: 'What $X Gets You',
    description: 'Real estate comparisons across cities and price points.',
  },
  {
    id: 'construction-secrets',
    name: 'Construction Secrets',
    description: 'What things actually cost to build and who profits at each step.',
  },
  {
    id: 'why',
    name: 'Why?',
    description: 'A single surprising cause-and-effect question, answered fast.',
  },
];

let nextId = 1;
const topic = (seriesId, title, status = 'idea', notes = '') => ({
  id: nextId++,
  seriesId,
  title,
  status,
  notes,
});

export const seedTopics = [
  // How They Make Money
  topic('how-they-make-money', 'How Gas Stations Actually Make Money', 'scripted',
    'First video. Fuel margin is razor-thin; real profit is the convenience store, car wash, and lottery sales. Corner lots chosen for two-street visibility.'),
  topic('how-they-make-money', 'How McDonald\'s Actually Makes Money'),
  topic('how-they-make-money', 'Why Costco Makes So Much Money'),
  topic('how-they-make-money', 'How Airports Make Millions'),
  topic('how-they-make-money', 'How Apartment Complexes Make Money'),
  topic('how-they-make-money', 'How Home Flippers Actually Make Money'),
  topic('how-they-make-money', 'How Contractors Make $100K on One Job'),
  topic('how-they-make-money', 'Why Walmart Wants You to Shop Inside'),
  topic('how-they-make-money', 'How Airlines Make Money From Empty Seats'),
  topic('how-they-make-money', 'How Movie Theaters Make Money'),

  // What $X Gets You
  topic('what-x-gets-you', 'What $300K Gets You in Miami'),
  topic('what-x-gets-you', 'What $500K Gets You in LA'),
  topic('what-x-gets-you', 'What $1M Gets You in Texas'),
  topic('what-x-gets-you', 'What $2M Gets You in New York'),

  // Construction Secrets
  topic('construction-secrets', 'How Much It Costs to Build a House'),
  topic('construction-secrets', 'How Contractors Actually Make Money'),
  topic('construction-secrets', 'Why Houses Cost So Much to Build'),
  topic('construction-secrets', 'How a $500K House Actually Gets Built'),

  // Why?
  topic('why', 'Why Are California Houses $1 Million'),
  topic('why', 'Why Are Gas Stations Usually Built on Corners'),
  topic('why', 'Why Do Airports Charge So Much'),
  topic('why', 'Why Does Rent Keep Going Up'),
  topic('why', 'Why Billionaires Buy Real Estate'),
];

export const SCRIPT_FORMULA = [
  { label: 'Hook', time: '0-3s', guidance: 'Lead with the surprising claim, not the topic. "McDonald\'s isn\'t really a burger company," not "Today we\'re talking about McDonald\'s."' },
  { label: 'Setup', time: '3-15s', guidance: 'State the common assumption, then flag the thing underneath it that most people miss.' },
  { label: 'Payoff', time: '15-45s', guidance: 'Explain the interesting mechanism with visuals — real photos, buildings, charts, headlines, footage you have rights to.' },
  { label: 'Ending', time: '45-60s', guidance: 'One final surprising fact, then a soft "follow for more" close.' },
];

export const PRODUCTION_RULES = [
  'One consistent narrator voice — not a generic AI voice.',
  'Real photos, buildings, charts, and headlines over generic AI-generated imagery.',
  'Simple animations only where they clarify a number or process.',
  'No more than one transition every ~10 seconds — avoid the "AI slideshow" feel.',
];
