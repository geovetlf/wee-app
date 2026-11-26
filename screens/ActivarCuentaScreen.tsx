import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { notify } from '../utils/notify';
import { RellenoDeMarca } from '../components/GradienteDeMarca';
import { borrarEnDe, diasQueQuedan } from '../utils/cuentaDesactivada';
import { ErrorDeCuenta, reactivarMiCuenta } from '../services/cuentaService';

/*
 * ACTIVAR CUENTA — lo que ve quien entra con una cuenta desactivada.
 *
 * «Eliminar cuenta» desactiva durante 30 días (`functions/src/cuenta/desactivar.ts`).
 * Si la persona vuelve a iniciar sesión en ese plazo, en vez de la app ve esto
 * (la puerta está en `navigation/MainStackNavigator.tsx`, junto a la del
 * onboarding): cuántos días le quedan, «Activar cuenta» y «Cerrar sesión».
 * Activar llama a `reactivarCuenta`, que quita las marcas y vuelve a mostrar sus
 * publicaciones; al recargar el perfil, la puerta deja pasar a la app.
 *
 * Se monta FUERA de la pila de navegación, como el onboarding: no usa
 * `useNavigation`.
 */

const DORADO = '#F5B731';
const TEXTO_SOBRE_DORADO = '#1F2937';

type Estado = 'listo' | 'activando' | 'vencida' | 'error';

const ActivarCuentaScreen: React.FC = () => {
  const { t, formato } = useIdioma();
  const { theme } = useTheme();
  const { logout } = useAuth();
  const { userProfile, refreshProfile } = useUserProfile();
  const insets = useSafeAreaInsets();
  const [estado, setEstado] = useState<Estado>('listo');

  const borrarEn = borrarEnDe(userProfile);
  const dias = borrarEn ? diasQueQuedan(borrarEn) : 0;
  const activando = estado === 'activando';
  /* Con 0 días el plazo ya venció aunque el servidor aún no la haya marcado: se enseña vencida, no «Quedan 0 días». */
  const vencida = estado === 'vencida' || (borrarEn !== null && dias === 0);

  const activar = async () => {
    if (activando) return;
    setEstado('activando');
    try {
      await reactivarMiCuenta();
      notify(t('cuenta.activatedTitle'));
      refreshProfile();
    } catch (error) {
      const motivo = error instanceof ErrorDeCuenta ? error.motivo : 'reintentar';
      if (motivo === 'noDesactivada') { refreshProfile(); return; }
      setEstado(motivo === 'vencida' ? 'vencida' : 'error');
    }
  };

  const salir = async () => {
    try {
      await logout();
    } catch {
      /* Si no se pudo cerrar, la persona sigue aquí y puede volver a intentarlo. */
    }
  };

  return (
    <View style={[styles.contenedor, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.contenido, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}
      >
        <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={[styles.icono, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="pause-circle-outline" size={36} color={DORADO} accessibilityElementsHidden importantForAccessibility="no" />
          </View>
          <Text style={[styles.titulo, { color: theme.colors.text }]} accessibilityRole="header">{t('cuenta.activarTitle')}</Text>
          <Text style={[styles.parrafo, { color: theme.colors.textSecondary }]}>{t('cuenta.activarBody')}</Text>

          {vencida ? (
            <View style={styles.bloque} accessibilityLiveRegion="polite">
              <Text style={[styles.subtitulo, { color: theme.colors.text }]}>{t('cuenta.activarExpiredTitle')}</Text>
              <Text style={[styles.parrafo, { color: theme.colors.textSecondary }]}>{t('cuenta.activarExpiredBody')}</Text>
            </View>
          ) : borrarEn ? (
            <View style={[styles.plazo, { borderColor: DORADO }]}>
              <Text style={[styles.dias, { color: theme.colors.text }]}>{t('cuenta.activarDaysLeft', { contador: dias })}</Text>
              <Text style={[styles.parrafo, { color: theme.colors.textSecondary }]}>{t('cuenta.activarDate', { fecha: formato.fecha(borrarEn) })}</Text>
            </View>
          ) : null}

          {estado === 'error' && (
            <View style={styles.bloque} accessibilityLiveRegion="polite">
              <Text style={[styles.subtitulo, { color: theme.colors.error }]}>{t('cuenta.errorTitle')}</Text>
            </View>
          )}

          {!vencida && (
            <>
              <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('cuenta.activarCharacterNote')}</Text>
              <TouchableOpacity
                style={[styles.botonPrincipal, { opacity: activando ? 0.7 : 1 }]}
                onPress={activar}
                disabled={activando}
                accessibilityRole="button"
                accessibilityState={{ disabled: activando, busy: activando }}
              >
                <RellenoDeMarca radio={12} />
                {activando ? (
                  <View style={styles.fila}>
                    <ActivityIndicator color={TEXTO_SOBRE_DORADO} />
                    <Text style={[styles.botonPrincipalTexto, { color: TEXTO_SOBRE_DORADO }]}>{t('cuenta.activating')}</Text>
                  </View>
                ) : (
                  <Text style={[styles.botonPrincipalTexto, { color: TEXTO_SOBRE_DORADO }]}>
                    {estado === 'error' ? t('cuenta.retry') : t('cuenta.activarButton')}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.botonSecundario, { borderColor: theme.colors.border }]}
            onPress={salir}
            disabled={activando}
            accessibilityRole="button"
          >
            <Text style={[styles.botonSecundarioTexto, { color: theme.colors.text }]}>{t('settings.signOut')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  contenido: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16 },
  /* Una tarjeta legible en el teléfono y centrada en escritorio. */
  tarjeta: { width: '100%', maxWidth: 480, alignSelf: 'center', borderWidth: 1, borderRadius: 16, padding: 24, gap: 14, alignItems: 'stretch' },
  icono: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  titulo: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitulo: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  parrafo: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  nota: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  bloque: { gap: 6 },
  plazo: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  dias: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  botonPrincipal: { borderRadius: 12, minHeight: 50, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  botonPrincipalTexto: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  botonSecundario: { borderRadius: 12, borderWidth: 1, minHeight: 46, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  botonSecundarioTexto: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
});

export default ActivarCuentaScreen;
