import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, TextStyle, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../hooks/useWallet';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { MARCA } from '../constants/marca';
import { RellenoDeMarca } from './GradienteDeMarca';

interface CreditsPillProps {
  /** Versión compacta para el header (solo número). */
  compact?: boolean;
  /** Sobre fondos oscuros/transparentes (héroe, Weëls). */
  light?: boolean;
  onPress?: () => void;
}

/**
 * LA MARCA DE LOS CREDITS: "ẄC".
 *
 * Decisión del usuario (2026-09-15). Donde había una tarjeta de crédito —un
 * emoji del sistema, distinto en cada teléfono y que además hablaba de dinero de
 * verdad— va la marca de la casa: la Ẅ de Weë y la C de Credits.
 *
 * Es UNA pieza y la usan los tres sitios donde el saldo se nombra: la píldora de
 * Weë AI, la fila del menú ☰ y la de la barra de escritorio. Así no puede pasar
 * que una diga ẄC y otra siga con la tarjeta.
 *
 * El color se lo pone quien la pinta, y por eso funciona igual con el Perfil
 * Real —negra sobre blanco— y con el Perfil Weë, donde el menú es oscuro y lo
 * negro no se leería: lo que manda es el color del texto de su fila.
 */
export const MarcaDeCredits: React.FC<{ size?: number; color: string; style?: StyleProp<TextStyle> }> = ({ size, color, style }) => (
  <Text
    style={[
      {
        fontSize: size ?? FONT_SIZE.xs,
        fontWeight: FONT_WEIGHT.bold,
        /* Apretadas, para que se lean como una marca y no como dos iniciales sueltas. */
        letterSpacing: scale(-0.3),
        color,
      },
      style,
    ]}
  >
    ẄC
  </Text>
);

/**
 * LA PILA DE MONEDAS DE LA PÍLDORA, como en las referencias de la demo YC (2026-11-04).
 *
 * Tres monedas doradas apiladas, dibujadas con vistas —no un emoji, que cambia en cada
 * teléfono y que el dueño ya retiró en 2026-09-15—. Va DELANTE de la marca ẄC, que sigue
 * siendo el nombre de la moneda: la pila es solo el dibujo. Es presentación pura: no
 * sabe nada del saldo. La usan la píldora y la tarjeta de Credits de la barra de Weë AI
 * (antes un 💳, que el dueño retiró de la marca en 2026-09-15).
 */
export const PilaDeMonedas: React.FC = () => (
  <View style={styles.pila} accessible={false}>
    {[0, 1, 2].map((i) => (
      <View key={i} style={[styles.moneda, i > 0 && styles.monedaApilada]} />
    ))}
  </View>
);

/**
 * Saldo de Credits siempre visible: "ẄC 250 Credits".
 * Toca para ir a la tienda de Credits.
 *
 * ── EL SALDO ES DE LA CUENTA, NO DEL PERFIL ──────────────────────────────────
 *
 * `useWallet()` se llama SIN uid a propósito: el saldo sale siempre del uid de
 * Firebase Auth, que es la cuenta. Cambiar entre el Perfil Real y el Perfil Weë
 * no cambia el número, porque no hay dos monederos —hay uno y dos caras—. Antes
 * se le pasaba el uid del perfil activo; el hook lo ignoraba (la cuenta manda),
 * así que era una indirección que solo podía confundir a quien la leyera.
 */
const CreditsPill: React.FC<CreditsPillProps> = ({ compact = false, light = false, onPress }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { balance } = useWallet();
  /* En la cabecera compacta de un teléfono estrecho (< 360) la pila de monedas no cabe junto al título (Weë Brain a 320): se queda la marca ẄC. */
  const { width: anchoDePantalla } = useWindowDimensions();
  const conMonedas = !compact || anchoDePantalla >= 360;

  if (!user) return null;

  const handlePress = () => {
    if (onPress) return onPress();
    navigation.navigate('CreditStore' as never);
  };

  const value = balance === null ? '…' : formato.numero(balance);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t('credits.youHaveLabel', { saldo: value })}
      style={[
        styles.pill,
        {
          /*
           * El degradado de marca (2026-11-05): amarillo dorado → naranja, con el texto oscuro encima,
           * igual en el Perfil Real y en el Weë. Sobre fondos oscuros/transparentes (`light`) sigue el velo blanco.
           */
          backgroundColor: light ? 'rgba(255,255,255,0.15)' : MARCA.primario,
          borderColor: light ? 'rgba(255,255,255,0.3)' : MARCA.velo(0),
        },
      ]}
    >
      {/*
        LA MARCA DE LOS CREDITS: "ẄC", NO UN EMOJI.
        Decisión del usuario (2026-09-15). Donde había una tarjeta de crédito
        —un dibujo del sistema, distinto en cada teléfono y que además hablaba de
        dinero— va ahora la marca de la casa: la Ẅ de Weë y la C de Credits. Va
        en negro, del mismo color que el número, porque es parte del mismo dato y
        no un adorno al lado.
      */}
      {!light && <RellenoDeMarca radio={BORDER_RADIUS.full} />}
      {conMonedas && <PilaDeMonedas />}
      <MarcaDeCredits color={light ? 'white' : MARCA.sobrePrimario} />
      <View style={styles.textRow}>
        <Text style={[styles.value, { color: light ? 'white' : MARCA.sobrePrimario }]}>{value}</Text>
        {!compact && (
          <Text style={[styles.label, { color: light ? 'rgba(255,255,255,0.85)' : 'rgba(31, 41, 55, 0.78)' }]}>Credits</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    height: scale(32),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: scale(3),
  },
  value: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  pila: {
    justifyContent: 'center',
    marginEnd: scale(1),
  },
  moneda: {
    width: scale(15),
    height: scale(6.5),
    borderRadius: scale(4),
    /* Sobre el degradado: monedas claras con canto naranja hondo, para que se lean encima del amarillo. */
    backgroundColor: '#FFE9A8',
    borderWidth: 1,
    borderColor: MARCA.primarioTexto,
  },
  monedaApilada: {
    marginTop: -scale(2),
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default CreditsPill;

/*
 * QUIÉN ENSEÑA EL SALDO Y QUIÉN SE CALLA.
 *
 * Dentro de Weë AI el saldo puede llegar por dos caminos —el marco de la
 * experiencia o la cabecera de la sección—, y cuando coinciden saldría dos veces
 * en el mismo golpe de vista. Quién lo enseña lo decide `ConMarcoDeSeccion`
 * (`components/creator/MarcoDeSeccion.tsx`), junto con lo demás que la cabecera
 * necesita saber del marco que la envuelve.
 */
