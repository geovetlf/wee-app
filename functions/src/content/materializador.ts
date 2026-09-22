import { randomUUID } from 'crypto';
import { DesenlaceDeMaterializacion, PeticionDeMaterializacion, PuertoDeMaterializacion } from '../runtime/materializacion';
import { downloadUrlFor, extensionFor, fetchBytes, storageBucket } from '../engine/http';
import { ProviderError } from '../engine/http';
import { crearMaterialDesdeUrl, crearMaterialDeTexto, leerMaterial } from './index';

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

export const materializadorDeWee: PuertoDeMaterializacion = {
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
        metadata: { contentType, metadata: { firebaseStorageDownloadTokens: token } },
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
      return { ok: false, motivo: 'fallo' };
    }

    const material = await crearMaterialDesdeUrl({
      ownerAccountId: peticion.userId,
      assetId: peticion.assetId,
      url: downloadUrlFor(bucket.name, ruta, token),
      kind: peticion.kind,
      provenance: peticion.provenance,
      ...(peticion.metadata ? { metadata: peticion.metadata } : {}),
    });
    if (!material) return { ok: false, motivo: 'fallo' };
    /* `create` devuelve la que ya estaba cuando otra llegada ganó: entonces el material es suyo, y está bien. */
    return { ok: true, assetId: material.assetId, yaEstaba: material.provenance.createdAt !== peticion.provenance.createdAt };
  },
};
