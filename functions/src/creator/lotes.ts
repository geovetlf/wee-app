import { Firestore } from 'firebase-admin/firestore';
import { EngineError } from '../engine/errors';
import { cuentaDelPrincipalEnWee } from '../identity/cuentas';
import { creditEngine } from '../credits/creditEngine';
import { estadoDeLaProduccion } from './estadoDeToma';
import { CapacidadDeLaProduccion, requisitosDelServidor } from './requisitoDelServidor';

/**
 * WEË FILMMAKER ENGINE · FASE 6 (F4 DEL ROADMAP) — VARIOS PLANOS A LA VEZ.
 *
 * ── Qué es ──────────────────────────────────────────────────────────────────
 *
 * Presupuestar y generar las unidades de una producción de una vez, en el orden
 * de su línea de tiempo. Cada unidad es UNA TOMA, exactamente como si la pidiera
 * la app: su cotización, su cupo, su reserva de Credits, su trabajo del Core. No
 * hay un cobro del lote: eso sería otro Credit Engine. El total es la suma de lo
 * que cada toma cuesta, y cada una se cobra o se devuelve por su cuenta.
 *
 * ── Por qué pasa por la puerta del vídeo ────────────────────────────────────
 *
 * Todo lo que decide una toma —el requisito del servidor, la puerta del Core, el
 * modelo validado, el precio, el cupo, la reserva, el `requestId`— ya lo decide
 * `generateVideo`. El lote no lo copia: le pide a esa misma puerta cada unidad
 * (`porUnidad`), con el requisito que calcula el servidor (Fase 5). Así no hay
 * dos maneras de cotizar ni de cobrar la misma toma.
 *
 * ── Qué hace con cada unidad ────────────────────────────────────────────────
 *
 *   done        su plano ya tiene su vídeo listo: no se repite
 *   in_flight   tiene una toma en marcha (o esperando su devolución): no se pide otra
 *   blocked     la puerta dice que no, y por qué (una duración, un diálogo, la puerta cerrada…)
 *   generate    se puede: con su toma y su precio
 *
 * ── Al generar ──────────────────────────────────────────────────────────────
 *
 * Se vuelve a presupuestar, y solo se genera por el total que se enseñó. Si no
 * hay Credits para el total, no se empieza ninguna. Después, una a una y en
 * orden, y al PRIMER fallo se para: lo que falla en un lote —el cupo del día, el
 * saldo, la puerta— haría fallar las siguientes igual, y seguir solo gastaría
 * intentos. Lo que ya empezó queda en marcha y se dice cuál.
 */

/** Cuántas unidades como mucho en un lote: las del cupo diario de vídeo. Un tope, no una promesa. */
export const MAX_UNIDADES_POR_LOTE = 12;

export type AccionDelLote = 'generate' | 'done' | 'in_flight' | 'blocked';

export interface UnidadDelLote {
  readonly sceneId: string;
  readonly unitId: string;
  readonly action: AccionDelLote;
  readonly reason?: string;
  readonly detail?: Readonly<Record<string, unknown>>;
  readonly take?: number;
  readonly credits?: number;
  readonly effective?: unknown;
}

export interface PresupuestoDelLote {
  readonly status: 'QUOTED_BATCH';
  readonly productionId: string;
  readonly revision: number;
  readonly quality: string;
  readonly units: readonly UnidadDelLote[];
  readonly total: { readonly credits: number; readonly units: number };
  readonly skipped: { readonly done: number; readonly inFlight: number; readonly blocked: number };
  readonly capabilities: readonly CapacidadDeLaProduccion[];
  /** El saldo de la cuenta, leído; `null` si no se pudo leer. */
  readonly balance: number | null;
  readonly enough: boolean;
}

export interface ResultadoDeUnidad {
  readonly sceneId: string;
  readonly unitId: string;
  readonly take: number;
  readonly status: string;
  readonly requestId?: string;
  readonly reason?: string;
}

/** Cómo se le pide UNA toma a la puerta del vídeo: los mismos datos que manda la app. */
export type PorUnidad = (datos: Record<string, unknown>) => Promise<unknown>;

export interface DepsDelLote {
  readonly db: Firestore;
  readonly porUnidad: PorUnidad;
  readonly at: number;
  readonly vidaDeLaLlamadaMs: number;
  /** El saldo de la cuenta. Por defecto, el del Credit Engine —solo lectura—. */
  readonly saldo?: (uid: string) => Promise<number>;
}

interface PeticionDeLote {
  readonly productionId: string;
  readonly revision: number;
  readonly quality: string;
  readonly unidades?: readonly string[];
}

const esObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const FORMA_DE_PRODUCCION = /^[A-Za-z0-9_-]{20,128}$/;
const FORMA_DE_ID = /^[A-Za-z0-9_-]{4,128}$/;

const noVale = (): never => { throw new EngineError('INVALID_REQUEST', 'Ese lote no tiene forma válida.', { reason: 'batch_invalid' }); };

const leerPeticion = (crudo: unknown): PeticionDeLote => {
  if (!esObj(crudo)) return noVale();
  const { productionId, revision, quality, units } = crudo;
  if (typeof productionId !== 'string' || !FORMA_DE_PRODUCCION.test(productionId)) return noVale();
  if (typeof revision !== 'number' || !Number.isInteger(revision) || revision < 0) return noVale();
  if (typeof quality !== 'string' || !quality || quality.length > 16) return noVale();
  if (units !== undefined && (!Array.isArray(units) || units.length > MAX_UNIDADES_POR_LOTE * 4 || !units.every((x) => typeof x === 'string' && FORMA_DE_ID.test(x)))) return noVale();
  return { productionId, revision, quality, ...(units !== undefined ? { unidades: units as string[] } : {}) };
};

/** Lo que dijo la puerta al negarse: su motivo, o su código. Nada de dentro. */
const motivoDe = (e: unknown): { reason: string; detail?: Record<string, unknown> } => {
  const d = esObj((e as { details?: unknown })?.details) ? ((e as { details: Record<string, unknown> }).details) : {};
  const { reason, code, ...detail } = d;
  const motivo = typeof reason === 'string' ? reason : typeof code === 'string' ? code : 'unknown';
  return { reason: motivo, ...(Object.keys(detail).length ? { detail } : {}) };
};

interface Preparado {
  readonly presupuesto: PresupuestoDelLote;
  /** El requisito de cada unidad a generar, para pedirla después sin volver a calcularlo. */
  readonly requisitos: ReadonlyMap<string, unknown>;
}

const preparar = async (uid: string, crudo: unknown, deps: DepsDelLote): Promise<Preparado> => {
  const p = leerPeticion(crudo);
  const cuenta = await cuentaDelPrincipalEnWee(deps.db, uid);
  if (!cuenta) throw new EngineError('INVALID_REQUEST', 'No encontramos esa producción.', { reason: 'production_not_found' });
  const accountId = cuenta.accountId;
  /* Los requisitos, del servidor (Fase 5): la app no manda ninguno. */
  const reqs = await requisitosDelServidor(deps.db, accountId, { productionId: p.productionId, revision: p.revision });
  if (!reqs.ok) throw new EngineError('INVALID_REQUEST', 'Esa producción no se puede presupuestar así.', { reason: reqs.motivo, ...(reqs.causa ? { cause: reqs.causa } : {}) });
  /* Las unidades, en el orden de la línea de tiempo, y lo que cada una ya tiene (Fase 3). */
  const estado = await estadoDeLaProduccion(deps.db, { uid, accountId }, p.productionId, { at: deps.at, vidaDeLaLlamadaMs: deps.vidaDeLaLlamadaMs });
  const elegidas = estado.unidades.filter((u) => !p.unidades || p.unidades.includes(u.unitId));
  if (elegidas.length > MAX_UNIDADES_POR_LOTE) {
    throw new EngineError('INVALID_REQUEST', 'Son demasiados planos para un lote.', { reason: 'batch_too_large', max: MAX_UNIDADES_POR_LOTE, units: elegidas.length });
  }
  const unidades: UnidadDelLote[] = [];
  const requisitos = new Map<string, unknown>();
  for (const u of elegidas) {
    const base = { sceneId: u.sceneId, unitId: u.unitId };
    if (u.video) { unidades.push({ ...base, action: 'done' }); continue; }
    const crudoDeLaUnidad = reqs.unidades.find((x) => x.unitId === u.unitId && x.sceneId === u.sceneId)?.crudo;
    if (!crudoDeLaUnidad) { unidades.push({ ...base, action: 'blocked', reason: 'unit_not_found' }); continue; }
    const plano = { productionId: p.productionId, sceneId: u.sceneId, unitId: u.unitId, revision: p.revision, quality: p.quality, requirement: crudoDeLaUnidad };
    try {
      const q = await deps.porUnidad({ plano, cotizar: true }) as Record<string, unknown>;
      const siguiente = esObj(q.takes) && esObj(q.takes.next) && typeof q.takes.next.take === 'number' ? q.takes.next.take : undefined;
      if (q.allowed === true && siguiente !== undefined && typeof q.credits === 'number') {
        unidades.push({ ...base, action: 'generate', take: siguiente, credits: q.credits, ...(q.effective !== undefined ? { effective: q.effective } : {}) });
        requisitos.set(u.unitId, crudoDeLaUnidad);
      } else {
        const reason = typeof q.reason === 'string' ? q.reason : 'unknown';
        /* Con una toma en marcha, no es que no se pueda: es que ya se está haciendo. */
        unidades.push({ ...base, action: reason === 'take_in_flight' ? 'in_flight' : 'blocked', reason, ...(esObj(q.detail) ? { detail: q.detail } : {}) });
      }
    } catch (e) {
      unidades.push({ ...base, action: 'blocked', ...motivoDe(e) });
    }
  }
  const aGenerar = unidades.filter((u) => u.action === 'generate');
  const total = aGenerar.reduce((s, u) => s + (u.credits ?? 0), 0);
  const saldo = await (deps.saldo ?? (async (id: string) => (await creditEngine.getBalance(id)).balance))(uid).catch(() => null);
  return {
    requisitos,
    presupuesto: Object.freeze({
      status: 'QUOTED_BATCH',
      productionId: p.productionId,
      revision: p.revision,
      quality: p.quality,
      units: Object.freeze(unidades),
      total: Object.freeze({ credits: total, units: aGenerar.length }),
      skipped: Object.freeze({
        done: unidades.filter((u) => u.action === 'done').length,
        inFlight: unidades.filter((u) => u.action === 'in_flight').length,
        blocked: unidades.filter((u) => u.action === 'blocked').length,
      }),
      capabilities: reqs.capacidades,
      balance: typeof saldo === 'number' ? saldo : null,
      enough: typeof saldo === 'number' ? saldo >= total : false,
    }),
  };
};

/** EL PRESUPUESTO DEL LOTE. Ni reserva, ni cupo, ni POST: son las cotizaciones de la puerta, sumadas. */
export const presupuestarLote = async (uid: string, crudo: unknown, deps: DepsDelLote): Promise<PresupuestoDelLote> =>
  (await preparar(uid, crudo, deps)).presupuesto;

/**
 * GENERAR EL LOTE por el total que se enseñó: una toma por unidad, en orden, y
 * se para al primer fallo. El dinero lo mueve cada toma, en la puerta; aquí no.
 */
export const generarLote = async (uid: string, crudo: unknown, creditosCotizados: unknown, deps: DepsDelLote) => {
  const { presupuesto: p, requisitos } = await preparar(uid, crudo, deps);
  if (Number(creditosCotizados) !== p.total.credits) {
    throw new EngineError('INVALID_REQUEST', 'El precio del lote cambió.', { reason: 'price_changed', credits: p.total.credits });
  }
  if (p.total.units === 0) return Object.freeze({ status: 'NOTHING_TO_GENERATE' as const, units: [] as ResultadoDeUnidad[], started: 0 });
  if (p.balance !== null && p.balance < p.total.credits) {
    throw new EngineError('INVALID_REQUEST', 'No tienes Credits suficientes para todo el lote.', { reason: 'insufficient_credits', required: p.total.credits, available: p.balance });
  }
  const resultados: ResultadoDeUnidad[] = [];
  let paradoEn: string | undefined;
  for (const u of p.units) {
    if (u.action !== 'generate' || u.take === undefined) continue;
    const plano = { productionId: p.productionId, sceneId: u.sceneId, unitId: u.unitId, revision: p.revision, quality: p.quality, requirement: requisitos.get(u.unitId), take: u.take };
    try {
      const r = await deps.porUnidad({ plano, creditosCotizados: u.credits }) as Record<string, unknown>;
      resultados.push({ sceneId: u.sceneId, unitId: u.unitId, take: u.take, status: typeof r.status === 'string' ? r.status : 'UNKNOWN', ...(typeof r.requestId === 'string' ? { requestId: r.requestId } : {}) });
    } catch (e) {
      resultados.push({ sceneId: u.sceneId, unitId: u.unitId, take: u.take, status: 'FAILED', reason: motivoDe(e).reason });
      paradoEn = u.unitId;
      break;
    }
  }
  return Object.freeze({
    status: 'STARTED_BATCH' as const,
    units: Object.freeze(resultados),
    started: resultados.filter((r) => r.status === 'ACCEPTED' || r.status === 'COMPLETED').length,
    ...(paradoEn ? { stoppedAt: paradoEn } : {}),
  });
};
