export const STORE = {
  name: 'Royal Vape Mart',
  phone: '(850) 332-6322',
  tel: '+18503326322',
  email: '',
  address: '8701 Gulf Beach Hwy, Pensacola, FL 32507',
  street: '8701 Gulf Beach Hwy',
  facebook: '',
  // The old site shows review quotes but no star rating or review count, so none is shown here until the store confirms them.
  rating: null,
  reviews: null,
  hours: [['Every day', '6:00 AM – 1:00 AM']],
};

export const LOGO = '/img/logo-white.svg';

export const REVIEWS_URL = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Royal Vape Mart, 8701 Gulf Beach Hwy, Pensacola, FL');

export const MAPS_URL =
  'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(STORE.address);

// Product photos live in public/photos (see catalog/README.md). window.__IMG is an optional offline image map used by static previews.
export const imgUrl = (a) =>
  (typeof window !== 'undefined' && window.__IMG && window.__IMG[a]) ||
  (a.startsWith('http') ? a : `${process.env.PUBLIC_URL || ''}/${a}`);

// Departments, in the order the store lists them. `img` is a representative product photo.
export const CATEGORIES = [
  { id: 'vape', img: 'photos/geekbar-matekit.webp', name: 'Vape', blurb: 'Disposables, pod kits and refill pods from the brands people ask for.' },
  { id: 'hardware', img: 'photos/freemax-galexnano.webp', name: 'Vape Hardware', blurb: 'Devices, tanks, pods and the coils to keep them running.' },
  { id: 'eliquid', img: 'photos/bsx-salts-30ml.webp', name: 'E-Liquid', blurb: 'Salt nic and freebase juice in 30 ml to 120 ml bottles.' },
  { id: 'tobacco', img: 'photos/zyn-std.webp', name: 'Tobacco', blurb: 'Nicotine pouches and rolling tobacco, in the strengths people actually ask for.' },
  { id: 'thc', img: 'photos/crescent9-seltzer-50mg.webp', name: 'THC Seltzers', blurb: 'THC seltzers, cold and ready to go.' },
  { id: 'kratom', img: 'photos/n-a-2.webp', name: 'Kratom', blurb: 'Capsules, powder, extracts and shots.' },
  { id: 'delta', img: 'photos/flyinghorse-liquiddiamond-5g.webp', name: 'Delta', blurb: 'Delta products: gummies and vapes.' },
  { id: 'cigarettes', img: 'photos/305s.webp', name: 'Cigarettes', blurb: 'Packs and cartons from the major brands and value brands.' },
  { id: 'cigars', img: 'photos/4ks-box.webp', name: 'Cigars', blurb: 'Cigarillos, wraps and premium cigars.' },
  { id: 'detox', img: 'photos/qcarboclear20.webp', name: 'Detox', blurb: 'Herbal cleansing drinks and capsules.' },
  { id: 'misc', img: 'photos/happykampers-choc.webp', name: 'Misc.', blurb: 'Mushroom products, novelties and the odd things people come in for.' },
];

// Brand logos shown on the home page. `onDark` logos are white artwork, so their tile is dark.
const WHITE_LOGOS = new Set(['foger', 'fre', 'lost-mary', 'mellow-fellow', 'raz', 'road-trip', 'rogue', 'shrumfized', 'torch', 'twisted-tea', 'velo', 'white-claw', 'zone', 'zyn']);
export const BRANDS = ['zyn', 'foger', 'road-trip', 'geek-bar', 'lost-mary', 'raz', 'zone', 'fre', 'rogue', 'velo', 'torch', 'mellow-fellow', 'shrumfized', 'happy-dad', 'too-turnt-tea', 'surfside', 'white-claw', 'twisted-tea']
  .map((id) => ({ id, name: id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), src: `/img/brands/${id}.webp`, onDark: WHITE_LOGOS.has(id) }));

export const FAQS = [
  ['Do I need to be 21 to shop here?', 'Yes. Every product we sell (vapes, nicotine pouches, THC products, mushroom products, and beer and wine) is 21+ only. Bring a valid, government-issued photo ID. It is checked at the counter for every purchase and every pickup. No ID, no sale.'],
  ['How does a pickup reservation work?', 'Browse the shop, add items to your list, and send it to us with your name and phone number. There is no online payment. We set your order aside and you pay at the counter (cash or card) when you pick it up.'],
  ['How long until my reservation is ready?', 'Most reservations are ready within the hour during business hours. We hold your order until close the same day. If you need a little longer, call (850) 332-6322 and we will work it out.'],
  ['Do you ship orders?', 'Not right now. Everything on the site is reserve online, pick up in store. It keeps the 21+ ID check simple and gets you your products the same day.'],
  ['Do you price match?', 'We keep our prices competitive with other shops in the area. If you see an identical product advertised for less nearby, ask at the counter and we will do our best to match it.'],
  ['What are your hours?', 'Open every day, 6:00 AM to 1:00 AM: 19 hours a day, 7 days a week. Holiday hours can vary, so give us a call if you are heading over on a holiday.'],
];

// Open 6 AM to 1 AM every day, so the late-night hours belong to the day before. Computed in Pensacola time (Central).
export function openStatus(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t).value;
  const t = (Number(get('hour')) % 24) + Number(get('minute')) / 60;
  if (t >= 6 || t < 1) return { open: true, text: 'Open now · until 1 AM' };
  return { open: false, text: 'Closed · opens 6 AM today' };
}

// The owner's other businesses.
export const OTHER_STORES = [
  { k: 'Furniture and appliances', title: 'Royal Appliance Outlet', text: 'Furniture, mattresses and home appliances. Open Monday to Saturday 10 AM to 7 PM, Sunday 10 AM to 6 PM.', url: '', phone: '(850) 741-4143', address: '1612 N Pace Blvd Suite 4, Pensacola' },
  { k: 'Car auction', title: 'Car auction', text: 'Vehicles bought and sold at auction.', url: '', phone: '', address: '' },
];

STORE.sms = STORE.tel;

export const VCARD_HREF = 'data:text/vcard;charset=utf-8,' + encodeURIComponent(
  ['BEGIN:VCARD', 'VERSION:3.0', 'FN:Royal Vape Mart', 'ORG:Royal Vape Mart',
    `TEL;TYPE=WORK,VOICE:${STORE.tel}`,
    'ADR;TYPE=WORK:;;8701 Gulf Beach Hwy;Pensacola;FL;32507;USA', 'END:VCARD'].join('\r\n'));
