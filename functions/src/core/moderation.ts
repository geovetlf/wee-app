import { EntityType, esIdDeCuenta, esTipoDeEntidad } from './identity';
import { AccountId, EntityId, esIdDeEntidad } from './account-identity';
import { NuevoEvento } from './events';

/**
 * WEE CORE — MODERACIÓN (Trust & Safety). EL CONTRATO.
 *
 * ── El hueco que llena, medido ──────────────────────────────────────────────
 *
 * Hasta la Fase 12 el botón de denunciar escribía en la consola y contestaba
 * «gracias por tu reporte, lo revisaremos pronto». No había reporte, ni estado,
 * ni nadie que pudiera revisarlo: era una promesa falsa. En la web ni siquiera
 * se veía, porque `Alert.alert` no pinta nada en React Native Web.
 *
 * ── Qué es esto, y qué no ───────────────────────────────────────────────────
 *
 * Una CAPA TRANSVERSAL, no un producto: no es de Social, ni de Studio, ni de
 * WeeTalk. Recibe una señal sobre cualquier cosa que exista en Weë y la lleva
 * por un camino corto y siempre igual:
 *
 *     CONTENIDO / REPORTE → MODERACIÓN → POLÍTICA → DECISIÓN → ACCIÓN → AUDITORÍA
 *
 * NO es un segundo Brain, ni un segundo Planner, ni un Workflow, ni un Router.
 * Si un día la evaluación automática usa un modelo, entrará por la misma puerta
 * que todo lo demás —capacidad → router → gateway → proveedor oficial—, con su
 * coste apuntado como coste operativo de Weë y nunca como Credits de quien
 * denuncia. Aquí solo está el PUERTO por el que entraría (`ModerationEvaluator`).
 *
 * ── Tres cosas que no se mezclan ────────────────────────────────────────────
 *
 *   REPORTE     una SEÑAL de alguien. No prueba nada por sí misma.
 *   DECISIÓN    lo que concluye quien revisa: ALLOW, BLOCK o REVIEW.
 *   ACCIÓN      lo que se hace después. Pedirla no es haberla ejecutado, y
 *               guardar una como si fuera la otra sería volver a mentir.
 *
 * Y una cuarta que tampoco: SEGURIDAD no es CALIDAD. ALLOW/BLOCK/REVIEW dicen si
 * algo puede estar en Weë; si un resultado es bueno o malo es otra pregunta, con
 * otro vocabulario, y no vive aquí.
 *
 * ── Identidad ───────────────────────────────────────────────────────────────
 *
 * Quien denuncia es una CUENTA (propiedad y autoridad). La cara con la que
 * estaba mirando es otra cosa, y se guarda aparte y solo si se pudo comprobar.
 * Ninguna de las dos la dice el cliente: las deriva el servidor de la sesión.
 * Este archivo no guarda, no consulta y no lee el reloj: recibe datos ya leídos
 * y dice qué sale de ellos.
 */

export const MODERATION_CONTRACT_VERSION = '1.0' as const;

/* ── Sobre qué se denuncia ──────────────────────────────────────────────── */

/**
 * LA CLASE DE COSA DENUNCIADA. Guardada, nunca deducida del identificador.
 *
 * Un perfil, un Perfil Weë y una Página son los tres `ENTITY`: qué clase de
 * entidad es lo dice la entidad, que es quien lo sabe. No hay `BIZ_PROFILE` ni
 * lo habrá. `POST` es la colección `posts` que producción escribe hoy;
 * `PUBLICATION` es el modelo del Core al que se llegará. Conviven a propósito:
 * retirar `POST` dejaría sin nombre a lo que ya está publicado.
 *
 * Un vídeo, una imagen o un audio NO son clases de objetivo: son la MODALIDAD
 * de un objetivo (`ModalidadModerable`). Así no hay una moderación por formato.
 */
export type ReportTargetType =
  | 'PUBLICATION' | 'POST' | 'COMMENT' | 'ENTITY'
  | 'MESSAGE' | 'ASSET' | 'CONTENT' | 'COMMUNITY';

export const TIPOS_DE_OBJETIVO: readonly ReportTargetType[] = Object.freeze([
  'PUBLICATION', 'POST', 'COMMENT', 'ENTITY', 'MESSAGE', 'ASSET', 'CONTENT', 'COMMUNITY',
] as const);

export const esTipoDeObjetivo = (v: unknown): v is ReportTargetType =>
  typeof v === 'string' && (TIPOS_DE_OBJETIVO as readonly string[]).includes(v);

/** Sin barras, sin puntos, sin espacios: un identificador, no una ruta. */
export const FORMA_DE_ID_DE_OBJETIVO = /^[A-Za-z0-9_-]{1,128}$/;

export type ModalidadModerable = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO';

export const MODALIDADES_MODERABLES: readonly ModalidadModerable[] = Object.freeze(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO'] as const);

/* ── Por qué ────────────────────────────────────────────────────────────── */

/**
 * LOS MOTIVOS. Categorías INTERNAS para clasificar señales.
 *
 * No son tipos penales ni la ley de ningún país: son los cajones en los que
 * Weë ordena lo que le cuentan. Por eso la interfaz los nombra en lenguaje
 * normal y nunca en lenguaje jurídico. La lista crece añadiendo una línea aquí
 * y su texto en `i18n`; ningún reporte ya guardado cambia de significado.
 */
export type ReportReason =
  | 'SPAM' | 'HARASSMENT' | 'HATE' | 'SEXUAL_CONTENT' | 'VIOLENCE'
  | 'SCAM' | 'IMPERSONATION' | 'ILLEGAL_CONTENT' | 'SELF_HARM' | 'OTHER';

export const MOTIVOS_DE_REPORTE: readonly ReportReason[] = Object.freeze([
  'SPAM', 'HARASSMENT', 'HATE', 'SEXUAL_CONTENT', 'VIOLENCE',
  'SCAM', 'IMPERSONATION', 'ILLEGAL_CONTENT', 'SELF_HARM', 'OTHER',
] as const);

export const esMotivoDeReporte = (v: unknown): v is ReportReason =>
  typeof v === 'string' && (MOTIVOS_DE_REPORTE as readonly string[]).includes(v);

/* ── En qué situación está ──────────────────────────────────────────────── */

/**
 * CINCO ESTADOS, Y UN SOLO CAMINO.
 *
 *     RECEIVED → REVIEWING → ACTIONED
 *                          → DISMISSED
 *                          → ESCALATED → ACTIONED
 *                                      → DISMISSED
 *
 * Nada salta de RECEIVED a un final: alguien tiene que haberlo cogido antes, y
 * eso queda escrito. ACTIONED y DISMISSED no tienen salida: una decisión tomada
 * no se reescribe. Si un día hace falta reabrir, será una transición nueva con
 * su propia entrada en el historial, no una edición de la que ya hay.
 */
export type ReportStatus = 'RECEIVED' | 'REVIEWING' | 'ACTIONED' | 'DISMISSED' | 'ESCALATED';

export const ESTADOS_DE_REPORTE: readonly ReportStatus[] = Object.freeze(['RECEIVED', 'REVIEWING', 'ACTIONED', 'DISMISSED', 'ESCALATED'] as const);

export const esEstadoDeReporte = (v: unknown): v is ReportStatus =>
  typeof v === 'string' && (ESTADOS_DE_REPORTE as readonly string[]).includes(v);

export const TRANSICIONES_DE_REPORTE: Readonly<Record<ReportStatus, readonly ReportStatus[]>> = Object.freeze({
  RECEIVED: Object.freeze(['REVIEWING'] as const),
  REVIEWING: Object.freeze(['ACTIONED', 'DISMISSED', 'ESCALATED'] as const),
  ESCALATED: Object.freeze(['ACTIONED', 'DISMISSED'] as const),
  ACTIONED: Object.freeze([] as const),
  DISMISSED: Object.freeze([] as const),
});

export const esEstadoFinalDeReporte = (s: ReportStatus): boolean => TRANSICIONES_DE_REPORTE[s].length === 0;

/* ── Decisión y acción ──────────────────────────────────────────────────── */

export type ModerationOutcome = 'ALLOW' | 'BLOCK' | 'REVIEW';

export const RESULTADOS_DE_MODERACION: readonly ModerationOutcome[] = Object.freeze(['ALLOW', 'BLOCK', 'REVIEW'] as const);

/** Quién concluyó algo: una persona que revisa, o un evaluador automático con su versión. */
export interface QuienDecide {
  kind: 'REVIEWER' | 'EVALUATOR';
  id: string;
}

export interface ModerationDecision {
  outcome: ModerationOutcome;
  by: QuienDecide;
  at: number;
  /** Por qué. Interno, acotado, y nunca se le enseña a quien denunció. */
  reason?: string;
}

/**
 * LO QUE SE PUEDE HACER DESPUÉS. La costura, no el catálogo.
 *
 * `NONE` no se guarda como acción: un reporte descartado simplemente no lleva
 * ninguna. Escalar tampoco está aquí, porque no es algo que se le haga al
 * contenido: es un estado del reporte.
 */
export type ModerationActionType = 'NONE' | 'CONTENT_HIDDEN' | 'CONTENT_BLOCKED' | 'ENTITY_RESTRICTED' | 'ACCOUNT_RESTRICTED';

export const ACCIONES_DE_MODERACION: readonly ModerationActionType[] = Object.freeze([
  'NONE', 'CONTENT_HIDDEN', 'CONTENT_BLOCKED', 'ENTITY_RESTRICTED', 'ACCOUNT_RESTRICTED',
] as const);

/**
 * PEDIDA NO ES EJECUTADA.
 *
 * Hoy no existe quien oculte una publicación o restrinja una cuenta, así que lo
 * único que puede escribirse con verdad es que la acción se PIDIÓ. `EXECUTED` y
 * `executedAt` los pondrá el ejecutor el día que exista; hasta entonces ningún
 * código los escribe, y hay una prueba que lo vigila.
 */
export interface ModerationAction {
  type: Exclude<ModerationActionType, 'NONE'>;
  status: 'REQUESTED' | 'EXECUTED';
  requestedAt: number;
  executedAt?: number;
}

/* ── El reporte ─────────────────────────────────────────────────────────── */

export interface Report {
  contract: typeof MODERATION_CONTRACT_VERSION;
  reportId: string;
  /** La cuenta. Propiedad y autoridad. La pone el servidor desde la sesión. */
  reporterAccountId: AccountId;
  /** La cara con la que se estaba, SOLO si se comprobó que es de esa cuenta. */
  reporterEntityId?: EntityId;
  reporterEntityType?: EntityType;
  targetType: ReportTargetType;
  targetId: string;
  /** De quién es lo denunciado, leído por el servidor. Para la cola de revisión; jamás para quien denuncia. */
  targetOwnerAccountId?: AccountId;
  targetOwnerEntityId?: EntityId;
  targetModality?: ModalidadModerable;
  reason: ReportReason;
  details?: string;
  /** Desde qué pantalla salió. Contexto de producto, no autoridad. */
  surface?: string;
  status: ReportStatus;
  /** Lo que dijo el evaluador automático al llegar. Hoy siempre REVIEW. */
  evaluation: ModerationDecision;
  /** Lo que concluyó quien revisó. Ausente mientras nadie haya concluido nada. */
  decision?: ModerationDecision;
  action?: ModerationAction;
  /** Cuántas entradas tiene su historial. La siguiente es esta más uno. */
  historyCount: number;
  createdAt: number;
  updatedAt: number;
}

export const FORMA_DE_ID_DE_REPORTE = /^rep_[0-9a-f]{32}$/;

/* ── La política: los números, en un sitio ──────────────────────────────── */

/**
 * LOS LÍMITES, Y DE DÓNDE SALEN.
 *
 * No son promesas de producto: son valores operativos iniciales, puestos aquí
 * para que se lean de una vez y se cambien en un sitio.
 *
 *   · Lo que una cuenta puede decir de UN objetivo ya está acotado por la
 *     deduplicación: un reporte por motivo, diez como mucho.
 *   · `maximoPorVentana` y `maximoPorDia` acotan lo que una sola cuenta —propia,
 *     robada o automatizada— puede escribir en total: 50 al día son 150
 *     escrituras en el peor caso. Alguien que denuncia de buena fe no se acerca.
 *   · Cuenta el INTENTO, no solo lo creado: repetir la misma petición cien veces
 *     no crea nada, pero cada llamada cuesta, y también se agota.
 *   · `maximoDePeticion` se mide ya serializada, antes de mirar nada más.
 */
export interface PoliticaDeReportes {
  ventanaMs: number;
  maximoPorVentana: number;
  maximoPorDia: number;
  maximoDeDetalles: number;
  maximoDePeticion: number;
}

export const POLITICA_DE_REPORTES: PoliticaDeReportes = Object.freeze({
  ventanaMs: 10 * 60_000,
  maximoPorVentana: 10,
  maximoPorDia: 50,
  maximoDeDetalles: 500,
  maximoDePeticion: 2_048,
});

/* ── La petición: lo único que el cliente puede decir ───────────────────── */

export interface PeticionDeReporte {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
  /** La cara activa, como PISTA. El servidor la lee y comprueba de quién es; si no es suya, rechaza. */
  actingEntityId?: EntityId;
  surface?: string;
}

/**
 * TODO lo que una petición puede traer. Cualquier otra clave la tumba entera.
 *
 * Es deliberadamente estricto: `reporterAccountId`, `status`, `decision`,
 * `reviewer` o `action` en una petición no son un descuido, son un intento. Se
 * rechaza en vez de ignorarse para que quede dicho, y para que un cliente que
 * crea estar mandando algo útil se entere de que no.
 */
export const CAMPOS_DE_PETICION: readonly string[] = Object.freeze(['targetType', 'targetId', 'reason', 'details', 'actingEntityId', 'surface']);

export type MotivoDeRechazo =
  | 'malformed' | 'too_large' | 'unknown_field'
  | 'invalid_target_type' | 'invalid_target_id' | 'invalid_reason'
  | 'invalid_details' | 'invalid_entity' | 'invalid_surface';

export type PeticionValidada =
  | { ok: true; peticion: PeticionDeReporte }
  | { ok: false; code: MotivoDeRechazo; field?: string };

const FORMA_DE_SUPERFICIE = /^[a-z][a-z0-9_]{0,31}$/;
/* U+0000–U+0008, U+000B, U+000C, U+000E–U+001F y U+007F: todo carácter de control salvo tabulador, salto de línea y retorno. */
const c = (n: number): string => String.fromCharCode(n);
const CONTROL = new RegExp('[' + c(0) + '-' + c(8) + c(11) + c(12) + c(14) + '-' + c(31) + c(127) + ']', 'g');

const esObjetoLlano = (v: unknown): v is Record<string, unknown> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

const recortar = (clave: string): string => (clave.length > 40 ? `${clave.slice(0, 40)}…` : clave);

/**
 * Lee una petición que viene de fuera y devuelve SOLO lo que el contrato admite.
 *
 * El resultado es un objeto nuevo, construido campo a campo: nada de lo que
 * traiga la entrada —ni su prototipo, ni una clave de más— llega a quien guarda.
 */
export const validarPeticionDeReporte = (data: unknown, politica: PoliticaDeReportes = POLITICA_DE_REPORTES): PeticionValidada => {
  if (!esObjetoLlano(data)) return { ok: false, code: 'malformed' };

  let serializada: string;
  try {
    serializada = JSON.stringify(data);
  } catch {
    return { ok: false, code: 'malformed' };
  }
  if (typeof serializada !== 'string' || serializada.length > politica.maximoDePeticion) return { ok: false, code: 'too_large' };

  for (const clave of Object.keys(data)) {
    if (!CAMPOS_DE_PETICION.includes(clave)) return { ok: false, code: 'unknown_field', field: recortar(clave) };
  }
  /* Lo que no es propio no cuenta: un `targetType` heredado de un prototipo envenenado no es de esta petición. */
  const propio = (clave: string): unknown => (Object.prototype.hasOwnProperty.call(data, clave) ? data[clave] : undefined);

  const targetType = propio('targetType');
  if (!esTipoDeObjetivo(targetType)) return { ok: false, code: 'invalid_target_type', field: 'targetType' };

  const targetId = propio('targetId');
  if (typeof targetId !== 'string' || !FORMA_DE_ID_DE_OBJETIVO.test(targetId)) return { ok: false, code: 'invalid_target_id', field: 'targetId' };

  const reason = propio('reason');
  if (!esMotivoDeReporte(reason)) return { ok: false, code: 'invalid_reason', field: 'reason' };

  const peticion: PeticionDeReporte = { targetType, targetId, reason };

  const details = propio('details');
  if (details !== undefined && details !== null) {
    if (typeof details !== 'string') return { ok: false, code: 'invalid_details', field: 'details' };
    const limpio = details.replace(CONTROL, '').trim();
    if (limpio.length > politica.maximoDeDetalles) return { ok: false, code: 'invalid_details', field: 'details' };
    if (limpio) peticion.details = limpio;
  }

  const actingEntityId = propio('actingEntityId');
  if (actingEntityId !== undefined && actingEntityId !== null) {
    if (!esIdDeEntidad(actingEntityId)) return { ok: false, code: 'invalid_entity', field: 'actingEntityId' };
    peticion.actingEntityId = actingEntityId;
  }

  const surface = propio('surface');
  if (surface !== undefined && surface !== null) {
    if (typeof surface !== 'string' || !FORMA_DE_SUPERFICIE.test(surface)) return { ok: false, code: 'invalid_surface', field: 'surface' };
    peticion.surface = surface;
  }

  return { ok: true, peticion: Object.freeze(peticion) };
};

/* ── Una señal, una vez ─────────────────────────────────────────────────── */

/**
 * La huella la pone quien compone (el Core no importa criptografía): una
 * función que devuelve hexadecimal. Misma costura que `Azar` en la identidad.
 */
export type Huella = (texto: string) => string;

/**
 * EL IDENTIFICADOR ES LA DEDUPLICACIÓN.
 *
 * Sale de cuatro cosas: la CUENTA, la clase de objetivo, el objetivo y el
 * motivo. La misma cuenta diciendo lo mismo de lo mismo es la MISMA señal, se
 * repita una vez o mil, con el Perfil Real o con el Perfil Weë — una persona
 * con dos caras es una persona, igual que con un «me gusta». Un motivo distinto
 * sí es otra señal: es información nueva, y por eso tiene otro identificador.
 *
 * No hay ventana de tiempo que elegir ni contador que mantener: el documento
 * existe o no existe, y eso lo decide una transacción.
 */
export const idDeReporte = (
  huella: Huella,
  datos: { reporterAccountId: string; targetType: ReportTargetType; targetId: string; reason: ReportReason },
): string | undefined => {
  if (!esIdDeCuenta(datos.reporterAccountId) || !esTipoDeObjetivo(datos.targetType)) return undefined;
  if (!FORMA_DE_ID_DE_OBJETIVO.test(datos.targetId) || !esMotivoDeReporte(datos.reason)) return undefined;
  const hex = huella([MODERATION_CONTRACT_VERSION, datos.reporterAccountId, datos.targetType, datos.targetId, datos.reason].join('\n'));
  if (typeof hex !== 'string' || !/^[0-9a-f]{32,}$/.test(hex)) return undefined;
  return `rep_${hex.slice(0, 32)}`;
};

/* ── El ritmo ───────────────────────────────────────────────────────────── */

export interface EstadoDeLimite {
  windowStartedAt: number;
  windowCount: number;
  /** El día, como número de días desde la época en UTC. Sin fechas: el Core no las construye. */
  day: number;
  dayCount: number;
}

export type LimiteEvaluado =
  | { ok: true; siguiente: EstadoDeLimite }
  | { ok: false; scope: 'window' | 'day'; retryAfterMs: number };

const MS_POR_DIA = 86_400_000;

const estadoDeLimiteLeido = (v: unknown): EstadoDeLimite | undefined => {
  if (typeof v !== 'object' || v === null) return undefined;
  const e = v as Record<string, unknown>;
  const n = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;
  return n(e.windowStartedAt) && n(e.windowCount) && n(e.day) && n(e.dayCount)
    ? { windowStartedAt: e.windowStartedAt, windowCount: e.windowCount, day: e.day, dayCount: e.dayCount }
    : undefined;
};

/**
 * ¿Cabe un intento más? Ventana fija y tope diario, los dos por cuenta.
 *
 * Un estado guardado que no se entiende se trata como vacío: la alternativa
 * sería dejar a alguien sin poder denunciar para siempre por un documento roto.
 */
export const evaluarLimite = (guardado: unknown, at: number, politica: PoliticaDeReportes = POLITICA_DE_REPORTES): LimiteEvaluado => {
  const hoy = Math.floor(at / MS_POR_DIA);
  const previo = estadoDeLimiteLeido(guardado);
  const enVentana = !!previo && at >= previo.windowStartedAt && at - previo.windowStartedAt < politica.ventanaMs;
  const windowStartedAt = enVentana ? previo.windowStartedAt : at;
  const windowCount = enVentana ? previo.windowCount : 0;
  const dayCount = previo && previo.day === hoy ? previo.dayCount : 0;

  if (dayCount >= politica.maximoPorDia) return { ok: false, scope: 'day', retryAfterMs: (hoy + 1) * MS_POR_DIA - at };
  if (windowCount >= politica.maximoPorVentana) return { ok: false, scope: 'window', retryAfterMs: windowStartedAt + politica.ventanaMs - at };
  return { ok: true, siguiente: { windowStartedAt, windowCount: windowCount + 1, day: hoy, dayCount: dayCount + 1 } };
};

/* ── El evaluador: la costura por la que entrará lo automático ──────────── */

/**
 * UNA PETICIÓN DE MODERACIÓN, igual para texto, imagen, vídeo o audio.
 *
 * Nunca lleva el archivo ni el texto: lleva la referencia. Quien evalúe lo lee
 * de la fuente de verdad, que es la única forma de que un reporte no se
 * convierta en una copia de lo que denuncia.
 */
export interface ModerationRequest {
  contract: typeof MODERATION_CONTRACT_VERSION;
  modality: ModalidadModerable;
  target: { type: ReportTargetType; id: string };
  /** De dónde sale la pregunta: un reporte, una revisión previa a publicar, un barrido. */
  source: 'REPORT' | 'PRE_PUBLISH' | 'SWEEP';
  reason?: ReportReason;
  assetId?: string;
  contentId?: string;
  at: number;
}

export interface ModerationEvaluator {
  /** Nombre y versión. Queda escrito en cada evaluación: cuando cambie el evaluador, se sabrá con cuál se miró qué. */
  readonly id: string;
  evaluar(request: ModerationRequest): ModerationDecision | Promise<ModerationDecision>;
}

/**
 * EL EVALUADOR DE HOY: no sabe, y lo dice.
 *
 * Determinista, sin red, sin modelo y sin coste. Ante cualquier cosa contesta
 * REVIEW —«que lo mire alguien»—, que es lo único honesto cuando no se ha mirado
 * nada. No bloquea ni da por bueno: eso exige una política explícita que todavía
 * no existe.
 */
export const EVALUADOR_DE_REGLAS: ModerationEvaluator = Object.freeze({
  id: 'wee.rules.v1',
  evaluar: (request: ModerationRequest): ModerationDecision => ({
    outcome: 'REVIEW' as const,
    by: { kind: 'EVALUATOR' as const, id: 'wee.rules.v1' },
    at: request.at,
  }),
});

export const decisionValida = (d: ModerationDecision | undefined): boolean =>
  !!d && typeof d === 'object'
  && (RESULTADOS_DE_MODERACION as readonly string[]).includes(d.outcome)
  && !!d.by && (d.by.kind === 'REVIEWER' || d.by.kind === 'EVALUATOR')
  && typeof d.by.id === 'string' && d.by.id.length > 0 && d.by.id.length <= 128
  && Number.isFinite(d.at)
  && (d.reason === undefined || (typeof d.reason === 'string' && d.reason.length <= POLITICA_DE_REPORTES.maximoDeDetalles));

/* ── Nacer ──────────────────────────────────────────────────────────────── */

/** Lo que el servidor averiguó del objetivo LEYÉNDOLO. Nada de esto lo dice el cliente. */
export interface ObjetivoResuelto {
  ownerAccountId?: AccountId;
  ownerEntityId?: EntityId;
  modality?: ModalidadModerable;
}

/** Quien denuncia, ya comprobado: la cuenta siempre, la cara solo si es suya. */
export interface QuienDenuncia {
  accountId: AccountId;
  entityId?: EntityId;
  entityType?: EntityType;
}

export const esContenidoPropio = (reporterAccountId: string, objetivo: ObjetivoResuelto | undefined): boolean =>
  !!objetivo?.ownerAccountId && objetivo.ownerAccountId === reporterAccountId;

export interface NuevoReporte {
  reportId: string;
  reporter: QuienDenuncia;
  peticion: PeticionDeReporte;
  objetivo: ObjetivoResuelto;
  evaluation: ModerationDecision;
  at: number;
}

/**
 * El reporte recién nacido, o `undefined` si lo que le dan no da para uno.
 *
 * Siempre nace RECEIVED y sin decisión, diga lo que diga el evaluador: que una
 * evaluación automática mueva un reporte exige una política explícita, y aquí
 * no la hay.
 */
export const nuevoReporte = (n: NuevoReporte): Report | undefined => {
  if (!FORMA_DE_ID_DE_REPORTE.test(n.reportId) || !esIdDeCuenta(n.reporter?.accountId)) return undefined;
  if (!Number.isFinite(n.at) || !decisionValida(n.evaluation)) return undefined;
  const conCara = n.reporter.entityId !== undefined || n.reporter.entityType !== undefined;
  if (conCara && (!esIdDeEntidad(n.reporter.entityId) || !esTipoDeEntidad(n.reporter.entityType))) return undefined;
  const o = n.objetivo ?? {};
  if (o.ownerAccountId !== undefined && !esIdDeCuenta(o.ownerAccountId)) return undefined;
  if (o.ownerEntityId !== undefined && !esIdDeEntidad(o.ownerEntityId)) return undefined;
  if (o.modality !== undefined && !(MODALIDADES_MODERABLES as readonly string[]).includes(o.modality)) return undefined;

  return Object.freeze({
    contract: MODERATION_CONTRACT_VERSION,
    reportId: n.reportId,
    reporterAccountId: n.reporter.accountId,
    ...(conCara ? { reporterEntityId: n.reporter.entityId, reporterEntityType: n.reporter.entityType } : {}),
    targetType: n.peticion.targetType,
    targetId: n.peticion.targetId,
    ...(o.ownerAccountId ? { targetOwnerAccountId: o.ownerAccountId } : {}),
    ...(o.ownerEntityId ? { targetOwnerEntityId: o.ownerEntityId } : {}),
    ...(o.modality ? { targetModality: o.modality } : {}),
    reason: n.peticion.reason,
    ...(n.peticion.details ? { details: n.peticion.details } : {}),
    ...(n.peticion.surface ? { surface: n.peticion.surface } : {}),
    status: 'RECEIVED' as const,
    evaluation: Object.freeze({ ...n.evaluation, by: Object.freeze({ ...n.evaluation.by }) }),
    historyCount: 1,
    createdAt: n.at,
    updatedAt: n.at,
  });
};

/* ── El historial ───────────────────────────────────────────────────────── */

/**
 * LO QUE LE HA PASADO A UN REPORTE, en orden y sin borrar nada.
 *
 * Solo se AÑADE. Una entrada no se edita ni se quita: si algo se hizo mal, la
 * corrección es otra entrada. `ACTION_EXECUTED` está reservada para el ejecutor
 * que todavía no existe.
 */
export type TipoDeEntrada =
  | 'REPORT_CREATED' | 'REVIEW_STARTED' | 'DECISION_MADE'
  | 'ACTION_REQUESTED' | 'ACTION_EXECUTED' | 'REPORT_DISMISSED' | 'REPORT_ESCALATED';

export interface EntradaDeHistorial {
  seq: number;
  type: TipoDeEntrada;
  at: number;
  by: { kind: 'REPORTER' | 'REVIEWER' | 'EVALUATOR' | 'SYSTEM'; id: string };
  from?: ReportStatus;
  to?: ReportStatus;
  outcome?: ModerationOutcome;
  action?: ModerationActionType;
  reason?: string;
}

/** `0001`, `0002`… El orden se lee en el propio identificador, y crear dos veces la misma entrada es imposible. */
export const idDeEntrada = (seq: number): string => String(seq).padStart(4, '0');

export const entradaDeCreacion = (r: Report): EntradaDeHistorial => Object.freeze({
  seq: 1,
  type: 'REPORT_CREATED' as const,
  at: r.createdAt,
  by: Object.freeze({ kind: 'REPORTER' as const, id: r.reporterAccountId }),
  to: 'RECEIVED' as const,
});

/* ── Revisar ────────────────────────────────────────────────────────────── */

export interface PeticionDeRevision {
  to: ReportStatus;
  reviewerId: string;
  at: number;
  outcome?: ModerationOutcome;
  action?: ModerationActionType;
  reason?: string;
}

export type MotivoDeRevisionRechazada =
  | 'invalid_report' | 'invalid_status' | 'invalid_transition' | 'invalid_reviewer'
  | 'outcome_required' | 'outcome_mismatch' | 'action_required' | 'action_not_allowed' | 'invalid_reason';

export type RevisionDecidida =
  | { ok: true; report: Report; entradas: readonly EntradaDeHistorial[] }
  | { ok: false; code: MotivoDeRevisionRechazada };

/** Qué conclusión corresponde a cada final. Un descarte es ALLOW; una acción, BLOCK; escalar, REVIEW. */
const RESULTADO_DE: Readonly<Partial<Record<ReportStatus, ModerationOutcome>>> = Object.freeze({
  DISMISSED: 'ALLOW', ACTIONED: 'BLOCK', ESCALATED: 'REVIEW',
});

/**
 * EL ÚNICO SITIO DONDE UN REPORTE CAMBIA DE ESTADO.
 *
 * Pura: recibe el reporte como está y devuelve cómo queda y qué se apunta. No
 * toca el original. Quien guarde aplica las dos cosas en la misma transacción,
 * o ninguna.
 */
export const transicionarReporte = (report: Report | undefined, p: PeticionDeRevision): RevisionDecidida => {
  if (!report || !esEstadoDeReporte(report.status) || !Number.isSafeInteger(report.historyCount) || report.historyCount < 1) {
    return { ok: false, code: 'invalid_report' };
  }
  if (!esEstadoDeReporte(p.to)) return { ok: false, code: 'invalid_status' };
  if (!TRANSICIONES_DE_REPORTE[report.status].includes(p.to)) return { ok: false, code: 'invalid_transition' };
  if (!esIdDeCuenta(p.reviewerId) || !Number.isFinite(p.at)) return { ok: false, code: 'invalid_reviewer' };

  let reason: string | undefined;
  if (p.reason !== undefined) {
    if (typeof p.reason !== 'string') return { ok: false, code: 'invalid_reason' };
    const limpio = p.reason.replace(CONTROL, '').trim();
    if (limpio.length > POLITICA_DE_REPORTES.maximoDeDetalles) return { ok: false, code: 'invalid_reason' };
    reason = limpio || undefined;
  }

  const by = Object.freeze({ kind: 'REVIEWER' as const, id: p.reviewerId });
  const base = { at: p.at, by, from: report.status, to: p.to };
  let seq = report.historyCount;
  const entradas: EntradaDeHistorial[] = [];

  if (p.to === 'REVIEWING') {
    /* Cogerlo no es concluir nada: ni resultado ni acción caben aquí. */
    if (p.outcome !== undefined) return { ok: false, code: 'outcome_mismatch' };
    if (p.action !== undefined) return { ok: false, code: 'action_not_allowed' };
    entradas.push(Object.freeze({ seq: ++seq, type: 'REVIEW_STARTED' as const, ...base, ...(reason ? { reason } : {}) }));
    return { ok: true, report: Object.freeze({ ...report, status: p.to, historyCount: seq, updatedAt: p.at }), entradas: Object.freeze(entradas) };
  }

  const esperado = RESULTADO_DE[p.to];
  if (p.outcome === undefined) return { ok: false, code: 'outcome_required' };
  if (p.outcome !== esperado) return { ok: false, code: 'outcome_mismatch' };

  const pideAccion = p.to === 'ACTIONED';
  if (pideAccion && (p.action === undefined || p.action === 'NONE' || !(ACCIONES_DE_MODERACION as readonly string[]).includes(p.action))) {
    return { ok: false, code: 'action_required' };
  }
  if (!pideAccion && p.action !== undefined && p.action !== 'NONE') return { ok: false, code: 'action_not_allowed' };

  const decision: ModerationDecision = Object.freeze({ outcome: p.outcome, by, at: p.at, ...(reason ? { reason } : {}) });
  entradas.push(Object.freeze({ seq: ++seq, type: 'DECISION_MADE' as const, ...base, outcome: p.outcome, ...(reason ? { reason } : {}) }));

  let action: ModerationAction | undefined;
  if (pideAccion) {
    action = Object.freeze({ type: p.action as Exclude<ModerationActionType, 'NONE'>, status: 'REQUESTED' as const, requestedAt: p.at });
    entradas.push(Object.freeze({ seq: ++seq, type: 'ACTION_REQUESTED' as const, ...base, action: p.action }));
  } else {
    entradas.push(Object.freeze({ seq: ++seq, type: p.to === 'DISMISSED' ? 'REPORT_DISMISSED' as const : 'REPORT_ESCALATED' as const, ...base }));
  }

  return {
    ok: true,
    report: Object.freeze({ ...report, status: p.to, decision, ...(action ? { action } : {}), historyCount: seq, updatedAt: p.at }),
    entradas: Object.freeze(entradas),
  };
};

/* ── Lo que ve quien denunció ───────────────────────────────────────────── */

/**
 * TRES PALABRAS, y ninguna dice qué se decidió.
 *
 * Quien denuncia sabe que se recibió, que se está mirando o que se cerró. No
 * sabe quién lo miró, qué concluyó, qué se pidió hacer ni de quién era lo
 * denunciado: esta función no tiene forma de dejarlo pasar, y ese es su trabajo.
 */
export type EstadoParaQuienDenuncia = 'RECEIVED' | 'IN_REVIEW' | 'CLOSED';

export interface VistaParaQuienDenuncia {
  status: EstadoParaQuienDenuncia;
  createdAt: number;
}

export const vistaParaQuienDenuncia = (r: Report): VistaParaQuienDenuncia => Object.freeze({
  status: r.status === 'RECEIVED' ? 'RECEIVED' as const : esEstadoFinalDeReporte(r.status) ? 'CLOSED' as const : 'IN_REVIEW' as const,
  createdAt: r.createdAt,
});

/* ── El evento que un día se emitirá ────────────────────────────────────── */

/**
 * LOS NOMBRES, reservados. El tipo de evento del Core es abierto a propósito,
 * así que un dominio declara los suyos sin tocar `events.ts`.
 *
 * NINGUNO SE EMITE TODAVÍA. En Weë no hay transporte de eventos, y fingir uno
 * sería el mismo defecto que este archivo vino a arreglar. Lo que hay es la
 * FORMA exacta de lo que se emitirá: el día que exista una bandeja de salida,
 * quien componga construye el sobre con esto dentro de la misma transacción que
 * crea el reporte, y nada de aquí cambia. Un evento no es la base de datos: la
 * verdad del reporte es el reporte.
 */
export const EVENTOS_DE_MODERACION = Object.freeze(['REPORT_CREATED', 'REPORT_REVIEWED', 'MODERATION_ACTION'] as const);

export interface ReporteCreado {
  reportId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
}

/**
 * Lo que se anunciará de un reporte recién creado. Pequeño y por referencia:
 * ni el texto de `details`, ni de quién es lo denunciado. El identificador sale
 * del reporte, así que reintentar no produce dos eventos del mismo hecho.
 */
export const eventoDeReporteCreado = (r: Report): NuevoEvento<ReporteCreado> => ({
  eventId: `REPORT_CREATED:${r.reportId}`,
  type: 'REPORT_CREATED',
  aggregate: { type: 'REPORT', id: r.reportId },
  accountId: r.reporterAccountId,
  occurredAt: r.createdAt,
  ...(r.reporterEntityId && r.reporterEntityType ? { actor: { entityId: r.reporterEntityId, entityType: r.reporterEntityType } } : {}),
  payload: Object.freeze({ reportId: r.reportId, targetType: r.targetType, targetId: r.targetId, reason: r.reason }),
});
