import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useResponsive } from '../hooks/useResponsive';
import { useDireccion } from '../hooks/useDireccion';
import { confirmAction, notify } from '../utils/notify';
import { alterEgosService, ErrorDeAlterEgo } from '../services/alterEgosService';
import { palabraComparable } from './EliminarCuentaScreen';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import EspacioDeEscritura from '../components/EspacioDeEscritura';

/*
 * BORRAR UN ALTER EGO (plan de alter egos, F6, 2026-11-23).
 *
 * Decisiones del dueño: borrar un alter ego es INMEDIATO y no se puede deshacer
 * (D10, sin los 30 días de la cuenta), y exige un inicio de sesión de los últimos
 * 10 minutos (D10b). Por eso la confirmación es fuerte: hay que escribir el NOMBRE
 * del alter ego —es contenido de la persona, no se traduce— y confirmar un
 * diálogo que lo vuelve a decir. Lo borra el servidor (`retirarAlterEgo`); la app
 * no borra nada por su cuenta. Si el servidor pide volver a entrar
 * (`reautenticar`), se ofrece cerrar sesión, igual que al eliminar la cuenta.
 *
 * El alter ego llega por la ruta, pero solo se acepta uno de la lista de la
 * cuenta (y el servidor vuelve a comprobar que es tuyo). Al terminar, si era la
 * cara puesta, se vuelve al Perfil Real con el tema claro.
 */

const ROJO = '#DC2626';

type Estado = 'listo' | 'borrando' | 'reautenticar' | 'error';

const RetirarAlterEgoScreen: React.FC = () => {
  const t = useT();
  const { theme, setThemeMode } = useTheme();
  const rojo = theme.dark ? '#F87171' : ROJO;
  const { logout } = useAuth();
  const { alterEgos = [], activeIdentityId, quitarAlterEgo, refreshProfile } = useUserProfile();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const { espejo } = useDireccion();
  const [nombreEscrito, setNombreEscrito] = useState('');
  const [estado, setEstado] = useState<Estado>('listo');

  const perfilId: string | undefined = typeof route.params?.perfilId === 'string' ? route.params.perfilId : undefined;
  const alterEgo = alterEgos.find((a) => a.uid === perfilId) ?? null;
  const nombre = alterEgo?.displayName || '';
  const confirmado = !!nombre && palabraComparable(nombreEscrito) === palabraComparable(nombre);
  const borrando = estado === 'borrando';

  /** Cierra la sesión y deja la app en el inicio, como al eliminar la cuenta. */
  const salirAlInicio = async () => {
    const raiz = navigation.getParent?.()?.getParent?.() || navigation.getParent?.() || navigation;
    raiz.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Main' }] }));
    try {
      await logout();
    } catch {
      /* Nada que hacer: la sesión ya no estaba. */
    }
  };

  const borrar = async () => {
    if (!alterEgo || !confirmado || borrando) return;
    const ok = await confirmAction(t('alterEgo.deleteDialogTitle', { nombre }), t('alterEgo.deleteDialogBody'), t('alterEgo.deleteButton'), true, t);
    if (!ok) return;
    setEstado('borrando');
    try {
      await alterEgosService.retirar(alterEgo.uid);
      const eraLaPuesta = activeIdentityId === alterEgo.uid;
      quitarAlterEgo(alterEgo.uid);
      /* Si era la cara puesta, la app vuelve al Perfil Real, con su tema claro. */
      if (eraLaPuesta) setThemeMode('light');
      refreshProfile();
      notify(t('alterEgo.deletedTitle'), t('alterEgo.deletedBody', { nombre }));
      navigation.goBack();
    } catch (error) {
      const motivo = error instanceof ErrorDeAlterEgo ? error.motivo : 'reintentar';
      setEstado(motivo === 'reautenticar' || motivo === 'sinSesion' ? 'reautenticar' : 'error');
    }
  };

  const fila = (icono: string, texto: string, color: string) => (
    <View style={styles.fila} key={texto}>
      <Ionicons name={icono as any} size={18} color={color} style={styles.filaIcono} accessibilityElementsHidden importantForAccessibility="no" />
      <Text style={[styles.filaTexto, { color: theme.colors.text }]}>{texto}</Text>
    </View>
  );

  return (
    <View style={[styles.contenedor, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.cabecera, { borderBottomColor: theme.colors.border, paddingTop: isDesktop ? 12 : insets.top + 8 }]}>
        <TouchableOpacity style={styles.atras} onPress={() => navigation.goBack()} disabled={borrando} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} style={espejo} />
        </TouchableOpacity>
        <Text style={[styles.titulo, { color: theme.colors.text }]} accessibilityRole="header" numberOfLines={1}>{t('alterEgo.deleteTitle')}</Text>
        <View style={styles.atras} />
      </View>

      <EspacioDeEscritura style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.columna}>
            {!alterEgo ? (
              <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.parrafo, { color: theme.colors.textSecondary }]}>{t('alterEgo.notFound')}</Text>
              </View>
            ) : (
              <>
                <View style={styles.quien}>
                  <AvatarDisplay
                    size={56}
                    cuadrado
                    avatarType={alterEgo.avatarType || 'predefined'}
                    avatarId={alterEgo.avatarId || 'ghost'}
                    photoURL={typeof alterEgo.photoURL === 'string' ? alterEgo.photoURL : undefined}
                    photoURLThumbnail={typeof alterEgo.photoURLThumbnail === 'string' ? alterEgo.photoURLThumbnail : undefined}
                    backgroundColor={theme.colors.accent}
                  />
                  <Text style={[styles.nombre, { color: theme.colors.text }]} numberOfLines={2}>{nombre}</Text>
                </View>

                <View style={[styles.aviso, { borderColor: rojo, backgroundColor: theme.colors.surface }]}>
                  <Ionicons name="warning-outline" size={22} color={rojo} accessibilityElementsHidden importantForAccessibility="no" />
                  <Text style={[styles.avisoTexto, { color: theme.colors.text }]}>{t('alterEgo.deleteIntro', { nombre })}</Text>
                </View>

                <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.tarjetaTitulo, { color: theme.colors.text }]} accessibilityRole="header">{t('alterEgo.deleteWhatGoes')}</Text>
                  {fila('images-outline', t('alterEgo.goesPosts'), theme.colors.textSecondary)}
                  {fila('person-circle-outline', t('alterEgo.goesSheet'), theme.colors.textSecondary)}
                  {fila('chatbubbles-outline', t('alterEgo.goesContacts'), theme.colors.textSecondary)}
                </View>

                <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.tarjetaTitulo, { color: theme.colors.text }]} accessibilityRole="header">{t('alterEgo.deleteWhatStays')}</Text>
                  {fila('shield-checkmark-outline', t('alterEgo.staysRest'), theme.colors.textSecondary)}
                </View>

                {estado === 'reautenticar' && (
                  <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent }]} accessibilityLiveRegion="polite">
                    <Text style={[styles.tarjetaTitulo, { color: theme.colors.text }]}>{t('cuenta.reauthTitle')}</Text>
                    <Text style={[styles.parrafo, { color: theme.colors.textSecondary }]}>{t('alterEgo.reauthBody')}</Text>
                    <TouchableOpacity style={[styles.botonSecundario, { borderColor: theme.colors.accent }]} onPress={salirAlInicio} accessibilityRole="button">
                      <Text style={[styles.botonSecundarioTexto, { color: theme.colors.text }]}>{t('cuenta.reauthButton')}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {estado === 'error' && (
                  <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: rojo }]} accessibilityLiveRegion="polite">
                    <Text style={[styles.parrafo, { color: theme.colors.text }]}>{t('alterEgo.errorGeneric')}</Text>
                  </View>
                )}

                {borrando ? (
                  <View style={styles.progreso} accessibilityLiveRegion="polite">
                    <ActivityIndicator color={theme.colors.accent} size="large" />
                    <Text style={[styles.progresoTitulo, { color: theme.colors.text }]}>{t('alterEgo.deleting')}</Text>
                  </View>
                ) : estado !== 'reautenticar' && (
                  <View style={styles.confirmar}>
                    <Text style={[styles.etiqueta, { color: theme.colors.text }]} nativeID="etiqueta-retirar">{t('alterEgo.confirmLabel', { nombre })}</Text>
                    <TextInput
                      value={nombreEscrito}
                      onChangeText={setNombreEscrito}
                      placeholder={t('alterEgo.confirmPlaceholder')}
                      placeholderTextColor={theme.colors.textSecondary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="off"
                      accessibilityLabel={t('alterEgo.confirmLabel', { nombre })}
                      accessibilityLabelledBy="etiqueta-retirar"
                      style={[styles.campo, { color: theme.colors.text, borderColor: confirmado ? rojo : theme.colors.border, backgroundColor: theme.colors.card }]}
                      onSubmitEditing={borrar}
                    />
                    <TouchableOpacity
                      style={[styles.botonPeligro, { backgroundColor: confirmado ? ROJO : theme.colors.surface, borderColor: confirmado ? ROJO : theme.colors.border }]}
                      onPress={borrar}
                      disabled={!confirmado}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !confirmado }}
                    >
                      <Text style={[styles.botonPeligroTexto, { color: confirmado ? '#FFFFFF' : theme.colors.textSecondary }]}>{t('alterEgo.deleteButton')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </EspacioDeEscritura>
    </View>
  );
};

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5 },
  atras: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600' },
  contenido: { paddingHorizontal: 16, paddingTop: 20 },
  columna: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 16 },
  quien: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nombre: { flex: 1, fontSize: 18, fontWeight: '600' },
  aviso: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 12, borderLeftWidth: 4 },
  avisoTexto: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '500' },
  tarjeta: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 10 },
  tarjetaTitulo: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  filaIcono: { marginTop: 1 },
  filaTexto: { flex: 1, fontSize: 15, lineHeight: 21 },
  parrafo: { fontSize: 14, lineHeight: 20 },
  confirmar: { gap: 10, marginTop: 4 },
  etiqueta: { fontSize: 15, fontWeight: '500' },
  campo: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  botonPeligro: { borderRadius: 10, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  botonPeligroTexto: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  botonSecundario: { borderRadius: 10, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', minHeight: 44, justifyContent: 'center', marginTop: 4 },
  botonSecundarioTexto: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  progreso: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  progresoTitulo: { fontSize: 16, fontWeight: '600' },
});

export default RetirarAlterEgoScreen;
