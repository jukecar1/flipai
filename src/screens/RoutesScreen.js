import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { formatMoney } from '../game/data';
import { routeList, fleetList } from '../game/selectors';
import CreateRouteModal from '../components/CreateRouteModal';

function RouteCard({ r, onRemove }) {
  const lw = r.lastWeek;
  const loadPct = lw ? Math.round(lw.loadFactor * 100) : null;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.path}>
          {r.origin} <Ionicons name="arrow-forward" size={13} color={colors.muted} /> {r.destination}
        </Text>
        <Pressable onPress={onRemove} hitSlop={8}>
          <Ionicons name="trash-outline" size={17} color={colors.mutedDark} />
        </Pressable>
      </View>
      <Text style={styles.meta}>
        {r.distanceKm.toLocaleString()} km · {r.frequency}x/week
      </Text>

      {r.aircraft ? (
        <Text style={styles.assigned}>
          ✈️ {r.aircraft.tail} · {r.aircraft.type.name}
          {r.aircraft.status === 'maintenance' ? ' (in maintenance)' : ''}
        </Text>
      ) : (
        <Text style={styles.unassigned}>No aircraft assigned — route is dormant.</Text>
      )}

      {lw && lw.completed > 0 && (
        <View style={styles.statRow}>
          <Text style={styles.statText}>
            Load <Text style={styles.statStrong}>{loadPct}%</Text>
          </Text>
          <Text style={styles.statText}>
            Revenue <Text style={styles.statStrong}>{formatMoney(lw.revenue, { short: true })}</Text>
          </Text>
          <Text
            style={[styles.statText, { color: lw.profit >= 0 ? colors.good : colors.bad }]}
          >
            {lw.profit >= 0 ? '+' : ''}
            {formatMoney(lw.profit, { short: true })}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function RoutesScreen({ state, dispatch }) {
  const [createOpen, setCreateOpen] = useState(false);
  const routes = routeList(state);
  const idleAircraft = fleetList(state).filter((a) => a.status === 'active' && !a.routeId);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.h1}>Routes</Text>
          <Pressable style={styles.addBtn} onPress={() => setCreateOpen(true)}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Route</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>{routes.length} route{routes.length === 1 ? '' : 's'}</Text>

        {routes.length === 0 && (
          <Text style={styles.emptyText}>No routes yet. Tap “+ Route” to connect your first city pair.</Text>
        )}

        {routes.map((r) => (
          <RouteCard key={r.id} r={r} onRemove={() => dispatch({ type: 'REMOVE_ROUTE', routeId: r.id })} />
        ))}
      </ScrollView>

      <CreateRouteModal
        visible={createOpen}
        unassignedAircraft={idleAircraft}
        onClose={() => setCreateOpen(false)}
        onCreate={({ origin, destination, aircraftId, frequency }) => {
          dispatch({ type: 'CREATE_ROUTE', origin, destination, aircraftId, frequency });
          setCreateOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  h1: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  path: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  assigned: {
    color: colors.textDim,
    fontSize: 12.5,
    marginTop: 8,
  },
  unassigned: {
    color: colors.warn,
    fontSize: 12.5,
    marginTop: 8,
  },
  statRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statText: {
    color: colors.muted,
    fontSize: 12,
  },
  statStrong: {
    color: colors.text,
    fontWeight: '700',
  },
});
