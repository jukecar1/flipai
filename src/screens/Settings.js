import React from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext';
import { Panel, Button } from '../components/UI';

export default function Settings() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  const toggleAutoSkip = () => dispatch({ type: 'TOGGLE_AUTO_SKIP' });

  return (
    <div className="fe-settings">
      <Panel title="SETTINGS">
        <div className="fe-settings-row">
          <div>
            <strong>Auto-skip fight animations</strong>
            <p className="fe-hint">Jump straight to the result screen instead of watching the round-by-round sim play out.</p>
          </div>
          <Button variant={state.meta.autoSkipFights ? 'advance' : 'secondary'} onClick={toggleAutoSkip}>
            {state.meta.autoSkipFights ? 'On' : 'Off'}
          </Button>
        </div>
      </Panel>

      <Panel title="ABOUT">
        <p className="fe-hint">
          Fight Empire — build an MMA promotion, sign and train fighters, book cards, and compete against the
          sport's rival organizations. All progress saves locally to this device.
        </p>
      </Panel>
    </div>
  );
}
