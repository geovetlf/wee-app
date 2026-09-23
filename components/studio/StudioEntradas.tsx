import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { ENTRADAS_PRINCIPALES, ENTRADAS_DE_EXPLORAR, EntradaDeStudio } from '../../constants/studioExperiences';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

interface CardProps {
  icono: string;
  titulo: string;
  pista: string;
  onPress: () => void;
  /** Cuántas caben por fila. Lo decide la rejilla, no la tarjeta. */
  porFila: number;
}

/**
 * UNA PUERTA DEL STUDIO.
 *
 * Icono arriba, nombre, y debajo qué hay dentro en dos palabras. El chevrón de
 * la esquina no es decoración: dice que esto LLEVA a algún sitio, que es lo que
 * separa una tarjeta de un botón de acción.
 *
 * El icono va del color del texto. Seis iconos de seis colores convertirían la
 * rejilla en un semáforo y harían que el amarillo de Weë —que significa crear—
 * dejara de significar nada.
 */
export const StudioToolCard: React.FC<CardProps> = ({ icono, titulo, pista, onPress, porFila }) => {
  const { theme } = useTheme();
  /*
   * El ancho va en el HUECO, no en la tarjeta: en React Native un porcentaje y
   * un margen no se restan, se suman, y la fila se desbordaba. El hueco se
   * lleva el porcentaje y el aire por dentro; la tarjeta lo rellena entero.
   */
  return (
    <View style={{ width: `${100 / porFila}%` as any, padding: SPACING.xs }}>
    <TouchableOpacity
      style={[
        styles.tarjeta,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        isWeb && ({ cursor: 'pointer' } as any),
      ]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={titulo}
    >
      <View style={styles.tarjetaArriba}>
        <Ionicons name={icono as any} size={scale(26)} color={theme.colors.text} />
      </View>
      <View style={styles.tarjetaTexto}>
        <View style={styles.tarjetaFila}>
          {/*
            En Android el texto sale un 11 % mayor que en web —`scale()` lo deja
            al 100 % allí y al 90 % aquí—, y en un teléfono de 360 dp "Más
            herramientas" no cabía junto a la flecha y se cortaba con puntos.
            `adjustsFontSizeToFit` lo encoge solo lo justo y SOLO cuando no cabe:
            las demás tarjetas no cambian, y en web no hace nada porque ya cabe.
          */}
          <Text
            style={[styles.tarjetaTitulo, { color: theme.colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {titulo}
          </Text>
          <Ionicons name="chevron-forward" size={scale(15)} color={theme.colors.textSecondary} />
        </View>
        <Text style={[styles.tarjetaPista, { color: theme.colors.textSecondary }]} numberOfLines={2}>{pista}</Text>
      </View>
    </TouchableOpacity>
    </View>
  );
};

interface Props {
  onAbrir: (entrada: EntradaDeStudio) => void;
  /** Dos en el teléfono, cuatro cuando hay sitio. Lo decide quien sabe el ancho. */
  porFila: number;
}

/**
 * POR DÓNDE SE EMPIEZA, Y CUÁNTO PESA CADA COSA.
 *
 * Cuatro entradas grandes y cinco pequeñas, y esa diferencia de tamaño ES la
 * jerarquía: casi todo lo que alguien quiere hacer en Weë Studio es una imagen,
 * un vídeo, un texto o una voz. Lo demás existe, se llega, y no compite.
 *
 * ── Por qué Explorar no son tarjetas ────────────────────────────────────────
 *
 * Porque serían nueve tarjetas, y nueve tarjetas no tienen jerarquía: tienen
 * un catálogo. En cuanto la primera pantalla se lee como un catálogo, la
 * pregunta deja de ser «¿qué quiero crear?» y pasa a ser «¿cuál de estos
 * botones es el correcto?», que es exactamente la pregunta que el Studio no
 * debe provocar.
 *
 * Así que Explorar es una fila de píldoras: se ve, se lee de un vistazo, y no
 * le quita el sitio a la caja donde se escribe, que es lo primero de todo.
 *
 * ── Y lo que NO está aquí ───────────────────────────────────────────────────
 *
 * Weë Travel, Weë Chef, Weë Design, Weë Business y Weë Music. No porque no
 * quepan: porque son otros lugares de trabajo. Ponerlos en la portada del
 * Studio diría que el Studio los contiene, y lo que haría de verdad es que
 * nadie supiera dónde está.
 */
const StudioEntradas: React.FC<Props> = ({ onAbrir, porFila }) => {
  const { theme } = useTheme();
  const t = useT();

  return (
    <View style={styles.bloque}>
      <View style={styles.rejilla}>
        {ENTRADAS_PRINCIPALES.map((entrada) => (
          <StudioToolCard
            key={entrada.id}
            icono={entrada.icono}
            /* `marca` para lo que no se traduce; `clave` para lo demás. */
            titulo={entrada.marca ?? t(entrada.clave as string)}
            pista={t(entrada.claveHint)}
            porFila={porFila}
            onPress={() => onAbrir(entrada.id)}
          />
        ))}
      </View>

      <View style={styles.explorar}>
        <Text style={[styles.explorarTitulo, { color: theme.colors.textSecondary }]}>{t('studio.exploreTitle')}</Text>
        <View style={styles.pildoras}>
          {ENTRADAS_DE_EXPLORAR.map((entrada) => {
            const nombre = entrada.marca ?? t(entrada.clave as string);
            return (
              <TouchableOpacity
                key={entrada.id}
                style={[
                  styles.pildora,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  isWeb && ({ cursor: 'pointer' } as any),
                ]}
                onPress={() => onAbrir(entrada.id)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={nombre}
              >
                <Ionicons name={entrada.icono as any} size={scale(15)} color={theme.colors.textSecondary} />
                <Text style={[styles.pildoraTexto, { color: theme.colors.text }]}>{nombre}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.xl },
  rejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg - SPACING.xs,
  },
  explorar: { gap: SPACING.md, paddingHorizontal: SPACING.xl },
  explorarTitulo: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    textTransform: 'uppercase',
    letterSpacing: scale(0.6),
  },
  pildoras: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  pildora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + scale(1),
    paddingHorizontal: SPACING.md,
    /* 38 de alto: un dedo no encoge en un teléfono pequeño, así que no lleva `scale()`. */
    paddingVertical: SPACING.sm + scale(1),
    minHeight: 38,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pildoraTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },

  tarjeta: {
    borderRadius: scale(20),
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.lg,
    gap: SPACING.md,
    minHeight: scale(132),
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: scale(10),
    shadowOffset: { width: 0, height: scale(3) },
    elevation: 1,
  },
  tarjetaArriba: { flexDirection: 'row' },
  tarjetaTexto: { gap: scale(2) },
  tarjetaFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.xs },
  tarjetaTitulo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, flexShrink: 1 },
  tarjetaPista: { fontSize: FONT_SIZE.xs, lineHeight: scale(16) },
});

export default StudioEntradas;
