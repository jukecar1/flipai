import React from 'react';
import { GameProvider, useGameState } from './context/GameContext';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import StartScreen from './screens/StartScreen';
import CreateCareer from './screens/CreateCareer';
import Hub from './screens/Hub';
import Roster from './screens/Roster';
import MakeFights from './screens/MakeFights';
import Rankings from './screens/Rankings';
import Promotions from './screens/Promotions';
import News from './screens/News';
import FightSim from './screens/FightSim';
import FightResult from './screens/FightResult';
import './styles/fightEmpire.css';

function Router() {
  const state = useGameState();
  const screen = state.ui.screen;

  if (screen === 'start') return <StartScreen />;
  if (screen.startsWith('create-')) {
    const slot = Number(screen.split('-')[1]);
    return <CreateCareer slot={slot} />;
  }

  const inFightSim = screen === 'fightSim';

  return (
    <div className="fe-app-shell">
      <Sidebar />
      <div className="fe-main">
        <TopBar showAdvance={!inFightSim} />
        <div className="fe-content">
          {screen === 'hub' && <Hub />}
          {screen === 'roster' && <Roster />}
          {screen === 'makeFights' && <MakeFights />}
          {screen === 'rankings' && <Rankings />}
          {screen === 'promotions' && <Promotions />}
          {screen === 'news' && <News />}
          {screen === 'fightSim' && <FightSim />}
          {screen === 'fightResult' && <FightResult />}
        </div>
      </div>
    </div>
  );
}

function RotateOverlay() {
  // Fight Empire is designed to be played in landscape (the native iOS
  // build is locked to it). On a touch device held in portrait, this
  // overlay covers the game with a "rotate" prompt — pure CSS driven, see
  // .fe-rotate-overlay in styles/fightEmpire.css.
  return (
    <div className="fe-rotate-overlay">
      <div className="fe-rotate-icon">📱</div>
      <div className="fe-rotate-text">Rotate your device to play Fight Empire</div>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <RotateOverlay />
      <Router />
    </GameProvider>
  );
}
