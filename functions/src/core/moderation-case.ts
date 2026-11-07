import { EntityType, esIdDeCuenta, esTipoDeEntidad } from './identity';
import { esIdDeEntidad } from './account-identity';
import {
  FORMA_DE_ID_DE_OBJETIVO, FORMA_DE_ID_DE_REPORTE, GRAVEDAD_POR_MOTIVO, Gravedad, Huella, ModalidadModerable,
  MOTIVOS_ADMITIDOS, MOTIVOS_DE_RIESGO, Report, ReportReason, ReportTargetType, esGravedad, esMotivoDeReporte, esMotivoDeRiesgo, esTipoDeObjetivo,
} from './moderation';

/**
 * WEE CORE — MODERATION CORE · LOS CASOS. EL CONTRATO.
 *
 * ── Qué añade a la fundación (`core/moderation.ts`) ─────────────────────────
 *
 * La fundación sabe qué es un REPORTE: una señal de una cuenta sobre una cosa.
 * Un CASO es otra cosa: todo lo que se ha dicho de UN MISMO contenido, junto,
 * para que una persona lo revise una vez y no cien. El caso no sustituye a los
 * reportes —cada uno se conserva entero, con su procedencia— y tampoco decide
 * nada por sí mismo: ordena.
 *
 *     REPORTE ─┐
 *     REPORTE ─┼─→ CASO (uno por contenido) → REVISIÓN → ACCIÓN → AUDITORÍA
 *     REPORTE ─┘
 *
 * ── Tres reglas que este archivo hace cumplir ───────────────────────────────
 *
 *   1. UN CASO POR CONTENIDO. El identificador sale del contenido y de nada
 *      más, así que dos reportes que llegan a la vez caen en el MISMO documento
 *      y lo decide una transacción. No hay un «buscar si ya hay caso».
 *   2. LOS REPETIDOS SUBEN LA PRIORIDAD, NO LA CULPA. Cada denunciante distinto
 *      empuja el caso hacia arriba en la cola; ninguno lo mueve hacia una
 *      acción. Una persona con dos caras cuenta una vez.
 *   3. NADA SE DECIDE SOLO. El sistema solo puede hacer dos cosas con un caso:
 *      subirlo a revisión prioritaria y reabrirlo cuando llega algo nuevo. Todo
 *      lo demás lo hace una persona con permiso, y queda escrito.
 *
 * Puro: ni Firestore, ni reloj, ni red. Recibe lo ya leído y dice qué sale.
 */

export const MODERATION_CORE_CONTRACT_VERSION = '2.0' as const;

/* ── Gravedad y prioridad ───────────────────────────────────────────────── */

export const PESO_DE_GRAVEDAD: Readonly<Record<Gravedad, number>> = Object.freeze({ CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 });

export const gravedadMayor = (a: Gravedad | undefined, b: Gravedad | undefined): Gravedad | undefined => {
  if (!a) return b;
  if (!b) return a;
  return PESO_DE_GRAVEDAD[a] >= PESO_DE_GRAVEDAD[b] ? a : b;
};

/**
 * LA POLÍTICA DE PRIORIDAD. Configurable (`moderationPolicies/priority`), y lo
 * que no se configura se queda en lo de abajo.
 *
 *   · `gravedadPorMotivo`: el orden de la cola. Por defecto, el del catálogo.
 *   · `gravedadesPrioritarias`: un caso con una señal de estas gravedades entra
 *     en PRIORITY_REVIEW. Por defecto solo CRITICAL: riesgo para una vida o algo
 *     que la ley persigue no espera turno.
 *   · `umbralDeDenunciantes`: a partir de cuántos denunciantes DISTINTOS un caso
 *     pasa a PRIORITY_REVIEW. Por defecto NINGUNO: es un número que decide el
 *     dueño, no este archivo. Sin él, los repetidos suben la prioridad dentro
 *     de su estado, pero no cambian de estado.
 */
export interface PoliticaDePrioridad {
  version: number;
  gravedadPorMotivo: Readonly<Record<ReportReason, Gravedad>>;
  gravedadesPrioritarias: readonly Gravedad[];
  umbralDeDenunciantes: number | null;
}

export const POLITICA_DE_PRIORIDAD: PoliticaDePrioridad = Object.freeze({
  version: 0,
  gravedadPorMotivo: GRAVEDAD_POR_MOTIVO,
  gravedadesPrioritarias: Object.freeze(['CRITICAL'] as Gravedad[]),
  umbralDeDenunciantes: null,
});

const entero = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max ? v : undefined;

/**
 * Lee la política guardada. Lo que no se entiende se queda en el valor por
 * defecto, campo a campo: una política rota no puede dejar la cola sin orden.
 */
export const leerPoliticaDePrioridad = (guardada: unknown): PoliticaDePrioridad => {
  if (!guardada || typeof guardada !== 'object' || Array.isArray(guardada)) return POLITICA_DE_PRIORIDAD;
  const g = guardada as Record<string, unknown>;
  const porMotivo: Record<string, Gravedad> = { ...POLITICA_DE_PRIORIDAD.gravedadPorMotivo };
  if (g.gravedadPorMotivo && typeof g.gravedadPorMotivo === 'object') {
    for (const motivo of MOTIVOS_ADMITIDOS) {
      const v = (g.gravedadPorMotivo as Record<string, unknown>)[motivo];
      if (esGravedad(v)) porMotivo[motivo] = v;
    }
  }
  const prioritarias = Array.isArray(g.gravedadesPrioritarias) && g.gravedadesPrioritarias.every(esGravedad)
    ? [...new Set(g.gravedadesPrioritarias as Gravedad[])] : [...POLITICA_DE_PRIORIDAD.gravedadesPrioritarias];
  const umbral = g.umbralDeDenunciantes === null ? null : entero(g.umbralDeDenunciantes, 1, 1_000_000) ?? POLITICA_DE_PRIORIDAD.umbralDeDenunciantes;
  return Object.freeze({
    version: entero(g.version, 0, 1_000_000) ?? POLITICA_DE_PRIORIDAD.version,
    gravedadPorMotivo: Object.freeze(porMotivo as Record<ReportReason, Gravedad>),
    gravedadesPrioritarias: Object.freeze(prioritarias),
    umbralDeDenunciantes: umbral,
  });
};

export const gravedadDelMotivo = (motivo: ReportReason, politica: PoliticaDePrioridad = POLITICA_DE_PRIORIDAD): Gravedad =>
  politica.gravedadPorMotivo[motivo] ?? GRAVEDAD_POR_MOTIVO[motivo] ?? 'LOW';

/** ¿Alguien ha señalado un RIESGO (autolesiones) en este caso? */
export const tieneSenalDeRiesgo = (caso: Pick<CasoDeModeracion, 'counters'>): boolean =>
  MOTIVOS_DE_RIESGO.some((m) => (caso.counters?.byReason?.[m] ?? 0) > 0);

/**
 * LA GRAVEDAD DE INFRACCIÓN de un caso: la mayor de los motivos que acusan de
 * algo, SIN las señales de riesgo. `undefined` si solo hay señales de riesgo.
 * Una denuncia de autolesiones sube el caso a revisión prioritaria, pero no lo
 * convierte en una infracción grave: lo automático que dependa de la gravedad
 * (la ocultación preventiva) mira esta, no la de la cola.
 */
export const gravedadDeInfraccion = (caso: Pick<CasoDeModeracion, 'counters'>, politica: PoliticaDePrioridad = POLITICA_DE_PRIORIDAD): Gravedad | undefined => {
  let mayor: Gravedad | undefined;
  for (const [motivo, n] of Object.entries(caso.counters?.byReason ?? {})) {
    if (!n || !esMotivoDeReporte(motivo) || esMotivoDeRiesgo(motivo)) continue;
    mayor = gravedadMayor(mayor, gravedadDelMotivo(motivo, politica));
  }
  return mayor;
};

/** Cuántos denunciantes distintos cuentan para la puntuación. Pasado esto, el caso ya está arriba del todo de su gravedad. */
export const TOPE_DE_DENUNCIANTES_EN_LA_PUNTUACION = 999;

/**
 * LA PUNTUACIÓN: la gravedad manda y los denunciantes desempatan. Un caso
 * CRÍTICO con un denunciante va antes que uno LEVE con quinientos: el número
 * de voces no convierte una molestia en un peligro.
 */
export const puntuacionDePrioridad = (gravedad: Gravedad, denunciantes: number): number =>
  PESO_DE_GRAVEDAD[gravedad] * 1000 + Math.min(Math.max(0, Math.floor(denunciantes)), TOPE_DE_DENUNCIANTES_EN_LA_PUNTUACION);

/* ── Estados del caso ───────────────────────────────────────────────────── */

export type EstadoDeCaso =
  | 'PENDING' | 'PRIORITY_REVIEW' | 'UNDER_REVIEW' | 'ACTION_REQUIRED'
  | 'ACTION_TAKEN' | 'REJECTED' | 'RESTORED' | 'CLOSED';

export const ESTADOS_DE_CASO: readonly EstadoDeCaso[] = Object.freeze([
  'PENDING', 'PRIORITY_REVIEW', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'ACTION_TAKEN', 'REJECTED', 'RESTORED', 'CLOSED',
] as const);

export const esEstadoDeCaso = (v: unknown): v is EstadoDeCaso => typeof v === 'string' && (ESTADOS_DE_CASO as readonly string[]).includes(v);

/**
 * LAS TRANSICIONES, TODAS, Y QUIÉN PUEDE HACER CADA UNA.
 *
 *     PENDING ──────────→ PRIORITY_REVIEW (sistema: gravedad o umbral)
 *        │                     │
 *        └──────→ UNDER_REVIEW ←┘  (alguien lo coge)
 *                    │  ↑
 *                    │  └── se suelta → PENDING / PRIORITY_REVIEW
 *                    ├──→ ACTION_REQUIRED ──→ ACTION_TAKEN / REJECTED / vuelve a revisión
 *                    ├──→ ACTION_TAKEN ──→ (otra acción) / RESTORED / CLOSED
 *                    └──→ REJECTED ──→ CLOSED
 *
 *   REJECTED, RESTORED y CLOSED se REABREN si llega un reporte nuevo —otra
 *   cuenta u otro motivo— o si una persona de moderación lo reabre a propósito,
 *   y CLOSED pasa a RESTORED si una apelación o una corrección deshacen lo que
 *   se hizo. Nada salta de la cola a un final:
 *   alguien tiene que haberlo cogido antes, y eso queda escrito.
 */
export const TRANSICIONES_DE_CASO: Readonly<Record<EstadoDeCaso, readonly EstadoDeCaso[]>> = Object.freeze({
  PENDING: Object.freeze(['PRIORITY_REVIEW', 'UNDER_REVIEW'] as const),
  PRIORITY_REVIEW: Object.freeze(['UNDER_REVIEW'] as const),
  UNDER_REVIEW: Object.freeze(['ACTION_REQUIRED', 'ACTION_TAKEN', 'REJECTED', 'PENDING', 'PRIORITY_REVIEW'] as const),
  ACTION_REQUIRED: Object.freeze(['ACTION_TAKEN', 'REJECTED', 'UNDER_REVIEW'] as const),
  ACTION_TAKEN: Object.freeze(['ACTION_TAKEN', 'RESTORED', 'CLOSED'] as const),
  REJECTED: Object.freeze(['CLOSED', 'PENDING', 'PRIORITY_REVIEW'] as const),
  RESTORED: Object.freeze(['CLOSED', 'PENDING', 'PRIORITY_REVIEW'] as const),
  CLOSED: Object.freeze(['PENDING', 'PRIORITY_REVIEW', 'RESTORED'] as const),
});

/** Quién mueve el caso: el sistema (al recibir señales), una persona de moderación, o una apelación resuelta. */
export type QuienMueveElCaso = 'SYSTEM' | 'ADMIN' | 'APPEAL';

/** Subir de la cola normal a la prioritaria: SOLO el sistema, con la política. La prioridad no se elige a mano. */
const SOLO_DEL_SISTEMA: readonly string[] = Object.freeze(['PENDING>PRIORITY_REVIEW']);
/** Reabrir: el sistema cuando llega algo nuevo, o una persona de moderación a propósito (queda escrito quién). */
const REAPERTURAS: readonly string[] = Object.freeze([
  'REJECTED>PENDING', 'REJECTED>PRIORITY_REVIEW', 'RESTORED>PENDING', 'RESTORED>PRIORITY_REVIEW', 'CLOSED>PENDING', 'CLOSED>PRIORITY_REVIEW',
]);
/** Lo único que una apelación resuelta puede hacer: dejar el caso RESTORED. */
const DE_APELACION: readonly string[] = Object.freeze(['ACTION_TAKEN>RESTORED', 'CLOSED>RESTORED']);

export const transicionDeCasoPermitida = (desde: EstadoDeCaso, hacia: EstadoDeCaso, quien: QuienMueveElCaso): boolean => {
  if (!esEstadoDeCaso(desde) || !esEstadoDeCaso(hacia) || !TRANSICIONES_DE_CASO[desde].includes(hacia)) return false;
  const clave = `${desde}>${hacia}`;
  if (quien === 'SYSTEM') return SOLO_DEL_SISTEMA.includes(clave) || REAPERTURAS.includes(clave);
  if (quien === 'APPEAL') return DE_APELACION.includes(clave);
  /*
   * Una persona hace todo lo demás —coger, soltar, decidir, resolver, reabrir—, salvo subir la prioridad. Y cuando
   * suelta o reabre, a QUÉ cola vuelve no lo elige ella: lo calcula la composición con la política.
   */
  return !SOLO_DEL_SISTEMA.includes(clave);
};

export const ESTADOS_EN_COLA: readonly EstadoDeCaso[] = Object.freeze(['PENDING', 'PRIORITY_REVIEW'] as const);
export const ESTADOS_ABIERTOS: readonly EstadoDeCaso[] = Object.freeze(['PENDING', 'PRIORITY_REVIEW', 'UNDER_REVIEW', 'ACTION_REQUIRED'] as const);
export const ESTADOS_REABRIBLES: readonly EstadoDeCaso[] = Object.freeze(['REJECTED', 'RESTORED', 'CLOSED'] as const);

/* ── Qué se denuncia, leído por el servidor ─────────────────────────────── */

/**
 * LA CLASE DE CONTENIDO, tal como la LEE el servidor del documento —nunca la
 * dice el cliente—. Un Weël es una publicación con `isWeel`; un perfil es una
 * entidad cuya clase guarda la propia entidad; una Página puede ser la de
 * `pages` o una entidad de tipo PAGE.
 */
export type ClaseDeContenido = 'POST' | 'WEEL' | 'COMMENT' | 'REAL_PROFILE' | 'WEE_PROFILE' | 'PAGE' | 'COMMUNITY';

export const CLASES_DE_CONTENIDO: readonly ClaseDeContenido[] = Object.freeze([
  'POST', 'WEEL', 'COMMENT', 'REAL_PROFILE', 'WEE_PROFILE', 'PAGE', 'COMMUNITY',
] as const);

export interface ObjetivoDelCaso {
  type: ReportTargetType;
  id: string;
  kind: ClaseDeContenido;
  modality?: ModalidadModerable;
  /**
   * Dónde vive el documento, si es CONTENIDO que se puede custodiar (ocultar,
   * retirar, restaurar). Un perfil no lo tiene: sobre una persona se actúa con
   * sanciones de cuenta, no escondiendo su documento. Solo servidor.
   */
  path?: string;
}

/**
 * DE QUIÉN ES LO DENUNCIADO. La CUENTA es la persona —a ella van las
 * sanciones, y sus dos caras son la misma persona—; la ENTIDAD es la cara con
 * la que se publicó, y es lo que ve quien revisa. `profileUid` es la firma
 * guardada en el contenido: un DATO heredado, nunca una identidad que se
 * deduzca. Cualquiera de las tres puede faltar en lo histórico, y no se inventa.
 */
export interface SujetoDelCaso {
  accountId?: string;
  entityId?: string;
  entityType?: EntityType;
  profileUid?: string;
}

const FORMA_DE_RUTA_DE_CONTENIDO = /^(posts|comments|pages|communities)\/[A-Za-z0-9_-]{1,128}$/;

export const objetivoDelCasoValido = (o: ObjetivoDelCaso | undefined): boolean =>
  !!o && esTipoDeObjetivo(o.type) && typeof o.id === 'string' && FORMA_DE_ID_DE_OBJETIVO.test(o.id)
  && (CLASES_DE_CONTENIDO as readonly string[]).includes(o.kind)
  && (o.path === undefined || (typeof o.path === 'string' && FORMA_DE_RUTA_DE_CONTENIDO.test(o.path)));

export const sujetoValido = (s: SujetoDelCaso | undefined): boolean =>
  !!s && typeof s === 'object'
  && (s.accountId === undefined || esIdDeCuenta(s.accountId))
  && (s.entityId === undefined || esIdDeEntidad(s.entityId))
  && (s.entityType === undefined || esTipoDeEntidad(s.entityType))
  && (s.profileUid === undefined || (typeof s.profileUid === 'string' && s.profileUid.length > 0 && s.profileUid.length <= 200 && !s.profileUid.includes('/')));

/* ── Identificadores ────────────────────────────────────────────────────── */

export const FORMA_DE_ID_DE_CASO = /^cas_[0-9a-f]{32}$/;

/** La clave del contenido: su clase de objetivo y su identificador. Es lo que hace que dos reportes caigan en el mismo caso. */
export const claveDeObjetivo = (targetType: ReportTargetType, targetId: string): string | undefined =>
  esTipoDeObjetivo(targetType) && typeof targetId === 'string' && FORMA_DE_ID_DE_OBJETIVO.test(targetId) ? `${targetType}:${targetId}` : undefined;

const prefijado = (prefijo: string, huella: Huella, texto: string): string | undefined => {
  const hex = huella(texto);
  return typeof hex === 'string' && /^[0-9a-f]{32,}$/.test(hex) ? `${prefijo}_${hex.slice(0, 32)}` : undefined;
};

/** EL IDENTIFICADOR ES LA UNICIDAD: el mismo contenido da el mismo caso, se pregunte cuantas veces se pregunte. */
export const idDeCaso = (huella: Huella, clave: string | undefined): string | undefined =>
  clave ? prefijado('cas', huella, [MODERATION_CORE_CONTRACT_VERSION, 'case', clave].join('\n')) : undefined;

/**
 * UN SEUDÓNIMO ESTABLE de una cuenta para quien revisa: deja ver que la misma
 * persona denunció cuarenta cosas sin decir quién es. No se puede volver de él
 * a la cuenta sin probar cuentas una a una, y los identificadores de cuenta no
 * se adivinan.
 */
export const seudonimoDeCuenta = (huella: Huella, accountId: string): string | undefined =>
  esIdDeCuenta(accountId) ? prefijado('per', huella, [MODERATION_CORE_CONTRACT_VERSION, 'pseudonym', accountId].join('\n'))?.slice(0, 20) : undefined;

/* ── La cola: un campo que ordena sin índices compuestos ────────────────── */

const ANCHO_DE_PUNTUACION = 4;
const ANCHO_DE_INSTANTE = 15;

/**
 * LA CLAVE DE LA COLA: `ESTADO|prioridad invertida|antigüedad`.
 *
 * Una sola cadena que se ordena sola: dentro de un estado, primero lo más
 * prioritario y, a igual prioridad, lo más antiguo. Basta un rango sobre este
 * campo —`>= 'PENDING|'` y `< 'PENDING|~'`— y el índice automático de un
 * campo, sin índices compuestos que desplegar.
 */
export const claveDeCola = (estado: EstadoDeCaso, puntuacion: number, creadoEn: number): string =>
  `${estado}|${String(Math.max(0, 9999 - Math.floor(puntuacion))).padStart(ANCHO_DE_PUNTUACION, '0')}|${String(Math.max(0, Math.floor(creadoEn))).padStart(ANCHO_DE_INSTANTE, '0')}`;

/** El rango de la cola de un estado, para una consulta sobre `cola`. */
export const rangoDeCola = (estado: EstadoDeCaso): { desde: string; hasta: string } => ({ desde: `${estado}|`, hasta: `${estado}|~` });

/* ── Lo que se guarda ───────────────────────────────────────────────────── */

export type EfectoSobreElContenido = 'HIDDEN' | 'REMOVED' | null;

export interface CasoDeModeracion {
  contract: typeof MODERATION_CORE_CONTRACT_VERSION;
  caseId: string;
  targetKey: string;
  target: ObjetivoDelCaso;
  subject: SujetoDelCaso;
  status: EstadoDeCaso;
  cola: string;
  priority: { gravity: Gravedad; score: number };
  counters: {
    reports: number;
    /** Cuentas distintas. Una persona con dos caras cuenta una vez. */
    reporters: number;
    byReason: Partial<Record<ReportReason, number>>;
    /** Señales llegadas desde la última decisión: lo nuevo que alguien tiene que mirar. */
    sinceDecision: number;
  };
  /** Cuántas acciones ya tenía la cuenta denunciada cuando se abrió el caso. Reincidencia, no culpa. */
  recidivism: { priorActions: number };
  openedBy: { kind: 'REPORT' | 'ADMIN'; id: string };
  assignee?: { uid: string; at: number };
  /** La acción que propuso quien revisó al dejarlo en ACTION_REQUIRED. Propuesta, no hecha. */
  proposedAction?: string;
  /** Lo que el caso tiene hecho AHORA sobre el mundo: contenido custodiado y sanciones vigentes. */
  effects: { content: EfectoSobreElContenido; sanctionIds: string[]; preventive: boolean };
  /** Si a los denunciantes ya se les anotó cómo acabó su señal (para detectar abuso de reportes). */
  reporterOutcomes: 'NONE' | 'PENDING' | 'DONE';
  decision?: 'UPHELD' | 'REJECTED';
  decidedAt?: number;
  historyCount: number;
  createdAt: number;
  updatedAt: number;
  lastReportAt?: number;
}

/** La procedencia de cada reporte, dentro de su caso. Ni el texto del detalle ni nada que no haga falta para ordenar. */
export interface SenalDelCaso {
  contract: typeof MODERATION_CORE_CONTRACT_VERSION;
  reportId: string;
  caseId: string;
  reporterAccountId: string;
  reporterEntityId?: string;
  reporterEntityType?: EntityType;
  reason: ReportReason;
  gravity: Gravedad;
  surface?: string;
  hasDetails: boolean;
  createdAt: number;
}

/** Lo que una cuenta ha dicho de un caso: cuenta UNA vez aunque denuncie con dos caras o por dos motivos. */
export interface MarcaDeDenunciante {
  contract: typeof MODERATION_CORE_CONTRACT_VERSION;
  accountId: string;
  caseId: string;
  reasons: ReportReason[];
  reportIds: string[];
  firstAt: number;
  lastAt: number;
  outcome?: 'UPHELD' | 'REJECTED';
}

/* ── El historial del caso ──────────────────────────────────────────────── */

export type TipoDeEntradaDeCaso =
  | 'CASE_OPENED' | 'CASE_REOPENED' | 'PRIORITY_RAISED' | 'STATUS_CHANGED'
  | 'ACTION_APPLIED' | 'PREVENTIVE_HIDE' | 'APPEAL_FILED' | 'APPEAL_DECIDED' | 'SANCTION_EXPIRED';

export interface EntradaDeCaso {
  seq: number;
  type: TipoDeEntradaDeCaso;
  at: number;
  by: { kind: 'SYSTEM' | 'ADMIN' | 'USER' | 'POLICY'; id: string };
  from?: EstadoDeCaso;
  to?: EstadoDeCaso;
  operation?: string;
  actionId?: string;
  appealId?: string;
  reportId?: string;
  sanctionId?: string;
  /** La justificación de quien actuó. Interna: nunca la ve ni quien denunció ni quien fue denunciado. */
  reason?: string;
}

/** `0001`, `0002`…: el orden en el propio identificador, y crear dos veces la misma entrada es imposible. */
export const idDeEntradaDeCaso = (seq: number): string => String(seq).padStart(4, '0');

/* ── Recibir una señal ──────────────────────────────────────────────────── */

export interface EntradaDeIntake {
  caseId: string;
  /** El caso tal como está, o `undefined` si todavía no existe. */
  caso?: CasoDeModeracion;
  /** El reporte tal como está guardado. */
  reporte: Report;
  /** El contenido, leído por el servidor. */
  objetivo: ObjetivoDelCaso;
  sujeto: SujetoDelCaso;
  /** Lo que la cuenta que denuncia ya había dicho de este caso. */
  marca?: MarcaDeDenunciante;
  /** Acciones previas contra la cuenta denunciada (para la reincidencia). */
  accionesPrevias: number;
  politica: PoliticaDePrioridad;
  at: number;
}

export type MotivoDeIntakeRechazado = 'invalid_report' | 'invalid_target' | 'invalid_case' | 'already_attached';

export type IntakeDecidido =
  | {
    ok: true;
    caso: CasoDeModeracion;
    senal: SenalDelCaso;
    marca: MarcaDeDenunciante;
    entradas: EntradaDeCaso[];
    abierto: boolean;
    reabierto: boolean;
    nuevoDenunciante: boolean;
  }
  | { ok: false; code: MotivoDeIntakeRechazado };

const copiaDeObjetivo = (o: ObjetivoDelCaso): ObjetivoDelCaso => ({
  type: o.type, id: o.id, kind: o.kind, ...(o.modality ? { modality: o.modality } : {}), ...(o.path ? { path: o.path } : {}),
});

const copiaDeSujeto = (s: SujetoDelCaso): SujetoDelCaso => ({
  ...(s.accountId ? { accountId: s.accountId } : {}),
  ...(s.entityId ? { entityId: s.entityId } : {}),
  ...(s.entityType ? { entityType: s.entityType } : {}),
  ...(s.profileUid ? { profileUid: s.profileUid } : {}),
});

/** ¿Pide esta situación revisión prioritaria? Por gravedad, o por el umbral si el dueño lo fijó. */
export const pidePrioridad = (gravedad: Gravedad, denunciantes: number, politica: PoliticaDePrioridad): boolean =>
  politica.gravedadesPrioritarias.includes(gravedad)
  || (politica.umbralDeDenunciantes !== null && denunciantes >= politica.umbralDeDenunciantes);

/**
 * UNA SEÑAL ENTRA EN SU CASO. Pura: dice cómo queda el caso, qué señal y qué
 * marca se guardan y qué entradas se añaden al historial. Quien guarda lo
 * aplica todo en una transacción, o nada.
 *
 * Lo que puede pasarle al caso aquí, y nada más:
 *   · nacer (PENDING, o PRIORITY_REVIEW si la señal lo pide);
 *   · subir de PENDING a PRIORITY_REVIEW;
 *   · reabrirse desde REJECTED, RESTORED o CLOSED: llegó algo nuevo;
 *   · en cualquier otro estado, solo cambian sus contadores y su puntuación.
 */
export const decidirIntake = (e: EntradaDeIntake): IntakeDecidido => {
  const r = e.reporte;
  if (!r || !FORMA_DE_ID_DE_REPORTE.test(r.reportId) || !esIdDeCuenta(r.reporterAccountId) || !esMotivoDeReporte(r.reason)) return { ok: false, code: 'invalid_report' };
  if (r.caseId) return { ok: false, code: 'already_attached' };
  if (!objetivoDelCasoValido(e.objetivo) || !sujetoValido(e.sujeto) || e.objetivo.type !== r.targetType || e.objetivo.id !== r.targetId) return { ok: false, code: 'invalid_target' };
  const clave = claveDeObjetivo(e.objetivo.type, e.objetivo.id);
  if (!clave || !FORMA_DE_ID_DE_CASO.test(e.caseId)) return { ok: false, code: 'invalid_case' };
  if (e.caso && (e.caso.caseId !== e.caseId || e.caso.targetKey !== clave || !esEstadoDeCaso(e.caso.status))) return { ok: false, code: 'invalid_case' };
  if (e.marca && e.marca.reportIds.includes(r.reportId)) return { ok: false, code: 'already_attached' };

  const at = e.at;
  const gravedad = gravedadDelMotivo(r.reason, e.politica);
  const senal: SenalDelCaso = Object.freeze({
    contract: MODERATION_CORE_CONTRACT_VERSION,
    reportId: r.reportId,
    caseId: e.caseId,
    reporterAccountId: r.reporterAccountId,
    ...(r.reporterEntityId && r.reporterEntityType ? { reporterEntityId: r.reporterEntityId, reporterEntityType: r.reporterEntityType } : {}),
    reason: r.reason,
    gravity: gravedad,
    ...(r.surface ? { surface: r.surface } : {}),
    hasDetails: typeof r.details === 'string' && r.details.length > 0,
    createdAt: r.createdAt,
  });

  const nuevoDenunciante = !e.marca;
  const marca: MarcaDeDenunciante = Object.freeze({
    contract: MODERATION_CORE_CONTRACT_VERSION,
    accountId: r.reporterAccountId,
    caseId: e.caseId,
    reasons: [...new Set([...(e.marca?.reasons ?? []), r.reason])],
    reportIds: [...(e.marca?.reportIds ?? []), r.reportId],
    firstAt: e.marca?.firstAt ?? at,
    lastAt: at,
    ...(e.marca?.outcome ? { outcome: e.marca.outcome } : {}),
  });

  const sistema = Object.freeze({ kind: 'SYSTEM' as const, id: 'wee.moderation.intake' });
  const entradas: EntradaDeCaso[] = [];

  if (!e.caso) {
    const reporters = 1;
    const status: EstadoDeCaso = pidePrioridad(gravedad, reporters, e.politica) ? 'PRIORITY_REVIEW' : 'PENDING';
    const score = puntuacionDePrioridad(gravedad, reporters);
    const caso: CasoDeModeracion = {
      contract: MODERATION_CORE_CONTRACT_VERSION,
      caseId: e.caseId,
      targetKey: clave,
      target: copiaDeObjetivo(e.objetivo),
      subject: copiaDeSujeto(e.sujeto),
      status,
      cola: claveDeCola(status, score, at),
      priority: { gravity: gravedad, score },
      counters: { reports: 1, reporters, byReason: { [r.reason]: 1 }, sinceDecision: 1 },
      recidivism: { priorActions: Math.max(0, Math.floor(e.accionesPrevias || 0)) },
      openedBy: { kind: 'REPORT', id: r.reportId },
      effects: { content: null, sanctionIds: [], preventive: false },
      reporterOutcomes: 'NONE',
      historyCount: 1,
      createdAt: at,
      updatedAt: at,
      lastReportAt: at,
    };
    entradas.push(Object.freeze({ seq: 1, type: 'CASE_OPENED' as const, at, by: sistema, to: status, reportId: r.reportId }));
    return { ok: true, caso: Object.freeze(caso), senal, marca, entradas: Object.freeze(entradas) as EntradaDeCaso[], abierto: true, reabierto: false, nuevoDenunciante };
  }

  const antes = e.caso;
  const reporters = antes.counters.reporters + (nuevoDenunciante ? 1 : 0);
  const gravity = gravedadMayor(antes.priority.gravity, gravedad) as Gravedad;
  const score = puntuacionDePrioridad(gravity, reporters);
  const prioridad = pidePrioridad(gravity, reporters, e.politica);
  let status = antes.status;
  let seq = antes.historyCount;
  let reabierto = false;

  if ((ESTADOS_REABRIBLES as readonly string[]).includes(antes.status)) {
    status = prioridad ? 'PRIORITY_REVIEW' : 'PENDING';
    reabierto = true;
    entradas.push(Object.freeze({ seq: ++seq, type: 'CASE_REOPENED' as const, at, by: sistema, from: antes.status, to: status, reportId: r.reportId }));
  } else if (antes.status === 'PENDING' && prioridad) {
    status = 'PRIORITY_REVIEW';
    entradas.push(Object.freeze({ seq: ++seq, type: 'PRIORITY_RAISED' as const, at, by: sistema, from: 'PENDING' as const, to: status, reportId: r.reportId }));
  }

  const caso: CasoDeModeracion = {
    ...antes,
    status,
    cola: claveDeCola(status, score, antes.createdAt),
    priority: { gravity, score },
    counters: {
      reports: antes.counters.reports + 1,
      reporters,
      byReason: { ...antes.counters.byReason, [r.reason]: (antes.counters.byReason[r.reason] ?? 0) + 1 },
      sinceDecision: antes.counters.sinceDecision + 1,
    },
    historyCount: seq,
    updatedAt: at,
    lastReportAt: at,
  };
  /* Si un reporte NUEVO llega a un caso ya revisado, lo nuevo no hereda la decisión: se vuelve a mirar. */
  if (reabierto) {
    delete (caso as Partial<CasoDeModeracion>).assignee;
    delete (caso as Partial<CasoDeModeracion>).decision;
    delete (caso as Partial<CasoDeModeracion>).decidedAt;
  }
  return { ok: true, caso: Object.freeze(caso), senal, marca, entradas: Object.freeze(entradas) as EntradaDeCaso[], abierto: false, reabierto, nuevoDenunciante };
};

/* ── Abrir a mano ───────────────────────────────────────────────────────── */

/**
 * UN CASO QUE ABRE UNA PERSONA DE MODERACIÓN, sin que nadie haya denunciado
 * (moderación proactiva) o para dar caso a un reporte anterior al Core. Nace
 * en la cola, como cualquier otro: abrirlo no es concluir nada.
 */
export const casoAbiertoAMano = (a: {
  caseId: string; objetivo: ObjetivoDelCaso; sujeto: SujetoDelCaso; adminUid: string; accionesPrevias: number;
  gravedad?: Gravedad; politica: PoliticaDePrioridad; at: number; justificacion: string;
}): { caso: CasoDeModeracion; entrada: EntradaDeCaso } | undefined => {
  const clave = claveDeObjetivo(a.objetivo?.type, a.objetivo?.id);
  if (!clave || !FORMA_DE_ID_DE_CASO.test(a.caseId) || !objetivoDelCasoValido(a.objetivo) || !sujetoValido(a.sujeto) || !esIdDeCuenta(a.adminUid)) return undefined;
  const gravedad: Gravedad = a.gravedad && esGravedad(a.gravedad) ? a.gravedad : 'LOW';
  const status: EstadoDeCaso = a.politica.gravedadesPrioritarias.includes(gravedad) ? 'PRIORITY_REVIEW' : 'PENDING';
  const score = puntuacionDePrioridad(gravedad, 0);
  const caso: CasoDeModeracion = {
    contract: MODERATION_CORE_CONTRACT_VERSION,
    caseId: a.caseId,
    targetKey: clave,
    target: copiaDeObjetivo(a.objetivo),
    subject: copiaDeSujeto(a.sujeto),
    status,
    cola: claveDeCola(status, score, a.at),
    priority: { gravity: gravedad, score },
    counters: { reports: 0, reporters: 0, byReason: {}, sinceDecision: 0 },
    recidivism: { priorActions: Math.max(0, Math.floor(a.accionesPrevias || 0)) },
    openedBy: { kind: 'ADMIN', id: a.adminUid },
    effects: { content: null, sanctionIds: [], preventive: false },
    reporterOutcomes: 'NONE',
    historyCount: 1,
    createdAt: a.at,
    updatedAt: a.at,
  };
  const entrada: EntradaDeCaso = Object.freeze({ seq: 1, type: 'CASE_OPENED' as const, at: a.at, by: { kind: 'ADMIN' as const, id: a.adminUid }, to: status, reason: a.justificacion });
  return { caso: Object.freeze(caso), entrada };
};

/* ── Mover el caso ──────────────────────────────────────────────────────── */

export type MotivoDeMovimientoRechazado = 'invalid_case' | 'invalid_transition' | 'invalid_actor';

export type MovimientoDecidido =
  | { ok: true; caso: CasoDeModeracion; entrada: EntradaDeCaso }
  | { ok: false; code: MotivoDeMovimientoRechazado };

/**
 * EL ÚNICO SITIO DONDE UN CASO CAMBIA DE ESTADO FUERA DEL INTAKE. Valida la
 * transición contra la tabla y contra QUIÉN la pide, recalcula la cola y deja
 * su entrada. `cambios` son los campos que la operación añade (asignación,
 * efectos, decisión); el estado y la cola los pone esto, no quien llama.
 */
export const moverCaso = (caso: CasoDeModeracion | undefined, m: {
  hacia: EstadoDeCaso;
  quien: QuienMueveElCaso;
  por: EntradaDeCaso['by'];
  at: number;
  tipo?: TipoDeEntradaDeCaso;
  operacion?: string;
  actionId?: string;
  appealId?: string;
  sanctionId?: string;
  justificacion?: string;
  cambios?: Partial<Pick<CasoDeModeracion, 'assignee' | 'proposedAction' | 'effects' | 'reporterOutcomes' | 'decision' | 'decidedAt' | 'counters'>>;
  quitar?: ReadonlyArray<'assignee' | 'proposedAction'>;
}): MovimientoDecidido => {
  if (!caso || !esEstadoDeCaso(caso.status) || !Number.isSafeInteger(caso.historyCount) || caso.historyCount < 1) return { ok: false, code: 'invalid_case' };
  if (!m.por || typeof m.por.id !== 'string' || !m.por.id || m.por.id.length > 128) return { ok: false, code: 'invalid_actor' };
  if (!transicionDeCasoPermitida(caso.status, m.hacia, m.quien)) return { ok: false, code: 'invalid_transition' };
  const seq = caso.historyCount + 1;
  const siguiente: CasoDeModeracion = {
    ...caso,
    ...(m.cambios ?? {}),
    status: m.hacia,
    cola: claveDeCola(m.hacia, caso.priority.score, caso.createdAt),
    historyCount: seq,
    updatedAt: m.at,
  };
  for (const campo of m.quitar ?? []) delete (siguiente as Partial<CasoDeModeracion>)[campo];
  const entrada: EntradaDeCaso = Object.freeze({
    seq,
    type: m.tipo ?? 'STATUS_CHANGED',
    at: m.at,
    by: Object.freeze({ ...m.por }),
    from: caso.status,
    to: m.hacia,
    ...(m.operacion ? { operation: m.operacion } : {}),
    ...(m.actionId ? { actionId: m.actionId } : {}),
    ...(m.appealId ? { appealId: m.appealId } : {}),
    ...(m.sanctionId ? { sanctionId: m.sanctionId } : {}),
    ...(m.justificacion ? { reason: m.justificacion } : {}),
  });
  return { ok: true, caso: Object.freeze(siguiente), entrada };
};

/** Una entrada sin cambio de estado (un vencimiento, una apelación registrada). */
export const anotarEnElCaso = (caso: CasoDeModeracion, e: Omit<EntradaDeCaso, 'seq'>): { caso: CasoDeModeracion; entrada: EntradaDeCaso } => {
  const seq = caso.historyCount + 1;
  return {
    caso: Object.freeze({ ...caso, historyCount: seq, updatedAt: e.at }),
    entrada: Object.freeze({ ...e, seq }),
  };
};

/** ¿Le queda algo hecho al caso? Sin contenido custodiado ni sanciones vigentes, lo hecho está deshecho. */
export const casoSinEfectos = (caso: Pick<CasoDeModeracion, 'effects'>): boolean =>
  caso.effects.content === null && caso.effects.sanctionIds.length === 0;

/* ── Lo que ve quien revisa ─────────────────────────────────────────────── */

/**
 * EL CASO PARA LA CONSOLA. Por defecto no lleva la CUENTA del denunciado ni la
 * firma heredada: quien revisa ve la cara con la que se publicó y lo que se
 * dijo, y actúa sobre la persona sin necesitar el vínculo entre sus dos caras.
 * Con `revelarIdentidad` (permiso aparte, y auditado) sí.
 */
export const vistaDeCasoParaConsola = (caso: CasoDeModeracion, opciones: { revelarIdentidad: boolean }) => {
  const { subject, target, ...resto } = caso;
  return Object.freeze({
    ...resto,
    target: { type: target.type, id: target.id, kind: target.kind, ...(target.modality ? { modality: target.modality } : {}), custodiable: !!target.path },
    subject: {
      ...(subject.entityId ? { entityId: subject.entityId } : {}),
      ...(subject.entityType ? { entityType: subject.entityType } : {}),
      known: !!subject.accountId,
      ...(opciones.revelarIdentidad && subject.accountId ? { accountId: subject.accountId } : {}),
      ...(opciones.revelarIdentidad && subject.profileUid ? { profileUid: subject.profileUid } : {}),
    },
  });
};

/** Una señal para la consola: el denunciante es un SEUDÓNIMO, salvo con el permiso de identidad. */
export const vistaDeSenalParaConsola = (s: SenalDelCaso, huella: Huella, opciones: { revelarIdentidad: boolean }) => Object.freeze({
  reportId: s.reportId,
  reason: s.reason,
  gravity: s.gravity,
  hasDetails: s.hasDetails,
  createdAt: s.createdAt,
  ...(s.surface ? { surface: s.surface } : {}),
  reporterRef: seudonimoDeCuenta(huella, s.reporterAccountId),
  ...(s.reporterEntityType ? { reporterEntityType: s.reporterEntityType } : {}),
  ...(opciones.revelarIdentidad ? { reporterAccountId: s.reporterAccountId, ...(s.reporterEntityId ? { reporterEntityId: s.reporterEntityId } : {}) } : {}),
});
