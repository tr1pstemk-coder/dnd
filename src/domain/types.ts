// ─── PF2e Character Sheet · Types ────────────────────────────────────────────

export type Proficiency = 'U' | 'T' | 'E' | 'M' | 'L';
// U = Untrained (Неизученный)
// T = Trained   (Изученный)
// E = Expert    (Экспертный)
// M = Master    (Мастерский)
// L = Legendary (Легендарный)

export const PROF_BONUS: Record<Proficiency, number> = {
  U: 0,
  T: 2,
  E: 4,
  M: 6,
  L: 8,
};

export interface AbilityScores {
  str: number; // Сила
  dex: number; // Ловкость
  con: number; // Выносливость
  int: number; // Интеллект
  wis: number; // Мудрость
  cha: number; // Харизма
}

export interface SavingThrows {
  fortitude: Proficiency;
  fortitudeBonus: number;
  reflex: Proficiency;
  reflexBonus: number;
  will: Proficiency;
  willBonus: number;
}

export interface ArmorClass {
  proficiency: Proficiency;
  itemBonus: number;
  miscBonus: number;
  maxDexBonus: number | null; // null = no cap
}

export interface Perception {
  proficiency: Proficiency;
  miscBonus: number;
}

export interface HitPoints {
  max: number;
  current: number;
  temp: number;
}

export interface SkillEntry {
  proficiency: Proficiency;
  miscBonus: number;
  armorPenalty: boolean; // применяется ли штраф брони
}

export interface SkillMap {
  acrobatics: SkillEntry;
  athletics: SkillEntry;
  crafting: SkillEntry;
  deception: SkillEntry;
  diplomacy: SkillEntry;
  intimidation: SkillEntry;
  lore1: SkillEntry;    // Знание 1
  lore2: SkillEntry;    // Знание 2
  medicine: SkillEntry;
  nature: SkillEntry;
  occultism: SkillEntry;
  performance: SkillEntry;
  religion: SkillEntry;
  society: SkillEntry;
  stealth: SkillEntry;
  survival: SkillEntry;
  thievery: SkillEntry;
}

export interface WeaponStrike {
  id: string;
  name: string;
  type: 'melee' | 'ranged';
  ability: keyof AbilityScores;
  proficiency: Proficiency;
  itemBonus: number;
  damageDice: string;   // напр. "1d6"
  damageBonus: number;
  damageType: string;   // S/P/B/Fire…
  traits: string;
}

export interface WeaponProficiencies {
  unarmed: Proficiency;
  simple: Proficiency;
  martial: Proficiency;
  advanced: Proficiency;
}

export interface ArmorProficiencies {
  unarmored: Proficiency;
  light: Proficiency;
  medium: Proficiency;
  heavy: Proficiency;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  bulk: string; // "1", "L", "-"
  description: string;
  worn: boolean;
}

export interface Wealth {
  pp: number; // Платиновые монеты
  gp: number; // Золотые монеты
  sp: number; // Серебряные монеты
  cp: number; // Медные монеты
}

export type MagicTradition = 'arcane' | 'primal' | 'occult' | 'divine';
export type SpellcastingType = 'prepared' | 'spontaneous';

export interface SpellSlots {
  max: number;
  remaining: number;
}

export interface SpellEntry {
  id: string;
  name: string;
  level: number;       // 0 = cantrip
  tradition: string;
  castTime: string;
  range: string;
  area: string;
  targets: string;
  duration: string;
  description: string;
  heighten: string;
}

export interface FocusSpell {
  id: string;
  name: string;
  level: number;
  castTime: string;
  description: string;
}

export interface InnateSpell {
  id: string;
  name: string;
  level: number;
  frequency: string;   // "At will", "1/day" …
  ability: keyof AbilityScores;
  tradition: MagicTradition;
}

export interface Ritual {
  id: string;
  name: string;
  level: number;
  castTime: string;
  cost: string;
  description: string;
}

export interface MagicBlock {
  tradition: MagicTradition;
  type: SpellcastingType;
  attackProficiency: Proficiency;
  attackMiscBonus: number;
  dcMiscBonus: number;
  // slots по кругам 1–10
  slots: Record<number, SpellSlots>;
  spells: SpellEntry[];
  focusPoints: number;
  focusMax: number;
  focusSpells: FocusSpell[];
  innateSpells: InnateSpell[];
  rituals: Ritual[];
}

export interface Condition {
  id: string;
  name: string;
  value?: number; // для условий с числовым значением (оглушён 3)
}

// ─── Feat (взятый персонажем) ─────────────────────────────────────────────────
export interface CharacterFeat {
  id: string;          // _id из JSON
  name: string;
  featType: 'ancestry' | 'class' | 'general' | 'skill'; // тип
  level: number;       // на каком уровне взят
}

export interface Character {
  id: string;
  // ── Bio ──────────────────────────────────────────────────────────────────
  name: string;
  playerName: string;
  ancestry: string;
  heritage: string;
  background: string;
  characterClass: string;
  level: number;
  xp: number;
  languages: string[];
  // ── Abilities ────────────────────────────────────────────────────────────
  abilities: AbilityScores;
  // ── HP ───────────────────────────────────────────────────────────────────
  hp: HitPoints;
  dying: number;    // 0–4
  wounded: number;  // 0–4
  heroPoints: number; // 0–3
  // ── Defense ──────────────────────────────────────────────────────────────
  armorClass: ArmorClass;
  saves: SavingThrows;
  perception: Perception;
  // ── Movement ─────────────────────────────────────────────────────────────
  speed: number;
  // ── Conditions ───────────────────────────────────────────────────────────
  conditions: Condition[];
  // ── Skills ───────────────────────────────────────────────────────────────
  skills: SkillMap;
  lore1Name: string;
  lore2Name: string;
  // ── Feats ────────────────────────────────────────────────────────────────
  feats: CharacterFeat[];
  // ── Combat ───────────────────────────────────────────────────────────────
  strikes: WeaponStrike[];
  weaponProficiencies: WeaponProficiencies;
  armorProficiencies: ArmorProficiencies;
  armorCheckPenalty: number; // отрицательное число, напр. -2
  // ── Inventory ────────────────────────────────────────────────────────────
  inventory: InventoryItem[];
  wealth: Wealth;
  // ── Magic ─────────────────────────────────────────────────────────────────
  magic: MagicBlock;
  // ── Class DC ─────────────────────────────────────────────────────────────
  classDCProficiency: Proficiency;
  classDCMiscBonus: number;
}
