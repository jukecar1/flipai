import React, { useState } from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext';
import { WEIGHT_CLASSES } from '../game/constants';
import { Panel, Button, WeightPill, Flag } from '../components/UI';

export default function Roster() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const [scoutClass, setScoutClass] = useState(WEIGHT_CLASSES[0].id);

  const scout = () => dispatch({ type: 'SCOUT_PROSPECT', weightClassId: scoutClass });

  return (
    <div className="fe-roster">
      <Panel title={`ROSTER (${state.roster.length})`}>
        <div className="fe-roster-table">
          <div className="fe-roster-head">
            <span>Boxer</span>
            <span>Age</span>
            <span>Record</span>
            <span>PWR</span>
            <span>SPD</span>
            <span>CHIN</span>
            <span>STA</span>
            <span>DEF</span>
            <span>OVR</span>
            <span>Purse</span>
          </div>
          {state.roster.map(b => (
            <div key={b.id} className="fe-roster-row">
              <span className="fe-roster-name"><WeightPill id={b.weightClass} /> <Flag nationality={b.nationality} /> {b.name}</span>
              <span>{b.age}</span>
              <span>{b.record.wins}-{b.record.losses}-{b.record.draws} ({b.record.kos})</span>
              <span>{b.stats.power}</span>
              <span>{b.stats.speed}</span>
              <span>{b.stats.chin}</span>
              <span>{b.stats.stamina}</span>
              <span>{b.stats.defense}</span>
              <span className="fe-ovr">{b.overall}</span>
              <span>${b.purseFloor.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="SCOUT A NEW PROSPECT" className="fe-scout-panel">
        <p className="fe-hint">Sign a new prospect for $1,500. Their stats and potential are unknown until they debut.</p>
        <div className="fe-row-actions">
          <select value={scoutClass} onChange={e => setScoutClass(e.target.value)}>
            {WEIGHT_CLASSES.map(wc => (
              <option key={wc.id} value={wc.id}>{wc.name}</option>
            ))}
          </select>
          <Button variant="advance" onClick={scout} disabled={state.funds < 1500}>Scout ($1,500)</Button>
        </div>
      </Panel>
    </div>
  );
}
