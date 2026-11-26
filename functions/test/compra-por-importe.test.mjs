/*
 * LA COMPRA DE CREDITS POR IMPORTE, DE PUNTA A PUNTA (decisión del dueño, 2026-11-04).
 *
 * La experiencia es la de la demo YC: la persona elige de US$5 a US$100, de 5 en 5, y recibe 100 Credits por dólar.
 * Sin paquetes, sin promociones, sin bono de bienvenida. Esta suite vigila que eso sea VERDAD en el servidor, no
 * solo en la pantalla:
 *
 *  A. La regla: importes válidos e inválidos, Credits = dólares × 100.
 *  B. Los mercados: el dólar siempre; Perú (PEN) solo con tipo de cambio aprobado en Firestore, nunca inventado;
 *     redondeo al sol entero (la tabla de docs/MATRIZ-PRECIOS-CREDITS.md §3, al tipo de su escenario).
 *  C. El servidor no se fía del cliente: Credits, moneda e importe mostrados distintos se rechazan, sin orden.
 *  D. La orden: pendiente → confirmada, snapshot inmutable, abono SOLO tras la confirmación del proveedor, una sola
 *     vez (reintento y repetición idempotentes), conflicto si se reutiliza el requestId para otra cosa.
 *  E. Fallos: proveedor que falla o no existe, pago que no coincide → la orden falla y el saldo no se mueve.
 *  F. No quedan paquetes: ni en el catálogo del servidor, ni en el cliente, ni comprables por packageId.
 *  G. Sin bono de bienvenida: una cuenta nueva empieza en 0.
 *  H. El cliente pinta con la misma regla que cobra el servidor.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const soloCodigo = (s) => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

const { createCreditEngine } = lib('credits/creditEngine.js');
const costes = lib('credits/creditCosts.js');
const regla = lib('payments/compraPorImporte.js');
const { createCompras, idDeOrden, PROVIDERS } = lib('payments/purchaseValidation.js');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const rechaza = async (name, fn, code, motivo) => {
  try {
    await fn();
    check(name, false, 'no lanzó error');
  } catch (error) {
    const ok = error?.code === code && (motivo === undefined || error?.details?.motivo === motivo);
    check(name, ok, `código ${error?.code} · motivo ${error?.details?.motivo} (esperado ${code}${motivo ? ' · ' + motivo : ''})`);
  }
};

// ─── Firestore en memoria (el mismo doble que credits.test.mjs) ───
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
  constructor() { this.docs = new Map(); this.queue = Promise.resolve(); this.autoId = 0; }
  collection(p) { return new Coll(this, p); }
  runTransaction(fn) {
    const run = async () => { const tx = new Tx(this); const r = await fn(tx); tx.commit(); return r; };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => {});
    return p;
  }
  read(p) { return this.docs.has(p) ? clone(this.docs.get(p)) : undefined; }
}
class Ref {
  constructor(db, p) { this.db = db; this.path = p; this.id = p.split('/').pop(); }
  async get() { const data = this.db.read(this.path); return { exists: data !== undefined, id: this.id, ref: this, data: () => data }; }
}
class Coll {
  constructor(db, p, filters = [], order = null, max = null) { Object.assign(this, { db, path: p, filters, order, max }); }
  doc(id) { return new Ref(this.db, `${this.path}/${id || 'auto_' + ++this.db.autoId}`); }
  where(f, _op, v) { return new Coll(this.db, this.path, [...this.filters, [f, v]], this.order, this.max); }
  orderBy(f, dir = 'asc') { return new Coll(this.db, this.path, this.filters, [f, dir], this.max); }
  limit(n) { return new Coll(this.db, this.path, this.filters, this.order, n); }
  async get() {
    let rows = [...this.db.docs.entries()].filter(([p]) => p.startsWith(this.path + '/') && !p.slice(this.path.length + 1).includes('/'));
    rows = rows.filter(([, d]) => this.filters.every(([f, v]) => d[f] === v));
    if (this.max) rows = rows.slice(0, this.max);
    const docs = rows.map(([p, d]) => ({ exists: true, id: p.split('/').pop(), ref: new Ref(this.db, p), data: () => clone(d) }));
    return { docs, empty: docs.length === 0 };
  }
}
class Tx {
  constructor(db) { this.db = db; this.writes = []; }
  get(t) { return t.get(); }
  set(ref, data, opts) { this.writes.push({ kind: 'set', ref, data, merge: !!(opts && opts.merge) }); }
  update(ref, data) { this.writes.push({ kind: 'update', ref, data }); }
  commit() {
    for (const w of this.writes) {
      const existing = this.db.docs.get(w.ref.path);
      if (w.kind === 'set') this.db.docs.set(w.ref.path, resolve(w.data, w.merge ? existing || {} : existing, true));
      else {
        if (!existing) throw new Error('update sobre documento inexistente: ' + w.ref.path);
        const out = { ...existing };
        for (const [k, v] of Object.entries(w.data)) out[k] = resolve(v, out[k], false);
        this.db.docs.set(w.ref.path, out);
      }
    }
  }
}

let reloj = 0;
const db = new FakeDb();
/* El motor de PRODUCCIÓN en cuanto a bienvenida: WELCOME_CREDITS tal como sale de creditCosts. */
const engine = createCreditEngine({ db: () => db, increment: (n) => ({ [INC]: n }), now: () => ++reloj, welcomeCredits: costes.WELCOME_CREDITS, loadCosts: async () => {} });

/* Un mercado de Perú de PRUEBA: el valor es el del escenario de la matriz (3.30), no un tipo de cambio real. */
const PE_DE_PRUEBA = { currency: 'PEN', status: 'active', fx: { source: 'SBS', base: 3.3, baseDate: '2026-11-03' } };
let docPE = null;
const mercado = async (id) => regla.mercadoDesdeDoc(id, id === 'PE' ? docPE : null);

/* Proveedores controlables: test confirma lo que dice la orden; los demás, lo que se les pida. */
let respuestaFalsa = null;
let llamadasAlProveedor = 0;
const providers = {
  ...PROVIDERS,
  test: { id: 'test', async verify({ order }) { llamadasAlProveedor++; return { purchaseId: `test_${order.id}`, currency: order.snapshot.currency, amountMinor: order.snapshot.amountMinor }; } },
  google: { id: 'google', async verify() { llamadasAlProveedor++; if (respuestaFalsa instanceof Error) throw respuestaFalsa; return respuestaFalsa; } },
};
const compras = createCompras({ db: () => db, now: () => ++reloj, engine, providers, mercado });

const perfil = (uid) => db.docs.set(`users/doc_${uid}`, { uid, displayName: uid });
const saldo = (uid) => db.read(`users/doc_${uid}`).creditsBalance;
const movimientos = (uid) => [...db.docs.entries()].filter(([p, d]) => p.startsWith('creditTransactions/') && d.userId === uid).map(([, d]) => d);
const orden = (uid, requestId) => db.read(`paymentOrders/${idDeOrden(uid, requestId)}`);
const pedido = (amountUsd, extra = {}) => ({
  requestId: extra.requestId || `req_${amountUsd}_${++reloj}`,
  amountUsd,
  market: extra.market || 'US',
  displayed: extra.displayed || { currency: 'USD', amountMinor: amountUsd * 100 },
  credits: extra.credits ?? amountUsd * 100,
});

console.log('\n── A. La regla de la demo ──');
check('A1) los números son los de la demo: 5…100 de 5 en 5, 100 Credits por dólar',
  JSON.stringify(regla.COMPRA) === JSON.stringify({ minUsd: 5, maxUsd: 100, stepUsd: 5, creditsPerUsd: 100 }));
const validos = Array.from({ length: 20 }, (_, i) => 5 + i * 5);
check('A2) los 20 importes válidos pasan y dan dólares × 100', validos.every((u) => regla.validarImporteUsd(u) === u && regla.creditsDeImporte(u) === u * 100));
const invalidos = [0, 4, 6, 7.5, 5.5, 99, 101, 105, -5, '10', null, undefined, NaN, Infinity, 1e9];
const noPasan = invalidos.filter((v) => { try { regla.validarImporteUsd(v); return true; } catch (e) { return !(e.code === 'PURCHASE_INVALID' && e.details.motivo === 'importe_invalido'); } });
check('A3) fuera de rango, no múltiplo de 5, decimales y no-números se rechazan (importe_invalido)', noPasan.length === 0, JSON.stringify(noPasan));

console.log('\n── B. Mercados: el dólar siempre; PEN solo con tipo de cambio aprobado ──');
check('B1) US: dólares, sin conversión, en centavos', regla.importeEnMoneda(35, regla.mercadoDesdeDoc('US')) === 3500);
const peMal = [null, {}, { ...PE_DE_PRUEBA, status: 'scenario' }, { ...PE_DE_PRUEBA, fx: { ...PE_DE_PRUEBA.fx, base: 0 } },
  { ...PE_DE_PRUEBA, fx: { ...PE_DE_PRUEBA.fx, source: '' } }, { ...PE_DE_PRUEBA, fx: { ...PE_DE_PRUEBA.fx, baseDate: 'ayer' } }, { ...PE_DE_PRUEBA, currency: 'USD' }];
check('B2) Perú sin tipo de cambio aprobado (falta, escenario, 0, sin fuente, sin fecha, otra moneda) se cierra: mercado_no_disponible',
  peMal.every((d) => { try { regla.mercadoDesdeDoc('PE', d); return false; } catch (e) { return e.details.motivo === 'mercado_no_disponible'; } }));
check('B3) un mercado que no existe se rechaza (mercado_desconocido)', (() => { try { regla.mercadoDesdeDoc('BR', {}); return false; } catch (e) { return e.details.motivo === 'mercado_desconocido'; } })());
const pe = regla.mercadoDesdeDoc('PE', PE_DE_PRUEBA);
const TABLA_MATRIZ = { 5: 1700, 10: 3300, 15: 5000, 20: 6600, 25: 8300, 50: 16500, 100: 33000 };
check('B4) PEN = sol entero de (USD × tipo de cambio): reproduce la tabla de la matriz §3 al 3,30 del escenario',
  Object.entries(TABLA_MATRIZ).every(([u, s]) => regla.importeEnMoneda(Number(u), pe) === s), JSON.stringify(Object.keys(TABLA_MATRIZ).map((u) => regla.importeEnMoneda(Number(u), pe))));
check('B5) los Credits no dependen del tipo de cambio: US$15 son 1.500 en cualquier moneda', regla.cotizar(15, pe).credits === 1500 && regla.cotizar(15, regla.mercadoDesdeDoc('US')).credits === 1500);
check('B6) la cotización guarda la fuente, el valor y la fecha del tipo de cambio', JSON.stringify(regla.cotizar(5, pe).fxReference) === JSON.stringify({ source: 'SBS', value: 3.3, date: '2026-11-03' }));
check('B7) ningún tipo de cambio escrito en el código del servidor', !/\b3[.,][0-9]{1,2}\b/.test(soloCodigo(leer('functions/src/payments/compraPorImporte.ts'))));

console.log('\n── C. El servidor no se fía del cliente ──');
perfil('ana');
await compras.validatePurchase({ userId: 'ana', provider: 'test', payload: pedido(5) }).catch(() => {});
const ordenesAntes = [...db.docs.keys()].filter((k) => k.startsWith('paymentOrders/')).length;
await rechaza('C1) Credits inflados (US$5 → 50.000) se rechazan', () => compras.validatePurchase({ userId: 'ana', provider: 'test', payload: pedido(5, { credits: 50000 }) }), 'PURCHASE_INVALID', 'credits_no_coinciden');
await rechaza('C2) importe mostrado rebajado (US$100 por 1 céntimo) se rechaza', () => compras.validatePurchase({ userId: 'ana', provider: 'test', payload: pedido(100, { displayed: { currency: 'USD', amountMinor: 1 } }) }), 'PURCHASE_INVALID', 'importe_mostrado_no_coincide');
await rechaza('C3) otra moneda que la del mercado se rechaza', () => compras.validatePurchase({ userId: 'ana', provider: 'test', payload: pedido(5, { displayed: { currency: 'PEN', amountMinor: 500 } }) }), 'PURCHASE_INVALID', 'moneda_no_coincide');
await rechaza('C4) un importe fuera de la regla (US$7) se rechaza', () => compras.validatePurchase({ userId: 'ana', provider: 'test', payload: pedido(7) }), 'PURCHASE_INVALID', 'importe_invalido');
await rechaza('C5) US$105 se rechaza', () => compras.validatePurchase({ userId: 'ana', provider: 'test', payload: pedido(105) }), 'PURCHASE_INVALID', 'importe_invalido');
await rechaza('C6) un pedido sin lo que se mostró se rechaza', () => compras.validatePurchase({ userId: 'ana', provider: 'test', payload: { requestId: 'req_x1', amountUsd: 5 } }), 'PURCHASE_INVALID', 'pedido_incompleto');
await rechaza('C7) PEN sin tipo de cambio configurado falla cerrado', () => compras.validatePurchase({ userId: 'ana', provider: 'test', payload: pedido(5, { market: 'PE', displayed: { currency: 'PEN', amountMinor: 1700 } }) }), 'PURCHASE_INVALID', 'mercado_no_disponible');
check('C8) ningún rechazo creó una orden', [...db.docs.keys()].filter((k) => k.startsWith('paymentOrders/')).length === ordenesAntes);

console.log('\n── D. Orden, confirmación e idempotencia ──');
perfil('bea');
check('D0) la cuenta empieza en 0 (sin bono de bienvenida)', (await engine.ensureAccount('bea')).balance === 0 && saldo('bea') === 0 && movimientos('bea').length === 0);
llamadasAlProveedor = 0;
const p35 = pedido(35, { requestId: 'req_bea_35' });
const r1 = await compras.validatePurchase({ userId: 'bea', provider: 'test', payload: p35 });
const o1 = orden('bea', 'req_bea_35');
check('D1) US$35 → 3.500 Credits, ni uno más', r1.credits === 3500 && r1.amount === 3500 && saldo('bea') === 3500 && !r1.duplicate);
check('D2) la orden queda confirmada, con su snapshot y el bloque verified del proveedor',
  o1.status === 'confirmed' && o1.snapshot.amountUsd === 35 && o1.snapshot.credits === 3500 && o1.snapshot.currency === 'USD' && o1.snapshot.amountMinor === 3500
  && o1.snapshot.fxReference === null && o1.verified.purchaseId === `test_${o1.id}` && o1.transactionId === r1.transactionId
  && o1.statusHistory.map((s) => s.status).join('>') === 'pending>confirmed');
const mov = movimientos('bea');
check('D3) el historial tiene la compra (purchase, +3.500, con la orden y el importe)', mov.length === 1 && mov[0].type === 'purchase' && mov[0].amount === 3500 && mov[0].meta.orderId === o1.id && mov[0].meta.amountUsd === 35 && mov[0].meta.currency === 'USD');
const r2 = await compras.validatePurchase({ userId: 'bea', provider: 'test', payload: p35 });
check('D4) repetir la misma compra (mismo requestId) NO vuelve a acreditar: duplicado, mismo movimiento, sin volver al proveedor',
  r2.duplicate && r2.transactionId === r1.transactionId && saldo('bea') === 3500 && movimientos('bea').length === 1 && llamadasAlProveedor === 1);
await rechaza('D5) reutilizar el requestId para OTRO importe es conflicto', () => compras.validatePurchase({ userId: 'bea', provider: 'test', payload: pedido(40, { requestId: 'req_bea_35' }) }), 'INVALID_REQUEST', 'idempotency_conflict');
/* Un proceso que muere entre el abono y el cierre: la orden sigue pendiente con el abono hecho. Repetir lo termina. */
const pRot = pedido(10, { requestId: 'req_bea_corte' });
const ordenRota = await compras.abrirOrden('bea', 'test', 'req_bea_corte', regla.cotizar(10, regla.mercadoDesdeDoc('US')));
await engine.grantCredits({ userId: 'bea', amount: 1000, type: 'purchase', purchaseId: ordenRota.id, reason: 'Recarga de prueba', source: 'store:test' });
const r3 = await compras.validatePurchase({ userId: 'bea', provider: 'test', payload: pRot });
check('D6) corte entre abono y cierre: el reintento cierra la orden sin acreditar dos veces', r3.duplicate && saldo('bea') === 4500 && orden('bea', 'req_bea_corte').status === 'confirmed' && movimientos('bea').length === 2);
await compras.validatePurchase({ userId: 'bea', provider: 'test', payload: pedido(5, { requestId: 'req_bea_5a' }) });
await compras.validatePurchase({ userId: 'bea', provider: 'test', payload: pedido(5, { requestId: 'req_bea_5b' }) });
check('D7) dos compras distintas del mismo importe son dos compras', saldo('bea') === 5500 && movimientos('bea').length === 4);
perfil('caro');
await rechaza('D8) la orden de otra cuenta no se puede reutilizar', async () => {
  const id = idDeOrden('caro', 'req_compartido');
  db.docs.set(`paymentOrders/${id}`, { ...db.read(`paymentOrders/${o1.id}`), id, userId: 'bea' });
  await compras.validatePurchase({ userId: 'caro', provider: 'test', payload: pedido(35, { requestId: 'req_compartido' }) });
}, 'FORBIDDEN');
check('D9) idDeOrden: determinista por cuenta y requestId, distinto entre cuentas', idDeOrden('a', 'r1') === idDeOrden('a', 'r1') && idDeOrden('a', 'r1') !== idDeOrden('b', 'r1') && /^po_[0-9a-f]{40}$/.test(idDeOrden('a', 'r1')));

console.log('\n── PEN con tipo de cambio aprobado ──');
docPE = PE_DE_PRUEBA;
perfil('dani');
const rPen = await compras.validatePurchase({ userId: 'dani', provider: 'test', payload: pedido(25, { market: 'PE', displayed: { currency: 'PEN', amountMinor: 8300 } }) });
const oPen = db.read(`paymentOrders/${rPen.orderId}`);
check('D10) PEN: US$25 → S/ 83 (al 3,30 de prueba) y 2.500 Credits; el snapshot guarda moneda, importe y tipo de cambio',
  rPen.credits === 2500 && saldo('dani') === 2500 && oPen.snapshot.currency === 'PEN' && oPen.snapshot.amountMinor === 8300 && oPen.snapshot.fxReference.source === 'SBS' && oPen.snapshot.fxReference.value === 3.3);
await rechaza('D11) en PEN, enseñar los soles mal redondeados (S/ 82,50) se rechaza', () => compras.validatePurchase({ userId: 'dani', provider: 'test', payload: pedido(25, { market: 'PE', displayed: { currency: 'PEN', amountMinor: 8250 } }) }), 'PURCHASE_INVALID', 'importe_mostrado_no_coincide');
await rechaza('D12) en PEN, pedir en dólares se rechaza: nunca se cobra en una moneda que no se vio', () => compras.validatePurchase({ userId: 'dani', provider: 'test', payload: pedido(25, { market: 'PE' }) }), 'PURCHASE_INVALID', 'moneda_no_coincide');
docPE = null;

console.log('\n── E. Fallos: la orden falla y el saldo no se mueve ──');
perfil('eli');
await engine.ensureAccount('eli');
respuestaFalsa = Object.assign(new Error('caído'), { code: 'NOT_IMPLEMENTED' });
await rechaza('E1) si el proveedor falla, la compra falla', () => compras.validatePurchase({ userId: 'eli', provider: 'google', payload: pedido(20, { requestId: 'req_eli_g' }) }), 'NOT_IMPLEMENTED');
check('E2) …la orden queda failed con su motivo y el saldo sigue en 0', orden('eli', 'req_eli_g').status === 'failed' && orden('eli', 'req_eli_g').failure.motivo === 'NOT_IMPLEMENTED' && saldo('eli') === 0 && movimientos('eli').length === 0);
await rechaza('E3) repetir una orden fallida no la resucita: hay que empezar otra', () => compras.validatePurchase({ userId: 'eli', provider: 'google', payload: pedido(20, { requestId: 'req_eli_g' }) }), 'PURCHASE_INVALID', 'orden_fallida');
respuestaFalsa = { purchaseId: 'g_1', currency: 'USD', amountMinor: 100 };
await rechaza('E4) un pago confirmado por OTRO importe no acredita nada', () => compras.validatePurchase({ userId: 'eli', provider: 'google', payload: pedido(20, { requestId: 'req_eli_g2' }) }), 'PURCHASE_INVALID', 'pago_no_coincide');
respuestaFalsa = { purchaseId: 'g_2', currency: 'PEN', amountMinor: 2000 };
await rechaza('E5) un pago confirmado en OTRA moneda no acredita nada', () => compras.validatePurchase({ userId: 'eli', provider: 'google', payload: pedido(20, { requestId: 'req_eli_g3' }) }), 'PURCHASE_INVALID', 'pago_no_coincide');
check('E6) …y esas órdenes quedan failed, sin un Credit', orden('eli', 'req_eli_g2').status === 'failed' && orden('eli', 'req_eli_g3').status === 'failed' && saldo('eli') === 0);
await rechaza('E7) un proveedor desconocido se rechaza antes de crear nada', () => compras.validatePurchase({ userId: 'eli', provider: 'paypal', payload: pedido(20) }), 'PURCHASE_INVALID');
const stripeReal = createCompras({ db: () => db, now: () => ++reloj, engine, mercado });
await rechaza('E8) Stripe sigue sin conectar (NOT_IMPLEMENTED) y no acredita', () => stripeReal.validatePurchase({ userId: 'eli', provider: 'stripe', payload: pedido(10, { requestId: 'req_eli_s' }) }), 'NOT_IMPLEMENTED');
check('E9) …saldo intacto', saldo('eli') === 0);

console.log('\n── F. No quedan paquetes ──');
for (const id of ['basic', 'plus', 'blackpro', 'zone.wee.credits.basic']) {
  await rechaza(`F1) comprar el paquete «${id}» ya no existe`, () => compras.validatePurchase({ userId: 'eli', provider: 'test', packageId: id, payload: pedido(5) }), 'PURCHASE_INVALID', 'paquetes_retirados');
}
check('F2) el catálogo del servidor ya no tiene paquetes', costes.CREDIT_PACKAGES === undefined && costes.getPackage === undefined
  && !/CREDIT_PACKAGES|getPackage|4\.99|9\.99|19\.9\b/.test(soloCodigo(leer('functions/src/credits/creditCosts.ts'))));
check('F3) ni el cliente: sin copia de paquetes en creditsService, ni en la tienda',
  !/CREDIT_PACKAGES|CreditPackage|4\.99|9\.99|19\.9\b|blackpro|'basic'/.test(soloCodigo(leer('services/creditsService.ts')) + soloCodigo(leer('screens/CreditStoreScreen.tsx')) + soloCodigo(leer('components/tienda/CompraPorImporte.tsx'))));
check('F4) ni en los proveedores ni en la validación', !/getPackage|CREDIT_PACKAGES/.test(['purchaseValidation.ts', 'providers/test.ts', 'providers/stripe.ts', 'providers/apple.ts', 'providers/google.ts'].map((f) => soloCodigo(leer('functions/src/payments/' + f))).join('\n')));
check('F5) los productos nativos de paquete no se reconocen; los de importe sí (zone.wee.credits.usd{N})',
  (() => { try { regla.importeDeProductoNativo('zone.wee.credits.basic'); return false; } catch (e) { return e.details.motivo === 'paquetes_retirados'; } })()
  && regla.importeDeProductoNativo('zone.wee.credits.usd35') === 35
  && (() => { try { regla.importeDeProductoNativo('zone.wee.credits.usd7'); return false; } catch (e) { return e.details.motivo === 'importe_invalido'; } })());
const i18n = fs.readdirSync(path.resolve(RAIZ, 'i18n/textos')).filter((l) => /^\s*(pkgBasic|badgePopular|badgeBestValue):/m.test(leer(`i18n/textos/${l}/credits.ts`)));
check('F6) los nombres y etiquetas de paquete salieron de los diccionarios', i18n.length === 0, i18n.join(' '));

console.log('\n── G. Sin bono de bienvenida ──');
check('G1) WELCOME_CREDITS es 0 en producción y no se reenciende por entorno', costes.WELCOME_CREDITS === 0 && !/CREDITS_WELCOME/.test(soloCodigo(leer('functions/src/credits/creditCosts.ts'))));
check('G2) la instancia de producción del motor recibe ese 0', /welcomeCredits: WELCOME_CREDITS,/.test(leer('functions/src/credits/creditEngine.ts')));

console.log('\n── H. El cliente pinta con la regla del servidor ──');
{
  const { createRequire: cr } = await import('node:module');
  const ts = cr(path.resolve(RAIZ, 'package.json'))('typescript');
  const js = ts.transpileModule(leer('utils/compraPorImporte.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const cliente = await import('data:text/javascript;base64,' + Buffer.from(js, 'utf8').toString('base64'));
  check('H1) los números del primer pintado son los del servidor', JSON.stringify(cliente.COMPRA_INICIAL) === JSON.stringify(regla.COMPRA));
  check('H2) − y + no salen de los límites ni del paso', cliente.moverImporte(5, -1) === 5 && cliente.moverImporte(100, 1) === 100 && cliente.moverImporte(5, 1) === 10 && cliente.moverImporte(100, -1) === 95);
  check('H3) las 20 marcas de la regla', JSON.stringify(cliente.importesDe(cliente.COMPRA_INICIAL)) === JSON.stringify(validos));
  const pePintar = { id: 'PE', currency: 'PEN', fx: { source: 'SBS', value: 3.3, date: '2026-11-03' } };
  check('H4) lo que el cliente enseña es lo que el servidor cobra, en USD y en PEN, en los 20 importes',
    validos.every((u) => cliente.importeMostrado(u, cliente.MERCADO_DOLAR).amountMinor === regla.importeEnMoneda(u, regla.mercadoDesdeDoc('US'))
      && cliente.importeMostrado(u, pePintar).amountMinor === regla.importeEnMoneda(u, pe) && cliente.creditsDe(u) === regla.creditsDeImporte(u)));
  check('H5) sin tipo de cambio, el cliente no enseña soles', cliente.importeMostrado(5, { id: 'PE', currency: 'PEN', fx: null }) === null);
  const tienda = soloCodigo(leer('screens/CreditStoreScreen.tsx'));
  check('H6) la tienda compra por el servidor, con el mismo requestId mientras no haya respuesta definitiva',
    /creditsService\.comprarImporte\(/.test(tienda) && /pendiente\.current = \{ clave, requestId: newRequestId\('compra'\) \}/.test(tienda)
    && /if \(DEFINITIVAS\.some\(\(c\) => code\.includes\(c\)\)\) pendiente\.current = null;/.test(tienda));
  const cartera = soloCodigo(leer('screens/WalletScreen.tsx'));
  const enTodos = fs.readdirSync(path.resolve(RAIZ, 'i18n/textos')).filter((l) => !['historyLoading', 'historyError', 'historyRetry'].every((k) => new RegExp(`\\n  ${k}: '`).test(leer(`i18n/textos/${l}/credits.ts`))));
  check('H8) Mi billetera no dice «Sin movimientos» antes de que conteste EL SERVIDOR (una lista vacía de la caché no cuenta): cargando → listo | error (con plazo y reintento), en todos los diccionarios',
    /useState<'cargando' \| 'listo' \| 'error'>\('cargando'\)/.test(cartera) && /historial === 'cargando' \?/.test(cartera) && /historial === 'error' \?/.test(cartera)
    && /\(\) => setHistorial\('error'\)/.test(cartera) && /setHistorial\('listo'\)/.test(cartera)
    && /setTimeout\(\(\) => setHistorial\(\(h\) => \(h === 'cargando' \? 'error' : h\)\), PLAZO_DEL_HISTORIAL_MS\)/.test(cartera)
    && /if \(onError && snap\.empty && snap\.metadata\.fromCache\) return;/.test(soloCodigo(leer('services/creditsService.ts')))
    && /\{ includeMetadataChanges: !!onError \}/.test(soloCodigo(leer('services/creditsService.ts'))) && enTodos.length === 0, enTodos.join(' '));
  check('H7) el mercado no sale del idioma ni de la ubicación', !/idioma|locale|language|ubicaci|geoloc/i.test(tienda.replace(/useIdioma|IdiomaContext/g, '')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
