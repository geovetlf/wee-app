import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { TARJETAS_DE_CHEF, TarjetaDeChef } from '../../constants/chefTools';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

interface Props {
  onElegir: (tarjeta: TarjetaDeChef) => void;
  /** Cuántas caben por fila. Lo decide quien conoce el ancho. */
  porFila: number;
}

/**
 * LAS OCHO FUNCIONES DE WEË CHEF.
 *
 * Debajo de la caja, no encima: quien ya sabe lo que quiere lo escribe arriba;
 * esto es para quien prefiere entrar por lo que necesita —lo que hay en la
 * nevera, un menú, una lista de compras— en vez de por la idea. Dos caminos al
 * mismo sitio, y el orden de la pantalla dice cuál es el principal.
 *
 * ── Icono a la izquierda, y negro ────────────────────────────────────────────
 *
 * Un trazo fino del color del texto, sin círculo de fondo y sin emojis. Ocho
 * iconos de colores convertirían la rejilla en un semáforo y harían que el
 * amarillo de Weë —que significa crear— dejara de significar nada. A la
 * izquierda y no arriba porque aquí lo que manda es el nombre de la función: el
 * icono acompaña, no presenta.
 *
 * La lista sale de `TARJETAS_DE_CHEF`, que es la única que la conoce: cambiar el
 * orden o añadir una novena es una línea allí y nada aquí.
 */
const ChefAcciones: React.FC<Props> = ({ onElegir, porFila }) => {
  const { theme } = useTheme();
  const t = useT();

  return (
    <View style={styles.rejilla}>
      {TARJETAS_DE_CHEF.map((tarjeta) => (
        /*
         * El ancho va en el HUECO, no en la tarjeta: en React Native un
         * porcentaje y un margen no se restan, se suman, y la fila se desborda.
         */
        <View key={tarjeta.id} style={{ width: `${100 / porFila}%` as any, padding: SPACING.xs }}>
          <TouchableOpacity
            style={[
              styles.tarjeta,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              isWeb && ({ cursor: 'pointer' } as any),
            ]}
            onPress={() => onElegir(tarjeta)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t(tarjeta.claveTitulo)}
          >
            <View style={styles.arriba}>
              <Ionicons name={tarjeta.icono as any} size={scale(22)} color={theme.colors.text} />
              <Text
                style={[styles.titulo, { color: theme.colors.text }]}
                numberOfLines={2}
              >
                {t(tarjeta.claveTitulo)}
              </Text>
            </View>
            <Text style={[styles.pista, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {t(tarjeta.claveSubtitulo)}
            </Text>
          </TouchableOpacity>
        </View>
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
  tarjeta: {
    borderRadius: scale(20),
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.lg,
    gap: SPACING.sm,
    minHeight: scale(118),
    justifyContent: 'space-between',
    /* Sombra muy suave: levanta la tarjeta sin dibujar otra caja encima. */
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: scale(10),
    shadowOffset: { width: 0, height: scale(3) },
    elevation: 1,
  },
  /*
   * El icono y el nombre en la misma línea, y el icono arriba del todo: cuando
   * el nombre ocupa dos líneas —"Información nutricional"— el icono se queda
   * junto a la primera, que es donde se lee.
   */
  arriba: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  titulo: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: scale(20),
    flexShrink: 1,
  },
  pista: { fontSize: FONT_SIZE.xs, lineHeight: scale(16) },
});

export default ChefAcciones;
