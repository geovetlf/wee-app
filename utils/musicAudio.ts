/**
 * WEË MUSIC — AUDIO DE REFERENCIA: LÍMITES DE LA INTERFAZ Y VALIDACIÓN (puro).
 *
 * Son límites de la INTERFAZ, conservadores, no los de un proveedor (ningún proveedor está conectado): mínimo 6 s
 * (el menor documentado, MiniMax `music-cover`), máximo 60 s y 10 MB (el menor tamaño documentado, Yinchao). El límite
 * real de cada operación lo fijará el contrato con el proveedor elegido; esto solo evita que alguien grabe cinco
 * minutos para que luego el motor lo rechace. Formatos: MP3, WAV y M4A (los tres que ya pide el diseño).
 */
export const LIMITES_DE_REFERENCIA = { minSec: 6, maxSec: 60, maxBytes: 10 * 1024 * 1024 } as const;

export const MIME_ADMITIDOS = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac'] as const;
export const EXTENSIONES_ADMITIDAS = ['mp3', 'wav', 'm4a'] as const;

export type ResultadoDeValidacion = 'ok' | 'badFormat' | 'tooBig' | 'tooLong' | 'tooShort' | 'empty';

export const validarAudioDeReferencia = (a: { mime?: string; nombre?: string; bytes?: number; duracionSec?: number }): ResultadoDeValidacion => {
  if (a.bytes !== undefined && a.bytes <= 0) return 'empty';
  const ext = (a.nombre ?? '').split('.').pop()?.toLocaleLowerCase('en-US') ?? '';
  const mimeOk = !!a.mime && (MIME_ADMITIDOS as readonly string[]).includes(a.mime.toLocaleLowerCase('en-US'));
  const extOk = (EXTENSIONES_ADMITIDAS as readonly string[]).includes(ext);
  if (!mimeOk && !extOk) return 'badFormat';
  if (a.bytes !== undefined && a.bytes > LIMITES_DE_REFERENCIA.maxBytes) return 'tooBig';
  if (a.duracionSec !== undefined) {
    if (a.duracionSec > LIMITES_DE_REFERENCIA.maxSec) return 'tooLong';
    if (a.duracionSec < LIMITES_DE_REFERENCIA.minSec) return 'tooShort';
  }
  return 'ok';
};

/** De los decibelios del medidor (-160…0) a un nivel 0..1 para dibujar la barra. */
export const nivelDeDecibelios = (db: number | undefined): number => {
  if (db === undefined || !Number.isFinite(db)) return 0;
  const n = (Math.max(-60, Math.min(0, db)) + 60) / 60;
  return Math.round(n * 100) / 100;
};

/** Reduce una lista de niveles a un número fijo de barras (media por tramo). Sin niveles, lista vacía. */
export const reducirPicos = (picos: readonly number[], barras: number): number[] => {
  if (!picos.length || barras <= 0) return [];
  const out: number[] = [];
  for (let i = 0; i < barras; i++) {
    const desde = Math.floor((i * picos.length) / barras);
    const hasta = Math.max(desde + 1, Math.floor(((i + 1) * picos.length) / barras));
    const tramo = picos.slice(desde, hasta);
    out.push(tramo.reduce((a, b) => a + b, 0) / tramo.length);
  }
  return out;
};
