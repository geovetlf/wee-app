import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/** Quieto no se ve nada; creando y listo son los dos estados que se cuentan. */
export type EstadoDeCreacion = 'quieto' | 'creando' | 'listo';

interface Props {
  estado: EstadoDeCreacion;
  /**
   * A qué altura flota. Lo calcula quien la monta, porque depende de su barra y
   * de si el teclado está abierto: el aviso sube con el teclado y no se queda
   * nunca detrás.
   */
  bottom: number;
  onCerrar: () => void;
  /**
   * La línea pequeña de debajo de "Creación lista". Hoy dice que todavía no hay
   * nada generado de verdad; el día que lo haya, la sección que ya genere no la
   * pasa y el aviso deja de darla solo.
   */
  clavePista?: string | null;
}

/**
 * "CREANDO…" Y "CREACIÓN LISTA", UNA SOLA VEZ.
 *
 * Estaba escrito dos veces, copiado renglón por renglón en Weë Studio y en Weë
 * Design: los mismos dos iconos, el mismo botón de cerrar, las mismas sombras y
 * el mismo `bottom` con el teclado sumado. Dos copias de lo mismo no son dos
 * decisiones, son una decisión y una que se quedará atrás: el día que el aviso
 * tenga que decir algo más —cuánto costó, qué se creó, dónde verlo— habría que
 * acordarse de los dos sitios, y no hay quien se acuerde.
 *
 * ── Y dice la verdad sobre lo que hay ───────────────────────────────────────
 *
 * "Esto es una demostración: todavía no hay nada generado de verdad." Weë Studio
 * y Weë Design todavía no crean nada —su botón enciende un temporizador— y el
 * aviso lo dice en voz alta en vez de hacer como que sí. Cuando una sección se
 * conecte de verdad, pasa `clavePista={null}` y la línea desaparece; lo que no
 * se hace nunca es quitarla antes de que sea cierto.
 */
const AvisoDeCreacion: React.FC<Props> = ({ estado, bottom, onCerrar, clavePista = 'studio.readyHint' }) => {
  const { theme } = useTheme();
  const t = useT();

  if (estado === 'quieto') return null;

  return (
    <View style={[styles.aviso, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, bottom }]}>
      {estado === 'creando' ? (
        <>
          <Ionicons name="sparkles" size={scale(18)} color={theme.colors.accentDark} />
          <Text style={[styles.avisoTexto, { color: theme.colors.text }]}>{t('studio.creating')}</Text>
        </>
      ) : (
        <>
          <Ionicons name="checkmark-circle" size={scale(18)} color={theme.colors.success} />
          <View style={styles.avisoCuerpo}>
            <Text style={[styles.avisoTexto, { color: theme.colors.text }]}>{t('studio.ready')}</Text>
            {!!clavePista && (
              <Text style={[styles.avisoPista, { color: theme.colors.textSecondary }]}>{t(clavePista)}</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={onCerrar}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            style={isWeb ? ({ cursor: 'pointer' } as any) : undefined}
          >
            <Text style={[styles.avisoCerrar, { color: theme.colors.accentDark }]}>{t('studio.dismiss')}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  aviso: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: scale(18),
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: scale(16),
    shadowOffset: { width: 0, height: scale(4) },
    elevation: 4,
  },
  avisoCuerpo: { flex: 1, gap: scale(1) },
  avisoTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  avisoPista: { fontSize: FONT_SIZE.xs, lineHeight: scale(16) },
  avisoCerrar: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
});

export default AvisoDeCreacion;
