import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme';

function Btn({ label, active, danger, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.btn, active && styles.btnActive, danger && styles.btnDanger]}
    >
      <Text style={[styles.btnText, active && styles.btnTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function HUD({ state, onSetSpeed, onTogglePause, onRestart }) {
  const { money, reputation, day, tick, speed, paused, gameOver, stats } = state;
  return (
    <View style={styles.hud}>
      <Text style={styles.title}>🛫 Flip Airport</Text>
      <View style={styles.statsRow}>
        <Text style={styles.stat}>💰 ${money}</Text>
        <Text style={styles.stat}>⭐ {reputation}%</Text>
        <Text style={styles.stat}>📅 Day {day}</Text>
        <Text style={styles.statMuted}>
          ✅ {stats.completed} · 🚨 {stats.diverted} · t{tick}
        </Text>
      </View>
      <View style={styles.controlsRow}>
        {!gameOver && (
          <>
            <Btn label={paused ? '▶ Resume' : '⏸ Pause'} active={paused} onPress={onTogglePause} />
            {[1, 2, 3].map((s) => (
              <Btn key={s} label={`${s}x`} active={speed === s} onPress={() => onSetSpeed(s)} />
            ))}
          </>
        )}
        <Btn label="⟲ Restart" danger onPress={onRestart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: {
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  stat: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  statMuted: {
    color: colors.muted,
    fontSize: 13,
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  btn: {
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  btnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  btnDanger: {
    borderColor: colors.bad,
  },
  btnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  btnTextActive: {
    color: '#06222f',
  },
});
