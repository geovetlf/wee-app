import { createHash } from 'crypto';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import {
  EVALUADOR_DE_REGLAS,
  EntradaDeHistorial,
  ESTADOS_DE_REPORTE,
  Huella,
  ModalidadModerable,
  ModerationActionType,
  ModerationEvaluator,
  ModerationOutcome,
  MotivoDeRechazo,
  MotivoDeRevisionRechazada,
  ObjetivoResuelto,
  POLITICA_DE_REPORTES,
  PoliticaDeReportes,
  QuienDenuncia,
  Report,
  ReportStatus,
  ReportTargetType,
  VistaParaQuienDenuncia,
  decisionValida,
  entradaDeCreacion,
  esContenidoPropio,
  esEstadoDeReporte,
  evaluarLimite,
  idDeEntrada,
  idDeReporte,
  nuevoReporte,
  transicionarReporte,
  validarPeticionDeReporte,
  vistaParaQuienDenuncia,
  FORMA_DE_ID_DE_REPORTE,
} from '../core/moderation';
import { actorDeLaCuenta } from '../core/social-identity';
import { ENTIDADES, cuentaDeWee, entidadDelPerfil } from '../identity/cuentas';
import { identidadHeredadaEsDeLaCuenta } from '../identity/compatibilidad';
import { assertAdmin } from '../shared/admin';

/**
 * WEE MODERATION — LA COMPOSICIÓN.
 *
 * El contrato (`core/moderation.ts`) es puro: sabe qué es un reporte, cómo se
 * valida una petición, cuándo es la misma señal y cómo cambia de estado. No
 * sabe guardar, ni quién llama, ni qué hora es. Este archivo es quien lo sabe,
 * y es lo único que sabe.
 *
 * ── Por qué el reporte lo crea el servidor y no el cliente ──────────────────
 *
 * La regla vieja era `allow create: if isAuthenticated()` sobre `reports`: con
 * sesión, cualquiera podía escribir cualquier documento, de cualquier tamaño, a
 * nombre de cualquiera. Nadie llegó a usarla —`reports` está vacía—, pero era
 * eso. Ahora `reports` está cerrada entera a los clientes y la única puerta es
 * `reportContent`, que corre con el Admin SDK. El cliente manda una intención
 * —«esto, por este motivo»— y TODO lo demás lo pone el servidor: la cuenta, la
 * cara, el instante, el identificador, el estado y de quién es lo denunciado.
 *
 * ── Lo que NO hace, a propósito ─────────────────────────────────────────────
 *
 * No llama a ningún modelo ni a ninguna API: el evaluador de hoy es
 * determinista y contesta REVIEW. No toca Credits ni la billetera: denunciar no
 * cuesta nada. No oculta ni bloquea nada: una acción se PIDE y queda escrita
 * como pedida, porque todavía no existe quien la ejecute. No emite eventos: no
 * hay transporte, y la forma de lo que se emitirá está en el contrato. No lee
 * el contenido denunciado más que lo justo para saber que existe y de quién es.
 *
 * ── Cuánto lee y escribe crear un reporte ───────────────────────────────────
 *
 * Como mucho: la cuenta (1), la cara si viene (1), el objetivo (1), la entidad
 * dueña (1 consulta), y dentro de la transacción el límite (1) y el reporte (1).
 * Escribe el límite, el reporte y su primera entrada de historial. Nada crece
 * con el tamaño de Weë y no hay ningún documento compartido entre cuentas.
 */

export const REPORTES = 'reports';
export const HISTORIAL = 'history';
export const LIMITES = 'moderationLimits';

const OPTS = { region: 'us-central1' as const, timeoutSeconds: 30, memory: '256MiB' as const };

/** SHA-256 en hexadecimal. La huella que el contrato pide sin saber de criptografía. */
export const huellaDelSistema: Huella = (texto) => createHash('sha256').update(texto, 'utf8').digest('hex');

/* ── Qué hay detrás de cada clase de objetivo ───────────────────────────── */

/**
 * UN RESOLUTOR POR CLASE DE OBJETIVO. `null` = no existe.
 *
 * El contrato nombra ocho clases; aquí están las que hoy tienen algo detrás que
 * leer. Las demás se rechazan con su motivo hasta que alguien escriba su
 * resolutor —una función y una línea en `RESOLUTORES`—, que es todo lo que
 * cuesta abrir la moderación a WeeTalk, a las comunidades o al material.
 */
export type ResolutorDeObjetivo = (db: Firestore, targetId: string) => Promise<ObjetivoResuelto | null>;

/** De quién es algo firmado con el `uid` de un perfil. Se LEE de la entidad; nunca se deduce del prefijo. */
const duenoDelPerfil = async (db: Firestore, perfilUid: unknown): Promise<Pick<ObjetivoResuelto, 'ownerAccountId' | 'ownerEntityId'> & { firmadoPor?: string }> => {
  if (typeof perfilUid !== 'string' || !perfilUid) return {};
  const entidad = await entidadDelPerfil(db, perfilUid);
  return entidad
    ? { ownerAccountId: entidad.ownerAccountId, ownerEntityId: entidad.entityId, firmadoPor: perfilUid }
    : { firmadoPor: perfilUid };
};

const modalidadDeUnPost = (post: Record<string, unknown>): ModalidadModerable =>
  typeof post.videoUrl === 'string' && post.videoUrl ? 'VIDEO'
    : Array.isArray(post.imageUrls) && post.imageUrls.length > 0 ? 'IMAGE' : 'TEXT';

type ObjetivoLeido = ObjetivoResuelto & { firmadoPor?: string };

export const RESOLUTORES: Readonly<Partial<Record<ReportTargetType, (db: Firestore, id: string) => Promise<ObjetivoLeido | null>>>> = Object.freeze({
  POST: async (db: Firestore, id: string) => {
    const snap = await db.collection('posts').doc(id).get();
    if (!snap.exists) return null;
    const post = snap.data() as Record<string, unknown>;
    return { ...(await duenoDelPerfil(db, post.userId)), modality: modalidadDeUnPost(post) };
  },
  COMMENT: async (db: Firestore, id: string) => {
    const snap = await db.collection('comments').doc(id).get();
    if (!snap.exists) return null;
    return { ...(await duenoDelPerfil(db, (snap.data() as Record<string, unknown>).userId)), modality: 'TEXT' as const };
  },
  /* Un Perfil Real, un Perfil Weë y una Página son la misma clase de objetivo: una entidad. */
  ENTITY: async (db: Firestore, id: string) => {
    const snap = await db.collection(ENTIDADES).doc(id).get();
    if (!snap.exists) return null;
    const e = snap.data() as { ownerAccountId?: string; entityId?: string };
    return { ownerAccountId: e.ownerAccountId, ownerEntityId: e.entityId };
  },
});

/* ── Por qué se rechaza, dicho sin contar nada de dentro ────────────────── */

export type CodigoDeModeracion =
  | MotivoDeRechazo | MotivoDeRevisionRechazada
  | 'unauthenticated' | 'account_required' | 'entity_not_owned'
  | 'target_type_not_enabled' | 'target_not_found' | 'own_content' | 'rate_limited' | 'report_not_found';

export class RechazoDeModeracion extends Error {
  constructor(readonly code: CodigoDeModeracion, readonly retryAfterMs?: number) {
    super(code);
    this.name = 'RechazoDeModeracion';
  }
}

type CodigoHttps = 'invalid-argument' | 'unauthenticated' | 'failed-precondition' | 'permission-denied' | 'not-found' | 'resource-exhausted';

const CODIGO_HTTPS: Readonly<Partial<Record<CodigoDeModeracion, CodigoHttps>>> = Object.freeze({
  unauthenticated: 'unauthenticated',
  account_required: 'failed-precondition',
  entity_not_owned: 'permission-denied',
  target_type_not_enabled: 'failed-precondition',
  target_not_found: 'not-found',
  report_not_found: 'not-found',
  own_content: 'failed-precondition',
  rate_limited: 'resource-exhausted',
  invalid_transition: 'failed-precondition',
});

/**
 * Lo que viaja al cliente: un código de gRPC y un motivo corto en `details`.
 * Nunca el mensaje de Firestore, ni una pila, ni un identificador. El texto que
 * ve la persona lo pone el cliente, en su idioma.
 */
export const aHttpsError = (error: unknown): HttpsError => {
  if (error instanceof RechazoDeModeracion) {
    return new HttpsError(CODIGO_HTTPS[error.code] ?? 'invalid-argument', 'No se pudo completar.', {
      reason: error.code,
      ...(error.retryAfterMs !== undefined ? { retryAfterMs: error.retryAfterMs } : {}),
    });
  }
  console.error('MODERATION: fallo interno', error instanceof Error ? error.message : String(error));
  return new HttpsError('internal', 'No se pudo completar.', { reason: 'internal' });
};

/* ── El motor ───────────────────────────────────────────────────────────── */

export interface ModeracionDeps {
  db: Firestore;
  now?: () => number;
  huella?: Huella;
  evaluador?: ModerationEvaluator;
  politica?: PoliticaDeReportes;
  resolutores?: Readonly<Partial<Record<ReportTargetType, (db: Firestore, id: string) => Promise<ObjetivoLeido | null>>>>;
  /**
   * LA COSTURA DEL AVISO. Se llama una vez, cuando un reporte llega a un final
   * —y solo entonces: que exista un reporte no es motivo para avisar a nadie—.
   * Hoy no hay nada enchufado. Un aviso roto no deshace la decisión.
   */
  alCerrar?: (report: Report) => void | Promise<void>;
}

export interface ReporteRecibido extends VistaParaQuienDenuncia {
  received: true;
  /** `true` si esta cuenta ya había dicho esto mismo de esto mismo. No se creó nada nuevo. */
  duplicate: boolean;
}

export interface PeticionDeRevisionDeWee {
  reportId: unknown;
  to: unknown;
  outcome?: unknown;
  action?: unknown;
  reason?: unknown;
}

export const crearModeracion = (deps: ModeracionDeps) => {
  const { db } = deps;
  const now = deps.now ?? (() => Date.now());
  const huella = deps.huella ?? huellaDelSistema;
  const evaluador = deps.evaluador ?? EVALUADOR_DE_REGLAS;
  const politica = deps.politica ?? POLITICA_DE_REPORTES;
  const resolutores = deps.resolutores ?? RESOLUTORES;

  /**
   * CREAR UN REPORTE. `principalId` es SIEMPRE `request.auth.uid`: no hay ningún
   * camino por el que un dato del cliente llegue a ser la cuenta que denuncia.
   */
  const reportar = async (principalId: string | undefined, data: unknown): Promise<ReporteRecibido> => {
    if (typeof principalId !== 'string' || !principalId) throw new RechazoDeModeracion('unauthenticated');

    const validada = validarPeticionDeReporte(data, politica);
    if (!validada.ok) throw new RechazoDeModeracion(validada.code);
    const { peticion } = validada;

    const resolver = resolutores[peticion.targetType];
    if (!resolver) throw new RechazoDeModeracion('target_type_not_enabled');

    /* La cuenta tiene que haber nacido y estar activa: una sesión sin cuenta no es nadie en Weë. */
    const cuenta = await cuentaDeWee(db, principalId);
    if (!cuenta || cuenta.status !== 'ACTIVE') throw new RechazoDeModeracion('account_required');
    const reporter: QuienDenuncia = { accountId: cuenta.accountId };

    /* La cara es una PISTA del cliente. Se lee, y si no es de esta cuenta no se ignora: se rechaza. */
    if (peticion.actingEntityId) {
      const snap = await db.collection(ENTIDADES).doc(peticion.actingEntityId).get();
      const actor = actorDeLaCuenta(snap.exists ? (snap.data() as Parameters<typeof actorDeLaCuenta>[0]) : undefined, cuenta.accountId);
      if (!actor) throw new RechazoDeModeracion('entity_not_owned');
      reporter.entityId = actor.actorEntityId;
      reporter.entityType = actor.actorEntityType;
    }

    const objetivo = await resolver(db, peticion.targetId);
    if (!objetivo) throw new RechazoDeModeracion('target_not_found');
    const { firmadoPor, ...resuelto } = objetivo;
    /* Lo propio no se denuncia. Se mira por la entidad, y por la firma heredada cuando no la hay. */
    if (esContenidoPropio(cuenta.accountId, resuelto) || identidadHeredadaEsDeLaCuenta(firmadoPor, cuenta.accountId)) {
      throw new RechazoDeModeracion('own_content');
    }

    const reportId = idDeReporte(huella, { reporterAccountId: cuenta.accountId, targetType: peticion.targetType, targetId: peticion.targetId, reason: peticion.reason });
    if (!reportId) throw new RechazoDeModeracion('malformed');

    const at = now();
    const evaluation = await evaluador.evaluar({
      contract: '1.0', modality: resuelto.modality ?? 'TEXT', target: { type: peticion.targetType, id: peticion.targetId },
      source: 'REPORT', reason: peticion.reason, at,
    });
    if (!decisionValida(evaluation)) throw new Error('el evaluador devolvió una decisión que no es válida');

    const report = nuevoReporte({ reportId, reporter, peticion, objetivo: resuelto, evaluation, at });
    if (!report) throw new RechazoDeModeracion('malformed');

    const limiteRef = db.collection(LIMITES).doc(cuenta.accountId);
    const reporteRef = db.collection(REPORTES).doc(reportId);

    const resultado = await db.runTransaction(async (tx) => {
      const [limiteSnap, reporteSnap] = await Promise.all([tx.get(limiteRef), tx.get(reporteRef)]);
      const limite = evaluarLimite(limiteSnap.exists ? limiteSnap.data() : undefined, at, politica);
      if (!limite.ok) return { tipo: 'limitado' as const, retryAfterMs: limite.retryAfterMs };
      /* El intento cuenta siempre, también cuando resulta ser un duplicado. */
      tx.set(limiteRef, { ...limite.siguiente, updatedAt: at });
      if (reporteSnap.exists) return { tipo: 'duplicado' as const, report: reporteSnap.data() as Report };
      tx.create(reporteRef, { ...report });
      tx.create(reporteRef.collection(HISTORIAL).doc(idDeEntrada(1)), { ...entradaDeCreacion(report) });
      return { tipo: 'creado' as const, report };
    });

    if (resultado.tipo === 'limitado') throw new RechazoDeModeracion('rate_limited', resultado.retryAfterMs);
    if (resultado.tipo === 'creado') {
      console.log(`MODERATION: reporte recibido ${reportId} ${peticion.targetType} ${peticion.reason}`);
    }
    return { received: true, duplicate: resultado.tipo === 'duplicado', ...vistaParaQuienDenuncia(resultado.report) };
  };

  /**
   * REVISAR. La costura de la revisión humana, entera: la decisión la toma el
   * contrato, y aquí se aplica con su historial en la misma transacción.
   */
  const revisar = async (reviewerId: string, p: PeticionDeRevisionDeWee): Promise<Report> => {
    if (typeof p.reportId !== 'string' || !FORMA_DE_ID_DE_REPORTE.test(p.reportId)) throw new RechazoDeModeracion('report_not_found');
    if (!esEstadoDeReporte(p.to)) throw new RechazoDeModeracion('invalid_status');
    const ref = db.collection(REPORTES).doc(p.reportId);
    const at = now();

    const final = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new RechazoDeModeracion('report_not_found');
      const decidida = transicionarReporte(snap.data() as Report, {
        to: p.to as ReportStatus, reviewerId, at,
        outcome: p.outcome as ModerationOutcome | undefined,
        action: p.action as ModerationActionType | undefined,
        reason: p.reason as string | undefined,
      });
      if (!decidida.ok) throw new RechazoDeModeracion(decidida.code);
      const { report, entradas } = decidida;
      tx.update(ref, {
        status: report.status, updatedAt: report.updatedAt, historyCount: report.historyCount,
        ...(report.decision ? { decision: report.decision } : {}),
        ...(report.action ? { action: report.action } : {}),
      });
      /* `create`, nunca `set`: una entrada de historial no se pisa. */
      for (const e of entradas) tx.create(ref.collection(HISTORIAL).doc(idDeEntrada(e.seq)), { ...e });
      return report;
    });

    if ((final.status === 'ACTIONED' || final.status === 'DISMISSED') && deps.alCerrar) {
      try { await deps.alCerrar(final); } catch (e) { console.warn('MODERATION: el aviso de cierre falló', e instanceof Error ? e.message : String(e)); }
    }
    return final;
  };

  /** LA COLA. Los más antiguos primero, y nunca más de cincuenta de una vez. */
  const listar = async (status: unknown = 'RECEIVED', limite: unknown = 25): Promise<Report[]> => {
    if (!esEstadoDeReporte(status)) throw new RechazoDeModeracion('invalid_status');
    const n = Math.min(50, Math.max(1, Number.isFinite(Number(limite)) ? Math.floor(Number(limite)) : 25));
    const snap = await db.collection(REPORTES).where('status', '==', status).orderBy('createdAt', 'asc').limit(n).get();
    return snap.docs.map((d) => d.data() as Report);
  };

  const historial = async (reportId: unknown): Promise<EntradaDeHistorial[]> => {
    if (typeof reportId !== 'string' || !FORMA_DE_ID_DE_REPORTE.test(reportId)) throw new RechazoDeModeracion('report_not_found');
    const snap = await db.collection(REPORTES).doc(reportId).collection(HISTORIAL).orderBy('seq', 'asc').limit(100).get();
    return snap.docs.map((d) => d.data() as EntradaDeHistorial);
  };

  return { reportar, revisar, listar, historial };
};

/* ── Las dos puertas ────────────────────────────────────────────────────── */

/**
 * DENUNCIAR. Cualquiera con sesión y cuenta. Contesta tres cosas y ninguna más:
 * que se recibió, si ya lo había dicho antes, y en qué situación está.
 */
export const reportContent = onCall(OPTS, async (request) => {
  try {
    return await crearModeracion({ db: getFirestore() }).reportar(request.auth?.uid, request.data);
  } catch (error) {
    throw aHttpsError(error);
  }
});

/**
 * LA PUERTA DE REVISIÓN. Solo administración, con la misma comprobación que el
 * resto de paneles. Sin ella, la única forma de tocar un reporte sería la
 * consola de Firebase — que no deja historial, que es justo lo que no puede
 * pasar. La pantalla llegará con el Control Center; esto es lo que usará.
 */
export const moderationAdmin = onCall(OPTS, async (request) => {
  assertAdmin(request.auth as { uid: string; token?: Record<string, unknown> } | undefined);
  const data = (request.data && typeof request.data === 'object' ? request.data : {}) as Record<string, unknown>;
  const moderacion = crearModeracion({ db: getFirestore() });
  try {
    if (data.action === 'list') return { reports: await moderacion.listar(data.status, data.limit), statuses: ESTADOS_DE_REPORTE };
    if (data.action === 'history') return { history: await moderacion.historial(data.reportId) };
    if (data.action === 'review') {
      return { report: await moderacion.revisar(request.auth!.uid, { reportId: data.reportId, to: data.to, outcome: data.outcome, action: data.decisionAction, reason: data.reason }) };
    }
    throw new HttpsError('invalid-argument', 'Acción desconocida.', { reason: 'unknown_action' });
  } catch (error) {
    throw error instanceof HttpsError ? error : aHttpsError(error);
  }
});
