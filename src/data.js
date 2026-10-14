export const STORE = {
  name: 'Royal Appliance Outlet',
  phone: '(850) 741-4143',
  tel: '+18507414143',
  email: 'royalapplianceoutlet@yahoo.com',
  address: '1612 N Pace Blvd Suite 4, Pensacola, FL 32505',
  facebook: 'https://www.facebook.com/',
  rating: 4.9,
  reviews: 185,
  hours: [
    ['Monday – Saturday', '10:00 AM – 7:00 PM'],
    ['Sunday', '10:00 AM – 6:00 PM'],
  ],
};

export const STORE_PHOTO = '/img/store.jpg';

export const MAPS_URL =
  'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(STORE.address);

// Category photos are cropped from the current site; swap in originals when supplied.
export const CATEGORIES = [
  { id: 'living', img: '/img/living.jpg', name: 'Living Room', blurb: 'Sofas, sectionals, recliners, occasional tables and media furniture.' },
  { id: 'bedroom', img: '/img/bedroom.jpg', name: 'Bedroom', blurb: 'Beds and coordinated bedroom furniture.' },
  { id: 'dining', img: '/img/dining.jpg', name: 'Kitchen & Dining', blurb: 'Dining sets, tables, seating and storage.' },
  { id: 'office', img: '/img/office.jpg', name: 'Home Office', blurb: 'Desks, chairs, bookcases and office storage.' },
  { id: 'accent', img: '/img/accent.jpg', name: 'Accent Furniture', blurb: 'Statement chairs, tables, cabinets and benches.' },
  { id: 'entry', img: '/img/entry.jpg', name: 'Entryway', blurb: 'Hall trees, console tables, benches and entry storage.' },
  { id: 'kids', img: '/img/kids.jpg', name: 'Kids & Baby', blurb: 'Beds, cribs and furniture for growing rooms.' },
  { id: 'outdoor', img: '/img/outdoor.jpg', name: 'Outdoor', blurb: 'Patio seating, dining and outdoor tables.' },
  { id: 'mattress', img: '/img/mattress.jpg', name: 'Mattresses', blurb: 'Hybrid and memory foam mattresses.' },
  { id: 'decor', img: '/img/decor.jpg', name: 'Decor / Home Accents', blurb: 'Wall art, mirrors and decorative accents.' },
  { id: 'rugs', img: '/img/rugs.jpg', name: 'Rugs', blurb: 'Area, runner, accent and outdoor rugs.' },
  { id: 'lighting', img: '/img/lighting.jpg', name: 'Lighting', blurb: 'Table lamps, floor lamps and wall lighting.' },
  { id: 'storage', img: '/img/storage.jpg', name: 'Storage / Organization', blurb: 'Bookcases, cabinets, shelves and practical storage.' },
  { id: 'appliances', img: '/img/appliances.jpg', name: 'Appliances', blurb: 'Kitchen, laundry and home-comfort appliances.' },
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
  return { open: false, text: t < o ? `Closed · opens ${o} AM today` : 'Closed · opens 10 AM' };
}
