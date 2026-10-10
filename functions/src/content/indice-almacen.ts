import { createHash } from 'crypto';
import { Firestore, Transaction } from 'firebase-admin/firestore';
import type { DeleteFileOptions } from '@google-cloud/storage';
import {
  DesenlaceDeBorrado,
  DesenlaceDeLectura,
  EstadoDeConsumidores,
  FilaDeReferencia,
  FilaEsperada,
  FlagDelAlmacenDeActivos,
  Huella,
  JobState,
  MediaObject,
  OpcionesDeBorrado,
  PuertoDeAlmacenamiento,
  REGISTRO_DE_CONSUMIDORES,
  StorageRef,
  esStorageRef,
  falloDeAlmacen,
  leerFlagDelAlmacenDeActivos,
  marcaDeCobertura,
  naceCubierto,
  resumirConsumidores,
} from '../core';
import { nombreDelCuboDeWee, storageBucket } from '../engine/http';

/**
 * H5/H2 · LO QUE COMPARTEN LOS CAMINOS DEL ÍNDICE (`indice.ts`) Y SU
 * RECONCILIACIÓN (`indice-reconciliacion.ts`): dónde vive cada cosa, la flag,
 * el puerto del Storage de Weë con la generación, las dependencias y cómo nacen
 * una fila y un registro. Sin transacciones de negocio: esas viven al lado.
 *
 * Está aparte para que los dos módulos lo usen sin depender el uno del otro.
 */

/* ── 1 · Dónde vive cada cosa ──────────────────────────────────────────────── */

/**
 * LA HUELLA DEL OBJETO: SHA-256 en hexadecimal, sin sal ni versión. Es
 * deliberadamente el MISMO algoritmo que `huellaDeMedios` (`media/huella.ts`) —
 * hay una prueba que lo compara—: el `objectRef` de un objeto tiene que ser el
 * mismo lo registre Media Cloud o el índice, o serían dos registros del mismo
 * objeto. Se declara aquí porque `content/index.ts` no depende de `media/`.
 */
export const huellaDelIndice: Huella = (texto) => createHash('sha256').update(texto, 'utf8').digest('hex');

export const COLECCION_DE_MATERIALES_DEL_INDICE = 'assets';
/** La misma colección que `media/almacen.ts` (`COLECCION_DE_OBJETOS`): un solo registro de objetos, no dos. */
export const COLECCION_DE_OBJETOS_DEL_INDICE = 'mediaObjects';
export const SUBCOLECCION_DE_REFERENCIAS = 'referencias';
export const COLECCION_DE_LA_FLAG_DEL_ALMACEN = 'aiSettings';
export const DOCUMENTO_DE_LA_FLAG_DEL_ALMACEN = 'almacenActivos';

/**
 * Cuánto dura una concesión de borrado. Más que el peor camino conocido entre
 * reclamar y cerrar: `deleteAsset` tiene 60 s. Si caduca, otra ejecución
 * revalida y reclama de nuevo; el cierre de la primera se descarta.
 */
export const DURACION_DE_CONCESION_MS = 120_000;

/** Tope de filas leídas de un objeto cuando se necesitan TODAS. Si se alcanza, no se sabe todo: se protege. */
export const LIMITE_DE_FILAS_DE_UN_OBJETO = 200;

/** Tope de fichas con la misma clave en la consulta exacta de referencias heredadas. Con más, se protege. */
export const LIMITE_DE_FICHAS_POR_CLAVE = 25;

/* Firestore no admite `undefined`: se quitan las claves vacías antes de escribir. */
export const limpiarDelIndice = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o as Record<string, unknown>).filter(([, v]) => v !== undefined)) as T;

export const objetosDelIndice = (db: Firestore) => db.collection(COLECCION_DE_OBJETOS_DEL_INDICE);
export const refDeObjeto = (db: Firestore, objectRef: string) => objetosDelIndice(db).doc(objectRef);
export const refDeFila = (db: Firestore, objectRef: string, refId: string) => refDeObjeto(db, objectRef).collection(SUBCOLECCION_DE_REFERENCIAS).doc(refId);
/** «¿Hay filas vivas?», con el tope EXACTO de la pregunta: las propias más una. No es un límite de volumen. */
export const filasVivasDe = (db: Firestore, objectRef: string, limite: number) =>
  refDeObjeto(db, objectRef).collection(SUBCOLECCION_DE_REFERENCIAS).where('viva', '==', true).limit(Math.max(1, limite));
export const fichasConLaClave = (db: Firestore, objectKey: string) =>
  db.collection(COLECCION_DE_MATERIALES_DEL_INDICE).where('storageRef.objectKey', '==', objectKey).limit(LIMITE_DE_FICHAS_POR_CLAVE);

/** Mismo objeto: mismo proveedor, contenedor y clave (la regla 4 del Core). */
export const mismoObjeto = (a: StorageRef | undefined, b: StorageRef | undefined): boolean =>
  !!a && !!b && a.provider === b.provider && (a.bucket ?? '') === (b.bucket ?? '') && a.objectKey === b.objectKey;

/* ── 2 · La flag: CERRADA por defecto, y si la lectura falla, cerrada ──────── */

export interface FlagLeida {
  config: FlagDelAlmacenDeActivos;
  /** La marca de cobertura vigente (`marcaDeCobertura`). Sin ella, ninguna cobertura vale. */
  marca: number | undefined;
}

const leerSnapDeLaFlag = (snap: { exists: boolean; data: () => unknown; updateTime?: { toMillis: () => number } }): FlagLeida => {
  const config = leerFlagDelAlmacenDeActivos(snap.exists ? snap.data() : undefined);
  const escrita = snap.updateTime && typeof snap.updateTime.toMillis === 'function' ? snap.updateTime.toMillis() : undefined;
  return { config, marca: marcaDeCobertura(config, escrita) };
};

const refDeLaFlag = (db: Firestore) => db.collection(COLECCION_DE_LA_FLAG_DEL_ALMACEN).doc(DOCUMENTO_DE_LA_FLAG_DEL_ALMACEN);

/**
 * LA FLAG, LEÍDA AHORA. Sin caché, a propósito: la cobertura de nacimiento se
 * apoya en que, desde que se abre la flag, ninguna referencia nueva nace por el
 * camino antiguo; una caché de un minuto dejaría un minuto de referencias sin
 * fila. Es una lectura por operación de materiales, no por mensaje.
 *
 * Cualquier fallo —sin conexión, sin documento, un documento que no se
 * entiende— la deja CERRADA: los caminos de siempre.
 */
export const leerFlagDelAlmacen = async (db: Firestore): Promise<FlagLeida> => {
  try {
    return leerSnapDeLaFlag(await refDeLaFlag(db).get());
  } catch (error) {
    console.warn('Content/índice: la flag del almacén no se pudo leer; queda cerrada', error instanceof Error ? error.name : 'error');
    return { config: leerFlagDelAlmacenDeActivos(undefined), marca: undefined };
  }
};

/** La misma flag, DENTRO de una transacción: si alguien la cambia antes de que se confirme, la transacción se repite. */
export const leerFlagEnTransaccion = async (tx: Transaction, db: Firestore): Promise<FlagLeida> =>
  leerSnapDeLaFlag(await tx.get(refDeLaFlag(db)));

/* ── 3 · El puerto del Storage de Weë, con la generación ──────────────────── */

const codigoDe = (e: unknown): unknown => (e as { code?: unknown } | null | undefined)?.code;

/**
 * ¿«NO EXISTE» o «NO SE PUDO»? El Storage contesta 404 cuando el objeto no está;
 * cualquier otra cosa —red, permisos, cuota, 5xx— es un fallo que se puede
 * reintentar y NUNCA prueba que el objeto no esté. Se reconoce también el texto
 * del 404 de Google («No such object»), que es lo que imitan las pruebas.
 */
export const esObjetoAusente = (e: unknown): boolean => {
  const code = codigoDe(e);
  if (code === 404 || code === '404') return true;
  const mensaje = (e as { message?: unknown } | null | undefined)?.message;
  return typeof mensaje === 'string' && /no such object/i.test(mensaje);
};

const esPrecondicion412 = (e: unknown): boolean => {
  const code = codigoDe(e);
  return code === 412 || code === '412';
};

/** Lo que el almacén dice del objeto, en la forma del índice. */
export interface HechosDelObjeto {
  existe: boolean;
  generacion?: string;
  creadoEn?: number;
  bytes?: number;
  contentType?: string;
}

/** De la metadata de Google a los hechos del índice. La generación es opaca: se guarda tal cual, como texto. */
export const hechosDeMetadata = (meta: Record<string, unknown> | undefined): HechosDelObjeto => {
  const generacion = typeof meta?.generation === 'string' || typeof meta?.generation === 'number' ? String(meta.generation) : undefined;
  const creado = typeof meta?.timeCreated === 'string' ? Date.parse(meta.timeCreated) : undefined;
  const tam = typeof meta?.size === 'string' ? Number(meta.size) : typeof meta?.size === 'number' ? meta.size : undefined;
  return limpiarDelIndice({
    existe: true,
    generacion: generacion && generacion.length <= 64 ? generacion : undefined,
    creadoEn: creado !== undefined && Number.isFinite(creado) ? creado : undefined,
    bytes: tam !== undefined && Number.isSafeInteger(tam) ? tam : undefined,
    contentType: typeof meta?.contentType === 'string' ? meta.contentType : undefined,
  });
};

/**
 * ¿VIVE ESTA REFERENCIA EN EL CUBO DE WEË? Una sola regla para el índice y para
 * el camino de siempre (`retirarMaterial`): o no dice cubo —el único contenedor
 * del proveedor— o dice exactamente el configurado (`nombreDelCuboDeWee`). Una
 * referencia que diga OTRO cubo nunca se mira ni se borra por clave en el
 * nuestro, aunque la clave coincida con una nuestra.
 */
export const esDelCuboDeWee = (ref: StorageRef): boolean =>
  ref.bucket === undefined || ref.bucket === nombreDelCuboDeWee();

/**
 * EL STORAGE DE WEË COMO PUERTO DE ALMACENAMIENTO: mirar y borrar, con la
 * generación. No guarda: aquí nadie escribe bytes por este puerto, y decirlo es
 * mejor que fingirlo.
 *
 * Solo toca objetos de SU contenedor: una referencia que diga otro cubo no se
 * borra aquí aunque su clave coincida con una nuestra.
 */
export const puertoDelStorageDeWee = (providerId: string): PuertoDeAlmacenamiento => {
  const deEsteCubo = (ref: StorageRef): boolean =>
    esStorageRef(ref) && ref.provider === providerId && esDelCuboDeWee(ref);
  return {
    providerId,
    capacidades: Object.freeze(['object.head', 'object.delete', 'object.conditionalDelete'] as const),
    async guardar() {
      return { ok: false, error: falloDeAlmacen(providerId, 'no_configurado', { field: 'guardar' }) };
    },
    async mirar(ref: StorageRef): Promise<DesenlaceDeLectura> {
      if (!deEsteCubo(ref)) return { ok: false, motivo: 'fallo', error: falloDeAlmacen(providerId, 'peticion_invalida', { field: 'ref' }) };
      try {
        const [meta] = await storageBucket().file(ref.objectKey).getMetadata();
        const h = hechosDeMetadata(meta as Record<string, unknown>);
        return {
          ok: true,
          objeto: limpiarDelIndice({ ref, bytes: h.bytes ?? 0, contentType: h.contentType, generacion: h.generacion, creadoEn: h.creadoEn }),
        };
      } catch (error) {
        if (esObjetoAusente(error)) return { ok: false, motivo: 'no_existe' };
        return { ok: false, motivo: 'fallo', error: falloDeAlmacen(providerId, 'proveedor_no_disponible') };
      }
    },
    async borrar(ref: StorageRef, opciones?: OpcionesDeBorrado): Promise<DesenlaceDeBorrado> {
      if (!deEsteCubo(ref)) return { ok: false, error: falloDeAlmacen(providerId, 'peticion_invalida', { field: 'ref' }) };
      if (opciones !== undefined && (typeof opciones.generacion !== 'string' || !opciones.generacion)) {
        return { ok: false, error: falloDeAlmacen(providerId, 'peticion_invalida', { field: 'generacion' }) };
      }
      try {
        const precondicion = opciones ? ({ ifGenerationMatch: opciones.generacion } as unknown as DeleteFileOptions) : undefined;
        await storageBucket().file(ref.objectKey).delete(precondicion);
        return { ok: true, yaNoEstaba: false };
      } catch (error) {
        if (esObjetoAusente(error)) return { ok: true, yaNoEstaba: true };
        if (esPrecondicion412(error)) return { ok: false, error: falloDeAlmacen(providerId, 'precondicion_fallida') };
        return { ok: false, error: falloDeAlmacen(providerId, 'proveedor_no_disponible') };
      }
    },
  };
};

/* ── 4 · Lo que necesita el índice para trabajar ──────────────────────────── */

/**
 * LAS DEPENDENCIAS, inyectadas: Firestore, la huella del objeto, qué referencias
 * entran en el índice, los almacenes que saben borrar con generación, y las dos
 * preguntas que hoy NO tienen fuente clara —consumidores y operaciones—, cuya
 * respuesta de producción es «no se sabe» y por tanto protege.
 */
export interface DepsDelIndice {
  db: Firestore;
  huella: Huella;
  indexable: (ref: StorageRef, cuenta: string) => boolean;
  almacenes: Readonly<Record<string, PuertoDeAlmacenamiento>>;
  consumidores: (objeto: MediaObject, assetIds: readonly string[]) => Promise<EstadoDeConsumidores>;
  operaciones: (objeto: MediaObject) => Promise<readonly JobState[] | undefined>;
  ahora: () => number;
  /** El identificador de una concesión: azar de quien compone. */
  sortear: () => string;
  duracionDeConcesionMs?: number;
}

/** Los consumidores de producción: el registro del Core, sin ninguno integrado. Contesta «desconocido» y protege (D-G). */
export const consumidoresDeProduccion = async (): Promise<EstadoDeConsumidores> =>
  resumirConsumidores(REGISTRO_DE_CONSUMIDORES, []);

/** Las operaciones de producción: no hay una fuente clara de trabajos por objeto. «No se sabe», y protege. */
export const operacionesDeProduccion = async (): Promise<readonly JobState[] | undefined> => undefined;

/** Una fila nueva, deducida de lo que exige la ficha. */
export const filaNueva = (e: FilaEsperada, viva: boolean, at: number, desde?: number): FilaDeReferencia => ({
  refId: e.refId,
  clase: e.clase,
  assetId: e.assetId,
  pieza: e.pieza,
  viva,
  ownerAccountId: e.ownerAccountId,
  objectRef: e.objectRef,
  desdeAt: typeof desde === 'number' && Number.isFinite(desde) ? desde : at,
  actualizadoAt: at,
});

/**
 * EL REGISTRO DE UN OBJETO QUE EL ÍNDICE VE POR PRIMERA VEZ. Nace `guardado`,
 * con la generación que se acaba de ver, y con cobertura SOLO si nació después
 * de la marca (`naceCubierto`): uno anterior pudo recibir referencias sin fila.
 */
export const registroNuevo = (
  e: FilaEsperada,
  hechos: HechosDelObjeto | undefined,
  marca: number | undefined,
  at: number,
): MediaObject => {
  const cubierto = hechos?.existe === true && naceCubierto(hechos.creadoEn, marca);
  return limpiarDelIndice({
    objectRef: e.objectRef,
    providerId: e.ref.provider,
    accountId: e.ownerAccountId,
    assetId: e.assetId,
    pieza: e.pieza,
    bucket: e.ref.bucket,
    objectKey: e.ref.objectKey,
    estado: 'guardado' as const,
    bytes: hechos?.bytes,
    contentType: hechos?.contentType,
    createdAt: at,
    updatedAt: at,
    version: 0,
    generacion: hechos?.generacion,
    cobertura: cubierto ? 'completa' as const : 'pendiente' as const,
    coberturaEn: cubierto ? at : undefined,
    coberturaOrigen: cubierto ? 'nacimiento' as const : undefined,
  });
};
