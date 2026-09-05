import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { bookmarksService } from '../services/bookmarksService';
import { Post } from '../services/firestoreService';
import PostCard from '../components/PostCard';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * Guardados: prompts, tutoriales y trabajos que la persona quiere volver a ver.
 * Se abre desde el menú ☰ (🔖 Guardados).
 */
const SavedPostsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { savedIds } = useBookmarks();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!user) {
        setPosts([]);
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        setPosts(await bookmarksService.getSavedPosts(user.uid));
      } catch (error) {
        console.warn('Error cargando Guardados:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Si se quita un guardado desde la tarjeta, desaparece de la lista al instante
  const visiblePosts = useMemo(
    () => posts.filter((p) => !!p.id && savedIds.includes(p.id)),
    [posts, savedIds]
  );

  const handlePostPress = (post: Post) => {
    navigation.navigate('PostDetail', { post });
  };

  const handleComment = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (post) handlePostPress(post);
  };

  const handlePrivateMessage = (userId: string, userData?: any) => {
    if (!user || user.uid === userId) return;
    navigation.navigate('Main', {
      screen: 'Inbox',
      params: {
        screen: 'Conversation',
        params: { otherUserId: userId, otherUserData: userData },
      },
    });
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>🔖</Text>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Aún no guardaste nada</Text>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        Toca el marcador de una publicación para guardar prompts, tutoriales y trabajos que quieras volver a ver.
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: theme.colors.accent }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyButtonText}>Explorar el Home</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={scale(23)} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>🔖 Guardados</Text>
          {!loading && (
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {visiblePosts.length === 1 ? '1 publicación' : `${visiblePosts.length} publicaciones`}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : (
        <FlatList
          data={visiblePosts}
          keyExtractor={(item) => item.id!}
          renderItem={({ item }) => (
            <View style={styles.postContainer}>
              <PostCard
                post={item}
                onComment={handleComment}
                onPrivateMessage={handlePrivateMessage}
                onPress={handlePostPress}
                isVisible
              />
            </View>
          )}
          contentContainerStyle={visiblePosts.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(true);
              }}
              tintColor={theme.colors.accent}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: scale(44),
    height: scale(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.xs,
    marginTop: scale(2),
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xxxl * 2,
  },
  postContainer: {
    marginBottom: SPACING.md,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyEmoji: {
    fontSize: scale(44),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    lineHeight: scale(20),
  },
  emptyButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xl,
    height: scale(44),
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

export default SavedPostsScreen;
