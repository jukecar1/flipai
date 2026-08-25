import React from 'react';
import Logomark from '../components/Logomark';

// A brief branded splash shown once, right when the app first opens —
// before there's any save data to show, so the player sees something
// deliberate instead of a blank flash while things settle. Purely a
// timed gate in App.js; there's no real async load behind it.
export default function LoadingScreen() {
  return (
    <div className="fe-loading-screen">
      <Logomark size={72} className="fe-logomark-glow fe-loading-fe" />
      <h1 className="fe-loading-title fe-wordmark-3d">FIGHT EMPIRE</h1>
      <div className="fe-loading-bar"><span className="fe-loading-bar-fill" /></div>
      <p className="fe-loading-text">Setting up the cage…</p>
    </div>
  );
}
