import { Asset, StorageRef, VariantKind, esStorageRef } from '../content/asset';
import { CONSUMIDORES_DE_MATERIAL, ConsumidorDeMaterial } from '../content/linaje';
import { JobState } from '../job';
import { Huella } from '../moderation';
import {
  ConcesionDeBorrado,
  EstadoDelObjeto,
  FORMA_DE_REFERENCIA_DE_OBJETO,
  FORMA_DE_SEGMENTO,
  MediaObject,
  claveEsDeLaCuenta,
  objetoValidoCon,
  referenciaDelObjeto,
} from './objeto';
import {
  ClaseDeReferencia,
  MotivoDeProteccion,
  POLITICA_DE_RECOLECCION,
  PoliticaDeRecoleccion,
  decidirRecoleccion,
  hayOperacionEnCurso,
} from './recoleccion';

/**
 * H5/H2 · EL ÍNDICE DE REFERENCIAS Y EL CERROJO DEL OBJETO — EL MODELO PURO.
 *
 * ── Los dos problemas, y por qué se resuelven juntos ────────────────────────
 *
 *   H5  retirar un material y crear una versión leían TODAS las fichas de la
 *       cuenta para saber quién más usaba un objeto: el coste crecía con la
 *       cuenta, no con el material.
 *   H2  la comprobación y la escritura iban en pasos separados: una versión
 *       podía quedar viva sobre un objeto ya borrado, una variante se perdía al
 *       retirar, y el barrido podía borrar bytes con una referencia recién
 *       creada.
 *
 * La respuesta es una sola pregunta —«¿quién usa este objeto AHORA?»— con dos
 * piezas que no se separan: el ÍNDICE (una fila por uso, debajo del registro
 * del objeto en `mediaObjects/{objectRef}/referencias/{refId}`) responde con un
 * coste que depende del objeto y no de la cuenta; y el CERROJO (el estado del
 * registro del objeto) hace que toda fila nueva y toda transición escriban el
 * MISMO documento, así que dos operaciones sobre el mismo objeto no pueden
 * ganar a la vez.
 *
 * ── Lo que hay aquí, y lo que no ────────────────────────────────────────────
 *
 * Aquí se decide: la identidad de una fila, qué filas espera una ficha, las
 * transiciones del cerrojo con sus guardas, la cobertura, la lectura de la flag
 * y si unos bytes pueden borrarse físicamente. Nada de esto lee, escribe ni
 * borra: lo ejecuta `content/indice.ts`, dentro de transacciones, y el borrado
 * pasa SIEMPRE por `decidirRecoleccion` (una sola política) y por el cerrojo.
 *
 * Puro como el resto del Core: sin red, sin reloj, sin azar y sin un solo
 * nombre de proveedor. El azar de una concesión y la huella de un objeto los
 * pone quien compone.
 *
 * ── La regla que manda ──────────────────────────────────────────────────────
 *
 * Una referencia desconocida, un error o una consulta que no se pudo hacer no
 * son ausencia de referencias. Cualquier entrada incierta PROTEGE, y la
 * protección dice su motivo.
 */

/* ── 1 · Dónde puede vivir una clave del índice ─────────────────────────────── */

/**
 * EL ESPACIO HEREDADO DEL STORAGE DE WEË. Los materiales de hoy apuntan a
 * `users/<cuenta>/…`; Media Cloud usa `accounts/<cuenta>/…`. El índice cubre los
 * dos, porque las versiones (DEC-03) viven en el primero.
 *
 * Prefijo ENTERO y cuenta con forma estricta: `users/uAnaX/` no es de `uAna`.
 * Que una clave de este espacio sea del Storage de Weë lo garantiza quien
 * registra (`content/indice.ts` solo indexa referencias de ese almacén); aquí se
 * comprueba la forma.
 */
export const RAIZ_DE_USUARIOS = 'users';

export const claveDeUsuarioEsDeLaCuenta = (objectKey: unknown, accountId: unknown): boolean =>
  typeof objectKey === 'string' && typeof accountId === 'string'
  && FORMA_DE_SEGMENTO.test(accountId)
  && objectKey.startsWith(`${RAIZ_DE_USUARIOS}/${accountId}/`)
  && !objectKey.split('/').some((s) => s === '' || s === '.' || s === '..');

/**
 * «CLAVE DENTRO DE LA CUENTA», para el índice. Las dos carpetas y ninguna más.
 * No relaja `claveEsDeLaCuenta`: la usa tal cual para Media Cloud y añade, al
 * lado, la del espacio heredado.
 */
export const claveDelIndiceEsDeLaCuenta = (objectKey: unknown, accountId: unknown): boolean =>
  claveEsDeLaCuenta(objectKey, accountId) || claveDeUsuarioEsDeLaCuenta(objectKey, accountId);

/** La ficha del objeto, válida para el índice: la misma validación del Core con la pregunta del índice. */
export const registroDelIndiceValido = (huella: Huella, o: MediaObject | undefined): boolean =>
  objetoValidoCon(huella, o, claveDelIndiceEsDeLaCuenta);

/** ¿Es de esta cuenta? Lo dice la ficha Y lo respalda su clave. Las dos cosas. */
export const registroEsDeLaCuenta = (o: MediaObject | undefined, accountId: unknown): boolean =>
  !!o && typeof accountId === 'string' && accountId.length > 0
  && o.accountId === accountId && claveDelIndiceEsDeLaCuenta(o.objectKey, accountId);

/* ── 2 · La identidad de una fila ──────────────────────────────────────────── */

/**
 * LA CLASE DE UNA FILA. Es `ClaseDeReferencia` de MC-5, la que ya existía:
 *
 *   material    la pieza original de un material que no es versión
 *   version     la pieza original de una versión (`previousVersionId`)
 *   variante    una pieza derivada: miniatura, póster, vista previa, transcodificada
 *   consumidor  un uso de un consumidor integrado en el índice
 */
export type ClaseDeFila = ClaseDeReferencia;
export const CLASES_DE_FILA: readonly ClaseDeFila[] = Object.freeze(['material', 'variante', 'version', 'consumidor'] as const);

/** La pieza: el original o una de las cuatro variantes que existen (`VariantKind`). Un material tiene como mucho cinco objetos. */
export type PiezaDeFila = 'original' | VariantKind;
export const PIEZAS_DE_FILA: readonly PiezaDeFila[] = Object.freeze(['original', 'thumbnail', 'poster', 'preview', 'transcoded'] as const);

const FORMA_DE_MATERIAL_EN_FILA = /^[A-Za-z0-9_-]{4,128}$/;

/**
 * `refId = <clase>_<assetId>_<pieza>`. DETERMINISTA: repetir una operación
 * escribe la misma fila, así que reintentar no duplica nada. Un material con
 * dos piezas en el mismo objeto produce dos filas, y ninguna lleva clave,
 * dirección ni nombre de nadie.
 *
 * Devuelve `undefined` ante una combinación que no existe: un original como
 * variante, una variante como original, una pieza o una clase inventadas.
 */
export const refIdDeFila = (clase: unknown, assetId: unknown, pieza: unknown): string | undefined => {
  if (typeof clase !== 'string' || !(CLASES_DE_FILA as readonly string[]).includes(clase)) return undefined;
  if (typeof pieza !== 'string' || !(PIEZAS_DE_FILA as readonly string[]).includes(pieza)) return undefined;
  if (typeof assetId !== 'string' || !FORMA_DE_MATERIAL_EN_FILA.test(assetId)) return undefined;
  if ((clase === 'material' || clase === 'version') && pieza !== 'original') return undefined;
  if (clase === 'variante' && pieza === 'original') return undefined;
  return `${clase}_${assetId}_${pieza}`;
};

/** Al revés, y solo si la vuelta da exactamente lo mismo. La clase y la pieza no llevan `_`; el material sí puede. */
export const leerRefIdDeFila = (refId: unknown): { clase: ClaseDeFila; assetId: string; pieza: PiezaDeFila } | undefined => {
  if (typeof refId !== 'string') return undefined;
  const primero = refId.indexOf('_');
  const ultimo = refId.lastIndexOf('_');
  if (primero <= 0 || ultimo <= primero) return undefined;
  const clase = refId.slice(0, primero);
  const assetId = refId.slice(primero + 1, ultimo);
  const pieza = refId.slice(ultimo + 1);
  return refIdDeFila(clase, assetId, pieza) === refId
    ? { clase: clase as ClaseDeFila, assetId, pieza: pieza as PiezaDeFila }
    : undefined;
};

/* ── 3 · La fila ───────────────────────────────────────────────────────────── */

/**
 * UNA FILA DEL ÍNDICE: un uso de un objeto. No se borra nunca: un material
 * retirado deja su fila con `viva: false`, que es el rastro de que lo usó.
 */
export interface FilaDeReferencia {
  refId: string;
  clase: ClaseDeFila;
  assetId: string;
  pieza: PiezaDeFila;
  /** ¿Sigue reclamando los bytes? Solo un material `deleted` deja de hacerlo (los `failed` los conservan: D-F). */
  viva: boolean;
  ownerAccountId: string;
  objectRef: string;
  desdeAt: number;
  actualizadoAt: number;
}

export const filaDeReferenciaValida = (f: unknown): f is FilaDeReferencia => {
  if (!f || typeof f !== 'object') return false;
  const x = f as Record<string, unknown>;
  const leida = leerRefIdDeFila(x.refId);
  if (!leida || leida.clase !== x.clase || leida.assetId !== x.assetId || leida.pieza !== x.pieza) return false;
  if (typeof x.viva !== 'boolean') return false;
  if (typeof x.ownerAccountId !== 'string' || !FORMA_DE_SEGMENTO.test(x.ownerAccountId)) return false;
  if (typeof x.objectRef !== 'string' || !FORMA_DE_REFERENCIA_DE_OBJETO.test(x.objectRef)) return false;
  return Number.isFinite(x.desdeAt) && Number.isFinite(x.actualizadoAt);
};

/* ── 4 · Lo que una ficha espera encontrar en el índice ─────────────────────── */

/** Una fila tal y como la deduce la ficha del material. La migración, la escritura y la reconciliación usan ESTA función. */
export interface FilaEsperada {
  objectRef: string;
  ref: StorageRef;
  refId: string;
  clase: ClaseDeFila;
  pieza: PiezaDeFila;
  assetId: string;
  ownerAccountId: string;
  viva: boolean;
}

/**
 * LAS FILAS QUE UNA FICHA EXIGE. Su objeto original —`material` o `version`,
 * según tenga anterior— y una `variante` por cada derivado. `viva` sale del
 * estado del material (§7.3: todo vive menos `deleted`).
 *
 * `indexable` lo pone quien compone: qué referencias entran en el índice (las de
 * los almacenes de los que Weë puede borrar, dentro de la cuenta). Una que no
 * entra no tiene fila: tampoco se borra nunca desde aquí.
 */
export const filasEsperadasDeLaFicha = (
  huella: Huella,
  ficha: Pick<Asset, 'assetId' | 'ownerAccountId' | 'status' | 'storageRef' | 'variants' | 'previousVersionId'> | undefined,
  indexable: (ref: StorageRef, cuenta: string) => boolean,
): readonly FilaEsperada[] => {
  if (!ficha || typeof ficha !== 'object') return [];
  const assetId = ficha.assetId;
  const cuenta = ficha.ownerAccountId;
  if (typeof assetId !== 'string' || typeof cuenta !== 'string' || !cuenta) return [];
  const viva = ficha.status !== 'deleted';
  const salida = new Map<string, FilaEsperada>();
  const anadir = (ref: unknown, clase: ClaseDeFila, pieza: PiezaDeFila) => {
    if (!esStorageRef(ref) || !indexable(ref, cuenta)) return;
    const objectRef = referenciaDelObjeto(huella, ref);
    const refId = refIdDeFila(clase, assetId, pieza);
    if (!objectRef || !refId) return;
    salida.set(`${objectRef}/${refId}`, { objectRef, ref, refId, clase, pieza, assetId, ownerAccountId: cuenta, viva });
  };
  anadir(ficha.storageRef, ficha.previousVersionId !== undefined ? 'version' : 'material', 'original');
  /* Una variante con una pieza que no existe no tiene fila: `refIdDeFila` la rechaza (y `original` nunca es variante). */
  for (const v of Array.isArray(ficha.variants) ? ficha.variants : []) {
    if (v && typeof v.kind === 'string') anadir(v.storageRef, 'variante', v.kind as PiezaDeFila);
  }
  return [...salida.values()];
};

/* ── 5 · La flag: cerrada por defecto, y si falla, cerrada ─────────────────── */

/** D-I: siete días de gracia para un candidato antes de que el barrido lo reclame. Configurable en la flag. */
export const GRACIA_DE_CANDIDATO_POR_DEFECTO_MS = 7 * 24 * 60 * 60 * 1000;
const GRACIA_MAXIMA_DIAS = 365;
const MAX_CUENTAS_DE_LA_FLAG = 256;

/**
 * `aiSettings/almacenActivos`, leída con desconfianza.
 *
 *   habilitado              boolean; sin él, cerrada
 *   cuentas                 OBLIGATORIA: solo esas cuentas van por el camino
 *                           nuevo. Sin lista, o vacía, no pasa nadie
 *   coberturaDesde          ms; desde cuándo puede valer una cobertura. Sin él,
 *                           ninguna cobertura vale y no se borra nada
 *   graciaDeCandidatoDias   D-I; por defecto siete
 *
 * Un campo conocido con forma rara CIERRA la flag entera: medio entender una
 * configuración que decide borrados es peor que no entenderla. Una clave que no
 * conoce se ignora: nunca abre más de lo que abren las que sí conoce.
 */
export interface FlagDelAlmacenDeActivos {
  habilitado: boolean;
  cuentas: readonly string[];
  coberturaDesde?: number;
  graciaDeCandidatoMs: number;
}

export const FLAG_DEL_ALMACEN_CERRADA: FlagDelAlmacenDeActivos = Object.freeze({
  habilitado: false,
  cuentas: Object.freeze([] as string[]),
  graciaDeCandidatoMs: GRACIA_DE_CANDIDATO_POR_DEFECTO_MS,
});

const propio = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);

export const leerFlagDelAlmacenDeActivos = (crudo: unknown): FlagDelAlmacenDeActivos => {
  if (!crudo || typeof crudo !== 'object' || Array.isArray(crudo)) return FLAG_DEL_ALMACEN_CERRADA;
  const d = crudo as Record<string, unknown>;
  if (typeof d.habilitado !== 'boolean') return FLAG_DEL_ALMACEN_CERRADA;
  if (!Array.isArray(d.cuentas) || d.cuentas.length > MAX_CUENTAS_DE_LA_FLAG) return FLAG_DEL_ALMACEN_CERRADA;
  if (!d.cuentas.every((c) => typeof c === 'string' && FORMA_DE_SEGMENTO.test(c))) return FLAG_DEL_ALMACEN_CERRADA;
  if (propio(d, 'coberturaDesde') && !(typeof d.coberturaDesde === 'number' && Number.isFinite(d.coberturaDesde) && d.coberturaDesde >= 0)) {
    return FLAG_DEL_ALMACEN_CERRADA;
  }
  let gracia = GRACIA_DE_CANDIDATO_POR_DEFECTO_MS;
  if (propio(d, 'graciaDeCandidatoDias')) {
    const dias = d.graciaDeCandidatoDias;
    if (typeof dias !== 'number' || !Number.isFinite(dias) || dias < 0 || dias > GRACIA_MAXIMA_DIAS) return FLAG_DEL_ALMACEN_CERRADA;
    gracia = Math.round(dias * 24 * 60 * 60 * 1000);
  }
  return Object.freeze({
    habilitado: d.habilitado,
    cuentas: Object.freeze([...new Set(d.cuentas as string[])]),
    ...(typeof d.coberturaDesde === 'number' ? { coberturaDesde: d.coberturaDesde } : {}),
    graciaDeCandidatoMs: gracia,
  });
};

/** ¿Va esta cuenta por los caminos nuevos? Solo con la flag habilitada y la cuenta en SU lista, por igualdad exacta. */
export const flagAbiertaPara = (flag: FlagDelAlmacenDeActivos | undefined, cuenta: unknown): boolean =>
  !!flag && flag.habilitado === true && typeof cuenta === 'string' && flag.cuentas.includes(cuenta);

/* ── 6 · La cobertura ─────────────────────────────────────────────────────── */

/**
 * Lo que pueden discrepar el reloj del almacén (nacimiento del objeto) y el de
 * la base de datos (última escritura de la flag). Una cobertura de nacimiento
 * exige nacer DESPUÉS de la marca con este margen.
 */
export const MARGEN_DE_RELOJ_DE_COBERTURA_MS = 5_000;

/**
 * LA MARCA DE COBERTURA: desde cuándo puede valer una cobertura.
 *
 * Es la más tardía entre `coberturaDesde` y la ÚLTIMA ESCRITURA del documento
 * de la flag. Lo segundo es lo que hace imposible olvidarse: cerrar y volver a
 * abrir la flag —o cambiar cualquier cosa de ella— mueve la marca, y toda
 * cobertura anterior deja de valer hasta que una reconciliación completa la
 * vuelva a verificar. Mientras la flag estuvo cerrada, los caminos antiguos
 * pudieron crear referencias sin fila, y eso es exactamente lo que una
 * cobertura vieja no sabría.
 *
 * Sin flag abierta, sin `coberturaDesde` o sin instante de escritura: no hay
 * marca, y sin marca ninguna cobertura vale.
 */
export const marcaDeCobertura = (flag: FlagDelAlmacenDeActivos | undefined, escritaEn: unknown): number | undefined => {
  if (!flag || flag.habilitado !== true) return undefined;
  if (typeof flag.coberturaDesde !== 'number' || !Number.isFinite(flag.coberturaDesde)) return undefined;
  if (typeof escritaEn !== 'number' || !Number.isFinite(escritaEn)) return undefined;
  return Math.max(flag.coberturaDesde, escritaEn);
};

/** ¿Vale la cobertura de este objeto? Solo `completa` y marcada después de la marca vigente. */
export const coberturaVigente = (o: MediaObject | undefined, marca: number | undefined): boolean =>
  !!o && o.cobertura === 'completa'
  && typeof o.coberturaEn === 'number' && Number.isFinite(o.coberturaEn)
  && typeof marca === 'number' && Number.isFinite(marca)
  && o.coberturaEn >= marca;

/**
 * ¿NACE CUBIERTO? Un objeto que nace después de la marca (más el margen de
 * reloj) solo puede haber sido referenciado por los caminos nuevos, que escriben
 * su fila en la misma transacción que la ficha: sus filas son todas sus
 * referencias desde el primer momento. Uno anterior pudo recibir referencias de
 * los caminos antiguos y queda `pendiente` hasta que lo verifique una
 * reconciliación completa.
 */
export const naceCubierto = (creadoEn: unknown, marca: number | undefined): boolean =>
  typeof creadoEn === 'number' && Number.isFinite(creadoEn)
  && typeof marca === 'number' && Number.isFinite(marca)
  && creadoEn >= marca + MARGEN_DE_RELOJ_DE_COBERTURA_MS;

/* ── 7 · El cerrojo: transiciones con guardas ──────────────────────────────── */

/** Lo que quien transiciona dice haber leído. Si no coincide con lo guardado, no se escribe nada. */
export interface EsperadoDelObjeto {
  estado: EstadoDelObjeto;
  version: number;
}

export type FalloDeTransicion =
  | 'registro_invalido'
  | 'estado_inesperado'
  | 'version_inesperada'
  | 'filas_vivas'
  | 'cobertura_incompleta'
  | 'objeto_ausente'
  | 'generacion_distinta'
  | 'concesion_ajena'
  | 'concesion_vigente'
  | 'entrada_invalida';

export type ResultadoDeTransicion =
  | { ok: true; siguiente: MediaObject }
  | { ok: false; fallo: FalloDeTransicion };

/** La versión guardada. Una ficha anterior al índice no la tiene: cuenta como cero. */
export const versionDe = (o: MediaObject | undefined): number => {
  const v = o?.version;
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : 0;
};

const sin = <T extends object>(o: T, ...claves: string[]): T => {
  const copia = { ...o } as Record<string, unknown>;
  for (const k of claves) delete copia[k];
  return copia as T;
};

const comprobar = (o: MediaObject | undefined, esperado: EsperadoDelObjeto | undefined, at: number): FalloDeTransicion | undefined => {
  if (!o || typeof o !== 'object' || typeof o.objectRef !== 'string' || !FORMA_DE_REFERENCIA_DE_OBJETO.test(o.objectRef)) return 'registro_invalido';
  if (!esperado || typeof esperado !== 'object' || !Number.isFinite(at)) return 'entrada_invalida';
  if (o.estado !== esperado.estado) return 'estado_inesperado';
  if (versionDe(o) !== esperado.version) return 'version_inesperada';
  return undefined;
};

const exito = (o: MediaObject, cambios: Partial<MediaObject>, quitar: string[], at: number): ResultadoDeTransicion =>
  ({ ok: true, siguiente: { ...sin(o, ...quitar), ...cambios, version: versionDe(o) + 1, updatedAt: at } });

/** Un número de filas vivas que se pueda creer: entero y no negativo. Cualquier otra cosa es no saber. */
const filasCreibles = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;

const concesionValida = (c: unknown, at: number): c is ConcesionDeBorrado =>
  !!c && typeof c === 'object'
  && typeof (c as ConcesionDeBorrado).id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test((c as ConcesionDeBorrado).id)
  && Number.isFinite((c as ConcesionDeBorrado).hasta) && (c as ConcesionDeBorrado).hasta > at;

/**
 * `guardado → candidato`: ninguna fila viva. Lo hacen la retirada (T1) y la
 * reconciliación. `motivo`, si lo hay, es por qué el borrado queda pendiente.
 */
export const pasarACandidato = (
  o: MediaObject | undefined,
  esperado: EsperadoDelObjeto,
  hechos: { filasVivas: number; at: number; motivo?: string },
): ResultadoDeTransicion => {
  const at = hechos?.at;
  const fallo = comprobar(o, esperado, at);
  if (fallo) return { ok: false, fallo };
  if (o!.estado !== 'guardado') return { ok: false, fallo: 'estado_inesperado' };
  if (!filasCreibles(hechos.filasVivas)) return { ok: false, fallo: 'entrada_invalida' };
  if (hechos.filasVivas > 0) return { ok: false, fallo: 'filas_vivas' };
  return exito(o!, {
    estado: 'candidato',
    candidatoDesde: at,
    ...(hechos.motivo ? { pendiente: { motivo: hechos.motivo, en: at } } : {}),
  }, ['concesion', 'pendiente'], at);
};

/**
 * `candidato → guardado` (RESCATE): alguien vuelve a usar el objeto antes de
 * que se reclame. Exige que el objeto siga ahí y que sea el mismo —la generación
 * registrada—: unos bytes distintos con el mismo nombre no se rescatan.
 */
export const rescatar = (
  o: MediaObject | undefined,
  esperado: EsperadoDelObjeto,
  hechos: { presente: boolean; generacionObservada?: string; at: number },
): ResultadoDeTransicion => {
  const at = hechos?.at;
  const fallo = comprobar(o, esperado, at);
  if (fallo) return { ok: false, fallo };
  if (o!.estado !== 'candidato') return { ok: false, fallo: 'estado_inesperado' };
  if (hechos.presente !== true) return { ok: false, fallo: 'objeto_ausente' };
  if (o!.generacion !== undefined && hechos.generacionObservada !== o!.generacion) return { ok: false, fallo: 'generacion_distinta' };
  const generacion = o!.generacion ?? hechos.generacionObservada;
  return exito(o!, { estado: 'guardado', ...(generacion ? { generacion } : {}) }, ['candidatoDesde', 'concesion', 'pendiente'], at);
};

/**
 * `candidato → borrando` (RECLAMAR), o un `borrando` cuya concesión caducó y se
 * vuelve a reclamar tras revalidar. Ninguna fila viva y cobertura completa,
 * leídas en la MISMA transacción que escribe esto (INV-4).
 */
export const reclamar = (
  o: MediaObject | undefined,
  esperado: EsperadoDelObjeto,
  hechos: { filasVivas: number; coberturaCompleta: boolean; concesion: ConcesionDeBorrado; at: number },
): ResultadoDeTransicion => {
  const at = hechos?.at;
  const fallo = comprobar(o, esperado, at);
  if (fallo) return { ok: false, fallo };
  if (o!.estado === 'borrando') {
    if (o!.concesion && Number.isFinite(o!.concesion.hasta) && o!.concesion.hasta > at) return { ok: false, fallo: 'concesion_vigente' };
  } else if (o!.estado !== 'candidato') {
    return { ok: false, fallo: 'estado_inesperado' };
  }
  if (!concesionValida(hechos.concesion, at)) return { ok: false, fallo: 'entrada_invalida' };
  if (!filasCreibles(hechos.filasVivas)) return { ok: false, fallo: 'entrada_invalida' };
  if (hechos.filasVivas > 0) return { ok: false, fallo: 'filas_vivas' };
  if (hechos.coberturaCompleta !== true) return { ok: false, fallo: 'cobertura_incompleta' };
  return exito(o!, {
    estado: 'borrando',
    concesion: { id: hechos.concesion.id, hasta: hechos.concesion.hasta },
    candidatoDesde: o!.candidatoDesde ?? at,
  }, ['pendiente'], at);
};

/** `borrando → borrado` (CERRAR): borrado confirmado o 404, y SOLO con la concesión propia. */
export const cerrar = (
  o: MediaObject | undefined,
  esperado: EsperadoDelObjeto,
  hechos: { concesionId: string; at: number },
): ResultadoDeTransicion => {
  const at = hechos?.at;
  const fallo = comprobar(o, esperado, at);
  if (fallo) return { ok: false, fallo };
  if (o!.estado !== 'borrando') return { ok: false, fallo: 'estado_inesperado' };
  if (!o!.concesion || typeof hechos.concesionId !== 'string' || o!.concesion.id !== hechos.concesionId) return { ok: false, fallo: 'concesion_ajena' };
  return exito(o!, { estado: 'borrado', deletedAt: at }, ['concesion', 'pendiente'], at);
};

/**
 * `borrando → candidato` (DEVOLVER), con la concesión propia: la generación no
 * era la registrada (412), el proveedor falló, o no se sabe exigir la
 * precondición. Nunca se afirma un borrado que no se confirmó. `contarIntento`
 * suma un intento de MC-5 cuando el que falló fue el proveedor.
 */
export const devolver = (
  o: MediaObject | undefined,
  esperado: EsperadoDelObjeto,
  hechos: { concesionId: string; at: number; motivo: string; contarIntento: boolean },
): ResultadoDeTransicion => {
  const at = hechos?.at;
  const fallo = comprobar(o, esperado, at);
  if (fallo) return { ok: false, fallo };
  if (o!.estado !== 'borrando') return { ok: false, fallo: 'estado_inesperado' };
  if (!o!.concesion || typeof hechos.concesionId !== 'string' || o!.concesion.id !== hechos.concesionId) return { ok: false, fallo: 'concesion_ajena' };
  if (typeof hechos.motivo !== 'string' || !/^[a-z][a-z_]{0,47}$/.test(hechos.motivo)) return { ok: false, fallo: 'entrada_invalida' };
  const intentos = (typeof o!.intentosDeBorrado === 'number' && Number.isInteger(o!.intentosDeBorrado) && o!.intentosDeBorrado >= 0 ? o!.intentosDeBorrado : 0);
  return exito(o!, {
    estado: 'candidato',
    candidatoDesde: o!.candidatoDesde ?? at,
    pendiente: { motivo: hechos.motivo, en: at },
    ...(hechos.contarIntento ? { intentosDeBorrado: intentos + 1, ultimoIntentoDeBorradoEn: at } : {}),
  }, ['concesion'], at);
};

/**
 * ¿SE PUEDE CREAR UNA FILA VIVA SOBRE ESTE OBJETO?
 *
 *   crear_registro   no hay ficha del objeto: se crea, `guardado`
 *   directo          `guardado`
 *   rescatar         `candidato`: primero vuelve a `guardado` (con sus guardas)
 *   no               `borrando` o `borrado`: ninguna fila viva nace sobre bytes que se van
 */
export const comoCrearFilaViva = (o: MediaObject | undefined): 'crear_registro' | 'directo' | 'rescatar' | 'no' => {
  if (!o) return 'crear_registro';
  if (o.estado === 'guardado') return 'directo';
  if (o.estado === 'candidato') return 'rescatar';
  return 'no';
};

/* ── 8 · Quién más puede necesitar los bytes: los consumidores (D-G, D-H) ───── */

/**
 * LOS CONSUMIDORES QUE CONOCE EL ÍNDICE, y si están integrados en él.
 *
 * Los seis del Core (`CONSUMIDORES_DE_MATERIAL`, que usan un material por su id)
 * y los que guardan una dirección o una ruta del almacén (inventario de la línea
 * A2, borrador del 2026-10-08: adjuntos de Weë Brain, avatar, resultados de los
 * trabajos de creación, publicaciones, foto única de WeeTalk y contexto de
 * referencias visuales). NINGUNO está integrado todavía: ninguno escribe filas
 * de clase `consumidor`. Por eso, hoy, su respuesta es «desconocido» y ningún
 * objeto se borra físicamente: es la regla literal de D-G, no un fallo.
 *
 * Integrar uno es escribir su fila en la misma transacción que su uso y poner
 * aquí `integrado: true`. Sin las dos cosas, sigue protegiendo.
 */
export type TipoDeConsumidorDelIndice =
  | ConsumidorDeMaterial
  | 'adjunto_de_brain'
  | 'avatar'
  | 'resultado_de_trabajo'
  | 'publicacion'
  | 'foto_unica'
  | 'contexto_de_referencias';

export interface ConsumidorDelIndice {
  tipo: TipoDeConsumidorDelIndice;
  integrado: boolean;
  /** Cómo apunta: por id de material, por dirección del almacén o por ruta. */
  referencia: 'assetId' | 'direccion' | 'ruta';
}

export const REGISTRO_DE_CONSUMIDORES: readonly ConsumidorDelIndice[] = Object.freeze([
  ...CONSUMIDORES_DE_MATERIAL.map((tipo): ConsumidorDelIndice => ({ tipo, integrado: false, referencia: 'assetId' })),
  { tipo: 'adjunto_de_brain', integrado: false, referencia: 'direccion' },
  { tipo: 'avatar', integrado: false, referencia: 'direccion' },
  { tipo: 'resultado_de_trabajo', integrado: false, referencia: 'direccion' },
  { tipo: 'publicacion', integrado: false, referencia: 'direccion' },
  { tipo: 'foto_unica', integrado: false, referencia: 'ruta' },
  { tipo: 'contexto_de_referencias', integrado: false, referencia: 'assetId' },
] as ConsumidorDelIndice[]);

export type RespuestaDeConsumidor = { tipo: string; estado: 'sin_usos' | 'con_usos' | 'desconocido' };

export type EstadoDeConsumidores =
  | { estado: 'sin_usos' }
  | { estado: 'con_usos'; tipos: readonly string[] }
  | { estado: 'desconocido'; tipos: readonly string[] };

/**
 * RESUMIR LO QUE DIJO CADA CONSUMIDOR. Un tipo sin integrar es `desconocido`
 * diga lo que diga; uno integrado que no contestó, también. `sin_usos` solo si
 * TODOS los del registro son integrados y TODOS contestaron que no.
 */
export const resumirConsumidores = (
  registro: readonly ConsumidorDelIndice[],
  respuestas: readonly RespuestaDeConsumidor[],
): EstadoDeConsumidores => {
  const conUsos: string[] = [];
  const desconocidos: string[] = [];
  for (const c of Array.isArray(registro) ? registro : []) {
    const r = (Array.isArray(respuestas) ? respuestas : []).find((x) => x && x.tipo === c.tipo);
    if (!c.integrado || !r || r.estado === 'desconocido') desconocidos.push(c.tipo);
    else if (r.estado === 'con_usos') conUsos.push(c.tipo);
    else if (r.estado !== 'sin_usos') desconocidos.push(c.tipo);
  }
  if (conUsos.length) return { estado: 'con_usos', tipos: Object.freeze(conUsos) };
  if (desconocidos.length) return { estado: 'desconocido', tipos: Object.freeze(desconocidos) };
  return { estado: 'sin_usos' };
};

/* ── 9 · La decisión de borrado físico ─────────────────────────────────────── */

export type MotivoDeBorradoFisico =
  | MotivoDeProteccion
  | 'fuera_de_su_cuenta'
  | 'estado_no_reclamable'
  | 'concesion_vigente'
  | 'marcado'
  | 'cobertura_incompleta'
  | 'consumidores_activos'
  | 'consumidores_no_verificados'
  | 'operaciones_inciertas'
  | 'sin_generacion'
  | 'generacion_distinta'
  | 'en_gracia';

export interface EntradaDeBorradoFisico {
  objeto: MediaObject | undefined;
  /** La cuenta en cuyo nombre se decide. Del material o del registro guardado; jamás de un cliente. */
  cuenta: string;
  /** La marca vigente (`marcaDeCobertura`). Sin ella no hay cobertura que valga. */
  marcaDeCobertura: number | undefined;
  /** Filas vivas del objeto leídas en la misma transacción. `undefined` = no se pudo saber. */
  filasVivas: number | undefined;
  /** Estados de los trabajos que podrían necesitar los bytes. `undefined` = no hay fuente clara. */
  operaciones: readonly JobState[] | undefined;
  consumidores: EstadoDeConsumidores | undefined;
  /** La generación vista ahora en el almacén, si se miró. Distinta de la registrada: no se borra. */
  generacionObservada?: string;
}

export interface PoliticaDeBorradoFisico {
  /** La política de MC-5, la única. Aquí no se declara otra. */
  recoleccion: PoliticaDeRecoleccion;
  /** D-I: cuánto espera un candidato antes de reclamarse. */
  graciaDeCandidatoMs: number;
}

/** El barrido: los límites de MC-5 tal cual y siete días de gracia para los candidatos. */
export const POLITICA_DEL_BARRIDO_DEL_INDICE: PoliticaDeBorradoFisico = Object.freeze({
  recoleccion: POLITICA_DE_RECOLECCION,
  graciaDeCandidatoMs: GRACIA_DE_CANDIDATO_POR_DEFECTO_MS,
});

/**
 * La retirada (D-A): sin edad mínima ni gracia, porque el cerrojo cierra la
 * carrera que la edad mínima evitaba —las filas se leen en la transacción que
 * reclama—, y la cobertura garantiza que todas las referencias tienen fila. Los
 * intentos y la espera entre intentos de MC-5 siguen valiendo.
 */
export const POLITICA_DEL_BORRADO_INMEDIATO: PoliticaDeBorradoFisico = Object.freeze({
  recoleccion: Object.freeze({ ...POLITICA_DE_RECOLECCION, edadMinimaMs: 0 }),
  graciaDeCandidatoMs: 0,
});

export type DecisionDeBorradoFisico =
  | { borrar: true }
  | { borrar: false; motivo: MotivoDeBorradoFisico };

const proteger = (motivo: MotivoDeBorradoFisico): DecisionDeBorradoFisico => ({ borrar: false, motivo });

/**
 * ¿SE PUEDEN BORRAR ESTOS BYTES? Todo a la vez (§7.11), y lo que protege antes
 * que lo que autoriza:
 *
 *   1. ficha entendible, de la cuenta, y con la clave dentro de la cuenta
 *   2. sin marcas de la reconciliación
 *   3. `candidato`, o `borrando` con la concesión caducada
 *   4. cobertura completa y vigente
 *   5. cero filas vivas, sabido con certeza
 *   6. cero consumidores con usos, ni desconocidos (D-G)
 *   7. cero operaciones en curso, sabido con certeza
 *   8. una generación registrada, y la observada (si se miró) igual a ella
 *   9. la gracia del candidato cumplida (D-I)
 *  10. y la política de MC-5 —edad, intentos, espera—, la única que hay
 */
export const decidirBorradoFisico = (
  entrada: EntradaDeBorradoFisico,
  politica: PoliticaDeBorradoFisico,
  at: number,
): DecisionDeBorradoFisico => {
  const o = entrada?.objeto;
  if (!o || typeof o !== 'object' || !Number.isFinite(at)) return proteger('ficha_invalida');
  if (typeof o.objectRef !== 'string' || !FORMA_DE_REFERENCIA_DE_OBJETO.test(o.objectRef)) return proteger('ficha_invalida');
  if (!politica || typeof politica !== 'object' || !politica.recoleccion) return proteger('ficha_invalida');
  if (!registroEsDeLaCuenta(o, entrada.cuenta)) return proteger('fuera_de_su_cuenta');
  if (Array.isArray(o.marcas) && o.marcas.length > 0) return proteger('marcado');

  if (o.estado === 'borrando') {
    if (!o.concesion || !Number.isFinite(o.concesion.hasta) || o.concesion.hasta > at) return proteger('concesion_vigente');
  } else if (o.estado !== 'candidato') {
    return proteger('estado_no_reclamable');
  }

  if (!coberturaVigente(o, entrada.marcaDeCobertura)) return proteger('cobertura_incompleta');

  if (!filasCreibles(entrada.filasVivas)) return proteger('referencias_inciertas');
  if (entrada.filasVivas > 0) return proteger('referenciado');

  const c = entrada.consumidores;
  if (c && c.estado === 'con_usos') return proteger('consumidores_activos');
  if (!c || c.estado !== 'sin_usos') return proteger('consumidores_no_verificados');

  if (entrada.operaciones === undefined || !Array.isArray(entrada.operaciones)) return proteger('operaciones_inciertas');
  if (hayOperacionEnCurso(entrada.operaciones)) return proteger('operacion_en_curso');

  if (typeof o.generacion !== 'string' || !o.generacion) return proteger('sin_generacion');
  if (entrada.generacionObservada !== undefined && entrada.generacionObservada !== o.generacion) return proteger('generacion_distinta');

  const desde = o.candidatoDesde;
  const gracia = Number.isFinite(politica.graciaDeCandidatoMs) && politica.graciaDeCandidatoMs >= 0
    ? politica.graciaDeCandidatoMs
    : GRACIA_DE_CANDIDATO_POR_DEFECTO_MS;
  if (typeof desde !== 'number' || !Number.isFinite(desde) || at - desde < gracia) return proteger('en_gracia');

  /*
   * LA POLÍTICA ÚNICA. Lo que es un cerrojo (`candidato`, `borrando`) sigue
   * siendo, para MC-5, un objeto con bytes: se le pregunta como `guardado` y
   * sin referencias ni operaciones, porque eso ya se comprobó arriba y con más
   * cuidado. Lo que MC-5 añade —edad mínima, intentos, espera— decide igual que
   * siempre.
   */
  const comun = decidirRecoleccion({
    objeto: { ...o, estado: 'guardado' },
    referencias: [],
    operaciones: entrada.operaciones,
    referenciasCompletas: true,
  }, politica.recoleccion, at);
  if (comun.accion === 'proteger') return proteger(comun.motivo);
  if (comun.accion !== 'borrar') return proteger('ficha_invalida');
  return { borrar: true };
};

/**
 * LA VISTA QUE MC-5 SABE DECIDIR, para el primer filtro del barrido: un
 * `candidato`, o un `borrando` cuya concesión caducó, se le enseña como
 * `guardado`; cualquier otro estado del cerrojo no se puede reclamar ahora y no
 * tiene vista. La decisión que AUTORIZA sigue siendo `decidirBorradoFisico`,
 * dentro de la transacción que reclama.
 */
export const vistaParaElBarrido = (o: MediaObject | undefined, at: number): MediaObject | undefined => {
  if (!o || typeof o !== 'object' || !Number.isFinite(at)) return undefined;
  if (o.estado === 'candidato') return { ...o, estado: 'guardado' };
  if (o.estado === 'borrando' && o.concesion && Number.isFinite(o.concesion.hasta) && o.concesion.hasta <= at) return { ...o, estado: 'guardado' };
  return undefined;
};
