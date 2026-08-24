import React from 'react';
import { useGameState, useGameDispatch, useGameActions } from '../context/GameContext';
import { rosterLimitForGym } from '../game/constants';
import { findFighterAnywhere } from '../game/gameReducer';
import { Panel, Button, WeightPill, Flag, Avatar, NewsCategoryIcon, Followers, FighterNameButton } from '../components/UI';

export default function Hub() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const { goTo } = useGameActions();
  const { roster, scheduledFights, news } = state;

  const readyFight = fightId => dispatch({ type: 'PREPARE_FIGHT_SIM', fightId });
  const rosterLimit = rosterLimitForGym(state.meta.gymLevel);

  const tickerItems = news.slice(0, 8);

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
      <div className="fe-hub">
        <div className="fe-hub-col fe-hub-main">
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
                  <Followers count={f.followers} />
                  <span className="fe-boxer-overall">OVR {f.overall}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="UPCOMING FIGHTS">
            {scheduledFights.length === 0 && <div className="fe-empty">No fights booked. Head to Make Fights.</div>}
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
