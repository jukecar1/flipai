// PLACEHOLDERS: the name, phone number, hours and address below are stand-ins until the owner confirms them.
export const STORE = {
  name: "Sean's Car Business",
  phone: '(850) 555-0100',
  tel: '+18505550100',
  email: '',
  address: 'Pensacola, FL',
  street: 'Pensacola, FL',
  hours: [['Monday – Saturday', '9:00 AM – 6:00 PM'], ['Sunday', 'Closed']],
};
export const SAMPLE_CONTACT = true;

export const REVIEWS_URL = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent("Sean's Car Business, Pensacola, FL");
export const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(STORE.address);

// Vehicle photos live in public/photos (see catalog/README.md). Until real photos are added, each vehicle shows a
// "photo coming soon" picture for its body type. window.__IMG is an optional offline image map used by static previews.
export const imgUrl = (a) =>
  (typeof window !== 'undefined' && window.__IMG && window.__IMG[a]) ||
  (a.startsWith('http') ? a : `${process.env.PUBLIC_URL || ''}/${a}`);

export const CATEGORIES = [
  { id: 'suv', img: 'photos/placeholder-suv.svg', name: 'SUVs', blurb: 'Room for the whole family, with all-weather confidence.' },
  { id: 'truck', img: 'photos/placeholder-truck.svg', name: 'Trucks', blurb: 'Work trucks and weekend haulers.' },
  { id: 'sedan', img: 'photos/placeholder-sedan.svg', name: 'Sedans', blurb: 'Comfortable, efficient everyday cars.' },
  { id: 'coupe', img: 'photos/placeholder-coupe.svg', name: 'Coupes & Sports', blurb: 'Cars that are fun to drive.' },
  { id: 'van', img: 'photos/placeholder-van.svg', name: 'Vans & Minivans', blurb: 'Seating and space for families and work.' },
];

export const FAQS = [
  ['Can I test drive a vehicle?', 'Yes. Tap "Schedule a test drive" on any vehicle, or call. Bring your driver license.'],
  ['Are the vehicles on the site still available?', 'We update the inventory often, but cars sell fast. Call to confirm a vehicle is still here before you visit.'],
  ['Do you take trade-ins?', 'Ask us. Tell us about your vehicle when you call or send a message and we will let you know what is possible.'],
  ['Do you offer financing?', 'Ask us about your options. Approval and terms depend on you and the lender.'],
  ['What are your hours?', 'Monday to Saturday 9:00 AM to 6:00 PM, closed Sunday. Hours can vary on holidays, so call ahead.'],
  ['Can I see the vehicle history?', 'Ask for the history report on any vehicle you are interested in.'],
];

const HOURS = { 0: null, 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [9, 18] };
// Pensacola is on Central time, so compute open/closed there regardless of the visitor's zone.
export function openStatus(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t).value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const t = (Number(get('hour')) % 24) + Number(get('minute')) / 60;
  const h = HOURS[day];
  if (h && t >= h[0] && t < h[1]) return { open: true, text: `Open now · until ${h[1] - 12} PM` };
  if (h && t < h[0]) return { open: false, text: `Closed · opens ${h[0]} AM today` };
  const next = day === 6 ? 'Monday' : 'tomorrow';
  return { open: false, text: `Closed · opens ${next === 'Monday' ? 'Monday' : 'tomorrow'} at 9 AM` };
}

// The owner's other businesses.
export const OTHER_STORES = [
  { k: 'Furniture and appliances', title: 'Royal Appliance Outlet', text: 'Furniture, mattresses and home appliances.', url: '', phone: '(850) 741-4143', address: '1612 N Pace Blvd Suite 4, Pensacola' },
  { k: 'Vape shop', title: 'Royal Vape Mart', text: 'Pensacola vape and smoke shop. Open daily 6 AM to 1 AM. Adults 21 and older only.', url: 'https://royalvapemart.com', phone: '(850) 332-6322', address: '8701 Gulf Beach Hwy, Pensacola' },
];

STORE.sms = STORE.tel;
