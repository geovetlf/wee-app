import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../hooks/useWallet';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

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
          backgroundColor: light ? 'rgba(255,255,255,0.15)' : theme.colors.card,
          borderColor: light ? 'rgba(255,255,255,0.3)' : theme.colors.border,
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
      <MarcaDeCredits color={light ? 'white' : theme.colors.text} />
      <View style={styles.textRow}>
        <Text style={[styles.value, { color: light ? 'white' : theme.colors.text }]}>{value}</Text>
        {!compact && (
          <Text style={[styles.label, { color: light ? 'rgba(255,255,255,0.85)' : theme.colors.textSecondary }]}>Credits</Text>
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
