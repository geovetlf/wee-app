import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Platform,
  BackHandler,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { MainStackParamList } from '../navigation/MainStackNavigator';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import {
  WEEBIZ_MAIN_CATEGORIES,
  WEEBIZ_EXTRA_CATEGORIES,
  WEEBIZ_CATEGORIES,
  WeeBizCategory,
} from '../constants/weebizCategories';
import { weeBizService, Business } from '../services/weeBizService';

type NavProp = StackNavigationProp<MainStackParamList>;

const WeeBizScreen: React.FC = () => {
  const t = useT();
  const { theme } = useTheme();
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [featuredBiz, setFeaturedBiz] = useState<Business[]>([]);
  const [recentBiz, setRecentBiz] = useState<Business[]>([]);
  const [searchResults, setSearchResults] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Android back
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const onBack = () => { navigation.goBack(); return true; };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [navigation]),
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [featured, recent] = await Promise.all([
        weeBizService.getFeaturedBusinesses(6),
        weeBizService.getRecentBusinesses(10),
      ]);
      setFeaturedBiz(featured);
      setRecentBiz(recent);
    } catch (e) {
      console.error('WeeBiz load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    try {
      setSearching(true);
      const results = await weeBizService.searchBusinesses(text);
      setSearchResults(results);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setSearching(false);
    }
  };

  const handleCategoryPress = (cat: WeeBizCategory) => {
    navigation.navigate('WeeBizCategory', { categoryId: cat.id, categoryLabel: t(cat.clave) });
  };

  const handleBusinessPress = (biz: Business) => {
    navigation.navigate('WeeBizProfile', { businessId: biz.id! });
  };

  const categoriesToShow = showAllCategories
    ? WEEBIZ_CATEGORIES
    : WEEBIZ_MAIN_CATEGORIES;

  const getCategoryForBiz = (categoryId: string) =>
    WEEBIZ_CATEGORIES.find(c => c.id === categoryId);

  // --- Renders ---

  const renderCategoryItem = (cat: WeeBizCategory) => (
    <TouchableOpacity
      key={cat.id}
      style={[styles.categoryCard, { backgroundColor: cat.color + '15' }]}
      onPress={() => handleCategoryPress(cat)}
      activeOpacity={0.7}
    >
      <View style={[styles.categoryIconWrap, { backgroundColor: cat.color + '25' }]}>
        <Ionicons name={cat.icon as any} size={scale(24)} color={cat.color} />
      </View>
      <Text style={[styles.categoryLabel, { color: theme.colors.text }]} numberOfLines={1}>
        {t(cat.clave)}
      </Text>
    </TouchableOpacity>
  );

  const renderBusinessCard = (biz: Business) => {
    const cat = getCategoryForBiz(biz.categoryId);
    return (
      <TouchableOpacity
        key={biz.id}
        style={[styles.bizCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={() => handleBusinessPress(biz)}
        activeOpacity={0.7}
      >
        {/* Logo */}
        <View style={[styles.bizLogo, { backgroundColor: cat?.color ? cat.color + '20' : theme.colors.border }]}>
          {biz.logo ? (
            <Image source={{ uri: biz.logo }} style={styles.bizLogoImg} />
          ) : (
            <Ionicons name="storefront" size={scale(24)} color={cat?.color || theme.colors.textSecondary} />
          )}
        </View>
        <View style={styles.bizInfo}>
          <Text style={[styles.bizName, { color: theme.colors.text }]} numberOfLines={1}>
            {biz.name}
          </Text>
          <Text style={[styles.bizSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {biz.subcategory}{cat ? ` · ${t(cat.clave)}` : ''}
          </Text>
          {biz.location ? (
            <View style={styles.bizLocationRow}>
              <Ionicons name="location-outline" size={scale(12)} color={theme.colors.textSecondary} />
              <Text style={[styles.bizLocation, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {biz.location}
              </Text>
            </View>
          ) : null}
        </View>
        {/* Aura */}
        {biz.auraScore > 0 && (
          <View style={styles.bizAura}>
            <Ionicons name="star" size={scale(14)} color="#F5B731" />
            <Text style={[styles.bizAuraText, { color: theme.colors.text }]}>
              {biz.auraScore.toFixed(1)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Search results view
  if (searchQuery.length >= 2) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        {renderHeader()}
        {searching ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: scale(40) }} />
        ) : searchResults.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={scale(48)} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {t('weebiz.noBusinesses')}
            </Text>
          </View>
        ) : (
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={searchResults}
            keyExtractor={item => item.id!}
            renderItem={({ item }) => renderBusinessCard(item)}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    );
  }

  function renderHeader() {
    return (
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="search-outline" size={scale(18)} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={t('weebiz.searchPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={scale(18)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {renderHeader()}

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: scale(40) }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Categorias */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('weebiz.categories')}</Text>
          <View style={styles.categoriesGrid}>
            {categoriesToShow.map(renderCategoryItem)}
          </View>
          {!showAllCategories && (
            <TouchableOpacity
              style={[styles.showMoreBtn, { borderColor: theme.colors.border }]}
              onPress={() => setShowAllCategories(true)}
            >
              <Text style={[styles.showMoreText, { color: theme.colors.primary }]}>
                {t('weebiz.moreCategories')}
              </Text>
              <Ionicons name="chevron-down" size={scale(16)} color={theme.colors.primary} />
            </TouchableOpacity>
          )}

          {/* Destacados */}
          {featuredBiz.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: SPACING.xl }]}>
                {t('weebiz.featured')}
              </Text>
              {featuredBiz.map(renderBusinessCard)}
            </>
          )}

          {/* Recientes */}
          {recentBiz.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: SPACING.xl }]}>
                {t('weebiz.newBusinesses')}
              </Text>
              {recentBiz.map(renderBusinessCard)}
            </>
          )}

          {/* Registrar negocio */}
          <TouchableOpacity
            style={[styles.registerBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('WeeBizRegister')}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={scale(20)} color="#FFF" />
            <Text style={styles.registerBtnText}>{t('weebiz.registerMine')}</Text>
          </TouchableOpacity>

          {/* Empty state si no hay negocios aun */}
          {featuredBiz.length === 0 && recentBiz.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={scale(56)} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                Weë Biz
              </Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {t('weebiz.directoryEmpty')}
              </Text>
            </View>
          )}

          <View style={{ height: scale(40) }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    height: scale(40),
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    paddingVertical: 0,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold as any,
    marginBottom: SPACING.md,
  },
  // Categories grid
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryCard: {
    width: '23%' as any,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    minWidth: scale(72),
    flexGrow: 1,
    flexBasis: '22%' as any,
  },
  categoryIconWrap: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  categoryLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium as any,
    textAlign: 'center',
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
    borderTopWidth: 1,
  },
  showMoreText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium as any,
  },
  // Business cards
  bizCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  bizLogo: {
    width: scale(48),
    height: scale(48),
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bizLogoImg: {
    width: scale(48),
    height: scale(48),
    borderRadius: BORDER_RADIUS.md,
  },
  bizInfo: {
    flex: 1,
    gap: scale(2),
  },
  bizName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold as any,
  },
  bizSub: {
    fontSize: FONT_SIZE.xs,
  },
  bizLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(2),
    marginTop: scale(2),
  },
  bizLocation: {
    fontSize: FONT_SIZE.xs,
  },
  bizAura: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(2),
  },
  bizAuraText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold as any,
  },
  // List
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: scale(60),
    gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold as any,
  },
  emptyText: {
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
    lineHeight: scale(22),
  },
  // Register button
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: scale(44),
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xl,
  },
  registerBtnText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold as any,
    color: '#FFF',
  },
});

export default WeeBizScreen;
