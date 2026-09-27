import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useT } from '../../../contexts/IdiomaContext';
import { BotonPequeno } from './ProductionPiezas';
import type { EstadoOptimista } from '../../../utils/produccionOptimista';
import { fraseDelProblema } from '../../../utils/mensajesDeFilmmaker';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';
import { scale } from '../../../utils/scale';

/**
 * LO QUE HAY QUE CONTAR SIN QUE NADIE LO PIDA.
 *
 *   · Archivada: se lee, no se cambia, y se dice cómo volver a editarla.
 *   · Conflicto: otra versión se guardó a la vez; lo tuyo se volvió a aplicar
 *     encima. Si algo ya no cabía, se enseña uno por uno, con su porqué: el
 *     trabajo de nadie se pierde en silencio.
 *   · Un gesto que F1-A no aceptó: por qué.
 */
const ProductionAvisos: React.FC<{
  estado: EstadoOptimista;
  onVistos: () => void;
  onDesarchivar: () => void;
}> = ({ estado, onVistos, onDesarchivar }) => {
  const { theme } = useTheme();
  const t = useT();
  const archivada = estado.confirmada?.status === 'archived';
  const hayConflicto = estado.conflicto || estado.descartados.length > 0;
  const rechazo = estado.rechazo ?? [];
  if (!archivada && !hayConflicto && !rechazo.length) return null;

  return (
    <View style={styles.pila}>
      {archivada && (
        <View style={[styles.aviso, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="archive-outline" size={scale(18)} color={theme.colors.textSecondary} />
          <Text style={[styles.texto, { color: theme.colors.text }]}>{t('filmmaker.archivedBanner')}</Text>
          <BotonPequeno icono="arrow-undo-outline" etiqueta={t('filmmaker.unarchive')} onPress={onDesarchivar} conTexto />
        </View>
      )}
      {hayConflicto && (
        <View style={[styles.aviso, styles.columna, { backgroundColor: theme.colors.surface, borderColor: theme.colors.warning }]} accessibilityLiveRegion="polite">
          <View style={styles.cabecera}>
            <Ionicons name="git-merge-outline" size={scale(18)} color={theme.colors.warning} />
            <Text style={[styles.titulo, { color: theme.colors.text }]}>{t('filmmaker.conflictTitle')}</Text>
          </View>
          {estado.conflicto && <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>{t('filmmaker.conflictText')}</Text>}
          {estado.descartados.length > 0 && (
            <View style={styles.lista}>
              <Text style={[styles.texto, { color: theme.colors.text }]}>{t('filmmaker.droppedTitle', { contador: estado.descartados.length })}</Text>
              {estado.descartados.map((d) => (
                <Text key={d.gesto.id} style={[styles.punto, { color: theme.colors.textSecondary }]}>
                  {'• '}{d.problems[0] ? fraseDelProblema(d.problems[0], estado.vista, t) : t('filmmaker.perUnknown')}
                </Text>
              ))}
            </View>
          )}
          <BotonPequeno icono="checkmark" etiqueta={t('filmmaker.understood')} onPress={onVistos} conTexto />
        </View>
      )}
      {rechazo.length > 0 && (
        <View style={[styles.aviso, styles.columna, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} accessibilityLiveRegion="polite">
          <Text style={[styles.texto, { color: theme.colors.text }]}>{t('filmmaker.gestureRejected')}</Text>
          {rechazo.slice(0, 3).map((p, i) => (
            <Text key={`${p.code}-${i}`} style={[styles.punto, { color: theme.colors.textSecondary }]}>{'• '}{fraseDelProblema(p, estado.vista, t)}</Text>
          ))}
          <BotonPequeno icono="checkmark" etiqueta={t('filmmaker.understood')} onPress={onVistos} conTexto />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  pila: { gap: SPACING.sm },
  aviso: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  columna: { flexDirection: 'column', alignItems: 'flex-start' },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  titulo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold as any },
  texto: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.45, flexShrink: 1 },
  lista: { gap: SPACING.xs },
  punto: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.45 },
});

export default ProductionAvisos;
