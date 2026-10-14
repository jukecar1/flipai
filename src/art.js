import { CATEGORIES } from './data';

// Flat line-and-fill illustrations used until real product photos are supplied.
// Each draws in `currentColor` (main) and `var(--art2)` (accent).
const A = 'var(--art2)';
const SHAPES = {
  living: (<>
    <rect x="30" y="34" width="100" height="34" rx="12" fill="currentColor" />
    <rect x="18" y="52" width="124" height="28" rx="9" fill={A} />
    <rect x="12" y="44" width="24" height="40" rx="10" fill="currentColor" />
    <rect x="124" y="44" width="24" height="40" rx="10" fill="currentColor" />
    <rect x="30" y="84" width="6" height="10" fill="currentColor" /><rect x="124" y="84" width="6" height="10" fill="currentColor" />
  </>),
  bedroom: (<>
    <rect x="22" y="22" width="12" height="72" rx="3" fill="currentColor" />
    <rect x="126" y="40" width="12" height="54" rx="3" fill="currentColor" />
    <rect x="34" y="56" width="92" height="24" rx="5" fill={A} />
    <rect x="40" y="46" width="30" height="14" rx="6" fill="#fff" opacity=".85" />
    <rect x="34" y="72" width="92" height="12" rx="3" fill="currentColor" />
  </>),
  dining: (<>
    <rect x="24" y="44" width="112" height="9" rx="3" fill="currentColor" />
    <rect x="36" y="53" width="7" height="40" fill="currentColor" /><rect x="117" y="53" width="7" height="40" fill="currentColor" />
    <rect x="4" y="46" width="14" height="30" rx="4" fill={A} /><rect x="142" y="46" width="14" height="30" rx="4" fill={A} />
    <circle cx="80" cy="34" r="8" fill={A} />
  </>),
  office: (<>
    <rect x="22" y="48" width="116" height="8" rx="3" fill="currentColor" />
    <rect x="30" y="56" width="6" height="38" fill="currentColor" /><rect x="124" y="56" width="6" height="38" fill="currentColor" />
    <rect x="96" y="56" width="28" height="22" rx="3" fill={A} />
    <rect x="48" y="26" width="34" height="22" rx="3" fill="currentColor" /><rect x="62" y="48" width="6" height="0" />
  </>),
  accent: (<>
    <rect x="42" y="22" width="76" height="46" rx="22" fill="currentColor" />
    <rect x="28" y="52" width="104" height="26" rx="10" fill={A} />
    <rect x="24" y="44" width="20" height="38" rx="9" fill="currentColor" /><rect x="116" y="44" width="20" height="38" rx="9" fill="currentColor" />
    <rect x="42" y="82" width="6" height="12" fill="currentColor" /><rect x="112" y="82" width="6" height="12" fill="currentColor" />
  </>),
  entry: (<>
    <rect x="24" y="18" width="112" height="9" rx="3" fill="currentColor" />
    <rect x="40" y="27" width="5" height="8" fill="currentColor" /><rect x="115" y="27" width="5" height="8" fill="currentColor" />
    <path d="M52 32v18h14V32z" fill={A} /><path d="M92 32c10 0 16 8 14 22H84c-2-14 4-22 8-22z" fill={A} />
    <rect x="30" y="66" width="100" height="14" rx="4" fill="currentColor" />
    <rect x="38" y="80" width="6" height="14" fill="currentColor" /><rect x="116" y="80" width="6" height="14" fill="currentColor" />
  </>),
  kids: (<>
    <rect x="22" y="20" width="8" height="76" fill="currentColor" /><rect x="130" y="20" width="8" height="76" fill="currentColor" />
    <rect x="22" y="30" width="116" height="8" rx="2" fill="currentColor" />
    <rect x="30" y="38" width="100" height="14" rx="3" fill={A} />
    <rect x="30" y="68" width="100" height="10" rx="2" fill="currentColor" />
    <rect x="50" y="78" width="60" height="16" rx="2" fill={A} />
  </>),
  outdoor: (<>
    <rect x="14" y="50" width="62" height="28" rx="9" fill="currentColor" />
    <rect x="84" y="50" width="62" height="28" rx="9" fill={A} />
    <rect x="62" y="68" width="36" height="8" rx="3" fill="currentColor" />
    <rect x="22" y="78" width="6" height="14" fill="currentColor" /><rect x="132" y="78" width="6" height="14" fill="currentColor" />
    <path d="M80 14v30M52 34h56" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </>),
  mattress: (<>
    <path d="M26 56l86-14 30 14-86 18z" fill={A} />
    <path d="M26 56v12l56 18V74z" fill="currentColor" /><path d="M82 74v12l60-18V56z" fill="currentColor" opacity=".7" />
  </>),
  decor: (<>
    <rect x="34" y="14" width="46" height="66" rx="3" fill="currentColor" />
    <path d="M40 54c10-12 20 6 34-8v28H40z" fill={A} />
    <circle cx="116" cy="46" r="26" fill="none" stroke="currentColor" strokeWidth="7" />
    <circle cx="116" cy="46" r="18" fill={A} opacity=".5" />
  </>),
  rugs: (<>
    <path d="M30 40h112l-14 46H16z" fill="currentColor" />
    <path d="M40 48h94l-10 30H26z" fill="none" stroke={A} strokeWidth="4" />
    <path d="M52 56h72l-6 14H44z" fill={A} />
  </>),
  lighting: (<>
    <path d="M52 14h56l14 32H38z" fill={A} />
    <rect x="77" y="46" width="6" height="40" fill="currentColor" />
    <ellipse cx="80" cy="90" rx="24" ry="6" fill="currentColor" />
  </>),
  storage: (<>
    <rect x="30" y="14" width="100" height="80" rx="4" fill="currentColor" />
    <rect x="38" y="22" width="40" height="30" fill={A} /><rect x="82" y="22" width="40" height="30" fill={A} opacity=".6" />
    <rect x="38" y="56" width="84" height="30" fill={A} opacity=".85" />
  </>),
  appliances: (<>
    <rect x="46" y="10" width="68" height="86" rx="6" fill="currentColor" />
    <rect x="52" y="16" width="56" height="30" rx="3" fill={A} /><rect x="52" y="50" width="56" height="40" rx="3" fill={A} opacity=".7" />
    <rect x="56" y="24" width="4" height="14" rx="2" fill="#fff" /><rect x="56" y="58" width="4" height="18" rx="2" fill="#fff" />
  </>),
  washer: (<>
    <rect x="34" y="12" width="92" height="84" rx="8" fill="currentColor" />
    <circle cx="80" cy="62" r="26" fill={A} /><circle cx="80" cy="62" r="17" fill="#fff" opacity=".5" />
    <circle cx="50" cy="26" r="4" fill={A} /><rect x="64" y="22" width="48" height="8" rx="3" fill={A} />
  </>),
};

export function Art({ cat, shape, label, className = '' }) {
  const c = CATEGORIES.find((x) => x.id === cat);
  return (
    <div className={'art ' + className} style={{ '--tint': c?.tint, '--art1': c?.ink, '--art2': c?.accent }}>
      <svg viewBox="0 0 160 110" role="img" aria-label={label || c?.name} focusable="false">
        {SHAPES[shape || cat]}
      </svg>
    </div>
  );
}
