import React, { useState } from 'react';
import { useGameState, useGameDispatch, useGameActions } from '../context/GameContext';
import { useFighterProfile } from '../context/FighterProfileContext';
import { rosterLimitForGym, WEIGHT_CLASSES, RIVAL_PROMOTIONS } from '../game/constants';
import { findFighterAnywhere, attentionItems } from '../game/gameReducer';
import { Panel, Button, WeightPill, Flag, Avatar, NewsCategoryIcon, Followers, FighterNameButton, ContractBadge } from '../components/UI';

const ATTENTION_ICONS = {
  contract: '📝',
  unhappy: '😠',
  legacy: '🎖️',
  callout: '📣',
  freeAgent: '⏳',
};

export default function Hub() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const { goTo } = useGameActions();
  const { open: openProfile } = useFighterProfile();
  const { roster, scheduledFights, news } = state;
  const attention = attentionItems(state);

  const handleAttentionClick = item => {
    if (item.type === 'callout') { goTo('makeFights'); return; }
    openProfile(item.fighterId);
  };

  const readyFight = fightId => dispatch({ type: 'PREPARE_FIGHT_SIM', fightId });
  const rosterLimit = rosterLimitForGym(state.meta.gymLevel);

  const tickerItems = news.slice(0, 8);

  const [tab, setTab] = useState('stable');

  // Whatever's soonest on the schedule, card or no card — a single glance
  // at "what's next" instead of hunting through the fight list for it.
  const nextFight = scheduledFights.length > 0
    ? [...scheduledFights].sort((a, b) => a.weeksOut - b.weeksOut)[0]
    : null;
  const nextFightCard = nextFight?.cardId ? (state.cards || []).find(c => c.id === nextFight.cardId) : null;
  const nextFightFighter = nextFight ? roster.find(f => f.id === nextFight.fighterId) : null;
  const nextFightOpponent = nextFight ? findFighterAnywhere(state, nextFight.opponentId) : null;

  // World-tab snapshot — same shape as the Promotions screen's leaderboard
  // and champions list, condensed so it's a glance from the Hub instead
  // of a trip to another screen just to see where things stand.
  const promoBoard = [
    { id: 'you', name: state.meta.promotionName, prestige: state.prestige, mine: true },
    ...state.rivals.map(r => ({ ...r, mine: false })),
  ].sort((a, b) => b.prestige - a.prestige);

  const champions = WEIGHT_CLASSES.map(wc => {
    const yourTitle = state.titles[wc.id];
    if (yourTitle) {
      const holder = roster.find(f => f.id === yourTitle.holderId);
      return { wc, champ: holder, mine: true };
    }
    const champ = (state.worldPool[wc.id] || []).find(f => f.champion);
    const promo = champ ? RIVAL_PROMOTIONS.find(p => p.id === champ.promotionId) : null;
    return { wc, champ, promo, mine: false };
  });

  // Group card-based bouts (Showcase/Main Event) under their shared event;
  // Single Fights have no card and just list on their own.
  const cardGroups = [];
  const cardGroupsById = {};
  const soloFights = [];
  scheduledFights.forEach(f => {
    if (!f.cardId) {
      soloFights.push(f);
      return;
    }
    if (!cardGroupsById[f.cardId]) {
      const card = (state.cards || []).find(c => c.id === f.cardId);
      cardGroupsById[f.cardId] = { card, fights: [] };
      cardGroups.push(cardGroupsById[f.cardId]);
    }
    cardGroupsById[f.cardId].fights.push(f);
  });

  const renderFightRow = (f, showVenue) => {
    const fighter = roster.find(x => x.id === f.fighterId);
    const opponent = findFighterAnywhere(state, f.opponentId);
    return (
      <div key={f.id} className="fe-fight-row">
        <WeightPill id={fighter?.weightClass} />
        {f.isTitle && <span title="Title fight">🏆</span>}
        {f.isSuperFight && <span title="Crossover event">⚔️</span>}
        <span className="fe-fight-title">
          <FighterNameButton fighter={fighter}>{fighter?.name}</FighterNameButton> v{' '}
          {opponent ? <FighterNameButton fighter={opponent}>{f.opponentName}</FighterNameButton> : (f.opponentName || 'TBD')}
        </span>
        {showVenue && <span className="fe-fight-venue">{f.venue.name}, {f.venue.city}</span>}
        {f.weeksOut > 0 ? (
          <span className="fe-weeks-out">{f.weeksOut}w</span>
        ) : (
          <Button variant="advance" className="fe-fight-btn" onClick={() => readyFight(f.id)}>FIGHT</Button>
        )}
      </div>
    );
  };

  return (
    <div className="fe-hub-page">
      <div className="fe-hub-tabs">
        <button className={`fe-hub-tab ${tab === 'stable' ? 'active' : ''}`} onClick={() => setTab('stable')}>My Stable</button>
        <button className={`fe-hub-tab ${tab === 'world' ? 'active' : ''}`} onClick={() => setTab('world')}>World</button>
      </div>

      {tab === 'stable' && nextFight && (
        <button
          className="fe-next-fight-banner"
          onClick={() => (nextFight.weeksOut <= 0 ? readyFight(nextFight.id) : goTo('bouts'))}
        >
          <div className="fe-next-fight-info">
            <span className="fe-next-fight-label">{nextFightCard ? nextFightCard.name : 'Next Fight'}</span>
            <span className="fe-next-fight-matchup">
              {nextFightFighter?.name || 'TBD'} vs {nextFightOpponent?.name || nextFight.opponentName || 'TBD'}
            </span>
            <span className="fe-hint">{nextFight.venue.name}, {nextFight.venue.city}</span>
          </div>
          <span className={`fe-next-fight-tag ${nextFight.weeksOut <= 0 ? 'now' : ''}`}>
            {nextFight.weeksOut <= 0 ? "THIS WEEK" : `${nextFight.weeksOut}w away`}
          </span>
        </button>
      )}

      {tab === 'stable' && (
      <div className="fe-hub">
        <div className="fe-hub-col fe-hub-main">
          <Panel title="NEEDS YOUR ATTENTION" className="fe-attention-panel">
            {attention.length === 0 ? (
              <div className="fe-empty">Nothing urgent — everyone's happy, under contract, and the market's quiet.</div>
            ) : (
              <div className="fe-attention-list">
                {attention.map(item => (
                  <button key={item.id} className={`fe-attention-row fe-attention-${item.type}`} onClick={() => handleAttentionClick(item)}>
                    <span className="fe-attention-icon" aria-hidden="true">{ATTENTION_ICONS[item.type]}</span>
                    <span className="fe-attention-text">{item.text}</span>
                    <span className="fe-attention-arrow">›</span>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={`MY ROSTER (${roster.length})`} right={<button className="fe-link" onClick={() => goTo('roster')}>View all</button>}>
            <div className="fe-boxer-list">
              {roster.map(f => (
                <div key={f.id} className="fe-boxer-row">
                  <Avatar fighter={f} size={28} />
                  <WeightPill id={f.weightClass} />
                  <Flag nationality={f.nationality} />
                  <FighterNameButton fighter={f} className="fe-boxer-name" />
                  {f.title && <span className="fe-belt-badge" title={`${f.title} Champion`}>🏆</span>}
                  <span className="fe-boxer-record">{f.record.wins}-{f.record.losses}-{f.record.draws} ({f.record.kos}KO, {f.record.subs}SUB)</span>
                  {f.injuryWeeks > 0 && <span className="fe-status fe-status-injured">Injured · {f.injuryWeeks}w</span>}
                  <ContractBadge fighter={f} />
                  <Followers count={f.followers} />
                  <span className="fe-boxer-overall">OVR {f.overall}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="UPCOMING FIGHTS"
            right={<Button variant="advance" className="fe-btn-compact" onClick={() => goTo('makeFights')}>+ Make Fights</Button>}
          >
            {scheduledFights.length === 0 && (
              <div className="fe-empty">
                No fights booked. <button className="fe-link" onClick={() => goTo('makeFights')}>Head to Make Fights.</button>
              </div>
            )}
            {cardGroups.map(({ card, fights }) => (
              <div key={card?.id || fights[0].cardId} className="fe-card-group">
                <div className="fe-card-group-header">
                  <span className="fe-card-group-name">
                    {card?.name || 'Event'}
                    <span className="fe-hint">{card?.venue.name}, {card?.venue.city}</span>
                  </span>
                  <span className="fe-hint">{fights.length} bout{fights.length === 1 ? '' : 's'}</span>
                </div>
                <div className="fe-fight-list">
                  {fights.map(f => renderFightRow(f, false))}
                </div>
              </div>
            ))}
            {soloFights.length > 0 && (
              <div className="fe-fight-list">
                {soloFights.map(f => renderFightRow(f, true))}
              </div>
            )}
          </Panel>
        </div>

        <div className="fe-hub-col fe-hub-side">
          <Panel title="GYM" right={<button className="fe-link" onClick={() => goTo('gyms')}>Details</button>}>
            <div className="fe-hub-gym-snapshot">
              <span>Level {state.meta.gymLevel} facility</span>
              <span className="fe-gold">{roster.length}/{rosterLimit} fighters</span>
              <span className="fe-hint">Coach {state.meta.coachName}</span>
            </div>
          </Panel>

          <Panel title="NEWS" right={<button className="fe-link" onClick={() => goTo('news')}>View all</button>}>
            <div className="fe-news-list">
              {news.slice(0, 6).map(n => (
                <div key={n.id} className="fe-news-item">
                  <NewsCategoryIcon category={n.category} />
                  <span className="fe-news-week">W{n.week}</span>
                  <span className="fe-boxer-name-text">{n.title}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
      )}

      {tab === 'world' && (
      <div className="fe-hub">
        <div className="fe-hub-col fe-hub-main">
          <Panel title="PROMOTION LEADERBOARD" right={<button className="fe-link" onClick={() => goTo('promotions')}>Full standings</button>}>
            <div className="fe-leaderboard">
              {promoBoard.map((p, i) => (
                <div key={p.id} className={`fe-leaderboard-row ${p.mine ? 'mine' : ''}`}>
                  <span className="fe-rank-num">{i + 1}</span>
                  <span className="fe-promo-dot" style={{ background: p.color || '#e2263a' }} />
                  <div className="fe-promo-info">
                    <strong>{p.name}{p.mine && <span className="fe-mine-badge">YOU</span>}</strong>
                  </div>
                  <span className="fe-promo-prestige">{p.prestige.toLocaleString()} pts</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="fe-hub-col fe-hub-side">
          <Panel title="DIVISIONAL CHAMPIONS" right={<button className="fe-link" onClick={() => goTo('promotions')}>All titles</button>}>
            <div className="fe-champ-list">
              {champions.map(({ wc, champ, promo, mine }) => (
                <div key={wc.id} className="fe-champ-row">
                  <WeightPill id={wc.id} />
                  {champ ? (
                    <>
                      <Avatar fighter={champ} size={24} champion />
                      <FighterNameButton fighter={champ} className="fe-boxer-name" />
                      {mine ? (
                        <span className="fe-mine-badge">YOU</span>
                      ) : (
                        <span className="fe-champ-promo" style={{ color: promo?.color }} title={promo?.name}>{promo?.name || 'Unaffiliated'}</span>
                      )}
                    </>
                  ) : (
                    <span className="fe-empty">Vacant</span>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
      )}

      {tickerItems.length > 0 && (
        <div className="fe-ticker">
          <div className="fe-ticker-track">
            {[...tickerItems, ...tickerItems].map((n, i) => (
              <span key={`${n.id}_${i}`} className="fe-ticker-item">
                <NewsCategoryIcon category={n.category} /> {n.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
