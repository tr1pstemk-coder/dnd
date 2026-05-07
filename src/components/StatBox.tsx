import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Fonts, Radius, Shadow } from '../ui/theme';

interface Props {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
  danger?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function StatBox({ label, value, sub, accent, danger, onPress, size = 'md' }: Props) {
  const valSize = size === 'lg' ? Fonts.xxl : size === 'sm' ? Fonts.md : Fonts.xl;
  const valColor = accent ? Colors.accent : danger ? Colors.danger : Colors.textPrimary;

  const content = (
    <View style={[styles.box, accent && styles.accentBorder, danger && styles.dangerBorder]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { fontSize: valSize, color: valColor }]}>{value}</Text>
      {sub != null && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  accentBorder: {
    borderColor: Colors.accent,
  },
  dangerBorder: {
    borderColor: Colors.danger,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: Fonts.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontWeight: '800',
  },
  sub: {
    color: Colors.textMuted,
    fontSize: Fonts.xs,
    marginTop: 2,
  },
});
