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
  maxDexBonus: number | null;
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
  armorPenalty: boolean;
}

export interface SkillMap {
  acrobatics: SkillEntry;
  athletics: SkillEntry;
  crafting: SkillEntry;
  deception: SkillEntry;
  diplomacy: SkillEntry;
  intimidation: SkillEntry;
  lore1: SkillEntry;
  lore2: SkillEntry;
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
  