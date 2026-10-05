/*
 * WEE AI EVALUATION ENGINE — PRESUPUESTO (F2-B).
 *
 * El dinero de las evaluaciones es COMPLETAMENTE AJENO a los Credits del usuario. Una evaluación interna no cobra a
 * nadie: gasta contra una IDENTIDAD PRESUPUESTARIA PROPIA (`eval`), medida en `providerCost` (USD) —el mismo número
 * que el libro `aiGenerations` ya mide—, NUNCA contra `users.creditsBalance` ni `creditTransactions`.
 *
 * Es lógica PURA (decisiones sobre números), igual que el tope diario del router (`engine/router.ts`). En F2-A/F2-B
 * el coste real es $0 (todo con fakes deterministas), pero la máquina del presupuesto se implementa y se prueba con
 * costes simulados para demostrar que es FAIL-CLOSED: ante la duda, no se gasta.
 *
 * El cobro real al proveedor y la persistencia (Firestore) llegan en F2-C; aquí solo vive la DECISIÓN.
 */

/** La identidad presupuestaria de las evaluaciones. No es —ni puede ser— un usuario. */
export const IDENTIDAD_EVAL = 'eval';

/** Un identificador de usuario nunca debe usarse como identidad de eval, ni al revés. Candado explícito. */
export const esIdentidadEval = (id) => id === IDENTIDAD_EVAL;
export const pareceUsuario = (id) => typeof id === 'string' && (id.startsWith('hidi_') || /^[A-Za-z0-9]{20,}$/.test(id));

/**
 * ¿Se puede gastar `costeEstimadoUsd` más en evaluaciones hoy? FAIL-CLOSED:
 *  · presupuesto deshabilitado           → NO (`deshabilitado`)
 *  · tope ausente / ≤ 0 / no numérico    → NO (`sin_tope`)
 *  · coste no numérico o negativo        → NO (`coste_invalido`)
 *  · gastadoHoy + costeEstimado > tope   → NO (`presupuesto_agotado`)
 *  · en otro caso                        → SÍ
 * Nunca «sigue gastando por defecto»: solo se gasta si el número cabe con certeza.
 */
export const decidirPresupuesto = ({ habilitado, maxUsdPerDay, gastadoHoyUsd = 0, costeEstimadoUsd = 0 } = {}) => {
  if (habilitado !== true) return { permite: false, motivo: 'deshabilitado' };
  if (typeof maxUsdPerDay !== 'number' || !Number.isFinite(maxUsdPerDay) || maxUsdPerDay <= 0) return { permite: false, motivo: 'sin_tope' };
  if (typeof gastadoHoyUsd !== 'number' || !Number.isFinite(gastadoHoyUsd) || gastadoHoyUsd < 0) return { permite: false, motivo: 'gasto_invalido' };
  if (typeof costeEstimadoUsd !== 'number' || !Number.isFinite(costeEstimadoUsd) || costeEstimadoUsd < 0) return { permite: false, motivo: 'coste_invalido' };
  if (gastadoHoyUsd + costeEstimadoUsd > maxUsdPerDay + 1e-9) return { permite: false, motivo: 'presupuesto_agotado', restante: redondear(maxUsdPerDay - gastadoHoyUsd) };
  return { permite: true, motivo: 'dentro_de_presupuesto', restante: redondear(maxUsdPerDay - gastadoHoyUsd - costeEstimadoUsd) };
};

/**
 * Acumulador del gasto de eval del día, por `evalRunId`. SOLO suma `providerCost` (USD) de generaciones marcadas
 * como de eval; nunca mira Credits de usuario. Idempotente por `generationId` (sumar dos veces la misma no cuenta).
 */
export const crearAcumuladorDeGasto = () => {
  const vistos = new Set();
  let totalUsd = 0;
  return {
    sumar(generationId, providerCostUsd) {
      if (vistos.has(generationId)) return totalUsd;
      vistos.add(generationId);
      if (typeof providerCostUsd === 'number' && Number.isFinite(providerCostUsd) && providerCostUsd > 0) totalUsd += providerCostUsd;
      return redondear(totalUsd);
    },
    get total() { return redondear(totalUsd); },
    get n() { return vistos.size; },
  };
};

const redondear = (x) => Math.round(x * 1e6) / 1e6;
