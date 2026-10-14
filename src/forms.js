import { FORM_ENDPOINT } from './config';
import { STORE } from './data';

// Sends a small form to the store. In the shared preview it only pretends; without a configured endpoint it opens
// the visitor's email app instead. Returns 'sent' or throws.
export async function submitForm(subject, fields, mailBody) {
  const preview = typeof window !== 'undefined' && window.__PREVIEW;
  if (!FORM_ENDPOINT && !preview) {
    window.location.href = `mailto:${STORE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;
    return 'mailto';
  }
  if (preview) { await new Promise((r) => setTimeout(r, 700)); return 'sent'; }
  const res = await fetch(FORM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...fields, _subject: subject }),
  });
  if (!res.ok) throw new Error('send failed');
  return 'sent';
}
