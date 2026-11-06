/**
 * Gran Motor S2 · A — el proveedor de compra «test» es FAIL-CLOSED (hallazgo F-05).
 *
 * Antes (8fcaccdc) `enabled()` se abría con solo CREDITS_TEST_PURCHASES=true —también
 * en `get-wee`—, en cualquier emulador sin variable y en CUALQUIER proyecto distinto de
 * `get-wee`. Esta suite fallaba entonces en los casos marcados [F-05] y pasa después.
 *
 * Consolidación W0 (2026-11-06, rama candidato/desplegable): desde la compra por IMPORTE
 * (decisión del dueño del 2026-11-04: no hay paquetes) el proveedor confirma una ORDEN que
 * el servidor ya creó y cotizó. La matriz de entornos es la misma, caso por caso; lo único
 * que cambia es la forma de la llamada (`verify({ order })` en lugar de `packageId`) y la
 * compra de punta a punta, que pasa por `createCompras` con una Firestore en memoria. La
 * guarda que manda la compra por importe para anunciar el proveedor (`testPurchasesEnabled`)
 * es la misma que la de `verify`, y también se prueba.
 *
 * Solo dobles y valores sintéticos: no hay red, ni Firestore real, ni Credits reales; el
 * abono (`grantCredits`) es un registrador en memoria.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaseEnMemoria } from './_firestore-en-memoria.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));

const { testProvider, testPurchasesEnabled, comprasDePruebaHabilitadas } = lib('payments/providers/test.js');
const pv = lib('payments/purchaseValidation.js');
const regla = lib('payments/compraPorImporte.js');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const CLAVES = ['CREDITS_TEST_PURCHASES', 'FUNCTIONS_EMULATOR', 'FIRESTORE_EMULATOR_HOST', 'GCLOUD_PROJECT', 'GCP_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'FIREBASE_CONFIG'];
const original = Object.fromEntries(CLAVES.map((k) => [k, process.env[k]]));
const conEntorno = async (env, fn) => {
  for (const k of CLAVES) delete process.env[k];
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  try {
    return await fn();
  } finally {
    for (const k of CLAVES) {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k];
    }
  }
};

/* Una orden sintética ya cotizada por el servidor (US$5 → 500 Credits), como la que recibe `verify`. */
const ORDEN = { id: 'po_sintetica0001', userId: 'usuario-sintetico-0001', requestId: 'req-sintetica-0001', provider: 'test', status: 'pending',
  snapshot: { market: 'US', amountUsd: 5, credits: 500, currency: 'USD', amountMinor: 500 } };

const abre = async (env) =>
  conEntorno(env, async () => {
    try {
      await testProvider.verify({ userId: 'usuario-sintetico-0001', order: ORDEN, payload: {} });
      return true;
    } catch (error) {
      if (error?.code !== 'PURCHASE_INVALID') throw error;
      return false;
    }
  });

const EMU = { FUNCTIONS_EMULATOR: 'true', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' };
const OK = { CREDITS_TEST_PURCHASES: 'true', ...EMU, GCLOUD_PROJECT: 'demo-wee-filmmaker' };

console.log('\n── Producción rechaza siempre ──');
check('[F-05] get-wee con CREDITS_TEST_PURCHASES=true (desplegado) → cerrado', !(await abre({ CREDITS_TEST_PURCHASES: 'true', GCLOUD_PROJECT: 'get-wee' })));
check('get-wee sin la variable → cerrado', !(await abre({ GCLOUD_PROJECT: 'get-wee' })));
check('[F-05] get-wee en el emulador con la variable → cerrado', !(await abre({ ...OK, GCLOUD_PROJECT: 'get-wee' })));
check('[F-05] get-wee por FIREBASE_CONFIG y demo por GCLOUD_PROJECT (ambiguo) → cerrado',
  !(await abre({ ...OK, FIREBASE_CONFIG: JSON.stringify({ projectId: 'get-wee' }) })));
check('get-wee solo por FIREBASE_CONFIG → cerrado', !(await abre({ CREDITS_TEST_PURCHASES: 'true', ...EMU, FIREBASE_CONFIG: JSON.stringify({ projectId: 'get-wee' }) })));

console.log('\n── Proyecto desconocido, ausente o ilegible ──');
check('[F-05] proyecto desconocido desplegado sin variable → cerrado', !(await abre({ GCLOUD_PROJECT: 'otro-proyecto-sintetico' })));
check('[F-05] proyecto desconocido desplegado con variable → cerrado', !(await abre({ CREDITS_TEST_PURCHASES: 'true', GCLOUD_PROJECT: 'otro-proyecto-sintetico' })));
check('[F-05] proyecto desconocido en emulador con variable → cerrado', !(await abre({ ...OK, GCLOUD_PROJECT: 'otro-proyecto-sintetico' })));
check('sin ningún proyecto, con variable y emulador → cerrado', !(await abre({ CREDITS_TEST_PURCHASES: 'true', ...EMU })));
check('FIREBASE_CONFIG ilegible → cerrado', !(await abre({ ...OK, FIREBASE_CONFIG: '{no-es-json' })));
check('[F-05] wee-dev-geovet DESPLEGADO (sin emulador) sin variable → cerrado', !(await abre({ GCLOUD_PROJECT: 'wee-dev-geovet' })));

console.log('\n── Configuración incompleta o ambigua ──');
check('[F-05] emulador demo SIN la variable → cerrado', !(await abre({ ...EMU, GCLOUD_PROJECT: 'demo-wee-filmmaker' })));
check('variable con mayúsculas («TRUE») → cerrado', !(await abre({ ...OK, CREDITS_TEST_PURCHASES: 'TRUE' })));
check('variable «1» → cerrado', !(await abre({ ...OK, CREDITS_TEST_PURCHASES: '1' })));
check('variable «false» → cerrado', !(await abre({ ...OK, CREDITS_TEST_PURCHASES: 'false' })));
check('[F-05] variable + proyecto demo pero SIN emulador de Functions → cerrado', !(await abre({ CREDITS_TEST_PURCHASES: 'true', GCLOUD_PROJECT: 'demo-wee-filmmaker' })));
check('[F-05] emulador de Functions sin emulador de Firestore (escribiría en una base real) → cerrado',
  !(await abre({ CREDITS_TEST_PURCHASES: 'true', FUNCTIONS_EMULATOR: 'true', GCLOUD_PROJECT: 'demo-wee-filmmaker' })));
check('FUNCTIONS_EMULATOR distinto de «true» → cerrado', !(await abre({ ...OK, FUNCTIONS_EMULATOR: '1' })));
check('dos fuentes de proyecto distintas (demo-a / demo-b) → cerrado', !(await abre({ ...OK, GCP_PROJECT: 'demo-otro' })));

console.log('\n── Emulador de prueba con la variable explícita → abierto ──');
check('demo-wee-filmmaker en emulador con variable → abierto', await abre(OK));
check('demo-* por FIREBASE_CONFIG coincidente → abierto', await abre({ ...OK, FIREBASE_CONFIG: JSON.stringify({ projectId: 'demo-wee-filmmaker' }) }));
check('wee-dev-geovet en emulador con variable → abierto', await abre({ ...OK, GCLOUD_PROJECT: 'wee-dev-geovet' }));
check('abierto, confirma EXACTAMENTE la moneda y el importe de la orden (el cliente no elige nada)', await conEntorno(OK, async () => {
  const pago = await testProvider.verify({ userId: 'usuario-sintetico-0001', order: ORDEN, payload: { amountMinor: 1, currency: 'EUR', credits: 999999 } });
  return pago.purchaseId === `test_${ORDEN.id}` && pago.currency === 'USD' && pago.amountMinor === 500;
}));

console.log('\n── La compra por importe anuncia el proveedor con la MISMA guarda ──');
const anuncia = async (env) => conEntorno(env, async () => testPurchasesEnabled() === comprasDePruebaHabilitadas() && testPurchasesEnabled());
check('[F-05] get-wee con la variable: no anuncia el proveedor de prueba', !(await anuncia({ CREDITS_TEST_PURCHASES: 'true', GCLOUD_PROJECT: 'get-wee' })));
check('[F-05] proyecto desconocido desplegado: no lo anuncia', !(await anuncia({ GCLOUD_PROJECT: 'otro-proyecto-sintetico' })));
check('emulador demo con la variable: lo anuncia', await anuncia(OK));

/* La compra de punta a punta con el proveedor «test» de verdad, una Firestore en memoria y un abono que se registra. */
const otorgados = [];
const libro = new Map();
const engine = {
  grantCredits: async (input) => {
    otorgados.push(input);
    if (libro.has(input.purchaseId)) return { ...libro.get(input.purchaseId), duplicate: true };
    const r = { transactionId: input.purchaseId, balance: 0, duplicate: false };
    libro.set(input.purchaseId, r);
    return r;
  },
};
let reloj = 0;
const nuevaCompra = () => {
  const base = new BaseEnMemoria();
  return pv.createCompras({ db: () => base, now: () => ++reloj, engine, mercado: async (id) => regla.mercadoDesdeDoc(id, null) });
};
const pedido = (requestId) => ({ requestId, amountUsd: 5, market: 'US', displayed: { currency: 'USD', amountMinor: 500 }, credits: 500 });

console.log('\n── La ruta de prueba no crea compras ni Credits cuando está cerrada ──');
otorgados.length = 0;
let i = 0;
for (const env of [{ CREDITS_TEST_PURCHASES: 'true', GCLOUD_PROJECT: 'get-wee' }, { GCLOUD_PROJECT: 'get-wee' }, { GCLOUD_PROJECT: 'otro-proyecto-sintetico' }]) {
  await conEntorno(env, async () => {
    try { await nuevaCompra().validatePurchase({ userId: 'usuario-sintetico-0001', provider: 'test', payload: pedido(`req-cerrada-${++i}`) }); } catch { /* esperado */ }
  });
}
check('[F-05] validatePurchase(test) cerrado no llama a grantCredits', otorgados.length === 0, `llamadas: ${otorgados.length}`);

console.log('\n── Abierta, otorga una vez por orden (idempotencia intacta) ──');
otorgados.length = 0;
const compras = nuevaCompra();
const r1 = await conEntorno(OK, () => compras.validatePurchase({ userId: 'usuario-sintetico-0001', provider: 'test', payload: pedido('req-abierta-1') }));
check('validatePurchase(test) abierto otorga lo que cotizó la orden, con priceUsd 0',
  otorgados.length === 1 && otorgados[0].amount === 500 && otorgados[0].priceUsd === 0 && otorgados[0].type === 'purchase' && r1.credits === 500 && r1.amountUsd === 5);
check('el abono se identifica con la orden (purchaseId = id de la orden)', otorgados[0].purchaseId === r1.orderId && /^po_/.test(r1.orderId), otorgados[0].purchaseId);
const r2 = await conEntorno(OK, () => compras.validatePurchase({ userId: 'usuario-sintetico-0001', provider: 'test', payload: pedido('req-abierta-1') }));
check('repetir la misma petición vuelve como duplicado, sin abonar dos veces', r2.duplicate === true && r2.orderId === r1.orderId);
check('un packageId se rechaza aun abierto (no hay paquetes)', await conEntorno(OK, async () => {
  try { await compras.validatePurchase({ userId: 'usuario-sintetico-0001', provider: 'test', packageId: 'basic', payload: pedido('req-paquete') }); return false; } catch (e) { return e?.code === 'PURCHASE_INVALID' && e?.details?.motivo === 'paquetes_retirados'; }
}));

console.log('\n── Las integraciones reales no cambian de comportamiento ──');
for (const provider of ['apple', 'google', 'stripe']) {
  const codigos = [];
  for (const env of [{}, OK, { CREDITS_TEST_PURCHASES: 'true', GCLOUD_PROJECT: 'get-wee' }]) {
    codigos.push(await conEntorno(env, async () => {
      try { await nuevaCompra().validatePurchase({ userId: 'usuario-sintetico-0001', provider, payload: pedido(`req-${provider}-${++i}`) }); return 'ok'; } catch (e) { return e?.code; }
    }));
  }
  check(`${provider}: mismo resultado con o sin las variables de prueba (${codigos[0]})`, codigos.every((c) => c === codigos[0]), codigos.join(','));
}
const desconocido = await nuevaCompra().validatePurchase({ userId: 'u', provider: 'paypal', payload: pedido('req-paypal') }).then(() => 'ok', (e) => e?.code);
check('proveedor desconocido sigue rechazado', desconocido === 'PURCHASE_INVALID');

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ pagos-proveedor-prueba: el proveedor «test» es fail-closed');
process.exit(failures ? 1 : 0);
