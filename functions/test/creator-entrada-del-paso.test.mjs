/*
 * LA PETICIÓN DE UN PASO, EN UN SOLO SITIO (correcciones 1–5, 2026-10-07).
 *
 * La ruta previa de `creatorRun` (`peticionesDelPlan`, antes de cobrar) y su bucle (al ejecutar) armaban cada uno su
 * copia del input y de las preferencias de ruta (familia/allowedProviders, quality, durationSec). Ahora las dos usan
 * `entradaDelPaso`. Esta suite fija:
 *   A. EQUIVALENCIA EXACTA con la implementación anterior (copiada aquí como oráculo, tal como estaba en el índice
 *      antes de la corrección) sobre un abanico de pasos: texto, voz con familia, lista vacía, familia mal formada,
 *      calidad del trabajo y del paso, duración, imagen, edición de imagen con foto y vídeo con foto de referencia.
 *   B. Que el bucle usa la función común y ya no tiene su propia copia; que no se tocó ni el precio ni el Router.
 * Determinista, sin red.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const lib = (p) => require(path.join(RAIZ, 'functions/lib', p));

const creator = lib('creator/index.js');
const { stepInputFor } = lib('creator/inputs.js');
const { normalizeVideoRequest, videoRequestFromStep } = lib('engine/video.js');
const { planImage } = lib('engine/image.js');
const { DEFAULT_SETTINGS } = lib('engine/registry.js');

let ok = 0; let mal = 0;
const check = (n, c, extra = '') => { if (c) { ok++; console.log(`✔ ${n}`); } else { mal++; console.log(`✘ ${n} ${extra}`); } };

/* ── El oráculo: `peticionesDelPlan` y el armado del bucle ANTES de unificarlos (copia literal, en JS). ── */
const viejaPeticionesDelPlan = (job, uid, settings) => job.steps.map((step) => {
  const input = stepInputFor(job, step, []);
  if (job.quality) input.quality = job.quality;
  const stepInput = step.input || {};
  const familia = stepInput.allowedProviders;
  const soloEstos = Array.isArray(familia) && familia.every((p) => typeof p === 'string') ? familia : undefined;
  const prefs = {
    quality: stepInput.quality || 'auto',
    durationSec: stepInput.durationSec ? Number(stepInput.durationSec) : undefined,
    ...(soloEstos ? { allowedProviders: soloEstos } : {}),
  };
  if (step.capability.startsWith('video.')) {
    const n = normalizeVideoRequest(videoRequestFromStep(step.capability, input), settings);
    return { userId: uid, capability: n.capability, input: n.input, prefs: n.prefs };
  }
  if (step.capability.startsWith('image.')) {
    const planned = planImage({ capability: step.capability, input });
    return { userId: uid, capability: step.capability, input: planned.input, prefs: { ...prefs, ...planned.prefs } };
  }
  return { userId: uid, capability: step.capability, input, prefs };
});
const viejoBucle = (job, next, previous) => {
  const input = stepInputFor(job, next, previous);
  if (job.quality) input.quality = job.quality;
  const stepInput = next.input || {};
  const familiaDelPaso = stepInput.allowedProviders;
  const soloEstos = Array.isArray(familiaDelPaso) && familiaDelPaso.every((p) => typeof p === 'string') ? familiaDelPaso : undefined;
  const prefs = {
    quality: stepInput.quality || 'auto',
    durationSec: stepInput.durationSec ? Number(stepInput.durationSec) : undefined,
    ...(soloEstos ? { allowedProviders: soloEstos } : {}),
  };
  return { input, prefs };
};

const paso = (id, capability, input, dependsOn = []) => ({ id, capability, purpose: `propósito ${id}`, input, dependsOn, status: 'pending' });
const pasos = [
  paso('t1', 'text.generate', { kind: 'script', brief: 'un guion' }),
  paso('v1', 'voice.tts', { allowedProviders: ['elevenlabs'] }, ['t1']),
  paso('v2', 'voice.tts', { allowedProviders: [] }),
  paso('v3', 'voice.tts', { allowedProviders: ['elevenlabs', 3] }),
  paso('t2', 'text.generate', { kind: 'caption', quality: 'premium', durationSec: '7' }),
  paso('i1', 'image.generate', { kind: 'poster', brief: 'un cartel' }),
  paso('i2', 'image.edit', { kind: 'retouch', quality: 'standard' }),
  paso('vid', 'video.generate', { brief: 'un vídeo', durationSec: 5 }),
  paso('vid2', 'video.image_to_video', { brief: 'animar', durationSec: 8 }),
];
const trabajos = [
  { experienceId: 'studio', goal: 'Un anuncio de café', locale: 'es-ES', steps: pasos },
  { experienceId: 'design', goal: 'A coffee poster', locale: 'en-US', quality: 'premium', inputImageUrl: 'https://firebasestorage.googleapis.com/v0/b/demo/o/users%2Fu%2Fcreator-inputs%2Fa.png', steps: pasos },
  { experienceId: 'writer', goal: 'Texto', locale: 'pt-BR', quality: 'economy', steps: pasos.filter((s) => !s.capability.startsWith('video.') && !s.capability.startsWith('image.')) },
];
const probar = (f) => { try { return { ok: f() }; } catch (e) { return { error: `${e.code || ''}:${e.message}` }; } };

/* ── A. Equivalencia ── */
let casos = 0;
for (const [i, job] of trabajos.entries()) {
  const antes = probar(() => viejaPeticionesDelPlan(job, 'u1', DEFAULT_SETTINGS));
  const ahora = probar(() => creator.peticionesDelPlan(job, 'u1', DEFAULT_SETTINGS));
  check(`1.${i}) peticionesDelPlan da EXACTAMENTE lo mismo que antes (trabajo ${job.experienceId}, ${job.steps.length} pasos)`, isDeepStrictEqual(antes, ahora),
    JSON.stringify({ antes, ahora }).slice(0, 400));
  for (const step of job.steps) {
    for (const previous of [[], ['texto anterior'], ['a', 'https://x/y.png']]) {
      casos++;
      const a = probar(() => viejoBucle(job, step, previous));
      const b = probar(() => creator.entradaDelPaso(job, step, previous));
      if (!isDeepStrictEqual(a, b)) check(`2) el bucle arma lo mismo que antes: ${job.experienceId}/${step.id}/${previous.length}`, false, JSON.stringify({ a, b }).slice(0, 300));
    }
  }
}
check(`2) el input y las preferencias del bucle son idénticos a los de antes en ${casos} casos`, mal === 0);
check('3) los casos cubren familia válida, vacía y mal formada (la vacía se transporta; la mal formada se ignora)',
  isDeepStrictEqual(creator.entradaDelPaso(trabajos[0], pasos[1], []).prefs.allowedProviders, ['elevenlabs'])
  && isDeepStrictEqual(creator.entradaDelPaso(trabajos[0], pasos[2], []).prefs.allowedProviders, [])
  && !('allowedProviders' in creator.entradaDelPaso(trabajos[0], pasos[3], []).prefs));
check('4) la calidad del trabajo manda en el input; la del paso, en las preferencias; la duración se convierte a número',
  creator.entradaDelPaso(trabajos[1], pasos[4], []).input.quality === 'premium'
  && creator.entradaDelPaso(trabajos[1], pasos[4], []).prefs.quality === 'premium'
  && creator.entradaDelPaso(trabajos[0], pasos[4], []).prefs.durationSec === 7);
check('5) la ruta previa de un paso es la petición de ese paso (peticionDelPaso) para todo el plan',
  isDeepStrictEqual(creator.peticionesDelPlan(trabajos[0], 'u1', DEFAULT_SETTINGS), trabajos[0].steps.map((s) => creator.peticionDelPaso(trabajos[0], s, 'u1', DEFAULT_SETTINGS))));

/* ── B. Un solo sitio, sin tocar precio ni Router ── */
const src = leer('functions/src/creator/index.ts');
const run = src.slice(src.indexOf('export const creatorRun = onCall('));
check('6) el bucle de creatorRun usa entradaDelPaso y ya no tiene su copia (familiaDelPaso / stepInputFor / RoutingPrefs propios)',
  /const \{ input, prefs \} = entradaDelPaso\(job, next, previous\);/.test(run) && !/familiaDelPaso|stepInputFor\(|const prefs: RoutingPrefs/.test(run));
check('7) peticionDelPaso y el bucle comparten la misma función; el armado vive una sola vez en el archivo',
  (src.match(/const familiaDelPaso = stepInput\.allowedProviders;/g) || []).length === 1
  && (src.match(/stepInputFor\(/g) || []).length === 1 && /const \{ input, prefs \} = entradaDelPaso\(job, step, previous\);/.test(src));
check('8) la ruta previa sigue antes del limitador y del cobro, con las mismas peticiones',
  run.indexOf('exigirRutaElegible(peticionesDelPlan(') > 0 && run.indexOf('exigirRutaElegible(') < run.indexOf('limiter.reserve(') && run.indexOf('limiter.reserve(') < run.indexOf('holdCredits('));
check('9) el bucle sigue mandando vídeo al Weë Video Engine e imagen con prefs de la familia + plan de imagen (sin cambio)',
  /videoEngine\.generate\(videoRequestFromStep\(next\.capability, input\), stepCtx\)/.test(run) && /prefs: \{ \.\.\.prefs, \.\.\.planned\.prefs \}/.test(run));

console.log(`\n${ok} ✔ · ${mal} ✘`);
process.exitCode = mal ? 1 : 0;
