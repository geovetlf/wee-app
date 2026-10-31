import { ProviderAdapter } from '../engine/types';
import { ProviderError } from '../engine/http';
import { MusicErrorCode, MusicRequest, MusicResult } from './contract';
import { FichaDeProveedorMusical, PROVEEDORES_MUSICALES } from './matrix';

/**
 * WEË MUSIC — ADAPTADORES PREPARATORIOS (NO REGISTRADOS, NO LLAMAN A NADIE).
 *
 * Un adaptador por proveedor candidato, con el MISMO contrato que el resto del WEË AI ENGINE (`ProviderAdapter`), para
 * que el día autorizado «un proveedor nuevo = un adaptador + una línea en `ADAPTERS`» sea literal. Hoy:
 *  · `isConfigured()` es siempre false y `supports()` siempre false: el Router, si los viera, NO los ofrecería, y
 *    ninguna cadena de enrutamiento los nombra;
 *  · `run()` lanza un `ProviderError` no reintentable: nunca hay red ni coste;
 *  · los ids llevan prefijo `music-` para NO chocar con el adaptador de voz `elevenlabs` ni con `minimax` (voz) que
 *    ya existen en `engine/registry.ts`.
 *
 * Qué traduce cada uno (cuando se active): ver `PROVEEDORES_MUSICALES` (matriz). Para MiniMax, la única API cuyo
 * contrato HTTP está en documentación oficial legible, ya están escritos —y son puros— el normalizador de solicitud y
 * el de respuesta (`normalizarSolicitudMiniMax` / `normalizarRespuestaMiniMax`). Para ElevenLabs, Mureka y Yinchao NO se
 * escribe ninguno: no hay ruta ni cuerpo confirmados y no se inventan.
 *
 * Contrato por adaptador (cuando exista): id; capacidades (la matriz); límites; normalización de solicitud y respuesta;
 * errores (`MusicErrorCode`); estados asíncronos (`accepted` + `providerRef`); referencias a archivos por asset de Weë;
 * coste solo si el proveedor lo declara (`providerCostUsd`); cancelación/reintentos/idempotencia por `requestId`
 * (el Job Engine ya los gobierna); trazabilidad por `providerRef`; límite de tiempo (`timeoutsMs.music` del registro);
 * y versión de contrato (`MUSIC_CONTRACT_VERSION`).
 */

const MOTIVO = 'No hay un motor de música habilitado: ningún proveedor está aprobado ni configurado para Weë Music.';

export const adaptadorMusicalPreparado = (ficha: FichaDeProveedorMusical): ProviderAdapter => ({
  id: `music-${ficha.id}`,
  name: `${ficha.nombre} (música, preparado y sin habilitar)`,
  modalities: ['music'],
  models: [],
  isConfigured: () => false,
  supports: () => false,
  async run() {
    throw new ProviderError(`${MOTIVO} (${ficha.nombre})`, `music-${ficha.id}`, undefined, false);
  },
});

/** Los cuatro adaptadores, indexados por su id de adaptador. NO están en `ADAPTERS`. */
export const ADAPTADORES_MUSICALES_PREPARADOS: Readonly<Record<string, ProviderAdapter>> = Object.fromEntries(
  PROVEEDORES_MUSICALES.map((f) => [`music-${f.id}`, adaptadorMusicalPreparado(f)]),
);

// ──────────────────────────────────────────────────────────────────────────────────────────────
// MiniMax — contrato HTTP de https://platform.minimax.io/docs/api-reference/music-generation (consultado 2026-10-15)
// ──────────────────────────────────────────────────────────────────────────────────────────────

export const MINIMAX_MUSIC_ENDPOINT = 'https://api.minimax.io/v1/music_generation';
const MINIMAX_PROMPT_MAX = 2000;
const MINIMAX_LYRICS_MAX = 3500;
const MINIMAX_URL_VIDA_MS = 24 * 60 * 60 * 1000; // «URLs expire after 24 hours»

export type SolicitudHttp =
  | { ok: true; endpoint: string; body: Record<string, unknown> }
  | { ok: false; code: MusicErrorCode; motivo: string };

/**
 * Del contrato a la solicitud de MiniMax. Puro: no resuelve URLs (el Gateway pasa `referenciaUrl` ya resuelta desde el
 * asset) y no envía nada.
 *  · generate  → `music-3.0` (recomendado en su documentación), `is_instrumental`, `lyrics_optimizer` si no hay letra.
 *  · reference → `music-cover` con `audio_url` (un solo origen de audio).
 *  Cualquier otra operación es UNSUPPORTED: MiniMax no declara extender, remix, secciones ni stems.
 */
export const normalizarSolicitudMiniMax = (
  r: MusicRequest,
  opciones: { referenciaUrl?: string; modelo?: string } = {},
): SolicitudHttp => {
  const no = (code: MusicErrorCode, motivo: string): SolicitudHttp => ({ ok: false, code, motivo });
  if (r.operation !== 'music.generate' && r.operation !== 'music.reference') return no('UNSUPPORTED', `operation:${r.operation}`);
  if (r.tempoBpm !== undefined) return no('UNSUPPORTED', 'tempo');

  const prompt = [r.description?.trim(), r.genres?.length ? `genres: ${r.genres.join(', ')}` : '', r.moods?.length ? `mood: ${r.moods.join(', ')}` : '', r.voice ? `voice: ${r.voice}` : '']
    .filter(Boolean)
    .join('. ');
  if (prompt.length > MINIMAX_PROMPT_MAX) return no('INVALID_REQUEST', 'prompt-too-long');
  const lyrics = r.lyrics?.trim() ?? '';
  if (lyrics.length > MINIMAX_LYRICS_MAX) return no('INVALID_REQUEST', 'lyrics-too-long');

  const body: Record<string, unknown> = {
    stream: false,
    output_format: 'url',
    audio_setting: { sample_rate: 44100, bitrate: 256000, format: 'mp3' },
  };

  if (r.operation === 'music.reference') {
    if (!opciones.referenciaUrl) return no('INVALID_REQUEST', 'needs-reference-url');
    if (prompt.length < 10 || prompt.length > 300) return no('INVALID_REQUEST', 'cover-prompt-10-300');
    if (lyrics && (lyrics.length < 10 || lyrics.length > 1000)) return no('INVALID_REQUEST', 'cover-lyrics-10-1000');
    body.model = 'music-cover';
    body.prompt = prompt;
    body.audio_url = opciones.referenciaUrl;
    if (lyrics) body.lyrics = lyrics;
    return { ok: true, endpoint: MINIMAX_MUSIC_ENDPOINT, body };
  }

  body.model = opciones.modelo ?? 'music-3.0';
  if (r.instrumental) {
    if (!prompt) return no('INVALID_REQUEST', 'instrumental-needs-prompt');
    body.is_instrumental = true;
    body.prompt = prompt;
  } else {
    if (!lyrics && !prompt) return no('INVALID_REQUEST', 'needs-lyrics-or-prompt');
    if (prompt) body.prompt = prompt;
    if (lyrics) body.lyrics = lyrics;
    else body.lyrics_optimizer = true;
  }
  return { ok: true, endpoint: MINIMAX_MUSIC_ENDPOINT, body };
};

/** Códigos de `base_resp.status_code` que la documentación nombra. */
const MINIMAX_ERRORES: Record<number, { code: MusicErrorCode; retryable: boolean }> = {
  1002: { code: 'RATE_LIMITED', retryable: true },
  1004: { code: 'PROVIDER_ERROR', retryable: false },
  1008: { code: 'PROVIDER_ERROR', retryable: false },
  1026: { code: 'CONTENT_FLAGGED', retryable: false },
  2013: { code: 'INVALID_REQUEST', retryable: false },
  2049: { code: 'PROVIDER_ERROR', retryable: false },
};

/**
 * De la respuesta de MiniMax al resultado del contrato. `data.status`: 1 = en curso, 2 = completado.
 * La documentación no describe ninguna consulta posterior de una tarea en curso, así que un `status: 1` NO se
 * convierte en `accepted` (no habría con qué sondear): es un fallo reintentable. La duración sale de `extra_info`; el
 * nombre exacto del campo no está confirmado y por eso es opcional.
 */
export const normalizarRespuestaMiniMax = (respuesta: unknown, ahora: number): MusicResult => {
  const r = (respuesta ?? {}) as { base_resp?: { status_code?: number }; data?: { status?: number; audio?: string }; extra_info?: Record<string, unknown> };
  const codigo = r.base_resp?.status_code ?? 0;
  if (codigo !== 0) {
    const e = MINIMAX_ERRORES[codigo] ?? { code: 'PROVIDER_ERROR' as MusicErrorCode, retryable: true };
    return { status: 'failed', code: e.code, retryable: e.retryable };
  }
  if (r.data?.status === 2 && typeof r.data.audio === 'string' && r.data.audio) {
    const dur = Number(r.extra_info?.music_duration ?? r.extra_info?.duration);
    return {
      status: 'completed',
      audio: { providerUrl: r.data.audio, format: 'mp3', durationSec: Number.isFinite(dur) && dur > 0 ? dur : undefined, expiresAt: ahora + MINIMAX_URL_VIDA_MS },
    };
  }
  return { status: 'failed', code: 'PROVIDER_ERROR', retryable: true };
};
