import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from './IconoDireccional';
import { useDireccion } from '../hooks/useDireccion';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma, useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import AvatarDisplay from './avatars/AvatarDisplay';
import CreateSheet, { CreateKind } from './CreateSheet';
import { MENU_ITEM, MenuItemId, WEE_MENU } from '../constants/weeMenu';
import SelectorDeIdentidad, { Identidad } from './inicio/SelectorDeIdentidad';
import TarjetaWeeAi from './inicio/TarjetaWeeAi';
import { IconoWee } from './icons/IconoWee';
import { MarcaDeCredits } from './CreditsPill';
import { NombreDeIcono } from './icons/trazosDeWee';
import { useWallet } from '../hooks/useWallet';
import { confirmAction } from '../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { RellenoDeMarca } from './GradienteDeMarca';

const isWeb = Platform.OS === 'web';

interface SidebarItemProps {
  /** El icono dibujado de Weë, de `components/icons/trazosDeWee`. */
  icono: NombreDeIcono;
  label: string;
  active?: boolean;
  onPress: () => void;
  right?: React.ReactNode;
}

/**
 * Una opción del menú, con su nombre y su icono tomados de la fuente única.
 *
 * Se escribe `<Opcion id="credits" …/>` en lugar de repetir aquí el icono y la
 * etiqueta: es lo que impide que la barra de escritorio y el cajón del ☰ vuelvan
 * a llamar distinto a lo mismo. `label` solo se pasa cuando el texto cambia por
 * el estado de la persona ("Crear mi perfil Weë").
 *
 * El icono sale del mismo campo que lee el cajón, así que los dos menús no
 * pueden volver a enseñar dibujos distintos para la misma opción.
 */
const Opcion: React.FC<{
  id: MenuItemId;
  onPress: () => void;
  active?: boolean;
  right?: React.ReactNode;
  label?: string;
}> = ({ id, label, ...resto }) => {
  const t = useT();
  return <SidebarItem icono={MENU_ITEM[id].icono} label={label ?? t(MENU_ITEM[id].clave)} {...resto} />;
};

const SidebarItem: React.FC<SidebarItemProps> = ({ icono, label, active, onPress, right }) => {
  const { theme } = useTheme();
  /* En RTL, un nombre latino (Credits, WeeTalk, Weëls…) se alineaba a la izquierda y los árabes a la derecha: todos al inicio. */
  const dir = useDireccion();
  /*
   * El icono toma el color del texto de SU fila, igual que en el cajón: es lo
   * que hace que el tema oscuro del Perfil Weë los vea claros sin tocar nada, y
   * que la opción donde estás tenga el dibujo del mismo color que su nombre.
   * El emoji no admitía color; el dibujo sí, y por eso ahora se le da.
   */
  /* La opción donde estás va en el acento de interacción (violeta, 2026-11-15), igual que el destino puesto de la barra inferior. */
  const colorDeLaFila = active ? theme.colors.interaction : theme.colors.text;
  return (
    <TouchableOpacity
      /*
       * Sin fondo amarillo en la opción activa, igual que en el cajón: dónde
       * estás lo dice el color del texto. Los dos menús son el mismo menú y no
       * pueden discrepar en esto.
       */
      style={[
        styles.item,
        isWeb && ({ cursor: 'pointer' } as any),
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {/* Los Credits llevan su marca, "ẄC", sin dibujo; el resto, su icono. El hueco es el mismo: la lista no se mueve. */}
      {icono === 'credits' ? (
        <MarcaDeCredits size={13} color={colorDeLaFila} style={[styles.itemIcono, styles.marcaDeCredits]} />
      ) : (
        <IconoWee name={icono} size={18} color={colorDeLaFila} style={styles.itemIcono} />
      )}
      <Text style={[styles.itemLabel, dir.texto, { color: colorDeLaFila }]} numberOfLines={1}>
        {label}
      </Text>
      {right}
    </TouchableOpacity>
  );
};

/**
 * Barra lateral de escritorio: el mismo menú que el ☰ en móvil (rediseño del 2026-11-15).
 *
 *   logo · quién soy · [ Real | Weë ] · tarjeta WeëAI
 *   Inicio / Wall · Weëls · Explorar · Comunidades · Proyectos · Weë Pages
 *   MyWeës
 *   Guardados · Historial · Credits · Configuración
 *   Ayuda y soporte
 *   Mensajes (solo aquí: en el móvil lo da la barra inferior) · Crear
 *
 * Las filas y su orden salen de `WEE_MENU`, el mismo catálogo que pinta el cajón.
 */
const Sidebar: React.FC = () => {
  const { formato } = useIdioma();
  const t = useT();
  const { theme, setThemeMode } = useTheme();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { userProfile, activeProfileType, hasWeeProfile, switchIdentity } = useUserProfile();
  // El mismo saldo que lee el cajón: una sola fuente, dos sitios donde se ve.
  const { balance } = useWallet();
  const [sheetVisible, setSheetVisible] = useState(false);

  // Ruta activa (pestaña de Main o pantalla del stack principal)
  const currentRouteName = useNavigationState((state) => {
    if (!state) return undefined;
    const route = state.routes[state.index];
    if (route.state) {
      const tabState = route.state as any;
      return tabState.routes[tabState.index]?.name;
    }
    return route.name;
  });
  const isActive = (name: string) => currentRouteName === name;

  const goTab = (screen: string, params?: object) => navigation.navigate('Main', { screen, params });
  const goHome = (screen: string, params?: object) => goTab('Home', { screen, params });
  const requireLogin = () => navigation.navigate('Login');

  /*
   * EL SELECTOR DE IDENTIDAD, CON LA LÓGICA DE SIEMPRE. En escritorio el cambio
   * de perfil vivía en la píldora de la cabecera del Home; ahora vive aquí, igual
   * que en el cajón: `switchIdentity()` cambia de cara y `setThemeMode()` viste
   * la app —clara con el Perfil Real, oscura con el Perfil Weë—. Aquí no se
   * guarda ni se decide ninguna identidad.
   */
  const elegirIdentidad = (destino: Identidad) => {
    if (!user) return requireLogin();
    if (destino === 'hidi' && !hasWeeProfile) return navigation.navigate('WeeProfileCreation');
    if (activeProfileType === destino) return;
    /* Las dos ramas, escritas: el tema sale del DESTINO —oscuro con el Perfil Weë, claro con el Perfil Real—. */
    if (destino === 'hidi') {
      switchIdentity();
      setThemeMode('dark');
    } else {
      switchIdentity();
      setThemeMode('light');
    }
  };

  /* Lo que es de una cuenta pide sesión, como antes. */
  const conCuenta = (pantalla: string, params?: object) => () => (user ? navigation.navigate(pantalla, params) : requireLogin());

  /* Qué hace cada fila del catálogo, y cuándo es «donde estás». El orden lo da `WEE_MENU`. */
  const FILA: Partial<Record<MenuItemId, { onPress: () => void; active?: boolean }>> = {
    home: { onPress: () => goHome('Landing'), active: isActive('Home') },
    weels: { onPress: () => goHome('Landing', { openWeels: true }) },
    explore: { onPress: () => navigation.navigate('Search'), active: isActive('Search') },
    communities: { onPress: () => goHome('ExploreCommunities') },
    projects: { onPress: conCuenta('Projects'), active: isActive('Projects') || isActive('Project') },
    pages: { onPress: conCuenta('WeePages'), active: isActive('WeePages') || isActive('WeePage') },
    mywees: { onPress: conCuenta('MyWees'), active: isActive('MyWees') },
    saved: { onPress: conCuenta('SavedPosts'), active: isActive('SavedPosts') },
    history: { onPress: conCuenta('Historial'), active: isActive('Historial') },
    credits: { onPress: conCuenta('CreditStore'), active: isActive('CreditStore') },
    settings: { onPress: () => navigation.navigate('Settings'), active: isActive('Settings') },
    help: { onPress: () => navigation.navigate('Help'), active: isActive('Help') },
  };

  const handleCreate = () => {
    setSheetVisible(true);
  };

  const handleSelectKind = (kind: CreateKind) => {
    setSheetVisible(false);
    if (!user) return requireLogin();
    navigation.navigate('Create', { kind });
  };

  const handleLogout = async () => {
    const ok = await confirmAction(t('menu.signOut'), t('menu.signOutConfirm'), t('menu.signOut'), true, t);
    if (!ok) return;
    try {
      await logout();
    } catch (error) {
      console.error('No se pudo cerrar la sesión:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, borderRightColor: theme.colors.border }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <TouchableOpacity style={styles.logoContainer} onPress={() => goHome('Landing')} activeOpacity={0.7} accessibilityLabel={t('nav.goHome')}>
          <Image source={theme.dark ? require('../assets/images/weelogo-dark.png') : require('../assets/images/weelogo.png')} style={styles.logo} contentFit="contain" />
        </TouchableOpacity>

        {/*
          Quién soy, arriba del todo: la misma cabecera de cuenta que el cajón.
          Antes esto estaba al final de la barra y con otro texto ("Ver mi
          perfil"), así que escritorio y móvil no se parecían en lo primero que
          se mira.
        */}
        <TouchableOpacity
          style={[styles.cuenta, { borderBottomColor: theme.colors.border }, isWeb && ({ cursor: 'pointer' } as any)]}
          onPress={() => (user ? goTab('Profile') : requireLogin())}
          activeOpacity={0.7}
          accessibilityLabel={t(user ? 'nav.myProfile' : 'menu.signIn')}
        >
          {user && userProfile ? (
            <AvatarDisplay
              size={44}
              avatarType={userProfile.avatarType || 'predefined'}
              avatarId={userProfile.avatarId || 'male'}
              photoURL={typeof userProfile.photoURL === 'string' ? userProfile.photoURL : undefined}
              photoURLThumbnail={typeof userProfile.photoURLThumbnail === 'string' ? userProfile.photoURLThumbnail : undefined}
              backgroundColor={theme.colors.accent}
            />
          ) : (
            <View style={[styles.avatarVacio, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="person-circle-outline" size={32} color={theme.colors.textSecondary} />
            </View>
          )}
          <View style={styles.cuentaTextos}>
            <Text style={[styles.cuentaNombre, { color: theme.colors.text }]} numberOfLines={1}>
              {userProfile?.displayName || user?.displayName || t('common.guest')}
            </Text>
            <Text style={[styles.cuentaEstado, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {!user ? t('menu.tapToSignIn') : activeProfileType === 'hidi' ? t('menu.activeWee') : t('menu.activeReal')}
            </Text>
          </View>
          <IconoDireccional name="chevron-forward" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* El selector de identidad, como en el cajón. Sin sesión no se pinta. */}
        {user && <SelectorDeIdentidad activa={activeProfileType === 'hidi' ? 'hidi' : 'real'} tieneWee={hasWeeProfile} onElegir={elegirIdentidad} />}

        {/* WeëAI: la tarjeta que abre el centro creativo, donde están las experiencias. */}
        <TarjetaWeeAi variante="menu" onOpenWeeAi={() => navigation.navigate('WeeCreator')} />

        {/* Menú: las mismas filas y el mismo orden que el cajón, del mismo catálogo. */}
        <View style={styles.nav}>
          {WEE_MENU.map((grupo) => (
            <View key={grupo.items.join('-')} style={styles.nav}>
              {grupo.divisor && <View style={[styles.divisor, { backgroundColor: theme.colors.border }]} />}
              {grupo.items.map((id) => (
                <Opcion
                  key={id}
                  id={id}
                  active={FILA[id]?.active}
                  onPress={FILA[id]?.onPress ?? (() => {})}
                  right={
                    id === 'credits' && user ? (
                      <View style={[styles.saldo, { backgroundColor: theme.colors.accent }]}>
                        <RellenoDeMarca radio={BORDER_RADIUS.full} />
                        <Text style={styles.saldoTexto}>{balance === null ? '…' : `${formato.numero(balance)} Credits`}</Text>
                      </View>
                    ) : id === 'mywees' ? (
                      /* «Personalizar» abre MyWeës lista para organizar. Sus accesos no se despliegan aquí. */
                      <TouchableOpacity onPress={conCuenta('MyWees', { personalizar: true })} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('menu.customize')}>
                        <Ionicons name="options-outline" size={16} color={theme.colors.interaction} />
                      </TouchableOpacity>
                    ) : undefined
                  }
                />
              ))}
            </View>
          ))}

          {/*
            MENSAJES SOLO EXISTE AQUÍ, y no es una discrepancia: en el móvil lo da
            la barra inferior, y el escritorio no tiene esa barra. Es WeeTalk, la
            bandeja de siempre. Mi Weë es la cabecera de cuenta de arriba; WeëAI,
            su tarjeta; Crear, el botón de abajo.
          */}
          <View style={[styles.divisor, { backgroundColor: theme.colors.border }]} />
          <SidebarItem icono={MENU_ITEM.weetalk.icono} label={t('nav.messages')} active={isActive('Inbox')} onPress={() => (user ? goTab('Inbox') : requireLogin())} />
        </View>

        {/* Crear: la misma hoja que el botón + */}
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.colors.accent }, isWeb && ({ cursor: 'pointer' } as any)]}
          onPress={handleCreate}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('nav.create')}
        >
          <RellenoDeMarca radio={BORDER_RADIUS.full} />
          <Ionicons name="add" size={22} color="#1F2937" />
          <Text style={styles.createButtonText}>{t('nav.create')}</Text>
        </TouchableOpacity>

        {/* Pie: lo mismo que cierra el cajón del ☰ */}
        <View style={[styles.pie, { borderTopColor: theme.colors.border }]}>
          {user ? (
            <TouchableOpacity onPress={handleLogout} activeOpacity={0.7} accessibilityLabel={t('menu.signOut')}>
              <Text style={[styles.pieEnlace, { color: theme.colors.textSecondary }]}>{t('menu.signOut')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.loginButton, { borderColor: theme.colors.accent }]} onPress={requireLogin} activeOpacity={0.8} accessibilityLabel={t('menu.signIn')}>
              <Text style={[styles.loginText, { color: theme.colors.accentDark }]}>{t('menu.signIn')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <CreateSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSelect={handleSelectKind}
        onOpenCreator={() => {
          setSheetVisible(false);
          navigation.navigate('WeeCreator');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRightWidth: 0.5,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  logoContainer: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  logo: {
    height: 36,
    width: 101,
  },
  /*
   * Cabecera de cuenta: el mismo bloque que abre el cajón del ☰ —avatar, nombre,
   * qué perfil está activo y el chevron—, con la misma línea de separación
   * debajo. En escritorio hay sitio de sobra, así que respira un poco más.
   */
  cuenta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 0.5,
    marginBottom: SPACING.xs,
  },
  avatarVacio: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuentaTextos: {
    flex: 1,
    gap: 2,
  },
  cuentaNombre: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  cuentaEstado: {
    fontSize: FONT_SIZE.xs,
  },
  pie: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderTopWidth: 0.5,
  },
  pieEnlace: {
    fontSize: FONT_SIZE.xs,
  },
  /** La línea que separa un grupo sin nombre del anterior. */
  divisor: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  grupo: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 0.6,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  /** El saldo, como en el cajón: una pastilla dorada al final de la fila. */
  saldo: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  saldoTexto: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.semibold,
    color: '#1F2937',
  },
  nav: {
    gap: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.md,
  },
  itemNested: {
    paddingVertical: SPACING.xs + 2,
    paddingLeft: SPACING.lg + SPACING.md,
  },
  itemIcono: {
    width: 24,
  },
  itemIconoNested: {
    width: 20,
  },
  /* La marca ocupa el hueco del icono y se centra en él: las filas no se mueven. */
  marcaDeCredits: { textAlign: 'center' },
  /*
   * «ẄAI» son tres letras en un hueco hecho para dos: a 24 puntos se cortaba en «Ẅ…» en la barra de escritorio.
   * Como en el cajón (DrawerMenu, `marcaAncha`), el hueco crece 8 y se los devuelve al hueco de después: la marca
   * cabe entera y el nombre de la fila sigue empezando donde empiezan los demás.
   */
  marcaAncha: { width: 32, marginRight: -8 },
  /* Lo que todavía va con emoji: Buscar, y nada más. */
  itemEmoji: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  itemEmojiNested: {
    fontSize: 14,
    width: 20,
  },
  itemLabel: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
  },
  itemLabelNested: {
    fontSize: FONT_SIZE.sm,
  },
  nested: {
    marginBottom: SPACING.xs,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  createButtonText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
  },
  userBlock: {
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
  userAction: {
    fontSize: FONT_SIZE.xs,
  },
  logout: {
    alignSelf: 'center',
    paddingVertical: SPACING.xs,
  },
  logoutText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  loginButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  loginText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default Sidebar;
