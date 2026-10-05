/*
 * EL DOMINIO ROUTER, REAL — el primero que `evalRun` corre con el proveedor de verdad.
 *
 * Lo único propio del Router real: cómo se decide un caso (una generación por `engine.generate`, el MISMO embudo
 * —Router y libro incluidos— que usa el producto), sus graders deterministas (`datos.ts`) y la forma de su caso.
 * Todo lo demás —recorrer, medir, reservar, reconciliar, puntuar, los estados— es del motor común (`../motor`).
 *
 * Gasta dinero de verdad, así que se niega a correr fuera de una corrida gobernada: sin `evalRunId`/`requestId` no
 * hay a quién atribuir el gasto (`attribution: 'eval'`, evalUsage/{día}, nunca Credits de nadie), y sin
 * `maxOutputTokens` no hay techo que valga.
 */
import { engine } from '../../engine';
import type { EngineResult } from '../../engine/types';
import type { ContextoDeCaso, Dominio } from '../motor/dominios';
import { IDENTIDAD_EVAL } from '../motor/presupuesto';
import { CasoReal, graduar } from '../datos';

export interface DecisionReal {
  ejecuciones: number;
  resultado: EngineResult;
}

export const dominioRouterReal: Dominio<CasoReal, DecisionReal> = {
  id: 'router',
  descripcion: 'El Model Router del WEË AI ENGINE con el proveedor REAL (engine.generate): una generación por caso, atribuida a su corrida de evaluación.',
  async decidir(caso: CasoReal, contexto: ContextoDeCaso): Promise<DecisionReal> {
    if (!contexto || !contexto.evalRunId || !contexto.requestId) {
      throw new Error('el dominio real solo corre dentro de una corrida gobernada (sin corrida no hay presupuesto)');
    }
    const maxOutputTokens = contexto.limites.maxOutputTokens;
    if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 1) throw new Error('el dominio real exige maxOutputTokens (la palanca de coste)');
    const resultado = await engine.generate({
      capability: caso.capability, input: { prompt: caso.prompt, maxOutputTokens },
      userId: IDENTIDAD_EVAL, requestId: contexto.requestId, attribution: 'eval', evalRunId: contexto.evalRunId,
    });
    return { ejecuciones: resultado.attempts, resultado };
  },
  calificar: (decision: DecisionReal, caso: CasoReal, medicion) => graduar(decision.resultado, medicion.costeUsd, caso),
  validarCaso: (caso: CasoReal) => [
    ...(caso.capability ? [] : [`${caso.evalCaseId || '?'}: sin capability`]),
    ...(typeof caso.prompt === 'string' && caso.prompt.trim() ? [] : [`${caso.evalCaseId || '?'}: sin prompt`]),
  ],
};
