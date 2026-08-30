import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { formatMoney } from '../game/data';
import Badge from './Badge';

export default function AircraftDetailModal({ visible, aircraft, route, onClose, onUnassign, onSell }) {
  if (!aircraft) return null;
  const tone = aircraft.status === 'active' ? (aircraft.routeId ? 'good' : 'muted') : 'warn';
  const label = aircraft.status === 'active' ? (aircraft.routeId ? 'ACTIVE' : 'IDLE') : 'IN MAINTENANCE';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.tail}>{aircraft.tail}</Text>
              <Text style={styles.type}>{aircraft.type?.name}</Text>
            </View>
            <Badge label={label} tone={tone} />
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{Math.round(aircraft.totalHours).toLocaleString()}h</Text>
              <Text style={styles.statLabel}>Total hours</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{aircraft.cycles.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Cycles</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{(aircraft.ageWeeks / 52).toFixed(1)}y</Text>
              <Text style={styles.statLabel}>Age</Text>
            </View>
          </View>

          <Text style={styles.checkText}>
            Next check in {Math.max(0, Math.round(aircraft.type.checkIntervalHours - aircraft.hoursSinceCheck))}h flown
          </Text>

          <Text style={styles.routeText}>
            {route ? `Flying ${route.origin} → ${route.destination}, ${route.frequency}x/week` : 'Not assigned to a route'}
          </Text>

          <View style={styles.actions}>
            {route && (
              <Pressable style={styles.actionBtn} onPress={onUnassign}>
                <Text style={styles.actionText}>Remove from route</Text>
              </Pressable>
            )}
            <Pressable style={[styles.actionBtn, styles.sellBtn]} onPress={onSell}>
              <Text style={[styles.actionText, styles.sellText]}>
                Sell for {formatMoney(Math.round((aircraft.type?.price || 0) * 0.5))}
              </Text>
            </Pressable>
          </View>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={colors.muted} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.bgAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  tail: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  type: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 3,
  },
  checkText: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 6,
  },
  routeText: {
    color: colors.textDim,
    fontSize: 13,
    marginBottom: 16,
  },
  actions: {
    gap: 8,
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingVertical: 11,
    alignItems: 'center',
  },
  sellBtn: {
    borderColor: colors.bad,
  },
  actionText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  sellText: {
    color: colors.bad,
  },
  closeBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
});
