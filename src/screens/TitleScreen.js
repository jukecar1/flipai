import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { formatDate, formatMoney } from '../game/data';

export default function TitleScreen({ saveSummary, onContinue, onNewGame, onDeleteSave }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Ionicons name="airplane" size={40} color={colors.accent} />
        </View>
        <Text style={styles.title}>FLIP AIRWAYS</Text>
        <Text style={styles.subtitle}>Build and run your own airline</Text>
      </View>

      <View style={styles.menu}>
        {saveSummary && (
          <Pressable style={styles.continueCard} onPress={onContinue}>
            <View>
              <Text style={styles.continueTitle}>Continue</Text>
              <Text style={styles.continueSub}>{saveSummary.name}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.continueMeta}>{formatDate(saveSummary.dateIso)}</Text>
              <Text style={styles.continueMeta}>
                ✈️ {saveSummary.aircraftCount} · {formatMoney(saveSummary.cash, { short: true })}
              </Text>
            </View>
          </Pressable>
        )}

        <Pressable style={styles.menuBtn} onPress={onNewGame}>
          <Ionicons name="add-circle-outline" size={18} color={colors.text} />
          <Text style={styles.menuBtnText}>New Game</Text>
        </Pressable>

        {saveSummary && (
          <Pressable style={styles.deleteBtn} onPress={onDeleteSave}>
            <Text style={styles.deleteText}>Delete save</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.navy,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  hero: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 6,
  },
  menu: {
    gap: 12,
  },
  continueCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  continueTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  continueSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  continueMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingVertical: 15,
  },
  menuBtnText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  deleteText: {
    color: colors.mutedDark,
    fontSize: 12,
  },
});
