import React, { useState } from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext';
import { GYM_LEVELS, rosterLimitForGym, STAT_KEYS, STAT_LABELS, MAX_STAT, trainingCost } from '../game/constants';
import { Panel, Button } from '../components/UI';

export default function Gyms() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const rosterLimit = rosterLimitForGym(state.meta.gymLevel);
  const nextGym = GYM_LEVELS.find(g => g.level === state.meta.gymLevel + 1);
  const [fighterId, setFighterId] = useState(state.roster[0]?.id || '');
  const fighter = state.roster.find(f => f.id === fighterId) || state.roster[0];

  const upgrade = () => dispatch({ type: 'UPGRADE_GYM' });
  const train = stat => dispatch({ type: 'TRAIN_STAT', fighterId: fighter.id, stat });

  return (
    <div className="fe-gyms">
      <Panel title={`${state.meta.promotionName} GYM`}>
        <p className="fe-hint">
          Head Coach <strong>{state.meta.coachName}</strong> specializes in {STAT_LABELS[state.meta.coachSpecialty]} and runs
          the day-to-day training. Your facility caps how many fighters can be on the active roster at once — you're at
          {' '}{state.roster.length}/{rosterLimit} right now.
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

      <Panel title="TRAIN A FIGHTER">
        {state.roster.length === 0 ? (
          <div className="fe-empty">No fighters signed yet.</div>
        ) : (
          <>
            <select value={fighter?.id || ''} onChange={e => setFighterId(e.target.value)} className="fe-full-select">
              {state.roster.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.weightClass}) — {(f.xp || 0).toLocaleString()} XP</option>
              ))}
            </select>
            {fighter && (
              <div className="fe-training-grid">
                {STAT_KEYS.map(stat => {
                  const value = fighter.stats[stat];
                  const maxed = value >= MAX_STAT;
                  const isSpecialty = state.meta.coachSpecialty === stat;
                  const cost = trainingCost(value, isSpecialty);
                  const canAfford = (fighter.xp || 0) >= cost;
                  return (
                    <div key={stat} className="fe-training-row">
                      <span className="fe-training-label">
                        {STAT_LABELS[stat]} {isSpecialty && <span className="fe-coach-badge" title="Your coach's specialty — discounted training">Coach's specialty</span>}
                      </span>
                      <span className="fe-training-value">{value}/{MAX_STAT}</span>
                      <Button
                        variant="secondary"
                        className="fe-scout-sign-btn"
                        onClick={() => train(stat)}
                        disabled={maxed || !canAfford}
                      >
                        {maxed ? 'Maxed' : `Train (+1) — ${cost.toLocaleString()} XP`}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
