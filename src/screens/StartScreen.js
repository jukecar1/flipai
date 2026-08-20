import React, { useState } from 'react';
import { listSaves, loadFromSlot, deleteSlot } from '../game/storage';
import { useGameActions } from '../context/GameContext';
import { Button, Panel } from '../components/UI';

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
      <div className="fe-start-hero">
        <div className="fe-hero-logo">
          <span className="fe-hero-fe">FE</span>
        </div>
        <h1>FIGHT EMPIRE</h1>
        <p className="fe-tagline">Build the roster. Book the fights. Own the sport.</p>
      </div>

      <Panel title="Your Promotions" className="fe-start-panel">
        {slots.map((entry, slot) => (
          <div key={slot} className="fe-save-row" onClick={() => (entry ? handleLoad(slot) : goTo(`create-${slot}`))}>
            {entry ? (
              <>
                <div className="fe-save-info">
                  <strong>{entry.meta.promotionName}</strong>
                  <span>{entry.meta.managerName} · Week {entry.meta.week} · ${entry.meta.funds.toLocaleString()}</span>
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
    </div>
  );
}
