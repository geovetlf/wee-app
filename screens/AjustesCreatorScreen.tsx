import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import IconoDireccional from '../components/IconoDireccional';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useDireccion } from '../hooks/useDireccion';
import { varianteDelLocale } from '../i18n/idiomas';
import { confirmAction, notify } from '../utils/notify';
import { ENGINE_ADMIN_FLAG } from './EngineAdminScreen';
import { RADIO_DE_CREATOR, TituloDeCreator, useColumnaDeCreator } from '../components/creator/PiezasDeCreator';
import { RUTA_DE_INICIO } from '../constants/espacioProfesional';

const isWeb = Platform.OS === 'web';

interface Fila {
  id: string;
  /** Un icono que no señala. Entrar y salir de la cuenta llevan su flecha aparte (`sesion`). */
  icono?: string;
  sesion?: 'entrar' | 'salir';
  titulo: string;
  detalle?: string;
  alPulsar: () => void;
  peligro?: boolean;
}

/**
 * LA CONFIGURACIÓN DE WEË VERSIÓN CREATOR.
 *
 * Propia de creator: la de la versión app (`SettingsScreen`) no se toca. Aquí solo
 * queda lo que sirve para trabajar —idioma, ayuda, privacidad, acerca de, el panel
 * del WEË AI ENGINE para administración y cerrar sesión—. Lo social (Mis
 * comunidades, Respuestas privadas) y lo del aparato que solo usa lo social
 * (ubicación, notificaciones push) es de la versión app y no se enseña.
 *
 * Idioma, Ayuda y el panel del motor se registran en la pila de creator con su
 * nombre de siempre, así que se abren dentro del marco. Cerrar sesión es el
 * `logout` de siempre (AuthContext): no hay otra autenticación. Al salir, creator
 * vuelve a su Inicio, que funciona sin sesión.
 *
 * Los textos son las mismas claves que la configuración de la versión app; «Weë AI
 * Engine» es marca.
 */
const AjustesCreatorScreen: React.FC = () => {
  const { t, idioma, locale, disponibles } = useIdioma();
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const columna = useColumnaDeCreator();
  /* El panel del motor: visible en desarrollo o para quien ya entró como administración, igual que en la versión app. */
  const [engineAdmin, setEngineAdmin] = useState<boolean>(__DEV__);
  useEffect(() => {
    AsyncStorage.getItem(ENGINE_ADMIN_FLAG)
      .then((valor) => { if (valor === '1') setEngineAdmin(true); })
      .catch(() => {});
  }, []);

  const nombreDelIdioma =
    varianteDelLocale(locale)?.nombreNativo
    ?? disponibles.find((i) => i.codigo === idioma)?.nombreNativo
    ?? t('settings.languageSubtitle');

  const cerrarSesion = async () => {
    const ok = await confirmAction(t('settings.signOut'), t('menu.signOutConfirm'), t('settings.signOut'), true, t);
    if (!ok) return;
    try {
      /* Primero a un sitio que no necesita la cuenta, luego fuera: ninguna pantalla se queda leyendo datos de nadie. */
      navigation.reset({ index: 0, routes: [{ name: RUTA_DE_INICIO }] });
      await logout();
    } catch {
      notify(t('settings.signOutFailed'), t('common.retry'));
    }
  };

  const preferencias: Fila[] = [
    { id: 'language', icono: 'language-outline', titulo: t('settings.language'), detalle: nombreDelIdioma, alPulsar: () => navigation.navigate('Idioma') },
  ];
  /* Privacidad: en creator solo queda la política (las respuestas privadas y la ubicación son de lo social de la versión app). */
  const privacidad: Fila[] = [
    { id: 'privacy', icono: 'shield-checkmark-outline', titulo: t('settings.privacyPolicy'), detalle: t('settings.privacyPolicyHint'), alPulsar: () => navigation.navigate('Help', { section: 'legal' }) },
  ];
  const informacion: Fila[] = [
    { id: 'about', icono: 'information-circle-outline', titulo: t('settings.about'), detalle: t('settings.aboutHint'), alPulsar: () => notify(t('settings.about'), t('settings.aboutBody', { anio: new Date().getFullYear() })) },
    { id: 'help', icono: 'help-circle-outline', titulo: t('settings.help'), detalle: t('settings.helpHint'), alPulsar: () => navigation.navigate('Help') },
    ...(engineAdmin
      ? [{ id: 'engine', icono: 'hardware-chip-outline', titulo: 'Weë AI Engine', detalle: t('engine.rowSubtitle'), alPulsar: () => navigation.navigate('EngineAdmin') }]
      : []),
  ];
  const cuenta: Fila[] = user
    ? [{ id: 'signOut', sesion: 'salir', titulo: t('settings.signOut'), detalle: t('settings.signOutHint'), alPulsar: cerrarSesion, peligro: true }]
    : [{ id: 'signIn', sesion: 'entrar', titulo: t('menu.signIn'), alPulsar: () => navigation.navigate('Login') }];

  const bloque = (titulo: string, filas: Fila[]) => (
    <View style={styles.bloque}>
      <TituloDeCreator titulo={titulo} />
      <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        {filas.map((f, i) => {
          const color = f.peligro ? '#DC2626' : theme.colors.text;
          return (
            <Pressable
              key={f.id}
              onPress={f.alPulsar}
              accessibilityRole="button"
              accessibilityLabel={f.titulo}
              style={(e: any) => [
                styles.fila,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                e.hovered && { backgroundColor: theme.colors.surface },
                isWeb && ({ cursor: 'pointer' } as object),
              ] as any}
            >
              <View style={[styles.icono, { backgroundColor: f.peligro ? '#FEF2F2' : theme.colors.glow }]}>
                {f.sesion === 'salir' ? <IconoDireccional name="log-out-outline" size={18} color="#DC2626" />
                  : f.sesion === 'entrar' ? <IconoDireccional name="log-in-outline" size={18} color={theme.colors.accentDark} />
                  : <Ionicons name={(f.icono ?? 'ellipse-outline') as any} size={18} color={theme.colors.accentDark} />}
              </View>
              <View style={styles.textos}>
                <Text style={[styles.titulo, dir.texto, { color }]}>{f.titulo}</Text>
                {!!f.detalle && <Text style={[styles.detalle, dir.texto, { color: theme.colors.textSecondary }]}>{f.detalle}</Text>}
              </View>
              {!f.peligro && <IconoDireccional name="chevron-forward" size={16} color={theme.colors.textSecondary} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={styles.dentro}>
      <View style={columna}>
        <Text accessibilityRole="header" style={[styles.cabecera, dir.texto, { color: theme.colors.text }]}>{t('settings.title')}</Text>
        {bloque(t('settings.sectionPreferences'), preferencias)}
        {bloque(t('settings.sectionPrivacy'), privacidad)}
        {bloque(t('settings.sectionInfo'), informacion)}
        {bloque(t('settings.sectionAccount'), cuenta)}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  dentro: { paddingBottom: 40 },
  cabecera: { fontSize: 20, lineHeight: 26, fontWeight: '600', letterSpacing: -0.2 },
  bloque: { gap: 10 },
  tarjeta: { borderRadius: RADIO_DE_CREATOR, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10 },
  icono: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, gap: 2 },
  titulo: { fontSize: 14.5, fontWeight: '600' },
  detalle: { fontSize: 13, lineHeight: 18 },
});

export default AjustesCreatorScreen;
