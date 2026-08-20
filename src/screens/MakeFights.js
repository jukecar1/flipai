import React, { useMemo, useState } from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext';
import { FIGHT_TYPES } from '../game/constants';
import { venuesNear } from '../game/venues';
import { Panel, Button, WeightPill, Flag } from '../components/UI';

const TYPE_LABELS = {
  [FIGHT_TYPES.SINGLE]: 'Single Fight',
  [FIGHT_TYPES.SHOWCASE]: 'Showcase',
  [FIGHT_TYPES.MAIN_EVENT]: 'Main Event',
};

export default function MakeFights() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const { roster, worldPool, meta } = state;

  const [boxerId, setBoxerId] = useState(roster[0]?.id || '');
  const [fightType, setFightType] = useState(FIGHT_TYPES.SINGLE);
  const [opponentId, setOpponentId] = useState('');
  const [venueId, setVenueId] = useState('');

  const boxer = roster.find(b => b.id === boxerId);
  const alreadyBooked = new Set(state.scheduledFights.map(f => f.boxerId));

  const opponents = useMemo(() => {
    if (!boxer) return [];
    return (worldPool[boxer.weightClass] || []).filter(o => !o.retired);
  }, [boxer, worldPool]);

  const opponent = opponents.find(o => o.id === opponentId);
  const venues = useMemo(() => venuesNear(meta.hq), [meta.hq]);
  const venue = venues.find(v => v.id === venueId);

  const cost = venue ? (fightType === FIGHT_TYPES.SINGLE ? 0 : venue.fee) : 0;
  const canConfirm = boxer && opponent && venue && state.funds >= cost && !alreadyBooked.has(boxer.id);

  const confirm = () => {
    if (!canConfirm) return;
    dispatch({ type: 'SCHEDULE_FIGHT', boxerId, opponent, fightType, venue });
    setOpponentId('');
    setVenueId('');
  };

  return (
    <div className="fe-make-fights">
      <Panel title="1. SELECT YOUR BOXER" className="fe-mf-col">
        <select value={boxerId} onChange={e => { setBoxerId(e.target.value); setOpponentId(''); }} className="fe-full-select">
          {roster.map(b => (
            <option key={b.id} value={b.id} disabled={alreadyBooked.has(b.id)}>
              {b.name} ({b.weightClass}) {alreadyBooked.has(b.id) ? '— fight booked' : ''}
            </option>
          ))}
        </select>

        <div className="fe-type-tabs">
          {Object.values(FIGHT_TYPES).map(t => (
            <button key={t} className={`fe-type-tab ${fightType === t ? 'active' : ''}`} onClick={() => setFightType(t)}>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <p className="fe-hint">
          {fightType === FIGHT_TYPES.SINGLE && 'Quickest option — no site fee, you take a cut of the purse.'}
          {fightType === FIGHT_TYPES.SHOWCASE && 'A modest show built around this fight. Costs the venue site fee.'}
          {fightType === FIGHT_TYPES.MAIN_EVENT && 'Headline event at a bigger venue. Higher cost, higher purse.'}
        </p>
      </Panel>

      <Panel title="2. PICK AN OPPONENT" className="fe-mf-col">
        <div className="fe-opponent-list">
          {opponents.map(o => (
            <div key={o.id} className={`fe-opponent-row ${opponentId === o.id ? 'selected' : ''}`} onClick={() => setOpponentId(o.id)}>
              <WeightPill id={o.weightClass} />
              <Flag nationality={o.nationality} />
              <span className="fe-boxer-name">{o.name}</span>
              <span className="fe-boxer-record">{o.record.wins}-{o.record.losses}-{o.record.draws}</span>
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

        {boxer && opponent && venue && (
          <div className="fe-confirm-box">
            <div><strong>{boxer.name}</strong> vs <strong>{opponent.name}</strong></div>
            <div>{venue.name}, {venue.city}</div>
            <div>Est. purse: <span className="fe-gold">${(boxer.purseFloor).toLocaleString()}+</span></div>
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
