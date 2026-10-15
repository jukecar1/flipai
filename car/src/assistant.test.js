import { reply, searchProducts } from './assistant';

test('explains how to schedule a test drive', () => {
  const r = reply('Can I schedule a test drive?');
  expect(r.text).toMatch(/test drive/i);
  expect(r.link.to).toBe('/test-drive');
});

test('finds vehicles by body type and by make', () => {
  expect(searchProducts('trucks').hits.length).toBeGreaterThan(0);
  expect(searchProducts('Honda').hits.length).toBeGreaterThan(0);
});

test('respects a budget', () => {
  const { hits } = searchProducts('SUV under $20,000');
  expect(hits.length).toBeGreaterThan(0);
  hits.forEach((p) => expect(p.price).toBeLessThanOrEqual(20000));
});

test('hours reply states the status', () => {
  expect(reply('are you open now?').text).toMatch(/Open now|Closed/);
});

test('falls back to the phone number', () => {
  expect(reply('qwertyuiop zzz').text).toMatch(/\(850\) 555-0100/);
});
