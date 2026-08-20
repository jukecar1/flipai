import React from 'react';
import { useGameState, useGameActions } from '../context/GameContext';
import { prestigeTierLabel } from '../game/gameReducer';
import { Panel, Button } from '../components/UI';

export default function GameOver() {
  const state = useGameState();
  const { backToStart } = useGameActions();

  return (
    <div className="fe-start-screen">
      <Panel title="PROMOTION CLOSED" className="fe-create-panel">
        <p className="fe-hint">
          {state.meta.promotionName} has run out of money and can't cover the bills — the bank has shut you down
          after too many weeks in the red.
        </p>
        <div className="fe-gameover-stats">
          <div><span>Final record</span><strong>{state.record.wins}-{state.record.losses}-{state.record.draws}</strong></div>
          <div><span>Weeks in business</span><strong>{state.week}</strong></div>
          <div><span>Peak reputation</span><strong>{prestigeTierLabel(state.prestige)}</strong></div>
          <div><span>Titles won</span><strong>{state.meta.titlesWon || 0}</strong></div>
          <div><span>Total earnings</span><strong>${(state.meta.totalEarnings || 0).toLocaleString()}</strong></div>
        </div>
        <div className="fe-row-actions">
          <Button variant="advance" onClick={backToStart}>Back to Start</Button>
        </div>
      </Panel>
    </div>
  );
}
