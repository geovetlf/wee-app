import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useDireccion } from '../hooks/useDireccion';
import useWallet from '../hooks/useWallet';
import { textoDelServidorLegible } from '../i18n/servidor';
import { creditsService, describeTransaction, CreditTransaction } from '../services/creditsService';
import { RADIO_DE_CREATOR, TituloDeCreator, useColumnaDeCreator } from '../components/creator/PiezasDeCreator';

/** Los mismos que enseña la billetera de la versión app. */
const MOVIMIENTOS = 50;
/** Cuánto se espera la primera respuesta antes de decir que el historial no se pudo cargar (el mismo plazo que la app). */
const PLAZO_DEL_HISTORIAL_MS = 15000;

/**
 * LA BILLETERA DENTRO DE WEË VERSIÓN CREATOR: SALDO E HISTORIAL, Y NADA MÁS.
 *
 * Es la misma cuenta de Credits que en la versión app, leída de los mismos sitios:
 * el saldo y los acumulados de `useWallet` y el historial de
 * `creditsService.subscribeToTransactions`, como `WalletScreen`. La app nunca
 * escribe Credits y esta pantalla tampoco: solo lee.
 *
 * Sin «Recargar»: en creator las recargas están cerradas (docs/WEE-CREATOR.md), y
 * por eso la ruta `CreditStore` de la pila de creator también trae aquí. No hay
 * paquetes, ni precios, ni camino de compra.
 */
const WalletCreatorScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t, formato, locale } = useIdioma();
  const dir = useDireccion();
  const { user } = useAuth();
  const { account } = useWallet();
  const columna = useColumnaDeCreator();
  const [movimientos, setMovimientos] = useState<CreditTransaction[]>([]);
  const [historial, setHistorial] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [intento, setIntento] = useState(0);
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return undefined;
    setHistorial('cargando');
    const dejar = creditsService.subscribeToTransactions(
      uid,
      (items) => { setMovimientos(items); setHistorial('listo'); },
      MOVIMIENTOS,
      () => setHistorial('error'),
    );
    const plazo = setTimeout(() => setHistorial((h) => (h === 'cargando' ? 'error' : h)), PLAZO_DEL_HISTORIAL_MS);
    return () => { clearTimeout(plazo); dejar(); };
  }, [uid, intento]);

  /* El concepto de cada movimiento, como en la billetera de la app: lo del servidor, legible en el idioma de quien mira. */
  const tituloDe = (view: { title: string | null; tituloClave: string }): string => {
    if (!view.title) return t(view.tituloClave);
    return textoDelServidorLegible(view.title, { t, locale }) ?? t(view.tituloClave);
  };

  const fecha = (ts: any): string => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return formato.fecha(d, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const cifra = (valor: string, clave: string, color?: string) => (
    <View style={styles.cifra}>
      <Text style={[styles.cifraValor, { color: color ?? theme.colors.text }]}>{valor}</Text>
      <Text style={[styles.detalle, dir.texto, { color: theme.colors.textSecondary }]}>{t(clave)}</Text>
    </View>
  );

  const vacio = (icono: string, texto: string, accion?: () => void) => (
    <View style={[styles.tarjeta, styles.vacio, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} accessibilityLiveRegion="polite">
      {historial === 'cargando'
        ? <ActivityIndicator color={theme.colors.textSecondary} />
        : <Ionicons name={icono as any} size={28} color={theme.colors.textSecondary} />}
      <Text style={[styles.detalle, dir.texto, styles.centrado, { color: theme.colors.textSecondary }]}>{texto}</Text>
      {!!accion && (
        <Pressable onPress={accion} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.reintentar, { color: theme.colors.text }]}>{t('credits.historyRetry')}</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.pagina}>
      <View style={columna}>
        <View style={styles.bloque}>
          <TituloDeCreator titulo={t('credits.myWallet')} />
          <View style={[styles.tarjeta, styles.cifras, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {cifra(account ? formato.numero(account.balance) : '—', 'credits.currentBalance')}
            {cifra(account ? formato.numero(account.lifetimeEarned ?? 0) : '—', 'credits.earned', theme.colors.success)}
            {cifra(account ? formato.numero(account.lifetimeSpent ?? 0) : '—', 'credits.spent')}
          </View>
        </View>

        <View style={styles.bloque}>
          <TituloDeCreator titulo={t('credits.history')} />
          {movimientos.length === 0 ? (
            historial === 'cargando'
              ? vacio('', t('credits.historyLoading'))
              : historial === 'error'
                ? vacio('cloud-offline-outline', t('credits.historyError'), () => setIntento((n) => n + 1))
                : vacio('receipt-outline', t('credits.noMovements'))
          ) : (
            <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              {movimientos.map((item, i) => {
                const view = describeTransaction(item);
                const color = view.positive ? theme.colors.success : theme.colors.text;
                return (
                  <View key={item.id} style={[styles.movimiento, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
                    <Ionicons name={view.positive ? 'arrow-down' : 'arrow-up'} size={16} color={theme.colors.textSecondary} />
                    <View style={styles.movimientoTextos}>
                      <Text style={[styles.movimientoTitulo, dir.texto, { color: theme.colors.text }]}>{tituloDe(view)}</Text>
                      <Text style={[styles.detalle, dir.texto, { color: theme.colors.textSecondary }]}>{fecha(item.createdAt)}</Text>
                      {!!view.detalleClave && (
                        <Text style={[styles.detalle, dir.texto, { color: theme.colors.textSecondary }]}>{t(view.detalleClave)}</Text>
                      )}
                    </View>
                    <View style={styles.importe}>
                      <Text style={[styles.movimientoTitulo, { color }]}>{view.positive ? '+' : ''}{formato.numero(view.amount)}</Text>
                      <Text style={[styles.detalle, dir.texto, { color: theme.colors.textSecondary }]}>{t('credits.balanceAfter', { saldo: formato.numero(view.balanceAfter) })}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  pagina: { flexGrow: 1, paddingBottom: 40 },
  bloque: { gap: 10 },
  tarjeta: { borderRadius: RADIO_DE_CREATOR, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, padding: 16 },
  cifra: { minWidth: 110, gap: 2 },
  cifraValor: { fontSize: 22, fontWeight: '600', lineHeight: 28, fontVariant: ['tabular-nums'] },
  detalle: { fontSize: 13, lineHeight: 18 },
  centrado: { textAlign: 'center' },
  vacio: { alignItems: 'center', gap: 10, paddingVertical: 28, paddingHorizontal: 16 },
  reintentar: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  movimiento: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10 },
  movimientoTextos: { flex: 1, minWidth: 0, gap: 2 },
  movimientoTitulo: { fontSize: 14, fontWeight: '600', lineHeight: 19 },
  importe: { alignItems: 'flex-end', gap: 2 },
});

export default WalletCreatorScreen;
