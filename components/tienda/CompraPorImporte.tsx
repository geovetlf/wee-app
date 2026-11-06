import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import type { ConfiguracionDeCompra } from '../../services/creditsService';
import { COMPRA_INICIAL, MERCADO_DOLAR, MercadoParaPintar, creditsDe, importeMostrado, importesDe, moverImporte } from '../../utils/compraPorImporte';

/*
 * LA COMPRA DE CREDITS — la pantalla de la demo YC, funcionando de verdad (decisión del dueño, 2026-11-04).
 *
 * La presentación es la de demo/yc · components/tienda/CompraPorImporte.tsx: mismas piezas, mismo orden, mismos
 * tamaños y el mismo blanco y negro. Los datos son los de Weë:
 *   · el saldo, de la cuenta (Credit Engine, en tiempo real);
 *   · la regla —de US$5 a US$100, de 5 en 5, 100 Credits por dólar— la manda el servidor (`getCreditCost` →
 *     `compra`); mientras llega, se pinta con los mismos números y el botón apagado;
 *   · la compra la valida, la cobra (proveedor) y la acredita el servidor (`validatePurchase`): el saldo cambia
 *     cuando el servidor la confirma, nunca antes.
 * Si no hay ningún proveedor que pueda confirmar pagos (producción hoy), o el mercado no tiene tipo de cambio, la
 * pantalla lo dice y el botón no compra: no hay botón falso.
 */
type EstadoDelCatalogo = 'cargando' | 'listo' | 'error';

/** Lo que la pantalla pide comprar: el importe y lo que la persona está viendo. */
export interface CompraElegida {
  amountUsd: number;
  displayed: { currency: 'USD' | 'PEN'; amountMinor: number };
  credits: number;
}

interface Props {
  /** null mientras se lee la cuenta. */
  saldo: number | null;
  /** La regla del servidor; null mientras llega o si no respondió. */
  compra: ConfiguracionDeCompra | null;
  /** El mercado de facturación. Nunca se deduce del idioma. Hoy la app usa siempre 'US'. */
  mercado?: 'US' | 'PE';
  estadoDelCatalogo: EstadoDelCatalogo;
  comprando: boolean;
  onComprar: (compra: CompraElegida) => void;
  onReintentar: () => void;
  onCerrar: () => void;
  onHistorial: () => void;
}

function CompraPorImporte({ saldo, compra, mercado = 'US', estadoDelCatalogo, comprando, onComprar, onReintentar, onCerrar, onHistorial }: Props) {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const dir = useDireccion();
  const insets = useSafeAreaInsets();
  const regla = compra ?? COMPRA_INICIAL;
  const [dolares, setDolares] = useState(regla.minUsd);
  /*
   * El precio a 66 px, como en la demo, salvo que en su formato local no quepa. En la web `adjustsFontSizeToFit` no
   * hace nada, y «100 US$» (árabe, RTL) se cortaba a 320 px: se mide el ancho natural del texto con una copia
   * invisible y, solo si no cabe en el hueco entre − y +, se reduce en proporción.
   */
  const [anchoDelPrecio, setAnchoDelPrecio] = useState(0);
  const [anchoNatural, setAnchoNatural] = useState(0);
  const repeticion = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Si el servidor manda otros límites, el importe elegido se queda dentro. */
  useEffect(() => { setDolares((d) => Math.min(regla.maxUsd, Math.max(regla.minUsd, d))); }, [regla.minUsd, regla.maxUsd]);

  /* Blanco y negro de verdad, como en la demo: ni el gris azulado de los textos de la app. */
  const tinta = theme.dark ? '#FFFFFF' : '#0A0A0A';
  const papel = theme.dark ? '#0A0A0A' : '#FFFFFF';
  const tenue = theme.colors.textSecondary;

  /* El mercado: el del dólar siempre existe; el de Perú solo si el servidor tiene su tipo de cambio aprobado. */
  const delServidor = compra?.mercados.find((m) => m.id === mercado);
  const mercadoParaPintar: MercadoParaPintar | null = mercado === 'US' ? MERCADO_DOLAR
    : delServidor && delServidor.disponible ? { id: delServidor.id, currency: delServidor.currency, fx: delServidor.fx } : null;
  const enMoneda = (usd: number) => (mercadoParaPintar ? importeMostrado(usd, mercadoParaPintar) : null);
  const precio = (usd: number) => {
    const m = enMoneda(usd);
    return m ? formato.moneda(m.amountMinor / 100, m.currency, { maximumFractionDigits: 0 }) : formato.moneda(usd, 'USD', { maximumFractionDigits: 0 });
  };
  const mostrado = enMoneda(dolares);
  const marcas = importesDe(regla);

  const creditsNumero = creditsDe(dolares, regla);
  const credits = formato.numero(creditsNumero);
  const textoDelPrecio = precio(dolares);
  const tamanoDelPrecio = anchoDelPrecio > 0 && anchoNatural > anchoDelPrecio
    ? Math.max(28, Math.floor((TAMANO_DEL_PRECIO * anchoDelPrecio) / anchoNatural))
    : TAMANO_DEL_PRECIO;
  const listo = estadoDelCatalogo === 'listo' && !!compra;
  const sePuedeComprar = listo && !!compra?.proveedor && !!mostrado && !comprando;

  const mover = (sentido: 1 | -1) => setDolares((d) => moverImporte(d, sentido, regla));
  const soltar = () => {
    if (repeticion.current) clearInterval(repeticion.current);
    repeticion.current = null;
  };
  useEffect(() => soltar, []);

  const boton = (sentido: 1 | -1) => {
    const apagado = sentido === 1 ? dolares >= regla.maxUsd : dolares <= regla.minUsd;
    return (
      <Pressable
        onPress={() => mover(sentido)}
        onLongPress={() => { soltar(); repeticion.current = setInterval(() => mover(sentido), 130); }}
        onPressOut={soltar}
        disabled={apagado}
        accessibilityRole="button"
        accessibilityState={{ disabled: apagado }}
        accessibilityLabel={t(sentido === 1 ? 'credits.buyMore' : 'credits.buyLess')}
        style={[styles.contador, { borderColor: tinta, opacity: apagado ? 0.25 : 1 }]}
      >
        <Ionicons name={sentido === 1 ? 'add' : 'remove'} size={28} color={tinta} />
      </Pressable>
    );
  };

  /* Lo que se dice encima del botón cuando no se puede comprar: el porqué, sin adornos. */
  const aviso = estadoDelCatalogo === 'cargando' ? t('credits.buyChecking')
    : estadoDelCatalogo === 'error' || !compra ? t('credits.buyCatalogError')
      : !compra.proveedor ? t('credits.purchasesComingSoon')
        : !mostrado ? t('credits.buyMarketUnavailable')
          : null;

  return (
    <View style={[styles.pantalla, dir.contenedor, { backgroundColor: papel }]}>
      <View style={[styles.cabecera, { paddingTop: insets.top + SPACING.md }]}>
        <TouchableOpacity onPress={onCerrar} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Ionicons name="close-outline" size={30} color={tinta} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onHistorial} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('credits.seeHistoryLabel')}>
          <Ionicons name="time-outline" size={25} color={tinta} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <View style={styles.saldo}>
          <Ionicons name="diamond-outline" size={16} color={tenue} />
          <Text style={[styles.saldoTexto, dir.texto, { color: tenue }]}>
            {t('credits.yourBalance')}: {saldo === null ? '…' : formato.numero(saldo)}
          </Text>
        </View>

        <Text style={[styles.pregunta, dir.texto, { color: tinta }]}>{t('credits.buyTitle')}</Text>

        <View style={styles.fila}>
          {boton(-1)}
          <Text
            style={[styles.precio, { color: tinta, fontSize: tamanoDelPrecio }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            onLayout={(e) => setAnchoDelPrecio(e.nativeEvent.layout.width)}
          >
            {textoDelPrecio}
          </Text>
          <Text
            style={[styles.precio, styles.medida]}
            numberOfLines={1}
            aria-hidden
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onLayout={(e) => setAnchoNatural(e.nativeEvent.layout.width)}
          >
            {textoDelPrecio}
          </Text>
          {boton(1)}
        </View>

        <Text style={[styles.cantidad, { color: tinta }]}>{credits} Credits</Text>

        <View style={styles.regla}>
          {marcas.map((marca) => (
            <View key={marca} style={[styles.marca, { backgroundColor: tinta, opacity: marca <= dolares ? 1 : 0.14, height: marca === dolares ? 26 : 14 }]} />
          ))}
        </View>
        <View style={styles.extremos}>
          <Text style={[styles.extremo, { color: tenue }]}>{precio(regla.minUsd)}</Text>
          <Text style={[styles.extremo, { color: tenue }]}>{precio(regla.maxUsd)}</Text>
        </View>

        <Text style={[styles.tarifa, dir.texto, { color: tinta }]}>{t('credits.buyRate', { precio: formato.moneda(1, 'USD', { maximumFractionDigits: 0 }), cantidad: formato.numero(regla.creditsPerUsd) })}</Text>
        <Text style={[styles.lema, dir.texto, { color: tenue }]}>{t('weeai.theMotto')}</Text>
      </ScrollView>

      <View style={[styles.pie, { paddingBottom: insets.bottom + SPACING.md }]}>
        {!!aviso && (
          estadoDelCatalogo === 'error' ? (
            <TouchableOpacity onPress={onReintentar} accessibilityRole="button" hitSlop={6}>
              <Text style={[styles.aviso, dir.texto, styles.avisoEnlace, { color: tinta }]}>{aviso}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.aviso, dir.texto, { color: tenue }]} accessibilityLiveRegion="polite">{aviso}</Text>
          )
        )}
        <TouchableOpacity
          style={[styles.comprar, { backgroundColor: tinta, opacity: sePuedeComprar ? 1 : comprando ? 0.7 : 0.3 }]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ disabled: !sePuedeComprar, busy: comprando }}
          disabled={!sePuedeComprar}
          onPress={() => { if (sePuedeComprar && mostrado) onComprar({ amountUsd: dolares, displayed: mostrado, credits: creditsNumero }); }}
        >
          {comprando
            ? <ActivityIndicator size="small" color={papel} />
            : <Ionicons name="diamond-outline" size={19} color={papel} />}
          <Text style={[styles.comprarTexto, { color: papel }]} numberOfLines={1}>{t('credits.buyButton', { cantidad: credits, precio: precio(dolares) })}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const TAMANO_DEL_PRECIO = 66;
/** Ancho máximo de la compra (el mismo que el Boost): a 1440 los botones − y + no se van a los bordes de la pantalla. */
const ANCHO_MAXIMO = 640;

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  /* En tableta y escritorio la compra no se estira a todo el ancho: una columna del ancho de un teléfono grande, centrada. */
  contenido: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xl, width: '100%', maxWidth: ANCHO_MAXIMO, alignSelf: 'center' },
  saldo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: SPACING.lg },
  saldoTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  pregunta: { fontSize: 25, lineHeight: 31, fontWeight: FONT_WEIGHT.bold, textAlign: 'center', marginBottom: SPACING.xl },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  contador: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  precio: { flex: 1, fontSize: TAMANO_DEL_PRECIO, fontWeight: FONT_WEIGHT.bold, textAlign: 'center', letterSpacing: -2 },
  /* La copia que mide: fuera del flujo, sin flex, invisible y sin eventos. */
  medida: { position: 'absolute', flex: 0, opacity: 0, left: 0, top: 0, pointerEvents: 'none' },
  cantidad: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, textAlign: 'center', marginTop: SPACING.xs },
  regla: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 26, marginTop: SPACING.xl },
  marca: { width: 3, borderRadius: 2 },
  extremos: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xs },
  extremo: { fontSize: FONT_SIZE.xs },
  tarifa: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, textAlign: 'center', marginTop: SPACING.xl },
  lema: { fontSize: FONT_SIZE.xs, textAlign: 'center', marginTop: SPACING.xs },
  pie: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, width: '100%', maxWidth: ANCHO_MAXIMO, alignSelf: 'center' },
  aviso: { fontSize: FONT_SIZE.xs, textAlign: 'center', marginBottom: SPACING.sm, lineHeight: 17 },
  avisoEnlace: { textDecorationLine: 'underline' },
  comprar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: 17, borderRadius: BORDER_RADIUS.full },
  comprarTexto: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, flexShrink: 1 },
});

export default CompraPorImporte;
