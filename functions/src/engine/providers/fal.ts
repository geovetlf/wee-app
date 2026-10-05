import { createHash, createPublicKey, verify as verificarEd25519 } from 'node:crypto';
import { CapabilityId } from '../../creator/types';
import { CampoDeEsquema, ModelSpec, ProviderAdapter, ProviderOutcome, ProviderOutput, ProviderRunRequest } from '../types';
import { env, fetchJson, parseStorageUrl, persistRemoteFile, pollUntil, ProviderError, readImage, toDataUri } from '../http';
import { MODELOS_FAL } from './fal-modelos';
import { derechosDelModelo } from '../elegibilidad';
import type { AvisoNormalizado, DesenlaceDelProveedor } from '../../runtime/aviso';
import type { ResolutorDeEstadoDeProveedor } from '../../runtime/reconciliacion';

/**
 * fal.ai — UN proveedor más de Weë, multicapacidad. EXCEPCIÓN CONTROLADA (`registry/excepciones.ts`, 2026-10-05).
 *
 * fal no es el gateway, ni el router, ni el núcleo de nada: es una infraestructura común que sirve modelos de otros.
 * Entra por el mismo sitio que cualquier proveedor —el Router elige, el Gateway ejecuta, este adaptador traduce— y
 * se puede sustituir sin tocar ninguna experiencia. Sus modelos son DATOS (`fal-modelos.ts`), cada uno con su
 * gobierno y sus reglas territoriales. QUÉ modelo se puede usar, y DÓNDE, no lo decide este adaptador: lo decide la
 * regla común de Weë (`modeloElegible`) antes de que el Router compare candidatos. Aquí no hay jurisdicciones; si se
 * llega a `run`, es que esa regla ya dijo que sí.
 *
 * API (docs oficiales, 2026-10-05: fal.ai/docs/documentation/model-apis/inference/queue y /webhooks):
 *
 *   POST https://queue.fal.run/{modelo}                → { request_id, status_url, response_url, cancel_url }
 *   GET  {status_url}                                   → { status: IN_QUEUE | IN_PROGRESS | COMPLETED, … }
 *   GET  {response_url}                                 → el resultado (el esquema del modelo)
 *   PUT  {cancel_url}                                   → 202 CANCELLATION_REQUESTED | 400 ALREADY_COMPLETED | 404
 *   Cabecera: Authorization: Key FAL_KEY. Solo en el servidor (secrets.ts, llavero dormido).
 *
 * Lo que Weë le pide SIEMPRE:
 *   · `x-app-fal-disable-fallback: true` — fal puede desviar a un endpoint «equivalente»; aquí no: el modelo, y con él
 *     su licencia, es el que eligió el Router de Weë.
 *   · `X-Fal-Store-IO: 0` — que fal no guarde 30 días lo que entra y sale.
 *   · `X-Fal-Object-Lifecycle-Preference` — que sus archivos caduquen pronto: Weë copia el resultado a su Storage en
 *     cuanto llega y la URL de fal (pública por defecto) deja de importar.
 *
 * Y lo que NO hace nunca: seguir una URL que no sea de la cola de fal, mandarle un campo que no esté en el esquema
 * publicado del modelo, aceptar una imagen que no esté en la carpeta de la persona en el Storage de Weë, ni darle a
 * fal una URL de Weë: las fotos viajan EN LÍNEA (data URI), como en Seedance. Las URLs privadas de Weë no salen.
 */

const COLA = 'https://queue.fal.run';
/** Un id de modelo de fal: `dueño/modelo[/subruta…]`, en minúsculas. Nada que pueda salirse de su sitio en una URL. */
const ID_DE_MODELO = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9_.-]*(\/[a-z0-9][a-z0-9_.-]*)*$/;
/** Un request_id de fal (UUID u opaco), sin `/`. */
const ID_DE_PETICION = /^[A-Za-z0-9_.-]{1,128}$/;
/** Lo más grande que Weë copia de un resultado de fal. Por encima, el caso falla con su motivo. */
export const MAX_BYTES_DE_RESULTADO = 200 * 1024 * 1024;
/** Cuánto vive un archivo en el CDN de fal: Weë lo copia en el momento. */
const CADUCIDAD_EN_FAL_S = 3600;

export const isFalConfigured = (): boolean => Boolean(env('FAL_KEY'));

export const cabecerasDeFal = (): Record<string, string> => {
  const clave = env('FAL_KEY');
  if (!clave) throw new ProviderError('fal no está configurado (falta FAL_KEY)', 'fal', undefined, false);
  return {
    Authorization: `Key ${clave}`,
    'x-app-fal-disable-fallback': 'true',
    'X-Fal-Store-IO': '0',
    'X-Fal-Object-Lifecycle-Preference': JSON.stringify({ expiration_duration_seconds: CADUCIDAD_EN_FAL_S }),
  };
};

/** ¿Es una URL de la cola de fal? Lo único que este adaptador sigue (evita que una respuesta lo mande a otro sitio). */
export const esUrlDeLaCola = (url: unknown): url is string =>
  typeof url === 'string' && url.startsWith(`${COLA}/`) && !url.includes('..') && !/[\s@]/.test(url);

/* ── La operación: cómo se llama una petición de fal fuera de fal ────────── */

/**
 * El nombre de la operación que guarda Weë: `{modelo}::{request_id}`. Lleva el modelo porque las rutas de estado y
 * de resultado de fal cuelgan de él, y quien pregunta después (la reconciliación) solo tiene este nombre.
 */
export const nombreDeOperacion = (modelo: string, requestId: string): string => `${modelo}::${requestId}`;

export const leerOperacion = (operationId: unknown): { modelo: string; requestId: string } | undefined => {
  if (typeof operationId !== 'string' || operationId.length > 256) return undefined;
  const [modelo, requestId, ...resto] = operationId.split('::');
  if (resto.length || !ID_DE_MODELO.test(modelo ?? '') || !ID_DE_PETICION.test(requestId ?? '')) return undefined;
  return { modelo, requestId };
};

/* Rutas a partir del modelo, según el OpenAPI del modelo (con la subruta). Solo para la reconciliación: en una
 * ejecución se usan las URLs que devuelve el envío, que es lo que recomienda la documentación. */
const urlDeEstado = (modelo: string, requestId: string) => `${COLA}/${modelo}/requests/${encodeURIComponent(requestId)}/status`;
const urlDeResultado = (modelo: string, requestId: string) => `${COLA}/${modelo}/requests/${encodeURIComponent(requestId)}`;
const urlDeCancelacion = (modelo: string, requestId: string) => `${COLA}/${modelo}/requests/${encodeURIComponent(requestId)}/cancel`;

/* ── La entrada: solo lo que el esquema publicado del modelo admite ───────── */

/** Una imagen ya en línea: solo los formatos de imagen que fal admite como entrada. */
const DATO_DE_IMAGEN = /^data:image\/(png|jpe?g|webp|gif|avif|heic|heif);base64,[A-Za-z0-9+/=]+$/;

const tipoValido = (campo: CampoDeEsquema, valor: unknown): boolean => {
  switch (campo.tipo) {
    case 'string': return typeof valor === 'string' && valor.trim().length > 0 && valor.length <= 2000;
    case 'boolean': return typeof valor === 'boolean';
    case 'number': return typeof valor === 'number' && Number.isFinite(valor);
    case 'integer': return Number.isInteger(valor);
    case 'enum': return (campo.valores ?? []).includes(valor as string | number);
    /*
     * Una imagen de entrada SOLO puede ser del Storage de Weë (que después se manda en línea) o ya en línea: nunca una
     * URL cualquiera que llegue de fuera.
     */
    case 'image_url': return typeof valor === 'string'
      && (DATO_DE_IMAGEN.test(valor) || (valor.length <= 2000 && parseStorageUrl(valor) !== null));
    default: return false;
  }
};


/**
 * Las imágenes del cuerpo, EN LÍNEA. Una URL de Weë Storage solo vale si es de la carpeta de quien pide
 * (`users/{uid}/…`, la misma regla que `creator/inputs.ts`); se lee en el servidor y viaja como data URI.
 */
export const enLinea = async (modelo: ModelSpec, cuerpo: Record<string, unknown>, userId: string): Promise<Record<string, unknown>> => {
  const resultado = { ...cuerpo };
  for (const campo of modelo.gobierno?.inputSchema ?? []) {
    const valor = resultado[campo.nombre];
    if (campo.tipo !== 'image_url' || typeof valor !== 'string' || DATO_DE_IMAGEN.test(valor)) continue;
    const propia = parseStorageUrl(valor);
    if (!propia || !userId || !propia.path.startsWith(`users/${userId}/`)) {
      throw new ProviderError(`fal: ${campo.nombre} no es un archivo de la carpeta de la persona`, 'fal', 400, false);
    }
    resultado[campo.nombre] = toDataUri(await readImage(valor, 'fal'));
  }
  return resultado;
};

/** De lo que Weë pide al cuerpo que recibe el modelo. Lanza (sin llamar a nadie) si falta algo obligatorio o sobra algo. */
export const cuerpoParaFal = (modelo: ModelSpec, input: Record<string, unknown>): Record<string, unknown> => {
  const esquema = modelo.gobierno?.inputSchema ?? [];
  if (!esquema.length) throw new ProviderError(`fal: el modelo ${modelo.id} no declara su esquema de entrada`, 'fal', 400, false);
  /* Nombres de Weë → nombres del esquema. Lo demás de `input` (calidad, prefs…) no viaja. */
  const fuente: Record<string, unknown> = { ...input, image_url: input.image_url ?? input.imageUrl };
  const cuerpo: Record<string, unknown> = {};
  for (const campo of esquema) {
    const valor = fuente[campo.nombre];
    if (valor === undefined || valor === null || valor === '') {
      if (campo.requerido) throw new ProviderError(`fal: falta ${campo.nombre} para ${modelo.id}`, 'fal', 400, false);
      continue;
    }
    if (!tipoValido(campo, valor)) throw new ProviderError(`fal: ${campo.nombre} no es válido para ${modelo.id}`, 'fal', 400, false);
    cuerpo[campo.nombre] = valor;
  }
  return cuerpo;
};

/* ── La salida: de lo que devuelve fal a un resultado de Weë ──────────────── */

/** Qué clase de resultado da cada capacidad que fal puede atender. */
const CLASE_DE_RESULTADO: Partial<Record<CapabilityId, ProviderOutput['kind']>> = {
  'world.generate': 'world',
};

/** Los archivos que el esquema de salida declara, tal como llegaron (URL temporal de fal, tipo, tamaño). */
export const archivosDelResultado = (modelo: ModelSpec, resultado: unknown): Array<{ campo: string; url: string; contentType?: string; bytes?: number }> => {
  if (!resultado || typeof resultado !== 'object') return [];
  const r = resultado as Record<string, any>;
  const archivos: Array<{ campo: string; url: string; contentType?: string; bytes?: number }> = [];
  for (const campo of modelo.gobierno?.outputSchema ?? []) {
    const f = r[campo.nombre];
    if (campo.tipo !== 'file' || !f || typeof f !== 'object' || typeof f.url !== 'string') continue;
    archivos.push({
      campo: campo.nombre,
      url: f.url,
      ...(typeof f.content_type === 'string' ? { contentType: f.content_type } : {}),
      ...(Number.isFinite(f.file_size) ? { bytes: Number(f.file_size) } : {}),
    });
  }
  return archivos;
};

const persistirArchivo = async (userId: string, archivo: { campo: string; url: string; bytes?: number }): Promise<string> => {
  if (!/^https:\/\//.test(archivo.url)) throw new ProviderError(`fal: ${archivo.campo} no llegó por https`, 'fal', 502, false);
  if (archivo.bytes !== undefined && archivo.bytes > MAX_BYTES_DE_RESULTADO) {
    throw new ProviderError(`fal: ${archivo.campo} pesa ${archivo.bytes} bytes (más de ${MAX_BYTES_DE_RESULTADO})`, 'fal', 413, false);
  }
  return persistRemoteFile(userId, archivo.url, 'fal', archivo.campo);
};

/* ── El adaptador ───────────────────────────────────────────────────────── */

const MODELOS: ModelSpec[] = [...MODELOS_FAL];

export const falAdapter: ProviderAdapter = {
  id: 'fal',
  name: 'fal.ai (proveedor agregador, excepción controlada)',
  modalities: ['3d'],
  models: MODELOS,
  isConfigured: isFalConfigured,
  supports: (capability) => MODELOS.some((m) => m.capabilities.includes(capability)),
  async run(request: ProviderRunRequest): Promise<ProviderOutcome> {
    const { model, ctx } = request;
    const start = Date.now();
    /*
     * El modelo se busca en el catálogo PROPIO por su id: el endpoint, los esquemas y la licencia salen de los datos
     * revisados, nunca de lo que traiga la petición (que ya pasó por los ajustes de la administración).
     */
    const propio = MODELOS.find((m) => m.id === model.id);
    const modelo = propio?.gobierno?.providerModelId ?? '';
    if (!propio || !ID_DE_MODELO.test(modelo) || !propio.capabilities.includes(request.capability)) {
      throw new ProviderError(`fal: ${model.id} no atiende ${request.capability}`, 'fal', 400, false);
    }
    const cuerpo = await enLinea(propio, cuerpoParaFal(propio, request.input), ctx.userId);
    const enviado = await fetchJson<Record<string, any>>(`${COLA}/${modelo}`, {
      provider: 'fal', method: 'POST', headers: cabecerasDeFal(), body: cuerpo, timeoutMs: 30_000,
    });
    const requestId = String(enviado.request_id ?? '');
    if (!ID_DE_PETICION.test(requestId)) throw new ProviderError('fal: el envío no devolvió un request_id válido', 'fal', 502);
    const operationId = nombreDeOperacion(modelo, requestId);
    const costeConocido = model.cost.unit === 'call' ? model.cost.usd : 0;

    /* Quien sabe esperar sin ocupar el proceso (el Job Engine) recibe el nombre y suelta la llamada. */
    if (request.acceptAsync) {
      return { accepted: { operationId }, costUSD: costeConocido, latencyMs: Date.now() - start, model: model.id, meta: { requestId, providerModelId: modelo } };
    }

    const estadoUrl = esUrlDeLaCola(enviado.status_url) ? enviado.status_url : urlDeEstado(modelo, requestId);
    const resultadoUrl = esUrlDeLaCola(enviado.response_url) ? enviado.response_url : urlDeResultado(modelo, requestId);
    await request.onStatus?.('PROCESSING', { requestId, providerModelId: modelo });
    await pollUntil<true>(async () => {
      const e = await fetchJson<Record<string, any>>(estadoUrl, { provider: 'fal', headers: cabecerasDeFal(), timeoutMs: 30_000 });
      const s = String(e.status ?? '');
      if (s === 'COMPLETED') return { done: true, value: true };
      if (s === 'IN_QUEUE' || s === 'IN_PROGRESS') return { done: false };
      return { done: false, error: `estado desconocido: ${s || '(vacío)'}` };
    }, { provider: 'fal', timeoutMs: request.timeoutMs, intervalMs: 5_000 });

    /* COMPLETED no dice si salió bien: lo dice el resultado. Un error de modelo llega aquí como 4xx/5xx de fetchJson. */
    const resultado = await fetchJson<Record<string, any>>(resultadoUrl, { provider: 'fal', headers: cabecerasDeFal(), timeoutMs: 60_000 });
    const archivos = archivosDelResultado(propio, resultado);
    if (!archivos.length) throw new ProviderError(`fal: ${model.id} terminó sin ningún archivo en su resultado`, 'fal', 502, false);
    const guardados: string[] = [];
    for (const archivo of archivos) guardados.push(await persistirArchivo(ctx.userId, archivo));

    return {
      output: { kind: CLASE_DE_RESULTADO[request.capability] ?? 'world', url: guardados[0], urls: guardados },
      costUSD: costeConocido,
      latencyMs: Date.now() - start,
      model: model.id,
      meta: {
        requestId,
        providerModelId: modelo,
        operationId,
        archivos: archivos.map((a) => ({ campo: a.campo, contentType: a.contentType ?? null, bytes: a.bytes ?? null })),
        /* Lo que dice la licencia del modelo, para el material que salga de aquí (Asset.derechos). */
        derechos: derechosDelModelo(propio),
      },
    };
  },
};

/* ── Cancelar (cuando el proveedor lo permite) ──────────────────────────── */

export type ResultadoDeCancelacion = 'pedida' | 'ya_terminada' | 'no_existe' | 'no_configurado' | 'no_contesta';

/** Pide a fal que cancele una operación. Nunca lanza: lo que pasó se CONTESTA. */
export const cancelarEnFal = async (operationId: string): Promise<ResultadoDeCancelacion> => {
  const op = leerOperacion(operationId);
  if (!op || !isFalConfigured()) return 'no_configurado';
  try {
    await fetchJson(urlDeCancelacion(op.modelo, op.requestId), { provider: 'fal', method: 'PUT', headers: cabecerasDeFal(), timeoutMs: 30_000 });
    return 'pedida';
  } catch (error) {
    const status = error instanceof ProviderError ? error.status : undefined;
    if (status === 400) return 'ya_terminada';
    if (status === 404) return 'no_existe';
    return 'no_contesta';
  }
};

/* ── Avisos: el webhook firmado de fal ──────────────────────────────────── */

const DESENLACE_DE_FAL: Record<string, DesenlaceDelProveedor> = {
  IN_QUEUE: 'en_marcha',
  IN_PROGRESS: 'en_marcha',
  OK: 'terminado',
  ERROR: 'fallado',
};

/**
 * DE UN AVISO DE fal A UN AVISO LEGIBLE. Pura y desconfiada, como la de Seedance.
 *
 * El aviso trae `request_id`, `status` (OK | ERROR), `payload` y `error`. No trae el modelo: lo pone quien lo
 * recibe, que lo sabe porque Weë lo escribió en la URL del aviso al enviarlo. Con él se compone el MISMO nombre de
 * operación que se guardó. El enlace del resultado (`recurso`) es temporal y no se guarda en ningún sitio.
 */
export const leerAvisoDeFal = (cuerpo: unknown, modelo: string, modeloDeclarado?: ModelSpec): AvisoNormalizado | undefined => {
  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo) || !ID_DE_MODELO.test(modelo)) return undefined;
  const b = cuerpo as Record<string, any>;
  const requestId = String(b.request_id ?? '').trim();
  const providerStatus = String(b.status ?? '').trim().toUpperCase();
  if (!ID_DE_PETICION.test(requestId) || !providerStatus) return undefined;
  const declarado = modeloDeclarado ?? MODELOS.find((m) => m.gobierno?.providerModelId === modelo);
  const archivo = declarado ? archivosDelResultado(declarado, b.payload)[0] : undefined;
  const motivo = typeof b.error === 'string' && b.error ? b.error.slice(0, 200) : undefined;
  return {
    providerId: 'fal',
    operationId: nombreDeOperacion(modelo, requestId),
    providerStatus,
    desenlace: DESENLACE_DE_FAL[providerStatus] ?? 'desconocido',
    ...(providerStatus === 'OK' && archivo ? { recurso: archivo.url } : {}),
    ...(motivo ? { motivo } : {}),
  };
};

/** Las claves públicas con las que fal firma sus avisos (JWKS). Se pueden guardar hasta 24 h. */
export const URL_DE_CLAVES_DE_FAL = 'https://rest.fal.ai/.well-known/jwks.json';
export const TOLERANCIA_DE_FIRMA_S = 300;

export interface ClavePublicaJwk { kty?: string; crv?: string; x?: string }

const cabecera = (cabeceras: Record<string, unknown>, nombre: string): string | undefined => {
  const encontrada = Object.keys(cabeceras).find((k) => k.toLowerCase() === nombre);
  const v = encontrada ? cabeceras[encontrada] : undefined;
  return typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : undefined;
};

/**
 * ¿LO FIRMÓ fal? Pura: recibe las cabeceras, el cuerpo CRUDO (los bytes tal cual llegaron) y las claves.
 *
 *   mensaje = request_id \n user_id \n timestamp \n sha256_hex(cuerpo)
 *   firma   = X-Fal-Webhook-Signature (hex), ED25519, contra cualquiera de las claves del JWKS
 *   y la hora (X-Fal-Webhook-Timestamp, segundos) a ±300 s de la nuestra.
 *
 * Falla cerrado: sin una cabecera, con la hora fuera de margen o sin ninguna clave que valide, no vale.
 */
export const verificarFirmaDeFal = (
  cabeceras: Record<string, unknown>, cuerpoCrudo: Buffer | string, claves: readonly ClavePublicaJwk[], ahoraS: number,
): { valida: boolean; motivo?: string } => {
  const requestId = cabecera(cabeceras, 'x-fal-webhook-request-id');
  const userId = cabecera(cabeceras, 'x-fal-webhook-user-id');
  const marca = cabecera(cabeceras, 'x-fal-webhook-timestamp');
  const firmaHex = cabecera(cabeceras, 'x-fal-webhook-signature');
  if (!requestId || !userId || !marca || !firmaHex) return { valida: false, motivo: 'faltan cabeceras de firma' };
  const segundos = Number(marca);
  if (!Number.isInteger(segundos) || Math.abs(ahoraS - segundos) > TOLERANCIA_DE_FIRMA_S) return { valida: false, motivo: 'hora fuera de margen' };
  if (!/^[0-9a-fA-F]{128}$/.test(firmaHex)) return { valida: false, motivo: 'firma con forma no válida' };
  const huella = createHash('sha256').update(typeof cuerpoCrudo === 'string' ? Buffer.from(cuerpoCrudo, 'utf8') : cuerpoCrudo).digest('hex');
  const mensaje = Buffer.from([requestId, userId, marca, huella].join('\n'), 'utf8');
  const firma = Buffer.from(firmaHex, 'hex');
  for (const jwk of claves) {
    if (jwk?.kty !== 'OKP' || jwk.crv !== 'Ed25519' || typeof jwk.x !== 'string') continue;
    try {
      const clave = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: jwk.x }, format: 'jwk' });
      if (verificarEd25519(null, mensaje, clave, firma)) return { valida: true };
    } catch {
      /* Una clave mal formada no valida nada; se prueba la siguiente. */
    }
  }
  return { valida: false, motivo: 'ninguna clave de fal valida la firma' };
};

/* ── Reconciliación: preguntarle a fal qué fue de una operación ─────────── */

/**
 * PREGUNTARLE A fal QUÉ FUE DE UNA OPERACIÓN. Nunca lanza, como el de Seedance: no saber se contesta.
 * IN_QUEUE / IN_PROGRESS → en marcha. COMPLETED → se pide el resultado: si llega, terminado (con su enlace temporal);
 * si fal contesta con un error de modelo, fallado con su motivo.
 */
export const resolutorDeFal: ResolutorDeEstadoDeProveedor = {
  async consultar(ref) {
    if (ref.providerId !== 'fal' || !isFalConfigured()) return { conocido: false, motivo: 'no_configurado' };
    const op = leerOperacion(ref.operationId);
    if (!op) return { conocido: false, motivo: 'no_configurado' };
    try {
      const e = await fetchJson<Record<string, any>>(urlDeEstado(op.modelo, op.requestId), { provider: 'fal', headers: cabecerasDeFal(), timeoutMs: 30_000 });
      const s = String(e.status ?? '').toUpperCase();
      if (s === 'IN_QUEUE' || s === 'IN_PROGRESS') {
        return { conocido: true, aviso: { providerId: 'fal', operationId: ref.operationId, providerStatus: s, desenlace: 'en_marcha' } };
      }
      if (s !== 'COMPLETED') return { conocido: false, motivo: 'ilegible' };
      try {
        const resultado = await fetchJson<Record<string, any>>(urlDeResultado(op.modelo, op.requestId), { provider: 'fal', headers: cabecerasDeFal(), timeoutMs: 60_000 });
        const aviso = leerAvisoDeFal({ request_id: op.requestId, status: 'OK', payload: resultado }, op.modelo);
        return aviso ? { conocido: true, aviso } : { conocido: false, motivo: 'ilegible' };
      } catch (error) {
        const status = error instanceof ProviderError ? error.status : undefined;
        if (status !== undefined && status >= 400 && status < 500 && status !== 404 && status !== 429) {
          return { conocido: true, aviso: { providerId: 'fal', operationId: ref.operationId, providerStatus: `ERROR_${status}`, desenlace: 'fallado', motivo: `fal respondió ${status}` } };
        }
        return { conocido: false, motivo: status === 404 ? 'no_la_conoce' : 'no_contesta' };
      }
    } catch (error) {
      const status = error instanceof ProviderError ? error.status : undefined;
      return { conocido: false, motivo: status === 404 ? 'no_la_conoce' : 'no_contesta' };
    }
  },
};
