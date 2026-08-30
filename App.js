import React, { useEffect, useReducer, useState } from 'react';
import { SafeAreaView, StyleSheet, Platform, StatusBar as RNStatusBar, ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { gameReducer } from './src/game/engine';
import { loadGame, clearSave } from './src/game/storage';
import { colors } from './src/theme';
import TitleScreen from './src/screens/TitleScreen';
import NewGameScreen from './src/screens/NewGameScreen';
import AppShell from './src/AppShell';

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, null);
  const [view, setView] = useState('loading'); // loading | title | newGame | game

  useEffect(() => {
    loadGame().then((saved) => {
      if (saved) dispatch({ type: 'LOAD_STATE', state: saved });
      setView('title');
    });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      {view === 'loading' && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {view === 'title' && (
        <TitleScreen
          saveSummary={
            state
              ? {
                  name: state.meta.name,
                  dateIso: state.dateIso,
                  aircraftCount: Object.keys(state.aircraft).length,
                  cash: state.cash,
                }
              : null
          }
          onContinue={() => setView('game')}
          onNewGame={() => setView('newGame')}
          onDeleteSave={async () => {
            await clearSave();
            dispatch({ type: 'LOAD_STATE', state: null });
          }}
        />
      )}

      {view === 'newGame' && (
        <NewGameScreen
          onCancel={() => setView('title')}
          onStart={(name, color) => {
            dispatch({ type: 'NEW_GAME', name, color });
            setView('game');
          }}
        />
      )}

      {view === 'game' && state && (
        <AppShell state={state} dispatch={dispatch} onExit={() => setView('title')} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
