/*
 * WEE AI EVALUATION ENGINE — F2-C1: dataset real pequeño y graders DETERMINISTAS del Model Router.
 *
 * Primer dominio: SOLO Model Router. Casos mínimos y controlados (text.generate) para ejercitar una generación real
 * y medir con graders deterministas (sin juez-LLM): que haya texto, que el coste y la latencia queden registrados.
 * El límite de casos por ejecución es duro.
 */
import type { CapabilityId } from '../creator/types';
import type { EngineResult } from '../engine/types';

export const DOMINIO = 'router';

/** Tope DURO de casos por ejecución (control de coste; F2-C1 pide ejecuciones mínimas). */
export const LIMITE_DE_CASOS = 3;

export interface CasoReal { id: string; capability: CapabilityId; prompt: string; }

/* Prompts triviales y deterministas en intención; no contienen datos de personas. */
export const CASOS_REALES: CasoReal[] = [
  { id: 'saludo', capability: 'text.generate', prompt: 'Responde solo con la palabra: hola' },
  { id: 'numero', capability: 'text.generate', prompt: '¿Cuánto es dos más dos? Responde solo con el número.' },
  { id: 'color', capability: 'text.generate', prompt: 'Nombra un color. Una sola palabra.' },
];

export interface ResultadoDeGrader { id: string; ok: boolean; detail: string; }

/**
 * Graders DETERMINISTAS sobre el resultado de una generación real. No juzgan la "calidad" subjetiva (eso sería un
 * juez-LLM, no autorizado): comprueban que la generación produjo texto y que el coste/latencia quedaron medidos.
 */
export const graduar = (res: EngineResult, providerCostUsd: number): ResultadoDeGrader[] => {
  const out = res.output || ({} as EngineResult['output']);
  const contenido = typeof out.content === 'string' ? out.content : '';
  return [
    { id: 'salida/es-texto', ok: out.kind === 'text', detail: `kind=${out.kind}` },
    { id: 'salida/no-vacia', ok: contenido.trim().length > 0, detail: `len=${contenido.trim().length}` },
    { id: 'coste/registrado', ok: typeof providerCostUsd === 'number' && Number.isFinite(providerCostUsd) && providerCostUsd >= 0, detail: `usd=${providerCostUsd}` },
    { id: 'latencia/registrada', ok: typeof res.latencyMs === 'number' && Number.isFinite(res.latencyMs) && res.latencyMs >= 0, detail: `ms=${res.latencyMs}` },
  ];
};
