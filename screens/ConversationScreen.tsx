import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
  Animated,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { uploadAudioToCloudinary } from '../services/cloudinaryService';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { messagesService, Message, Conversation, ParticipantData } from '../services/messagesService';
import { uploadMessageImageFromUri, uploadViewOncePhoto } from '../services/storageService';
import { notify } from '../utils/notify';
import { cloudinaryThumb } from '../services/cloudinaryService';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import ChatCamera from '../components/ChatCamera';
import AudioBubble from '../components/AudioBubble';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, ICON_SIZE } from '../constants/design';
import { CHAT_THEMES, CHAT_WALLPAPERS, getThemeById, ChatTheme } from '../constants/chatThemes';
import { InboxStackParamList } from '../navigation/InboxStackNavigator';

type ConvRoute = RouteProp<InboxStackParamList, 'Conversation'>;

const ConversationScreen = () => {
  const { theme } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const nav = useNavigation();
  const route = useRoute<ConvRoute>();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const { conversationId: initialConvId, otherUserId, otherUserData } = route.params || {};

  const [convId, setConvId] = useState<string | undefined>(initialConvId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [ephemeral, setEphemeral] = useState(false);
  const [chatThemeId, setChatThemeId] = useState('classic');
  const [chatWallpaper, setChatWallpaper] = useState<string | null>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);

  // Get current theme
  const chatTheme = getThemeById(chatThemeId);

  const myUid = userProfile?.uid || user?.uid;
  const other = otherUserData || { displayName: 'Usuario', avatarType: 'predefined' as const, avatarId: 'male' };

  // ─── Subscribe to conversation metadata (ephemeral state, theme) ───
  useEffect(() => {
    if (!convId) return;
    return messagesService.subscribeToConversation(convId, (conv) => {
      setEphemeral(!!conv.ephemeral);
      if (conv.chatTheme) setChatThemeId(conv.chatTheme);
      if (conv.chatWallpaper !== undefined) setChatWallpaper(conv.chatWallpaper || null);
    });
  }, [convId]);

  // ─── Join/leave chat (for ephemeral cleanup) ───
  useEffect(() => {
    if (!convId || !myUid) return;
    // Clean up old ephemeral messages immediately on enter
    messagesService.cleanupEphemeralMessages(convId);
    messagesService.setActiveInChat(convId, myUid, true);
    return () => { messagesService.setActiveInChat(convId, myUid, false); };
  }, [convId, myUid]);

  // ─── Toggle ephemeral mode ───
  const toggleEphemeral = useCallback(() => {
    if (!convId) return;
    messagesService.toggleEphemeral(convId, !ephemeral);
  }, [convId, ephemeral]);

  // ─── StatusBar management ───
  useFocusEffect(
    useCallback(() => {
      // Set light status bar when entering chat
      StatusBar.setBarStyle('light-content');

      return () => {
        // Restore based on app theme when leaving
        StatusBar.setBarStyle(theme.dark ? 'light-content' : 'dark-content');
      };
    }, [theme.dark])
  );

  // ─── Theme picker ───
  const pickTheme = useCallback((themeId: string) => {
    if (!convId) return;
    setChatThemeId(themeId);
    messagesService.setChatTheme(convId, themeId);
  }, [convId]);

  const pickWallpaper = useCallback((wallpaperUrl: string | null) => {
    if (!convId) return;
    setChatWallpaper(wallpaperUrl);
    messagesService.setChatWallpaper(convId, wallpaperUrl);
  }, [convId]);

  const pickCustomWallpaper = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('weetalk.permissions'), t('weetalk.photoPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    pickWallpaper(result.assets[0].uri);
  }, [pickWallpaper]);

  // ─── Android keyboard tracking (Expo Go uses adjustPan, KAV doesn't work) ───
  const [androidKbHeight, setAndroidKbHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setAndroidKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setAndroidKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ─── Init conversation ───
  useEffect(() => {
    if (!user || !userProfile) return;

    // If we already have a conversation ID, skip the lookup — show UI immediately
    if (convId) {
      setLoading(false);
      messagesService.markAsRead(convId, userProfile.uid).catch(() => {});
      return;
    }

    // No conversation ID: need to find or create one
    if (otherUserId && otherUserData) {
      messagesService.getOrCreateConversation(
        userProfile.uid, otherUserId,
        { displayName: userProfile.displayName, avatarType: userProfile.avatarType, avatarId: userProfile.avatarId, photoURL: userProfile.photoURL },
        otherUserData,
      ).then(cid => {
        setConvId(cid);
        setLoading(false);
      }).catch(e => {
        console.error('Error initializing conversation:', e);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user, userProfile, otherUserId]);

  // ─── Real-time messages ───
  useEffect(() => {
    if (!convId) return;
    let firstLoad = true;
    const unsub = messagesService.subscribeToMessages(convId, (msgs) => {
      setMessages([...msgs].filter(m => !(m as any).deleted).reverse());
      if (!messagesLoaded) setMessagesLoaded(true);
      // Only mark as read on first load, not on every new message
      if (firstLoad && myUid) {
        firstLoad = false;
        messagesService.markAsRead(convId, myUid).catch(() => {});
      }
    });
    return unsub;
  }, [convId, myUid]);

  // ─── Send text ───
  const send = useCallback(async () => {
    const texto = text.trim();
    if (!texto || !convId || !myUid || sending) return;
    setText('');
    setSending(true);
    try {
      await messagesService.sendMessage(convId, myUid, texto);
    } catch (e) {
      console.error('Error sending message:', e);
      /*
       * Lo escrito no se pierde: la caja se vació al enviar y, si el envío
       * falla, vuelve lo que había —salvo que ya se esté escribiendo otra
       * cosa—, y se dice que no salió. Antes se tragaba en silencio.
       */
      setText((pendiente) => (pendiente ? pendiente : texto));
      notify(t('weetalk.sendFailed'));
    }
    setSending(false);
  }, [text, convId, myUid, sending, t]);

  // ─── Photo preview state ───
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewViewOnce, setPreviewViewOnce] = useState(false);
  const [viewOnceImage, setViewOnceImage] = useState<string | null>(null);

  // ─── Send image ───
  const confirmSendImage = useCallback(async () => {
    if (!previewUri || !convId || !myUid || !user) return;
    const uri = previewUri;
    const viewOnce = previewViewOnce;
    setPreviewUri(null);
    setPreviewViewOnce(false);
    setSending(true);
    try {
      /*
       * La foto única va al Storage de Weë, donde se puede borrar; la normal, por
       * el camino de siempre. La RUTA física es de la CUENTA (`user.uid`), que es
       * lo único que `storage.rules` deja escribir; el mensaje lo firma la cara
       * activa (`myUid`), que es atribución. Con el Perfil Weë activo, subir bajo
       * la cara dejaba la foto denegada por las reglas.
       */
      const url = viewOnce ? await uploadViewOncePhoto(uri, user.uid, convId) : await uploadMessageImageFromUri(uri, myUid);
      await messagesService.sendMessage(convId, myUid, viewOnce ? 'Foto única' : '📷 Imagen', 'image', url, viewOnce);
    } catch (e) {
      notify(t('common.error'), t('weetalk.imageFailed'));
    }
    setSending(false);
  }, [previewUri, previewViewOnce, convId, myUid, user]);

  // ─── Pick from gallery → show preview ───
  const pickImage = useCallback(async () => {
    if (!convId || !myUid || sending) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('weetalk.permissions'), t('weetalk.photoPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setPreviewViewOnce(false);
    setPreviewUri(result.assets[0].uri);
  }, [convId, myUid, sending]);

  // ─── Camera modal ───
  const [cameraOpen, setCameraOpen] = useState(false);

  // ─── Audio recording ───
  const [recording, setRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordStartTime = useRef(0);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulse = useCallback(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return loop;
  }, [pulseAnim]);

  const startRecording = useCallback(async () => {
    if (!convId || !myUid || sending || recording) return;
    try {
      if (recordingRef.current) {
        try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
        recordingRef.current = null;
      }
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert(t('weetalk.permissions'), t('weetalk.audioPermission')); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = rec;
      recordStartTime.current = Date.now();
      setRecordDuration(0);
      setRecording(true);
      // Start timer
      recordTimerRef.current = setInterval(() => {
        setRecordDuration(Math.round((Date.now() - recordStartTime.current) / 1000));
      }, 500);
      startPulse();
    } catch (e) {
      console.error('Error starting recording:', e);
      setRecording(false);
    }
  }, [convId, myUid, sending, recording, startPulse]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current || !convId || !myUid) return;
    // Stop UI
    setRecording(false);
    setRecordDuration(0);
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri) return;

      const durationSec = Math.round((Date.now() - recordStartTime.current) / 1000);
      if (durationSec < 1) return;

      setSending(true);
      const audioUrl = await uploadAudioToCloudinary(uri, `audio/${myUid}`);
      await messagesService.sendMessage(convId, myUid, '🎤 Audio', 'audio', audioUrl, false, durationSec);
      setSending(false);
    } catch (e) {
      console.error('Error sending audio:', e);
      setSending(false);
    }
  }, [convId, myUid, pulseAnim]);

  const handleCameraSend = useCallback(async (uri: string, viewOnce: boolean) => {
    setCameraOpen(false);
    if (!convId || !myUid || !user) return;
    setSending(true);
    try {
      /*
       * La foto única va al Storage de Weë, donde se puede borrar; la normal, por
       * el camino de siempre. La RUTA física es de la CUENTA (`user.uid`), que es
       * lo único que `storage.rules` deja escribir; el mensaje lo firma la cara
       * activa (`myUid`), que es atribución. Con el Perfil Weë activo, subir bajo
       * la cara dejaba la foto denegada por las reglas.
       */
      const url = viewOnce ? await uploadViewOncePhoto(uri, user.uid, convId) : await uploadMessageImageFromUri(uri, myUid);
      await messagesService.sendMessage(convId, myUid, viewOnce ? 'Foto única' : '📷 Imagen', 'image', url, viewOnce);
    } catch (e) {
      notify(t('common.error'), t('weetalk.imageFailed'));
    }
    setSending(false);
  }, [convId, myUid, user]);

  /*
   * ─── Foto única: abrirla es quemarla ───
   *
   * Se enseña, y SOLO cuando ya está cargada en pantalla se pide al servidor
   * que la queme (`burnViewOnce`: quita la dirección del mensaje y borra el
   * archivo). Pedirlo antes dejaría la foto sin cargar y borrada; si la app
   * se cierra antes de que cargue, la foto sigue sin abrir y se podrá ver
   * después, que es lo correcto: nadie la ha visto todavía (Fase 11, C3).
   */
  const [pendienteDeQuemar, setPendienteDeQuemar] = useState<string | null>(null);
  const openViewOnce = useCallback((msg: Message) => {
    if (!msg.imageUrl || !msg.id || !convId) return;
    setPendienteDeQuemar(msg.id);
    setViewOnceImage(msg.imageUrl);
  }, [convId]);
  const quemarSiToca = useCallback(() => {
    if (!pendienteDeQuemar || !convId) return;
    const id = pendienteDeQuemar;
    setPendienteDeQuemar(null);
    messagesService.markViewOnceOpened(convId, id);
  }, [pendienteDeQuemar, convId]);

  // ─── Time helpers ───
  const fmtTime = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const fmtDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const showDate = (index: number) => {
    const msg = messages[index];
    const next = messages[index + 1];
    if (!next) return true;
    const d1 = msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp as any);
    const d2 = next.timestamp?.toDate ? next.timestamp.toDate() : new Date(next.timestamp as any);
    return d1.toDateString() !== d2.toDateString();
  };

  // ─── Render bubble ───
  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    const mine = item.senderId === myUid;
    const bubbleBg = mine ? chatTheme.myBubble : chatTheme.otherBubble;
    const bubbleText = mine ? chatTheme.myBubbleText : chatTheme.otherBubbleText;
    const metaColor = mine ? chatTheme.metaText : chatTheme.otherMetaText;

    return (
      <View>
        {showDate(index) && (
          <View style={styles.dateRow}>
            <View style={[styles.datePill, { backgroundColor: chatTheme.datePillBackground }]}>
              <Text style={[styles.dateText, { color: chatTheme.datePillText }]}>
                {fmtDate(item.timestamp)}
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.row, mine ? styles.rowR : styles.rowL]}>
          {item.type === 'image' && item.imageUrl && !item.viewOnce ? (
            // ─── Normal image: no bubble background, just rounded photo ───
            <View>
              <TouchableOpacity activeOpacity={0.9} onPress={() => setViewOnceImage(item.imageUrl!)}>
                <Image
                  source={{ uri: cloudinaryThumb(item.imageUrl, 400) }}
                  style={styles.imgStandalone}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={150}
                />
              </TouchableOpacity>
              <View style={[styles.meta, { marginTop: 4 }]}>
                <Text style={[styles.time, { color: chatTheme.otherMetaText }]}>
                  {fmtTime(item.timestamp)}
                </Text>
                {mine && (
                  <Ionicons name={item.read ? 'checkmark-done' : 'checkmark'} size={13} color={chatTheme.otherMetaText} style={{ marginLeft: 2 }} />
                )}
              </View>
            </View>
          ) : (
            // ─── Text or view-once: normal bubble ───
            <View style={[
              styles.bubble,
              { backgroundColor: bubbleBg },
              mine ? { borderBottomRightRadius: 4 } : { borderBottomLeftRadius: 4 },
              item.ephemeral && styles.ephemeralBubble,
            ]}>
              {item.ephemeral && (
                <View style={styles.ephemeralIcon}>
                  <Ionicons name="eye-off" size={10} color="#fff" />
                </View>
              )}
              {item.type === 'image' && item.viewOnce ? (
                /*
                 * Una foto única quemada ya no tiene dirección: el servidor se
                 * la quitó al abrirse. Sin dirección = vista, aunque el
                 * mensaje sea antiguo y no traiga la marca (Fase 11, C3).
                 */
                mine ? (
                  <View style={styles.viewOnceSender}>
                    <Ionicons name="eye-off" size={20} color={metaColor} />
                    <Text style={[styles.viewOnceText, { color: metaColor }]}>
                      {item.viewOnceOpened || !item.imageUrl ? t('weetalk.photoOpened') : t('weetalk.photoOnce')}
                    </Text>
                  </View>
                ) : item.viewOnceOpened || !item.imageUrl ? (
                  <View style={styles.viewOnceOpened}>
                    <Ionicons name="eye-off-outline" size={20} color={metaColor} />
                    <Text style={[styles.viewOnceText, { color: metaColor }]}>{t('weetalk.photoSeen')}</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.viewOnceTap} onPress={() => openViewOnce(item)}>
                    <Ionicons name="eye" size={24} color={bubbleText} />
                    <Text style={[styles.viewOnceText, { color: bubbleText }]}>{t('weetalk.tapToView')}</Text>
                  </TouchableOpacity>
                )
              ) : item.type === 'audio' && item.audioUrl ? (
                <AudioBubble audioUrl={item.audioUrl} duration={item.audioDuration} mine={mine} />
              ) : (
                <Text style={[styles.msgText, { color: bubbleText }]}>
                  {item.content}
                </Text>
              )}
              <View style={styles.meta}>
                <Text style={[styles.time, { color: metaColor }]}>
                  {fmtTime(item.timestamp)}
                </Text>
                {mine && (
                  <Ionicons name={item.read ? 'checkmark-done' : 'checkmark'} size={13} color={metaColor} style={{ marginLeft: 2 }} />
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }, [messages, myUid, chatTheme]);

  // ─── Loading ───
  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: chatTheme.backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: chatTheme.headerBackground, borderColor: chatTheme.headerBackground, paddingTop: insets.top + SPACING.md }]}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={26} color={chatTheme.headerText} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerUser} activeOpacity={0.7}>
          <AvatarDisplay size={34} avatarType={other.avatarType || 'predefined'} avatarId={other.avatarId || 'male'}
            photoURL={typeof other.photoURL === 'string' ? other.photoURL : undefined}
            backgroundColor={chatTheme.accent} showBorder={false} />
          <View>
            <Text style={[styles.headerName, { color: chatTheme.headerText }]} numberOfLines={1}>
              {other.displayName}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity hitSlop={8} onPress={() => setShowThemePicker(true)} style={styles.ephemeralBtn} accessibilityRole="button" accessibilityLabel={t('weetalk.theme')}>
          <Ionicons name="color-palette-outline" size={20} color={chatTheme.headerIcon} />
        </TouchableOpacity>
        {/* Un interruptor, y se dice como tal: un lector de pantalla tiene que saber si está puesto. */}
        <TouchableOpacity
          hitSlop={8}
          onPress={toggleEphemeral}
          style={[styles.ephemeralBtn, ephemeral && { backgroundColor: 'rgba(34,197,94,0.15)' }]}
          accessibilityRole="switch"
          accessibilityState={{ checked: ephemeral }}
          accessibilityLabel={t('weetalk.ephemeralMode')}
        >
          <Ionicons name={ephemeral ? 'eye-off' : 'eye-off-outline'} size={20} color={ephemeral ? '#22C55E' : chatTheme.headerIcon} />
        </TouchableOpacity>
      </View>

      {/* Ephemeral banner */}
      {ephemeral && (
        <View style={[styles.ephemeralBanner, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
          <Ionicons name="eye-off" size={14} color="#22C55E" />
          <Text style={styles.ephemeralBannerText}>{t('weetalk.ephemeralOn')}</Text>
        </View>
      )}

      {/* Chat background wallpaper */}
      {chatWallpaper && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Image
            source={{ uri: chatWallpaper }}
            style={[StyleSheet.absoluteFill, { opacity: 0.25 }]}
            contentFit="cover"
          />
        </View>
      )}

      {/* Chat — iOS: KAV with padding, Android: manual keyboard height */}
      {Platform.OS === 'ios' ? (
      <KeyboardAvoidingView
        style={styles.fill}
        behavior="padding"
        keyboardVerticalOffset={-insets.bottom + 8}
      >
        <FlatList
          style={styles.fill}
          data={messages}
          renderItem={renderItem}
          keyExtractor={m => m.id || `${m.senderId}-${m.timestamp}`}
          inverted
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !messagesLoaded ? (
              <View style={styles.skeletonWrap}>
                {[0.7, 0.5, 0.85, 0.4, 0.65].map((w, i) => (
                  <View key={i} style={[styles.skeletonRow, i % 2 === 0 ? styles.rowL : styles.rowR]}>
                    <View style={[styles.skeletonBubble, { width: `${w * 70}%`, backgroundColor: chatTheme.inputBackground }]} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubble-ellipses-outline" size={56} color={chatTheme.inputPlaceholder} style={{ opacity: 0.3 }} />
                <Text style={[styles.emptyText, { color: chatTheme.inputPlaceholder }]}>{t('weetalk.firstMessage')}</Text>
              </View>
            )
          }
        />
        {recording ? (
          <View style={[styles.inputBar, styles.recordingBar, { backgroundColor: chatTheme.inputBarBackground, borderColor: chatTheme.inputBackground, paddingBottom: Math.max(insets.bottom, 6) }]}>
            <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.recordingTime}>{Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, '0')}</Text>
            <View style={styles.recordingWave}>
              {[...Array(12)].map((_, i) => (
                <View key={i} style={[styles.recordingWaveBar, { height: 8 + Math.random() * 16, backgroundColor: '#EF4444', opacity: 0.4 + Math.random() * 0.6 }]} />
              ))}
            </View>
            <TouchableOpacity onPress={stopRecording} style={styles.recordingStopBtn} accessibilityRole="button" accessibilityLabel={t('weetalk.send')}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.inputBar, { backgroundColor: chatTheme.inputBarBackground, borderColor: chatTheme.inputBackground, paddingBottom: Math.max(insets.bottom, 6) }]}>
            <TouchableOpacity style={[styles.cameraBtn, { backgroundColor: chatTheme.accent }]} onPress={() => setCameraOpen(true)} disabled={sending} accessibilityRole="button" accessibilityLabel={t('weetalk.photo')}>
              <Ionicons name="camera" size={20} color={chatTheme.accentText} />
            </TouchableOpacity>
            <View style={[styles.inputWrap, { backgroundColor: chatTheme.inputBackground }]}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: chatTheme.inputText }]}
                placeholder={t('weetalk.messagePlaceholderShort')}
                placeholderTextColor={chatTheme.inputPlaceholder}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
                editable={!sending}
              />
              {text.trim() ? (
                <TouchableOpacity onPress={send} disabled={sending} style={[styles.sendBtn, { backgroundColor: chatTheme.accent }]} accessibilityRole="button" accessibilityLabel={t('weetalk.send')}>
                  {sending ? <ActivityIndicator size="small" color={chatTheme.accentText} /> : <Ionicons name="send" size={16} color={chatTheme.accentText} />}
                </TouchableOpacity>
              ) : (
                <View style={styles.inputActions}>
                  <TouchableOpacity style={styles.inputActionBtn} onPressIn={startRecording} disabled={sending} accessibilityRole="button" accessibilityLabel={t('weetalk.recordAudio')}>
                    <Ionicons name="mic-outline" size={22} color={chatTheme.inputPlaceholder} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.inputActionBtn} onPress={pickImage} disabled={sending} accessibilityRole="button" accessibilityLabel={t('weetalk.attach')}>
                    <Ionicons name="image-outline" size={22} color={chatTheme.inputPlaceholder} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
      ) : (
      /* Android: simple View with marginBottom for keyboard */
      <View style={[styles.fill, { marginBottom: androidKbHeight > 0 ? androidKbHeight + 16 : 24 }]}>
        <FlatList
          style={styles.fill}
          data={messages}
          renderItem={renderItem}
          keyExtractor={m => m.id || `${m.senderId}-${m.timestamp}`}
          inverted
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !messagesLoaded ? (
              <View style={styles.skeletonWrap}>
                {[0.7, 0.5, 0.85, 0.4, 0.65].map((w, i) => (
                  <View key={i} style={[styles.skeletonRow, i % 2 === 0 ? styles.rowL : styles.rowR]}>
                    <View style={[styles.skeletonBubble, { width: `${w * 70}%`, backgroundColor: chatTheme.inputBackground }]} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubble-ellipses-outline" size={56} color={chatTheme.inputPlaceholder} style={{ opacity: 0.3 }} />
                <Text style={[styles.emptyText, { color: chatTheme.inputPlaceholder }]}>{t('weetalk.firstMessage')}</Text>
              </View>
            )
          }
        />
        {recording ? (
          <View style={[styles.inputBar, styles.recordingBar, { backgroundColor: chatTheme.inputBarBackground, borderColor: chatTheme.inputBackground, paddingBottom: androidKbHeight > 0 ? 10 : Math.max(insets.bottom, 16) }]}>
            <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.recordingTime}>{Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, '0')}</Text>
            <View style={styles.recordingWave}>
              {[...Array(12)].map((_, i) => (
                <View key={i} style={[styles.recordingWaveBar, { height: 8 + Math.random() * 16, backgroundColor: '#EF4444', opacity: 0.4 + Math.random() * 0.6 }]} />
              ))}
            </View>
            <TouchableOpacity onPress={stopRecording} style={styles.recordingStopBtn} accessibilityRole="button" accessibilityLabel={t('weetalk.send')}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.inputBar, { backgroundColor: chatTheme.inputBarBackground, borderColor: chatTheme.inputBackground, paddingBottom: androidKbHeight > 0 ? 10 : Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity style={[styles.cameraBtn, { backgroundColor: chatTheme.accent }]} onPress={() => setCameraOpen(true)} disabled={sending} accessibilityRole="button" accessibilityLabel={t('weetalk.photo')}>
              <Ionicons name="camera" size={20} color={chatTheme.accentText} />
            </TouchableOpacity>
            <View style={[styles.inputWrap, { backgroundColor: chatTheme.inputBackground }]}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: chatTheme.inputText }]}
                placeholder={t('weetalk.messagePlaceholderShort')}
                placeholderTextColor={chatTheme.inputPlaceholder}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
                editable={!sending}
              />
              {text.trim() ? (
                <TouchableOpacity onPress={send} disabled={sending} style={[styles.sendBtn, { backgroundColor: chatTheme.accent }]} accessibilityRole="button" accessibilityLabel={t('weetalk.send')}>
                  {sending ? <ActivityIndicator size="small" color={chatTheme.accentText} /> : <Ionicons name="send" size={16} color={chatTheme.accentText} />}
                </TouchableOpacity>
              ) : (
                <View style={styles.inputActions}>
                  <TouchableOpacity style={styles.inputActionBtn} onPressIn={startRecording} disabled={sending} accessibilityRole="button" accessibilityLabel={t('weetalk.recordAudio')}>
                    <Ionicons name="mic-outline" size={22} color={chatTheme.inputPlaceholder} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.inputActionBtn} onPress={pickImage} disabled={sending} accessibilityRole="button" accessibilityLabel={t('weetalk.attach')}>
                    <Ionicons name="image-outline" size={22} color={chatTheme.inputPlaceholder} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
      )}

      {/* Photo preview before sending */}
      <Modal visible={!!previewUri} transparent animationType="slide" onRequestClose={() => setPreviewUri(null)}>
        <View style={styles.previewModal}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setPreviewUri(null)} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <Image source={{ uri: previewUri || '' }} style={styles.previewImage} contentFit="contain" />

          <View style={styles.previewFooter}>
            <TouchableOpacity
              style={[styles.previewToggle, previewViewOnce && styles.previewToggleActive]}
              onPress={() => setPreviewViewOnce(!previewViewOnce)}
              accessibilityRole="switch"
              accessibilityState={{ checked: previewViewOnce }}
              accessibilityLabel={t('weetalk.photoOnce')}
            >
              <Ionicons name={previewViewOnce ? 'eye-off' : 'eye-outline'} size={20} color="#fff" />
              <Text style={styles.previewToggleText}>
                {previewViewOnce ? t('weetalk.viewOnceOn') : t('weetalk.keepInChat')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.previewSendBtn, { backgroundColor: chatTheme.accent }]} onPress={confirmSendImage} accessibilityRole="button" accessibilityLabel={t('weetalk.send')}>
              <Ionicons name="send" size={22} color={chatTheme.accentText} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Theme picker */}
      <Modal visible={showThemePicker} transparent animationType="slide" onRequestClose={() => setShowThemePicker(false)}>
        <View style={styles.colorPickerOverlay}>
          <TouchableOpacity style={styles.colorPickerDismiss} onPress={() => setShowThemePicker(false)} />
          <View style={[styles.colorPickerSheet, { backgroundColor: chatTheme.headerBackground }]}>
            <View style={styles.sheetHandle} />

            {/* Themes section */}
            <Text style={[styles.colorPickerTitle, { color: chatTheme.headerText }]}>{t('weetalk.theme')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.themeScrollView}>
              <View style={styles.themeGrid}>
                {CHAT_THEMES.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.themeOption,
                      { backgroundColor: t.backgroundColor, borderColor: t.accent },
                      chatThemeId === t.id && styles.themeOptionActive,
                    ]}
                    onPress={() => pickTheme(t.id)}
                  >
                    <View style={[styles.themePreviewBubble, { backgroundColor: t.myBubble }]} />
                    <View style={[styles.themePreviewBubbleOther, { backgroundColor: t.otherBubble }]} />
                    <Text style={[styles.themeOptionLabel, { color: t.headerText }]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Wallpapers section */}
            <Text style={[styles.colorPickerTitle, { color: chatTheme.headerText, marginTop: 20 }]}>{t('weetalk.background')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.wallpaperScrollView}>
              <View style={styles.wallpaperGrid}>
                {CHAT_WALLPAPERS.map(w => (
                  <TouchableOpacity
                    key={w.id}
                    style={[
                      styles.wallpaperOption,
                      { backgroundColor: chatTheme.inputBackground },
                      chatWallpaper === w.url && styles.wallpaperOptionActive,
                    ]}
                    onPress={() => pickWallpaper(w.url)}
                  >
                    {w.preview ? (
                      <Image source={{ uri: w.preview }} style={styles.wallpaperPreview} contentFit="cover" />
                    ) : (
                      <Ionicons name="ban-outline" size={24} color={chatTheme.inputPlaceholder} />
                    )}
                  </TouchableOpacity>
                ))}
                {/* Custom wallpaper option */}
                <TouchableOpacity
                  style={[styles.wallpaperOption, { backgroundColor: chatTheme.inputBackground }]}
                  onPress={pickCustomWallpaper}
                >
                  <Ionicons name="add" size={28} color={chatTheme.accent} />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: chatTheme.accent }]}
              onPress={() => setShowThemePicker(false)}
            >
              <Text style={[styles.doneButtonText, { color: chatTheme.accentText }]}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom camera */}
      <ChatCamera visible={cameraOpen} onClose={() => setCameraOpen(false)} onSend={handleCameraSend} />

      {/* Fullscreen image viewer (normal photos + view-once) */}
      <Modal visible={!!viewOnceImage} animationType="fade" onRequestClose={() => setViewOnceImage(null)}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <TouchableOpacity style={styles.viewOnceModal} activeOpacity={1} onPress={() => setViewOnceImage(null)}>
          <View style={styles.viewOnceImageWrap}>
            <Image source={{ uri: viewOnceImage || '' }} style={styles.viewOnceFullImage} contentFit="cover" onLoad={quemarSiToca} />
          </View>
          <Text style={styles.viewOnceHint}>{t('weetalk.tapToClose')}</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: SPACING.sm,
  },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerName: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },

  list: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },

  dateRow: { alignItems: 'center', marginVertical: SPACING.md },
  datePill: { paddingHorizontal: SPACING.md, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
  dateText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },

  row: { marginVertical: 2 },
  rowR: { alignItems: 'flex-end' },
  rowL: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: 6,
    borderRadius: BORDER_RADIUS.lg,
  },
  msgText: { fontSize: FONT_SIZE.base, lineHeight: 20 },
  img: { width: 220, aspectRatio: 3 / 4, borderRadius: BORDER_RADIUS.md, marginBottom: 4 },
  imgStandalone: { width: 220, aspectRatio: 3 / 4, borderRadius: BORDER_RADIUS.lg },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 },
  time: { fontSize: 11 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.base },
  skeletonWrap: { flex: 1, justifyContent: 'flex-end', gap: 10, paddingBottom: SPACING.md },
  skeletonRow: { paddingHorizontal: SPACING.xs },
  skeletonBubble: { height: 38, borderRadius: BORDER_RADIUS.lg, opacity: 0.4 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  cameraBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingLeft: SPACING.md,
    paddingRight: 4,
    minHeight: 44,
    maxHeight: 100,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    ...Platform.select({ web: { outlineStyle: 'none' as any } }),
  },
  inputActions: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
  inputActionBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },
  recordingBar: { justifyContent: 'center' },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  recordingTime: { color: '#EF4444', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, fontVariant: ['tabular-nums'], marginHorizontal: 8 },
  recordingWave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
  recordingWaveBar: { width: 3, borderRadius: 2 },
  recordingStopBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  sendBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  ephemeralBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  ephemeralBubble: { opacity: 0.85 },
  ephemeralIcon: { position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' },
  ephemeralBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  ephemeralBannerText: { color: '#22C55E', fontSize: 11, fontWeight: FONT_WEIGHT.medium },

  // Theme picker
  colorPickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  colorPickerDismiss: { flex: 1 },
  colorPickerSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  colorPickerTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, marginBottom: 12, marginLeft: 4 },
  themeScrollView: { marginHorizontal: -20, paddingHorizontal: 20 },
  themeGrid: { flexDirection: 'row', gap: 10, paddingRight: 20 },
  themeOption: { width: 85, height: 70, borderRadius: 12, padding: 8, alignItems: 'center', justifyContent: 'flex-end', borderWidth: 2, borderColor: 'transparent' },
  themeOptionActive: { borderWidth: 2 },
  themePreviewBubble: { position: 'absolute', top: 8, right: 10, width: 26, height: 14, borderRadius: 7 },
  themePreviewBubbleOther: { position: 'absolute', top: 24, left: 10, width: 20, height: 12, borderRadius: 6 },
  themeOptionLabel: { fontSize: 10, fontWeight: FONT_WEIGHT.medium, marginTop: 4 },
  wallpaperScrollView: { marginHorizontal: -20, paddingHorizontal: 20 },
  wallpaperGrid: { flexDirection: 'row', gap: 10, paddingRight: 20 },
  wallpaperOption: { width: 70, height: 70, borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  wallpaperOptionActive: { borderColor: '#F5B731' },
  wallpaperPreview: { width: '100%', height: '100%' },
  doneButton: { marginTop: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  doneButtonText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  chatBackground: { flex: 1 },

  // View once styles
  viewOnceOpened: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  viewOnceSender: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  viewOnceTap: { alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 20 },
  viewOnceText: { fontSize: FONT_SIZE.sm },

  // Photo preview modal
  previewModal: { flex: 1, backgroundColor: '#000' },
  previewHeader: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: SPACING.lg, paddingTop: 50, paddingBottom: SPACING.md },
  previewImage: { flex: 1 },
  previewFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, paddingBottom: 40 },
  previewToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
  previewToggleActive: { backgroundColor: 'rgba(34,197,94,0.6)' },
  previewToggleText: { color: '#fff', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  previewSendBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },

  // View once fullscreen viewer
  viewOnceModal: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 20 },
  viewOnceImageWrap: { width: '100%', aspectRatio: 3 / 4, borderRadius: 16, overflow: 'hidden' },
  viewOnceFullImage: { width: '100%', height: '100%' },
  viewOnceHint: { color: 'rgba(255,255,255,0.35)', fontSize: FONT_SIZE.sm, marginTop: SPACING.lg },
});

export default ConversationScreen;
