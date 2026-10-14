import { STORE, CATEGORIES, FINANCING, OTHER_STORES, openStatus } from './data';
import { PRODUCTS, BEST_SELLERS, isBest, money } from './products';

// The Royal Assistant runs entirely in the browser: it answers store questions from the site's own facts and
// searches the product catalog. It never claims an item is in stock; stock always comes from a call or a visit.

const STOP = new Set(('a an the do does did you your yours we i me my to for of on in at is are was be it its this that these those with and or any some ' +
  'have has had got get can could would will please show find looking look need want like buy sell carry sells carries available stock price prices cost costs cheap ' +
  'under over below above about than less more most around max up what whats which where when how much many there thing things item items one ones ' +
  'hi hello hey thanks thank yes no ok okay just really also tell let know give list').split(' '));

const SYN = [
  [/\bcouch(es)?\b/g, 'sofa'], [/\bfridges?\b/g, 'refrigerator'], [/\bwashing machines?\b/g, 'washer'], [/\bwashers? and dryers?\b/g, 'washer dryer'],
  [/\bair ?conditioners?\b/g, 'conditioner'], [/\bacs?\b/g, 'conditioner'], [/\bnight ?stands?\b/g, 'nightstand'], [/\btvs?\b/g, 'tv'],
  [/\bbunk beds?\b/g, 'kids bed'], [/\bsofa beds?\b/g, 'sleeper'], [/\bdressers?\b/g, 'dresser'], [/\bstoves?\b/g, 'range'], [/\bovens?\b/g, 'oven'],
  [/\bcrib\b/g, 'kids'], [/\bbookshelf\b|\bbookshelves\b/g, 'bookcase'], [/\bpatio\b/g, 'outdoor'], [/\bdining room\b/g, 'dining'],
];

const stem = (w) => (w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
const clean = (q) => SYN.reduce((s, [re, to]) => s.replace(re, to), q.toLowerCase().replace(/[’']/g, ''));
const words = (s) => clean(s).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);

let INDEX = null;
function index() {
  if (!INDEX) {
    const cat = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name]));
    INDEX = PRODUCTS.map((p) => ({ p, name: new Set(words(p.name).map(stem)), type: new Set(words(p.type).map(stem)), dept: new Set(words(cat[p.cat] || '').map(stem)) }));
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
    if (toks.length && s < Math.min(toks.length, 2) ) return false;
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
  if (!q) return { text: 'Ask me about hours, directions, financing, or an item you are looking for.' };

  if (has(q, /^(hi|hello|hey|good (morning|afternoon|evening))\b/) && q.split(' ').length < 4) {
    return { text: 'Hi! I can tell you if we are open, how to find us, about financing, or look for an item like a sofa, a washer or a mattress.' };
  }
  if (has(q, /\b(open|close|closing|closed|hours?|what time|until|today)\b/) && !has(q, /\b(sofa|bed|washer|dryer|table|chair|mattress|refrigerator)\b/)) {
    const s = openStatus();
    return { text: `${s.text}. Hours: ${STORE.hours.map(([d, h]) => `${d} ${h}`).join('; ')}. Hours may vary on holidays, so call ahead to confirm.` };
  }
  if (has(q, /\b(where|address|direction|located|location|find you|map|parking|get there)\b/)) {
    return { text: `We are at ${STORE.address}.`, link: { href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(STORE.address)}`, label: 'Get directions', ext: true } };
  }
  if (has(q, /\b(phone|call|number|talk to|speak)\b/)) {
    return { text: `You can reach the store at ${STORE.phone}.`, link: { href: `tel:${STORE.tel}`, label: `Call ${STORE.phone}`, tel: true } };
  }
  if (has(q, /\b(financ|credit|lease|payment plan|layaway|monthly|approval|afford|no credit|bad credit)/)) {
    return { text: `We work with ${FINANCING.map((f) => f.name).join(', ')}. Approval, eligibility and terms vary by provider, so ask our team which fits you.`, link: { to: '/financing', label: 'See financing options' } };
  }
  if (has(q, /\b(vape|smoke|auction|other stores?|other locations?|car)\b/) && !has(q, /\b(sofa|bed|table|chair)\b/)) {
    return { text: `The same owner also runs ${OTHER_STORES.map((s) => s.title).join(' and ')}.`, link: { to: '/other-stores', label: 'Our other stores' } };
  }
  if (has(q, /\b(review|rating|rated|reputation)\b/)) {
    return { text: `Customers rate us ${STORE.rating} out of 5 from ${STORE.reviews} Google reviews.`, link: { to: '/reviews', label: 'Read reviews' } };
  }
  if (has(q, /\b(deliver|delivery|pickup|pick up|ship|shipping|haul|install)/)) {
    return { text: `Delivery and pickup are arranged with the store for the items you choose. ${call}`, link: { to: '/delivery', label: 'Delivery and pickup' } };
  }
  if (has(q, /\b(return|warranty|exchange|refund)\b/)) {
    return { text: `Warranty and return details depend on the item. ${call}` };
  }
  if (has(q, /\b(best ?sell|popular|top sell|recommend)/)) {
    return { text: 'Here are some customer favorites. Call to confirm what is on the floor today.', products: BEST_SELLERS.slice(0, 4), link: { to: '/showroom', label: 'Browse the showroom' } };
  }

  let { hits, total, cat, priced } = searchProducts(input);
  const lim = priceLimit(q);
  if (!hits.length && (lim.max != null || lim.min != null)) {
    // Most items say "Call for price", so a budget search can come up empty even when the item exists.
    const any = searchProducts(input, 4, true);
    if (any.hits.length) {
      return {
        text: `I could not find one with a listed price in that range. Many items say "Call for price", so here are the closest matches. ${call}`,
        products: any.hits,
        link: any.cat ? { to: `/showroom/${any.cat}`, label: 'See the full collection' } : { to: '/showroom', label: 'Browse the showroom' },
      };
    }
  }
  if (hits.length) {
    const label = priced ? 'Here are some that match your budget.' : 'Here are some matches from our catalog.';
    return {
      text: `${label} ${total > hits.length ? `There are ${total} in all. ` : ''}Our floor changes weekly, so call to confirm availability.`,
      products: hits,
      link: cat ? { to: `/showroom/${cat}`, label: 'See the full collection' } : { to: '/showroom', label: 'Browse the showroom' },
    };
  }
  if (has(q, /\b(in stock|available|availability|have|got)\b/)) {
    return { text: `Our floor changes weekly, so the fastest way to confirm an item is to call. ${call}` };
  }
  if (has(q, /\b(price|cost|how much|cheap|sale|deal)/)) {
    return { text: `Items on this site show their price when we list one, and you can tap "Ask for price" on any other item. ${call}` };
  }
  return { text: `I am not sure about that one. Try asking about hours, directions, financing or an item such as "sofas under ${money(800).replace('.00', '')}". Or ${call.charAt(0).toLowerCase()}${call.slice(1)}` };
}
