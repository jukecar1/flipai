import React from 'react';

// The app's icon mark — a raised fist inside a beveled, glossy badge, in
// place of the old flat "FE" monogram. Pure inline SVG (gradients +
// a soft shadow behind the fist shapes to fake a bit of depth) so it
// stays crisp at every size it's used at — sidebar, start screen, and
// the loading screen — with no raster asset to ship or scale.
export default function Logomark({ size = 40, className = '' }) {
  // Gradient ids need to be unique per instance — the sidebar logo and a
  // hero logo could in principle both be mounted at once, and SVG doesn't
  // scope <defs> ids to their own <svg>.
  const uid = React.useId();
  const base = `fe-logo-base-${uid}`;
  const gloss = `fe-logo-gloss-${uid}`;
  const fist = `fe-logo-fist-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={base} x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ff6a4d" />
          <stop offset="45%" stopColor="#e2263a" />
          <stop offset="100%" stopColor="#951321" />
        </linearGradient>
        <linearGradient id={gloss} x1="20" y1="2" x2="20" y2="19" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={fist} x1="20" y1="9" x2="20" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f4dccf" />
        </linearGradient>
      </defs>

      {/* badge base + top-half gloss sheen + a hairline bevel edge */}
      <rect x="2" y="2" width="36" height="36" rx="9" fill={`url(#${base})`} />
      <rect x="2" y="2" width="36" height="17" rx="9" fill={`url(#${gloss})`} />
      <rect x="2.75" y="2.75" width="34.5" height="34.5" rx="8.3" stroke="#1a0508" strokeOpacity="0.22" strokeWidth="1.5" />

      {/* soft shadow the fist sits on, offset down-right for a raised feel */}
      <ellipse cx="21" cy="25.5" rx="12.5" ry="9.5" fill="#5a0d15" opacity="0.4" />

      {/* fist: wrist + palm + four knuckles */}
      <g stroke="#8f2a1c" strokeOpacity="0.3" strokeWidth="0.6">
        <rect x="13" y="23" width="14" height="10" rx="3.4" fill={`url(#${fist})`} />
        <rect x="7" y="13" width="26" height="16" rx="8" fill={`url(#${fist})`} />
        <circle cx="11.5" cy="11.6" r="3.9" fill={`url(#${fist})`} />
        <circle cx="18.8" cy="9.4" r="3.9" fill={`url(#${fist})`} />
        <circle cx="26.1" cy="9.4" r="3.9" fill={`url(#${fist})`} />
        <circle cx="32" cy="11.6" r="3.6" fill={`url(#${fist})`} />
      </g>
    </svg>
  );
}
