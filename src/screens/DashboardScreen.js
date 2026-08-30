import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { formatMoney } from '../game/data';
import { fleetStats, fleetByCategory, needsAttention } from '../game/selectors';
import StatTile from '../components/StatTile';
import BarChart from '../components/BarChart';

function Card({ icon, title, right, children }) {
  return (
    <View style={styles.card}>
      {title && (
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            {icon && <Ionicons name={icon} size={16} color={colors.text} style={{ marginRight: 8 }} />}
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

export default function DashboardScreen({ state }) {
  const { cash, lastWeek, weekIndex } = state;
  const stats = fleetStats(state);
  const byCategory = fleetByCategory(state);
  const alerts = needsAttention(state);
  const history = state.history.slice(-12);
  const profitData = history.length ? history.map((h) => h.profit) : [0];
  const margin = lastWeek.revenue ? (lastWeek.profit / lastWeek.revenue) * 100 : 0;
  const completionRate = lastWeek.scheduled ? (lastWeek.completed / lastWeek.scheduled) * 100 : 100;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.statsRow}>
        <StatTile label="Cash" value={formatMoney(cash, { short: true })} tone={cash < 0 ? 'bad' : 'default'} />
        <StatTile
          label="Profit / Wk"
          value={formatMoney(lastWeek.profit, { short: true })}
          tone={lastWeek.profit >= 0 ? 'good' : 'bad'}
        />
        <StatTile label="Load" value={`${Math.round(lastWeek.avgLoad * 100)}%`} tone="good" />
        <StatTile label="Fleet" value={stats.total} />
      </View>

      <Card icon="bar-chart" title="Weekly Profit" right={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}>
        {weekIndex === 0 ? (
          <Text style={styles.emptyChart}>Profit history appears after your first week of operations.</Text>
        ) : (
          <BarChart
            data={profitData}
            leftLabel={`Week ${history[0]?.weekIndex ?? weekIndex}`}
            rightLabel={`Week ${weekIndex}`}
          />
        )}
        {lastWeek.revenue > 0 && <Text style={styles.marginText}>{margin.toFixed(1)}% margin last week</Text>}
      </Card>

      <Card
        icon="warning"
        title="Needs Attention"
        right={alerts.length > 0 ? <Text style={styles.alertCount}>{alerts.length}</Text> : null}
      >
        {alerts.length === 0 ? (
          <Text style={styles.emptyChart}>Nothing needs your attention right now. Nice work.</Text>
        ) : (
          alerts.map((a, i) => (
            <View key={a.id} style={[styles.alertRow, i > 0 && styles.alertRowBorder]}>
              <View
                style={[
                  styles.alertDot,
                  { backgroundColor: a.severity === 'bad' ? colors.bad : a.severity === 'warn' ? colors.warn : colors.accent },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{a.title}</Text>
                <Text style={styles.alertDetail}>{a.detail}</Text>
              </View>
              <Text style={styles.alertTag}>{a.tag}</Text>
            </View>
          ))
        )}
      </Card>

      <Card icon="airplane" title="Last Week's Operations">
        <View style={styles.opsRow}>
          <StatTile
            label="Completion"
            value={`${completionRate.toFixed(1)}%`}
            tone={completionRate >= 95 ? 'good' : completionRate >= 80 ? 'warn' : 'bad'}
            small
          />
          <StatTile label="Load Factor" value={`${Math.round(lastWeek.avgLoad * 100)}%`} small />
          <StatTile label="Flights" value={lastWeek.completed} small />
        </View>
      </Card>

      <Card icon="airplane-outline" title="Fleet by Type">
        {byCategory.length === 0 ? (
          <Text style={styles.emptyChart}>No aircraft yet.</Text>
        ) : (
          byCategory.map((g, i) => (
            <View key={g.category} style={[styles.typeRow, i > 0 && styles.alertRowBorder]}>
              <Text style={styles.typeName}>{g.category}</Text>
              <Text style={styles.typeCount}>{g.items.length}</Text>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 14,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyChart: {
    color: colors.muted,
    fontSize: 12.5,
    lineHeight: 18,
  },
  marginText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 8,
  },
  alertCount: {
    color: colors.warn,
    fontWeight: '700',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
  },
  alertRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  alertTitle: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '600',
  },
  alertDetail: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  alertTag: {
    color: colors.mutedDark,
    fontSize: 11,
  },
  opsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  typeName: {
    color: colors.textDim,
    fontSize: 13.5,
  },
  typeCount: {
    color: colors.text,
    fontWeight: '700',
  },
});
