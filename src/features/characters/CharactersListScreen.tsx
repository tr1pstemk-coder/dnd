import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Character } from '../../domain/types';
import { loadCharacters, deleteCharacter } from '../../data/db';
import { Colors, Fonts, Radius, Shadow } from '../../ui/theme';
import { CreateCharacterWizard } from './CreateCharacterWizard';

interface Props {
  onSelect: (character: Character) => void;
}

export function CharactersListScreen({ onSelect }: Props) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showWizard, setShowWizard] = useState(false);

  const refresh = useCallback(async () => {
    const chars = await loadCharacters();
    setCharacters(chars);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = (char: Character) => {
    Alert.alert(
      'Удалить персонажа',
      `Удалить «${char.name}»? Это действие нельзя отменить.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            await deleteCharacter(char.id);
            await refresh();
          },
        },
      ]
    );
  };

  const classColor = (cls: string) => {
    const map: Record<string, string> = {
      'Fighter': Colors.danger,
      'Воин': Colors.danger,
      'Wizard': Colors.info,
      'Маг': Colors.info,
      'Cleric': Colors.gold,
      'Жрец': Colors.gold,
      'Rogue': Colors.textMuted,
      'Плут': Colors.textMuted,
      'Ranger': Colors.accentDim,
      'Следопыт': Colors.accentDim,
      'Barbarian': '#C2410C',
      'Варвар': '#C2410C',
      'Bard': Colors.purple,
      'Бард': Colors.purple,
      'Monk': Colors.cyan,
      'Монах': Colors.cyan,
    };
    return map[cls] ?? Colors.accent;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>PF2e</Text>
          <Text style={styles.headerSub}>Лист персонажа</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowWizard(true)}
        >
          <Ionicons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {characters.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="person-add-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Нет персонажей</Text>
          <Text style={styles.emptyText}>Нажмите + чтобы создать первого персонажа</Text>
        </View>
      ) : (
        <FlatList
          data={characters}
          keyExtractor={c => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => onSelect(item)}
              activeOpacity={0.8}
            >
              <View style={[styles.avatar, { backgroundColor: classColor(item.characterClass) + '33' }]}>
                <Text style={[styles.avatarText, { color: classColor(item.characterClass) }]}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.details}>
                  {[item.characterClass, item.ancestry].filter(Boolean).join(' · ') || 'Без класса'}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>ур. {item.level}</Text>
                  </View>
                  {item.characterClass ? (
                    <View style={[styles.classBadge, { borderColor: classColor(item.characterClass) }]}>
                      <Text style={[styles.classBadgeText, { color: classColor(item.characterClass) }]}>
                        {item.characterClass}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={styles.right}>
                <Text style={styles.hpLabel}>HP</Text>
                <Text style={styles.hpValue}>{item.hp.current}</Text>
                <Text style={styles.hpMax}>/{item.hp.max}</Text>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <CreateCharacterWizard
        visible={showWizard}
        onClose={() => setShowWizard(false)}
        onCreated={() => { setShowWizard(false); refresh(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { color: Colors.accent, fontSize: Fonts.xxl, fontWeight: '900', letterSpacing: 2 },
  headerSub: { color: Colors.textSecondary, fontSize: Fonts.xs, letterSpacing: 1 },
  addBtn: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
    ...Shadow.button,
  },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: 16, alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.card,
  },
  avatar: { width: 52, height: 52, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: Fonts.xl, fontWeight: '800' },
  info: { flex: 1 },
  name: { color: Colors.textPrimary, fontSize: Fonts.md, fontWeight: '700', marginBottom: 2 },
  details: { color: Colors.textSecondary, fontSize: Fonts.xs, marginBottom: 6 },
  badgeRow: { flexDirection: 'row', gap: 6 },
  levelBadge: {
    backgroundColor: Colors.accent + '22', borderRadius: Radius.sm,
    paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: Colors.accent + '55',
  },
  levelText: { color: Colors.accent, fontSize: Fonts.xs, fontWeight: '700' },
  classBadge: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  classBadgeText: { fontSize: Fonts.xs, fontWeight: '600' },
  right: { alignItems: 'center', minWidth: 48 },
  hpLabel: { color: Colors.textMuted, fontSize: Fonts.xs },
  hpValue: { color: Colors.accent, fontSize: Fonts.lg, fontWeight: '800' },
  hpMax: { color: Colors.textMuted, fontSize: Fonts.xs },
  deleteBtn: { marginTop: 8, padding: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { color: Colors.textPrimary, fontSize: Fonts.lg, fontWeight: '700' },
  emptyText: { color: Colors.textSecondary, fontSize: Fonts.sm, textAlign: 'center', paddingHorizontal: 40 },
});
