import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { useDireccion } from '../hooks/useDireccion';
import { useWallet } from '../hooks/useWallet';
import { formatearNumero } from '../i18n/formato';
import { confirmAction, notify } from '../utils/notify';
import { eliminarMiCuenta, ErrorDeCuenta } from '../services/cuentaService';
import EspacioDeEscritura from '../components/EspacioDeEscritura';

/** Lo mismo que `DIAS_PARA_VOLVER` de `functions/src/cuenta/desactivar.ts`. */
const DIAS_PARA_VOLVER = 30;

/*
 * ELIMINAR CUENTA (Configuración → Zona de peligro).
 *
 * «30 días y luego se borra» (decisión del dueño, 2026-11-22): pedirlo
 * DESACTIVA la cuenta. Deja de verse, la autonomía del personaje se apaga, y
 * hay 30 días para volver iniciando sesión («Activar cuenta»,
 * `ActivarCuentaScreen`). Después se borra todo para siempre: eso es lo que
 * lista «Qué se borra si no vuelves». Pide escribir una palabra y confirmar, y
 * llama a `eliminarCuenta`. La app no marca ni borra nada por su cuenta. Al
 * terminar se cierra la sesión y se vuelve al inicio.
 *
 * Sobria a propósito: blanco (o el tema del Perfil Weë), texto de siempre, el
 * dorado solo como acento y el rojo solo en la acción que destruye.
 */

const ROJO = '#DC2626';

/*
 * La palabra de confirmación se compara sin depender del teclado ni del idioma del
 * teléfono: sin tildes ni diacríticos («διαγραφή» = «ΔΙΑΓΡΑΦΗ»), con la i turca
 * con o sin punto igualadas («SİL» = «SIL» = «sil») y sin mayúsculas/minúsculas.
 * Es una confirmación de intención, no una contraseña: basta con que sea la palabra.
 */
export const palabraComparable = (texto: string): string =>
  String(texto ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[İIıi]/g, 'i')
    .toLowerCase()
    .normalize('NFC');

type Estado = 'listo' | 'borrando' | 'reautenticar' | 'error';

const EliminarCuentaScreen: React.FC = () => {
  const { t, formato, locale } = useIdioma();
  const { espejo } = useDireccion();
  const { balance } = useWallet();
  const { theme } = useTheme();
  /* El rojo como TEXTO: en el tema oscuro #DC2626 no llega a 4,5:1 y se usa #F87171 (el botón relleno sigue en #DC2626 con texto blanco). */
  const rojo = theme.dark ? '#F87171' : ROJO;
  const { logout } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const [palabra, setPalabra] = useState('');
  const [estado, setEstado] = useState<Estado>('listo');

  const palabraEsperada = t('cuenta.confirmWord');
  const confirmada = palabraComparable(palabra) === palabraComparable(palabraEsperada);
  const borrando = estado === 'borrando';
  /* La etiqueta con la palabra a escribir resaltada: se parte la frase ya traducida por la palabra, sin pegar cadenas. */
  const etiquetaConfirmar = t('cuenta.confirmLabel', { palabra: palabraEsperada });
  const trozosDeEtiqueta = etiquetaConfirmar.split(palabraEsperada);

  /** Cierra la sesión y deja la app en el inicio, como «Cerrar sesión» de Configuración. */
  const salirAlInicio = async () => {
    const raiz = navigation.getParent?.()?.getParent?.() || navigation.getParent?.() || navigation;
    raiz.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Main' }] }));
    try {
      await logout();
    } catch {
      /* Si la cuenta se borró en el acto (no tenía perfil), el usuario de Auth ya no existe. */
    }
  };

  const eliminar = async () => {
    if (!confirmada || borrando) return;
    const ok = await confirmAction(t('cuenta.dialogTitle'), t('cuenta.dialogBodyDesactivar'), t('cuenta.dialogConfirm'), true, t);
    if (!ok) return;
    setEstado('borrando');
    try {
      const r = await eliminarMiCuenta();
      if (r.estado === 'desactivada') notify(t('cuenta.deactivatedTitle'), t('cuenta.deactivatedBody', { fecha: formato.fecha(r.borrarEn) }));
      else notify(t('cuenta.doneTitle'), t('cuenta.doneBody'));
      await salirAlInicio();
    } catch (error) {
      const motivo = error instanceof ErrorDeCuenta ? error.motivo : 'reintentar';
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
      <View style={[styles.cabecera, {
        borderBottomColor: theme.colors.border,
        paddingTop: isDesktop ? 12 : insets.top + 8,
      }]}>
        <TouchableOpacity
          style={styles.atras}
          onPress={() => navigation.goBack()}
          disabled={borrando}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} style={espejo} />
        </TouchableOpacity>
        <Text style={[styles.titulo, { color: theme.colors.text }]} accessibilityRole="header">
          {t('cuenta.title')}
        </Text>
        <View style={styles.atras} />
      </View>

      {/* El campo de la palabra queda a la vista con el teclado abierto (Android e iOS). */}
      <EspacioDeEscritura style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.columna}>
          <View style={[styles.aviso, { borderColor: theme.colors.accent, backgroundColor: theme.colors.surface }]}>
            <Ionicons name="warning-outline" size={22} color={theme.colors.accent} accessibilityElementsHidden importantForAccessibility="no" />
            <Text style={[styles.avisoTexto, { color: theme.colors.text }]}>{t('cuenta.introDesactivar')}</Text>
          </View>

          <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.tarjetaTitulo, { color: theme.colors.text }]} accessibilityRole="header">{t('cuenta.nowTitle')}</Text>
            {fila('eye-off-outline', t('cuenta.nowHidden'), theme.colors.textSecondary)}
            {fila('power-outline', t('cuenta.nowCharacterOff'), theme.colors.textSecondary)}
            {fila('time-outline', t('cuenta.nowComeBack', { contador: DIAS_PARA_VOLVER }), theme.colors.accent)}
          </View>

          <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.tarjetaTitulo, { color: theme.colors.text }]} accessibilityRole="header">{t('cuenta.whatGoesLaterTitle')}</Text>
            {fila('people-outline', t('cuenta.goesFaces'), theme.colors.textSecondary)}
            {fila('person-circle-outline', t('cuenta.goesCharacter'), theme.colors.textSecondary)}
            {fila('images-outline', t('cuenta.goesPosts'), theme.colors.textSecondary)}
            {fila('chatbubbles-outline', t('cuenta.goesMessages'), theme.colors.textSecondary)}
            {fila('sparkles-outline', t('cuenta.goesCreations'), theme.colors.textSecondary)}
            {fila('bookmark-outline', t('cuenta.goesContacts'), theme.colors.textSecondary)}
            {fila('wallet-outline', balance !== null && balance > 0
              ? t('cuenta.goesCreditsCount', { creditos: formatearNumero(balance, locale) })
              : t('cuenta.goesCredits'), rojo)}
          </View>

          <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.tarjetaTitulo, { color: theme.colors.text }]} accessibilityRole="header">{t('cuenta.whatStaysTitle')}</Text>
            {fila('document-text-outline', t('cuenta.staysRecords'), theme.colors.textSecondary)}
          </View>

          {estado === 'reautenticar' && (
            <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent }]} accessibilityLiveRegion="polite">
              <Text style={[styles.tarjetaTitulo, { color: theme.colors.text }]}>{t('cuenta.reauthTitle')}</Text>
              <Text style={[styles.parrafo, { color: theme.colors.textSecondary }]}>{t('cuenta.reauthBody')}</Text>
              <TouchableOpacity
                style={[styles.botonSecundario, { borderColor: theme.colors.accent }]}
                onPress={salirAlInicio}
                accessibilityRole="button"
              >
                <Text style={[styles.botonSecundarioTexto, { color: theme.colors.text }]}>{t('cuenta.reauthButton')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {estado === 'error' && (
            <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: rojo }]} accessibilityLiveRegion="polite">
              <Text style={[styles.tarjetaTitulo, { color: rojo }]}>{t('cuenta.errorTitle')}</Text>
              <Text style={[styles.parrafo, { color: theme.colors.textSecondary }]}>{t('cuenta.errorBody')}</Text>
            </View>
          )}

          {borrando ? (
            <View style={styles.progreso} accessibilityLiveRegion="polite">
              <ActivityIndicator color={theme.colors.accent} size="large" />
              <Text style={[styles.progresoTitulo, { color: theme.colors.text }]}>{t('cuenta.deactivating')}</Text>
            </View>
          ) : estado !== 'reautenticar' && (
            <View style={styles.confirmar}>
              <Text style={[styles.etiqueta, { color: theme.colors.text }]} nativeID="etiqueta-confirmar">
                {trozosDeEtiqueta.map((trozo, i) => (
                  <React.Fragment key={i}>
                    {i > 0 ? <Text style={[styles.palabra, { color: theme.colors.text, backgroundColor: theme.colors.surface }]}>{palabraEsperada}</Text> : null}
                    {trozo}
                  </React.Fragment>
                ))}
              </Text>
              <TextInput
                value={palabra}
                onChangeText={setPalabra}
                placeholder={t('cuenta.confirmPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                accessibilityLabel={etiquetaConfirmar}
                accessibilityLabelledBy="etiqueta-confirmar"
                style={[styles.campo, { color: theme.colors.text, borderColor: confirmada ? rojo : theme.colors.border, backgroundColor: theme.colors.card }]}
                onSubmitEditing={eliminar}
              />
              <TouchableOpacity
                style={[styles.botonPeligro, { backgroundColor: confirmada ? ROJO : theme.colors.surface, borderColor: confirmada ? ROJO : theme.colors.border }]}
                onPress={eliminar}
                disabled={!confirmada}
                accessibilityRole="button"
                accessibilityState={{ disabled: !confirmada }}
              >
                <Text style={[styles.botonPeligroTexto, { color: confirmada ? '#FFFFFF' : theme.colors.textSecondary }]}>
                  {estado === 'error' ? t('cuenta.retry') : t('cuenta.deactivateButton')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
      </EspacioDeEscritura>
    </View>
  );
};

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  /* Objetivo táctil de 44 px como mínimo. */
  atras: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600' },
  contenido: { paddingHorizontal: 16, paddingTop: 20 },
  /* Una columna legible también en escritorio. */
  columna: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 16 },
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  avisoTexto: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '500' },
  tarjeta: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 10 },
  tarjetaTitulo: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  filaIcono: { marginTop: 1 },
  filaTexto: { flex: 1, fontSize: 15, lineHeight: 21 },
  parrafo: { fontSize: 14, lineHeight: 20 },
  confirmar: { gap: 10, marginTop: 4 },
  etiqueta: { fontSize: 15, fontWeight: '500' },
  palabra: { fontWeight: '700' },
  campo: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, letterSpacing: 1 },
  botonPeligro: { borderRadius: 10, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  botonPeligroTexto: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  botonSecundario: { borderRadius: 10, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', minHeight: 44, justifyContent: 'center', marginTop: 4 },
  botonSecundarioTexto: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  progreso: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  progresoTitulo: { fontSize: 16, fontWeight: '600' },
});

export default EliminarCuentaScreen;
