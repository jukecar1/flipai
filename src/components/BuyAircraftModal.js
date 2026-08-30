import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { AIRCRAFT_TYPES, formatMoney } from '../game/data';

export default function BuyAircraftModal({ visible, onClose, onBuy, cash }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Buy Aircraft</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {AIRCRAFT_TYPES.map((t) => {
              const affordable = cash >= t.price;
              return (
                <Pressable
                  key={t.id}
                  disabled={!affordable}
                  onPress={() => onBuy(t.id)}
                  style={[styles.row, !affordable && styles.rowDisabled]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {t.name} <Text style={styles.rowCat}>· {t.category}</Text>
                    </Text>
                    <Text style={styles.rowMeta}>
                      {t.cargo ? `${t.capacity.toLocaleString()} kg` : `${t.capacity} seats`} · range{' '}
                      {t.rangeKm.toLocaleString()} km
                    </Text>
                  </View>
                  <Text style={[styles.price, !affordable && styles.priceDisabled]}>{formatMoney(t.price)}</Text>
                </Pressable>
              );
            })}
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
    maxHeight: '80%',
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
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14.5,
    fontWeight: '600',
  },
  rowCat: {
    color: colors.muted,
    fontWeight: '400',
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  price: {
    color: colors.good,
    fontWeight: '700',
    fontSize: 13.5,
  },
  priceDisabled: {
    color: colors.muted,
  },
});
