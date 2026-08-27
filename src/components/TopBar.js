import React from 'react';
import { useGameState, useGameDispatch, persistCurrentState } from '../context/GameContext';
import { currentPromotionTier } from '../game/gameReducer';
import { Button } from './UI';

export default function TopBar({ showAdvance = true }) {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const { meta, week, funds, record, prestige } = state;
  const tier = currentPromotionTier(state);

  // A fight that's already on the calendar for this week has to actually
  // be fought — no skipping fight day by just clicking past it.
  const readyFight = state.scheduledFights.find(f => f.weeksOut <= 0);

  const advance = () => {
    if (readyFight) return;
    dispatch({ type: 'ADVANCE_WEEK' });
  };

  React.useEffect(() => {
    persistCurrentState(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.week, state.funds, state.roster, state.scheduledFights]);

  return (
    <div className="fe-topbar">
      <div className="fe-topbar-title">
        <h1>{meta.promotionName}</h1>
        <div className="fe-topbar-sub">
          {meta.managerName} · HQ: {meta.hq}
        </div>
      </div>
      <div className="fe-topbar-stats">
        <div>
          <span className="fe-label">Week</span>
          <span className="fe-value">{week}</span>
        </div>
        <div>
          <span className="fe-label">Funds</span>
          <span className="fe-value fe-gold">${funds.toLocaleString()}</span>
        </div>
        <div>
          <span className="fe-label">Record</span>
          <span className="fe-value">{record.wins}-{record.losses}-{record.draws}</span>
        </div>
        <button
          className="fe-topbar-tier"
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'promotions' })}
          title={`${tier.blurb} — view the full promotion ladder`}
        >
          <span className="fe-label">{tier.label}</span>
          <span className="fe-value fe-gold">{prestige} pts</span>
        </button>
      </div>
      {showAdvance && (
        <Button
          variant="advance"
          onClick={advance}
          disabled={!!readyFight}
          title={readyFight ? "You've got a fight ready to go — play it before advancing." : undefined}
        >
          {readyFight ? 'Fight Ready' : 'Advance Week'}
        </Button>
      )}
    </div>
  );
}
