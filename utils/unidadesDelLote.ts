import { unidades } from '../services/filmmaker/dominio';
import type { FilmmakerProduction } from '../services/filmmaker/dominio';
import { MAX_UNIDADES_POR_LOTE } from './controladorDeToma';

/**
 * QUÉ UNIDADES VAN EN EL LOTE (Fase 29 del motor; la escena sola, Fase 34).
 *
 * La producción entera, si cabe en un lote: entonces no se dice cuáles —van todas y el servidor dice de cada una qué
 * pasaría—. Si no cabe, las primeras que todavía no tienen vídeo, en su orden, hasta el máximo.
 *
 * Con una escena elegida (Fase 34, «Generar esta escena»), solo sus unidades —sus planos, o ella misma si no tiene
 * planos—, con la misma regla del máximo. Es el mismo lote por la misma puerta: el servidor ya generaba las unidades
 * que se le pidieran (`units`); cambia qué se le pide, no cómo se cotiza, se confirma ni se cobra.
 */
export interface UnidadesDelLote {
  /** `undefined`: todas (caben). */
  readonly unidades: readonly string[] | undefined;
  /** El máximo, si hubo que recortar; si no, `null`. */
  readonly recortado: number | null;
}

export const unidadesDelLote = (
  produccion: FilmmakerProduction | null | undefined,
  conVideo: ReadonlySet<string> | ReadonlyMap<string, unknown>,
  escena: string | null = null,
): UnidadesDelLote => {
  const todas = produccion ? unidades(produccion) : [];
  /* Una escena que ya no está no deja un lote vacío: vuelve a ser la producción entera. */
  const deLaEscena = escena ? todas.filter((u) => u.scene.id === escena) : [];
  if (deLaEscena.length) {
    const ids = deLaEscena.map((u) => u.unitId);
    if (ids.length <= MAX_UNIDADES_POR_LOTE) return { unidades: ids, recortado: null };
    return { unidades: ids.filter((id) => !conVideo.has(id)).slice(0, MAX_UNIDADES_POR_LOTE), recortado: MAX_UNIDADES_POR_LOTE };
  }
  const ids = todas.map((u) => u.unitId);
  if (ids.length <= MAX_UNIDADES_POR_LOTE) return { unidades: undefined, recortado: null };
  return { unidades: ids.filter((id) => !conVideo.has(id)).slice(0, MAX_UNIDADES_POR_LOTE), recortado: MAX_UNIDADES_POR_LOTE };
};
