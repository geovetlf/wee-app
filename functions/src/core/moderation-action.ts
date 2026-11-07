import { esIdDeCuenta } from './identity';
import {
  FORMA_DE_ID_DE_OBJETIVO, FORMA_DE_ID_DE_REPORTE, Gravedad, Huella, ReportTargetType, esGravedad, esTipoDeObjetivo,
} from './moderation';
import {
  CasoDeModeracion, ClaseDeContenido, EstadoDeCaso, FORMA_DE_ID_DE_CASO, MODERATION_CORE_CONTRACT_VERSION, ObjetivoDelCaso,
  POLITICA_DE_PRIORIDAD, PoliticaDePrioridad, gravedadDeInfraccion, tieneSenalDeRiesgo,
} from './moderation-case';

/**
 * WEE CORE — MODERATION CORE · ACCIONES, SANCIONES, POLÍTICAS Y AUDITORÍA. EL CONTRATO.
 *
 * ── Una función por acción, y ninguna puerta genérica ───────────────────────
 *
 * Cada cosa que una persona de moderación puede hacer tiene aquí su nombre,
 * su PERMISO propio y la lista CERRADA de campos que admite. No existe «escribe
 * esto en el caso»: existe ocultar, restaurar, retirar, advertir, suspender,
 * bloquear, levantar una sanción y resolver, cada una con su validación. Lo que
 * no está en la lista de una operación tumba la petición entera.
 *
 * ── Lo que exige cualquier acción, sin excepción ────────────────────────────
 *
 *   · una identidad administrativa autorizada (la decide la composición, no esto);
 *   · el permiso ESPECÍFICO de esa acción (`OPERACIONES[op].permiso`);
 *   · una justificación escrita por quien actúa;
 *   · la referencia a un caso (o a una apelación, que cuelga de un caso);
 *   · un `requestId`: repetir la petición no repite la acción;
 *   · y su entrada de auditoría, inmutable, en la misma transacción.
 *
 * ── Nada se destruye ────────────────────────────────────────────────────────
 *
 * Ocultar y retirar sacan el contenido de su sitio y lo guardan ENTERO en la
 * custodia de moderación; restaurar lo devuelve tal cual. Retirar no borra: es
 * una ocultación definitiva cuya copia se conserva hasta que el dueño apruebe
 * una política de retención (`POLITICA_DE_RETIRADA.purgaTrasDias`, hoy `null`).
 *
 * ── El permiso es de la CUENTA administrativa, nunca de una cara ────────────
 *
 * Aquí no hay Perfil Real ni Perfil Weë: quien actúa es el principal
 * autenticado que la composición comprobó. Un permiso no se hereda de una cara
 * a otra porque las caras no tienen permisos.
 *
 * Puro: ni Firestore, ni reloj, ni red, ni criptografía (la huella la ponen).
 */

/* ── Permisos ───────────────────────────────────────────────────────────── */

/**
 * LOS PERMISOS DE MODERACIÓN, con el mismo vocabulario que la Consola
 * (`moderation.read`, `moderation.review` ya existen allí). Lectura y escritura
 * van separadas: poder mirar la cola no da poder para actuar, y poder actuar
 * sobre el contenido no da poder para sancionar una cuenta.
 */
export const PERMISOS_DE_LECTURA_DE_MODERACION = Object.freeze([
  'moderation.read',
  /* Ver QUIÉN denunció y el vínculo entre las caras de la persona denunciada. Aparte, y cada uso queda auditado. */
  'moderation.identity.read',
  'moderation.audit.read',
] as const);

export const PERMISOS_DE_ESCRITURA_DE_MODERACION = Object.freeze([
  'moderation.review',
  'moderation.case.resolve',
  'moderation.content.hide',
  'moderation.content.restore',
  'moderation.content.remove',
  'moderation.account.warn',
  'moderation.account.suspend',
  'moderation.account.block',
  'moderation.sanction.lift',
  'moderation.appeal.review',
] as const);

export const PERMISOS_DE_MODERACION = Object.freeze([...PERMISOS_DE_LECTURA_DE_MODERACION, ...PERMISOS_DE_ESCRITURA_DE_MODERACION]);
export type PermisoDeModeracion = (typeof PERMISOS_DE_MODERACION)[number];

export const esPermisoDeModeracion = (v: unknown): v is PermisoDeModeracion =>
  typeof v === 'string' && (PERMISOS_DE_MODERACION as readonly string[]).includes(v);

/* ── Operaciones de escritura ───────────────────────────────────────────── */

export type OperacionDeModeracion =
  | 'OPEN_CASE' | 'TAKE_CASE' | 'RELEASE_CASE' | 'REQUIRE_ACTION' | 'REJECT_CASE' | 'RESOLVE_CASE'
  | 'HIDE_CONTENT' | 'RESTORE_CONTENT' | 'REMOVE_CONTENT'
  | 'WARN_ACCOUNT' | 'SUSPEND_ACCOUNT' | 'BLOCK_ACCOUNT' | 'LIFT_SANCTION'
  | 'TAKE_APPEAL' | 'DECIDE_APPEAL';

/** Lo que hace el sistema por su cuenta, sin persona: solo estas dos, y las dos pueden deshacerse. */
export type OperacionDelSistema = 'PREVENTIVE_HIDE' | 'EXPIRE_SANCTION';

export type FamiliaDeOperacion = 'CASE' | 'CONTENT' | 'ACCOUNT' | 'APPEAL';

interface DefinicionDeOperacion {
  permiso: PermisoDeModeracion;
  /** El nombre de la callable que la atiende. Una por operación. */
  callable: string;
  familia: FamiliaDeOperacion;
  /** Los ÚNICOS campos que admite, además de `requestId` y `justification`. */
  campos: readonly string[];
}

export const OPERACIONES: Readonly<Record<OperacionDeModeracion, DefinicionDeOperacion>> = Object.freeze({
  OPEN_CASE: { permiso: 'moderation.review', callable: 'moderationOpenCase', familia: 'CASE', campos: ['targetType', 'targetId', 'fromReportId', 'gravity'] },
  TAKE_CASE: { permiso: 'moderation.review', callable: 'moderationTakeCase', familia: 'CASE', campos: ['caseId'] },
  RELEASE_CASE: { permiso: 'moderation.review', callable: 'moderationReleaseCase', familia: 'CASE', campos: ['caseId'] },
  REQUIRE_ACTION: { permiso: 'moderation.review', callable: 'moderationRequireAction', familia: 'CASE', campos: ['caseId', 'proposedAction'] },
  REJECT_CASE: { permiso: 'moderation.review', callable: 'moderationRejectCase', familia: 'CASE', campos: ['caseId'] },
  RESOLVE_CASE: { permiso: 'moderation.case.resolve', callable: 'moderationResolveCase', familia: 'CASE', campos: ['caseId'] },
  HIDE_CONTENT: { permiso: 'moderation.content.hide', callable: 'moderationHideContent', familia: 'CONTENT', campos: ['caseId'] },
  RESTORE_CONTENT: { permiso: 'moderation.content.restore', callable: 'moderationRestoreContent', familia: 'CONTENT', campos: ['caseId'] },
  REMOVE_CONTENT: { permiso: 'moderation.content.remove', callable: 'moderationRemoveContent', familia: 'CONTENT', campos: ['caseId'] },
  WARN_ACCOUNT: { permiso: 'moderation.account.warn', callable: 'moderationWarnAccount', familia: 'ACCOUNT', campos: ['caseId'] },
  SUSPEND_ACCOUNT: { permiso: 'moderation.account.suspend', callable: 'moderationSuspendAccount', familia: 'ACCOUNT', campos: ['caseId', 'durationHours'] },
  BLOCK_ACCOUNT: { permiso: 'moderation.account.block', callable: 'moderationBlockAccount', familia: 'ACCOUNT', campos: ['caseId'] },
  LIFT_SANCTION: { permiso: 'moderation.sanction.lift', callable: 'moderationLiftSanction', familia: 'ACCOUNT', campos: ['caseId', 'sanctionId'] },
  TAKE_APPEAL: { permiso: 'moderation.appeal.review', callable: 'moderationTakeAppeal', familia: 'APPEAL', campos: ['appealId'] },
  DECIDE_APPEAL: { permiso: 'moderation.appeal.review', callable: 'moderationDecideAppeal', familia: 'APPEAL', campos: ['appealId', 'outcome'] },
});

export const OPERACIONES_DE_MODERACION = Object.freeze(Object.keys(OPERACIONES) as OperacionDeModeracion[]);

export const esOperacionDeModeracion = (v: unknown): v is OperacionDeModeracion =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(OPERACIONES, v);

/** Las que actúan sobre el mundo (contenido o cuenta). Solo estas se pueden proponer, y solo estas se apelan. */
export const OPERACIONES_CON_EFECTO: readonly OperacionDeModeracion[] = Object.freeze([
  'HIDE_CONTENT', 'REMOVE_CONTENT', 'WARN_ACCOUNT', 'SUSPEND_ACCOUNT', 'BLOCK_ACCOUNT',
] as const);

/** Desde qué estados del caso se puede actuar sobre el mundo: alguien tiene que haberlo cogido. */
export const ESTADOS_PARA_ACTUAR: readonly EstadoDeCaso[] = Object.freeze(['UNDER_REVIEW', 'ACTION_REQUIRED', 'ACTION_TAKEN'] as const);

/* ── Lecturas de la consola ─────────────────────────────────────────────── */

export type LecturaDeConsola =
  | 'inbox' | 'cases' | 'case' | 'content' | 'history' | 'actions' | 'sanctions'
  | 'appeals' | 'subject' | 'reporter' | 'stats' | 'policies' | 'audit';

/**
 * LAS LECTURAS, SEPARADAS DE LAS ESCRITURAS. Cada una con su permiso de LECTURA;
 * ninguna escribe nada salvo su propia constancia en la auditoría. Las que
 * enseñan datos de personas quedan auditadas ANTES de devolver nada.
 */
export const LECTURAS_DE_CONSOLA: Readonly<Record<LecturaDeConsola, { permiso: PermisoDeModeracion; auditada: boolean }>> = Object.freeze({
  inbox: { permiso: 'moderation.read', auditada: true },
  cases: { permiso: 'moderation.read', auditada: true },
  case: { permiso: 'moderation.read', auditada: true },
  content: { permiso: 'moderation.read', auditada: true },
  history: { permiso: 'moderation.read', auditada: true },
  actions: { permiso: 'moderation.read', auditada: true },
  sanctions: { permiso: 'moderation.read', auditada: true },
  appeals: { permiso: 'moderation.read', auditada: true },
  subject: { permiso: 'moderation.read', auditada: true },
  reporter: { permiso: 'moderation.identity.read', auditada: true },
  stats: { permiso: 'moderation.read', auditada: false },
  policies: { permiso: 'moderation.read', auditada: false },
  audit: { permiso: 'moderation.audit.read', auditada: true },
});

export const esLecturaDeConsola = (v: unknown): v is LecturaDeConsola =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(LECTURAS_DE_CONSOLA, v);

/* ── Identificadores ────────────────────────────────────────────────────── */

export const FORMA_DE_ID_DE_ACCION = /^mac_[0-9a-f]{32}$/;
export const FORMA_DE_ID_DE_SANCION = /^msn_[0-9a-f]{32}$/;
export const FORMA_DE_ID_DE_CUSTODIA = /^vlt_[0-9a-f]{32}$/;
export const FORMA_DE_ID_DE_APELACION = /^apl_[0-9a-f]{32}$/;
export const FORMA_DE_ID_DE_AVISO = /^mno_[0-9a-f]{32}$/;
export const FORMA_DE_REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

const prefijado = (prefijo: string, huella: Huella, partes: readonly string[]): string | undefined => {
  const hex = huella([MODERATION_CORE_CONTRACT_VERSION, ...partes].join('\n'));
  return typeof hex === 'string' && /^[0-9a-f]{32,}$/.test(hex) ? `${prefijo}_${hex.slice(0, 32)}` : undefined;
};

/**
 * EL IDENTIFICADOR DE UNA ACCIÓN ES SU IDEMPOTENCIA. Sale de quién actúa, de
 * qué operación y del `requestId` que eligió: la misma petición repetida cae
 * en el mismo documento, y la transacción ve que ya existe.
 */
export const idDeAccion = (huella: Huella, actor: { kind: 'ADMIN' | 'SYSTEM'; id: string }, operacion: string, requestId: string): string | undefined =>
  actor && typeof actor.id === 'string' && actor.id && typeof operacion === 'string' && operacion && typeof requestId === 'string' && requestId
    ? prefijado('mac', huella, ['action', actor.kind, actor.id, operacion, requestId]) : undefined;

/** Una custodia por contenido: ocultar, retirar y restaurar el mismo contenido hablan del mismo documento. */
export const idDeCustodia = (huella: Huella, clave: string): string | undefined =>
  typeof clave === 'string' && clave ? prefijado('vlt', huella, ['vault', clave]) : undefined;

/** Una sanción por acción: repetir la acción no sanciona dos veces. */
export const idDeSancion = (huella: Huella, actionId: string): string | undefined =>
  FORMA_DE_ID_DE_ACCION.test(actionId) ? prefijado('msn', huella, ['sanction', actionId]) : undefined;

/** Una apelación por acción: la misma decisión no se apela dos veces. */
export const idDeApelacion = (huella: Huella, actionId: string): string | undefined =>
  FORMA_DE_ID_DE_ACCION.test(actionId) ? prefijado('apl', huella, ['appeal', actionId]) : undefined;

export const idDeAviso = (huella: Huella, origenId: string, tipo: string): string | undefined =>
  typeof origenId === 'string' && origenId && typeof tipo === 'string' && tipo ? prefijado('mno', huella, ['notice', origenId, tipo]) : undefined;

/* ── La petición de una operación ───────────────────────────────────────── */

export type MotivoDeOperacionRechazada =
  | 'malformed' | 'too_large' | 'unknown_field' | 'invalid_request_id' | 'invalid_case' | 'invalid_justification'
  | 'invalid_target_type' | 'invalid_target_id' | 'invalid_report' | 'target_required' | 'invalid_proposed_action'
  | 'invalid_duration' | 'invalid_sanction' | 'invalid_appeal' | 'invalid_outcome' | 'invalid_gravity';

export interface PeticionDeOperacion {
  operacion: OperacionDeModeracion;
  requestId: string;
  justification: string;
  caseId?: string;
  appealId?: string;
  targetType?: ReportTargetType;
  targetId?: string;
  fromReportId?: string;
  gravity?: Gravedad;
  proposedAction?: OperacionDeModeracion;
  durationHours?: number;
  sanctionId?: string;
  outcome?: 'UPHELD' | 'DENIED';
}

export type OperacionValidada =
  | { ok: true; peticion: PeticionDeOperacion }
  | { ok: false; code: MotivoDeOperacionRechazada; field?: string };

export const MAXIMO_DE_PETICION_DE_OPERACION = 4_096;
export const LIMITES_DE_JUSTIFICACION = Object.freeze({ minimo: 3, maximo: 1_000 });

/**
 * LOS LÍMITES DE UNA SUSPENSIÓN TEMPORAL: entre una hora y un año. No son una
 * política de cuánto se suspende —eso lo decide quien revisa, caso a caso—,
 * son la frontera entre una suspensión TEMPORAL y un bloqueo: más de un año ya
 * no es temporal, y para eso está bloquear.
 */
export const LIMITES_DE_SUSPENSION = Object.freeze({ minimoHoras: 1, maximoHoras: 24 * 365 });

const c = (n: number): string => String.fromCharCode(n);
const CONTROL = new RegExp('[' + c(0) + '-' + c(8) + c(11) + c(12) + c(14) + '-' + c(31) + c(127) + ']', 'g');

/** Texto libre de quien actúa: sin caracteres de control y recortado. `undefined` si no cabe o no es texto. */
export const textoLimpio = (v: unknown, minimo: number, maximo: number): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const limpio = v.replace(CONTROL, '').trim();
  return limpio.length >= minimo && limpio.length <= maximo ? limpio : undefined;
};

const esObjetoLlano = (v: unknown): v is Record<string, unknown> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/**
 * Lee la petición de una operación y devuelve SOLO lo que esa operación admite.
 * Mismo criterio que la petición de reporte: una clave de más es un intento,
 * y se rechaza en vez de ignorarse.
 */
export const validarPeticionDeOperacion = (operacion: OperacionDeModeracion, data: unknown): OperacionValidada => {
  if (!esOperacionDeModeracion(operacion) || !esObjetoLlano(data)) return { ok: false, code: 'malformed' };
  let serializada: string;
  try { serializada = JSON.stringify(data); } catch { return { ok: false, code: 'malformed' }; }
  if (typeof serializada !== 'string' || serializada.length > MAXIMO_DE_PETICION_DE_OPERACION) return { ok: false, code: 'too_large' };

  const admitidos = ['requestId', 'justification', ...OPERACIONES[operacion].campos];
  for (const clave of Object.keys(data)) {
    if (!admitidos.includes(clave)) return { ok: false, code: 'unknown_field', field: clave.slice(0, 40) };
  }
  const propio = (clave: string): unknown => (Object.prototype.hasOwnProperty.call(data, clave) ? data[clave] : undefined);

  const requestId = propio('requestId');
  if (typeof requestId !== 'string' || !FORMA_DE_REQUEST_ID.test(requestId)) return { ok: false, code: 'invalid_request_id', field: 'requestId' };
  const justification = textoLimpio(propio('justification'), LIMITES_DE_JUSTIFICACION.minimo, LIMITES_DE_JUSTIFICACION.maximo);
  if (!justification) return { ok: false, code: 'invalid_justification', field: 'justification' };

  const peticion: PeticionDeOperacion = { operacion, requestId, justification };
  const campos = OPERACIONES[operacion].campos;

  if (campos.includes('caseId')) {
    const caseId = propio('caseId');
    if (typeof caseId !== 'string' || !FORMA_DE_ID_DE_CASO.test(caseId)) return { ok: false, code: 'invalid_case', field: 'caseId' };
    peticion.caseId = caseId;
  }
  if (campos.includes('appealId')) {
    const appealId = propio('appealId');
    if (typeof appealId !== 'string' || !FORMA_DE_ID_DE_APELACION.test(appealId)) return { ok: false, code: 'invalid_appeal', field: 'appealId' };
    peticion.appealId = appealId;
  }

  if (operacion === 'OPEN_CASE') {
    const targetType = propio('targetType');
    const targetId = propio('targetId');
    const fromReportId = propio('fromReportId');
    const porObjetivo = targetType !== undefined || targetId !== undefined;
    if (porObjetivo === (fromReportId !== undefined)) return { ok: false, code: 'target_required' };
    if (porObjetivo) {
      if (!esTipoDeObjetivo(targetType)) return { ok: false, code: 'invalid_target_type', field: 'targetType' };
      if (typeof targetId !== 'string' || !FORMA_DE_ID_DE_OBJETIVO.test(targetId)) return { ok: false, code: 'invalid_target_id', field: 'targetId' };
      peticion.targetType = targetType;
      peticion.targetId = targetId;
    } else {
      if (typeof fromReportId !== 'string' || !FORMA_DE_ID_DE_REPORTE.test(fromReportId)) return { ok: false, code: 'invalid_report', field: 'fromReportId' };
      peticion.fromReportId = fromReportId;
    }
    const gravity = propio('gravity');
    if (gravity !== undefined) {
      if (!esGravedad(gravity)) return { ok: false, code: 'invalid_gravity', field: 'gravity' };
      peticion.gravity = gravity;
    }
  }
  if (operacion === 'REQUIRE_ACTION') {
    const propuesta = propio('proposedAction');
    if (!esOperacionDeModeracion(propuesta) || !OPERACIONES_CON_EFECTO.includes(propuesta)) return { ok: false, code: 'invalid_proposed_action', field: 'proposedAction' };
    peticion.proposedAction = propuesta;
  }
  if (operacion === 'SUSPEND_ACCOUNT') {
    const horas = propio('durationHours');
    if (typeof horas !== 'number' || !Number.isSafeInteger(horas) || horas < LIMITES_DE_SUSPENSION.minimoHoras || horas > LIMITES_DE_SUSPENSION.maximoHoras) {
      return { ok: false, code: 'invalid_duration', field: 'durationHours' };
    }
    peticion.durationHours = horas;
  }
  if (operacion === 'LIFT_SANCTION') {
    const sanctionId = propio('sanctionId');
    if (typeof sanctionId !== 'string' || !FORMA_DE_ID_DE_SANCION.test(sanctionId)) return { ok: false, code: 'invalid_sanction', field: 'sanctionId' };
    peticion.sanctionId = sanctionId;
  }
  if (operacion === 'DECIDE_APPEAL') {
    const outcome = propio('outcome');
    if (outcome !== 'UPHELD' && outcome !== 'DENIED') return { ok: false, code: 'invalid_outcome', field: 'outcome' };
    peticion.outcome = outcome;
  }
  return { ok: true, peticion: Object.freeze(peticion) };
};

/* ── Conflicto de interés ───────────────────────────────────────────────── */

/**
 * NADIE MODERA LO SUYO. Ni lo que publicó con cualquiera de sus caras, ni lo
 * que denunció él mismo. Se compara con la CUENTA del caso —que es la persona,
 * con sus dos caras—, nunca con una cara suelta.
 */
export const conflictoDeInteres = (actorUid: string, caso: Pick<CasoDeModeracion, 'subject'>, actorDenuncio: boolean): 'SUBJECT' | 'REPORTER' | null => {
  if (caso.subject?.accountId && caso.subject.accountId === actorUid) return 'SUBJECT';
  return actorDenuncio ? 'REPORTER' : null;
};

/* ── La custodia del contenido ──────────────────────────────────────────── */

export type EstadoDeCustodia = 'HIDDEN' | 'REMOVED' | 'RESTORED';

/**
 * EL CONTENIDO MIENTRAS NO ESTÁ EN SU SITIO. `data` es el documento EXACTO tal
 * como estaba, para que restaurar lo devuelva sin perder nada; al restaurarse
 * se suelta la copia y queda solo el rastro.
 */
export interface CustodiaDeContenido {
  contract: typeof MODERATION_CORE_CONTRACT_VERSION;
  vaultId: string;
  caseId: string;
  targetKey: string;
  target: Pick<ObjetivoDelCaso, 'type' | 'id' | 'kind'>;
  path: string;
  state: EstadoDeCustodia;
  data?: Record<string, unknown>;
  /** La puso la política de ocultación preventiva, no una persona. */
  preventive: boolean;
  lastActionId: string;
  hiddenAt?: number;
  removedAt?: number;
  restoredAt?: number;
  createdAt: number;
  updatedAt: number;
}

/** Qué hay que mover al aplicar una operación sobre el contenido. */
export type MovimientoDeContenido = 'SACAR_A_CUSTODIA' | 'DEVOLVER_A_SU_SITIO' | 'NINGUNO';

export type MotivoDeCustodiaRechazada =
  | 'content_not_custodiable' | 'content_gone' | 'content_already_hidden' | 'content_already_removed'
  | 'content_not_hidden' | 'restore_not_allowed' | 'restore_conflict';

export type CustodiaDecidida =
  | { ok: true; estado: EstadoDeCustodia; mover: MovimientoDeContenido }
  | { ok: false; code: MotivoDeCustodiaRechazada };

/**
 * LO QUE SE PUEDE HACER CON UN CONTENIDO, según dónde esté.
 *
 *   ocultar    visible → HIDDEN (sale de su sitio a la custodia)
 *   retirar    visible → REMOVED (sale) · HIDDEN → REMOVED (ya estaba fuera)
 *   restaurar  HIDDEN → RESTORED (vuelve) · REMOVED → RESTORED solo si la política lo permite
 *
 * Restaurar no pisa nada: si el sitio está ocupado (alguien creó otra cosa con
 * ese identificador), se rechaza y la custodia sigue como estaba.
 */
export const decidirCustodia = (
  actual: Pick<CustodiaDeContenido, 'state'> | undefined,
  operacion: 'HIDE_CONTENT' | 'REMOVE_CONTENT' | 'RESTORE_CONTENT',
  contexto: { custodiable: boolean; fuenteExiste: boolean; retiradaReversible: boolean },
): CustodiaDecidida => {
  if (!contexto.custodiable) return { ok: false, code: 'content_not_custodiable' };
  const fuera = actual?.state === 'HIDDEN' || actual?.state === 'REMOVED';
  if (operacion === 'HIDE_CONTENT') {
    if (fuera) return { ok: false, code: actual?.state === 'REMOVED' ? 'content_already_removed' : 'content_already_hidden' };
    if (!contexto.fuenteExiste) return { ok: false, code: 'content_gone' };
    return { ok: true, estado: 'HIDDEN', mover: 'SACAR_A_CUSTODIA' };
  }
  if (operacion === 'REMOVE_CONTENT') {
    if (actual?.state === 'REMOVED') return { ok: false, code: 'content_already_removed' };
    if (actual?.state === 'HIDDEN') return { ok: true, estado: 'REMOVED', mover: 'NINGUNO' };
    if (!contexto.fuenteExiste) return { ok: false, code: 'content_gone' };
    return { ok: true, estado: 'REMOVED', mover: 'SACAR_A_CUSTODIA' };
  }
  if (!fuera) return { ok: false, code: 'content_not_hidden' };
  if (actual?.state === 'REMOVED' && !contexto.retiradaReversible) return { ok: false, code: 'restore_not_allowed' };
  if (contexto.fuenteExiste) return { ok: false, code: 'restore_conflict' };
  return { ok: true, estado: 'RESTORED', mover: 'DEVOLVER_A_SU_SITIO' };
};

/* ── Sanciones ──────────────────────────────────────────────────────────── */

export type TipoDeSancion = 'WARNING' | 'SUSPENSION' | 'BLOCK';
export type EstadoDeSancion = 'ACTIVE' | 'LIFTED' | 'EXPIRED';

export const TIPO_DE_SANCION_DE: Readonly<Partial<Record<OperacionDeModeracion, TipoDeSancion>>> = Object.freeze({
  WARN_ACCOUNT: 'WARNING', SUSPEND_ACCOUNT: 'SUSPENSION', BLOCK_ACCOUNT: 'BLOCK',
});

/**
 * UNA SANCIÓN ES DE LA CUENTA: de la persona, con sus dos caras. Suspender el
 * Perfil Weë dejando libre el Real sería no suspender a nadie.
 */
export interface SancionDeModeracion {
  contract: typeof MODERATION_CORE_CONTRACT_VERSION;
  sanctionId: string;
  accountId: string;
  type: TipoDeSancion;
  status: EstadoDeSancion;
  caseId: string;
  actionId: string;
  startsAt: number;
  /** Solo las suspensiones terminan solas. Un bloqueo dura hasta que alguien lo levanta. */
  endsAt: number | null;
  /** `ACTIVE|<fin>` mientras una suspensión está en vigor: el barrido busca por rango sobre este campo. */
  vencimiento: string | null;
  issuedBy: string;
  justification: string;
  liftedAt?: number;
  liftedBy?: string;
  liftActionId?: string;
  liftJustification?: string;
  expiredAt?: number;
  createdAt: number;
  updatedAt: number;
}

const ANCHO_DE_INSTANTE = 15;
export const claveDeVencimiento = (endsAt: number): string => `ACTIVE|${String(Math.max(0, Math.floor(endsAt))).padStart(ANCHO_DE_INSTANTE, '0')}`;
export const RANGO_DE_VENCIMIENTO_DESDE = 'ACTIVE|';

export const nuevaSancion = (a: {
  sanctionId: string; accountId: string; type: TipoDeSancion; caseId: string; actionId: string; issuedBy: string;
  justification: string; at: number; durationHours?: number;
}): SancionDeModeracion | undefined => {
  if (!FORMA_DE_ID_DE_SANCION.test(a.sanctionId) || !esIdDeCuenta(a.accountId) || !FORMA_DE_ID_DE_CASO.test(a.caseId) || !FORMA_DE_ID_DE_ACCION.test(a.actionId)) return undefined;
  if (!esIdDeCuenta(a.issuedBy) || !Number.isFinite(a.at)) return undefined;
  let endsAt: number | null = null;
  if (a.type === 'SUSPENSION') {
    const h = a.durationHours;
    if (typeof h !== 'number' || !Number.isSafeInteger(h) || h < LIMITES_DE_SUSPENSION.minimoHoras || h > LIMITES_DE_SUSPENSION.maximoHoras) return undefined;
    endsAt = a.at + h * 3_600_000;
  }
  return Object.freeze({
    contract: MODERATION_CORE_CONTRACT_VERSION,
    sanctionId: a.sanctionId,
    accountId: a.accountId,
    type: a.type,
    status: 'ACTIVE' as const,
    caseId: a.caseId,
    actionId: a.actionId,
    startsAt: a.at,
    endsAt,
    vencimiento: endsAt === null ? null : claveDeVencimiento(endsAt),
    issuedBy: a.issuedBy,
    justification: a.justification,
    createdAt: a.at,
    updatedAt: a.at,
  });
};

/** ¿Está en vigor AHORA? Una suspensión pasada su hora ya no lo está, aunque el barrido no haya pasado todavía. */
export const sancionEnVigor = (s: Pick<SancionDeModeracion, 'status' | 'type' | 'endsAt'>, at: number): boolean =>
  s.status === 'ACTIVE' && (s.type !== 'SUSPENSION' || (typeof s.endsAt === 'number' && s.endsAt > at));

export type MotivoDeSancionRechazada = 'sanction_not_active' | 'sanction_not_of_case' | 'invalid_sanction';

export const levantarSancion = (s: SancionDeModeracion | undefined, a: { caseId: string; actionId: string; by: string; justification: string; at: number }):
  { ok: true; sancion: SancionDeModeracion } | { ok: false; code: MotivoDeSancionRechazada } => {
  if (!s || !FORMA_DE_ID_DE_SANCION.test(s.sanctionId)) return { ok: false, code: 'invalid_sanction' };
  if (s.caseId !== a.caseId) return { ok: false, code: 'sanction_not_of_case' };
  if (!sancionEnVigor(s, a.at)) return { ok: false, code: 'sanction_not_active' };
  return {
    ok: true,
    sancion: Object.freeze({ ...s, status: 'LIFTED' as const, vencimiento: null, liftedAt: a.at, liftedBy: a.by, liftActionId: a.actionId, liftJustification: a.justification, updatedAt: a.at }),
  };
};

/** Una suspensión cuya hora pasó, cerrada como vencida. `undefined` si no toca. */
export const vencerSancion = (s: SancionDeModeracion, at: number): SancionDeModeracion | undefined =>
  s.status === 'ACTIVE' && s.type === 'SUSPENSION' && typeof s.endsAt === 'number' && s.endsAt <= at
    ? Object.freeze({ ...s, status: 'EXPIRED' as const, vencimiento: null, expiredAt: at, updatedAt: at }) : undefined;

export type NivelDeRestriccion = 'NONE' | 'SUSPENDED' | 'BLOCKED';

/**
 * LA RESTRICCIÓN DE UNA CUENTA, calculada de sus sanciones. Es lo que leerán
 * las puertas el día que se integre (docs/MODERATION-CORE.md § Integración):
 * hoy ninguna puerta de la app la consulta.
 */
export const restriccionDeCuenta = (sanciones: readonly SancionDeModeracion[], at: number): { level: NivelDeRestriccion; until: number | null; sanctionIds: string[] } => {
  const vigentes = sanciones.filter((s) => sancionEnVigor(s, at) && s.type !== 'WARNING');
  const bloqueos = vigentes.filter((s) => s.type === 'BLOCK');
  if (bloqueos.length) return { level: 'BLOCKED', until: null, sanctionIds: vigentes.map((s) => s.sanctionId).sort() };
  if (vigentes.length) return { level: 'SUSPENDED', until: Math.max(...vigentes.map((s) => s.endsAt ?? 0)), sanctionIds: vigentes.map((s) => s.sanctionId).sort() };
  return { level: 'NONE', until: null, sanctionIds: [] };
};

/* ── La situación de una cuenta: reincidencia y abuso de reportes ───────── */

/**
 * LO QUE SE SABE DE UNA CUENTA EN MODERACIÓN, desde los dos lados. Contadores,
 * no juicios: ni «reincidente» ni «abusador» se escriben aquí; se calculan al
 * leer, con la política que el dueño haya fijado (hoy, ninguna).
 */
export interface SituacionDeCuenta {
  contract: typeof MODERATION_CORE_CONTRACT_VERSION;
  accountId: string;
  subject: { casesOpened: number; actions: Partial<Record<OperacionDeModeracion, number>>; lastActionAt?: number };
  reporter: { reportsFiled: number; upheld: number; rejected: number; lastReportAt?: number };
  restriction: { level: NivelDeRestriccion; until: number | null; sanctionIds: string[] };
  activeSanctionIds: string[];
  createdAt: number;
  updatedAt: number;
}

export const situacionVacia = (accountId: string, at: number): SituacionDeCuenta => ({
  contract: MODERATION_CORE_CONTRACT_VERSION,
  accountId,
  subject: { casesOpened: 0, actions: {} },
  reporter: { reportsFiled: 0, upheld: 0, rejected: 0 },
  restriction: { level: 'NONE', until: null, sanctionIds: [] },
  activeSanctionIds: [],
  createdAt: at,
  updatedAt: at,
});

/** Las acciones que cuentan como antecedente: las que actuaron sobre su contenido o su cuenta. */
export const accionesPrevias = (s: Pick<SituacionDeCuenta, 'subject'> | undefined): number =>
  OPERACIONES_CON_EFECTO.reduce((n, op) => n + (s?.subject?.actions?.[op] ?? 0), 0);

/* ── Políticas: configurables, y desactivadas o sin números inventados ──── */

/**
 * OCULTACIÓN PREVENTIVA. DESACTIVADA, y sin umbrales: ni cuántos denunciantes
 * ni qué gravedades. Activarla exige que el dueño escriba los dos números en
 * `moderationPolicies/preventiveHiding`; con uno solo, o con basura, sigue
 * apagada. Ocultar preventivamente no decide el caso: lo sube a prioritaria.
 */
export interface PoliticaDeOcultacionPreventiva {
  version: number;
  habilitada: boolean;
  minimoDeDenunciantes: number | null;
  gravedades: readonly Gravedad[] | null;
  /** `true` si alguien la marcó habilitada sin poner los dos umbrales: se queda apagada y se dice. */
  incompleta?: boolean;
}

export const POLITICA_DE_OCULTACION_PREVENTIVA: PoliticaDeOcultacionPreventiva = Object.freeze({
  version: 0, habilitada: false, minimoDeDenunciantes: null, gravedades: null,
});

export const leerPoliticaDeOcultacion = (guardada: unknown): PoliticaDeOcultacionPreventiva => {
  if (!guardada || typeof guardada !== 'object' || Array.isArray(guardada)) return POLITICA_DE_OCULTACION_PREVENTIVA;
  const g = guardada as Record<string, unknown>;
  const version = typeof g.version === 'number' && Number.isSafeInteger(g.version) && g.version >= 0 ? g.version : 0;
  const minimo = typeof g.minimoDeDenunciantes === 'number' && Number.isSafeInteger(g.minimoDeDenunciantes) && g.minimoDeDenunciantes >= 1 ? g.minimoDeDenunciantes : null;
  const gravedades = Array.isArray(g.gravedades) && g.gravedades.length > 0 && g.gravedades.every(esGravedad) ? Object.freeze([...new Set(g.gravedades as Gravedad[])]) : null;
  const pedida = g.habilitada === true;
  const completa = minimo !== null && gravedades !== null;
  return Object.freeze({ version, habilitada: pedida && completa, minimoDeDenunciantes: minimo, gravedades, ...(pedida && !completa ? { incompleta: true } : {}) });
};

/**
 * ¿Toca ocultar preventivamente este caso? Solo con la política completa, contenido visible y sin decisión. Y NUNCA
 * si en el caso hay una señal de riesgo (autolesiones): esa denuncia pide que alguien mire, no que se esconda nada
 * (decisión del dueño, 2026-11-07). La gravedad que cuenta es la de INFRACCIÓN, sin las señales de riesgo.
 */
export const ocultacionPreventivaAplica = (p: PoliticaDeOcultacionPreventiva, caso: CasoDeModeracion, prioridad: PoliticaDePrioridad = POLITICA_DE_PRIORIDAD): boolean => {
  if (p.habilitada !== true || p.minimoDeDenunciantes === null || p.gravedades === null) return false;
  if (tieneSenalDeRiesgo(caso)) return false;
  const gravedad = gravedadDeInfraccion(caso, prioridad);
  return gravedad !== undefined && p.gravedades.includes(gravedad) && caso.counters.reporters >= p.minimoDeDenunciantes
    && !!caso.target.path && caso.effects.content === null && (caso.status === 'PENDING' || caso.status === 'PRIORITY_REVIEW');
};

/**
 * RETIRAR. Hoy no se borra nada: lo retirado queda custodiado y es reversible
 * (por corrección o por apelación). Purgar —borrar la copia— exige que el dueño
 * apruebe un plazo de retención; hasta entonces `purgaTrasDias` es `null` y no
 * existe código que purgue.
 */
export interface PoliticaDeRetirada { version: number; reversible: boolean; purgaTrasDias: number | null }

export const POLITICA_DE_RETIRADA: PoliticaDeRetirada = Object.freeze({ version: 0, reversible: true, purgaTrasDias: null });

export const leerPoliticaDeRetirada = (guardada: unknown): PoliticaDeRetirada => {
  if (!guardada || typeof guardada !== 'object' || Array.isArray(guardada)) return POLITICA_DE_RETIRADA;
  const g = guardada as Record<string, unknown>;
  return Object.freeze({
    version: typeof g.version === 'number' && Number.isSafeInteger(g.version) && g.version >= 0 ? g.version : 0,
    /* Lo irreversible tiene que pedirse explícitamente: cualquier otra cosa deja la retirada reversible. */
    reversible: g.reversible !== false,
    purgaTrasDias: null,
  });
};

/**
 * APELACIONES. `revisionIndependiente`: que quien revisa una apelación no sea
 * quien tomó la decisión apelada. Apagado por defecto porque con un solo
 * administrador ninguna apelación podría revisarse; cuando esté encendido, se
 * hace cumplir, y apagado queda anotado si fue la misma persona.
 */
export interface PoliticaDeApelaciones { version: number; revisionIndependiente: boolean }

export const POLITICA_DE_APELACIONES: PoliticaDeApelaciones = Object.freeze({ version: 0, revisionIndependiente: false });

export const leerPoliticaDeApelaciones = (guardada: unknown): PoliticaDeApelaciones => {
  if (!guardada || typeof guardada !== 'object' || Array.isArray(guardada)) return POLITICA_DE_APELACIONES;
  const g = guardada as Record<string, unknown>;
  return Object.freeze({
    version: typeof g.version === 'number' && Number.isSafeInteger(g.version) && g.version >= 0 ? g.version : 0,
    revisionIndependiente: g.revisionIndependiente === true,
  });
};

/**
 * ABUSO DEL SISTEMA DE REPORTES. Se MIDE siempre (reportes, confirmados,
 * rechazados) y se SEÑALA solo si el dueño fija los dos números. Señalar no
 * castiga: ninguna consecuencia automática sale de aquí.
 */
export interface PoliticaDeAbuso { version: number; minimoDeReportes: number | null; ratioDeRechazo: number | null }

export const POLITICA_DE_ABUSO: PoliticaDeAbuso = Object.freeze({ version: 0, minimoDeReportes: null, ratioDeRechazo: null });

export const leerPoliticaDeAbuso = (guardada: unknown): PoliticaDeAbuso => {
  if (!guardada || typeof guardada !== 'object' || Array.isArray(guardada)) return POLITICA_DE_ABUSO;
  const g = guardada as Record<string, unknown>;
  const minimo = typeof g.minimoDeReportes === 'number' && Number.isSafeInteger(g.minimoDeReportes) && g.minimoDeReportes >= 1 ? g.minimoDeReportes : null;
  const ratio = typeof g.ratioDeRechazo === 'number' && Number.isFinite(g.ratioDeRechazo) && g.ratioDeRechazo > 0 && g.ratioDeRechazo <= 1 ? g.ratioDeRechazo : null;
  return Object.freeze({ version: typeof g.version === 'number' && Number.isSafeInteger(g.version) && g.version >= 0 ? g.version : 0, minimoDeReportes: minimo, ratioDeRechazo: ratio });
};

export const senalesDeAbuso = (r: SituacionDeCuenta['reporter'] | undefined, p: PoliticaDeAbuso): { reportsFiled: number; upheld: number; rejected: number; rejectionRatio: number | null; flagged: boolean | null } => {
  const reportsFiled = r?.reportsFiled ?? 0;
  const upheld = r?.upheld ?? 0;
  const rejected = r?.rejected ?? 0;
  const decididos = upheld + rejected;
  const rejectionRatio = decididos > 0 ? rejected / decididos : null;
  const flagged = p.minimoDeReportes === null || p.ratioDeRechazo === null ? null
    : decididos >= p.minimoDeReportes && rejectionRatio !== null && rejectionRatio >= p.ratioDeRechazo;
  return { reportsFiled, upheld, rejected, rejectionRatio, flagged };
};

/* ── La acción guardada ─────────────────────────────────────────────────── */

/**
 * LO QUE SE HIZO, UNA VEZ Y PARA SIEMPRE. Se crea y no se toca: deshacer algo
 * es OTRA acción que lo dice (`reverses`). Su identificador es su idempotencia.
 */
export interface AccionDeModeracion {
  contract: typeof MODERATION_CORE_CONTRACT_VERSION;
  actionId: string;
  operation: OperacionDeModeracion | OperacionDelSistema;
  family: FamiliaDeOperacion | 'SYSTEM';
  caseId?: string;
  appealId?: string;
  sanctionId?: string;
  vaultId?: string;
  targetKey?: string;
  contentKind?: ClaseDeContenido;
  subjectAccountId?: string;
  actor: { kind: 'ADMIN' | 'SYSTEM'; id: string; rol?: string | null; policyVersion?: number };
  permission?: PermisoDeModeracion;
  justification: string;
  requestId?: string;
  at: number;
  result: {
    caseFrom?: EstadoDeCaso;
    caseTo?: EstadoDeCaso;
    vaultState?: EstadoDeCustodia;
    sanctionStatus?: EstadoDeSancion;
    appealStatus?: string;
    /** Al revisar o resolver una apelación: si quien la revisa es quien tomó la decisión apelada. Se anota, no se impide. */
    sameReviewer?: boolean;
  };
  /** La acción que esta deshace. */
  reverses?: string;
  /** Si la persona afectada puede apelarla. */
  appealable: boolean;
}

/* ── Avisos: el punto de enganche, sin enviar nada ──────────────────────── */

export type TipoDeAviso =
  | 'CONTENT_HIDDEN' | 'CONTENT_REMOVED' | 'CONTENT_RESTORED'
  | 'ACCOUNT_WARNED' | 'ACCOUNT_SUSPENDED' | 'ACCOUNT_BLOCKED' | 'SANCTION_LIFTED'
  | 'APPEAL_RECEIVED' | 'APPEAL_UPHELD' | 'APPEAL_DENIED';

/**
 * LA ENTREGA, APAGADA. Un aviso queda escrito en `moderationNotices` con un
 * CÓDIGO y sus datos —nunca una frase: el texto lo pondrá la app en el idioma
 * de quien lo lea— y `delivery: 'PENDING_INTEGRATION'`. Nada lo lleva a
 * `notifications` (que dispara un push de verdad) ni a ningún otro canal: eso
 * es la integración, con su autorización.
 */
export const ENTREGA_DE_AVISOS = 'PENDING_INTEGRATION' as const;

export interface AvisoDeModeracion {
  contract: typeof MODERATION_CORE_CONTRACT_VERSION;
  noticeId: string;
  recipientAccountId: string;
  kind: TipoDeAviso;
  actionId?: string;
  appealId?: string;
  sanctionId?: string;
  params: { until?: number | null; contentKind?: ClaseDeContenido };
  delivery: typeof ENTREGA_DE_AVISOS;
  createdAt: number;
}

export const AVISO_DE_OPERACION: Readonly<Partial<Record<OperacionDeModeracion | OperacionDelSistema, TipoDeAviso>>> = Object.freeze({
  HIDE_CONTENT: 'CONTENT_HIDDEN',
  PREVENTIVE_HIDE: 'CONTENT_HIDDEN',
  REMOVE_CONTENT: 'CONTENT_REMOVED',
  RESTORE_CONTENT: 'CONTENT_RESTORED',
  WARN_ACCOUNT: 'ACCOUNT_WARNED',
  SUSPEND_ACCOUNT: 'ACCOUNT_SUSPENDED',
  BLOCK_ACCOUNT: 'ACCOUNT_BLOCKED',
  LIFT_SANCTION: 'SANCTION_LIFTED',
});

/* ── Auditoría ──────────────────────────────────────────────────────────── */

export type ResultadoDeAuditoria = 'OK' | 'DENIED' | 'REJECTED' | 'ERROR' | 'DUPLICATE' | 'READ';

/**
 * UNA ENTRADA DEL REGISTRO DE AUDITORÍA DE MODERACIÓN. Solo se crea. Lo que se
 * hizo con éxito se escribe EN LA MISMA transacción que lo hizo —si la acción
 * existe, su entrada existe—; lo denegado y lo fallido, aparte.
 */
export interface EntradaDeAuditoriaDeModeracion {
  contract: typeof MODERATION_CORE_CONTRACT_VERSION;
  at: number;
  actor: { kind: 'ADMIN' | 'SYSTEM' | 'USER'; id: string; rol?: string | null };
  operation: string;
  permission?: string;
  result: ResultadoDeAuditoria;
  code?: string;
  caseId?: string;
  actionId?: string;
  appealId?: string;
  sanctionId?: string;
  targetKey?: string;
  requestId?: string;
  correlationId: string;
  justification?: string;
  /**
   * La marca de «mismo revisor» (decisión del dueño, 2026-11-07): quien revisa o resuelve una apelación es quien tomó
   * la decisión apelada. Criterio aprobado: cuando sea posible, que revise otra persona; mientras la matriz de permisos
   * no esté aprobada se ANOTA aquí —y en la apelación y en su acción— y no se impide.
   */
  sameReviewer?: boolean;
}

const corto = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const limpio = v.replace(CONTROL, '').trim();
  return limpio ? limpio.slice(0, max) : undefined;
};

/** La entrada, saneada campo a campo. Nada que no esté aquí llega al registro. */
export const entradaDeAuditoria = (e: Omit<EntradaDeAuditoriaDeModeracion, 'contract'>): EntradaDeAuditoriaDeModeracion => {
  const actorId = corto(e.actor?.id, 128) ?? 'desconocido';
  const opcional = (clave: string, v: unknown, max: number): Record<string, string> => {
    const t = corto(v, max);
    return t ? { [clave]: t } : {};
  };
  return Object.freeze({
    contract: MODERATION_CORE_CONTRACT_VERSION,
    at: Number.isFinite(e.at) ? e.at : 0,
    actor: Object.freeze({ kind: e.actor?.kind === 'SYSTEM' || e.actor?.kind === 'USER' ? e.actor.kind : 'ADMIN' as const, id: actorId, ...(e.actor?.rol !== undefined ? { rol: e.actor.rol === null ? null : corto(e.actor.rol, 40) ?? null } : {}) }),
    operation: corto(e.operation, 80) ?? 'desconocida',
    result: e.result,
    correlationId: corto(e.correlationId, 80) ?? 'sin-correlacion',
    ...opcional('permission', e.permission, 80),
    ...opcional('code', e.code, 80),
    ...opcional('caseId', e.caseId, 40),
    ...opcional('actionId', e.actionId, 40),
    ...opcional('appealId', e.appealId, 40),
    ...opcional('sanctionId', e.sanctionId, 40),
    ...opcional('targetKey', e.targetKey, 160),
    ...opcional('requestId', e.requestId, 64),
    ...opcional('justification', e.justification, LIMITES_DE_JUSTIFICACION.maximo),
    ...(e.sameReviewer === true ? { sameReviewer: true } : {}),
  }) as EntradaDeAuditoriaDeModeracion;
};

/* ── Lo que ve la persona afectada ──────────────────────────────────────── */

/**
 * LO QUE VE QUIEN FUE MODERADO. Qué se hizo, cuándo, hasta cuándo y si puede
 * apelar. Nunca quién lo denunció, ni quién lo revisó, ni la justificación
 * interna: estas funciones no tienen forma de dejarlo pasar.
 */
export const vistaDeSancionParaElAfectado = (s: SancionDeModeracion, at: number) => Object.freeze({
  sanctionId: s.sanctionId,
  actionId: s.actionId,
  type: s.type,
  status: s.status,
  inForce: sancionEnVigor(s, at),
  startsAt: s.startsAt,
  endsAt: s.endsAt,
  ...(s.liftedAt ? { liftedAt: s.liftedAt } : {}),
  ...(s.expiredAt ? { expiredAt: s.expiredAt } : {}),
});

export const vistaDeAccionParaElAfectado = (a: AccionDeModeracion) => Object.freeze({
  actionId: a.actionId,
  operation: a.operation,
  at: a.at,
  ...(a.contentKind ? { contentKind: a.contentKind } : {}),
  ...(a.result.vaultState ? { contentState: a.result.vaultState } : {}),
  appealable: a.appealable,
});

export const vistaDeAvisoParaElAfectado = (n: AvisoDeModeracion) => Object.freeze({
  noticeId: n.noticeId,
  kind: n.kind,
  params: { ...n.params },
  createdAt: n.createdAt,
  ...(n.actionId ? { actionId: n.actionId } : {}),
  ...(n.appealId ? { appealId: n.appealId } : {}),
});
