import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { MODULOS_DE_BUSINESS, Modulo } from '../../constants/businessModules';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

interface Props {
  onAbrir: (modulo: Modulo) => void;
  /** Cuántos caben por fila. Lo decide quien conoce el ancho. */
  porFila: number;
}

/**
 * LOS OCHO MÓDULOS: LA NAVEGACIÓN DE WEË BUSINESS.
 *
 * Es lo primero que hay bajo la cabecera, y es lo único: las funciones de cada
 * módulo viven DENTRO de él y no todas a la vez en la portada. Ocho puertas se
 * recorren de un vistazo; treinta botones son un panel de control, que es justo
 * lo que Weë Business no es.
 *
 * Icono a la izquierda, nombre y debajo qué hay dentro en dos palabras. El icono
 * va del color del texto: ocho iconos de ocho colores convertirían la rejilla en
 * un semáforo y harían que el amarillo de Weë —que significa crear— dejara de
 * significar nada. Es la misma tarjeta de Weë Chef y Weë Studio.
 */
const BusinessModulos: React.FC<Props> = ({ onAbrir, porFila }) => {
  const { theme } = useTheme();
  const t = useT();

  return (
    <View style={styles.rejilla}>
      {MODULOS_DE_BUSINESS.map((modulo) => (
        /*
         * El ancho va en el HUECO, no en la tarjeta: en React Native un
         * porcentaje y un margen no se restan, se suman, y la fila se desborda.
         */
        <View key={modulo.id} style={{ width: `${100 / porFila}%` as any, padding: SPACING.xs }}>
          <TouchableOpacity
            style={[
              styles.tarjeta,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              isWeb && ({ cursor: 'pointer' } as any),
            ]}
            onPress={() => onAbrir(modulo)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={modulo.nombre}
          >
            <View style={styles.arriba}>
              <Ionicons name={modulo.icono as any} size={scale(22)} color={theme.colors.text} />
              {/* El nombre es de producto y no pasa por el traductor. */}
              <Text style={[styles.titulo, { color: theme.colors.text }]} numberOfLines={2}>{modulo.nombre}</Text>
            </View>
            <Text style={[styles.pista, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {t(modulo.claveHint)}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', margin: -SPACING.xs },
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
  arriba: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  titulo: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: scale(20),
    flexShrink: 1,
  },
  pista: { fontSize: FONT_SIZE.xs, lineHeight: scale(16) },
});

export default BusinessModulos;
