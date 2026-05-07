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
import { Character, MagicTradition, SpellcastingType, SpellEntry, MagicBlock } from '../../domain/types';
import { calcSpellAttack, calcSpellDC, rollD20 } from '../../domain/pf2eCalc';
import { Colors, Fonts, Radius, Shadow, PROF_LABEL, PROF_COLOR } from '../../ui/theme';
import { DiceRoller } from '../../components/DiceRoller';
import { ProficiencyPicker } from '../../components/ProficiencyPicker';
import { NumberInput } from '../../components/NumberInput';

interface Props {
  character: Character;
  onCharChange: (ch: Character) => void;
}

type DiceResult = { label: string; roll: number; bonus: number; total: number } | null;

const TRADITIONS: [MagicTradition, string][] = [
  ['arcane', 'Мистическая'],
  ['primal', 'Первобытная'],
  ['occult', 'Оккультная'],
  ['divine', 'Сакральная'],
];

const TRADITION_COLORS: Record<MagicTradition, string> = {
  arcane: Colors.info,
  primal: Colors.accent,
  occult: Colors.purple,
  divine: Colors.gold,
};

const emptySpell = (level: number): SpellEntry => ({
  id: uuid(),
  name: '',
  level,
  tradition: '',
  castTime: '2 действия',
  range: '',
  area: '',
  targets: '',
  duration: '',
  description: '',
  heighten: '',
});

export function MagicScreen({ character: char, onCharChange }: Props) {
  const [diceResult, setDiceResult] = useState<DiceResult>(null);
  const [editSpell, setEditSpell] = useState<SpellEntry | null>(null);
  const [isNewSpell, setIsNewSpell] = useState(false);
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);

  const upd = useCallback((partial: Partial<Character>) => {
    onCharChange({ ...char, ...partial });
  }, [char, onCharChange]);

  const updMagic = (partial: Partial<MagicBlock>) => {
    upd({ magic: { ...char.magic, ...partial } });
  };

  const spellAttack = calcSpellAttack(char);
  const spellDC = calcSpellDC(char);
  const tradColor = TRADITION_COLORS[char.magic.tradition];

  const rollSpellAttack = () => {
    const r = rollD20();
    setDiceResult({ label: 'Атака заклинанием', roll: r, bonus: spellAttack, total: r + spellAttack });
  };

  const openNewSpell = (level: number) => {
    setEditSpell(emptySpell(level));
    setIsNewSpell(true);
  };

  const saveSpell = () => {
    if (!editSpell) return;
    if (!editSpell.name.trim()) { Alert.alert('Ошибка', 'Введите название заклинания'); return; }
    let spells: SpellEntry[];
    if (isNewSpell) {
      spells = [...char.magic.spells, editSpell];
    } else {
      spells = char.magic.spells.map(s => s.id === editSpell.id ? editSpell : s);
    }
    updMagic({ spells });
    setEditSpell(null);
  };

  const deleteSpell = (id: string) => {
    Alert.alert('Удалить заклинание', 'Удалить это заклинание?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => updMagic({ spells: char.magic.spells.filter(s => s.id !== id) }) },
    ]);
  };

  const spellsByLevel = (level: number) =>
    char.magic.spells.filter(s => s.level === level);

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Tradition & Type ─────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Традиция</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.row}>
              {TRADITIONS.map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.tradBtn, { borderColor: TRADITION_COLORS[key] },
                    char.magic.tradition === key && { backgroundColor: TRADITION_COLORS[key] + '33' }]}
                  onPress={() => updMagic({ tradition: key })}
                >
                  <Text style={[styles.tradText, { color: TRADITION_COLORS[key] },
                    char.magic.tradition === key && { fontWeight: '800' }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.typeRow}>
            {(['prepared', 'spontaneous'] as SpellcastingType[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, char.magic.type === t && styles.typeBtnActive]}
                onPress={() => updMagic({ type: t })}
              >
                <Text style={[styles.typeBtnText, char.magic.type === t && styles.typeBtnTextActive]}>
                  {t === 'prepared' ? 'Подготавливающий' : 'Спонтанный'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Spell Stats ──────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Параметры заклинателя</Text>
          <View style={styles.spellStatsRow}>
            <TouchableOpacity style={[styles.spellStatBox, { borderColor: tradColor }]} onPress={rollSpellAttack}>
              <Text style={styles.spellStatLabel}>Атака заклинанием</Text>
              <Text style={[styles.spellStatValue, { color: tradColor }]}>
                {spellAttack >= 0 ? `+${spellAttack}` : `${spellAttack}`}
              </Text>
              <Text style={styles.spellStatSub}>нажать для броска</Text>
            </TouchableOpacity>
            <View style={[styles.spellStatBox, { borderColor: tradColor }]}>
              <Text style={styles.spellStatLabel}>СЛ заклинаний</Text>
              <Text style={[styles.spellStatValue, { color: tradColor }]}>{spellDC}</Text>
              <Text style={styles.spellStatSub}>автоматически</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.edLabel}>Умение заклинателя</Text>
              <ProficiencyPicker
                value={char.magic.attackProficiency}
                onChange={p => updMagic({ attackProficiency: p })}
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.edLabel}>Прочий бонус</Text>
              <NumberInput value={char.magic.attackMiscBonus} onChange={v => updMagic({ attackMiscBonus: v })} compact />
            </View>
          </View>
        </View>

        {/* ── Focus Points ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Фокусные заклинания</Text>
          </View>
          <View style={styles.focusRow}>
            <Text style={styles.edLabel}>Очки фокуса:</Text>
            <NumberInput value={char.magic.focusPoints} onChange={v => updMagic({ focusPoints: v })} min={0} max={char.magic.focusMax} compact />
            <Text style={styles.edLabel}> / </Text>
            <NumberInput value={char.magic.focusMax} onChange={v => updMagic({ focusMax: v })} min={0} max={3} compact />
          </View>

          {char.magic.focusSpells.length === 0 && (
            <Text style={styles.empty}>Нет фокусных заклинаний</Text>
          )}
          {char.magic.focusSpells.map(s => (
            <View key={s.id} style={styles.spellRow}>
              <View style={styles.flex1}>
                <Text style={styles.spellName}>{s.name}</Text>
                <Text style={styles.spellSub}>{s.castTime}</Text>
              </View>
              <TouchableOpacity onPress={() => {
                Alert.alert('Удалить', `Удалить «${s.name}»?`, [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Удалить', style: 'destructive', onPress: () => updMagic({ focusSpells: char.magic.focusSpells.filter(x => x.id !== s.id) }) },
                ]);
              }}>
                <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addSpellBtn}
            onPress={() => {
              const id = uuid();
              const focusSpell = { id, name: 'Новое фокусное', level: 1, castTime: '2 действия', description: '' };
              updMagic({ focusSpells: [...char.magic.focusSpells, focusSpell] });
            }}
          >
            <Ionicons name="add" size={16} color={Colors.accent} />
            <Text style={styles.addSpellText}>Добавить фокусное заклинание</Text>
          </TouchableOpacity>
        </View>

        {/* ── Spell Slots by Level ─────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ячейки заклинаний</Text>

          {/* Cantrips */}
          <View style={styles.levelHeader}>
            <TouchableOpacity
              style={styles.levelBtn}
              onPress={() => setExpandedLevel(expandedLevel === 0 ? null : 0)}
            >
              <Text style={styles.levelText}>Заговоры</Text>
              <Ionicons name={expandedLevel === 0 ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.levelAdd} onPress={() => openNewSpell(0)}>
              <Ionicons name="add" size={18} color={Colors.accent} />
            </TouchableOpacity>
          </View>
          {expandedLevel === 0 && spellsByLevel(0).map(s => (
            <SpellItem key={s.id} spell={s} onEdit={() => { setEditSpell({ ...s }); setIsNewSpell(false); }} onDelete={() => deleteSpell(s.id)} />
          ))}

          {/* Levels 1-10 */}
          {Array.from({ length: 10 }, (_, i) => i + 1).map(lvl => {
            const slot = char.magic.slots[lvl];
            const spells = spellsByLevel(lvl);
            const isExpanded = expandedLevel === lvl;
            return (
              <View key={lvl}>
                <View style={styles.levelHeader}>
                  <TouchableOpacity
                    style={styles.levelBtn}
                    onPress={() => setExpandedLevel(isExpanded ? null : lvl)}
                  >
                    <Text style={styles.levelText}>{lvl} круг</Text>
                    <View style={styles.slotCounter}>
                      <Text style={styles.slotText}>{slot.remaining}/{slot.max}</Text>
                    </View>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                  <View style={styles.slotControls}>
                    <TouchableOpacity
                      style={styles.slotBtn}
                      onPress={() => {
                        const remaining = Math.max(0, slot.remaining - 1);
                        updMagic({ slots: { ...char.magic.slots, [lvl]: { ...slot, remaining } } });
                      }}
                    >
                      <Text style={styles.slotBtnText}>−</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.slotBtn, styles.slotBtnAccent]}
                      onPress={() => {
                        const remaining = Math.min(slot.max, slot.remaining + 1);
                        updMagic({ slots: { ...char.magic.slots, [lvl]: { ...slot, remaining } } });
                      }}
                    >
                      <Text style={[styles.slotBtnText, { color: '#000' }]}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.levelAdd} onPress={() => openNewSpell(lvl)}>
                      <Ionicons name="add" size={18} color={Colors.accent} />
                    </TouchableOpacity>
                  </View>
                </View>

                {isExpanded && (
                  <View style={styles.slotEditor}>
                    <View style={styles.slotEditorRow}>
                      <Text style={styles.edLabel}>Макс ячеек:</Text>
                      <NumberInput value={slot.max} onChange={v => updMagic({ slots: { ...char.magic.slots, [lvl]: { ...slot, max: v } } })} min={0} compact />
                      <Text style={styles.edLabel}>Осталось:</Text>
                      <NumberInput value={slot.remaining} onChange={v => updMagic({ slots: { ...char.magic.slots, [lvl]: { ...slot, remaining: Math.min(v, slot.max) } } })} min={0} max={slot.max} compact />
                    </View>
                  </View>
                )}

                {isExpanded && spells.map(s => (
                  <SpellItem key={s.id} spell={s} onEdit={() => { setEditSpell({ ...s }); setIsNewSpell(false); }} onDelete={() => deleteSpell(s.id)} />
                ))}
              </View>
            );
          })}
        </View>

      </ScrollView>

      {/* ── Spell Editor ─────────────────────────────────────────────── */}
      <Modal visible={editSpell !== null} animationType="slide" transparent onRequestClose={() => setEditSpell(null)}>
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{isNewSpell ? 'Новое заклинание' : 'Редактировать заклинание'}</Text>
            {editSpell && (
              <>
                <Text style={styles.edLabel}>Название</Text>
                <TextInput style={styles.edInput} value={editSpell.name} onChangeText={name => setEditSpell({ ...editSpell, name })} placeholder="Волшебная стрела…" placeholderTextColor={Colors.textMuted} autoFocus />

                <Text style={styles.edLabel}>Время произнесения</Text>
                <TextInput style={styles.edInput} value={editSpell.castTime} onChangeText={castTime => setEditSpell({ ...editSpell, castTime })} placeholder="2 действия" placeholderTextColor={Colors.textMuted} />

                <View style={styles.edRow}>
                  <View style={styles.flex1}>
                    <Text style={styles.edLabel}>Дальность</Text>
                    <TextInput style={styles.edInput} value={editSpell.range} onChangeText={range => setEditSpell({ ...editSpell, range })} placeholder="120 фт" placeholderTextColor={Colors.textMuted} />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.edLabel}>Цели</Text>
                    <TextInput style={styles.edInput} value={editSpell.targets} onChangeText={targets => setEditSpell({ ...editSpell, targets })} placeholder="1 существо" placeholderTextColor={Colors.textMuted} />
                  </View>
                </View>

                <Text style={styles.edLabel}>Длительность</Text>
                <TextInput style={styles.edInput} value={editSpell.duration} onChangeText={duration => setEditSpell({ ...editSpell, duration })} placeholder="1 минута" placeholderTextColor={Colors.textMuted} />

                <Text style={styles.edLabel}>Описание</Text>
                <TextInput
                  style={[styles.edInput, { height: 100, textAlignVertical: 'top' }]}
                  value={editSpell.description}
                  onChangeText={description => setEditSpell({ ...editSpell, description })}
                  placeholder="Описание эффекта…"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />

                <Text style={styles.edLabel}>Усиление</Text>
                <TextInput style={styles.edInput} value={editSpell.heighten} onChangeText={heighten => setEditSpell({ ...editSpell, heighten })} placeholder="+2 ещё одна цель…" placeholderTextColor={Colors.textMuted} />

                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditSpell(null)}>
                    <Text style={styles.cancelText}>Отмена</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveSpell}>
                    <Text style={styles.saveText}>Сохранить</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

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

function SpellItem({ spell, onEdit, onDelete }: { spell: SpellEntry; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={styles.spellItem}>
      <TouchableOpacity style={styles.flex1} onPress={onEdit}>
        <Text style={styles.spellName}>{spell.name}</Text>
        <Text style={styles.spellSub}>
          {[spell.castTime, spell.range, spell.targets].filter(Boolean).join(' · ')}
        </Text>
        {spell.description ? <Text style={styles.spellDesc} numberOfLines={2}>{spell.description}</Text> : null}
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={styles.iconBtn}>
        <Ionicons name="trash-outline" size={16} color={Colors.danger} />
      </TouchableOpacity>
    </View>
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
  row: { flexDirection: 'row', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flex1: { flex: 1 },
  // Tradition
  tradBtn: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tradText: { fontSize: Fonts.sm, fontWeight: '600' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, padding: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  typeBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  typeBtnText: { color: Colors.textSecondary, fontSize: Fonts.xs, fontWeight: '600', textAlign: 'center' },
  typeBtnTextActive: { color: '#000', fontWeight: '700' },
  // Spell stats
  spellStatsRow: { flexDirection: 'row', gap: 12 },
  spellStatBox: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: 12,
    alignItems: 'center',
  },
  spellStatLabel: { color: Colors.textSecondary, fontSize: Fonts.xs, textAlign: 'center' },
  spellStatValue: { fontSize: Fonts.xxl, fontWeight: '900' },
  spellStatSub: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
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
  // Focus
  focusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Spell levels
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 4,
  },
  levelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelText: { color: Colors.textPrimary, fontSize: Fonts.base, fontWeight: '700' },
  slotCounter: {
    backgroundColor: Colors.accent + '22',
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  slotText: { color: Colors.accent, fontSize: Fonts.xs, fontWeight: '700' },
  slotControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slotBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBtnAccent: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  slotBtnText: { color: Colors.textPrimary, fontSize: Fonts.md, lineHeight: 20 },
  slotEditor: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.sm,
    padding: 10,
    marginBottom: 8,
  },
  slotEditorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelAdd: { padding: 4 },
  addSpellBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addSpellText: { color: Colors.accent, fontSize: Fonts.sm },
  // Spell Items
  spellItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.bg,
    borderRadius: Radius.sm,
    padding: 10,
    marginBottom: 4,
    gap: 8,
  },
  spellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderRadius: Radius.sm,
    padding: 10,
    marginBottom: 4,
    gap: 8,
  },
  spellName: { color: Colors.textPrimary, fontSize: Fonts.base, fontWeight: '600' },
  spellSub: { color: Colors.textMuted, fontSize: Fonts.xs, marginTop: 2 },
  spellDesc: { color: Colors.textSecondary, fontSize: Fonts.xs, marginTop: 4 },
  iconBtn: { padding: 6 },
  empty: { color: Colors.textMuted, fontSize: Fonts.xs, textAlign: 'center', paddingVertical: 8 },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: 24,
    paddingBottom: 48,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalTitle: { color: Colors.textPrimary, fontSize: Fonts.lg, fontWeight: '700', marginBottom: 8 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontSize: Fonts.base, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText: { color: '#000', fontSize: Fonts.base, fontWeight: '700' },
});
