/*
 * WEE AI EVALUATION ENGINE — F2-C1: el dataset REAL pequeño del Model Router y sus graders DETERMINISTAS.
 *
 * Casos mínimos y controlados (text.generate) para ejercitar una generación real y medir con graders deterministas
 * (sin juez-LLM): que haya texto, que el coste y la latencia queden registrados. Es un dataset del CONTRATO COMÚN
 * (`motor/contrato.ts`: versión, `evalCaseId`, `expected`) y cada grader puntúa en una dimensión común. El límite de
 * casos por ejecución es duro.
 */
import type { CapabilityId } from '../creator/types';
import type { EngineResult } from '../engine/types';
import type { DatasetDeEval } from './motor/contrato';
import type { Grader } from './motor/dominios';

export const DOMINIO = 'router';

/** Tope DURO de casos por ejecución (control de coste; F2-C1 pide ejecuciones mínimas). */
export const LIMITE_DE_CASOS = 3;

/** Versión de los graders de abajo (entra en la huella de reproducibilidad de cada corrida). */
export const VERSION_DE_GRADERS = 'router-real@1';

export interface CasoReal {
  evalCaseId: string;
  capability: CapabilityId;
  prompt: string;
  expected: { kind: 'text' };
}

/* Prompts triviales y deterministas en intención; no contienen datos de personas. */
export const CASOS_REALES: readonly CasoReal[] = [
  { evalCaseId: 'saludo', capability: 'text.generate', prompt: 'Responde solo con la palabra: hola', expected: { kind: 'text' } },
  { evalCaseId: 'numero', capability: 'text.generate', prompt: '¿Cuánto es dos más dos? Responde solo con el número.', expected: { kind: 'text' } },
  { evalCaseId: 'color', capability: 'text.generate', prompt: 'Nombra un color. Una sola palabra.', expected: { kind: 'text' } },
];

/** El dataset real del Router, con la forma común. */
export const DATASET_REAL: DatasetDeEval<CasoReal> = Object.freeze({ version: 1, dominio: DOMINIO, casos: CASOS_REALES });

/**
 * Graders DETERMINISTAS sobre el resultado de una generación real. No juzgan la "calidad" subjetiva (eso sería un
 * juez-LLM, no autorizado): comprueban que la generación produjo el tipo de salida esperado y texto, y que el
 * coste/latencia quedaron medidos.
 */
export const graduar = (res: EngineResult, providerCostUsd: number, caso: CasoReal): Grader[] => {
  const out = res.output || ({} as EngineResult['output']);
  const contenido = typeof out.content === 'string' ? out.content : '';
  return [
    { id: 'salida/es-texto', dimension: 'QUALITY', ok: out.kind === caso.expected.kind, detail: `kind=${out.kind}` },
    { id: 'salida/no-vacia', dimension: 'QUALITY', ok: contenido.trim().length > 0, detail: `len=${contenido.trim().length}` },
    { id: 'coste/registrado', dimension: 'COST', ok: typeof providerCostUsd === 'number' && Number.isFinite(providerCostUsd) && providerCostUsd >= 0, detail: `usd=${providerCostUsd}` },
    { id: 'latencia/registrada', dimension: 'LATENCY', ok: typeof res.latencyMs === 'number' && Number.isFinite(res.latencyMs) && res.latencyMs >= 0, detail: `ms=${res.latencyMs}` },
  ];
};
