import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  BackHandler,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { DocumentSnapshot } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { MainStackParamList } from '../navigation/MainStackNavigator';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { getCategoryById } from '../constants/weebizCategories';
import { weeBizService, Business } from '../services/weeBizService';

type RoutePropType = RouteProp<MainStackParamList, 'WeeBizCategory'>;
type NavProp = StackNavigationProp<MainStackParamList>;

const WeeBizCategoryScreen: React.FC = () => {
  const { t, formato } = useIdioma();
  const { theme } = useTheme();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();

  const { categoryId, categoryLabel } = route.params;
  const category = getCategoryById(categoryId);
  /* El nombre sale de la categoría y en el idioma de ahora; el de la ruta queda para un id que ya no exista. */
  const nombreDeCategoria = category ? t(category.clave) : categoryLabel;

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const onBack = () => { navigation.goBack(); return true; };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [navigation]),
  );

  useEffect(() => {
    loadBusinesses();
  }, [categoryId]);

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const result = await weeBizService.getBusinessesByCategory(categoryId);
      setBusinesses(result.businesses);
      setLastDoc(result.lastVisible);
      setHasMore(result.businesses.length >= 20);
    } catch (e) {
      console.error('Load businesses error:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || !lastDoc) return;
    try {
      setLoadingMore(true);
      const result = await weeBizService.getBusinessesByCategory(categoryId, lastDoc);
      setBusinesses(prev => [...prev, ...result.businesses]);
      setLastDoc(result.lastVisible);
      setHasMore(result.businesses.length >= 20);
    } catch (e) {
      console.error('Load more error:', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleBusinessPress = (biz: Business) => {
    navigation.navigate('WeeBizProfile', { businessId: biz.id! });
  };

  const renderBusiness = ({ item }: { item: Business }) => (
    <TouchableOpacity
      style={[styles.bizCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={() => handleBusinessPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.bizLogo, { backgroundColor: category?.color ? category.color + '20' : theme.colors.border }]}>
        {item.logo ? (
          <Image source={{ uri: item.logo }} style={styles.bizLogoImg} />
        ) : (
          <Ionicons name="storefront" size={scale(24)} color={category?.color || theme.colors.textSecondary} />
        )}
      </View>
      <View style={styles.bizInfo}>
        <Text style={[styles.bizName, { color: theme.colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.bizSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {item.subcategory}
        </Text>
        {item.location ? (
          <View style={styles.bizLocationRow}>
            <Ionicons name="location-outline" size={scale(12)} color={theme.colors.textSecondary} />
            <Text style={[styles.bizLocation, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        ) : null}
      </View>
      {item.auraScore > 0 && (
        <View style={styles.bizAura}>
          <Ionicons name="star" size={scale(14)} color="#F5B731" />
          <Text style={[styles.bizAuraText, { color: theme.colors.text }]}>
            {formato.numero(item.auraScore, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons
          name={(category?.icon || 'storefront-outline') as any}
          size={scale(56)}
          color={category?.color || theme.colors.textSecondary}
        />
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
          {t('weebiz.noneYet')}
        </Text>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          {t('weebiz.firstInCategory', { categoria: nombreDeCategoria })}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={[styles.headerTitleRow, { gap: SPACING.sm }]}>
          {category && (
            <View style={[styles.headerIconWrap, { backgroundColor: category.color + '20' }]}>
              <Ionicons name={category.icon as any} size={scale(18)} color={category.color} />
            </View>
          )}
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {nombreDeCategoria}
          </Text>
        </View>
        <View style={{ width: scale(32) }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={category?.color || theme.colors.primary} style={{ marginTop: scale(40) }} />
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={item => item.id!}
          renderItem={renderBusiness}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ padding: SPACING.lg }} />
          ) : null}
        />
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconWrap: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold as any,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    flexGrow: 1,
  },
  // Business card
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
    overflow: 'hidden',
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
  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: scale(80),
    gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold as any,
  },
  emptyText: {
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
    lineHeight: scale(22),
    paddingHorizontal: SPACING.xl,
  },
});

export default WeeBizCategoryScreen;
