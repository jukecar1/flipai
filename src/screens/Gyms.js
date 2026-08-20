import React from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext';
import { GYM_LEVELS, rosterLimitForGym } from '../game/constants';
import { Panel, Button } from '../components/UI';

export default function Gyms() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const rosterLimit = rosterLimitForGym(state.meta.gymLevel);
  const nextGym = GYM_LEVELS.find(g => g.level === state.meta.gymLevel + 1);

  const upgrade = () => dispatch({ type: 'UPGRADE_GYM' });

  return (
    <div className="fe-gyms">
      <Panel title={`${state.meta.promotionName} GYM`}>
        <p className="fe-hint">
          Head Coach <strong>{state.meta.coachName}</strong> runs the day-to-day training. Your facility caps how many
          fighters can be on the active roster at once — you're at {state.roster.length}/{rosterLimit} right now.
        </p>
        <div className="fe-gym-ladder">
          {GYM_LEVELS.map(g => {
            const status = g.level < state.meta.gymLevel ? 'done' : g.level === state.meta.gymLevel ? 'current' : 'locked';
            return (
              <div key={g.level} className={`fe-gym-tier fe-gym-tier-${status}`}>
                <span className="fe-gym-tier-level">Level {g.level}</span>
                <span className="fe-gym-tier-limit">{g.rosterLimit} fighters</span>
                <span className="fe-gym-tier-cost">{g.level === 1 ? 'Starting facility' : `$${g.upgradeCost.toLocaleString()}`}</span>
              </div>
            );
          })}
        </div>
        {nextGym ? (
          <div className="fe-row-actions">
            <Button variant="advance" onClick={upgrade} disabled={state.funds < nextGym.upgradeCost}>
              Upgrade to Level {nextGym.level} (${nextGym.upgradeCost.toLocaleString()}) — {nextGym.rosterLimit} fighters
            </Button>
          </div>
        ) : (
          <p className="fe-hint fe-hint-title">Your gym is fully upgraded — the top facility in the sport.</p>
        )}
      </Panel>
    </div>
  );
}
