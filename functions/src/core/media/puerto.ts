import { StorageRef } from '../content/asset';
import { WeeError, WeeErrorCode, errorDelCore } from '../errors';

/**
 * WEE MEDIA — EL PUERTO DE ALMACENAMIENTO: BYTES, Y NADA MÁS.
 *
 * ── Qué es, y sobre todo qué NO es ──────────────────────────────────────────
 *
 * Esto guarda bytes en un sitio y los vuelve a encontrar. No sabe qué es un
 * material, ni de quién es, ni qué capacidad lo produjo, ni cuánto costó.
 *
 * Por eso aquí NO hay —y no puede haber— `ownerAccountId`, `entityType`,
 * `projectId`, Credits, capacidades de IA, publicaciones ni contexto de Brain.
 * Todo eso es del Asset Core de la Fase 11, que es el dueño de la identidad.
 * Un puerto de almacenamiento que supiera de cuentas sería un segundo sistema
 * de materiales, y no se va a construir un segundo sistema de nada.
 *
 *     Asset (F11)   →  QUÉ tiene Weë, y de quién es
 *     este puerto   →  DÓNDE están sus bytes
 *
 * ── Qué se implementa hoy, y por qué solo eso ───────────────────────────────
 *
 * Tres operaciones: guardar, mirar si está, y borrar. Son las que hacen falta
 * para que un material exista físicamente y deje de existir. Nada más tiene
 * consumidor todavía.
 *
 * Las que vendrán —traer bytes, copiar, firmar una URL— están declaradas como
 * OPCIONALES a propósito. Un adaptador que no las trae simplemente no las
 * tiene, y quien llame lo ve en el tipo. La alternativa —declararlas
 * obligatorias y que lancen «no implementado»— sería fingir un contrato que no
 * existe, y eso se nota tarde y mal.
 */

/** Lo que un proveedor de almacenamiento sabe hacer. Pequeño a propósito: esto no es un segundo Router. */
export type CapacidadDeAlmacen =
  | 'object.put'
  | 'object.head'
  | 'object.delete'
  /* Declaradas para que el registro pueda describirlas; NO implementadas en MC-1. */
  | 'object.get'
  | 'object.copy'
  | 'object.signedUrl';

/** Las tres que MC-1 implementa de verdad. Lo demás se describe, no se promete. */
export const CAPACIDADES_DE_MC1: readonly CapacidadDeAlmacen[] = Object.freeze([
  'object.put', 'object.head', 'object.delete',
] as const);

/* ── Lo que entra y lo que sale ────────────────────────────────────────────── */

/**
 * GUARDAR. `siNoExiste` es lo que convierte esto en idempotente.
 *
 * Con `siNoExiste: true` el objeto se escribe SOLO si no hay nada en esa clave.
 * No es un invento de Weë: es la operación condicional del propio proveedor
 * (en S3 y en R2, `If-None-Match: *`; en el Storage de Google,
 * `ifGenerationMatch: 0`). Quien llegue segundo recibe `ya_existe` y no pisa
 * nada — que es exactamente lo que hace falta cuando un aviso repetido intenta
 * guardar dos veces el mismo resultado.
 */
export interface PeticionDeGuardado {
  /** Dónde. La clave la DERIVA Weë (`objeto.ts`), nunca la manda un cliente. */
  destino: StorageRef;
  cuerpo: Buffer;
  contentType: string;
  /** Escalares pequeños que el proveedor guarda junto al objeto. Ni secretos, ni contenido de nadie. */
  metadatos?: Readonly<Record<string, string>>;
  /** Escribir solo si la clave está libre. Es lo que hace que repetir no duplique. */
  siNoExiste?: boolean;
}

/** Lo que el almacén dice de un objeto suyo. Sin tipos del SDK de nadie. */
export interface ObjetoGuardado {
  ref: StorageRef;
  bytes: number;
  contentType?: string;
  /**
   * Cómo llama el PROVEEDOR a esta versión del objeto —el `ETag` de S3 y R2—.
   * Es suyo y es opaco: se guarda para poder comprobar que el objeto no ha
   * cambiado, y **no es la identidad de nada en Weë**.
   */
  etiquetaDelProveedor?: string;
  actualizadoEn?: number;
}

export type DesenlaceDeGuardado =
  | { ok: true; objeto: ObjetoGuardado; yaExistia: boolean }
  | { ok: false; error: WeeError };

export type DesenlaceDeLectura =
  | { ok: true; objeto: ObjetoGuardado }
  /* No está. No es un error: es una respuesta. */
  | { ok: false; motivo: 'no_existe' }
  | { ok: false; motivo: 'fallo'; error: WeeError };

/**
 * LO QUE DEVUELVE FIRMAR UNA ENTREGA.
 *
 * `expiraEn` en milisegundos, para que quien llama no tenga que recalcularlo: el
 * adaptador es quien sabe con qué instante firmó, y una diferencia de unos
 * segundos entre lo que se firmó y lo que se promete es una llave que muere
 * antes de lo dicho.
 */
export type DesenlaceDeFirma =
  | { ok: true; url: string; expiraEn: number }
  | { ok: false; error: WeeError };

export type DesenlaceDeBorrado =
  /* `yaNoEstaba` distingue «lo borré» de «no había nada», sin que ninguna de las dos sea un fallo. */
  | { ok: true; yaNoEstaba: boolean }
  | { ok: false; error: WeeError };

/* ── El puerto ─────────────────────────────────────────────────────────────── */

/**
 * LO QUE IMPLEMENTA UN ADAPTADOR DE ALMACENAMIENTO.
 *
 * Un adaptador TRADUCE: convierte esto en lo que su API pide, y su respuesta en
 * esto. No decide dónde se guarda nada, no conoce cuentas y no lanza tipos de
 * su SDK hacia arriba. Todo lo que sepa de su proveedor se queda dentro de él.
 */
export interface PuertoDeAlmacenamiento {
  /** Quién es, para poder comprobar que la referencia le pertenece. */
  readonly providerId: string;
  readonly capacidades: readonly CapacidadDeAlmacen[];

  /**
   * DÓNDE ESCRIBE, dicho por él mismo. `undefined` si su proveedor no usa
   * contenedores, o si todavía no está configurado.
   *
   * Existe para que quien compone pueda saber dónde va a quedar el objeto **sin
   * leer una sola variable de ningún proveedor**. La alternativa —que la capa
   * genérica leyera `R2_BUCKET`— es justo lo que hacía que cambiar de proveedor
   * no fuese cambiar una variable, y por eso esto vive en el puerto.
   */
  readonly contenedor?: string;

  guardar(peticion: PeticionDeGuardado): Promise<DesenlaceDeGuardado>;
  mirar(ref: StorageRef): Promise<DesenlaceDeLectura>;
  borrar(ref: StorageRef): Promise<DesenlaceDeBorrado>;

  /**
   * MC-2 · LA LLAVE TEMPORAL. Opcional porque no todo proveedor sabe firmar:
   * uno que solo guarde bytes es un proveedor perfectamente válido, y decirlo
   * en el tipo es mejor que prometerlo y lanzar «no implementado».
   *
   * Devuelve también CUÁNDO caduca, y no solo la URL. Quien llama tiene que
   * poder decírselo a quien pide sin adivinarlo sumando relojes, y el que sabe
   * de verdad qué instante se firmó es el adaptador.
   */
  urlFirmada?(ref: StorageRef, vigenciaSegundos: number): Promise<DesenlaceDeFirma>;

  /* ── Costuras de fases posteriores. NO implementadas. ───────────────────── */

  /** MC-3: traer los bytes. Hoy nadie los lee por aquí. */
  traer?(ref: StorageRef): Promise<DesenlaceDeLectura & { cuerpo?: Buffer }>;
  /** MC-4: copiar dentro del mismo proveedor, para variantes y versiones. */
  copiar?(origen: StorageRef, destino: StorageRef): Promise<DesenlaceDeGuardado>;
}

/* ── Errores ───────────────────────────────────────────────────────────────── */

/**
 * POCOS, Y ESTABLES. No se traducen treinta códigos de S3 a treinta de Weë:
 * lo que quien llama necesita decidir es si puede reintentar, si es culpa de la
 * petición, o si es del proveedor. Tres preguntas, tres respuestas.
 */
export type MotivoDeAlmacen =
  /* La petición está mal: clave inválida, cuerpo desmedido, tipo que no toca. */
  | 'peticion_invalida'
  /* Las credenciales no valen, o no hay permiso sobre ese contenedor. */
  | 'sin_permiso'
  /* La clave ya está ocupada y se pidió escribir solo si estaba libre. */
  | 'ya_existe'
  /* El proveedor falló y puede que funcione luego. */
  | 'proveedor_no_disponible'
  /* El proveedor contestó algo que no se entiende. */
  | 'respuesta_ilegible'
  /* No está configurado: falta credencial, contenedor o dirección. */
  | 'no_configurado';

/** Un error del almacén, con la forma de error que ya usa todo Weë. */
export const falloDeAlmacen = (
  providerId: string,
  motivo: MotivoDeAlmacen,
  extra: Record<string, unknown> = {},
): WeeError => {
  const codigo: WeeErrorCode = motivo === 'peticion_invalida' ? 'INVALID_REQUEST'
    : motivo === 'sin_permiso' || motivo === 'no_configurado' ? 'PROVIDER_UNAVAILABLE'
      : 'PROVIDER_ERROR';
  return errorDelCore(codigo, `storage:${providerId}`, { details: { reason: motivo, ...extra } });
};
