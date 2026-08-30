import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

// Minimal bar chart drawn with plain Views — no charting lib needed.
// `data` is an array of numbers; bars scale to the max absolute value,
// negative values render as a short red bar (loss weeks).
export default function BarChart({ data, height = 90, leftLabel, rightLabel }) {
  const max = Math.max(1, ...data.map((v) => Math.abs(v)));
  return (
    <View>
      <View style={[styles.row, { height }]}>
        {data.map((v, i) => {
          const isNeg = v < 0;
          const h = Math.max(3, (Math.abs(v) / max) * height);
          return (
            <View key={i} style={styles.barWrap}>
              <View
                style={[
                  styles.bar,
                  { height: h, backgroundColor: isNeg ? colors.bad : colors.mutedDark },
                ]}
              />
            </View>
          );
        })}
      </View>
      {(leftLabel || rightLabel) && (
        <View style={styles.labels}>
          <Text style={styles.labelText}>{leftLabel}</Text>
          <Text style={styles.labelText}>{rightLabel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  barWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '70%',
    borderRadius: 3,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  labelText: {
    color: colors.muted,
    fontSize: 11,
  },
});
