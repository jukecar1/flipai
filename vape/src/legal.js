// Policy text adapted from the store's current website. Have the store (and its attorney) review it before launch.
import { analyticsEnabled } from './analytics';

const PH = '(850) 332-6322';
const ADDR = '8701 Gulf Beach Hwy, Pensacola, FL 32507';

export const LEGAL = {
  privacy: {
    title: 'Privacy Policy',
    description: 'How Royal Vape Mart in Pensacola handles your information: the minimum needed for your reservation, no advertising trackers, and no selling of personal data.',
    blocks: [
      { h: 'The short version' },
      { p: 'Royal Vape Mart is a neighborhood shop, and we treat customer information the way we would want ours treated: collect the minimum, use it only for your order, and never sell it.' },
      { h: 'What we collect' },
      { ul: [
        'When you reserve products for pickup: your name, phone number and, if you choose to give it, your email address, plus the details of your order (items, flavors or strengths, and quantities).',
        'When you request a product with the "What should we carry?" form: what you asked for and any name, email or phone number you choose to give us.',
        'That you confirmed you are 21 or older when you placed the reservation.',
        'Your cookie choice, kept in your browser so we do not ask again on every visit. Your age confirmation is not stored: we ask each time you open the site.',
        analyticsEnabled ? 'Page counts: we count page and product views with a privacy-friendly service that uses no cookies and builds no profile of you. It is skipped if you reject non-essential storage.' : 'Not happening: no advertising trackers and no analytics tool installed today.',
      ] },
      { h: 'How we use it' },
      { ul: [
        'Your contact information is used for order updates and, if you asked, in-stock alerts for products you requested.',
        'Phone numbers are only used for order and in-stock notifications, never for promotions.',
        'If you join the deals list with your email, we use it only to send deals and new arrivals. You can unsubscribe at any time with the link in any email, or by calling or visiting the store. Unsubscribing stops marketing emails; we keep order history for our records.',
      ] },
      { h: 'Who sees it' },
      { p: 'Your information is never sold or shared with marketers or data brokers. Only Royal Vape Mart staff can see your details. The service providers that run this website and deliver the forms to us process the data on our behalf and are bound by their own privacy obligations. Beyond that, we only disclose information if the law requires it.' },
      { h: 'Outside servers' },
      { p: 'Fonts load from Google Fonts. If you choose to show the interactive map, it loads from Google Maps, which may set its own cookies. Like any website you visit, those servers receive standard technical data such as your IP address.' },
      { h: 'How long we keep it' },
      { p: 'Order records are kept as long as needed for normal business, tax and regulatory record-keeping. You can call or ask in store at any time to learn what we hold about you or to have your data deleted, where the law allows it.' },
      { h: 'Children' },
      { p: 'This website sells age-restricted products and is for adults 21 and older only.' },
      { h: 'Questions or requests' },
      { p: `Call us at ${PH} or ask in person at ${ADDR}. We are happy to answer questions about what we collect or to handle a deletion request.` },
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    description: 'What Royal Vape Mart stores in your browser: your cookie choice, your age confirmation and your reserve list. No advertising trackers.',
    blocks: [
      { h: 'Privacy first' },
      { p: analyticsEnabled ? 'We use only the information needed to run the site and remember your preferences. There are no advertising trackers, and we do not sell your personal information.' : 'We use only the information needed to run the site and remember your preferences. This site loads no analytics tool and no advertising trackers, and we do not sell your personal information.' },
      { h: 'Cookies vs. browser storage' },
      { p: 'Most of what this site remembers is not a cookie at all. It is saved in your browser\'s local storage, which stays on your device and is not sent to us automatically.' },
      { h: 'Categories' },
      { ul: [
        'Strictly necessary (always on): required for the site to work, including your reserve list and remembering this choice.',
        analyticsEnabled ? 'Analytics (optional): cookie-free page and product counts with no personal profile. Skipped if you reject non-essential storage.' : 'Analytics (not used): no analytics tool is installed on this site today.',
        'Marketing and advertising (not used): there are no advertising or retargeting trackers on this site.',
      ] },
      { h: 'What is stored today' },
      { ul: [
        'royal_cookie_consent: local storage, first party. Stores your cookie choice so the notice is not shown again.',
        'royal_reserve: local storage, first party. Remembers the items on your reserve list on this device until you clear it.',
        'royal_recent: local storage, first party. Remembers the last few products you viewed on this device.',
      ] },
      { p: 'Your browser, our hosting provider and Google Fonts may also handle standard technical data, such as an IP address, needed to deliver pages. We do not control those servers and we do not use them for tracking.' },
      { h: 'Changing your mind' },
      { p: 'You can update your choice any time with the "Cookie preferences" link in the footer, and you can clear cookies and local storage in your browser settings.' },
      { h: 'Questions' },
      { p: `Call ${PH} and we will explain anything on this page.` },
    ],
  },
  terms: {
    title: 'Terms of Use',
    description: 'Terms for using the Royal Vape Mart website: 21+ only, reserve online and pay in store, and product details that may vary.',
    blocks: [
      { h: 'About these terms' },
      { p: `These terms apply to your use of the Royal Vape Mart website. Royal Vape Mart operates a retail store at ${ADDR}. By browsing the site or reserving products through it, you agree to what follows.` },
      { h: '21 and older only' },
      { p: 'Every product we sell is for adults 21 and older. You must be 21 or older to use the reserve feature. A valid, government-issued photo ID is checked at the counter for every pickup, and we reserve the right to refuse any sale.' },
      { h: 'Reserving products' },
      { ul: [
        'Reserving is not a purchase. There is no online payment. You pay at the counter, by cash or card, when you pick up.',
        'We hold a reservation until close the same day. Reservations are subject to availability, and we may contact you if an item or flavor is not in stock.',
        'Nothing is shipped. Everything on the site is reserve online, pick up in store.',
      ] },
      { h: 'Listings, prices and photos' },
      { p: `Prices, flavors, strengths and availability change. Listings and photography help illustrate what we carry and are not a guarantee that a specific item is in stock. The price at the counter at pickup applies. Call ${PH} to confirm anything before you come in.` },
      { h: 'Your use of the site' },
      { p: 'Please do not misuse the site: no attempts to disrupt it, access it by automated means at a scale that degrades it for others, or copy its content for commercial republication. Site text, layout and imagery belong to Royal Vape Mart or its licensors. Brand names and logos belong to their owners.' },
      { h: 'Limits' },
      { p: 'The site is provided as-is. We work to keep information accurate, but we cannot guarantee that every listing or detail is current at any given moment. Nothing in these terms limits rights you have under applicable Florida or federal law.' },
      { h: 'Contact' },
      { p: `Questions about these terms? Call ${PH} or visit us at ${ADDR}.` },
    ],
  },
  age: {
    title: '21+ Policy',
    description: 'Royal Vape Mart sells age-restricted products and is 21+ only, with valid photo ID required for every purchase.',
    blocks: [
      { h: '21+ only, no exceptions' },
      { p: 'Royal Vape sells age-restricted products, and that is not something this store is casual about. Here is what that means in practice.' },
      { ul: [
        'You must be 21 or older to buy any tobacco, nicotine or vapor product here. Federal law (the Tobacco 21 Act, effective December 2019) and Florida law (Fla. Stat. ch. 569) both set that line at 21.',
        'Valid, government-issued photo ID is required for every purchase.',
        'Royal Vape reserves the right to refuse any sale.',
      ] },
      { p: 'The sale of tobacco products, nicotine products, or nicotine dispensing devices to persons under the age of 21 is against Florida law. Proof of age is required for purchase. (Posted at the register, per Florida Statute § 569.14(2).)' },
      { p: 'WARNING: This product contains nicotine. Nicotine is an addictive chemical. (Required nicotine warning statement, 21 CFR § 1143.3.)' },
      { p: 'This page is provided for general information and is not legal advice. Royal Vape should confirm current signage and compliance requirements with a licensed Florida attorney.' },
    ],
  },
};
