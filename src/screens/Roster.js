import React, { useState } from 'react';
import { useGameState, useGameDispatch, useGameActions } from '../context/GameContext';
import { useFighterProfile } from '../context/FighterProfileContext';
import { WEIGHT_CLASSES, rosterLimitForGym, CONTRACT_WARNING_FIGHTS, WEIGHT_MOVE_COST, primeStatus, loyaltyStatus, LOYALTY_BASELINE } from '../game/constants';
import { makeScoutCandidates } from '../game/generateFighter';
import { Panel, Button, WeightPill, Flag, Avatar, Followers, FighterNameButton, StreakBadge } from '../components/UI';

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

// Same idea as MakeFights' OPPONENT_SORTS — a plain map so the <select>
// options and the actual comparator can't drift out of sync. `cmp: null`
// (the default) just means "whatever order the roster array is already in."
const ROSTER_SORTS = {
  default: { label: 'Roster Order', cmp: null },
  ovr_desc: { label: 'Highest OVR', cmp: (a, b) => b.overall - a.overall },
  age_asc: { label: 'Youngest', cmp: (a, b) => a.age - b.age },
  age_desc: { label: 'Oldest', cmp: (a, b) => b.age - a.age },
  followers_desc: { label: 'Most Followers', cmp: (a, b) => (b.followers || 0) - (a.followers || 0) },
  contract_asc: { label: 'Contract Ending Soonest', cmp: (a, b) => (a.contractFightsLeft ?? 99) - (b.contractFightsLeft ?? 99) },
  name_asc: { label: 'Name (A-Z)', cmp: (a, b) => a.name.localeCompare(b.name) },
};

export default function Roster() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const { goTo } = useGameActions();
  const { open: openProfile } = useFighterProfile();
  const [scoutClass, setScoutClass] = useState(WEIGHT_CLASSES[0].id);
  const [candidates, setCandidates] = useState([]);
  const [query, setQuery] = useState('');
  const [wcFilter, setWcFilter] = useState('all');
  const [sortKey, setSortKey] = useState('default');

  const rosterLimit = rosterLimitForGym(state.meta.gymLevel);
  const rosterFull = state.roster.length >= rosterLimit;
  const alreadyBooked = new Set(state.scheduledFights.map(f => f.fighterId));

  const q = query.trim().toLowerCase();
  const filteredRoster = state.roster.filter(f => (wcFilter === 'all' || f.weightClass === wcFilter) && (!q || f.name.toLowerCase().includes(q)));
  const sortCmp = ROSTER_SORTS[sortKey].cmp;
  const visibleRoster = sortCmp ? [...filteredRoster].sort(sortCmp) : filteredRoster;

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
  const moveWeight = (fighter, direction) => dispatch({ type: 'MOVE_WEIGHT_CLASS', fighterId: fighter.id, direction });

  return (
    <div className="fe-roster">
      <Panel
        title={`ROSTER (${state.roster.length}/${rosterLimit})`}
        right={<button className="fe-link" onClick={() => goTo('gyms')}>Gym</button>}
      >
        {state.roster.length > 0 && (
          <div className="fe-filter-bar">
            <input
              type="text"
              className="fe-filter-search"
              placeholder="Search your roster…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <select className="fe-filter-select" value={wcFilter} onChange={e => setWcFilter(e.target.value)}>
              <option value="all">All Weight Classes</option>
              {WEIGHT_CLASSES.map(wc => (
                <option key={wc.id} value={wc.id}>{wc.name}</option>
              ))}
            </select>
            <select className="fe-filter-select" value={sortKey} onChange={e => setSortKey(e.target.value)}>
              {Object.entries(ROSTER_SORTS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        )}
        {visibleRoster.length === 0 && (
          <div className="fe-empty">No fighters match your search or filter.</div>
        )}
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
          {visibleRoster.map(f => {
            const status = statusInfo(f);
            const wcIdx = WEIGHT_CLASSES.findIndex(w => w.id === f.weightClass);
            const canMoveUp = wcIdx > 0 && !alreadyBooked.has(f.id) && f.injuryWeeks === 0;
            const canMoveDown = wcIdx < WEIGHT_CLASSES.length - 1 && !alreadyBooked.has(f.id) && f.injuryWeeks === 0;
            const contractLeft = f.contractFightsLeft ?? '—';
            const contractWarn = typeof contractLeft === 'number' && contractLeft <= CONTRACT_WARNING_FIGHTS;
            const loyaltyTier = loyaltyStatus(f.loyalty ?? LOYALTY_BASELINE);
            const loyaltyRisk = loyaltyTier.id === 'resentful' ? 'high' : loyaltyTier.id === 'frustrated' ? 'low' : null;
            let contractTitle;
            if (contractWarn && loyaltyRisk === 'high') {
              contractTitle = `${f.name} walks after this fight — and they're unhappy with your booking, so there's a real chance they refuse to re-sign at all.`;
            } else if (contractWarn) {
              contractTitle = `${f.name} walks after this fight unless you re-sign — open their profile to renew`;
            } else if (loyaltyRisk === 'high') {
              contractTitle = `${f.name} is unhappy with your booking — real risk they refuse to re-sign when their deal is up.`;
            } else if (loyaltyRisk === 'low') {
              contractTitle = `${f.name} isn't thrilled with recent booking — re-signing will cost more than usual.`;
            } else {
              contractTitle = `${contractLeft} fight${contractLeft === 1 ? '' : 's'} left on ${f.name}'s deal`;
            }
            return (
              <div key={f.id} className="fe-roster-row">
                <FighterNameButton fighter={f} className="fe-roster-name">
                  <Avatar fighter={f} size={24} /> <WeightPill id={f.weightClass} /> <Flag nationality={f.nationality} />
                  <span className="fe-boxer-name-text" title={f.name}>{f.name}</span>
                  {f.title && <span className="fe-belt-badge" title={`${f.title} Champion`}>🏆</span>}
                </FighterNameButton>
                <span className={`fe-age fe-age-${primeStatus(f.age).id}`} title={`${primeStatus(f.age).label} — OVR already reflects this`}>
                  {f.age}
                </span>
                <span>{f.record.wins}-{f.record.losses}-{f.record.draws} ({f.record.kos}KO/{f.record.subs}SUB) <StreakBadge fighter={f} /></span>
                <span>{f.stats.striking}</span>
                <span>{f.stats.wrestling}</span>
                <span>{f.stats.submission}</span>
                <span>{f.stats.chin}</span>
                <span>{f.stats.cardio}</span>
                <span className="fe-ovr">{f.overall}</span>
                <span className={`fe-status fe-status-${status.cls}`}>{status.text}</span>
                <Followers count={f.followers} />
                <button
                  className={`fe-contract-badge ${contractWarn ? 'warn' : !contractWarn && loyaltyRisk ? `risk-${loyaltyRisk}` : ''}`}
                  onClick={() => openProfile(f)}
                  title={contractTitle}
                >
                  {contractLeft}f
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
