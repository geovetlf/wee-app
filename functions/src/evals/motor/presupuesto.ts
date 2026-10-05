/*
 * WEË AI EVALUATION ENGINE — EL PRESUPUESTO (uno, para el gasto simulado y para el real).
 *
 * El dinero de las evaluaciones es COMPLETAMENTE AJENO a los Credits del usuario. Una evaluación interna no cobra a
 * nadie: gasta contra una IDENTIDAD PRESUPUESTARIA PROPIA (`eval`), medida en `providerCost` (USD) —el mismo número
 * que el libro `aiGenerations` ya mide—, NUNCA contra el saldo ni el historial de Credits de nadie.
 *
 * Dos piezas, las dos lógica PURA (sin Firestore, sin red, sin reloj):
 *  · la DECISIÓN fail-closed (`decidirPresupuesto`) y el acumulador del gasto de una corrida, que el corredor usa
 *    siempre (en desarrollo, con costes simulados);
 *  · la RESERVA y la RECONCILIACIÓN que hacen del tope un hard cap cuando el gasto es real (F2-C1, hardening):
 *    el control «gasto + estimado ≤ tope» NO es un hard cap —si lo real supera lo estimado, el día acaba por encima
 *    del tope—. El hard cap se consigue RESERVANDO el TECHO de cada caso ANTES de ejecutarlo y reconciliando con el
 *    coste real después:
 *
 *      INVARIANTE:  committedUsd + reservedUsd ≤ limitUsd   (se comprueba en transacción antes de CADA generación)
 *
 *    Con committed=8, un caso de techo 3 exige 8+3≤10 → 11≤10 → NO cabe, no se ejecuta. Si aun así lo real supera
 *    el techo, `huboSobrecoste` lo detecta y el corredor se DETIENE (COST_OVERRUN): no sigue a ciegas.
 */

/** La identidad presupuestaria de las evaluaciones. No es —ni puede ser— un usuario. */
export const IDENTIDAD_EVAL = 'eval';

/** Margen numérico para comparar dinero en coma flotante (microdólar). */
export const EPSILON = 1e-9;

/** Redondeo a microdólar, para que las sumas de dinero no arrastren ruido binario. */
export const microUsd = (usd: number): number => Math.round(usd * 1e6) / 1e6;

/** Un identificador de usuario nunca debe usarse como identidad de eval, ni al revés. Candado explícito. */
export const esIdentidadEval = (id: unknown): boolean => id === IDENTIDAD_EVAL;
export const pareceUsuario = (id: unknown): boolean => typeof id === 'string' && (id.startsWith('hidi_') || /^[A-Za-z0-9]{20,}$/.test(id));

export interface PeticionDePresupuesto {
  habilitado?: unknown;
  maxUsdPerDay?: unknown;
  gastadoHoyUsd?: unknown;
  costeEstimadoUsd?: unknown;
}

export interface DecisionDePresupuesto {
  permite: boolean;
  motivo: string;
  restante?: number;
}

const finito = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * ¿Se puede gastar `costeEstimadoUsd` más en evaluaciones hoy? FAIL-CLOSED:
 *  · presupuesto deshabilitado           → NO (`deshabilitado`)
 *  · tope ausente / ≤ 0 / no numérico    → NO (`sin_tope`)
 *  · coste no numérico o negativo        → NO (`coste_invalido`)
 *  · gastadoHoy + costeEstimado > tope   → NO (`presupuesto_agotado`)
 *  · en otro caso                        → SÍ
 * Nunca «sigue gastando por defecto»: solo se gasta si el número cabe con certeza.
 */
export const decidirPresupuesto = ({ habilitado, maxUsdPerDay, gastadoHoyUsd = 0, costeEstimadoUsd = 0 }: PeticionDePresupuesto = {}): DecisionDePresupuesto => {
  if (habilitado !== true) return { permite: false, motivo: 'deshabilitado' };
  if (!finito(maxUsdPerDay) || maxUsdPerDay <= 0) return { permite: false, motivo: 'sin_tope' };
  if (!finito(gastadoHoyUsd) || gastadoHoyUsd < 0) return { permite: false, motivo: 'gasto_invalido' };
  if (!finito(costeEstimadoUsd) || costeEstimadoUsd < 0) return { permite: false, motivo: 'coste_invalido' };
  if (gastadoHoyUsd + costeEstimadoUsd > maxUsdPerDay + EPSILON) return { permite: false, motivo: 'presupuesto_agotado', restante: microUsd(maxUsdPerDay - gastadoHoyUsd) };
  return { permite: true, motivo: 'dentro_de_presupuesto', restante: microUsd(maxUsdPerDay - gastadoHoyUsd - costeEstimadoUsd) };
};

/**
 * Acumulador del gasto de eval de una corrida. SOLO suma `providerCost` (USD) de generaciones marcadas como de eval;
 * nunca mira Credits de usuario. Idempotente por clave (sumar dos veces la misma no cuenta).
 */
export const crearAcumuladorDeGasto = () => {
  const vistos = new Set<string>();
  let totalUsd = 0;
  return {
    sumar(clave: string, providerCostUsd: unknown): number {
      if (vistos.has(clave)) return totalUsd;
      vistos.add(clave);
      if (finito(providerCostUsd) && providerCostUsd > 0) totalUsd += providerCostUsd;
      return microUsd(totalUsd);
    },
    get total(): number { return microUsd(totalUsd); },
    get n(): number { return vistos.size; },
  };
};

export interface EstadoPresupuesto {
  /** Tope diario duro, en USD. Fail-closed: ≤0 ⇒ nada cabe. */
  limitUsd: number;
  /** Gasto REAL ya contabilizado hoy. */
  committedUsd: number;
  /** Suma de las reservas VIVAS (techos de casos en vuelo, aún sin reconciliar). */
  reservedUsd: number;
}

/**
 * ¿Cabe reservar un caso más de techo `ceilingUsd`? El hard cap: lo ya gastado MÁS lo ya reservado MÁS este techo
 * no puede pasar del tope. Fail-closed: con tope ≤0, o un techo no finito/negativo, NO cabe.
 */
export const cabeLaReserva = (estado: EstadoPresupuesto, ceilingUsd: number): boolean => {
  if (!(estado.limitUsd > 0)) return false;
  if (!Number.isFinite(ceilingUsd) || ceilingUsd < 0) return false;
  return estado.committedUsd + estado.reservedUsd + ceilingUsd <= estado.limitUsd + EPSILON;
};

/** Presupuesto que queda para NUEVAS reservas: tope − gastado − reservado (nunca negativo). */
export const restanteParaReservar = (estado: EstadoPresupuesto): number =>
  microUsd(Math.max(0, estado.limitUsd - estado.committedUsd - estado.reservedUsd));

/**
 * Tras ejecutar un caso: ¿el coste REAL se pasó de su techo reservado? Si es así, el corredor debe DETENERSE sin
 * iniciar más casos (el techo falló como cota — p. ej. el proveedor no respetó `maxOutputTokens`, o cobró tokens
 * de razonamiento no acotados). El exceso de UN caso es el peor caso; detenerse acota el daño a ese caso.
 */
export const huboSobrecoste = (ceilingUsd: number, realUsd: number): boolean =>
  Number.isFinite(realUsd) && realUsd > ceilingUsd + EPSILON;

/** El exceso (USD) de un caso sobre su techo; 0 si no hubo sobrecoste. */
export const excesoDeSobrecoste = (ceilingUsd: number, realUsd: number): number =>
  huboSobrecoste(ceilingUsd, realUsd) ? microUsd(realUsd - ceilingUsd) : 0;
