import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { env, fetchJson, NotConfiguredError, objetoDelStorageDeWee, persistRemoteFile, pollUntil, ProviderError, putBytes, storageBucket } from '../http';

/**
 * WAVESPEED AI — API oficial directa (api.wavespeed.ai, cabecera Authorization: Bearer).
 * Documentación: wavespeed.ai/docs (leída el 2026-11-26): submit-task, get-result, upload-files-api,
 * data-retention-policy, y las páginas de los dos modelos.
 *
 * SOLO PARA WITE (Transformar identidad en Weëls), por decisión del dueño del 2026-11-26: «Ambos modos». Es la
 * EXCEPCIÓN a «el vídeo es solo Seedance»: el proveedor no está en ninguna cadena por defecto y solo lo alcanza quien
 * lo pide por su nombre (`prefs.allowedProviders: ['wavespeed']`), que hoy es únicamente `functions/src/wite`. Ningún
 * otro vídeo de Weë —Studio, Filmmaker, Weëls normales— puede acabar aquí por un respaldo.
 *
 * Contrato:
 *   POST /api/v3/media/uploads            {filename,size,content_type} → data.upload{url,headers}, data.download_url
 *   PUT  data.upload.url                  bytes crudos, con las cabeceras devueltas y SIN Authorization
 *   POST /api/v3/{modelo}                 → data.id
 *   GET  /api/v3/predictions/{id}/result  → data.status (created|processing → completed | failed|cancelled|timeout|deleted), data.outputs[]
 * Los archivos subidos y los resultados caducan a los 7 días: el resultado se copia al Storage de Weë en el acto.
 * «Send the submit request once»: el POST de la tarea nunca se reintenta (podría cobrarse dos veces).
 *
 * Por qué se SUBEN los archivos en vez de pasar la URL del Storage de Weë: la URL lleva el testigo de descarga de la
 * persona y no debe salir de Weë; y en el emulador ni siquiera es alcanzable desde fuera. Solo se leen objetos del
 * Storage de Weë (nunca una URL arbitraria).
 *
 * Tarifas publicadas (2026-11-26), por segundo de vídeo de ENTRADA redondeado hacia arriba:
 *   wavespeed-ai/video-face-swap   0,01 USD/s, mínimo 3 s           (solo la cara)
 *   wavespeed-ai/wan-2.2/animate   0,04 USD/s a 480p · 0,08 a 720p, mínimo 3 s (la persona entera, modo replace)
 */
const KEY = 'WAVESPEED_API_KEY';
const base = () => env('WAVESPEED_BASE_URL') || 'https://api.wavespeed.ai';

export const MODELO_CARA = 'wavespeed-ai/video-face-swap';
export const MODELO_COMPLETO = 'wavespeed-ai/wan-2.2/animate';

/** USD por segundo de entrada, por modelo y resolución. Fuente: las páginas de cada modelo (2026-11-26). */
export const TARIFAS_WAVESPEED: Readonly<Record<string, Readonly<Record<string, number>>>> = Object.freeze({
  [MODELO_CARA]: Object.freeze({ fuente: 0.01 }),
  [MODELO_COMPLETO]: Object.freeze({ '480p': 0.04, '720p': 0.08 }),
});
/** Lo mínimo que cobra WaveSpeed por tarea en los dos modelos. */
export const SEGUNDOS_MINIMOS_COBRADOS = 3;

/** Lo que cobra WaveSpeed por un clip: segundos de entrada redondeados hacia arriba, con su mínimo. */
export const costeDeWaveSpeed = (modelo: string, duracionSec: number, resolucion: string = '480p'): number => {
  const tarifas = TARIFAS_WAVESPEED[modelo];
  if (!tarifas) throw new ProviderError(`wavespeed: modelo desconocido ${modelo}`, 'wavespeed', undefined, false);
  const tarifa = modelo === MODELO_CARA ? tarifas.fuente : tarifas[resolucion];
  if (tarifa === undefined) throw new ProviderError(`wavespeed: ${modelo} no admite ${resolucion}`, 'wavespeed', undefined, false);
  const segundos = Math.max(SEGUNDOS_MINIMOS_COBRADOS, Math.ceil(Math.max(0, duracionSec)));
  return Math.round(segundos * tarifa * 10_000) / 10_000;
};

export const wavespeedModels: ModelSpec[] = [
  {
    id: MODELO_CARA, provider: 'wavespeed', capabilities: ['video.reference'], quality: 3, speed: 4,
    cost: { unit: 'second', usd: 0.01 }, maxDurationSec: 15, tags: ['wite', 'cambio de cara'],
    note: 'Solo la cara: pelo, cuerpo y ropa se conservan. Mantiene el movimiento de los labios.', verified: false,
  },
  {
    id: MODELO_COMPLETO, provider: 'wavespeed', capabilities: ['video.reference'], quality: 4, speed: 3,
    cost: { unit: 'second', usd: 0.04 }, maxDurationSec: 15, tags: ['wite', 'sustitución completa', 'wan 2.2 animate'],
    note: 'Modo replace: sustituye a la persona entera conservando movimiento, escena y luz.', verified: false,
  },
];

const ESTADOS_DE_FALLO = new Set(['failed', 'cancelled', 'timeout', 'deleted']);

/** Lee un objeto del Storage de Weë. Cualquier otra dirección se rechaza: el adaptador nunca descarga de fuera. */
const leerDelStorageDeWee = async (url: unknown, que: string): Promise<{ bytes: Buffer; tipo: string; nombre: string }> => {
  const objeto = typeof url === 'string' ? objetoDelStorageDeWee(url) : null;
  if (!objeto || objeto === 'fuera_del_cubo') throw new ProviderError(`wavespeed: ${que} no está en el Storage de Weë`, 'wavespeed', undefined, false);
  const archivo = storageBucket().file(objeto.path);
  const [[meta], [bytes]] = await Promise.all([archivo.getMetadata(), archivo.download()]);
  const tipo = typeof meta.contentType === 'string' && meta.contentType ? meta.contentType : 'application/octet-stream';
  const extension = objeto.path.includes('.') ? objeto.path.slice(objeto.path.lastIndexOf('.') + 1).toLowerCase() : tipo.split('/')[1] || 'bin';
  return { bytes, tipo, nombre: `wee-${que}.${extension.replace(/[^a-z0-9]/g, '') || 'bin'}` };
};

/** Sube unos bytes a WaveSpeed (billete + PUT) y devuelve la `download_url` que aceptan sus modelos. */
const subir = async (apiKey: string, archivo: { bytes: Buffer; tipo: string; nombre: string }): Promise<string> => {
  const billete = await fetchJson<{ data?: { upload?: { url?: string; method?: string; headers?: Record<string, string> }; download_url?: string } }>(
    `${base()}/api/v3/media/uploads`,
    { provider: 'wavespeed', headers: { Authorization: `Bearer ${apiKey}` }, body: { filename: archivo.nombre, size: archivo.bytes.length, content_type: archivo.tipo }, timeoutMs: 30_000 },
  );
  const destino = billete.data?.upload?.url;
  const descarga = billete.data?.download_url;
  if (!destino || !descarga) throw new ProviderError('wavespeed: la subida no devolvió destino', 'wavespeed', undefined, false);
  await putBytes(destino, archivo.bytes, { headers: billete.data?.upload?.headers, provider: 'wavespeed' });
  return descarga;
};

/** El cuerpo de la tarea, por modelo. Exportado para las pruebas: lo que sale de aquí es lo que se paga. */
export const cuerpoDeLaTarea = (modelo: string, video: string, imagen: string, resolucion: string): Record<string, unknown> =>
  modelo === MODELO_CARA
    ? { video, face_image: imagen, target_index: 0, target_gender: 'all' }
    : { video, image: imagen, mode: 'replace', resolution: resolucion === '720p' ? '720p' : '480p', seed: -1 };

export const wavespeedAdapter: ProviderAdapter = {
  id: 'wavespeed',
  name: 'WaveSpeed AI',
  modalities: ['video'],
  models: wavespeedModels,
  isConfigured: () => !!env(KEY),
  supports: (capability) => wavespeedModels.some((m) => m.capabilities.includes(capability)),
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    const apiKey = env(KEY);
    if (!apiKey) throw new NotConfiguredError('wavespeed', KEY);
    const { input, model, ctx } = request;
    const start = Date.now();
    const resolucion = typeof input.resolution === 'string' ? input.resolution : '480p';
    const duracionSec = Number(input.durationSec);
    if (!Number.isFinite(duracionSec) || duracionSec <= 0) throw new ProviderError('wavespeed: falta la duración medida del vídeo', 'wavespeed', undefined, false);
    const costUSD = costeDeWaveSpeed(model.id, duracionSec, resolucion);

    /* Las dos entradas, desde el Storage de Weë a WaveSpeed. */
    const [video, imagen] = await Promise.all([
      leerDelStorageDeWee(input.video, 'video').then((a) => subir(apiKey, a)),
      leerDelStorageDeWee(input.image, 'imagen').then((a) => subir(apiKey, a)),
    ]);

    /* UNA tarea. Si este POST falla a medias no se repite: podría estar ya cobrada (lo dice su documentación). */
    const tarea = await fetchJson<{ data?: { id?: string } }>(`${base()}/api/v3/${model.id}`, {
      provider: 'wavespeed', headers: { Authorization: `Bearer ${apiKey}` }, body: cuerpoDeLaTarea(model.id, video, imagen, resolucion), timeoutMs: 60_000,
    }).catch((error) => {
      throw error instanceof ProviderError ? new ProviderError(error.message, 'wavespeed', error.status, false) : error;
    });
    const id = tarea.data?.id;
    if (!id) throw new ProviderError('wavespeed: la tarea no devolvió id', 'wavespeed', undefined, false);
    await request.onStatus?.('PROCESSING', { taskId: id });

    const salida = await pollUntil<string>(async () => {
      const r = await fetchJson<{ data?: { status?: string; outputs?: unknown[]; error?: string } }>(`${base()}/api/v3/predictions/${encodeURIComponent(id)}/result`, {
        provider: 'wavespeed', headers: { Authorization: `Bearer ${apiKey}` }, timeoutMs: 30_000,
      });
      const estado = String(r.data?.status || '');
      if (estado === 'completed') {
        const url = (r.data?.outputs || []).find((o): o is string => typeof o === 'string' && /^https:\/\//.test(o));
        return url ? { done: true, value: url } : { done: false, error: 'terminó sin vídeo' };
      }
      if (ESTADOS_DE_FALLO.has(estado)) return { done: false, error: `la tarea terminó en ${estado}${r.data?.error ? `: ${r.data.error}` : ''}` };
      return { done: false };
    }, { intervalMs: 4_000, timeoutMs: Math.max(30_000, request.timeoutMs - (Date.now() - start)), provider: 'wavespeed' });

    /* El resultado caduca en WaveSpeed (7 días): se copia ya al Storage de Weë. Solo llega aquí una dirección https. */
    const url = await persistRemoteFile(ctx.userId, salida, 'wavespeed', `wavespeed-${model.id === MODELO_CARA ? 'cara' : 'completo'}`);

    return {
      output: { kind: 'video', url, durationSec: duracionSec },
      costUSD,
      latencyMs: Date.now() - start,
      model: model.id,
      meta: { taskId: id, resolution: model.id === MODELO_CARA ? 'fuente' : resolucion, billedSeconds: Math.max(SEGUNDOS_MINIMOS_COBRADOS, Math.ceil(duracionSec)), costeSegun: 'tarifa_publicada' },
    };
  },
};
