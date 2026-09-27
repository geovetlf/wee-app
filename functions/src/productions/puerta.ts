import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { FunctionsErrorCode, HttpsError, onCall } from 'firebase-functions/v2/https';
import { cuentaDelPrincipalEnWee } from '../identity/cuentas';
import {
  CodigoDePersistencia,
  LectorDeMateriales,
  Rechazo,
  aplicarOperacionesGuardadas,
  archivarProduccion,
  claveDePersistencia,
  crearProduccion,
  desarchivarProduccion,
  duplicarProduccion,
  leerProduccion,
  listarProducciones,
} from './index';

/**
 * WEË FILMMAKER — LA PUERTA DE LAS PRODUCCIONES (F1-B). Y solo eso.
 *
 * Tres cosas: comprueba QUIÉN llama, resuelve DE QUÉ CUENTA puede actuar y
 * delega en `./index`. Ni una regla de negocio ni una validación repetida: es el
 * mismo reparto que `shots/puerta` y `elements/puerta`.
 *
 * ── NO ESTÁ CONECTADA ───────────────────────────────────────────────────────
 *
 * `functions/src/index.ts` no la exporta y nada la despliega: existe preparada
 * para cuando se autorice conectarla, en un paso aparte que también tendrá que
 * declararla en el mapa del runtime.
 *
 * ── Lo que NO se acepta del cliente, nunca ──────────────────────────────────
 *
 * La cuenta. Sale de la sesión por `cuentaDelPrincipalEnWee` y de ningún otro
 * sitio: si el cliente pudiera mandarla, mandarla bastaría para leer lo de otra
 * persona. Tampoco hay dónde poner un proveedor, un modelo ni una URL: el dominio
 * los rechaza.
 *
 * ── Qué contesta ────────────────────────────────────────────────────────────
 *
 * Códigos, no frases: un error lleva el código en `message` y en `details` el
 * código, su `messageKey` (`filmmaker.persistence.<código>`) y los problemas del
 * dominio con las suyas. La frase la pone la interfaz, en el idioma de quien mira.
 */

const REGION = 'us-central1';

/** Las siete operaciones. Lo que no está aquí no existe. */
export const OPERACIONES_DE_PRODUCCION = Object.freeze(['create', 'get', 'list', 'apply', 'archive', 'unarchive', 'duplicate'] as const);

/** De cada rechazo, el código estándar de una callable. */
export const CODIGO_DE_CALLABLE: Readonly<Record<CodigoDePersistencia, FunctionsErrorCode>> = Object.freeze({
  production_id_invalid: 'invalid-argument',
  production_not_found: 'not-found',
  production_id_taken: 'already-exists',
  production_invalid: 'invalid-argument',
  production_corrupted: 'data-loss',
  production_archived: 'failed-precondition',
  revision_invalid: 'invalid-argument',
  revision_conflict: 'aborted',
  operation_id_invalid: 'invalid-argument',
  operation_id_reused: 'already-exists',
  operations_invalid: 'invalid-argument',
  operations_empty: 'invalid-argument',
  operations_too_many: 'invalid-argument',
  element_binding_not_supported: 'failed-precondition',
  reference_rejected: 'invalid-argument',
  id_not_storable: 'invalid-argument',
  document_too_large: 'invalid-argument',
  production_too_large: 'invalid-argument',
  transaction_too_large: 'invalid-argument',
  list_query_invalid: 'invalid-argument',
  history_too_long: 'failed-precondition',
  history_broken: 'data-loss',
});

const error = (codigo: FunctionsErrorCode, code: string, extra: Record<string, unknown> = {}): HttpsError =>
  new HttpsError(codigo, code, { code, messageKey: claveDePersistencia(code), ...extra });

const fallar = (r: Rechazo): never => {
  throw error(CODIGO_DE_CALLABLE[r.code], r.code, {
    problems: r.problems,
    ...(r.currentRevision !== undefined ? { currentRevision: r.currentRevision } : {}),
  });
};

export interface ContextoDeLaPuerta {
  readonly db?: Firestore;
  readonly material?: LectorDeMateriales;
  /** La hora de la petición, leída una vez en la puerta. */
  readonly at: number;
}

/**
 * ATENDER UNA PETICIÓN para una cuenta YA RESUELTA. Es lo que hay dentro de la
 * callable, separado para poder probarlo sin sesión de verdad; la cuenta nunca
 * sale de `datos`.
 */
export const atenderProducciones = async (accountId: string, datos: unknown, ctx: ContextoDeLaPuerta): Promise<Record<string, unknown>> => {
  const data = (typeof datos === 'object' && datos !== null && !Array.isArray(datos) ? datos : {}) as Record<string, unknown>;
  const deps = { ...(ctx.db ? { db: ctx.db } : {}), ...(ctx.material ? { material: ctx.material } : {}) };
  const at = ctx.at;

  switch (data.op) {
    case 'create': {
      const r = await crearProduccion({
        accountId, productionId: data.productionId, operationId: data.operationId, title: data.title,
        aspectRatio: data.aspectRatio, resolution: data.resolution, preset: data.preset, production: data.production, at,
      }, deps);
      if (!r.ok) return fallar(r);
      return { created: r.created, ...r.view };
    }
    case 'get': {
      const r = await leerProduccion(accountId, data.productionId, deps);
      if (!r.ok) return fallar(r);
      return { ...r.view };
    }
    case 'list': {
      const r = await listarProducciones({ accountId, status: data.status, limit: data.limit, after: data.after }, deps);
      if (!r.ok) return fallar(r);
      return { productions: r.productions, ...(r.nextCursor ? { nextCursor: r.nextCursor } : {}) };
    }
    case 'apply': {
      const r = await aplicarOperacionesGuardadas({
        accountId, productionId: data.productionId, expectedRevision: data.expectedRevision,
        operations: data.operations, operationId: data.operationId, at,
      }, deps);
      if (!r.ok) return fallar(r);
      return {
        ...r.view, applied: r.applied, pending: r.pending, timelineChanged: r.timelineChanged,
        operationId: r.operationId, alreadyApplied: r.alreadyApplied,
      };
    }
    case 'archive':
    case 'unarchive': {
      const r = data.op === 'archive'
        ? await archivarProduccion(accountId, data.productionId, at, deps)
        : await desarchivarProduccion(accountId, data.productionId, at, deps);
      if (!r.ok) return fallar(r);
      return { changed: r.changed, summary: r.summary };
    }
    case 'duplicate': {
      const r = await duplicarProduccion({
        accountId, productionId: data.productionId, newProductionId: data.newProductionId,
        title: data.title, operationId: data.operationId, at,
      }, deps);
      if (!r.ok) return fallar(r);
      return { created: r.created, source: r.source, ...r.view };
    }
    default:
      throw error('invalid-argument', 'operation_unknown');
  }
};

/**
 * LAS PRODUCCIONES DE UNA CUENTA. Una puerta y siete operaciones; `op` elige.
 * Lo ajeno contesta `not-found`, igual que lo inexistente.
 */
export const productions = onCall({ region: REGION, timeoutSeconds: 60, memory: '512MiB' }, async (request) => {
  if (!request.auth) throw error('unauthenticated', 'session_required');
  const db = getFirestore();
  const cuenta = await cuentaDelPrincipalEnWee(db, request.auth.uid);
  if (!cuenta) throw error('permission-denied', 'account_not_found');
  return atenderProducciones(cuenta.accountId, request.data, { db, at: Date.now() });
});
