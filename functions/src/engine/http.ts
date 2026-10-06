import { randomUUID } from 'crypto';
import { sanitizeForLog } from './sanitize';
import { secretValue } from '../secrets';
import { getStorage } from 'firebase-admin/storage';

/**
 * Utilidades compartidas por los adaptadores: HTTP con tiempo límite,
 * espera de tareas asíncronas, lectura de imágenes de entrada y guardado de
 * resultados en Storage (el sistema de archivos de Weë: Firebase Storage).
 *
 * Y la regla con la que las puertas aceptan una dirección del Storage que llega
 * de fuera (`direccionDeLaCuenta`, más abajo): vive aquí porque aquí viven quien
 * la lee y quien la reconstruye.
 */

export class ProviderError extends Error {
  constructor(message: string, public readonly provider: string, public readonly status?: number, public readonly retryable = true) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class NotConfiguredError extends ProviderError {
  constructor(provider: string, envVar: string) {
    super(`${provider} no está configurado (falta ${envVar})`, provider, undefined, false);
    this.name = 'NotConfiguredError';
  }
}

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  provider: string;
  /**
   * Sin decirlo, se siguen las redirecciones (lo de siempre). `manual`: no se siguen; la redirección llega como la
   * respuesta 3xx que es y, por tanto, como un fallo con su estado (a nadie más se le pide nada).
   */
  redirect?: 'follow' | 'manual';
}

export async function fetchJson<T = any>(url: string, options: FetchOptions): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);
  try {
    const response = await fetch(url, {
      method: options.method ?? (options.body ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      ...(options.redirect ? { redirect: options.redirect } : {}),
    });
    const text = await response.text();
    if (!response.ok) {
      // 4xx de configuración/validación no se reintentan con el mismo proveedor
      const retryable = response.status >= 500 || response.status === 429;
      // El cuerpo del proveedor puede traer la cabecera que le enviamos: se censura aquí,
      // antes de que el mensaje exista, para que no llegue a ningún registro.
      throw new ProviderError(
        `${options.provider} respondió ${response.status}: ${sanitizeForLog(text)}`,
        options.provider,
        response.status,
        retryable,
      );
    }
    return (text ? JSON.parse(text) : {}) as T;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(`${options.provider}: ${sanitizeForLog(error)}`, options.provider);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchBytes(url: string, options: FetchOptions): Promise<{ buffer: Buffer; contentType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 120_000);
  try {
    const response = await fetch(url, {
      method: options.method ?? (options.body ? 'POST' : 'GET'),
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      ...(options.redirect ? { redirect: options.redirect } : {}),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new ProviderError(`${options.provider} respondió ${response.status}: ${sanitizeForLog(text)}`, options.provider, response.status, response.status >= 500);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return { buffer, contentType: response.headers.get('content-type') || 'application/octet-stream' };
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(`${options.provider}: ${sanitizeForLog(error)}`, options.provider);
  } finally {
    clearTimeout(timer);
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Espera a que una tarea asíncrona termine (video, imagen en cola…). */
/**
 * UNA CONSULTA DE ESTADO QUE FALLA NO MATA UNA TAREA QUE SIGUE VIVA (auditoría H0, escenario #3).
 *
 * El sondeo solo PREGUNTA por una tarea que el proveedor ya está haciendo (y
 * cobrando). Antes, un único 503, 429 o una consulta sin respuesta lanzaba fuera
 * del bucle: el trabajo fallaba y se reembolsaba mientras el proveedor seguía
 * generando, y Weë pagaba esa generación igual. Ahora un fallo pasajero del
 * proveedor (lo que `fetchJson` marca como reintentable: 5xx, 429, red) se
 * tolera hasta FALLOS_PASAJEROS_TOLERADOS veces seguidas, dentro del mismo
 * plazo. Un 4xx, cualquier otro error y una tarea que el proveedor da por
 * fallida terminan en el acto, como siempre. Nunca se vuelve a crear la tarea.
 */
export const FALLOS_PASAJEROS_TOLERADOS = 3;

export async function pollUntil<T>(
  check: () => Promise<{ done: boolean; value?: T; error?: string }>,
  options: { intervalMs?: number; timeoutMs: number; provider: string }
): Promise<T> {
  const started = Date.now();
  const interval = options.intervalMs ?? 5_000;
  let fallosSeguidos = 0;
  while (Date.now() - started < options.timeoutMs) {
    let state: { done: boolean; value?: T; error?: string };
    try {
      state = await check();
      fallosSeguidos = 0;
    } catch (error) {
      const pasajero = error instanceof ProviderError && error.retryable;
      if (!pasajero || ++fallosSeguidos > FALLOS_PASAJEROS_TOLERADOS) throw error;
      console.warn(`${options.provider}: una consulta de estado falló (${fallosSeguidos}/${FALLOS_PASAJEROS_TOLERADOS}); la tarea sigue y se vuelve a preguntar.`);
      await sleep(interval);
      continue;
    }
    if (state.error) throw new ProviderError(`${options.provider}: ${state.error}`, options.provider);
    if (state.done) return state.value as T;
    await sleep(interval);
  }
  throw new ProviderError(`${options.provider}: la tarea tardó más de ${Math.round(options.timeoutMs / 1000)} s`, options.provider);
}

export const extensionFor = (contentType: string): string => {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('mp4')) return 'mp4';
  if (contentType.includes('mpeg') || contentType.includes('mp3')) return 'mp3';
  if (contentType.includes('wav')) return 'wav';
  if (contentType.includes('pdf')) return 'pdf';
  return 'bin';
};

/**
 * Valor de una variable de entorno. En producción los secretos llegan por Cloud
 * Secret Manager: Firebase los expone como variables de entorno con el mismo
 * nombre, y si no estuvieran se piden al parámetro declarado en secrets.ts.
 * Nunca se registra ni se devuelve al cliente.
 */
export const env = (name: string): string | undefined => {
  const value = process.env[name];
  if (value && value.trim()) return value.trim();
  return secretValue(name);
};

/** Bucket de Weë: el del proyecto (FIREBASE_CONFIG) salvo que STORAGE_BUCKET diga otro. */
export const storageBucket = () => (env('STORAGE_BUCKET') ? getStorage().bucket(env('STORAGE_BUCKET')) : getStorage().bucket());

/**
 * El NOMBRE del cubo de Weë, el mismo de `storageBucket`. Con él contestan a «¿es nuestro este cubo?» quien lee
 * (`readImage`, `imageDimensions`) y quien comprueba una dirección que llega de fuera (`direccionDeLaCuenta`): las dos
 * preguntan lo mismo y no pueden contestar distinto.
 */
export const nombreDelCuboDeWee = (): string => env('STORAGE_BUCKET') || storageBucket().name;

/**
 * URL de descarga estable para un archivo guardado (emulador o producción). Sin testigo, la de quien tenga permiso de
 * lectura (la que se reconstruye de una dirección que llegó sin él).
 */
export function downloadUrlFor(bucket: string, path: string, token?: string): string {
  const emulator = env('FIREBASE_STORAGE_EMULATOR_HOST');
  const base = emulator ? `http://${emulator.replace(/^https?:\/\//, '')}` : 'https://firebasestorage.googleapis.com';
  return `${base}/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media${token ? `&token=${token}` : ''}`;
}

/**
 * Guarda un resultado en Storage (users/{uid}/ai-generations/…) y devuelve una
 * URL de descarga estable. Los proveedores suelen dar URLs temporales.
 */
export async function saveGeneratedFile(userId: string, buffer: Buffer, contentType: string, label = 'result'): Promise<string> {
  const bucket = storageBucket();
  const token = randomUUID();
  const path = `users/${userId}/ai-generations/${Date.now()}-${label}.${extensionFor(contentType)}`;
  await bucket.file(path).save(buffer, {
    metadata: { contentType, metadata: { firebaseStorageDownloadTokens: token } },
    resumable: false,
  });
  return downloadUrlFor(bucket.name, path, token);
}

/** Descarga la URL temporal de un proveedor y la guarda en Storage. */
export async function persistRemoteFile(userId: string, url: string, provider: string, label = 'result'): Promise<string> {
  const { buffer, contentType } = await fetchBytes(url, { provider, timeoutMs: 180_000 });
  return saveGeneratedFile(userId, buffer, contentType, label);
}

/** Guarda base64 (imagen/audio devuelto en línea) en Storage. */
export async function persistBase64(userId: string, base64: string, contentType: string, label = 'result'): Promise<string> {
  return saveGeneratedFile(userId, Buffer.from(base64, 'base64'), contentType, label);
}

// ── Archivos de entrada (fotos que sube la persona) ─────────────────────────

/** Reconoce URLs de nuestro Storage (producción, emulador, gs://) y devuelve bucket + ruta. */
export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const gs = url.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (gs) return { bucket: gs[1], path: decodeURIComponent(gs[2]) };
  const firebase = url.match(/^https?:\/\/[^/]+\/v0\/b\/([^/]+)\/o\/([^?]+)/);
  if (firebase) return { bucket: firebase[1], path: decodeURIComponent(firebase[2]) };
  const gcs = url.match(/^https:\/\/storage\.googleapis\.com\/([^/]+)\/([^?]+)/);
  if (gcs) return { bucket: gcs[1], path: decodeURIComponent(gcs[2]) };
  return null;
}

// ── Una dirección del Storage de Weë que llega de fuera: UNA regla ───────────

/*
 * ── POR QUÉ HACE FALTA UNA REGLA Y NO BASTA EL LECTOR (revisión de seguridad 2026-10-06, «urls del Storage») ──
 *
 * `parseStorageUrl` reconoce la FORMA —`/v0/b/<cubo>/o/<ruta>`— con CUALQUIER host, y el cubo lo pone quien escribe la
 * dirección. Las puertas de Weë AI (`assertInputImageUrl`, `assertAttachmentUrl`) miraban solo la ruta
 * (`users/<uid>/…`) y devolvían la dirección TAL CUAL; `readImage`, si el Admin SDK no podía con ese cubo, la pedía por
 * HTTP, y el avatar la pedía por HTTP siempre. Con la ruta «correcta» y un host ajeno, el servidor iba a buscar a donde
 * dijera la persona (SSRF), y lo que trajera viajaba a un modelo de IA.
 *
 * Ahora, tres cosas y una sola regla:
 *   · una dirección que llega de fuera se ACEPTA solo si el host es del Storage de Weë, el cubo es el nuestro y la ruta
 *     es de la carpeta de la cuenta, sin trucos (`direccionDeLaCuenta`);
 *   · y se REESCRIBE desde esas piezas comprobadas: aguas abajo no viaja nunca la cadena que escribió la persona;
 *   · y quien LEE (`readImage`, `imageDimensions`) no sale por la red con nada que tenga forma de Storage: el objeto se
 *     lee del cubo de Weë con el Admin SDK, o no se lee (`objetoDelStorageDeWee`).
 */

/**
 * LOS HOSTS DEL STORAGE DE WEË. Es la regla con la que WeeTalk ya se negaba a borrar nada fuera de su sitio, ahora en
 * un solo lugar para todos: el Storage de Google por sus tres formas y, SOLO cuando este proceso corre contra el
 * emulador de Storage, el emulador. Un host ajeno con la forma correcta no es una dirección de Weë.
 */
const FORMA_DE_DIRECCION_DE_WEE = /^(?:gs:\/\/|https:\/\/firebasestorage\.googleapis\.com\/|https:\/\/storage\.googleapis\.com\/)/;
const FORMA_DEL_EMULADOR = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\//;

export const esDireccionDelStorageDeWee = (url: unknown): boolean =>
  typeof url === 'string'
  && (FORMA_DE_DIRECCION_DE_WEE.test(url) || (!!env('FIREBASE_STORAGE_EMULATOR_HOST') && FORMA_DEL_EMULADOR.test(url)));

/**
 * EL OBJETO DEL CUBO DE WEË AL QUE APUNTA UNA DIRECCIÓN, para LEERLO. No dice de quién es —eso lo decide la puerta, con
 * `direccionDeLaCuenta`—, solo dónde está:
 *   null               no tiene forma de dirección del Storage (una entrega firmada que arma el propio servidor);
 *   'fuera_del_cubo'   tiene la forma, pero el cubo no es el de Weë o la ruta no se puede decodificar: no se lee de
 *                      ningún sitio;
 *   { path }           un objeto del cubo de Weë.
 */
export const objetoDelStorageDeWee = (url: string): { path: string } | 'fuera_del_cubo' | null => {
  let leida: { bucket: string; path: string } | null;
  try {
    leida = parseStorageUrl(url);
  } catch {
    return 'fuera_del_cubo';
  }
  if (!leida) return null;
  return leida.bucket === nombreDelCuboDeWee() ? { path: leida.path } : 'fuera_del_cubo';
};

/** Por qué no vale una dirección que llega de fuera. Cerrados: cada puerta los dice con SUS frases de siempre. */
export type MotivoDeDireccion = 'no_es_de_wee' | 'malformada' | 'ajena';

export type DireccionDeLaCuenta =
  | { readonly ok: true; readonly url: string; readonly path: string }
  | { readonly ok: false; readonly motivo: MotivoDeDireccion };

/** El testigo de descarga de Firebase es un UUID (`randomUUID`, `getDownloadURL`). Lo que no tiene esa forma no lo es. */
const FORMA_DEL_TESTIGO = /^[A-Za-z0-9-]{1,128}$/;
/** Ni caracteres de control, ni barras invertidas, ni un `%` que sobreviva a decodificar (una ruta codificada dos veces). */
// eslint-disable-next-line no-control-regex
const CARACTER_PROHIBIDO = /[\u0000-\u001f\u007f\\%]/;

/** Una ruta de objeto sin trucos: ningún segmento vacío, ni `.` ni `..`, y nada de lo que prohíbe `CARACTER_PROHIBIDO`. */
const rutaLimpia = (path: string): boolean =>
  path.length > 0 && path.length <= 1024 && !CARACTER_PROHIBIDO.test(path)
  && path.split('/').every((segmento) => segmento !== '' && segmento !== '.' && segmento !== '..');

/**
 * ¿ACEPTA WEË ESTA DIRECCIÓN, QUE LLEGA DE LA PERSONA? Solo si (1) el host es del Storage de Weë, (2) el cubo es el
 * nuestro, (3) la ruta está limpia y (4) cuelga de la carpeta de SU cuenta —`users/<cuenta>/`, prefijo entero:
 * `users/uAnaX/` no es de `uAna`—. Si vale, devuelve la dirección REESCRITA desde esas piezas:
 *   · la de descarga de Firebase → la misma forma, con el host de este entorno, el cubo, la ruta codificada y el testigo
 *     si lo traía (sin él la app no podría enseñar la foto, ni un proveedor descargar un vídeo de referencia);
 *   · `gs://` o la de Cloud Storage → `gs://<cubo>/<ruta>`.
 * Para una dirección buena, la reescrita es exactamente la que dio `getDownloadURL`: ni la huella de una petición ni lo
 * que enseña la app cambian.
 */
export function direccionDeLaCuenta(url: unknown, cuenta: string): DireccionDeLaCuenta {
  if (typeof url !== 'string' || !esDireccionDelStorageDeWee(url)) return { ok: false, motivo: 'no_es_de_wee' };
  /* El cubo, con la MISMA lectura que usa quien lee: una dirección de otro cubo, o ilegible, tampoco es de Weë. */
  const objeto = objetoDelStorageDeWee(url);
  if (!objeto || objeto === 'fuera_del_cubo') return { ok: false, motivo: 'no_es_de_wee' };
  const { path } = objeto;
  if (!rutaLimpia(path)) return { ok: false, motivo: 'malformada' };
  if (!cuenta || /[/\s]/.test(cuenta) || !path.startsWith(`users/${cuenta}/`)) return { ok: false, motivo: 'ajena' };
  const cubo = nombreDelCuboDeWee();
  if (!/^https?:\/\/[^/]+\/v0\/b\//.test(url)) return { ok: true, path, url: `gs://${cubo}/${path.split('/').map(encodeURIComponent).join('/')}` };
  const inicioDeLaConsulta = url.indexOf('?');
  const testigos = inicioDeLaConsulta < 0 ? [] : new URLSearchParams(url.slice(inicioDeLaConsulta + 1)).getAll('token');
  if (testigos.length > 1 || (testigos.length === 1 && !FORMA_DEL_TESTIGO.test(testigos[0]))) return { ok: false, motivo: 'malformada' };
  return { ok: true, path, url: downloadUrlFor(cubo, path, testigos[0]) };
}

/** Máximo por archivo enviado en línea. Gemini admite 20 MB por petición completa. */
export const MAX_INPUT_BYTES = 20 * 1024 * 1024;

/**
 * UN ARCHIVO DE ENTRADA QUE NO SE PUEDE USAR NO ES UN FALLO DEL PROVEEDOR. Todo lo que el lector rechaza o no consigue
 * leer pasa ANTES de mandarle nada, así que sale con estado 400: el libro lo apunta a coste cero (`costeTrasUnFallo`) y
 * el Gateway no lo confunde con una credencial rechazada del proveedor (un 403 del Storage no es `provider_auth_failed`).
 * El porqué de verdad —«No such object», un permiso que falta…— va en el mensaje, saneado, para el registro.
 */
const entradaInservible = (motivo: string, provider: string, reintentable = false): ProviderError =>
  new ProviderError(`${provider}: ${motivo}`, provider, 400, reintentable);

/**
 * Por qué no se pudo leer un archivo de entrada: del cubo de Weë (el `code` del Storage) o de una entrega firmada (el
 * `status` de su respuesta). Uno que no existe, que no se puede leer o que redirige (4xx, 3xx) no se arregla
 * reintentando; un fallo de la red o del servicio (5xx, 429, sin respuesta) sí puede.
 */
const errorDeLectura = (error: unknown, provider: string, deDonde: string): ProviderError => {
  const { code, status } = (error ?? {}) as { code?: unknown; status?: unknown };
  const estado = Number(code ?? status);
  const pasajero = !Number.isInteger(estado) || estado === 429 || estado >= 500;
  return entradaInservible(`no se pudo leer el archivo ${deDonde} (${sanitizeForLog(error)})`, provider, pasajero);
};

/**
 * Lee un archivo de entrada (foto, documento o audio) y lo devuelve en memoria para enviarlo EN LÍNEA al proveedor: las
 * URLs privadas de Weë nunca salen de Weë.
 *
 *   data:                   se decodifica aquí.
 *   con forma de Storage    SOLO del cubo de Weë y SOLO con el Admin SDK. Antes, si el Admin SDK no podía —un cubo
 *                           ajeno, un objeto que no existe—, se pedía por HTTP con la dirección ORIGINAL: con un host
 *                           ajeno y la ruta «correcta», el servidor iba a buscarla fuera. Ahora una dirección con forma
 *                           de Storage que no es del cubo de Weë no se lee de ningún sitio, y si el objeto no se puede
 *                           leer, falla: no hay segundo intento por la red.
 *   lo demás, por HTTPS     solo lo que arma el propio servidor sin forma de Storage —hoy, la entrega firmada de Media
 *                           Cloud (`engine/referencias.ts`)— y SIN seguir redirecciones: una entrega firmada no redirige,
 *                           y una redirección podría llevar a `http://` o a otra máquina. Las puertas solo aceptan de la
 *                           persona direcciones del Storage de Weë —la común, `direccionDeLaCuenta`; la de 3D World,
 *                           `resolverImagen`, que exige el cubo con su propia comprobación—, así que por aquí no pasa
 *                           nunca una cadena suya.
 */
export async function readImage(url: string, provider: string): Promise<{ buffer: Buffer; contentType: string }> {
  if (url.startsWith('data:')) {
    const [meta, data] = url.split(',');
    const contentType = meta.slice(5).split(';')[0] || 'image/png';
    const buffer = Buffer.from(data || '', 'base64');
    if (buffer.length > MAX_INPUT_BYTES) throw entradaInservible('el archivo es demasiado grande', provider);
    return { buffer, contentType };
  }
  const objeto = objetoDelStorageDeWee(url);
  if (objeto === 'fuera_del_cubo') throw entradaInservible('el archivo no está en el Storage de Weë', provider);
  if (objeto) {
    const file = storageBucket().file(objeto.path);
    const [buffer] = await file.download().catch((error: unknown) => { throw errorDeLectura(error, provider, 'del Storage de Weë'); });
    const [metadata] = await file.getMetadata().catch(() => [{ contentType: undefined }] as any);
    if (buffer.length > MAX_INPUT_BYTES) throw entradaInservible('la imagen es demasiado grande', provider);
    return { buffer, contentType: String(metadata?.contentType || 'image/jpeg') };
  }
  if (!url.startsWith('https://')) throw entradaInservible('lo que no es del Storage de Weë solo se descarga por HTTPS', provider);
  const result = await fetchBytes(url, { provider, timeoutMs: 60_000, redirect: 'manual' })
    .catch((error: unknown) => { throw errorDeLectura(error, provider, 'de la entrega firmada'); });
  if (result.buffer.length > MAX_INPUT_BYTES) throw entradaInservible('la imagen es demasiado grande', provider);
  return { buffer: result.buffer, contentType: result.contentType.split(';')[0] || 'image/jpeg' };
}

export const toDataUri = (file: { buffer: Buffer; contentType: string }): string => `data:${file.contentType};base64,${file.buffer.toString('base64')}`;
