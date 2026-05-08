import React, { useState, useMemo } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radius } from '../../ui/theme';
import { feats } from '../../data/pf2eData';
import { Character, AbilityScores } from '../../domain/types';
import { ALL_SKILLS, SKILL_NAMES } from './CreateCharacterWizard';

const ABILITY_SHORT: Record<keyof AbilityScores, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
};
const ABILITIES: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

// Что получает персонаж на каждом уровне PF2e
function getLevelGrants(level: number, characterClass: string): string[] {
  const grants: string[] = [];
  grants.push('class_feat'); // Class Feat на каждом чётном... нет — на каждом уровне с 1
  // Правильная таблица PF2e:
  // Lvl 1: ancestry_feat (уже выбран), class_feat
  // Lvl 2: class_feat, skill_feat
  // Lvl 3: general_feat, skill_increase
  // Lvl 4: class_feat, skill_feat
  // Lvl 5: ability_boosts(4), ancestry_feat, skill_increase
  // Lvl 6: class_feat, skill_feat
  // Lvl 7: general_feat, skill_increase
  // и т.д.

  const base: string[] = [];

  // Class feat — каждые чётные уровни с 2
  if (level % 2 === 0 || level >= 2) base.push('class_feat');

  // Skill feat — уровни 2,4,6,8,10...
  if (level >= 2 && level % 2 === 0) base.push('skill_feat');

  // General feat — уровни 3,7,11,15,19
  if ([3, 7, 11, 15, 19].includes(level)) base.push('general_feat');

  // Skill increase — уровни 3,5,7,9,11,13,15,17,19
  const skillIncreaseLevels = [3, 5, 7, 9, 11, 13, 15, 17, 19];
  if (skillIncreaseLevels.includes(level)) base.push('skill_increase');

  // Ancestry feat — уровни 1,5,9,13,17
  const ancestryFeatLevels = [5, 9, 13, 17];
  if (ancestryFeatLevels.includes(level)) base.push('ancestry_feat');

  // Ability boosts — уровни 5,10,15,20
  if ([5, 10, 15, 20].includes(level)) base.push('ability_boosts');

  // Если уровень 1, только class feat (ancestry feat уже выбрали)
  if (level === 1) return ['class_feat'];

  return base.length > 0 ? base : ['class_feat'];
}

const PROF_ORDER: string[] = ['U', 'T', 'E', 'M', 'L'];
const PROF_NAMES: Record<string, string> = {
  U: 'Неизученный', T: 'Изученный', E: 'Эксперт', M: 'Мастер', L: 'Легенда'
};

interface LevelUpModalProps {
  visible: boolean;
  character: Character;
  onConfirm: (updates: LevelUpUpdates) => void;
  onClose: () => void;
}

export interface LevelUpUpdates {
  newLevel: number;
  classFeat?: string;
  skillFeat?: string;
  generalFeat?: string;
  ancestryFeat?: string;
  skillIncrease?: { skill: string; newRank: string };
  abilityBoosts?: Partial<Record<keyof AbilityScores, boolean>>;
  hpIncrease: number;
}

function parseFeats(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((i: any) => i?.type === 'feat' && i?.system);
  return [];
}

function getName(item: any): string {
  return item?.name ?? '???';
}
function getDesc(item: any): string {
  return item?.system?.description?.value
    ? item.system.description.value.replace(/<[^>]*>/g, '').slice(0, 100) : '';
}

function FeatPicker({
  title, items, selected, onSelect
}: { title: string; items: any[]; selected: string; onSelect: (n: string) => void }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
          {items.slice(0, 30).map((feat, i) => {
            const n = getName(feat);
            const active = selected === n;
            return (
              <TouchableOpacity
                key={i}
                style={[s.featChip, active && s.featChipActive]}
                onPress={() => onSelect(active ? '' : n)}
              >
                <Text style={[s.featChipText, active && s.featChipTextActive]}>{n}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export function LevelUpModal({ visible, character, onConfirm, onClose }: LevelUpModalProps) {
  const newLevel = ((character as any).level ?? 1) + 1;
  const grants = useMemo(() => getLevelGrants(newLevel, character.characterClass), [newLevel]);

  const [classFeat, setClassFeat] = useState('');
  const [skillFeat, setSkillFeat] = useState('');
  const [generalFeat, setGeneralFeat] = useState('');
  const [ancestryFeat, setAncestryFeat] = useState('');
  const [skillIncrease, setSkillIncrease] = useState<{ skill: string; newRank: string } | null>(null);
  const [abilityBoosts, setAbilityBoosts] = useState<Partial<Record<keyof AbilityScores, boolean>>>({});

  const allFeats = useMemo(() => parseFeats(feats), []);

  // Фиты класса (level <= newLevel)
  const classFeats = useMemo(() => {
    const className = character.characterClass?.toLowerCase().replace(/\s+/g, '-') ?? '';
    return allFeats.filter(f => {
      const traits: string[] = f?.system?.traits?.value ?? [];
      const level = f?.system?.level?.value ?? 99;
      return level <= newLevel && traits.some(t => t.toLowerCase() === className);
    });
  }, [allFeats, newLevel, character.characterClass]);

  // Skill feats
  const skillFeats = useMemo(() => {
    return allFeats.filter(f => {
      const traits: string[] = f?.system?.traits?.value ?? [];
      const level = f?.system?.level?.value ?? 99;
      return level <= newLevel && traits.includes('skill');
    });
  }, [allFeats, newLevel]);

  // General feats
  const generalFeats = useMemo(() => {
    return allFeats.filter(f => {
      const traits: string[] = f?.system?.traits?.value ?? [];
      const level = f?.system?.level?.value ?? 99;
      return level <= newLevel && traits.includes('general') && !traits.includes('skill');
    });
  }, [allFeats, newLevel]);

  // Ancestry feats
  const ancestryFeatsAll = useMemo(() => {
    const slug = character.ancestry?.toLowerCase().replace(/\s+/g, '-') ?? '';
    return allFeats.filter(f => {
      const traits: string[] = f?.system?.traits?.value ?? [];
      const level = f?.system?.level?.value ?? 99;
      return level <= newLevel && traits.some(t => t.toLowerCase() === slug);
    });
  }, [allFeats, newLevel, character.ancestry]);

  // HP от повышения уровня
  const hpIncrease = useMemo(() => {
    const classHpPerLevel = 6; // TODO: брать из classEntry
    const conMod = Math.floor(((character.abilities?.con ?? 10) - 10) / 2);
    return classHpPerLevel + conMod;
  }, [character]);

  // Ability boosts — 4 штуки
  const boostsUsed = Object.values(abilityBoosts).filter(Boolean).length;
  const boostsLeft = 4 - boostsUsed;

  const toggleBoost = (ab: keyof AbilityScores) => {
    const cur = abilityBoosts[ab];
    if (cur) {
      setAbilityBoosts({ ...abilityBoosts, [ab]: false });
    } else if (boostsLeft > 0) {
      setAbilityBoosts({ ...abilityBoosts, [ab]: true });
    }
  };

  const canConfirm = () => {
    if (grants.includes('ability_boosts') && boostsUsed < 4) return false;
    return true;
  };

  const handleConfirm = () => {
    onConfirm({
      newLevel,
      classFeat: classFeat || undefined,
      skillFeat: skillFeat || undefined,
      generalFeat: generalFeat || undefined,
      ancestryFeat: ancestryFeat || undefined,
      skillIncrease: skillIncrease || undefined,
      abilityBoosts: grants.includes('ability_boosts') ? abilityBoosts : undefined,
      hpIncrease,
    });
    // Сброс
    setClassFeat('');
    setSkillFeat('');
    setGeneralFeat('');
    setAncestryFeat('');
    setSkillIncrease(null);
    setAbilityBoosts({});
  };

  const currentSkillRanks: Record<string, string> = {};
  ALL_SKILLS.forEach(s => {
    const key = s as keyof typeof character.skills;
    currentSkillRanks[s] = (character.skills as any)?.[key]?.proficiency ?? 'U';
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <View>
              <Text style={s.sheetTitle}>🎉 Уровень {newLevel}!</Text>
              <Text style={s.sheetSub}>Выбери новые способности</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* HP */}
          <View style={s.hpBox}>
            <Ionicons name="heart" size={16} color={Colors.danger} />
            <Text style={s.hpText}>+{hpIncrease} HP (HP класса + CON)</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

            {/* Class Feat */}
            {grants.includes('class_feat') && (
              <FeatPicker
                title="Class Feat"
                items={classFeats}
                selected={classFeat}
                onSelect={setClassFeat}
              />
            )}

            {/* Skill Feat */}
            {grants.includes('skill_feat') && (
              <FeatPicker
                title="Skill Feat"
                items={skillFeats}
                selected={skillFeat}
                onSelect={setSkillFeat}
              />
            )}

            {/* General Feat */}
            {grants.includes('general_feat') && (
              <FeatPicker
                title="General Feat"
                items={generalFeats}
                selected={generalFeat}
                onSelect={setGeneralFeat}
              />
            )}

            {/* Ancestry Feat */}
            {grants.includes('ancestry_feat') && (
              <FeatPicker
                title={`Ancestry Feat (${character.ancestry})`}
                items={ancestryFeatsAll}
                selected={ancestryFeat}
                onSelect={setAncestryFeat}
              />
            )}

            {/* Skill Increase */}
            {grants.includes('skill_increase') && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Skill Increase</Text>
                <Text style={s.sectionSub}>Повысь ранг навыка</Text>
                <View style={s.skillGrid}>
                  {ALL_SKILLS.map(skill => {
                    const currentRank = currentSkillRanks[skill];
                    const currentIdx = PROF_ORDER.indexOf(currentRank);
                    const maxRank = newLevel >= 7 ? 'M' : newLevel >= 3 ? 'E' : 'T';
                    const maxIdx = PROF_ORDER.indexOf(maxRank);
                    const canIncrease = currentIdx < maxIdx;
                    const isSelected = skillIncrease?.skill === skill;
                    if (!canIncrease && !isSelected) return null;
                    return (
                      <TouchableOpacity
                        key={skill}
                        style={[s.skillChip, isSelected && s.skillChipActive]}
                        onPress={() => {
                          if (isSelected) {
                            setSkillIncrease(null);
                          } else {
                            const newRank = PROF_ORDER[currentIdx + 1] ?? maxRank;
                            setSkillIncrease({ skill, newRank });
                          }
                        }}
                      >
                        <Text style={[s.skillChipText, isSelected && s.skillChipTextActive]}>
                          {SKILL_NAMES[skill] ?? skill}
                        </Text>
                        <Text style={s.skillRankText}>
                          {PROF_NAMES[currentRank] ?? currentRank} → {PROF_NAMES[PROF_ORDER[currentIdx + 1]] ?? '?'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Ability Boosts */}
            {grants.includes('ability_boosts') && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>4 Ability Boosts</Text>
                <Text style={s.sectionSub}>Выбери 4 характеристики · осталось: {boostsLeft}</Text>
                <View style={s.boostRow}>
                  {ABILITIES.map(ab => (
                    <TouchableOpacity
                      key={ab}
                      style={[s.boostBtn, abilityBoosts[ab] && s.boostBtnActive]}
                      onPress={() => toggleBoost(ab)}
                    >
                      <Text style={[s.boostBtnText, abilityBoosts[ab] && s.boostBtnTextActive]}>
                        {ABILITY_SHORT[ab]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          <TouchableOpacity
            style={[s.confirmBtn, !canConfirm() && s.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!canConfirm()}
          >
            <Text style={s.confirmBtnText}>Применить · Уровень {newLevel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', padding: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  sheetTitle: { color: Colors.textPrimary, fontSize: Fonts.lg, fontWeight: '800' },
  sheetSub: { color: Colors.textMuted, fontSize: Fonts.xs, marginTop: 2 },
  hpBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.danger + '15', borderRadius: Radius.sm, padding: 10, marginBottom: 16 },
  hpText: { color: Colors.danger, fontSize: Fonts.sm, fontWeight: '600' },
  section: { marginBottom: 20 },
  sectionTitle: { color: Colors.textPrimary, fontSize: Fonts.sm, fontWeight: '700', marginBottom: 4 },
  sectionSub: { color: Colors.textMuted, fontSize: Fonts.xs, marginBottom: 8 },
  featChip: { backgroundColor: Colors.surface, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 8, maxWidth: 200 },
  featChipActive: { backgroundColor: Colors.accent + '22', borderColor: Colors.accent },
  featChipText: { color: Colors.textMuted, fontSize: Fonts.xs, fontWeight: '600' },
  featChipTextActive: { color: Colors.accent },
  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { backgroundColor: Colors.surface, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, padding: 8, minWidth: '45%' },
  skillChipActive: { backgroundColor: Colors.gold + '22', borderColor: Colors.gold },
  skillChipText: { color: Colors.textPrimary, fontSize: Fonts.xs, fontWeight: '600' },
  skillChipTextActive: { color: Colors.gold },
  skillRankText: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  boostRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  boostBtn: { backgroundColor: Colors.bg, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 10 },
  boostBtnActive: { backgroundColor: Colors.accent + '22', borderColor: Colors.accent },
  boostBtnText: { color: Colors.textMuted, fontSize: Fonts.xs, fontWeight: '700' },
  boostBtnTextActive: { color: Colors.accent },
  confirmBtn: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { color: '#000', fontSize: Fonts.base, fontWeight: '700' },
});
