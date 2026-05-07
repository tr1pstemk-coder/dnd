import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Proficiency } from '../domain/types';
import { Colors, PROF_LABEL, PROF_COLOR, Fonts, Radius } from '../ui/theme';

interface Props {
  value: Proficiency;
  onChange: (p: Proficiency) => void;
}

const PROFS: Proficiency[] = ['U', 'T', 'E', 'M', 'L'];

export function ProficiencyPicker({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {PROFS.map(p => (
        <TouchableOpacity
          key={p}
          style={[
            styles.chip,
            { borderColor: PROF_COLOR[p] },
            value === p && { backgroundColor: PROF_COLOR[p] },
          ]}
          onPress={() => onChange(p)}
        >
          <Text style={[styles.chipText, value === p && styles.chipTextActive]}>
            {PROF_LABEL[p]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  chip: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: Fonts.xs,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#000',
  },
});
