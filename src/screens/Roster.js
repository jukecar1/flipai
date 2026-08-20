import React, { useState } from 'react';
import { useGameState, useGameDispatch, useGameActions } from '../context/GameContext';
import { WEIGHT_CLASSES, rosterLimitForGym, CONTRACT_WARNING_WEEKS, WEIGHT_MOVE_COST, careerStage } from '../game/constants';
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
  const { goTo } = useGameActions();
  const [scoutClass, setScoutClass] = useState(WEIGHT_CLASSES[0].id);
  const [candidates, setCandidates] = useState([]);

  const rosterLimit = rosterLimitForGym(state.meta.gymLevel);
  const rosterFull = state.roster.length >= rosterLimit;
  const alreadyBooked = new Set(state.scheduledFights.map(f => f.fighterId));

  const scout = () => setCandidates(makeScoutCandidates(scoutClass, 3));
  const signCandidate = fighter => {
    dispatch({ type: 'SIGN_SCOUTED_PROSPECT', fighter });
    setCandidates(prev => prev.filter(f => f.id !== fighter.id));
  };
  const retire = fighter => {
    if (window.confirm(`Retire ${fighter.name}? This can't be undone.`)) {
      dispatch({ type: 'RETIRE_FIGHTER', fighterId: fighter.id });
    }
  };
  const renew = fighter => dispatch({ type: 'RENEW_CONTRACT', fighterId: fighter.id });
  const moveWeight = (fighter, direction) => dispatch({ type: 'MOVE_WEIGHT_CLASS', fighterId: fighter.id, direction });

  return (
    <div className="fe-roster">
      <Panel
        title={`ROSTER (${state.roster.length}/${rosterLimit})`}
        right={<button className="fe-link" onClick={() => goTo('gyms')}>Gym</button>}
      >
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
            <span>Contract</span>
            <span>Purse</span>
            <span></span>
          </div>
          {state.roster.map(f => {
            const status = statusInfo(f);
            const wcIdx = WEIGHT_CLASSES.findIndex(w => w.id === f.weightClass);
            const canMoveUp = wcIdx > 0 && !alreadyBooked.has(f.id) && f.injuryWeeks === 0;
            const canMoveDown = wcIdx < WEIGHT_CLASSES.length - 1 && !alreadyBooked.has(f.id) && f.injuryWeeks === 0;
            const contractLeft = f.contractWeeksLeft ?? '—';
            const contractWarn = typeof contractLeft === 'number' && contractLeft <= CONTRACT_WARNING_WEEKS;
            return (
              <div key={f.id} className="fe-roster-row">
                <span className="fe-roster-name">
                  <Avatar fighter={f} size={24} /> <WeightPill id={f.weightClass} /> <Flag nationality={f.nationality} />
                  <span className="fe-boxer-name-text" title={f.name}>{f.name}</span>
                  {f.title && <span className="fe-belt-badge" title={`${f.title} Champion`}>🏆</span>}
                </span>
                <span className={`fe-age fe-age-${careerStage(f.age).id}`} title={`${careerStage(f.age).label} — OVR already reflects this`}>
                  {f.age}
                </span>
                <span>{f.record.wins}-{f.record.losses}-{f.record.draws} ({f.record.kos}KO/{f.record.subs}SUB)</span>
                <span>{f.stats.striking}</span>
                <span>{f.stats.wrestling}</span>
                <span>{f.stats.submission}</span>
                <span>{f.stats.chin}</span>
                <span>{f.stats.cardio}</span>
                <span className="fe-ovr">{f.overall}</span>
                <span className={`fe-status fe-status-${status.cls}`}>{status.text}</span>
                <Followers count={f.followers} />
                <button
                  className={`fe-contract-badge ${contractWarn ? 'warn' : ''}`}
                  onClick={() => renew(f)}
                  title={`Renew ${f.name}'s contract for $${Math.round(f.purseFloor * 1.5).toLocaleString()}`}
                >
                  {contractLeft}w
                </button>
                <span>${f.purseFloor.toLocaleString()}</span>
                <span className="fe-roster-actions">
                  <button className="fe-move-btn" disabled={!canMoveUp} onClick={() => moveWeight(f, 'heavier')} title={`Move up a weight class ($${WEIGHT_MOVE_COST.toLocaleString()})`}>▲</button>
                  <button className="fe-move-btn" disabled={!canMoveDown} onClick={() => moveWeight(f, 'lighter')} title={`Move down a weight class ($${WEIGHT_MOVE_COST.toLocaleString()})`}>▼</button>
                  <button className="fe-retire-btn" onClick={() => retire(f)} title={`Retire ${f.name}`}>Retire</button>
                </span>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="SCOUT A NEW PROSPECT" className="fe-scout-panel">
        {rosterFull ? (
          <p className="fe-hint fe-hint-warn">
            Your roster is full ({rosterLimit}/{rosterLimit}). <button className="fe-link" onClick={() => goTo('gyms')}>Upgrade your gym</button> to sign more fighters.
          </p>
        ) : (
          <>
            <p className="fe-hint">Send scouts to a weight class and see who they find — signing a prospect costs $1,500. Looking for proven, ranked talent instead? Check Free Agency under Promotions, or grow your own through Amateurs.</p>
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
