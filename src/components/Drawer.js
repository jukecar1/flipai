import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { NAV_SECTIONS } from '../navConfig';

function NavRow({ item, active, count, onPress }) {
  return (
    <Pressable style={[styles.row, active && styles.rowActive]} onPress={onPress}>
      {active && <View style={styles.activeBar} />}
      <Ionicons
        name={item.icon}
        size={18}
        color={active ? colors.text : colors.muted}
        style={styles.rowIcon}
      />
      <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>{item.label}</Text>
      {typeof count === 'number' && (
        <View style={styles.countPill}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function Drawer({
  visible,
  onClose,
  current,
  onNavigate,
  meta,
  counts,
  onSave,
  saveStatus,
  onExit,
}) {
  const initials = (meta?.name || '??')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.panel}>
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: meta?.color || colors.accent }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.airlineName} numberOfLines={1}>
                {meta?.name}
              </Text>
              <Text style={styles.airlineSub}>
                {counts.aircraft} aircraft · {counts.routes} routes
              </Text>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
            {NAV_SECTIONS.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.items.map((item) => (
                  <NavRow
                    key={item.key}
                    item={item}
                    active={current === item.key}
                    count={item.countKey ? counts[item.countKey] : undefined}
                    onPress={() => onNavigate(item.key)}
                  />
                ))}
              </View>
            ))}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>System</Text>
              <Pressable style={styles.row} onPress={onSave}>
                <Ionicons name="save-outline" size={18} color={colors.muted} style={styles.rowIcon} />
                <Text style={styles.rowLabel}>Save game</Text>
                <Text style={styles.rowMeta}>{saveStatus}</Text>
              </Pressable>
              <NavRow
                item={{ key: 'notifications', label: 'Notifications', icon: 'notifications-outline' }}
                active={current === 'notifications'}
                onPress={() => onNavigate('notifications')}
              />
              <NavRow
                item={{ key: 'settings', label: 'Settings', icon: 'settings-outline' }}
                active={current === 'settings'}
                onPress={() => onNavigate('settings')}
              />
              <Pressable style={styles.row} onPress={onExit}>
                <Ionicons name="exit-outline" size={18} color={colors.muted} style={styles.rowIcon} />
                <Text style={styles.rowLabel}>Exit to main menu</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const PANEL_WIDTH = '84%';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  panel: {
    width: PANEL_WIDTH,
    maxWidth: 340,
    backgroundColor: colors.bgAlt,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: 54,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  airlineName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  airlineSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    paddingTop: 14,
  },
  sectionTitle: {
    color: colors.mutedDark,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  rowActive: {
    backgroundColor: colors.panel,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  rowIcon: {
    width: 20,
  },
  rowLabel: {
    color: colors.textDim,
    fontSize: 14,
    flex: 1,
  },
  rowLabelActive: {
    color: colors.text,
    fontWeight: '700',
  },
  rowMeta: {
    color: colors.mutedDark,
    fontSize: 11,
    fontStyle: 'italic',
  },
  countPill: {
    backgroundColor: colors.panel2,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  countText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
});
