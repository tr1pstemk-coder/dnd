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

type DiceResult = { label: string; roll: number; bonus: number; total: number; diceLabel?: string; diceRolls?: number[] } | null;

const ABILITY_OPTIONS: [keyof AbilityScores, string][] = [
  ['str', 'Сила'], ['dex', 'Ловкость'], ['con', 'Вынос.'],
  ['int', 'Инт.'], ['wis', 'Мдр.'], ['cha', 'Хар.'],
];

const DICE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

// Типы урона — код + русское название
const DAMAGE_TYPE_OPTIONS: { code: string; label: string }[] = [
  { code: 'S', label: 'Рубящий' },
  { code: 'P', label: 'Пронзающий' },
  { code: 'B', label: 'Дробящий' },
  { code: 'Fire', label: 'Огонь' },
  { code: 'Cold', label: 'Холод' },
  { code: 'Acid', label: 'Кислота' },
  { code: 'Electricity', label: 'Молния' },
  { code: 'Sonic', label: 'Звук' },
  { code: 'Poison', label: 'Яд' },
  { code: 'Mental', label: 'Психический' },
  { code: 'Spirit', label: 'Духовный' },
  { code: 'Bleed', label: 'Кровотечение' },
  { code: 'Precision', label: 'Точный' },
  { code: 'Void', label: 'Пустота' },
  { code: 'Vitality', label: 'Жизнь' },
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

function rollDice(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
}

function parseDamageDice(dice: string): { count: number; sides: number } {
  const m = dice.match(/(\d+)d(\d+)/i);
  if (!m) return { count: 1, sides: 6 };
  return { count: parseInt(m[1], 10), sides: parseInt(m[2], 10) };
}

// Парсим damageType (может быть несколько через '+')
function parseDamageTypes(raw: string): string[] {
  return raw.split('+').map(s => s.trim()).filter(Boolean);
}

function formatDamageTypes(codes: string[]): string {
  return codes.join('+');
}

function damageTypeLabel(code: string): string {
  return DAMAGE_TYPE_OPTIONS.find(d => d.code === code)?.label ?? code;
}

export function CombatScreen({ character: char, onCharChange }: Props) {
  const [diceResult, setDiceResult] = useState<DiceResult>(null);
  const [editing, setEditing] = useState<WeaponStrike | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [diceCount, setDiceCount] = useState(1);
  const [diceType, setDiceType] = useState('d6');
  // Выбранные типы урона (массив кодов)
  const [selectedDmgTypes, setSelectedDmgTypes] = useState<string[]>(['S']);

  const upd = useCallback((partial: Partial<Character>) => {
    onCharChange({ ...char, ...partial });
  }, [char, onCharChange]);

  const rollAttack = (strike: WeaponStrike) => {
    const bonus = calcAttackBonus(char, strike.ability, strike.proficiency, strike.itemBonus);
    const r = rollD20();
    setDiceResult({ label: `${strike.name} — Атака`, roll: r, bonus, total: r + bonus, diceLabel: 'd20' });
  };

  const rollDamage = (strike: WeaponStrike) => {
    const { count, sides } = parseDamageDice(strike.damageDice);
    const rolls = rollDice(count, sides);
    const dmgBonus = abilityMod(char.abilities[strike.ability]) + strike.damageBonus;
    const total = rolls.reduce((a, b) => a + b, 0) + dmgBonus;
    const typeLabels = parseDamageTypes(strike.damageType).map(damageTypeLabel).join('+');
    setDiceResult({
      label: `${strike.name} — Урон (${strike.damageDice}) [${typeLabels}]`,
      roll: rolls[0],
      bonus: dmgBonus,
      total,
      diceLabel: `d${sides}`,
      diceRolls: rolls,
    });
  };

  const openNew = () => {
    const s = emptyStrike();
    setEditing(s);
    setIsNew(true);
    setDiceCount(1);
    setDiceType('d6');
    setSelectedDmgTypes(['S']);
  };

  const openEdit = (s: WeaponStrike) => {
    const { count, sides } = parseDamageDice(s.damageDice);
    setEditing({ ...s });
    setIsNew(false);
    setDiceCount(count);
    setDiceType(`d${sides}`);
    setSelectedDmgTypes(parseDamageTypes(s.damageType));
  };

  const toggleDmgType = (code: string) => {
    setSelectedDmgTypes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const saveStrike = () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      Alert.alert('Ошибка', 'Введите название удара');
      return;
    }
    const withDice: WeaponStrike = {
      ...editing,
      damageDice: `${diceCount}${diceType}`,
      damageType: formatDamageTypes(selectedDmgTypes),
    };
    let strikes: WeaponStrike[];
    if (isNew) {
      strikes = [...char.strikes, withDice];
    } else {
      strikes = char.strikes.map(s => s.id === withDice.id ? withDice : s);
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

        {/* ── Strikes ────────────────────────────────────────────────── */}
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
          const typeLabels = parseDamageTypes(strike.damageType).map(damageTypeLabel).join(' + ');
          const dmgStr = `${strike.damageDice}${dmgBonus >= 0 ? `+${dmgBonus}` : dmgBonus} ${typeLabels}`;

          return (
            <View key={strike.id} style={styles.strikeCard}>
              <View style={styles.strikeMain}>
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
                <View style={styles.strikeBtns}>
                  <TouchableOpacity style={styles.strikeRollBtn} onPress={() => rollAttack(strike)}>
                    <Text style={styles.strikeRollText}>{bonusStr}</Text>
                    <Text style={styles.strikeRollSub}>атака</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.strikeRollBtn, styles.strikeDmgBtn]} onPress={() => rollDamage(strike)}>
                    <Ionicons name="dice-outline" size={18} color={Colors.warning} />
                    <Text style={styles.strikeDmgSub}>урон</Text>
                  </TouchableOpacity>
                </View>
              </View>

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

        {/* ── Weapon Proficiencies ──────────────────────────────────────── */}
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
              <View style={styles.profPickerWrap}>
                <ProficiencyPicker
                  value={char.weaponProficiencies[key]}
                  onChange={p => upd({ weaponProficiencies: { ...char.weaponProficiencies, [key]: p } })}
                />
              </View>
            </View>
          ))}
        </View>

        {/* ── Armor Proficiencies ────────────────────────────────────────── */}
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
              <View style={styles.profPickerWrap}>
                <ProficiencyPicker
                  value={char.armorProficiencies[key]}
                  onChange={p => upd({ armorProficiencies: { ...char.armorProficiencies, [key]: p } })}
                />
              </View>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* ── Strike Editor Modal ────────────────────────────────────────── */}
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

                {/* Dice Editor */}
                <Text style={styles.edLabel}>Кубик урона</Text>
                <View style={styles.diceEditor}>
                  <View style={styles.diceCountWrap}>
                    <Text style={styles.diceSubLabel}>Кол-во</Text>
                    <NumberInput value={diceCount} onChange={setDiceCount} min={1} max={20} compact />
                  </View>
                  <View style={styles.diceTypesWrap}>
                    <Text style={styles.diceSubLabel}>Вид кубика</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.typeRow}>
                        {DICE_TYPES.map(d => (
                          <TouchableOpacity
                            key={d}
                            style={[styles.diceBtn, diceType === d && styles.diceBtnActive]}
                            onPress={() => setDiceType(d)}
                          >
                            <Text style={[styles.diceBtnText, diceType === d && styles.diceBtnTextActive]}>{d}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                </View>
                <Text style={styles.dicePreview}>→ {diceCount}{diceType}</Text>

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

                {/* Тип урона — множественный выбор */}
                <Text style={styles.edLabel}>Тип урона (можно выбрать несколько)</Text>
                <View style={styles.dmgTypeGrid}>
                  {DAMAGE_TYPE_OPTIONS.map(({ code, label }) => {
                    const active = selectedDmgTypes.includes(code);
                    return (
                      <TouchableOpacity
                        key={code}
                        style={[styles.dmgTypeChip, active && styles.dmgTypeChipActive]}
                        onPress={() => toggleDmgType(code)}
                      >
                        <Text style={[styles.dmgTypeText, active && styles.dmgTypeTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {selectedDmgTypes.length > 0 && (
                  <Text style={styles.dicePreview}>Выбрано: {selectedDmgTypes.map(damageTypeLabel).join(' + ')}</Text>
                )}

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
        diceLabel={diceResult?.diceLabel ?? 'd20'}
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
  },
  strikeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  strikeMain: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  typeIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  strikeInfo: { flex: 1 },
  strikeName: { color: Colors.textPrimary, fontSize: Fonts.base, fontWeight: '700' },
  strikeDmg: { color: Colors.warning, fontSize: Fonts.sm },
  strikeTraits: { color: Colors.textMuted, fontSize: Fonts.xs, marginTop: 2 },
  strikeBtns: { flexDirection: 'row', gap: 6 },
  strikeRollBtn: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 52,
  },
  strikeRollText: { color: Colors.accent, fontSize: Fonts.lg, fontWeight: '800' },
  strikeRollSub: { color: Colors.textMuted, fontSize: 10 },
  strikeDmgBtn: { backgroundColor: Colors.warning + '22' },
  strikeDmgSub: { color: Colors.warning, fontSize: 10 },
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
  profRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, gap: 8 },
  profRowLabel: { color: Colors.textSecondary, fontSize: Fonts.sm, minWidth: 90 },
  profPickerWrap: { flex: 1 },
  // Dice editor
  diceEditor: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 4 },
  diceCountWrap: { width: 120 },
  diceTypesWrap: { flex: 1 },
  diceSubLabel: { color: Colors.textMuted, fontSize: 10, marginBottom: 4 },
  diceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 6,
  },
  diceBtnActive: { backgroundColor: Colors.warning + '33', borderColor: Colors.warning },
  diceBtnText: { color: Colors.textSecondary, fontSize: Fonts.sm, fontWeight: '600' },
  diceBtnTextActive: { color: Colors.warning, fontWeight: '700' },
  dicePreview: { color: Colors.warning, fontSize: Fonts.base, fontWeight: '700', marginTop: 4 },
  // Тип урона — сетка чипсов
  dmgTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  dmgTypeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  dmgTypeChipActive: {
    backgroundColor: Colors.danger + '33',
    borderColor: Colors.danger,
  },
  dmgTypeText: { color: Colors.textSecondary, fontSize: Fonts.xs, fontWeight: '600' },
  dmgTypeTextActive: { color: Colors.danger, fontWeight: '700' },
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
