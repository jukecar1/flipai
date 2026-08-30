import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';
import { formatMoney } from '../game/data';
import BarChart from '../components/BarChart';
import StatTile from '../components/StatTile';

function Line({ label, value, strong, positive }) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, strong && styles.lineLabelStrong]}>{label}</Text>
      <Text
        style={[
          styles.lineValue,
          strong && styles.lineValueStrong,
          positive === true && { color: colors.good },
          positive === false && { color: colors.bad },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function FinancesScreen({ state }) {
  const { lastWeek, cash, history } = state;
  const cashHistory = history.length ? history.map((h) => h.profit) : [0];
  const lifetimeProfit = history.reduce((s, h) => s + h.profit, 0);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.statsRow}>
        <StatTile label="Cash on hand" value={formatMoney(cash, { short: true })} />
        <StatTile
          label="Lifetime P/L"
          value={formatMoney(lifetimeProfit, { short: true })}
          tone={lifetimeProfit >= 0 ? 'good' : 'bad'}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly Profit</Text>
        {history.length === 0 ? (
          <Text style={styles.empty}>No history yet — advance a week to see your first result.</Text>
        ) : (
          <BarChart data={cashHistory} />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Last Week</Text>
        <Line label="Revenue" value={formatMoney(lastWeek.revenue)} />
        <Line label="Operating cost" value={`-${formatMoney(lastWeek.cost)}`} />
        <View style={styles.divider} />
        <Line
          label="Net profit"
          value={`${lastWeek.profit >= 0 ? '+' : ''}${formatMoney(lastWeek.profit)}`}
          strong
          positive={lastWeek.profit >= 0}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Operating stats</Text>
        <Line label="Scheduled flights" value={lastWeek.scheduled} />
        <Line label="Completed flights" value={lastWeek.completed} />
        <Line label="Average load factor" value={`${Math.round(lastWeek.avgLoad * 100)}%`} />
      </View>
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
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  empty: {
    color: colors.muted,
    fontSize: 12.5,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  lineLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  lineLabelStrong: {
    color: colors.text,
    fontWeight: '700',
  },
  lineValue: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
  lineValueStrong: {
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
});
