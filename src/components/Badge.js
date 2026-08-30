import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

const TONES = {
  good: { border: colors.good, text: colors.good },
  warn: { border: colors.warn, text: colors.warn },
  bad: { border: colors.bad, text: colors.bad },
  muted: { border: colors.mutedDark, text: colors.muted },
  accent: { border: colors.accent, text: colors.accent },
};

export default function Badge({ label, tone = 'muted', style }) {
  const t = TONES[tone] || TONES.muted;
  return (
    <View style={[styles.badge, { borderColor: t.border }, style]}>
      <Text style={[styles.text, { color: t.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
