import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme';

function Panel({ title, children }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ShopButton({ label, cost, disabled, onPress }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.shopBtn, disabled && styles.shopBtnDisabled]}>
      <Text style={styles.shopBtnText}>
        {label} — ${cost}
      </Text>
    </Pressable>
  );
}

function ApproachQueue({ planes, selected, onSelect }) {
  const list = Object.values(planes)
    .filter((p) => ['holding', 'landing'].includes(p.status))
    .sort((a, b) => a.fuelPatience - b.fuelPatience);

  return (
    <Panel title="Approach Queue">
      {list.length === 0 && <Text style={styles.emptyHint}>No inbound traffic right now.</Text>}
      <View style={{ gap: 6 }}>
        {list.map((p) => {
          const pct = Math.max(0, Math.round((p.fuelPatience / 45) * 100));
          const isSelected = selected?.kind === 'plane' && selected.id === p.id;
          const landing = p.status === 'landing';
          return (
            <Pressable
              key={p.id}
              disabled={landing}
              onPress={() => onSelect(p.id)}
              style={[
                styles.approachItem,
                isSelected && styles.approachItemSelected,
                p.emergency && styles.approachItemEmergency,
                landing && styles.approachItemLanding,
              ]}
            >
              <View style={styles.approachTop}>
                <Text style={styles.approachName}>✈️ {p.callsign}</Text>
                <Text style={styles.approachSize}>{p.label}</Text>
              </View>
              <View style={styles.fuelTrack}>
                <View
                  style={[
                    styles.fuelFill,
                    { width: `${pct}%` },
                    p.emergency && { backgroundColor: colors.bad },
                  ]}
                />
              </View>
              <Text style={styles.approachHint}>
                {landing ? 'Landing…' : p.emergency ? 'Low fuel — land now!' : 'Tap to select, then tap runway'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Panel>
  );
}

function CrewPanel({ crews, selected, onSelectCrew, onUnassign, onBuyCrew, crewCost, canAfford, atMax }) {
  return (
    <Panel title="Ground Crew">
      <View style={styles.crewGrid}>
        {crews.map((c) => {
          const isSelected = selected?.kind === 'crew' && selected.id === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => (c.gateId ? onUnassign(c.id) : onSelectCrew(c.id))}
              style={[
                styles.crewChip,
                c.gateId ? styles.crewChipBusy : styles.crewChipIdle,
                isSelected && styles.crewChipSelected,
              ]}
            >
              <Text style={styles.crewChipText}>
                {c.type === 'fuel' ? '⛽' : '🧳'} {c.gateId ? `@ ${c.gateId}` : 'idle'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <ShopButton label="Hire crew" cost={crewCost} disabled={!canAfford || atMax} onPress={onBuyCrew} />
    </Panel>
  );
}

function EventLog({ log }) {
  return (
    <Panel title="Event Log">
      <View style={{ gap: 4 }}>
        {log.slice(0, 20).map((entry, i) => (
          <View key={i} style={[styles.logEntry, styles[`log_${entry.kind}`]]}>
            <Text style={styles.logText}>
              <Text style={styles.logTick}>t{entry.tick} </Text>
              {entry.text}
            </Text>
          </View>
        ))}
      </View>
    </Panel>
  );
}

export default function Sidebar({ state, onSelectPlane, onSelectCrew, onUnassignCrew, onBuyGate, onBuyCrew }) {
  const { planes, selected, crews, gates, money, gateCost, crewCost } = state;
  return (
    <View style={{ gap: 12 }}>
      <ApproachQueue planes={planes} selected={selected} onSelect={onSelectPlane} />
      <CrewPanel
        crews={crews}
        selected={selected}
        onSelectCrew={onSelectCrew}
        onUnassign={onUnassignCrew}
        onBuyCrew={onBuyCrew}
        crewCost={crewCost}
        canAfford={money >= crewCost}
        atMax={crews.length >= 8}
      />
      <Panel title="Terminal">
        <Text style={styles.terminalText}>{gates.length} gates open</Text>
        <ShopButton label="Build gate" cost={gateCost} disabled={money < gateCost || gates.length >= 8} onPress={onBuyGate} />
      </Panel>
      <EventLog log={state.log} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  panelTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  emptyHint: {
    color: colors.muted,
    fontSize: 12,
  },
  approachItem: {
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 8,
  },
  approachItemSelected: {
    borderColor: colors.accent,
  },
  approachItemEmergency: {
    borderColor: colors.bad,
  },
  approachItemLanding: {
    opacity: 0.6,
  },
  approachTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  approachName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  approachSize: {
    color: colors.muted,
    fontSize: 11,
  },
  fuelTrack: {
    height: 5,
    backgroundColor: '#0d1a25',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fuelFill: {
    height: '100%',
    backgroundColor: colors.good,
  },
  approachHint: {
    marginTop: 3,
    fontSize: 11,
    color: colors.muted,
  },
  crewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  crewChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: colors.panel2,
    width: '47%',
    alignItems: 'center',
  },
  crewChipIdle: {
    borderColor: colors.good,
  },
  crewChipBusy: {
    opacity: 0.7,
  },
  crewChipSelected: {
    borderColor: colors.accent,
  },
  crewChipText: {
    color: colors.text,
    fontSize: 12,
  },
  terminalText: {
    color: colors.text,
    fontSize: 13,
    marginBottom: 8,
  },
  shopBtn: {
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  shopBtnDisabled: {
    opacity: 0.4,
  },
  shopBtnText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  logEntry: {
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    paddingLeft: 6,
  },
  logText: {
    color: colors.muted,
    fontSize: 11,
  },
  logTick: {
    color: '#55707f',
  },
  log_success: { borderLeftColor: colors.good },
  log_warn: { borderLeftColor: colors.warn },
  log_error: { borderLeftColor: colors.bad },
  log_day: { borderLeftColor: colors.accent },
  log_ready: { borderLeftColor: colors.good },
  log_info: {},
  log_arrival: {},
  log_taxi: {},
});
