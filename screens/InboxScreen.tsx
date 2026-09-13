import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useResponsive } from '../hooks/useResponsive';
import { messagesService, Conversation } from '../services/messagesService';
import { InboxStackParamList } from '../navigation/InboxStackNavigator';
import Header from '../components/Header';
import DrawerMenu from '../components/DrawerMenu';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';

type Nav = StackNavigationProp<InboxStackParamList, 'InboxList'>;

const InboxScreen = () => {
  const { theme } = useTheme();
  const { user, registerCleanup } = useAuth();
  const { userProfile } = useUserProfile();
  const nav = useNavigation<Nav>();
  const { isDesktop } = useResponsive();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);

  const activeUid = userProfile?.uid || user?.uid;

  // ─── Subscribe to conversations ───
  useEffect(() => {
    // Clear old conversations immediately on profile switch
    setConversations([]);

    if (!activeUid) { setLoading(false); return; }

    setLoading(true);
    let unsub: (() => void) | undefined;

    try {
      unsub = messagesService.subscribeToConversations(activeUid, (convs) => {
        setConversations(convs);
        setLoading(false);
      });

      const deregister = registerCleanup(() => unsub?.());

      const timeout = setTimeout(() => setLoading(false), 10000);

      return () => {
        clearTimeout(timeout);
        deregister();
        unsub?.();
      };
    } catch (error) {
      console.error('Error subscribing to conversations:', error);
      setLoading(false);
    }
  }, [activeUid, registerCleanup]);

  // ─── Helpers ───
  const getRelativeTime = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const openChat = (c: Conversation) => {
    if (!activeUid) return;
    const otherId = c.participants.find(id => id !== activeUid);
    if (!otherId) return;
    nav.navigate('Conversation', {
      conversationId: c.id,
      otherUserId: otherId,
      otherUserData: c.participantsData[otherId],
    });
  };

  const deleteChat = (id: string) => {
    Alert.alert('Eliminar conversación', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => messagesService.deleteConversation(id).catch(console.error) },
    ]);
  };

  const filtered = search.trim()
    ? conversations.filter(c => {
        const otherId = c.participants.find(id => id !== activeUid);
        if (!otherId) return false;
        const name = c.participantsData[otherId]?.displayName?.toLowerCase() || '';
        const msg = c.lastMessage?.content?.toLowerCase() || '';
        return name.includes(search.toLowerCase()) || msg.includes(search.toLowerCase());
      })
    : conversations;

  // ─── Render item ───
  const renderItem = ({ item }: { item: Conversation }) => {
    if (!activeUid) return null;
    const otherId = item.participants.find(id => id !== activeUid);
    if (!otherId) return null;
    const otherData = item.participantsData[otherId];
    if (!otherData) return null;

    const last = item.lastMessage;
    const unread = last && !last.read && last.senderId !== activeUid;

    return (
      <TouchableOpacity
        style={[styles.item, { borderColor: theme.colors.border }]}
        onPress={() => openChat(item)}
        onLongPress={() => deleteChat(item.id!)}
        activeOpacity={0.7}
      >
        <AvatarDisplay
          size={50}
          avatarType={otherData.avatarType || 'predefined'}
          avatarId={otherData.avatarId || 'male'}
          photoURL={typeof otherData.photoURL === 'string' ? otherData.photoURL : undefined}
          photoURLThumbnail={typeof otherData.photoURLThumbnail === 'string' ? otherData.photoURLThumbnail : undefined}
          backgroundColor={theme.colors.accent}
          showBorder={false}
        />

        <View style={styles.itemBody}>
          <View style={styles.itemTop}>
            <Text
              style={[styles.itemName, { color: theme.colors.text, fontWeight: unread ? FONT_WEIGHT.bold : FONT_WEIGHT.semibold }]}
              numberOfLines={1}
            >
              {otherData.displayName}
            </Text>
            {last && (
              <Text style={[styles.itemTime, { color: unread ? theme.colors.accent : theme.colors.textSecondary }]}>
                {getRelativeTime(last.timestamp)}
              </Text>
            )}
          </View>
          <View style={styles.itemBottom}>
            {item.ephemeral && <Ionicons name="eye-off" size={13} color="#22C55E" style={{ marginRight: 4 }} />}
            <Text
              style={[styles.itemMsg, { color: item.ephemeral ? '#22C55E' : unread ? theme.colors.text : theme.colors.textSecondary, fontWeight: unread ? FONT_WEIGHT.medium : FONT_WEIGHT.regular }]}
              numberOfLines={1}
            >
              {item.ephemeral ? 'Modo efímero' : last ? `${last.senderId === activeUid ? 'Tú: ' : ''}${last.content}` : 'No hay mensajes aún'}
            </Text>
            {unread && <View style={[styles.dot, { backgroundColor: theme.colors.accent }]} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surface }]}>
        <Ionicons name="chatbubbles-outline" size={44} color={theme.colors.textSecondary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Sin conversaciones</Text>
      <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary }]}>
        Toca "Privado" en cualquier publicación{'\n'}para iniciar una conversación anónima
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {!isDesktop && (
        <Header onMenuPress={() => setDrawerVisible(true)} />
      )}

      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="search" size={17} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Buscar..."
            placeholderTextColor={theme.colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        keyboardShouldPersistTaps="handled"
        key={activeUid}
        data={filtered}
        renderItem={renderItem}
        keyExtractor={c => c.id || ''}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      <DrawerMenu visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },

  searchWrap: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    height: 38,
    gap: SPACING.sm,
  },
  searchInput: { flex: 1, fontSize: FONT_SIZE.sm },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: SPACING.md,
  },
  itemBody: { flex: 1 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  itemName: { fontSize: FONT_SIZE.base, flex: 1, marginRight: SPACING.sm },
  itemTime: { fontSize: FONT_SIZE.xs },
  itemBottom: { flexDirection: 'row', alignItems: 'center' },
  itemMsg: { fontSize: FONT_SIZE.sm, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: SPACING.sm },

  emptyContainer: { flex: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: SPACING.xxxl },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, marginBottom: SPACING.sm },
  emptyDesc: { fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: 20 },
});

export default InboxScreen;
