import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import { BotonPequeno } from './ProductionPiezas';
import { PASO_DEL_OBJETIVO_SEC } from '../../../constants/filmmaker';
import { LIMITES, aSec, duracionTotalMs } from '../../../services/filmmaker/dominio';
import type { FilmmakerOperation, FilmmakerProduction } from '../../../services/filmmaker/dominio';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../../constants/design';

/** Una duración en segundos, en el idioma de quien mira: «5 s», «1,5 s», «12 sec.». */
export const useSegundos = () => {
  const { formato } = useIdioma();
  return (sec: number): string => formato.numero(sec, { style: 'unit', unit: 'second', unitDisplay: 'short', maximumFractionDigits: 1 });
};

/**
 * CUÁNTO DURA, Y CUÁNTO SE QUERÍA. El total lo suma F1-A con sus reglas —en
 * milisegundos enteros, lo que dicen los planos—; el objetivo se sube, se baja o
 * se quita con `change_target_duration`, la única operación que lo cambia.
 */
const ProductionDurationSummary: React.FC<{
  produccion: FilmmakerProduction;
  editable: boolean;
  onGesto: (ops: readonly FilmmakerOperation[]) => void;
}> = ({ produccion, editable, onGesto }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const segundos = useSegundos();
  const totalMs = duracionTotalMs(produccion);
  const objetivo = produccion.duration.targetSec;
  const cambiar = (targetSec: number | null) => onGesto([{ op: 'change_target_duration', targetSec }]);

  return (
    <View style={styles.bloque}>
      <View style={styles.fila}>
        <View style={styles.dato}>
          <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t('filmmaker.durationTotal')}</Text>
          <Text style={[styles.valor, { color: theme.colors.text }]}>{totalMs === undefined ? t('filmmaker.noDuration') : segundos(aSec(totalMs))}</Text>
        </View>
        <View style={styles.dato}>
          <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t('filmmaker.durationTarget')}</Text>
          <Text style={[styles.valor, { color: theme.colors.text }]}>{objetivo === undefined ? t('filmmaker.noTarget') : segundos(objetivo)}</Text>
        </View>
      </View>
      {editable && (
        <View style={styles.acciones}>
          {objetivo === undefined ? (
            <BotonPequeno icono="flag-outline" etiqueta={t('filmmaker.setTarget')} conTexto
              onPress={() => cambiar(totalMs !== undefined && totalMs > 0 ? aSec(totalMs) : PASO_DEL_OBJETIVO_SEC * 3)} />
          ) : (
            <>
              <BotonPequeno icono="remove" etiqueta={t('filmmaker.targetShorter', { segundos: PASO_DEL_OBJETIVO_SEC })}
                disabled={objetivo - PASO_DEL_OBJETIVO_SEC < LIMITES.duracionMinimaSec} onPress={() => cambiar(objetivo - PASO_DEL_OBJETIVO_SEC)} />
              <BotonPequeno icono="add" etiqueta={t('filmmaker.targetLonger', { segundos: PASO_DEL_OBJETIVO_SEC })}
                disabled={objetivo + PASO_DEL_OBJETIVO_SEC > LIMITES.produccionMaxSec} onPress={() => cambiar(objetivo + PASO_DEL_OBJETIVO_SEC)} />
              <BotonPequeno icono="close" etiqueta={t('filmmaker.removeTarget')} onPress={() => cambiar(null)} />
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.sm },
  fila: { flexDirection: 'row', gap: SPACING.lg, flexWrap: 'wrap' },
  dato: { gap: 2 },
  etiqueta: { fontSize: FONT_SIZE.xs },
  valor: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold as any, fontVariant: ['tabular-nums'] },
  acciones: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
});

export default ProductionDurationSummary;
