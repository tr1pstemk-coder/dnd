// ─── PF2e Math ────────────────────────────────────────────────────────────────
import { AbilityScores, Proficiency, PROF_BONUS, Character } from './types';

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function profBonus(prof: Proficiency, level: number): number {
  if (prof === 'U') return 0;
  return PROF_BONUS[prof] + level;
}

/** Класс Брони */
export function calcAC(char: Character): number {
  const dexMod = abilityMod(char.abilities.dex);
  const cappedDex =
    char.armorClass.maxDexBonus !== null
      ? Math.min(dexMod, char.armorClass.maxDexBonus)
      : dexMod;
  return (
    10 +
    cappedDex +
    profBonus(char.armorClass.proficiency, char.level) +
    char.armorClass.itemBonus +
    char.armorClass.miscBonus
  );
}

/** Спасброски */
export function calcFortitude(char: Character): number {
  return (
    10 +
    abilityMod(char.abilities.con) +
    profBonus(char.saves.fortitude, char.level) +
    char.saves.fortitudeBonus
  );
}
export function calcReflex(char: Character): number {
  return (
    10 +
    abilityMod(char.abilities.dex) +
    profBonus(char.saves.reflex, char.level) +
    char.saves.reflexBonus
  );
}
export function calcWill(char: Character): number {
  return (
    10 +
    abilityMod(char.abilities.wis) +
    profBonus(char.saves.will, char.level) +
    char.saves.willBonus
  );
}

/** Восприятие */
export function calcPerception(char: Character): number {
  return (
    abilityMod(char.abilities.wis) +
    profBonus(char.perception.proficiency, char.level) +
    char.perception.miscBonus
  );
}

/** Навык — итоговый бонус (без d20) */
export function calcSkill(
  char: Character,
  abilityKey: keyof AbilityScores,
  prof: Proficiency,
  misc: number,
  hasArmorPenalty: boolean
): number {
  const base =
    abilityMod(char.abilities[abilityKey]) +
    profBonus(prof, char.level) +
    misc;
  const penalty = hasArmorPenalty ? char.armorCheckPenalty : 0;
  return base + penalty;
}

/** Бросок атаки (бонус, без d20) */
export function calcAttackBonus(
  char: Character,
  abilityKey: keyof AbilityScores,
  prof: Proficiency,
  itemBonus: number
): number {
  return (
    abilityMod(char.abilities[abilityKey]) +
    profBonus(prof, char.level) +
    itemBonus
  );
}

/** Бонус к урону */
export function calcDamageBonus(
  char: Character,
  abilityKey: keyof AbilityScores
): number {
  return abilityMod(char.abilities[abilityKey]);
}

/** Класс сложности класса */
export function calcClassDC(char: Character): number {
  // Используем ключевую характеристику класса — пусть пользователь вносит её через miscBonus
  return (
    10 +
    profBonus(char.classDCProficiency, char.level) +
    char.classDCMiscBonus
  );
}

/** Бонус заклинания к атаке */
export function calcSpellAttack(char: Character): number {
  return (
    profBonus(char.magic.attackProficiency, char.level) +
    char.magic.attackMiscBonus
  );
}

/** СЛ заклинаний */
export function calcSpellDC(char: Character): number {
  return 10 + calcSpellAttack(char) + char.magic.dcMiscBonus;
}

/** Общий вес инвентаря */
export function calcTotalBulk(char: Character): number {
  let bulk = 0;
  let lightCount = 0;
  for (const item of char.inventory) {
    if (item.bulk === '-') continue;
    if (item.bulk === 'L') {
      lightCount += item.quantity;
    } else {
      const b = parseFloat(item.bulk);
      if (!isNaN(b)) bulk += b * item.quantity;
    }
  }
  bulk += Math.floor(lightCount / 10);
  return Math.round(bulk * 10) / 10;
}

export function encumbranceLimit(char: Character): number {
  return 5 + abilityMod(char.abilities.str);
}
export function maxBulk(char: Character): number {
  return 10 + abilityMod(char.abilities.str);
}

/** Бросок d20 */
export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/** Критическое попадание / промах */
export function critResult(roll: number, bonus: number, dc: number): 'crit_success' | 'success' | 'failure' | 'crit_failure' {
  const total = roll + bonus;
  if (roll === 20 || total >= dc + 10) return 'crit_success';
  if (roll === 1 || total <= dc - 10) return 'crit_failure';
  if (total >= dc) return 'success';
  return 'failure';
}
