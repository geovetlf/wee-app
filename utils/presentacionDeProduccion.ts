import type { FilmmakerProduction, StoryboardCard, ValidationResult } from '../services/filmmaker/dominio';
import type { EstadoOptimista } from './produccionOptimista';

/**
 * WEË FILMMAKER · EN QUÉ ESTADO ESTÁ UNA PRODUCCIÓN, PARA ENSEÑARLO (F1-C).
 *
 * Todo se deduce de lo que ya dicen F1-A y el servidor —la validación en la
 * etapa `ready`, las tarjetas del storyboard, el estado guardado—; aquí solo se
 * junta. No hay estados de generación: F1-C no genera, y enseñar un «generando»
 * o un porcentaje sería mentir.
 *
 *   archivada                  el servidor la tiene archivada: se lee, no se cambia.
 *   borrador                   a F1-A le falta algo para darla por lista.
 *   lista                      F1-A la da por lista —la validación en `ready`— y cada tarjeta del storyboard
 *                              tiene lo que necesita para pedirse (`readiness: 'complete'`). La generación
 *                              llega en otra fase.
 *   conDependenciasPendientes  algún plano o escena depende de otro al que le falta algo.
 */
export interface EstadosDeLaProduccion {
  readonly archivada: boolean;
  readonly borrador: boolean;
  readonly lista: boolean;
  readonly conDependenciasPendientes: boolean;
}

/**
 * LO QUE DEPENDE DE ALGO INCOMPLETO. Un plano que `dependsOn` otro plano cuya
 * tarjeta dice `incomplete`, o una escena que depende de otra con alguna
 * unidad incompleta. Son datos de F1-A leídos tal cual, no una regla nueva.
 */
export const dependenciasPendientes = (prod: FilmmakerProduction, tarjetas: readonly StoryboardCard[]): readonly string[] => {
  const incompletas = new Set(tarjetas.filter((c) => c.readiness === 'incomplete').map((c) => c.unitId));
  const escenaIncompleta = new Set(tarjetas.filter((c) => c.readiness === 'incomplete').map((c) => c.sceneId));
  const salida: string[] = [];
  for (const s of prod.scenes) {
    if ((s.dependsOn ?? []).some((id) => escenaIncompleta.has(id))) salida.push(s.id);
    for (const p of s.shots) if ((p.dependsOn ?? []).some((id) => incompletas.has(id))) salida.push(p.id);
  }
  return salida;
};

export const estadosDeLaProduccion = (
  e: EstadoOptimista,
  lista: ValidationResult | undefined,
  tarjetas: readonly StoryboardCard[],
): EstadosDeLaProduccion => {
  const archivada = e.confirmada?.status === 'archived';
  const preparada = !!lista?.valid && tarjetas.length > 0 && tarjetas.every((c) => c.readiness === 'complete');
  return {
    archivada,
    borrador: !preparada,
    lista: preparada,
    conDependenciasPendientes: !!e.vista && dependenciasPendientes(e.vista, tarjetas).length > 0,
  };
};

/** El título de una producción nueva, sacado de lo que la persona escribió: su primera línea, sin pasar del límite. */
export const tituloDesdeLaIdea = (idea: string, maximo: number): string => {
  const primera = idea.trim().split('\n')[0].trim();
  if (primera.length <= maximo) return primera;
  let salida = '';
  for (const ch of Array.from(primera)) {
    if (salida.length + ch.length > maximo - 1) break;
    salida += ch;
  }
  return `${salida.trimEnd()}…`;
};
