import React from 'react';
import { useGameActions, useGameState } from '../context/GameContext';

const NAV_ITEMS = [
  { id: 'hub', label: 'Hub' },
  { id: 'roster', label: 'Roster' },
  { id: 'makeFights', label: 'Make Fights' },
  { id: 'rankings', label: 'Rankings' },
  { id: 'promotions', label: 'Promotions' },
  { id: 'news', label: 'News' },
];

export default function Sidebar() {
  const { goTo, backToStart } = useGameActions();
  const state = useGameState();
  const active = state.ui.screen;

  return (
    <div className="fe-sidebar">
      <div className="fe-logo">
        <span className="fe-logo-fe">FE</span>
        <span className="fe-logo-text">FIGHT<br />EMPIRE</span>
      </div>
      <nav>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`fe-nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => goTo(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="fe-sidebar-footer">
        <button className="fe-nav-item fe-nav-quit" onClick={backToStart}>
          Save &amp; Exit
        </button>
      </div>
    </div>
  );
}
