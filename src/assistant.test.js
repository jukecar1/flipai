import { reply, searchProducts } from './assistant';

test('answers hours and location', () => {
  expect(reply('are you open today?').text).toMatch(/Hours/);
  expect(reply('where are you located').text).toMatch(/Pace Blvd/);
  expect(reply('what is your phone number').link.tel).toBe(true);
});

test('explains financing providers', () => {
  const r = reply('do you offer financing with bad credit?');
  expect(r.text).toMatch(/Synchrony/);
  expect(r.link.to).toBe('/financing');
});

test('finds products by type and respects a price cap', () => {
  const r = reply('do you have a dresser under $400');
  expect(r.products.length).toBeGreaterThan(0);
  r.products.forEach((p) => expect(p.price).toBeLessThanOrEqual(400));
  // sofas rarely list a price, so a budget search falls back to honest closest matches
  const s = reply('sofas under $800');
  expect(s.products.length).toBeGreaterThan(0);
  expect(s.text).toMatch(/closest matches/);
  expect(searchProducts('couch').hits.length).toBeGreaterThan(0);
  expect(searchProducts('fridge').hits[0].type).toMatch(/Refrigerator/);
  expect(searchProducts('washer and dryer').hits.length).toBeGreaterThan(0);
});

test('never invents an answer for gibberish', () => {
  const r = reply('qzxv plmk');
  expect(r.products).toBeUndefined();
  expect(r.text).toMatch(/not sure/);
});
