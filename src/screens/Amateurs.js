import React, { useState } from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext';
import { WEIGHT_CLASSES, AMATEUR_SIGN_COST, AMATEUR_PROMOTION_WINS, AMATEUR_POOL_LIMIT, rosterLimitForGym } from '../game/constants';
import { makeAmateurCandidates } from '../game/generateFighter';
import { Panel, Button, WeightPill, Flag, Avatar } from '../components/UI';

const ARCHETYPE_LABELS = {
  striker: 'Striker',
  wrestler: 'Wrestler',
  allrounder: 'All-rounder',
};

export default function Amateurs() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const [scoutClass, setScoutClass] = useState(WEIGHT_CLASSES[0].id);
  const [candidates, setCandidates] = useState([]);

  const amateurs = state.amateurs || [];
  const rosterLimit = rosterLimitForGym(state.meta.gymLevel);
  const rosterFull = state.roster.length >= rosterLimit;
  const poolFull = amateurs.length >= AMATEUR_POOL_LIMIT;

  const scout = () => setCandidates(makeAmateurCandidates(scoutClass, 3));
  const sign = fighter => {
    dispatch({ type: 'SIGN_AMATEUR', fighter });
    setCandidates(prev => prev.filter(f => f.id !== fighter.id));
  };
  const promote = fighterId => dispatch({ type: 'PROMOTE_AMATEUR', fighterId });

  return (
    <div className="fe-amateurs">
      <Panel title={`YOUR AMATEURS (${amateurs.length}/${AMATEUR_POOL_LIMIT})`}>
        {amateurs.length === 0 ? (
          <p className="fe-hint">
            No amateurs signed yet. They're cheap, unranked prospects who quietly build a record in amateur bouts each
            week — promote one to your pro roster once they've won {AMATEUR_PROMOTION_WINS}.
          </p>
        ) : (
          <div className="fe-opponent-list">
            {amateurs.map(a => {
              const winsNeeded = AMATEUR_PROMOTION_WINS - a.amateurRecord.wins;
              const eligible = winsNeeded <= 0;
              return (
                <div key={a.id} className="fe-opponent-row">
                  <Avatar fighter={a} size={26} />
                  <WeightPill id={a.weightClass} />
                  <Flag nationality={a.nationality} />
                  <span className="fe-boxer-name" title={a.name}>{a.name}</span>
                  <span className="fe-boxer-record">Amateur record {a.amateurRecord.wins}-{a.amateurRecord.losses}</span>
                  <Button
                    variant="secondary"
                    className="fe-scout-sign-btn"
                    onClick={() => promote(a.id)}
                    disabled={!eligible || rosterFull}
                    title={rosterFull && eligible ? 'Your pro roster is full' : undefined}
                  >
                    {eligible ? 'Promote to Pro' : `Needs ${winsNeeded} more win${winsNeeded === 1 ? '' : 's'}`}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="SCOUT AMATEURS" className="fe-scout-panel">
        {poolFull ? (
          <p className="fe-hint fe-hint-warn">Your amateur roster is full ({AMATEUR_POOL_LIMIT}/{AMATEUR_POOL_LIMIT}). Promote or wait for one to graduate before signing more.</p>
        ) : (
          <>
            <p className="fe-hint">Cheap, unproven talent — signing costs just ${AMATEUR_SIGN_COST.toLocaleString()}. Stats are rough and every record starts at 0-0.</p>
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
                      onClick={() => sign(f)}
                      disabled={state.funds < AMATEUR_SIGN_COST}
                    >
                      Sign (${AMATEUR_SIGN_COST.toLocaleString()})
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
