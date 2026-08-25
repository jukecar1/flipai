import React from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext';
import { useFighterProfile } from '../context/FighterProfileContext';
import { findFighterAnywhere } from '../game/gameReducer';
import {
  CONTRACT_WARNING_FIGHTS, CONTRACT_LENGTH_OPTIONS, contractCost, primeStatus, STAT_KEYS, STAT_LABELS, MAX_STAT,
  loyaltyStatus, LOYALTY_BASELINE, trainingCost, RIVAL_PROMOTIONS, poachCostFor, freeAgentCost,
  AMATEUR_PROMOTION_WINS, rosterLimitForGym,
} from '../game/constants';
import { Button, WeightPill, Flag, Avatar, Followers } from '../components/UI';

const ARCHETYPE_LABELS = { striker: 'Striker', wrestler: 'Wrestler', allrounder: 'All-rounder' };
const METHOD_LABELS = { KO: 'KO', TKO: 'TKO', SUB: 'Submission', UD: 'Decision', SD: 'Split Dec.', MD: 'Majority Dec.', DRAW: 'Draw' };
const CHIRP_ICONS = { result: '🥊', beef: '🔥', departure: '🚪', signing: '✍️', ppv: '🎬', callout: '📣' };

// A full screen for any fighter in the game — your own roster, a rival's
// champion, a free agent, an amateur prospect, or just an independent
// name on the regional scene. What it shows (and which actions are on
// offer) adapts to where the fighter currently lives; only your own
// signed roster gets contract renewal, training, and retirement.
// Rendered in place of the current screen's content whenever a fighter
// is open — see useFighterProfile/App.js — with "Back" simply closing it
// and returning to whatever screen was underneath.
export default function FighterProfileScreen() {
  const { fighterId, close } = useFighterProfile();
  const state = useGameState();
  const dispatch = useGameDispatch();

  if (!fighterId) return null;
  const f = findFighterAnywhere(state, fighterId);
  if (!f) return null; // retired, departed, or otherwise gone since the click

  const kind = state.roster.some(r => r.id === f.id) ? 'roster'
    : (state.amateurs || []).some(a => a.id === f.id) ? 'amateur'
    : (state.freeAgents || []).some(fa => fa.id === f.id) ? 'freeAgent'
    : f.promotionId ? 'rival'
    : 'independent';

  const stage = primeStatus(f.age);
  const loyalty = f.loyalty ?? LOYALTY_BASELINE;
  const loyaltyTier = loyaltyStatus(loyalty);
  const loyaltyLow = kind === 'roster' && loyalty < LOYALTY_BASELINE;
  const contractLeft = f.contractFightsLeft ?? '—';
  const contractWarn = kind === 'roster' && typeof contractLeft === 'number' && contractLeft <= CONTRACT_WARNING_FIGHTS;
  const rivalPromo = f.promotionId ? RIVAL_PROMOTIONS.find(p => p.id === f.promotionId) : null;
  const rosterLimit = rosterLimitForGym(state.meta.gymLevel);
  const rosterFull = state.roster.length >= rosterLimit;

  const fightHistory = state.fightHistory.filter(fh => fh.fighterId === f.id || fh.opponentId === f.id).slice(0, 8);
  const posts = (state.socialFeed || []).filter(p => p.fighterId === f.id).slice(0, 4);

  const renew = fightsCount => dispatch({ type: 'RENEW_CONTRACT', fighterId: f.id, fights: fightsCount });
  const retire = () => {
    if (window.confirm(`Retire ${f.name}? This can't be undone.`)) {
      dispatch({ type: 'RETIRE_FIGHTER', fighterId: f.id });
      close();
    }
  };
  const train = stat => dispatch({ type: 'TRAIN_STAT', fighterId: f.id, stat });
  const poach = () => dispatch({ type: 'POACH_FIGHTER', fighterId: f.id });
  const signFreeAgent = () => dispatch({ type: 'SIGN_FREE_AGENT', fighterId: f.id });
  const promoteAmateur = () => dispatch({ type: 'PROMOTE_AMATEUR', fighterId: f.id });

  const poachCost = kind === 'rival' ? poachCostFor(f) : 0;
  const freeAgentSignCost = kind === 'freeAgent' ? freeAgentCost(f) : 0;
  const amateurWinsNeeded = kind === 'amateur' ? AMATEUR_PROMOTION_WINS - (f.amateurRecord?.wins || 0) : 0;

  const kindLabel = kind === 'rival' ? (rivalPromo?.name || 'Rival Promotion')
    : kind === 'freeAgent' ? 'Free Agent'
    : kind === 'amateur' ? 'Your Amateur'
    : kind === 'independent' ? 'Independent'
    : null;

  return (
    <div className="fe-profile-screen">
      <button type="button" className="fe-back-link" onClick={close}>← Back</button>
      <div className="fe-profile-card">
        <div className="fe-profile-head">
          <Avatar fighter={f} size={56} champion={!!f.title || !!f.champion} />
          <div className="fe-profile-head-text">
            <div className="fe-profile-name-row">
              <WeightPill id={f.weightClass} /> <Flag nationality={f.nationality} />
              <span className="fe-profile-name">{f.name}</span>
              {(f.title || f.champion) && <span className="fe-belt-badge" title="Champion">🏆</span>}
            </div>
            <div className="fe-profile-sub">
              {ARCHETYPE_LABELS[f.archetype] || 'Fighter'} · Age {f.age} · {f.record.wins}-{f.record.losses}-{f.record.draws} ({f.record.kos}KO/{f.record.subs}SUB)
            </div>
          </div>
          <div className="fe-profile-badges">
            <span className={`fe-prime-badge fe-prime-badge-${stage.id}`}>{stage.label}</span>
            {kind === 'roster' ? (
              <span className={`fe-loyalty-badge fe-loyalty-badge-${loyaltyTier.id}`} title={`Loyalty ${loyalty}/100 — reflects how well you've booked and managed ${f.name.split(' ')[0]} lately`}>
                {loyaltyTier.label}
              </span>
            ) : (
              <span className="fe-affiliation-badge" style={rivalPromo ? { color: rivalPromo.color, borderColor: rivalPromo.color } : undefined}>
                {kindLabel}
              </span>
            )}
          </div>
        </div>

        <div className="fe-profile-ovr-row">
          <span className="fe-profile-ovr">{f.overall}</span>
          <span className="fe-hint">
            OVR — weighted toward {f.name.split(' ')[0]}'s strongest stats, scaled by age.
            {kind === 'roster' ? ' Train below to raise the raw numbers permanently.' : ' Raw training numbers below.'}
          </span>
        </div>

        <div className="fe-training-grid">
          {STAT_KEYS.map(stat => {
            const value = f.stats[stat];
            if (kind !== 'roster') {
              return (
                <div key={stat} className="fe-training-row">
                  <span className="fe-training-label">{STAT_LABELS[stat]}</span>
                  <span className="fe-training-value">{value}/{MAX_STAT}</span>
                </div>
              );
            }
            const maxed = value >= MAX_STAT;
            const isSpecialty = state.meta.coachSpecialty === stat;
            const cost = trainingCost(value, isSpecialty, f.age);
            const canAfford = (f.xp || 0) >= cost;
            return (
              <div key={stat} className="fe-training-row">
                <span className="fe-training-label">
                  {STAT_LABELS[stat]} {isSpecialty && <span className="fe-coach-badge" title="Your coach's specialty — discounted training">Coach's specialty</span>}
                </span>
                <span className="fe-training-value">{value}/{MAX_STAT}</span>
                <Button variant="secondary" className="fe-scout-sign-btn" onClick={() => train(stat)} disabled={maxed || !canAfford}>
                  {maxed ? 'Maxed' : `Train (+1) — ${cost.toLocaleString()} XP`}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="fe-profile-facts">
          <div><span className="fe-hint">Purse floor</span><span>${f.purseFloor.toLocaleString()}</span></div>
          <div><span className="fe-hint">Followers</span><Followers count={f.followers} /></div>
          {kind === 'roster' && (
            <>
              <div><span className="fe-hint">Under contract</span><span className={contractWarn ? 'fe-contract-badge warn' : ''}>{contractLeft} fight{contractLeft === 1 ? '' : 's'} left</span></div>
              <div><span className="fe-hint">XP banked</span><span>{(f.xp || 0).toLocaleString()}</span></div>
            </>
          )}
          {kind === 'amateur' && (
            <div><span className="fe-hint">Amateur record</span><span>{f.amateurRecord?.wins || 0}-{f.amateurRecord?.losses || 0}</span></div>
          )}
        </div>

        <div className="fe-subheading">Fight History{fightHistory.length > 0 ? ` (${fightHistory.length})` : ''}</div>
        {fightHistory.length === 0 ? (
          <p className="fe-hint">No fights against {state.meta.promotionName} on record yet.</p>
        ) : (
          <div className="fe-bouts-list fe-profile-bouts">
            {fightHistory.map(fh => {
              const draw = fh.result.method === 'DRAW';
              const won = !draw && fh.result.winnerId === f.id;
              const opponentName = fh.fighterId === f.id ? fh.opponentName : fh.fighterName;
              return (
                <div key={fh.id} className="fe-bout-row">
                  <span className="fe-news-week">W{fh.week}</span>
                  {fh.isTitle && <span title="Title fight">🏆</span>}
                  <span className="fe-fight-title">
                    vs {opponentName || 'Unknown'}
                    {fh.eventName && <span className="fe-hint"> · {fh.eventName}</span>}
                  </span>
                  <span className={`fe-bout-result fe-bout-${draw ? 'draw' : won ? 'win' : 'loss'}`}>
                    {draw ? 'DRAW' : won ? 'WIN' : 'LOSS'} · {METHOD_LABELS[fh.result.method] || fh.result.method}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="fe-subheading">Social Media{posts.length > 0 ? ` (${posts.length})` : ''}</div>
        {posts.length === 0 ? (
          <p className="fe-hint">Nothing posted yet.</p>
        ) : (
          <div className="fe-profile-chirp-list">
            {posts.map(p => (
              <div key={p.id} className={`fe-profile-chirp fe-chirp-${p.category}`}>
                <span className="fe-chirp-category">{CHIRP_ICONS[p.category] || '💬'}</span>
                <span className="fe-chirp-text">{p.text}</span>
                <span className="fe-chirp-week">Wk {p.week}</span>
              </div>
            ))}
          </div>
        )}

        {kind === 'roster' && (
          <>
            <div className="fe-subheading">Sign for</div>
            {loyaltyLow && (
              <div className="fe-loyalty-warning">
                {loyalty < 35
                  ? `${f.name.split(' ')[0]} is unhappy with how they've been booked — there's a real chance they turn down any offer.`
                  : `${f.name.split(' ')[0]} isn't thrilled with recent booking — signing will cost more, and they might say no.`}
              </div>
            )}
            <div className="fe-contract-options">
              {CONTRACT_LENGTH_OPTIONS.map(fightsCount => {
                const cost = contractCost(f.purseFloor, fightsCount, loyalty);
                return (
                  <button
                    key={fightsCount}
                    className="fe-contract-option"
                    disabled={state.funds < cost}
                    onClick={() => renew(fightsCount)}
                    title={`Sign ${f.name} for ${fightsCount} fight${fightsCount === 1 ? '' : 's'} — $${cost.toLocaleString()}`}
                  >
                    <span className="fe-contract-option-fights">{fightsCount} fight{fightsCount === 1 ? '' : 's'}</span>
                    <span className="fe-contract-option-cost">${cost.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
            <Button variant="secondary" className="fe-retire-btn fe-profile-retire" onClick={retire}>Retire {f.name.split(' ')[0]}</Button>
          </>
        )}

        {kind === 'rival' && (
          <div className="fe-profile-action-row">
            <p className="fe-hint">
              Signed with {rivalPromo?.name || 'a rival promotion'} — not signable outright, but you can make a buyout offer. Success scales with your prestige vs. theirs.
            </p>
            <Button variant="advance" onClick={poach} disabled={state.funds < poachCost || rosterFull} title={rosterFull ? 'Your roster is full' : undefined}>
              Poach (${poachCost.toLocaleString()})
            </Button>
          </div>
        )}

        {kind === 'freeAgent' && (
          <div className="fe-profile-action-row">
            <p className="fe-hint">
              On the open market{typeof f.weeksLeft === 'number' ? ` — the asking price climbs the longer you wait (${f.weeksLeft}w before a rival scoops them up)` : ''}.
            </p>
            <Button variant="advance" onClick={signFreeAgent} disabled={state.funds < freeAgentSignCost || rosterFull} title={rosterFull ? 'Your roster is full' : undefined}>
              Sign (${freeAgentSignCost.toLocaleString()})
            </Button>
          </div>
        )}

        {kind === 'amateur' && (
          <div className="fe-profile-action-row">
            <p className="fe-hint">
              {amateurWinsNeeded > 0 ? `Needs ${amateurWinsNeeded} more amateur win${amateurWinsNeeded === 1 ? '' : 's'} before they're pro-ready.` : 'Ready for the pro roster.'}
            </p>
            <Button variant="advance" onClick={promoteAmateur} disabled={amateurWinsNeeded > 0 || rosterFull} title={rosterFull ? 'Your roster is full' : undefined}>
              Promote to Pro
            </Button>
          </div>
        )}

        {kind === 'independent' && (
          <p className="fe-hint">An independent fighter on the regional scene — not on any roster and not directly signable. They may surface as a free agent later.</p>
        )}
      </div>
    </div>
  );
}
