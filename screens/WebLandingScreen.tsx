/**
 * WebLandingScreen - Simplified landing screen for web browsers (desktop & mobile)
 * Uses native HTML elements for reliable scrolling on all browsers
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { postsService, Post } from '../services/firestoreService';
import PostCard from '../components/PostCard';
import Header from '../components/Header';
import DrawerMenu from '../components/DrawerMenu';
import WeelsRow from '../components/WeelsRow';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { COMMUNITY_CATEGORIES } from '../constants/communityCategories';

// Categorías sociales (comunidades). Fuente única: constants/communityCategories.ts
const CATEGORIES = COMMUNITY_CATEGORIES.map((c) => ({ id: c.id, slug: c.slug, name: c.name, emoji: c.emoji, color: c.color }));

const WebLandingScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [posts, setPosts] = useState<Post[]>([]);
  const [weels, setWeels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Load posts
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

  // Explora comunidades: una temática abre su feed; "Ver todas" abre el explorador
  const handleCategoryPress = (category: (typeof CATEGORIES)[number]) => {
    navigation.navigate('Feed', { communitySlug: category.slug });
  };

  const handleAllCommunities = () => {
    navigation.navigate('ExploreCommunities');
  };

  const handleCreateWeel = () => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('Create', { kind: 'weel' });
  };

  const handleOpenWeels = () => {
    if (weels.length === 0) {
      handleCreateWeel();
      return;
    }
    navigation.navigate('Reels', { initialPost: weels[0], initialVideoPosts: weels });
  };

  const handleNotificationsPress = () => {
    navigation.navigate('Notifications');
  };

  const handlePostPress = (post: Post) => {
    navigation.navigate('PostDetail', { postId: post.id });
  };

  const handleComment = (postId: string) => {
    navigation.navigate('PostDetail', { postId });
  };

  const handlePrivateMessage = (userId: string, userData?: any) => {
    if (!user) {
      navigation.navigate('Register');
      return;
    }
    navigation.navigate('Inbox', {
      screen: 'Conversation',
      params: { otherUserId: userId, otherUserData: userData },
    });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: theme.colors.background,
      overflow: 'hidden',
    }}>
      {/* Fixed Header */}
      <div style={{ flexShrink: 0, zIndex: 100 }}>
        <Header
          onNotificationsPress={handleNotificationsPress}
          onMenuPress={() => setDrawerVisible(true)}
        />
      </div>

      {/* Scrollable Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}>
        {/* Hero Section */}
        <div style={{ padding: 16 }}>
          <LinearGradient
            colors={['#E5A020', '#F5B731', '#D4911A']}
            style={styles.heroContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroTextArea}>
                <Text style={styles.heroTitle}>Tu creatividad no tiene límites.</Text>
                <Text style={styles.heroSubtitle}>Crea con IA. Comparte con personas.</Text>
              </View>
              <Image
                source={require('../assets/images/hero-couple.png')}
                style={styles.heroImage}
                contentFit="contain"
              />
            </View>
          </LinearGradient>
        </div>

        {/* Explora comunidades: compacto, dos filas de cuatro (design/canvas/Wave.dc.html) */}
        <div style={{ padding: '0 16px 4px' }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>Explora comunidades</Text>
            <TouchableOpacity onPress={handleAllCommunities} activeOpacity={0.7} accessibilityLabel="Ver todas las comunidades">
              <Text style={[styles.viewAll, { color: theme.colors.accent }]}>Ver todas ›</Text>
            </TouchableOpacity>
          </View>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => handleCategoryPress(cat)}
                activeOpacity={0.7}
                accessibilityLabel={cat.name}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={[styles.categoryName, { color: theme.colors.text }]} numberOfLines={2}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </div>
        </div>

        {/* Weëls */}
        <div style={{ padding: '0 0 8px' }}>
          <WeelsRow posts={weels} onOpenWeels={handleOpenWeels} onCreateWeel={handleCreateWeel} />
        </div>

        {/* Feed */}
        <div style={{ padding: '0 16px 100px' }}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Creado por la comunidad
          </Text>

          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No hay publicaciones aún
              </Text>
            </View>
          ) : (
            posts.map((post) => (
              <div key={post.id} style={{ marginBottom: 16 }}>
                <PostCard
                  post={post}
                  onPress={() => handlePostPress(post)}
                  onComment={handleComment}
                  onPrivateMessage={handlePrivateMessage}
                  isVisible={true}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Drawer Menu */}
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
  heroContainer: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  heroTextArea: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  heroTitle: {
    fontSize: scale(18),
    fontWeight: FONT_WEIGHT.bold,
    color: 'white',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.8)',
  },
  heroImage: {
    width: scale(100),
    height: scale(100),
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  viewAll: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  categoryItem: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryIconImage: {
    width: 28,
    height: 28,
  },
  categoryEmoji: {
    fontSize: 26,
    lineHeight: 30,
  },
  categoryName: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: FONT_WEIGHT.semibold,
    textAlign: 'center',
  },
  emptyState: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZE.base,
  },
});

export default WebLandingScreen;
