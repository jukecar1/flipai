import React from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext';
import { WEIGHT_CLASSES, RIVAL_PROMOTIONS } from '../game/constants';
import { prestigeTierLabel } from '../game/gameReducer';
import { Panel, Button, WeightPill, Flag, Avatar } from '../components/UI';

export default function Promotions() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const { meta, prestige, rivals, freeAgents, funds } = state;

  const board = [
    { id: 'you', name: meta.promotionName, tier: prestigeTierLabel(prestige), prestige, mine: true },
    ...rivals.map(r => ({ ...r, mine: false })),
  ].sort((a, b) => b.prestige - a.prestige);

  const sign = fighterId => dispatch({ type: 'SIGN_FREE_AGENT', fighterId });

  const champions = WEIGHT_CLASSES.map(wc => {
    const champ = (state.worldPool[wc.id] || []).find(f => f.champion);
    const promo = champ ? RIVAL_PROMOTIONS.find(p => p.id === champ.promotionId) : null;
    return { wc, champ, promo };
  });

  const yourTitles = WEIGHT_CLASSES
    .map(wc => ({ wc, title: state.titles[wc.id] }))
    .filter(t => t.title);

  return (
    <div className="fe-promotions">
      <Panel title="INDUSTRY LEADERBOARD" className="fe-promo-col">
        <div className="fe-subheading">Your Titles</div>
        <div className="fe-your-titles">
          {yourTitles.length === 0 ? (
            <p className="fe-hint">No belts yet — book a Main Event with a top contender (OVR 11+) for a division's vacant title.</p>
          ) : (
            yourTitles.map(({ wc, title }) => (
              <div key={wc.id} className="fe-your-title-row">
                <span>🏆</span>
                <WeightPill id={wc.id} />
                <span className="fe-boxer-name">{title.holderName}</span>
                <span className="fe-hint">{title.defenses} defense{title.defenses === 1 ? '' : 's'}</span>
              </div>
            ))
          )}
        </div>
        <div className="fe-subheading">Leaderboard</div>
        <div className="fe-leaderboard">
          {board.map((p, i) => (
            <div key={p.id} className={`fe-leaderboard-row ${p.mine ? 'mine' : ''}`}>
              <span className="fe-rank-num">{i + 1}</span>
              <span className="fe-promo-dot" style={{ background: p.color || '#e2263a' }} />
              <div className="fe-promo-info">
                <strong>{p.name}{p.mine && <span className="fe-mine-badge">YOU</span>}</strong>
                <span>{p.tier}</span>
              </div>
              <span className="fe-promo-prestige">{p.prestige.toLocaleString()} pts</span>
            </div>
          ))}
        </div>
        <p className="fe-hint">Prestige grows from your roster quality, fight results, and finishes. Climb past every rival to become the sport's #1 promotion.</p>
      </Panel>

      <Panel title="DIVISIONAL CHAMPIONS" className="fe-promo-col">
        <div className="fe-champ-list">
          {champions.map(({ wc, champ, promo }) => (
            <div key={wc.id} className="fe-champ-row">
              <WeightPill id={wc.id} />
              {champ ? (
                <>
                  <Avatar fighter={champ} size={26} champion />
                  <Flag nationality={champ.nationality} />
                  <span className="fe-boxer-name">{champ.name}</span>
                  <span className="fe-champ-record">{champ.record.wins}-{champ.record.losses}-{champ.record.draws}</span>
                  <span className="fe-champ-promo" style={{ color: promo?.color }}>{promo?.name}</span>
                </>
              ) : (
                <span className="fe-empty">Vacant</span>
              )}
            </div>
          ))}
        </div>
        <p className="fe-hint">Belts held by rival organizations aren't signable — build enough prestige and roster strength to out-draw them instead.</p>
      </Panel>

      <Panel title="FREE AGENCY" className="fe-promo-col">
        {freeAgents.length === 0 && <div className="fe-empty">No free agents on the market right now.</div>}
        <div className="fe-free-agent-list">
          {freeAgents.map(f => {
            const cost = Math.round(f.purseFloor * 3);
            return (
              <div key={f.id} className="fe-free-agent-row">
                <Avatar fighter={f} size={26} />
                <WeightPill id={f.weightClass} />
                <Flag nationality={f.nationality} />
                <div className="fe-boxer-name">
                  <span className="fe-boxer-name-text">{f.name}</span>
                  <span className="fe-boxer-record">{f.record.wins}-{f.record.losses}-{f.record.draws} · OVR {f.overall}</span>
                </div>
                <span className="fe-weeks-out">{f.weeksLeft}w left</span>
                <Button variant="advance" onClick={() => sign(f.id)} disabled={funds < cost}>
                  Sign (${cost.toLocaleString()})
                </Button>
              </div>
            );
          })}
        </div>
        <p className="fe-hint">Rival promotions are circling every free agent — wait too long and they'll sign elsewhere.</p>
      </Panel>
    </div>
  );
}
