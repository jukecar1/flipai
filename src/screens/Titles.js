import React from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext';
import { WEIGHT_CLASSES, RIVAL_PROMOTIONS, POACH_COST_MULTIPLIER, rosterLimitForGym } from '../game/constants';
import { Panel, Button, WeightPill, Flag, Avatar, Followers, FighterNameButton } from '../components/UI';

export default function Titles() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const rosterLimit = rosterLimitForGym(state.meta.gymLevel);
  const rosterFull = state.roster.length >= rosterLimit;
  const poach = fighterId => dispatch({ type: 'POACH_FIGHTER', fighterId });

  const rows = WEIGHT_CLASSES.map(wc => {
    const yourTitle = state.titles[wc.id];
    if (yourTitle) {
      const holder = state.roster.find(f => f.id === yourTitle.holderId);
      return { wc, status: 'yours', holder, defenses: yourTitle.defenses };
    }
    const rivalChamp = (state.worldPool[wc.id] || []).find(f => f.champion);
    if (rivalChamp) {
      const promo = RIVAL_PROMOTIONS.find(p => p.id === rivalChamp.promotionId);
      return { wc, status: 'rival', holder: rivalChamp, promo };
    }
    return { wc, status: 'vacant' };
  });

  return (
    <div className="fe-titles">
      <Panel title="TITLES">
        <p className="fe-hint">Win a Main Event against an OVR 11+ contender in a division you don't already hold to claim its belt.</p>
        <div className="fe-champ-list">
          {rows.map(({ wc, status, holder, defenses, promo }) => {
            const poachCost = status === 'rival' && holder ? Math.round(holder.purseFloor * POACH_COST_MULTIPLIER) : 0;
            return (
              <div key={wc.id} className="fe-champ-row">
                <WeightPill id={wc.id} />
                {status === 'vacant' && <span className="fe-empty">Vacant</span>}
                {holder && (
                  <>
                    <Avatar fighter={holder} size={26} champion />
                    <Flag nationality={holder.nationality} />
                    <FighterNameButton fighter={holder} className="fe-boxer-name" />
                    <span className="fe-champ-record">{holder.record.wins}-{holder.record.losses}-{holder.record.draws}</span>
                    <Followers count={holder.followers} />
                    {status === 'yours' ? (
                      <span className="fe-champ-promo fe-gold">Your belt · {defenses} defense{defenses === 1 ? '' : 's'}</span>
                    ) : (
                      <>
                        <span className="fe-champ-promo" style={{ color: promo?.color }} title={promo?.name}>{promo?.name}</span>
                        <Button
                          variant="secondary"
                          className="fe-scout-sign-btn"
                          onClick={() => poach(holder.id)}
                          disabled={state.funds < poachCost || rosterFull}
                        >
                          Poach (${poachCost.toLocaleString()})
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
