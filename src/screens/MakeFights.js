import React, { useMemo, useState } from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext';
import { FIGHT_TYPES, WEIGHT_CLASS_MAP, CARD_MAX_FIGHTS, SUPER_FIGHT_SANCTION_FEE, GAMEPLANS, RIVAL_PROMOTIONS, STAT_KEYS, STAT_LABELS } from '../game/constants';
import { isTitleFight, drawMultiplier, purseForFight, winProbability } from '../game/gameReducer';
import { venuesNear, venuesForFightType } from '../game/venues';
import { Panel, Button, WeightPill, Flag, Avatar, Followers } from '../components/UI';

const TYPE_LABELS = {
  [FIGHT_TYPES.SINGLE]: 'Single Fight',
  [FIGHT_TYPES.SHOWCASE]: 'Showcase',
  [FIGHT_TYPES.MAIN_EVENT]: 'Main Event',
};

const TYPE_DESCRIPTIONS = {
  [FIGHT_TYPES.SINGLE]: 'No venue fee — you just split the purse. Small local halls only, fastest and cheapest way to get a fighter booked. 3 rounds.',
  [FIGHT_TYPES.SHOWCASE]: 'A proper undercard slot on a Fight Night card, at a small hall or theatre. Costs a shared site fee, pays a bigger purse. 3 rounds.',
  [FIGHT_TYPES.MAIN_EVENT]: 'Your biggest stage — headline a full arena or stadium, biggest purse, title-eligible if your fighter qualifies. 5 rounds.',
};

function MatchupCompare({ fighter, opponent }) {
  if (!fighter || !opponent) return null;
  const odds = Math.round(winProbability(fighter, opponent) * 100);
  const oppOdds = 100 - odds;
  const firstName = n => (n || '').split(' ')[0];
  return (
    <div className="fe-matchup">
      <div className="fe-matchup-odds-row">
        <span className={odds >= 50 ? 'fe-matchup-favorite' : 'fe-matchup-underdog'}>{firstName(fighter.name)} {odds}%</span>
        <span className={oppOdds >= 50 ? 'fe-matchup-favorite' : 'fe-matchup-underdog'}>{oppOdds}% {firstName(opponent.name)}</span>
      </div>
      <div className="fe-matchup-bar">
        <span className="fe-matchup-bar-fill" style={{ width: `${odds}%` }} />
      </div>
      <div className="fe-matchup-stats">
        {STAT_KEYS.map(stat => (
          <div key={stat} className="fe-matchup-stat-row">
            <span className={fighter.stats[stat] > opponent.stats[stat] ? 'fe-matchup-win' : ''}>{fighter.stats[stat]}</span>
            <span className="fe-matchup-stat-label">{STAT_LABELS[stat]}</span>
            <span className={opponent.stats[stat] > fighter.stats[stat] ? 'fe-matchup-win' : ''}>{opponent.stats[stat]}</span>
          </div>
        ))}
        <div className="fe-matchup-stat-row fe-matchup-ovr-row">
          <span className={fighter.overall > opponent.overall ? 'fe-matchup-win' : ''}>{fighter.overall}</span>
          <span className="fe-matchup-stat-label">OVR</span>
          <span className={opponent.overall > fighter.overall ? 'fe-matchup-win' : ''}>{opponent.overall}</span>
        </div>
      </div>
      <p className="fe-hint">Odds are a read on paper, not a guarantee — plenty of upsets happen once the cage door shuts.</p>
    </div>
  );
}

function OpponentList({ opponents, crossoverOpponents, opponentId, onSelect }) {
  return (
    <>
      {opponents.length === 0 && crossoverOpponents.length === 0 && <div className="fe-empty">No opponents available at this weight right now.</div>}
      <div className="fe-opponent-list">
        {opponents.map(o => (
          <div key={o.id} className={`fe-opponent-row ${opponentId === o.id ? 'selected' : ''}`} onClick={() => onSelect(o)}>
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
      {crossoverOpponents.length > 0 && (
        <>
          <div className="fe-subheading">Crossover Opponents (+${SUPER_FIGHT_SANCTION_FEE.toLocaleString()} sanction fee)</div>
          <p className="fe-hint">Rival-contracted fighters — booking one is a landmark crossover event, not a signing. Bigger purse, bigger prestige swing.</p>
          <div className="fe-opponent-list">
            {crossoverOpponents.map(o => {
              const promo = RIVAL_PROMOTIONS.find(p => p.id === o.promotionId);
              return (
                <div key={o.id} className={`fe-opponent-row ${opponentId === o.id ? 'selected' : ''}`} onClick={() => onSelect(o)}>
                  <Avatar fighter={o} size={26} champion={o.champion} />
                  <WeightPill id={o.weightClass} />
                  <Flag nationality={o.nationality} />
                  <span className="fe-boxer-name" title={o.name}>{o.name}{o.champion ? ' 👑' : ''}</span>
                  <span className="fe-champ-promo" style={{ color: promo?.color }} title={promo?.name}>{promo?.name}</span>
                  <Followers count={o.followers} />
                  <span className="fe-boxer-overall">OVR {o.overall}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

export default function MakeFights() {
  const [mode, setMode] = useState('single');
  return (
    <div>
      <div className="fe-wc-tabs fe-mf-mode-tabs">
        <button className={`fe-wc-tab ${mode === 'single' ? 'active' : ''}`} onClick={() => setMode('single')}>Book One Fight</button>
        <button className={`fe-wc-tab ${mode === 'card' ? 'active' : ''}`} onClick={() => setMode('card')}>Build a Card</button>
      </div>
      {mode === 'single' ? <SingleBookingFlow /> : <CardBuilderFlow />}
    </div>
  );
}

function SingleBookingFlow() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const { roster, worldPool, meta } = state;

  const [fighterId, setFighterId] = useState(roster[0]?.id || '');
  const [fightType, setFightType] = useState(FIGHT_TYPES.SINGLE);
  const [opponentId, setOpponentId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [cardChoice, setCardChoice] = useState('');
  const [gameplan, setGameplan] = useState('balanced');

  const fighter = roster.find(f => f.id === fighterId);
  const alreadyBooked = new Set(state.scheduledFights.map(f => f.fighterId));
  const isInjured = f => f.injuryWeeks > 0;

  const selectFighter = id => { setFighterId(id); setOpponentId(''); };
  const selectType = t => { setFightType(t); setOpponentId(''); setCardChoice(''); setVenueId(''); };

  const opponents = useMemo(() => {
    if (!fighter) return [];
    return (worldPool[fighter.weightClass] || []).filter(o => !o.retired && !o.promotionId);
  }, [fighter, worldPool]);

  const crossoverOpponents = useMemo(() => {
    if (!fighter || fightType !== FIGHT_TYPES.MAIN_EVENT) return [];
    return (worldPool[fighter.weightClass] || []).filter(o => !o.retired && o.promotionId);
  }, [fighter, worldPool, fightType]);

  const opponent = opponents.find(o => o.id === opponentId) || crossoverOpponents.find(o => o.id === opponentId);
  const isSuperFight = fightType === FIGHT_TYPES.MAIN_EVENT && !!opponent?.promotionId;

  const venues = useMemo(() => venuesForFightType(fightType, meta.hq), [fightType, meta.hq]);
  const isCardType = fightType !== FIGHT_TYPES.SINGLE;
  const bookableCards = useMemo(() => {
    if (!isCardType) return [];
    return (state.cards || []).filter(c => c.weeksOut > 0 && state.scheduledFights.filter(f => f.cardId === c.id).length < CARD_MAX_FIGHTS);
  }, [state.cards, state.scheduledFights, isCardType]);
  const selectedCard = bookableCards.find(c => c.id === cardChoice);
  const venue = isCardType && selectedCard ? selectedCard.venue : venues.find(v => v.id === venueId);

  const sanctionFee = isSuperFight ? SUPER_FIGHT_SANCTION_FEE : 0;
  const venueCost = fightType === FIGHT_TYPES.SINGLE ? 0 : (isCardType && selectedCard ? 0 : (venue ? venue.fee : 0));
  const cost = venueCost + sanctionFee;

  const canConfirm = fighter && opponent && venue && state.funds >= cost && !alreadyBooked.has(fighter.id) && !isInjured(fighter);
  const isTitle = fightType === FIGHT_TYPES.MAIN_EVENT && fighter && isTitleFight(state, fighter);
  const isDefense = isTitle && state.titles[fighter.weightClass]?.holderId === fighter.id;

  const drawMult = opponent && fighter ? drawMultiplier(fighter.followers, opponent.followers) : 1;
  const estimatedPurse = fighter && venue && opponent
    ? Math.round(purseForFight(fighter, opponent, fightType, venue) * (isTitle ? 1.6 : 1) * (isSuperFight ? 1.4 : 1))
    : 0;

  const confirm = () => {
    if (!canConfirm) return;
    if (fightType === FIGHT_TYPES.SINGLE) {
      dispatch({ type: 'SCHEDULE_FIGHT', fighterId, opponent, fightType, venue, gameplan });
    } else if (selectedCard) {
      dispatch({ type: 'ADD_FIGHT_TO_CARD', cardId: selectedCard.id, fighterId, opponent, fightType, gameplan });
    } else {
      dispatch({ type: 'CREATE_CARD', venue, fighterId, opponent, fightType, gameplan });
    }
    setOpponentId('');
    setVenueId('');
    setCardChoice('');
  };

  return (
    <div className="fe-make-fights">
      <Panel title="1. SELECT YOUR FIGHTER" className="fe-mf-col">
        <select value={fighterId} onChange={e => selectFighter(e.target.value)} className="fe-full-select">
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
            <button key={t} className={`fe-type-tab ${fightType === t ? 'active' : ''}`} onClick={() => selectType(t)}>
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

        <div className="fe-subheading">Gameplan</div>
        <div className="fe-wc-tabs">
          {GAMEPLANS.map(g => (
            <button
              key={g.id}
              className={`fe-wc-tab ${gameplan === g.id ? 'active' : ''}`}
              onClick={() => setGameplan(g.id)}
              title={g.description}
            >
              {g.label}
            </button>
          ))}
        </div>
        <p className="fe-hint">{GAMEPLANS.find(g => g.id === gameplan)?.description}</p>
      </Panel>

      <Panel title="2. PICK AN OPPONENT" className="fe-mf-col">
        <OpponentList opponents={opponents} crossoverOpponents={crossoverOpponents} opponentId={opponentId} onSelect={o => setOpponentId(o.id)} />
        {fighter && opponent && (
          <>
            <div className="fe-subheading">Matchup</div>
            <MatchupCompare fighter={fighter} opponent={opponent} />
          </>
        )}
      </Panel>

      <Panel title={isCardType ? '3. CARD & CONFIRM' : '3. VENUE & CONFIRM'} className="fe-mf-col">
        {isCardType && bookableCards.length > 0 && (
          <>
            <div className="fe-subheading">Add to an Upcoming Card</div>
            <div className="fe-venue-list">
              {bookableCards.map(c => {
                const boutCount = state.scheduledFights.filter(f => f.cardId === c.id).length;
                return (
                  <div key={c.id} className={`fe-venue-row ${cardChoice === c.id ? 'selected' : ''}`} onClick={() => { setCardChoice(c.id); setVenueId(''); }}>
                    <div>
                      <strong>{c.venue.name}</strong>
                      <span>{c.venue.city} · {c.weeksOut}w out · {boutCount}/{CARD_MAX_FIGHTS} bouts</span>
                    </div>
                    <span className="fe-venue-fee">Free</span>
                  </div>
                );
              })}
            </div>
            <div className="fe-subheading">Or Book a New Card</div>
          </>
        )}
        <div className="fe-venue-list">
          {venues.slice(0, 8).map(v => (
            <div key={v.id} className={`fe-venue-row ${venueId === v.id && !cardChoice ? 'selected' : ''}`} onClick={() => { setVenueId(v.id); setCardChoice(''); }}>
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
            {isSuperFight && <div className="fe-title-fight-badge fe-superfight-badge">⚔️ CROSSOVER EVENT</div>}
            <div><strong>{fighter.name}</strong> vs <strong>{opponent.name}</strong></div>
            <div>{venue.name}, {venue.city}{selectedCard ? ' (shared card)' : ''}</div>
            <div>
              Draw power: <span className="fe-gold">{drawMult.toFixed(2)}x gate</span>
              <span className="fe-hint"> ({(fighter.followers + opponent.followers).toLocaleString()} combined followers)</span>
            </div>
            <div>Est. purse: <span className="fe-gold">${estimatedPurse.toLocaleString()}+</span></div>
            <div>Cost to book: <span className="fe-gold">${cost.toLocaleString()}</span>{isSuperFight && <span className="fe-hint"> (incl. ${sanctionFee.toLocaleString()} sanction fee)</span>}</div>
          </div>
        )}

        <Button variant="advance" onClick={confirm} disabled={!canConfirm} className="fe-confirm-btn">
          {isCardType ? (selectedCard ? 'Add to Card' : 'Book New Card') : 'Book Fight'}
        </Button>
      </Panel>
    </div>
  );
}

function CardBuilderFlow() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const { roster, worldPool, meta } = state;

  const [venueId, setVenueId] = useState('');
  const [pendingBouts, setPendingBouts] = useState([]);

  const [pickFighterId, setPickFighterId] = useState('');
  const [pickType, setPickType] = useState(FIGHT_TYPES.SHOWCASE);
  const [pickOpponentId, setPickOpponentId] = useState('');
  const [pickGameplan, setPickGameplan] = useState('balanced');

  const venues = useMemo(() => venuesNear(meta.hq), [meta.hq]);
  const venue = venues.find(v => v.id === venueId);

  const alreadyBooked = new Set(state.scheduledFights.map(f => f.fighterId));
  const pendingFighterIds = new Set(pendingBouts.map(b => b.fighterId));
  const availableFighters = roster.filter(f => !alreadyBooked.has(f.id) && !pendingFighterIds.has(f.id) && f.injuryWeeks === 0);
  const pickFighter = roster.find(f => f.id === pickFighterId) || availableFighters[0];

  const opponents = useMemo(() => {
    if (!pickFighter) return [];
    return (worldPool[pickFighter.weightClass] || []).filter(o => !o.retired && !o.promotionId);
  }, [pickFighter, worldPool]);
  const crossoverOpponents = useMemo(() => {
    if (!pickFighter || pickType !== FIGHT_TYPES.MAIN_EVENT) return [];
    return (worldPool[pickFighter.weightClass] || []).filter(o => !o.retired && o.promotionId);
  }, [pickFighter, worldPool, pickType]);
  const pickOpponent = opponents.find(o => o.id === pickOpponentId) || crossoverOpponents.find(o => o.id === pickOpponentId);

  const isTitle = pickType === FIGHT_TYPES.MAIN_EVENT && pickFighter && isTitleFight(state, pickFighter);

  const sanctionTotal = pendingBouts.reduce((sum, b) => sum + (b.opponent.promotionId ? SUPER_FIGHT_SANCTION_FEE : 0), 0);
  const totalCost = (venue?.fee || 0) + sanctionTotal;
  const canAddBout = pickFighter && pickOpponent && pendingBouts.length < CARD_MAX_FIGHTS;
  const canBookCard = venue && pendingBouts.length > 0 && state.funds >= totalCost;

  const addBout = () => {
    if (!canAddBout) return;
    setPendingBouts(prev => [...prev, {
      fighterId: pickFighter.id,
      fighterName: pickFighter.name,
      fighterWeightClass: pickFighter.weightClass,
      opponent: pickOpponent,
      fightType: pickType,
      gameplan: pickGameplan,
      isTitle,
    }]);
    setPickFighterId('');
    setPickOpponentId('');
    setPickType(FIGHT_TYPES.SHOWCASE);
    setPickGameplan('balanced');
  };
  const removeBout = i => setPendingBouts(prev => prev.filter((_, idx) => idx !== i));

  const bookCard = () => {
    if (!canBookCard) return;
    dispatch({
      type: 'BOOK_CARD',
      venue,
      bouts: pendingBouts.map(b => ({ fighterId: b.fighterId, opponent: b.opponent, fightType: b.fightType, gameplan: b.gameplan })),
    });
    setPendingBouts([]);
    setVenueId('');
  };

  return (
    <div className="fe-make-fights">
      <Panel title="1. VENUE" className="fe-mf-col">
        <p className="fe-hint">Pick a venue to host your card — the site fee covers up to {CARD_MAX_FIGHTS} bouts, one fee for the whole night.</p>
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
      </Panel>

      <Panel title={`2. ADD BOUTS (${pendingBouts.length}/${CARD_MAX_FIGHTS})`} className="fe-mf-col">
        {!venue && <div className="fe-empty">Pick a venue first.</div>}
        {venue && (
          <>
            {availableFighters.length === 0 ? (
              <div className="fe-empty">No fighters left to add — everyone's booked, injured, or already on this card.</div>
            ) : (
              <>
                <select value={pickFighter?.id || ''} onChange={e => { setPickFighterId(e.target.value); setPickOpponentId(''); }} className="fe-full-select">
                  {availableFighters.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.weightClass})</option>
                  ))}
                </select>
                <div className="fe-wc-tabs">
                  {Object.values(FIGHT_TYPES).filter(t => t !== FIGHT_TYPES.SINGLE).map(t => (
                    <button key={t} className={`fe-wc-tab ${pickType === t ? 'active' : ''}`} onClick={() => { setPickType(t); setPickOpponentId(''); }}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
                {isTitle && <p className="fe-hint fe-hint-title">🏆 Title-eligible for {WEIGHT_CLASS_MAP[pickFighter.weightClass].name}</p>}
                <div className="fe-wc-tabs">
                  {GAMEPLANS.map(g => (
                    <button key={g.id} className={`fe-wc-tab ${pickGameplan === g.id ? 'active' : ''}`} onClick={() => setPickGameplan(g.id)} title={g.description}>
                      {g.label}
                    </button>
                  ))}
                </div>
                <div className="fe-subheading">Opponent</div>
                <OpponentList opponents={opponents} crossoverOpponents={crossoverOpponents} opponentId={pickOpponentId} onSelect={o => setPickOpponentId(o.id)} />
                {pickFighter && pickOpponent && <MatchupCompare fighter={pickFighter} opponent={pickOpponent} />}
                <div className="fe-row-actions">
                  <Button variant="advance" onClick={addBout} disabled={!canAddBout}>Add Bout to Card</Button>
                </div>
              </>
            )}
          </>
        )}
      </Panel>

      <Panel title="3. REVIEW & BOOK" className="fe-mf-col">
        {pendingBouts.length === 0 && <div className="fe-empty">No bouts added yet.</div>}
        <div className="fe-fight-list">
          {pendingBouts.map((b, i) => (
            <div key={i} className="fe-fight-row">
              <WeightPill id={b.fighterWeightClass} />
              {b.isTitle && <span title="Title fight">🏆</span>}
              {b.opponent.promotionId && <span title="Crossover event">⚔️</span>}
              <span className="fe-fight-title">{b.fighterName} v {b.opponent.name} <span className="fe-hint">({TYPE_LABELS[b.fightType]})</span></span>
              <button className="fe-retire-btn" onClick={() => removeBout(i)}>Remove</button>
            </div>
          ))}
        </div>
        {venue && (
          <div className="fe-confirm-box">
            <div>{venue.name}, {venue.city}</div>
            <div>Site fee: <span className="fe-gold">${venue.fee.toLocaleString()}</span></div>
            {sanctionTotal > 0 && <div>Sanction fees: <span className="fe-gold">${sanctionTotal.toLocaleString()}</span></div>}
            <div>Total cost: <span className="fe-gold">${totalCost.toLocaleString()}</span></div>
          </div>
        )}
        <Button variant="advance" onClick={bookCard} disabled={!canBookCard} className="fe-confirm-btn">
          Book Card ({pendingBouts.length} bout{pendingBouts.length === 1 ? '' : 's'})
        </Button>
      </Panel>
    </div>
  );
}
