import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radius } from '../../ui/theme';
import { ancestries, heritages, classes, backgrounds, feats } from '../../data/pf2eData';
import { Character, AbilityScores } from '../../domain/types';
import { createDefaultCharacter } from '../../domain/defaultCharacter';
import { saveCharacter } from '../../data/db';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

// Шаги визарда
const STEPS = ['Раса', 'Наследие', 'Ancestry Feat', 'Класс', 'Навыки', 'Предыстория', 'Характеристики', 'Имя'];
const ABILITIES: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_NAMES: Record<keyof AbilityScores, string> = {
  str: 'Сила', dex: 'Ловкость', con: 'Выносливость', int: 'Интеллект', wis: 'Мудрость', cha: 'Харизма',
};
const ABILITY_SHORT: Record<keyof AbilityScores, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
};

// Все навыки PF2e
export const ALL_SKILLS = [
  'acrobatics', 'athletics', 'crafting', 'deception', 'diplomacy',
  'intimidation', 'medicine', 'nature', 'occultism', 'performance',
  'religion', 'society', 'stealth', 'survival', 'thievery',
];
export const SKILL_NAMES: Record<string, string> = {
  acrobatics: 'Акробатика', athletics: 'Атлетика', crafting: 'Ремесло',
  deception: 'Обман', diplomacy: 'Дипломатия', intimidation: 'Запугивание',
  medicine: 'Медицина', nature: 'Природа', occultism: 'Оккультизм',
  performance: 'Выступление', religion: 'Религия', society: 'Общество',
  stealth: 'Скрытность', survival: 'Выживание', thievery: 'Воровство',
};

// ─── Утилиты данных ──────────────────────────────────────────────────────────

function getEntries(json: any): any[] {
  if (!json) return [];
  if (Array.isArray(json)) {
    // Новый формат: первый элемент - папки (объект с value:[]), остальные - реальные данные
    const items = json.filter((i: any) => i?.type !== 'Item' || i?.system);
    // Если есть type:heritage или type:feat — это реальные данные
    const real = json.filter((i: any) => i?.type && i?.system);
    if (real.length > 0) return real;
    // Иначе старый формат
    return json.filter((i: any) => i?.name && !i?.value);
  }
  if (json.items && Array.isArray(json.items)) return json.items;
  const keys = Object.keys(json);
  if (keys.length > 0 && Array.isArray(json[keys[0]])) return json[keys[0]];
  return Object.values(json);
}

function parseHeritages(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    // Фильтруем только объекты с type:'heritage'
    return raw.filter((i: any) => i?.type === 'heritage' && i?.system);
  }
  return [];
}

function parseFeats(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((i: any) => i?.type === 'feat' && i?.system);
  }
  return [];
}

function getName(item: any): string {
  return item?.name ?? item?.system?.name ?? item?._id ?? '???';
}
function getDesc(item: any): string {
  return item?.system?.description?.value
    ? item.system.description.value.replace(/<[^>]*>/g, '').slice(0, 120) : '';
}
function getHp(item: any): string {
  const hp = item?.system?.hp ?? item?.system?.hitPoints;
  return hp ? `HP +${hp}` : '';
}
function getSpeed(item: any): string {
  const s = item?.system?.speed ?? item?.system?.speeds?.value;
  return s ? `Скорость ${s}` : '';
}
function getClassHp(item: any): string {
  const hp = item?.system?.hp ?? item?.system?.hitPoints;
  return hp ? `${hp} HP/ур.` : '';
}
function getKeyAbility(item: any): string {
  const ka = item?.system?.keyAbility?.value;
  if (!ka) return '';
  return Array.isArray(ka) ? ka.join('/').toUpperCase() : String(ka).toUpperCase();
}

// Получаем slug расы наследия
function getHeritageAncestrySlug(item: any): string {
  return item?.system?.ancestry?.slug ?? '';
}

// Получаем slug расы из ancestries.json
function getAncestrySlug(item: any): string {
  return item?.system?.slug ?? item?.name?.toLowerCase().replace(/\s+/g, '-') ?? '';
}

// Versatile Heritage - папка с id 'khXMNyAoAoZ70PpT' (Versatile Heritages)
const VERSATILE_FOLDER_ID = 'khXMNyAoAoZ70PpT';

function isVersatileHeritage(item: any): boolean {
  // Versatile heritages не имеют ancestry.slug или их folder = versatile
  const slug = getHeritageAncestrySlug(item);
  return slug === '' || slug === 'versatile';
}

// ─── Бусты расы ──────────────────────────────────────────────────────────────

function getAncestryBoosts(ancestryEntry: any): { fixed: string[]; free: string[]; flaws: string[] } {
  const boosts = ancestryEntry?.system?.boosts ?? {};
  const flawsRaw = ancestryEntry?.system?.flaws ?? {};
  const fixed: string[] = [];
  const free: string[] = [];

  Object.values(boosts).forEach((b: any) => {
    const vals: string[] = b?.value ?? [];
    if (vals.length === 0 || vals.length >= 6) {
      free.push('free');
    } else {
      fixed.push(...vals);
    }
  });

  const flaws: string[] = [];
  Object.values(flawsRaw).forEach((f: any) => {
    const vals: string[] = f?.value ?? [];
    flaws.push(...vals);
  });

  return { fixed, free, flaws };
}

function getClassKeyAbilities(classEntry: any): string[] {
  const ka = classEntry?.system?.keyAbility?.value;
  if (!ka) return [];
  return Array.isArray(ka) ? ka : [ka];
}

// Сколько навыков даёт класс
function getClassSkillCount(classEntry: any): number {
  return classEntry?.system?.trainedSkills?.additional ?? classEntry?.system?.skillIncrease ?? 2;
}

// Фиксированные навыки класса
function getClassFixedSkills(classEntry: any): string[] {
  const skills = classEntry?.system?.trainedSkills?.value ?? [];
  return skills.map((s: string) => s.toLowerCase());
}

// ─── SelectStep ──────────────────────────────────────────────────────────────

interface SelectStepProps {
  title: string;
  subtitle?: string;
  items: any[];
  selected: string;
  onSelect: (name: string) => void;
  badge?: (item: any) => string;
  badge2?: (item: any) => string;
}

function SelectStep({ title, subtitle, items, selected, onSelect, badge, badge2 }: SelectStepProps) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i => getName(i).toLowerCase().includes(q));
  }, [items, search]);

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.stepTitle}>{title}</Text>
      {subtitle ? <Text style={styles.stepSubtitle}>{subtitle}</Text> : null}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск…"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => {
          const name = getName(item);
          const isSelected = selected === name;
          const b1 = badge ? badge(item) : '';
          const b2 = badge2 ? badge2(item) : '';
          const desc = getDesc(item);
          const isVers = item?.type === 'heritage' && isVersatileHeritage(item);
          return (
            <TouchableOpacity
              style={[styles.row, isSelected && styles.rowSelected]}
              onPress={() => onSelect(name)}
              activeOpacity={0.75}
            >
              <View style={styles.rowLeft}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.rowName, isSelected && styles.rowNameSelected]}>{name}</Text>
                  {isVers && (
                    <View style={styles.versatileBadge}>
                      <Text style={styles.versatileBadgeText}>Versatile</Text>
                    </View>
                  )}
                </View>
                {desc ? <Text style={styles.rowDesc} numberOfLines={2}>{desc}</Text> : null}
                {(b1 || b2) ? (
                  <View style={styles.badgeRow}>
                    {b1 ? <View style={styles.badge}><Text style={styles.badgeText}>{b1}</Text></View> : null}
                    {b2 ? <View style={styles.badge}><Text style={styles.badgeText}>{b2}</Text></View> : null}
                  </View>
                ) : null}
              </View>
              {isSelected && <Ionicons name="checkmark-circle" size={22} color={Colors.accent} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Ничего не найдено</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── SkillsStep ──────────────────────────────────────────────────────────────

interface SkillsStepProps {
  classEntry: any;
  selectedSkills: string[];
  onSkillsChange: (skills: string[]) => void;
}

function SkillsStep({ classEntry, selectedSkills, onSkillsChange }: SkillsStepProps) {
  const fixedSkills = useMemo(() => getClassFixedSkills(classEntry), [classEntry]);
  const extraCount = useMemo(() => getClassSkillCount(classEntry), [classEntry]);
  const freeSkills = selectedSkills.filter(s => !fixedSkills.includes(s));
  const remaining = extraCount - freeSkills.length;

  const toggle = (skill: string) => {
    if (fixedSkills.includes(skill)) return; // фиксированный, нельзя снять
    if (selectedSkills.includes(skill)) {
      onSkillsChange(selectedSkills.filter(s => s !== skill));
    } else if (remaining > 0) {
      onSkillsChange([...selectedSkills, skill]);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Навыки класса</Text>
      <Text style={styles.stepSubtitle}>
        Выбери {extraCount} дополнительных навыка · осталось: {remaining}
      </Text>
      {fixedSkills.length > 0 && (
        <View style={styles.fixedSkillsBox}>
          <Text style={styles.fixedSkillsLabel}>Фиксированные навыки класса:</Text>
          <View style={styles.skillChipRow}>
            {fixedSkills.map(s => (
              <View key={s} style={[styles.skillChip, styles.skillChipFixed]}>
                <Text style={[styles.skillChipText, styles.skillChipTextFixed]}>
                  {SKILL_NAMES[s] ?? s}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <View style={styles.skillGrid}>
        {ALL_SKILLS.map(skill => {
          const isFixed = fixedSkills.includes(skill);
          const isSelected = selectedSkills.includes(skill);
          const canSelect = isSelected || remaining > 0;
          return (
            <TouchableOpacity
              key={skill}
              style={[
                styles.skillChip,
                isFixed && styles.skillChipFixed,
                !isFixed && isSelected && styles.skillChipSelected,
                !isFixed && !isSelected && !canSelect && styles.skillChipDisabled,
              ]}
              onPress={() => toggle(skill)}
              disabled={isFixed}
            >
              <Text style={[
                styles.skillChipText,
                isFixed && styles.skillChipTextFixed,
                !isFixed && isSelected && styles.skillChipTextSelected,
              ]}>
                {SKILL_NAMES[skill] ?? skill}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ─── AbilitiesStep ───────────────────────────────────────────────────────────

interface AbilitiesStepProps {
  ancestryEntry: any;
  classEntry: any;
  freeBoosts: Partial<Record<keyof AbilityScores, number>>;
  classAbilityChoice: keyof AbilityScores | null;
  freeGeneralBoosts: Partial<Record<keyof AbilityScores, number>>;
  onFreeChange: (boosts: Partial<Record<keyof AbilityScores, number>>) => void;
  onClassAbilityChange: (ab: keyof AbilityScores) => void;
  onFreeGeneralChange: (boosts: Partial<Record<keyof AbilityScores, number>>) => void;
}

function AbilitiesStep({
  ancestryEntry, classEntry, freeBoosts, classAbilityChoice,
  freeGeneralBoosts, onFreeChange, onClassAbilityChange, onFreeGeneralChange
}: AbilitiesStepProps) {
  const { fixed, free, flaws } = useMemo(() =>
    getAncestryBoosts(ancestryEntry), [ancestryEntry]);
  const classKeyAbils = useMemo(() =>
    getClassKeyAbilities(classEntry), [classEntry]);
  const needClassChoice = classKeyAbils.length > 1;

  const boostCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ABILITIES.forEach(a => { counts[a] = 0; });
    fixed.forEach(a => { if (counts[a] !== undefined) counts[a]++; });
    const classAb = needClassChoice ? classAbilityChoice : (classKeyAbils[0] as keyof AbilityScores);
    if (classAb) counts[classAb]++;
    Object.entries(freeBoosts).forEach(([k, v]) => { if (v) counts[k] += v; });
    Object.entries(freeGeneralBoosts).forEach(([k, v]) => { if (v) counts[k] += v; });
    return counts;
  }, [fixed, freeBoosts, classAbilityChoice, freeGeneralBoosts, classKeyAbils, needClassChoice]);

  const flawCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ABILITIES.forEach(a => { counts[a] = 0; });
    flaws.forEach(a => { if (counts[a] !== undefined) counts[a]++; });
    return counts;
  }, [flaws]);

  const getScore = (ab: keyof AbilityScores) => {
    let score = 10;
    const boosts = boostCounts[ab] || 0;
    const flaw = flawCounts[ab] || 0;
    for (let i = 0; i < boosts; i++) {
      score += score >= 18 ? 1 : 2;
    }
    score -= flaw * 2;
    return score;
  };

  const getMod = (score: number) => {
    const m = Math.floor((score - 10) / 2);
    return m >= 0 ? `+${m}` : `${m}`;
  };

  const freeAncestryCount = free.length;
  const freeAncestryUsed = Object.values(freeBoosts).reduce((s, v) => s + (v || 0), 0);
  const freeAncestryLeft = freeAncestryCount - freeAncestryUsed;
  const freeGeneralUsed = Object.values(freeGeneralBoosts).reduce((s, v) => s + (v || 0), 0);
  const freeGeneralLeft = 4 - freeGeneralUsed;

  const toggleFreeBoost = (ab: keyof AbilityScores) => {
    const cur = freeBoosts[ab] || 0;
    if (cur > 0) {
      onFreeChange({ ...freeBoosts, [ab]: 0 });
    } else if (freeAncestryLeft > 0) {
      onFreeChange({ ...freeBoosts, [ab]: 1 });
    }
  };

  const toggleGeneralBoost = (ab: keyof AbilityScores) => {
    const cur = freeGeneralBoosts[ab] || 0;
    if (cur > 0) {
      onFreeGeneralChange({ ...freeGeneralBoosts, [ab]: 0 });
    } else if (freeGeneralLeft > 0) {
      onFreeGeneralChange({ ...freeGeneralBoosts, [ab]: 1 });
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Характеристики</Text>

      <View style={styles.abilitiesGrid}>
        {ABILITIES.map(ab => {
          const score = getScore(ab);
          const mod = getMod(score);
          const isFixed = fixed.includes(ab);
          const isFlaw = flaws.includes(ab);
          const isClassFixed = !needClassChoice && classKeyAbils[0] === ab;
          return (
            <View key={ab} style={styles.abilityCard}>
              <Text style={styles.abilityShort}>{ABILITY_SHORT[ab]}</Text>
              <Text style={styles.abilityScore}>{score}</Text>
              <Text style={styles.abilityMod}>{mod}</Text>
              <View style={styles.abilityTagRow}>
                {isFixed && (
                  <View style={[styles.abilityTag, { backgroundColor: Colors.accent + '33' }]}>
                    <Text style={[styles.abilityTagText, { color: Colors.accent }]}>раса</Text>
                  </View>
                )}
                {isClassFixed && (
                  <View style={[styles.abilityTag, { backgroundColor: Colors.gold + '33' }]}>
                    <Text style={[styles.abilityTagText, { color: Colors.gold }]}>класс</Text>
                  </View>
                )}
                {isFlaw && (
                  <View style={[styles.abilityTag, { backgroundColor: Colors.danger + '33' }]}>
                    <Text style={[styles.abilityTagText, { color: Colors.danger }]}>штраф</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {needClassChoice && (
        <View style={styles.boostSection}>
          <Text style={styles.boostSectionTitle}>Ключевая хар-ка класса</Text>
          <Text style={styles.boostSectionSub}>Выбери 1</Text>
          <View style={styles.boostRow}>
            {classKeyAbils.map(ab => (
              <TouchableOpacity
                key={ab}
                style={[styles.boostBtn, classAbilityChoice === ab && styles.boostBtnActive]}
                onPress={() => onClassAbilityChange(ab as keyof AbilityScores)}
              >
                <Text style={[styles.boostBtnText, classAbilityChoice === ab && styles.boostBtnTextActive]}>
                  {ABILITY_SHORT[ab as keyof AbilityScores]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {freeAncestryCount > 0 && (
        <View style={styles.boostSection}>
          <Text style={styles.boostSectionTitle}>Свободные бусты расы</Text>
          <Text style={styles.boostSectionSub}>Выбери {freeAncestryCount} · осталось: {freeAncestryLeft}</Text>
          <View style={styles.boostRow}>
            {ABILITIES.map(ab => {
              const active = (freeBoosts[ab] || 0) > 0;
              return (
                <TouchableOpacity
                  key={ab}
                  style={[styles.boostBtn, active && styles.boostBtnActive]}
                  onPress={() => toggleFreeBoost(ab)}
                >
                  <Text style={[styles.boostBtnText, active && styles.boostBtnTextActive]}>
                    {ABILITY_SHORT[ab]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.boostSection}>
        <Text style={styles.boostSectionTitle}>4 свободных усиления</Text>
        <Text style={styles.boostSectionSub}>Выбери любые 4 · осталось: {freeGeneralLeft}</Text>
        <View style={styles.boostRow}>
          {ABILITIES.map(ab => {
            const active = (freeGeneralBoosts[ab] || 0) > 0;
            return (
              <TouchableOpacity
                key={ab}
                style={[styles.boostBtn, active && styles.boostBtnActive]}
                onPress={() => toggleGeneralBoost(ab)}
              >
                <Text style={[styles.boostBtnText, active && styles.boostBtnTextActive]}>
                  {ABILITY_SHORT[ab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={{ height: 16 }} />
    </ScrollView>
  );
}

// ─── Главный визард ───────────────────────────────────────────────────────────

export function CreateCharacterWizard({ visible, onClose, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [selectedAncestry, setSelectedAncestry] = useState('');
  const [selectedHeritage, setSelectedHeritage] = useState('');
  const [selectedAncestryFeat, setSelectedAncestryFeat] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedBackground, setSelectedBackground] = useState('');
  const [freeBoosts, setFreeBoosts] = useState<Partial<Record<keyof AbilityScores, number>>>({});
  const [classAbilityChoice, setClassAbilityChoice] = useState<keyof AbilityScores | null>(null);
  const [freeGeneralBoosts, setFreeGeneralBoosts] = useState<Partial<Record<keyof AbilityScores, number>>>({});
  const [name, setName] = useState('');

  // Парсим данные правильно
  const allAncestries = useMemo(() => getEntries(ancestries), []);
  const allHeritagesRaw = useMemo(() => parseHeritages(heritages), []);
  const allFeatsRaw = useMemo(() => parseFeats(feats), []);
  const allClasses = useMemo(() => getEntries(classes), []);
  const allBackgrounds = useMemo(() => getEntries(backgrounds), []);

  // Наследия для выбранной расы + versatile
  const filteredHeritages = useMemo(() => {
    if (!selectedAncestry) return allHeritagesRaw;
    const ancestryEntry = allAncestries.find(a => getName(a) === selectedAncestry);
    const slug = ancestryEntry ? getAncestrySlug(ancestryEntry) : selectedAncestry.toLowerCase().replace(/\s+/g, '-');
    return allHeritagesRaw.filter(h => {
      const hSlug = getHeritageAncestrySlug(h);
      // Показываем: наследия этой расы ИЛИ versatile (без slug)
      return hSlug === slug || hSlug === '' || isVersatileHeritage(h);
    });
  }, [selectedAncestry, allAncestries, allHeritagesRaw]);

  // Ancestry feats для выбранной расы (уровень 1)
  const ancestryFeatsFiltered = useMemo(() => {
    if (!selectedAncestry) return [];
    const ancestryEntry = allAncestries.find(a => getName(a) === selectedAncestry);
    const slug = ancestryEntry ? getAncestrySlug(ancestryEntry) : selectedAncestry.toLowerCase().replace(/\s+/g, '-');
    return allFeatsRaw.filter(f => {
      const traits: string[] = f?.system?.traits?.value ?? [];
      const level = f?.system?.level?.value ?? 1;
      // Фит расы уровня 1: имеет trait = slug расы
      return level <= 1 && traits.some(t => t.toLowerCase() === slug.toLowerCase());
    });
  }, [selectedAncestry, allAncestries, allFeatsRaw]);

  const ancestryEntry = useMemo(() =>
    allAncestries.find(a => getName(a) === selectedAncestry), [allAncestries, selectedAncestry]);
  const classEntry = useMemo(() =>
    allClasses.find(c => getName(c) === selectedClass), [allClasses, selectedClass]);

  // Сброс зависимых выборов при смене расы
  const handleAncestrySelect = useCallback((name: string) => {
    setSelectedAncestry(name);
    setSelectedHeritage('');
    setSelectedAncestryFeat('');
  }, []);

  // Сброс навыков при смене класса
  const handleClassSelect = useCallback((name: string) => {
    setSelectedClass(name);
    setSelectedSkills([]);
  }, []);

  const canNext = () => {
    if (step === 0) return selectedAncestry !== '';
    if (step === 1) return selectedHeritage !== '';
    if (step === 2) return true; // ancestry feat необязателен
    if (step === 3) return selectedClass !== '';
    if (step === 4) {
      // Навыки: должны быть выбраны все доступные
      const fixed = getClassFixedSkills(classEntry);
      const extra = getClassSkillCount(classEntry);
      const freeSelected = selectedSkills.filter(s => !fixed.includes(s));
      return freeSelected.length >= extra;
    }
    if (step === 5) return true; // предыстория необязательна
    if (step === 6) {
      const { free } = getAncestryBoosts(ancestryEntry);
      const freeUsed = Object.values(freeBoosts).reduce((s, v) => s + (v || 0), 0);
      const classKeys = getClassKeyAbilities(classEntry);
      if (classKeys.length > 1 && !classAbilityChoice) return false;
      if (freeUsed < free.length) return false;
      const generalUsed = Object.values(freeGeneralBoosts).reduce((s, v) => s + (v || 0), 0);
      if (generalUsed < 4) return false;
      return true;
    }
    if (step === 7) return name.trim() !== '';
    return false;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else handleFinish();
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else handleReset();
  };

  const handleReset = () => {
    setStep(0);
    setSelectedAncestry('');
    setSelectedHeritage('');
    setSelectedAncestryFeat('');
    setSelectedClass('');
    setSelectedSkills([]);
    setSelectedBackground('');
    setFreeBoosts({});
    setClassAbilityChoice(null);
    setFreeGeneralBoosts({});
    setName('');
    onClose();
  };

  const handleFinish = async () => {
    const char = createDefaultCharacter();
    char.name = name.trim();
    char.ancestry = selectedAncestry;
    char.heritage = selectedHeritage;
    char.characterClass = selectedClass;
    char.background = selectedBackground;
    // XP
    (char as any).xp = 0;
    (char as any).level = 1;
    // Ancestry feat
    (char as any).ancestryFeat = selectedAncestryFeat;
    // Навыки
    const fixed = getClassFixedSkills(classEntry);
    const allSelected = [...new Set([...fixed, ...selectedSkills])];
    allSelected.forEach(skill => {
      const key = skill as keyof typeof char.skills;
      if (char.skills[key]) {
        char.skills[key].proficiency = 'T';
      }
    });

    // Характеристики
    const { fixed: abilFixed, free: freeList, flaws } = getAncestryBoosts(ancestryEntry);
    const classKeys = getClassKeyAbilities(classEntry);
    const classAb = classKeys.length > 1 ? classAbilityChoice : (classKeys[0] as keyof AbilityScores);

    const applyBoosts = (score: number, count: number) => {
      for (let i = 0; i < count; i++) {
        score += score >= 18 ? 1 : 2;
      }
      return score;
    };

    ABILITIES.forEach(ab => {
      let score = 10;
      let boostCount = 0;
      if (abilFixed.includes(ab)) boostCount++;
      if (classAb === ab) boostCount++;
      if (freeBoosts[ab]) boostCount += freeBoosts[ab] as number;
      if (freeGeneralBoosts[ab]) boostCount += freeGeneralBoosts[ab] as number;
      score = applyBoosts(score, boostCount);
      if (flaws.includes(ab)) score -= 2;
      char.abilities[ab] = score;
    });

    // HP
    const ancestryHp = ancestryEntry?.system?.hp ?? 0;
    const classHp = classEntry?.system?.hp ?? classEntry?.system?.hitPoints ?? 8;
    const conMod = Math.floor((char.abilities.con - 10) / 2);
    char.hp.max = ancestryHp + classHp + conMod;
    char.hp.current = char.hp.max;

    // Скорость
    const speed = ancestryEntry?.system?.speed;
    if (speed) char.speed = speed;

    // Броня
    const heavyClasses = ['Fighter', 'Champion', 'Paladin'];
    const mediumClasses = ['Barbarian', 'Ranger', 'Monk'];
    if (heavyClasses.includes(selectedClass)) {
      char.armorProficiencies = { unarmored: 'T', light: 'T', medium: 'T', heavy: 'T' };
      char.armorClass.proficiency = 'T';
    } else if (mediumClasses.includes(selectedClass)) {
      char.armorProficiencies = { unarmored: 'T', light: 'T', medium: 'T', heavy: 'U' };
      char.armorClass.proficiency = 'T';
    } else {
      char.armorProficiencies = { unarmored: 'T', light: 'T', medium: 'U', heavy: 'U' };
      char.armorClass.proficiency = 'T';
    }

    await saveCharacter(char);
    handleReset();
    onCreated();
  };

  const progress = (step + 1) / STEPS.length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleReset}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name={step === 0 ? 'close' : 'arrow-back'} size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Новый персонаж</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>Шаг {step + 1} из {STEPS.length} · {STEPS[step]}</Text>
        </View>

        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {step === 0 && (
            <SelectStep
              title="Выбери расу"
              items={allAncestries}
              selected={selectedAncestry}
              onSelect={handleAncestrySelect}
              badge={getHp}
              badge2={getSpeed}
            />
          )}
          {step === 1 && (
            <SelectStep
              title="Выбери наследие"
              subtitle={`Наследия для ${selectedAncestry} + Versatile Heritages`}
              items={filteredHeritages}
              selected={selectedHeritage}
              onSelect={setSelectedHeritage}
            />
          )}
          {step === 2 && (
            <SelectStep
              title="Ancestry Feat (1 уровень)"
              subtitle={ancestryFeatsFiltered.length === 0
                ? 'Нет доступных фитов (можно пропустить)'
                : `Выбери фит расы ${selectedAncestry}`}
              items={ancestryFeatsFiltered}
              selected={selectedAncestryFeat}
              onSelect={setSelectedAncestryFeat}
            />
          )}
          {step === 3 && (
            <SelectStep
              title="Выбери класс"
              items={allClasses}
              selected={selectedClass}
              onSelect={handleClassSelect}
              badge={getClassHp}
              badge2={getKeyAbility}
            />
          )}
          {step === 4 && (
            <SkillsStep
              classEntry={classEntry}
              selectedSkills={selectedSkills}
              onSkillsChange={setSelectedSkills}
            />
          )}
          {step === 5 && (
            <SelectStep
              title="Выбери предысторию"
              subtitle="Необязательно"
              items={allBackgrounds}
              selected={selectedBackground}
              onSelect={setSelectedBackground}
            />
          )}
          {step === 6 && (
            <AbilitiesStep
              ancestryEntry={ancestryEntry}
              classEntry={classEntry}
              freeBoosts={freeBoosts}
              classAbilityChoice={classAbilityChoice}
              freeGeneralBoosts={freeGeneralBoosts}
              onFreeChange={setFreeBoosts}
              onClassAbilityChange={setClassAbilityChoice}
              onFreeGeneralChange={setFreeGeneralBoosts}
            />
          )}
          {step === 7 && (
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Имя персонажа</Text>
              <View style={styles.summaryCard}>
                <SummaryRow label="Раса" value={selectedAncestry || '—'} />
                <SummaryRow label="Наследие" value={selectedHeritage || '—'} />
                <SummaryRow label="Ancestry Feat" value={selectedAncestryFeat || '—'} />
                <SummaryRow label="Класс" value={selectedClass || '—'} />
                <SummaryRow label="Предыстория" value={selectedBackground || '—'} />
                <SummaryRow
                  label="Навыки"
                  value={selectedSkills.length > 0
                    ? selectedSkills.map(s => SKILL_NAMES[s] ?? s).join(', ')
                    : '—'}
                />
              </View>
              <Text style={styles.inputLabel}>Имя *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Эстрид из Айвенхоу…"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>
          )}
        </View>

        <View style={styles.footer}>
          {step === 2 && !selectedAncestryFeat && (
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: Colors.border, marginBottom: 8 }]}
              onPress={() => setStep(step + 1)}
            >
              <Text style={[styles.nextBtnText, { color: Colors.textMuted }]}>Пропустить</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, !canNext() && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canNext()}
          >
            <Text style={styles.nextBtnText}>
              {step === STEPS.length - 1 ? 'Создать персонажа' : 'Далее'}
            </Text>
            {step < STEPS.length - 1 && (
              <Ionicons name="arrow-forward" size={18} color="#000" style={{ marginLeft: 8 }} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={2} style={{ flex: 1, textAlign: 'right', color: Colors.textPrimary, fontSize: Fonts.sm, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.textPrimary, fontSize: Fonts.md, fontWeight: '700' },
  progressContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  progressBg: { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginBottom: 8, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: Colors.accent, borderRadius: 2 },
  progressLabel: { color: Colors.textMuted, fontSize: Fonts.xs },
  stepTitle: { color: Colors.textPrimary, fontSize: Fonts.lg, fontWeight: '700', marginBottom: 4, marginTop: 4 },
  stepSubtitle: { color: Colors.textMuted, fontSize: Fonts.xs, marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: Fonts.base },
  row: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center' },
  rowSelected: { borderColor: Colors.accent, backgroundColor: Colors.accent + '15' },
  rowLeft: { flex: 1 },
  rowName: { color: Colors.textPrimary, fontSize: Fonts.base, fontWeight: '600', marginBottom: 2 },
  rowNameSelected: { color: Colors.accent },
  rowDesc: { color: Colors.textMuted, fontSize: Fonts.xs, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge: { backgroundColor: Colors.accent + '22', borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: Colors.accent + '44' },
  badgeText: { color: Colors.accent, fontSize: Fonts.xs, fontWeight: '600' },
  versatileBadge: { backgroundColor: Colors.gold + '22', borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: Colors.gold + '55' },
  versatileBadgeText: { color: Colors.gold, fontSize: 9, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: Colors.textMuted, fontSize: Fonts.sm },
  // Skills
  fixedSkillsBox: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 12, marginBottom: 12 },
  fixedSkillsLabel: { color: Colors.textMuted, fontSize: Fonts.xs, marginBottom: 8, fontWeight: '600' },
  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  skillChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: { backgroundColor: Colors.surface, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 8 },
  skillChipFixed: { backgroundColor: Colors.accent + '22', borderColor: Colors.accent },
  skillChipSelected: { backgroundColor: Colors.gold + '22', borderColor: Colors.gold },
  skillChipDisabled: { opacity: 0.4 },
  skillChipText: { color: Colors.textMuted, fontSize: Fonts.xs, fontWeight: '600' },
  skillChipTextFixed: { color: Colors.accent },
  skillChipTextSelected: { color: Colors.gold },
  // Abilities
  abilitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  abilityCard: { width: '30%', backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 10, alignItems: 'center' },
  abilityShort: { color: Colors.textMuted, fontSize: Fonts.xs, fontWeight: '700', marginBottom: 2 },
  abilityScore: { color: Colors.textPrimary, fontSize: Fonts.xl, fontWeight: '900' },
  abilityMod: { color: Colors.accent, fontSize: Fonts.sm, fontWeight: '700' },
  abilityTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: 4, justifyContent: 'center' },
  abilityTag: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  abilityTagText: { fontSize: 9, fontWeight: '700' },
  boostSection: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 12 },
  boostSectionTitle: { color: Colors.textPrimary, fontSize: Fonts.sm, fontWeight: '700', marginBottom: 2 },
  boostSectionSub: { color: Colors.textMuted, fontSize: Fonts.xs, marginBottom: 10 },
  boostRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  boostBtn: { backgroundColor: Colors.bg, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 8 },
  boostBtnActive: { backgroundColor: Colors.accent + '22', borderColor: Colors.accent },
  boostBtnText: { color: Colors.textMuted, fontSize: Fonts.xs, fontWeight: '700' },
  boostBtnTextActive: { color: Colors.accent },
  summaryCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 20, gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryLabel: { color: Colors.textMuted, fontSize: Fonts.sm, flexShrink: 0, marginRight: 8 },
  summaryValue: { color: Colors.textPrimary, fontSize: Fonts.sm, fontWeight: '600' },
  inputLabel: { color: Colors.textSecondary, fontSize: Fonts.xs, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  textInput: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: Fonts.base, padding: 14 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  nextBtn: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#000', fontSize: Fonts.base, fontWeight: '700' },
});
