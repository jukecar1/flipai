import { STORE, CATEGORIES, OTHER_STORES, openStatus } from './data';
import { PRODUCTS, BEST_SELLERS, isBest, money } from './products';

// The Royal Assistant runs entirely in the browser: it answers store questions from the site's own facts and
// searches the product catalog. It never claims an item is in stock; stock always comes from a call or a visit.

const STOP = new Set(('a an the do does did you your yours we i me my to for of on in at is are was be it its this that these those with and or any some ' +
  'have has had got get can could would will please show find looking look need want like buy sell carry sells carries available stock price prices cost costs cheap ' +
  'under over below above about than less more most around max up what whats which where when how much many there thing things item items one ones ' +
  'hi hello hey thanks thank yes no ok okay just really also tell let know give list').split(' '));

const SYN = [
  [/\bpickups?\b|\bpickup trucks?\b/g, 'truck'], [/\bsuvs?\b|\bcrossovers?\b/g, 'suv'], [/\bminivans?\b/g, 'van'], [/\bsports? cars?\b/g, 'coupe'], [/\bchevy\b/g, 'chevrolet'],
];

const stem = (w) => (w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
const clean = (q) => SYN.reduce((s, [re, to]) => s.replace(re, to), q.toLowerCase().replace(/[’']/g, ''));
const words = (s) => clean(s).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);

let INDEX = null;
function index() {
  if (!INDEX) {
    const cat = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name]));
    INDEX = PRODUCTS.map((p) => ({ p, name: new Set([...words(p.name), ...words(p.desc)].map(stem)), type: new Set(words(p.type).map(stem)), dept: new Set(words(cat[p.cat] || '').map(stem)) }));
  }
  return INDEX;
}

function priceLimit(q) {
  const num = (m) => Number(m[2].replace(/,/g, ''));
  const lo = /\b(under|below|less than|cheaper than|up to|max(?:imum)?|within)\s*\$?\s*(\d[\d,]*)/.exec(q) || /<\s*\$?\s*(\d[\d,]*)/.exec(q);
  const hi = /\b(over|above|more than|at least|starting at)\s*\$?\s*(\d[\d,]*)/.exec(q);
  return { max: lo ? Number((lo[2] || lo[1]).replace(/,/g, '')) : null, min: hi ? num(hi) : null };
}

export function searchProducts(q, limit = 4, ignorePrice = false) {
  const { max, min } = ignorePrice ? { max: null, min: null } : priceLimit(clean(q));
  const toks = words(q).filter((w) => !STOP.has(w) && !/^\d/.test(w)).map(stem).filter((w) => w.length > 1);
  const wantsPrice = max != null || min != null;
  if (!toks.length && !wantsPrice) return { hits: [], total: 0 };
  const scored = index().map((e) => {
    let s = 0;
    toks.forEach((t) => { if (e.type.has(t)) s += 3; else if (e.dept.has(t)) s += 2; else if (e.name.has(t)) s += 1; });
    return { e, s };
  }).filter(({ e, s }) => {
    if (toks.length && s < Math.min(toks.length, 2)) return false;
    if (wantsPrice) { const pr = e.p.price; if (pr == null) return false; if (max != null && pr > max) return false; if (min != null && pr < min) return false; }
    return true;
  });
  scored.sort((a, b) => b.s - a.s || Number(isBest(b.e.p)) - Number(isBest(a.e.p)) || (a.e.p.price ?? 1e9) - (b.e.p.price ?? 1e9));
  const hits = scored.map((x) => x.e.p);
  const cats = new Set(hits.map((p) => p.cat));
  return { hits: hits.slice(0, limit), total: hits.length, cat: cats.size === 1 ? [...cats][0] : null, priced: wantsPrice };
}

const has = (q, re) => re.test(q);

export function reply(input) {
  const q = clean(input.trim());
  const call = `Call ${STORE.phone} and our team will help.`;
  if (!q) return { text: 'Ask me about hours, directions, test drives, or a vehicle you are looking for.' };

  if (has(q, /^(hi|hello|hey|good (morning|afternoon|evening))\b/) && q.split(' ').length < 4) {
    return { text: 'Hi! I can tell you if we are open, how to schedule a test drive, how to find us, or look for a vehicle like a truck, an SUV or a Honda.' };
  }
  if (has(q, /\b(open|close|closing|closed|hours?|what time|until)\b/)) {
    const s = openStatus();
    return { text: `${s.text}. Hours: ${STORE.hours.map(([d, h]) => `${d} ${h}`).join('; ')}. Hours can vary on holidays, so call ahead.` };
  }
  if (has(q, /\b(test ?drive|drive it|try it|appointment|schedule|come in)\b/)) {
    return { text: 'You can schedule a test drive online with the vehicle and a time that suits you, and we will confirm. Bring your driver license.', link: { to: '/test-drive', label: 'Schedule a test drive' } };
  }
  if (has(q, /\b(financ|payment|monthly|credit|loan|trade ?in|trade)\b/)) {
    return { text: `Ask us about financing and trade-ins when you call or visit. Approval and terms depend on you and the lender. ${call}` };
  }
  if (has(q, /\b(where|address|direction|located|location|find you|map|parking|get there)\b/)) {
    return { text: `We are in ${STORE.address}.`, link: { href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STORE.address)}`, label: 'Get directions', ext: true } };
  }
  if (has(q, /\b(phone|call|number|talk to|speak)\b/)) {
    return { text: `You can reach us at ${STORE.phone}.`, link: { href: `tel:${STORE.tel}`, label: `Call ${STORE.phone}`, tel: true } };
  }
  if (has(q, /\b(furniture|appliance|vape|smoke|other stores?|other locations?)\b/)) {
    return { text: `The same owner also runs ${OTHER_STORES.map((s) => s.title).join(' and ')}.`, link: { to: '/other-stores', label: 'Our other stores' } };
  }
  if (has(q, /\b(featured|popular|recommend|best)\b/) && BEST_SELLERS.length) {
    return { text: 'Here are some featured vehicles. Call to confirm they are still available.', products: BEST_SELLERS.slice(0, 4), link: { to: '/inventory', label: 'Browse inventory' } };
  }

  const { hits, total, cat, priced } = searchProducts(input);
  if (hits.length) {
    const label = priced ? 'Here are some that match your budget.' : 'Here are some matches from our inventory.';
    return {
      text: `${label} ${total > hits.length ? `There are ${total} in all. ` : ''}Vehicles sell fast, so call to confirm availability.`,
      products: hits,
      link: cat ? { to: `/inventory/${cat}`, label: 'See all in this body type' } : { to: '/inventory', label: 'Browse inventory' },
    };
  }
  return { text: `I am not sure about that one. Try asking about hours, test drives, or a vehicle such as "trucks" or "SUV under ${money(20000).replace('.00', '')}". Or ${call.charAt(0).toLowerCase()}${call.slice(1)}`, link: { to: '/test-drive', label: 'Schedule a test drive' } };
}
