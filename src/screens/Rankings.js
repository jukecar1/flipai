import React, { useMemo, useState } from 'react';
import { useGameState } from '../context/GameContext';
import { WEIGHT_CLASSES, RIVAL_PROMOTIONS } from '../game/constants';
import { Panel, WeightPill, Flag, Avatar, Followers } from '../components/UI';

export default function Rankings() {
  const state = useGameState();
  const [wcId, setWcId] = useState(WEIGHT_CLASSES[0].id);
  const wc = WEIGHT_CLASSES.find(w => w.id === wcId);

  const list = useMemo(() => {
    const own = state.roster.filter(f => f.weightClass === wcId).map(f => ({ ...f, mine: true }));
    const others = (state.worldPool[wcId] || []).map(f => ({ ...f, mine: false }));
    return [...own, ...others]
      .sort((a, b) => (b.overall * 10 + b.record.wins * 2 + (b.champion || b.title ? 50 : 0)) - (a.overall * 10 + a.record.wins * 2 + (a.champion || a.title ? 50 : 0)))
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
          {list.map((f, i) => {
            const promo = f.promotionId ? RIVAL_PROMOTIONS.find(p => p.id === f.promotionId) : null;
            return (
              <div key={f.id} className={`fe-ranking-row ${f.mine ? 'mine' : ''}`}>
                <span className="fe-rank-num">{f.champion ? '👑' : f.title ? '🏆' : i + 1}</span>
                <Avatar fighter={f} size={28} champion={f.champion || !!f.title} />
                <Flag nationality={f.nationality} />
                <span className="fe-boxer-name" title={f.name}>{f.name}{f.mine && <span className="fe-mine-badge">YOU</span>}</span>
                <span className="fe-boxer-record">{f.record.wins}-{f.record.losses}-{f.record.draws} ({f.record.kos}KO/{f.record.subs}SUB)</span>
                {promo && <span className="fe-champ-promo" style={{ color: promo.color }}>{promo.name}</span>}
                <Followers count={f.followers} />
                <span className="fe-boxer-overall">OVR {f.overall}</span>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
