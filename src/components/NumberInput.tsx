import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Colors, Fonts, Radius } from '../ui/theme';

interface Props {
  label?: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  compact?: boolean;
}

export function NumberInput({ label, value, onChange, min, max, step = 1, compact }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(value));

  const clamp = (n: number) => {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  };

  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    if (!isNaN(n)) onChange(clamp(n));
    setEditing(false);
  };

  return (
    <View style={compact ? styles.rowCompact : styles.row}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.control}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => onChange(clamp(value - step))}
        >
          <Text style={styles.btnText}>−</Text>
        </TouchableOpacity>

        {editing ? (
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            onBlur={() => commit(text)}
            onSubmitEditing={() => commit(text)}
            keyboardType="numeric"
            autoFocus
            selectTextOnFocus={true}
          />
        ) : (
          <TouchableOpacity onPress={() => { setText(String(value)); setEditing(true); }}>
            <Text style={styles.valueText}>{value}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.btn}
          onPress={() => onChange(clamp(value + step))}
        >
          <Text style={styles.btnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: 4 },
  rowCompact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: Colors.textSecondary, fontSize: Fonts.xs, marginBottom: 4 },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  btn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  btnText: {
    color: Colors.textPrimary,
    fontSize: Fonts.lg,
    lineHeight: 22,
  },
  valueText: {
    color: Colors.textPrimary,
    fontSize: Fonts.base,
    fontWeight: '700',
    paddingHorizontal: 16,
    minWidth: 48,
    textAlign: 'center',
  },
  input: {
    color: Colors.accent,
    fontSize: Fonts.base,
    fontWeight: '700',
    paddingHorizontal: 8,
    minWidth: 48,
    textAlign: 'center',
  },
});
