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
import CreatorSidebar from './CreatorSidebar';
import EspacioDeEscritura from '../EspacioDeEscritura';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import { useScrollDeBarra } from '../../hooks/useScrollDeBarra';

interface CreatorShellProps {
  /** Qué elemento de la barra lateral se marca como activo ('creator', 'brain', 'photo'…). */
  activeId?: string;
  /** Texto pequeño sobre el título en móvil ("🤖 WEË AI"). */
  overline?: string;
  title: string;
  /**
   * Identidad de la sección al lado del título: un distintivo dibujado en vez de
   * un emoji suelto. En escritorio es además lo único que dice dónde estás,
   * porque las secciones cuyo muro manda ya no traen cabecera dentro (fase 2E-69).
   */
  mark?: React.ReactNode;
  /** Miga de pan del escritorio ("WEË AI"). */
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
const CreatorShell: React.FC<CreatorShellProps> = ({ activeId, overline, title, mark, breadcrumb = 'WEË AI', onBack, children, contentStyle }) => {
  const { theme } = useTheme();
  /*
   * Este contenedor es el que se desplaza en TODAS las experiencias de Weë
   * —Travel, Studio, Design, Music, Chef…—, así que engancharlo aquí las cubre
   * todas de una vez en lugar de pantalla por pantalla.
   */
  const scrollDeBarra = useScrollDeBarra();
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
          {mark}
          <View style={styles.headerTitles}>
            {!!overline && <Text style={[styles.overline, { color: theme.colors.accentDark }]}>{overline}</Text>}
            <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>{title}</Text>
          </View>
          {/*
            Aquí vivía la píldora de Credits. Los Credits tienen un único sitio en
            Weë —el menú, bajo los dos perfiles— y repetirlos en la cabecera de
            cada experiencia solo restaba aire al muro (fase 2E-69).
          */}
        </View>
        {/*
          Todo lo que se escribe en Weë Creator pasa por aquí: la caja de idea de
          cada especialista, las preguntas guiadas, el editor de Writer, el chat
          de Brain. El acomodo al teclado se resuelve una sola vez, en el sitio
          que comparten todas, y no experiencia por experiencia.
        */}
        <EspacioDeEscritura style={styles.fill}>
          <ScrollView contentContainerStyle={[styles.mobileContent, contentStyle]} keyboardShouldPersistTaps="handled" {...scrollDeBarra}>
            {children}
          </ScrollView>
        </EspacioDeEscritura>
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
          {/*
            En escritorio la miga de pan es el camino de vuelta, no el sitio donde
            estás. Quien trae distintivo lo dice aquí, porque su contenido empieza
            ya en el muro y dentro no queda nada que lo nombre.
          */}
          {!!mark && (
            <View style={styles.identity}>
              <View style={[styles.identityBar, { backgroundColor: theme.colors.border }]} />
              {mark}
              <Text style={[styles.identityText, { color: theme.colors.text }]} numberOfLines={1}>{title}</Text>
            </View>
          )}
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
  fill: {
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
  /*
   * 44 de verdad, sin `scale()`: el factor de web lo dejaba en 39,6 y volver
   * atrás es de lo poco que hay en esta cabecera. Un objetivo táctil no encoge
   * porque la pantalla sea otra.
   */
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
    marginLeft: SPACING.xs,
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
  /*
   * `flex: 1` para que ocupe el hueco entre la miga de pan y las acciones: con
   * `space-between` y solo tres hijos, sin esto la identidad quedaría centrada
   * en la barra en vez de pegada a la vuelta, que es donde se lee como un sitio.
   */
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginLeft: SPACING.lg,
    minWidth: 0,
  },
  identityBar: {
    width: 1,
    height: scale(22),
    marginRight: SPACING.xs,
  },
  identityText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.2,
    flexShrink: 1,
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
