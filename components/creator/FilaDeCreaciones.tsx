import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * UNA PIEZA DE LA GALERÍA, DIGA LO QUE DIGA SU ETIQUETA.
 *
 * Weë Studio etiqueta por tipo —imagen, video, voz, documento— y Weë Design por
 * clase de diseño —interior, arquitectura, mobiliario—, porque en cada sitio se
 * busca por una cosa distinta. Pero eso es lo ÚNICO distinto: debajo son la
 * misma lámina con la misma etiqueta encima y el mismo título debajo.
 *
 * Así que la etiqueta entra ya resuelta a una clave, y esta pieza no sabe de
 * qué catálogo viene ni tiene por qué saberlo.
 */
export interface CreacionEnLaFila {
  id: string;
  /** La clave de i18n de la etiqueta. Lo que se lee, se traduce. */
  claveTipo: string;
  /** El icono de la lámina, de la familia de Ionicons. */
  icono: string;
  /** Lo que escribió quien la creó. Contenido, no interfaz: no se traduce. */
  titulo: string;
  /** El color de la lámina mientras no haya un medio real que enseñar. */
  tono: string;
  /** Solo lo que dura algo: un video. Ya formateado. */
  duracion?: string;
}

interface Props {
  creaciones: readonly CreacionEnLaFila[];
  onVerTodas: () => void;
  /**
   * El botón de las opciones de una pieza. Sin él no se pinta: una galería que
   * todavía no puede hacer nada con una pieza no enseña un botón que no hace
   * nada.
   */
  onOpciones?: (id: string) => void;
  /** Lo que mide una pieza. Cada sitio tiene su proporción y se respeta. */
  ancho?: number;
  alto?: number;
}

/**
 * MIS CREACIONES, EN FILA.
 *
 * Al final de la portada, después de las puertas: primero se crea, luego se
 * mira lo hecho. Va en fila que se desliza y no en rejilla porque aquí no se
 * busca nada concreto —para eso está "Ver todas", que lleva a la rejilla de
 * verdad, `RejillaDeCreaciones`, la que enseña el material de la cuenta—, aquí
 * se echa un vistazo.
 *
 * ── Por qué una y no dos ────────────────────────────────────────────────────
 *
 * Había dos, `StudioCreations` y `DesignCreations`, y eran la misma fila escrita
 * dos veces: la misma cabecera con "Ver todas →", el mismo `ScrollView`
 * horizontal, la misma lámina redondeada con su etiqueta blanca abajo a la
 * izquierda y el mismo título de una línea. Lo único que de verdad se separaba
 * eran cuatro números y un botón. Cuatro números y un botón no justifican dos
 * componentes: justifican cuatro props.
 *
 * ── Y las láminas siguen lisas ──────────────────────────────────────────────
 *
 * Un color plano con el icono de su clase, porque todavía no hay nada generado
 * de verdad. Tienen la forma exacta que tendrán con contenido dentro, que es lo
 * que hace falta para juzgar si la galería funciona, sin fingir que una foto de
 * archivo es algo que alguien creó.
 */
const FilaDeCreaciones: React.FC<Props> = ({
  creaciones, onVerTodas, onOpciones, ancho = scale(132), alto = scale(150),
}) => {
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
        {creaciones.map((c) => (
          <View key={c.id} style={[styles.pieza, { width: ancho }]}>
            <View style={[styles.lamina, { height: alto, backgroundColor: c.tono }]}>
              <Ionicons name={c.icono as any} size={scale(30)} color="rgba(31, 41, 55, 0.35)" />

              {/* Los videos dicen cuánto duran. Lo demás no tiene duración que decir. */}
              {!!c.duracion && (
                <View style={styles.duracion}>
                  <Text style={styles.duracionTexto}>{c.duracion}</Text>
                </View>
              )}

              <View style={styles.sobreLamina}>
                <View style={styles.etiqueta}>
                  <Text style={styles.etiquetaTexto}>{t(c.claveTipo)}</Text>
                </View>
                {!!onOpciones && (
                  <TouchableOpacity
                    style={styles.opciones}
                    onPress={() => onOpciones(c.id)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={t('studio.creationOptions')}
                  >
                    <Ionicons name="ellipsis-horizontal" size={scale(15)} color="#1F2937" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {/* El título es de quien lo creó: contenido, no interfaz. */}
            <Text style={[styles.titulo, { color: theme.colors.textSecondary }]} numberOfLines={1}>{c.titulo}</Text>
          </View>
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
  pieza: { gap: SPACING.sm },
  lamina: {
    width: '100%',
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

export default FilaDeCreaciones;
