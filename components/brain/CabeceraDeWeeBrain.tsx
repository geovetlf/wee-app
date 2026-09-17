import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { CEREBRO_DE_WEE } from './SistemaDeWeeBrain';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import CreditsPill from '../CreditsPill';
import { useMarcoDeSeccion } from '../creator/MarcoDeSeccion';
import { useAlturaDelTeclado } from '../EspacioDeEscritura';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * LA CABECERA DE WEË BRAIN.
 *
 * ── Por qué esta y no la de todas ────────────────────────────────────────────
 *
 * Las demás secciones llevan `CabeceraDeSeccion`: la W a la izquierda, el
 * nombre a su lado y el lema centrado con la segunda mitad en amarillo. Weë
 * Brain lleva otra, la de su referencia de diseño (decisión del usuario,
 * 2026-09-16): el nombre CENTRADO, con "Brain" en amarillo, y debajo una línea
 * que dice qué es. El amarillo, que en las demás vive en el lema, aquí vive en
 * el nombre; y el lema se queda entero en oscuro para que no haya dos cosas
 * gritando en la misma pantalla.
 *
 * Es una pieza aparte a propósito: `CabeceraDeSeccion` la usan siete secciones
 * y tocarla para que Weë Brain se parezca a su referencia cambiaría las otras
 * seis, que están aprobadas.
 *
 * ── Cómo se centra de verdad ─────────────────────────────────────────────────
 *
 * La flecha y el saldo van sueltos, pegados a cada borde, y el nombre ocupa la
 * fila entera. Así el nombre queda en el centro de la PANTALLA y no en el hueco
 * que le dejan los dos, que es lo que pasa cuando se ponen en fila y uno mide
 * más que el otro. El aire de los lados le impide meterse debajo de ninguno.
 */
interface Props {
  /** Qué hace el volver. Por defecto: atrás si hay atrás, y si no al Home. */
  onVolver?: () => void;
}

const CabeceraDeWeeBrain: React.FC<Props> = ({ onVolver }) => {
  const { theme } = useTheme();
  const t = useT();
  const navigation = useNavigation<any>();
  const marco = useMarcoDeSeccion();
  /* Mientras se escribe, la presentación deja su sitio al cerebro. */
  const conTeclado = useAlturaDelTeclado() > 0;

  const volver = onVolver || (() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')));

  return (
    /* El aire que mete el marco se devuelve aquí: la cabecera es de borde a borde. */
    <View style={[styles.bloque, marco.aireLateral ? { marginHorizontal: -marco.aireLateral } : null]}>
      <View style={styles.identidad}>
        <TouchableOpacity
          onPress={volver}
          style={[styles.volver, isWeb && ({ cursor: 'pointer' } as any)]}
          activeOpacity={0.7}
          hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={scale(24)} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.centro} pointerEvents="none">
          <View style={styles.fila}>
            {/*
              El mismo cerebro que el del centro, en pequeño: uno solo en toda
              la pantalla. La caja recorta un poco el aire que trae la imagen
              alrededor, porque a este tamaño ese aire se comería el dibujo.
            */}
            <View style={styles.insignia}>
              <Image source={CEREBRO_DE_WEE} style={styles.insigniaDibujo} contentFit="contain" transition={0} accessible={false} />
            </View>
            <Text style={[styles.nombre, { color: theme.colors.text }]} numberOfLines={1}>
              <Text>Weë </Text>
              <Text style={{ color: theme.colors.accent }}>Brain</Text>
            </Text>
          </View>
          <Text style={[styles.tagline, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {t('brain.tagline')}
          </Text>
        </View>

        {/*
          El saldo sale UNA vez: si el marco ya lo enseña —la barra lateral del
          escritorio—, aquí se calla. Y sin sesión no se dibuja solo.
        */}
        {!marco.saldoALaVista && (
          <View style={styles.saldo}>
            <CreditsPill compact />
          </View>
        )}
      </View>

      {/*
        LA PRESENTACIÓN, Y POR QUÉ SE VA CON EL TECLADO.
        El lema entero en oscuro —el amarillo ya está en el nombre— y debajo,
        en gris, lo que se puede esperar de esta pantalla. Centrado, como todo
        lo demás: Weë Brain no tiene lados, tiene un centro.

        Es un saludo: dice a qué has entrado. En cuanto se abre el teclado ya no
        estás entrando, estás escribiendo, y esos dos renglones ocupan justo el
        sitio que le falta al cerebro para caber entero (decisión del usuario,
        2026-09-16; medido en el teléfono: faltaban ~170 puntos y esto da ~120).
        Al cerrar el teclado vuelve. El nombre y el saldo no se van nunca.
      */}
      {!conTeclado && (
        <View style={styles.presentacion}>
          <Text style={[styles.lema, { color: theme.colors.text }]}>{t('brain.slogan')}</Text>
          <Text style={[styles.descripcion, { color: theme.colors.textSecondary }]}>{t('brain.description')}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  identidad: {
    minHeight: scale(52),
    justifyContent: 'center',
  },
  /*
   * Se dibuja en 32 y se toca en 44: los doce que faltan los pone el `hitSlop`.
   * Suelto a la izquierda, para que no le quite el centro al nombre.
   */
  volver: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 32,
    height: scale(52),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  saldo: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: scale(52),
    justifyContent: 'center',
    zIndex: 2,
  },
  /*
   * El aire de los lados es el sitio de la flecha y del saldo. Lo mismo a los
   * dos lados: si fuera distinto, el nombre dejaría de estar en el centro.
   */
  centro: {
    alignItems: 'center',
    paddingHorizontal: scale(46),
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  nombre: {
    fontSize: scale(25),
    lineHeight: scale(31),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: scale(-0.6),
    textAlign: 'center',
    flexShrink: 1,
  },
  /*
   * Una insignia al lado del nombre, no un cartel encima. La caja mide 30 y el
   * dibujo 46: la imagen trae bastante aire alrededor del cerebro —su
   * resplandor y su aro—, y a este tamaño hay que acercarse para que se
   * reconozca. Lo que sobra se queda fuera de la caja (`overflow: hidden`).
   */
  insignia: {
    width: scale(30),
    height: scale(30),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  insigniaDibujo: {
    width: scale(46),
    height: scale(46),
  },
  tagline: {
    marginTop: scale(2),
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
  },
  presentacion: {
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.lg,
  },
  lema: {
    fontSize: scale(22),
    lineHeight: scale(28),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: scale(-0.4),
    textAlign: 'center',
  },
  descripcion: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.base,
    lineHeight: scale(21),
    textAlign: 'center',
  },
});

export default CabeceraDeWeeBrain;
