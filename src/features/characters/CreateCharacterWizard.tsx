import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radius } from '../../ui/theme';
import { ancestries, heritages, classes, backgrounds } from '../../data/pf2eData';
import { Character } from '../../domain/types';
import { createDefaultCharacter } from '../../domain/defaultCharacter';
import { saveCharacter } from '../../data/db';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const STEPS = ['Раса', 'Наследие', 'Класс', 'Предыстория', 'Имя'];

function getEntries(json: any): any[] {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (json.items && Array.isArray(json.items)) return json.items;
  const keys = Object.keys(json);
  if (keys.length > 0 && Array.isArray(json[keys[0]])) return json[keys[0]];
  return Object.values(json);
}

function getName(item: any): string {
  return item?.name ?? item?.system?.name ?? item?._id ?? '???';
}

function getDesc(item: any): string {
  return item?.system?.description?.value
    ? item.system.description.value.replace(/<[^>]*>/g, '').slice(0, 120)
    : '';
}

function getHp(item: any): string {
  const hp = item?.system?.hp ?? item?.system?.hitPoints;
  if (!hp) return '';
  return `HP +${hp}`;
}

function getSpeed(item: any): string {
  const s = item?.system?.speed ?? item?.system?.speeds?.value;
  if (!s) return '';
  return `Скорость ${s}`;
}

function getClassHp(item: any): string {
  const hp = item?.system?.hp ?? item?.system?.hitPoints;
  if (!hp) return '';
  return `${hp} HP/ур.`;
}

function getKeyAbility(item: any): string {
  const ka = item?.system?.keyAbility?.value;
  if (!ka) return '';
  if (Array.isArray(ka)) return ka.join('/').toUpperCase();
  return String(ka).toUpperCase();
}

function getAncestryId(item: any): string {
  return item?._id ?? item?.id ?? getName(item);
}

function getHeritageAncestry(item: any): string {
  return item?.system?.ancestry?.name ?? item?.system?.ancestry ?? '';
}

interface SelectStepProps {
  title: string;
  items: any[];
  selected: string;
  onSelect: (name: string) => void;
  badge?: (item: any) => string;
  badge2?: (item: any) => string;
}

function SelectStep({ title, items, selected, onSelect, badge, badge2 }: SelectStepProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i => getName(i).toLowerCase().includes(q));
  }, [items, search]);

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.stepTitle}>{title}</Text>
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
          return (
            <TouchableOpacity
              style={[styles.row, isSelected && styles.rowSelected]}
              onPress={() => onSelect(name)}
              activeOpacity={0.75}
            >
              <View style={styles.rowLeft}>
                <Text style={[styles.rowName, isSelected && styles.rowNameSelected]}>{name}</Text>
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

export function CreateCharacterWizard({ visible, onClose, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [selectedAncestry, setSelectedAncestry] = useState('');
  const [selectedHeritage, setSelectedHeritage] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedBackground, setSelectedBackground] = useState('');
  const [name, setName] = useState('');

  const allAncestries = useMemo(() => getEntries(ancestries), []);
  const allHeritages = useMemo(() => {
    const all = getEntries(heritages);
    if (!selectedAncestry) return all;
    return all.filter(h => {
      const ha = getHeritageAncestry(h).toLowerCase();
      return ha === '' || ha === selectedAncestry.toLowerCase();
    });
  }, [selectedAncestry]);
  const allClasses = useMemo(() => getEntries(classes), []);
  const allBackgrounds = useMemo(() => getEntries(backgrounds), []);

  const canNext = () => {
    if (step === 0) return selectedAncestry !== '';
    if (step === 1) return true; // наследие необязательно
    if (step === 2) return selectedClass !== '';
    if (step === 3) return true; // предыстория необязательна
    if (step === 4) return name.trim() !== '';
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
    setSelectedClass('');
    setSelectedBackground('');
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

    // Применяем HP расы + класса
    const ancestryEntry = allAncestries.find(a => getName(a) === selectedAncestry);
    const classEntry = allClasses.find(c => getName(c) === selectedClass);
    const ancestryHp = ancestryEntry?.system?.hp ?? 0;
    const classHp = classEntry?.system?.hp ?? classEntry?.system?.hitPoints ?? 8;
    const conMod = Math.floor((char.abilities.con - 10) / 2);
    char.hp.max = ancestryHp + classHp + conMod;
    char.hp.current = char.hp.max;

    // Скорость расы
    const speed = ancestryEntry?.system?.speed ?? ancestryEntry?.system?.speeds?.value;
    if (speed) char.speed = speed;

    await saveCharacter(char);
    handleReset();
    onCreated();
  };

  const progress = (step + 1) / STEPS.length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleReset}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name={step === 0 ? 'close' : 'arrow-back'} size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Новый персонаж</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            Шаг {step + 1} из {STEPS.length} · {STEPS[step]}
          </Text>
        </View>

        {/* Content */}
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {step === 0 && (
            <SelectStep
              title="Выбери расу"
              items={allAncestries}
              selected={selectedAncestry}
              onSelect={setSelectedAncestry}
              badge={getHp}
              badge2={getSpeed}
            />
          )}
          {step === 1 && (
            <SelectStep
              title="Выбери наследие"
              items={allHeritages}
              selected={selectedHeritage}
              onSelect={setSelectedHeritage}
            />
          )}
          {step === 2 && (
            <SelectStep
              title="Выбери класс"
              items={allClasses}
              selected={selectedClass}
              onSelect={setSelectedClass}
              badge={getClassHp}
              badge2={getKeyAbility}
            />
          )}
          {step === 3 && (
            <SelectStep
              title="Выбери предысторию"
              items={allBackgrounds}
              selected={selectedBackground}
              onSelect={setSelectedBackground}
            />
          )}
          {step === 4 && (
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Имя персонажа</Text>
              <View style={styles.summaryCard}>
                <Row label="Раса" value={selectedAncestry || '—'} />
                <Row label="Наследие" value={selectedHeritage || '—'} />
                <Row label="Класс" value={selectedClass || '—'} />
                <Row label="Предыстория" value={selectedBackground || '—'} />
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

        {/* Footer button */}
        <View style={styles.footer}>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.textPrimary, fontSize: Fonts.md, fontWeight: '700' },
  progressContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  progressBg: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  progressLabel: { color: Colors.textMuted, fontSize: Fonts.xs },
  stepTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.lg,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: Fonts.base },
  row: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent + '15',
  },
  rowLeft: { flex: 1 },
  rowName: { color: Colors.textPrimary, fontSize: Fonts.base, fontWeight: '600', marginBottom: 2 },
  rowNameSelected: { color: Colors.accent },
  rowDesc: { color: Colors.textMuted, fontSize: Fonts.xs, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge: {
    backgroundColor: Colors.accent + '22',
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
  },
  badgeText: { color: Colors.accent, fontSize: Fonts.xs, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: Colors.textMuted, fontSize: Fonts.sm },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: Colors.textMuted, fontSize: Fonts.sm },
  summaryValue: { color: Colors.textPrimary, fontSize: Fonts.sm, fontWeight: '600' },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: Fonts.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: Fonts.base,
    padding: 14,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nextBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#000', fontSize: Fonts.base, fontWeight: '700' },
});
