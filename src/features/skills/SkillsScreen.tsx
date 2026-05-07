import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Character, SkillMap, AbilityScores, Proficiency, SkillEntry } from '../../domain/types';
import { calcSkill, rollD20 } from '../../domain/pf2eCalc';
import { Colors, Fonts, Radius, Shadow, PROF_LABEL, PROF_COLOR } from '../../ui/theme';
import { DiceRoller } from '../../components/DiceRoller';
import { ProficiencyPicker } from '../../components/ProficiencyPicker';
import { NumberInput } from '../../components/NumberInput';

interface Props {
  character: Character;
  onCharChange: (ch: Character) => void;
}

type DiceResult = { label: string; roll: number; bonus: number; total: number } | null;

interface SkillDef {
  key: keyof SkillMap;
  name: string;
  ability: keyof AbilityScores;
  armorPenalty: boolean;
  nameable?: boolean; // для Знания (lore)
}

const SKILLS: SkillDef[] = [
  { key: 'acrobatics',   name: 'Акробатика',   ability: 'dex', armorPenalty: true  },
  { key: 'athletics',    name: 'Атлетика',      ability: 'str', armorPenalty: true  },
  { key: 'thievery',     name: 'Воровство',     ability: 'dex', armorPenalty: true  },
  { key: 'survival',     name: 'Выживание',     ability: 'wis', armorPenalty: false },
  { key: 'diplomacy',    name: 'Дипломатия',    ability: 'cha', armorPenalty: false },
  { key: 'intimidation', name: 'Запугивание',   ability: 'cha', armorPenalty: false },
  { key: 'lore1',        name: 'Знание',        ability: 'int', armorPenalty: false, nameable: true },
  { key: 'lore2',        name: 'Знание',        ability: 'int', armorPenalty: false, nameable: true },
  { key: 'performance',  name: 'Исполнение',    ability: 'cha', armorPenalty: false },
  { key: 'medicine',     name: 'Медицина',      ability: 'wis', armorPenalty: false },
  { key: 'occultism',    name: 'Мистицизм',     ability: 'int', armorPenalty: false },
  { key: 'deception',    name: 'Обман',         ability: 'cha', armorPenalty: false },
  { key: 'society',      name: 'Общество',      ability: 'int', armorPenalty: false },
  { key: 'occultism',    name: 'Оккультизм',    ability: 'int', armorPenalty: false },
  { key: 'nature',       name: 'Природа',       ability: 'wis', armorPenalty: false },
  { key: 'religion',     name: 'Религия',       ability: 'wis', armorPenalty: false },
  { key: 'crafting',     name: 'Ремесло',       ability: 'int', armorPenalty: false },
  { key: 'stealth',      name: 'Скрытность',    ability: 'dex', armorPenalty: true  },
];

// De-duplicate by key (occultism appears twice in the user spec — keep first)
const UNIQUE_SKILLS = SKILLS.filter((s, idx) => SKILLS.findIndex(x => x.key === s.key) === idx);

const ABILITY_SHORT: Record<keyof AbilityScores, string> = {
  str: 'Сил',
  dex: 'Лвк',
  con: 'Вын',
  int: 'Инт',
  wis: 'Мдр',
  cha: 'Хар',
};

export function SkillsScreen({ character: char, onCharChange }: Props) {
  const [diceResult, setDiceResult] = useState<DiceResult>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const upd = useCallback((partial: Partial<Character>) => {
    onCharChange({ ...char, ...partial });
  }, [char, onCharChange]);

  const updSkill = (key: keyof SkillMap, entry: SkillEntry) => {
    upd({ skills: { ...char.skills, [key]: entry } });
  };

  const rollSkill = (label: string, bonus: number) => {
    const r = rollD20();
    setDiceResult({ label, roll: r, bonus, total: r + bonus });
  };

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.note}>
          Штраф брони (Аkr/Атл/Вор/Скр): {char.armorCheckPenalty}
        </Text>

        {UNIQUE_SKILLS.map(def => {
          const entry = char.skills[def.key];
          const displayName = def.nameable
            ? (def.key === 'lore1' ? char.lore1Name : char.lore2Name)
            : def.name;
          const bonus = calcSkill(char, def.ability, entry.proficiency, entry.miscBonus, def.armorPenalty);
          const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;
          const isExpanded = expanded === def.key;

          return (
            <View key={def.key} style={styles.skillCard}>
              {/* Row */}
              <TouchableOpacity
                style={styles.skillRow}
                onPress={() => rollSkill(`${displayName} (${ABILITY_SHORT[def.ability]})`, bonus)}
                onLongPress={() => setExpanded(isExpanded ? null : def.key)}
                activeOpacity={0.7}
              >
                {/* Prof badge */}
                <View style={[styles.profBadge, { backgroundColor: PROF_COLOR[entry.proficiency] + '33', borderColor: PROF_COLOR[entry.proficiency] }]}>
                  <Text style={[styles.profText, { color: PROF_COLOR[entry.proficiency] }]}>
                    {PROF_LABEL[entry.proficiency]}
                  </Text>
                </View>

                {/* Name */}
                <View style={styles.nameCol}>
                  <Text style={styles.skillName}>{displayName}</Text>
                  <Text style={styles.skillAbility}>{ABILITY_SHORT[def.ability]}{def.armorPenalty ? ' · ✦штраф' : ''}</Text>
                </View>

                {/* Bonus */}
                <Text style={styles.bonus}>{bonusStr}</Text>
                <Ionicons name="dice-outline" size={18} color={Colors.textMuted} style={{ marginLeft: 4 }} />
                <TouchableOpacity onPress={() => setExpanded(isExpanded ? null : def.key)} style={styles.expandBtn}>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Expanded editor */}
              {isExpanded && (
                <View style={styles.editor}>
                  {def.nameable && (
                    <View style={styles.editorRow}>
                      <Text style={styles.editorLabel}>Название знания:</Text>
                      <TextInput
                        style={styles.editorInput}
                        value={def.key === 'lore1' ? char.lore1Name : char.lore2Name}
                        onChangeText={v => upd(def.key === 'lore1' ? { lore1Name: v } : { lore2Name: v })}
                        placeholder="Магия, История…"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                  )}
                  <View style={styles.editorRow}>
                    <Text style={styles.editorLabel}>Умение:</Text>
                    <ProficiencyPicker
                      value={entry.proficiency}
                      onChange={p => updSkill(def.key, { ...entry, proficiency: p })}
                    />
                  </View>
                  <View style={styles.editorRow}>
                    <Text style={styles.editorLabel}>Прочее:</Text>
                    <NumberInput
                      value={entry.miscBonus}
                      onChange={v => updSkill(def.key, { ...entry, miscBonus: v })}
                      compact
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <Text style={styles.hint}>Нажмите на навык — бросок d20. Долгое нажатие / стрелка — редактор умения</Text>
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

// Inline Ionicons import (re-export to avoid missing import)
import { Ionicons } from '@expo/vector-icons';

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 12, paddingBottom: 40, gap: 4 },
  note: {
    color: Colors.textMuted,
    fontSize: Fonts.xs,
    marginBottom: 8,
    textAlign: 'right',
  },
  skillCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 4,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  profBadge: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profText: { fontSize: Fonts.xs, fontWeight: '800' },
  nameCol: { flex: 1 },
  skillName: { color: Colors.textPrimary, fontSize: Fonts.base, fontWeight: '600' },
  skillAbility: { color: Colors.textMuted, fontSize: Fonts.xs },
  bonus: { color: Colors.accent, fontSize: Fonts.lg, fontWeight: '800', minWidth: 40, textAlign: 'right' },
  expandBtn: { padding: 4 },
  // Editor
  editor: {
    backgroundColor: Colors.bg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 12,
    gap: 8,
  },
  editorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  editorLabel: { color: Colors.textSecondary, fontSize: Fonts.xs, width: 100 },
  editorInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: Fonts.sm,
    padding: 6,
  },
  hint: {
    color: Colors.textMuted,
    fontSize: Fonts.xs,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
});
