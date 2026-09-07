import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/credits/' + p));

const { createCreditEngine } = lib('creditEngine.js');
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
const iCinco = priceImage({ capability: 'image.generate', count: 5, available: todos }, real);
check('una imagen sencilla cuesta el precio oficial del modelo económico (USD 0.015)', Math.abs(iSimple.usd - 0.015) < 1e-9 && iSimple.model === 'flux-2-klein-9b' && iSimple.service === 'ai_image_lite', String(iSimple.usd));
check('tres imágenes cuestan tres veces una, con un 5 % de descuento por volumen', Math.abs(iTres.usd - 3 * 0.015 * 0.95) < 1e-9 && iTres.detail.volumeDiscount === 5, String(iTres.usd));
check('cinco imágenes llevan un 10 % de descuento y nunca un precio fijo', Math.abs(iCinco.usd - 5 * 0.015 * 0.9) < 1e-9 && iCinco.usd > iTres.usd, String(iCinco.usd));
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
check('imagen: ninguna sección fija el precio; todos los servicios existen en el catálogo', ['ai_image', 'ai_image_enhance', 'ai_image_pro', 'ai_video_draft', 'ai_video', 'ai_video_hd', 'ai_video_advanced', 'ai_video_max'].every((s) => typeof CREDIT_COSTS[s] === 'number'));

console.log('\n── Suelo universal: ninguna operación se vende por debajo del coste ──');
const { estimateProviderUsd, priceOperation, estimateInputTokens, TEXT_RATES, TOKENS } = lib('aiPricing.js');

check('el coste de texto usa la tarifa oficial del modelo más caro del nivel', TEXT_RATES.standard.input === 0.1 && TEXT_RATES.high.input === 0.75 && TEXT_RATES.max.input === 2 && TEXT_RATES.max.output === 10);
check('los tokens de entrada cuentan el historial, no solo el mensaje', estimateInputTokens({ prompt: 'hola', history: Array.from({ length: 20 }, () => ({ text: 'x'.repeat(800) })) }) > estimateInputTokens({ prompt: 'hola' }) * 5);
check('los tokens de entrada cuentan las fotos, los documentos y el audio con las tarifas oficiales de Gemini', estimateInputTokens({ prompt: 'x', imageUrl: 'u' }) - estimateInputTokens({ prompt: 'x' }) === TOKENS.perImage && estimateInputTokens({ prompt: 'x', documentUrl: 'u', documentPages: 10 }) - estimateInputTokens({ prompt: 'x' }) === 10 * TOKENS.perDocumentPage && estimateInputTokens({ prompt: 'x', audioUrl: 'u', audioSeconds: 60 }) - estimateInputTokens({ prompt: 'x' }) === 60 * TOKENS.perAudioSecond);
check('la búsqueda suma el coste oficial de la consulta a Google', estimateProviderUsd('text.search', { prompt: 'x' }) - estimateProviderUsd('text.generate', { prompt: 'x' }) === 0.014);
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
