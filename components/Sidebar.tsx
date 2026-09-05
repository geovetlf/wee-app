import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import AvatarDisplay from './avatars/AvatarDisplay';
import CreditsPill from './CreditsPill';
import CreateSheet, { CreateKind } from './CreateSheet';
import { WEE_EXPERIENCES } from '../constants/weeExperiences';
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

const SidebarItem: React.FC<SidebarItemProps> = ({ emoji, label, active, nested, onPress, right }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.item,
        nested && styles.itemNested,
        active && { backgroundColor: theme.colors.accent + '1F' },
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
 * · Credits · Notificaciones · Guardados · Configuración · Ayuda.
 */
const Sidebar: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { userProfile } = useUserProfile();
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

        {/* Credits siempre visibles (solo con sesión) */}
        {user && (
          <View style={styles.credits}>
            <CreditsPill />
          </View>
        )}

        {/* Menú */}
        <View style={styles.nav}>
          <SidebarItem emoji="🏠" label="Inicio" active={isActive('Home')} onPress={() => goHome('Landing')} />
          <SidebarItem emoji="🔍" label="Buscar" active={isActive('Search')} onPress={() => navigation.navigate('Search')} />
          <SidebarItem emoji="👥" label="Comunidades" onPress={() => goHome('ExploreCommunities')} />
          <SidebarItem emoji="🎬" label="Weëls" onPress={() => goHome('Landing', { openWeels: true })} />
          <SidebarItem emoji="💬" label="WeeTalk" active={isActive('Inbox')} onPress={() => (user ? goTab('Inbox') : requireLogin())} />
          <SidebarItem
            emoji="🤖"
            label="Weë Creator"
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
              <SidebarItem emoji="📁" label="Mis proyectos" nested active={isActive('Projects')} onPress={() => (user ? navigation.navigate('Projects') : requireLogin())} />
            </View>
          )}
          <SidebarItem emoji="👤" label="Perfil" active={isActive('Profile')} onPress={() => (user ? goTab('Profile') : requireLogin())} />
          <SidebarItem emoji="🔔" label="Notificaciones" onPress={() => (user ? goHome('Notifications') : requireLogin())} />
          <SidebarItem emoji="🔖" label="Guardados" active={isActive('SavedPosts')} onPress={() => (user ? navigation.navigate('SavedPosts') : requireLogin())} />
          <SidebarItem emoji="⚙️" label="Configuración" active={isActive('Settings')} onPress={() => navigation.navigate('Settings')} />
          <SidebarItem emoji="❓" label="Ayuda" active={isActive('Help')} onPress={() => navigation.navigate('Help')} />
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

        {/* Persona */}
        {user ? (
          <View style={styles.userBlock}>
            <TouchableOpacity
              style={[styles.userInfo, { backgroundColor: theme.colors.surface }]}
              onPress={() => goTab('Profile')}
              activeOpacity={0.7}
              accessibilityLabel="Ir a mi perfil"
            >
              {userProfile ? (
                <AvatarDisplay
                  size={40}
                  avatarType={userProfile.avatarType || 'predefined'}
                  avatarId={userProfile.avatarId || 'male'}
                  photoURL={typeof userProfile.photoURL === 'string' ? userProfile.photoURL : undefined}
                  photoURLThumbnail={typeof userProfile.photoURLThumbnail === 'string' ? userProfile.photoURLThumbnail : undefined}
                  backgroundColor={theme.colors.accent}
                  showBorder={false}
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
                  <Ionicons name="person" size={20} color="#1F2937" />
                </View>
              )}
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>
                  {userProfile?.displayName || 'Mi perfil'}
                </Text>
                <Text style={[styles.userAction, { color: theme.colors.textSecondary }]}>Ver mi perfil</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logout} activeOpacity={0.7} accessibilityLabel="Cerrar sesión">
              <Text style={[styles.logoutText, { color: theme.colors.textSecondary }]}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.loginButton, { borderColor: theme.colors.accent }]} onPress={requireLogin} activeOpacity={0.8} accessibilityLabel="Iniciar sesión">
            <Text style={[styles.loginText, { color: theme.colors.accentDark }]}>Iniciar sesión</Text>
          </TouchableOpacity>
        )}
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
  credits: {
    paddingHorizontal: SPACING.md,
    alignItems: 'flex-start',
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
    fontWeight: FONT_WEIGHT.medium,
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
    fontWeight: FONT_WEIGHT.bold,
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
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default Sidebar;
