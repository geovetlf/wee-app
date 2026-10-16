/*
 * GRAN MOTOR · PAQUETE C — EL DINERO NO SE DUPLICA NI SE PIERDE (2026-10-16).
 *
 * Qué demuestra, con el Credit Engine REAL (lib/credits/creditEngine.js) sobre un
 * Firestore en memoria cuyas transacciones son serializables (el mismo contrato
 * que da Firestore: dos transacciones que tocan el mismo documento no se ven a
 * medias) y con inyección de fallos:
 *
 *   A  el mismo requestId lanzado a la vez N veces cobra UNA vez
 *   B  saldo insuficiente concurrente: nunca se cobra más de lo que hay
 *   C  completar contra reembolsar, a la vez y en los dos órdenes: gana UNO
 *   D  callback tardío / duplicado tras el reembolso: no cobra ni regala
 *   E  fallos del almacén antes y DESPUÉS del commit (timeout del cliente): el
 *      reintento no cobra dos veces ni devuelve dos veces
 *   F  invariantes sobre 400 operaciones aleatorias (semilla fija) con rondas
 *      concurrentes: saldo = suma de asientos, nunca negativo, circulante = saldos
 *   G  `settleCredits` (Weë AI) no deja el libro diciendo que se cobró lo que el
 *      Credit Engine ya había devuelto (defecto encontrado por este paquete)
 *   H  la liquidación del Core Runtime (`liquidacionDeWee`) con liquidar +
 *      reembolsar + liquidar a la vez sobre la misma reserva
 *   I  el Credit Engine no se puede eludir: reglas y código
 *   J  la trazabilidad usuario → trabajo → reserva → asiento se reconstruye y
 *      nada sensible entra en los asientos
 *
 * LO QUE NO PRUEBA: el comportamiento optimista/reintentos de las transacciones de
 * Firestore real. Eso lo cubre `gran-motor-c-creditos.emulator.mjs` (emulador).
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const lib = (p) => require(path.resolve(here, '../lib', p));

const { createCreditEngine } = lib('credits/creditEngine.js');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const codeOf = (p) => p.then(() => 'ok', (e) => e?.code ?? `ERR:${e?.message}`);

// ─── Firestore en memoria: documentos, consultas simples y transacciones atómicas ───
const INC = Symbol('inc');
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v) && !v[INC];
const resolve = (value, existing, deep) => {
  if (value && typeof value === 'object' && value[INC] !== undefined) return (typeof existing === 'number' ? existing : 0) + value[INC];
  if (deep && isObj(value)) {
    const out = isObj(existing) ? { ...existing } : {};
    for (const [k, v] of Object.entries(value)) out[k] = resolve(v, out[k], true);
    return out;
  }
  return value;
};

class FakeDb {
  constructor() {
    this.docs = new Map();
    this.queue = Promise.resolve();
    this.autoId = 0;
    this.commits = 0;
  }
  collection(p) {
    return new Coll(this, p);
  }
  runTransaction(fn) {
    const run = async () => {
      const tx = new Tx(this);
      const result = await fn(tx);
      tx.commit();
      return result;
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => {});
    return p;
  }
  read(p) {
    return this.docs.has(p) ? clone(this.docs.get(p)) : undefined;
  }
}
class Ref {
  constructor(db, p) {
    this.db = db;
    this.path = p;
    this.id = p.split('/').pop();
  }
  async get() {
    const data = this.db.read(this.path);
    return { exists: data !== undefined, id: this.id, ref: this, data: () => data };
  }
}
class Coll {
  constructor(db, p, filters = [], order = null, max = null) {
    Object.assign(this, { db, path: p, filters, order, max, _isQuery: true });
  }
  doc(id) {
    return new Ref(this.db, `${this.path}/${id || 'auto_' + ++this.db.autoId}`);
  }
  where(field, _op, value) {
    return new Coll(this.db, this.path, [...this.filters, [field, value]], this.order, this.max);
  }
  orderBy(field, dir = 'asc') {
    return new Coll(this.db, this.path, this.filters, [field, dir], this.max);
  }
  limit(n) {
    return new Coll(this.db, this.path, this.filters, this.order, n);
  }
  async get() {
    let rows = [...this.db.docs.entries()].filter(([p]) => p.startsWith(this.path + '/') && !p.slice(this.path.length + 1).includes('/'));
    rows = rows.filter(([, d]) => this.filters.every(([f, v]) => d[f] === v));
    if (this.order) {
      const [f, dir] = this.order;
      rows.sort(([, a], [, b]) => (a[f] > b[f] ? 1 : a[f] < b[f] ? -1 : 0) * (dir === 'desc' ? -1 : 1));
    }
    if (this.max) rows = rows.slice(0, this.max);
    const docs = rows.map(([p, d]) => ({ exists: true, id: p.split('/').pop(), ref: new Ref(this.db, p), data: () => clone(d) }));
    return { docs, empty: docs.length === 0 };
  }
}
class Tx {
  constructor(db) {
    this.db = db;
    this.writes = [];
  }
  get(target) {
    return target.get();
  }
  set(ref, data, opts) {
    this.writes.push({ kind: 'set', ref, data, merge: !!(opts && opts.merge) });
  }
  update(ref, data) {
    this.writes.push({ kind: 'update', ref, data });
  }
  commit() {
    for (const w of this.writes) {
      const existing = this.db.docs.get(w.ref.path);
      if (w.kind === 'set' && !w.merge) this.db.docs.set(w.ref.path, resolve(w.data, existing, true));
      else if (w.kind === 'set') this.db.docs.set(w.ref.path, resolve(w.data, existing || {}, true));
      else {
        if (!existing) throw new Error('update sobre documento inexistente: ' + w.ref.path);
        const out = { ...existing };
        for (const [k, v] of Object.entries(w.data)) out[k] = resolve(v, out[k], false);
        this.db.docs.set(w.ref.path, out);
      }
    }
    this.db.commits++;
  }
}


/* Inyección de fallos sobre el almacén: antes de ejecutar y después de confirmar. */
const faults = { before: 0, afterCommit: 0 };
const baseRun = FakeDb.prototype.runTransaction;
FakeDb.prototype.runTransaction = function (fn) {
  if (faults.before > 0) { faults.before--; return Promise.reject(Object.assign(new Error('Firestore no responde'), { code: 'unavailable' })); }
  const p = baseRun.call(this, fn);
  if (faults.afterCommit > 0) {
    faults.afterCommit--;
    return p.then(() => { throw Object.assign(new Error('deadline exceeded'), { code: 'deadline-exceeded' }); });
  }
  return p;
};

let clock = 0;
const mkEnv = (welcome = 240) => {
  const db = new FakeDb();
  const engine = createCreditEngine({ db: () => db, increment: (n) => ({ [INC]: n }), now: () => ++clock, welcomeCredits: welcome, loadCosts: async () => {} });
  const base = {};
  const perfil = (uid) => db.docs.set(`users/doc_${uid}`, { uid, displayName: uid });
  const saldo = (uid) => db.read(`creditAccounts/${uid}`)?.creditsBalance;
  const espejo = (uid) => db.read(`users/doc_${uid}`)?.creditsBalance;
  const asientos = (uid) => [...db.docs.entries()].filter(([p, d]) => p.startsWith('creditTransactions/') && d.userId === uid).map(([p, d]) => ({ id: p.split('/').pop(), ...d }));
  const suma = (uid) => asientos(uid).reduce((s, t) => s + (t.amount || 0), 0);
  /* Tras fijar el saldo a mano, `base` recuerda la diferencia con la suma de asientos: no puede cambiar nunca más. */
  const nueva = async (uid, saldoInicial) => {
    perfil(uid); await engine.ensureAccount(uid);
    if (saldoInicial !== undefined) { db.docs.get(`users/doc_${uid}`).creditsBalance = saldoInicial; db.docs.get(`creditAccounts/${uid}`).creditsBalance = saldoInicial; }
    base[uid] = saldo(uid) - suma(uid);
  };
  const conservado = (uid) => saldo(uid) - suma(uid) === base[uid] && saldo(uid) === espejo(uid) && saldo(uid) >= 0;
  return { db, engine, saldo, espejo, asientos, suma, nueva, conservado };
};
const gasta = (e, uid, id, amount = 10, extra = {}) => e.engine.spendCredits({ userId: uid, service: 'ai_image', requestId: id, amount, source: 'test', ...extra });

/* ── A · mismo requestId, a la vez ─────────────────────────────────────── */
{
  console.log('\n── A · el mismo requestId lanzado a la vez ──');
  const e = mkEnv(); await e.nueva('ana'); // 240 de bienvenida
  const r = await Promise.all(Array.from({ length: 6 }, () => gasta(e, 'ana', 'job_A1', 25)));
  check('A1 seis llamadas simultáneas con el mismo requestId: exactamente una cobra', r.filter((x) => !x.duplicate).length === 1, `${r.filter((x) => !x.duplicate).length} no duplicadas`);
  check('A1 saldo 215, un solo asiento de uso, la cuenta y su espejo coinciden', e.saldo('ana') === 215 && e.espejo('ana') === 215 && e.asientos('ana').filter((t) => t.type === 'usage').length === 1);
  check('A1 todas las duplicadas ven el mismo importe y estado', r.every((x) => x.amount === 25 && x.status === 'AUTHORIZED'));
  await e.nueva('beto');
  check('A2 otra cuenta no puede usar el requestId ajeno', (await codeOf(gasta(e, 'beto', 'job_A1', 25))) === 'FORBIDDEN' && e.saldo('beto') === 240);
  const huella = await Promise.all([gasta(e, 'ana', 'job_A3', 10, { fingerprint: 'aaaaaaaaaaaaaaaa1' }), gasta(e, 'ana', 'job_A3', 10, { fingerprint: 'aaaaaaaaaaaaaaaa1' })]);
  check('A3 con huella igual es la misma operación', huella.filter((x) => !x.duplicate).length === 1 && e.saldo('ana') === 205);
  check('A3 con otra huella es OTRA operación y se rechaza sin tocar nada', (await codeOf(gasta(e, 'ana', 'job_A3', 10, { fingerprint: 'bbbbbbbbbbbbbbbb2' }))) === 'INVALID_REQUEST' && e.saldo('ana') === 205);
}

/* ── B · saldo insuficiente concurrente ────────────────────────────────── */
{
  console.log('\n── B · saldo insuficiente concurrente ──');
  const e = mkEnv(); await e.nueva('ana', 25);
  const r = await Promise.all(['bb_1', 'bb_2', 'bb_3', 'bb_4', 'bb_5'].map((id) => codeOf(gasta(e, 'ana', id, 10))));
  check('B1 con 25 y cinco gastos de 10, pasan exactamente dos', r.filter((x) => x === 'ok').length === 2 && r.filter((x) => x === 'INSUFFICIENT_CREDITS').length === 3, r.join(','));
  check('B1 saldo 5, nunca negativo, solo dos asientos de uso', e.saldo('ana') === 5 && e.asientos('ana').filter((t) => t.type === 'usage').length === 2 && e.conservado('ana'));
}

/* ── C · completar contra reembolsar ───────────────────────────────────── */
for (const orden of ['completar-primero', 'reembolsar-primero']) {
  console.log(`\n── C · completar y reembolsar a la vez (${orden}) ──`);
  const e = mkEnv(); await e.nueva('ana', 100);
  await gasta(e, 'ana', 'job_C', 30);
  const completar = () => codeOf(e.engine.completeCredits({ userId: 'ana', requestId: 'job_C', finalAmount: 12 }));
  const reembolsar = () => codeOf(e.engine.refundCredits({ userId: 'ana', requestId: 'job_C', reason: 'falló' }));
  const r = orden === 'completar-primero' ? await Promise.all([completar(), reembolsar()]) : (await Promise.all([reembolsar(), completar()])).reverse();
  const gano = e.db.read('creditTransactions/usage_job_C').status;
  check('C1 el asiento acaba en un estado final y solo uno', gano === 'COMPLETED' || gano === 'REFUNDED', gano);
  if (gano === 'COMPLETED') {
    check('C1 gana COMPLETED: el reembolso se rechaza NOT_REFUNDABLE y solo vuelve el ajuste (88)', r[1] === 'NOT_REFUNDABLE' && e.saldo('ana') === 88, `${r} saldo ${e.saldo('ana')}`);
  } else {
    check('C1 gana REFUNDED: completar no cobra nada y el saldo vuelve a 100', e.saldo('ana') === 100, `${r} saldo ${e.saldo('ana')}`);
  }
  check('C1 saldo = base + suma de asientos; cuenta y espejo coinciden', e.conservado('ana'));
}
{
  const e = mkEnv(); await e.nueva('ana', 100); await gasta(e, 'ana', 'job_C2', 40);
  const r = await Promise.all([1, 2, 3, 4].map(() => e.engine.refundCredits({ userId: 'ana', requestId: 'job_C2', reason: 'x' })));
  check('C2 cuatro reembolsos simultáneos devuelven una sola vez', e.saldo('ana') === 100 && r.filter((x) => !x.duplicate).length === 1 && e.asientos('ana').filter((t) => t.type === 'refund').length === 1 && e.conservado('ana'));
  const e2 = mkEnv(); await e2.nueva('ana', 100); await gasta(e2, 'ana', 'job_C3', 40);
  const c = await Promise.all([1, 2, 3].map(() => e2.engine.completeCredits({ userId: 'ana', requestId: 'job_C3', finalAmount: 25 })));
  check('C3 tres cierres simultáneos con ajuste devuelven la diferencia una sola vez', e2.saldo('ana') === 75 && c.filter((x) => x.refunded === 15).length === 1 && e2.asientos('ana').filter((t) => t.type === 'refund').length === 1 && e2.conservado('ana'), `saldo ${e2.saldo('ana')}`);
}

/* ── D · callback tardío / duplicado ───────────────────────────────────── */
{
  console.log('\n── D · callback tardío y duplicado ──');
  const e = mkEnv(); await e.nueva('ana', 100); await gasta(e, 'ana', 'job_D', 30);
  await e.engine.refundCredits({ userId: 'ana', requestId: 'job_D', reason: 'barrido' });
  const tarde = await e.engine.completeCredits({ userId: 'ana', requestId: 'job_D', finalAmount: 30 });
  check('D1 un cierre tardío tras el reembolso no cobra: estado REFUNDED, saldo intacto', tarde.status === 'REFUNDED' && tarde.refunded === 0 && e.saldo('ana') === 100);
  check('D2 reusar el requestId reembolsado no genera gratis', (await codeOf(gasta(e, 'ana', 'job_D', 30))) === 'ALREADY_REFUNDED' && e.saldo('ana') === 100);
  const otra = await e.engine.refundCredits({ userId: 'ana', requestId: 'job_D', reason: 'otra vez' });
  check('D3 un segundo reembolso es duplicado y no mueve nada', otra.duplicate && e.saldo('ana') === 100);
  await gasta(e, 'ana', 'job_D4', 30); await e.engine.completeCredits({ userId: 'ana', requestId: 'job_D4' });
  check('D4 reembolsar algo ya cobrado exige forzar (administración)', (await codeOf(e.engine.refundCredits({ userId: 'ana', requestId: 'job_D4' }))) === 'NOT_REFUNDABLE' && e.saldo('ana') === 70);
  check('D5 completar lo que nunca se reservó se rechaza (no inventa cobros)', (await codeOf(e.engine.completeCredits({ userId: 'ana', requestId: 'no_existe' }))) === 'TRANSACTION_NOT_FOUND');
  check('D6 todo cuadra', e.conservado('ana'));
}

/* ── E · fallos del almacén ────────────────────────────────────────────── */
{
  console.log('\n── E · fallos del almacén y timeouts del cliente ──');
  const e = mkEnv(); await e.nueva('ana', 100);
  faults.before = 1;
  const f1 = await codeOf(gasta(e, 'ana', 'job_E1', 20));
  check('E1 si el almacén falla antes de confirmar no se cobra nada', f1 === 'unavailable' && e.saldo('ana') === 100 && !e.db.read('creditTransactions/usage_job_E1'));
  const ok1 = await gasta(e, 'ana', 'job_E1', 20);
  check('E1 el reintento cobra una vez', !ok1.duplicate && e.saldo('ana') === 80);
  faults.afterCommit = 1;
  const f2 = await codeOf(gasta(e, 'ana', 'job_E2', 20));
  check('E2 timeout DESPUÉS de confirmar: el cliente ve el error pero el cobro existe', f2 === 'deadline-exceeded' && e.saldo('ana') === 60);
  const re2 = await gasta(e, 'ana', 'job_E2', 20);
  check('E2 el reintento ve el duplicado y no cobra otra vez', re2.duplicate && e.saldo('ana') === 60);
  faults.afterCommit = 1;
  await codeOf(e.engine.refundCredits({ userId: 'ana', requestId: 'job_E2', reason: 'x' }));
  check('E3 timeout tras confirmar el reembolso: el dinero ya volvió', e.saldo('ana') === 80);
  const rr = await e.engine.refundCredits({ userId: 'ana', requestId: 'job_E2', reason: 'reintento' });
  check('E3 el reintento del reembolso no devuelve dos veces', rr.duplicate && e.saldo('ana') === 80);
  faults.afterCommit = 1;
  await codeOf(e.engine.completeCredits({ userId: 'ana', requestId: 'job_E1', finalAmount: 5 }));
  const rc = await e.engine.completeCredits({ userId: 'ana', requestId: 'job_E1', finalAmount: 5 });
  check('E4 timeout tras confirmar el cierre: el reintento no devuelve la diferencia dos veces', e.saldo('ana') === 95 && rc.refunded === 0, `saldo ${e.saldo('ana')}`);
  const raros = [];
  for (const [i, final] of [NaN, -5, 1.9, Infinity, '7'].entries()) {
    await gasta(e, 'ana', `job_E5_${i}`, 10);
    const codigo = await codeOf(e.engine.completeCredits({ userId: 'ana', requestId: `job_E5_${i}`, finalAmount: final }));
    raros.push({ final: String(final), codigo, fila: e.db.read(`creditTransactions/usage_job_E5_${i}`) });
  }
  check('E5 un importe final inválido nunca deja un asiento COMPLETED con finalAmount no numérico ni negativo',
    raros.every((r) => r.fila.status !== 'COMPLETED' || (Number.isFinite(r.fila.finalAmount) && r.fila.finalAmount >= 0 && r.fila.finalAmount <= 10)),
    JSON.stringify(raros.map((r) => [r.final, r.codigo, r.fila.status, String(r.fila.finalAmount)])));
  check('E5 el saldo nunca queda NaN ni negativo y todo cuadra', Number.isFinite(e.saldo('ana')) && e.saldo('ana') >= 0 && e.conservado('ana'));
}

/* ── F · invariantes sobre operaciones aleatorias ──────────────────────── */
{
  console.log('\n── F · 400 operaciones aleatorias con rondas concurrentes ──');
  const e = mkEnv(0);
  const usuarios = ['u0', 'u1', 'u2', 'u3'];
  for (const u of usuarios) { e.db.docs.set(`users/doc_${u}`, { uid: u }); await e.engine.ensureAccount(u); await e.engine.grantCredits({ userId: u, amount: 60, reason: 'semilla', source: 'test', requestId: `semilla_${u}` }); await e.nueva(u, undefined); }
  let seed = 20261016;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const ids = Array.from({ length: 24 }, (_, i) => `op_${i}`);
  const dueño = {};
  let rondas = 0; let violaciones = 0; let ops = 0;
  while (ops < 400) {
    const n = 1 + Math.floor(rnd() * 5);
    const lote = [];
    for (let k = 0; k < n; k++) {
      const id = pick(ids); const u = dueño[id] ?? pick(usuarios); dueño[id] ??= u; const r = rnd();
      ops++;
      if (r < 0.4) lote.push(codeOf(gasta(e, u, id, 1 + Math.floor(rnd() * 30))));
      else if (r < 0.65) lote.push(codeOf(e.engine.completeCredits({ userId: u, requestId: id, finalAmount: rnd() < 0.5 ? undefined : Math.floor(rnd() * 30) })));
      else if (r < 0.9) lote.push(codeOf(e.engine.refundCredits({ userId: u, requestId: id, reason: 'azar' })));
      else lote.push(codeOf(e.engine.grantCredits({ userId: u, amount: 1 + Math.floor(rnd() * 20), reason: 'azar', source: 'test', requestId: `g_${ops}` })));
    }
    await Promise.all(lote); rondas++;
    if (!usuarios.every((u) => e.conservado(u))) violaciones++;
  }
  check('F1 tras cada ronda: saldo = base + suma de asientos, cuenta = espejo y nunca negativo', violaciones === 0, `${violaciones} rondas violadas de ${rondas}`);
  const usos = usuarios.flatMap((u) => e.asientos(u)).filter((t) => t.type === 'usage');
  check('F2 como mucho un asiento de uso por requestId y ninguno con importe inválido', new Set(usos.map((t) => t.requestId)).size === usos.length && usos.every((t) => Number.isFinite(t.amount) && t.amount < 0));
  const reemb = usuarios.flatMap((u) => e.asientos(u)).filter((t) => t.id.startsWith('refund_'));
  check('F3 un reembolso total solo existe sobre una reserva REFUNDED, y nunca dos', reemb.every((t) => e.db.read(`creditTransactions/${t.refundOf}`)?.status === 'REFUNDED') && new Set(reemb.map((t) => t.refundOf)).size === reemb.length);
  const cobrado = (t) => (t.status === 'COMPLETED' ? (typeof t.finalAmount === 'number' ? t.finalAmount : Math.abs(t.amount)) : t.status === 'AUTHORIZED' ? Math.abs(t.amount) : 0);
  check('F4 lo gastado acumulado de cada cuenta = lo cobrado + lo retenido de sus reservas', usuarios.every((u) => e.db.read(`creditAccounts/${u}`).creditsLifetimeSpent === e.asientos(u).filter((t) => t.type === 'usage').reduce((s, t) => s + cobrado(t), 0)));
  const stats = e.db.read('creditStats/global');
  check('F5 el circulante de las estadísticas = suma de saldos', stats.circulating === usuarios.reduce((s, u) => s + e.saldo(u), 0), `${stats.circulating} vs ${usuarios.reduce((s, u) => s + e.saldo(u), 0)}`);
}

/* ── G · settleCredits (Weë AI) y el libro ─────────────────────────────── */
{
  console.log('\n── G · settleCredits: el libro dice lo que dice el Credit Engine ──');
  const firestore = require('firebase-admin/firestore');
  const trabajos = new Map();
  firestore.getFirestore = () => ({ collection: (c) => ({ doc: (id) => ({
    update: async (d) => { if (!trabajos.has(`${c}/${id}`)) throw new Error('NOT_FOUND'); trabajos.set(`${c}/${id}`, { ...trabajos.get(`${c}/${id}`), ...d }); },
    set: async (d) => trabajos.set(`${c}/${id}`, d),
  }) }) });
  const motor = lib('credits/creditEngine.js').creditEngine;
  const libro = lib('engine/ledger.js').firestoreLedger;
  const { settleCredits } = lib('creator/credits.js');
  const e = mkEnv(); await e.nueva('ana', 100);
  const original = { c: motor.completeCredits, r: motor.refundCredits, s: libro.settle };
  motor.completeCredits = (x) => e.engine.completeCredits(x); motor.refundCredits = (x) => e.engine.refundCredits(x);
  const filas = [];
  libro.settle = async (p) => { filas.push(p); return { rows: 1, credited: p.finalAmount }; };
  try {
    await gasta(e, 'ana', 'job_G1', 30);
    await settleCredits('ana', 'job_G1', 30, 20, 'WEË AI · test');
    check('G1 lo normal: COMPLETED, vuelven 10 y el libro registra 20', e.db.read('creditTransactions/usage_job_G1').status === 'COMPLETED' && e.saldo('ana') === 80 && filas.at(-1).finalAmount === 20);
    await gasta(e, 'ana', 'job_G2', 30);
    await settleCredits('ana', 'job_G2', 30, 0, 'WEË AI · test');
    check('G2 fallo del trabajo: REFUNDED y el libro registra 0', e.db.read('creditTransactions/usage_job_G2').status === 'REFUNDED' && filas.at(-1).finalAmount === 0 && e.saldo('ana') === 80);
    /* El barrido devolvió la reserva justo antes de que el trabajo terminara y quisiera cobrar. */
    await gasta(e, 'ana', 'job_G3', 30);
    await e.engine.refundCredits({ userId: 'ana', requestId: 'job_G3', reason: 'barrido' });
    const antes = filas.length;
    await settleCredits('ana', 'job_G3', 30, 30, 'WEË AI · test');
    check('G3 con la reserva ya DEVUELTA, el cierre tardío no cobra al usuario', e.saldo('ana') === 80 && e.db.read('creditTransactions/usage_job_G3').status === 'REFUNDED');
    check('G3 y el libro NO registra un cobro de 30 sobre una reserva reembolsada', filas.length === antes + 1 && filas.at(-1).finalAmount === 0, `finalAmount ${filas.at(-1).finalAmount}`);
  } finally { motor.completeCredits = original.c; motor.refundCredits = original.r; libro.settle = original.s; }
}

/* ── H · la liquidación del Core Runtime contra el Credit Engine ───────── */
{
  console.log('\n── H · liquidacionDeWee: liquidar y reembolsar a la vez ──');
  const { liquidacionDeWee } = lib('runtime/index.js');
  const e = mkEnv(); await e.nueva('ana', 100);
  const filas = []; let huecos = 0;
  const puerto = liquidacionDeWee({ credits: e.engine, ledger: { settle: async (p) => { filas.push(p); return {}; }, closeAccepted: async () => ({}) }, cupo: { liberar: async () => { huecos++; } } });
  const reserva = (id) => ({ requestId: id, transactionId: `usage_${id}`, importe: 30 });
  await gasta(e, 'ana', 'job_H1', 30);
  const r1 = await Promise.all([puerto.liquidar({ userId: 'ana', reserva: reserva('job_H1'), importe: 30, jobId: 'j' }), puerto.liquidar({ userId: 'ana', reserva: reserva('job_H1'), importe: 30, jobId: 'j' }), puerto.liquidar({ userId: 'ana', reserva: reserva('job_H1'), importe: 30, jobId: 'j' })]);
  const usoH1 = e.asientos('ana').filter((x) => x.id === 'usage_job_H1');
  check('H1 tres liquidaciones simultáneas: ninguna falla, el dinero se mueve UNA vez (una reserva COMPLETED, saldo 70)', r1.every((x) => x.desenlace !== 'fallo') && usoH1.length === 1 && usoH1[0].status === 'COMPLETED' && e.saldo('ana') === 70, JSON.stringify(r1.map((x) => x.desenlace)));
  await gasta(e, 'ana', 'job_H2', 30);
  const r2 = await Promise.all([puerto.liquidar({ userId: 'ana', reserva: reserva('job_H2'), importe: 30, jobId: 'j' }), puerto.reembolsar({ userId: 'ana', reserva: reserva('job_H2'), motivo: 'fallo_definitivo', jobId: 'j' })]);
  const est = e.db.read('creditTransactions/usage_job_H2').status;
  check('H2 liquidar contra reembolsar: gana uno solo y nada se duplica', (est === 'COMPLETED' && e.saldo('ana') === 40) || (est === 'REFUNDED' && e.saldo('ana') === 70), `${est} saldo ${e.saldo('ana')} ${JSON.stringify(r2.map((x) => x.desenlace))}`);
  check('H2 ninguno de los dos cuenta como fallo', r2.every((x) => x.desenlace !== 'fallo'));
  check('H2 la fila del libro coincide con lo que quedó cobrado', filas.filter((f) => f.creditTransactionId === 'usage_job_H2').every((f) => f.finalAmount === (est === 'COMPLETED' ? 30 : 0)));
  const r3 = await puerto.reembolsar({ userId: 'ana', reserva: reserva('job_H1'), motivo: 'fallo_definitivo', jobId: 'j' });
  check('H3 reembolsar algo ya cobrado no es un fallo ni mueve dinero', r3.desenlace === 'ya_estaba' && e.saldo('ana') === (est === 'COMPLETED' ? 40 : 70));
  check('H4 todo cuadra', e.conservado('ana'));
}

/* ── I · el Credit Engine no se puede eludir ───────────────────────────── */
{
  console.log('\n── I · eludir el Credit Engine ──');
  const reglas = fs.readFileSync(path.join(RAIZ, 'firestore.rules'), 'utf8');
  const bloque = (nombre) => { const i = reglas.indexOf(`match /${nombre}/`); return i < 0 ? '' : reglas.slice(i, reglas.indexOf('\n    }', i)); };
  for (const col of ['creditTransactions', 'creditAccounts', 'creditStats', 'creditCosts', 'wallets', 'transactions']) {
    check(`I1 las reglas cierran la escritura de ${col} al cliente`, /allow write: if false;|allow read, write: if false;/.test(bloque(col)), bloque(col).slice(0, 80).replace(/\n/g, ' '));
  }
  const usuarios = bloque('users');
  check('I2 el perfil público no admite crear ni cambiar campos de Credits desde el cliente', /allow create:[^;]*!createsCreditFields\(\)/s.test(reglas) && /allow update:[^;]*!touchesCreditFields\(\)/s.test(reglas) && usuarios.length > 0);
  const campos = /function creditFields\(\)\s*{\s*return \[([^\]]*)\]/.exec(reglas)?.[1] ?? '';
  check('I2 los cuatro campos del saldo están protegidos', ['creditsBalance', 'creditsLifetimeEarned', 'creditsLifetimeSpent', 'creditsInitializedAt'].every((c) => campos.includes(c)));
  /* Código: nadie fuera del Credit Engine escribe el saldo. */
  const recorre = (dir, out = []) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) { if (!['node_modules', 'lib'].includes(f.name)) recorre(p, out); } else if (/\.tsx?$/.test(f.name)) out.push(p); } return out; };
  const fuentes = recorre(path.join(here, '../src'));
  const escribeSaldo = fuentes.filter((f) => !f.includes(`${path.sep}credits${path.sep}`) && /creditsBalance\s*:/.test(fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
  check('I3 ningún archivo del servidor fuera de credits/ asigna creditsBalance', escribeSaldo.length === 0, escribeSaldo.join(', '));
  const cliente = [...recorre(path.join(RAIZ, 'services')), ...recorre(path.join(RAIZ, 'hooks')), ...recorre(path.join(RAIZ, 'screens'))];
  const clienteEscribe = cliente.filter((f) => { const t = fs.readFileSync(f, 'utf8'); return /(setDoc|updateDoc|addDoc|deleteDoc|runTransaction|writeBatch)[\s\S]{0,200}(creditAccounts|creditTransactions|creditsBalance)/.test(t); });
  check('I4 el cliente no escribe en colecciones de Credits', clienteEscribe.length === 0, clienteEscribe.join(', '));
  const idx = fs.readFileSync(path.join(here, '../src/credits/index.ts'), 'utf8');
  const llamables = [...idx.matchAll(/export const (\w+) = onCall\(OPTS, async \(request\) =>\s*run\(async \(\) => {\s*([^\n]*)/g)].map((m) => [m[1], m[2]]);
  check('I5 los callables que mueven Credits para otros (spend/grant/refund) exigen administración', ['spendCredits', 'grantCredits', 'refundCredits'].every((n) => llamables.find(([k]) => k === n)?.[1].includes('assertAdmin')), JSON.stringify(llamables));
}

/* ── J · trazabilidad y nada sensible ──────────────────────────────────── */
{
  console.log('\n── J · trazabilidad y observabilidad ──');
  const e = mkEnv(); await e.nueva('ana', 100);
  await gasta(e, 'ana', 'job_J', 30, { generationId: 'job_J', meta: { jobId: 'job_J', chatId: 'c1', steps: [{ stepId: 's1', credits: 30 }] } });
  await e.engine.completeCredits({ userId: 'ana', requestId: 'job_J', finalAmount: 20 });
  const uso = e.db.read('creditTransactions/usage_job_J'); const aj = e.db.read('creditTransactions/adjust_job_J') ?? [...e.db.docs.entries()].find(([p, d]) => p.startsWith('creditTransactions/') && d.refundOf === 'usage_job_J')?.[1];
  check('J1 la reserva lleva usuario, requestId y generationId del trabajo', uso.userId === 'ana' && uso.requestId === 'job_J' && uso.generationId === 'job_J' && uso.meta.jobId === 'job_J');
  check('J2 el ajuste apunta a su reserva (refundOf) con el mismo requestId', aj?.refundOf === 'usage_job_J' && aj?.requestId === 'job_J');
  check('J3 cada asiento guarda saldo antes y después y su historial de estados', uso.balanceBefore === 100 && uso.balanceAfter === 70 && uso.statusHistory.map((s) => s.status).join('>') === 'PENDING>AUTHORIZED>COMPLETED');
  const todos = JSON.stringify([...e.db.docs.entries()].filter(([p]) => p.startsWith('creditTransactions/')));
  check('J4 ningún asiento de prueba contiene claves, tokens ni textos de prompt', !/(api[_-]?key|secret|token|prompt|Bearer )/i.test(todos));
  /* Código: los meta que los servicios mandan al Credit Engine no llevan lo que escribe la persona. */
  const recorre = (dir, out = []) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) recorre(p, out); else if (/\.ts$/.test(f.name)) out.push(p); } return out; };
  const malos = [];
  for (const f of recorre(path.join(here, '../src'))) {
    const t = fs.readFileSync(f, 'utf8');
    for (const m of t.matchAll(/creditEngine\.(?:spendCredits|completeCredits)\(\{([\s\S]*?)\n?\s*\}\)/g)) {
      const meta = /meta:\s*\{([^}]*)\}/.exec(m[1])?.[1] ?? '';
      if (/\b(prompt|goal|message|text|apiKey|token|secret|answers)\b\s*[:,}]|\bprompt\b/.test(meta)) malos.push(`${path.relative(path.join(here, '..'), f)}: ${meta.trim().slice(0, 80)}`);
    }
  }
  check('J5 ningún meta enviado al Credit Engine incluye prompt, objetivo, mensaje, clave ni token', malos.length === 0, malos.join(' | '));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
