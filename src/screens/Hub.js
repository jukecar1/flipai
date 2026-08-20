import React from 'react';
import { useGameState, useGameDispatch, useGameActions } from '../context/GameContext';
import { Panel, Button, WeightPill, Flag, Avatar } from '../components/UI';

export default function Hub() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const { goTo } = useGameActions();
  const { roster, scheduledFights, news } = state;

  const readyFight = fightId => dispatch({ type: 'PREPARE_FIGHT_SIM', fightId });

  return (
    <div className="fe-hub">
      <div className="fe-hub-col fe-hub-main">
        <Panel title={`MY ROSTER (${roster.length})`} right={<button className="fe-link" onClick={() => goTo('roster')}>View all</button>}>
          <div className="fe-boxer-list">
            {roster.map(f => (
              <div key={f.id} className="fe-boxer-row">
                <Avatar fighter={f} size={28} />
                <WeightPill id={f.weightClass} />
                <Flag nationality={f.nationality} />
                <span className="fe-boxer-name">{f.name}{f.title && <span className="fe-belt-badge" title={`${f.title} Champion`}>🏆</span>}</span>
                <span className="fe-boxer-record">{f.record.wins}-{f.record.losses}-{f.record.draws} ({f.record.kos}KO, {f.record.subs}SUB)</span>
                {f.injuryWeeks > 0 && <span className="fe-status fe-status-injured">Injured · {f.injuryWeeks}w</span>}
                <span className="fe-boxer-overall">OVR {f.overall}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="UPCOMING FIGHTS">
          {scheduledFights.length === 0 && <div className="fe-empty">No fights booked. Head to Make Fights.</div>}
          <div className="fe-fight-list">
            {scheduledFights.map(f => {
              const fighter = roster.find(x => x.id === f.fighterId);
              return (
                <div key={f.id} className="fe-fight-row">
                  <WeightPill id={fighter?.weightClass} />
                  <span className="fe-fight-title">{fighter?.name} v {f.opponentName || 'TBD'}</span>
                  <span className="fe-fight-venue">{f.venue.name}, {f.venue.city}</span>
                  {f.weeksOut > 0 ? (
                    <span className="fe-weeks-out">{f.weeksOut}w</span>
                  ) : (
                    <Button variant="advance" className="fe-fight-btn" onClick={() => readyFight(f.id)}>FIGHT</Button>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="fe-hub-col fe-hub-side">
        <Panel title="NEWS">
          <div className="fe-news-list">
            {news.slice(0, 6).map(n => (
              <div key={n.id} className="fe-news-item">
                <span className="fe-news-week">W{n.week}</span>
                {n.title}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
