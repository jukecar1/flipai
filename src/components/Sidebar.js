import React from 'react';
import { useGameActions, useGameState } from '../context/GameContext';
import { HomeIcon, RosterIcon, FightsIcon, RankingsIcon, PromotionsIcon, NewsIcon } from './icons';

const NAV_ITEMS = [
  { id: 'hub', label: 'Hub', Icon: HomeIcon },
  { id: 'roster', label: 'Roster', Icon: RosterIcon },
  { id: 'makeFights', label: 'Make Fights', Icon: FightsIcon },
  { id: 'rankings', label: 'Rankings', Icon: RankingsIcon },
  { id: 'promotions', label: 'Promotions', Icon: PromotionsIcon },
  { id: 'news', label: 'News', Icon: NewsIcon },
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
            <span className="fe-nav-icon"><item.Icon /></span>
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
