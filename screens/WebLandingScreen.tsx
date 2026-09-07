/**
 * WebLandingScreen — Home de Weë en web (escritorio y móvil web).
 *
 * Estructura (docs/UX.md §16): Header → carrusel de 4 banners de diseño
 * → Comunidades ("Encuentra las tuyas": buscar o crear) → Weëls → Creado por
 * la comunidad (feed con filtros simples). Solo lo esencial: nada de catálogos,
 * categorías ni herramientas en el Home.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { postsService, Post } from '../services/firestoreService';
import PostCard from '../components/PostCard';
import Header from '../components/Header';
import DrawerMenu from '../components/DrawerMenu';
import WeelsRow from '../components/WeelsRow';
import HeroCarousel from '../components/HeroCarousel';
import CommunitiesEntry from '../components/CommunitiesEntry';
import { FEED_FILTER_OPTIONS, FeedFilterId, filterPosts } from '../utils/feedFilters';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const WebLandingScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [posts, setPosts] = useState<Post[]>([]);
  const [weels, setWeels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [feedFilter, setFeedFilter] = useState<FeedFilterId>('all');

  // Publicaciones
  useEffect(() => {
    const loadPosts = async () => {
      try {
        const result = await postsService.getPublicPostsPaginated(20);
        setPosts(result?.documents || []);
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPosts();
  }, []);

  // Weëls (videos cortos) para la fila del Home
  useEffect(() => {
    postsService
      .getVideoPostsPaginated(10)
      .then((result) => setWeels(result?.documents || []))
      .catch((error) => console.error('Error loading Weëls:', error));
  }, []);

  const filteredPosts = useMemo(() => filterPosts(posts, feedFilter), [posts, feedFilter]);

  // ── Comunidades: buscar o crear ──
  const handleSearchCommunities = (query: string) => navigation.navigate('ExploreCommunities', query ? { query } : undefined);
  const handleCreateCommunity = () => {
    if (!user) return navigation.navigate('Register');
    navigation.navigate('ExploreCommunities', { create: true });
  };

  // ── Weëls ──
  const handleCreateWeel = () => {
    if (!user) return navigation.navigate('Login');
    navigation.navigate('Create', { kind: 'weel' });
  };
  const handleOpenWeels = () => {
    if (weels.length === 0) return handleCreateWeel();
    navigation.navigate('Reels', { initialPost: weels[0], initialVideoPosts: weels });
  };
  useEffect(() => {
    if (!route.params?.openWeels) return;
    navigation.setParams({ openWeels: undefined });
    handleOpenWeels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.openWeels]);

  // ── Feed ──
  const handlePostPress = (post: Post) => navigation.navigate('PostDetail', { post });
  const handleComment = (postId: string) => navigation.navigate('PostDetail', { postId });
  const handlePrivateMessage = (userId: string, userData?: any) => {
    if (!user) return navigation.navigate('Register');
    navigation.navigate('Inbox', { screen: 'Conversation', params: { otherUserId: userId, otherUserData: userData } });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: theme.colors.background, overflow: 'hidden' }}>
      {/* Header fijo: ☰ · Weë · Credits · campana / Iniciar sesión */}
      <div style={{ flexShrink: 0, zIndex: 100 }}>
        <Header onNotificationsPress={() => navigation.navigate('Notifications')} onMenuPress={() => setDrawerVisible(true)} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
        {/* Carrusel de 4 banners de diseño */}
        <HeroCarousel />

        {/* Comunidades: buscar o crear */}
        <CommunitiesEntry onSearch={handleSearchCommunities} onCreate={handleCreateCommunity} />

        {/* Weëls */}
        <WeelsRow posts={weels} onOpenWeels={handleOpenWeels} onCreateWeel={handleCreateWeel} />

        {/* Creado por la comunidad */}
        <div style={{ padding: '8px 16px 100px' }}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Creado por la comunidad</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filtersScroll}>
            {FEED_FILTER_OPTIONS.map((f) => {
              const active = feedFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setFeedFilter(f.id)}
                  style={[styles.chip, { backgroundColor: active ? theme.colors.accent : theme.colors.surface }]}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrar: ${f.label}`}
                >
                  <Text style={[styles.chipText, { color: '#1F2937', fontWeight: active ? FONT_WEIGHT.bold : FONT_WEIGHT.semibold }]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {filteredPosts.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={styles.emptyEmoji}>✨</Text>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{posts.length === 0 ? 'Todavía no hay publicaciones' : 'Nada por aquí con este filtro'}</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {posts.length === 0 ? 'Sé la primera persona en compartir algo creado con IA.' : 'Prueba con otro filtro o comparte algo tú.'}
              </Text>
              <TouchableOpacity onPress={() => (user ? navigation.navigate('Create') : navigation.navigate('Register'))} style={[styles.emptyButton, { backgroundColor: theme.colors.accent }]} activeOpacity={0.85} accessibilityLabel="Crear una publicación">
                <Text style={styles.emptyButtonText}>Crear</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredPosts.map((post) => (
              <div key={post.id} style={{ marginBottom: 16 }}>
                <PostCard post={post} onPress={() => handlePostPress(post)} onComment={handleComment} onPrivateMessage={handlePrivateMessage} isVisible={true} />
              </div>
            ))
          )}
        </div>
      </div>

      <DrawerMenu visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </div>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: scale(18),
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.sm,
  },
  filtersScroll: {
    marginBottom: SPACING.md,
  },
  filters: {
    gap: SPACING.sm,
    paddingRight: SPACING.lg,
  },
  chip: {
    height: scale(32),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: FONT_SIZE.xs,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: scale(6),
  },
  emptyEmoji: {
    fontSize: scale(32),
  },
  emptyTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    lineHeight: scale(20),
  },
  emptyButton: {
    marginTop: SPACING.sm,
    height: scale(40),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default WebLandingScreen;
