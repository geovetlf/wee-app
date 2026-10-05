/*
 * WEE AI EVALUATION ENGINE — F2-C1: `evalRun`, el camino REAL del motor común, en infraestructura de WEE.
 *
 * Callable de ADMINISTRACIÓN que ejecuta una evaluación con el proveedor REAL, graders DETERMINISTAS y persistencia
 * en Firestore (`evalRuns`), bajo un presupuesto propio FAIL-CLOSED. NO tiene corredor propio: corre el MISMO
 * corredor que las herramientas de desarrollo (`motor/corredor.ts`, `correrEvalGobernada`), con un dominio del
 * registro común (`DOMINIOS_REALES`, el Router el primero) y un ENTORNO de Firestore. Este archivo solo aporta ese
 * entorno: cómo se lee el interruptor y el tope, cómo se reserva y se libera el techo, cómo se lee el coste real y
 * dónde queda el rastro. Reutiliza el motor vivo (`engine.generate`, desde el dominio) y su libro (`aiGenerations`);
 * el gasto se mide en `providerCost` y se contabiliza en `evalUsage/{día}` (por `attribution:'eval'`), NUNCA en los
 * Credits de nadie.
 *
 * Reglas duras:
 *  · ADMIN-ONLY (`assertAdmin`), DESHABILITABLE y FAIL-CLOSED: sin `aiSettings/evalBudget.habilitado === true` no corre.
 *  · HARD CAP por RESERVA + RECONCILIACIÓN (la lógica pura está en `motor/presupuesto.ts`):
 *      1. ANTES de cada caso se RESERVA su TECHO en `evalUsage/{día}.reservedUsd`, en una transacción que exige
 *         gastado + reservado + techo ≤ tope. Si no cabe → BUDGET_EXCEEDED, sin ejecutar. Dos corridas a la vez no
 *         pueden pasar ambas (Firestore serializa las transacciones sobre el mismo documento).
 *      2. La generación lleva `maxOutputTokens`: la única palanca por llamada que ofrecen los proveedores de texto.
 *      3. Después se lee el coste REAL de TODOS los intentos del caso (el router prueba candidatos en cadena).
 *      4. La reserva se LIBERA siempre (el corredor llama a `liberar` en un finally); lo real ya lo contabilizó el
 *         libro en `byProvider`.
 *      5. Si lo real supera el techo —o no se puede saber— el corredor para: COST_OVERRUN. No sigue a ciegas.
 *  · Tope DURO de casos por ejecución. Idempotente por `requestKey`. Cancelable. Deja rastro de auditoría.
 *  · NO cobra Credits: no importa ni llama al Credit Engine. No cambia producción, ni el Router, ni modelos/config.
 */
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { createHash } from 'node:crypto';
import { MODEL_SECRETS } from '../secrets';
import { assertAdmin } from '../shared/admin';
import { hashCanonico, validarDataset } from './motor/contrato';
import { Dominio, resolverDominio } from './motor/dominios';
import { EstadoPresupuesto, cabeLaReserva, microUsd, restanteParaReservar } from './motor/presupuesto';
import { AlmacenDeCorridas, RegistroDeCorrida } from './motor/corrida';
import { EntornoDeCorrida, RegistroDeCaso, SALTAR, SEGUIR, correrEvalGobernada } from './motor/corredor';
import { DOMINIOS_REALES, DATASETS_REALES } from './dominios';
import { DOMINIO, LIMITE_DE_CASOS, VERSION_DE_GRADERS } from './datos';

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

/* La puntuación de una corrida real usa los pesos comunes: una dimensión sin peso pesa 1 (como ops/evals/config.json). */
const CONFIG_DE_PUNTUACION = {};

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

/** Más intentos que esto en un solo caso no cabe con las cadenas de hoy; si apareciera, el coste no se da por sabido. */
export const MAX_INTENTOS_POR_CASO = 20;

/**
 * El coste REAL de un caso: la SUMA de todos sus intentos. El router prueba candidatos en cadena y cada intento abre
 * su propia generación con el mismo `requestId`. Por intento: lo medido (`providerCost`) y, si falló después de
 * llegar al proveedor, su coste en riesgo (`providerCostEstimated` con `providerCostStatus: 'desconocido'`, H0 #22).
 * Devuelve NaN si algún coste medido no es un número: el corredor lo trata como sobrecoste (fail-closed).
 */
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

/* Lo que el corredor puede cambiar de una corrida; lo demás (quién la pidió, el techo, la marca de cancelación) no se pisa. */
const CAMPOS_DE_ESTADO = ['status', 'completedAt', 'metrics', 'costUsd', 'error', 'historial', 'motivoDeParada', 'sobrecoste',
  'budgetLimit', 'budgetUsed', 'budgetReserved', 'budgetRemaining'];

/** El almacén de corridas en Firestore (`evalRuns`, solo servidor), con el contrato del motor (`AlmacenDeCorridas`). */
const almacenFirestore = (ref: FirebaseFirestore.DocumentReference, deCreacion: Record<string, unknown>): AlmacenDeCorridas => ({
  // Idempotencia: si ya existe, se devuelve tal cual (no se duplica ni se re-ejecuta, ni se reserva otra vez).
  crearIdempotente: (run) => db().runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (s.exists) return { run: s.data() as RegistroDeCorrida, nuevo: false };
    const nueva = { ...run, ...deCreacion };
    tx.set(ref, nueva);
    return { run: nueva, nuevo: true };
  }),
  guardar: async (run) => {
    const cambios = Object.fromEntries(CAMPOS_DE_ESTADO.filter((k) => run[k] !== undefined).map((k) => [k, run[k]]));
    await ref.set({ ...cambios, updatedAt: Timestamp.now() }, { merge: true });
    return run;
  },
});

/** El rastro de un caso en `evalRuns/{id}/casos/{caso}`: lo que se reservó, lo que costó de verdad y cómo acabó. */
const rastroDelCaso = (caso: string, r: RegistroDeCaso, techoUsd: number): Record<string, unknown> => {
  const res = r.decision ? (r.decision as unknown as { resultado: { generationId: string; provider: string; modelId: string; attempts: number; demo: boolean; latencyMs: number } }).resultado : null;
  const delMotor = res ? { generationId: res.generationId, provider: res.provider, model: res.modelId, intentos: res.attempts } : {};
  const error = r.fallo ? { error: String((r.fallo as Error)?.message || r.fallo).slice(0, 200) } : {};
  if (r.parada && r.parada.estado === 'COST_OVERRUN') {
    return { caso, ...delMotor, reservaUsd: techoUsd, providerCost: Number.isFinite(r.costeUsd) ? r.costeUsd : null, sobrecoste: true, ...error, en: Timestamp.now() };
  }
  if (r.parada) return { caso, reservaUsd: techoUsd, providerCost: r.costeUsd, sobrecoste: false, ...error, en: Timestamp.now() };
  return { caso, ...delMotor, demo: res ? res.demo : null, reservaUsd: techoUsd, providerCost: r.costeUsd, sobrecoste: false,
    latencyMs: res ? res.latencyMs : null, graders: r.graders, aprobado: r.aprobado, en: Timestamp.now() };
};

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
  // El dominio sale del registro común: un nombre sin registrar —o sin dataset real— falla cerrado.
  let dominio: Readonly<Dominio>;
  try { dominio = resolverDominio(DOMINIOS_REALES, data.dominio || DOMINIO); } catch { throw new HttpsError('invalid-argument', 'dominio_no_soportado'); }
  if (!Object.prototype.hasOwnProperty.call(DATASETS_REALES, dominio.id)) throw new HttpsError('invalid-argument', 'dominio_no_soportado');
  const dataset = DATASETS_REALES[dominio.id];

  // Cancelación: marca la corrida para que se detenga antes del siguiente caso.
  if (data.cancelar === true) {
    if (!data.evalRunId) throw new HttpsError('invalid-argument', 'falta_evalRunId');
    await db().collection('evalRuns').doc(data.evalRunId).set({ cancelSolicitado: true, canceladoPor: auth!.uid, updatedAt: Timestamp.now() }, { merge: true });
    return { evalRunId: data.evalRunId, cancelSolicitado: true };
  }

  // El dataset real cumple el contrato común (si no, es un error del código, no de quien llama).
  const errores = validarDataset(dataset, { validarCaso: dominio.validarCaso });
  if (errores.length) throw new HttpsError('internal', 'dataset_real_invalido');

  const t0 = ahora();
  const dia = diaUTC(t0);
  const nCasos = Math.max(1, Math.min(data.maxCasos ?? LIMITE_DE_CASOS, LIMITE_DE_CASOS, dataset.casos.length));
  const casos = dataset.casos.slice(0, nCasos);
  const evalRunId = data.requestKey ? `evalrun_${sha(data.requestKey).slice(0, 24)}` : `evalrun_${sha(`${dia}:${nCasos}:${t0.getTime()}`).slice(0, 24)}`;
  const pedido = typeof data.costeEstimadoPorCasoUsd === 'number' && Number.isFinite(data.costeEstimadoPorCasoUsd) ? data.costeEstimadoPorCasoUsd : 0;
  const techoPorCaso = microUsd(Math.max(presupuesto.techoPorCasoUsd, pedido));
  const ref = db().collection('evalRuns').doc(evalRunId);
  let limite = presupuesto.maxUsdPerDay;

  /* El ENTORNO real del corredor común: Firestore, el proveedor de verdad, dinero de verdad. */
  const entorno: EntornoDeCorrida = {
    capturarFallos: true,
    techoUsd: techoPorCaso,
    limites: { maxOutputTokens: presupuesto.maxOutputTokens },
    antesDelCaso: async (caso) => {
      // El interruptor y el tope VIGENTES, releídos antes de cada caso: apagar las evals —o bajar el tope— surte
      // efecto ANTES del siguiente caso, no solo en la próxima corrida. El techo por caso sigue siendo el del inicio.
      const vigente = await leerPresupuesto();
      if (!vigente.habilitado || vigente.maxUsdPerDay <= 0) return { estado: 'CANCELLED', motivo: 'evals_deshabilitado' };
      limite = vigente.maxUsdPerDay;
      // Cancelación cooperativa: se relee la marca antes de cada caso (y antes de reservar nada).
      if ((await ref.get()).data()?.cancelSolicitado === true) return { estado: 'CANCELLED', motivo: 'cancelada' };
      if ((await ref.collection('casos').doc(caso.evalCaseId).get()).exists) return SALTAR; // ni se reserva ni se ejecuta otra vez
      // RESERVA del techo, atómica, contra el tope vigente. Si no cabe → BUDGET_EXCEEDED sin ejecutar.
      const reserva = await reservarTecho(dia, limite, techoPorCaso);
      return reserva.reservado ? SEGUIR : { estado: 'BUDGET_EXCEEDED' };
    },
    medir: (_caso, { requestId }) => leerCosteReal(requestId as string),
    liberar: () => liberarTecho(dia, techoPorCaso),
    registrar: async (caso, r) => { await ref.collection('casos').doc(caso.evalCaseId).set(rastroDelCaso(caso.evalCaseId, r, techoPorCaso)); },
    // El estado del día DESPUÉS: gastado real, lo que sigue reservado (otras corridas en vuelo) y lo que queda, con el tope vigente.
    alCerrar: async () => {
      const despues = estadoDelDia((await db().collection('evalUsage').doc(dia).get()).data() as Record<string, unknown> | undefined, limite);
      return { budgetLimit: limite, budgetUsed: despues.committedUsd, budgetReserved: despues.reservedUsd, budgetRemaining: restanteParaReservar(despues) };
    },
  };

  const datasetDeLaCorrida = { ...dataset, casos };
  const corrida = await correrEvalGobernada({
    dataset: datasetDeLaCorrida, config: CONFIG_DE_PUNTUACION, dominios: DOMINIOS_REALES, entorno, ahora: () => Timestamp.now(),
    spec: {
      evalRunId, target: dominio.id, datasetHash: hashCanonico(casos), graderVersion: VERSION_DE_GRADERS,
      configHash: hashCanonico({ techoPorCasoUsd: techoPorCaso, maxOutputTokens: presupuesto.maxOutputTokens, nCasos }),
    },
    almacen: almacenFirestore(ref, {
      dominio: dominio.id, requestedBy: auth!.uid, requestKey: data.requestKey ?? null, nCasos,
      budgetLimit: presupuesto.maxUsdPerDay, techoPorCasoUsd: techoPorCaso, maxOutputTokens: presupuesto.maxOutputTokens, cancelSolicitado: false,
    }),
  });
  if (corrida.reanudado) return { evalRunId, reanudado: true, run: corrida.run };

  const run = corrida.run;
  return {
    evalRunId, status: run.status, budgetLimit: run.budgetLimit, budgetUsed: run.budgetUsed,
    budgetReserved: run.budgetReserved, budgetRemaining: run.budgetRemaining, costUsd: run.costUsd,
    techoPorCasoUsd: techoPorCaso, maxOutputTokens: presupuesto.maxOutputTokens,
    ...(run.sobrecoste ? { sobrecoste: run.sobrecoste } : {}), ...(run.motivoDeParada ? { motivoDeParada: run.motivoDeParada } : {}),
    metrics: run.metrics,
    resultados: corrida.detalle.map((d) => {
      const res = (d.decision as unknown as { resultado: { provider: string; modelId: string; attempts: number; latencyMs: number } }).resultado;
      return { caso: d.evalCaseId, provider: res.provider, model: res.modelId, intentos: res.attempts, providerCost: d.costeUsd, latencyMs: res.latencyMs, aprobado: d.aprobado };
    }),
  };
};

/** El callable servido por el runtime: ADMIN-ONLY, con los secretos de los proveedores de texto. */
export const evalRun = onCall({ region: 'us-central1', timeoutSeconds: 300, secrets: MODEL_SECRETS }, async (request) =>
  ejecutarEvalRun(request.auth as { uid: string; token?: Record<string, unknown> } | undefined, (request.data || {}) as EntradaEvalRun));
