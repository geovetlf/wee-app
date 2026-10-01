/*
 * EL AVATAR NO SE GENERA DOS VECES POR LA MISMA OPERACIÓN — auditoría H0, escenario #11.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * `withCredits` (functions/src/generateAvatar.ts) cobra por requestId. Antes:
 *  · un duplicado AUTHORIZED (la primera llamada todavía generando) volvía a
 *    generar y, si fallaba, REEMBOLSABA la reserva de la primera: Weë pagaba
 *    dos generaciones y la persona ninguna;
 *  · un duplicado COMPLETED que no aparecía en las 200 últimas transacciones
 *    se generaba gratis otra vez;
 *  · sin requestId se inventaba uno, y la operación quedaba sin protección.
 *
 * Aquí se EJECUTA la función compilada con el Credit Engine y el proveedor de
 * imagen sustituidos, y se cuenta cuántas veces se genera, se completa y se
 * reembolsa.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const motorMod = lib('credits/creditEngine.js');
const vertexMod = lib('vertexAI.js');
const avatarMod = lib('generateAvatar.js');
const motor = motorMod.creditEngine;
const originales = { ...motor, gen: vertexMod.generateAvatarWithImagen, subir: vertexMod.uploadImageToStorage };

let c = {};
let gasto = () => ({ transactionId: 'usage_x', status: 'AUTHORIZED', amount: 5, duplicate: false });
let historial = [];
let generar = async () => 'data:image/png;base64,AAAA';
const reiniciar = () => { c = { gasta: 0, genera: 0, completa: 0, reembolsa: 0 }; };
motor.ensureAccount = async () => ({});
motor.spendCredits = async () => { c.gasta++; return gasto(); };
motor.getCreditHistory = async () => historial;
motor.completeCredits = async () => { c.completa++; return { status: 'COMPLETED', refunded: 0, balanceAfter: 0 }; };
motor.refundCredits = async () => { c.reembolsa++; return { transactionId: 'refund_x', amount: 5, balanceAfter: 0, duplicate: false }; };
vertexMod.generateAvatarWithImagen = async (...a) => { c.genera++; return generar(...a); };
vertexMod.uploadImageToStorage = async () => 'https://firebasestorage.googleapis.com/v0/b/get-wee.firebasestorage.app/o/nuevo.png';

const pedir = (data) => avatarMod.generateAvatarWithGemini.run({ auth: { uid: 'u1' }, data }).then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));
const SEL = { selections: { gender: 'female' } };

/* 1 · Lo normal sigue igual. */
reiniciar();
const r1 = await pedir({ ...SEL, requestId: 'avatar_a1' });
check('1) una operación nueva genera una vez, completa una vez y devuelve la imagen',
  r1.ok && c.genera === 1 && c.completa === 1 && c.reembolsa === 0 && /nuevo\.png/.test(r1.v.imageUrl), JSON.stringify(c));

/* 2 · El duplicado en marcha. */
reiniciar();
gasto = () => ({ transactionId: 'usage_avatar_a2', status: 'AUTHORIZED', amount: 5, duplicate: true });
const r2 = await pedir({ ...SEL, requestId: 'avatar_a2' });
check('2) la misma operación TODAVÍA EN MARCHA no vuelve a generar', c.genera === 0, JSON.stringify(c));
check('3) …ni reembolsa la reserva de la primera (que sigue generando)', c.reembolsa === 0 && c.completa === 0);
check('4) …y contesta «ya está en marcha»', !r2.ok && r2.e.code === 'already-exists' && r2.e.details?.reason === 'in_progress', String(r2.e?.code));

/* 3 · El duplicado ya terminado. */
reiniciar();
gasto = () => ({ transactionId: 'usage_avatar_a3', status: 'COMPLETED', amount: 5, duplicate: true });
historial = [{ id: 'usage_avatar_a3', meta: { imageUrl: 'https://firebasestorage.googleapis.com/v0/b/get-wee.firebasestorage.app/o/guardado.png' } }];
const r3 = await pedir({ ...SEL, requestId: 'avatar_a3' });
check('5) la misma operación YA TERMINADA devuelve su imagen, sin generar ni cobrar', r3.ok && /guardado\.png/.test(r3.v.imageUrl) && c.genera === 0 && c.completa === 0);
reiniciar();
historial = [];
const r4 = await pedir({ ...SEL, requestId: 'avatar_a3' });
check('6) si no se encuentra su imagen, dice que ya terminó: NO la genera gratis otra vez',
  !r4.ok && r4.e.code === 'already-exists' && r4.e.details?.reason === 'result_not_available' && c.genera === 0, JSON.stringify(c));

/* 4 · Sin requestId no hay operación. */
reiniciar();
gasto = () => ({ transactionId: 'usage_x', status: 'AUTHORIZED', amount: 5, duplicate: false });
const r5 = await pedir({ ...SEL });
check('7) sin requestId se rechaza antes de cobrar o generar (antes se inventaba uno)',
  !r5.ok && r5.e.code === 'invalid-argument' && c.gasta === 0 && c.genera === 0, String(r5.e?.code));
const r6 = await avatarMod.avatarReplacement.run({ auth: { uid: 'u1' }, data: { selfieUrl: 'x', avatarUrl: 'y' } }).then(() => ({ ok: true }), (e) => ({ ok: false, e }));
check('8) también en el reemplazo de persona', !r6.ok && r6.e.code === 'invalid-argument' && c.gasta === 0);

/* 5 · CONTROL: si la generación falla, se devuelve lo cobrado, como siempre. */
reiniciar();
generar = async () => { throw new Error('el proveedor no respondió'); };
const r7 = await pedir({ ...SEL, requestId: 'avatar_a7' });
check('9) CONTROL: un fallo de una operación NUEVA se reembolsa una vez', !r7.ok && c.genera === 1 && c.reembolsa === 1 && c.completa === 0, JSON.stringify(c));

Object.assign(motor, originales);
vertexMod.generateAvatarWithImagen = originales.gen;
vertexMod.uploadImageToStorage = originales.subir;

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
