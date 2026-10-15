import { reply, searchProducts } from './assistant';

test('answers the 21+ ID question', () => {
  expect(reply('Do I need ID?').text).toMatch(/21\+/);
});

test('explains reserving without online payment', () => {
  const r = reply('How do I reserve?');
  expect(r.text).toMatch(/no online payment/i);
  expect(r.link.to).toBe('/reserve');
});

test('finds a brand, including by flavor', () => {
  expect(searchProducts('Geek Bar').hits.length).toBeGreaterThan(0);
  expect(reply('do you have zyn').products.length).toBeGreaterThan(0);
});

test('hours reply states the status', () => {
  expect(reply('are you open now?').text).toMatch(/Open now|Closed/);
});

test('falls back to the phone number', () => {
  expect(reply('qwertyuiop zzz').text).toMatch(/\(850\) 332-6322/);
});
