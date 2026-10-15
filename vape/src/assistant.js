import { STORE, CATEGORIES, OTHER_STORES, openStatus } from './data';
import { PRODUCTS, BEST_SELLERS, isBest, money } from './products';

// The Royal Assistant runs entirely in the browser: it answers store questions from the site's own facts and
// searches the product catalog. It never claims an item is in stock; stock always comes from a call or a visit.

const STOP = new Set(('a an the do does did you your yours we i me my to for of on in at is are was be it its this that these those with and or any some ' +
  'have has had got get can could would will please show find looking look need want like buy sell carry sells carries available stock price prices cost costs cheap ' +
  'under over below above about than less more most around max up what whats which where when how much many there thing things item items one ones ' +
  'hi hello hey thanks thank yes no ok okay just really also tell let know give list').split(' '));

const SYN = [
  [/\bjuice\b/g, 'liquid'], [/\be ?liquid\b/g, 'liquid'], [/\bvapes?\b/g, 'vape'], [/\bpouches\b/g, 'pouch'], [/\bgeekbar\b/g, 'geek bar'],
  [/\bcigs?\b/g, 'cigarette'], [/\bmushrooms?\b|\bshrooms?\b/g, 'mushroom'], [/\bgummies\b/g, 'gummy'],
];

const stem = (w) => (w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
const clean = (q) => SYN.reduce((s, [re, to]) => s.replace(re, to), q.toLowerCase().replace(/[’']/g, ''));
const words = (s) => clean(s).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);

let INDEX = null;
function index() {
  if (!INDEX) {
    const cat = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name]));
    INDEX = PRODUCTS.map((p) => ({ p, name: new Set([...words(p.name), ...p.options.flatMap(words)].map(stem)), type: new Set(words(p.type).map(stem)), dept: new Set(words(cat[p.cat] || '').map(stem)) }));
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
  if (!q) return { text: 'Ask me about hours, directions, ID, reserving online, or a product you are looking for.' };

  if (has(q, /^(hi|hello|hey|good (morning|afternoon|evening))\b/) && q.split(' ').length < 4) {
    return { text: 'Hi! I can tell you if we are open, how reserving and ID work, how to find us, or look for a product like a brand, a flavor or a coil.' };
  }
  if (has(q, /\b(open|close|closing|closed|hours?|what time|until|late|early)\b/)) {
    const s = openStatus();
    return { text: `${s.text}. Hours: ${STORE.hours.map(([d, h]) => `${d} ${h}`).join('; ')}. Holiday hours can vary, so call ahead.` };
  }
  if (has(q, /\b(id|identification|age|21|old enough|under ?age|minor|license)\b/)) {
    return { text: 'Everything we sell is 21+ only. Bring a valid, government-issued photo ID. It is checked at the counter for every purchase and pickup. No ID, no sale.', link: { to: '/age-policy', label: 'Read the 21+ policy' } };
  }
  if (has(q, /\b(reserve|reservation|pickup|pick up|order|pay|payment|cart|ship|shipping|deliver|delivery)\b/)) {
    return { text: 'Add items to your reserve list and send it with your name and phone. There is no online payment: we set your order aside and you pay at the counter. Most are ready within the hour, and we hold them until close. We do not ship.', link: { to: '/reserve', label: 'Open my reserve list' } };
  }
  if (has(q, /\b(price match|match|competitor|cheaper)\b/)) {
    return { text: 'We keep our prices competitive with other shops in the area. If you see an identical product advertised for less nearby, ask at the counter and we will do our best to match it.' };
  }
  if (has(q, /\b(beer|wine|alcohol|cooler|seltzer)\b/) && !has(q, /\bthc\b/)) {
    return { text: 'Yes, there is a cold cooler of beer and wine at the register. Those are in store only, not on the website. 21+ with ID.' };
  }
  if (has(q, /\b(where|address|direction|located|location|find you|map|parking|get there)\b/)) {
    return { text: `We are at ${STORE.address}.`, link: { href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(STORE.address)}`, label: 'Get directions', ext: true } };
  }
  if (has(q, /\b(phone|call|number|talk to|speak)\b/)) {
    return { text: `You can reach the store at ${STORE.phone}.`, link: { href: `tel:${STORE.tel}`, label: `Call ${STORE.phone}`, tel: true } };
  }
  if (has(q, /\b(furniture|appliance|auction|other stores?|other locations?|car)\b/)) {
    return { text: `The same owner also runs ${OTHER_STORES.map((s) => s.title).join(' and ')}.`, link: { to: '/other-stores', label: 'Our other stores' } };
  }
  if (has(q, /\b(review|rating|rated|reputation)\b/)) {
    return { text: 'Customers mention friendly staff and fair prices.', link: { to: '/reviews', label: 'Read reviews' } };
  }
  if (has(q, /\b(best ?sell|popular|top sell|recommend)/) && BEST_SELLERS.length) {
    return { text: 'Here are some customer favorites. Call to confirm what is on the shelf today.', products: BEST_SELLERS.slice(0, 4), link: { to: '/shop', label: 'Shop now' } };
  }

  const { hits, total, cat, priced } = searchProducts(input);
  if (hits.length) {
    const label = priced ? 'Here are some that match your budget.' : 'Here are some matches from our catalog.';
    return {
      text: `${label} ${total > hits.length ? `There are ${total} in all. ` : ''}Stock changes daily, so call to confirm availability.`,
      products: hits,
      link: cat ? { to: `/shop/${cat}`, label: 'See the full department' } : { to: '/shop', label: 'Shop now' },
    };
  }
  if (has(q, /\b(in stock|available|availability|have|got)\b/)) {
    return { text: `The fastest way to confirm an item is to call. ${call}`, link: { to: '/request', label: 'Request a product' } };
  }
  return { text: `I am not sure about that one. Try asking about hours, ID, reserving, or a product such as "Geek Bar" or "salt nic under ${money(20).replace('.00', '')}". Or ${call.charAt(0).toLowerCase()}${call.slice(1)}`, link: { to: '/request', label: 'Request a product' } };
}
