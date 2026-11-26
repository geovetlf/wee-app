/*
 * WITE · EVALUACIÓN REPRODUCIBLE (2026-11-26). No llama a ningún proveedor ni gasta nada.
 *
 *   A. MEDIDO: el paso de FFmpeg de WITE (`functions/lib/wite/medios.js`, el código real) sobre clips SINTÉTICOS de
 *      5, 10 y 15 s a 360p y 480p: sondear, medir movimiento y devolver el audio original al vídeo «transformado».
 *      Tiempos de pared, tamaños, códec y audio del resultado, y la decisión del controlador de calidad.
 *   B. FÓRMULA: el coste del proveedor por clip con las funciones de precio del motor (tarifa oficial de Seedance con
 *      vídeo de entrada, sin tarea real) y lo que el Credit Engine cobraría con «consumo real» frente al techo cotizado.
 *
 * Uso:   FFMPEG=<ruta a ffmpeg> node scripts/wite-evaluacion.mjs [carpeta-de-salida]
 * (en las Functions desplegadas el binario es el de `ffmpeg-static`; aquí se le pasa uno local).
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lib = (p) => require(path.join(raiz, 'functions/lib', p));
const FFMPEG = process.env.FFMPEG;
if (!FFMPEG) { console.error('Falta FFMPEG=<ruta al binario>'); process.exit(2); }
const salidaDir = process.argv[2] || mkdtempSync(path.join(tmpdir(), 'wite-eval-'));
mkdirSync(salidaDir, { recursive: true });

const { mediosDeWee } = lib('wite/medios.js');
const { decidirResolucion } = lib('wite/calidad.js');
const { SEEDANCE_MODEL_IDS, specOf, peticionEfectivaDeSeedance } = lib('engine/providers/seedance.js');
const { creditosDeUnCoste, priceVideoRequest, videoServiceFor } = lib('credits/aiPricing.js');
const { DEFAULT_SETTINGS } = lib('engine/registry.js');
const medios = mediosDeWee(FFMPEG);

const PERFILES = { '360p': [360, 640], '480p': [480, 854] }; // vertical 9:16, como un Weël
const ms = (t0) => Math.round(performance.now() - t0);
const generar = (args) => { const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args]); if (r.status !== 0) throw new Error(String(r.stderr)); };

console.log('── A · FFmpeg de WITE sobre clips sintéticos (MEDIDO) ──');
const filasA = [];
for (const [res, [w, h]] of Object.entries(PERFILES)) {
  for (const d of [5, 10, 15]) {
    const original = path.join(salidaDir, `original-${res}-${d}s.mp4`);
    const transformado = path.join(salidaDir, `transformado-${res}-${d}s.mp4`);
    // El «original»: imagen en movimiento + voz sintética (tono). El «transformado»: otra imagen, MUDO (generate_audio: false).
    generar(['-f', 'lavfi', '-i', `testsrc2=size=${w}x${h}:rate=24:duration=${d}`, '-f', 'lavfi', '-i', `sine=frequency=440:duration=${d}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', original]);
    generar(['-f', 'lavfi', '-i', `mandelbrot=size=${w}x${h}:rate=24`, '-t', String(d), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', transformado]);

    let t0 = performance.now(); const sonda = await medios.sondear(original); const tSonda = ms(t0);
    t0 = performance.now(); const cambios = await medios.cambiosPorSegundo(original, sonda.duracionSec); const tMov = ms(t0);
    const decision = decidirResolucion({ ancho: sonda.ancho, alto: sonda.alto, fps: sonda.fps, duracionSec: sonda.duracionSec, cambiosPorSegundo: cambios }, specOf(SEEDANCE_MODEL_IDS.SEEDANCE_2_0_MINI).resolutions);
    const sondaT = await medios.sondear(transformado);
    t0 = performance.now(); const bytes = await medios.remezclar(transformado, original, sondaT.video === 'h264'); const tRemux = ms(t0);
    const final = path.join(salidaDir, `final-${res}-${d}s.mp4`);
    writeFileSync(final, bytes);
    const sondaF = await medios.sondear(final);
    const fila = {
      perfil: res, duracionSec: d,
      sonda: { ms: tSonda, duracion: sonda.duracionSec, ancho: sonda.ancho, alto: sonda.alto, fps: sonda.fps, conSonido: sonda.conSonido },
      movimiento: { ms: tMov, cambiosPorSegundo: cambios },
      controlador: decision,
      remezcla: { ms: tRemux, bytesFinal: bytes.length, codec: sondaF.video, conSonido: sondaF.conSonido, duracion: sondaF.duracionSec },
      bytesOriginal: statSync(original).size,
    };
    filasA.push(fila);
    console.log(`${res} ${String(d).padStart(2)}s · sonda ${tSonda} ms · movimiento ${tMov} ms (${cambios}/s) · remux ${tRemux} ms → ${(bytes.length / 1024).toFixed(0)} KB ${sondaF.video} audio=${sondaF.conSonido} · controlador ${decision.resolucion} [${decision.motivos.join(', ')}]`);
  }
}

console.log('\n── B · Coste del proveedor por clip a 480p (FÓRMULA, sin tarea real) ──');
const filasB = [];
for (const k of ['SEEDANCE_2_0_MINI', 'SEEDANCE_2_0_FAST', 'SEEDANCE_2_0', 'SEEDANCE_2_5']) {
  const modelId = SEEDANCE_MODEL_IDS[k];
  const input = { taskType: 'edit', durationSec: -1, resolution: '480p', referenceVideos: ['v'], referenceImages: ['i'] };
  const e = peticionEfectivaDeSeedance('video.reference', modelId, input, {});
  const techo = priceVideoRequest({ capability: 'video.reference', modelId, input, prefs: {} }, DEFAULT_SETTINGS);
  const service = videoServiceFor(modelId, '480p');
  for (const d of [5, 10, 15]) {
    const usdReal = (e.estimatedTokens / (e.inputVideoSec + e.outputSec)) * (2 * d) * e.ratePerMillion / 1e6;
    const real = { ...DEFAULT_SETTINGS, pricingMode: 'real' };
    const fila = {
      modelo: k, duracionSec: d, usdProveedor: Number(usdReal.toFixed(3)),
      creditsReservados: techo.credits, usdTecho: Number(techo.usd.toFixed(2)),
      creditsConsumoReal_modoPrueba: Math.min(techo.credits, creditosDeUnCoste(service, usdReal, DEFAULT_SETTINGS)),
      creditsConsumoReal_modoReal: creditosDeUnCoste(service, usdReal, real),
      objetivo_0_25: usdReal <= 0.25, objetivo_0_40: usdReal <= 0.40,
    };
    filasB.push(fila);
    console.log(`${k.padEnd(18)} ${String(d).padStart(2)}s · proveedor ≈ $${fila.usdProveedor.toFixed(2)} · reserva ${fila.creditsReservados} cr (techo $${fila.usdTecho}) · cobro real: ${fila.creditsConsumoReal_modoPrueba} cr (modo prueba) / ${fila.creditsConsumoReal_modoReal} cr (modo real) · ≤0,25: ${fila.objetivo_0_25 ? 'sí' : 'no'} · ≤0,40: ${fila.objetivo_0_40 ? 'sí' : 'no'}`);
  }
}

const informe = { fecha: new Date().toISOString(), ffmpeg: spawnSync(FFMPEG, ['-version']).stdout.toString().split('\n')[0], ajustes: { creditsPerUsd: DEFAULT_SETTINGS.creditsPerUsd, margin: DEFAULT_SETTINGS.margin, pricingMode: DEFAULT_SETTINGS.pricingMode }, medido: filasA, formula: filasB };
writeFileSync(path.join(salidaDir, 'informe.json'), JSON.stringify(informe, null, 2));
console.log(`\nInforme: ${path.join(salidaDir, 'informe.json')}`);
