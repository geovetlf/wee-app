import { randomUUID } from 'crypto';
import { DesenlaceDeMaterializacion, PeticionDeMaterializacion, PuertoDeMaterializacion } from '../runtime/materializacion';
import { downloadUrlFor, extensionFor, fetchBytes, storageBucket } from '../engine/http';
import { ProviderError } from '../engine/http';
import { PROVEEDOR_WEE, anotarVariante, crearMaterialDesdeUrl, crearMaterialDeTexto, leerMaterial } from './index';
import { sanitizeForLog } from '../engine/sanitize';

/**
 * WEË CONTENT — TRAERSE A CASA EL RESULTADO DE UNA TAREA ASÍNCRONA.
 *
 * Esto es lo que implementa el puerto que declara el runtime
 * (`runtime/materializacion.ts`): coge el enlace temporal que devuelve un
 * proveedor, se trae los bytes al Storage de Weë y crea la ficha del material
 * con el contrato de la Fase 11. Ni un sistema de materiales nuevo, ni una
 * colección nueva: la de siempre, con la procedencia puesta.
 *
 * ── Llegar dos veces no puede costar dos veces ──────────────────────────────
 *
 * El mismo desenlace puede llegar tres veces por webhook y una cuarta porque
 * alguien preguntó. Cuatro llegadas no pueden dejar cuatro vídeos, así que
 * TODO aquí es determinista:
 *
 *   la ficha    `assetId` lo calcula quien llama (jobId + attemptId) y se crea
 *               solo si no existe.
 *   el objeto   la ruta se deriva del mismo `assetId`, y se escribe solo si no
 *               existe (`ifGenerationMatch: 0`). Dos llegadas a la vez no
 *               dejan dos objetos, y la que pierde no sobrescribe nada.
 *
 * Sin la segunda, la ruta llevaría la hora y dos llegadas dejarían dos objetos
 * pagados, uno de ellos huérfano para siempre.
 *
 * ── Lo que NO se guarda ─────────────────────────────────────────────────────
 *
 * El enlace del proveedor. Entra por la petición, se usa para descargar y se
 * acaba ahí: no va a la ficha, no va al trabajo, no va a un registro. Va
 * firmado y caduca, así que guardarlo sería dejar una llave puesta que además
 * se rompe sola.
 */

/** Lo más grande que se acepta traer. Un vídeo de 30 s a 1080p no llega a esto. */
export const MAX_BYTES_DE_RESULTADO = 512 * 1024 * 1024;

/** La ruta, derivada de la identidad del material: la misma llegada escribe siempre el mismo sitio. */
export const rutaDelResultado = (userId: string, assetId: string, contentType: string): string =>
  `users/${userId}/ai-generations/${assetId}.${extensionFor(contentType)}`;

/**
 * LA MARCA DE IDENTIDAD DE UN OBJETO QUE GUARDÓ ESTO. Va en los metadatos del
 * objeto, junto a su token, y dice de qué material es. Es lo que permite
 * reconocer después un objeto propio sin volver a descargarlo.
 */
export const MARCA_DE_MATERIAL = 'weeMaterial';

/**
 * ADOPTAR UN OBJETO QUE YA ESTÁ Y NO TIENE FICHA.
 *
 * Pasa cuando una llegada guardó el vídeo y no llegó a crear su ficha —el
 * proceso murió entre las dos cosas, o falló la ficha—. Antes, cada pasada
 * volvía a descargar el vídeo entero, recibía un 412 al guardarlo y se
 * aplazaba para siempre: el trabajo no se cerraba y la reserva seguía retenida.
 *
 * Ahora se busca en SU sitio —la ruta sale de la identidad del material, bajo
 * la carpeta de la cuenta, donde solo escribe el servidor— y solo se adopta si
 * el objeto lleva la marca de ESE material. Se reutilizan el objeto y su token:
 * ni una segunda descarga, ni un segundo objeto, ni otra identidad.
 */
const adoptarObjeto = async (peticion: PeticionDeMaterializacion): Promise<DesenlaceDeMaterializacion | null> => {
  const bucket = storageBucket();
  const prefijo = `users/${peticion.userId}/ai-generations/${peticion.assetId}.`;
  let archivos: { name: string; getMetadata: () => Promise<unknown> }[] = [];
  try {
    [archivos] = await bucket.getFiles({ prefix: prefijo, maxResults: 3 }) as unknown as [typeof archivos];
  } catch {
    return null;
  }
  for (const archivo of archivos ?? []) {
    if (!archivo.name.startsWith(prefijo)) continue;
    let propios: Record<string, unknown> = {};
    try {
      const [meta] = await archivo.getMetadata() as [{ metadata?: Record<string, unknown> }];
      propios = meta?.metadata ?? {};
    } catch {
      continue;
    }
    if (propios[MARCA_DE_MATERIAL] !== peticion.assetId) continue;
    const token = String(propios.firebaseStorageDownloadTokens ?? '').split(',')[0].trim();
    if (!token) continue;
    const material = await crearMaterialDesdeUrl({
      ownerAccountId: peticion.userId,
      assetId: peticion.assetId,
      url: downloadUrlFor(bucket.name, archivo.name, token),
      kind: peticion.kind,
      provenance: peticion.provenance,
      ...(peticion.metadata ? { metadata: peticion.metadata } : {}),
      ...(peticion.derechos ? { derechos: peticion.derechos } : {}),
      ...(peticion.nombre ? { name: peticion.nombre } : {}),
    });
    if (!material) return { ok: false, motivo: 'fallo' };
    return { ok: true, assetId: material.assetId, yaEstaba: material.provenance.createdAt !== peticion.provenance.createdAt };
  }
  return null;
};

const elMaterial: PuertoDeMaterializacion = {
  async guardar(peticion: PeticionDeMaterializacion): Promise<DesenlaceDeMaterializacion> {
    /*
     * ¿YA ESTÁ? Se pregunta ANTES de descargar. Un webhook que se repite tres
     * veces no puede descargar el vídeo tres veces: son tres transferencias de
     * cientos de megas por un resultado que ya estaba en casa.
     */
    const yaEstaba = await leerMaterial(peticion.assetId).catch(() => null);
    if (yaEstaba) {
      /* Existe pero es de otra cuenta: eso es un fallo nuestro, no un acierto. No se toca y no se cierra nada. */
      if (yaEstaba.ownerAccountId !== peticion.userId) return { ok: false, motivo: 'rechazado' };
      return { ok: true, assetId: yaEstaba.assetId, yaEstaba: true };
    }

    /*
     * ── EL TEXTO NO SE DESCARGA: YA ESTÁ AQUÍ ─────────────────────────────
     *
     * Un guion, la descripción de una foto o una búsqueda con fuentes llegan
     * enteros en la respuesta. Subirlos a un almacén para poder volver a
     * leerlos dos segundos después habría sido pagar un objeto, una firma y una
     * descarga por algo que ya estaba en memoria — y todo para que el paso
     * siguiente pudiera leerlo.
     *
     * La Fase 11 ya lo tenía previsto: `materialValido` admite un material de
     * texto SIN referencia de almacén. Aquí solo se usa ese camino.
     */
    if (peticion.contenido !== undefined) {
      const ficha = await crearMaterialDeTexto({
        assetId: peticion.assetId,
        ownerAccountId: peticion.userId,
        contenido: peticion.contenido,
        provenance: peticion.provenance,
        ...(peticion.metadata ? { metadata: peticion.metadata } : {}),
      });
      return ficha ? { ok: true, assetId: ficha.assetId, yaEstaba: false } : { ok: false, motivo: 'rechazado' };
    }
    if (!peticion.recurso) return { ok: false, motivo: 'rechazado' };

    /* ¿EL OBJETO YA ESTÁ, SIN FICHA? Se adopta, sin descargar nada. */
    const adoptado = await adoptarObjeto(peticion);
    if (adoptado) return adoptado;

    let bytes: Buffer;
    let contentType: string;
    try {
      const traido = await fetchBytes(peticion.recurso, { provider: 'materializacion', timeoutMs: 180_000 });
      bytes = traido.buffer;
      contentType = traido.contentType;
    } catch (error) {
      /*
       * Un 403 o un 404 aquí suelen ser el enlace caducado. Se distingue del
       * resto porque volver a intentarlo con ESTE enlace ya no sirve —hay que
       * preguntarle otra vez al proveedor—, pero en ningún caso cierra el
       * trabajo ni devuelve Credits: el vídeo existe del otro lado.
       */
      const status = error instanceof ProviderError ? error.status : undefined;
      return { ok: false, motivo: status === 403 || status === 404 || status === 410 ? 'caducado' : 'no_se_pudo_traer' };
    }
    if (!bytes.length || bytes.length > MAX_BYTES_DE_RESULTADO) return { ok: false, motivo: 'rechazado' };

    const bucket = storageBucket();
    const ruta = rutaDelResultado(peticion.userId, peticion.assetId, contentType);
    const token = randomUUID();
    try {
      await bucket.file(ruta).save(bytes, {
        metadata: { contentType, metadata: { firebaseStorageDownloadTokens: token, [MARCA_DE_MATERIAL]: peticion.assetId } },
        resumable: false,
        /* SOLO SI NO EXISTE. Quien llegue segundo recibe un 412 y no pisa el objeto del primero. */
        preconditionOpts: { ifGenerationMatch: 0 },
      });
    } catch (error) {
      /*
       * Ya había objeto: otra llegada se nos adelantó. Su ficha es la buena —con
       * su token—, así que se lee. Si todavía no la ha creado, esto NO cierra
       * nada: se contesta que no se pudo y se vuelve a intentar más tarde, que
       * es cuando ya estará.
       */
      const status = (error as { code?: number })?.code;
      if (status !== 412) return { ok: false, motivo: 'fallo' };
      const delOtro = await leerMaterial(peticion.assetId).catch(() => null);
      if (delOtro && delOtro.ownerAccountId === peticion.userId) return { ok: true, assetId: delOtro.assetId, yaEstaba: true };
      /* Está el objeto y no su ficha: se adopta el que hay, que es el mismo vídeo. */
      return (await adoptarObjeto(peticion)) ?? { ok: false, motivo: 'fallo' };
    }

    const material = await crearMaterialDesdeUrl({
      ownerAccountId: peticion.userId,
      assetId: peticion.assetId,
      url: downloadUrlFor(bucket.name, ruta, token),
      kind: peticion.kind,
      provenance: peticion.provenance,
      ...(peticion.metadata ? { metadata: peticion.metadata } : {}),
      ...(peticion.derechos ? { derechos: peticion.derechos } : {}),
      ...(peticion.nombre ? { name: peticion.nombre } : {}),
    });
    if (!material) return { ok: false, motivo: 'fallo' };
    /* `create` devuelve la que ya estaba cuando otra llegada ganó: entonces el material es suyo, y está bien. */
    return { ok: true, assetId: material.assetId, yaEstaba: material.provenance.createdAt !== peticion.provenance.createdAt };
  },
};

/** Lo más grande que se acepta como variante: una vista previa o una miniatura, no otro resultado. */
export const MAX_BYTES_DE_VARIANTE = 20 * 1024 * 1024;

/** La ruta de una variante, derivada de la identidad del material y de su clase: cada llegada escribe el mismo sitio. */
export const rutaDeLaVariante = (userId: string, assetId: string, kind: string, contentType: string): string =>
  `users/${userId}/ai-generations/${assetId}-${kind}.${extensionFor(contentType)}`;

/**
 * TRAERSE LAS VARIANTES DEL RESULTADO (la vista previa de un mundo) y anotarlas en SU material.
 *
 * Después del material y nunca en su lugar: una variante que no llega no tumba un resultado bueno —se registra y se
 * sigue, y el material queda sin ella—, una que ya está anotada no se vuelve a descargar, y la ruta sale de la
 * identidad del material (solo si no existe: dos llegadas no dejan dos objetos). No inventa ninguna.
 */
const traerVariantes = async (peticion: PeticionDeMaterializacion, assetId: string): Promise<void> => {
  for (const v of peticion.variantes ?? []) {
    try {
      const actual = await leerMaterial(assetId);
      if (!actual || actual.ownerAccountId !== peticion.userId || actual.variants?.some((x) => x.kind === v.kind)) continue;
      const traido = await fetchBytes(v.recurso, { provider: 'materializacion', timeoutMs: 60_000 });
      if (!traido.buffer.length || traido.buffer.length > MAX_BYTES_DE_VARIANTE) continue;
      const bucket = storageBucket();
      const ruta = rutaDeLaVariante(peticion.userId, assetId, v.kind, traido.contentType);
      try {
        await bucket.file(ruta).save(traido.buffer, {
          metadata: { contentType: traido.contentType, metadata: { [MARCA_DE_MATERIAL]: assetId } },
          resumable: false,
          preconditionOpts: { ifGenerationMatch: 0 },
        });
      } catch (error) {
        /* Ya estaba: otra llegada la guardó en el mismo sitio. Es la misma variante; se anota la que hay. */
        if ((error as { code?: number })?.code !== 412) throw error;
      }
      await anotarVariante(peticion.userId, assetId, {
        kind: v.kind,
        storageRef: { provider: PROVEEDOR_WEE, bucket: bucket.name, objectKey: ruta },
        mimeType: traido.contentType,
        bytes: traido.buffer.length,
      });
    } catch (error) {
      console.warn(`WEË CONTENT: la variante ${v.kind} del material ${assetId} no se pudo traer; el material queda sin ella`, sanitizeForLog(error, 200));
    }
  }
};

/**
 * EL MATERIAL Y, SI LAS HAY, SUS VARIANTES. El material primero —es lo que cierra el trabajo— y las variantes
 * después, con el mismo `assetId`: lo que diga el material es lo que se contesta.
 */
export const materializadorDeWee: PuertoDeMaterializacion = {
  async guardar(peticion: PeticionDeMaterializacion): Promise<DesenlaceDeMaterializacion> {
    const desenlace = await elMaterial.guardar(peticion);
    if (desenlace.ok && peticion.variantes?.length) await traerVariantes(peticion, desenlace.assetId);
    return desenlace;
  },
};
