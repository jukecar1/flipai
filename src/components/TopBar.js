import React from 'react';
import { useGameState, useGameDispatch, persistCurrentState } from '../context/GameContext';
import { Button } from './UI';

export default function TopBar({ showAdvance = true }) {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const { meta, week, funds, record } = state;

  const advance = () => {
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
      </div>
      {showAdvance && (
        <Button variant="advance" onClick={advance}>
          Advance Week
        </Button>
      )}
    </div>
  );
}
