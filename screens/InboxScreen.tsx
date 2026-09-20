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
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useResponsive } from '../hooks/useResponsive';
import { messagesService, Conversation } from '../services/messagesService';
import { useConversaciones } from '../hooks/useConversaciones';
import { getRelativeTime } from '../data/mockData';
import { InboxStackParamList } from '../navigation/InboxStackNavigator';
import Header from '../components/Header';
import DrawerMenu from '../components/DrawerMenu';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';

type Nav = StackNavigationProp<InboxStackParamList, 'InboxList'>;

const InboxScreen = () => {
  const { theme } = useTheme();
  const { t, locale } = useIdioma();
  const { user, registerCleanup } = useAuth();
  const { userProfile } = useUserProfile();
  const nav = useNavigation<Nav>();
  const { isDesktop } = useResponsive();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);

  const activeUid = userProfile?.uid || user?.uid;

  /*
   * LA BANDEJA COMPARTE SUSCRIPCIÓN CON EL CONTADOR (Fase 11.x-6).
   *
   * Antes esta pantalla abría su propio oyente sobre `conversations` y la
   * navegación abría otro idéntico para el número de no leídos: dos
   * suscripciones en tiempo real al mismo conjunto de documentos. Ahora las dos
   * salen de `useConversaciones`, que mantiene UNA por aplicación y la reabre
   * sola al cambiar de cara.
   */
  const { conversaciones, cargando } = useConversaciones();
  useEffect(() => {
    setConversations(conversaciones);
    setLoading(cargando);
  }, [conversaciones, cargando]);

  // ─── Helpers ───
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
    Alert.alert(t('weetalk.deleteConversation'), t('weetalk.areYouSure'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => messagesService.deleteConversation(id).catch(console.error) },
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
                {last.timestamp ? getRelativeTime(last.timestamp.toDate(), locale) : ''}
              </Text>
            )}
          </View>
          <View style={styles.itemBottom}>
            {item.ephemeral && <Ionicons name="eye-off" size={13} color="#22C55E" style={{ marginRight: 4 }} />}
            <Text
              style={[styles.itemMsg, { color: item.ephemeral ? '#22C55E' : unread ? theme.colors.text : theme.colors.textSecondary, fontWeight: unread ? FONT_WEIGHT.medium : FONT_WEIGHT.regular }]}
              numberOfLines={1}
            >
              {/*
                Lo que se lee bajo el nombre. Tres de las cuatro salidas son de
                Weë y van por clave; la cuarta es EL MENSAJE DE UNA PERSONA y se
                pinta crudo. Cuando lo escribiste tú, la frase entera viene del
                diccionario con el mensaje dentro de su hueco: así el "Tú:" puede
                ir donde cada idioma lo ponga sin pegar dos trozos a mano.
              */}
              {item.ephemeral
                ? t('weetalk.ephemeralMode')
                : last
                  ? (last.senderId === activeUid ? t('weetalk.youSaid', { mensaje: last.content }) : last.content)
                  : t('weetalk.noMessagesYet')}
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
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{t('weetalk.noConversations')}</Text>
      <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary }]}>
        {t('weetalk.noConversationsHint')}
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
            placeholder={t('weetalk.search')}
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
