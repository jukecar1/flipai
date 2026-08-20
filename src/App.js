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
          {screen === 'news' && <News />}
          {screen === 'fightSim' && <FightSim />}
          {screen === 'fightResult' && <FightResult />}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Router />
    </GameProvider>
  );
}
