import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import { BotonPequeno, Chip } from './ProductionPiezas';
import { useSegundos } from './ProductionDurationSummary';
import { claveDelValor } from '../../../constants/camaraCinematica';
import { CLAVE_DEL_ENFOQUE, PASO_DE_DURACION_SEC } from '../../../constants/filmmaker';
import { LIMITES, buscarPlano } from '../../../services/filmmaker/dominio';
import type { FilmmakerOperation, FilmmakerProduction, ProductionScene, ProductionShot, StoryboardCard } from '../../../services/filmmaker/dominio';
import type { ResultadoDeGesto } from '../../../utils/controladorDeProduccion';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const isWeb = Platform.OS === 'web';

export interface IdsNuevos {
  readonly escena: () => string;
  readonly plano: () => string;
}

/**
 * UN PLANO DEL STORYBOARD. Lo que dice sale de F1-A —la tarjeta del storyboard,
 * la intención creativa efectiva, lo que falta— y de la propia producción; los
 * nombres de cámara, de la biblioteca de Weë Studio. Cada gesto es una operación
 * de F1-A: subir, bajar, duplicar, dividir, unir, alargar, acortar y quitar.
 *
 * La miniatura: F1-C no genera ninguna, así que el hueco dice que no hay vista
 * previa. Nunca se pone una imagen de ejemplo como si fuera de este plano.
 */
const ProductionShotCard: React.FC<{
  produccion: FilmmakerProduction;
  escena: ProductionScene;
  plano: ProductionShot;
  tarjeta: StoryboardCard | undefined;
  seleccionado: boolean;
  porRehacer: boolean;
  editable: boolean;
  ids: IdsNuevos;
  onSeleccionar: () => void;
  onGesto: (ops: readonly FilmmakerOperation[]) => ResultadoDeGesto;
  onQuitar: () => void;
}> = ({ produccion, escena, plano, tarjeta, seleccionado, porRehacer, editable, ids, onSeleccionar, onGesto, onQuitar }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const segundos = useSegundos();
  const indice = escena.shots.findIndex((p) => p.id === plano.id);
  const siguiente = escena.shots[indice + 1];
  const nombre = t('filmmaker.shotNumber', { numero: indice + 1 });

  /* Los nombres de cámara que la biblioteca de Weë Studio sabe decir; lo que no nombra, no se enseña crudo. */
  const camara = [
    tarjeta?.shotType ? claveDelValor('shot.type', tarjeta.shotType) : null,
    tarjeta?.cameraType ? claveDelValor('camera.type', tarjeta.cameraType) : null,
    tarjeta?.movement ? claveDelValor('movement.type', tarjeta.movement) : null,
  ].filter((c): c is string => !!c).map((c) => t(c));

  const sujeto = plano.subject
    ? [
      plano.subject.characterId ? produccion.characters.find((c) => c.id === plano.subject?.characterId)?.name : undefined,
      plano.subject.objectId ? produccion.objects.find((o) => o.id === plano.subject?.objectId)?.name : undefined,
      plano.subject.focus ? t(CLAVE_DEL_ENFOQUE[plano.subject.focus]) : undefined,
      plano.subject.description,
    ].filter((x): x is string => !!x)
    : [];

  const faltan = (tarjeta?.missing ?? []).map((m) => (m === 'durationSec' ? t('filmmaker.missingDuration') : t('filmmaker.missingDescription')));
  const dependencias = (plano.dependsOn ?? []).map((id) => {
    const u = buscarPlano(produccion, id);
    return u ? t('filmmaker.whereShot', { escena: u.sceneIndex + 1, plano: u.shotIndex + 1 }) : id;
  });
  const sonidos = produccion.audio.cues.filter((c) => c.target.scope === 'shot' && c.target.shotId === plano.id).length;
  const lineas = plano.dialogue?.length ?? 0;
  const referencias = plano.referenceIds?.length ?? 0;
  const duracion = plano.durationSec;
  const mitad = duracion !== undefined ? Math.round((duracion / 2) * 10) / 10 : undefined;
  const sePuedeDividir = mitad !== undefined && duracion !== undefined && mitad >= LIMITES.duracionMinimaSec && duracion - mitad >= LIMITES.duracionMinimaSec;

  return (
    <View
      style={[
        styles.tarjeta,
        { backgroundColor: theme.colors.card, borderColor: seleccionado ? theme.colors.accent : theme.colors.border },
        seleccionado && styles.elegida,
      ]}
    >
      <TouchableOpacity
        onPress={onSeleccionar}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('filmmaker.selectItem', { nombre })}
        accessibilityState={{ selected: seleccionado }}
        style={[styles.cuerpo, isWeb && ({ cursor: 'pointer' } as any)]}
      >
        <View style={[styles.miniatura, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="film-outline" size={scale(20)} color={theme.colors.textSecondary} />
          <Text style={[styles.sinVista, { color: theme.colors.textSecondary }]} numberOfLines={2}>{t('filmmaker.noPreview')}</Text>
        </View>
        <View style={styles.datos}>
          <View style={styles.filaTitulo}>
            <Text style={[styles.nombre, { color: theme.colors.text }]}>{nombre}</Text>
            <Text style={[styles.duracion, { color: theme.colors.text }]}>{duracion === undefined ? t('filmmaker.noDuration') : segundos(duracion)}</Text>
          </View>
          <Text style={[styles.descripcion, { color: plano.description ? theme.colors.text : theme.colors.textSecondary }]} numberOfLines={2}>
            {plano.description ?? t('filmmaker.noDescription')}
          </Text>
          {camara.length > 0 && <Text style={[styles.camara, { color: theme.colors.textSecondary }]} numberOfLines={1}>{formato.lista(camara)}</Text>}
          {sujeto.length > 0 && (
            <Text style={[styles.detalle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {t('filmmaker.subjectIs', { valor: formato.lista(sujeto) })}
            </Text>
          )}
          <View style={styles.chips}>
            {tarjeta?.readiness === 'complete'
              ? <Chip texto={t('filmmaker.complete')} icono="checkmark-outline" tono="ok" />
              : <Chip texto={t('filmmaker.missing', { lista: formato.lista(faltan) })} icono="alert-outline" tono="aviso" />}
            {porRehacer && <Chip texto={t('filmmaker.pendingRedo')} icono="refresh-outline" tono="aviso" />}
            {referencias > 0 && <Chip texto={t('filmmaker.references', { contador: referencias })} icono="images-outline" />}
            {lineas > 0 && <Chip texto={t('filmmaker.dialogueLines', { contador: lineas })} icono="chatbubble-outline" />}
            {sonidos > 0 && <Chip texto={t('filmmaker.soundCues', { contador: sonidos })} icono="volume-medium-outline" />}
          </View>
          {dependencias.length > 0 && (
            <Text style={[styles.detalle, { color: theme.colors.textSecondary }]} numberOfLines={2}>{t('filmmaker.dependsOn', { lista: formato.lista(dependencias) })}</Text>
          )}
        </View>
      </TouchableOpacity>

      {editable && (
        <View style={styles.acciones}>
          <BotonPequeno icono="remove" etiqueta={t('filmmaker.shorterBy', { segundos: PASO_DE_DURACION_SEC })} disabled={duracion === undefined}
            onPress={() => onGesto([{ op: 'shorten_duration', target: { shotId: plano.id }, bySec: PASO_DE_DURACION_SEC }])} />
          <BotonPequeno icono="add" etiqueta={t('filmmaker.longerBy', { segundos: PASO_DE_DURACION_SEC })} disabled={duracion === undefined}
            onPress={() => onGesto([{ op: 'extend_duration', target: { shotId: plano.id }, bySec: PASO_DE_DURACION_SEC }])} />
          <BotonPequeno icono="arrow-up" etiqueta={t('filmmaker.moveUp')} disabled={indice === 0}
            onPress={() => onGesto([{ op: 'reorder_shot', shotId: plano.id, toOrder: indice - 1 }])} />
          <BotonPequeno icono="arrow-down" etiqueta={t('filmmaker.moveDown')} disabled={!siguiente}
            onPress={() => onGesto([{ op: 'reorder_shot', shotId: plano.id, toOrder: indice + 1 }])} />
          <BotonPequeno icono="copy-outline" etiqueta={t('filmmaker.duplicate')}
            onPress={() => onGesto([{ op: 'duplicate_shot', shotId: plano.id, newShotId: ids.plano() }])} />
          <BotonPequeno icono="cut-outline" etiqueta={t('filmmaker.splitShot')} disabled={!sePuedeDividir}
            onPress={() => { if (mitad !== undefined) onGesto([{ op: 'split_shot', shotId: plano.id, atSec: mitad, newShotId: ids.plano() }]); }} />
          <BotonPequeno icono="git-merge-outline" etiqueta={t('filmmaker.mergeNextShot')} disabled={!siguiente}
            onPress={() => { if (siguiente) onGesto([{ op: 'merge_shots', shotId: plano.id, withShotId: siguiente.id }]); }} />
          <BotonPequeno icono="git-branch-outline" etiqueta={t('filmmaker.splitScene')} disabled={indice === 0}
            onPress={() => onGesto([{ op: 'split_scene', sceneId: escena.id, atShotOrder: indice, newSceneId: ids.escena() }])} />
          <BotonPequeno icono="trash-outline" etiqueta={t('filmmaker.removeShot')} onPress={onQuitar} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, overflow: 'hidden' },
  elegida: { borderWidth: 2 },
  cuerpo: { flexDirection: 'row', gap: SPACING.md, padding: SPACING.md },
  miniatura: {
    width: scale(84), aspectRatio: 1, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center',
    justifyContent: 'center', gap: 2, padding: 4,
  },
  sinVista: { fontSize: scale(10), textAlign: 'center' },
  datos: { flex: 1, gap: SPACING.xs, minWidth: 0 },
  filaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: SPACING.sm },
  nombre: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold as any },
  duracion: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any, fontVariant: ['tabular-nums'] },
  descripcion: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.4 },
  camara: { fontSize: FONT_SIZE.xs },
  detalle: { fontSize: FONT_SIZE.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
});

export default ProductionShotCard;
