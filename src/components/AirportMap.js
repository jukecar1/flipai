import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme';

function TaskBar({ label, task }) {
  const pct = task.total ? Math.round(((task.total - task.remaining) / task.total) * 100) : 100;
  return (
    <View style={styles.taskBarRow}>
      <Text style={styles.taskLabel}>{label}</Text>
      <View style={styles.taskTrack}>
        <View style={[styles.taskFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

function GatePlane({ plane, selected, onSelect, crews }) {
  const fuelCrew = crews.some((c) => c.gateId === plane.gateId && c.type === 'fuel');
  const rampCrew = crews.some((c) => c.gateId === plane.gateId && c.type === 'ramp');
  const ready = plane.status === 'ready';
  return (
    <Pressable
      onPress={() => onSelect(plane.id)}
      style={[styles.gatePlane, selected && styles.gatePlaneSelected, ready && styles.gatePlaneReady]}
    >
      <View style={styles.planeRow}>
        <Text style={styles.planeCallsign}>✈️ {plane.callsign}</Text>
      </View>
      {plane.status === 'atGate' && (
        <>
          <TaskBar label={`⛽${fuelCrew ? '👷' : ''}`} task={plane.fuelTask} />
          <TaskBar label={`🧳${rampCrew ? '👷' : ''}`} task={plane.rampTask} />
        </>
      )}
      {ready && <Text style={styles.readyBadge}>READY — tap, then tap runway</Text>}
    </Pressable>
  );
}

export default function AirportMap({ state, onSelectPlane, onClickGate, onClickRunway }) {
  const { gates, planes, runway, selected } = state;
  const runwayPlane = runway.occupantId ? planes[runway.occupantId] : null;
  const waitingForGate = Object.values(planes).filter((p) => p.status === 'waitingForGate');

  return (
    <View style={styles.map}>
      <View style={styles.terminal}>
        {gates.map((g) => {
          const plane = g.planeId ? planes[g.planeId] : null;
          return (
            <Pressable key={g.id} style={styles.gate} onPress={() => onClickGate(g.id)}>
              <Text style={styles.gateLabel}>{g.id}</Text>
              <View style={styles.gateSlot}>
                {plane ? (
                  <GatePlane
                    plane={plane}
                    selected={selected?.kind === 'plane' && selected.id === plane.id}
                    onSelect={onSelectPlane}
                    crews={state.crews}
                  />
                ) : (
                  <Text style={styles.gateEmpty}>open</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {waitingForGate.length > 0 && (
        <View style={styles.taxiwayHolding}>
          <Text style={styles.taxiwayLabel}>Taxiway (waiting for gate):</Text>
          <View style={styles.taxiChips}>
            {waitingForGate.map((p) => (
              <Text key={p.id} style={styles.taxiChip}>
                ✈️ {p.callsign}
              </Text>
            ))}
          </View>
        </View>
      )}

      <Pressable
        onPress={onClickRunway}
        style={[styles.runway, runway.occupantId ? styles.runwayBusy : null]}
      >
        <View style={styles.runwayStripes} pointerEvents="none" />
        <View style={styles.runwayLabelWrap}>
          <Text style={styles.runwayLabel}>
            {runwayPlane
              ? `✈️ ${runwayPlane.callsign} — ${runway.mode === 'landing' ? 'landing' : 'departing'}`
              : 'Runway clear — tap to land/depart the selected plane'}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    backgroundColor: colors.asphalt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    gap: 14,
  },
  terminal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gate: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 8,
    minHeight: 100,
    width: '47%',
  },
  gateLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  gateSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateEmpty: {
    color: colors.muted,
    fontSize: 12,
  },
  gatePlane: {
    borderRadius: 6,
    padding: 6,
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gatePlaneSelected: {
    borderColor: colors.accent,
  },
  gatePlaneReady: {
    borderColor: colors.good,
  },
  planeRow: {
    marginBottom: 6,
  },
  planeCallsign: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  taskBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  taskLabel: {
    color: colors.text,
    fontSize: 11,
    width: 26,
  },
  taskTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#0d1a25',
    borderRadius: 4,
    overflow: 'hidden',
  },
  taskFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  readyBadge: {
    marginTop: 6,
    fontSize: 10,
    color: colors.good,
    fontWeight: '700',
  },
  taxiwayHolding: {
    gap: 4,
  },
  taxiwayLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  taxiChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  taxiChip: {
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    color: colors.text,
    fontSize: 12,
  },
  runway: {
    height: 64,
    borderRadius: 6,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  runwayBusy: {
    borderColor: colors.accent,
  },
  runwayStripes: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -20,
    right: -20,
    opacity: 0.5,
    borderStyle: 'dashed',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#555',
  },
  runwayLabelWrap: {
    backgroundColor: 'rgba(13,23,32,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  runwayLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
