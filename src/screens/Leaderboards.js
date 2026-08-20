import React, { useState } from 'react';
import { useGameState } from '../context/GameContext';
import { RIVAL_PROMOTIONS } from '../game/constants';
import { Panel, WeightPill, Flag, Avatar, Followers } from '../components/UI';

const CATEGORIES = [
  { id: 'wins', label: 'Most Wins', value: f => f.record.wins, format: f => `${f.record.wins}W` },
  { id: 'followers', label: 'Most Followers', value: f => f.followers || 0, format: null },
  { id: 'finishes', label: 'Most Finishes', value: f => f.record.kos + f.record.subs, format: f => `${f.record.kos + f.record.subs} finishes` },
];

export default function Leaderboards() {
  const state = useGameState();
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const category = CATEGORIES.find(c => c.id === categoryId);

  const allFighters = [
    ...state.roster.map(f => ({ ...f, ownerLabel: 'Your roster', mine: true })),
    ...Object.values(state.worldPool).flat().map(f => ({
      ...f,
      ownerLabel: f.promotionId ? RIVAL_PROMOTIONS.find(p => p.id === f.promotionId)?.name : 'Free Agent',
      mine: false,
    })),
  ];

  const ranked = [...allFighters].sort((a, b) => category.value(b) - category.value(a)).slice(0, 15);

  return (
    <div className="fe-leaderboards">
      <Panel title="GLOBAL LEADERBOARDS">
        <div className="fe-wc-tabs fe-lb-tabs">
          {CATEGORIES.map(c => (
            <button key={c.id} className={`fe-wc-tab ${categoryId === c.id ? 'active' : ''}`} onClick={() => setCategoryId(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="fe-rankings-list">
          {ranked.map((f, i) => (
            <div key={f.id} className={`fe-ranking-row ${f.mine ? 'mine' : ''}`}>
              <span className="fe-rank-num">{i + 1}</span>
              <Avatar fighter={f} size={28} champion={f.champion || !!f.title} />
              <WeightPill id={f.weightClass} />
              <Flag nationality={f.nationality} />
              <span className="fe-boxer-name" title={f.name}>{f.name}{f.mine && <span className="fe-mine-badge">YOU</span>}</span>
              <span className="fe-hint">{f.ownerLabel}</span>
              {category.id === 'followers' ? <Followers count={f.followers} /> : <span className="fe-boxer-overall">{category.format(f)}</span>}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
