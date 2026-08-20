import React from 'react';
import { useGameState } from '../context/GameContext';
import { Panel, WeightPill, Flag, Avatar, Followers } from '../components/UI';

export default function HallOfFame() {
  const state = useGameState();
  const inductees = state.hallOfFame || [];

  return (
    <div className="fe-hof">
      <Panel title={`HALL OF FAME (${inductees.length})`}>
        {inductees.length === 0 && (
          <div className="fe-empty">No legends yet — a great career (20+ wins, elite skill, or a title reign) earns a plaque when a fighter retires.</div>
        )}
        <div className="fe-free-agent-list">
          {inductees.map(f => (
            <div key={f.id} className="fe-free-agent-row">
              <Avatar fighter={f} size={30} champion={!!f.finalTitle} />
              <WeightPill id={f.weightClass} />
              <Flag nationality={f.nationality} />
              <div className="fe-boxer-name">
                <span className="fe-boxer-name-text" title={f.name}>{f.name}</span>
                <span className="fe-boxer-record">
                  {f.record.wins}-{f.record.losses}-{f.record.draws} · Retired week {f.retiredWeek}
                  {f.finalTitle ? ` · Former ${f.finalTitle} Champion` : ''}
                </span>
              </div>
              <Followers count={f.followers} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
