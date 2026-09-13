import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import AvatarDisplay from './avatars/AvatarDisplay';
import CreateSheet, { CreateKind } from './CreateSheet';
import { WEE_EXPERIENCES } from '../constants/weeExperiences';
import { MENU_ITEM, MenuItemId } from '../constants/weeMenu';
import { useIdentidadActiva } from '../hooks/useEContact';
import { useWallet } from '../hooks/useWallet';
import { confirmAction } from '../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';

const isWeb = Platform.OS === 'web';

interface SidebarItemProps {
  emoji: string;
  label: string;
  active?: boolean;
  nested?: boolean;
  onPress: () => void;
  right?: React.ReactNode;
}

/**
 * Una opción del menú, con su nombre y su icono tomados de la fuente única.
 *
 * Se escribe `<Opcion id="credits" …/>` en lugar de repetir aquí el emoji y la
 * etiqueta: es lo que impide que la barra de escritorio y el cajón del ☰ vuelvan
 * a llamar distinto a lo mismo. `label` solo se pasa cuando el texto cambia por
 * el estado de la persona ("Crear mi perfil Weë").
 */
const Opcion: React.FC<{
  id: MenuItemId;
  onPress: () => void;
  active?: boolean;
  nested?: boolean;
  right?: React.ReactNode;
  label?: string;
}> = ({ id, label, ...resto }) => <SidebarItem emoji={MENU_ITEM[id].emoji} label={label ?? MENU_ITEM[id].label} {...resto} />;

const SidebarItem: React.FC<SidebarItemProps> = ({ emoji, label, active, nested, onPress, right }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      /*
       * Sin fondo amarillo en la opción activa, igual que en el cajón: dónde
       * estás lo dice el color del texto. Los dos menús son el mismo menú y no
       * pueden discrepar en esto.
       */
      style={[
        styles.item,
        nested && styles.itemNested,
        isWeb && ({ cursor: 'pointer' } as any),
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.itemEmoji, nested && styles.itemEmojiNested]}>{emoji}</Text>
      <Text style={[styles.itemLabel, nested && styles.itemLabelNested, { color: active ? theme.colors.accentDark : theme.colors.text }]} numberOfLines={1}>
        {label}
      </Text>
      {right}
    </TouchableOpacity>
  );
};

/**
 * Barra lateral de escritorio: el mismo menú único de docs/UX.md que el ☰ en móvil.
 * Inicio · Buscar · Comunidades · Weëls · WeeTalk · Weë Creator (10 especialistas + Mis proyectos)
 * · Credits · Guardados · Configuración · Ayuda.
 *
 * Notificaciones no está: vive en la barra inferior, que se ve siempre.
 */
const Sidebar: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { userProfile, activeProfileType, hasWeeProfile } = useUserProfile();
  /* Cómo se llama tu agenda ahora mismo: ËContact o ẄContact, según el perfil activo. */
  const { nombreLista } = useIdentidadActiva();
  // El mismo saldo que lee el cajón: una sola fuente, dos sitios donde se ve.
  const { balance } = useWallet(userProfile?.uid || user?.uid);
  const [creatorOpen, setCreatorOpen] = useState(false);
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

  const handleCreate = () => {
    if (!user) return requireLogin();
    setSheetVisible(true);
  };

  const handleSelectKind = (kind: CreateKind) => {
    setSheetVisible(false);
    navigation.navigate('Create', { kind });
  };

  const handleLogout = async () => {
    const ok = await confirmAction('Cerrar sesión', '¿Quieres salir de Weë?', 'Cerrar sesión', true);
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
        <TouchableOpacity style={styles.logoContainer} onPress={() => goHome('Landing')} activeOpacity={0.7} accessibilityLabel="Ir al inicio">
          <Image source={require('../assets/images/weelogo.png')} style={styles.logo} contentFit="contain" />
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
          accessibilityLabel={user ? 'Ir a mi perfil' : 'Iniciar sesión'}
        >
          {user && userProfile ? (
            <AvatarDisplay
              size={44}
              avatarType={userProfile.avatarType || 'predefined'}
              avatarId={userProfile.avatarId || 'male'}
              photoURL={typeof userProfile.photoURL === 'string' ? userProfile.photoURL : undefined}
              photoURLThumbnail={typeof userProfile.photoURLThumbnail === 'string' ? userProfile.photoURLThumbnail : undefined}
              backgroundColor="#F5B731"
            />
          ) : (
            <View style={[styles.avatarVacio, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="person-circle-outline" size={32} color={theme.colors.textSecondary} />
            </View>
          )}
          <View style={styles.cuentaTextos}>
            <Text style={[styles.cuentaNombre, { color: theme.colors.text }]} numberOfLines={1}>
              {userProfile?.displayName || user?.displayName || 'Invitado'}
            </Text>
            <Text style={[styles.cuentaEstado, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {!user ? 'Toca para iniciar sesión' : activeProfileType === 'hidi' ? 'Perfil Weë activo' : activeProfileType === 'biz' ? 'Perfil Biz activo' : 'Perfil Real activo'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Menú: mismo orden y mismos grupos que el cajón */}
        <View style={styles.nav}>
          {/*
            Inicio y Buscar solo existen aquí, y no es una discrepancia: en el
            móvil los da la barra inferior. Son la única diferencia real entre
            las dos plataformas, y viene de que el escritorio no tiene esa barra.
          */}
          <SidebarItem emoji="🏠" label="Inicio" active={isActive('Home')} onPress={() => goHome('Landing')} />
          <SidebarItem emoji="🔍" label="Buscar" active={isActive('Search')} onPress={() => navigation.navigate('Search')} />

          <Text style={[styles.grupo, { color: theme.colors.textSecondary }]}>PERFIL</Text>
          <Opcion id="realProfile" active={!!user && activeProfileType === 'real'} onPress={() => (user ? goTab('Profile') : requireLogin())} />
          <Opcion id="weeProfile" active={activeProfileType === 'hidi'} onPress={() => (user ? (hasWeeProfile ? goTab('Profile') : navigation.navigate('WeeProfileCreation')) : requireLogin())} label={hasWeeProfile || !user ? undefined : 'Crear mi perfil Weë'} />
          <Opcion
            id="credits"
            active={isActive('CreditStore')}
            onPress={() => (user ? navigation.navigate('CreditStore') : requireLogin())}
            right={user ? (
              <View style={[styles.saldo, { backgroundColor: theme.colors.accent }]}>
                <Text style={styles.saldoTexto}>{balance === null ? '…' : `${balance.toLocaleString('es')} Credits`}</Text>
              </View>
            ) : undefined}
          />

          {/*
            Tu agenda, entre líneas y sola. Ni información de tu cuenta —eso son
            los Credits, justo encima— ni un destino donde explorar: es tu gente.

            Se llama como la identidad activa: ËContact con el Perfil Real,
            ẄContact con el Perfil Weë. El nombre sale de `useIdentidadActiva`,
            la misma fuente que usa la pantalla.
          */}
          <View style={[styles.divisor, { backgroundColor: theme.colors.border }]} />
          <Opcion id="econtact" label={nombreLista} active={isActive('EContact')} onPress={() => (user ? navigation.navigate('EContact') : requireLogin())} />

          <View style={[styles.divisor, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.grupo, { color: theme.colors.textSecondary }]}>EXPLORA</Text>
          <Opcion id="communities" onPress={() => goHome('ExploreCommunities')} />
          <Opcion id="weels" onPress={() => goHome('Landing', { openWeels: true })} />
          <Opcion id="weetalk" active={isActive('Inbox')} onPress={() => (user ? goTab('Inbox') : requireLogin())} />
          <SidebarItem
            emoji={MENU_ITEM.creator.emoji}
            label={MENU_ITEM.creator.label}
            active={isActive('WeeCreator') || isActive('Specialist') || isActive('CreatorFlow') || isActive('Projects') || isActive('Project')}
            onPress={() => {
              setCreatorOpen(true);
              navigation.navigate('WeeCreator');
            }}
            right={
              <TouchableOpacity onPress={() => setCreatorOpen((v) => !v)} hitSlop={8} accessibilityLabel={creatorOpen ? 'Ocultar especialistas' : 'Ver especialistas'}>
                <Ionicons name={creatorOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            }
          />
          {creatorOpen && (
            <View style={styles.nested}>
              {WEE_EXPERIENCES.map((exp) => (
                <SidebarItem key={exp.id} emoji={exp.emoji} label={exp.name} nested onPress={() => navigation.navigate('Specialist', { id: exp.id })} />
              ))}
              <Opcion id="projects" nested active={isActive('Projects')} onPress={() => (user ? navigation.navigate('Projects') : requireLogin())} />
            </View>
          )}
          {/* "Perfil" a secas se fue: arriba ya están Perfil Real y Perfil Weë. */}
          {/* Notificaciones tampoco está: es el quinto destino de la barra inferior. */}
          <Opcion id="saved" active={isActive('SavedPosts')} onPress={() => (user ? navigation.navigate('SavedPosts') : requireLogin())} />
          <Opcion id="settings" active={isActive('Settings')} onPress={() => navigation.navigate('Settings')} />
          <Opcion id="help" active={isActive('Help')} onPress={() => navigation.navigate('Help')} />
        </View>

        {/* Crear: la misma hoja que el botón + */}
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.colors.accent }, isWeb && ({ cursor: 'pointer' } as any)]}
          onPress={handleCreate}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Crear"
        >
          <Ionicons name="add" size={22} color="#1F2937" />
          <Text style={styles.createButtonText}>Crear</Text>
        </TouchableOpacity>

        {/* Pie: lo mismo que cierra el cajón del ☰ */}
        <View style={[styles.pie, { borderTopColor: theme.colors.border }]}>
          {user ? (
            <TouchableOpacity onPress={handleLogout} activeOpacity={0.7} accessibilityLabel="Cerrar sesión">
              <Text style={[styles.pieEnlace, { color: theme.colors.textSecondary }]}>Cerrar sesión</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.loginButton, { borderColor: theme.colors.accent }]} onPress={requireLogin} activeOpacity={0.8} accessibilityLabel="Iniciar sesión">
              <Text style={[styles.loginText, { color: theme.colors.accentDark }]}>Iniciar sesión</Text>
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
  /** El rótulo de cada grupo: PERFIL, EXPLORA. Igual que en el cajón. */
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
