/**
 * WITE · LOS MEDIOS CON EL FFMPEG DE WEË (`ffmpeg-static`, el del renderizador; ninguna herramienta nueva).
 *
 *   · sondear: duración, tamaño, códec, fps y si hay sonido del ORIGINAL, leyéndolo por su URL (sin bajarlo entero).
 *   · medir el movimiento: cambios bruscos de imagen por segundo (filtro `scene`) a 160 px, barato.
 *   · devolver el audio original: el vídeo transformado + la pista del original, sin reencodar la imagen si ya es
 *     H.264 (`-c:v copy`). La vista previa y lo que se publica son ESTE archivo: no hay un segundo render.
 *
 * Seguro como el renderizador: se lanza sin shell, con una lista de argumentos; en los filtros solo hay números
 * fijos; nada que escriba una persona llega aquí. Las URLs llevan su testigo: nunca se escriben en un registro.
 */
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { LanzarFfmpeg, SondaDeVideo, leerSonda, lanzarFfmpegDeWee, rutaDeFfmpeg } from '../creator/renderizador';
import { leerFps } from './calidad';

export interface SondaDeWite extends SondaDeVideo { fps?: number }

const ejecutar = async (lanzar: LanzarFfmpeg, argv: string[], plazoMs: number): Promise<{ codigo: number | null; stderr: string }> => {
  const p = lanzar(argv);
  const reloj = setTimeout(() => p.matar(), plazoMs);
  try { return await p.terminado; } finally { clearTimeout(reloj); }
};

export const argumentosDeSonda = (entrada: string): string[] => ['-hide_banner', '-nostdin', '-i', entrada];

/** Cada fotograma que supera el umbral de cambio de escena deja una línea `pts_time` de `showinfo`. */
export const argumentosDeMovimiento = (entrada: string): string[] =>
  ['-hide_banner', '-nostdin', '-i', entrada, '-an', '-vf', "scale=160:-2,select='gt(scene,0.30)',showinfo", '-f', 'null', '-'];
export const contarCambios = (stderr: string): number => (stderr.match(/\bpts_time:/g) || []).length;

/**
 * El vídeo transformado con el audio del original. `1:a:0?`: si el original no tiene sonido, sale mudo sin fallar.
 * `-shortest` recorta al más corto; `+faststart` para que el teléfono empiece a reproducir antes de bajarlo entero.
 */
export const argumentosDeRemezcla = (transformado: string, original: string, salida: string, videoEsH264: boolean): string[] => [
  '-hide_banner', '-nostdin', '-y',
  '-i', transformado, '-i', original,
  '-map', '0:v:0', '-map', '1:a:0?',
  ...(videoEsH264 ? ['-c:v', 'copy'] : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p']),
  '-c:a', 'aac', '-b:a', '128k',
  '-shortest', '-movflags', '+faststart',
  salida,
];

export interface MediosDeWite {
  sondear(url: string): Promise<SondaDeWite | null>;
  cambiosPorSegundo(url: string, duracionSec: number): Promise<number | undefined>;
  /** Devuelve los bytes del MP4 final, o null si FFmpeg no pudo. */
  remezclar(transformadoUrl: string, originalUrl: string, videoEsH264: boolean): Promise<Buffer | null>;
}

/** Con el binario de Weë. Sin binario (instalación sin FFmpeg) contesta null: WITE lo trata como «no se pudo medir». */
export const mediosDeWee = (binario: string | null = rutaDeFfmpeg()): MediosDeWite => {
  const lanzar = binario ? lanzarFfmpegDeWee(binario) : null;
  return {
    async sondear(url) {
      if (!lanzar) return null;
      const r = await ejecutar(lanzar, argumentosDeSonda(url), 30_000);
      const sonda = leerSonda(r.stderr);
      return sonda.duracionSec === undefined ? null : { ...sonda, fps: leerFps(r.stderr) };
    },
    async cambiosPorSegundo(url, duracionSec) {
      if (!lanzar || !(duracionSec > 0)) return undefined;
      const r = await ejecutar(lanzar, argumentosDeMovimiento(url), 60_000);
      return r.codigo === 0 ? Math.round((contarCambios(r.stderr) / duracionSec) * 100) / 100 : undefined;
    },
    async remezclar(transformadoUrl, originalUrl, videoEsH264) {
      if (!lanzar) return null;
      const dir = await mkdtemp(join(tmpdir(), 'wite-'));
      const salida = join(dir, 'final.mp4');
      try {
        const r = await ejecutar(lanzar, argumentosDeRemezcla(transformadoUrl, originalUrl, salida, videoEsH264), 120_000);
        return r.codigo === 0 ? await readFile(salida) : null;
      } catch {
        return null;
      } finally {
        await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      }
    },
  };
};
