import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { fleetStats, fleetByCategory, routeList } from '../game/selectors';
import StatTile from '../components/StatTile';
import Badge from '../components/Badge';
import BuyAircraftModal from '../components/BuyAircraftModal';
import AircraftDetailModal from '../components/AircraftDetailModal';

function statusInfo(a) {
  if (a.status === 'maintenance') return { label: 'IN MAINTENANCE', tone: 'warn' };
  if (a.routeId) return { label: 'ACTIVE', tone: 'good' };
  return { label: 'IDLE', tone: 'muted' };
}

function AircraftCard({ a, route, onPress }) {
  const info = statusInfo(a);
  const checkLeft = Math.max(0, Math.round(a.type.checkIntervalHours - a.hoursSinceCheck));
  return (
    <Pressable style={styles.aircraftCard} onPress={onPress}>
      <View style={styles.cardTop}>
        <Text style={styles.tail}>{a.tail}</Text>
        <Badge label={info.label} tone={info.tone} />
      </View>
      <Text style={styles.meta}>
        {a.type.name} · {(a.ageWeeks / 52).toFixed(1)}y {route ? `· ${route.origin}–${route.destination}` : '· unassigned'}
      </Text>
      <Text style={styles.meta}>
        {Math.round(a.totalHours).toLocaleString()}h · {a.cycles.toLocaleString()} cycles · check in {checkLeft}h
      </Text>
    </Pressable>
  );
}

export default function FleetScreen({ state, dispatch }) {
  const [filter, setFilter] = useState('All');
  const [buyOpen, setBuyOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const stats = fleetStats(state);
  const groups = fleetByCategory(state);
  const routes = routeList(state);
  const routeByAircraft = useMemo(() => {
    const map = {};
    routes.forEach((r) => {
      if (r.aircraftId) map[r.aircraftId] = r;
    });
    return map;
  }, [routes]);

  const categories = groups.map((g) => g.category);
  const visibleGroups = filter === 'All' ? groups : groups.filter((g) => g.category === filter);
  const selected = selectedId ? state.aircraft[selectedId] : null;
  const selectedType = selected ? groups.flatMap((g) => g.items).find((a) => a.id === selectedId)?.type : null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.h1}>Fleet</Text>
          <Pressable style={styles.buyBtn} onPress={() => setBuyOpen(true)}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.buyBtnText}>Aircraft</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <StatTile label="Aircraft" value={stats.total} />
          <StatTile label="Utilized" value={`${stats.utilizedPct}%`} tone="good" />
          <StatTile label="AOG" value={stats.aog} tone={stats.aog > 0 ? 'warn' : 'default'} />
        </View>
        <Text style={styles.avgAge}>{stats.avgAgeYears.toFixed(1)}y avg age</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          <Pressable style={[styles.chip, filter === 'All' && styles.chipActive]} onPress={() => setFilter('All')}>
            <Text style={[styles.chipText, filter === 'All' && styles.chipTextActive]}>All {stats.total}</Text>
          </Pressable>
          {categories.map((cat) => {
            const count = groups.find((g) => g.category === cat)?.items.length || 0;
            return (
              <Pressable key={cat} style={[styles.chip, filter === cat && styles.chipActive]} onPress={() => setFilter(cat)}>
                <Text style={[styles.chipText, filter === cat && styles.chipTextActive]}>
                  {cat} {count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {visibleGroups.length === 0 && (
          <Text style={styles.emptyText}>No aircraft in this category yet — buy one to get started.</Text>
        )}

        {visibleGroups.map((g) => (
          <View key={g.category} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{g.category.toUpperCase()}</Text>
              <Text style={styles.groupCount}>{g.items.length}</Text>
            </View>
            {g.items.map((a) => (
              <AircraftCard key={a.id} a={a} route={routeByAircraft[a.id]} onPress={() => setSelectedId(a.id)} />
            ))}
          </View>
        ))}
      </ScrollView>

      <BuyAircraftModal
        visible={buyOpen}
        cash={state.cash}
        onClose={() => setBuyOpen(false)}
        onBuy={(typeId) => {
          dispatch({ type: 'BUY_AIRCRAFT', typeId });
          setBuyOpen(false);
        }}
      />

      <AircraftDetailModal
        visible={!!selected}
        aircraft={selected ? { ...selected, type: selectedType } : null}
        route={selected ? routeByAircraft[selected.id] : null}
        onClose={() => setSelectedId(null)}
        onUnassign={() => {
          const r = routeByAircraft[selectedId];
          if (r) dispatch({ type: 'UNASSIGN_ROUTE_AIRCRAFT', routeId: r.id });
          setSelectedId(null);
        }}
        onSell={() => {
          dispatch({ type: 'SELL_AIRCRAFT', id: selectedId });
          setSelectedId(null);
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
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  buyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  avgAge: {
    color: colors.muted,
    fontSize: 12,
  },
  chipRow: {
    flexGrow: 0,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    backgroundColor: colors.panel,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.muted,
    fontSize: 12.5,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    paddingVertical: 20,
    textAlign: 'center',
  },
  groupCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.panel,
  },
  groupTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  groupCount: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  aircraftCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tail: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  meta: {
    color: colors.muted,
    fontSize: 11.5,
    marginTop: 1,
  },
});
