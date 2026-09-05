import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Alert,
  Linking,
  Platform,
  ScrollView,
} from 'react-native';

const isWeb = Platform.OS === 'web';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import AvatarDisplay from './avatars/AvatarDisplay';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { weeBizService, Business } from '../services/weeBizService';
import { useWallet } from '../hooks/useWallet';
import { AI_APP_CATEGORIES } from '../constants/aiAppCategories';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * El único menú ☰ de WEE.
 *
 *   PERFIL        Perfil Real · Perfil WEE
 *   EXPLORA       Comunidades · Weëls
 *   WeeTalk
 *   WEE CREATOR   AI Video · AI Imagen · … · Otras herramientas
 *   💳 Credits · 🔔 Notificaciones · 🔖 Guardados · ⚙️ Configuración · ❓ Ayuda
 *
 * Lo social no lleva nombre propio: el Home ya es la experiencia social.
 */
const DrawerMenu: React.FC<DrawerMenuProps> = ({ visible, onClose }) => {
  const { theme, setThemeMode } = useTheme();
  const { user, logout } = useAuth();
  const { userProfile, activeProfileType, hasHidiProfile, hasBizProfile, switchIdentity, switchToBiz, setBizProfile } = useUserProfile();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [myBusiness, setMyBusiness] = useState<Business | null>(null);
  const [creatorExpanded, setCreatorExpanded] = useState(true);

  const activeUid = userProfile?.uid || user?.uid;
  const { balance } = useWallet(activeUid);

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Check if user has a business (always use real uid, not hidi/biz uid)
  const realUid = user?.uid;
  useEffect(() => {
    if (!realUid) return;
    const loadBiz = async () => {
      try {
        const biz = await weeBizService.getBusinessByOwner(realUid);
        setMyBusiness(biz);
        // Auto-create biz user profile if business exists but no biz profile yet
        if (biz?.id && !hasBizProfile) {
          const { usersService } = require('../services/firestoreService');
          let bizUserProfile = await usersService.getBizProfile(biz.id);
          if (!bizUserProfile) {
            await usersService.createBizProfile(realUid, biz.id, {
              displayName: biz.name,
              photoURL: biz.logo,
            });
            bizUserProfile = await usersService.getBizProfile(biz.id);
          }
          if (bizUserProfile) {
            setBizProfile(bizUserProfile);
          }
        }
      } catch (e) {
        console.error('Error loading business:', e);
      }
    };
    loadBiz();
  }, [realUid, hasBizProfile]);

  useEffect(() => {
    if (isWeb) {
      translateX.setValue(visible ? 0 : -DRAWER_WIDTH);
      overlayOpacity.setValue(visible ? 1 : 0);
      return;
    }
    Animated.parallel([
      Animated.timing(translateX, { toValue: visible ? 0 : -DRAWER_WIDTH, duration: visible ? 250 : 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: visible ? 1 : 0, duration: visible ? 250 : 200, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  const closeDrawer = () => {
    if (isWeb) {
      onClose();
      return;
    }
    Animated.parallel([
      Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  /** Cierra el menú y ejecuta la acción cuando terminó la animación. */
  const after = (fn: () => void) => {
    closeDrawer();
    setTimeout(fn, isWeb ? 0 : 220);
  };

  const navigateTab = (screen: string, params?: object) => {
    const tabNav = navigation.getParent();
    if (tabNav) tabNav.navigate(screen, params);
    else navigation.navigate(screen, params);
  };

  const navigateRoot = (screen: string, params?: object) => {
    // Rutas del stack principal (Create, Settings, CreditStore, WeeCreator, Reels…)
    navigation.navigate(screen, params);
  };

  const showComingSoon = () => {
    after(() => {
      if (isWeb) window.alert('Próximamente: esta función estará disponible pronto.');
      else Alert.alert('Próximamente', 'Esta función estará disponible pronto.');
    });
  };

  const handleLogout = () => {
    after(async () => {
      try {
        await logout();
      } catch (error) {
        console.error('Error during logout:', error);
      }
    });
  };

  const requireLogin = () => {
    after(() => navigateRoot('Login'));
  };

  // ── Perfil ──
  const goRealProfile = () => {
    if (!user) return requireLogin();
    if (activeProfileType === 'real') return after(() => navigateTab('Profile'));
    if (activeProfileType === 'biz') switchToBiz();
    else switchIdentity();
    setThemeMode('light');
    closeDrawer();
  };

  const goWeeProfile = () => {
    if (!user) return requireLogin();
    if (!hasHidiProfile) return after(() => navigateRoot('HidiCreation'));
    if (activeProfileType === 'hidi') return after(() => navigateTab('Profile'));
    if (activeProfileType === 'biz') {
      switchToBiz();
      setThemeMode('light');
      closeDrawer();
      return;
    }
    switchIdentity();
    setThemeMode('dark');
    closeDrawer();
  };

  const goBizProfile = () => {
    if (activeProfileType === 'biz') return after(() => navigateTab('Profile'));
    switchToBiz();
    setThemeMode('biz');
    closeDrawer();
  };

  // ── Explora ──
  const goCommunities = () => after(() => navigation.navigate('ExploreCommunities'));
  // Weëls vive en el Home (pestaña "Weëls" del Landing): abrimos el Home y saltamos a esa pestaña.
  const goWeels = () => after(() => navigateTab('Home', { screen: 'Landing', params: { openWeels: true } }));
  const goWeeTalk = () => after(() => navigateTab('Inbox'));

  // ── WEE Creator ──
  const goCreator = (category?: string) => after(() => navigateRoot('WeeCreator', category ? { category } : undefined));

  // ── Resto ──
  const goCredits = () => (user ? after(() => navigateRoot('CreditStore')) : requireLogin());
  const goNotifications = () => {
    if (!user) return requireLogin();
    after(() => {
      const tabNav = navigation.getParent();
      if (tabNav) tabNav.navigate('Home', { screen: 'Notifications' });
      else navigation.navigate('Notifications');
    });
  };
  const goSettings = () => after(() => navigateRoot('Settings'));
  const goHelp = () => after(() => Linking.openURL('https://wee.zone/support'));

  if (!visible) return null;

  const accentTint = theme.colors.accent + '22';
  const displayName = userProfile?.displayName || user?.displayName || 'Invitado';
  const isWee = activeProfileType === 'hidi';

  const renderRow = (
    emoji: string,
    label: string,
    onPress: () => void,
    opts: { right?: React.ReactNode; active?: boolean; small?: boolean; danger?: boolean } = {},
  ) => (
    <TouchableOpacity
      key={label}
      style={[
        opts.small ? styles.subRow : styles.row,
        opts.active && { backgroundColor: accentTint },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.rowEmoji, opts.small && styles.subRowEmoji]}>{emoji}</Text>
      <Text
        style={[
          opts.small ? styles.subRowText : styles.rowText,
          { color: opts.danger ? theme.colors.error : theme.colors.text },
          opts.active && styles.rowTextActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {opts.right}
    </TouchableOpacity>
  );

  const renderSectionLabel = (label: string) => (
    <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={closeDrawer}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            backgroundColor: theme.colors.background,
            transform: [{ translateX }],
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={[styles.drawerContent, { paddingTop: insets.top + SPACING.md, paddingBottom: insets.bottom + SPACING.xl }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Cabecera: quién soy */}
          <TouchableOpacity
            style={[styles.userHeader, { borderBottomColor: theme.colors.border }]}
            onPress={() => (user ? after(() => navigateTab('Profile')) : requireLogin())}
            activeOpacity={0.7}
          >
            {user ? (
              <AvatarDisplay
                size={scale(48)}
                avatarType={userProfile?.avatarType || 'predefined'}
                avatarId={userProfile?.avatarId || 'male'}
                photoURL={typeof userProfile?.photoURL === 'string' ? userProfile.photoURL : undefined}
                photoURLThumbnail={typeof userProfile?.photoURLThumbnail === 'string' ? userProfile.photoURLThumbnail : undefined}
                backgroundColor="#F5B731"
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="person-circle-outline" size={scale(36)} color={theme.colors.textSecondary} />
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={[styles.userMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {!user ? 'Toca para iniciar sesión' : isWee ? 'Perfil WEE activo' : activeProfileType === 'biz' ? 'Perfil Biz activo' : 'Perfil Real activo'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {/* PERFIL */}
          {renderSectionLabel('PERFIL')}
          {renderRow('👤', 'Perfil Real', goRealProfile, { active: !!user && activeProfileType === 'real' })}
          {renderRow('🎭', hasHidiProfile || !user ? 'Perfil WEE' : 'Crear mi perfil WEE', goWeeProfile, {
            active: isWee,
            right: !hasHidiProfile && user ? (
              <View style={[styles.tag, { backgroundColor: theme.colors.accent }]}>
                <Text style={styles.tagText}>Nuevo</Text>
              </View>
            ) : undefined,
          })}
          {myBusiness && renderRow('🏪', myBusiness.name, goBizProfile, { active: activeProfileType === 'biz' })}

          {/* EXPLORA */}
          {renderSectionLabel('EXPLORA')}
          {renderRow('👥', 'Comunidades', goCommunities)}
          {renderRow('📹', 'Weëls', goWeels)}

          {renderRow('💬', 'WeeTalk', goWeeTalk)}

          {/* WEE CREATOR */}
          <View style={[styles.creatorBlock, { backgroundColor: accentTint }]}>
            <TouchableOpacity style={styles.row} onPress={() => setCreatorExpanded((v) => !v)} activeOpacity={0.7}>
              <Text style={styles.rowEmoji}>🤖</Text>
              <View style={styles.creatorTitles}>
                <Text style={[styles.rowText, styles.rowTextActive, { color: theme.colors.text }]}>WEE Creator</Text>
                <Text style={[styles.creatorHint, { color: theme.colors.textSecondary }]}>Herramientas de IA para crear</Text>
              </View>
              <Ionicons name={creatorExpanded ? 'chevron-up' : 'chevron-down'} size={scale(18)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            {creatorExpanded && (
              <View style={styles.creatorList}>
                {AI_APP_CATEGORIES.map((cat) => renderRow(cat.emoji, cat.name, () => goCreator(cat.id), { small: true }))}
              </View>
            )}
          </View>

          {/* Credits y resto */}
          {renderRow('💳', 'Credits', goCredits, {
            right: user ? (
              <View style={[styles.creditsBadge, { backgroundColor: theme.colors.accent }]}>
                <Text style={styles.creditsBadgeText}>
                  {balance === null ? '…' : `${balance.toLocaleString('es')} Credits`}
                </Text>
              </View>
            ) : undefined,
          })}
          {renderRow('🔔', 'Notificaciones', goNotifications)}
          {renderRow('🔖', 'Guardados', showComingSoon)}
          {renderRow('⚙️', 'Configuración', goSettings)}
          {renderRow('❓', 'Ayuda', goHelp)}

          {/* Pie */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity onPress={() => after(() => Linking.openURL('https://wee.zone/terms'))} activeOpacity={0.7}>
              <Text style={[styles.footerLink, { color: theme.colors.textSecondary }]}>Términos</Text>
            </TouchableOpacity>
            <Text style={[styles.footerDot, { color: theme.colors.textSecondary }]}>·</Text>
            <TouchableOpacity onPress={() => after(() => Linking.openURL('https://wee.zone/privacy'))} activeOpacity={0.7}>
              <Text style={[styles.footerLink, { color: theme.colors.textSecondary }]}>Privacidad</Text>
            </TouchableOpacity>
            {user && (
              <>
                <Text style={[styles.footerDot, { color: theme.colors.textSecondary }]}>·</Text>
                <TouchableOpacity onPress={handleLogout} activeOpacity={0.7}>
                  <Text style={[styles.footerLink, { color: theme.colors.error }]}>Cerrar sesión</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 20,
  },
  drawerContent: {
    paddingHorizontal: SPACING.md,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.md,
    marginBottom: SPACING.xs,
    borderBottomWidth: 1,
  },
  avatarPlaceholder: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    gap: scale(1),
  },
  userName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  userMeta: {
    fontSize: FONT_SIZE.xs,
  },
  sectionLabel: {
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.6,
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: scale(44),
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  rowEmoji: {
    width: scale(24),
    fontSize: scale(16),
    textAlign: 'center',
  },
  rowText: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
  },
  rowTextActive: {
    fontWeight: FONT_WEIGHT.bold,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: scale(34),
    paddingHorizontal: SPACING.sm,
    paddingLeft: SPACING.lg,
  },
  subRowEmoji: {
    width: scale(22),
    fontSize: scale(13),
  },
  subRowText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  creatorBlock: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    paddingBottom: SPACING.xs,
  },
  creatorTitles: {
    flex: 1,
    gap: scale(1),
  },
  creatorHint: {
    fontSize: FONT_SIZE.xs,
  },
  creatorList: {
    paddingBottom: SPACING.xs,
  },
  tag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(2),
    borderRadius: BORDER_RADIUS.sm,
  },
  tagText: {
    color: '#1F2937',
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.bold,
  },
  creditsBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.sm,
  },
  creditsBadgeText: {
    color: '#1F2937',
    fontSize: scale(12),
    fontWeight: FONT_WEIGHT.bold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderTopWidth: 1,
  },
  footerLink: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  footerDot: {
    fontSize: FONT_SIZE.xs,
  },
});

export default DrawerMenu;
