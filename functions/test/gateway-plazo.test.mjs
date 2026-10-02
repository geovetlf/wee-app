/*
 * EL PLAZO DEL TRABAJO LLEGA AL ROUTER — auditoría H0, escenario #16.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * `creatorRun` calcula su `deadlineAt` y lo pone en el contexto de cada paso,
 * y el router ya sabe usarlo (a cada intento le da lo más corto entre su tabla
 * y lo que QUEDA). Pero `runCapability` —la puerta de compatibilidad por la que
 * pasan los pasos de texto, voz e imagen— no lo pasaba: un paso podía recibir
 * más tiempo del que le quedaba al trabajo, la plataforma mataba el proceso y
 * nadie liquidaba los Credits retenidos.
 *
 * Aquí se ejecuta `runCapability` con el motor sustituido y se mira qué recibe.
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

const engineMod = lib('engine/index.js');
const { runCapability } = lib('gateway/index.js');
const generarReal = engineMod.engine.generate;
let recibido = null;
engineMod.engine.generate = async (req) => {
  recibido = req;
  return { output: { kind: 'text', content: 'hola' }, usage: {}, costUSD: 0, latencyMs: 1, provider: 'mock', credits: 0, generationId: 'g1', demo: true, attempts: 1 };
};

const ctx = { userId: 'u1', jobId: 'j1', experienceId: 'design', goal: 'un cartel', stepId: 's1' };
await runCapability('text.generate', { prompt: 'hola' }, { ...ctx, deadlineAt: 1_900_000_000_000 });
check('1) el plazo del trabajo llega al motor', recibido && recibido.deadlineAt === 1_900_000_000_000, String(recibido && recibido.deadlineAt));
await runCapability('text.generate', { prompt: 'hola' }, ctx);
check('2) sin plazo, el motor no recibe ninguno (comportamiento de siempre)', recibido && recibido.deadlineAt === undefined);

/* Quien llama ya lo ponía: lo que faltaba era el puente. */
check('3) creatorRun pone su deadlineAt en el contexto de los pasos',
  /const ctx = \{[^}]*\bdeadlineAt\b[^}]*\}/.test(leer('functions/src/creator/index.ts')));
check('4) y el router usa lo que QUEDA, no la tabla entera (presupuestoDeIntento)',
  /presupuestoDeIntento\(request\.deadlineAt/.test(leer('functions/src/engine/router.ts')));

engineMod.engine.generate = generarReal;
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
