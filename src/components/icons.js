import React from 'react';

// Small hand-authored line icons (generic shapes, 18x18) — no external
// icon library, keeps the bundle light and avoids any third-party assets.
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function HomeIcon() {
  return (
    <svg {...base}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function RosterIcon() {
  return (
    <svg {...base}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c.5-3.5 3-5.5 5.5-5.5s5 2 5.5 5.5" />
      <circle cx="17.5" cy="8.5" r="2.2" />
      <path d="M15.7 14.6c1.9.4 3.5 2 4 5.4" />
    </svg>
  );
}

export function FightsIcon() {
  return (
    <svg {...base}>
      <path d="M4 4l6 6" />
      <path d="M20 4l-6 6" />
      <path d="M10 10l-6.5 6.5a1.5 1.5 0 0 0 2 2L12 12" />
      <path d="M14 10l6.5 6.5a1.5 1.5 0 0 1-2 2L12 12" />
    </svg>
  );
}

export function RankingsIcon() {
  return (
    <svg {...base}>
      <path d="M4 20V12" />
      <path d="M10 20V6" />
      <path d="M16 20v-9" />
      <path d="M2.5 20h19" />
    </svg>
  );
}

export function PromotionsIcon() {
  return (
    <svg {...base}>
      <path d="M4 21V9l7-4 7 4v12" />
      <path d="M4 21h16" />
      <path d="M10 21v-5h4v5" />
      <path d="M9 12h.01M13 12h.01M9 9h.01M13 9h.01" />
    </svg>
  );
}

export function NewsIcon() {
  return (
    <svg {...base}>
      <rect x="3.5" y="5" width="14" height="15" rx="1.5" />
      <path d="M17.5 9H20a.5.5 0 0 1 .5.5V18a2 2 0 0 1-2 2" />
      <path d="M7 9h7M7 12.5h7M7 16h4" />
    </svg>
  );
}
