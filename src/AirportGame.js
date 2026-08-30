import React, { useEffect, useReducer, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { gameReducer, initialState } from './game/engine';
import AirportMap from './components/AirportMap';
import Sidebar from './components/Sidebar';
import HUD from './components/HUD';
import { colors } from './theme';

export default function AirportGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState);
  const [showHelp, setShowHelp] = useState(true);

  useEffect(() => {
    if (state.paused || state.gameOver) return undefined;
    const ms = 1000 / state.speed;
    const id = setInterval(() => dispatch({ type: 'TICK' }), ms);
    return () => clearInterval(id);
  }, [state.speed, state.paused, state.gameOver]);

  return (
    <View style={styles.app}>
      <HUD
        state={state}
        onSetSpeed={(speed) => dispatch({ type: 'SET_SPEED', speed })}
        onTogglePause={() => dispatch({ type: 'TOGGLE_PAUSE' })}
        onRestart={() => dispatch({ type: 'RESTART' })}
      />

      {showHelp && (
        <View style={styles.helpBanner}>
          <Text style={styles.helpText}>
            <Text style={styles.helpBold}>How to play: </Text>
            Tap an approaching plane, then tap the runway to land it. Tap an idle crew (⛽ fuel / 🧳 ramp),
            then tap the plane's gate to speed up its turnaround. Once a plane is ready, select it and tap
            the runway again to send it off. Keep reputation up and don't let planes divert!
          </Text>
          <Pressable style={styles.helpClose} onPress={() => setShowHelp(false)}>
            <Text style={styles.helpCloseText}>✕</Text>
          </Pressable>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
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
      </ScrollView>

      <Modal visible={state.gameOver} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.gameOverCard}>
            <Text style={styles.gameOverTitle}>Airport Grounded</Text>
            <Text style={styles.gameOverText}>Reputation collapsed after too many diversions.</Text>
            <Text style={styles.gameOverText}>
              Flights completed: {state.stats.completed} · Diverted: {state.stats.diverted} · Final money: $
              {state.money}
            </Text>
            <Pressable style={styles.restartBtn} onPress={() => dispatch({ type: 'RESTART' })}>
              <Text style={styles.restartBtnText}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 12,
  },
  helpBanner: {
    backgroundColor: '#12324a',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingRight: 30,
  },
  helpText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  helpBold: {
    fontWeight: '700',
  },
  helpClose: {
    position: 'absolute',
    right: 10,
    top: 8,
    padding: 4,
  },
  helpCloseText: {
    color: colors.muted,
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5,10,15,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  gameOverCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    maxWidth: 360,
    gap: 8,
  },
  gameOverTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  gameOverText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  restartBtn: {
    marginTop: 10,
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
  },
  restartBtnText: {
    color: '#06222f',
    fontWeight: '700',
  },
});
