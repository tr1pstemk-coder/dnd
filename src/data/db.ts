import AsyncStorage from '@react-native-async-storage/async-storage';
import { Character } from '../domain/types';

const STORAGE_KEY = 'pf2e_characters_v2';

export async function loadCharacters(): Promise<Character[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export async function saveCharacters(characters: Character[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
  } catch (e) {
    console.warn('Failed to save characters:', e);
  }
}

export async function saveCharacter(character: Character): Promise<void> {
  const all = await loadCharacters();
  const idx = all.findIndex(c => c.id === character.id);
  if (idx >= 0) {
    all[idx] = character;
  } else {
    all.push(character);
  }
  await saveCharacters(all);
}

export async function deleteCharacter(id: string): Promise<void> {
  const all = await loadCharacters();
  await saveCharacters(all.filter(c => c.id !== id));
}
