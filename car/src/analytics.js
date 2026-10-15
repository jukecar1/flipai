// Privacy-friendly page and product counts. Off unless REACT_APP_ANALYTICS_URL is set at build time, e.g. a GoatCounter
// site: REACT_APP_ANALYTICS_URL=https://yourname.goatcounter.com/count . It uses no cookies, stores no profile, and is
// skipped when a visitor rejects non-essential storage or has Do Not Track on.
const URL_BASE = process.env.REACT_APP_ANALYTICS_URL || '';
export const analyticsEnabled = Boolean(URL_BASE);

export function trackingAllowed() {
  try {
    if (window.localStorage.getItem('royal_cookie_consent') === 'necessary') return false;
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return false;
  } catch (e) { /* storage unavailable: treat as allowed, the service itself is cookie-free */ }
  return true;
}

export function trackUrl(path, title) {
  const q = new URLSearchParams({ p: path, t: title || '', rnd: Math.random().toString(36).slice(2) });
  return `${URL_BASE}?${q.toString()}`;
}

export function track(path, title) {
  if (!analyticsEnabled || (typeof window !== 'undefined' && window.__PREVIEW) || !trackingAllowed()) return;
  const img = new Image();
  img.referrerPolicy = 'no-referrer';
  img.src = trackUrl(path, title);
}
