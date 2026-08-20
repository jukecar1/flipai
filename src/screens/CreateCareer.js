import React, { useState } from 'react';
import { useGameActions } from '../context/GameContext';
import { CITIES } from '../game/namePool';
import { Button, Panel } from '../components/UI';

export default function CreateCareer({ slot }) {
  const { startNewCareer, goTo } = useGameActions();
  const [managerName, setManagerName] = useState('');
  const [promotionName, setPromotionName] = useState('');
  const [hq, setHq] = useState(CITIES[0].city);

  const canStart = managerName.trim().length > 0;

  const handleStart = () => {
    if (!canStart) return;
    startNewCareer(slot, {
      managerName: managerName.trim(),
      promotionName: (promotionName.trim() || `${managerName.trim()} MMA`),
      hq,
    });
  };

  return (
    <div className="fe-start-screen">
      <Panel title="New Promotion" className="fe-create-panel">
        <label className="fe-field">
          <span>Manager name</span>
          <input value={managerName} onChange={e => setManagerName(e.target.value)} placeholder="e.g. Jordan Reyes" maxLength={30} />
        </label>
        <label className="fe-field">
          <span>Promotion name</span>
          <input value={promotionName} onChange={e => setPromotionName(e.target.value)} placeholder="e.g. Reyes Fighting Championship" maxLength={40} />
        </label>
        <label className="fe-field">
          <span>Headquarters city</span>
          <select value={hq} onChange={e => setHq(e.target.value)}>
            {CITIES.map(c => (
              <option key={c.city} value={c.city}>{c.city}, {c.country}</option>
            ))}
          </select>
        </label>
        <p className="fe-hint">You'll start with $25,000 and three signed prospects across different weight classes.</p>
        <div className="fe-row-actions">
          <Button variant="secondary" onClick={() => goTo('start')}>Back</Button>
          <Button variant="advance" onClick={handleStart} disabled={!canStart}>Start Career</Button>
        </div>
      </Panel>
    </div>
  );
}
