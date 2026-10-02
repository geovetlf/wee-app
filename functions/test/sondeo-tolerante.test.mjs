/*
 * UN GET DE ESTADO QUE FALLA NO MATA UNA TAREA QUE SIGUE VIVA — auditoría H0, escenario #3.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * `pollUntil` (engine/http.ts) sondea las tareas asíncronas de Seedance (vídeo)
 * y FLUX (imagen). Una sola consulta de estado con 503, 429 o sin respuesta
 * lanzaba fuera del bucle: el trabajo fallaba y se reembolsaba… mientras el
 * proveedor seguía generando, y Weë pagaba esa generación igual.
 *
 * Ahora una consulta pasajera (5xx, 429, red) se tolera hasta 3 veces seguidas
 * dentro del plazo; un 4xx o un error que no es del proveedor terminan en el
 * acto, como antes. El sondeo nunca vuelve a crear la tarea: solo pregunta.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../', p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const { pollUntil, ProviderError } = lib('engine/http.js');
const opciones = { intervalMs: 1, timeoutMs: 5_000, provider: 'seedance' };
const pasajero = (status) => new ProviderError(`seedance respondió ${status ?? 'sin respuesta'}`, 'seedance', status, true);
/* Una secuencia de respuestas: un Error se lanza; lo demás se devuelve. */
const secuencia = (pasos) => {
  let i = 0;
  const check = async () => {
    const paso = pasos[Math.min(i, pasos.length - 1)];
    i++;
    if (paso instanceof Error) throw paso;
    return paso;
  };
  check.llamadas = () => i;
  return check;
};
const intentar = (p) => p.then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));
const listo = { done: true, value: 'video.mp4' };
const enCurso = { done: false };

const r1 = await intentar(pollUntil(secuencia([pasajero(503), listo]), opciones));
check('1) un 503 en una consulta de estado se tolera y la tarea termina bien', r1.ok && r1.v === 'video.mp4');
const r2 = await intentar(pollUntil(secuencia([pasajero(429), pasajero(429), listo]), opciones));
check('2) dos 429 seguidos, también', r2.ok);
const r3 = await intentar(pollUntil(secuencia([pasajero(undefined), listo]), opciones));
check('3) una consulta sin respuesta (red, tiempo agotado), también', r3.ok);
const s4 = secuencia([pasajero(503), pasajero(503), pasajero(503), listo]);
const r4 = await intentar(pollUntil(s4, opciones));
check('4) hasta 3 fallos pasajeros seguidos se toleran', r4.ok && s4.llamadas() === 4);
const r5 = await intentar(pollUntil(secuencia([pasajero(503), pasajero(503), pasajero(503), pasajero(503), listo]), opciones));
check('5) el 4.º fallo seguido termina: el proveedor no contesta de verdad', !r5.ok && /503/.test(String(r5.e?.message)));
const s6 = secuencia([pasajero(503), pasajero(503), enCurso, pasajero(503), pasajero(503), listo]);
const r6 = await intentar(pollUntil(s6, opciones));
check('6) una respuesta buena entre fallos reinicia la cuenta', r6.ok);
const s7 = secuencia([new ProviderError('seedance respondió 404: no existe', 'seedance', 404, false), listo]);
const r7 = await intentar(pollUntil(s7, opciones));
check('7) un 4xx (no reintentable) termina en el acto, como antes', !r7.ok && /404/.test(String(r7.e?.message)) && s7.llamadas() === 1);
const s8 = secuencia([new Error('Firestore no disponible'), listo]);
const r8 = await intentar(pollUntil(s8, opciones));
check('8) un error que no es del proveedor también termina en el acto, como antes', !r8.ok && s8.llamadas() === 1);
const r9 = await intentar(pollUntil(secuencia([{ done: true, error: 'la tarea terminó en estado failed' }]), opciones));
check('9) una tarea que el proveedor da por FALLIDA termina en el acto (eso no es un GET que falla)', !r9.ok && /failed/.test(String(r9.e?.message)));
const r10 = await intentar(pollUntil(secuencia([enCurso]), { ...opciones, timeoutMs: 30 }));
check('10) el plazo sigue mandando', !r10.ok && /tardó más de/.test(String(r10.e?.message)));

/* Las dos tareas asíncronas usan este sondeo (no un bucle propio que se salte la tolerancia). */
check('11) Seedance y FLUX sondean con pollUntil',
  /pollUntil</.test(leer('functions/src/engine/providers/seedance.ts')) && /pollUntil</.test(leer('functions/src/engine/providers/flux.ts')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
