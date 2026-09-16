import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { PUERTAS_DE_STUDIO, AreaDeStudio } from '../../constants/studioTools';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
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

interface GridProps {
  onAbrir: (area: AreaDeStudio) => void;
  /** Dos en móvil, tres cuando hay sitio. Lo decide quien conoce el ancho. */
  porFila: number;
}

/**
 * LAS SEIS PUERTAS.
 *
 * Debajo del compositor, no encima: quien ya sabe lo que quiere lo escribe
 * arriba; esto es para quien prefiere entrar por el material —una imagen, un
 * video, un texto— en vez de por la idea. Son dos caminos al mismo sitio y el
 * orden de la pantalla dice cuál es el principal.
 *
 * Seis, y siempre seis. La lista sale de `PUERTAS_DE_STUDIO`, que es la única
 * que las conoce; añadir una séptima es una línea allí y nada aquí.
 */
const StudioToolGrid: React.FC<GridProps> = ({ onAbrir, porFila }) => {
  const t = useT();
  return (
    <View style={styles.rejilla}>
      {PUERTAS_DE_STUDIO.map((puerta) => (
        <StudioToolCard
          key={puerta.id}
          icono={puerta.icono}
          /* `marca` para lo que no se traduce —Writer—; `clave` para lo demás. */
          titulo={puerta.marca ?? t(puerta.clave as string)}
          pista={t(puerta.claveHint)}
          porFila={porFila}
          onPress={() => onAbrir(puerta.id)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  rejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg - SPACING.xs,
  },
  /*
   * El ancho lo pone la rejilla en porcentaje y el aire lo pone un margen por
   * dentro: así las tarjetas se reparten el ancho exacto sin cuentas de huecos.
   */
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

export default StudioToolGrid;
