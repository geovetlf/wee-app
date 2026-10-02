import {
  DesenlaceDeDescripcion,
  DesenlaceDeLecturaHistorica,
  FuenteHistorica,
  HechosDelObjeto,
  StorageRef,
  errorDelCore,
} from '../core';
import { env } from '../engine/http';

/**
 * MC-6 · LA FUENTE HISTÓRICA. El ÚNICO archivo de Weë que sabe qué es esto.
 *
 * ── Qué se puede y qué no, medido, no supuesto ──────────────────────────────
 *
 * Weë **no tiene credencial de administración** de este proveedor: lo que hay
 * en el cliente es un nombre de nube público y un preset de subida sin firmar
 * (`services/cloudinaryService.ts` lo explica). De ahí salen dos consecuencias
 * que mandan sobre todo lo demás:
 *
 *   · **No se puede listar, ni borrar, ni pedir metadatos autoritativos.** Toda
 *     la API de administración está fuera de alcance, y no se va a fingir que
 *     no lo está.
 *   · **Lo que sí se puede es LEER**, porque las URLs de entrega de este
 *     proveedor son públicas por su propio diseño —lo dice ya
 *     `urlDeEntregaDeCloudinary` en la Fase 11—. Pero «se puede en teoría» no
 *     es «se ha comprobado»: mientras nadie lo compruebe de verdad, esto se
 *     declara `UNVERIFIED` y nada lo asciende solo.
 *
 * ── Por qué está apagado ────────────────────────────────────────────────────
 *
 * Sin `MEDIA_LEGACY_CLOUDINARY_CLOUD` configurado, el estado es `DISABLED` y el
 * Core ni lo intenta. No es una precaución decorativa: nombrar la nube es lo que
 * declara CUÁL es la de Weë, y sin esa declaración cualquier referencia con la
 * forma correcta pasaría por propia. Una fuente que sirve la nube de cualquiera
 * es una fuente que copia lo ajeno.
 *
 * ── Y por qué la red se inyecta ─────────────────────────────────────────────
 *
 * `traer` entra por parámetro. Así este archivo no puede llamar a nadie por su
 * cuenta, las pruebas corren sin red por construcción —no por disciplina— y la
 * fase que lo construye no puede ejecutar por accidente la migración que tiene
 * prohibido ejecutar.
 */

/** La misma identidad que ya usa la Fase 11 en `StorageRef.provider`. Hay una prueba que lo ata. */
export const CLOUDINARY_SOURCE_ID = 'cloudinary';

/**
 * La forma del contenedor de este proveedor: `<nube>/<tipo>`. La escribe
 * `referenciaDesdeUrlDeCloudinary` (Fase 11) y aquí solo se lee.
 */
const FORMA_DE_CONTENEDOR = /^([a-z0-9][a-z0-9_-]{1,63})\/(image|video|raw)$/;

/** Lo que hace falta para traer bytes por HTTP. Nada más, y entra de fuera. */
export type TraerPorHttp = (url: string) => Promise<{
  ok: boolean;
  status: number;
  bytes?: number;
  contentType?: string;
  cuerpo?: Buffer;
}>;

export interface OpcionesDeFuenteCloudinary {
  /** La nube de Weë. Sin esto, la fuente está apagada. */
  nube?: string;
  /** Quien sabe hablar HTTP. Sin esto, la fuente está apagada. */
  traer?: TraerPorHttp;
}

/**
 * LA URL DE ENTREGA DE UNA REFERENCIA. Se reconstruye entera porque es pública
 * por diseño de este proveedor —exactamente igual que en la Fase 11, y por eso
 * la forma es la misma—.
 *
 * Devuelve `undefined` en vez de una URL a medias: una referencia cuyo
 * contenedor no tiene la forma de este proveedor no se sirve, y desde luego no
 * se intenta adivinar dónde estaría.
 */
export const urlDeEntrega = (ref: StorageRef, nube: string): string | undefined => {
  const m = FORMA_DE_CONTENEDOR.exec(ref.bucket ?? '');
  if (!m) return undefined;
  const [, suNube, tipo] = m;
  /* La nube tiene que ser LA de Weë. Otra nube con la misma forma es de otro. */
  if (suNube !== nube) return undefined;
  if (typeof ref.objectKey !== 'string' || !ref.objectKey || ref.objectKey.includes('..')) return undefined;
  const version = typeof ref.version === 'string' && /^v\d+$/.test(ref.version) ? `${ref.version}/` : '';
  return `https://res.cloudinary.com/${suNube}/${tipo}/upload/${version}${ref.objectKey}`;
};

const fallo = (motivo: string, status?: number) =>
  errorDelCore('PROVIDER_ERROR', `legacy:${CLOUDINARY_SOURCE_ID}`, {
    details: { reason: motivo, ...(status !== undefined ? { status } : {}) },
  });

const hechosDe = (r: { bytes?: number; contentType?: string }): HechosDelObjeto => ({
  ...(typeof r.bytes === 'number' && Number.isSafeInteger(r.bytes) && r.bytes >= 0 ? { bytes: r.bytes } : {}),
  ...(typeof r.contentType === 'string' && r.contentType ? { contentType: r.contentType } : {}),
  /*
   * NO se rellena `suma`. Este proveedor devuelve un `ETag` opaco en la entrega,
   * y un `ETag` no es una suma declarada: darlo por un MD5 sería una suposición
   * sobre su implementación interna. La verificación baja de nivel, que es la
   * respuesta honesta, en vez de fingir que comprobó una suma.
   */
});

/**
 * LA FUENTE. Apagada mientras no esté configurada, y sin subir de `UNVERIFIED`
 * hasta que una llamada real —que esta fase NO hace— lo justifique.
 */
export const crearFuenteCloudinary = (opciones: OpcionesDeFuenteCloudinary = {}): FuenteHistorica => {
  const nube = opciones.nube ?? env('MEDIA_LEGACY_CLOUDINARY_CLOUD');
  const traer = opciones.traer;
  const configurada = typeof nube === 'string' && !!nube && typeof traer === 'function';

  const resolver = (ref: StorageRef): string | undefined =>
    configurada ? urlDeEntrega(ref, nube as string) : undefined;

  return {
    sourceId: CLOUDINARY_SOURCE_ID,
    /*
     * `UNVERIFIED` es el techo de esta fase: implementado y probado contra una
     * red de mentira, sin una sola llamada real. Ascenderlo a `READY` es una
     * decisión que se toma después de hacer esa llamada, no antes.
     */
    estado: configurada ? 'UNVERIFIED' : 'DISABLED',

    async describir(origen: StorageRef): Promise<DesenlaceDeDescripcion> {
      const url = resolver(origen);
      if (!url) return { ok: false, motivo: 'sin_acceso' };
      try {
        const r = await (traer as TraerPorHttp)(url);
        if (r.status === 404 || r.status === 410) return { ok: false, motivo: 'no_existe' };
        if (r.status === 401 || r.status === 403) return { ok: false, motivo: 'sin_acceso' };
        if (!r.ok) return { ok: false, motivo: 'fallo', error: fallo('respuesta_no_ok', r.status) };
        return { ok: true, hechos: hechosDe(r) };
      } catch {
        /* Nunca el mensaje de la excepción: puede llevar la URL entera dentro. */
        return { ok: false, motivo: 'fallo', error: fallo('sin_red') };
      }
    },

    async leer(origen: StorageRef): Promise<DesenlaceDeLecturaHistorica> {
      const url = resolver(origen);
      if (!url) return { ok: false, motivo: 'sin_acceso' };
      try {
        const r = await (traer as TraerPorHttp)(url);
        if (r.status === 404 || r.status === 410) return { ok: false, motivo: 'no_existe' };
        if (r.status === 401 || r.status === 403) return { ok: false, motivo: 'sin_acceso' };
        if (!r.ok || !r.cuerpo) return { ok: false, motivo: 'fallo', error: fallo('respuesta_no_ok', r.status) };
        return { ok: true, cuerpo: r.cuerpo, hechos: { ...hechosDe(r), bytes: r.cuerpo.length } };
      } catch {
        return { ok: false, motivo: 'fallo', error: fallo('sin_red') };
      }
    },
  };
};
