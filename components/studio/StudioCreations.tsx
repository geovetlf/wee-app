import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { CREACIONES_DE_MUESTRA, CreacionDeMuestra, CLAVE_DEL_TIPO, ICONO_DEL_TIPO } from '../../constants/studioMocks';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * UNA CREACIÓN, EN LA GALERÍA.
 *
 * Lámina arriba, y sobre ella dos cosas: de qué tipo es y el botón de sus
 * opciones. El tipo va encima y no debajo porque en una fila con cuatro piezas
 * distintas lo primero que se busca es "cuál era el video".
 *
 * Mientras no haya nada generado de verdad la lámina es un color liso con el
 * icono de su tipo. No es un hueco vacío ni un cartel de "sin datos": tiene
 * exactamente la forma que tendrá con contenido dentro, que es lo que hace
 * falta para juzgar si la galería funciona.
 */
export const CreationCard: React.FC<{ creacion: CreacionDeMuestra; onOpciones: () => void }> = ({ creacion, onOpciones }) => {
  const { theme } = useTheme();
  const t = useT();

  return (
    <View style={styles.pieza}>
      <View style={[styles.lamina, { backgroundColor: creacion.tono }]}>
        <Ionicons
          name={ICONO_DEL_TIPO[creacion.tipo] as any}
          size={scale(30)}
          color="rgba(31, 41, 55, 0.35)"
        />

        {/* Los videos dicen cuánto duran. Lo demás no tiene duración que decir. */}
        {creacion.duracion && (
          <View style={styles.duracion}>
            <Text style={styles.duracionTexto}>{creacion.duracion}</Text>
          </View>
        )}

        <View style={styles.sobreLamina}>
          <View style={styles.etiqueta}>
            <Text style={styles.etiquetaTexto}>{t(CLAVE_DEL_TIPO[creacion.tipo])}</Text>
          </View>
          <TouchableOpacity
            style={styles.opciones}
            onPress={onOpciones}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('studio.creationOptions')}
          >
            <Ionicons name="ellipsis-horizontal" size={scale(15)} color="#1F2937" />
          </TouchableOpacity>
        </View>
      </View>
      {/*
        El título es de quien creó la pieza, así que no pasa por el traductor:
        es contenido, no interfaz.
      */}
      <Text style={[styles.titulo, { color: theme.colors.textSecondary }]} numberOfLines={1}>{creacion.titulo}</Text>
    </View>
  );
};

/**
 * MIS CREACIONES.
 *
 * Al final del Studio, después de las herramientas: primero se crea, luego se
 * mira lo hecho. Va en fila que se desliza y no en rejilla porque aquí no se
 * busca nada concreto —para eso está "Ver todas"—, se echa un vistazo.
 */
const StudioCreations: React.FC<{ onVerTodas: () => void; onOpciones: (id: string) => void }> = ({ onVerTodas, onOpciones }) => {
  const { theme } = useTheme();
  const t = useT();

  return (
    <View style={styles.bloque}>
      <View style={styles.cabecera}>
        <Text style={[styles.seccion, { color: theme.colors.text }]}>{t('studio.creationsTitle')}</Text>
        <TouchableOpacity
          onPress={onVerTodas}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          style={isWeb ? ({ cursor: 'pointer' } as any) : undefined}
        >
          <Text style={[styles.verTodas, { color: theme.colors.textSecondary }]}>{t('studio.seeAll')} →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.fila}
      >
        {CREACIONES_DE_MUESTRA.map((c) => (
          <CreationCard key={c.id} creacion={c} onOpciones={() => onOpciones(c.id)} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.md },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
  },
  seccion: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  verTodas: { fontSize: FONT_SIZE.sm },
  fila: { paddingHorizontal: SPACING.xl, gap: SPACING.md },
  pieza: { width: scale(132), gap: SPACING.sm },
  lamina: {
    width: '100%',
    height: scale(150),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sobreLamina: {
    position: 'absolute',
    left: SPACING.sm,
    right: SPACING.sm,
    bottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  etiqueta: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.full,
  },
  etiquetaTexto: { fontSize: scale(11), fontWeight: FONT_WEIGHT.medium, color: '#1F2937' },
  opciones: {
    width: scale(24),
    height: scale(24),
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  duracion: {
    position: 'absolute',
    right: SPACING.sm,
    top: SPACING.sm,
    backgroundColor: 'rgba(31, 41, 55, 0.75)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(2),
    borderRadius: BORDER_RADIUS.sm,
  },
  duracionTexto: { fontSize: scale(11), color: '#FFFFFF', fontWeight: FONT_WEIGHT.medium },
  titulo: { fontSize: FONT_SIZE.xs, paddingHorizontal: scale(2) },
});

export default StudioCreations;
