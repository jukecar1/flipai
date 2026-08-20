import React, { useMemo, useState } from 'react';
import { useGameState } from '../context/GameContext';
import { WEIGHT_CLASSES } from '../game/constants';
import { Panel, WeightPill, Flag } from '../components/UI';

export default function Rankings() {
  const state = useGameState();
  const [wcId, setWcId] = useState(WEIGHT_CLASSES[0].id);
  const wc = WEIGHT_CLASSES.find(w => w.id === wcId);

  const list = useMemo(() => {
    const own = state.roster.filter(b => b.weightClass === wcId).map(b => ({ ...b, mine: true }));
    const others = (state.worldPool[wcId] || []).map(b => ({ ...b, mine: false }));
    return [...own, ...others]
      .sort((a, b) => (b.overall * 10 + b.record.wins * 2) - (a.overall * 10 + a.record.wins * 2))
      .slice(0, 10);
  }, [state.roster, state.worldPool, wcId]);

  return (
    <div className="fe-rankings">
      <Panel title="RANKINGS">
        <div className="fe-wc-tabs">
          {WEIGHT_CLASSES.map(w => (
            <button key={w.id} className={`fe-wc-tab ${wcId === w.id ? 'active' : ''}`} onClick={() => setWcId(w.id)}>
              <WeightPill id={w.id} />
            </button>
          ))}
        </div>
        <h3 className="fe-rankings-title">Global {wc.name} Rankings</h3>
        <div className="fe-rankings-list">
          {list.map((b, i) => (
            <div key={b.id} className={`fe-ranking-row ${b.mine ? 'mine' : ''}`}>
              <span className="fe-rank-num">{i + 1}</span>
              <Flag nationality={b.nationality} />
              <span className="fe-boxer-name">{b.name}{b.mine && <span className="fe-mine-badge">YOU</span>}</span>
              <span className="fe-boxer-record">{b.record.wins}-{b.record.losses}-{b.record.draws} ({b.record.kos})</span>
              <span className="fe-boxer-overall">OVR {b.overall}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
