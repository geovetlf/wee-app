/**
 * WEË FILMMAKER · el cliente de `productions` (F1-C · docs/FILMMAKER.md).
 *
 * La ÚNICA frontera de la app con la callable. Ninguna pantalla llama a
 * `httpsCallable` para esto, ni lee `productions` en Firestore, ni importa
 * `functions/src`: piden aquí lo que necesitan, y lo que vuelve son tipos del
 * dominio —el espejo de F1-A— y números. Ni `Timestamp`, ni `DocumentSnapshot`,
 * ni nada de Firebase llega a un componente.
 *
 * ── Lo que nunca se manda ────────────────────────────────────────────────────
 *
 * La cuenta. La resuelve el servidor desde la sesión, y aquí no hay ni un campo
 * donde ponerla: si el cliente pudiera mandarla, mandarla bastaría para leer lo
 * de otra persona. Tampoco un proveedor, un modelo ni un precio: el dominio los
 * rechaza y esta capa ni los conoce.
 *
 * ── Lo que vuelve ────────────────────────────────────────────────────────────
 *
 * Un resultado que se puede pintar, nunca una excepción: el valor, o un fallo
 * con su código, su `messageKey` y los problemas del dominio. Ni una frase: la
 * pone quien pinta, en el idioma de quien mira.
 *
 * ── Los identificadores los pone el cliente ─────────────────────────────────
 *
 * El de una producción y el de cada lote se generan aquí, al azar, antes de
 * llamar. Así repetir una petición que no se sabe si llegó —la red se cortó a
 * medias— es repetir la MISMA: el servidor la reconoce y no la aplica dos veces.
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import type {
  AspectRatio, FilmmakerIssue, FilmmakerOperation, FilmmakerProduction, FormatPresetId, PendingRegeneration, ResolutionTarget,
} from './filmmaker/dominio';

/* ── Lo que se pinta ──────────────────────────────────────────────────────── */

export type EstadoDeProduccion = 'active' | 'archived';

/** Una producción leída: el dominio entero y lo poco que el servidor sabe de ella. Las horas, en milisegundos. */
export interface ProduccionGuardada {
  readonly productionId: string;
  /** La revisión confirmada. Sube una vez por lote, y es la que se espera al aplicar el siguiente (CAS). */
  readonly revision: number;
  readonly status: EstadoDeProduccion;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly archivedAt?: number;
  readonly production: FilmmakerProduction;
}

/** Lo que se enseña en una lista: sin escenas, sin planos y sin ningún texto de dirección. */
export interface ResumenDeProduccion {
  readonly productionId: string;
  readonly title: string;
  readonly status: EstadoDeProduccion;
  readonly aspectRatio: string;
  readonly resolution?: string;
  readonly preset?: string;
  readonly revision: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly archivedAt?: number;
}

/** Un lote que el servidor aceptó. `alreadyApplied`: era un reintento y ya estaba; no se aplicó dos veces. */
export interface LoteConfirmado {
  readonly produccion: ProduccionGuardada;
  readonly applied: number;
  readonly pending: PendingRegeneration;
  readonly timelineChanged: boolean;
  readonly operationId: string;
  readonly alreadyApplied: boolean;
}

/**
 * POR QUÉ NO SALIÓ, en las pocas formas que la pantalla sabe tratar:
 *
 *   conflicto      alguien la cambió entre medias: la revisión esperada ya no es la que hay.
 *   no_encontrada  no existe, o no es tuya (el servidor contesta igual a propósito).
 *   archivada      está archivada: se lee, pero no se cambia.
 *   rechazada      el servidor la rechazó por lo que se mandó: sus problemas dicen qué.
 *   sin_sesion     no hay sesión.
 *   sin_cuenta     hay sesión, pero no una cuenta de Weë detrás.
 *   sin_conexion   no se sabe si llegó: la red o el plazo. Repetir LA MISMA es seguro.
 *   no_disponible  la función no está en este entorno (sin desplegar, o sin Firebase).
 *   desconocido    lo demás, incluida una respuesta que no tiene la forma esperada.
 */
export type TipoDeFallo =
  | 'conflicto' | 'no_encontrada' | 'archivada' | 'rechazada' | 'sin_sesion' | 'sin_cuenta' | 'sin_conexion' | 'no_disponible'
  | 'desconocido';

export interface FalloDeProducciones {
  readonly tipo: TipoDeFallo;
  /** El código que dio el servidor (`revision_conflict`…) o uno de aquí (`network`, `response_invalid`…). */
  readonly code: string;
  /** La clave del mensaje, tal como la da el dominio: `filmmaker.persistence.<código>`. */
  readonly messageKey: string;
  /** Los problemas del dominio, cada uno con su propia clave. */
  readonly problems: readonly FilmmakerIssue[];
  /** En un conflicto, la revisión que hay ahora. */
  readonly currentRevision?: number;
  /** Si repetir EXACTAMENTE la misma petición puede salir bien. */
  readonly reintentable: boolean;
}

export type Resultado<T> = { readonly ok: true; readonly valor: T } | { readonly ok: false; readonly fallo: FalloDeProducciones };

/* ── Los identificadores ──────────────────────────────────────────────────── */

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Letras y números al azar; con `crypto` si lo hay. Los ids no son secretos: la dueña se comprueba en el servidor. */
const alAzar = (n: number): string => {
  const bytes = new Uint8Array(n);
  const cripto = (globalThis as { crypto?: { getRandomValues?: (b: Uint8Array) => Uint8Array } }).crypto;
  if (cripto?.getRandomValues) cripto.getRandomValues(bytes);
  else for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
  let salida = '';
  for (const b of bytes) salida += ALFABETO[b % ALFABETO.length];
  return salida;
};

/** El id de una producción nueva: veinticuatro caracteres, la forma que el servidor exige (20 a 128). */
export const nuevoIdDeProduccion = (): string => alAzar(24);
/** El id de un lote: lo que permite reconocer un reintento. */
export const nuevoIdDeOperacion = (): string => `op_${alAzar(16)}`;
/** El id de una escena o un plano nuevo, dentro de la producción: la forma de los ids del Core. */
export const nuevoIdDeEscena = (): string => `sc_${alAzar(12)}`;
export const nuevoIdDePlano = (): string => `sh_${alAzar(12)}`;

/* ── Lo que vuelve, leído con cuidado ─────────────────────────────────────── */

type Obj = Record<string, unknown>;
const esObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const esEntero = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const esEstado = (v: unknown): v is EstadoDeProduccion => v === 'active' || v === 'archived';

class RespuestaInvalida extends Error {}

/** Solo los campos que se conocen: si el servidor mandara algo más, no pasa de aquí. */
const aProduccion = (v: unknown): ProduccionGuardada => {
  if (!esObj(v) || typeof v.productionId !== 'string' || !esEntero(v.revision) || !esEstado(v.status)
    || !esEntero(v.createdAt) || !esEntero(v.updatedAt) || !esObj(v.production)
    || typeof v.production.title !== 'string' || !Array.isArray(v.production.scenes)) {
    throw new RespuestaInvalida('production');
  }
  return {
    productionId: v.productionId,
    revision: v.revision,
    status: v.status,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    ...(esEntero(v.archivedAt) ? { archivedAt: v.archivedAt } : {}),
    production: v.production as unknown as FilmmakerProduction,
  };
};

const aResumen = (v: unknown): ResumenDeProduccion => {
  if (!esObj(v) || typeof v.productionId !== 'string' || typeof v.title !== 'string' || !esEstado(v.status)
    || typeof v.aspectRatio !== 'string' || !esEntero(v.revision) || !esEntero(v.createdAt) || !esEntero(v.updatedAt)) {
    throw new RespuestaInvalida('summary');
  }
  return {
    productionId: v.productionId,
    title: v.title,
    status: v.status,
    aspectRatio: v.aspectRatio,
    ...(typeof v.resolution === 'string' ? { resolution: v.resolution } : {}),
    ...(typeof v.preset === 'string' ? { preset: v.preset } : {}),
    revision: v.revision,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    ...(esEntero(v.archivedAt) ? { archivedAt: v.archivedAt } : {}),
  };
};

const listaDeIds = (v: unknown): readonly string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const aPendiente = (v: unknown): PendingRegeneration => {
  const o = esObj(v) ? v : {};
  return { scenes: listaDeIds(o.scenes), shots: listaDeIds(o.shots), audio: listaDeIds(o.audio), removed: listaDeIds(o.removed) };
};

/* ── Los fallos ───────────────────────────────────────────────────────────── */

/** La clave del dominio para un código de persistencia. La misma forma que usa el servidor. */
export const claveDePersistencia = (code: string): string => `filmmaker.persistence.${code}`;

const TIPO_DEL_CODIGO: Readonly<Record<string, TipoDeFallo>> = {
  revision_conflict: 'conflicto',
  production_not_found: 'no_encontrada',
  production_archived: 'archivada',
  session_required: 'sin_sesion',
  account_not_found: 'sin_cuenta',
};

const problemasDe = (v: unknown): readonly FilmmakerIssue[] =>
  (Array.isArray(v) ? v : []).filter((p): p is FilmmakerIssue => esObj(p) && typeof p.code === 'string' && typeof p.messageKey === 'string')
    .map((p) => ({
      code: p.code,
      severity: p.severity === 'warning' || p.severity === 'info' ? p.severity : 'error',
      path: typeof p.path === 'string' ? p.path : '',
      parameters: esObj(p.parameters) ? (p.parameters as FilmmakerIssue['parameters']) : {},
      messageKey: p.messageKey,
    }));

/**
 * DE LO QUE LANZA UNA CALLABLE A UN FALLO QUE SE PUEDE PINTAR. Pura: no llama a
 * nada y no mira la red. Lo que el servidor dice en `details` manda; lo que dice
 * Firebase (`functions/…`) solo decide cuando el servidor no dijo nada.
 */
export const falloDeProducciones = (error: unknown): FalloDeProducciones => {
  if (error instanceof RespuestaInvalida) {
    return { tipo: 'desconocido', code: 'response_invalid', messageKey: claveDePersistencia('response_invalid'), problems: [], reintentable: false };
  }
  const e = esObj(error) ? error : {};
  const firebase = typeof e.code === 'string' ? e.code.replace(/^functions\//, '') : '';
  const detalles = esObj(e.details) ? e.details : {};
  const code = typeof detalles.code === 'string' ? detalles.code : '';
  const problems = problemasDe(detalles.problems);
  const currentRevision = esEntero(detalles.currentRevision) ? detalles.currentRevision : undefined;
  const base = { problems, ...(currentRevision !== undefined ? { currentRevision } : {}) };
  if (code) {
    const messageKey = typeof detalles.messageKey === 'string' ? detalles.messageKey : claveDePersistencia(code);
    return { ...base, tipo: TIPO_DEL_CODIGO[code] ?? 'rechazada', code, messageKey, reintentable: false };
  }
  /* Sin palabra del servidor: lo decide cómo falló la llamada. */
  if (firebase === 'unavailable' || firebase === 'deadline-exceeded' || firebase === 'internal') {
    return { ...base, tipo: 'sin_conexion', code: 'network', messageKey: claveDePersistencia('network'), reintentable: true };
  }
  if (firebase === 'not-found') {
    return { ...base, tipo: 'no_disponible', code: 'unavailable', messageKey: claveDePersistencia('unavailable'), reintentable: false };
  }
  if (firebase === 'unauthenticated') {
    return { ...base, tipo: 'sin_sesion', code: 'session_required', messageKey: claveDePersistencia('session_required'), reintentable: false };
  }
  return { ...base, tipo: 'desconocido', code: 'unknown', messageKey: claveDePersistencia('unknown'), reintentable: false };
};

/* ── La llamada ───────────────────────────────────────────────────────────── */

/** Lo único que esta capa necesita del mundo: mandar un objeto a `productions` y recibir otro. */
export type LlamadaAProducciones = (datos: Readonly<Record<string, unknown>>) => Promise<unknown>;

/** El servidor corta a los 60 s; aquí se espera un poco más para no dar por perdido lo que está llegando. */
const PLAZO_MS = 70_000;

const porLaCallable: LlamadaAProducciones = async (datos) => {
  /* Sin Firebase configurado no hay a quién llamar, y se dice como lo que es. */
  if (!functions) throw { code: 'functions/not-found' };
  const fn = httpsCallable<Readonly<Record<string, unknown>>, unknown>(functions, 'productions', { timeout: PLAZO_MS });
  return (await fn(datos)).data;
};

/** Quita lo que no se manda: un campo `undefined` no viaja. */
const limpio = (o: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

const intentar = async <T>(llamada: () => Promise<T>): Promise<Resultado<T>> => {
  try {
    return { ok: true, valor: await llamada() };
  } catch (error) {
    return { ok: false, fallo: falloDeProducciones(error) };
  }
};

/* ── Las siete operaciones ────────────────────────────────────────────────── */

export interface NuevaProduccion {
  /** Sin él, se genera uno. Repetir con el mismo id y lo mismo dentro devuelve la que hay. */
  readonly productionId?: string;
  readonly operationId?: string;
  /** Una producción vacía: su título y su formato, o un preset… */
  readonly title?: string;
  readonly aspectRatio?: AspectRatio;
  readonly resolution?: ResolutionTarget;
  readonly preset?: FormatPresetId;
  /** …o una producción entera, como borrador en su revisión 0. Lo uno o lo otro. */
  readonly production?: FilmmakerProduction;
}

export interface LoteParaAplicar {
  readonly productionId: string;
  /** La revisión sobre la que se escribió el lote. Si ya no es la que hay, el servidor no lo aplica. */
  readonly expectedRevision: number;
  readonly operations: readonly FilmmakerOperation[];
  /** El id del lote: repetir con el mismo es un reintento, nunca una segunda aplicación. */
  readonly operationId: string;
}

export const crearFilmmakerService = (llamar: LlamadaAProducciones) => ({
  /** Crear una producción. `created: false` si ya existía esa misma. */
  createProduction: (p: NuevaProduccion): Promise<Resultado<{ readonly created: boolean; readonly produccion: ProduccionGuardada }>> =>
    intentar(async () => {
      const r = await llamar(limpio({
        op: 'create', productionId: p.productionId ?? nuevoIdDeProduccion(), operationId: p.operationId,
        title: p.title, aspectRatio: p.aspectRatio, resolution: p.resolution, preset: p.preset, production: p.production,
      }));
      return { created: esObj(r) && r.created === true, produccion: aProduccion(r) };
    }),

  /** Una producción, si es tuya. */
  getProduction: (productionId: string): Promise<Resultado<ProduccionGuardada>> =>
    intentar(async () => aProduccion(await llamar({ op: 'get', productionId }))),

  /** Tus producciones, las más recientes primero. `after` es el `nextCursor` de la página anterior. */
  listProductions: (c: { readonly status?: EstadoDeProduccion; readonly limit?: number; readonly after?: string } = {}):
    Promise<Resultado<{ readonly producciones: readonly ResumenDeProduccion[]; readonly nextCursor?: string }>> =>
    intentar(async () => {
      const r = await llamar(limpio({ op: 'list', status: c.status, limit: c.limit, after: c.after }));
      if (!esObj(r) || !Array.isArray(r.productions)) throw new RespuestaInvalida('list');
      return { producciones: r.productions.map(aResumen), ...(typeof r.nextCursor === 'string' ? { nextCursor: r.nextCursor } : {}) };
    }),

  /** Un lote de operaciones, todo o nada, sobre la revisión que se esperaba. */
  applyProductionOperations: (l: LoteParaAplicar): Promise<Resultado<LoteConfirmado>> =>
    intentar(async () => {
      const r = await llamar({
        op: 'apply', productionId: l.productionId, expectedRevision: l.expectedRevision, operations: l.operations, operationId: l.operationId,
      });
      if (!esObj(r) || !esEntero(r.applied) || typeof r.operationId !== 'string') throw new RespuestaInvalida('apply');
      return {
        produccion: aProduccion(r),
        applied: r.applied,
        pending: aPendiente(r.pending),
        timelineChanged: r.timelineChanged === true,
        operationId: r.operationId,
        alreadyApplied: r.alreadyApplied === true,
      };
    }),

  /** Archivar: no se borra nada; se lee, se duplica y se desarchiva, pero no se cambia. */
  archiveProduction: (productionId: string): Promise<Resultado<{ readonly changed: boolean; readonly resumen: ResumenDeProduccion }>> =>
    intentar(async () => {
      const r = await llamar({ op: 'archive', productionId });
      if (!esObj(r)) throw new RespuestaInvalida('archive');
      return { changed: r.changed === true, resumen: aResumen(r.summary) };
    }),

  unarchiveProduction: (productionId: string): Promise<Resultado<{ readonly changed: boolean; readonly resumen: ResumenDeProduccion }>> =>
    intentar(async () => {
      const r = await llamar({ op: 'unarchive', productionId });
      if (!esObj(r)) throw new RespuestaInvalida('unarchive');
      return { changed: r.changed === true, resumen: aResumen(r.summary) };
    }),

  /** Una copia, en su revisión 0, de la misma cuenta. Sin `title`, el de la original: el servidor no inventa frases. */
  duplicateProduction: (d: { readonly productionId: string; readonly newProductionId?: string; readonly title?: string; readonly operationId?: string }):
    Promise<Resultado<{ readonly created: boolean; readonly produccion: ProduccionGuardada; readonly source: { readonly productionId: string; readonly revision: number } }>> =>
    intentar(async () => {
      const r = await llamar(limpio({
        op: 'duplicate', productionId: d.productionId, newProductionId: d.newProductionId ?? nuevoIdDeProduccion(), title: d.title, operationId: d.operationId,
      }));
      if (!esObj(r) || !esObj(r.source) || typeof r.source.productionId !== 'string' || !esEntero(r.source.revision)) throw new RespuestaInvalida('duplicate');
      return { created: r.created === true, produccion: aProduccion(r), source: { productionId: r.source.productionId, revision: r.source.revision } };
    }),
});

export type FilmmakerService = ReturnType<typeof crearFilmmakerService>;

/** El de la app: la callable de verdad. */
export const filmmakerService: FilmmakerService = crearFilmmakerService(porLaCallable);
