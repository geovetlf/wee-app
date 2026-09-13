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
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import AvatarDisplay from './avatars/AvatarDisplay';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { weeBizService, Business } from '../services/weeBizService';
import { useWallet } from '../hooks/useWallet';
import { WEE_EXPERIENCES } from '../constants/weeExperiences';
import { MENU_ITEM, MenuItemId } from '../constants/weeMenu';
import { useIdentidadActiva } from '../hooks/useEContact';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * El único menú ☰ de Weë.
 *
 *   PERFIL        Perfil Real · Perfil Weë · 💳 Credits
 *   EXPLORA       Comunidades · Weëls
 *   WeeTalk
 *   Weë Creator   🎨 Weë Design · 🎬 Weë Studio · … · 🧠 Weë Brain · 📁 Mis proyectos
 *   🔖 Guardados · ⚙️ Configuración · ❓ Ayuda
 *
 * Notificaciones no está: vive en la barra inferior, que se ve siempre.
 *
 * Credits va con los perfiles porque es información de tu cuenta, no un destino.
 *
 * Lo social no lleva nombre propio: el Home ya es la experiencia social.
 */
const DrawerMenu: React.FC<DrawerMenuProps> = ({ visible, onClose }) => {
  const { theme, setThemeMode } = useTheme();
  const { user, logout } = useAuth();
  const { userProfile, activeProfileType, hasWeeProfile, hasBizProfile, switchIdentity, switchToBiz, setBizProfile } = useUserProfile();
  /* Cómo se llama tu agenda ahora mismo: ËContact o ẄContact, según el perfil activo. */
  const { nombreLista } = useIdentidadActiva();
  const navigation = useNavigation<any>();
  /*
   * ¿Estamos ya en el Home? La misma lectura que hace la barra de escritorio:
   * la pestaña puesta dentro de `Main`, o la ruta suelta si estamos fuera de
   * las pestañas. Sirve para dos cosas: encender la opción y no volver a
   * navegar a donde ya estás.
   */
  const rutaActual = useNavigationState((estado) => {
    if (!estado) return undefined;
    const ruta = estado.routes[estado.index];
    if (ruta.state) {
      const pestanas = ruta.state as any;
      return pestanas.routes[pestanas.index]?.name;
    }
    return ruta.name;
  });
  /*
   * Dos nombres para el mismo sitio: `Home` es la pestaña y `Landing` la
   * pantalla que hay dentro. Cuál de los dos llega depende de desde dónde se
   * abra el cajón —desde el propio Home el navegador más cercano es su pila y
   * responde `Landing`—, así que valen los dos.
   */
  const enHome = rutaActual === 'Home' || rutaActual === 'Landing';
  const insets = useSafeAreaInsets();

  const [myBusiness, setMyBusiness] = useState<Business | null>(null);
  const [creatorExpanded, setCreatorExpanded] = useState(true);

  const activeUid = userProfile?.uid || user?.uid;
  const { balance } = useWallet(activeUid);

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Check if user has a business (always use real uid, not the Weë/Biz profile uid)
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
    if (!hasWeeProfile) return after(() => navigateRoot('WeeProfileCreation'));
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

  /*
   * ─── Home ────────────────────────────────────────────────────────────────
   *
   * `Landing` es la pantalla de siempre, la misma que abre la barra inferior y
   * la misma que ya usaba "Weëls" desde este cajón: no hay ningún Home nuevo.
   *
   * Si ya estás en ella no se navega. Volver a `navigate` a la pantalla en la
   * que estás la remonta —pierdes la posición del muro— y no aporta nada; basta
   * con cerrar el cajón, que es lo que la persona espera al tocar donde ya está.
   */
  const goHome = () => (enHome ? closeDrawer() : after(() => navigateTab('Home', { screen: 'Landing' })));

  // ── Explora ──
  const goCommunities = () => after(() => navigation.navigate('ExploreCommunities'));
  // Weëls vive en el Home (pestaña "Weëls" del Landing): abrimos el Home y saltamos a esa pestaña.
  const goWeels = () => after(() => navigateTab('Home', { screen: 'Landing', params: { openWeels: true } }));
  const goWeeTalk = () => after(() => navigateTab('Inbox'));

  // ── Weë Creator ──
  const goCreator = (category?: string) => after(() => (category ? navigateRoot('Specialist', { id: category }) : navigateRoot('WeeCreator')));

  // ── Resto ──
  const goCredits = () => (user ? after(() => navigateRoot('CreditStore')) : requireLogin());
  const goEContact = () => (user ? after(() => navigateRoot('EContact')) : requireLogin());
  const goSaved = () => (user ? after(() => navigateRoot('SavedPosts')) : requireLogin());
  const goSettings = () => after(() => navigateRoot('Settings'));
  const goHelp = () => after(() => navigateRoot('Help'));

  if (!visible) return null;

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
      /*
       * Dónde estás se dice con el peso del texto y nada más. Antes la fila
       * activa se pintaba con un fondo del amarillo de Weë al 13%, y en una
       * lista de opciones eso no se leía como "estás aquí": se leía como un
       * resaltado suelto. El amarillo sigue donde sí informa —la etiqueta del
       * Perfil Weë, el saldo de Credits—, no de fondo de una fila.
       */
      style={opts.small ? styles.subRow : styles.row}
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

  /**
   * Una fila del menu, con su nombre y su icono tomados de la fuente unica.
   *
   * Se escribe `fila('credits', ...)` en vez de repetir el emoji y la etiqueta:
   * asi el cajon y la barra de escritorio no pueden decir cosas distintas de la
   * misma opcion.
   */
  const fila = (
    id: MenuItemId,
    onPress: () => void,
    opts: { right?: React.ReactNode; active?: boolean; small?: boolean; danger?: boolean; label?: string } = {}
  ) => renderRow(MENU_ITEM[id].emoji, opts.label ?? MENU_ITEM[id].label, onPress, opts);

  const renderSectionLabel = (label: string) => (
    <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
  );

  /*
   * La línea que separa un grupo del anterior. Los grupos con nombre se separan
   * con su rótulo; ËContact no tiene nombre de grupo y necesita la línea, o
   * quedaría pegado a los Credits como si fuera parte de tu cuenta.
   */
  const renderDivisor = () => <View style={[styles.divisor, { backgroundColor: theme.colors.border }]} />;

  /*
   * El cajón, por encima de todo.
   *
   * Estaba en 50 y el encabezado de la web en 100, así que el encabezado lo
   * pintaba encima y se comía los primeros cien píxeles del menú. Ahí vivían la
   * cabecera de cuenta —tu nombre y qué perfil tienes activo— y, desde esta
   * fase, "Home": la primera opción no llegaba a verse. Un menú que se abre por
   * encima del contenido tiene que estar por encima también del encabezado.
   */
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 150 }]} pointerEvents="box-none">
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
                {!user ? 'Toca para iniciar sesión' : isWee ? 'Perfil Weë activo' : activeProfileType === 'biz' ? 'Perfil Biz activo' : 'Perfil Real activo'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {/*
            HOME, LA PRIMERA OPCIÓN.

            Va antes de "PERFIL" y sin rótulo de grupo: no pertenece a ninguno,
            es el sitio al que se vuelve. Se pinta aquí directamente, igual que
            la barra de escritorio hace con su "Inicio", porque es un destino de
            navegación y no una de las opciones del catálogo compartido.

            Estando ya en el Home, tocarla solo cierra el cajón: navegar a donde
            ya estás recarga la pantalla y pierde el sitio del muro.
          */}
          {renderRow('🏠', 'Home', goHome, { active: enHome })}

          {/* PERFIL */}
          {renderSectionLabel('PERFIL')}
          {fila('realProfile', goRealProfile, { active: !!user && activeProfileType === 'real' })}
          {renderRow(MENU_ITEM.weeProfile.emoji, hasWeeProfile || !user ? MENU_ITEM.weeProfile.label : 'Crear mi perfil Weë', goWeeProfile, {
            active: isWee,
            right: !hasWeeProfile && user ? (
              <View style={[styles.tag, { backgroundColor: theme.colors.accent }]}>
                <Text style={styles.tagText}>Nuevo</Text>
              </View>
            ) : undefined,
          })}
          {myBusiness && renderRow('🏪', myBusiness.name, goBizProfile, { active: activeProfileType === 'biz' })}
          {/*
            Credits, pegado a los perfiles y no a "Explora" (fase de UI).
            Es información de TU CUENTA —lo que tienes—, no un sitio al que ir,
            así que su sitio está aquí arriba y no en la lista de destinos.
            Misma fila, mismo saldo y mismo destino que antes: solo cambia el
            orden en el que se pinta.
          */}
          {fila('credits', goCredits, {
            right: user ? (
              <View style={[styles.creditsBadge, { backgroundColor: theme.colors.accent }]}>
                <Text style={styles.creditsBadgeText}>
                  {balance === null ? '…' : `${balance.toLocaleString('es')} Credits`}
                </Text>
              </View>
            ) : undefined,
          })}

          {/*
            Tu agenda, entre líneas y sola.
            No es información de tu cuenta —eso son los Credits, justo encima— ni
            un destino donde explorar. Es tu gente, y por eso va en su propio
            hueco entre las dos cosas.

            Y se llama como la identidad activa: ËContact con el Perfil Real,
            ẄContact con el Perfil Weë. El nombre sale de `useIdentidadActiva`,
            la misma fuente que usa la pantalla; escribirlo aquí a mano haría que
            el menú y la agenda dijeran cosas distintas.
          */}
          {renderDivisor()}
          {fila('econtact', goEContact, { label: nombreLista })}

          {/* EXPLORA */}
          {renderDivisor()}
          {renderSectionLabel('EXPLORA')}
          {fila('communities', goCommunities)}
          {fila('weels', goWeels)}
          {fila('weetalk', goWeeTalk)}

          {/* Weë Creator */}
          <View style={styles.creatorBlock}>
            <TouchableOpacity style={styles.row} onPress={() => setCreatorExpanded((v) => !v)} activeOpacity={0.7}>
              <Text style={styles.rowEmoji}>{MENU_ITEM.creator.emoji}</Text>
              <View style={styles.creatorTitles}>
                <Text style={[styles.rowText, styles.rowTextActive, { color: theme.colors.text }]}>{MENU_ITEM.creator.label}</Text>
                <Text style={[styles.creatorHint, { color: theme.colors.textSecondary }]}>Tú eliges el resultado. Weë elige la IA.</Text>
              </View>
              <Ionicons name={creatorExpanded ? 'chevron-up' : 'chevron-down'} size={scale(18)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            {creatorExpanded && (
              <View style={styles.creatorList}>
                {WEE_EXPERIENCES.map((exp) => renderRow(exp.emoji, exp.name, () => goCreator(exp.id), { small: true }))}
                {fila('projects', () => (user ? after(() => navigateRoot('Projects')) : requireLogin()), { small: true })}
              </View>
            )}
          </View>

          {fila('saved', goSaved)}
          {fila('settings', goSettings)}
          {fila('help', goHelp)}

          {/* Pie */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity onPress={() => after(() => navigateRoot('Help', { section: 'legal' }))} activeOpacity={0.7}>
              <Text style={[styles.footerLink, { color: theme.colors.textSecondary }]}>Términos</Text>
            </TouchableOpacity>
            <Text style={[styles.footerDot, { color: theme.colors.textSecondary }]}>·</Text>
            <TouchableOpacity onPress={() => after(() => navigateRoot('Help', { section: 'legal' }))} activeOpacity={0.7}>
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
    fontWeight: FONT_WEIGHT.semibold,
  },
  userMeta: {
    fontSize: FONT_SIZE.xs,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: SPACING.sm,
    marginTop: SPACING.md,
  },
  sectionLabel: {
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.semibold,
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
    fontWeight: FONT_WEIGHT.regular,
  },
  rowTextActive: {
    fontWeight: FONT_WEIGHT.semibold,
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
    fontWeight: FONT_WEIGHT.regular,
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
    fontWeight: FONT_WEIGHT.medium,
  },
  creditsBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.sm,
  },
  creditsBadgeText: {
    color: '#1F2937',
    fontSize: scale(12),
    fontWeight: FONT_WEIGHT.semibold,
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
