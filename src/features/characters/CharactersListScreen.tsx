import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Character } from '../../domain/types';
import { loadCharacters, saveCharacters, deleteCharacter, saveCharacter } from '../../data/db';
import { createDefaultCharacter } from '../../domain/defaultCharacter';
import { Colors, Fonts, Radius, Shadow } from '../../ui/theme';

interface Props {
  onSelect: (character: Character) => void;
}

export function CharactersListScreen({ onSelect }: Props) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newClass, setNewClass] = useState('');

  const refresh = useCallback(async () => {
    const chars = await loadCharacters();
    setCharacters(chars);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      Alert.alert('Ошибка', 'Введите имя персонажа');
      return;
    }
    const char = createDefaultCharacter();
    char.name = newName.trim();
    char.characterClass = newClass.trim();
    await saveCharacter(char);
    setNewName('');
    setNewClass('');
    setShowCreate(false);
    await refresh();
  };

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
      'Воин': Colors.danger,
      'Маг': Colors.info,
      'Жрец': Colors.gold,
      'Плут': Colors.textMuted,
      'Следопыт': Colors.accentDim,
      'Варвар': '#C2410C',
      'Бард': Colors.purple,
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
          onPress={() => setShowCreate(true)}
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
              {/* Avatar */}
              <View style={[styles.avatar, { backgroundColor: classColor(item.characterClass) + '33' }]}>
                <Text style={[styles.avatarText, { color: classColor(item.characterClass) }]}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              {/* Info */}
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

              {/* HP bar */}
              <View style={styles.right}>
                <Text style={styles.hpLabel}>HP</Text>
                <Text style={styles.hpValue}>{item.hp.current}</Text>
                <Text style={styles.hpMax}>/{item.hp.max}</Text>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item)}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Новый персонаж</Text>

            <Text style={styles.inputLabel}>Имя персонажа *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Эстрид из Айвенхоу…"
              placeholderTextColor={Colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />

            <Text style={styles.inputLabel}>Класс</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Воин, Маг, Жрец…"
              placeholderTextColor={Colors.textMuted}
              value={newClass}
              onChangeText={setNewClass}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowCreate(false)}
              >
                <Text style={styles.cancelBtnText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCreate}>
                <Text style={styles.confirmBtnText}>Создать</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    color: Colors.accent,
    fontSize: Fonts.xxl,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerSub: {
    color: Colors.textSecondary,
    fontSize: Fonts.xs,
    letterSpacing: 1,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.button,
  },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Fonts.xl,
    fontWeight: '800',
  },
  info: { flex: 1 },
  name: {
    color: Colors.textPrimary,
    fontSize: Fonts.md,
    fontWeight: '700',
    marginBottom: 2,
  },
  details: {
    color: Colors.textSecondary,
    fontSize: Fonts.xs,
    marginBottom: 6,
  },
  badgeRow: { flexDirection: 'row', gap: 6 },
  levelBadge: {
    backgroundColor: Colors.accent + '22',
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.accent + '55',
  },
  levelText: { color: Colors.accent, fontSize: Fonts.xs, fontWeight: '700' },
  classBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  classBadgeText: { fontSize: Fonts.xs, fontWeight: '600' },
  right: { alignItems: 'center', minWidth: 48 },
  hpLabel: { color: Colors.textMuted, fontSize: Fonts.xs },
  hpValue: { color: Colors.accent, fontSize: Fonts.lg, fontWeight: '800' },
  hpMax: { color: Colors.textMuted, fontSize: Fonts.xs },
  deleteBtn: { marginTop: 8, padding: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { color: Colors.textPrimary, fontSize: Fonts.lg, fontWeight: '700' },
  emptyText: { color: Colors.textSecondary, fontSize: Fonts.sm, textAlign: 'center', paddingHorizontal: 40 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.lg,
    fontWeight: '700',
    marginBottom: 20,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: Fonts.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: Fonts.base,
    padding: 12,
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontSize: Fonts.base, fontWeight: '600' },
  confirmBtn: {
    flex: 1,
    padding: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#000', fontSize: Fonts.base, fontWeight: '700' },
});
