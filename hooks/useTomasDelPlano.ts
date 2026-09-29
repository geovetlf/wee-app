import { useEffect, useMemo, useState } from 'react';
import { tomaService } from '../services/tomaService';
import type { ProduccionGuardada } from '../services/filmmakerService';
import { unidades } from '../services/filmmaker/dominio';
import type { SeleccionDeUnidad, TomaVista } from '../utils/controladorDeToma';

/** Las tomas de la unidad elegida, como las cuenta el servidor. */
export interface HistorialDeTomas {
  readonly carga: 'cargando' | 'listas' | 'error';
  /** De la más nueva a la más antigua. */
  readonly tomas: readonly TomaVista[];
  /** La dirección con la que se ve el vídeo de una toma, con la regla de siempre de Mis creaciones. */
  readonly urlDe: (assetId: string) => Promise<string | null>;
}

/** La unidad de lo elegido, en lo GUARDADO: un plano, o una escena sin planos. Una escena con planos no es una unidad. */
export const unidadDeLaSeleccion = (guardada: ProduccionGuardada | null, seleccion: SeleccionDeUnidad) => {
  if (!guardada || !seleccion) return null;
  const u = unidades(guardada.production).find((x) => x.unitId === seleccion.id);
  return u ? { productionId: guardada.productionId, sceneId: u.scene.id, unitId: u.unitId } : null;
};

/**
 * LAS TOMAS DE UN PLANO (Fase 24 del motor: de la historia a la toma).
 *
 * El servidor ya sabía contar las tomas de una unidad —su número, en qué están, sus Credits reservados, cobrados y
 * devueltos, su vídeo si es suyo y está listo, y si es la que está en el plano— (`shots`, `shot.takes`, Fase 2) y nadie
 * lo preguntaba. Se pregunta al elegir otra unidad y cada vez que la toma en curso cambia de fase (`refresco`), no
 * cada tanto. Solo lectura: no genera, no cobra y no cambia qué toma está en el plano.
 */
export const useTomasDelPlano = (guardada: ProduccionGuardada | null, seleccion: SeleccionDeUnidad, refresco: string): HistorialDeTomas | null => {
  const unidad = useMemo(() => unidadDeLaSeleccion(guardada, seleccion), [guardada, seleccion]);
  const clave = unidad ? `${unidad.productionId}|${unidad.sceneId}|${unidad.unitId}` : null;
  const [estado, setEstado] = useState<{ clave: string; historial: HistorialDeTomas } | null>(null);
  useEffect(() => {
    if (!unidad || !clave) return undefined;
    let vigente = true;
    /* Mientras se pregunta, lo que ya se sabía de ESTA unidad se sigue viendo; de otra, nada. */
    setEstado((e) => ({ clave, historial: { carga: 'cargando', tomas: e?.clave === clave ? e.historial.tomas : [], urlDe: tomaService.urlDelMaterial } }));
    void tomaService.tomasDeLaUnidad(unidad).then((tomas) => {
      if (!vigente) return;
      setEstado({ clave, historial: tomas
        ? { carga: 'listas', tomas: [...tomas].sort((a, b) => b.take - a.take), urlDe: tomaService.urlDelMaterial }
        : { carga: 'error', tomas: [], urlDe: tomaService.urlDelMaterial } });
    });
    return () => { vigente = false; };
    // La unidad se distingue por su clave: un pintado nuevo con la misma unidad no vuelve a preguntar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, refresco]);
  return estado && estado.clave === clave ? estado.historial : null;
};
