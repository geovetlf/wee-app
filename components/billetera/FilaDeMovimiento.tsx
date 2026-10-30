import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { textoDelServidorLegible } from '../../i18n/servidor';
import { describeTransaction, CreditTransaction } from '../../services/creditsService';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';

/**
 * Una fila del historial de Credits, la misma en Mi billetera y en la pantalla de Credits.
 *
 * Se pinta por el TIPO del movimiento (`describeTransaction`) y el concepto que guardó el servidor; nunca por un
 * catálogo de paquetes. Así una compra antigua —con su `meta.packageId` de cuando había paquetes— se sigue viendo
 * como «Compra de Credits» con su importe, aunque el catálogo ya no exista.
 *
 * El concepto, en el idioma de quien mira: lo que no se reconoce —un concepto nuevo del servidor, uno que escribió
 * una persona de administración— se enseña tal cual en español y, en cualquier otro idioma, se dice por su tipo.
 * Esa decisión es la de todos los textos del servidor (`textoDelServidorLegible`, i18n/servidor.ts).
 */
export const FilaDeMovimiento = ({ item }: { item: CreditTransaction }) => {
  const { theme } = useTheme();
  const { t, formato, locale } = useIdioma();
  const tituloDe = (view: { title: string | null; tituloClave: string }): string => {
    if (!view.title) return t(view.tituloClave);
    return textoDelServidorLegible(view.title, { t, locale }) ?? t(view.tituloClave);
  };
  const view = describeTransaction(item);
  const titulo = tituloDe(view);
  const isSpend = !view.positive;
  const color = isSpend ? '#EF4444' : '#22C55E';

  /*
   * La fecha sale del LOCALE ACTIVO, no de uno fijo: `formato` ya viene atado al locale que haya puesto la persona,
   * que es lo que pide el §8 —nunca un `toLocaleDateString('es')` a mano—.
   */
  const ts = item.createdAt as unknown as { toDate?: () => Date } | number | string | null;
  const fecha = !ts ? '' : formato.fecha(typeof ts === 'object' && ts.toDate ? ts.toDate() : new Date(ts as number | string), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.txnItem, { borderColor: theme.colors.border }]}>
      <View style={[styles.txnIcon, { backgroundColor: isSpend ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)' }]}>
        <Ionicons name={isSpend ? 'arrow-up' : 'arrow-down'} size={18} color={color} />
      </View>
      <View style={styles.txnBody}>
        <Text style={[styles.txnDesc, { color: theme.colors.text }]}>{titulo}</Text>
        <Text style={[styles.txnDate, { color: theme.colors.textSecondary }]}>
          {fecha}{view.detalleClave ? ` · ${t(view.detalleClave)}` : ''}
        </Text>
      </View>
      <View style={styles.txnRight}>
        <Text style={[styles.txnAmount, { color }]}>
          {view.positive ? '+' : ''}{formato.numero(view.amount)}
        </Text>
        <Text style={[styles.txnBalance, { color: theme.colors.textSecondary }]}>{t('credits.balanceAfter', { saldo: formato.numero(view.balanceAfter) })}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  txnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: SPACING.md,
  },
  txnIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  txnBody: { flex: 1 },
  txnDesc: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  txnDate: { fontSize: FONT_SIZE.xs, marginTop: 2 },
  txnRight: { alignItems: 'flex-end' },
  txnAmount: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold },
  txnBalance: { fontSize: FONT_SIZE.xs, marginTop: 2 },
});
