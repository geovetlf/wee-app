import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/credits/' + p));

const { createCreditEngine, strip } = lib('creditEngine.js');
const { CREDIT_COSTS, getCreditCost } = lib('creditCosts.js');

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
const insufficient = await rejects('sin saldo suficiente se rechaza', () => engine.spendCredits({ userId: 'bea', service: 'ai_video', amount: 50, requestId: 'vid_1', source: 'test' }), 'INSUFFICIENT_CREDITS');
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
  engine.spendCredits({ userId: 'cai', service: 'ai_video', amount: 50, requestId: 'race_1', source: 'test' }),
  engine.spendCredits({ userId: 'cai', service: 'ai_video', amount: 50, requestId: 'race_2', source: 'test' }),
]);
check('solo uno de los dos gastos concurrentes pasa', results.filter((r) => r.status === 'fulfilled').length === 1 && balanceOf('cai') === 10, `saldo ${balanceOf('cai')}`);

console.log('\n── Fallo de IA: reembolso exacto y protección contra doble reembolso ──');
profile('dan');
await engine.ensureAccount('dan');
await engine.spendCredits({ userId: 'dan', service: 'ai_video', amount: 50, requestId: 'gen_1', source: 'test' });
check('cobro autorizado', balanceOf('dan') === 190);
let refund = await engine.refundCredits({ userId: 'dan', requestId: 'gen_1', reason: 'generation_failed' });
check('reembolsa exactamente lo cobrado', refund.amount === 50 && refund.balanceAfter === 240 && balanceOf('dan') === 240 && !refund.duplicate);
usage = db.read('creditTransactions/usage_gen_1');
check('usage queda REFUNDED con FAILED en el historial', usage.status === 'REFUNDED' && usage.statusHistory.map((s) => s.status).join('>') === 'PENDING>AUTHORIZED>FAILED>REFUNDED');
check('existe la transacción de reembolso enlazada', db.read('creditTransactions/refund_gen_1')?.refundOf === 'usage_gen_1' && db.read('creditTransactions/refund_gen_1')?.amount === 50);
check('lo gastado acumulado vuelve a 0', db.read('users/doc_dan').creditsLifetimeSpent === 0);
refund = await engine.refundCredits({ userId: 'dan', requestId: 'gen_1', reason: 'otra vez' });
check('un segundo reembolso NO vuelve a acreditar', refund.duplicate && balanceOf('dan') === 240 && txs('dan').filter((t) => t.type === 'refund').length === 1);
await rejects('un requestId reembolsado no sirve para generar gratis', () => engine.spendCredits({ userId: 'dan', service: 'ai_video', amount: 50, requestId: 'gen_1', source: 'test' }), 'ALREADY_REFUNDED');
await rejects('reembolsar algo que no existe', () => engine.refundCredits({ userId: 'dan', requestId: 'no_existe' }), 'TRANSACTION_NOT_FOUND');
await rejects('nadie reembolsa operaciones ajenas', () => engine.refundCredits({ userId: 'ana', requestId: 'gen_1' }), 'FORBIDDEN');

console.log('\n── Completar: cobro final menor devuelve la diferencia; COMPLETED no se reembolsa sin forzar ──');
await engine.spendCredits({ userId: 'dan', service: 'ai_video', amount: 50, requestId: 'gen_2', source: 'test' });
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

console.log('\n── Precio de la IA: del coste oficial a los Credits ──');
const elib = (p) => require(path.resolve(here, '../lib/engine/' + p));
const { priceVideo, priceImage, videoServiceFor, imageServiceFor, needsProImage } = lib('aiPricing.js');
const { SEEDANCE_MODEL_IDS: SM } = elib('providers/seedance.js');
const { DEFAULT_SETTINGS: DS } = elib('registry.js');
const simulated = { ...DS, pricingMode: 'simulated' };
const real = { ...DS, pricingMode: 'real', creditsPerUsd: 100, margin: 0.3 };

const v10 = priceVideo({ modelId: SM.SEEDANCE_2_0_FAST, durationSec: 10, resolution: '720p' }, real);
check('video: 10 s a 720p con Seedance 2.0 fast cuesta USD 1.20 y son 156 Credits con 30 % de margen', Math.abs(v10.usd - 1.2096) < 0.001 && v10.credits === Math.ceil(1.2096 * 130) && v10.service === 'ai_video', `${v10.usd} → ${v10.credits} Credits`);
const v20 = priceVideo({ modelId: SM.SEEDANCE_2_0, durationSec: 10, resolution: '720p' }, real);
check('video: el mismo clip con Seedance 2.0 cuesta USD 1.51 y sube de tramo', Math.abs(v20.usd - 1.512) < 0.001 && v20.service === 'ai_video_hd', `${v20.usd}`);
const v25 = priceVideo({ modelId: SM.SEEDANCE_2_5, durationSec: 10, resolution: '1080p' }, real);
check('video: Seedance 2.5 a 1080p va al tramo máximo', Math.abs(v25.usd - 5.6862) < 0.01 && v25.service === 'ai_video_max', `${v25.usd}`);
const vRef = priceVideo({ modelId: SM.SEEDANCE_2_0, durationSec: 5, resolution: '720p', inputVideoSec: 5 }, real);
check('video: con video de entrada se usa la tarifa reducida y se pagan los segundos de entrada', Math.abs(vRef.usd - (216000 * 4.3) / 1e6) < 0.001, `${vRef.usd}`);
const vSim = priceVideo({ modelId: SM.SEEDANCE_2_0_FAST, durationSec: 10, resolution: '720p' }, simulated);
check('video: en modo prueba manda el catálogo del Credit Engine, no el coste', vSim.credits === CREDIT_COSTS.ai_video && vSim.usd > 0);
check('video: la duración se recorta al máximo del modelo antes de cobrar', priceVideo({ modelId: SM.SEEDANCE_2_0, durationSec: 40, resolution: '480p' }, real).detail.durationSec === 15);
check('video: cada modelo tiene su tramo de Credits', videoServiceFor(SM.SEEDANCE_2_0_MINI, '480p') === 'ai_video_draft' && videoServiceFor(SM.SEEDANCE_2_0_MINI, '720p') === 'ai_video' && videoServiceFor(SM.SEEDANCE_2_0, '720p') === 'ai_video_hd' && videoServiceFor(SM.SEEDANCE_2_5, '720p') === 'ai_video_advanced' && videoServiceFor(SM.SEEDANCE_2_5, '1080p') === 'ai_video_max');

check('la escalera de imagen: rostro y restauración al modelo de máxima precisión, el resto no', needsProImage('image.identity_edit') === true && needsProImage('image.edit', { kind: 'restore' }) === true && needsProImage('image.edit', { kind: 'enhance' }) === false);

// Modelo más barato capaz de hacer la tarea (engine/imageModels.js)
const { chooseImageModel, usdFor, volumeFactor } = elib('imageModels.js');
const { creditsFor } = elib('pricing.js');
const { providerReady: readyReal } = elib('image.js');
const { MAX_PROPUESTAS_POR_PASO } = elib('types.js');
const simgNadie = priceImage({ capability: 'image.generate', available: () => false }, simulated);
const todos = () => true;
check('una imagen sencilla usa el modelo más económico, no el Pro', chooseImageModel({ capability: 'image.generate' }, todos).model.modelId === 'flux-2-klein-9b');
check('una edición sencilla también', chooseImageModel({ capability: 'image.background_remove', kind: 'background' }, todos).model.modelId === 'flux-2-klein-9b');
check('un logo necesita texto legible: sube al modelo que sabe escribir', chooseImageModel({ capability: 'image.generate', kind: 'logo' }, todos).model.rendersText === true && chooseImageModel({ capability: 'image.generate', kind: 'logo' }, todos).tier === 'high');
check('conservar el rostro sube al nivel máximo', chooseImageModel({ capability: 'image.identity_edit', kind: 'look' }, todos).model.modelId === 'gemini-3-pro-image');
check('pedir 4K sube de nivel porque el económico no llega', chooseImageModel({ capability: 'image.generate', resolution: '4K' }, todos).size === '4K');
check('sin clave de un proveedor no se ofrece su modelo', chooseImageModel({ capability: 'image.generate' }, (p) => p === 'gemini').model.provider === 'gemini');
check('el motivo de la elección se puede explicar', /económico|texto|rostro|resolución|calidad/.test(chooseImageModel({ capability: 'image.generate' }, todos).reason));

const iSimple = priceImage({ capability: 'image.generate', available: todos }, real);
const iTres = priceImage({ capability: 'image.generate', count: 3, available: todos }, real);
const iCuatro = priceImage({ capability: 'image.generate', count: 4, available: todos }, real);
const iCinco = priceImage({ capability: 'image.generate', count: 5, available: todos }, real);
check('una imagen sencilla cuesta el precio oficial del modelo económico (USD 0.015)', Math.abs(iSimple.usd - 0.015) < 1e-9 && iSimple.model === 'flux-2-klein-9b' && iSimple.service === 'ai_image_lite', String(iSimple.usd));
check('el coste protegido son tres imágenes completas: el descuento comercial NO lo toca', Math.abs(iTres.usd - 3 * 0.015) < 1e-9 && iTres.detail.volumeDiscount === 5, String(iTres.usd));
check('y crece con la cantidad: cuatro cuestan más que tres, y son cuatro imágenes completas', Math.abs(iCuatro.usd - 4 * 0.015) < 1e-9 && iCuatro.usd > iTres.usd, String(iCuatro.usd));
/*
 * ── G13.4 · CINCO YA NO SON CINCO ───────────────────────────────────────────
 *
 * Esta comprobación decía «el coste protegido de cinco son cinco imágenes
 * completas», y era verdad: el precio recortaba a 8 mientras los adaptadores
 * recortaban a 4, así que cobraba cinco y entregaba cuatro. Esa ventana era el
 * fallo, no el contrato, y `MAX_PROPUESTAS_POR_PASO` la cerró.
 *
 * Lo que se afirma ahora es la política nueva: cinco está FUERA del techo, y
 * mientras no exista quien lo rechace, el precio lo frena en cuatro. Pedir
 * cinco cuesta exactamente lo que cuestan cuatro, porque cuatro es lo que se
 * va a entregar.
 *
 * CUIDADO CON LEER ESTO AL REVÉS: que cinco cueste como cuatro NO lo hace
 * válido. Es una barrera defensiva temporal. Cuando el Planner del Core valide
 * la cantidad (G13.6), un cinco será `invalid_request` y no llegará hasta aquí
 * —y entonces esta comprobación volverá a cambiar, porque estará afirmando algo
 * que ya no puede ocurrir—.
 */
check('G13.4 · pedir cinco cuesta exactamente lo que cuestan cuatro: el techo lo frena antes de cobrar', iCinco.credits === iCuatro.credits && iCinco.usd === iCuatro.usd && iCinco.detail.count === 4, iCinco.credits + ' Credits · count=' + iCinco.detail.count);
check('G13.4 · y no se le cobra ni un Credit de las que no se van a entregar', Math.abs(iCinco.usd - 5 * 0.015) > 1e-9 && iCinco.detail.count === MAX_PROPUESTAS_POR_PASO, 'antes de G13.4 esto costaba cinco imágenes y devolvía cuatro');

// ── Suelo de coste de imagen: el descuento comercial nunca vende por debajo del coste ──
const soloGemini = (p) => p === 'gemini';
const nadie = () => false;
const simg = (input) => priceImage({ capability: 'image.generate', available: soloGemini, ...input }, simulated);

check('el descuento comercial se aplica al precio, no al coste del proveedor', iTres.detail.volumeDiscount === 5 && iTres.detail.creditsBeforeDiscount >= iTres.credits && Math.abs(iTres.usd - 3 * iTres.detail.usdPerImage) < 1e-9);
check('el suelo se calcula con el coste sin descuento', iTres.detail.costFloor === Math.ceil(3 * 0.015 * 100));
check('ninguna operación de imagen se vende por debajo de su suelo', [{}, { count: 3 }, { count: 5 }, { kind: 'logo', count: 3 }, { kind: 'cover', count: 3 }, { capability: 'image.identity_edit', count: 2 }].every((c) => { const p = priceImage({ capability: c.capability || 'image.generate', available: soloGemini, ...c }, simulated); return p.credits >= Math.ceil(p.usd * 100); }));
check('el precio usa el modelo que se puede ejecutar, no uno sin clave', simg({}).model === 'gemini-3.1-flash-lite-image' && priceImage({ capability: 'image.generate', available: todos }, simulated).model === 'flux-2-klein-9b');
check('engine/pricing transmite la disponibilidad real a la estimación', creditsFor('image.generate', 0, simulated, false, { count: 3 }) === priceImage({ capability: 'image.generate', count: 3, available: readyReal }, simulated).credits);
check('sin ningún proveedor configurado se sigue pudiendo cotizar (modo demo)', chooseImageModel({ capability: 'image.generate' }, nadie).model.modelId === 'flux-2-klein-9b' && simgNadie.credits > 0);
check('Design, Photo y Home con 3 imágenes cuestan 11 Credits', [{ kind: 'design' }, { kind: 'photo' }, { kind: 'space' }].every((k) => simg({ ...k, count: 3 }).credits === 11), JSON.stringify([{ kind: 'design' }, { kind: 'photo' }, { kind: 'space' }].map((k) => simg({ ...k, count: 3 }).credits)));
check('Writers con 3 portadas cuesta 21 Credits', simg({ kind: 'cover', count: 3 }).credits === 21, String(simg({ kind: 'cover', count: 3 }).credits));
check('las de una sola imagen no cambian: Chef 4 y Business 10', simg({ kind: 'dish', count: 1 }).credits === 4 && simg({ kind: 'business', count: 1 }).credits === 10);

// ── El mínimo técnico de un modelo no cambia su nivel comercial ──
const { imageRequirements } = elib('imageModels.js');
const soloArk = (p) => p === 'seedream';
const editar = (extra = {}) => priceImage({ capability: 'image.background_remove', kind: 'background', count: 1, references: 1, available: soloArk, ...extra }, simulated);
// El 5.0 lite se fija a mano: desde que existe el 4.0 la escalera ya no lo elige
// sola, porque el 4.0 es más barato. Lo que se comprueba aquí es que su
// mínimo técnico de 2K sigue sin cambiarle el nivel comercial.
const conLite = (extra = {}) => editar({ modelId: 'seedream-5-0-lite-260128', resolution: '2K', resolutionFromEngine: true, ...extra });

check('1) Seedream Lite editando a 2K cuesta 4 Credits', conLite().credits === 4, String(conLite().credits));
check('1) y el modelo elegido sigue siendo el suyo, en nivel estándar', conLite().model === 'seedream-5-0-lite-260128' && conLite().detail.tier === 'standard');
// El análisis de la foto cuesta el precio de catálogo de texto (2), verificado más abajo
check('2 y 3) la operación completa suma 6: análisis 2 más edición 4', CREDIT_COSTS.ai_text + conLite().credits === 6, String(CREDIT_COSTS.ai_text) + ' + ' + String(conLite().credits));
check('4) el precio mostrado antes de ejecutar no depende de la marca del motor', editar().credits === editar({ resolution: '2K', resolutionFromEngine: true }).credits, editar().credits + ' vs ' + editar({ resolution: '2K', resolutionFromEngine: true }).credits);
check('8) el suelo de coste de esa edición sigue siendo 4', conLite().detail.costFloor === 4);
check('9) la resolución técnica 2K se sigue aplicando de verdad', conLite().detail.imageSize === '2K');

// La resolución que SÍ pide la sección o la persona sigue subiendo el nivel
check('5) pedir 2K de verdad sigue subiendo a nivel alto', imageRequirements({ capability: 'image.edit', kind: 'enhance', resolution: '2K' }).tier === 'high');
check('5) el mínimo técnico del motor no sube de nivel', imageRequirements({ capability: 'image.edit', kind: 'enhance', resolution: '2K', resolutionFromEngine: true }).tier === 'standard');
check('5) pedir 4K de verdad también sigue subiendo', imageRequirements({ capability: 'image.generate', resolution: '4K' }).tier === 'high');
check('5) las demás razones de nivel no se tocan: rostro, texto y calidad pedida', imageRequirements({ capability: 'image.identity_edit' }).tier === 'max' && imageRequirements({ capability: 'image.generate', kind: 'logo' }).tier === 'high' && imageRequirements({ capability: 'image.generate', quality: 'high' }).tier === 'high');

// 6, 7 y 10) Ningún otro modelo cambia de precio
{
  const otros = [[{ kind: 'logo', count: 3 }, 21], [{ kind: 'cover', count: 3 }, 21], [{ kind: 'design', count: 3 }, 11], [{ kind: 'dish', count: 1 }, 4], [{ kind: 'business', count: 1 }, 10]];
  check('6, 7 y 10) los precios de los demás modelos siguen exactamente igual', otros.every(([i, esperado]) => simg(i).credits === esperado), JSON.stringify(otros.map(([i]) => simg(i).credits)));
  const gem = priceImage({ capability: 'image.generate', kind: 'logo', count: 1, available: soloGemini }, simulated);
  check('6) Gemini conserva su modelo y su precio', gem.model === 'gemini-3.1-flash-image' && Math.abs(gem.usd - 0.067) < 1e-9);
  const fx = priceImage({ capability: 'image.generate', count: 1, available: () => true }, simulated);
  check('7) FLUX conserva su modelo y su precio', fx.model === 'flux-2-klein-9b' && Math.abs(fx.usd - 0.015) < 1e-9);
}

// ── Seedream 4.0 entra como la opción económica sin desplazar al 5.0 lite ──
{
  const { IMAGE_MODELS, usdFor, chooseImageModel } = elib('imageModels.js');
  const cuatro = IMAGE_MODELS.find((m) => m.modelId === 'seedream-4-0-250828');
  const lite = IMAGE_MODELS.find((m) => m.modelId === 'seedream-5-0-lite-260128');

  check('Seedream 4.0 está declarado en la escalera y es elegible', !!cuatro && cuatro.tier === 'standard' && cuatro.provider === 'seedream' && cuatro.canEdit);
  check('Seedream 5.0 lite sigue declarado: no se ha eliminado', !!lite && lite.tier === 'standard' && lite.canEdit);
  check('el 4.0 va delante del 5.0 lite en la escalera', IMAGE_MODELS.indexOf(cuatro) < IMAGE_MODELS.indexOf(lite));
  check('el 4.0 cuesta 0.030 por imagen en las tres resoluciones que declara', cuatro.sizes.join() === '1K,2K,4K' && ['1K', '2K', '4K'].every((s) => usdFor(cuatro, s) === 0.03), JSON.stringify(cuatro.usd));
  check('el 5.0 lite mantiene su tarifa de 0.035 y su mínimo de 2K', usdFor(lite, '2K') === 0.035 && lite.sizes.join() === '2K');

  // Con los dos disponibles y en igualdad de condiciones, gana el barato
  const elegido = chooseImageModel({ capability: 'image.background_remove' }, soloArk);
  check('con los dos compatibles y en nivel estándar gana el 4.0', elegido.model.modelId === 'seedream-4-0-250828', elegido.model.modelId);
  check('y lo entrega a 1K, que es lo que pide el nivel estándar', elegido.size === '1K' && elegido.tier === 'standard', elegido.size);
  const generar = chooseImageModel({ capability: 'image.generate' }, soloArk);
  check('lo mismo al crear una imagen desde cero', generar.model.modelId === 'seedream-4-0-250828' && generar.size === '1K');

  /*
   * PRECIO COMERCIAL. Los 4 Credits que costaba una edición estándar NO eran el
   * precio de catálogo: eran el SUELO DE COSTE, que a 0.035 por imagen quedaba por
   * encima del catálogo (3) y lo tapaba. Con el 4.0 a 0.030 el suelo baja justo a 3
   * y vuelve a mandar el catálogo. En modo real, que es el que lleva el margen
   * configurado, la edición estándar sigue costando 4 Credits.
   */
  const real = { ...simulated, pricingMode: 'real' };
  const std = (s) => priceImage({ capability: 'image.background_remove', kind: 'background', count: 1, references: 1, available: soloArk }, s);
  check('con el margen aplicado (modo real) la edición estándar sigue costando 4 Credits', std(real).credits === 4, String(std(real).credits));
  check('el coste protegido del 4.0 es 0.030 y su suelo baja a 3 Credits', Math.abs(std(simulated).usd - 0.03) < 1e-9 && std(simulated).detail.costFloor === 3);
  check('en modo prueba manda el catálogo de 3, que el suelo ya no tapa', std(simulated).credits === CREDIT_COSTS.ai_image_enhance_lite && CREDIT_COSTS.ai_image_enhance_lite === 3, String(std(simulated).credits));
  check('en ninguno de los dos modos se vende por debajo del coste', std(real).credits >= std(real).detail.costFloor && std(simulated).credits >= std(simulated).detail.costFloor);
  check('el nivel comercial sigue siendo estándar: el 4.0 no sube de nivel a nadie', std(real).detail.tier === 'standard' && std(simulated).detail.tier === 'standard');
}

// ── E) El servicio del libro es el canónico: el mismo con el que se cobra ──
// Antes, el libro guardaba la conjetura que se hace ANTES de elegir modelo, así
// que el coste se archivaba en un tramo y el ingreso en otro.
{
  const { imageServiceFor } = lib('aiPricing.js');
  const { serviceForCapability } = lib('creditCosts.js');
  const { planImage } = elib('image.js');
  const paso = { kind: 'background', brief: 'cambiar o quitar el fondo, fondo limpio o blanco', count: 1 };
  const plan = planImage({ capability: 'image.background_remove', input: { ...paso, aspectRatio: '1:1' } }, false);
  const canonico = imageServiceFor('image.background_remove', { kind: paso.kind, quality: undefined }, plan.choice.tier);
  const precio = priceImage({ capability: 'image.background_remove', kind: 'background', count: 1, references: 1, available: soloArk }, simulated);

  check('E) el servicio canónico coincide con el que usa el cobro', canonico === precio.service, canonico + ' vs ' + precio.service);
  check('E) y es el tramo económico que corresponde al nivel estándar', canonico === 'ai_image_enhance_lite' && plan.choice.tier === 'standard');
  check('E) la conjetura previa, sin conocer el modelo, daba otro tramo', serviceForCapability('image.background_remove', paso) === 'ai_image_enhance');
  check('E) el ingreso en Credits y el coste del proveedor siguen separados', precio.credits === 3 && Math.abs(precio.usd - 0.03) < 1e-9, precio.credits + ' Credits por $' + precio.usd);
  check('E) no se ha renombrado ningún servicio del catálogo', CREDIT_COSTS.ai_image_enhance_lite === 3 && CREDIT_COSTS.ai_image_enhance === 10);
}

// ── Ningún undefined puede llegar a Firestore en una reserva de Credits ──
const hayUndefined = (v) => {
  if (Array.isArray(v)) return v.some(hayUndefined);
  if (v && typeof v === 'object') return Object.values(v).some((x) => x === undefined || hayUndefined(x));
  return false;
};
// Copia fiel de cómo creator/credits.ts arma cada paso del presupuesto
const pasoDelPresupuesto = (p) => ({
  stepId: 'edit',
  capability: 'image.background_remove',
  service: p.service,
  credits: p.credits,
  label: String(p.detail.label ?? '') || undefined,
  resolution: String(p.detail.imageSize ?? '') || undefined,
  count: Number(p.detail.count) || 1,
  volumeDiscount: Number(p.detail.volumeDiscount) || 0,
});

check('el saneador quita los undefined anidados dentro de arrays', !hayUndefined(strip({ meta: { steps: [{ a: 1 }, { volumeDiscount: undefined, count: 1 }] } })));
check('el saneador conserva el cero, que es un dato y no una ausencia', strip({ meta: { steps: [{ volumeDiscount: 0 }] } }).meta.steps[0].volumeDiscount === 0);
check('el saneador no destroza los valores especiales de Firestore', (() => { class Marca { constructor() { this.x = 1; } } const m = new Marca(); return strip({ at: m }).at === m; })());
check('una sola imagen: el descuento es 0, nunca undefined', simg({ count: 1 }).detail.volumeDiscount === 0 && simg({ count: 1 }).detail.volumeDiscount !== undefined);
check('dos imágenes: el descuento sigue siendo 0', simg({ count: 2 }).detail.volumeDiscount === 0);
check('tres imágenes: el descuento del 5 % se mantiene', simg({ count: 3 }).detail.volumeDiscount === 5);
check('el presupuesto de 1, 2 y 3 imágenes no lleva ningún undefined', [1, 2, 3].every((n) => !hayUndefined(pasoDelPresupuesto(simg({ count: n })))));
check('la etiqueta y la resolución siempre traen valor en una operación de imagen', [1, 2, 3].every((n) => { const p = pasoDelPresupuesto(simg({ count: n })); return typeof p.label === 'string' && p.label.length > 0 && typeof p.resolution === 'string' && p.resolution.length > 0; }));
check('no tener descuento no cambia el precio ni el suelo', simg({ count: 1 }).credits === 4 && simg({ count: 1 }).detail.costFloor === 4 && simg({ count: 2 }).credits === 7 && simg({ count: 2 }).detail.costFloor === 7);

// Las cuatro secciones que el fallo dejaba bloqueadas
const { TEMPLATES: PLANTILLAS } = require(path.resolve(here, '../lib/creator/templates.js'));
const pasoImagenDe = (seccion, opcion) => {
  const t = PLANTILLAS[seccion];
  const ans = Object.fromEntries(t.questions.map((q, i) => [q.id, i === 0 && opcion ? opcion : q.options[0].id]));
  const plan = t.buildPlan(t.defaultGoal, ans);
  return plan.steps.find((s) => s.capability.startsWith('image.'));
};
for (const [seccion, opcion, esperadas] of [['photo', 'background', 1], ['chef', null, 1], ['business', 'content', 1], ['beauty', null, 2]]) {
  const paso = pasoImagenDe(seccion, opcion);
  const n = paso ? Number(paso.input?.count ?? 1) : 0;
  const p = paso ? priceImage({ capability: paso.capability, count: n, kind: paso.input?.kind, quality: paso.input?.quality, resolution: paso.input?.resolution, references: 1, available: soloGemini }, simulated) : null;
  check(`${seccion}: su paso de imagen (${n}) llega a la reserva sin ningún undefined`, !!p && n === esperadas && !hayUndefined(pasoDelPresupuesto(p)), paso && paso.capability);
}
check('el descuento por volumen solo aplica a partir de tres', volumeFactor(1) === 1 && volumeFactor(2) === 1 && volumeFactor(3) === 0.95 && volumeFactor(5) === 0.9);

const iLogo = priceImage({ capability: 'image.generate', count: 3, kind: 'logo', available: todos }, real);
check('tres logos usan el modelo que escribe texto y cubren su coste', iLogo.model === 'gemini-3.1-flash-image' && iLogo.credits >= Math.ceil(iLogo.usd * 100), String(iLogo.usd) + ' → ' + iLogo.credits);
const iCara = priceImage({ capability: 'image.identity_edit', count: 2, available: todos }, real);
check('dos looks de Beauty usan el modelo de identidad al precio oficial (USD 0.134 c/u)', iCara.model === 'gemini-3-pro-image' && Math.abs(iCara.usd - 2 * 0.134) < 1e-9 && iCara.service === 'ai_image_pro', String(iCara.usd));

const r1k = priceImage({ capability: 'image.generate', quality: 'high', resolution: '1K', available: todos }, real);
const r4k = priceImage({ capability: 'image.generate', quality: 'max', resolution: '4K', available: todos }, real);
check('más resolución cuesta más Credits, y se dice cuál se va a usar', r4k.usd > r1k.usd && r4k.detail.imageSize === '4K' && r1k.detail.imageSize === '1K', String(r1k.usd) + ' < ' + String(r4k.usd));
check('el nivel elegido tiene nombre para la persona, no el id del modelo', ['Estándar', 'Alta calidad', 'Máxima calidad'].includes(String(iSimple.detail.label)) && /gemini|flux|seedream/.test(iSimple.model));
check('subir de nivel siempre cuesta más', priceImage({ capability: 'image.generate', quality: 'standard', available: todos }, real).credits <= priceImage({ capability: 'image.generate', quality: 'high', available: todos }, real).credits && priceImage({ capability: 'image.generate', quality: 'high', available: todos }, real).credits <= priceImage({ capability: 'image.generate', quality: 'max', available: todos }, real).credits);
check('usdFor respeta el precio de edición cuando el proveedor lo cobra aparte', usdFor({ usd: { '1K': 0.03 }, usdEdit: { '1K': 0.045 }, sizes: ['1K'] }, '1K', true) === 0.045 && usdFor({ usd: { '1K': 0.03 }, usdEdit: { '1K': 0.045 }, sizes: ['1K'] }, '1K', false) === 0.03);

// ── PRECIO POR MEGAPÍXEL (FLUX) ─────────────────────────────────────────────
// BFL no cobra por imagen sino por píxeles procesados, y en una edición suma los
// de la imagen de entrada a los de la salida. Cifras de la calculadora oficial
// (bfl.ai/pricing, pestaña Image), comprobadas el 2026-09-08.
{
  const { IMAGE_MODELS, usdFor: uf, mpOf, MP_PIXELS } = elib('imageModels.js');
  const kl = IMAGE_MODELS.find((m) => m.modelId === 'flux-2-klein-9b');
  const pr = IMAGE_MODELS.find((m) => m.modelId === 'flux-2-pro');
  const px = (w, h) => ({ width: w, height: h });

  check('un megapíxel son 1024x1024, no un millón de píxeles', MP_PIXELS === 1048576);
  check('los megapíxeles se redondean siempre hacia arriba, y nunca bajan de 1', mpOf(1024, 1024) === 1 && mpOf(1536, 864) === 2 && mpOf(2048, 2048) === 4 && mpOf(64, 64) === 1);

  // 1 y 2) Generación: solo cuenta la salida
  check('1) Klein genera 1024x1024 (1 MP) por 0.015', uf(kl, '1K', false, { output: px(1024, 1024) }) === 0.015);
  check('2) Klein genera 1536x864 (1,27 MP que redondean a 2) por 0.017', uf(kl, '1K', false, { output: px(1536, 864) }) === 0.017, String(uf(kl, '1K', false, { output: px(1536, 864) })));

  // 3 y 4) Edición: entrada + salida, cada una redondeada por separado
  check('3) Klein edita 1024x1024 con una referencia de 1 MP por 0.017', uf(kl, '1K', true, { output: px(1024, 1024), referenceSizes: [px(1024, 1024)] }) === 0.017);
  check('4) Klein edita 1536x864 con referencia igual: 2+2 MP por 0.021', Math.abs(uf(kl, '1K', true, { output: px(1536, 864), referenceSizes: [px(1536, 864)] }) - 0.021) < 1e-9, String(uf(kl, '1K', true, { output: px(1536, 864), referenceSizes: [px(1536, 864)] })));

  // 5 y 6) Pro
  check('5) Pro genera 2048x2048 (4 MP) por 0.075', Math.abs(uf(pr, '2K', false, { output: px(2048, 2048) }) - 0.075) < 1e-9, String(uf(pr, '2K', false, { output: px(2048, 2048) })));
  check('6) Pro con 4 MP de salida y 1 MP de referencia: 5 MP por 0.090', Math.abs(uf(pr, '2K', true, { output: px(2048, 2048), referenceSizes: [px(1024, 1024)] }) - 0.09) < 1e-9, String(uf(pr, '2K', true, { output: px(2048, 2048), referenceSizes: [px(1024, 1024)] })));

  // 7) Varias referencias: cada una cuenta exactamente 1 MP, por grandes que sean
  const tres = uf(kl, '1K', true, { output: px(1024, 1024), referenceSizes: [px(4000, 4000), px(4000, 4000), px(4000, 4000)] });
  check('7) tres referencias enormes cuentan 1 MP cada una: 1+3 MP por 0.021', Math.abs(tres - 0.021) < 1e-9, String(tres));
  check('7) una sola referencia sí se cobra a su resolución real, con tope de 4 MP', uf(kl, '1K', true, { output: px(1024, 1024), referenceSizes: [px(4000, 4000)] }) === uf(kl, '1K', true, { output: px(1024, 1024), references: 4 }));

  // Una edición no puede colarse al precio de generación
  check('editar nunca cuesta lo mismo que crear cuando el proveedor cobra la entrada', uf(kl, '1K', true) > uf(kl, '1K', false) && uf(pr, '1K', true) > uf(pr, '1K', false));
  check('sin referencias declaradas, una edición cuenta al menos la foto que se edita', uf(kl, '1K', true) === 0.017);

  // 13) El catálogo de FLUX que ya funcionaba no se rompe
  check('13) crear a 1K sigue costando lo de siempre en los dos modelos FLUX', uf(kl, '1K', false) === 0.015 && uf(pr, '1K', false) === 0.03);
  check('13) la salida nunca se factura por encima del tope de 4 MP del proveedor', uf(kl, '4K', false, { output: px(8192, 8192) }) === uf(kl, '2K', false, { output: px(2048, 2048) }));

  // 8, 9 y 10) Sobre la operación completa: cantidad, suelo y precio comercial
  const soloFlux = (p) => p === 'flux';
  const op = (cap, kind, count, resolution) =>
    priceImage({ capability: cap, kind, count, resolution, references: cap === 'image.generate' ? 0 : 1, available: soloFlux }, simulated);

  const tresImg = op('image.generate', 'photo', 3);
  check('8) tres imágenes cuestan tres veces una: 0.045', Math.abs(tresImg.usd - 0.045) < 1e-9 && tresImg.detail.count === 3, String(tresImg.usd));

  const transformar = op('image.edit', 'transform', 2);
  check('9) el suelo protege el coste real de las dos ediciones (0.034 -> 4 Credits)', Math.abs(transformar.usd - 0.034) < 1e-9 && transformar.detail.costFloor === 4 && transformar.credits === 4, transformar.usd + ' / ' + transformar.credits);
  const mejorar = op('image.edit', 'enhance', 1, '2K');
  check('9) mejorar calidad a 2K protege sus 5 MP reales (0.090 -> suelo 9)', Math.abs(mejorar.usd - 0.09) < 1e-9 && mejorar.detail.costFloor === 9, mejorar.usd + ' / ' + mejorar.detail.costFloor);

  {
    const todas = [op('image.generate', 'photo', 1), op('image.generate', 'photo', 3), op('image.background_remove', 'background', 1), op('image.object_remove', 'remove', 1), op('image.edit', 'colorize', 1), transformar, mejorar];
    check('10) ninguna operación de Weë Photo se vende por debajo del coste protegido', todas.every((r) => r.credits / simulated.creditsPerUsd >= r.usd - 1e-9), todas.map((r) => r.credits + 'Cr/\$' + r.usd.toFixed(3)).join(' '));
    check('10) y el suelo nunca lleva descuento comercial aplicado', todas.every((r) => r.detail.costFloor === Math.ceil(r.usd * simulated.creditsPerUsd)));
  }

  // 11 y 12) Nadie más se movió
  const s40 = IMAGE_MODELS.find((m) => m.modelId === 'seedream-4-0-250828');
  const sl = IMAGE_MODELS.find((m) => m.modelId === 'seedream-5-0-lite-260128');
  const gfl = IMAGE_MODELS.find((m) => m.modelId === 'gemini-3.1-flash-lite-image');
  const gf = IMAGE_MODELS.find((m) => m.modelId === 'gemini-3.1-flash-image');
  const gp2 = IMAGE_MODELS.find((m) => m.modelId === 'gemini-3-pro-image');
  check('11) Seedream 4.0 mantiene 0.030 en sus tres resoluciones, cree o edite', ['1K', '2K', '4K'].every((z) => uf(s40, z) === 0.03 && uf(s40, z, true) === 0.03) && !s40.pricePerMp);
  check('11) Seedream 5.0 Lite mantiene 0.035, cree o edite', uf(sl, '2K') === 0.035 && uf(sl, '2K', true) === 0.035 && !sl.pricePerMp);
  check('12) Gemini mantiene sus tres tarifas exactas', uf(gfl, '1K') === 0.0336 && uf(gf, '1K') === 0.067 && uf(gf, '2K') === 0.101 && uf(gf, '4K') === 0.151 && uf(gp2, '1K') === 0.134 && uf(gp2, '4K') === 0.24);
  check('12) y ninguno de ellos cobra por megapíxel', [gfl, gf, gp2].every((m) => !m.pricePerMp));
  check('11 y 12) pasar información de tamaño no altera a quien cobra por imagen', uf(s40, '1K', true, { output: px(4000, 4000), references: 4 }) === 0.03 && uf(gp2, '1K', true, { output: px(4000, 4000), references: 4 }) === 0.134);
}

// ── TAMAÑO REAL DE LA IMAGEN DE ENTRADA (FASE 2C) ───────────────────────────
// Sin saber cuánto mide la foto que se va a editar no se puede cotizar a quien
// cobra por megapíxel. Se lee de los metadatos del archivo y, si faltan, de la
// cabecera del propio archivo. Aquí solo se LEE: nada se reescribe.
{
  const { dimensionsOf, withPixels } = elib('imageMeta.js');

  // Cabeceras sintéticas de los tres formatos que Weë admite hoy
  const png = (w, h) => {
    const b = Buffer.alloc(24, 0);
    b.writeUInt32BE(0x89504e47, 0); b.writeUInt32BE(0x0d0a1a0a, 4);
    b.writeUInt32BE(13, 8); b.write('IHDR', 12);
    b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20);
    return b;
  };
  const jpg = (w, h) => {
    const b = Buffer.alloc(32, 0);
    b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff; b[3] = 0xc0;
    b.writeUInt16BE(17, 4); b[6] = 8;
    b.writeUInt16BE(h, 7); b.writeUInt16BE(w, 9);
    return b;
  };
  const webp = (w, h) => {
    const b = Buffer.alloc(32, 0);
    b.write('RIFF', 0); b.write('WEBP', 8); b.write('VP8X', 12);
    const le24 = (v, i) => { b[i] = v & 0xff; b[i + 1] = (v >> 8) & 0xff; b[i + 2] = (v >> 16) & 0xff; };
    le24(w - 1, 24); le24(h - 1, 27);
    return b;
  };

  // 1 a 6) Los tamaños que pediste, en los tres formatos
  check('1) lee 1024x1024', dimensionsOf(png(1024, 1024)).width === 1024 && dimensionsOf(png(1024, 1024)).height === 1024);
  check('2) lee 1536x864', dimensionsOf(jpg(1536, 864)).width === 1536 && dimensionsOf(jpg(1536, 864)).height === 864);
  check('3) lee 4000x3000', dimensionsOf(png(4000, 3000)).width === 4000 && dimensionsOf(png(4000, 3000)).height === 3000);
  check('4) lee una vertical, 1080x1920', dimensionsOf(jpg(1080, 1920)).height > dimensionsOf(jpg(1080, 1920)).width);
  check('5) lee 4:3 y conserva la proporción', Math.abs(dimensionsOf(png(1600, 1200)).width / dimensionsOf(png(1600, 1200)).height - 4 / 3) < 0.005);
  check('6) lee 3:4 y conserva la proporción', Math.abs(dimensionsOf(webp(1200, 1600)).width / dimensionsOf(webp(1200, 1600)).height - 3 / 4) < 0.005);
  check('lee los tres formatos que admite el flujo: PNG, JPEG y WebP', dimensionsOf(png(800, 600)).width === 800 && dimensionsOf(jpg(800, 600)).width === 800 && dimensionsOf(webp(800, 600)).width === 800);
  check('un archivo que no reconoce devuelve null, nunca un tamaño inventado', dimensionsOf(Buffer.alloc(64, 7)) === null && dimensionsOf(Buffer.alloc(3)) === null);

  // 9 y 10) Solo se lee: ni el buffer ni el archivo original se tocan
  {
    const original = png(1234, 5678);
    const copia = Buffer.from(original);
    const a = dimensionsOf(original);
    const b = dimensionsOf(original);
    check('9) leer dos veces da lo mismo: las dimensiones no se alteran', a.width === b.width && a.height === b.height && a.width === 1234);
    check('10) el archivo de origen queda intacto byte a byte', original.equals(copia));
    check('10) el módulo solo expone lectura, no escribe ni sube nada', typeof dimensionsOf === 'function' && typeof withPixels === 'function');
  }
  check('el conteo de píxeles acompaña a las dimensiones', withPixels({ width: 4000, height: 3000 }, 'metadata').pixelCount === 12000000);
  check('un tamaño imposible se descarta en vez de propagarse', withPixels({ width: 0, height: 100 }, 'file') === null && withPixels({ width: NaN, height: 1 }, 'file') === null);

  // 7 y 8) Con el tamaño conocido el precio es exacto; sin él, la cota inferior
  {
    const soloFlux2 = (p) => p === 'flux';
    const editar = (referenceSizes) =>
      priceImage({ capability: 'image.background_remove', kind: 'background', count: 1, references: 1, referenceSizes, available: soloFlux2 }, simulated);
    const grande = editar([{ width: 4000, height: 3000 }]);
    const pequena = editar([{ width: 1024, height: 1024 }]);
    const sinDato = editar(undefined);
    check('7) con el tamaño conocido, una foto grande cuesta más que una pequeña', grande.usd > pequena.usd, pequena.usd + ' -> ' + grande.usd);
    check('7) una foto de 4000x3000 se factura con el tope de 4 MP de entrada', Math.abs(grande.usd - 0.023) < 1e-9, String(grande.usd));
    check('8) sin el dato se usa la cota inferior de 1 MP por referencia', Math.abs(sinDato.usd - 0.017) < 1e-9 && sinDato.usd === pequena.usd, String(sinDato.usd));
    check('8) y esa cota nunca sobrestima: siempre es menor o igual que el real', sinDato.usd <= grande.usd);
    check('7 y 8) en los dos casos el precio cubre el coste protegido', [grande, pequena, sinDato].every((r) => r.credits / simulated.creditsPerUsd >= r.usd - 1e-9));
  }

  // 13) El pricing de la FASE 2B no cambia cuando recibe una dimensión conocida
  {
    const kl2 = elib('imageModels.js').IMAGE_MODELS.find((m) => m.modelId === 'flux-2-klein-9b');
    const uf2 = elib('imageModels.js').usdFor;
    check('13) los seis casos A-F siguen dando lo mismo con el tamaño explícito', uf2(kl2, '1K', false, { output: { width: 1024, height: 1024 } }) === 0.015 && uf2(kl2, '1K', true, { output: { width: 1024, height: 1024 }, referenceSizes: [{ width: 1024, height: 1024 }] }) === 0.017);
    check('13) una creación desde cero no paga entrada aunque llegue un tamaño', uf2(kl2, '1K', false, { output: { width: 1024, height: 1024 }, referenceSizes: [{ width: 4000, height: 3000 }] }) === 0.015);
  }

  // 11, 12 y 14) Nadie más se mueve, y nada histórico se toca
  {
    const IM3 = elib('imageModels.js');
    const s = IM3.IMAGE_MODELS.find((m) => m.modelId === 'seedream-4-0-250828');
    const l = IM3.IMAGE_MODELS.find((m) => m.modelId === 'seedream-5-0-lite-260128');
    const g = IM3.IMAGE_MODELS.find((m) => m.modelId === 'gemini-3-pro-image');
    const enorme = { output: { width: 6000, height: 4000 }, referenceSizes: [{ width: 6000, height: 4000 }] };
    check('11) Seedream no cambia de precio por conocer el tamaño de la foto', IM3.usdFor(s, '1K', true, enorme) === 0.03 && IM3.usdFor(l, '2K', true, enorme) === 0.035);
    check('12) Gemini tampoco', IM3.usdFor(g, '1K', true, enorme) === 0.134);
    check('14) leer dimensiones no escribe en ningún registro: el módulo no importa Firestore', !Object.keys(elib('imageMeta.js')).some((k) => /write|save|update|set/i.test(k)));
  }
}

// ── LA POLÍTICA DE RESOLUCIÓN DECIDE, EL PRECIO CONSUME (FASE 2D-2) ─────────
// El precio ya no razona con una etiqueta ("1K"): pide las dimensiones a la
// política y cobra por ellas. Una sola decisión, imposible que discrepen.
{
  const RP = elib('resolutionPolicy.js');
  const soloFlux3 = (p) => p === 'flux';
  const soloSd = (p) => p === 'seedream';
  const soloGem = (p) => p === 'gemini';
  const cotizar = (extra, disponible = soloFlux3) =>
    priceImage({ capability: extra.capability || 'image.generate', count: 1, available: disponible, ...extra }, simulated);
  const ratio = (d) => d.outputWidth / d.outputHeight;

  // 1, 2 y 3) Cada nivel produce las dimensiones que la política define
  {
    const std = cotizar({ quality: 'standard', aspectRatio: '1:1' });
    const high = cotizar({ quality: 'high', aspectRatio: '1:1' });
    const max = cotizar({ quality: 'max', aspectRatio: '1:1' });
    check('1) Standard cotiza sobre 1024x1024', std.detail.outputWidth === 1024 && std.detail.outputHeight === 1024, std.detail.outputWidth + 'x' + std.detail.outputHeight);
    check('2) High cotiza sobre unas dimensiones mayores que Standard', high.detail.outputPixels > std.detail.outputPixels, high.detail.outputWidth + 'x' + high.detail.outputHeight);
    check('3) Max cotiza sobre el máximo válido del modelo elegido', max.detail.outputPixels > 0 && max.detail.outputPixels <= 16 * 1048576, max.detail.outputWidth + 'x' + max.detail.outputHeight);
  }

  // 4 a 8) La proporción se conserva en el precio, no solo en la política
  {
    const casos = [['16:9', 16 / 9], ['9:16', 9 / 16], ['4:3', 4 / 3], ['3:4', 3 / 4]];
    const planes = casos.map(([a, r]) => ({ a, r, d: cotizar({ quality: 'standard', aspectRatio: a }).detail }));
    check('4-7) 16:9, 9:16, 4:3 y 3:4 conservan su proporción al cotizar', planes.every((p) => Math.abs(ratio(p.d) - p.r) / p.r <= 0.005), planes.map((p) => p.a + '=' + p.d.outputWidth + 'x' + p.d.outputHeight).join(' '));
    check('4-7) y ninguna acaba siendo cuadrada', planes.every((p) => p.d.outputWidth !== p.d.outputHeight));
    const raro = cotizar({ capability: 'image.background_remove', quality: 'standard', references: 1, referenceSizes: [{ width: 1000, height: 777 }] }).detail;
    check('8) una proporción arbitraria de la foto se conserva al cotizar', Math.abs(ratio(raro) - 1000 / 777) / (1000 / 777) <= 0.005, raro.outputWidth + 'x' + raro.outputHeight);
  }

  // 9 a 14) FLUX cobra por las dimensiones que decidió la política
  {
    const g1 = cotizar({ quality: 'standard', aspectRatio: '1:1' });
    check('9) el coste sale de las dimensiones del plan, no de una etiqueta', g1.detail.outputPixels === g1.detail.outputWidth * g1.detail.outputHeight);
    check('11) FLUX Klein a 1 MP cuesta 0.015', Math.abs(g1.usd - 0.015) < 1e-9, String(g1.usd));
    const e1 = cotizar({ capability: 'image.background_remove', quality: 'standard', references: 1, referenceSizes: [{ width: 1024, height: 1024 }] });
    check('10 y 12) con la referencia real de 1 MP son 2 MP: 0.017', Math.abs(e1.usd - 0.017) < 1e-9, String(e1.usd));
    const e2 = cotizar({ capability: 'image.background_remove', quality: 'standard', references: 1, referenceSizes: [{ width: 4000, height: 3000 }] });
    check('10) una referencia grande se factura a su tamaño real, con tope de 4 MP', Math.abs(e2.usd - 0.023) < 1e-9 && e2.usd > e1.usd, String(e2.usd));
    // FLUX Pro vive en el nivel alto; su objetivo de 3 MP cae en 1776x1776, que
    // redondean a los 4 MP que factura BFL.
    const p4 = cotizar({ quality: 'high', aspectRatio: '1:1' });
    check('13) FLUX Pro cotiza 4 MP facturables y cuesta 0.075', p4.model === 'flux-2-pro' && Math.ceil(p4.detail.outputPixels / 1048576) === 4 && Math.abs(p4.usd - 0.075) < 1e-9, p4.model + ' ' + p4.detail.outputPixels + ' ' + p4.usd);
    const p5 = cotizar({ capability: 'image.edit', quality: 'high', references: 1, referenceSizes: [{ width: 1024, height: 1024 }] });
    check('14) FLUX Pro con 4 MP de salida y 1 de referencia: 5 MP, 0.090', p5.model === 'flux-2-pro' && Math.abs(p5.usd - 0.09) < 1e-9, p5.model + ' ' + p5.usd);
  }

  // 15 y 16) Los que cobran por imagen no se convierten a megapíxeles
  {
    const s1 = cotizar({ quality: 'standard', aspectRatio: '16:9' }, soloSd);
    const s2 = cotizar({ capability: 'image.background_remove', quality: 'standard', references: 1, referenceSizes: [{ width: 6000, height: 4000 }] }, soloSd);
    check('15) Seedream 4.0 sigue costando 0.030 pase lo que pase con las dimensiones', s1.usd === 0.03 && s2.usd === 0.03, s1.usd + ' / ' + s2.usd);
    const g = cotizar({ quality: 'high', aspectRatio: '1:1' }, soloGem);
    const gm = cotizar({ quality: 'max', aspectRatio: '1:1' }, soloGem);
    check('16) Gemini conserva sus tarifas: 0.067 en alta y 0.134 en máxima', g.usd === 0.067 && gm.usd === 0.134, g.usd + ' / ' + gm.usd);
    check('15-16) y ninguno declara tarifa por megapíxel', !elib('imageModels.js').IMAGE_MODELS.filter((m) => m.provider !== 'flux').some((m) => m.pricePerMp));
  }

  // 17) El suelo sigue protegiendo el coste, sin descuentos
  {
    const todas = [cotizar({ quality: 'standard', aspectRatio: '1:1' }), cotizar({ capability: 'image.edit', quality: 'standard', count: 2, references: 1, referenceSizes: [{ width: 1024, height: 1024 }] }), cotizar({ quality: 'max', aspectRatio: '1:1' })];
    check('17) ninguna cotización queda por debajo del coste protegido', todas.every((r) => r.credits / simulated.creditsPerUsd >= r.usd - 1e-9), todas.map((r) => r.credits + 'Cr/$' + r.usd.toFixed(3)).join(' '));
    check('17) y el suelo es el coste sin descuento comercial', todas.every((r) => r.detail.costFloor === Math.ceil(r.usd * simulated.creditsPerUsd)));
  }

  // 18) El mínimo técnico de un modelo no sube el nivel comercial
  {
    const lite = priceImage({ capability: 'image.background_remove', kind: 'background', quality: 'standard', count: 1, references: 1, modelId: 'seedream-5-0-lite-260128', resolution: '2K', available: soloSd }, simulated);
    check('18) el 5.0 Lite entregando su mínimo de 2K sigue siendo nivel estándar', lite.detail.tier === 'standard' && lite.service === 'ai_image_enhance_lite', lite.detail.tier + '/' + lite.service);
    const plan = RP.resolveForModel('seedream-5-0-lite-260128', { quality: 'standard', aspect: '1:1' });
    check('18) la política lo confirma: entrega de más pero la calidad sigue siendo estándar', plan.aboveTarget === true && plan.quality === 'standard');
  }

  // 19) Max es relativo al modelo
  {
    const fx = RP.resolveForModel('flux-2-pro', { quality: 'max', aspect: '1:1' });
    const sd = RP.resolveForModel('seedream-4-0-250828', { quality: 'max', aspect: '1:1' });
    check('19) el Max de FLUX (4 MP) no es el de Seedream (16 MP)', fx.pixels === 4 * 1048576 && sd.pixels === 16777216 && fx.pixels !== sd.pixels);
  }

  // 20 y 21) Sin tolerancia y sin degradación silenciosa
  {
    const casi = { kind: 'continuous', minPixels: 4096, maxPixels: Math.floor(2.5 * 1048576), minSide: 64, step: 16, minRatio: 1 / 16, maxRatio: 16 };
    check('20) un modelo al 83 % del objetivo alto no cuenta como suficiente', RP.canServe('high', casi) === false && RP.resolveDimensions({ quality: 'high', grid: casi, aspect: '1:1' }) === null);
    check('21) cuando no puede, la política devuelve null en vez de una medida menor', RP.resolveForModel('gemini-3.1-flash-lite-image', { quality: 'high', aspect: '1:1' }) === null);
  }

  // 22) Una sola decisión de dimensiones: el precio no calcula las suyas
  {
    const casos = [['standard', '1:1'], ['standard', '16:9'], ['high', '4:3'], ['max', '1:1']];
    const coinciden = casos.every(([q, a]) => {
      const r = cotizar({ quality: q, aspectRatio: a });
      const p = RP.resolveForModel(r.model, { quality: r.detail.tier, aspect: a });
      return p && r.detail.outputWidth === p.width && r.detail.outputHeight === p.height;
    });
    check('22) las dimensiones del precio son exactamente las de la política', coinciden);
  }

  // 23, 24 y 25) Entradas: solo se paga por las que existen
  {
    const gen = cotizar({ quality: 'standard', aspectRatio: '1:1', referenceSizes: [{ width: 4000, height: 3000 }] });
    check('23) crear desde cero no paga entrada aunque llegue un tamaño', Math.abs(gen.usd - 0.015) < 1e-9, String(gen.usd));
    const uno = cotizar({ capability: 'image.edit', quality: 'standard', references: 1, referenceSizes: [{ width: 1024, height: 1024 }] });
    check('24) editar sí contabiliza la foto de entrada', uno.usd > gen.usd && Math.abs(uno.usd - 0.017) < 1e-9);
    const varias = cotizar({ capability: 'image.edit', quality: 'standard', references: 3, referenceSizes: [{ width: 4000, height: 4000 }, { width: 4000, height: 4000 }, { width: 4000, height: 4000 }] });
    check('25) varias referencias cuentan 1 MP cada una: 1+3 MP son 0.021', Math.abs(varias.usd - 0.021) < 1e-9, String(varias.usd));
  }
}

// ── ELEGIBILIDAD REAL: la política manda sobre la etiqueta (FASE 2D-4) ─────
// Un modelo que no alcanza la calidad pedida deja de ser candidato. Antes se
// elegía igual, por ser el más barato del nivel, y se servía a menor resolución.
{
  const IM = elib('imageModels.js');
  const RP = elib('resolutionPolicy.js');
  const elegir = (need, disponible) => IM.chooseImageModel(need, disponible);
  const soloG = (p) => p === 'gemini';
  const GLITE = 'gemini-3.1-flash-lite-image';

  // A, B y C) La calidad pedida decide quién puede ser candidato
  {
    const s = elegir({ capability: 'image.generate', quality: 'standard' });
    check('A) Standard elige un modelo que de verdad puede servir Standard', RP.canServe('standard', RP.gridFor(s.model.modelId)) === true, s.model.modelId);
    const h = elegir({ capability: 'image.generate', quality: 'high' });
    check('B) High no elige un modelo que solo llega a Standard', RP.canServe('high', RP.gridFor(h.model.modelId)) === true && h.model.modelId !== GLITE, h.model.modelId);
    const m = elegir({ capability: 'image.generate', quality: 'max' });
    check('C) Max no elige un modelo que no alcance el objetivo alto', RP.canServe('max', RP.gridFor(m.model.modelId)) === true, m.model.modelId);
    check('B-C) el modelo que topa en 1 MP solo cualifica para Standard', RP.canServe('standard', RP.gridFor(GLITE)) === true && RP.canServe('high', RP.gridFor(GLITE)) === false && RP.canServe('max', RP.gridFor(GLITE)) === false);
  }

  // D y E) FLUX Pro: por resolución alcanza Max; por capacidad no siempre
  {
    const pro = IM.IMAGE_MODELS.find((x) => x.modelId === 'flux-2-pro');
    check('D) FLUX Pro alcanza por resolución el objetivo de Max (4 MP sobre 3 MP)', RP.canServe('max', RP.gridFor('flux-2-pro')) === true);
    check('E) pero queda fuera por CAPACIDAD cuando hace falta conservar el rostro', pro.keepsIdentity === false);
    check('E) y cuando hace falta texto legible dentro de la imagen', pro.rendersText === false);
    const rostro = elegir({ capability: 'image.identity_edit', quality: 'max' });
    check('E) una operación de identidad sigue yendo al único modelo que conserva el rostro', rostro.model.keepsIdentity === true && rostro.model.modelId === 'gemini-3-pro-image', rostro.model.modelId);
    check('D-E) su nivel comercial declarado NO se ha tocado', pro.tier === 'high');
  }

  // F y G) nearestSize ya no puede rebajar una solicitud
  {
    const alta = elegir({ capability: 'image.generate', quality: 'high' }, soloG);
    check('F) pidiendo High con solo Gemini no se cae al modelo de 1 MP', alta.model.modelId !== GLITE, alta.model.modelId);
    check('F) y el elegido sí puede servir High', RP.canServe('high', RP.gridFor(alta.model.modelId)) === true);
    const maxima = elegir({ capability: 'image.generate', quality: 'max' }, soloG);
    check('F) lo mismo pidiendo Max', maxima.model.modelId !== GLITE && RP.canServe('max', RP.gridFor(maxima.model.modelId)) === true);
    check('G) ningún modelo incapaz aparece como elegido en ninguna calidad', ['standard', 'high', 'max'].every((q) => { const c = elegir({ capability: 'image.generate', quality: q }); const g = RP.gridFor(c.model.modelId); return !g || RP.canServe(q, g); }));
  }

  // H a M) Proporciones: el elegido puede producirlas sin deformar
  {
    const aspectos = [['1:1', 1], ['16:9', 16 / 9], ['9:16', 9 / 16], ['4:3', 4 / 3], ['3:4', 3 / 4]];
    const planes = aspectos.map(([a, r]) => {
      const c = elegir({ capability: 'image.generate', quality: 'standard' });
      return { a, r, p: RP.resolveForModel(c.model.modelId, { quality: c.tier, aspect: a }) };
    });
    check('H-L) el modelo elegido resuelve 1:1, 16:9, 9:16, 4:3 y 3:4 sin deformar', planes.every((x) => x.p && Math.abs(x.p.aspect - x.r) / x.r <= 0.005), planes.map((x) => x.a + '=' + x.p.width + 'x' + x.p.height).join(' '));
    const c = elegir({ capability: 'image.background_remove', quality: 'standard' });
    const raro = RP.resolveForModel(c.model.modelId, { quality: c.tier, input: { width: 1000, height: 777 } });
    check('M) y también una proporción arbitraria de la foto', raro !== null && Math.abs(raro.aspect - 1000 / 777) / (1000 / 777) <= 0.005, raro.width + 'x' + raro.height);
  }

  // N) Nunca por encima del máximo del modelo
  {
    const todos = [];
    for (const q of ['standard', 'high', 'max']) for (const a of ['1:1', '16:9', '4:3']) {
      const c = elegir({ capability: 'image.generate', quality: q });
      const p = RP.resolveForModel(c.model.modelId, { quality: c.tier, aspect: a });
      if (p) todos.push({ id: c.model.modelId, p });
    }
    check('N) ninguna resolución elegida supera el máximo de su modelo', todos.every(({ id, p }) => { const g = RP.gridFor(id); return g.kind !== 'continuous' || p.pixels <= g.maxPixels; }), String(todos.length) + ' combinaciones');
  }

  // O) Sin fallback oculto ni demo en la selección
  {
    check('O) el selector no conoce el proveedor demo', !IM.IMAGE_MODELS.some((m) => m.provider === 'mock'));
    check('O) ni introduce reintentos: es una función pura de selección', typeof IM.chooseImageModel === 'function' && IM.chooseImageModel.length <= 2);
  }

  // P, Q, R, S y T) Nadie más se movió
  {
    const s40 = IM.IMAGE_MODELS.find((m) => m.modelId === 'seedream-4-0-250828');
    const sl = IM.IMAGE_MODELS.find((m) => m.modelId === 'seedream-5-0-lite-260128');
    const gf = IM.IMAGE_MODELS.find((m) => m.modelId === 'gemini-3.1-flash-image');
    const gp = IM.IMAGE_MODELS.find((m) => m.modelId === 'gemini-3-pro-image');
    check('P) Seedream conserva niveles, tamaños y precios', s40.tier === 'standard' && s40.sizes.join() === '1K,2K,4K' && IM.usdFor(s40, '1K') === 0.03 && IM.usdFor(sl, '2K') === 0.035);
    check('Q) Gemini conserva niveles, tamaños y precios', gf.tier === 'high' && gp.tier === 'max' && IM.usdFor(gf, '1K') === 0.067 && IM.usdFor(gp, '1K') === 0.134);
    const soloFlux4 = (p) => p === 'flux';
    const gen = priceImage({ capability: 'image.generate', quality: 'standard', count: 1, aspectRatio: '1:1', available: soloFlux4 }, simulated);
    const edit = priceImage({ capability: 'image.background_remove', quality: 'standard', count: 1, references: 1, referenceSizes: [{ width: 1920, height: 1080 }], available: soloFlux4 }, simulated);
    check('R) crear desde cero sigue sin facturar entrada', Math.abs(gen.usd - 0.015) < 1e-9, String(gen.usd));
    check('S) editar sigue facturando la referencia con su tamaño real', Math.abs(edit.usd - 0.019) < 1e-9, String(edit.usd));
    const plan = RP.resolveForModel(gen.model, { quality: gen.detail.tier, aspect: '1:1' });
    check('T) el precio y la política siguen dando las mismas dimensiones', gen.detail.outputWidth === plan.width && gen.detail.outputHeight === plan.height, gen.detail.outputWidth + 'x' + gen.detail.outputHeight);
  }
}
check('imagen: ninguna sección fija el precio; todos los servicios existen en el catálogo', ['ai_image', 'ai_image_enhance', 'ai_image_pro', 'ai_video_draft', 'ai_video', 'ai_video_hd', 'ai_video_advanced', 'ai_video_max'].every((s) => typeof CREDIT_COSTS[s] === 'number'));

console.log('\n── Suelo universal: ninguna operación se vende por debajo del coste ──');
const { estimateProviderUsd, priceOperation, estimateInputTokens, TEXT_RATES, TOKENS, MULTIMODAL_RATE, SEARCH_USD_PER_QUERY, DEFAULT_MAX_OUTPUT_TOKENS, THINKING_FACTOR, MULTIMODAL_THINKING_FACTOR, billableOutput } = lib('aiPricing.js');
const tokensUsd = (inTok, outTok, r) => (inTok * r.input + outTok * r.output) / 1_000_000;

// El nivel máximo pasó de Gemini 2.5 Pro (1.25/10.00) a Gemini 3.8 Flash (0.75/3.75)
check('el coste de texto usa la tarifa oficial del modelo de cada nivel', TEXT_RATES.standard.input === 0.25 && TEXT_RATES.standard.output === 1.5 && TEXT_RATES.high.input === 0.75 && TEXT_RATES.max.input === 0.75 && TEXT_RATES.max.output === 3.75);
// El nivel económico pasó a Gemini 3.1 Flash-Lite, que razona por defecto: ya suma razonamiento
check('el nivel económico ya cuenta razonamiento: su modelo es de la generación 3', THINKING_FACTOR.standard === 1);
check('el texto máximo razona menos que el alto porque su nivel se fija en bajo', THINKING_FACTOR.max < THINKING_FACTOR.high && THINKING_FACTOR.max > 0);
check('la estimación cuenta los tokens de razonamiento, que Google factura como salida', estimateProviderUsd('text.generate', { prompt: 'x', quality: 'max', maxOutputTokens: 1000 }) > (estimateInputTokens({ prompt: 'x' }) * TEXT_RATES.max.input + 1000 * TEXT_RATES.max.output) / 1_000_000);
check('los tokens de entrada cuentan el historial, no solo el mensaje', estimateInputTokens({ prompt: 'hola', history: Array.from({ length: 20 }, () => ({ text: 'x'.repeat(800) })) }) > estimateInputTokens({ prompt: 'hola' }) * 5);
check('los tokens de entrada cuentan las fotos, los documentos y el audio con las tarifas oficiales de Gemini', estimateInputTokens({ prompt: 'x', imageUrl: 'u' }) - estimateInputTokens({ prompt: 'x' }) === TOKENS.perImage && estimateInputTokens({ prompt: 'x', documentUrl: 'u', documentPages: 10 }) - estimateInputTokens({ prompt: 'x' }) === 10 * TOKENS.perDocumentPage && estimateInputTokens({ prompt: 'x', audioUrl: 'u', audioSeconds: 60 }) - estimateInputTokens({ prompt: 'x' }) === 60 * TOKENS.perAudioSecond);
check('la búsqueda suma el coste de la consulta sobre la tarifa de SU modelo, no la del nivel', Math.abs(estimateProviderUsd('text.search', { prompt: 'x' }) - (SEARCH_USD_PER_QUERY + tokensUsd(estimateInputTokens({ prompt: 'x' }), billableOutput(DEFAULT_MAX_OUTPUT_TOKENS, MULTIMODAL_THINKING_FACTOR), MULTIMODAL_RATE))) < 1e-9, String(estimateProviderUsd('text.search', { prompt: 'x' })));
check('la búsqueda cuesta más que el mismo texto sin fuentes', estimateProviderUsd('text.search', { prompt: 'x' }) > estimateProviderUsd('text.generate', { prompt: 'x' }) + SEARCH_USD_PER_QUERY);
// El audio se factura con tarifa propia: usar la de texto lo dejaba 3 veces por debajo
check('el audio se estima con su tarifa de audio, no con la de texto', Math.abs(estimateProviderUsd('audio.transcribe', { audioSeconds: 600 }) - (600 * TOKENS.perAudioSecond * MULTIMODAL_RATE.audioInput + billableOutput(DEFAULT_MAX_OUTPUT_TOKENS, MULTIMODAL_THINKING_FACTOR) * MULTIMODAL_RATE.output) / 1_000_000) < 1e-9, String(estimateProviderUsd('audio.transcribe', { audioSeconds: 600 })));
check('el PDF se estima con la tarifa del modelo que lo lee, más cara que la del nivel', estimateProviderUsd('doc.read', { prompt: 'x', documentUrl: 'u', documentPages: 10 }) > estimateProviderUsd('text.generate', { prompt: 'x', documentUrl: 'u', documentPages: 10 }));
check('transcribir 10 minutos sigue cubierto por los Credits del catálogo', priceOperation('audio.transcribe', { audioSeconds: 600 }, 'ai_transcribe', { creditsPerUsd: 100, margin: 0.3, pricingMode: 'simulated' }).credits === CREDIT_COSTS.ai_transcribe);
check('buscar con fuentes sigue cubierto por los Credits del catálogo', priceOperation('text.search', { prompt: 'x' }, 'ai_search', { creditsPerUsd: 100, margin: 0.3, pricingMode: 'simulated' }).credits === CREDIT_COSTS.ai_search);
check('la voz se cobra por caracteres a la tarifa oficial de ElevenLabs', Math.abs(estimateProviderUsd('voice.tts', { text: 'x'.repeat(600) }) - 0.06) < 1e-9);

const cubre = (cap, input, service, settings) => {
  const p = priceOperation(cap, input, service, settings);
  return p.credits >= Math.ceil(p.usd * settings.creditsPerUsd);
};
check('texto, búsqueda, voz y transcripción cubren siempre su coste en modo prueba', cubre('text.generate', { prompt: 'x' }, 'ai_text', simulated) && cubre('text.search', { prompt: 'x' }, 'ai_search', simulated) && cubre('voice.tts', { text: 'x'.repeat(5000) }, 'ai_audio', simulated) && cubre('audio.transcribe', { audioUrl: 'u' }, 'ai_transcribe', simulated));
check('y también en modo real', cubre('text.generate', { prompt: 'x', quality: 'max' }, 'ai_text_pro', real) && cubre('voice.tts', { text: 'x'.repeat(5000) }, 'ai_audio', real));
const pdfCaro = priceOperation('text.generate', { prompt: 'analiza', documentUrl: 'u', documentPages: 400, quality: 'max' }, 'ai_text_pro', simulated);
check('un documento largo con el modelo caro sube el precio por encima del catalogo, no se vende a perdida', pdfCaro.credits > CREDIT_COSTS.ai_text_pro && pdfCaro.credits >= Math.ceil(pdfCaro.usd * 100), pdfCaro.credits + ' Credits por ' + pdfCaro.usd.toFixed(3));
check('el precio de texto sube con la salida pedida, que es lo que el adaptador limita', priceOperation('text.generate', { prompt: 'x', quality: 'max', maxOutputTokens: 8000 }, 'ai_text_pro', real).credits > priceOperation('text.generate', { prompt: 'x', quality: 'max' }, 'ai_text_pro', real).credits);

console.log('\n── Weë Brain: mismo cálculo para el precio mostrado y el cobrado ──');
// Mismo input que arma brainInput() en el servidor, para comprobar el suelo con cada tipo de entrada
const brainInput = (message, history = [], files = {}) => ({
  system: 'S'.repeat(2000),
  prompt: message,
  history,
  ...files,
  kind: 'answer',
  maxOutputTokens: 1400,
  temperature: 0.7,
});
const hist = (n, largo = 600) => Array.from({ length: n }, () => ({ role: 'user', text: 'x'.repeat(largo) }));
const brainPrice = (input, webSearch = false, settings = simulated) => priceOperation(webSearch ? 'text.search' : 'text.generate', input, webSearch ? 'ai_search' : 'ai_text', settings);
const cubreCoste = (p, settings) => p.credits >= Math.ceil(p.usd * settings.creditsPerUsd);

const bCorto = brainPrice(brainInput('hola'));
check('Brain con un mensaje corto cubre su coste y no baja del catálogo', cubreCoste(bCorto, simulated) && bCorto.credits >= CREDIT_COSTS.ai_text, bCorto.credits + ' Credits por ' + bCorto.usd.toFixed(5));
const bHist = brainPrice(brainInput('sigue', hist(20)));
check('Brain con historial grande cuesta más que sin él y sigue cubierto', bHist.usd > bCorto.usd && cubreCoste(bHist, simulated));
const bFoto = brainPrice(brainInput('qué ves', [], { imageUrl: 'u' }));
check('Brain con una foto cuesta más que sin ella y sigue cubierto', bFoto.usd > bCorto.usd && cubreCoste(bFoto, simulated));
const bPdf = brainPrice(brainInput('resume', [], { documentUrl: 'u' }));
check('Brain con un documento cuesta más que con una foto y sigue cubierto', bPdf.usd > bFoto.usd && cubreCoste(bPdf, simulated));
const bAudio = brainPrice(brainInput('transcribe', [], { audioUrl: 'u' }));
check('Brain con audio cuesta más que sin él y sigue cubierto', bAudio.usd > bCorto.usd && cubreCoste(bAudio, simulated));
const bTope = brainPrice(brainInput('analiza', hist(20, 4000), { imageUrl: 'u', documentUrl: 'u', documentPages: 400, audioUrl: 'u', audioSeconds: 3000 }));
check('Brain cerca del tope de entrada sigue sin venderse por debajo del coste', cubreCoste(bTope, simulated), bTope.credits + ' Credits por ' + bTope.usd.toFixed(4));
check('Brain con búsqueda suma el coste oficial de la consulta y lo cubre', brainPrice(brainInput('el dólar hoy'), true).usd > bCorto.usd && cubreCoste(brainPrice(brainInput('el dólar hoy'), true), simulated));
check('el precio de Brain sube solo cuando el input crece: nunca es una tarifa plana', bTope.usd > bPdf.usd && bPdf.usd > bCorto.usd);
check('en modo real Brain también cubre su coste, con el margen configurado', cubreCoste(brainPrice(brainInput('analiza', hist(20)), false, real), real));
check('cambiar el input cambia el precio: la cotización previa y el cobro usan la misma función', brainPrice(brainInput('hola')).credits === brainPrice(brainInput('hola')).credits && brainPrice(brainInput('hola', hist(20))).usd !== brainPrice(brainInput('hola')).usd);

const avatarCost = getCreditCost('wee_avatar');
check('el precio del avatar lo da el Credit Engine y cubre sus dos llamadas al modelo de identidad', avatarCost === CREDIT_COSTS.wee_avatar && avatarCost >= Math.ceil(2 * 0.134 * 100), avatarCost + ' Credits');

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nCredit Engine: todo en orden');
process.exit(failures ? 1 : 0);
