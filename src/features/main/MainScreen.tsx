import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Character, AbilityScores, Proficiency } from '../../domain/types';
import {
  abilityMod, calcAC, calcFortitude, calcReflex, calcWill,
  calcPerception, calcClassDC, profBonus, rollD20,
} from '../../domain/pf2eCalc';
import { Colors, Fonts, Radius, Shadow, PROF_LABEL, PROF_COLOR } from '../../ui/theme';
import { DiceRoller } from '../../components/DiceRoller';
import { ProficiencyPicker } from '../../components/ProficiencyPicker';
import { NumberInput } from '../../components/NumberInput';

interface Props {
  character: Character;
  onCharChange: (ch: Character) => void;
}

type DiceResult = { label: string; roll: number; bonus: number; total: number } | null;

const ABILITY_LABELS: [keyof AbilityScores, string][] = [
  ['str', 'Сила'],
  ['dex', 'Ловкость'],
  ['con', 'Выносливость'],
  ['int', 'Интеллект'],
  ['wis', 'Мудрость'],
  ['cha', 'Харизма'],
];

export function MainScreen({ character: char, onCharChange }: Props) {
  const [diceResult, setDiceResult] = useState<DiceResult>(null);

  const upd = useCallback((partial: Partial<Character>) => {
    onCharChange({ ...char, ...partial });
  }, [char, onCharChange]);

  const rollSave = (label: string, bonus: number) => {
    const r = rollD20();
    setDiceResult({ label, roll: r, bonus, total: r + bonus });
  };

  const ac = calcAC(char);
  const fort = calcFortitude(char);
  const refl = calcReflex(char);
  const will = calcWill(char);
  const perc = calcPerception(char);
  const classDC = calcClassDC(char);
  const hpPct = char.hp.max > 0 ? char.hp.current / char.hp.max : 0;
  const hpColor = hpPct > 0.5 ? Colors.accent : hpPct > 0.25 ? Colors.warning : Colors.danger;

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Bio Card ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Персонаж</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.fieldLabel}>Имя</Text>
              <TextInput
                style={styles.fieldInput}
                value={char.name}
                onChangeText={name => upd({ name })}
                placeholder="Имя персонажа"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.levelBox}>
              <Text style={styles.fieldLabel}>Уровень</Text>
              <NumberInput
                value={char.level}
                onChange={level => upd({ level })}
                min={1}
                max={20}
                compact
              />
            </View>
          </View>

          <View style={styles.gridTwo}>
            <View style={styles.flex1}>
              <Text style={styles.fieldLabel}>Народ</Text>
              <TextInput style={styles.fieldInput} value={char.ancestry} onChangeText={ancestry => upd({ ancestry })} placeholder="Человек…" placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.fieldLabel}>Класс</Text>
              <TextInput style={styles.fieldInput} value={char.characterClass} onChangeText={characterClass => upd({ characterClass })} placeholder="Воин…" placeholderTextColor={Colors.textMuted} />
            </View>
          </View>

          <View style={styles.gridTwo}>
            <View style={styles.flex1}>
              <Text style={styles.fieldLabel}>Происхождение</Text>
              <TextInput style={styles.fieldInput} value={char.background} onChangeText={background => upd({ background })} placeholder="Акробат…" placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.fieldLabel}>Игрок</Text>
              <TextInput style={styles.fieldInput} value={char.playerName} onChangeText={playerName => upd({ playerName })} placeholder="Ваше имя" placeholderTextColor={Colors.textMuted} />
            </View>
          </View>
        </View>

        {/* ── Ability Scores ───────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Характеристики</Text>
          <View style={styles.abilityGrid}>
            {ABILITY_LABELS.map(([key, label]) => {
              const score = char.abilities[key];
              const mod = abilityMod(score);
              return (
                <View key={key} style={styles.abilityCard}>
                  <Text style={styles.abilityLabel}>{label.toUpperCase()}</Text>
                  <Text style={styles.abilityMod}>
                    {mod >= 0 ? `+${mod}` : `${mod}`}
                  </Text>
                  <TextInput
                    style={styles.abilityScore}
                    value={String(score)}
                    onChangeText={v => {
                      const n = parseInt(v, 10);
                      if (!isNaN(n)) upd({ abilities: { ...char.abilities, [key]: n } });
                    }}
                    keyboardType="numeric"
                    selectTextOnFocus={true}
                    maxLength={2}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* ── HP & Defences ────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Здоровье</Text>

          {/* HP Bar */}
          <View style={styles.hpBarContainer}>
            <View style={[styles.hpBar, { width: `${Math.max(0, Math.min(100, hpPct * 100))}%`, backgroundColor: hpColor }]} />
          </View>

          <View style={styles.hpRow}>
            <View style={styles.hpBlock}>
              <Text style={styles.fieldLabel}>Текущие HP</Text>
              <NumberInput value={char.hp.current} onChange={v => upd({ hp: { ...char.hp, current: v } })} min={-999} max={char.hp.max} compact />
            </View>
            <View style={styles.hpBlock}>
              <Text style={styles.fieldLabel}>Максимум HP</Text>
              <NumberInput value={char.hp.max} onChange={v => upd({ hp: { ...char.hp, max: v } })} min={1} compact />
            </View>
            <View style={styles.hpBlock}>
              <Text style={styles.fieldLabel}>Временные HP</Text>
              <NumberInput value={char.hp.temp} onChange={v => upd({ hp: { ...char.hp, temp: v } })} min={0} compact />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.fieldLabel}>При смерти (0–4)</Text>
              <NumberInput value={char.dying} onChange={dying => upd({ dying })} min={0} max={4} compact />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.fieldLabel}>Ранение (0–4)</Text>
              <NumberInput value={char.wounded} onChange={wounded => upd({ wounded })} min={0} max={4} compact />
            </View>
          </View>

          {/* Hero Points */}
          <View style={styles.heroPointsRow}>
            <Text style={styles.fieldLabel}>Очки героизма</Text>
            <View style={styles.heroDotsRow}>
              {[1, 2, 3].map(i => (
                <TouchableOpacity
                  key={i}
                  onPress={() => upd({ heroPoints: char.heroPoints === i ? i - 1 : i })}
                >
                  <Ionicons
                    name={i <= char.heroPoints ? 'star' : 'star-outline'}
                    size={28}
                    color={i <= char.heroPoints ? Colors.gold : Colors.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Defense ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Защита</Text>

          {/* AC */}
          <View style={styles.acRow}>
            <View style={styles.acBig}>
              <Text style={styles.fieldLabel}>КБ (Класс Брони)</Text>
              <Text style={styles.acValue}>{ac}</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.fieldLabel}>Умение в броне</Text>
              <ProficiencyPicker
                value={char.armorClass.proficiency}
                onChange={proficiency => upd({ armorClass: { ...char.armorClass, proficiency } })}
              />
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={styles.miniLabel}>Бонус предмета</Text>
                  <NumberInput value={char.armorClass.itemBonus} onChange={v => upd({ armorClass: { ...char.armorClass, itemBonus: v } })} compact />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.miniLabel}>Штраф брони</Text>
                  <NumberInput value={char.armorCheckPenalty} onChange={armorCheckPenalty => upd({ armorCheckPenalty })} min={-10} max={0} compact />
                </View>
              </View>
            </View>
          </View>

          {/* Saves */}
          <View style={styles.savesGrid}>
            {[
              { label: 'Стойкость', value: fort, prof: char.saves.fortitude, key: 'fortitude' as const, bonus: char.saves.fortitudeBonus, bonusKey: 'fortitudeBonus' as const },
              { label: 'Реакция', value: refl, prof: char.saves.reflex, key: 'reflex' as const, bonus: char.saves.reflexBonus, bonusKey: 'reflexBonus' as const },
              { label: 'Воля', value: will, prof: char.saves.will, key: 'will' as const, bonus: char.saves.willBonus, bonusKey: 'willBonus' as const },
            ].map(s => (
              <View key={s.key} style={styles.saveCard}>
                <Text style={styles.saveLabel}>{s.label}</Text>
                <TouchableOpacity
                  style={styles.saveValueBtn}
                  onPress={() => rollSave(s.label, s.value)}
                >
                  <Text style={styles.saveValue}>
                    {s.value >= 0 ? `+${s.value}` : `${s.value}`}
                  </Text>
                </TouchableOpacity>
                <ProficiencyPicker
                  value={s.prof}
                  onChange={p => upd({ saves: { ...char.saves, [s.key]: p } })}
                />
                <Text style={styles.miniLabel}>Прочее</Text>
                <NumberInput value={s.bonus} onChange={v => upd({ saves: { ...char.saves, [s.bonusKey]: v } })} compact />
              </View>
            ))}
          </View>

          {/* Perception */}
          <View style={styles.percRow}>
            <View style={styles.flex1}>
              <Text style={styles.fieldLabel}>Восприятие</Text>
              <ProficiencyPicker
                value={char.perception.proficiency}
                onChange={proficiency => upd({ perception: { ...char.perception, proficiency } })}
              />
            </View>
            <TouchableOpacity
              style={styles.percValueBtn}
              onPress={() => rollSave('Восприятие', perc)}
            >
              <Text style={styles.percValue}>
                {perc >= 0 ? `+${perc}` : `${perc}`}
              </Text>
              <Text style={styles.miniLabel}>бросить d20</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Other ────────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Прочее</Text>
          <View style={styles.gridTwo}>
            <View style={styles.flex1}>
              <Text style={styles.fieldLabel}>Скорость (фт)</Text>
              <NumberInput value={char.speed} onChange={speed => upd({ speed })} min={0} max={120} step={5} compact />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.fieldLabel}>Классовая СЛ</Text>
              <Text style={styles.readonlyValue}>{classDC}</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Языки</Text>
          <TextInput
            style={styles.fieldInput}
            value={char.languages.join(', ')}
            onChangeText={v => upd({ languages: v.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="Общий, Эльфийский…"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.fieldLabel}>Состояния (через запятую)</Text>
          <TextInput
            style={styles.fieldInput}
            value={char.conditions.map(c => c.value != null ? `${c.name} ${c.value}` : c.name).join(', ')}
            onChangeText={v => {
              const conditions = v.split(',').map(s => s.trim()).filter(Boolean).map((s, i) => ({ id: String(i), name: s }));
              upd({ conditions });
            }}
            placeholder="Оглушён 2, Напуган 1…"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

      </ScrollView>

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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  sectionTitle: {
    color: Colors.accent,
    fontSize: Fonts.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  flex1: { flex: 1 },
  gridTwo: { flexDirection: 'row', gap: 10 },
  fieldLabel: { color: Colors.textSecondary, fontSize: Fonts.xs, marginBottom: 4, letterSpacing: 0.5 },
  miniLabel: { color: Colors.textMuted, fontSize: 10, marginBottom: 2, marginTop: 4 },
  fieldInput: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: Fonts.sm,
    padding: 8,
  },
  levelBox: { width: 120 },
  // Abilities
  abilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  abilityCard: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    alignItems: 'center',
    width: '30%',
    minWidth: 90,
  },
  abilityLabel: { color: Colors.textMuted, fontSize: 9, letterSpacing: 0.5 },
  abilityMod: { color: Colors.accent, fontSize: Fonts.xl, fontWeight: '800', lineHeight: 28 },
  abilityScore: {
    color: Colors.textSecondary,
    fontSize: Fonts.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    width: '100%',
    textAlign: 'center',
    paddingTop: 4,
    marginTop: 4,
  },
  // HP
  hpBarContainer: {
    height: 8,
    backgroundColor: Colors.bg,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: 4,
  },
  hpBar: { height: '100%', borderRadius: Radius.full },
  hpRow: { flexDirection: 'row', gap: 8 },
  hpBlock: { flex: 1 },
  // Hero Points
  heroPointsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroDotsRow: { flexDirection: 'row', gap: 8 },
  // Defense
  acRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  acBig: { alignItems: 'center', justifyContent: 'center', minWidth: 80 },
  acValue: {
    color: Colors.accent,
    fontSize: Fonts.xxxl,
    fontWeight: '900',
  },
  savesGrid: { flexDirection: 'row', gap: 8 },
  saveCard: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 8,
    alignItems: 'center',
    gap: 4,
  },
  saveLabel: { color: Colors.textSecondary, fontSize: Fonts.xs, textAlign: 'center' },
  saveValueBtn: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginVertical: 2,
  },
  saveValue: { color: Colors.textPrimary, fontSize: Fonts.lg, fontWeight: '800' },
  percRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  percValueBtn: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  percValue: { color: Colors.accent, fontSize: Fonts.xl, fontWeight: '800' },
  readonlyValue: {
    color: Colors.textPrimary,
    fontSize: Fonts.lg,
    fontWeight: '700',
    paddingVertical: 4,
  },
});
