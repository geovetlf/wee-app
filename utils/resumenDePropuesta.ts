import { aplicarOperaciones, buscarEscena, buscarPlano, lineaDeTiempo, requisitosDeProduccion } from '../services/filmmaker/dominio';
import type { FilmmakerOperation, FilmmakerProduction, PendingRegeneration, ShotRequirement } from '../services/filmmaker/dominio';

/**
 * LO QUE QUEDARÍA SI SE APLICA UNA PROPUESTA DE WEË BRAIN (Filmmaker Engine, Fase 34).
 *
 * Weë Brain propone operaciones de F1-A que el servidor ya comprobó en la revisión guardada. Aquí se aplican EN
 * MEMORIA con el mismo F1-A del espejo —nada se guarda, nada se cobra, nadie más lo ve— para enseñar, antes de
 * decidir, cómo quedaría la producción: cuántas escenas, planos y segundos, antes y después, y QUÉ planos habría que
 * volver a generar, cada uno con su nombre, su duración, si lleva sonido o diálogo y cuántas referencias pide.
 *
 * Lo que NO se hace aquí, a propósito:
 *   · decidir si un plano se puede generar ni cuánto cuesta: eso lo dice el servidor al cotizar (F1-D). Un segundo
 *     evaluador en la app acabaría diciendo otra cosa que la puerta. Aquí solo se describe lo que el plano PEDIRÍA;
 *   · adivinar: si la producción que se ve ya no es la revisión en que se comprobó (hay cambios sin guardar, o
 *     cambió), o si las operaciones no se aplican aquí, no hay resumen —`null`— y la tarjeta lo dice.
 */
export interface CifrasDeProduccion {
  readonly escenas: number;
  readonly planos: number;
  readonly segundos: number;
}

export interface PlanoAfectado {
  readonly unitId: string;
  /** Su sitio en la producción de DESPUÉS: escena y, si lo hay, plano (desde 1). */
  readonly escena: number;
  readonly plano?: number;
  /** No existía antes: lo crea la propuesta. */
  readonly nuevo: boolean;
  readonly segundos: number;
  readonly conSonido: boolean;
  readonly lineas: number;
  readonly referencias: number;
}

export interface ResumenDePropuesta {
  readonly antes: CifrasDeProduccion;
  readonly despues: CifrasDeProduccion;
  /** Lo que habría que volver a generar, en el orden de la producción de después. */
  readonly afectados: readonly PlanoAfectado[];
  /** Unidades que desaparecen (sus vídeos dejarían de estar en el montaje). */
  readonly quitados: number;
  /** Líneas de diálogo y sonidos cuyo audio habría que volver a pedir. */
  readonly sonidos: number;
}

const cifras = (prod: FilmmakerProduction): CifrasDeProduccion => ({
  escenas: prod.scenes.length,
  planos: prod.scenes.reduce((n, s) => n + s.shots.length, 0),
  segundos: lineaDeTiempo(prod)?.totalSec ?? 0,
});

export const resumirPropuesta = (
  produccion: FilmmakerProduction,
  propuesta: { readonly operations: readonly FilmmakerOperation[]; readonly pending?: PendingRegeneration },
): ResumenDePropuesta | null => {
  const r = aplicarOperaciones(produccion, propuesta.operations);
  if (!r.ok) return null;
  const despues = r.production;
  const req = requisitosDeProduccion(despues);
  const porUnidad = new Map<string, ShotRequirement>(req.ok ? req.requirements.shots.map((s) => [s.unitId, s]) : []);
  /* Lo que habría que rehacer: el del servidor si lo trajo (es el que se comprobó), si no el de aquí. */
  const pendiente = propuesta.pending ?? r.pending;
  const afectados: PlanoAfectado[] = [];
  const orden = new Map<string, number>();
  let i = 0;
  for (const s of despues.scenes) {
    if (!s.shots.length) orden.set(s.id, i++);
    for (const p of s.shots) orden.set(p.id, i++);
  }
  for (const id of pendiente.shots) {
    const p = buscarPlano(despues, id);
    const e = p ? null : buscarEscena(despues, id);
    if (!p && !e) continue;
    const q = porUnidad.get(id);
    afectados.push({
      unitId: id,
      escena: p ? p.sceneIndex + 1 : (e as { index: number }).index + 1,
      ...(p ? { plano: p.shotIndex + 1 } : {}),
      nuevo: p ? !buscarPlano(produccion, id) : !buscarEscena(produccion, id),
      segundos: q?.durationSec ?? (p ? p.shot.durationSec ?? 0 : 0),
      conSonido: !!q?.output.withSound,
      lineas: q?.input.dialogue.length ?? 0,
      referencias: q?.input.references.length ?? 0,
    });
  }
  afectados.sort((a, b) => (orden.get(a.unitId) ?? 0) - (orden.get(b.unitId) ?? 0));
  return {
    antes: cifras(produccion),
    despues: cifras(despues),
    afectados,
    quitados: pendiente.removed.length,
    sonidos: pendiente.audio.length,
  };
};
