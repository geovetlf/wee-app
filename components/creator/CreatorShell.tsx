import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { useResponsive } from '../../hooks/useResponsive';
import AvatarDisplay from '../avatars/AvatarDisplay';
import CreditsPill from '../CreditsPill';
import CreatorSidebar from './CreatorSidebar';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

interface CreatorShellProps {
  /** Qué elemento de la barra lateral se marca como activo ('creator', 'brain', 'photo'…). */
  activeId?: string;
  /** Texto pequeño sobre el título en móvil ("🤖 Weë Creator"). */
  overline?: string;
  title: string;
  /** Miga de pan del escritorio ("Weë Creator"). */
  breadcrumb?: string;
  onBack?: () => void;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Marco de las pantallas de Weë Creator.
 * Escritorio: barra lateral con los especialistas + barra superior (buscar,
 * notificaciones, perfil) + contenido ancho. Móvil: cabecera compacta + contenido.
 */
const CreatorShell: React.FC<CreatorShellProps> = ({ activeId, overline, title, breadcrumb = 'Weë Creator', onBack, children, contentStyle }) => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { isDesktop } = useResponsive();

  const back = onBack || (() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')));
  const goSearch = () => navigation.navigate('Search');
  const goNotifications = () => navigation.navigate('Main', { screen: 'Home', params: { screen: 'Notifications' } });
  const goProfile = () => navigation.navigate(user ? 'Main' : 'Login', user ? { screen: 'Profile' } : undefined);

  if (!isDesktop) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={[styles.mobileHeader, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={back} style={styles.backButton} activeOpacity={0.7} accessibilityLabel="Volver">
            <Ionicons name="arrow-back" size={scale(23)} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            {!!overline && <Text style={[styles.overline, { color: theme.colors.accentDark }]}>{overline}</Text>}
            <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>{title}</Text>
          </View>
          <CreditsPill compact />
        </View>
        <ScrollView contentContainerStyle={[styles.mobileContent, contentStyle]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.desktop, { backgroundColor: theme.colors.surface }]}>
      <CreatorSidebar activeId={activeId} />
      <View style={styles.main}>
        <View style={[styles.topBar, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={back} style={styles.breadcrumb} activeOpacity={0.7} accessibilityLabel="Volver">
            <Ionicons name="arrow-back" size={scale(20)} color={theme.colors.text} />
            <Text style={[styles.breadcrumbText, { color: theme.colors.text }]}>{breadcrumb}</Text>
          </TouchableOpacity>
          <View style={styles.topActions}>
            <TouchableOpacity onPress={goSearch} activeOpacity={0.7} style={[styles.search, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} accessibilityLabel="Buscar en Weë">
              <Ionicons name="search-outline" size={scale(16)} color={theme.colors.textSecondary} />
              <Text style={[styles.searchText, { color: theme.colors.textSecondary }]}>Buscar en Weë…</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goNotifications} activeOpacity={0.7} style={[styles.iconButton, { borderColor: theme.colors.border }]} accessibilityLabel="Notificaciones">
              <Ionicons name="notifications-outline" size={scale(20)} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goProfile} activeOpacity={0.7} accessibilityLabel="Mi perfil">
              {userProfile ? (
                <AvatarDisplay
                  size={scale(36)}
                  avatarType={userProfile.avatarType || 'predefined'}
                  avatarId={userProfile.avatarId || 'male'}
                  photoURL={userProfile.photoURL}
                  photoURLThumbnail={userProfile.photoURLThumbnail}
                  backgroundColor={theme.colors.accent}
                  showBorder={false}
                />
              ) : (
                <View style={[styles.iconButton, { borderColor: theme.colors.border }]}>
                  <Ionicons name="person-outline" size={scale(20)} color={theme.colors.text} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView contentContainerStyle={[styles.desktopContent, contentStyle]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mobileHeader: {
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
  overline: {
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  mobileContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl * 2,
    gap: SPACING.xl,
  },
  desktop: {
    flex: 1,
    flexDirection: 'row',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    height: scale(64),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: scale(40),
  },
  breadcrumbText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    width: scale(240),
    height: scale(40),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  searchText: {
    fontSize: FONT_SIZE.sm,
  },
  iconButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopContent: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl * 2,
    gap: SPACING.xl,
    width: '100%',
    maxWidth: scale(1180),
    alignSelf: 'center',
  },
});

export default CreatorShell;
