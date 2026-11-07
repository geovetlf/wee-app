/**
 * GRAN MOTOR · PAQUETE G — LO QUE SOLO SE PRUEBA CON FIRESTORE DE VERDAD (emulador).
 *
 * `gran-motor-g-filmmaker.test.mjs` demuestra con una base en memoria que dos ediciones a la vez del mismo plano o de
 * la misma escena ya no se pisan (G-1: `actualizarPlano` / `actualizarEscena` leen y escriben en una transacción).
 * Aquí lo mismo contra las transacciones REALES del emulador de Firestore, donde la carrera es de verdad:
 *
 *   A  veinte ediciones simultáneas de un plano (narrativa y orden): ninguna se pierde, la versión sube veinte;
 *   B  veinte ediciones simultáneas de una escena: igual;
 *   C  dos cambios de estado incompatibles a la vez: uno se aplica y el otro se rechaza como transición inválida;
 *   D  lo ajeno y lo inexistente siguen contestando igual.
 *
 *   firebase emulators:exec --only firestore --project demo-wee-filmmaker "node functions/test/gran-motor-g-filmmaker.emulator.mjs"
 *
 * Solo proyectos demo-*; nunca toca ningún dato real. La red está cortada.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
if (!process.env.FIRESTORE_EMULATOR_HOST) { console.log('✘ sin el emulador de Firestore no se corre'); process.exit(2); }
globalThis.fetch = async () => { throw new Error('red cortada en la prueba'); };

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const admin = require('firebase-admin');
admin.initializeApp({ projectId: PROY });
const db = admin.firestore();
const sh = require(path.resolve(here, '../lib/shots/index.js'));

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const marca = Date.now().toString(36);
const A = `gmgA${marca}`;
const B = `gmgB${marca}`;
const T0 = 1_800_000_000_000;
const deps = { db };
const N = 20;

console.log('\n── A · Veinte ediciones simultáneas de un plano ──');
{
  const proyecto = `proy-${marca}`;
  await sh.crearEscena({ accountId: A, sceneId: `esc-${marca}`, projectId: proyecto, order: 0, at: T0 }, deps);
  await sh.crearPlano({ accountId: A, shotId: `pl-${marca}`, projectId: proyecto, sceneId: `esc-${marca}`, order: 0, at: T0 }, deps);
  const v0 = (await sh.leerPlano(A, `pl-${marca}`, deps)).version;
  const r = await Promise.all(Array.from({ length: N }, (_, i) => sh.actualizarPlano(A, `pl-${marca}`, i % 2 === 0
    ? { narrative: `n${i}`, at: T0 + 1 + i }
    : { order: i, at: T0 + 1 + i }, deps)));
  const p = await sh.leerPlano(A, `pl-${marca}`, deps);
  check('A1 las veinte se aplican (ninguna rechazada)', r.every((x) => x.status === 'actualizado'), r.map((x) => x.status).join(','));
  check('A2 la versión cuenta las veinte: ninguna escritura se perdió', p.version === v0 + N, `${v0} → ${p.version}`);
  check('A3 y cada campo conserva una de sus ediciones (no queda vacío)', typeof p.narrative === 'string' && /^n\d+$/.test(p.narrative) && Number.isInteger(p.order) && p.order % 2 === 1, `narrative=${p.narrative} order=${p.order}`);
}

console.log('\n── B · Veinte ediciones simultáneas de una escena ──');
{
  const e0 = (await sh.leerEscena(A, `esc-${marca}`, deps)).version;
  const r = await Promise.all(Array.from({ length: N }, (_, i) => sh.actualizarEscena(A, `esc-${marca}`, i % 2 === 0
    ? { name: `nombre${i}`, at: T0 + 100 + i }
    : { narrative: `hist${i}`, at: T0 + 100 + i }, deps)));
  const e = await sh.leerEscena(A, `esc-${marca}`, deps);
  check('B1 las veinte se aplican', r.every((x) => x.status === 'actualizado'));
  check('B2 la versión sube veinte y los dos campos existen', e.version === e0 + N && typeof e.name === 'string' && typeof e.narrative === 'string', `${e0} → ${e.version}`);
}

console.log('\n── C · Dos cambios de estado incompatibles a la vez ──');
{
  const id = `pl2-${marca}`;
  await sh.crearPlano({ accountId: A, shotId: id, projectId: `proy-${marca}`, order: 1, at: T0 }, deps);
  await sh.actualizarPlano(A, id, { state: 'ready', at: T0 + 1 }, deps);
  const [x, y] = await Promise.all([
    sh.actualizarPlano(A, id, { state: 'draft', at: T0 + 2 }, deps),
    sh.actualizarPlano(A, id, { state: 'generated', at: T0 + 3 }, deps),
  ]);
  const fin = await sh.leerPlano(A, id, deps);
  const estados = [x.status, y.status].sort();
  check('C1 uno se aplica y el otro es transición inválida (draft→generated no existe)', estados[0] === 'actualizado' && estados[1] === 'transicion_invalida', `${x.status}/${y.status}`);
  check('C2 el estado final es el del que ganó, coherente con ese resultado', (x.status === 'actualizado' && fin.state === 'draft') || (y.status === 'actualizado' && fin.state === 'generated'), fin.state);
}

console.log('\n── D · Lo ajeno y lo inexistente ──');
{
  check('D1 otra cuenta: no_encontrado', (await sh.actualizarPlano(B, `pl-${marca}`, { order: 1, at: T0 + 9 }, deps)).status === 'no_encontrado');
  check('D2 lo que no existe: no_encontrado', (await sh.actualizarEscena(A, `no-existe-${marca}`, { name: 'x', at: T0 + 9 }, deps)).status === 'no_encontrado');
}

console.log(failures ? `\n✘ ${failures} comprobaciones fallan` : `\n✔ todo bien (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
