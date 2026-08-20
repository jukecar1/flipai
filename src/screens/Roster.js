import React, { useState } from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext';
import { WEIGHT_CLASSES } from '../game/constants';
import { Panel, Button, WeightPill, Flag, Avatar, Followers } from '../components/UI';

function statusInfo(f) {
  if (f.injuryWeeks > 0) return { text: `Injured · ${f.injuryWeeks}w`, cls: 'injured' };
  if (f.fatigue >= 50) return { text: 'Exhausted', cls: 'exhausted' };
  if (f.fatigue >= 20) return { text: 'Tired', cls: 'tired' };
  return { text: 'Fresh', cls: 'fresh' };
}

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
            <span>Fighter</span>
            <span>Age</span>
            <span>Record</span>
            <span>STR</span>
            <span>WR</span>
            <span>SUB</span>
            <span>CHIN</span>
            <span>CAR</span>
            <span>OVR</span>
            <span>Status</span>
            <span>Followers</span>
            <span>Purse</span>
          </div>
          {state.roster.map(f => {
            const status = statusInfo(f);
            return (
              <div key={f.id} className="fe-roster-row">
                <span className="fe-roster-name">
                  <Avatar fighter={f} size={24} /> <WeightPill id={f.weightClass} /> <Flag nationality={f.nationality} />
                  <span className="fe-boxer-name-text" title={f.name}>{f.name}</span>
                  {f.title && <span className="fe-belt-badge" title={`${f.title} Champion`}>🏆</span>}
                </span>
                <span>{f.age}</span>
                <span>{f.record.wins}-{f.record.losses}-{f.record.draws} ({f.record.kos}KO/{f.record.subs}SUB)</span>
                <span>{f.stats.striking}</span>
                <span>{f.stats.wrestling}</span>
                <span>{f.stats.submission}</span>
                <span>{f.stats.chin}</span>
                <span>{f.stats.cardio}</span>
                <span className="fe-ovr">{f.overall}</span>
                <span className={`fe-status fe-status-${status.cls}`}>{status.text}</span>
                <Followers count={f.followers} />
                <span>${f.purseFloor.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="SCOUT A NEW PROSPECT" className="fe-scout-panel">
        <p className="fe-hint">Sign a new prospect for $1,500. Their stats and potential are unknown until they debut. Looking for proven, ranked talent instead? Check Free Agency under Promotions.</p>
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
