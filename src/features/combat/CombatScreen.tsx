import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';
import { Character, WeaponStrike, Proficiency, AbilityScores } from '../../domain/types';
import { calcAttackBonus, rollD20, profBonus, abilityMod } from '../../domain/pf2eCalc';
import { Colors, Fonts, Radius, Shadow, PROF_LABEL, PROF_COLOR } from '../../ui/theme';
import { DiceRoller } from '../../components/DiceRoller';
import { ProficiencyPicker } from '../../components/ProficiencyPicker';
import { NumberInput } from '../../components/NumberInput';

interface Props {
  character: Character;
  onCharChange: (ch: Character) => void;
}

type DiceResult = { label: string; roll: number; bonus: number; total: number } | null;

const ABILITY_OPTIONS: [keyof AbilityScores, string][] = [
  ['str', 'Сила'], ['dex', 'Ловкость'], ['con', 'Вынос.'],
  ['int', 'Инт.'], ['wis', 'Мдр.'], ['cha', 'Хар.'],
];

const emptyStrike = (): WeaponStrike => ({
  id: uuid(),
  name: '',
  type: 'melee',
  ability: 'str',
  proficiency: 'U',
  itemBonus: 0,
  damageDice: '1d6',
  damageBonus: 0,
  damageType: 'S',
  traits: '',
});

export function CombatScreen({ character: char, onCharChange }: Props) {
  const [diceResult, setDiceResult] = useState<DiceResult>(null);
  const [editing, setEditing] = useState<WeaponStrike | null>(null);
  const [isNew, setIsNew] = useState(false);

  const upd = useCallback((partial: Partial<Character>) => {
    onCharChange({ ...char, ...partial });
  }, [char, onCharChange]);

  const rollAttack = (strike: WeaponStrike) => {
    const bonus = calcAttackBonus(char, strike.ability, strike.proficiency, strike.itemBonus);
    const r = rollD20();
    setDiceResult({ label: `${strike.name} — Атака`, roll: r, bonus, total: r + bonus });
  };

  const openNew = () => {
    setEditing(emptyStrike());
    setIsNew(true);
  };

  const openEdit = (s: WeaponStrike) => {
    setEditing({ ...s });
    setIsNew(false);
  };

  const saveStrike = () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      Alert.alert('Ошибка', 'Введите название удара');
      return;
    }
    let strikes: WeaponStrike[];
    if (isNew) {
      strikes = [...char.strikes, editing];
    } else {
      strikes = char.strikes.map(s => s.id === editing.id ? editing : s);
    }
    upd({ strikes });
    setEditing(null);
  };

  const deleteStrike = (id: string) => {
    Alert.alert('Удалить удар', 'Удалить этот удар?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => upd({ strikes: char.strikes.filter(s => s.id !== id) }) },
    ]);
  };

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Strikes ──────────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Удары</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openNew}>
            <Ionicons name="add" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {char.strikes.length === 0 && (
          <Text style={styles.empty}>Нет ударов. Нажмите + чтобы добавить.</Text>
        )}

        {char.strikes.map(strike => {
          const bonus = calcAttackBonus(char, strike.ability, strike.proficiency, strike.itemBonus);
          const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;
          const dmgBonus = abilityMod(char.abilities[strike.ability]) + strike.damageBonus;
          const dmgStr = `${strike.damageDice}${dmgBonus >= 0 ? `+${dmgBonus}` : dmgBonus} ${strike.damageType}`;

          return (
            <View key={strike.id} style={styles.strikeCard}>
              <TouchableOpacity style={styles.strikeMain} onPress={() => rollAttack(strike)} activeOpacity={0.8}>
                <View style={[styles.typeIcon, { backgroundColor: strike.type === 'melee' ? Colors.danger + '22' : Colors.info + '22' }]}>
                  <Ionicons
                    name={strike.type === 'melee' ? 'shield-outline' : 'arrow-forward-outline'}
                    size={20}
                    color={strike.type === 'melee' ? Colors.danger : Colors.info}
                  />
                </View>
                <View style={styles.strikeInfo}>
                  <Text style={styles.strikeName}>{strike.name || 'Без названия'}</Text>
                  <Text style={styles.strikeDmg}>{dmgStr}</Text>
                  {strike.traits ? <Text style={styles.strikeTraits}>{strike.traits}</Text> : null}
                </View>
                <View style={styles.strikeBonus}>
                  <Text style={styles.strikeBonusText}>{bonusStr}</Text>
                  <Text style={styles.strikeBonusSub}>атака</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.strikeActions}>
                <View style={[styles.profChip, { borderColor: PROF_COLOR[strike.proficiency] }]}>
                  <Text style={[styles.profChipText, { color: PROF_COLOR[strike.proficiency] }]}>{PROF_LABEL[strike.proficiency]}</Text>
                </View>
                <TouchableOpacity onPress={() => openEdit(strike)} style={styles.iconBtn}>
                  <Ionicons name="pencil-outline" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteStrike(strike.id)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* ── Weapon Proficiencies ─────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Умения в оружии</Text>
          {[
            { label: 'Безоружный', key: 'unarmed' as const },
            { label: 'Простое',    key: 'simple'   as const },
            { label: 'Воинское',   key: 'martial'  as const },
            { label: 'Особое',     key: 'advanced' as const },
          ].map(({ label, key }) => (
            <View key={key} style={styles.profRow}>
              <Text style={styles.profRowLabel}>{label}</Text>
              <ProficiencyPicker
                value={char.weaponProficiencies[key]}
                onChange={p => upd({ weaponProficiencies: { ...char.weaponProficiencies, [key]: p } })}
              />
            </View>
          ))}
        </View>

        {/* ── Armor Proficiencies ──────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Умения в броне</Text>
          {[
            { label: 'Без брони',  key: 'unarmored' as const },
            { label: 'Лёгкая',     key: 'light'     as const },
            { label: 'Средняя',    key: 'medium'    as const },
            { label: 'Тяжёлая',    key: 'heavy'     as const },
          ].map(({ label, key }) => (
            <View key={key} style={styles.profRow}>
              <Text style={styles.profRowLabel}>{label}</Text>
              <ProficiencyPicker
                value={char.armorProficiencies[key]}
                onChange={p => upd({ armorProficiencies: { ...char.armorProficiencies, [key]: p } })}
              />
            </View>
          ))}
        </View>

      </ScrollView>

      {/* ── Strike Editor Modal ──────────────────────────────────────── */}
      <Modal visible={editing !== null} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{isNew ? 'Новый удар' : 'Редактировать удар'}</Text>

            {editing && (
              <>
                <Text style={styles.edLabel}>Название</Text>
                <TextInput
                  style={styles.edInput}
                  value={editing.name}
                  onChangeText={name => setEditing({ ...editing, name })}
                  placeholder="Длинный меч…"
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                />

                <Text style={styles.edLabel}>Тип</Text>
                <View style={styles.typeRow}>
                  {(['melee', 'ranged'] as const).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeBtn, editing.type === t && styles.typeBtnActive]}
                      onPress={() => setEditing({ ...editing, type: t })}
                    >
                      <Text style={[styles.typeBtnText, editing.type === t && styles.typeBtnTextActive]}>
                        {t === 'melee' ? 'Ближний' : 'Дальний'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.edLabel}>Характеристика</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  <View style={styles.typeRow}>
                    {ABILITY_OPTIONS.map(([key, label]) => (
                      <TouchableOpacity
                        key={key}
                        style={[styles.typeBtn, editing.ability === key && styles.typeBtnActive]}
                        onPress={() => setEditing({ ...editing, ability: key })}
                      >
                        <Text style={[styles.typeBtnText, editing.ability === key && styles.typeBtnTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={styles.edLabel}>Умение в оружии</Text>
                <ProficiencyPicker value={editing.proficiency} onChange={p => setEditing({ ...editing, proficiency: p })} />

                <View style={styles.edRow}>
                  <View style={styles.flex1}>
                    <Text style={styles.edLabel}>Бонус предмета</Text>
                    <NumberInput value={editing.itemBonus} onChange={v => setEditing({ ...editing, itemBonus: v })} min={0} compact />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.edLabel}>Бонус к урону</Text>
                    <NumberInput value={editing.damageBonus} onChange={v => setEditing({ ...editing, damageBonus: v })} compact />
                  </View>
                </View>

                <View style={styles.edRow}>
                  <View style={styles.flex1}>
                    <Text style={styles.edLabel}>Кубик урона</Text>
                    <TextInput
                      style={styles.edInput}
                      value={editing.damageDice}
                      onChangeText={damageDice => setEditing({ ...editing, damageDice })}
                      placeholder="1d6"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.edLabel}>Тип урона</Text>
                    <TextInput
                      style={styles.edInput}
                      value={editing.damageType}
                      onChangeText={damageType => setEditing({ ...editing, damageType })}
                      placeholder="S/P/B"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </View>

                <Text style={styles.edLabel}>Особенности</Text>
                <TextInput
                  style={styles.edInput}
                  value={editing.traits}
                  onChangeText={traits => setEditing({ ...editing, traits })}
                  placeholder="Смертоносное d10, Двуручное d12…"
                  placeholderTextColor={Colors.textMuted}
                />

                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
                    <Text style={styles.cancelText}>Отмена</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveStrike}>
                    <Text style={styles.saveText}>Сохранить</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      <DiceRoller
        visible={diceResult !== null}
        label={diceResult?.label ?? ''}
        roll={diceResult?.roll ?? 0}
        bonus={diceResult?.bonus ?? 0}
        total={diceResult?.total ?? 0}
        onClose={() => setDiceResult(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: Colors.accent, fontSize: Fonts.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  addBtn: { width: 36, height: 36, borderRadius: Radius.full, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  empty: { color: Colors.textMuted, fontSize: Fonts.sm, textAlign: 'center', paddingVertical: 24 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  strikeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.card,
  },
  strikeMain: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  typeIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  strikeInfo: { flex: 1 },
  strikeName: { color: Colors.textPrimary, fontSize: Fonts.base, fontWeight: '700' },
  strikeDmg: { color: Colors.warning, fontSize: Fonts.sm },
  strikeTraits: { color: Colors.textMuted, fontSize: Fonts.xs, marginTop: 2 },
  strikeBonus: { alignItems: 'center' },
  strikeBonusText: { color: Colors.accent, fontSize: Fonts.xl, fontWeight: '800' },
  strikeBonusSub: { color: Colors.textMuted, fontSize: 10 },
  strikeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
  },
  profChip: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  profChipText: { fontSize: Fonts.xs, fontWeight: '700' },
  iconBtn: { padding: 6 },
  profRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  profRowLabel: { color: Colors.textSecondary, fontSize: Fonts.sm },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: 24,
    paddingBottom: 48,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalTitle: { color: Colors.textPrimary, fontSize: Fonts.lg, fontWeight: '700', marginBottom: 8 },
  edLabel: { color: Colors.textSecondary, fontSize: Fonts.xs, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
  edInput: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: Fonts.sm,
    padding: 10,
    marginTop: 4,
  },
  edRow: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  typeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  typeBtnText: { color: Colors.textSecondary, fontSize: Fonts.sm, fontWeight: '600' },
  typeBtnTextActive: { color: '#000', fontWeight: '700' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontSize: Fonts.base, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText: { color: '#000', fontSize: Fonts.base, fontWeight: '700' },
});
