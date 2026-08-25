import React, { useEffect, useState } from 'react';
import { GameProvider, useGameState } from './context/GameContext';
import { FighterProfileProvider, useFighterProfile } from './context/FighterProfileContext';
import FighterProfileScreen from './screens/FighterProfile';
import LoadingScreen from './screens/LoadingScreen';
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
import Chirp from './screens/Chirp';
import FightSim from './screens/FightSim';
import FightResult from './screens/FightResult';
import Gyms from './screens/Gyms';
import Titles from './screens/Titles';
import Bouts from './screens/Bouts';
import HallOfFame from './screens/HallOfFame';
import Amateurs from './screens/Amateurs';
import Leaderboards from './screens/Leaderboards';
import GameOver from './screens/GameOver';
import CareerStats from './screens/CareerStats';
import Settings from './screens/Settings';
import './styles/fightEmpire.css';

function Router() {
  const state = useGameState();
  const screen = state.ui.screen;
  const { fighterId, close: closeFighterProfile } = useFighterProfile();

  // A fighter profile is its own screen, not tied to state.ui.screen — it
  // just covers whatever screen is underneath. Navigating anywhere else
  // (sidebar, a "Back" button that changes screen, etc.) should drop it
  // rather than leave it stuck on top of the new screen.
  useEffect(() => { closeFighterProfile(); }, [screen, closeFighterProfile]);

  if (screen === 'start') return <StartScreen />;
  if (screen.startsWith('create-')) {
    const slot = Number(screen.split('-')[1]);
    return <CreateCareer slot={slot} />;
  }
  if (screen === 'gameOver') return <GameOver />;

  const inFightSim = screen === 'fightSim';

  return (
    <div className="fe-app-shell">
      <Sidebar />
      <div className="fe-main">
        <TopBar showAdvance={!inFightSim} />
        <div className="fe-content">
          {fighterId ? <FighterProfileScreen /> : (
            <>
              {screen === 'hub' && <Hub />}
              {screen === 'roster' && <Roster />}
              {screen === 'makeFights' && <MakeFights />}
              {screen === 'rankings' && <Rankings />}
              {screen === 'promotions' && <Promotions />}
              {screen === 'news' && <News />}
              {screen === 'chirp' && <Chirp />}
              {screen === 'fightSim' && <FightSim />}
              {screen === 'fightResult' && <FightResult />}
              {screen === 'gyms' && <Gyms />}
              {screen === 'titles' && <Titles />}
              {screen === 'bouts' && <Bouts />}
              {screen === 'hallOfFame' && <HallOfFame />}
              {screen === 'amateurs' && <Amateurs />}
              {screen === 'leaderboards' && <Leaderboards />}
              {screen === 'careerStats' && <CareerStats />}
              {screen === 'settings' && <Settings />}
            </>
          )}
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

// A one-time branded splash on cold open, ahead of anything else — the
// game boots instantly (everything's local), so this is a deliberate
// beat rather than an actual load, timed to feel like a real app
// starting up instead of a blank-then-flash. Skipped in tests (no
// timers) so it never has to be waited out to see the real screen.
const BOOT_DELAY_MS = process.env.NODE_ENV === 'test' ? 0 : 1400;

export default function App() {
  const [booting, setBooting] = useState(BOOT_DELAY_MS > 0);

  useEffect(() => {
    if (BOOT_DELAY_MS === 0) return undefined;
    const timer = setTimeout(() => setBooting(false), BOOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  if (booting) return <LoadingScreen />;

  return (
    <GameProvider>
      <FighterProfileProvider>
        <RotateOverlay />
        <Router />
      </FighterProfileProvider>
    </GameProvider>
  );
}
