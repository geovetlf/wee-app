import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/credits/' + p));

const { createCreditEngine } = lib('creditEngine.js');
const { CREDIT_COSTS } = lib('creditCosts.js');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const rejects = async (name, fn, code) => {
  try {
    await fn();
    check(name, false, 'no lanzó error');
  } catch (error) {
    check(name, error?.code === code, `código ${error?.code} (esperado ${code})`);
    return error;
  }
  return null;
};

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

let clock = 0;
const db = new FakeDb();
const engine = createCreditEngine({
  db: () => db,
  increment: (n) => ({ [INC]: n }),
  now: () => ++clock,
  welcomeCredits: 240,
  loadCosts: async () => {},
});

const profile = (uid, extra = {}) => db.docs.set(`users/doc_${uid}`, { uid, displayName: uid, ...extra });
const balanceOf = (uid) => db.read(`users/doc_${uid}`).creditsBalance;
const txs = (uid) => [...db.docs.entries()].filter(([p, d]) => p.startsWith('creditTransactions/') && d.userId === uid).map(([p, d]) => ({ id: p.split('/').pop(), ...d }));

console.log('\n── Cuenta: migración desde wallets + bienvenida (idempotente) ──');
profile('ana');
db.docs.set('wallets/ana', { userId: 'ana', balance: 100, totalPurchased: 300, totalSpent: 200, welcomeGranted: true });
let acc = await engine.ensureAccount('ana');
check('migra el saldo anterior y suma la bienvenida', acc.balance === 340 && acc.migrated === 100 && acc.welcomeGranted, JSON.stringify(acc));
check('acumulados migrados', acc.lifetimeEarned === 540 && acc.lifetimeSpent === 200);
check('queda registrado en el historial', txs('ana').some((t) => t.id === 'migration_ana' && t.amount === 100) && txs('ana').some((t) => t.id === 'grant_welcome_ana' && t.amount === 240));
acc = await engine.ensureAccount('ana');
check('repetir ensureAccount no vuelve a otorgar nada', acc.balance === 340 && !acc.welcomeGranted && acc.migrated === 0 && txs('ana').length === 2);
profile('bea');
acc = await engine.ensureAccount('bea');
check('cuenta nueva sin billetera: solo la bienvenida', acc.balance === 240 && acc.lifetimeEarned === 240 && acc.lifetimeSpent === 0);
await rejects('sin perfil no hay cuenta', () => engine.ensureAccount('nadie'), 'ACCOUNT_NOT_FOUND');
check('getBalance devuelve el saldo real', (await engine.getBalance('ana')).balance === 340);

console.log('\n── Gastar: monto del catálogo, atómico, nunca negativo ──');
let spend = await engine.spendCredits({ userId: 'bea', service: 'ai_image', requestId: 'img_1', source: 'test' });
check('cobra el costo del catálogo (ai_image)', spend.amount === CREDIT_COSTS.ai_image && spend.balanceBefore === 240 && spend.balanceAfter === 230 && spend.status === 'AUTHORIZED');
check('el perfil refleja el saldo y lo gastado', balanceOf('bea') === 230 && db.read('users/doc_bea').creditsLifetimeSpent === 10);
let usage = db.read('creditTransactions/usage_img_1');
check('transacción usage con saldo antes/después y estados PENDING→AUTHORIZED', usage.type === 'usage' && usage.amount === -10 && usage.balanceBefore === 240 && usage.balanceAfter === 230 && usage.statusHistory.map((s) => s.status).join('>') === 'PENDING>AUTHORIZED');
let dup = await engine.spendCredits({ userId: 'bea', service: 'ai_image', requestId: 'img_1', source: 'test' });
check('la misma operación repetida NO cobra dos veces', dup.duplicate && balanceOf('bea') === 230 && txs('bea').filter((t) => t.type === 'usage').length === 1);
await engine.spendCredits({ userId: 'bea', service: 'ai_book', requestId: 'book_1', source: 'test' });
await engine.spendCredits({ userId: 'bea', service: 'ai_book', requestId: 'book_2', source: 'test' });
check('saldo tras dos libros', balanceOf('bea') === 30);
const before = txs('bea').length;
const insufficient = await rejects('sin saldo suficiente se rechaza', () => engine.spendCredits({ userId: 'bea', service: 'ai_video', requestId: 'vid_1', source: 'test' }), 'INSUFFICIENT_CREDITS');
check('el error dice cuánto hace falta', insufficient?.details?.required === 50 && insufficient?.details?.available === 30, JSON.stringify(insufficient?.details));
check('nada cambia cuando se rechaza (sin transacción, saldo igual)', balanceOf('bea') === 30 && txs('bea').length === before);
check('el saldo nunca es negativo', balanceOf('bea') >= 0);
await rejects('monto cero inválido', () => engine.spendCredits({ userId: 'bea', service: 'ai_text', requestId: 'zero_1', amount: 0, source: 'test' }), 'INVALID_AMOUNT');
await rejects('monto negativo inválido', () => engine.spendCredits({ userId: 'bea', service: 'ai_text', requestId: 'neg_1', amount: -5, source: 'test' }), 'INVALID_AMOUNT');
await rejects('monto decimal inválido', () => engine.spendCredits({ userId: 'bea', service: 'ai_text', requestId: 'dec_1', amount: 1.5, source: 'test' }), 'INVALID_AMOUNT');
await rejects('servicio desconocido', () => engine.spendCredits({ userId: 'bea', service: 'ai_magic', requestId: 'x_1', source: 'test' }), 'INVALID_SERVICE');
await rejects('requestId inválido', () => engine.spendCredits({ userId: 'bea', service: 'ai_text', requestId: 'a b', source: 'test' }), 'INVALID_REQUEST');
await rejects('nadie puede reutilizar la operación de otra cuenta', () => engine.spendCredits({ userId: 'ana', service: 'ai_image', requestId: 'img_1', source: 'test' }), 'FORBIDDEN');

console.log('\n── Concurrencia: dos gastos a la vez sobre saldo para uno solo ──');
profile('cai');
await engine.ensureAccount('cai');
db.docs.get('users/doc_cai').creditsBalance = 60;
const results = await Promise.allSettled([
  engine.spendCredits({ userId: 'cai', service: 'ai_video', requestId: 'race_1', source: 'test' }),
  engine.spendCredits({ userId: 'cai', service: 'ai_video', requestId: 'race_2', source: 'test' }),
]);
check('solo uno de los dos gastos concurrentes pasa', results.filter((r) => r.status === 'fulfilled').length === 1 && balanceOf('cai') === 10, `saldo ${balanceOf('cai')}`);

console.log('\n── Fallo de IA: reembolso exacto y protección contra doble reembolso ──');
profile('dan');
await engine.ensureAccount('dan');
await engine.spendCredits({ userId: 'dan', service: 'ai_video', requestId: 'gen_1', source: 'test' });
check('cobro autorizado', balanceOf('dan') === 190);
let refund = await engine.refundCredits({ userId: 'dan', requestId: 'gen_1', reason: 'generation_failed' });
check('reembolsa exactamente lo cobrado', refund.amount === 50 && refund.balanceAfter === 240 && balanceOf('dan') === 240 && !refund.duplicate);
usage = db.read('creditTransactions/usage_gen_1');
check('usage queda REFUNDED con FAILED en el historial', usage.status === 'REFUNDED' && usage.statusHistory.map((s) => s.status).join('>') === 'PENDING>AUTHORIZED>FAILED>REFUNDED');
check('existe la transacción de reembolso enlazada', db.read('creditTransactions/refund_gen_1')?.refundOf === 'usage_gen_1' && db.read('creditTransactions/refund_gen_1')?.amount === 50);
check('lo gastado acumulado vuelve a 0', db.read('users/doc_dan').creditsLifetimeSpent === 0);
refund = await engine.refundCredits({ userId: 'dan', requestId: 'gen_1', reason: 'otra vez' });
check('un segundo reembolso NO vuelve a acreditar', refund.duplicate && balanceOf('dan') === 240 && txs('dan').filter((t) => t.type === 'refund').length === 1);
await rejects('un requestId reembolsado no sirve para generar gratis', () => engine.spendCredits({ userId: 'dan', service: 'ai_video', requestId: 'gen_1', source: 'test' }), 'ALREADY_REFUNDED');
await rejects('reembolsar algo que no existe', () => engine.refundCredits({ userId: 'dan', requestId: 'no_existe' }), 'TRANSACTION_NOT_FOUND');
await rejects('nadie reembolsa operaciones ajenas', () => engine.refundCredits({ userId: 'ana', requestId: 'gen_1' }), 'FORBIDDEN');

console.log('\n── Completar: cobro final menor devuelve la diferencia; COMPLETED no se reembolsa sin forzar ──');
await engine.spendCredits({ userId: 'dan', service: 'ai_video', requestId: 'gen_2', source: 'test' });
let done = await engine.completeCredits({ userId: 'dan', requestId: 'gen_2', finalAmount: 30, meta: { imageUrl: 'https://x/y.png' } });
check('completa y devuelve 20 de ajuste', done.status === 'COMPLETED' && done.refunded === 20 && balanceOf('dan') === 210, JSON.stringify(done));
usage = db.read('creditTransactions/usage_gen_2');
check('usage COMPLETED con finalAmount y meta del resultado', usage.status === 'COMPLETED' && usage.finalAmount === 30 && usage.meta?.imageUrl === 'https://x/y.png');
check('ajuste registrado como refund enlazado', db.read('creditTransactions/adjust_gen_2')?.amount === 20 && db.read('creditTransactions/adjust_gen_2')?.refundOf === 'usage_gen_2');
done = await engine.completeCredits({ userId: 'dan', requestId: 'gen_2', finalAmount: 30 });
check('completar dos veces no devuelve dos veces', done.refunded === 0 && balanceOf('dan') === 210);
await rejects('una operación completada no se reembolsa por defecto', () => engine.refundCredits({ userId: 'dan', requestId: 'gen_2' }), 'NOT_REFUNDABLE');
refund = await engine.refundCredits({ userId: 'dan', requestId: 'gen_2', force: true, reason: 'admin' });
check('forzado: reembolsa solo lo que quedó cobrado (30)', refund.amount === 30 && balanceOf('dan') === 240);
spend = await engine.spendCredits({ userId: 'dan', service: 'ai_text', requestId: 'gen_3', source: 'test' });
await engine.completeCredits({ userId: 'dan', requestId: 'gen_3' });
dup = await engine.spendCredits({ userId: 'dan', service: 'ai_text', requestId: 'gen_3', source: 'test' });
check('repetir una operación COMPLETED responde duplicate sin cobrar', dup.duplicate && dup.status === 'COMPLETED' && balanceOf('dan') === 238);

console.log('\n── Otorgar / comprar: idempotente por purchaseId ──');
let grant = await engine.grantCredits({ userId: 'dan', amount: 40, type: 'purchase', purchaseId: 'test_abc', reason: 'Compra', source: 'store:test', priceUsd: 4.99 });
check('la compra acredita el paquete', grant.amount === 40 && balanceOf('dan') === 278 && db.read('users/doc_dan').creditsLifetimeEarned === 280);
grant = await engine.grantCredits({ userId: 'dan', amount: 40, type: 'purchase', purchaseId: 'test_abc', reason: 'Compra', source: 'store:test' });
check('la misma compra no se acredita dos veces', grant.duplicate && balanceOf('dan') === 278);
await rejects('una compra sin purchaseId se rechaza', () => engine.grantCredits({ userId: 'dan', amount: 40, type: 'purchase', reason: 'x', source: 'x' }), 'INVALID_REQUEST');
await rejects('un regalo con monto negativo se rechaza', () => engine.grantCredits({ userId: 'dan', amount: -40, requestId: 'gift_1', reason: 'x', source: 'admin' }), 'INVALID_AMOUNT');
grant = await engine.grantCredits({ userId: 'dan', amount: 5, requestId: 'gift_1', reason: 'Regalo', source: 'admin' });
check('regalo de administración', grant.amount === 5 && balanceOf('dan') === 283);

console.log('\n── Historial: cada movimiento con saldo antes/después encadenado ──');
const history = await engine.getCreditHistory('dan', 50);
check('el historial llega ordenado del más reciente al más antiguo', history.length >= 8 && history.every((t, i) => i === 0 || history[i - 1].createdAt >= t.createdAt));
const chronological = [...history].reverse();
const chained = chronological.every((t, i) => i === 0 || chronological[i - 1].balanceAfter === t.balanceBefore);
check('balanceBefore de cada movimiento = balanceAfter del anterior', chained, chronological.map((t) => `${t.id}:${t.balanceBefore}→${t.balanceAfter}`).join(' '));
check('cada entrada tiene fecha, concepto, monto y saldo resultante', history.every((t) => t.createdAt && t.reason && typeof t.amount === 'number' && typeof t.balanceAfter === 'number'));
check('el historial de una cuenta no mezcla otras cuentas', history.every((t) => t.userId === 'dan'));

console.log('\n── Acumulados para administración ──');
const stats = db.read('creditStats/global');
check('creditStats/global suma gastos, reembolsos y compras', stats && stats.totalSpent > 0 && stats.totalRefunded > 0 && stats.totalPurchased === 40 && stats.byService?.ai_video?.count === 3, JSON.stringify(stats));
check('circulante = otorgado + comprado − gastado + reembolsado', stats.circulating === stats.totalGranted + stats.totalPurchased - stats.totalSpent + stats.totalRefunded);
const totalBalances = ['ana', 'bea', 'cai', 'dan'].reduce((sum, u) => sum + balanceOf(u), 0);
check('el circulante coincide con la suma de saldos (cai ajustado a mano: +60 −240)', stats.circulating === totalBalances + 180, `${stats.circulating} vs ${totalBalances}`);

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nCredit Engine: todo en orden');
process.exit(failures ? 1 : 0);
