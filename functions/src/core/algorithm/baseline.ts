/**
 * WEE ALGORITHM ENGINE — LA LÍNEA BASE.
 *
 * ── Qué es esto, dicho sin adornos ──────────────────────────────────────────
 *
 * NO es inteligencia. Es la referencia contra la que se mide si el motor de
 * decisión aporta algo. Coge la primera opción válida en orden alfabético y
 * ya está.
 *
 * Existe porque «el algoritmo eligió B» no significa nada por sí solo. Lo que
 * significa algo es «el algoritmo eligió B y la línea base habría elegido A, y
 * B sale 0,09 mejor en calidad por 0,02 $ menos». Sin esto, cualquier motor
 * parece que funciona — se mide a sí mismo.
 *
 * ── Por qué aplica las mismas restricciones ─────────────────────────────────
 *
 * Porque si no, la comparación mediría dos cosas a la vez: elegir bien y
 * respetar límites. Se reutiliza EL MISMO filtro del motor —no una copia—, así
 * que la única diferencia entre los dos caminos es cómo se elige entre lo que
 * quedó. Eso es lo que hace que el delta signifique algo.
 *
 * ── Y por qué no se puede activar ───────────────────────────────────────────
 *
 * Su descriptor nace y se queda en `draft`: no resuelve nada, no se elige solo
 * y nadie puede ponerlo a decidir de verdad por descuido. Un baseline en
 * producción es un sistema sin criterio con aspecto de tenerlo.
 */

import { ALGORITHM_CONTRACT_VERSION } from '../contracts';
import { AlgorithmDescriptor, referenciaDeAlgoritmo } from './types';
import { crearContador, presupuestoEfectivo } from './budget';
import { Alternative } from './scoring';
import { AlgorithmDecision, DecisionContext, JudgedOption, sinDecision } from './decision';
import {
  OpcionesDelMotor,
  PoliticaDeDatoAusente,
  estrategiaPorDefecto,
  filtrarPorRestricciones,
  problemasDelContexto,
  restriccionesEfectivas,
} from './decision-engine';

export const BASELINE_ID = 'linea-base-lexica';
export const BASELINE_VERSION = 1;
export const BASELINE_REF = referenciaDeAlgoritmo(BASELINE_ID, BASELINE_VERSION);

export const DESCRIPTOR_DE_LA_BASE: AlgorithmDescriptor = Object.freeze({
  id: BASELINE_ID,
  version: BASELINE_VERSION,
  contract: ALGORITHM_CONTRACT_VERSION,
  category: 'decision',
  /* Nunca sube de aquí. Es una regla, no un estado provisional. */
  status: 'draft',
  purity: 'pure',
  purpose: 'Referencia experimental: la primera opción válida por orden alfabético. No es inteligencia',
});

/**
 * La línea base. Misma entrada y misma salida que el motor, para que se puedan
 * comparar sin traducir nada entre los dos.
 */
export const crearLineaBase = <T = unknown>(opciones: OpcionesDelMotor = {}) => {
  const politica = {
    datoAusente: opciones.datoAusente ?? ('reject' as PoliticaDeDatoAusente),
    estrategiaDe: opciones.estrategiaDe ?? estrategiaPorDefecto,
    ahora: opciones.ahora,
  };

  const decidir = (ctx: DecisionContext<T>): AlgorithmDecision<T> => {
    const contador = crearContador(presupuestoEfectivo(ctx?.budget), politica.ahora);
    contador.gastar('algorithmCalls');
    const malos = problemasDelContexto(ctx);
    if (malos.length) {
      return sinDecision<T>(BASELINE_REF, {
        objective: ctx?.objective ?? { weights: {} },
        trace: ctx?.trace ?? { traceId: '', requestId: '', userId: '' },
      }, 'algorithm_failure', contador.gasto());
    }
    const base = { objective: ctx.objective, trace: ctx.trace };
    const constraints = restriccionesEfectivas(ctx);
    const todas = ctx.options ?? [];
    if (!todas.length) return sinDecision<T>(BASELINE_REF, base, 'insufficient_evidence', contador.gasto());

    const consideradas: Alternative<T>[] = [];
    for (const o of todas) { if (!contador.gastar('candidates')) break; consideradas.push(o); }

    const veredictos = filtrarPorRestricciones(consideradas, constraints, politica);
    const validas = veredictos.filter((v) => v.eligible).map((v) => v.id).sort();
    if (!validas.length) return sinDecision<T>(BASELINE_REF, base, 'no_valid_strategy', contador.gasto());

    const elegido = validas[0];
    const valorDe = (id: string) => (consideradas.find((o) => o.id === id) as Alternative<T>).value;
    const candidates: JudgedOption<T>[] = veredictos.map((v) => ({
      id: v.id, value: valorDe(v.id), eligible: v.eligible,
      reason: v.eligible ? (v.id === elegido ? 'selected' : 'later_in_order') : v.reason,
    }));

    return {
      contract: ALGORITHM_CONTRACT_VERSION,
      status: 'decided',
      algorithm: BASELINE_REF,
      selected: valorDe(elegido),
      alternatives: Object.freeze(validas.slice(1).map(valorDe)),
      candidates: Object.freeze(candidates),
      /*
       * Cero, y con su motivo escrito. La línea base no mira evidencia, así que
       * decir cualquier otra cosa sería fingir un criterio que no tiene.
       */
      confidence: { kind: 'algorithm', value: 0, basis: [], because: 'la línea base no mira evidencia' },
      uncertainty: 'unknown',
      evidence: [],
      warnings: [],
      objective: ctx.objective,
      constraints,
      explanation: Object.freeze([
        `Línea base: se eligió «${elegido}» por ser la primera válida en orden alfabético.`,
        'No es una decisión informada: existe para medir contra ella.',
      ]),
      spend: contador.gasto(),
      trace: ctx.trace,
    };
  };

  return { descriptor: DESCRIPTOR_DE_LA_BASE, decidir };
};
