import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { communityService, Community } from '../services/communityService';
import { POPULAR_COMMUNITIES } from '../constants/communityCategories';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const CommunitiesManagementScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile, updateLocalProfile } = useUserProfile();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Comunidades populares de ejemplo (simulan comunidades creadas por usuarios)
  const EXAMPLE_COMMUNITIES: Community[] = POPULAR_COMMUNITIES.map((c) => ({
    id: 'ex-' + c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    icon: c.icon.replace('-outline', ''),
    rules: [],
    memberCount: c.members,
    postCount: 0,
    createdAt: {} as any,
    updatedAt: {} as any,
    isOfficial: false,
    moderators: [],
    status: 'active' as const,
  }));

  // Desde el Home: buscar una comunidad o crear la tuya
  const homeParams = (useRoute<any>().params || {}) as { query?: string; create?: boolean };
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningCommunity, setJoiningCommunity] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(homeParams.query || '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (homeParams.create) setShowCreateModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Comunidades a las que el usuario pertenece
  const joinedCommunityIds = userProfile?.joinedCommunities || [];

  const loadCommunities = useCallback(async () => {
    try {
      // Cargar comunidades reales creadas por usuarios
      const realCommunities = await communityService.getUserCommunities();

      // Combinar reales + ejemplo (reales primero)
      const exampleIds = new Set(EXAMPLE_COMMUNITIES.map(c => c.slug));
      const filteredExamples = EXAMPLE_COMMUNITIES.filter(
        ex => !realCommunities.some(r => r.slug === ex.slug)
      );
      setCommunities([...realCommunities, ...filteredExamples]);
    } catch (error) {
      console.error('Error loading communities:', error);
      // Si falla la carga, mostrar al menos las de ejemplo
      setCommunities(EXAMPLE_COMMUNITIES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [joinedCommunityIds]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCommunities();
  };

  const navigateToRegister = () => {
    const tabNav = navigation.getParent();
    const mainNav = tabNav?.getParent();
    if (mainNav) {
      (mainNav as any).navigate('Register');
    }
  };

  const handleToggleCommunity = async (community: Community) => {
    if (!user) { navigateToRegister(); return; }
    if (!community.id) return;

    const isJoined = joinedCommunityIds.includes(community.id);
    setJoiningCommunity(community.id);

    try {
      if (isJoined) {
        // Confirmar antes de salir
        Alert.alert(
          'Salir de comunidad',
          `¿Estás seguro de que quieres salir de "${community.name}"?`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setJoiningCommunity(null) },
            {
              text: 'Salir',
              style: 'destructive',
              onPress: async () => {
                try {
                  await communityService.leaveCommunity(user.uid, community.id!);
                  // Actualizar estado local
                  const newJoinedCommunities = joinedCommunityIds.filter(id => id !== community.id);
                  updateLocalProfile({ joinedCommunities: newJoinedCommunities });
                  // Actualizar memberCount en la lista local
                  setCommunities(prev => prev.map(c =>
                    c.id === community.id
                      ? { ...c, memberCount: Math.max(0, c.memberCount - 1) }
                      : c
                  ));
                } catch (error) {
                  console.error('Error leaving community:', error);
                  Alert.alert('Error', 'No se pudo salir de la comunidad');
                } finally {
                  setJoiningCommunity(null);
                }
              },
            },
          ]
        );
      } else {
        // Unirse directamente
        await communityService.joinCommunity(user.uid, community.id);
        // Actualizar estado local
        const newJoinedCommunities = [...joinedCommunityIds, community.id];
        updateLocalProfile({ joinedCommunities: newJoinedCommunities });
        // Actualizar memberCount en la lista local
        setCommunities(prev => prev.map(c =>
          c.id === community.id
            ? { ...c, memberCount: c.memberCount + 1 }
            : c
        ));
        setJoiningCommunity(null);
      }
    } catch (error) {
      console.error('Error toggling community:', error);
      Alert.alert('Error', 'No se pudo completar la acción');
      setJoiningCommunity(null);
    }
  };

  const renderCommunityItem = ({ item }: { item: Community }) => {
    const isJoined = item.id ? joinedCommunityIds.includes(item.id) : false;
    const isToggling = joiningCommunity === item.id;

    return (
      <TouchableOpacity
        style={[styles.communityItem, { backgroundColor: theme.colors.card }]}
        onPress={() => (navigation as any).navigate('Feed', { communitySlug: item.slug })}
        activeOpacity={0.7}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageThumbnailUrl || item.imageUrl }}
            style={styles.communityImage}
          />
        ) : (
          <View style={[styles.communityIcon, { backgroundColor: theme.colors.surface }]}>
            <Ionicons
              name={item.icon as any || 'people'}
              size={24}
              color={theme.colors.accent}
            />
          </View>
        )}

        <View style={styles.communityInfo}>
          <View style={styles.communityHeader}>
            <Text style={[styles.communityName, { color: theme.colors.text }]}>
              {item.name}
            </Text>
            {item.isOfficial && (
              <View style={[styles.officialBadge, { backgroundColor: theme.colors.accent + '20' }]}>
                <Ionicons name="checkmark-circle" size={12} color={theme.colors.accent} />
                <Text style={[styles.officialText, { color: theme.colors.accent }]}>Oficial</Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.communityDescription, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
          <View style={styles.communityStats}>
            <Ionicons name="people-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.memberCount, { color: theme.colors.textSecondary }]}>
              {item.memberCount} {item.memberCount === 1 ? 'miembro' : 'miembros'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.joinButton,
            isJoined
              ? { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }
              : { backgroundColor: theme.colors.accent }
          ]}
          onPress={() => handleToggleCommunity(item)}
          disabled={isToggling}
          activeOpacity={0.7}
        >
          {isToggling ? (
            <ActivityIndicator size="small" color={isJoined ? theme.colors.text : 'white'} />
          ) : (
            <>
              <Ionicons
                name={isJoined ? 'checkmark' : 'add'}
                size={16}
                color={isJoined ? theme.colors.text : 'white'}
              />
              <Text style={[
                styles.joinButtonText,
                { color: isJoined ? theme.colors.text : 'white' }
              ]}>
                {isJoined ? 'Unido' : 'Unirse'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {title}
      </Text>
      <View style={[styles.countBadge, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
          {count}
        </Text>
      </View>
    </View>
  );

  // Filtrar por búsqueda
  const normalizedQuery = searchQuery.toLowerCase().trim();
  const filtered = normalizedQuery
    ? communities.filter(c =>
        c.name.toLowerCase().includes(normalizedQuery) ||
        c.description.toLowerCase().includes(normalizedQuery)
      )
    : communities;

  // Separar comunidades: mis creaciones, unidas, descubrir
  const myUid = userProfile?.uid || user?.uid;
  const myCommunities = filtered.filter(c => c.id && (c as any).createdBy === myUid);
  const joinedCommunities = filtered.filter(c => c.id && joinedCommunityIds.includes(c.id) && (c as any).createdBy !== myUid);
  const availableCommunities = filtered.filter(c => c.id && !joinedCommunityIds.includes(c.id) && (c as any).createdBy !== myUid);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Cargando comunidades...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.border,
        paddingTop: insets.top + SPACING.sm,
      }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Comunidades
        </Text>
        <TouchableOpacity
          style={[styles.createCommunityBtn, { backgroundColor: theme.colors.accent }]}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.7}
          accessibilityLabel="Crear comunidad"
        >
          <Ionicons name="add" size={20} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={[styles.searchContainer, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="search" size={scale(18)} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Buscar comunidades..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={scale(18)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={[
          ...(myCommunities.length > 0 ? [{ type: 'header-mine', count: myCommunities.length }] : []),
          ...myCommunities.map(c => ({ type: 'community', data: c })),
          ...(joinedCommunities.length > 0 ? [{ type: 'header-joined', count: joinedCommunities.length }] : []),
          ...joinedCommunities.map(c => ({ type: 'community', data: c })),
          { type: 'header-available', count: availableCommunities.length },
          ...availableCommunities.map(c => ({ type: 'community', data: c })),
        ]}
        renderItem={({ item }) => {
          if (item.type === 'header-mine') {
            return renderSectionHeader('Mis comunidades', (item as any).count as number);
          }
          if (item.type === 'header-joined') {
            return renderSectionHeader('Comunidades unidas', (item as any).count as number);
          }
          if (item.type === 'header-available') {
            return renderSectionHeader('Descubrir comunidades', (item as any).count as number);
          }
          return renderCommunityItem({ item: (item as any).data });
        }}
        keyExtractor={(item, index) => {
          if (item.type?.startsWith('header')) return item.type;
          return (item as any).data?.id || `community-${index}`;
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No hay comunidades disponibles
            </Text>
          </View>
        }
      />

      {/* Create community — fullscreen modal */}
      <Modal
        visible={showCreateModal}
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          behavior="padding"
        >
          {/* Header */}
          <View style={[styles.modalHeader, { paddingTop: insets.top + SPACING.sm, borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={26} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: theme.colors.text }]}>Nueva comunidad</Text>
            <TouchableOpacity
              style={[styles.modalHeaderBtn, { backgroundColor: '#F5B731', opacity: newName.trim() ? 1 : 0.4 }]}
              onPress={async () => {
                if (!newName.trim() || !user || creating) return;
                setCreating(true);
                try {
                  const communityId = await communityService.createCommunity({
                    name: newName.trim(),
                    description: newDesc.trim() || `Comunidad de ${newName.trim()}`,
                    icon: 'people',
                    rules: [],
                    createdBy: userProfile?.uid || user.uid,
                  });
                  // Auto-join the community
                  if (communityId) {
                    await communityService.joinCommunity(user.uid, communityId);
                    const newJoined = [...joinedCommunityIds, communityId];
                    updateLocalProfile({ joinedCommunities: newJoined });
                  }
                  setNewName('');
                  setNewDesc('');
                  setShowCreateModal(false);
                  handleRefresh();
                } catch (e: any) {
                  Alert.alert('Error', e.message || 'No se pudo crear la comunidad');
                }
                setCreating(false);
              }}
              disabled={!newName.trim() || creating}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalHeaderBtnText}>Crear</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.modalForm}>
            <View style={[styles.modalField, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Nombre</Text>
              <TextInput
                style={[styles.modalFieldInput, { color: theme.colors.text }]}
                placeholder="Ej: Amantes del café"
                placeholderTextColor={theme.colors.textSecondary}
                value={newName}
                onChangeText={setNewName}
                maxLength={40}
                autoFocus
              />
            </View>

            <View style={[styles.modalField, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Descripción</Text>
              <TextInput
                style={[styles.modalFieldInput, styles.modalFieldMulti, { color: theme.colors.text }]}
                placeholder="¿De qué trata esta comunidad?"
                placeholderTextColor={theme.colors.textSecondary}
                value={newDesc}
                onChangeText={setNewDesc}
                multiline
                maxLength={200}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: SPACING.xs,
    width: 40,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.3,
  },
  headerRight: {
    width: 40,
  },
  createCommunityBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  modalHeaderBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
  },
  modalHeaderBtnText: {
    color: '#fff',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  modalForm: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  modalField: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  modalLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    marginBottom: SPACING.xs,
  },
  modalFieldInput: {
    fontSize: FONT_SIZE.base,
    padding: 0,
  },
  modalFieldMulti: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 0.5,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    paddingVertical: 0,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.base,
  },
  listContent: {
    paddingBottom: 85,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  countText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  communityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
  },
  communityIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityImage: {
    width: scale(48),
    height: scale(48),
    borderRadius: BORDER_RADIUS.md,
  },
  communityInfo: {
    flex: 1,
    gap: 4,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  communityName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    gap: 2,
  },
  officialText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.medium,
  },
  communityDescription: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 18,
  },
  communityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  memberCount: {
    fontSize: FONT_SIZE.xs,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
    minWidth: scale(80),
  },
  joinButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    paddingHorizontal: SPACING.lg,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
  },
});

export default CommunitiesManagementScreen;
