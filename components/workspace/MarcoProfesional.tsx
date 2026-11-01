import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation, useNavigationState, useRoute } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { useResponsive } from '../../hooks/useResponsive';
import AvatarDisplay from '../avatars/AvatarDisplay';
import CreditsPill from '../CreditsPill';
import SelectorDeVersion from './SelectorDeVersion';
import { ConMarcoDeSeccion } from '../creator/MarcoDeSeccion';
import {
  HERRAMIENTAS_PROFESIONALES,
  RUTA_DE_INICIO,
  TRABAJO_DE_LA_CUENTA,
  entradaEncendida,
} from '../../constants/espacioProfesional';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';

const isWeb = Platform.OS === 'web';

interface Entrada {
  id: string;
  nombre: string;
  icono: string;
  alPulsar: () => void;
}

/** Dónde estamos dentro de Weë versión creator, por la llave de su ruta. */
const leerRuta = (estado: any, clave: string) => {
  const raiz = estado?.routes?.find((r: any) => r.key === clave);
  const pila = raiz?.state;
  const ruta = pila?.routes?.[pila.index ?? 0];
  if (ruta) return { nombre: ruta.name, params: ruta.params, pila: pila.key };
  return { nombre: raiz?.params?.screen, params: raiz?.params?.params, pila: undefined };
};

/**
 * EL MARCO DE WEË VERSIÓN CREATOR: cabecera, navegación y el sitio del trabajo.
 *
 * Solo lo que sirve para trabajar: las secciones de Weë AI, los proyectos y las
 * creaciones. Nada de lo social, que es de la versión app. La píldora de arriba
 * cambia de versión. Se monta una vez: al cambiar de sección solo cambia lo de dentro.
 *
 *   escritorio  barra lateral con los nombres.
 *   tableta     barra lateral en iconos.
 *   teléfono    las mismas entradas en una fila que se desliza.
 */
const MarcoProfesional: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { isDesktop, isTablet } = useResponsive();
  const esta = useRoute();
  const nombre = useNavigationState((e) => leerRuta(e, esta.key).nombre);
  const pila = useNavigationState((e) => leerRuta(e, esta.key).pila);
  const idDeSeccion = useNavigationState((e) => {
    const id = leerRuta(e, esta.key).params?.id;
    return typeof id === 'string' ? id : '';
  });
  const experiencia = useNavigationState((e) => {
    const id = leerRuta(e, esta.key).params?.experienceId;
    return typeof id === 'string' ? id : '';
  });
  const encendida = entradaEncendida(nombre, idDeSeccion, experiencia);

  /* Ir a una sección es cambiar de sitio, no apilar: «atrás» no recorre todas las visitadas. */
  const irA = useCallback((ruta: string, params?: object) => {
    if (pila) navigation.dispatch({ ...CommonActions.reset({ index: 0, routes: [{ name: ruta, params }] }), target: pila });
    else navigation.navigate('EspacioProfesional', { screen: ruta, params });
  }, [navigation, pila]);

  const inicio: Entrada = { id: 'home', nombre: t('nav.home'), icono: 'home-outline', alPulsar: () => irA(RUTA_DE_INICIO) };
  const ajustes: Entrada = { id: 'settings', nombre: t('menu.settings'), icono: 'settings-outline', alPulsar: () => navigation.navigate('Settings') };
  const herramientas: Entrada[] = HERRAMIENTAS_PROFESIONALES.map((h) => ({
    id: h.id, nombre: h.nombre, icono: h.icono, alPulsar: () => irA('Specialist', { id: h.id }),
  }));
  const trabajo: Entrada[] = TRABAJO_DE_LA_CUENTA.map((e) => ({
    id: e.id,
    nombre: t(e.clave),
    icono: e.icono,
    alPulsar: () => (user ? irA(e.ruta) : navigation.navigate('Login')),
  }));

  const compacta = !isDesktop;

  const fila = (e: Entrada) => {
    const activa = e.id === encendida;
    return (
      <TouchableOpacity
        key={e.id}
        onPress={e.alPulsar}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={e.nombre}
        accessibilityState={{ selected: activa }}
        style={[
          styles.fila,
          compacta && styles.filaCompacta,
          activa && { backgroundColor: theme.colors.glow },
          isWeb && ({ cursor: 'pointer' } as object),
        ]}
      >
        <Ionicons name={e.icono as any} size={compacta ? 20 : 17} color={activa ? theme.colors.accentDark : theme.colors.textSecondary} />
        {!compacta && (
          <Text style={[styles.nombre, { color: activa ? theme.colors.text : theme.colors.textSecondary }, activa && styles.nombreActivo]}>
            {e.nombre}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const titulo = (texto: string) => (
    compacta
      ? <View style={[styles.separador, { backgroundColor: theme.colors.border }]} />
      : <Text style={[styles.grupo, { color: theme.colors.textSecondary }]}>{texto}</Text>
  );

  /* En el teléfono cada entrada lleva su nombre: un icono solo no basta para tantas secciones. */
  const pastilla = (e: Entrada) => {
    const activa = e.id === encendida;
    return (
      <TouchableOpacity
        key={e.id}
        onPress={e.alPulsar}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={e.nombre}
        accessibilityState={{ selected: activa }}
        style={[
          styles.pastilla,
          { borderColor: activa ? theme.colors.accent : theme.colors.border, backgroundColor: activa ? theme.colors.glow : theme.colors.background },
        ]}
      >
        <Ionicons name={e.icono as any} size={15} color={activa ? theme.colors.accentDark : theme.colors.textSecondary} />
        <Text style={[styles.pastillaTexto, { color: theme.colors.text }]}>{e.nombre}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.raiz, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.colors.background }}>
        <View style={[styles.cabecera, { borderBottomColor: theme.colors.border }]}>
          <Image source={require('../../assets/images/weelogo.png')} style={styles.logo} contentFit="contain" accessibilityLabel="Weë" />
          <View style={[styles.raya, { backgroundColor: theme.colors.border }]} />
          <SelectorDeVersion puesta="pro" />
          <View style={styles.empuje} />
          <CreditsPill compact={!isDesktop} />
          {user ? (
            <AvatarDisplay
              size={30}
              avatarType={userProfile?.avatarType || 'predefined'}
              avatarId={userProfile?.avatarId || 'male'}
              photoURL={userProfile?.photoURL}
              photoURLThumbnail={userProfile?.photoURLThumbnail}
              backgroundColor={theme.colors.accent}
              showBorder={false}
            />
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={[styles.entrar, { backgroundColor: theme.colors.accent }]}
              accessibilityRole="button"
              accessibilityLabel={t('menu.signIn')}
            >
              <Text style={styles.entrarTexto} numberOfLines={1}>{t('menu.signIn')}</Text>
            </TouchableOpacity>
          )}
        </View>
        {!isDesktop && !isTablet && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pastillas}
            style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border, flexGrow: 0 }}
            accessibilityLabel={t('profesional.navLabel')}
          >
            {[inicio, ...herramientas, ...trabajo, ajustes].map(pastilla)}
          </ScrollView>
        )}
      </SafeAreaView>
      <View style={styles.cuerpo}>
        {(isDesktop || isTablet) && (
          <View
            style={[styles.barra, compacta && styles.barraCompacta, { borderRightColor: theme.colors.border }]}
            accessibilityRole={isWeb ? ('navigation' as never) : undefined}
            accessibilityLabel={t('profesional.navLabel')}
          >
            <ScrollView contentContainerStyle={styles.dentro} showsVerticalScrollIndicator={false}>
              <View style={styles.bloque}>{[inicio, ...trabajo].map(fila)}</View>
              {titulo('Weë AI')}
              <View style={styles.bloque}>{herramientas.map(fila)}</View>
            </ScrollView>
            <View style={styles.pie}>
              {fila(ajustes)}
            </View>
          </View>
        )}
        <View style={styles.trabajo}>
          <ConMarcoDeSeccion saldoALaVista aireLateral={0}>{children}</ConMarcoDeSeccion>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  cabecera: {
    flexDirection: 'row', alignItems: 'center', gap: 12, height: 56, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 20,
  },
  logo: { width: 58, height: 24 },
  raya: { width: StyleSheet.hairlineWidth, height: 20 },
  empuje: { flex: 1 },
  entrar: { height: 32, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  entrarTexto: { color: '#1F2937', fontSize: 13, fontWeight: '600' },
  pastillas: { gap: SPACING.xs, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  pastilla: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, minHeight: 36, paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md, borderWidth: StyleSheet.hairlineWidth,
  },
  pastillaTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  cuerpo: { flex: 1, flexDirection: 'row', minHeight: 0 },
  barra: { width: 232, borderRightWidth: StyleSheet.hairlineWidth },
  barraCompacta: { width: 64 },
  dentro: { paddingHorizontal: 10, paddingVertical: 14, gap: 10 },
  bloque: { gap: 1 },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36, paddingHorizontal: 10,
    borderRadius: 8, overflow: 'hidden',
  },
  filaCompacta: { justifyContent: 'center', paddingHorizontal: 0, minHeight: 44 },
  nombre: { flex: 1, fontSize: 13, fontWeight: '500' },
  nombreActivo: { fontWeight: '600' },
  grupo: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2, paddingHorizontal: 10, marginTop: 8 },
  separador: { height: StyleSheet.hairlineWidth, marginVertical: SPACING.sm, marginHorizontal: SPACING.md },
  pie: { padding: 10 },
  trabajo: { flex: 1, minWidth: 0 },
});

export default MarcoProfesional;
