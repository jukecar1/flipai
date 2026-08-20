import React from 'react';
import { useGameState, useGameDispatch, useGameActions } from '../context/GameContext';
import { WEIGHT_CLASS_MAP } from '../game/constants';
import { Panel, Button, WeightPill, Flag } from '../components/UI';

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
            {roster.map(b => (
              <div key={b.id} className="fe-boxer-row">
                <WeightPill id={b.weightClass} />
                <Flag nationality={b.nationality} />
                <span className="fe-boxer-name">{b.name}</span>
                <span className="fe-boxer-record">{b.record.wins}-{b.record.losses}-{b.record.draws} ({b.record.kos})</span>
                <span className="fe-boxer-overall">OVR {b.overall}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="UPCOMING FIGHTS">
          {scheduledFights.length === 0 && <div className="fe-empty">No fights booked. Head to Make Fights.</div>}
          <div className="fe-fight-list">
            {scheduledFights.map(f => {
              const boxer = roster.find(b => b.id === f.boxerId);
              return (
                <div key={f.id} className="fe-fight-row">
                  <WeightPill id={boxer?.weightClass} />
                  <span className="fe-fight-title">{boxer?.name} v {f.opponentName || 'TBD'}</span>
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

export { WEIGHT_CLASS_MAP };
