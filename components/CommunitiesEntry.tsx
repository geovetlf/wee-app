import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

interface CommunitiesEntryProps {
  onSearch: (query: string) => void;
  onCreate: () => void;
  /** Versión reducida para la columna derecha de escritorio. */
  compact?: boolean;
}

/**
 * Comunidades en el Home (docs/UX.md §16): sin catálogo ni tarjetas.
 * "Encuentra las tuyas": buscar una comunidad o crear la tuya.
 */
const CommunitiesEntry: React.FC<CommunitiesEntryProps> = ({ onSearch, onCreate, compact = false }) => {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');

  const submit = () => {
    onSearch(query.trim());
    setQuery('');
  };

  return (
    <View style={[styles.section, compact && styles.sectionCompact]}>
      <Text style={[styles.title, compact && styles.titleCompact, { color: theme.colors.text }]}>Comunidades</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Encuentra las tuyas.</Text>

      <View style={[styles.search, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Ionicons name="search" size={scale(18)} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.input, { color: theme.colors.text }]}
          placeholder="Buscar comunidades..."
          placeholderTextColor={theme.colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Buscar comunidades"
        />
        <TouchableOpacity onPress={submit} style={styles.go} activeOpacity={0.7} accessibilityLabel="Buscar">
          <Ionicons name="arrow-forward" size={scale(18)} color={theme.colors.accentDark} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={onCreate} style={[styles.create, { backgroundColor: theme.colors.accent }]} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Crear comunidad">
        <Ionicons name="add" size={scale(20)} color="#1F2937" />
        <Text style={styles.createText}>Crear comunidad</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  sectionCompact: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  title: {
    fontSize: scale(18),
    fontWeight: FONT_WEIGHT.bold,
  },
  titleCompact: {
    fontSize: FONT_SIZE.lg,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    marginTop: -scale(4),
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    height: scale(46),
    paddingLeft: SPACING.md,
    paddingRight: scale(4),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  go: {
    width: scale(38),
    height: scale(38),
    alignItems: 'center',
    justifyContent: 'center',
  },
  create: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    height: scale(46),
    borderRadius: BORDER_RADIUS.full,
  },
  createText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default CommunitiesEntry;
