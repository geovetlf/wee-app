/*
 * WEE AI EVALUATION ENGINE — F2-C1: el CORREDOR REAL, en infraestructura de WEE.
 *
 * Callable de ADMINISTRACIÓN que ejecuta una evaluación del Model Router con el proveedor REAL, graders
 * DETERMINISTAS y persistencia en Firestore (`evalRuns`), bajo un presupuesto propio FAIL-CLOSED. Reutiliza el
 * motor vivo (`engine.generate`) y su libro (`aiGenerations`); el gasto se mide en `providerCost` y se contabiliza
 * en `evalUsage/{día}` (por `attribution:'eval'`), NUNCA en los Credits del usuario.
 *
 * Reglas duras:
 *  · ADMIN-ONLY (`assertAdmin`), DESHABILITABLE y FAIL-CLOSED: sin `aiSettings/evalBudget.habilitado === true` no corre.
 *  · HARD CAP por RESERVA + RECONCILIACIÓN (hardening de F2-C1; lógica pura en `presupuesto.ts`):
 *      1. ANTES de cada caso se RESERVA su TECHO en `evalUsage/{día}.reservedUsd`, en una transacción que exige
 *         gastado + reservado + techo ≤ tope. Si no cabe → BUDGET_EXCEEDED, sin ejecutar. Dos corridas a la vez no
 *         pueden pasar ambas (Firestore serializa las transacciones sobre el mismo documento).
 *      2. La generación lleva `maxOutputTokens`: la única palanca por llamada que ofrecen los proveedores de texto.
 *      3. Después se lee el coste REAL de TODOS los intentos del caso (el router prueba candidatos en cadena).
 *      4. La reserva se LIBERA siempre (haya ido bien o mal); lo real ya lo contabilizó el libro en `byProvider`.
 *      5. Si lo real supera el techo —o no se puede saber— → COST_OVERRUN: se detiene, no sigue a ciegas.
 *  · Tope DURO de casos por ejecución. Idempotente por `requestKey`. Cancelable. Deja rastro de auditoría.
 *  · NO cobra Credits: no importa ni llama al Credit Engine. No cambia producción, ni el Router, ni modelos/config.
 */
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { createHash } from 'node:crypto';
import { MODEL_SECRETS } from '../secrets';
import { assertAdmin } from '../shared/admin';
import { engine } from '../engine';
import type { EngineResult } from '../engine/types';
import { CASOS_REALES, LIMITE_DE_CASOS, DOMINIO, graduar } from './datos';
import { EstadoPresupuesto, cabeLaReserva, excesoDeSobrecoste, huboSobrecoste, microUsd, restanteParaReservar } from './presupuesto';

const db = () => getFirestore();
const diaUTC = (t: Date) => `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

/**
 * TECHO por caso por defecto (USD), si `aiSettings/evalBudget.maxUsdPerCaso` no lo fija. Tiene que cubrir el peor
 * caso de UN caso CON sus reintentos en cadena: (intentos) × (entrada × tarifa + `maxOutputTokens` × tarifa de
 * salida). Con 64 tokens de salida y prompts de una línea, cada intento cuesta milésimas: 0,05 deja mucho margen.
 */
export const TECHO_POR_CASO_POR_DEFECTO_USD = 0.05;
/** Tokens de SALIDA por llamada (la palanca de coste del proveedor). Los casos piden una palabra o un número. */
export const MAX_OUTPUT_TOKENS_POR_DEFECTO = 64;
/** Nunca se piden más que esto, lo diga quien lo diga la configuración. */
export const MAX_OUTPUT_TOKENS_TOPE = 1024;

interface Presupuesto { habilitado: boolean; maxUsdPerDay: number; techoPorCasoUsd: number; maxOutputTokens: number; }

const positivo = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** Lee `aiSettings/evalBudget`. FAIL-CLOSED: si falta, no está habilitado o el tope no es positivo → no se corre. */
const leerPresupuesto = async (): Promise<Presupuesto> => {
  const snap = await db().collection('aiSettings').doc('evalBudget').get();
  const d = (snap.exists ? snap.data() : {}) || {};
  const tokens = positivo(d.maxOutputTokens) ? Math.floor(d.maxOutputTokens) : MAX_OUTPUT_TOKENS_POR_DEFECTO;
  return {
    habilitado: d.habilitado === true,
    maxUsdPerDay: positivo(d.maxUsdPerDay) ? d.maxUsdPerDay : 0,
    techoPorCasoUsd: positivo(d.maxUsdPerCaso) ? d.maxUsdPerCaso : TECHO_POR_CASO_POR_DEFECTO_USD,
    maxOutputTokens: Math.max(1, Math.min(tokens, MAX_OUTPUT_TOKENS_TOPE)),
  };
};

/** El presupuesto de HOY según `evalUsage/{día}`: gastado REAL (Σ byProvider[*].usd) y reservado VIVO. Nunca mira Credits. */
export const estadoDelDia = (data: Record<string, unknown> | undefined, limitUsd: number): EstadoPresupuesto => {
  const byProvider = ((data && data.byProvider) || {}) as Record<string, { usd?: unknown } | undefined>;
  let gastado = 0;
  for (const p of Object.values(byProvider)) if (p && typeof p.usd === 'number' && Number.isFinite(p.usd)) gastado += p.usd;
  const r = data ? data.reservedUsd : undefined;
  const reservado = typeof r === 'number' && Number.isFinite(r) && r > 0 ? r : 0;
  return { limitUsd, committedUsd: microUsd(gastado), reservedUsd: microUsd(reservado) };
};

/**
 * RESERVA atómica del techo de un caso. En UNA transacción sobre `evalUsage/{día}`: lee lo gastado y lo reservado
 * y, solo si `cabeLaReserva`, suma el techo a `reservedUsd`. Si no cabe no escribe nada.
 */
export const reservarTecho = async (dia: string, limitUsd: number, techoUsd: number): Promise<{ reservado: boolean; estado: EstadoPresupuesto }> => {
  const ref = db().collection('evalUsage').doc(dia);
  return db().runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const estado = estadoDelDia(s.exists ? (s.data() as Record<string, unknown>) : undefined, limitUsd);
    if (!cabeLaReserva(estado, techoUsd)) return { reservado: false, estado };
    const reservedUsd = microUsd(estado.reservedUsd + techoUsd);
    tx.set(ref, { reservedUsd, updatedAt: Timestamp.now() }, { merge: true });
    return { reservado: true, estado: { ...estado, reservedUsd } };
  });
};

/** LIBERA atómicamente el techo de un caso. Se llama SIEMPRE tras el intento. Nunca deja `reservedUsd` por debajo de 0. */
export const liberarTecho = async (dia: string, techoUsd: number): Promise<void> => {
  const ref = db().collection('evalUsage').doc(dia);
  await db().runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const r = s.exists ? s.data()?.reservedUsd : undefined;
    const actual = typeof r === 'number' && Number.isFinite(r) ? r : 0;
    tx.set(ref, { reservedUsd: microUsd(Math.max(0, actual - techoUsd)), updatedAt: Timestamp.now() }, { merge: true });
  });
};

/**
 * El coste REAL de un caso: la SUMA de todos sus intentos. El router prueba candidatos en cadena y cada intento abre
 * su propia generación con el mismo `requestId`. Por intento: lo medido (`providerCost`) y, si falló después de
 * llegar al proveedor, su coste en riesgo (`providerCostEstimated` con `providerCostStatus: 'desconocido'`, H0 #22).
 * Devuelve NaN si algún coste medido no es un número: quien llama lo trata como sobrecoste (fail-closed).
 */
/** Más intentos que esto en un solo caso no cabe con las cadenas de hoy; si apareciera, el coste no se da por sabido. */
export const MAX_INTENTOS_POR_CASO = 20;
export const costeRealDelCaso = async (requestId: string): Promise<number> => {
  /*
   * Consulta ACOTADA: se piden MAX_INTENTOS_POR_CASO + 1. Si llegan más, no se puede afirmar que se sumaron todos
   * los intentos y el coste se declara DESCONOCIDO (NaN → COST_OVERRUN): acotar nunca puede restar coste.
   */
  const snap = await db().collection('aiGenerations').where('requestId', '==', requestId).limit(MAX_INTENTOS_POR_CASO + 1).get();
  if (snap.size > MAX_INTENTOS_POR_CASO) return NaN;
  let total = 0;
  for (const d of snap.docs) {
    const g = d.data();
    if (typeof g.providerCost !== 'number' || !Number.isFinite(g.providerCost)) return NaN;
    total += g.providerCost;
    if (g.providerCostStatus === 'desconocido' && typeof g.providerCostEstimated === 'number' && Number.isFinite(g.providerCostEstimated)) {
      total += g.providerCostEstimated;
    }
  }
  return microUsd(total);
};

/** Cómo se lee el coste real de un caso. El de verdad mira `aiGenerations`; las pruebas lo sustituyen (coste $0). */
export type LectorDeCoste = (requestId: string) => Promise<number>;

export interface EntradaEvalRun {
  dominio?: string; maxCasos?: number; requestKey?: string; evalRunId?: string; cancelar?: boolean;
  /** Techo por caso que pide quien llama. Solo puede SUBIR el configurado (más conservador): nunca debilita el hard cap. */
  costeEstimadoPorCasoUsd?: number;
}

interface Sobrecoste { caso: string; techoUsd: number; realUsd: number | null; excesoUsd: number | null; motivo: 'coste_real_mayor_que_el_techo' | 'coste_real_desconocido'; }

const mensajeDe = (e: unknown) => String((e as Error)?.message || e).slice(0, 200);

/**
 * Ejecuta —o cancela— una corrida de evaluación. Exportada aparte del `onCall` para poder probarla contra el
 * emulador de Firestore sin el emulador de Functions. `ahora` y `leerCosteReal` se inyectan en pruebas.
 */
export const ejecutarEvalRun = async (
  auth: { uid: string; token?: Record<string, unknown> } | undefined,
  data: EntradaEvalRun = {},
  ahora: () => Date = () => new Date(),
  leerCosteReal: LectorDeCoste = costeRealDelCaso,
) => {
  assertAdmin(auth);
  const presupuesto = await leerPresupuesto();
  if (!presupuesto.habilitado) throw new HttpsError('failed-precondition', 'evals_deshabilitado');
  if (presupuesto.maxUsdPerDay <= 0) throw new HttpsError('failed-precondition', 'eval_sin_presupuesto');
  if ((data.dominio || DOMINIO) !== DOMINIO) throw new HttpsError('invalid-argument', 'dominio_no_soportado');

  // Cancelación: marca la corrida para que se detenga antes del siguiente caso.
  if (data.cancelar === true) {
    if (!data.evalRunId) throw new HttpsError('invalid-argument', 'falta_evalRunId');
    await db().collection('evalRuns').doc(data.evalRunId).set({ cancelSolicitado: true, canceladoPor: auth!.uid, updatedAt: Timestamp.now() }, { merge: true });
    return { evalRunId: data.evalRunId, cancelSolicitado: true };
  }

  const t0 = ahora();
  const dia = diaUTC(t0);
  const nCasos = Math.max(1, Math.min(data.maxCasos ?? LIMITE_DE_CASOS, LIMITE_DE_CASOS, CASOS_REALES.length));
  const casos = CASOS_REALES.slice(0, nCasos);
  const evalRunId = data.requestKey ? `evalrun_${sha(data.requestKey).slice(0, 24)}` : `evalrun_${sha(`${dia}:${nCasos}:${t0.getTime()}`).slice(0, 24)}`;
  const pedido = typeof data.costeEstimadoPorCasoUsd === 'number' && Number.isFinite(data.costeEstimadoPorCasoUsd) ? data.costeEstimadoPorCasoUsd : 0;
  const techoPorCaso = microUsd(Math.max(presupuesto.techoPorCasoUsd, pedido));
  const ref = db().collection('evalRuns').doc(evalRunId);

  // Idempotencia: si ya existe, se devuelve tal cual (no se duplica ni se re-ejecuta, ni se reserva otra vez).
  const creado = await db().runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (s.exists) return { run: s.data(), nuevo: false };
    const run = {
      evalRunId, identidad: 'eval', dominio: DOMINIO, status: 'RUNNING',
      requestedBy: auth!.uid, requestKey: data.requestKey ?? null,
      datasetVersion: 1, nCasos,
      budgetLimit: presupuesto.maxUsdPerDay, techoPorCasoUsd: techoPorCaso, maxOutputTokens: presupuesto.maxOutputTokens,
      startedAt: Timestamp.now(), completedAt: null, cancelSolicitado: false,
      historial: [{ estado: 'RUNNING', en: Timestamp.now() }],
    };
    tx.set(ref, run);
    return { run, nuevo: true };
  });
  if (!creado.nuevo) return { evalRunId, reanudado: true, run: creado.run };

  const resultados: Array<{ caso: string; provider: string; model: string; intentos: number; providerCost: number; latencyMs: number; aprobado: boolean }> = [];
  let estadoFinal = 'COMPLETED';
  let costeDeLaCorrida = 0;
  let sobrecoste: Sobrecoste | null = null;
  let motivoDeParada: 'cancelada' | 'evals_deshabilitado' | null = null;
  let limite = presupuesto.maxUsdPerDay;

  for (const caso of casos) {
    // El interruptor y el tope VIGENTES, releídos antes de cada caso: apagar las evals —o bajar el tope— surte efecto
    // ANTES del siguiente caso, no solo en la próxima corrida. El techo por caso sigue siendo el declarado al empezar.
    const vigente = await leerPresupuesto();
    if (!vigente.habilitado || vigente.maxUsdPerDay <= 0) { estadoFinal = 'CANCELLED'; motivoDeParada = 'evals_deshabilitado'; break; }
    limite = vigente.maxUsdPerDay;
    // Cancelación cooperativa: se relee la marca antes de cada caso (y antes de reservar nada).
    const vivo = (await ref.get()).data();
    if (vivo?.cancelSolicitado === true) { estadoFinal = 'CANCELLED'; motivoDeParada = 'cancelada'; break; }
    const casoRef = ref.collection('casos').doc(caso.id);
    if ((await casoRef.get()).exists) continue; // idempotencia por caso: ni se reserva ni se ejecuta otra vez

    // 1 · RESERVA del techo, atómica, contra el tope vigente. Si no cabe → BUDGET_EXCEEDED sin ejecutar.
    const reserva = await reservarTecho(dia, limite, techoPorCaso);
    if (!reserva.reservado) { estadoFinal = 'BUDGET_EXCEEDED'; break; }

    // 2 · Generación con tope de tokens · 3 · coste real de TODOS los intentos · 4 · liberar la reserva SIEMPRE.
    const requestId = `${evalRunId}:${caso.id}`;
    let res: EngineResult | undefined;
    let fallo: unknown = null;
    let real = NaN;
    try {
      try {
        res = await engine.generate({
          capability: caso.capability, input: { prompt: caso.prompt, maxOutputTokens: presupuesto.maxOutputTokens },
          userId: 'eval', requestId, attribution: 'eval', evalRunId,
        });
      } catch (e) {
        fallo = e;
      }
      // Haya ido bien o mal: un intento que falló después de llegar al proveedor también pudo costar.
      real = await leerCosteReal(requestId);
    } catch {
      real = NaN;
    } finally {
      await liberarTecho(dia, techoPorCaso);
    }
    const conocido = Number.isFinite(real);
    if (conocido) costeDeLaCorrida = microUsd(costeDeLaCorrida + real);
    const delMotor = res ? { generationId: res.generationId, provider: res.provider, model: res.modelId, intentos: res.attempts } : {};

    // 5 · RECONCILIACIÓN: lo real por encima del techo —o desconocido— DETIENE la corrida. No se sigue a ciegas.
    if (!conocido || huboSobrecoste(techoPorCaso, real)) {
      estadoFinal = 'COST_OVERRUN';
      sobrecoste = {
        caso: caso.id, techoUsd: techoPorCaso, realUsd: conocido ? real : null,
        excesoUsd: conocido ? excesoDeSobrecoste(techoPorCaso, real) : null,
        motivo: conocido ? 'coste_real_mayor_que_el_techo' : 'coste_real_desconocido',
      };
      await casoRef.set({ caso: caso.id, ...delMotor, reservaUsd: techoPorCaso, providerCost: conocido ? real : null, sobrecoste: true, ...(fallo ? { error: mensajeDe(fallo) } : {}), en: Timestamp.now() });
      break;
    }
    if (fallo || !res) {
      estadoFinal = 'FAILED';
      await casoRef.set({ caso: caso.id, reservaUsd: techoPorCaso, providerCost: real, sobrecoste: false, error: mensajeDe(fallo), en: Timestamp.now() });
      break;
    }
    const graders = graduar(res, real);
    const aprobado = graders.every((g) => g.ok);
    await casoRef.set({ caso: caso.id, ...delMotor, demo: res.demo, reservaUsd: techoPorCaso, providerCost: real, sobrecoste: false, latencyMs: res.latencyMs, graders, aprobado, en: Timestamp.now() });
    resultados.push({ caso: caso.id, provider: res.provider, model: res.modelId, intentos: res.attempts, providerCost: real, latencyMs: res.latencyMs, aprobado });
  }

  // El estado del día DESPUÉS: gastado real, lo que sigue reservado (otras corridas en vuelo) y lo que queda, con el tope vigente.
  const despues = estadoDelDia((await db().collection('evalUsage').doc(dia).get()).data() as Record<string, unknown> | undefined, limite);
  const aprobados = resultados.filter((r) => r.aprobado).length;
  const final = {
    status: estadoFinal, completedAt: Timestamp.now(),
    budgetLimit: limite, budgetUsed: despues.committedUsd, budgetReserved: despues.reservedUsd,
    budgetRemaining: restanteParaReservar(despues), costUsd: costeDeLaCorrida,
    ...(sobrecoste ? { sobrecoste } : {}),
    ...(motivoDeParada ? { motivoDeParada } : {}),
    metrics: { n: resultados.length, aprobados, overall: resultados.length ? aprobados / resultados.length : 0 },
    historial: FieldValue.arrayUnion({ estado: estadoFinal, en: Timestamp.now() }),
  };
  await ref.set(final, { merge: true });
  return {
    evalRunId, status: estadoFinal, budgetLimit: limite, budgetUsed: despues.committedUsd,
    budgetReserved: despues.reservedUsd, budgetRemaining: final.budgetRemaining, costUsd: costeDeLaCorrida,
    techoPorCasoUsd: techoPorCaso, maxOutputTokens: presupuesto.maxOutputTokens,
    ...(sobrecoste ? { sobrecoste } : {}), ...(motivoDeParada ? { motivoDeParada } : {}), metrics: final.metrics, resultados,
  };
};

/** El callable servido por el runtime: ADMIN-ONLY, con los secretos de los proveedores de texto. */
export const evalRun = onCall({ region: 'us-central1', timeoutSeconds: 300, secrets: MODEL_SECRETS }, async (request) =>
  ejecutarEvalRun(request.auth as { uid: string; token?: Record<string, unknown> } | undefined, (request.data || {}) as EntradaEvalRun));
