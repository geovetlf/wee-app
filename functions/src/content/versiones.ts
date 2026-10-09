import { createHash } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { materialEsDeLaCuenta } from '../core';
import { direccionDeLaCuenta, storageBucket } from '../engine/http';
import { AssetDoc, crearMaterialDesdeUrl, fichaVivaUsaElObjeto, fichasDeLaCuenta, leerMaterial, PROVEEDOR_WEE, tipoPorMime } from './index';

/**
 * GUARDAR COMO VERSIÓN (DEC-03): un archivo NUEVO del propio usuario que pasa a ser la siguiente versión de un material
 * que ya existe. Sin IA, sin Credits, sin derivación.
 *
 * ── Qué garantiza ──────────────────────────────────────────────────────────────────────────────────────────────────
 *
 *   · Una sola ficha viva por archivo. El identificador de la versión sale del OBJETO (cuenta + clave), no del azar:
 *     dos llamadas concurrentes piden el mismo documento, y `create` (atómico) deja que solo una lo escriba.
 *   · La relación de versión (`previousVersionId`) la fija el servidor, con la creación elegida. Nunca la envía el cliente.
 *   · Una versión no se reutiliza: si el documento de ese archivo está retirado, se responde `archivo_en_uso`.
 *   · Un archivo que pertenece a otra ficha viva no se comparte.
 *
 * Lo que NO hace: no sustituye a la creación normal de materiales (`crearMaterialDesdeUrl`), no deriva (no toca
 * `provenance.sourceAssetIds`) y no infiere parentescos por fechas, nombres ni por la anterior.
 *
 * Sin cupo ni pantalla todavía: no se exporta desde `functions/src/index.ts`. El módulo queda preparado y probado; el
 * export llega con la pantalla y el cupo (decisión de superficie pendiente del dueño; no está registrada en `ops/despliegue/grupos.json`).
 */

/**
 * EL IDENTIFICADOR DE LA VERSIÓN DE UN OBJETO. Es un hash de (cuenta, clave del objeto): a un archivo le corresponde UNA
 * sola versión, y dos llegadas concurrentes piden exactamente el mismo documento. Se hashea un JSON para que la cadena de
 * entrada no admita dos lecturas distintas. Cumple la forma que exige `leerMaterial` (`asset_` + 32 hex).
 */
export const idDeVersionDeObjeto = (cuenta: string, objectKey: string): string =>
  `asset_${createHash('sha256').update(JSON.stringify(['wee-version-v1', cuenta, objectKey])).digest('hex').slice(0, 32)}`;

/*
 * La clase de la versión. Un modelo o un mundo viajan en archivos de cualquier tipo (tipoPorMime deja pasar lo que se
 * declaró), así que aquí se mira lo contrario: un archivo que nombra imagen, vídeo, audio o PDF no es una versión 3D.
 * Un GLB, un OBJ o una malla PLY o Draco en octet-stream sí.
 */
const DE_OTRA_CLASE_3D = /^(image|video|audio)\/|^application\/pdf$/;
const esDeLaClase = (mime: string, kind: AssetDoc['kind']): boolean =>
  kind === 'world' || kind === 'model3d' ? !DE_OTRA_CLASE_3D.test(mime) : tipoPorMime(mime, kind) === kind;

export type ResultadoDeVersion =
  | { status: 'creada'; asset: AssetDoc }
  | { status: 'no_existe' }
  | { status: 'no_lista' }
  | { status: 'archivo_ajeno' }
  | { status: 'archivo_en_uso' }
  | { status: 'clase_distinta' }
  | { status: 'no_creada' };

/**
 * Una versión de `anteriorId` con el archivo de `url`. Idempotente: repetir la misma petición devuelve la misma ficha.
 */
export const crearVersionDeMaterial = async (
  cuenta: string,
  datos: { anteriorId: string; url: string },
): Promise<ResultadoDeVersion> => {
  const anterior = await leerMaterial(datos.anteriorId);
  /* Una creación ajena se trata como si no existiera: no se dice que exista. */
  if (!anterior || !materialEsDeLaCuenta(anterior, cuenta)) return { status: 'no_existe' };
  if (anterior.status !== 'ready') return { status: 'no_lista' };

  /*
   * El archivo: una dirección de Weë, de nuestro cubo y de la carpeta de la cuenta (la regla común para lo que llega de
   * fuera). Lo que se guarda es la dirección REESCRITA desde esas piezas, nunca la que escribió quien llama.
   */
  const direccion = direccionDeLaCuenta(datos.url, cuenta);
  if (!direccion.ok) return { status: 'archivo_ajeno' };
  const objectKey = direccion.path;

  const id = idDeVersionDeObjeto(cuenta, objectKey);
  /* Ninguna ficha es versión de sí misma. Un identificador calculado no puede coincidir con la anterior; se comprueba igual. */
  if (id === anterior.assetId) return { status: 'archivo_en_uso' };

  /*
   * 1) Ya hay una versión de este archivo. La misma anterior: idempotente, la misma ficha. Otra anterior o una versión
   *    retirada: conflicto. Una retirada NO se reutiliza, aunque el objeto siga ahí.
   */
  const existente = await leerMaterial(id);
  if (existente) {
    const misma = existente.status !== 'deleted'
      && existente.previousVersionId === anterior.assetId
      && materialEsDeLaCuenta(existente, cuenta);
    return misma ? { status: 'creada', asset: existente } : { status: 'archivo_en_uso' };
  }

  /* 2) Otra ficha viva usa el objeto: de la cuenta (como archivo o variante) o de otra cuenta (como archivo). No se comparte. */
  const archivo = { provider: PROVEEDOR_WEE, bucket: storageBucket().name, objectKey };
  if (await fichaVivaUsaElObjeto(await fichasDeLaCuenta(cuenta), id, archivo)) return { status: 'archivo_en_uso' };

  /* 3) La metadata del objeto y su clase, antes de crear. */
  let mimeType: string | undefined;
  try {
    const [meta] = await storageBucket().file(objectKey).getMetadata();
    mimeType = typeof meta.contentType === 'string' ? meta.contentType : undefined;
  } catch {
    return { status: 'archivo_ajeno' };
  }
  if (!mimeType || !esDeLaClase(mimeType, anterior.kind)) return { status: 'clase_distinta' };

  /*
   * 4) LA CREACIÓN, ATÓMICA. Con identificador calculado, la creación solo escribe si el documento no existe: de dos
   *    llegadas, una escribe y la otra recibe la que ya estaba. Lo que llega se comprueba otra vez, porque puede ser una
   *    versión de OTRA anterior o una retirada.
   */
  const nueva = await crearMaterialDesdeUrl({
    assetId: id,
    ownerAccountId: cuenta,
    url: direccion.url,
    kind: anterior.kind,
    provenance: { createdAt: Date.now() },
    mimeType,
    previousVersionId: anterior.assetId,
    name: anterior.name,
    derechos: anterior.derechos,
  });
  if (!nueva) {
    /* null: o la escritura falló, o la ficha ya existe de otra cuenta (no debería: el identificador lleva la cuenta). Si hay ficha, no es nuestra: conflicto. */
    return (await leerMaterial(id)) ? { status: 'archivo_en_uso' } : { status: 'no_creada' };
  }
  if (nueva.status === 'deleted' || nueva.previousVersionId !== anterior.assetId) return { status: 'archivo_en_uso' };
  return { status: 'creada', asset: nueva };
};

/**
 * El callable. Lo que trae el cliente es QUÉ creación es la anterior y DÓNDE está el archivo nuevo; QUIÉN lo hace lo pone
 * la sesión. La relación de versión no la envía el cliente: la fija el servidor.
 */
export const guardarComoVersion = onCall({ region: 'us-central1', timeoutSeconds: 60 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  const datos = (request.data || {}) as { anteriorId?: unknown; url?: unknown };
  const anteriorId = typeof datos.anteriorId === 'string' ? datos.anteriorId : '';
  const url = typeof datos.url === 'string' ? datos.url : '';
  if (!anteriorId || !url) throw new HttpsError('invalid-argument', 'Falta algo en tu pedido. Revísalo e inténtalo de nuevo.');
  const resultado = await crearVersionDeMaterial(request.auth.uid, { anteriorId, url });
  switch (resultado.status) {
    case 'creada':
      return { assetId: resultado.asset.assetId, previousVersionId: resultado.asset.previousVersionId };
    case 'no_existe':
      throw new HttpsError('not-found', 'No encontramos esa creación.');
    case 'no_lista':
      throw new HttpsError('failed-precondition', 'Esa creación no está lista para tener versiones.');
    case 'clase_distinta':
      throw new HttpsError('invalid-argument', 'La versión tiene que ser del mismo tipo de material, y el archivo tiene que decir qué tipo es.');
    case 'archivo_en_uso':
      throw new HttpsError('invalid-argument', 'Ese archivo ya es un material tuyo.');
    case 'no_creada':
      /* Fallo transitorio, sin texto para la persona: el cliente lo trata como error interno y puede reintentar. */
      throw new Error('guardarComoVersion: the version could not be written (transient failure)');
    default:
      throw new HttpsError('invalid-argument', 'Ese archivo no está en tu almacén de Weë.');
  }
});
