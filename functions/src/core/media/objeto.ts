import { StorageRef, esStorageRef } from '../content/asset';
import { Huella } from '../moderation';

/**
 * WEE MEDIA — DÓNDE SE GUARDA, Y CÓMO SE LLAMA ESO EN WEË.
 *
 * Dos cosas que no son la misma y que aquí quedan separadas para siempre:
 *
 *     ASSET         qué tiene Weë          → identidad de Weë (Fase 11)
 *     MEDIA OBJECT  dónde están sus bytes  → relación física con un proveedor
 *
 * Un material puede cambiar de proveedor sin dejar de ser el mismo material.
 * Un objeto físico puede borrarse sin que el material deje de existir. Por eso
 * son dos fichas y no una, y por eso el identificador del proveedor —su clave,
 * su `ETag`, su URL— **nunca** es la identidad de nada en Weë.
 *
 * Todo lo de este archivo es PURO: sin red, sin Firestore, sin reloj propio y
 * sin ningún proveedor concreto dentro — **ni siquiera criptografía**. La
 * identidad de aquí se deriva de un hash, y el hash lo pone quien llama, por el
 * mismo puerto `Huella` con el que la moderación deduplica un reporte y la
 * copia de seguridad firma una colección. No es purismo: el Core no importa
 * `crypto`, y tener dos maneras distintas de pedir «dame un hash» termina en
 * dos algoritmos distintos.
 */

/* ── 1 · La clave del objeto: aislada por cuenta ───────────────────────────── */

/**
 * EL AISLAMIENTO POR CUENTA, ESCRITO UNA VEZ.
 *
 * Toda clave empieza por la cuenta, y la cuenta sale del material guardado o de
 * la sesión autenticada — **nunca de algo que mande un cliente**. Esto es lo
 * que hace estructuralmente imposible que una cuenta escriba en el sitio de
 * otra: no es una comprobación que alguien pueda olvidarse de hacer, es la
 * forma de la clave.
 *
 *     accounts/<cuenta>/assets/<material>/<pieza>
 *
 * La pieza distingue el original de sus derivados, que llegarán en fases
 * posteriores: `original`, `thumbnail`, `poster`…
 */
export const RAIZ_DE_CUENTAS = 'accounts';

/** Lo que se admite como nombre de cuenta o de material dentro de una clave. Estricto por diseño. */
export const FORMA_DE_SEGMENTO = /^[A-Za-z0-9_-]{1,128}$/;
/** Lo que se admite como nombre de pieza. Minúsculas, para que dos mayúsculas no sean dos objetos. */
export const FORMA_DE_PIEZA = /^[a-z0-9][a-z0-9_-]{0,31}$/;

/** El límite REAL del proveedor: R2 admite claves de hasta 1.024 bytes, igual que exige `esStorageRef`. */
export const MAX_CLAVE = 1024;

export const PIEZA_ORIGINAL = 'original';

/**
 * DE UNA CUENTA Y UN MATERIAL A LA CLAVE DE SU OBJETO. Determinista y pura.
 *
 * Determinista importa: la misma cuenta y el mismo material dan siempre la
 * misma clave, así que guardar dos veces escribe en el mismo sitio en vez de
 * dejar dos objetos pagados. La idempotencia no se inventa después; sale de
 * aquí.
 *
 * Devuelve `undefined` en vez de lanzar, y rechaza cualquier cosa que pudiera
 * salirse de su carpeta: sin puntos, sin barras, sin rutas relativas.
 */
export const claveDelObjeto = (accountId: string, assetId: string, pieza: string = PIEZA_ORIGINAL): string | undefined => {
  if (typeof accountId !== 'string' || !FORMA_DE_SEGMENTO.test(accountId)) return undefined;
  if (typeof assetId !== 'string' || !FORMA_DE_SEGMENTO.test(assetId)) return undefined;
  if (typeof pieza !== 'string' || !FORMA_DE_PIEZA.test(pieza)) return undefined;
  const clave = `${RAIZ_DE_CUENTAS}/${accountId}/assets/${assetId}/${pieza}`;
  return Buffer.byteLength(clave, 'utf8') <= MAX_CLAVE ? clave : undefined;
};

/**
 * ¿ESTA CLAVE ES DE ESTA CUENTA? Prefijo entero, nunca «contiene».
 *
 * `accounts/uAnaX/` no es de `uAna`, y comprobarlo con `includes` o con un
 * `startsWith` sin la barra final sería justo el fallo que deja leer lo ajeno.
 */
/**
 * MC-9 · EL PREFIJO BAJO EL QUE VIVE TODO LO DE UNA CUENTA.
 *
 * Existe para enumerar, y es la única forma en que enumerar es seguro: se
 * deriva de la cuenta igual que la clave, así que no hay manera de pedirle a un
 * proveedor «lístame lo de otro». Un prefijo que llegara de fuera convertiría
 * el mantenimiento en la puerta más barata para leer el inventario ajeno.
 *
 * Devuelve `undefined` en vez de una cadena a medias: sin cuenta válida no hay
 * prefijo, y sin prefijo no se enumera nada.
 */
export const prefijoDeCuenta = (accountId: unknown): string | undefined =>
  typeof accountId === 'string' && FORMA_DE_SEGMENTO.test(accountId)
    ? `${RAIZ_DE_CUENTAS}/${accountId}/`
    : undefined;

export const claveEsDeLaCuenta = (objectKey: unknown, accountId: unknown): boolean =>
  typeof objectKey === 'string' && typeof accountId === 'string'
  && FORMA_DE_SEGMENTO.test(accountId)
  && objectKey.startsWith(`${RAIZ_DE_CUENTAS}/${accountId}/`);

/** La cuenta a la que pertenece una clave, si se puede afirmar. No se adivina: se lee la forma completa. */
export const cuentaDeLaClave = (objectKey: unknown): string | undefined => {
  if (typeof objectKey !== 'string') return undefined;
  const m = objectKey.match(/^accounts\/([A-Za-z0-9_-]{1,128})\/assets\/([A-Za-z0-9_-]{1,128})\/([a-z0-9][a-z0-9_-]{0,31})$/);
  return m ? m[1] : undefined;
};

/* ── 2 · La identidad de la relación física ────────────────────────────────── */

/**
 * EL `objectRef`: CÓMO LLAMA WEË A «ESTOS BYTES EN ESTE SITIO».
 *
 * No es la clave del proveedor, ni su `ETag`, ni su URL. Es una identidad de
 * Weë, y se deriva de dónde está el objeto:
 *
 *     sha256(proveedor, contenedor, clave)
 *
 * Derivarla —en vez de sortearla— tiene una consecuencia que importa: registrar
 * dos veces el mismo objeto físico pide la MISMA ficha, así que la segunda
 * llegada se encuentra la primera en vez de crear una contradicción. La
 * identidad y la idempotencia siguen siendo cosas distintas —la primera es qué
 * es, la segunda es qué pasa al repetir— pero una identidad determinista hace
 * que la segunda salga sola.
 */
export const referenciaDelObjeto = (huella: Huella, ref: StorageRef): string | undefined => {
  if (!esStorageRef(ref)) return undefined;
  const material = `${ref.provider}|${ref.bucket ?? ''}|${ref.objectKey}`;
  const hex = huella(material);
  /* Una huella que no sea hexadecimal y suficientemente larga no produce identidad: se dice que no, no se inventa una. */
  if (typeof hex !== 'string' || !/^[0-9a-f]{32,}$/.test(hex)) return undefined;
  return `mob_${hex.slice(0, 32)}`;
};

export const FORMA_DE_REFERENCIA_DE_OBJETO = /^mob_[0-9a-f]{32}$/;

/* ── 3 · La ficha ─────────────────────────────────────────────────────────── */

/**
 * EN QUÉ ESTADO ESTÁ LA RELACIÓN FÍSICA. Del OBJETO, no del material.
 *
 * Un material puede estar `ready` mientras su objeto está `borrado` —porque se
 * retiró— o al revés. Son dos ciclos y se cuentan por separado: mezclarlos es
 * como se acaba con un archivo que «no se puede borrar porque está publicado».
 */
export type EstadoDelObjeto = 'guardado' | 'borrado';

/**
 * LA FICHA DE UN OBJETO FÍSICO. Lo justo para saber dónde está y de quién es lo
 * que contiene — **no una segunda copia del material**.
 *
 * Aquí NO van: el nombre, las etiquetas, la procedencia, las variantes, el
 * contenido ni nada que ya viva en el Asset. Y nunca, bajo ningún concepto,
 * una credencial, una URL firmada ni bytes.
 */
export interface MediaObject {
  objectRef: string;
  /** De qué proveedor. Texto opaco: el Core no conoce ninguno. */
  providerId: string;
  /** La cuenta dueña. Del material o de la sesión; jamás de lo que mande un cliente. */
  accountId: string;
  /** El material de la Fase 11 cuyos bytes son estos. */
  assetId: string;
  /** Qué pieza es: el original o, más adelante, un derivado. */
  pieza: string;
  bucket?: string;
  objectKey: string;
  /** Cómo llama el proveedor a esta versión. Suyo y opaco; nunca identidad de Weë. */
  etiquetaDelProveedor?: string;
  estado: EstadoDelObjeto;
  bytes?: number;
  contentType?: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  /**
   * MC-5 · CUÁNTAS VECES SE INTENTÓ BORRAR ESTOS BYTES Y FALLÓ.
   *
   * No es un estado nuevo: el objeto sigue `guardado` hasta que deje de estarlo.
   * Es la contabilidad mínima que impide dos cosas opuestas y ambas malas —
   * reintentar en bucle un fallo permanente, y rendirse ante uno pasajero.
   *
   * Sin esto, un objeto que el proveedor no deja borrar se reintentaría en cada
   * barrido, para siempre, convirtiendo una avería suya en una factura nuestra.
   */
  intentosDeBorrado?: number;
  ultimoIntentoDeBorradoEn?: number;
}

/** La referencia del almacén que corresponde a una ficha. La misma forma que usa la Fase 11. */
export const referenciaDeAlmacenDe = (o: MediaObject): StorageRef => ({
  provider: o.providerId,
  ...(o.bucket ? { bucket: o.bucket } : {}),
  objectKey: o.objectKey,
});

/**
 * ¿ESTÁ BIEN FORMADA ESTA FICHA? Comprobación estructural sobre datos ya
 * leídos, igual que hace la Fase 11 con el material: no consulta nada.
 *
 * Lo más importante que comprueba: **que la clave esté dentro de la carpeta de
 * su cuenta**. Una ficha que diga pertenecer a una cuenta y apunte a la carpeta
 * de otra es exactamente el fallo que el aislamiento existe para impedir.
 */
export const objetoValido = (huella: Huella, o: MediaObject | undefined): boolean => {
  if (!o || typeof o !== 'object') return false;
  if (!FORMA_DE_REFERENCIA_DE_OBJETO.test(o.objectRef)) return false;
  if (!esStorageRef(referenciaDeAlmacenDe(o))) return false;
  if (!FORMA_DE_SEGMENTO.test(o.accountId) || !FORMA_DE_SEGMENTO.test(o.assetId)) return false;
  if (!FORMA_DE_PIEZA.test(o.pieza)) return false;
  if (o.estado !== 'guardado' && o.estado !== 'borrado') return false;
  if (!Number.isFinite(o.createdAt) || !Number.isFinite(o.updatedAt)) return false;
  if (o.bytes !== undefined && (!Number.isFinite(o.bytes) || o.bytes < 0)) return false;
  /* La ficha tiene que decir la verdad sobre su propia referencia. */
  if (referenciaDelObjeto(huella, referenciaDeAlmacenDe(o)) !== o.objectRef) return false;
  /* Y la clave tiene que vivir donde dice su cuenta. */
  return claveEsDeLaCuenta(o.objectKey, o.accountId);
};

/** ¿Es de esta cuenta? Estructural, sobre lo ya leído. Un `assetId` que llega de fuera no prueba nada. */
export const objetoEsDeLaCuenta = (o: MediaObject | undefined, accountId: unknown): boolean =>
  !!o && typeof accountId === 'string' && accountId.length > 0
  && o.accountId === accountId && claveEsDeLaCuenta(o.objectKey, accountId);
