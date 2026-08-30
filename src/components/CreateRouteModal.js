import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { AIRPORTS, distanceKm, HOME_AIRPORT } from '../game/data';

const FREQUENCIES = [
  { label: 'Daily', value: 7 },
  { label: '4x/week', value: 4 },
  { label: '2x/week', value: 2 },
  { label: 'Weekly', value: 1 },
];

function ChipRow({ options, value, onChange, getLabel, getKey }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((opt) => {
        const active = getKey(opt) === value;
        return (
          <Pressable
            key={getKey(opt)}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(getKey(opt))}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{getLabel(opt)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function CreateRouteModal({ visible, onClose, onCreate, unassignedAircraft }) {
  const [origin, setOrigin] = useState(HOME_AIRPORT);
  const [destination, setDestination] = useState(null);
  const [aircraftId, setAircraftId] = useState(null);
  const [frequency, setFrequency] = useState(7);

  useEffect(() => {
    if (visible) {
      setOrigin(HOME_AIRPORT);
      setDestination(null);
      setAircraftId(unassignedAircraft[0]?.id || null);
      setFrequency(7);
    }
  }, [visible]);

  const destinations = AIRPORTS.filter((a) => a.code !== origin);
  const dist = destination ? distanceKm(origin, destination) : 0;
  const canCreate = origin && destination && origin !== destination;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>New Route</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 16, gap: 16 }}>
            <View>
              <Text style={styles.label}>From</Text>
              <ChipRow
                options={AIRPORTS}
                value={origin}
                onChange={setOrigin}
                getKey={(a) => a.code}
                getLabel={(a) => `${a.code} · ${a.city}`}
              />
            </View>

            <View>
              <Text style={styles.label}>To</Text>
              <ChipRow
                options={destinations}
                value={destination}
                onChange={setDestination}
                getKey={(a) => a.code}
                getLabel={(a) => `${a.code} · ${a.city}`}
              />
              {dist > 0 && <Text style={styles.hint}>{dist.toLocaleString()} km</Text>}
            </View>

            <View>
              <Text style={styles.label}>Aircraft</Text>
              {unassignedAircraft.length === 0 ? (
                <Text style={styles.hint}>No idle aircraft available — buy one or free one up from another route.</Text>
              ) : (
                <ChipRow
                  options={unassignedAircraft}
                  value={aircraftId}
                  onChange={setAircraftId}
                  getKey={(a) => a.id}
                  getLabel={(a) => `${a.tail} · ${a.type.name}`}
                />
              )}
            </View>

            <View>
              <Text style={styles.label}>Frequency</Text>
              <ChipRow
                options={FREQUENCIES}
                value={frequency}
                onChange={setFrequency}
                getKey={(f) => f.value}
                getLabel={(f) => f.label}
              />
            </View>

            <Pressable
              style={[styles.createBtn, !canCreate && styles.createBtnDisabled]}
              disabled={!canCreate}
              onPress={() => onCreate({ origin, destination, aircraftId, frequency })}
            >
              <Text style={styles.createBtnText}>Create Route</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgAlt,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  hint: {
    color: colors.mutedDark,
    fontSize: 11.5,
    marginTop: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.panel,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textDim,
    fontSize: 12.5,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  createBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  createBtnDisabled: {
    opacity: 0.4,
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
