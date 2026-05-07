import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Easing,
} from 'react-native';
import { Colors, Fonts, Radius } from '../ui/theme';

interface Props {
  visible: boolean;
  label: string;
  roll: number;
  bonus: number;
  total: number;
  diceLabel?: string; // e.g. 'd6', 'd10', 'd20'
  onClose: () => void;
}

export function DiceRoller({ visible, label, roll, bonus, total, diceLabel = 'd20', onClose }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      spin.setValue(0);
      scale.setValue(0.3);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(spin, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const isCrit = roll === 20 && diceLabel === 'd20';
  const isFumble = roll === 1 && diceLabel === 'd20';
  const resultColor = isCrit ? Colors.accent : isFumble ? Colors.danger : Colors.textPrimary;
  const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1}>
        <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
          <Text style={styles.label}>{label}</Text>

          <Animated.View style={[styles.diceContainer, { transform: [{ rotate: rotation }] }]}>
            <View style={[styles.dice, isCrit && styles.diceCrit, isFumble && styles.diceFumble]}>
              <Text style={styles.diceLabel}>{diceLabel}</Text>
            </View>
          </Animated.View>

          <Text style={[styles.roll, { color: resultColor }]}>{roll}</Text>

          {isCrit && <Text style={styles.critText}>КРИТИЧЕСКИЙ УСПЕХ!</Text>}
          {isFumble && <Text style={styles.fumbleText}>КРИТИЧЕСКИЙ ПРОВАЛ!</Text>}

          <View style={styles.formula}>
            <Text style={styles.formulaText}>
              {roll} {bonus !== 0 ? `${bonusStr}` : ''} = 
            </Text>
            <Text style={[styles.total, { color: resultColor }]}> {total}</Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>ОК</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 32,
    alignItems: 'center',
    width: 280,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: Fonts.sm,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  diceContainer: {
    marginBottom: 16,
  },
  dice: {
    width: 80,
    height: 80,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  diceCrit: {
    borderColor: Colors.accent,
    backgroundColor: '#064e14',
  },
  diceFumble: {
    borderColor: Colors.danger,
    backgroundColor: '#4e0606',
  },
  diceLabel: {
    color: Colors.textSecondary,
    fontSize: Fonts.sm,
    fontWeight: '600',
  },
  roll: {
    fontSize: Fonts.xxxl,
    fontWeight: '900',
    marginBottom: 4,
  },
  critText: {
    color: Colors.accent,
    fontSize: Fonts.sm,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  fumbleText: {
    color: Colors.danger,
    fontSize: Fonts.sm,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  formula: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
    marginBottom: 20,
  },
  formulaText: {
    color: Colors.textSecondary,
    fontSize: Fonts.md,
  },
  total: {
    fontSize: Fonts.xl,
    fontWeight: '800',
  },
  closeBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  closeBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: Fonts.base,
    letterSpacing: 1,
  },
});
