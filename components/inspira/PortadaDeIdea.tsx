import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Receta, TONO_DE_CATEGORIA } from '../../constants/inspiracion';
import { SPACING, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/**
 * LA PORTADA DE UNA IDEA.
 *
 * No es una foto: Weë no tiene una imagen que pueda pasar por el resultado de
 * esta receta, y enseñar una de ejemplo como si lo fuera sería mentir. Es el tono
 * de su categoría, el icono de lo que se hace y, en las de vídeo, el formato: lo
 * que la persona va a obtener, dicho sin prometer un fotograma.
 */
const PortadaDeIdea: React.FC<{ receta: Receta; alto: number; estilo?: StyleProp<ViewStyle>; etiqueta?: string }> = ({ receta, alto, estilo, etiqueta }) => {
  const [desde, hasta] = TONO_DE_CATEGORIA[receta.categoria];
  return (
    <LinearGradient
      colors={[desde, hasta]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.portada, { height: alto }, estilo]}
    >
      <Ionicons name={receta.icono as any} size={Math.round(alto * 0.36)} color="rgba(255,255,255,0.85)" />
      <View style={styles.brillo} pointerEvents="none" />
      {!!receta.ajustes?.formato && (
        <View style={styles.formato}>
          <Text style={styles.formatoTexto}>{receta.ajustes.formato}</Text>
        </View>
      )}
      {!!etiqueta && (
        <View style={styles.etiqueta}>
          <Text style={styles.etiquetaTexto} numberOfLines={1}>{etiqueta}</Text>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  portada: { borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  brillo: {
    position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(245, 183, 49, 0.14)',
  },
  formato: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.45)',
  },
  formatoTexto: { color: '#FFFFFF', fontSize: scale(10), fontWeight: FONT_WEIGHT.semibold as any },
  etiqueta: {
    position: 'absolute', bottom: SPACING.sm, left: SPACING.sm, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.5)', maxWidth: '85%',
  },
  etiquetaTexto: { color: '#FFFFFF', fontSize: scale(10), fontWeight: FONT_WEIGHT.semibold as any },
});

export default PortadaDeIdea;
