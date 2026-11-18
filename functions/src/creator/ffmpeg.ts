import { ComoSeMonta, ManifiestoDeMontaje } from './composicion';

/**
 * WEË FILMMAKER ENGINE · FASE 7 — LOS ARGUMENTOS DE FFMPEG DE UN MONTAJE.
 *
 * El render final se hace con FFmpeg propio (decisión del usuario, 2026-09-28).
 * Esto traduce un manifiesto (`creator/composicion.ts`) a la lista de argumentos
 * de FFmpeg, y nada más: no ejecuta nada, no toca disco ni red.
 *
 * ── Por qué es seguro ───────────────────────────────────────────────────────
 *
 *   · Es una LISTA de argumentos, para ejecutarse sin shell (`spawn` con `argv`):
 *     una ruta con espacios o comillas es un argumento, no una orden.
 *   · En el grafo de filtros solo entran números —con tres decimales— y nombres
 *     fijos de esta tabla. Nada de lo que escribe una persona —títulos,
 *     descripciones, subtítulos— llega aquí.
 *   · Una entrada que falte o con una forma rara para: se lanza, no se adivina.
 *
 * ── Qué hace cada plano ─────────────────────────────────────────────────────
 *
 * Se recorta a su duración desde el principio (el vídeo generado dura lo que se
 * pidió redondeado hacia arriba, y como mínimo 4 s), se escala sin deformar al
 * cuadro de salida con bandas si hace falta, se lleva a 24 fps y a yuv420p. Los
 * planos se unen en orden: con un corte, se concatenan; con una transición, se
 * solapan lo que dice el manifiesto. Si alguno tiene sonido, todos llevan pista:
 * los mudos, silencio de su duración.
 */

/** Cómo se llama cada transición en el filtro `xfade` de FFmpeg. */
export const XFADE: Readonly<Record<Exclude<ComoSeMonta, 'cut'>, string>> = Object.freeze({
  crossfade: 'fade',
  fade_black: 'fadeblack',
  slide: 'slideleft',
});

const num = (n: number): string => {
  if (!Number.isFinite(n) || n < 0) throw new Error(`número de montaje no válido: ${n}`);
  return n.toFixed(3);
};
const entero = (n: number): string => {
  if (!Number.isInteger(n) || n <= 0 || n > 10_000) throw new Error(`entero de montaje no válido: ${n}`);
  return String(n);
};

/**
 * LOS ARGUMENTOS. `entradas` dice dónde está en disco cada material del
 * manifiesto (por su `assetId`); `salida`, dónde escribir.
 */
export const argumentosDeFfmpeg = (m: ManifiestoDeMontaje, entradas: Readonly<Record<string, string>>, salida: string): readonly string[] => {
  const valida = (ruta: unknown): ruta is string => typeof ruta === 'string' && ruta.length > 0 && ruta.length <= 4096 && !ruta.includes('\0');
  if (!m.clips.length) throw new Error('un montaje sin planos');
  if (!valida(salida)) throw new Error('una salida sin forma');
  const conAudio = m.salida.audio === 'aac';
  const ancho = entero(m.salida.ancho);
  const alto = entero(m.salida.alto);
  const fps = entero(m.salida.fps);

  const argv: string[] = ['-hide_banner', '-nostdin', '-y'];
  const grafo: string[] = [];
  m.clips.forEach((c, i) => {
    const ruta = entradas[c.assetId];
    if (!valida(ruta)) throw new Error(`falta el material de un plano del montaje (${i})`);
    argv.push('-i', ruta);
    const d = num(c.duracionSec);
    grafo.push(
      `[${i}:v]trim=start=0:duration=${d},setpts=PTS-STARTPTS,`
      + `scale=${ancho}:${alto}:force_original_aspect_ratio=decrease,pad=${ancho}:${alto}:(ow-iw)/2:(oh-ih)/2:color=black,`
      + `setsar=1,fps=${fps},format=yuv420p,settb=AVTB[v${i}]`,
    );
    if (conAudio) {
      grafo.push(c.conSonido
        ? `[${i}:a]atrim=start=0:duration=${d},asetpts=PTS-STARTPTS,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`
        : `anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${d},asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`);
    }
  });

  let video = 'v0';
  let audio = 'a0';
  let acumulado = m.clips[0].duracionSec;
  for (let i = 1; i < m.clips.length; i++) {
    const t = m.clips[i - 1].salida;
    if (!t || t.como === 'cut' || t.duracionSec <= 0) {
      grafo.push(`[${video}][v${i}]concat=n=2:v=1:a=0[vj${i}]`);
      if (conAudio) grafo.push(`[${audio}][a${i}]concat=n=2:v=0:a=1[aj${i}]`);
      acumulado += m.clips[i].duracionSec;
    } else {
      const d = num(t.duracionSec);
      grafo.push(`[${video}][v${i}]xfade=transition=${XFADE[t.como]}:duration=${d}:offset=${num(acumulado - t.duracionSec)}[vj${i}]`);
      if (conAudio) grafo.push(`[${audio}][a${i}]acrossfade=d=${d}[aj${i}]`);
      acumulado += m.clips[i].duracionSec - t.duracionSec;
    }
    video = `vj${i}`;
    audio = `aj${i}`;
  }
  grafo.push(`[${video}]null[vout]`);
  if (conAudio) grafo.push(`[${audio}]anull[aout]`);

  argv.push('-filter_complex', grafo.join(';'), '-map', '[vout]');
  if (conAudio) argv.push('-map', '[aout]');
  argv.push('-r', fps, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p');
  argv.push(...(conAudio ? ['-c:a', 'aac', '-b:a', '192k'] : ['-an']));
  argv.push('-movflags', '+faststart', '-t', num(m.duracionSec), salida);
  return Object.freeze(argv);
};

/** Lo que dura el montaje según sus propios argumentos: la cuenta que hace `argumentosDeFfmpeg`, sin ejecutarla. Pura. */
export const duracionDelMontaje = (m: ManifiestoDeMontaje): number =>
  Math.round(m.clips.reduce((s, c, i) => s + c.duracionSec - (i > 0 ? (m.clips[i - 1].salida?.duracionSec ?? 0) : 0), 0) * 1000) / 1000;
