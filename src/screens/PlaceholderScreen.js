import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

export default function PlaceholderScreen({ label, icon = 'construct-outline' }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <Ionicons name={icon} size={30} color={colors.muted} />
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.body}>
          This part of the airline isn't built yet — it's here so the full nav feels right while the
          core loop (fleet, routes, finances) gets play-tested first.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 14,
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
