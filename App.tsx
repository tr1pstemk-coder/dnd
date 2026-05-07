import 'react-native-get-random-values';
import React, { useState, useCallback } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Character } from './src/domain/types';
import { loadCharacters, saveCharacter } from './src/data/db';
import { CharactersListScreen } from './src/features/characters/CharactersListScreen';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Colors, Fonts, Radius } from './src/ui/theme';

const NAV_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.accent,
    background: Colors.bg,
    card: Colors.surface,
    text: Colors.textPrimary,
    border: Colors.border,
    notification: Colors.danger,
  },
};

function CharacterApp({ character, onCharChange, onBack }: {
  character: Character;
  onCharChange: (ch: Character) => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} translucent />

      {/* Top bar — находится НИЖЕ строки состояния */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
          <Text style={styles.backText}>Персонажи</Text>
        </TouchableOpacity>

        <View style={styles.charInfo}>
          <Text style={styles.charName} numberOfLines={1}>{character.name}</Text>
          <Text style={styles.charSub}>
            {[character.characterClass, `ур. ${character.level}`].filter(Boolean).join(' · ')}
          </Text>
        </View>

        <View style={styles.hpChip}>
          <Text style={styles.hpChipLabel}>HP</Text>
          <Text style={styles.hpChipValue}>{character.hp.current}/{character.hp.max}</Text>
        </View>
      </View>

      {/* Navigation */}
      <View style={styles.navContainer}>
        <AppNavigator character={character} onCharChange={onCharChange} />
      </View>
    </View>
  );
}

export default function App() {
  const [activeChar, setActiveChar] = useState<Character | null>(null);

  const handleCharChange = useCallback(async (ch: Character) => {
    setActiveChar(ch);
    await saveCharacter(ch);
  }, []);

  const handleSelect = (char: Character) => {
    setActiveChar(char);
  };

  const handleBack = () => {
    setActiveChar(null);
  };

  if (!activeChar) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
        <CharactersListScreen onSelect={handleSelect} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={NAV_THEME}>
        <CharacterApp
          character={activeChar}
          onCharChange={handleCharChange}
          onBack={handleBack}
        />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 8,
  },
  navContainer: { flex: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 90 },
  backText: { color: Colors.textSecondary, fontSize: Fonts.sm },
  charInfo: { flex: 1, alignItems: 'center' },
  charName: { color: Colors.textPrimary, fontSize: Fonts.base, fontWeight: '700' },
  charSub: { color: Colors.textMuted, fontSize: Fonts.xs },
  hpChip: {
    backgroundColor: Colors.accent + '22',
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
    minWidth: 70,
    alignItems: 'center',
  },
  hpChipLabel: { color: Colors.textMuted, fontSize: 9 },
  hpChipValue: { color: Colors.accent, fontSize: Fonts.sm, fontWeight: '800' },
});
