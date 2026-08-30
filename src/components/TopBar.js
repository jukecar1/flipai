import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { formatDate, formatMoney } from '../game/data';

export default function TopBar({ title, onMenuPress, dateIso, cash, onNextWeek, badge }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Pressable style={styles.menuBtn} onPress={onMenuPress}>
          <Ionicons name="menu" size={20} color={colors.text} />
          {badge ? <View style={styles.badgeDot} /> : null}
        </Pressable>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.dateRow}>
        <Text style={styles.date}>{formatDate(dateIso)}</Text>
        <View style={styles.cashWrap}>
          <Text style={styles.cashLabel}>Cash </Text>
          <Text style={styles.cashValue}>{formatMoney(cash)}</Text>
        </View>
        <Pressable style={styles.nextBtn} onPress={onNextWeek}>
          <Ionicons name="play-skip-forward" size={13} color={colors.text} />
          <Text style={styles.nextBtnText}>Next Week</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: 5,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.bad,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    color: colors.textDim,
    fontSize: 13,
  },
  cashWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  cashLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  cashValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  nextBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
});
