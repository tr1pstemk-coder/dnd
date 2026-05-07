import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';
import { Character, InventoryItem } from '../../domain/types';
import { calcTotalBulk, encumbranceLimit, maxBulk, abilityMod } from '../../domain/pf2eCalc';
import { Colors, Fonts, Radius, Shadow } from '../../ui/theme';
import { NumberInput } from '../../components/NumberInput';

interface Props {
  character: Character;
  onCharChange: (ch: Character) => void;
}

const emptyItem = (): InventoryItem => ({
  id: uuid(),
  name: '',
  quantity: 1,
  bulk: 'L',
  description: '',
  worn: false,
});

export function InventoryScreen({ character: char, onCharChange }: Props) {
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [isNew, setIsNew] = useState(false);

  const upd = useCallback((partial: Partial<Character>) => {
    onCharChange({ ...char, ...partial });
  }, [char, onCharChange]);

  const totalBulk = calcTotalBulk(char);
  const enc = encumbranceLimit(char);
  const max = maxBulk(char);
  const bulkPct = Math.min(1, totalBulk / max);
  const bulkColor = totalBulk > enc ? Colors.danger : totalBulk > enc * 0.7 ? Colors.warning : Colors.accent;

  const openNew = () => { setEditing(emptyItem()); setIsNew(true); };
  const openEdit = (item: InventoryItem) => { setEditing({ ...item }); setIsNew(false); };

  const saveItem = () => {
    if (!editing) return;
    if (!editing.name.trim()) { Alert.alert('Ошибка', 'Введите название предмета'); return; }
    let inventory: InventoryItem[];
    if (isNew) {
      inventory = [...char.inventory, editing];
    } else {
      inventory = char.inventory.map(i => i.id === editing.id ? editing : i);
    }
    upd({ inventory });
    setEditing(null);
  };

  const deleteItem = (id: string) => {
    Alert.alert('Удалить предмет', 'Удалить этот предмет?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => upd({ inventory: char.inventory.filter(i => i.id !== id) }) },
    ]);
  };

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Bulk Meter ───────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Нагрузка</Text>
          <View style={styles.bulkRow}>
            <View style={styles.bulkStat}>
              <Text style={[styles.bulkValue, { color: bulkColor }]}>{totalBulk}</Text>
              <Text style={styles.bulkLabel}>Текущий</Text>
            </View>
            <View style={styles.bulkBar}>
              <View style={styles.bulkBarBg}>
                <View style={[styles.bulkBarFill, { width: `${bulkPct * 100}%`, backgroundColor: bulkColor }]} />
                {/* Encumbrance marker */}
                <View style={[styles.bulkMarker, { left: `${(enc / max) * 100}%` }]} />
              </View>
              <View style={styles.bulkLabels}>
                <Text style={styles.bulkNote}>Нагрузка: {enc}</Text>
                <Text style={styles.bulkNote}>Макс: {max}</Text>
              </View>
            </View>
            <View style={styles.bulkStat}>
              <Text style={styles.bulkValue}>{max}</Text>
              <Text style={styles.bulkLabel}>Максимум</Text>
            </View>
          </View>
          {totalBulk > enc && (
            <Text style={styles.encWarning}>⚠ Перегружен! Скорость −10 фт, штраф −1 к проверкам</Text>
          )}
        </View>

        {/* ── Wealth ───────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Богатство</Text>
          <View style={styles.wealthRow}>
            {[
              { key: 'pp' as const, label: 'ПМ', color: Colors.purple },
              { key: 'gp' as const, label: 'ЗМ', color: Colors.gold },
              { key: 'sp' as const, label: 'СМ', color: Colors.textSecondary },
              { key: 'cp' as const, label: 'ММ', color: '#a16207' },
            ].map(({ key, label, color }) => (
              <View key={key} style={styles.coinCol}>
                <View style={[styles.coinIcon, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.coinLabel, { color }]}>{label}</Text>
                </View>
                <NumberInput
                  value={char.wealth[key]}
                  onChange={v => upd({ wealth: { ...char.wealth, [key]: v } })}
                  min={0}
                  compact
                />
              </View>
            ))}
          </View>
        </View>

        {/* ── Items ────────────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Предметы</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openNew}>
            <Ionicons name="add" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {char.inventory.length === 0 && (
          <Text style={styles.empty}>Инвентарь пуст. Нажмите + чтобы добавить предмет.</Text>
        )}

        {char.inventory.map(item => {
          const bulkDisplay = item.bulk === 'L' ? `${item.quantity}×L` : `${item.quantity}×${item.bulk}`;
          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemMain}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name || 'Без названия'}</Text>
                  {item.description ? <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text> : null}
                </View>
                <Text style={styles.itemBulk}>{bulkDisplay}</Text>
                <View style={styles.qtyRow}>
                  <Text style={styles.qtyLabel}>×</Text>
                  <Text style={styles.qtyValue}>{item.quantity}</Text>
                </View>
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                  <Ionicons name="pencil-outline" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

      </ScrollView>

      {/* ── Item Editor ──────────────────────────────────────────────── */}
      <Modal visible={editing !== null} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{isNew ? 'Новый предмет' : 'Редактировать предмет'}</Text>

            {editing && (
              <>
                <Text style={styles.edLabel}>Название</Text>
                <TextInput
                  style={styles.edInput}
                  value={editing.name}
                  onChangeText={name => setEditing({ ...editing, name })}
                  placeholder="Длинный меч…"
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                />

                <View style={styles.edRow}>
                  <View style={styles.flex1}>
                    <Text style={styles.edLabel}>Количество</Text>
                    <NumberInput value={editing.quantity} onChange={v => setEditing({ ...editing, quantity: v })} min={1} compact />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.edLabel}>Вес (Bulk)</Text>
                    <View style={styles.bulkPicker}>
                      {['-', 'L', '1', '2', '3', '4', '5'].map(b => (
                        <TouchableOpacity
                          key={b}
                          style={[styles.bulkBtn, editing.bulk === b && styles.bulkBtnActive]}
                          onPress={() => setEditing({ ...editing, bulk: b })}
                        >
                          <Text style={[styles.bulkBtnText, editing.bulk === b && styles.bulkBtnTextActive]}>{b}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <Text style={styles.edLabel}>Описание</Text>
                <TextInput
                  style={[styles.edInput, { height: 80, textAlignVertical: 'top' }]}
                  value={editing.description}
                  onChangeText={description => setEditing({ ...editing, description })}
                  placeholder="Описание…"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />

                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
                    <Text style={styles.cancelText}>Отмена</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveItem}>
                    <Text style={styles.saveText}>Сохранить</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
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
  sectionTitle: { color: Colors.accent, fontSize: Fonts.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: Radius.full, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  empty: { color: Colors.textMuted, fontSize: Fonts.sm, textAlign: 'center', paddingVertical: 24 },
  // Bulk
  bulkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bulkStat: { alignItems: 'center', minWidth: 48 },
  bulkValue: { fontSize: Fonts.xl, fontWeight: '800', color: Colors.textPrimary },
  bulkLabel: { color: Colors.textMuted, fontSize: Fonts.xs },
  bulkBar: { flex: 1 },
  bulkBarBg: { height: 10, backgroundColor: Colors.bg, borderRadius: Radius.full, overflow: 'hidden', position: 'relative' },
  bulkBarFill: { height: '100%', borderRadius: Radius.full },
  bulkMarker: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: Colors.warning },
  bulkLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  bulkNote: { color: Colors.textMuted, fontSize: 10 },
  encWarning: { color: Colors.danger, fontSize: Fonts.xs, fontWeight: '600', textAlign: 'center' },
  // Wealth
  wealthRow: { flexDirection: 'row', gap: 8 },
  coinCol: { flex: 1, alignItems: 'center', gap: 6 },
  coinIcon: { width: 44, height: 44, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  coinLabel: { fontSize: Fonts.sm, fontWeight: '800' },
  // Items
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  itemMain: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  itemInfo: { flex: 1 },
  itemName: { color: Colors.textPrimary, fontSize: Fonts.base, fontWeight: '600' },
  itemDesc: { color: Colors.textMuted, fontSize: Fonts.xs, marginTop: 2 },
  itemBulk: { color: Colors.warning, fontSize: Fonts.sm, fontWeight: '700', minWidth: 36, textAlign: 'center' },
  qtyRow: { flexDirection: 'row', alignItems: 'baseline' },
  qtyLabel: { color: Colors.textMuted, fontSize: Fonts.xs },
  qtyValue: { color: Colors.textSecondary, fontSize: Fonts.base, fontWeight: '700' },
  itemActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, paddingHorizontal: 8, paddingBottom: 8 },
  iconBtn: { padding: 6 },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: 24,
    paddingBottom: 48,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalTitle: { color: Colors.textPrimary, fontSize: Fonts.lg, fontWeight: '700', marginBottom: 8 },
  edLabel: { color: Colors.textSecondary, fontSize: Fonts.xs, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
  edInput: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: Fonts.sm,
    padding: 10,
    marginTop: 4,
  },
  edRow: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  bulkPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  bulkBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  bulkBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  bulkBtnText: { color: Colors.textSecondary, fontSize: Fonts.sm, fontWeight: '600' },
  bulkBtnTextActive: { color: '#000', fontWeight: '700' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontSize: Fonts.base, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText: { color: '#000', fontSize: Fonts.base, fontWeight: '700' },
});
