import { createHash } from 'crypto';
import { DocumentReference, DocumentSnapshot, Firestore, Transaction, getFirestore } from 'firebase-admin/firestore';
import type { AspectRatio } from '../core/creative';
import { puedeReferenciar } from '../core/element';
import type { FichaDeMaterial, MotivoDeNoReferenciar } from '../core/element';
import { leerMaterial } from '../content';
import {
  FILMMAKER_MODEL_VERSION, FORMA_DE_ID, FilmmakerProduction, FormatPresetId, LIMITES, PRESETS, ProductionScene,
  ResolutionTarget, canonico, configuracionDePreset, produccionVacia,
} from '../filmmaker/modelo';
import { FilmmakerIssue, Params, integridad } from '../filmmaker/validacion';
import { FilmmakerOperation, PendingRegeneration, aplicarOperaciones } from '../filmmaker/operaciones';

/**
 * WEË FILMMAKER — UNA PRODUCCIÓN, GUARDADA (F1-B).
 *
 * ── Qué es esto ─────────────────────────────────────────────────────────────
 *
 * El almacén de las producciones de F1-A. La producción es la VERDAD CREATIVA:
 * lo que la persona decidió que se vea y se oiga. Aquí se guarda, se lee, se
 * lista, se cambia con el lenguaje de operaciones de F1-A, se archiva y se
 * duplica. Nada más: no genera, no cobra, no llama a ningún proveedor y no toca
 * las `scenes`/`shots` del Core, que en F1-D serán las unidades de generación
 * —la foto de lo que se pidió generar—, nunca el storyboard.
 *
 * ── Dónde vive ──────────────────────────────────────────────────────────────
 *
 *   productions/{productionId}                       la producción sin sus escenas, y su sobre
 *   productions/{productionId}/productionScenes/{id} una escena con sus planos dentro
 *   productions/{productionId}/productionRevisions/{revisión}   el registro, solo se añade
 *
 * El sobre es lo que la producción no sabe de sí misma: de quién es
 * (`ownerAccountId`), si está archivada (`status`) y cuándo (`createdAt`,
 * `updatedAt`, `archivedAt`, en milisegundos, como el Core). Cada escena repite
 * la cuenta y la producción para que las reglas no tengan que leer la raíz.
 *
 * ── Lo que NO se repite aquí ────────────────────────────────────────────────
 *
 * Ni una regla del dominio. Lo que entra y lo que sale se comprueba con
 * `integridad()` de F1-A, y los cambios son `aplicarOperaciones()`, tal cual.
 * Este archivo solo añade lo que es de GUARDAR: la cuenta, la revisión con
 * CAS, el registro, los tamaños que Firestore admite y las dos cosas que F1-B
 * aún no deja pasar (un Element de verdad, y un material que no sea tuyo).
 *
 * ── De quién es ─────────────────────────────────────────────────────────────
 *
 * De la cuenta que llega ya resuelta de la sesión, y se comprueba AQUÍ, una por
 * una: este código corre con el Admin SDK y las reglas no le afectan. Lo de otra
 * cuenta contesta lo mismo que lo que no existe.
 */

export const COLECCION_DE_PRODUCCIONES = 'productions';
export const COLECCION_DE_ESCENAS = 'productionScenes';
export const COLECCION_DE_REVISIONES = 'productionRevisions';

/**
 * EL ID DE UNA PRODUCCIÓN: lo genera el cliente, al azar, y se valida aquí. Al
 * menos veinte caracteres —los de un id automático de Firestore— para que no se
 * pueda adivinar, y la forma de los ids del dominio para que quepa en `id`.
 */
export const FORMA_DE_ID_DE_PRODUCCION = /^[A-Za-z0-9_-]{20,128}$/;
/** El id de un lote o de una creación, para reconocer un reintento. */
export const FORMA_DE_ID_DE_OPERACION = /^[A-Za-z0-9_-]{8,128}$/;

/**
 * LO QUE CABE. Firestore admite 1 MiB por documento, 500 escrituras y unos 10 MiB
 * por transacción; aquí se deja margen y se RECHAZA con un código lo que no cabe.
 * Nada se parte en silencio: un lote es atómico o no es.
 */
export const LIMITES_DE_PERSISTENCIA = Object.freeze({
  operacionesPorLote: 50,
  listadoMaximo: 50,
  listadoPorDefecto: 20,
  bytesPorDocumento: 1_000_000,
  bytesPorTransaccion: 9_000_000,
  /** Una producción entera —raíz y escenas—: lo que se lee de una vez para comprobarla. */
  bytesPorProduccion: 20_000_000,
  escriturasPorTransaccion: 500,
  revisionesLeidas: 1000,
});

export type EstadoDeProduccion = 'active' | 'archived';
export const ESTADOS_DE_PRODUCCION: readonly EstadoDeProduccion[] = Object.freeze(['active', 'archived'] as EstadoDeProduccion[]);

/* ── El documento es el contrato ──────────────────────────────────────────── */

/** Lo que la producción no sabe de sí misma. */
export interface SobreDeProduccion {
  ownerAccountId: string;
  status: EstadoDeProduccion;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
}
const CLAVES_DEL_SOBRE = ['ownerAccountId', 'status', 'createdAt', 'updatedAt', 'archivedAt'];

/** La raíz tal como se guarda: la producción SIN sus escenas, y su sobre. */
export type RaizGuardada = Omit<FilmmakerProduction, 'scenes'> & SobreDeProduccion;
/** Una escena tal como se guarda: la `ProductionScene` entera, de quién es y de qué producción. */
export type EscenaGuardada = ProductionScene & { ownerAccountId: string; productionId: string };

export type TipoDeRevision = 'create' | 'duplicate' | 'apply';

/**
 * UNA ENTRADA DEL REGISTRO. Una por revisión, y solo se añade: nadie la cambia
 * ni la borra.
 *
 *   revisión 0   `create` o `duplicate`: la producción entera, tal como nació.
 *   revisión n   `apply`: el lote que la llevó de n-1 a n, tal como se aplicó.
 *
 * Con la foto y los lotes, cualquier revisión se reconstruye —las operaciones
 * de F1-A son deterministas— y `result.hash` dice si la reconstrucción es fiel.
 * No guarda nada de ningún proveedor, ni credenciales, ni lo pendiente: lo
 * pendiente se calcula.
 */
export interface RevisionGuardada {
  productionId: string;
  ownerAccountId: string;
  revision: number;
  kind: TipoDeRevision;
  operationId: string;
  /** Quién lo hizo. Hoy siempre la dueña: no hay colaboración. */
  actorAccountId: string;
  createdAt: number;
  modelVersion: typeof FILMMAKER_MODEL_VERSION;
  snapshot?: FilmmakerProduction;
  source?: { productionId: string; revision: number };
  operations?: readonly FilmmakerOperation[];
  result: { hash: string; scenes: number; shots: number; applied?: number; timelineChanged?: boolean };
}

/* ── Lo que se contesta ───────────────────────────────────────────────────── */

export type CodigoDePersistencia =
  | 'production_id_invalid'
  | 'production_not_found'
  | 'production_id_taken'
  | 'production_invalid'
  | 'production_corrupted'
  | 'production_archived'
  | 'revision_invalid'
  | 'revision_conflict'
  | 'operation_id_invalid'
  | 'operation_id_reused'
  | 'operations_invalid'
  | 'operations_empty'
  | 'operations_too_many'
  | 'element_binding_not_supported'
  | 'reference_rejected'
  | 'id_not_storable'
  | 'document_too_large'
  | 'production_too_large'
  | 'transaction_too_large'
  | 'list_query_invalid'
  | 'history_too_long'
  | 'history_broken';

/** Mismo espacio de claves que F1-A (`filmmaker.<área>.<código>`). Aquí no hay frases. */
export const claveDePersistencia = (code: string): string => `filmmaker.persistence.${code}`;

export type ProblemaDePersistencia = FilmmakerIssue<CodigoDePersistencia>;

export interface Rechazo {
  readonly ok: false;
  readonly code: CodigoDePersistencia;
  /** Los de aquí y, si los hay, los del dominio, con sus propias claves. */
  readonly problems: readonly FilmmakerIssue[];
  /** En un conflicto de revisión: la que hay ahora. */
  readonly currentRevision?: number;
}

/** Una producción leída: el dominio entero y su sobre, sin la cuenta (quien pregunta ya la sabe). */
export interface VistaDeProduccion {
  readonly productionId: string;
  readonly revision: number;
  readonly status: EstadoDeProduccion;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly archivedAt?: number;
  readonly production: FilmmakerProduction;
}

/** Lo que se enseña en una lista: sin escenas, sin planos y sin ningún prompt. */
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

export type ResultadoDeCreacion = { readonly ok: true; readonly created: boolean; readonly view: VistaDeProduccion } | Rechazo;
export type ResultadoDeLectura = { readonly ok: true; readonly view: VistaDeProduccion } | Rechazo;
export type ResultadoDeListado = { readonly ok: true; readonly productions: readonly ResumenDeProduccion[]; readonly nextCursor?: string } | Rechazo;
export type ResultadoDeArchivo = { readonly ok: true; readonly changed: boolean; readonly summary: ResumenDeProduccion } | Rechazo;
export type ResultadoDeAplicacion =
  | {
    readonly ok: true;
    readonly view: VistaDeProduccion;
    /** Operaciones que cambiaron algo. Con 0 no se escribió nada ni subió la revisión. */
    readonly applied: number;
    /** Lo que el lote dejó pendiente de rehacer. En un reintento ya aplicado va vacío: se calcula, no se guarda. */
    readonly pending: PendingRegeneration;
    readonly timelineChanged: boolean;
    readonly operationId: string;
    /** El lote ya estaba aplicado: es un reintento, y no se aplicó dos veces. */
    readonly alreadyApplied: boolean;
  }
  | Rechazo;
export type ResultadoDeDuplicado =
  | { readonly ok: true; readonly created: boolean; readonly view: VistaDeProduccion; readonly source: { readonly productionId: string; readonly revision: number } }
  | Rechazo;
export type ResultadoDeRegistro = { readonly ok: true; readonly entries: readonly RevisionGuardada[] } | Rechazo;
export type ResultadoDeReconstruccion = { readonly ok: true; readonly production: FilmmakerProduction } | Rechazo;

/* ── Lo que esto necesita del mundo ───────────────────────────────────────── */

export interface LectorDeMateriales {
  (assetId: string): Promise<FichaDeMaterial | null>;
}

export interface DepsDeProducciones {
  db?: Firestore;
  material?: LectorDeMateriales;
}

const laBase = (deps: DepsDeProducciones = {}): Firestore => deps.db ?? getFirestore();

/** Por defecto, el Content Core de F11: ni una segunda lectura de materiales, ni una segunda verdad. */
const materialPorDefecto: LectorDeMateriales = async (assetId) => {
  const ficha = await leerMaterial(assetId);
  return ficha ? { assetId: ficha.assetId, ownerAccountId: ficha.ownerAccountId, kind: ficha.kind, status: ficha.status } : null;
};

const raizRef = (db: Firestore, productionId: string): DocumentReference => db.collection(COLECCION_DE_PRODUCCIONES).doc(productionId);
const idDeRevision = (revision: number): string => String(revision).padStart(10, '0');

/* ── Herramientas ─────────────────────────────────────────────────────────── */

type Obj = Record<string, unknown>;
const esObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const esEntero = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
/** Firestore no admite `undefined`, y un dato guardado tiene que ser JSON. */
const aJson = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const unir = (ruta: string, clave: string | number): string => (ruta ? `${ruta}.${clave}` : String(clave));
const tramo = (item: unknown, i: number): string => (esObj(item) && typeof item.id === 'string' && FORMA_DE_ID.test(item.id) ? item.id : `#${i}`);

/** Firestore reserva los ids `__…__`: la forma del dominio los admite, un documento no. */
const reservado = (id: string): boolean => /^__.*__$/.test(id);
export const esIdDeProduccion = (v: unknown): v is string => typeof v === 'string' && FORMA_DE_ID_DE_PRODUCCION.test(v) && !reservado(v);
const esIdDeOperacion = (v: unknown): v is string => typeof v === 'string' && FORMA_DE_ID_DE_OPERACION.test(v) && !reservado(v);

/** La huella de una producción: su JSON canónico, con sha256. La misma producción, la misma huella. */
export const huella = (v: unknown): string => `sha256:${createHash('sha256').update(canonico(v)).digest('hex')}`;

/** Sin id de operación, uno derivado de la petición: el mismo reintento da el mismo id. */
const idDerivado = (partes: unknown): string => `op_${createHash('sha256').update(canonico(partes)).digest('hex').slice(0, 40)}`;

const problema = (code: CodigoDePersistencia, path = '', parameters: Params = {}): ProblemaDePersistencia => ({
  code, severity: 'error', path, parameters, messageKey: claveDePersistencia(code),
});
const rechazo = (code: CodigoDePersistencia, problems?: readonly FilmmakerIssue[], extra: { currentRevision?: number } = {}): Rechazo => ({
  ok: false, code, problems: problems && problems.length ? problems : [problema(code)], ...extra,
});
const noEsta = (): Rechazo => rechazo('production_not_found');

const planosDe = (p: FilmmakerProduction): number => p.scenes.reduce((n, s) => n + s.shots.length, 0);

/* ── Tamaños, contados como los cuenta Firestore ──────────────────────────── */

/*
 * La regla publicada de Firestore: una cadena ocupa sus bytes UTF-8 más 1; un
 * número, 8; un booleano o un nulo, 1; un mapa, la suma de sus claves (bytes + 1)
 * y sus valores; una lista, la suma de sus elementos. Un documento suma además su
 * nombre (cada tramo de la ruta, bytes + 1, más 16) y 32 bytes.
 */
const bytesDeValor = (v: unknown): number => {
  if (v === null || v === undefined) return 1;
  if (typeof v === 'string') return Buffer.byteLength(v, 'utf8') + 1;
  if (typeof v === 'number') return 8;
  if (typeof v === 'boolean') return 1;
  if (Array.isArray(v)) return v.reduce((n: number, x) => n + bytesDeValor(x), 0);
  if (typeof v === 'object') {
    return Object.entries(v as Obj).reduce((n, [k, x]) => n + Buffer.byteLength(k, 'utf8') + 1 + bytesDeValor(x), 0);
  }
  return 0;
};

export const bytesDeDocumento = (ruta: readonly string[], datos: unknown): number =>
  ruta.reduce((n, tramoDeRuta) => n + Buffer.byteLength(tramoDeRuta, 'utf8') + 1, 16) + bytesDeValor(datos) + 32;

interface Escritura {
  readonly ref: DocumentReference;
  readonly ruta: readonly string[];
  readonly tipo: 'create' | 'set' | 'delete';
  readonly datos?: Obj;
}

/** ¿Cabe? Cada documento, el total y el número de escrituras. Si algo no cabe, no se escribe nada. */
export const medirEscrituras = (escrituras: readonly { readonly ruta: readonly string[]; readonly datos?: unknown }[]): Rechazo | null => {
  const max = LIMITES_DE_PERSISTENCIA.bytesPorDocumento;
  let total = 0;
  const grandes: ProblemaDePersistencia[] = [];
  for (const e of escrituras) {
    const bytes = e.datos ? bytesDeDocumento(e.ruta, e.datos) : bytesDeDocumento(e.ruta, {});
    total += bytes;
    if (bytes > max) grandes.push(problema('document_too_large', e.ruta.join('/'), { bytes, max }));
  }
  if (grandes.length) return rechazo('document_too_large', grandes);
  if (escrituras.length > LIMITES_DE_PERSISTENCIA.escriturasPorTransaccion) {
    return rechazo('transaction_too_large', [problema('transaction_too_large', '', { writes: escrituras.length, max: LIMITES_DE_PERSISTENCIA.escriturasPorTransaccion })]);
  }
  if (total > LIMITES_DE_PERSISTENCIA.bytesPorTransaccion) {
    return rechazo('transaction_too_large', [problema('transaction_too_large', '', { bytes: total, max: LIMITES_DE_PERSISTENCIA.bytesPorTransaccion })]);
  }
  return null;
};

/**
 * ¿CABE LA PRODUCCIÓN ENTERA? Cada documento puede caber y la suma no: 200 escenas
 * de casi un megabyte serían 200 MB en memoria cada vez que se abre. El tope se
 * mide sobre lo que queda guardado, no sobre lo que cambia.
 */
const pesar = (productionId: string, raiz: Obj, escenas: ReadonlyMap<string, Obj>): Rechazo | null => {
  let bytes = bytesDeDocumento(rutaDeRaiz(productionId), raiz);
  for (const [id, s] of escenas) bytes += bytesDeDocumento(rutaDeEscena(productionId, id), s);
  const max = LIMITES_DE_PERSISTENCIA.bytesPorProduccion;
  return bytes > max ? rechazo('production_too_large', [problema('production_too_large', '', { bytes, max })]) : null;
};

const escribir = (tx: Transaction, escrituras: readonly Escritura[]): void => {
  for (const e of escrituras) {
    if (e.tipo === 'create') tx.create(e.ref, e.datos as Obj);
    else if (e.tipo === 'set') tx.set(e.ref, e.datos as Obj);
    else tx.delete(e.ref);
  }
};

/* ── Partir y reunir ──────────────────────────────────────────────────────── */

const rutaDeRaiz = (productionId: string): string[] => [COLECCION_DE_PRODUCCIONES, productionId];
const rutaDeEscena = (productionId: string, sceneId: string): string[] => [...rutaDeRaiz(productionId), COLECCION_DE_ESCENAS, sceneId];
const rutaDeRevision = (productionId: string, revision: number): string[] =>
  [...rutaDeRaiz(productionId), COLECCION_DE_REVISIONES, idDeRevision(revision)];

/** Una producción en documentos: la raíz con su sobre y una escena por documento. */
const partir = (prod: FilmmakerProduction, sobre: SobreDeProduccion): { raiz: Obj; escenas: Map<string, Obj> } => {
  const { scenes, ...resto } = prod;
  const productionId = prod.id as string;
  const escenas = new Map<string, Obj>();
  for (const s of scenes) escenas.set(s.id, aJson({ ...s, ownerAccountId: sobre.ownerAccountId, productionId }) as Obj);
  return { raiz: aJson({ ...resto, ...sobre }) as Obj, escenas };
};

type Leida = { readonly ok: true; readonly vista: VistaDeProduccion } | Rechazo;

/**
 * REUNIR LO GUARDADO, Y COMPROBARLO. Lo que sale de la base se valida igual que lo
 * que entra: una fila puede haberse escrito mal. Si la raíz no es de esta cuenta,
 * no existe. Si es suya y está rota, se dice: `production_corrupted`.
 */
const reunir = (
  productionId: string,
  accountId: string,
  raiz: unknown,
  escenas: readonly { readonly id: string; readonly data: unknown }[],
): Leida => {
  if (!esObj(raiz) || raiz.ownerAccountId !== accountId) return noEsta();
  const roto: ProblemaDePersistencia[] = [];
  const corrupta = (ruta: string, motivo: string): void => { roto.push(problema('production_corrupted', ruta, { reason: motivo })); };
  if (!ESTADOS_DE_PRODUCCION.includes(raiz.status as EstadoDeProduccion)) corrupta('status', 'status_invalid');
  for (const campo of ['createdAt', 'updatedAt']) if (!esEntero(raiz[campo], 0, Number.MAX_SAFE_INTEGER)) corrupta(campo, 'time_invalid');
  if (raiz.status === 'archived' ? !esEntero(raiz.archivedAt, 0, Number.MAX_SAFE_INTEGER) : raiz.archivedAt !== undefined) corrupta('archivedAt', 'archive_mismatch');
  if (raiz.id !== productionId) corrupta('id', 'id_mismatch');
  if (raiz.scenes !== undefined) corrupta('scenes', 'scenes_in_root');
  if (escenas.length > LIMITES.escenas) corrupta('scenes', 'too_many_scene_documents');

  const propias: ProductionScene[] = [];
  for (const d of escenas) {
    if (!esObj(d.data)) { corrupta(`scenes.${d.id}`, 'scene_not_object'); continue; }
    const { ownerAccountId, productionId: deLaProduccion, ...escena } = d.data;
    if (ownerAccountId !== accountId) corrupta(`scenes.${d.id}`, 'scene_owner_mismatch');
    if (deLaProduccion !== productionId) corrupta(`scenes.${d.id}`, 'scene_production_mismatch');
    if (escena.id !== d.id) corrupta(`scenes.${d.id}`, 'scene_id_mismatch');
    propias.push(escena as unknown as ProductionScene);
  }
  if (roto.length) return rechazo('production_corrupted', roto);

  const produccion: Obj = {};
  for (const [k, v] of Object.entries(raiz)) if (!CLAVES_DEL_SOBRE.includes(k)) produccion[k] = v;
  const ordenadas = [...propias].sort((a, b) => (a.order - b.order) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  produccion.scenes = ordenadas;
  const rota = integridad(produccion);
  if (rota.length) return rechazo('production_corrupted', [problema('production_corrupted', '', { reason: 'integrity' }), ...rota]);

  const prod = produccion as unknown as FilmmakerProduction;
  return {
    ok: true,
    vista: {
      productionId,
      revision: prod.metadata.revision,
      status: raiz.status as EstadoDeProduccion,
      createdAt: raiz.createdAt as number,
      updatedAt: raiz.updatedAt as number,
      ...(raiz.archivedAt !== undefined ? { archivedAt: raiz.archivedAt as number } : {}),
      production: prod,
    },
  };
};

const resumir = (productionId: string, raiz: unknown, accountId: string): ResumenDeProduccion | null => {
  if (!esObj(raiz) || raiz.ownerAccountId !== accountId) return null;
  const formato = esObj(raiz.format) ? raiz.format : {};
  const meta = esObj(raiz.metadata) ? raiz.metadata : {};
  if (typeof raiz.title !== 'string' || typeof formato.aspectRatio !== 'string' || !esEntero(meta.revision, 0, Number.MAX_SAFE_INTEGER)
    || !ESTADOS_DE_PRODUCCION.includes(raiz.status as EstadoDeProduccion)
    || !esEntero(raiz.createdAt, 0, Number.MAX_SAFE_INTEGER) || !esEntero(raiz.updatedAt, 0, Number.MAX_SAFE_INTEGER)) return null;
  return {
    productionId,
    title: raiz.title,
    status: raiz.status as EstadoDeProduccion,
    aspectRatio: formato.aspectRatio,
    ...(typeof formato.resolution === 'string' ? { resolution: formato.resolution } : {}),
    ...(typeof formato.preset === 'string' ? { preset: formato.preset } : {}),
    revision: meta.revision as number,
    createdAt: raiz.createdAt as number,
    updatedAt: raiz.updatedAt as number,
    ...(esEntero(raiz.archivedAt, 0, Number.MAX_SAFE_INTEGER) ? { archivedAt: raiz.archivedAt } : {}),
  };
};

/** Lee la producción DENTRO de una transacción: la raíz y sus escenas, acotadas. */
const leerEnTransaccion = async (tx: Transaction, db: Firestore, productionId: string, accountId: string): Promise<Leida> => {
  const ref = raizRef(db, productionId);
  const snap = await tx.get(ref);
  if (!snap.exists || snap.data()?.ownerAccountId !== accountId) return noEsta();
  const escenas = await tx.get(ref.collection(COLECCION_DE_ESCENAS).limit(LIMITES.escenas + 1));
  return reunir(productionId, accountId, snap.data(), escenas.docs.map((d) => ({ id: d.id, data: d.data() })));
};

/* ── Lo que F1-B todavía no deja pasar ───────────────────────────────────── */

/**
 * UN ELEMENT DE VERDAD, NO. El dominio admite `ElementBinding` en personajes,
 * lugares, objetos y referencias; guardarlo exige comprobar que el Element es de
 * la cuenta, está activo y existe en esa versión, y eso es F3. Hasta entonces se
 * rechaza cualquier objeto con `elementId`, esté donde esté.
 */
const vinculosDeElementos = (prod: FilmmakerProduction): string[] => {
  const rutas: string[] = [];
  const andar = (v: unknown, ruta: string): void => {
    if (Array.isArray(v)) { v.forEach((x, i) => andar(x, unir(ruta, tramo(x, i)))); return; }
    if (!esObj(v)) return;
    if (Object.prototype.hasOwnProperty.call(v, 'elementId')) { rutas.push(ruta); return; }
    for (const [k, x] of Object.entries(v)) andar(x, unir(ruta, k));
  };
  andar(prod, '');
  return rutas;
};

/**
 * LO QUE NO ESTÁ EN EL DOMINIO Y SÍ EN GUARDAR. Tres comprobaciones, y ninguna
 * repite una regla de F1-A:
 *
 *   1 · ningún `ElementBinding` (F3);
 *   2 · cada escena es un documento, así que su id no puede ser uno reservado;
 *   3 · cada material NUEVO —el que no estaba antes— es de la cuenta, está listo
 *       y es de la clase que la referencia dice, con `puedeReferenciar` del Core.
 *       Lo que ya estaba no se vuelve a leer: se comprobó cuando entró.
 */
const politica = async (
  antes: FilmmakerProduction | undefined,
  despues: FilmmakerProduction,
  accountId: string,
  deps: DepsDeProducciones,
): Promise<Rechazo | null> => {
  const vinculos = vinculosDeElementos(despues);
  if (vinculos.length) {
    return rechazo('element_binding_not_supported', vinculos.map((r) => problema('element_binding_not_supported', r, { until: 'F3' })));
  }
  const reservados = despues.scenes.filter((s) => reservado(s.id));
  if (reservados.length) return rechazo('id_not_storable', reservados.map((s) => problema('id_not_storable', `scenes.${s.id}`)));

  const conocidos = new Set((antes?.references ?? []).filter((r) => r.assetId !== undefined).map((r) => `${r.assetId}|${r.kind}`));
  const nuevos = despues.references.filter((r) => r.assetId !== undefined && !conocidos.has(`${r.assetId}|${r.kind}`));
  if (!nuevos.length) return null;
  const leer = deps.material ?? materialPorDefecto;
  const malos: ProblemaDePersistencia[] = [];
  for (const r of nuevos) {
    const ficha = await leer(r.assetId as string);
    /* El papel no cuenta para `puedeReferenciar`: mira dueño, estado y clase. `reference` es el que le corresponde. */
    const veredicto = puedeReferenciar({ assetId: r.assetId as string, kind: r.kind, role: 'reference' }, ficha ?? undefined, accountId);
    if (!veredicto.ok) malos.push(problema('reference_rejected', `references.${r.id}.assetId`, { reason: veredicto.reason as MotivoDeNoReferenciar }));
  }
  return malos.length ? rechazo('reference_rejected', malos) : null;
};

/* ── Crear ────────────────────────────────────────────────────────────────── */

export interface PeticionDeCreacion {
  /** La cuenta, ya resuelta desde la sesión. Nunca la que mande el cliente. */
  readonly accountId: string;
  readonly productionId: unknown;
  readonly operationId?: unknown;
  /** Una producción vacía: su título y su formato, o un preset. */
  readonly title?: unknown;
  readonly aspectRatio?: unknown;
  readonly resolution?: unknown;
  readonly preset?: unknown;
  /** O una producción entera, como borrador. Lo uno o lo otro. */
  readonly production?: unknown;
  readonly at: number;
}

/** La producción de la revisión 0, antes de comprobarla. */
const produccionInicial = (p: PeticionDeCreacion, productionId: string): { ok: true; prod: Obj } | Rechazo => {
  const sueltos = ['title', 'aspectRatio', 'resolution', 'preset'].filter((k) => (p as unknown as Obj)[k] !== undefined);
  if (p.production !== undefined) {
    if (sueltos.length) return rechazo('production_invalid', [problema('production_invalid', '', { reason: 'production_and_fields', fields: sueltos })]);
    if (!esObj(p.production)) return rechazo('production_invalid', [problema('production_invalid', '', { reason: 'not_an_object' })]);
    let crudo: Obj;
    try { crudo = aJson(p.production); } catch { return rechazo('production_invalid', [problema('production_invalid', '', { reason: 'not_json' })]); }
    const mal: ProblemaDePersistencia[] = [];
    if (crudo.id !== undefined && crudo.id !== productionId) mal.push(problema('production_invalid', 'id', { reason: 'id_mismatch' }));
    if (esObj(crudo.metadata) && crudo.metadata.revision !== 0) mal.push(problema('production_invalid', 'metadata.revision', { reason: 'revision_must_be_zero' }));
    if (mal.length) return rechazo('production_invalid', mal);
    return { ok: true, prod: { ...crudo, id: productionId } };
  }
  if (p.preset !== undefined && !PRESETS.includes(p.preset as FormatPresetId)) {
    return rechazo('production_invalid', [problema('production_invalid', 'format.preset', { reason: 'preset_unknown' })]);
  }
  const conf = p.preset !== undefined ? configuracionDePreset(p.preset as FormatPresetId) : undefined;
  const vacia = produccionVacia({
    title: p.title as string,
    aspectRatio: (p.aspectRatio ?? conf?.format.aspectRatio) as AspectRatio,
    id: productionId,
    ...(p.resolution !== undefined ? { resolution: p.resolution as ResolutionTarget } : {}),
  });
  if (!conf) return { ok: true, prod: aJson(vacia) as unknown as Obj };
  return {
    ok: true,
    prod: aJson({
      ...vacia,
      ...conf,
      format: {
        ...conf.format,
        ...(p.aspectRatio !== undefined ? { aspectRatio: p.aspectRatio } : {}),
        ...(p.resolution !== undefined ? { resolution: p.resolution } : {}),
      },
    }) as unknown as Obj,
  };
};

/**
 * CREAR UNA PRODUCCIÓN. Nace en la revisión 0, y la revisión 0 es su foto.
 *
 * Crear dos veces lo mismo con el mismo id no crea dos cosas: devuelve la que hay
 * (`created: false`). El mismo id con otra cosa dentro, o de otra cuenta, es
 * `production_id_taken`, y lo que había no se toca: se escribe con `create`,
 * nunca con `set`.
 */
export const crearProduccion = async (p: PeticionDeCreacion, deps: DepsDeProducciones = {}): Promise<ResultadoDeCreacion> => {
  if (!esIdDeProduccion(p.productionId)) return rechazo('production_id_invalid');
  if (p.operationId !== undefined && !esIdDeOperacion(p.operationId)) return rechazo('operation_id_invalid');
  const productionId = p.productionId;
  const inicial = produccionInicial(p, productionId);
  if (!inicial.ok) return inicial;
  const rota = integridad(inicial.prod);
  if (rota.length) return rechazo('production_invalid', rota);
  const prod = inicial.prod as unknown as FilmmakerProduction;

  const vetada = await politica(undefined, prod, p.accountId, deps);
  if (vetada) return vetada;

  const operationId = (p.operationId as string | undefined) ?? idDerivado({ kind: 'create', productionId, prod });
  const db = laBase(deps);
  const ref = raizRef(db, productionId);
  const sobre: SobreDeProduccion = { ownerAccountId: p.accountId, status: 'active', createdAt: p.at, updatedAt: p.at };
  /* Sin `pesar`: la foto de la revisión 0 es la producción entera y tiene que caber en UN documento. */
  const { raiz, escenas } = partir(prod, sobre);
  const entrada: RevisionGuardada = {
    productionId, ownerAccountId: p.accountId, revision: 0, kind: 'create', operationId, actorAccountId: p.accountId,
    createdAt: p.at, modelVersion: FILMMAKER_MODEL_VERSION, snapshot: prod,
    result: { hash: huella(prod), scenes: prod.scenes.length, shots: planosDe(prod) },
  };
  const escrituras: Escritura[] = [
    { ref, ruta: rutaDeRaiz(productionId), tipo: 'create', datos: raiz },
    ...[...escenas].map(([id, datos]): Escritura => ({ ref: ref.collection(COLECCION_DE_ESCENAS).doc(id), ruta: rutaDeEscena(productionId, id), tipo: 'create', datos })),
    { ref: ref.collection(COLECCION_DE_REVISIONES).doc(idDeRevision(0)), ruta: rutaDeRevision(productionId, 0), tipo: 'create', datos: aJson(entrada) as unknown as Obj },
  ];
  const noCabe = medirEscrituras(escrituras);
  if (noCabe) return noCabe;

  const salida = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const cero = await tx.get(ref.collection(COLECCION_DE_REVISIONES).doc(idDeRevision(0)));
      const suya = snap.data()?.ownerAccountId === p.accountId;
      const igual = cero.exists && cero.data()?.kind === 'create' && canonico(cero.data()?.snapshot) === canonico(prod);
      return suya && igual ? 'ya_existe' as const : 'ocupado' as const;
    }
    escribir(tx, escrituras);
    return 'creada' as const;
  });
  if (salida === 'ocupado') return rechazo('production_id_taken');
  if (salida === 'ya_existe') {
    const ya = await leerProduccion(p.accountId, productionId, deps);
    return ya.ok ? { ok: true, created: false, view: ya.view } : ya;
  }
  return { ok: true, created: true, view: { productionId, revision: 0, status: 'active', createdAt: p.at, updatedAt: p.at, production: prod } };
};

/* ── Leer y listar ────────────────────────────────────────────────────────── */

/**
 * UNA PRODUCCIÓN, SI ES TUYA: la raíz y sus escenas —como mucho las del límite
 * del dominio, más una para saber si sobra alguna—. Lo de otra cuenta y lo que no
 * existe contestan igual. Una producción de 200 escenas cuesta 201 lecturas.
 */
export const leerProduccion = async (accountId: string, productionId: unknown, deps: DepsDeProducciones = {}): Promise<ResultadoDeLectura> => {
  if (!esIdDeProduccion(productionId) || typeof accountId !== 'string' || !accountId) return noEsta();
  const ref = raizRef(laBase(deps), productionId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.ownerAccountId !== accountId) return noEsta();
  const escenas = await ref.collection(COLECCION_DE_ESCENAS).limit(LIMITES.escenas + 1).get();
  const leida = reunir(productionId, accountId, snap.data(), escenas.docs.map((d) => ({ id: d.id, data: d.data() })));
  return leida.ok ? { ok: true, view: leida.vista } : leida;
};

export interface ConsultaDeProducciones {
  readonly accountId: string;
  readonly status?: unknown;
  readonly limit?: unknown;
  /** El id de la última de la página anterior. */
  readonly after?: unknown;
}

/**
 * LAS PRODUCCIONES DE UNA CUENTA, las más recientes primero y con tope.
 *
 *   where ownerAccountId ==   de quién. Primero, y no negociable.
 *   where status ==           activas o archivadas: siempre una de las dos, para
 *                             que la consulta sea UNA y use UN índice.
 *   orderBy updatedAt desc · limit (≤ 50) · startAfter (el cursor)
 *
 * Solo resúmenes: ni escenas, ni planos, ni prompts.
 */
export const listarProducciones = async (c: ConsultaDeProducciones, deps: DepsDeProducciones = {}): Promise<ResultadoDeListado> => {
  if (typeof c.accountId !== 'string' || !c.accountId) return { ok: true, productions: [] };
  const status = c.status ?? 'active';
  if (!ESTADOS_DE_PRODUCCION.includes(status as EstadoDeProduccion)) return rechazo('list_query_invalid', [problema('list_query_invalid', 'status')]);
  const tope = c.limit ?? LIMITES_DE_PERSISTENCIA.listadoPorDefecto;
  if (!esEntero(tope, 1, LIMITES_DE_PERSISTENCIA.listadoMaximo)) {
    return rechazo('list_query_invalid', [problema('list_query_invalid', 'limit', { max: LIMITES_DE_PERSISTENCIA.listadoMaximo })]);
  }
  const col = laBase(deps).collection(COLECCION_DE_PRODUCCIONES);
  let q = col.where('ownerAccountId', '==', c.accountId).where('status', '==', status).orderBy('updatedAt', 'desc');
  if (c.after !== undefined) {
    if (!esIdDeProduccion(c.after)) return rechazo('list_query_invalid', [problema('list_query_invalid', 'after')]);
    const cursor: DocumentSnapshot = await col.doc(c.after).get();
    const dato = cursor.exists ? cursor.data() : undefined;
    if (!dato || dato.ownerAccountId !== c.accountId || dato.status !== status) return rechazo('list_query_invalid', [problema('list_query_invalid', 'after')]);
    q = q.startAfter(cursor);
  }
  const snap = await q.limit(tope + 1).get();
  const pagina = snap.docs.slice(0, tope);
  const productions = pagina.map((d) => resumir(d.id, d.data(), c.accountId)).filter((x): x is ResumenDeProduccion => x !== null);
  return snap.docs.length > tope ? { ok: true, productions, nextCursor: pagina[pagina.length - 1].id } : { ok: true, productions };
};

/* ── Cambiar: el lote, con CAS ────────────────────────────────────────────── */

export interface PeticionDeAplicacion {
  readonly accountId: string;
  readonly productionId: unknown;
  /** La revisión sobre la que se escribió el lote. Si ya no es la que hay, no se aplica. */
  readonly expectedRevision: unknown;
  readonly operations: unknown;
  readonly operationId?: unknown;
  readonly at: number;
}

const SIN_PENDIENTES: PendingRegeneration = Object.freeze({ scenes: [], shots: [], audio: [], removed: [] });

/**
 * APLICAR UN LOTE DE OPERACIONES A UNA PRODUCCIÓN GUARDADA. Todo o nada.
 *
 * En una transacción: se lee la raíz, el registro de ese `operationId` y las
 * escenas; se comprueba de quién es, si es un reintento, si está archivada y si
 * la revisión es la esperada (CAS); se aplican las operaciones con F1-A y se
 * escribe SOLO lo que cambió —la raíz, las escenas que cambian, las que se
 * quitan— y una entrada nueva del registro. La revisión sube UNA vez por lote:
 * en memoria `aplicarOperaciones` cuenta operaciones; guardada, la revisión
 * cuenta lotes confirmados. Un lote que no cambia nada no escribe ni sube nada.
 */
export const aplicarOperacionesGuardadas = async (p: PeticionDeAplicacion, deps: DepsDeProducciones = {}): Promise<ResultadoDeAplicacion> => {
  if (!esIdDeProduccion(p.productionId) || typeof p.accountId !== 'string' || !p.accountId) return noEsta();
  if (!esEntero(p.expectedRevision, 0, Number.MAX_SAFE_INTEGER)) return rechazo('revision_invalid');
  if (!Array.isArray(p.operations)) return rechazo('operations_invalid', [problema('operations_invalid', 'operations', { reason: 'not_a_list' })]);
  if (!p.operations.length) return rechazo('operations_empty');
  if (p.operations.length > LIMITES_DE_PERSISTENCIA.operacionesPorLote) {
    return rechazo('operations_too_many', [problema('operations_too_many', 'operations', { count: p.operations.length, max: LIMITES_DE_PERSISTENCIA.operacionesPorLote })]);
  }
  if (p.operationId !== undefined && !esIdDeOperacion(p.operationId)) return rechazo('operation_id_invalid');
  let ops: FilmmakerOperation[];
  try { ops = aJson(p.operations) as FilmmakerOperation[]; } catch { return rechazo('operations_invalid', [problema('operations_invalid', 'operations', { reason: 'not_json' })]); }
  const productionId = p.productionId;
  const expected = p.expectedRevision;
  const operationId = (p.operationId as string | undefined) ?? idDerivado({ kind: 'apply', productionId, expectedRevision: expected, operations: ops });
  const db = laBase(deps);
  const ref = raizRef(db, productionId);

  return db.runTransaction(async (tx): Promise<ResultadoDeAplicacion> => {
    const raizSnap = await tx.get(ref);
    if (!raizSnap.exists || raizSnap.data()?.ownerAccountId !== p.accountId) return noEsta();
    const previas = await tx.get(ref.collection(COLECCION_DE_REVISIONES).where('operationId', '==', operationId).limit(1));
    const escenasSnap = await tx.get(ref.collection(COLECCION_DE_ESCENAS).limit(LIMITES.escenas + 1));
    const leida = reunir(productionId, p.accountId, raizSnap.data(), escenasSnap.docs.map((d) => ({ id: d.id, data: d.data() })));
    if (!leida.ok) return leida;
    const vista = leida.vista;

    /* ¿Un reintento? El mismo id con el mismo lote ya se aplicó; con otro lote, el id está gastado. */
    if (!previas.empty) {
      const e = previas.docs[0].data() as RevisionGuardada;
      if (e.kind === 'apply' && canonico(e.operations) === canonico(ops)) {
        return {
          ok: true, view: vista, applied: e.result.applied ?? 0, pending: SIN_PENDIENTES,
          timelineChanged: e.result.timelineChanged === true, operationId, alreadyApplied: true,
        };
      }
      return rechazo('operation_id_reused');
    }
    if (vista.status === 'archived') return rechazo('production_archived');
    if (vista.revision !== expected) {
      return rechazo('revision_conflict', [problema('revision_conflict', 'metadata.revision', { expected, current: vista.revision })], { currentRevision: vista.revision });
    }

    const r = aplicarOperaciones(vista.production, ops);
    if (!r.ok) return rechazo('operations_invalid', r.problems);
    if (r.applied === 0) {
      return { ok: true, view: vista, applied: 0, pending: r.pending, timelineChanged: r.timelineChanged, operationId, alreadyApplied: false };
    }
    const revision = vista.revision + 1;
    const nueva = aJson({ ...r.production, metadata: { ...r.production.metadata, revision } }) as FilmmakerProduction;
    const vetada = await politica(vista.production, nueva, p.accountId, deps);
    if (vetada) return vetada;

    const sobre: SobreDeProduccion = {
      ownerAccountId: p.accountId, status: 'active', createdAt: vista.createdAt, updatedAt: p.at,
    };
    const { raiz, escenas } = partir(nueva, sobre);
    const pesada = pesar(productionId, raiz, escenas);
    if (pesada) return pesada;
    const antes = new Map(vista.production.scenes.map((s) => [s.id, canonico(s)] as [string, string]));
    const escrituras: Escritura[] = [{ ref, ruta: rutaDeRaiz(productionId), tipo: 'set', datos: raiz }];
    for (const s of nueva.scenes) {
      if (antes.get(s.id) === canonico(s)) continue;
      escrituras.push({ ref: ref.collection(COLECCION_DE_ESCENAS).doc(s.id), ruta: rutaDeEscena(productionId, s.id), tipo: 'set', datos: escenas.get(s.id) as Obj });
    }
    const quedan = new Set(nueva.scenes.map((s) => s.id));
    for (const id of antes.keys()) {
      if (!quedan.has(id)) escrituras.push({ ref: ref.collection(COLECCION_DE_ESCENAS).doc(id), ruta: rutaDeEscena(productionId, id), tipo: 'delete' });
    }
    const entrada: RevisionGuardada = {
      productionId, ownerAccountId: p.accountId, revision, kind: 'apply', operationId, actorAccountId: p.accountId,
      createdAt: p.at, modelVersion: FILMMAKER_MODEL_VERSION, operations: ops,
      result: { hash: huella(nueva), scenes: nueva.scenes.length, shots: planosDe(nueva), applied: r.applied, timelineChanged: r.timelineChanged },
    };
    escrituras.push({
      ref: ref.collection(COLECCION_DE_REVISIONES).doc(idDeRevision(revision)), ruta: rutaDeRevision(productionId, revision),
      tipo: 'create', datos: aJson(entrada) as unknown as Obj,
    });
    const noCabe = medirEscrituras(escrituras);
    if (noCabe) return noCabe;

    escribir(tx, escrituras);
    return {
      ok: true,
      view: { productionId, revision, status: 'active', createdAt: vista.createdAt, updatedAt: p.at, production: nueva },
      applied: r.applied, pending: r.pending, timelineChanged: r.timelineChanged, operationId, alreadyApplied: false,
    };
  });
};

/* ── Archivar ─────────────────────────────────────────────────────────────── */

/**
 * ARCHIVAR Y DESARCHIVAR. No se borra nada, y la parte creativa no se toca: la
 * revisión no cambia. Archivada, una producción se lee, se lista entre las
 * archivadas, se duplica y se desarchiva; no se le aplican operaciones.
 * Hacerlo dos veces es un no-op que se dice (`changed: false`).
 */
const cambiarEstado = async (
  accountId: string,
  productionId: unknown,
  destino: EstadoDeProduccion,
  at: number,
  deps: DepsDeProducciones,
): Promise<ResultadoDeArchivo> => {
  if (!esIdDeProduccion(productionId) || typeof accountId !== 'string' || !accountId) return noEsta();
  const db = laBase(deps);
  const ref = raizRef(db, productionId);
  return db.runTransaction(async (tx): Promise<ResultadoDeArchivo> => {
    const snap = await tx.get(ref);
    const raiz = snap.exists ? snap.data() : undefined;
    if (!esObj(raiz) || raiz.ownerAccountId !== accountId) return noEsta();
    const antes = resumir(productionId, raiz, accountId);
    if (!antes) return rechazo('production_corrupted', [problema('production_corrupted', '', { reason: 'summary_invalid' })]);
    if (antes.status === destino) return { ok: true, changed: false, summary: antes };
    const { archivedAt: _fuera, ...resto } = raiz;
    void _fuera;
    const nueva = aJson({ ...resto, status: destino, updatedAt: at, ...(destino === 'archived' ? { archivedAt: at } : {}) }) as Obj;
    tx.set(ref, nueva);
    return { ok: true, changed: true, summary: resumir(productionId, nueva, accountId) as ResumenDeProduccion };
  });
};

export const archivarProduccion = (accountId: string, productionId: unknown, at: number, deps: DepsDeProducciones = {}): Promise<ResultadoDeArchivo> =>
  cambiarEstado(accountId, productionId, 'archived', at, deps);

export const desarchivarProduccion = (accountId: string, productionId: unknown, at: number, deps: DepsDeProducciones = {}): Promise<ResultadoDeArchivo> =>
  cambiarEstado(accountId, productionId, 'active', at, deps);

/* ── Duplicar ─────────────────────────────────────────────────────────────── */

export interface PeticionDeDuplicado {
  readonly accountId: string;
  /** La que se copia. Puede estar archivada: copiarla no la cambia. */
  readonly productionId: unknown;
  /** El id de la copia, generado por el cliente como el de cualquier producción. */
  readonly newProductionId: unknown;
  /** Otro título. Sin él, el de la original: el servidor no inventa frases. */
  readonly title?: unknown;
  readonly operationId?: unknown;
  readonly at: number;
}

/**
 * DUPLICAR. La copia es otra producción de la MISMA cuenta, con otro id, activa y
 * en su revisión 0, que es la foto de la original en ese momento: el registro no
 * se copia, se dice de dónde viene (`source`). No se copian materiales, ni
 * Elements, ni `scenes`/`shots` del Core: las referencias siguen siendo ids.
 * Repetir la misma copia con el mismo id devuelve la que hay (`created: false`).
 */
export const duplicarProduccion = async (p: PeticionDeDuplicado, deps: DepsDeProducciones = {}): Promise<ResultadoDeDuplicado> => {
  if (!esIdDeProduccion(p.productionId) || typeof p.accountId !== 'string' || !p.accountId) return noEsta();
  if (!esIdDeProduccion(p.newProductionId) || p.newProductionId === p.productionId) return rechazo('production_id_invalid');
  if (p.operationId !== undefined && !esIdDeOperacion(p.operationId)) return rechazo('operation_id_invalid');
  const origen = p.productionId;
  const destino = p.newProductionId;
  const operationId = (p.operationId as string | undefined)
    ?? idDerivado({ kind: 'duplicate', productionId: origen, newProductionId: destino, title: p.title ?? null });
  const db = laBase(deps);
  const refDestino = raizRef(db, destino);

  type Salida = { tipo: 'hecha'; resultado: ResultadoDeDuplicado } | { tipo: 'ya_existe'; source: { productionId: string; revision: number } };
  const salida = await db.runTransaction(async (tx): Promise<Salida> => {
    const ya = await tx.get(refDestino);
    if (ya.exists) {
      const cero = await tx.get(refDestino.collection(COLECCION_DE_REVISIONES).doc(idDeRevision(0)));
      const e = cero.exists ? (cero.data() as RevisionGuardada) : undefined;
      const suya = ya.data()?.ownerAccountId === p.accountId;
      if (suya && e?.kind === 'duplicate' && e.source?.productionId === origen) return { tipo: 'ya_existe', source: e.source };
      return { tipo: 'hecha', resultado: rechazo('production_id_taken') };
    }
    const leida = await leerEnTransaccion(tx, db, origen, p.accountId);
    if (!leida.ok) return { tipo: 'hecha', resultado: leida };
    const fuente = leida.vista;
    const copia = aJson({
      ...fuente.production,
      id: destino,
      title: p.title !== undefined ? p.title : fuente.production.title,
      metadata: { ...fuente.production.metadata, revision: 0 },
    }) as FilmmakerProduction;
    const rota = integridad(copia);
    if (rota.length) return { tipo: 'hecha', resultado: rechazo('production_invalid', rota) };
    const vetada = await politica(fuente.production, copia, p.accountId, deps);
    if (vetada) return { tipo: 'hecha', resultado: vetada };

    const source = { productionId: origen, revision: fuente.revision };
    const sobre: SobreDeProduccion = { ownerAccountId: p.accountId, status: 'active', createdAt: p.at, updatedAt: p.at };
    /* Como al crear: la foto de la revisión 0 acota la copia a un documento, así que no hace falta `pesar`. */
    const { raiz, escenas } = partir(copia, sobre);
    const entrada: RevisionGuardada = {
      productionId: destino, ownerAccountId: p.accountId, revision: 0, kind: 'duplicate', operationId, actorAccountId: p.accountId,
      createdAt: p.at, modelVersion: FILMMAKER_MODEL_VERSION, snapshot: copia, source,
      result: { hash: huella(copia), scenes: copia.scenes.length, shots: planosDe(copia) },
    };
    const escrituras: Escritura[] = [
      { ref: refDestino, ruta: rutaDeRaiz(destino), tipo: 'create', datos: raiz },
      ...[...escenas].map(([id, datos]): Escritura => ({ ref: refDestino.collection(COLECCION_DE_ESCENAS).doc(id), ruta: rutaDeEscena(destino, id), tipo: 'create', datos })),
      { ref: refDestino.collection(COLECCION_DE_REVISIONES).doc(idDeRevision(0)), ruta: rutaDeRevision(destino, 0), tipo: 'create', datos: aJson(entrada) as unknown as Obj },
    ];
    const noCabe = medirEscrituras(escrituras);
    if (noCabe) return { tipo: 'hecha', resultado: noCabe };
    escribir(tx, escrituras);
    return {
      tipo: 'hecha',
      resultado: { ok: true, created: true, source, view: { productionId: destino, revision: 0, status: 'active', createdAt: p.at, updatedAt: p.at, production: copia } },
    };
  });
  if (salida.tipo === 'hecha') return salida.resultado;
  const hecha = await leerProduccion(p.accountId, destino, deps);
  return hecha.ok ? { ok: true, created: false, view: hecha.view, source: salida.source } : hecha;
};

/* ── El registro: leerlo y reconstruir ────────────────────────────────────── */

/**
 * EL REGISTRO DE UNA PRODUCCIÓN, en orden. Es la base de «restaurar» (F6), que no
 * se construye aquí. Con tope: un historial más largo que eso tendrá que leerse
 * desde una foto intermedia, que es trabajo de F6.
 */
export const leerRegistro = async (accountId: string, productionId: unknown, deps: DepsDeProducciones = {}): Promise<ResultadoDeRegistro> => {
  if (!esIdDeProduccion(productionId) || typeof accountId !== 'string' || !accountId) return noEsta();
  const ref = raizRef(laBase(deps), productionId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.ownerAccountId !== accountId) return noEsta();
  const max = LIMITES_DE_PERSISTENCIA.revisionesLeidas;
  const filas = await ref.collection(COLECCION_DE_REVISIONES).orderBy('revision').limit(max + 1).get();
  if (filas.docs.length > max) return rechazo('history_too_long', [problema('history_too_long', '', { max })]);
  return { ok: true, entries: filas.docs.map((d) => d.data() as RevisionGuardada) };
};

/**
 * RECONSTRUIR UNA REVISIÓN desde el registro: la foto de la revisión 0 y, uno a
 * uno, los lotes, con las operaciones de F1-A. Puro: no lee ni escribe. Cada paso
 * se compara con la huella que se guardó; si algo no cuadra, el historial está
 * roto y se dice dónde. Es lo que hará posible «restaurar»; restaurar no existe
 * todavía.
 */
export const reconstruirRevision = (entradas: readonly RevisionGuardada[], revision: number): ResultadoDeReconstruccion => {
  const roto = (en: number, motivo: string): Rechazo => rechazo('history_broken', [problema('history_broken', `revisions.${en}`, { reason: motivo })]);
  if (!esEntero(revision, 0, Number.MAX_SAFE_INTEGER)) return rechazo('revision_invalid');
  const porRevision = new Map(entradas.map((e) => [e.revision, e] as [number, RevisionGuardada]));
  const cero = porRevision.get(0);
  if (!cero || (cero.kind !== 'create' && cero.kind !== 'duplicate') || !cero.snapshot) return roto(0, 'no_snapshot');
  let estado = aJson(cero.snapshot);
  if (huella(estado) !== cero.result.hash) return roto(0, 'hash_mismatch');
  for (let k = 1; k <= revision; k++) {
    const e = porRevision.get(k);
    if (!e) return roto(k, 'missing');
    if (e.kind !== 'apply' || !Array.isArray(e.operations)) return roto(k, 'not_a_batch');
    const r = aplicarOperaciones(estado, e.operations);
    if (!r.ok) return roto(k, 'batch_failed');
    estado = aJson({ ...r.production, metadata: { ...r.production.metadata, revision: k } });
    if (huella(estado) !== e.result.hash) return roto(k, 'hash_mismatch');
  }
  return { ok: true, production: estado };
};
