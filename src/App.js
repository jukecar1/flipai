import React, { useEffect, useReducer, useState } from 'react';
import './App.css';
import { gameReducer, initialState } from './game/engine';
import AirportMap from './components/AirportMap';
import Sidebar from './components/Sidebar';
import HUD from './components/HUD';

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState);
  const [showHelp, setShowHelp] = useState(true);

  useEffect(() => {
    if (state.paused || state.gameOver) return undefined;
    const ms = 1000 / state.speed;
    const id = setInterval(() => dispatch({ type: 'TICK' }), ms);
    return () => clearInterval(id);
  }, [state.speed, state.paused, state.gameOver]);

  return (
    <div className="app" onClick={() => dispatch({ type: 'DESELECT' })}>
      <HUD
        state={state}
        onSetSpeed={(speed) => dispatch({ type: 'SET_SPEED', speed })}
        onTogglePause={() => dispatch({ type: 'TOGGLE_PAUSE' })}
        onRestart={() => dispatch({ type: 'RESTART' })}
      />

      {showHelp && (
        <div className="help-banner" onClick={(e) => e.stopPropagation()}>
          <b>How to play:</b> Click an approaching plane, then click the runway to land it. Click an idle
          crew (⛽ fuel / 🧳 ramp), then click the plane's gate to speed up its turnaround. Once a plane is
          ready, select it and click the runway again to send it off. Keep reputation up and don't let
          planes divert!
          <button className="help-close" onClick={() => setShowHelp(false)}>
            ✕
          </button>
        </div>
      )}

      <div className="main-area" onClick={(e) => e.stopPropagation()}>
        <AirportMap
          state={state}
          onSelectPlane={(id) => dispatch({ type: 'SELECT_PLANE', id })}
          onClickGate={(gateId) => dispatch({ type: 'CLICK_GATE', gateId })}
          onClickRunway={() => dispatch({ type: 'CLICK_RUNWAY' })}
        />
        <Sidebar
          state={state}
          onSelectPlane={(id) => dispatch({ type: 'SELECT_PLANE', id })}
          onSelectCrew={(id) => dispatch({ type: 'SELECT_CREW', id })}
          onUnassignCrew={(id) => dispatch({ type: 'UNASSIGN_CREW', id })}
          onBuyGate={() => dispatch({ type: 'BUY_GATE' })}
          onBuyCrew={() => dispatch({ type: 'BUY_CREW' })}
        />
      </div>

      {state.gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <h2>Airport Grounded</h2>
            <p>Reputation collapsed after too many diversions.</p>
            <p>
              Flights completed: <b>{state.stats.completed}</b> · Diverted: <b>{state.stats.diverted}</b> · Final
              money: <b>${state.money}</b>
            </p>
            <button onClick={() => dispatch({ type: 'RESTART' })}>Try Again</button>
          </div>
        </div>
      )}
    </div>
  );
}
