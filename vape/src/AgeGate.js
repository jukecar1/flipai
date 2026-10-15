import { useEffect, useRef, useState } from 'react';
import { LOGO_SVG } from './logoSvg';

// Every visitor confirms they are 21 or older each time they open the site. The answer is deliberately not stored, so the
// gate appears on every visit and every reload. Under-21 visitors see a closing message and nothing else.
export default function AgeGate() {
  const [ok, setOk] = useState(false);
  const [no, setNo] = useState(false);
  const yes = useRef(null);
  useEffect(() => {
    document.documentElement.classList.toggle('age-locked', !ok);
    if (!ok && yes.current) yes.current.focus();
    return () => document.documentElement.classList.remove('age-locked');
  }, [ok]);
  if (ok) return null;
  const confirm = () => setOk(true);
  // Keep keyboard focus inside the gate while it is open.
  const trap = (e) => {
    if (e.key !== 'Tab') return;
    const f = e.currentTarget.querySelectorAll('button, a[href]');
    if (!f.length) return;
    const first = f[0]; const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  return (
    <div className="agegate" role="dialog" aria-modal="true" aria-labelledby="age-h" onKeyDown={trap}>
      <div className="agegate-card">
        <span className="logo-art" dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
        {no ? (
          <>
            <h2 id="age-h">Sorry, you cannot enter</h2>
            <p>Royal Vape Mart sells age-restricted products. You must be 21 or older to use this site.</p>
          </>
        ) : (
          <>
            <p className="k">Adults only</p>
            <h2 id="age-h">Are you 21 or older?</h2>
            <p>Royal Vape Mart sells tobacco, nicotine and other age-restricted products. You must be 21 or older to enter, and a valid photo ID is checked for every purchase.</p>
            <div className="btn-row">
              <button ref={yes} type="button" className="btn btn-gold" onClick={confirm}>Yes, I am 21 or older</button>
              <button type="button" className="btn btn-outline" onClick={() => setNo(true)}>No, I am under 21</button>
            </div>
            <p className="small">WARNING: Products sold here may contain nicotine. Nicotine is an addictive chemical.</p>
          </>
        )}
      </div>
    </div>
  );
}
