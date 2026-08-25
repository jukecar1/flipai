import React, { useState } from 'react';
import { listSaves, loadFromSlot, deleteSlot } from '../game/storage';
import { useGameActions } from '../context/GameContext';
import { Button, Panel } from '../components/UI';
import Logomark from '../components/Logomark';

// A short, honest "what's new" note — real shipped changes, not filler.
// Update this line as the game changes; there's no changelog data store
// behind it, just a hand-written blurb like a patch-notes tile would show.
const WHATS_NEW = "Fight Night and Main Event now build their own numbered event series, matchups get a stat radar, and fighter profiles are full screens.";
const GAME_VERSION = 'v1.0';

export default function StartScreen() {
  const { loadCareer, goTo } = useGameActions();
  const [slots, setSlots] = useState(() => listSaves());

  const refresh = () => setSlots(listSaves());

  const handleLoad = slot => {
    const state = loadFromSlot(slot);
    if (state) loadCareer(slot, state);
  };

  const handleDelete = (e, slot) => {
    e.stopPropagation();
    deleteSlot(slot);
    refresh();
  };

  return (
    <div className="fe-start-screen">
      <div className="fe-start-brand-row">
        <Logomark size={72} className="fe-logomark-glow" />
        <div>
          <span className="fe-eyebrow">MMA Promotion Sim</span>
          <h1 className="fe-start-wordmark fe-wordmark-3d">FIGHT EMPIRE</h1>
        </div>
      </div>
      <p className="fe-tagline fe-start-tagline">Sign the roster. Book the cards. Outgrow the giants.</p>

      <div className="fe-start-grid">
        <Panel title="Your Promotions" className="fe-start-hero-panel">
          {slots.map((entry, slot) => (
            <div key={slot} className="fe-save-row" onClick={() => (entry ? handleLoad(slot) : goTo(`create-${slot}`))}>
              {entry ? (
                <>
                  <div className="fe-save-info">
                    <strong>{entry.meta.promotionName}</strong>
                    <span>{entry.meta.managerName} · Week {entry.meta.week} · ${entry.meta.funds.toLocaleString()} · {entry.meta.record.wins}-{entry.meta.record.losses}-{entry.meta.record.draws}</span>
                  </div>
                  <div className="fe-save-actions">
                    <Button variant="secondary" onClick={() => handleLoad(slot)}>Continue</Button>
                    <button className="fe-save-delete" onClick={e => handleDelete(e, slot)}>✕</button>
                  </div>
                </>
              ) : (
                <div className="fe-save-info fe-save-empty">
                  <strong>Empty Slot</strong>
                  <span>Start a new promotion</span>
                </div>
              )}
            </div>
          ))}
        </Panel>

        <div className="fe-start-side">
          <div className="fe-start-tile">
            <div className="fe-start-tile-head">
              <span className="fe-start-tile-icon" aria-hidden="true">🆕</span>
              <span className="fe-start-tile-title">What's New</span>
              <span className="fe-start-tile-version">{GAME_VERSION}</span>
            </div>
            <p className="fe-start-tile-desc">{WHATS_NEW}</p>
          </div>

          <div className="fe-start-tile">
            <div className="fe-start-tile-head">
              <span className="fe-start-tile-icon" aria-hidden="true">📋</span>
              <span className="fe-start-tile-title">How It Works</span>
            </div>
            <p className="fe-start-tile-desc">
              Sign fighters, book Single Fights, Fight Nights, or numbered Main Events, then watch every round play out live.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
