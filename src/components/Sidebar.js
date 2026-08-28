import React from 'react';
import { useGameActions, useGameState } from '../context/GameContext';
import {
  HomeIcon, RosterIcon, FightsIcon, RankingsIcon, PromotionsIcon, NewsIcon,
  GymsIcon, TitlesIcon, BoutsIcon, HallOfFameIcon, AmateursIcon, LeaderboardsIcon,
  StatsIcon, SettingsIcon, ChirpIcon,
} from './icons';
import Logomark from './Logomark';

const NAV_ITEMS = [
  { id: 'hub', label: 'Hub', Icon: HomeIcon },
  { id: 'roster', label: 'Roster', Icon: RosterIcon },
  { id: 'makeFights', label: 'Make Fights', Icon: FightsIcon },
  { id: 'gyms', label: 'Gyms', Icon: GymsIcon },
  { id: 'titles', label: 'Titles', Icon: TitlesIcon },
  { id: 'rankings', label: 'Rankings', Icon: RankingsIcon },
  { id: 'bouts', label: 'Bouts', Icon: BoutsIcon },
  { id: 'news', label: 'News', Icon: NewsIcon },
  { id: 'chirp', label: 'Chirp', Icon: ChirpIcon },
  { id: 'hallOfFame', label: 'Hall of Fame', Icon: HallOfFameIcon },
  { id: 'amateurs', label: 'Amateurs', Icon: AmateursIcon },
  { id: 'leaderboards', label: 'Leaderboards', Icon: LeaderboardsIcon },
  { id: 'promotions', label: 'Promotions', Icon: PromotionsIcon },
];

export default function Sidebar() {
  const { goTo, backToStart } = useGameActions();
  const state = useGameState();
  const active = state.ui.screen;

  return (
    <div className="fe-sidebar">
      <div className="fe-logo">
        <Logomark size={36} />
        <span className="fe-logo-text">FIGHT<br />EMPIRE</span>
      </div>
      <nav>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`fe-nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => goTo(item.id)}
            title={item.label}
          >
            <span className="fe-nav-icon"><item.Icon /></span>
            <span className="fe-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="fe-sidebar-footer">
        <button className={`fe-nav-item ${active === 'careerStats' ? 'active' : ''}`} onClick={() => goTo('careerStats')} title="Career Stats">
          <span className="fe-nav-icon"><StatsIcon /></span>
          <span className="fe-nav-label">Career Stats</span>
        </button>
        <button className={`fe-nav-item ${active === 'settings' ? 'active' : ''}`} onClick={() => goTo('settings')} title="Settings">
          <span className="fe-nav-icon"><SettingsIcon /></span>
          <span className="fe-nav-label">Settings</span>
        </button>
        <button className="fe-nav-item fe-nav-quit" onClick={backToStart} title="Save & Exit">
          <span className="fe-nav-label">Save &amp; Exit</span>
        </button>
      </div>
    </div>
  );
}
