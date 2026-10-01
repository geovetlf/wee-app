/*
 * UNA LIQUIDACIÓN QUE FALLA QUEDA ESCRITA — auditoría H0, escenario #15a.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * `settleCredits` (creator/credits.ts) cierra la reserva de un trabajo de Weë AI:
 * completa lo usado o reembolsa. Si el Credit Engine fallaba (p. ej. Firestore
 * sin responder), el error se tragaba y la reserva se quedaba AUTHORIZED para
 * siempre sin que nadie lo supiera. Ahora queda `liquidacionPendiente` en el
 * propio trabajo; a la persona no le cambia nada.
 *
 * Aquí se EJECUTA `settleCredits` con el Credit Engine y Firestore sustituidos.
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

const firestore = require('firebase-admin/firestore');
const docs = new Map();
let escrituraFalla = false;
const baseFalsa = {
  collection: (c) => ({
    doc: (id) => ({
      /* Como Firestore: `set` con merge CREA el documento si no existe… */
      set: async (d) => {
        if (escrituraFalla) throw new Error('Firestore tampoco responde');
        docs.set(`${c}/${id}`, { ...(docs.get(`${c}/${id}`) || {}), ...d });
      },
      /* …y `update` falla si no existe (no crea fantasmas). */
      update: async (d) => {
        if (escrituraFalla) throw new Error('Firestore tampoco responde');
        if (!docs.has(`${c}/${id}`)) throw new Error('5 NOT_FOUND: No document to update');
        docs.set(`${c}/${id}`, { ...docs.get(`${c}/${id}`), ...d });
      },
    }),
  }),
};
const getFirestoreReal = firestore.getFirestore;
firestore.getFirestore = () => baseFalsa;

const motor = lib('credits/creditEngine.js').creditEngine;
const libro = lib('engine/ledger.js').firestoreLedger;
const { settleCredits } = lib('creator/credits.js');
const orig = { completa: motor.completeCredits, reembolsa: motor.refundCredits, liquida: libro.settle };

let c = {};
/* Los trabajos existen (los crea creatorChat antes de que nadie liquide). */
const TRABAJOS = ['job1', 'job2', 'job3', 'job4', 'job5'];
const reiniciar = () => {
  c = { completa: 0, reembolsa: 0, libro: 0 };
  docs.clear();
  for (const id of TRABAJOS) docs.set(`creatorJobs/${id}`, { status: 'running' });
  escrituraFalla = false;
};
const pendienteDe = (id) => (docs.get(`creatorJobs/${id}`) || {}).liquidacionPendiente;
libro.settle = async () => { c.libro++; return { credited: 0 }; };
const intentar = (p) => p.then(() => ({ ok: true }), (e) => ({ ok: false, e }));

/* 1 · Lo normal: se liquida y no queda nada pendiente. */
reiniciar();
motor.completeCredits = async () => { c.completa++; return { status: 'COMPLETED', refunded: 0, balanceAfter: 0 }; };
const r1 = await intentar(settleCredits('u1', 'job1', 12, 10, 'WEË AI · Design'));
check('1) una liquidación normal completa lo usado y no deja nada pendiente',
  r1.ok && c.completa === 1 && c.libro === 1 && !pendienteDe('job1'));

/* 2 · El Credit Engine falla al completar. */
reiniciar();
motor.completeCredits = async () => { c.completa++; throw new Error('deadline exceeded'); };
const r2 = await intentar(settleCredits('u1', 'job2', 12, 10, 'WEË AI · Design'));
const p2 = (docs.get('creatorJobs/job2') || {}).liquidacionPendiente;
check('2) si completar falla, a la persona no le cambia nada (no se lanza)', r2.ok);
check('3) …pero queda escrito en el trabajo qué faltó: completar 10 de 12 retenidos',
  p2 && p2.accion === 'completar' && p2.retenido === 12 && p2.usado === 10 && /deadline exceeded/.test(p2.motivo) && p2.at, JSON.stringify(p2));

/* 3 · El Credit Engine falla al reembolsar. */
reiniciar();
motor.refundCredits = async () => { c.reembolsa++; throw new Error('unavailable'); };
const r3 = await intentar(settleCredits('u1', 'job3', 12, 0, 'WEË AI · Design'));
const p3 = (docs.get('creatorJobs/job3') || {}).liquidacionPendiente;
check('4) si reembolsar falla, también queda escrito: reembolsar los 12', r3.ok && p3 && p3.accion === 'reembolsar' && p3.retenido === 12 && p3.usado === 0);

/* 4 · Y si tampoco se puede escribir, no se rompe nada más. */
reiniciar();
escrituraFalla = true;
const r4 = await intentar(settleCredits('u1', 'job4', 12, 0, 'WEË AI · Design'));
check('5) si tampoco se puede anotar, se registra en el log y el trabajo sigue', r4.ok);

/* 5 · Sin reserva no hay nada que liquidar. */
reiniciar();
const r5 = await intentar(settleCredits('u1', 'job5', 0, 0, 'WEË AI · Design'));
check('6) sin nada retenido no se toca nada', r5.ok && c.completa === 0 && c.reembolsa === 0 && !pendienteDe('job5'));

/* 6 · El trabajo ya no existe: no se crea un documento fantasma. */
reiniciar();
motor.refundCredits = async () => { c.reembolsa++; throw new Error('unavailable'); };
const r6 = await intentar(settleCredits('u1', 'borrado', 12, 0, 'WEË AI · Design'));
check('7) si el trabajo ya no existe, no se crea un documento fantasma (y no se lanza)', r6.ok && !docs.has('creatorJobs/borrado'));

Object.assign(motor, { completeCredits: orig.completa, refundCredits: orig.reembolsa });
libro.settle = orig.liquida;
firestore.getFirestore = getFirestoreReal;
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
