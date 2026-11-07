import { esIdDeCuenta } from './identity';
import { MODERATION_CORE_CONTRACT_VERSION } from './moderation-case';
import {
  AccionDeModeracion, FORMA_DE_ID_DE_ACCION, FORMA_DE_ID_DE_APELACION, FORMA_DE_REQUEST_ID, OPERACIONES_CON_EFECTO,
  OperacionDeModeracion, OperacionDelSistema, PoliticaDeApelaciones, textoLimpio,
} from './moderation-action';

/**
 * WEE CORE — MODERATION CORE · APELACIONES. EL CONTRATO.
 *
 * Quien fue moderado puede pedir que se revise lo que se le hizo. Una
 * apelación guarda la decisión ORIGINAL tal como era, quién apela, por qué,
 * cuándo, en qué estado está, quién la revisó y cómo acabó. No borra ni
 * sobrescribe nada: si se le da la razón, lo hecho se deshace con una acción
 * NUEVA que lo dice, y la original sigue en su sitio, entera.
 *
 *     SUBMITTED → UNDER_REVIEW → UPHELD   (se deshace lo apelado)
 *                              → DENIED   (la decisión se queda)
 *
 * Una apelación por acción: el identificador sale de la acción apelada.
 * Puro: ni Firestore, ni reloj, ni red.
 */

export type EstadoDeApelacion = 'SUBMITTED' | 'UNDER_REVIEW' | 'UPHELD' | 'DENIED';

export const ESTADOS_DE_APELACION: readonly EstadoDeApelacion[] = Object.freeze(['SUBMITTED', 'UNDER_REVIEW', 'UPHELD', 'DENIED'] as const);

export const TRANSICIONES_DE_APELACION: Readonly<Record<EstadoDeApelacion, readonly EstadoDeApelacion[]>> = Object.freeze({
  SUBMITTED: Object.freeze(['UNDER_REVIEW'] as const),
  UNDER_REVIEW: Object.freeze(['UPHELD', 'DENIED'] as const),
  UPHELD: Object.freeze([] as const),
  DENIED: Object.freeze([] as const),
});

export const esEstadoDeApelacion = (v: unknown): v is EstadoDeApelacion =>
  typeof v === 'string' && (ESTADOS_DE_APELACION as readonly string[]).includes(v);

/** Lo que se puede apelar: lo que actuó sobre el contenido o la cuenta, también lo que hizo la política preventiva. */
export const OPERACIONES_APELABLES: readonly (OperacionDeModeracion | OperacionDelSistema)[] = Object.freeze([...OPERACIONES_CON_EFECTO, 'PREVENTIVE_HIDE' as const]);

export const MAXIMO_DE_MOTIVO_DE_APELACION = 1_000;

export interface ApelacionDeModeracion {
  contract: typeof MODERATION_CORE_CONTRACT_VERSION;
  appealId: string;
  actionId: string;
  caseId: string;
  /** La cuenta afectada, que es quien apela. Sale de la acción, nunca de la petición. */
  accountId: string;
  /** La decisión original, copiada al apelar: lo que se revisa es ESO, aunque después cambie algo. */
  original: { operation: string; at: number; actorId: string; sanctionId?: string; vaultId?: string; contentKind?: string };
  /** Lo que escribió quien apela. Contenido suyo: no se traduce ni se reescribe. */
  reason: string;
  status: EstadoDeApelacion;
  review?: { uid: string; at: number; sameReviewer: boolean };
  resolution?: { outcome: 'UPHELD' | 'DENIED'; at: number; uid: string; justification: string; reversalActionId?: string };
  historyCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface EntradaDeApelacion {
  seq: number;
  type: 'APPEAL_SUBMITTED' | 'APPEAL_TAKEN' | 'APPEAL_UPHELD' | 'APPEAL_DENIED';
  at: number;
  by: { kind: 'USER' | 'ADMIN'; id: string };
  from?: EstadoDeApelacion;
  to: EstadoDeApelacion;
  reason?: string;
  actionId?: string;
}

export const idDeEntradaDeApelacion = (seq: number): string => String(seq).padStart(4, '0');

/* ── Pedir ──────────────────────────────────────────────────────────────── */

export type MotivoDeApelacionRechazada =
  | 'malformed' | 'too_large' | 'unknown_field' | 'invalid_action' | 'invalid_reason' | 'invalid_request_id'
  | 'action_not_appealable' | 'not_affected' | 'invalid_transition' | 'invalid_appeal' | 'same_reviewer' | 'invalid_reviewer';

export interface PeticionDeApelacion { actionId: string; reason: string; requestId?: string }

const esObjetoLlano = (v: unknown): v is Record<string, unknown> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/** Lo que puede decir quien apela: qué acción, y por qué. Ni su cuenta, ni el estado, ni nada más. */
export const validarPeticionDeApelacion = (data: unknown): { ok: true; peticion: PeticionDeApelacion } | { ok: false; code: MotivoDeApelacionRechazada; field?: string } => {
  if (!esObjetoLlano(data)) return { ok: false, code: 'malformed' };
  let s: string;
  try { s = JSON.stringify(data); } catch { return { ok: false, code: 'malformed' }; }
  if (typeof s !== 'string' || s.length > 2_048) return { ok: false, code: 'too_large' };
  for (const k of Object.keys(data)) if (!['actionId', 'reason', 'requestId'].includes(k)) return { ok: false, code: 'unknown_field', field: k.slice(0, 40) };
  const propio = (k: string): unknown => (Object.prototype.hasOwnProperty.call(data, k) ? data[k] : undefined);
  const actionId = propio('actionId');
  if (typeof actionId !== 'string' || !FORMA_DE_ID_DE_ACCION.test(actionId)) return { ok: false, code: 'invalid_action', field: 'actionId' };
  const reason = textoLimpio(propio('reason'), 3, MAXIMO_DE_MOTIVO_DE_APELACION);
  if (!reason) return { ok: false, code: 'invalid_reason', field: 'reason' };
  const requestId = propio('requestId');
  if (requestId !== undefined && (typeof requestId !== 'string' || !FORMA_DE_REQUEST_ID.test(requestId))) return { ok: false, code: 'invalid_request_id', field: 'requestId' };
  return { ok: true, peticion: Object.freeze({ actionId, reason, ...(typeof requestId === 'string' ? { requestId } : {}) }) };
};

/**
 * LA APELACIÓN QUE NACE. Solo si la acción se puede apelar, si quien apela es
 * la cuenta AFECTADA por ella —leída de la acción guardada— y si la acción no
 * se deshizo ya.
 */
export const nuevaApelacion = (a: {
  appealId: string; accion: AccionDeModeracion; principalId: string; reason: string; yaDeshecha: boolean; at: number;
}): { ok: true; apelacion: ApelacionDeModeracion; entrada: EntradaDeApelacion } | { ok: false; code: MotivoDeApelacionRechazada } => {
  if (!FORMA_DE_ID_DE_APELACION.test(a.appealId) || !a.accion || !FORMA_DE_ID_DE_ACCION.test(a.accion.actionId)) return { ok: false, code: 'invalid_action' };
  if (!OPERACIONES_APELABLES.includes(a.accion.operation) || !a.accion.appealable || a.yaDeshecha) return { ok: false, code: 'action_not_appealable' };
  if (!esIdDeCuenta(a.principalId) || !a.accion.subjectAccountId || a.accion.subjectAccountId !== a.principalId) return { ok: false, code: 'not_affected' };
  if (!a.accion.caseId) return { ok: false, code: 'invalid_action' };
  const apelacion: ApelacionDeModeracion = {
    contract: MODERATION_CORE_CONTRACT_VERSION,
    appealId: a.appealId,
    actionId: a.accion.actionId,
    caseId: a.accion.caseId,
    accountId: a.principalId,
    original: {
      operation: a.accion.operation,
      at: a.accion.at,
      actorId: a.accion.actor.id,
      ...(a.accion.sanctionId ? { sanctionId: a.accion.sanctionId } : {}),
      ...(a.accion.vaultId ? { vaultId: a.accion.vaultId } : {}),
      ...(a.accion.contentKind ? { contentKind: a.accion.contentKind } : {}),
    },
    reason: a.reason,
    status: 'SUBMITTED',
    historyCount: 1,
    createdAt: a.at,
    updatedAt: a.at,
  };
  return {
    ok: true,
    apelacion: Object.freeze(apelacion),
    entrada: Object.freeze({ seq: 1, type: 'APPEAL_SUBMITTED' as const, at: a.at, by: { kind: 'USER' as const, id: a.principalId }, to: 'SUBMITTED' as const }),
  };
};

/* ── Revisar ────────────────────────────────────────────────────────────── */

/** Coger una apelación. Con revisión independiente, quien decidió lo apelado no puede revisarla. */
export const tomarApelacion = (ap: ApelacionDeModeracion | undefined, a: { uid: string; at: number; politica: PoliticaDeApelaciones; justificacion: string }):
  { ok: true; apelacion: ApelacionDeModeracion; entrada: EntradaDeApelacion } | { ok: false; code: MotivoDeApelacionRechazada } => {
  if (!ap || !esEstadoDeApelacion(ap.status)) return { ok: false, code: 'invalid_appeal' };
  if (!esIdDeCuenta(a.uid)) return { ok: false, code: 'invalid_reviewer' };
  if (!TRANSICIONES_DE_APELACION[ap.status].includes('UNDER_REVIEW')) return { ok: false, code: 'invalid_transition' };
  if (ap.accountId === a.uid) return { ok: false, code: 'not_affected' };
  const mismo = ap.original.actorId === a.uid;
  if (mismo && a.politica.revisionIndependiente) return { ok: false, code: 'same_reviewer' };
  const seq = ap.historyCount + 1;
  return {
    ok: true,
    apelacion: Object.freeze({ ...ap, status: 'UNDER_REVIEW' as const, review: { uid: a.uid, at: a.at, sameReviewer: mismo }, historyCount: seq, updatedAt: a.at }),
    entrada: Object.freeze({ seq, type: 'APPEAL_TAKEN' as const, at: a.at, by: { kind: 'ADMIN' as const, id: a.uid }, from: ap.status, to: 'UNDER_REVIEW' as const, reason: a.justificacion }),
  };
};

/** Resolverla. Quien resuelve es quien la cogió: lo que se cogió no se resuelve por la puerta de atrás. */
export const decidirApelacion = (ap: ApelacionDeModeracion | undefined, a: {
  uid: string; at: number; outcome: 'UPHELD' | 'DENIED'; justificacion: string; reversalActionId?: string;
}): { ok: true; apelacion: ApelacionDeModeracion; entrada: EntradaDeApelacion } | { ok: false; code: MotivoDeApelacionRechazada } => {
  if (!ap || !esEstadoDeApelacion(ap.status)) return { ok: false, code: 'invalid_appeal' };
  if (!TRANSICIONES_DE_APELACION[ap.status].includes(a.outcome)) return { ok: false, code: 'invalid_transition' };
  if (!esIdDeCuenta(a.uid) || ap.review?.uid !== a.uid) return { ok: false, code: 'invalid_reviewer' };
  const seq = ap.historyCount + 1;
  return {
    ok: true,
    apelacion: Object.freeze({
      ...ap,
      status: a.outcome,
      resolution: { outcome: a.outcome, at: a.at, uid: a.uid, justification: a.justificacion, ...(a.reversalActionId ? { reversalActionId: a.reversalActionId } : {}) },
      historyCount: seq,
      updatedAt: a.at,
    }),
    entrada: Object.freeze({
      seq, type: a.outcome === 'UPHELD' ? 'APPEAL_UPHELD' as const : 'APPEAL_DENIED' as const, at: a.at,
      by: { kind: 'ADMIN' as const, id: a.uid }, from: ap.status, to: a.outcome, reason: a.justificacion,
      ...(a.reversalActionId ? { actionId: a.reversalActionId } : {}),
    }),
  };
};

/** Lo que ve quien apeló: el estado y el desenlace. Ni quién la revisó ni su justificación interna. */
export const vistaDeApelacionParaElAfectado = (ap: ApelacionDeModeracion) => Object.freeze({
  appealId: ap.appealId,
  actionId: ap.actionId,
  status: ap.status,
  createdAt: ap.createdAt,
  ...(ap.resolution ? { outcome: ap.resolution.outcome, resolvedAt: ap.resolution.at } : {}),
});
