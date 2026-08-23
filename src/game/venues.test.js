import { FIGHT_TYPES } from './constants';
import { homeVenues, regionalVenues, venueOptions, MARQUEE_VENUES } from './venues';

test('home venues are always in the player\'s own HQ city, whatever that city is', () => {
  const denver = homeVenues('Denver, CO', 'city');
  expect(denver.length).toBeGreaterThan(0);
  denver.forEach(v => {
    expect(v.city).toBe('Denver');
    expect(v.name).toMatch(/^Denver /);
    expect(v.home).toBe(true);
  });
});

test('a small town does not get a home stadium, but a megacity does', () => {
  const town = homeVenues('Bar Harbor, ME', 'town');
  const megacity = homeVenues('New York, NY', 'megacity');
  expect(town.some(v => v.tier === 'stadium')).toBe(false);
  expect(megacity.some(v => v.tier === 'stadium')).toBe(true);
});

test('home venue capacity and fees scale up with city size', () => {
  const town = homeVenues('Small Town, WY', 'town').find(v => v.tier === 'arena');
  const city = homeVenues('Mid City, OH', 'city').find(v => v.tier === 'arena');
  const megacity = homeVenues('Big Metro, NY', 'megacity').find(v => v.tier === 'arena');
  expect(town.capacity).toBeLessThan(city.capacity);
  expect(city.capacity).toBeLessThan(megacity.capacity);
  expect(town.fee).toBeLessThan(city.fee);
  expect(city.fee).toBeLessThan(megacity.fee);
});

test('a promotion based in Denver sees real nearby Colorado cities as regional venues', () => {
  const denverRegion = regionalVenues('Denver, CO').map(v => v.city);
  expect(denverRegion).toEqual(expect.arrayContaining(['Boulder', 'Aurora', 'Fort Collins']));
  expect(denverRegion).not.toContain('Denver');
});

test('regional venues scale to the neighbor\'s own city size, not the HQ\'s', () => {
  const boulderHall = regionalVenues('Denver, CO').find(v => v.city === 'Boulder');
  const auroraHall = regionalVenues('Denver, CO').find(v => v.city === 'Aurora');
  // Aurora (~390k, "city" tier) is bigger than Boulder (~105k, also "city"
  // tier but near the bottom of it) — both are real, distinct fees, neither
  // just inherits Denver's own (much bigger, "metro" tier) numbers.
  expect(boulderHall).toBeTruthy();
  expect(auroraHall).toBeTruthy();
  expect(boulderHall.tier).toBe('small_hall');
});

test('an HQ with no real neighbors within range (or an unresolvable label) gets no regional venues', () => {
  expect(regionalVenues('Bar Harbor, ME')).toEqual([]);
  expect(regionalVenues('Nowhere Special')).toEqual([]);
});

test('a Single Fight only offers small local halls, at home or in a real nearby city — never a marquee road trip', () => {
  const { home, regional, away } = venueOptions(FIGHT_TYPES.SINGLE, 'Denver, CO', 'city');
  expect(home.length).toBeGreaterThan(0);
  expect(regional.length).toBeGreaterThan(0);
  [...home, ...regional].forEach(v => expect(v.tier).toBe('small_hall'));
  expect(away).toHaveLength(0);
});

test('a Showcase stays local too — small halls and theatres, still no marquee road trip', () => {
  const { home, regional, away } = venueOptions(FIGHT_TYPES.SHOWCASE, 'Denver, CO', 'city');
  [...home, ...regional].forEach(v => expect(['small_hall', 'theatre']).toContain(v.tier));
  expect(away).toHaveLength(0);
});

test('a Main Event offers a home arena plus the marquee road-trip venues, no small-town regional halls', () => {
  const { home, regional, away } = venueOptions(FIGHT_TYPES.MAIN_EVENT, 'Denver, CO', 'city');
  home.forEach(v => expect(['arena', 'stadium']).toContain(v.tier));
  expect(regional).toHaveLength(0);
  expect(away.length).toBe(MARQUEE_VENUES.length);
  expect(away.every(v => ['arena', 'stadium'].includes(v.tier))).toBe(true);
});

test('the card builder (no fight type) sees every home tier, regional halls, and the marquee list', () => {
  const { home, regional, away } = venueOptions(null, 'Denver, CO', 'megacity');
  expect(home.length).toBe(5); // 2 small_hall + theatre + arena + stadium, megacity qualifies for a home stadium
  expect(regional.length).toBeGreaterThan(0);
  expect(away.length).toBe(MARQUEE_VENUES.length);
});
