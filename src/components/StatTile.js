import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

export default function StatTile({ label, value, tone = 'default', small }) {
  const valueColor =
    tone === 'good' ? colors.good : tone === 'bad' ? colors.bad : tone === 'warn' ? colors.warn : colors.text;
  return (
    <View style={[styles.tile, small && styles.tileSmall]}>
      <Text style={[styles.value, { color: valueColor }, small && styles.valueSmall]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
    minWidth: 0,
  },
  tileSmall: {
    paddingVertical: 9,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
  },
  valueSmall: {
    fontSize: 17,
  },
  label: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.muted,
    textTransform: 'uppercase',
  },
});
