import React, { useMemo, useState } from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext';
import { FIGHT_TYPES, WEIGHT_CLASS_MAP } from '../game/constants';
import { isTitleFight, drawMultiplier } from '../game/gameReducer';
import { venuesNear } from '../game/venues';
import { Panel, Button, WeightPill, Flag, Avatar, Followers } from '../components/UI';

const TYPE_LABELS = {
  [FIGHT_TYPES.SINGLE]: 'Single Fight',
  [FIGHT_TYPES.SHOWCASE]: 'Showcase',
  [FIGHT_TYPES.MAIN_EVENT]: 'Main Event',
};

const TYPE_DESCRIPTIONS = {
  [FIGHT_TYPES.SINGLE]: 'No venue fee — you just split the purse. Fastest, cheapest way to get a fighter booked. 3 rounds.',
  [FIGHT_TYPES.SHOWCASE]: 'A proper undercard slot. Costs the venue’s site fee but pays a bigger purse than a Single Fight. 3 rounds.',
  [FIGHT_TYPES.MAIN_EVENT]: 'Your biggest stage — top billing, biggest purse, title-eligible if your fighter qualifies. Costs the most to book. 5 rounds.',
};

export default function MakeFights() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const { roster, worldPool, meta } = state;

  const [fighterId, setFighterId] = useState(roster[0]?.id || '');
  const [fightType, setFightType] = useState(FIGHT_TYPES.SINGLE);
  const [opponentId, setOpponentId] = useState('');
  const [venueId, setVenueId] = useState('');

  const fighter = roster.find(f => f.id === fighterId);
  const alreadyBooked = new Set(state.scheduledFights.map(f => f.fighterId));
  const isInjured = f => f.injuryWeeks > 0;

  const opponents = useMemo(() => {
    if (!fighter) return [];
    // Fighters under contract to a rival promotion aren't signable or
    // bookable — only free agents are available opponents.
    return (worldPool[fighter.weightClass] || []).filter(o => !o.retired && !o.promotionId);
  }, [fighter, worldPool]);

  const opponent = opponents.find(o => o.id === opponentId);
  const venues = useMemo(() => venuesNear(meta.hq), [meta.hq]);
  const venue = venues.find(v => v.id === venueId);

  const cost = venue ? (fightType === FIGHT_TYPES.SINGLE ? 0 : venue.fee) : 0;
  const canConfirm = fighter && opponent && venue && state.funds >= cost && !alreadyBooked.has(fighter.id) && !isInjured(fighter);
  const isTitle = fightType === FIGHT_TYPES.MAIN_EVENT && fighter && isTitleFight(state, fighter);
  const isDefense = isTitle && state.titles[fighter.weightClass]?.holderId === fighter.id;

  const drawMult = opponent && fighter ? drawMultiplier(fighter.followers, opponent.followers) : 1;
  const estimatedPurse = (() => {
    if (!fighter || !venue) return 0;
    const typeMult = fightType === FIGHT_TYPES.MAIN_EVENT ? 2.4 : fightType === FIGHT_TYPES.SHOWCASE ? 1.3 : 1;
    const venueMult = 1 + venue.capacity / 20000;
    return Math.round(fighter.purseFloor * typeMult * venueMult * drawMult * (isTitle ? 1.6 : 1));
  })();

  const confirm = () => {
    if (!canConfirm) return;
    dispatch({ type: 'SCHEDULE_FIGHT', fighterId, opponent, fightType, venue });
    setOpponentId('');
    setVenueId('');
  };

  return (
    <div className="fe-make-fights">
      <Panel title="1. SELECT YOUR FIGHTER" className="fe-mf-col">
        <select value={fighterId} onChange={e => { setFighterId(e.target.value); setOpponentId(''); }} className="fe-full-select">
          {roster.map(f => (
            <option key={f.id} value={f.id} disabled={alreadyBooked.has(f.id) || isInjured(f)}>
              {f.name} ({f.weightClass}) {alreadyBooked.has(f.id) ? '— fight booked' : ''}{isInjured(f) ? ` — injured, ${f.injuryWeeks}w left` : ''}
            </option>
          ))}
        </select>
        {fighter && isInjured(fighter) && (
          <p className="fe-hint fe-hint-warn">{fighter.name} is injured and can't be booked for {fighter.injuryWeeks} more week{fighter.injuryWeeks === 1 ? '' : 's'}.</p>
        )}
        {fighter && <div className="fe-row-actions"><Followers count={fighter.followers} /><span className="fe-hint">following</span></div>}

        <div className="fe-type-tabs">
          {Object.values(FIGHT_TYPES).map(t => (
            <button key={t} className={`fe-type-tab ${fightType === t ? 'active' : ''}`} onClick={() => setFightType(t)}>
              <span className="fe-type-tab-label">{TYPE_LABELS[t]}</span>
              <span className="fe-type-tab-desc">{TYPE_DESCRIPTIONS[t]}</span>
            </button>
          ))}
        </div>
        {isTitle && (
          <p className="fe-hint fe-hint-title">
            🏆 {isDefense ? `Title defense — ${WEIGHT_CLASS_MAP[fighter.weightClass].name} Championship` : `Title fight for the vacant ${WEIGHT_CLASS_MAP[fighter.weightClass].name} Championship`}
          </p>
        )}
      </Panel>

      <Panel title="2. PICK AN OPPONENT" className="fe-mf-col">
        {opponents.length === 0 && <div className="fe-empty">No free agents available at this weight right now.</div>}
        <div className="fe-opponent-list">
          {opponents.map(o => (
            <div key={o.id} className={`fe-opponent-row ${opponentId === o.id ? 'selected' : ''}`} onClick={() => setOpponentId(o.id)}>
              <Avatar fighter={o} size={26} />
              <WeightPill id={o.weightClass} />
              <Flag nationality={o.nationality} />
              <span className="fe-boxer-name" title={o.name}>{o.name}</span>
              <span className="fe-boxer-record">{o.record.wins}-{o.record.losses}-{o.record.draws}</span>
              <Followers count={o.followers} />
              <span className="fe-boxer-overall">OVR {o.overall}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="3. VENUE &amp; CONFIRM" className="fe-mf-col">
        <div className="fe-venue-list">
          {venues.slice(0, 8).map(v => (
            <div key={v.id} className={`fe-venue-row ${venueId === v.id ? 'selected' : ''}`} onClick={() => setVenueId(v.id)}>
              <div>
                <strong>{v.name}</strong>
                <span>{v.city} · {v.capacity.toLocaleString()} seats</span>
              </div>
              <span className="fe-venue-fee">${v.fee.toLocaleString()}</span>
            </div>
          ))}
        </div>

        {fighter && opponent && venue && (
          <div className="fe-confirm-box">
            {isTitle && <div className="fe-title-fight-badge">🏆 TITLE FIGHT</div>}
            <div><strong>{fighter.name}</strong> vs <strong>{opponent.name}</strong></div>
            <div>{venue.name}, {venue.city}</div>
            <div>
              Draw power: <span className="fe-gold">{drawMult.toFixed(2)}x gate</span>
              <span className="fe-hint"> ({(fighter.followers + opponent.followers).toLocaleString()} combined followers)</span>
            </div>
            <div>Est. purse: <span className="fe-gold">${estimatedPurse.toLocaleString()}+</span></div>
            <div>Cost to book: <span className="fe-gold">${cost.toLocaleString()}</span></div>
          </div>
        )}

        <Button variant="advance" onClick={confirm} disabled={!canConfirm} className="fe-confirm-btn">
          Book Fight
        </Button>
      </Panel>
    </div>
  );
}
