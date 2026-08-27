import React, { useMemo, useState } from 'react';
import { useGameState } from '../context/GameContext';
import { WEIGHT_CLASSES, RIVAL_PROMOTIONS } from '../game/constants';
import { divisionRankings } from '../game/gameReducer';
import { Panel, WeightPill, Flag, Avatar, Followers, FighterNameButton } from '../components/UI';

export default function Rankings() {
  const state = useGameState();
  const [wcId, setWcId] = useState(WEIGHT_CLASSES[0].id);
  const wc = WEIGHT_CLASSES.find(w => w.id === wcId);

  // Same formula the reducer uses to decide who counts as a live title
  // contender — this screen mattering to booking is the whole point.
  const list = useMemo(() => divisionRankings(state, wcId), [state, wcId]);

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
                <FighterNameButton fighter={f} className="fe-boxer-name">{f.name}{f.mine && <span className="fe-mine-badge">YOU</span>}</FighterNameButton>
                <span className="fe-boxer-record">{f.record.wins}-{f.record.losses}-{f.record.draws} ({f.record.kos}KO/{f.record.subs}SUB)</span>
                {promo && <span className="fe-champ-promo" style={{ color: promo.color }} title={promo.name}>{promo.name}</span>}
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
