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

export function GymsIcon() {
  return (
    <svg {...base}>
      <path d="M2.5 12h2M19.5 12h2" />
      <rect x="4.5" y="9" width="2.5" height="6" rx="0.8" />
      <rect x="17" y="9" width="2.5" height="6" rx="0.8" />
      <path d="M7 12h10" strokeWidth="2.6" />
    </svg>
  );
}

export function TitlesIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="8.5" r="5.5" />
      <path d="M9.2 13.2 7.5 21l4.5-2.3 4.5 2.3-1.7-7.8" />
    </svg>
  );
}

export function BoutsIcon() {
  return (
    <svg {...base}>
      <rect x="4" y="4.5" width="16" height="16" rx="2" />
      <path d="M4 9.5h16" />
      <path d="M8 4.5v-1.5M16 4.5v-1.5" />
      <path d="M7.5 13.5h3M7.5 17h6" />
    </svg>
  );
}

export function HallOfFameIcon() {
  return (
    <svg {...base}>
      <path d="M12 3.5 14.2 9l5.8.5-4.4 3.8 1.4 5.7L12 15.9l-5 3.1 1.4-5.7L4 9.5 9.8 9z" />
    </svg>
  );
}

export function AmateursIcon() {
  return (
    <svg {...base}>
      <path d="M12 20V11" />
      <path d="M12 11c0-3.5-2.5-6-6.5-6.5C5.8 8.5 8.2 11 12 11Z" />
      <path d="M12 11c0-3.5 2.5-6 6.5-6.5C18.2 8.5 15.8 11 12 11Z" />
    </svg>
  );
}

export function LeaderboardsIcon() {
  return (
    <svg {...base}>
      <rect x="4" y="14" width="4.5" height="6" />
      <rect x="9.75" y="9.5" width="4.5" height="10.5" />
      <rect x="15.5" y="12" width="4.5" height="8" />
    </svg>
  );
}

export function StatsIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 12 12 5.5" />
      <path d="M12 12 17 15" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.4M12 18.1v2.4M4.6 7.3l2.1 1.2M17.3 15.5l2.1 1.2M4.6 16.7l2.1-1.2M17.3 8.5l2.1-1.2M3.5 12h2.4M18.1 12h2.4" />
    </svg>
  );
}

export function ChirpIcon() {
  return (
    <svg {...base}>
      <path d="M20 6.4c-.7.3-1.4.5-2.1.6.8-.5 1.4-1.2 1.6-2.1-.7.4-1.5.7-2.4.9a3.7 3.7 0 0 0-6.3 3.4A10.5 10.5 0 0 1 3.3 5a3.7 3.7 0 0 0 1.1 5 3.6 3.6 0 0 1-1.7-.5v.1a3.7 3.7 0 0 0 3 3.6 3.7 3.7 0 0 1-1.7.1 3.7 3.7 0 0 0 3.5 2.6A7.5 7.5 0 0 1 2 17.3a10.5 10.5 0 0 0 5.7 1.7c6.8 0 10.6-5.7 10.6-10.6v-.5c.7-.5 1.3-1.2 1.8-1.9z" />
    </svg>
  );
}
