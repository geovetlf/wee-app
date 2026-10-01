import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useT } from '../../../contexts/IdiomaContext';
import ProductionSceneCard from './ProductionSceneCard';
import ProductionEmptyState from './ProductionEmptyState';
import { BotonPequeno } from './ProductionPiezas';
import type { IdsNuevos } from './ProductionShotCard';
import { DURACION_DE_UN_PLANO_NUEVO_SEC } from '../../../constants/filmmaker';
import type { FilmmakerOperation, FilmmakerProduction, ProductionScene, StoryboardCard } from '../../../services/filmmaker/dominio';
import type { ResultadoDeGesto } from '../../../utils/controladorDeProduccion';
import { confirmAction } from '../../../utils/notify';
import { SPACING } from '../../../constants/design';

/** Qué se está dirigiendo: una escena, un plano o nada. */
export type Seleccion = { readonly tipo: 'escena'; readonly id: string } | { readonly tipo: 'plano'; readonly id: string } | null;

/**
 * EL STORYBOARD: LA PRODUCCIÓN, SUS ESCENAS Y SUS PLANOS, EN ORDEN.
 *
 * Es la vista principal. Cada gesto —reordenar, duplicar, dividir, unir,
 * alargar, añadir, quitar— es una operación de F1-A que se aplica al momento en
 * la pantalla y se guarda después, agrupada. Quitar pregunta antes; y si F1-A
 * avisa de que se llevaría también sonidos o marcas que solo vivían de eso, se
 * dice y se vuelve a preguntar antes de hacerlo.
 */
const ProductionStoryboard: React.FC<{
  produccion: FilmmakerProduction;
  tarjetas: readonly StoryboardCard[];
  seleccion: Seleccion;
  porRehacer: readonly string[];
  editable: boolean;
  ids: IdsNuevos;
  onSeleccionar: (s: Seleccion) => void;
  onGesto: (ops: readonly FilmmakerOperation[]) => ResultadoDeGesto;
}> = ({ produccion, tarjetas, seleccion, porRehacer, editable, ids, onSeleccionar, onGesto }) => {
  const t = useT();
  const rehacer = useMemo(() => new Set(porRehacer), [porRehacer]);

  /** Quitar: se pregunta; si F1-A dice que se llevaría más cosas, se dice y se vuelve a preguntar. */
  const quitar = useCallback(async (pregunta: string, sinArrastre: FilmmakerOperation, conArrastre: FilmmakerOperation, alQuitar: () => void) => {
    if (!(await confirmAction(pregunta, '', t('filmmaker.remove'), true, t))) return;
    const r = onGesto([sinArrastre]);
    if (r.ok) { alQuitar(); return; }
    if (!r.problems.some((p) => p.code === 'operation_blocked')) return;
    if (!(await confirmAction(pregunta, t('filmmaker.removeAlsoLinked'), t('filmmaker.remove'), true, t))) return;
    if (onGesto([conArrastre]).ok) alQuitar();
  }, [onGesto, t]);

  const quitarEscena = useCallback((escena: ProductionScene, numero: number) => {
    void quitar(t('filmmaker.removeSceneConfirm', { numero }),
      { op: 'remove_scene', sceneId: escena.id }, { op: 'remove_scene', sceneId: escena.id, cascade: true },
      () => { if (seleccion?.id === escena.id || escena.shots.some((p) => p.id === seleccion?.id)) onSeleccionar(null); });
  }, [quitar, t, seleccion, onSeleccionar]);

  const quitarPlano = useCallback((_escena: ProductionScene, planoId: string, numero: number) => {
    void quitar(t('filmmaker.removeShotConfirm', { numero }),
      { op: 'remove_shot', shotId: planoId }, { op: 'remove_shot', shotId: planoId, cascade: true },
      () => { if (seleccion?.id === planoId) onSeleccionar(null); });
  }, [quitar, t, seleccion, onSeleccionar]);

  const nuevaEscena = (): FilmmakerOperation => ({
    op: 'add_scene', scene: { id: ids.escena(), shots: [{ id: ids.plano(), durationSec: DURACION_DE_UN_PLANO_NUEVO_SEC }] },
  });

  if (!produccion.scenes.length) {
    return (
      <ProductionEmptyState
        icono="film-outline"
        titulo={t('filmmaker.emptyStoryboardTitle')}
        texto={t('filmmaker.emptyStoryboardText')}
        accion={editable ? { etiqueta: t('filmmaker.addFirstScene'), icono: 'add', onPress: () => { onGesto([nuevaEscena()]); } } : undefined}
      />
    );
  }

  return (
    <View style={styles.lista}>
      {produccion.scenes.map((escena, i) => (
        <ProductionSceneCard
          key={escena.id}
          produccion={produccion}
          escena={escena}
          indice={i}
          tarjetas={tarjetas}
          seleccion={seleccion}
          porRehacer={rehacer}
          editable={editable}
          ids={ids}
          onSeleccionar={onSeleccionar}
          onGesto={onGesto}
          onQuitarEscena={quitarEscena}
          onQuitarPlano={quitarPlano}
        />
      ))}
      {editable && <BotonPequeno icono="add" etiqueta={t('filmmaker.addScene')} conTexto principal onPress={() => { onGesto([nuevaEscena()]); }} />}
    </View>
  );
};

const styles = StyleSheet.create({
  lista: { gap: SPACING.md },
});

export default ProductionStoryboard;
