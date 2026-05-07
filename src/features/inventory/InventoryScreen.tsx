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
  descripti