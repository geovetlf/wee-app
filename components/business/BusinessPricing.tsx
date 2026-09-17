import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/** Lo que se pregunta, en orden. Cada uno es un coste que suma. */
const COSTES: { id: string; clave: string }[] = [
  { id: 'materials', clave: 'business.pricingMaterials' },
  { id: 'packaging', clave: 'business.pricingPackaging' },
  { id: 'delivery', clave: 'business.pricingDelivery' },
  { id: 'other', clave: 'business.pricingOther' },
];

/** Un número escrito a mano, con coma o con punto, o cero si no es un número. */
const numero = (texto: string): number => {
  const n = parseFloat(texto.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * PRICING ASSISTANT: CUÁNTO COBRAR.
 *
 * Suma lo que cuesta hacer una unidad y, con el margen que se quiera, dice a
 * cuánto habría que venderla. La cuenta es la de toda la vida —precio = coste /
 * (1 − margen)— y se hace AQUÍ, en el teléfono: no llama a nadie, no consume un
 * Credit y no necesita conexión.
 *
 * ── Es una referencia, y lo dice ─────────────────────────────────────────────
 *
 * Un precio depende de la competencia, de la zona, del momento y de cien cosas
 * más que esta pantalla no sabe. Por eso debajo va el aviso: informativo, no
 * asesoría contable ni fiscal. No se esconde en un tooltip.
 */
const BusinessPricing: React.FC = () => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();

  const [valores, setValores] = useState<Record<string, string>>({});
  const [margen, setMargen] = useState('40');

  const cuentas = useMemo(() => {
    const coste = COSTES.reduce((suma, c) => suma + numero(valores[c.id] ?? ''), 0);
    /* El margen se queda entre 0 y 95: con 100 el precio sería infinito. */
    const pct = Math.min(Math.max(numero(margen), 0), 95) / 100;
    const precio = coste > 0 ? coste / (1 - pct) : 0;
    return { coste, precio, ganancia: precio - coste, margen: precio > 0 ? (precio - coste) / precio : 0 };
  }, [valores, margen]);

  const campo = (id: string, etiqueta: string, valor: string, alCambiar: (v: string) => void, sufijo?: string) => (
    <View key={id} style={styles.campo}>
      <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{etiqueta}</Text>
      <View style={[styles.entrada, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <TextInput
          value={valor}
          onChangeText={alCambiar}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={theme.colors.textSecondary}
          style={[styles.texto, { color: theme.colors.text }, isWeb && ({ outlineStyle: 'none' } as any)]}
          accessibilityLabel={etiqueta}
        />
        {!!sufijo && <Text style={[styles.sufijo, { color: theme.colors.textSecondary }]}>{sufijo}</Text>}
      </View>
    </View>
  );

  const resultado = (clave: string, valor: string, fuerte?: boolean) => (
    <View key={clave} style={styles.resultado}>
      <Text style={[styles.resultadoEtiqueta, { color: theme.colors.textSecondary }]}>{t(clave)}</Text>
      <Text style={[styles.resultadoValor, { color: theme.colors.text }, fuerte && styles.resultadoFuerte]}>{valor}</Text>
    </View>
  );

  return (
    <View style={[styles.caja, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.campos}>
        {COSTES.map((c) => campo(c.id, t(c.clave), valores[c.id] ?? '', (v) => setValores((antes) => ({ ...antes, [c.id]: v }))))}
        {campo('margin', t('business.pricingMargin'), margen, setMargen, '%')}
      </View>

      <View style={[styles.resultados, { borderTopColor: theme.colors.border }]}>
        {resultado('business.pricingCost', formato.numero(Math.round(cuentas.coste)))}
        {resultado('business.pricingSuggested', formato.numero(Math.round(cuentas.precio)), true)}
        {resultado('business.pricingMarginResult', formato.porcentaje(cuentas.margen))}
        {resultado('business.pricingProfit', formato.numero(Math.round(cuentas.ganancia)))}
      </View>

      <Text style={[styles.aviso, { color: theme.colors.textSecondary }]}>{t('business.pricingNote')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  caja: {
    borderRadius: scale(20),
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  campos: { gap: SPACING.md },
  campo: { gap: scale(4) },
  etiqueta: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },
  entrada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  texto: { flex: 1, fontSize: FONT_SIZE.base },
  sufijo: { fontSize: FONT_SIZE.sm },
  resultados: { gap: SPACING.sm, paddingTop: SPACING.lg, borderTopWidth: StyleSheet.hairlineWidth },
  resultado: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: SPACING.md },
  resultadoEtiqueta: { fontSize: FONT_SIZE.sm },
  resultadoValor: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium },
  resultadoFuerte: { fontSize: scale(22), fontWeight: FONT_WEIGHT.bold },
  aviso: { fontSize: FONT_SIZE.xs, lineHeight: scale(16) },
});

export default BusinessPricing;
