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

export const MAPS_URL =
  'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(STORE.address);

// `tone` drives the placeholder artwork until real product photos are supplied.
export const CATEGORIES = [
  { id: 'living', name: 'Living Room', blurb: 'Sofas, sectionals, recliners, occasional tables and media furniture.', tone: '#8a6f55' },
  { id: 'bedroom', name: 'Bedroom', blurb: 'Beds and coordinated bedroom furniture.', tone: '#3f6670' },
  { id: 'dining', name: 'Kitchen & Dining', blurb: 'Dining sets, tables, seating and storage.', tone: '#4a3b34' },
  { id: 'office', name: 'Home Office', blurb: 'Desks, chairs, bookcases and office storage.', tone: '#6b7f8c' },
  { id: 'accent', name: 'Accent Furniture', blurb: 'Statement chairs, tables, cabinets and benches.', tone: '#a58f78' },
  { id: 'entry', name: 'Entryway', blurb: 'Hall trees, console tables, benches and entry storage.', tone: '#5d7a86' },
  { id: 'kids', name: 'Kids & Baby', blurb: 'Beds, cribs and furniture for growing rooms.', tone: '#2f4f86' },
  { id: 'outdoor', name: 'Outdoor', blurb: 'Patio seating, dining and outdoor tables.', tone: '#58704a' },
  { id: 'mattress', name: 'Mattresses', blurb: 'Hybrid and memory foam mattresses.', tone: '#9aa3ad' },
  { id: 'decor', name: 'Decor / Home Accents', blurb: 'Wall art, mirrors and decorative accents.', tone: '#b49a6c' },
  { id: 'rugs', name: 'Rugs', blurb: 'Area, runner, accent and outdoor rugs.', tone: '#7d8794' },
  { id: 'lighting', name: 'Lighting', blurb: 'Table lamps, floor lamps and wall lighting.', tone: '#c2a45a' },
  { id: 'storage', name: 'Storage / Organization', blurb: 'Bookcases, cabinets, shelves and practical storage.', tone: '#9a6a3a' },
  { id: 'appliances', name: 'Appliances', blurb: 'Kitchen, laundry and home-comfort appliances.', tone: '#7c8790' },
];

// Starter catalog. Replace names, photos and notes with real inventory;
// pricing is intentionally omitted because the floor changes weekly.
export const PRODUCTS = [
  { id: 'p1', cat: 'living', name: 'Reclining Sectional', note: 'Roomy seating for the whole family.' },
  { id: 'p2', cat: 'living', name: 'Leather Recliner', note: 'Power and manual styles on the floor.' },
  { id: 'p3', cat: 'living', name: 'Entertainment Console', note: 'Media storage with cable management.' },
  { id: 'p4', cat: 'bedroom', name: 'Upholstered Queen Bed', note: 'Matching dressers and nightstands.' },
  { id: 'p5', cat: 'bedroom', name: 'Six-Drawer Dresser', note: 'Solid construction, generous storage.' },
  { id: 'p6', cat: 'dining', name: 'Farmhouse Dining Set', note: 'Table with bench and chairs.' },
  { id: 'p7', cat: 'dining', name: 'Counter-Height Pub Set', note: 'Great for smaller kitchens.' },
  { id: 'p8', cat: 'office', name: 'Writing Desk', note: 'Compact footprint, real drawers.' },
  { id: 'p9', cat: 'accent', name: 'Tufted Accent Chair', note: 'A statement piece for any corner.' },
  { id: 'p10', cat: 'mattress', name: 'Hybrid Mattress', note: 'Twin through king. Ask what is in stock.' },
  { id: 'p11', cat: 'mattress', name: 'Memory Foam Mattress', note: 'Medium and firm feels.' },
  { id: 'p12', cat: 'outdoor', name: 'Patio Conversation Set', note: 'Weather-ready seating and table.' },
  { id: 'p13', cat: 'kids', name: 'Twin Loft Bed', note: 'Room to play, sleep and store.' },
  { id: 'p14', cat: 'rugs', name: '5x7 Area Rug', note: 'Multiple patterns and sizes.' },
  { id: 'p15', cat: 'lighting', name: 'Floor Lamp', note: 'Modern and traditional looks.' },
  { id: 'p16', cat: 'appliances', name: 'French Door Refrigerator', note: 'Stainless finishes, ask about models.' },
  { id: 'p17', cat: 'appliances', name: 'Washer & Dryer Pair', note: 'Front-load and top-load options.' },
  { id: 'p18', cat: 'appliances', name: 'Range & Cooktop', note: 'Gas and electric on the floor.' },
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
