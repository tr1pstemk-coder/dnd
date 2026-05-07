import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Character } from '../domain/types';
import { MainScreen } from '../features/main/MainScreen';
import { SkillsScreen } from '../features/skills/SkillsScreen';
import { CombatScreen } from '../features/combat/CombatScreen';
import { InventoryScreen } from '../features/inventory/InventoryScreen';
import { MagicScreen } from '../features/magic/MagicScreen';
import { Colors, Fonts } from '../ui/theme';

const Tab = createBottomTabNavigator();

interface Props {
  character: Character;
  onCharChange: (ch: Character) => void;
}

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, [TabIconName, TabIconName]> = {
  Main:      ['person', 'person-outline'],
  Skills:    ['list', 'list-outline'],
  Combat:    ['shield', 'shield-outline'],
  Inventory: ['bag', 'bag-outline'],
  Magic:     ['sparkles', 'sparkles-outline'],
};

export function AppNavigator({ character, onCharChange }: Props) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: Fonts.xs,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
          const name = focused ? icons[0] : icons[1];
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Main" options={{ title: '\u0413\u043b\u0430\u0432\u043d\u0430\u044f' }}>
        {() => <MainScreen character={character} onCharChange={onCharChange} />}
      </Tab.Screen>
      <Tab.Screen name="Skills" options={{ title: '\u041d\u0430\u0432\u044b\u043a\u0438' }}>
        {() => <SkillsScreen character={character} onCharChange={onCharChange} />}
      </Tab.Screen>
      <Tab.Screen name="Combat" options={{ title: '\u0411\u043e\u0439' }}>
        {() => <CombatScreen character={character} onCharChange={onCharChange} />}
      </Tab.Screen>
      <Tab.Screen name="Inventory" options={{ title: '\u0418\u043d\u0432\u0435\u043d\u0442\u0430\u0440\u044c' }}>
        {() => <InventoryScreen character={character} onCharChange={onCharChange} />}
      </Tab.Screen>
      <Tab.Screen name="Magic" options={{ title: '\u041c\u0430\u0433\u0438\u044f' }}>
        {() => <MagicScreen character={character} onCharChange={onCharChange} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
