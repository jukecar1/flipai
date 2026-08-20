import React, { useState } from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext';
import { WEIGHT_CLASSES, GYM_LEVELS, rosterLimitForGym } from '../game/constants';
import { makeScoutCandidates } from '../game/generateFighter';
import { Panel, Button, WeightPill, Flag, Avatar, Followers } from '../components/UI';

const ARCHETYPE_LABELS = {
  striker: 'Striker',
  wrestler: 'Wrestler',
  allrounder: 'All-rounder',
};

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
  const [candidates, setCandidates] = useState([]);

  const rosterLimit = rosterLimitForGym(state.meta.gymLevel);
  const rosterFull = state.roster.length >= rosterLimit;
  const nextGym = GYM_LEVELS.find(g => g.level === state.meta.gymLevel + 1);

  const scout = () => setCandidates(makeScoutCandidates(scoutClass, 3));
  const signCandidate = fighter => {
    dispatch({ type: 'SIGN_SCOUTED_PROSPECT', fighter });
    setCandidates(prev => prev.filter(f => f.id !== fighter.id));
  };
  const upgradeGym = () => dispatch({ type: 'UPGRADE_GYM' });

  return (
    <div className="fe-roster">
      <Panel title={`ROSTER (${state.roster.length}/${rosterLimit})`}>
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

      <Panel title="YOUR GYM" className="fe-gym-panel">
        <p className="fe-hint">
          Level {state.meta.gymLevel} facility — active roster capped at {rosterLimit} fighters.
          {nextGym ? ' Upgrade to sign more.' : ' This is the top tier.'}
        </p>
        {nextGym && (
          <div className="fe-row-actions">
            <Button variant="advance" onClick={upgradeGym} disabled={state.funds < nextGym.upgradeCost}>
              Upgrade to Level {nextGym.level} (${nextGym.upgradeCost.toLocaleString()}) — {nextGym.rosterLimit} fighters
            </Button>
          </div>
        )}
      </Panel>

      <Panel title="SCOUT A NEW PROSPECT" className="fe-scout-panel">
        {rosterFull ? (
          <p className="fe-hint fe-hint-warn">Your roster is full ({rosterLimit}/{rosterLimit}). Upgrade your gym to sign more fighters.</p>
        ) : (
          <>
            <p className="fe-hint">Send scouts to a weight class and see who they find — signing a prospect costs $1,500. Looking for proven, ranked talent instead? Check Free Agency under Promotions.</p>
            <div className="fe-row-actions">
              <select value={scoutClass} onChange={e => { setScoutClass(e.target.value); setCandidates([]); }}>
                {WEIGHT_CLASSES.map(wc => (
                  <option key={wc.id} value={wc.id}>{wc.name}</option>
                ))}
              </select>
              <Button variant="advance" onClick={scout}>Scout</Button>
            </div>
            {candidates.length > 0 && (
              <div className="fe-opponent-list fe-scout-candidates">
                {candidates.map(f => (
                  <div key={f.id} className="fe-opponent-row fe-scout-candidate">
                    <Avatar fighter={f} size={26} />
                    <WeightPill id={f.weightClass} />
                    <Flag nationality={f.nationality} />
                    <span className="fe-boxer-name" title={f.name}>{f.name}</span>
                    <span className="fe-boxer-record">{ARCHETYPE_LABELS[f.archetype]} · Age {f.age}</span>
                    <Button
                      variant="secondary"
                      className="fe-scout-sign-btn"
                      onClick={() => signCandidate(f)}
                      disabled={state.funds < 1500 || state.roster.length >= rosterLimit}
                    >
                      Sign ($1,500)
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
