import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Keyboard,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { notify } from '../utils/notify';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { uploadProfileImageFromUri, uploadBannerImageFromUri } from '../services/storageService';
import { postsService, Post, repostsService } from '../services/firestoreService';
import { voteService } from '../services/voteService';
import { formatNumber } from '../data/mockData';
import { ProfileStackParamList } from '../navigation/ProfileStackNavigator';
import DrawerMenu from '../components/DrawerMenu';
import AvatarPicker, { isDiceBearUrl } from '../components/avatars/AvatarPicker';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import PostCard from '../components/PostCard';
import ImageViewer from '../components/ImageViewer';
import { useResponsive } from '../hooks/useResponsive';
import { useMisEContacts } from '../hooks/useEContact';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 180;

type ProfileScreenNavigationProp = StackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

const ProfileScreen: React.FC = () => {
  const { t, locale } = useIdioma();
  const { theme, setThemeMode } = useTheme();
  const { user, logout } = useAuth();
  const { userProfile, loading: profileLoading, error: profileError, updateProfile, hasWeeProfile, activeProfileType, switchIdentity } = useUserProfile();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  /*
   * Mi agenda: la del PERFIL ACTIVO. El nombre —ËContacts o ẄContacts— y la
   * cifra salen de ahí, y el número son las conexiones aceptadas de esa
   * identidad, no un contador guardado ni la suma de las dos caras.
   */
  const misEcontacts = useMisEContacts();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const [showEditModal, setShowEditModal] = useState(false);
  const [tempDisplayName, setTempDisplayName] = useState('');
  const [tempBio, setTempBio] = useState('');
  const [tempWebsite, setTempWebsite] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userReposts, setUserReposts] = useState<Post[]>([]);
  const [userLikedPosts, setUserLikedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'reposts' | 'likes'>('posts');
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [showBannerViewer, setShowBannerViewer] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const currentScrollPosition = useRef(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showEditDropdown, setShowEditDropdown] = useState(false);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Actualizar campos temporales cuando cambie el perfil
  useEffect(() => {
    if (userProfile) {
      setTempDisplayName(userProfile.displayName);
      setTempBio(userProfile.bio || '');
      setTempWebsite(userProfile.website || '');
    }
  }, [userProfile]);

  // Cargar posts del usuario (usando uid del perfil activo)
  useEffect(() => {
    const loadUserPosts = async () => {
      if (!user || !userProfile) return;

      const activeUid = userProfile.uid;
      // Los likes siempre se guardan con user.uid (no el perfil activo)
      const authUid = user.uid;

      try {
        setLoadingPosts(true);
        setPostsError(null);
        console.log('🔍 Cargando posts del usuario:', activeUid);
        console.log('🔍 Cargando likes del auth uid:', authUid);

        // Cargar posts y reposts con el perfil activo, pero likes con el auth uid
        const [posts, reposts, likedPosts] = await Promise.all([
          postsService.getByUserId(activeUid),
          repostsService.getUserReposts(activeUid),
          voteService.getUserAgreedPosts(authUid) // Usar voteService para obtener posts con "agree"
        ]);

        console.log('📋 Posts encontrados:', posts.length);
        console.log('🔄 Reposts encontrados:', reposts.length);
        console.log('❤️ Liked posts encontrados:', likedPosts.length);

        setUserPosts(posts);
        setUserReposts(reposts);
        setUserLikedPosts(likedPosts);

        // Actualizar contador de posts en el perfil si es diferente
        if (userProfile && userProfile.posts !== posts.length) {
          await updateProfile({ posts: posts.length });
        }
      } catch (error) {
        console.error('Error loading user posts:', error);
        setPostsError('profile.postsFailed');
      } finally {
        setLoadingPosts(false);
      }
    };

    loadUserPosts();
  }, [user, userProfile?.id, userProfile?.uid]); // Recargar cuando cambie el usuario, perfil o identidad activa

  // Scroll to top cuando se toca el tab de Profile estando ya en Profile
  // Si ya está arriba, refrescar la página
  useEffect(() => {
    const parentNavigation = navigation.getParent();
    if (!parentNavigation) return;

    const unsubscribe = (parentNavigation as any).addListener('tabPress', (e: any) => {
      // Solo hacer scroll si el tab presionado es Profile
      if (e.target?.includes('Profile')) {
        // Si ya estamos arriba (menos de 50px), refrescar
        if (currentScrollPosition.current < 50) {
          refreshPosts();
        } else {
          // Si no, hacer scroll arriba
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: 0, animated: true });
          }
        }
      }
    });

    return unsubscribe;
  }, [navigation]);

  /*
   * ËContact vive en el MainStack, y esta pantalla está dentro del stack de
   * Perfil, dentro de las pestañas. Se sube hasta arriba en vez de confiar en
   * que el nombre se resuelva solo: ya nos pasó con `Create`, que existe en dos
   * navegadores y acababa en la pestaña equivocada.
   */
  const irAEContact = () => {
    const tabNavigation = navigation.getParent();
    const mainNavigation = tabNavigation?.getParent();
    if (mainNavigation) (mainNavigation as any).navigate('EContact');
    else (navigation as any).navigate('EContact');
  };

  // Función de navegación para el header
  const handleNotificationsPress = () => {
    // Navegar desde ProfileStack → TabNavigator → Home → Notifications
    const tabNavigation = navigation.getParent();
    if (tabNavigation) {
      (tabNavigation as any).navigate('Home', {
        screen: 'Notifications',
      });
    }
  };

  // Función para recargar posts (útil después de crear un nuevo post)
  const refreshPosts = async () => {
    if (!user || !userProfile) return;

    const activeUid = userProfile.uid;
    const authUid = user.uid;

    try {
      setLoadingPosts(true);

      // Cargar posts y reposts con perfil activo, likes con auth uid
      const [posts, reposts, likedPosts] = await Promise.all([
        postsService.getByUserId(activeUid),
        repostsService.getUserReposts(activeUid),
        voteService.getUserAgreedPosts(authUid)
      ]);

      setUserPosts(posts);
      setUserReposts(reposts);
      setUserLikedPosts(likedPosts);

      // Actualizar contador en el perfil
      if (userProfile && userProfile.posts !== posts.length) {
        await updateProfile({ posts: posts.length });
      }
    } catch (error) {
      console.error('Error refreshing posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  /*
   * ESTE HOOK VA AQUÍ, NO MÁS ABAJO.
   *
   * Debajo hay dos `return` tempranos —cargando y error—, y React exige que la
   * lista de hooks sea la misma en todos los renders. Definido después de ellos,
   * el paso de "cargando" a "cargado" ejecutaba un hook de más y la pantalla
   * moría con "Rendered more hooks than during the previous render".
   *
   * Solo se ha movido de sitio: hace exactamente lo mismo que hacía.
   */
  const handleVideoPress = useCallback((post: Post, positionMillis?: number) => {
    const videoPosts = userPosts.filter(p => !!p.videoUrl);
    (navigation as any).navigate('Reels', {
      initialPost: post,
      initialVideoPosts: videoPosts,
      communitySlug: null,
      initialPositionMillis: positionMillis,
    });
  }, [userPosts, navigation]);

  /*
   * ESTA FUNCIÓN VA AQUÍ, NO MÁS ABAJO.
   *
   * La usa el botón "Volver al Login" del estado de error, y ese estado sale por
   * un `return` temprano que está debajo. Declarada después, cuando se pulsaba
   * el botón la constante todavía no existía y saltaba "Cannot access
   * 'handleLogout' before initialization": el botón no hacía nada.
   *
   * Solo se ha movido de sitio: hace exactamente lo mismo que hacía.
   */
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert(t('common.error'), t('profile.signOutFailed'));
    }
  };

  if (profileLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          {t('profile.loading')}
        </Text>
      </View>
    );
  }

  if (profileError || !userProfile) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textSecondary} />
        <Text style={[styles.errorText, { color: theme.colors.text }]}>
          {t('profile.loadFailed')}
        </Text>
        <Text style={[styles.errorSubtext, { color: theme.colors.textSecondary }]}>
          {t(profileError || 'profile.loadFailedDetail')}
        </Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
          onPress={() => handleLogout()}
        >
          <Text style={styles.retryButtonText}>{t('profile.backToLogin')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleEditProfile = () => {
    setTempDisplayName(userProfile.displayName);
    setTempBio(userProfile.bio || '');
    setTempWebsite(userProfile.website || '');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!tempDisplayName.trim()) {
      Alert.alert(t('common.error'), t('profile.nameRequired'));
      return;
    }

    setUpdating(true);
    try {
      await updateProfile({
        displayName: tempDisplayName.trim(),
        bio: tempBio.trim(),
        website: tempWebsite.trim(),
      });
      setShowEditModal(false);
      // No mostrar Alert para evitar interferencias con la navegación
    } catch (error) {
      Alert.alert(t('common.error'), t('profile.updateFailed'));
    } finally {
      setUpdating(false);
    }
  };

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  // Función para manejar selección de avatar
  const handleAvatarSelect = async (avatarData: {
    type: 'predefined' | 'custom';
    uri?: string;
    avatarId?: string;
  }) => {
    console.log('🎭 handleAvatarSelect llamado con:', {
      type: avatarData.type,
      uri: avatarData.uri?.substring(0, 50),
      avatarId: avatarData.avatarId,
    });

    if (!user || !userProfile?.id) {
      console.error('❌ No hay usuario o perfil:', { user: !!user, profileId: userProfile?.id });
      Alert.alert(t('common.error'), t('profile.noSession'));
      return;
    }

    setUploadingAvatar(true);
    try {
      let updateData: any = {
        avatarType: avatarData.type,
      };

      if (avatarData.type === 'predefined') {
        console.log('📝 Seleccionado avatar predefinido:', avatarData.avatarId);
        updateData.avatarId = avatarData.avatarId;
        // Limpiar photoURL si cambiamos a predefinido
        updateData.photoURL = null;
        updateData.photoURLThumbnail = null;
      } else if (avatarData.type === 'custom' && avatarData.uri) {
        if (isDiceBearUrl(avatarData.uri)) {
          // DiceBear URL - guardar directo sin subir
          updateData.photoURL = avatarData.uri;
          updateData.photoURLThumbnail = null;
          updateData.avatarId = null;
        } else {
          console.log('📤 Subiendo imagen personalizada...');
          console.log('📍 URI:', avatarData.uri);

          // Subir la imagen a Firebase Storage (ahora retorna fullSize y thumbnail)
          const { fullSize, thumbnail } = await uploadProfileImageFromUri(avatarData.uri, user.uid);

          console.log('✅ Imagen subida exitosamente');
          console.log('📎 Full size URL:', fullSize?.substring(0, 50));
          console.log('📎 Thumbnail URL:', thumbnail?.substring(0, 50));

          if (!fullSize) {
            throw new Error(t('profile.imageUrlMissing'));
          }

          updateData.photoURL = fullSize;
          updateData.photoURLThumbnail = thumbnail;
          updateData.avatarId = null;
        }
      }

      console.log('💾 Guardando en perfil:', Object.keys(updateData));
      await updateProfile(updateData);
      console.log('✅ Avatar actualizado exitosamente');
      // No mostrar Alert para evitar interferencias
    } catch (error: any) {
      /* El detalle técnico va al registro (una sola vez); la persona ve una frase de Weë, también en web. */
      console.error('❌ Error updating avatar:', error);
      notify(t('common.error'), t('profile.avatarUpdateFailed'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleComment = (postId: string) => {
    const post = userPosts.find(p => p.id === postId);
    if (post) {
      (navigation as any).navigate('PostDetail', { post });
    }
  };

  const handlePrivateMessage = (userId: string, userData?: { displayName: string; avatarType?: string; avatarId?: string; photoURL?: string; photoURLThumbnail?: string }) => {
    const activeUid = userProfile?.uid || user?.uid;
    if (!user || activeUid === userId) return; // No enviar mensaje a sí mismo

    // Navegar a la pantalla de conversación
    (navigation as any).navigate('Inbox', {
      screen: 'Conversation',
      params: {
        otherUserId: userId,
        otherUserData: userData,
      },
    });
  };

  const handlePostPress = (post: Post) => {
    // Navegar al detalle del post
    (navigation as any).navigate('PostDetail', { post });
  };

  // Abrir visor de foto de perfil
  const handleAvatarLongPress = () => {
    // Solo abrir si hay una foto personalizada
    if (userProfile?.avatarType === 'custom' && userProfile?.photoURL) {
      setShowAvatarViewer(true);
    }
  };

  // Seleccionar y subir banner
  const handleBannerSelect = async () => {
    if (!user || !userProfile?.id) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('profile.permissionsTitle'), t('profile.galleryPermission'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      setUploadingBanner(true);
      const { fullSize } = await uploadBannerImageFromUri(result.assets[0].uri, user.uid);
      await updateProfile({ bannerURL: fullSize });
    } catch (error) {
      console.error('Error uploading banner:', error);
      Alert.alert(t('common.error'), t('profile.coverUploadFailed'));
    } finally {
      setUploadingBanner(false);
    }
  };

  // Compartir perfil
  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: t('profile.shareMessage', { nombre: userProfile?.displayName ?? '' }),
        // url: `https://wee.zone/u/${userProfile?.username || userProfile?.uid}`,
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  // Función para filtrar posts según la pestaña activa
  const getFilteredPosts = () => {
    switch (activeTab) {
      case 'posts':
        return userPosts;
      case 'media':
        return userPosts.filter(post => (post.imageUrls && post.imageUrls.length > 0) || post.videoUrl);
      case 'reposts':
        return userReposts;
      case 'likes':
        return userLikedPosts;
      default:
        return userPosts;
    }
  };

  const renderTabButton = (
    tab: 'posts' | 'media' | 'reposts' | 'likes',
    label: string
  ) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tab && styles.tabButtonActive
      ]}
      onPress={() => setActiveTab(tab)}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.tabLabel,
          {
            color: activeTab === tab ? theme.colors.accent : theme.colors.textSecondary,
            fontWeight: activeTab === tab ? '600' : '400',
          }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  /*
   * EL MURO DEL PERFIL WEË SE VE COMO UN MURO.
   *
   * Con el Perfil Weë activo, la pestaña de publicaciones ES un muro: todo lo
   * que hay debajo son publicaciones tuyas, una detrás de otra. Ahí la tarjeta
   * sobra —enmarcar cada una es enmarcar la pantalla entera— y además metía la
   * foto en un segundo hueco, más estrecha de lo que da el sitio.
   *
   * Con el Perfil Real la tarjeta se queda como estaba: ese perfil no cambia en
   * esta fase. `activeProfileType === 'hidi'` es el identificador heredado del
   * Perfil Weë y no se toca (ver CLAUDE.md).
   */
  const enPerfilWee = activeProfileType === 'hidi';

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postContainer}>
      <PostCard
        post={item}
        onComment={handleComment}
        onPrivateMessage={handlePrivateMessage}
        onPress={handlePostPress}
        onVideoPress={handleVideoPress}
        isVisible={false}
        variante={enPerfilWee ? 'muro' : 'tarjeta'}
      />
    </View>
  );

  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      animationType="slide"
      onRequestClose={() => setShowEditModal(false)}
      presentationStyle="fullScreen"
    >
      <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.modalHeader, {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
          paddingTop: insets.top + 8,
        }]}>
          <TouchableOpacity
            onPress={() => setShowEditModal(false)}
            style={styles.modalHeaderButton}
          >
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            {t('profile.editTitle')}
          </Text>
          <TouchableOpacity
            onPress={handleSaveProfile}
            disabled={updating}
            style={styles.modalHeaderButton}
          >
            {updating ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <Text style={[styles.modalSave, { color: theme.colors.accent }]}>
                {t('common.save')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.modalBody}
          contentContainerStyle={styles.modalBodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              {t('profile.displayNameLabel')}
            </Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }]}
              value={tempDisplayName}
              onChangeText={setTempDisplayName}
              placeholder={t('profile.displayNamePlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={30}
            />
            <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
              {t('profile.charCount', { usados: tempDisplayName.length, maximo: 30 })}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              {t('profile.bioLabel')}
            </Text>
            <TextInput
              style={[styles.input, styles.bioInput, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }]}
              value={tempBio}
              onChangeText={setTempBio}
              placeholder={t('profile.bioPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              maxLength={100}
            />
            <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
              {t('profile.charCount', { usados: tempBio.length, maximo: 100 })}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              {t('profile.websiteLabel')}
            </Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }]}
              value={tempWebsite}
              onChangeText={setTempWebsite}
              placeholder={t('profile.websitePlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={100}
            />
            <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
              {t('profile.charCount', { usados: tempWebsite.length, maximo: 100 })}
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          currentScrollPosition.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        {/* Banner/Cover Image */}
        <TouchableOpacity
          style={styles.bannerContainer}
          onPress={handleBannerSelect}
          onLongPress={() => userProfile?.bannerURL && setShowBannerViewer(true)}
          activeOpacity={0.9}
        >
          {uploadingBanner ? (
            <View style={[styles.bannerLoading, { backgroundColor: theme.colors.surface }]}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
            </View>
          ) : userProfile?.bannerURL ? (
            <Image
              source={{ uri: userProfile.bannerURL }}
              style={styles.bannerImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.bannerPlaceholder, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="camera-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={[styles.bannerPlaceholderText, { color: theme.colors.textSecondary }]}>
                {t('profile.addCover')}
              </Text>
            </View>
          )}

          {/* Header flotante sobre el banner */}
          <View style={[styles.floatingHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              style={[styles.floatingHeaderBtn, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
              onPress={() => setDrawerVisible(true)}
            >
              <Ionicons name="menu" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.floatingHeaderRight}>
              <TouchableOpacity
                style={[styles.floatingHeaderBtn, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
                onPress={handleSettingsPress}
              >
                <Ionicons name="settings-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {/* Avatar superpuesto al banner */}
        <View style={styles.avatarOverlapContainer}>
          <TouchableOpacity
            style={[styles.avatarWrapper, { borderColor: theme.colors.background }]}
            onLongPress={handleAvatarLongPress}
            delayLongPress={300}
            activeOpacity={0.9}
          >
            {uploadingAvatar ? (
              <View style={[styles.avatarLoadingContainer, { backgroundColor: theme.colors.surface }]}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
              </View>
            ) : (
              <AvatarPicker
                currentAvatar={typeof userProfile.photoURL === 'string' ? userProfile.photoURL : undefined}
                currentAvatarType={userProfile.avatarType}
                currentAvatarId={userProfile.avatarId}
                onAvatarSelect={handleAvatarSelect}
                size={90}
                isWeeProfile={activeProfileType === 'hidi'}
                onNavigateAiAvatar={() => (navigation as any).navigate('AiAvatar')}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Información del perfil */}
        <View style={styles.profileInfo}>
          {/* Nombre */}
          <Text style={[styles.displayName, { color: theme.colors.text }]}>
            {userProfile.displayName}
          </Text>

          {/* Handle/Username con badge verificado */}
          <View style={styles.handleContainer}>
            <TouchableOpacity
              style={[styles.handleBadge, {
                backgroundColor: activeProfileType === 'hidi' ? theme.colors.accent + '20' : theme.colors.surface,
              }]}
              onPress={() => {
                if (hasWeeProfile) {
                  switchIdentity();
                  const nextType = activeProfileType === 'real' ? 'hidi' : 'real';
                  setThemeMode(nextType === 'hidi' ? 'dark' : 'light');
                }
              }}
              activeOpacity={hasWeeProfile ? 0.7 : 1}
            >
              <Ionicons
                name={activeProfileType === 'hidi' ? 'eye-off' : 'eye'}
                size={14}
                color={activeProfileType === 'hidi' ? theme.colors.accent : theme.colors.textSecondary}
              />
              <Text style={[styles.handleText, {
                color: activeProfileType === 'hidi' ? theme.colors.accent : theme.colors.textSecondary,
              }]}>
                {userProfile.username || userProfile.displayName.toLocaleLowerCase(locale).replace(/\s+/g, '')}
              </Text>
              {userProfile.verified && (
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.accent} />
              )}
            </TouchableOpacity>
          </View>

          {/* Bio */}
          {userProfile.bio ? (
            <Text style={[styles.bio, { color: theme.colors.text }]}>
              {userProfile.bio}
            </Text>
          ) : null}

          {/* Estadísticas horizontales */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {formatNumber(userProfile.posts)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('profile.posts')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            {/*
              ËCONTACTS / ẄCONTACTS, EN LUGAR DE SEGUIDORES Y SIGUIENDO.
              Una sola cifra porque la relación es una sola: si estáis conectados,
              lo estáis los dos. Y es pulsable, porque un número de personas sin
              forma de ver quiénes son no sirve de nada.

              El nombre y la cifra son los del PERFIL ACTIVO: con el Perfil Real
              dice ËContacts y cuenta las suyas; con el Perfil Weë, ẄContacts y
              las suyas. Nunca la suma de los dos.

              El número sale de las conexiones ACEPTADAS, no de ningún contador
              guardado: mientras nadie lo escriba, contarlo es lo único fiable.
            */}
            <TouchableOpacity
              style={styles.statItem}
              onPress={irAEContact}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('profile.viewMyEcontacts', { nombre: misEcontacts.nombrePlural, total: misEcontacts.total })}
            >
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {misEcontacts.cargando ? '…' : formatNumber(misEcontacts.total)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.accentDark }]}>
                {misEcontacts.nombrePlural}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botones de acción */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={handleEditProfile}
              activeOpacity={0.8}
            >
              <Text style={[styles.editButtonText, { color: theme.colors.text }]}>{t('profile.editProfile')}</Text>
              <Ionicons name="chevron-down" size={16} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={handleShareProfile}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-redo-outline" size={18} color={theme.colors.text} />
              <Text style={[styles.shareButtonText, { color: theme.colors.text }]}>{t('common.share')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingsIconButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={handleSettingsPress}
              activeOpacity={0.8}
            >
              <Ionicons name="settings-outline" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Botón Crear perfil Weë - solo si no existe */}
          {!hasWeeProfile && activeProfileType === 'real' && (
            <TouchableOpacity
              style={[styles.weeProfileButton, { borderColor: theme.colors.accent }]}
              onPress={() => (navigation as any).navigate('WeeProfileCreation')}
              activeOpacity={0.8}
            >
              <Ionicons name="eye-off-outline" size={18} color={theme.colors.accent} />
              <Text style={[styles.weeProfileButtonText, { color: theme.colors.accent }]}>
                {t('profile.createWeeProfile')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs de filtros simplificados */}
        <View style={[styles.tabsContainer, { borderBottomColor: theme.colors.border }]}>
          {renderTabButton('posts', t('profile.posts'))}
          {renderTabButton('media', t('profile.tabMedia'))}
          {renderTabButton('reposts', t('profile.tabReposts'))}
          {renderTabButton('likes', t('profile.tabLikes'))}
        </View>

        {/* Posts filtrados */}
        <View style={styles.postsSection}>
          {loadingPosts ? (
            <View style={styles.loadingPosts}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={[styles.loadingPostsText, { color: theme.colors.textSecondary }]}>
                {t('profile.loadingPosts')}
              </Text>
            </View>
          ) : postsError ? (
            <View style={styles.errorPosts}>
              <Ionicons name="alert-circle-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={[styles.errorPostsText, { color: theme.colors.text }]}>
                {t(postsError)}
              </Text>
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
                onPress={() => {
                  // Recargar posts
                  const loadUserPosts = async () => {
                    if (!user) return;
                    
                    try {
                      setLoadingPosts(true);
                      setPostsError(null);
                      const posts = await postsService.getByUserId(user.uid);
                      setUserPosts(posts);
                    } catch (error) {
                      console.error('Error loading user posts:', error);
                      setPostsError('profile.postsFailed');
                    } finally {
                      setLoadingPosts(false);
                    }
                  };
                  loadUserPosts();
                }}
              >
                <Text style={styles.retryButtonText}>{t('profile.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : getFilteredPosts().length > 0 ? (
            <FlatList
              data={getFilteredPosts()}
              renderItem={renderPost}
              keyExtractor={item => item.id || `post-${item.userId}-${Date.now()}`}
              contentContainerStyle={styles.postsContainer}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name={
                  activeTab === 'posts' ? 'document-text-outline' :
                  activeTab === 'media' ? 'image-outline' :
                  activeTab === 'reposts' ? 'repeat-outline' :
                  'heart-outline'
                }
                size={48}
                color={theme.colors.textSecondary}
              />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {t(
                  activeTab === 'posts' ? 'profile.emptyPosts' :
                  activeTab === 'media' ? 'profile.emptyMedia' :
                  activeTab === 'reposts' ? 'profile.emptyReposts' :
                  'profile.emptyLikes'
                )}
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                {t(
                  activeTab === 'posts' ? 'profile.emptyPostsHint' :
                  activeTab === 'media' ? 'profile.emptyMediaHint' :
                  activeTab === 'reposts' ? 'profile.emptyRepostsHint' :
                  'profile.emptyLikesHint'
                )}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de edición */}
      {renderEditModal()}

      {/* Visor de foto de perfil */}
      {userProfile?.photoURL && (
        <ImageViewer
          visible={showAvatarViewer}
          imageUrls={[userProfile.photoURL]}
          onClose={() => setShowAvatarViewer(false)}
        />
      )}

      {/* Visor de banner */}
      {userProfile?.bannerURL && (
        <ImageViewer
          visible={showBannerViewer}
          imageUrls={[userProfile.bannerURL]}
          onClose={() => setShowBannerViewer(false)}
        />
      )}

      {/* Drawer menu */}
      <DrawerMenu visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Banner styles
  bannerContainer: {
    width: '100%',
    height: BANNER_HEIGHT,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerPlaceholderText: {
    fontSize: 14,
    marginTop: 8,
  },
  bannerLoading: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  floatingHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingHeaderRight: {
    flexDirection: 'row',
    gap: 8,
  },

  // Avatar overlap
  avatarOverlapContainer: {
    alignItems: 'center',
    marginTop: -50,
    zIndex: 10,
  },
  avatarWrapper: {
    borderWidth: 4,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarLoadingContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Profile info
  profileInfo: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: 'center',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  handleContainer: {
    marginBottom: 12,
  },
  handleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  handleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
  },

  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    paddingHorizontal: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingsIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  weeProfileButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    marginTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#F5B731',
  },
  tabLabel: {
    fontSize: 14,
  },
  postsSection: {
    marginTop: 0,
  },
  postsContainer: {
    paddingTop: 12,
    paddingBottom: 85,
  },
  postContainer: {
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingPosts: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingPostsText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorPosts: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 32,
  },
  errorPostsText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  modalHeaderButton: {
    width: 60,
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 16,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
});

export default ProfileScreen;
