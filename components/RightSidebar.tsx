import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import CommunitiesEntry from './CommunitiesEntry';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';

const isWeb = Platform.OS === 'web';

/**
 * Columna derecha de escritorio: buscador, temáticas reales de la comunidad
 * y un atajo a Weë Creator. Sin datos inventados ni botones que no hacen nada.
 */
const RightSidebar: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const year = new Date().getFullYear();

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (!query) return;
    navigation.navigate('Search', { query });
    setSearchQuery('');
  };

  const goCommunitySearch = (query: string) =>
    navigation.navigate('Main', { screen: 'Home', params: { screen: 'ExploreCommunities', params: query ? { query } : undefined } });
  const goCreateCommunity = () => {
    if (!user) return navigation.navigate('Register');
    navigation.navigate('Main', { screen: 'Home', params: { screen: 'ExploreCommunities', params: { create: true } } });
  };

  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Buscador */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
        {isWeb ? <Text style={{ fontSize: 16 }}>🔍</Text> : <Ionicons name="search" size={18} color={theme.colors.textSecondary} />}
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          /* La misma frase que ya usa el buscador de las pantallas de IA. */
          placeholder={t('weeai.searchLabel')}
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          accessibilityLabel={t('weeai.searchLabel')}
        />
      </View>

      {/* Comunidades: buscar o crear (sin catálogo en el Home) */}
      <View style={cardStyle}>
        <View style={{ padding: SPACING.lg }}>
          <CommunitiesEntry compact onSearch={goCommunitySearch} onCreate={goCreateCommunity} />
        </View>
      </View>

      {/* Weë Creator */}
      <TouchableOpacity
        style={[styles.creatorCard, { backgroundColor: theme.colors.accent + '1A', borderColor: theme.colors.accent }]}
        onPress={() => navigation.navigate('WeeCreator')}
        activeOpacity={0.85}
        /* La tarjeta entera es un solo control: su etiqueta, su título, su
           frase y su botón se leen juntos o no se leen. Y el nombre del sitio
           se escribe "Weë AI", que es como se llama. */
        accessibilityLabel={t('nav.openWeeAi')}
      >
        <Text style={styles.creatorEmoji}>🤖</Text>
        <Text style={[styles.creatorTitle, { color: theme.colors.text }]}>{t('nav.weeAiQuestion')}</Text>
        <Text style={[styles.creatorText, { color: theme.colors.textSecondary }]}>
          {t('nav.weeAiPitch')}
        </Text>
        <View style={[styles.creatorButton, { backgroundColor: theme.colors.accent }]}>
          <Text style={styles.creatorButtonText}>{t('nav.goToWeeAi')}</Text>
        </View>
      </TouchableOpacity>

      {/* Pie */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.navigate('Help', { section: 'legal' })} activeOpacity={0.7}>
          <Text style={[styles.footerLink, { color: theme.colors.textSecondary }]}>{t('menu.terms')}</Text>
        </TouchableOpacity>
        <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}> · </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Help', { section: 'legal' })} activeOpacity={0.7}>
          <Text style={[styles.footerLink, { color: theme.colors.textSecondary }]}>{t('menu.privacy')}</Text>
        </TouchableOpacity>
        <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}> · © {year} Weë</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
    ...(isWeb ? ({ outlineStyle: 'none' } as any) : {}),
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 0.5,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    padding: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.md,
  },
  rowEmoji: {
    fontSize: 20,
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  rowSubtitle: {
    fontSize: FONT_SIZE.xs,
    marginTop: 1,
  },
  showMore: {
    padding: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  showMoreText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  creatorCard: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  creatorEmoji: {
    fontSize: 26,
  },
  creatorTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
  },
  creatorText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
  },
  creatorButton: {
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  creatorButtonText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    padding: SPACING.md,
  },
  footerLink: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    textDecorationLine: 'underline',
  },
  footerText: {
    fontSize: FONT_SIZE.xs,
  },
});

export default RightSidebar;
