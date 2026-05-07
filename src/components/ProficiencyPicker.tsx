import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal, FlatList } from 'react-native';
import { Proficiency } from '../domain/types';
import { Colors, PROF_LABEL, PROF_COLOR, Fonts, Radius } from '../ui/theme';

interface Props {
  value: Proficiency;
  onChange: (p: Proficiency) => void;
}

const PROFS: Proficiency[] = ['U', 'T', 'E', 'M', 'L'];
const PROF_BONUS_LABEL: Record<Proficiency, string> = {
  U: 'Нетренированный (+0)',
  T: 'Обучен (+2)',
  E: 'Эксперт (+4)',
  M: 'Мастер (+6)',
  L: 'Легенда (+8)',
};

export function ProficiencyPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { borderColor: PROF_COLOR[value] }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.triggerText, { color: PROF_COLOR[value] }]}>
          {PROF_BONUS_LABEL[value]}
        </Text>
        <Text style={[styles.arrow, { color: PROF_COLOR[value] }]}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={styles.dropdown}>
            {PROFS.map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.option, value === p && { backgroundColor: PROF_COLOR[p] + '33' }]}
                onPress={() => { onChange(p); setOpen(false); }}
              >
                <View style={[styles.dot, { backgroundColor: PROF_COLOR[p] }]} />
                <Text style={[styles.optionText, { color: PROF_COLOR[p] }]}>
                  {PROF_BONUS_LABEL[p]}
                </Text>
                {value === p && <Text style={[styles.check, { color: PROF_COLOR[p] }]}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.bg,
    minHeight: 40,
  },
  triggerText: {
    fontSize: Fonts.sm,
    fontWeight: '600',
    flex: 1,
  },
  arrow: {
    fontSize: 14,
    marginLeft: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 260,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    fontSize: Fonts.base,
    fontWeight: '600',
    flex: 1,
  },
  check: {
    fontSize: 16,
    fontWeight: '800',
  },
});
