import React from 'react';
import { useGameState } from '../context/GameContext';
import { WEIGHT_CLASSES, RIVAL_PROMOTIONS } from '../game/constants';
import { Panel, WeightPill, Flag, Avatar, Followers } from '../components/UI';

export default function Titles() {
  const state = useGameState();

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
          {rows.map(({ wc, status, holder, defenses, promo }) => (
            <div key={wc.id} className="fe-champ-row">
              <WeightPill id={wc.id} />
              {status === 'vacant' && <span className="fe-empty">Vacant</span>}
              {holder && (
                <>
                  <Avatar fighter={holder} size={26} champion />
                  <Flag nationality={holder.nationality} />
                  <span className="fe-boxer-name" title={holder.name}>{holder.name}</span>
                  <span className="fe-champ-record">{holder.record.wins}-{holder.record.losses}-{holder.record.draws}</span>
                  <Followers count={holder.followers} />
                  {status === 'yours' ? (
                    <span className="fe-champ-promo fe-gold">Your belt · {defenses} defense{defenses === 1 ? '' : 's'}</span>
                  ) : (
                    <span className="fe-champ-promo" style={{ color: promo?.color }}>{promo?.name}</span>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
