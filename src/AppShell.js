import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from './theme';
import { SCREEN_TITLES } from './navConfig';
import { saveGame } from './game/storage';
import TopBar from './components/TopBar';
import Drawer from './components/Drawer';
import DashboardScreen from './screens/DashboardScreen';
import FleetScreen from './screens/FleetScreen';
import RoutesScreen from './screens/RoutesScreen';
import FinancesScreen from './screens/FinancesScreen';
import PlaceholderScreen from './screens/PlaceholderScreen';

const BUILT_SCREENS = {
  dashboard: DashboardScreen,
  fleet: FleetScreen,
  routes: RoutesScreen,
  finances: FinancesScreen,
};

export default function AppShell({ state, dispatch, onExit }) {
  const [screen, setScreen] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('now');

  useEffect(() => {
    saveGame(state).then(() => setSaveStatus('now'));
  }, [state]);

  const Screen = BUILT_SCREENS[screen];
  const aircraftCount = Object.keys(state.aircraft).length;
  const routeCount = Object.keys(state.routes).length;

  return (
    <View style={styles.wrap}>
      <TopBar
        title={SCREEN_TITLES[screen] || 'Flip Airways'}
        onMenuPress={() => setDrawerOpen(true)}
        dateIso={state.dateIso}
        cash={state.cash}
        onNextWeek={() => dispatch({ type: 'NEXT_WEEK' })}
      />

      <View style={{ flex: 1 }}>
        {Screen ? (
          <Screen state={state} dispatch={dispatch} />
        ) : (
          <PlaceholderScreen label={SCREEN_TITLES[screen] || 'Coming soon'} />
        )}
      </View>

      <Drawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        current={screen}
        onNavigate={(key) => {
          setScreen(key);
          setDrawerOpen(false);
        }}
        meta={state.meta}
        counts={{ aircraft: aircraftCount, routes: routeCount }}
        saveStatus={saveStatus}
        onSave={() => saveGame(state).then(() => setSaveStatus('now'))}
        onExit={() => {
          setDrawerOpen(false);
          onExit();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
