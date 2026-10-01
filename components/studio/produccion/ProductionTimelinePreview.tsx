import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useT } from '../../../contexts/IdiomaContext';
import { useSegundos } from './ProductionDurationSummary';
import { aSec, duracionDeUnidadMs, unidades } from '../../../services/filmmaker/dominio';
import type { FilmmakerProduction, Timeline } from '../../../services/filmmaker/dominio';
import type { Seleccion } from './ProductionStoryboard';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * LA LÍNEA DE TIEMPO, COMO DATOS. Cada plano ocupa lo que dura y cada escena
 * agrupa los suyos; tocar un tramo lo selecciona. La calcula F1-A
 * (`lineaDeTiempo`) a partir del orden y de las duraciones: no se guarda, así que
 * no puede desfasarse.
 *
 * No reproduce, no monta, no exporta y no mezcla: eso es de otra fase. Si a algún
 * plano le falta la duración, no hay línea de tiempo exacta y se dice; los tramos
 * sin duración se ven, más finos, para no esconder que existen.
 */
const ProductionTimelinePreview: React.FC<{
  produccion: FilmmakerProduction;
  linea: Timeline | undefined;
  seleccion: Seleccion;
  porRehacer: readonly string[];
  onSeleccionar: (s: Seleccion) => void;
}> = ({ produccion, linea, seleccion, porRehacer, onSeleccionar }) => {
  const { theme } = useTheme();
  const t = useT();
  const segundos = useSegundos();
  const lista = unidades(produccion);
  if (!lista.length) return null;
  /* Sin duración, un tramo cuenta como el más corto que hay, para que se vea. */
  const conocidas = lista.map((u) => duracionDeUnidadMs(u)).filter((d): d is number => d !== undefined);
  const minimo = conocidas.length ? Math.min(...conocidas) : 1000;
  const pesos = lista.map((u) => duracionDeUnidadMs(u) ?? minimo * 0.6);
  const total = pesos.reduce((a, b) => a + b, 0);
  const rehacer = new Set(porRehacer);

  return (
    <View style={styles.bloque}>
      <View style={styles.cabecera}>
        <Text style={[styles.titulo, { color: theme.colors.textSecondary }]} accessibilityRole="header">{t('filmmaker.timeline')}</Text>
        {!!linea && <Text style={[styles.total, { color: theme.colors.text }]}>{t('filmmaker.timelineTotal', { duracion: segundos(linea.totalSec) })}</Text>}
      </View>
      <View style={styles.pista}>
        {lista.map((u, i) => {
          const elegido = (seleccion?.tipo === 'plano' && seleccion.id === u.unitId) || (seleccion?.tipo === 'escena' && seleccion.id === u.scene.id);
          const d = duracionDeUnidadMs(u);
          const nombre = u.shot
            ? t('filmmaker.whereShot', { escena: u.sceneIndex + 1, plano: (u.shotIndex ?? 0) + 1 })
            : t('filmmaker.whereScene', { escena: u.sceneIndex + 1 });
          const cambiaDeEscena = i > 0 && lista[i - 1].scene.id !== u.scene.id;
          return (
            <TouchableOpacity
              key={u.unitId}
              onPress={() => onSeleccionar(u.shot ? { tipo: 'plano', id: u.unitId } : { tipo: 'escena', id: u.scene.id })}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('filmmaker.selectItem', { nombre })}
              accessibilityValue={{ text: d === undefined ? t('filmmaker.noDuration') : segundos(aSec(d)) }}
              accessibilityState={{ selected: elegido }}
              style={[
                styles.tramo,
                {
                  flexGrow: pesos[i] / total,
                  backgroundColor: elegido ? theme.colors.accent : u.sceneIndex % 2 ? theme.colors.surface : theme.colors.card,
                  borderColor: elegido ? theme.colors.accentDark : theme.colors.border,
                  borderStyle: d === undefined ? 'dashed' : 'solid',
                  marginLeft: cambiaDeEscena ? scale(4) : 0,
                },
                isWeb && ({ cursor: 'pointer' } as any),
              ]}
            >
              <Text style={[styles.numero, { color: elegido ? '#1F2937' : theme.colors.textSecondary }]} numberOfLines={1}>
                {u.shot ? `${u.sceneIndex + 1}.${(u.shotIndex ?? 0) + 1}` : `${u.sceneIndex + 1}`}
              </Text>
              {rehacer.has(u.unitId) && <View style={[styles.marca, { backgroundColor: theme.colors.warning }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
      {!linea && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.timelineIncomplete')}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.sm },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.sm },
  titulo: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold as any, textTransform: 'uppercase', letterSpacing: 0.6 },
  total: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any, fontVariant: ['tabular-nums'] },
  pista: { flexDirection: 'row', alignItems: 'stretch', minHeight: 44 },
  tramo: {
    flexBasis: 0, minWidth: scale(22), borderWidth: 1, borderRadius: BORDER_RADIUS.sm, marginRight: 2, justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 2, overflow: 'hidden',
  },
  numero: { fontSize: FONT_SIZE.xs, fontVariant: ['tabular-nums'], fontWeight: FONT_WEIGHT.semibold as any },
  marca: { position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: 3 },
  nota: { fontSize: FONT_SIZE.xs },
});

export default ProductionTimelinePreview;
