export const STORE = {
  name: 'Royal Appliance Outlet',
  phone: '(850) 741-4143',
  tel: '+18507414143',
  email: 'royalapplianceoutlet@yahoo.com',
  address: '1612 N Pace Blvd Suite 4, Pensacola, FL 32505',
  facebook: 'https://www.facebook.com/RoyalApplianceOutlet/',
  rating: 4.9,
  reviews: 185,
  hours: [
    ['Monday – Saturday', '10:00 AM – 7:00 PM'],
    ['Sunday', '10:00 AM – 6:00 PM'],
  ],
};

export const STORE_PHOTO = '/img/store.jpg';
export const LOGO = '/img/logo-white.svg';

export const REVIEWS_URL = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Royal Appliance Outlet, Pensacola, FL');

export const MAPS_URL =
  'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(STORE.address);

// Product and category photos are manufacturer-hosted catalog images, loaded the same way the current site loads them.
export const ASHLEY = 'https://cdn.ashley.com/assets/';
// window.__IMG is an optional offline image map used by static previews.
export const imgUrl = (a, w = 600) =>
  (typeof window !== 'undefined' && window.__IMG && (window.__IMG[a + '@' + w] || window.__IMG[a + '@600'] || window.__IMG[a + '@800'])) ||
  (a.startsWith('http') ? a : `${ASHLEY}${a}?fit=bounds&format=auto&height=${w}&quality=80&width=${w}`);

export const CATEGORIES = [
  { id: 'appliances', img: 'https://cdn11.bigcommerce.com/s-pacto3wrn2/images/stencil/500x659/products/3497/1021270/maqjbrm3wds4paf5rmx0__29983.1.jpg', cutout: true, name: 'Appliances', blurb: 'Kitchen, laundry and home-comfort appliances.' },
  { id: 'living', img: 'W446-68.jpg', name: 'Living Room', blurb: 'Sofas, sectionals, recliners, occasional tables and media furniture.' },
  { id: 'bedroom', img: 'EB1866-157-113.jpg', name: 'Bedroom', blurb: 'Beds and coordinated bedroom furniture.' },
  { id: 'dining', img: 'D984-45.jpg', name: 'Kitchen & Dining', blurb: 'Dining sets, tables, seating and storage.' },
  { id: 'office', img: 'H632-44.jpg', name: 'Home Office', blurb: 'Desks, chairs, bookcases and office storage.' },
  { id: 'accent', img: 'A3000053.jpg', name: 'Accent Furniture', blurb: 'Statement chairs, tables, cabinets and benches.' },
  { id: 'entry', img: 'EA1864-151.jpg', name: 'Entryway', blurb: 'Hall trees, console tables, benches and entry storage.' },
  { id: 'kids', img: 'B600000441.jpg', name: 'Kids & Baby', blurb: 'Beds, cribs and furniture for growing rooms.' },
  { id: 'outdoor', img: 'P297-070.jpg', name: 'Outdoor', blurb: 'Patio seating, dining and outdoor tables.' },
  { id: 'mattress', img: 'M69731-SW.jpg', cutout: true, name: 'Mattresses', blurb: 'Hybrid and memory foam mattresses.' },
  { id: 'decor', img: 'A8000277-SW.jpg', cutout: true, name: 'Decor / Home Accents', blurb: 'Wall art, mirrors and decorative accents.' },
  { id: 'rugs', img: 'R403771.jpg', name: 'Rugs', blurb: 'Area, runner, accent and outdoor rugs.' },
  { id: 'lighting', img: 'L204054.jpg', name: 'Lighting', blurb: 'Table lamps, floor lamps and wall lighting.' },
  { id: 'storage', img: 'A4000709.jpg', name: 'Storage / Organization', blurb: 'Bookcases, cabinets, shelves and practical storage.' },
];

export const FINANCING = [
  { name: 'Synchrony', text: 'Credit-based financing options for furniture and appliances.' },
  { name: 'Snap Leasing', text: 'Lease-to-own purchase option with flexible terms.' },
  { name: 'Acima Leasing', text: 'Lease-to-own option that may suit different credit situations.' },
];

export const FAQS = [
  ['Do you have this item in stock?', 'Our floor changes weekly. Call (850) 741-4143 or stop in and we will tell you exactly what we have today.'],
  ['Do you offer financing?', 'Yes. Ask about Synchrony, Snap Leasing and Acima Leasing. Approval, eligibility and terms vary by provider.'],
  ['Where are you located?', '1612 N Pace Blvd Suite 4, Pensacola, FL 32505.'],
  ['What are your hours?', 'Monday – Saturday 10:00 AM – 7:00 PM, Sunday 10:00 AM – 6:00 PM. Hours may vary on holidays, so call ahead to confirm.'],
  ['Can I see items in person before I buy?', 'Absolutely. Come see the floor and our team will help you compare sizes, features and fit.'],
  ['What is the price?', 'Pricing and purchase options change with inventory. Call or visit to confirm current pricing.'],
];

const HOURS = { 0: [10, 18], 1: [10, 19], 2: [10, 19], 3: [10, 19], 4: [10, 19], 5: [10, 19], 6: [10, 19] };

// Pensacola is on Central time, so compute open/closed there regardless of the visitor's zone.
export function openStatus(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t).value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const t = (Number(get('hour')) % 24) + Number(get('minute')) / 60;
  const [o, c] = HOURS[day];
  if (t >= o && t < c) return { open: true, text: `Open now · until ${c > 12 ? c - 12 : c} PM` };
  return { open: false, text: t < o ? `Closed · opens ${o} AM today` : 'Closed · opens 10 AM tomorrow' };
}
