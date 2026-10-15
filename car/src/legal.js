// Policy text adapted from the Royal sites. PLACEHOLDER: have the dealer (and an attorney) review it before launch.
import { analyticsEnabled } from './analytics';

const PH = '(850) 555-0100';
const ADDR = 'Pensacola, FL';

export const LEGAL = {
  privacy: {
    title: 'Privacy Policy',
    description: "How Sean's Car Business in Pensacola handles your information: only what you send us, no advertising trackers, and no selling of personal data.",
    blocks: [
      { h: 'The short version' },
      { p: "Sean's Car Business is a local dealership, not a data business. We collect the minimum, use it only to answer you, and never sell it." },
      { h: 'What we collect' },
      { ul: [
        'When you request a test drive or send a message: your name, phone number, email (if you give it), the vehicle you asked about and anything you write.',
        'Your cookie choice, kept in your browser so we do not ask again on every visit.',
        analyticsEnabled ? 'Page counts: we count page and vehicle views with a privacy-friendly service that uses no cookies and builds no profile of you. It is skipped if you reject non-essential storage.' : 'Not happening: no advertising trackers and no analytics tool installed today.',
      ] },
      { h: 'How we use it' },
      { p: 'Your details are used to reply to you and to confirm test drives. We do not use them for anything else.' },
      { h: 'Who sees it' },
      { p: 'Your information is never sold or shared with marketers or data brokers. Only dealership staff can see your details. The service providers that run this website and deliver the forms to us process the data on our behalf and are bound by their own privacy obligations. Beyond that, we only disclose information if the law requires it.' },
      { h: 'Outside servers' },
      { p: 'Fonts load from Google Fonts. If you choose to show the interactive map, it loads from Google Maps, which may set its own cookies. Like any website you visit, those servers receive standard technical data such as your IP address.' },
      { h: 'How long we keep it' },
      { p: 'We keep inquiry records only as long as needed to serve you and meet normal business record-keeping requirements. You can ask what we hold about you or ask us to delete it, where the law allows.' },
      { h: 'Questions or requests' },
      { p: `Call us at ${PH} or ask in person (${ADDR}).` },
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    description: "What Sean's Car Business stores in your browser: your cookie choice and the last vehicles you viewed. No advertising trackers.",
    blocks: [
      { h: 'Privacy first' },
      { p: analyticsEnabled ? 'We use only the information needed to run the site and remember your preferences. There are no advertising trackers, and we do not sell your personal information.' : 'We use only the information needed to run the site and remember your preferences. This site loads no analytics tool and no advertising trackers, and we do not sell your personal information.' },
      { h: 'Cookies vs. browser storage' },
      { p: "Most of what this site remembers is not a cookie at all. It is saved in your browser's local storage, which stays on your device and is not sent to us automatically." },
      { h: 'What is stored today' },
      { ul: [
        'royal_cookie_consent: local storage, first party. Stores your cookie choice so the notice is not shown again.',
        'royal_recent: local storage, first party. Remembers the last few vehicles you viewed on this device.',
      ] },
      { p: analyticsEnabled ? 'Analytics (optional): cookie-free page and vehicle counts with no personal profile, skipped if you reject non-essential storage.' : 'No analytics tool is installed on this site today.' },
      { h: 'Changing your mind' },
      { p: 'You can update your choice any time with the "Cookie preferences" link in the footer, and you can clear cookies and local storage in your browser settings.' },
      { h: 'Questions' },
      { p: `Call ${PH} and we will explain anything on this page.` },
    ],
  },
  terms: {
    title: 'Terms of Use',
    description: "Terms for using the Sean's Car Business website: listings are illustrative, vehicles may be sold, and there is no online purchase.",
    blocks: [
      { h: 'About these terms' },
      { p: `These terms apply to your use of the Sean's Car Business website. By browsing the site or contacting us through it, you agree to what follows.` },
      { h: 'Listings, prices and photos' },
      { p: `Vehicle listings, prices, mileage and photos help show what we have. Vehicles sell quickly, and a listing is not a guarantee that a vehicle is still available or that a price has not changed. Call ${PH} to confirm anything before you visit. Details and condition should be verified in person.` },
      { h: 'No online purchase' },
      { p: 'This website does not provide checkout or online payment. A test drive request is not a purchase or a reservation. Purchases are handled directly with the dealership.' },
      { h: 'Your use of the site' },
      { p: "Please do not misuse the site: no attempts to disrupt it, access it by automated means at a scale that degrades it for others, or copy its content for commercial republication. Site text, layout and imagery belong to Sean's Car Business or its licensors." },
      { h: 'Limits' },
      { p: 'The site is provided as-is. We work to keep information accurate, but we cannot guarantee that every listing or detail is current at any given moment. Nothing in these terms limits rights you have under applicable Florida or federal law.' },
      { h: 'Contact' },
      { p: `Questions about these terms? Call ${PH}.` },
    ],
  },
};
