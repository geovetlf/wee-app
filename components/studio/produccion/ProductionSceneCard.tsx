import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import TextoEnMayusculas from '../../TextoEnMayusculas';
import { useIdioma } from '../../../contexts/IdiomaContext';
import { BotonPequeno, Chip } from './ProductionPiezas';
import ProductionShotCard, { IdsNuevos } from './ProductionShotCard';
import { useSegundos } from './ProductionDurationSummary';
import { CLAVE_DEL_CLIMA, CLAVE_DEL_MOMENTO, DURACION_DE_UN_PLANO_NUEVO_SEC, PASO_DE_DURACION_SEC } from '../../../constants/filmmaker';
import { aSec, buscarEscena, duracionDeEscenaMs } from '../../../services/filmmaker/dominio';
import type { FilmmakerOperation, FilmmakerProduction, ProductionScene, StoryboardCard } from '../../../services/filmmaker/dominio';
import type { ResultadoDeGesto } from '../../../utils/controladorDeProduccion';
import type { Seleccion } from './ProductionStoryboard';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';

const isWeb = Platform.OS === 'web';

/**
 * UNA ESCENA Y SUS PLANOS. Arriba lo que comparte la escena —su número, su
 * título, cuánto dura, el clima y el momento del día, de qué continúa— y sus
 * gestos: subir, bajar, duplicar, unir con la siguiente y quitar. Debajo, sus
 * planos en orden, y el botón para añadir otro.
 */
const ProductionSceneCard: React.FC<{
  produccion: FilmmakerProduction;
  escena: ProductionScene;
  indice: number;
  tarjetas: readonly StoryboardCard[];
  seleccion: Seleccion;
  porRehacer: ReadonlySet<string>;
  editable: boolean;
  ids: IdsNuevos;
  onSeleccionar: (s: Seleccion) => void;
  onGesto: (ops: readonly FilmmakerOperation[]) => ResultadoDeGesto;
  onQuitarEscena: (escena: ProductionScene, numero: number) => void;
  onQuitarPlano: (escena: ProductionScene, planoId: string, numero: number) => void;
}> = ({ produccion, escena, indice, tarjetas, seleccion, porRehacer, editable, ids, onSeleccionar, onGesto, onQuitarEscena, onQuitarPlano }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const segundos = useSegundos();
  const numero = indice + 1;
  const nombre = t('filmmaker.sceneNumber', { numero });
  const elegida = seleccion?.tipo === 'escena' && seleccion.id === escena.id;
  const siguiente = produccion.scenes[indice + 1];
  const duracion = duracionDeEscenaMs(escena);
  const continua = (escena.dependsOn ?? []).map((id) => {
    const u = buscarEscena(produccion, id);
    return u ? t('filmmaker.sceneNumber', { numero: u.index + 1 }) : id;
  });

  return (
    <View style={[styles.escena, { borderColor: elegida ? theme.colors.accent : theme.colors.border, backgroundColor: theme.colors.surface }]}>
      <TouchableOpacity
        onPress={() => onSeleccionar({ tipo: 'escena', id: escena.id })}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('filmmaker.selectItem', { nombre })}
        accessibilityState={{ selected: elegida }}
        style={[styles.cabecera, isWeb && ({ cursor: 'pointer' } as any)]}
      >
        <View style={styles.titulos}>
          <TextoEnMayusculas style={[styles.numero, { color: theme.colors.accentDark }]}>{nombre}</TextoEnMayusculas>
          <Text style={[styles.titulo, { color: escena.title ? theme.colors.text : theme.colors.textSecondary }]} numberOfLines={1}>
            {escena.title ?? t('filmmaker.untitledScene')}
          </Text>
        </View>
        <View style={styles.resumen}>
          <Text style={[styles.duracion, { color: theme.colors.text }]}>{duracion === undefined ? t('filmmaker.noDuration') : segundos(aSec(duracion))}</Text>
          <Text style={[styles.cuenta, { color: theme.colors.textSecondary }]}>{t('filmmaker.shots', { contador: escena.shots.length })}</Text>
        </View>
      </TouchableOpacity>

      {(escena.weather || escena.timeOfDay || continua.length > 0 || porRehacer.has(escena.id)) && (
        <View style={styles.chips}>
          {!!escena.timeOfDay && <Chip texto={t(CLAVE_DEL_MOMENTO[escena.timeOfDay])} icono="time-outline" />}
          {!!escena.weather && <Chip texto={t(CLAVE_DEL_CLIMA[escena.weather])} icono="partly-sunny-outline" />}
          {continua.length > 0 && <Chip texto={t('filmmaker.dependsOn', { lista: formato.lista(continua) })} icono="link-outline" />}
          {porRehacer.has(escena.id) && <Chip texto={t('filmmaker.pendingRedo')} icono="refresh-outline" tono="aviso" />}
        </View>
      )}

      {editable && (
        <View style={styles.acciones}>
          {!escena.shots.length && (
            <>
              <BotonPequeno icono="remove" etiqueta={t('filmmaker.shorterBy', { segundos: PASO_DE_DURACION_SEC })} disabled={escena.durationSec === undefined}
                onPress={() => onGesto([{ op: 'shorten_duration', target: { sceneId: escena.id }, bySec: PASO_DE_DURACION_SEC }])} />
              <BotonPequeno icono="add" etiqueta={t('filmmaker.longerBy', { segundos: PASO_DE_DURACION_SEC })} disabled={escena.durationSec === undefined}
                onPress={() => onGesto([{ op: 'extend_duration', target: { sceneId: escena.id }, bySec: PASO_DE_DURACION_SEC }])} />
            </>
          )}
          <BotonPequeno icono="arrow-up" etiqueta={t('filmmaker.moveUp')} disabled={indice === 0}
            onPress={() => onGesto([{ op: 'reorder_scene', sceneId: escena.id, toOrder: indice - 1 }])} />
          <BotonPequeno icono="arrow-down" etiqueta={t('filmmaker.moveDown')} disabled={!siguiente}
            onPress={() => onGesto([{ op: 'reorder_scene', sceneId: escena.id, toOrder: indice + 1 }])} />
          <BotonPequeno icono="copy-outline" etiqueta={t('filmmaker.duplicate')}
            onPress={() => onGesto([{ op: 'duplicate_scene', sceneId: escena.id, newSceneId: ids.escena() }])} />
          <BotonPequeno icono="git-merge-outline" etiqueta={t('filmmaker.mergeNextScene')} disabled={!siguiente}
            onPress={() => { if (siguiente) onGesto([{ op: 'merge_scenes', sceneId: escena.id, withSceneId: siguiente.id }]); }} />
          <BotonPequeno icono="trash-outline" etiqueta={t('filmmaker.removeScene')} onPress={() => onQuitarEscena(escena, numero)} />
        </View>
      )}

      <View style={styles.planos}>
        {escena.shots.map((plano, j) => (
          <ProductionShotCard
            key={plano.id}
            produccion={produccion}
            escena={escena}
            plano={plano}
            tarjeta={tarjetas.find((c) => c.unitId === plano.id)}
            seleccionado={seleccion?.tipo === 'plano' && seleccion.id === plano.id}
            porRehacer={porRehacer.has(plano.id)}
            editable={editable}
            ids={ids}
            onSeleccionar={() => onSeleccionar({ tipo: 'plano', id: plano.id })}
            onGesto={onGesto}
            onQuitar={() => onQuitarPlano(escena, plano.id, j + 1)}
          />
        ))}
        {editable && (
          <BotonPequeno icono="add-circle-outline" etiqueta={t('filmmaker.addShot')} conTexto
            onPress={() => onGesto([{ op: 'add_shot', sceneId: escena.id, shot: { id: ids.plano(), durationSec: DURACION_DE_UN_PLANO_NUEVO_SEC } }])} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  escena: { borderWidth: 1, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, gap: SPACING.sm },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md, minHeight: 44 },
  titulos: { flex: 1, minWidth: 0, gap: 2 },
  numero: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold as any, letterSpacing: 0.6 },
  titulo: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold as any },
  resumen: { alignItems: 'flex-end', gap: 2 },
  duracion: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any, fontVariant: ['tabular-nums'] },
  cuenta: { fontSize: FONT_SIZE.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  planos: { gap: SPACING.sm },
});

export default ProductionSceneCard;
