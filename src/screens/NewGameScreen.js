import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';
import { BRAND_COLORS } from '../game/data';
import { codesFromName } from '../game/engine';

export default function NewGameScreen({ onCancel, onStart }) {
  const [name, setName] = useState('New Airways');
  const [color, setColor] = useState(BRAND_COLORS[0]);
  const codes = useMemo(() => codesFromName(name), [name]);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={onCancel}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>New Game</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>Airline Identity</Text>
        <View style={styles.card}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Airline name"
            placeholderTextColor={colors.mutedDark}
            style={styles.input}
          />
          <View style={styles.codesRow}>
            <View style={styles.codeCol}>
              <Text style={styles.codeLabel}>IATA Code</Text>
              <Text style={styles.codeValue}>{codes.iata}</Text>
            </View>
            <View style={styles.codeCol}>
              <Text style={styles.codeLabel}>ICAO Code</Text>
              <Text style={styles.codeValue}>{codes.icao}</Text>
            </View>
            <View style={styles.codeCol}>
              <Text style={styles.codeLabel}>Radio Callsign</Text>
              <Text style={styles.codeValue}>{codes.callsign}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Brand Color</Text>
        <View style={styles.card}>
          <View style={styles.colorGrid}>
            {BRAND_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
              />
            ))}
          </View>
        </View>

        <Text style={styles.hint}>
          You'll start with $60M and one E195 to get your first route off the ground.
        </Text>
      </ScrollView>

      <Pressable style={styles.startBtn} onPress={() => onStart(name.trim() || 'New Airways', color)}>
        <Text style={styles.startBtnText}>Start Airline</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancel: {
    color: colors.textDim,
    fontSize: 15,
    width: 50,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  scroll: {
    padding: 16,
    gap: 8,
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: 10,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
  },
  input: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12,
  },
  codesRow: {
    flexDirection: 'row',
    gap: 20,
  },
  codeCol: {
    flex: 1,
  },
  codeLabel: {
    color: colors.mutedDark,
    fontSize: 10.5,
    marginBottom: 2,
  },
  codeValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
    textAlign: 'center',
  },
  startBtn: {
    margin: 16,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 15,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
