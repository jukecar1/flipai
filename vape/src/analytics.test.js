describe('analytics', () => {
  afterEach(() => { jest.resetModules(); delete process.env.REACT_APP_ANALYTICS_URL; window.localStorage.clear(); });

  test('is off without a configured URL', () => {
    const a = require('./analytics');
    expect(a.analyticsEnabled).toBe(false);
  });

  test('builds a counting URL with path and title when enabled', () => {
    process.env.REACT_APP_ANALYTICS_URL = 'https://shop.goatcounter.com/count';
    const a = require('./analytics');
    const u = a.trackUrl('/product/5', 'Braxmore Accent Table');
    expect(u).toMatch(/^https:\/\/shop\.goatcounter\.com\/count\?/);
    expect(u).toContain('p=%2Fproduct%2F5');
    expect(u).toContain('t=Braxmore+Accent+Table');
  });

  test('respects a rejected cookie choice', () => {
    process.env.REACT_APP_ANALYTICS_URL = 'https://shop.goatcounter.com/count';
    window.localStorage.setItem('royal_cookie_consent', 'necessary');
    const a = require('./analytics');
    expect(a.trackingAllowed()).toBe(false);
  });
});
