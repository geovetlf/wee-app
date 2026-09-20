import {
  CapacidadDeAlmacen,
  CAPACIDADES_DE_MC1,
  DesenlaceDeBorrado,
  DesenlaceDeGuardado,
  DesenlaceDeLectura,
  DescriptorDeProveedorDeMedios,
  PeticionDeGuardado,
  PuertoDeAlmacenamiento,
  StorageRef,
  esStorageRef,
  falloDeAlmacen,
} from '../core';
import { env } from '../engine/http';
import { firmar, rutaCanonicaDeObjeto } from './firma';

/**
 * CLOUDFLARE R2 — EL ÚNICO ARCHIVO DE WEË QUE SABE QUE R2 EXISTE.
 *
 * Aquí termina el nombre «R2». Ni el Core, ni la Fase 11, ni la UI, ni Social,
 * ni Studio, ni Brain lo conocen: piden guardar bytes por el puerto y esto los
 * traduce. El día que se cambie por otro proveedor, se cambia este archivo y
 * nadie más se entera — que es la razón de ser de MC-1.
 *
 * ── Lo verificado en la documentación oficial (2026-09-20) ──────────────────
 *
 * De `developers.cloudflare.com/r2/api/s3/api/` y `/r2/platform/limits/`:
 *
 *   · dirección      `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
 *   · región         `auto` (vacío y `us-east-1` son alias de ella)
 *   · compatibilidad API de S3, con firma SigV4
 *   · `PutObject`    implementado, **con operaciones condicionales**:
 *                    `If-Match`, `If-None-Match`, `If-Modified-Since`,
 *                    `If-Unmodified-Since`
 *   · `HeadObject`   implementado, con condicionales
 *   · `DeleteObject` implementado
 *   · `GetObject` y `CopyObject` implementados — no se usan en MC-1
 *   · clave          hasta 1.024 bytes
 *   · metadatos      hasta 8.192 bytes
 *   · objeto         hasta 5 TiB; subida simple hasta 5 GiB
 *   · escrituras concurrentes sobre la MISMA clave: 1 por segundo
 *
 * Ese `If-None-Match` es lo que hace que guardar sea idempotente de verdad:
 * `If-None-Match: *` escribe solo si la clave está libre, y quien llega segundo
 * recibe un 412 en vez de pisar el objeto del primero. No es un invento de Weë,
 * es la operación condicional del proveedor.
 *
 * ── Lo que este adaptador NO hace ───────────────────────────────────────────
 *
 * No elige dónde se guarda nada —eso lo deriva el Core—, no sabe de cuentas, no
 * devuelve tipos de ningún SDK hacia arriba, y no registra jamás una
 * credencial, una firma ni una cabecera de autorización.
 */

export const R2_PROVIDER_ID = 'r2';

/** Lo que hay que tener configurado. Son NOMBRES de variables; los valores viven en Secret Manager. */
export const R2_ENV = Object.freeze({
  accountId: 'R2_ACCOUNT_ID',
  accessKeyId: 'R2_ACCESS_KEY_ID',
  secretAccessKey: 'R2_SECRET_ACCESS_KEY',
  bucket: 'R2_BUCKET',
} as const);

/** La región de R2 en la API de S3. La documentación dice `auto`, y no se inventa otra. */
export const R2_REGION = 'auto';

/** El descriptor para el registro. Sin una sola credencial dentro. */
export const DESCRIPTOR_DE_R2: DescriptorDeProveedorDeMedios = Object.freeze({
  id: R2_PROVIDER_ID,
  name: 'Cloudflare R2',
  /*
   * UNVERIFIED, y es lo honesto: el adaptador está implementado y probado
   * contra su contrato, pero ninguna llamada real ha llegado a R2 todavía.
   * Pasa a READY el día que un canary autorizado lo confirme, no antes.
   */
  estado: 'UNVERIFIED',
  capacidades: CAPACIDADES_DE_MC1,
  regiones: Object.freeze([R2_REGION]),
  credencialesEnv: Object.freeze([R2_ENV.accountId, R2_ENV.accessKeyId, R2_ENV.secretAccessKey, R2_ENV.bucket]),
  docsUrl: 'https://developers.cloudflare.com/r2/api/s3/api/',
  limites: Object.freeze({
    maxBytesPorObjeto: 5 * 1024 ** 4,
    maxBytesDeUnaSubida: 5 * 1024 ** 3,
    maxLargoDeClave: 1024,
    maxBytesDeMetadatos: 8192,
  }),
});

export interface ConfiguracionDeR2 {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

/** ¿Está configurado? Se mira la FORMA, nunca se registra el valor. */
export const configuracionDeR2Valida = (c: Partial<ConfiguracionDeR2> | undefined): c is ConfiguracionDeR2 =>
  !!c && typeof c.accountId === 'string' && /^[a-f0-9]{32}$/i.test(c.accountId)
  && typeof c.accessKeyId === 'string' && c.accessKeyId.length > 0
  && typeof c.secretAccessKey === 'string' && c.secretAccessKey.length > 0
  && typeof c.bucket === 'string' && /^[a-z0-9][a-z0-9-]{1,62}$/.test(c.bucket);

export const anfitrionDeR2 = (accountId: string): string => `${accountId}.r2.cloudflarestorage.com`;

/**
 * SU PROPIA CONFIGURACIÓN, LEÍDA AQUÍ.
 *
 * Vive en este archivo y no en la composición a propósito: la capa genérica de
 * medios no tiene por qué saber que existe un `R2_BUCKET`. Antes lo sabía —lo
 * leía dentro de `guardarMaterial`— y eso hacía que cambiar de proveedor no
 * fuese de verdad cambiar una variable. Sale por el mismo camino que el resto
 * de Weë (`env`), y los VALORES no salen nunca de aquí.
 */
export const configuracionDeR2 = (): Partial<ConfiguracionDeR2> => ({
  accountId: env(R2_ENV.accountId),
  accessKeyId: env(R2_ENV.accessKeyId),
  secretAccessKey: env(R2_ENV.secretAccessKey),
  bucket: env(R2_ENV.bucket),
});

export interface DepsDeR2 {
  /** Solo para pruebas. Sin esto, el adaptador lee la suya. */
  config?: () => Partial<ConfiguracionDeR2> | undefined;
  /** Entra por la puerta para poder probar el adaptador entero sin red. */
  fetch?: typeof fetch;
  ahora?: () => number;
}

/**
 * DE LA RESPUESTA DE R2 A UN MOTIVO DE WEË. Pocos y estables.
 *
 * No se traducen treinta códigos: lo que quien llama necesita decidir es si la
 * petición estaba mal, si no hay permiso, si la clave ya estaba, o si es del
 * proveedor y puede reintentarse.
 */
const motivoDe = (status: number) =>
  status === 403 || status === 401 ? 'sin_permiso' as const
    : status === 412 || status === 409 ? 'ya_existe' as const
      : status === 400 || status === 411 || status === 416 ? 'peticion_invalida' as const
        : 'proveedor_no_disponible' as const;

export const crearAdaptadorDeR2 = (deps: DepsDeR2 = {}): PuertoDeAlmacenamiento => {
  const llamar = deps.fetch ?? fetch;
  const ahora = deps.ahora ?? (() => Date.now());
  const config = deps.config ?? configuracionDeR2;

  /** Comprueba configuración y que la referencia sea de ESTE proveedor y ESTE contenedor. */
  const preparar = (ref: StorageRef) => {
    const c = config();
    if (!configuracionDeR2Valida(c)) return { ok: false as const, error: falloDeAlmacen(R2_PROVIDER_ID, 'no_configurado') };
    if (!esStorageRef(ref) || ref.provider !== R2_PROVIDER_ID) {
      return { ok: false as const, error: falloDeAlmacen(R2_PROVIDER_ID, 'peticion_invalida', { field: 'destino.provider' }) };
    }
    /* Una referencia a otro contenedor no se atiende: el adaptador sirve al suyo. */
    if (ref.bucket !== undefined && ref.bucket !== c.bucket) {
      return { ok: false as const, error: falloDeAlmacen(R2_PROVIDER_ID, 'peticion_invalida', { field: 'destino.bucket' }) };
    }
    /*
     * LA RUTA, UNA SOLA VEZ. La misma cadena se firma y se envía, así que no
     * hay forma de que difieran. Si la clave no se puede transmitir con
     * fidelidad, no se llama a nadie: se dice que la petición es inválida.
     */
    const ruta = rutaCanonicaDeObjeto(c.bucket, ref.objectKey);
    if (!ruta) return { ok: false as const, error: falloDeAlmacen(R2_PROVIDER_ID, 'peticion_invalida', { field: 'destino.objectKey' }) };
    return { ok: true as const, config: c, host: anfitrionDeR2(c.accountId), ruta };
  };

  const etiqueta = (r: Response): string | undefined => r.headers.get('etag')?.replace(/^"|"$/g, '') || undefined;

  return {
    providerId: R2_PROVIDER_ID,
    capacidades: CAPACIDADES_DE_MC1,

    /**
     * EL CONTENEDOR LO DICE ÉL, no quien llama. Es la costura por la que la
     * capa genérica sabe dónde va a quedar el objeto sin conocer una sola
     * variable de R2. `undefined` mientras no esté configurado.
     */
    get contenedor(): string | undefined {
      const c = config();
      return configuracionDeR2Valida(c) ? c.bucket : undefined;
    },

    async guardar(peticion: PeticionDeGuardado): Promise<DesenlaceDeGuardado> {
      const p = preparar(peticion.destino);
      if (!p.ok) return { ok: false, error: p.error };
      if (!Buffer.isBuffer(peticion.cuerpo) || !peticion.cuerpo.length) {
        return { ok: false, error: falloDeAlmacen(R2_PROVIDER_ID, 'peticion_invalida', { field: 'cuerpo' }) };
      }
      if (peticion.cuerpo.length > (DESCRIPTOR_DE_R2.limites?.maxBytesDeUnaSubida ?? 0)) {
        return { ok: false, error: falloDeAlmacen(R2_PROVIDER_ID, 'peticion_invalida', { field: 'cuerpo', reason_detail: 'supera la subida simple' }) };
      }

      /* Los metadatos del proveedor van con su prefijo, y solo escalares cortos. */
      const metadatos = Object.fromEntries(
        Object.entries(peticion.metadatos ?? {}).map(([k, v]) => [`x-amz-meta-${k.toLowerCase()}`, String(v).slice(0, 256)]),
      );

      const cabeceras = firmar({
        metodo: 'PUT',
        host: p.host,
        ruta: p.ruta,
        cuerpo: peticion.cuerpo,
        cabeceras: {
          'content-type': peticion.contentType || 'application/octet-stream',
          'content-length': String(peticion.cuerpo.length),
          /* LO QUE HACE IDEMPOTENTE EL GUARDADO: escribir solo si la clave está libre. */
          ...(peticion.siNoExiste ? { 'if-none-match': '*' } : {}),
          ...metadatos,
        },
      }, { ...p.config, region: R2_REGION, servicio: 's3' }, ahora());

      try {
        const r = await llamar(`https://${p.host}${p.ruta}`, { method: 'PUT', headers: cabeceras, body: new Uint8Array(peticion.cuerpo) });
        if (r.ok) {
          return {
            ok: true,
            yaExistia: false,
            objeto: { ref: peticion.destino, bytes: peticion.cuerpo.length, contentType: peticion.contentType, ...(etiqueta(r) ? { etiquetaDelProveedor: etiqueta(r) } : {}), actualizadoEn: ahora() },
          };
        }
        /*
         * 412 con `If-None-Match: *` NO es un fallo: es la respuesta correcta a
         * «solo si está libre» cuando no lo está. Quien llamó ya tiene lo que
         * quería —el objeto está— y no ha pisado nada.
         */
        if (r.status === 412 && peticion.siNoExiste) {
          const yaEsta = await this.mirar(peticion.destino);
          return yaEsta.ok
            ? { ok: true, yaExistia: true, objeto: yaEsta.objeto }
            : { ok: false, error: falloDeAlmacen(R2_PROVIDER_ID, 'ya_existe') };
        }
        return { ok: false, error: falloDeAlmacen(R2_PROVIDER_ID, motivoDe(r.status), { status: r.status }) };
      } catch {
        /* Ni el error ni la URL salen de aquí: llevan firma y credencial dentro. */
        return { ok: false, error: falloDeAlmacen(R2_PROVIDER_ID, 'proveedor_no_disponible') };
      }
    },

    async mirar(ref: StorageRef): Promise<DesenlaceDeLectura> {
      const p = preparar(ref);
      if (!p.ok) return { ok: false, motivo: 'fallo', error: p.error };
      const cabeceras = firmar({ metodo: 'HEAD', host: p.host, ruta: p.ruta }, { ...p.config, region: R2_REGION, servicio: 's3' }, ahora());
      try {
        const r = await llamar(`https://${p.host}${p.ruta}`, { method: 'HEAD', headers: cabeceras });
        if (r.status === 404) return { ok: false, motivo: 'no_existe' };
        if (!r.ok) return { ok: false, motivo: 'fallo', error: falloDeAlmacen(R2_PROVIDER_ID, motivoDe(r.status), { status: r.status }) };
        const largo = Number(r.headers.get('content-length') ?? NaN);
        return {
          ok: true,
          objeto: {
            ref,
            bytes: Number.isFinite(largo) ? largo : 0,
            ...(r.headers.get('content-type') ? { contentType: r.headers.get('content-type') as string } : {}),
            ...(etiqueta(r) ? { etiquetaDelProveedor: etiqueta(r) } : {}),
          },
        };
      } catch {
        return { ok: false, motivo: 'fallo', error: falloDeAlmacen(R2_PROVIDER_ID, 'proveedor_no_disponible') };
      }
    },

    async borrar(ref: StorageRef): Promise<DesenlaceDeBorrado> {
      const p = preparar(ref);
      if (!p.ok) return { ok: false, error: p.error };
      const cabeceras = firmar({ metodo: 'DELETE', host: p.host, ruta: p.ruta }, { ...p.config, region: R2_REGION, servicio: 's3' }, ahora());
      try {
        const r = await llamar(`https://${p.host}${p.ruta}`, { method: 'DELETE', headers: cabeceras });
        /* S3 contesta 204 tanto si borró como si no había nada: borrar es idempotente por contrato. */
        if (r.status === 204 || r.status === 200) return { ok: true, yaNoEstaba: false };
        if (r.status === 404) return { ok: true, yaNoEstaba: true };
        return { ok: false, error: falloDeAlmacen(R2_PROVIDER_ID, motivoDe(r.status), { status: r.status }) };
      } catch {
        return { ok: false, error: falloDeAlmacen(R2_PROVIDER_ID, 'proveedor_no_disponible') };
      }
    },
  };
};

/** Las capacidades que este adaptador declara de verdad. Lo demás no existe aquí. */
export const CAPACIDADES_DE_R2: readonly CapacidadDeAlmacen[] = CAPACIDADES_DE_MC1;
