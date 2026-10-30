/**
 * SIN PAQUETES NI PLANES DE CREDITS, Y LAS RECARGAS CERRADAS (decisión de producto, 2026-10-29).
 *
 *   node test/sin-paquetes.test.mjs        (después de `npm run build`: usa lib/)
 *
 * Weë no tiene planes Básico, Plus ni Black Pro, ni paquetes de Credits: los Credits son la unidad de consumo, cada
 * servicio cuesta los Credits de su catálogo y la referencia es US$ 1 = 100 Credits. Hasta que exista el sistema de
 * pagos definitivo, comprar está cerrado. Esta suite vigila:
 *
 *   A · el catálogo comercial no existe en el código activo (motor, app, consola, textos);
 *   B · ni el motor ni la consola exponen paquetes (`getCreditCost`, `creditsAdmin.costs`);
 *   C · la conversión de referencia es 100 Credits por dólar, y es la misma en el servidor, el motor, la app y la consola;
 *   D · una compra no validada no acredita: `validatePurchase` y `restorePurchase` rechazan TODO —con cualquier
 *       proveedor, también el de prueba, y con los identificadores de los paquetes antiguos— sin inicializar la cuenta
 *       ni llamar a `grantCredits`;
 *   E · el historial se conserva: una compra antigua (con su `meta.packageId`) se sigue pintando por su tipo, y los
 *       conceptos que guardó el servidor se siguen reconociendo en los 16 idiomas;
 *   F · la pantalla de Credits informa y no vende: saldo, conversión, aviso, últimos movimientos; la ruta y los
 *       enlaces se conservan.
 *
 * El saldo, la concesión, el consumo y el reembolso los vigilan `credits.test.mjs`, `core-financial.test.mjs` e
 * `idempotencia-de-cobro.test.mjs`, que no cambian.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(here, '../lib', p));
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const andar = (dir, filtro) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []).flatMap((e) => {
  if (['node_modules', 'lib', 'dist', '.expo', 'android', 'ios'].includes(e.name)) return [];
  const p = path.join(dir, e.name);
  return e.isDirectory() ? andar(p, filtro) : filtro(p) ? [p] : [];
});
const rel = (p) => path.relative(RAIZ, p).split(path.sep).join('/');

/* ── A · el catálogo comercial no existe en el código activo ─────────────── */
console.log('\n── A · Sin catálogo comercial ──');
const COMERCIAL = /CREDIT_PACKAGES|CreditPackage|getPackage\(|black\s*pro|blackpro|zone\.wee\.credits|pkgBasic|badgePopular|badgeBestValue|priceLabel|\bpackageFor\b/i;
const buscar = (texto) => COMERCIAL.test(sinComentarios(texto));
{
  const CARPETAS = ['functions/src', 'services', 'screens', 'components', 'hooks', 'contexts', 'constants', 'navigation', 'utils', 'admin-console/src'];
  const codigo = CARPETAS.flatMap((c) => andar(path.join(RAIZ, c), (p) => /\.(ts|tsx|js|mjs)$/.test(p) && !/\.test\.(ts|tsx)$/.test(p)));
  codigo.push(path.join(RAIZ, 'App.tsx'));
  const malos = codigo.filter((p) => buscar(fs.readFileSync(p, 'utf8'))).map(rel);
  check(`A1) ${codigo.length} archivos de código activo sin paquetes, planes ni precios de tienda`, malos.length === 0, malos.join(' · '));
  check('A1) SABOTAJE: el detector ve el catálogo si vuelve', buscar("export const CREDIT_PACKAGES = [{ id: 'blackpro' }];") && buscar("t('credits.pkgBasic')"));
  check('A1) CONTROL: un comentario que lo cuenta no cuenta', !buscar('/* el catálogo CREDIT_PACKAGES se retiró */ const x = 1;'));

  const textos = fs.readdirSync(path.join(RAIZ, 'i18n/textos')).filter((l) => fs.existsSync(path.join(RAIZ, 'i18n/textos', l, 'credits.ts')));
  const conClaves = textos.filter((l) => /^\s*(pkg\w*|badge\w*|free|testTopUp\w*|testPrices|topUpButton|terms|topUpFailed\w*)\s*:/m.test(leer(`i18n/textos/${l}/credits.ts`)));
  check(`A2) los ${textos.length} diccionarios de credits sin las claves de la tienda de paquetes`, textos.length === 16 && conClaves.length === 0, conClaves.join(' '));
  const conNombres = textos.filter((l) => /black\s*pro/i.test(leer(`i18n/textos/${l}/credits.ts`)));
  check('A2) ni un «Black Pro» en los diccionarios (tampoco en sus comentarios)', conNombres.length === 0, conNombres.join(' '));

  const creditCosts = sinComentarios(leer('functions/src/credits/creditCosts.ts'));
  check('A3) el motor ya no exporta CreditPackage, CREDIT_PACKAGES ni getPackage', !/export (interface CreditPackage|const CREDIT_PACKAGES|const getPackage)/.test(creditCosts));
  const costs = lib('credits/creditCosts.js');
  check('A3) y el módulo compilado tampoco', !('CREDIT_PACKAGES' in costs) && !('getPackage' in costs));
}

/* ── C · la conversión de referencia ─────────────────────────────────────── */
console.log('\n── C · US$ 1 = 100 Credits ──');
{
  const costs = lib('credits/creditCosts.js');
  const registry = lib('engine/registry.js');
  const app = Number((leer('constants/credits.ts').match(/export const CREDITS_POR_USD = (\d+);/) || [])[1]);
  const consola = Number((leer('admin-console/src/api/modelos.ts').match(/export const CREDITS_POR_USD_DE_REFERENCIA = (\d+);/) || [])[1]);
  check('C1) el servidor declara 100 Credits por dólar', costs.CREDITS_POR_USD_DE_REFERENCIA === 100, String(costs.CREDITS_POR_USD_DE_REFERENCIA));
  check('C2) es el creditsPerUsd por defecto del WEË AI ENGINE', registry.DEFAULT_SETTINGS.creditsPerUsd === costs.CREDITS_POR_USD_DE_REFERENCIA, String(registry.DEFAULT_SETTINGS.creditsPerUsd));
  check('C3) la app y la consola dicen lo mismo', app === 100 && consola === 100, `app ${app} · consola ${consola}`);
}

/* ── B y D · lo que responden las callables, con el Credit Engine espiado ─── */
/* `creditsAdmin` pide `getFirestore()` al entrar: una app de un proyecto demo-, sin conexión (nada llega a leer). */
require(path.resolve(here, '../node_modules/firebase-admin/lib/app/index.js')).initializeApp({ projectId: 'demo-sin-paquetes' });
const motor = lib('credits/creditEngine.js').creditEngine;
const costsMod = lib('credits/creditCosts.js');
const cuenta = { ensureAccount: 0, grantCredits: 0, spendCredits: 0, refundCredits: 0, completeCredits: 0 };
for (const k of Object.keys(cuenta)) motor[k] = async () => { cuenta[k]++; throw new Error(`no debería llamarse ${k}`); };
costsMod.loadCostOverrides = async () => undefined;
const credits = lib('credits/index.js');
const pagos = lib('payments/purchaseValidation.js');
const prueba = lib('payments/providers/test.js');
const intentar = (fn) => fn().then((v) => ({ ok: true, v }), (e) => ({ ok: false, code: e?.code, details: e?.details }));
const nadaMovido = () => Object.values(cuenta).every((n) => n === 0);

console.log('\n── B · Ni el motor ni la consola exponen paquetes ──');
{
  const todos = await intentar(() => credits.getCreditCost.run({ auth: { uid: 'u1' }, data: {} }));
  check('B1) getCreditCost devuelve los costes en Credits y nada más', todos.ok && Object.keys(todos.v).join() === 'costs'
    && Object.values(todos.v.costs).every((n) => Number.isInteger(n) && n >= 0), todos.ok ? Object.keys(todos.v).join() : todos.code);
  const uno = await intentar(() => credits.getCreditCost.run({ auth: { uid: 'u1' }, data: { service: 'ai_image' } }));
  check('B1) el coste de un servicio no cambia de forma', uno.ok && uno.v.service === 'ai_image' && typeof uno.v.credits === 'number');
  const admin = await intentar(() => credits.creditsAdmin.run({ auth: { uid: 'a1', token: { admin: true } }, data: { action: 'costs' } }));
  check('B2) creditsAdmin.costs tampoco', admin.ok && Object.keys(admin.v).join() === 'costs', admin.ok ? Object.keys(admin.v).join() : admin.code);
  const noAdmin = await intentar(() => credits.creditsAdmin.run({ auth: { uid: 'u1', token: {} }, data: { action: 'costs' } }));
  check('B3) CONTROL: creditsAdmin sigue siendo solo de administración', !noAdmin.ok && noAdmin.code === 'permission-denied', noAdmin.code);
  const consola = sinComentarios(leer('admin-console/src/api/modelos.ts'));
  check('B4) la consola no lee `packages`', !/\.packages\b|raiz\.packages/.test(consola));
  check('B5) ni el servicio de la app', !/packages/.test(sinComentarios(leer('services/creditsService.ts'))));
}

console.log('\n── D · Una compra no validada no acredita nada ──');
{
  const PROVEEDORES = ['test', 'apple', 'google', 'stripe'];
  const VIEJOS = [undefined, 'basic', 'plus', 'blackpro', 'zone.wee.credits.blackpro'];
  const respuestas = [];
  for (const provider of PROVEEDORES) {
    for (const packageId of VIEJOS) {
      respuestas.push(await intentar(() => credits.validatePurchaseCallable.run({ auth: { uid: 'u1' }, data: { provider, packageId, payload: { receipt: 'x' } } })));
    }
  }
  check(`D1) validatePurchase rechaza las ${respuestas.length} combinaciones de proveedor y paquete antiguo con «unimplemented»`,
    respuestas.every((r) => !r.ok && r.code === 'unimplemented'), [...new Set(respuestas.map((r) => r.ok ? 'OK!' : r.code))].join(','));
  const sinProveedor = await intentar(() => credits.validatePurchaseCallable.run({ auth: { uid: 'u1' }, data: { packageId: 'blackpro' } }));
  check('D1) también sin decir proveedor (antes caía en el de prueba)', !sinProveedor.ok && sinProveedor.code === 'unimplemented', sinProveedor.code);
  const raro = await intentar(() => credits.validatePurchaseCallable.run({ auth: { uid: 'u1' }, data: { provider: 'paypal', packageId: 'plus' } }));
  check('D1) un proveedor desconocido sigue siendo inválido', !raro.ok && raro.code === 'failed-precondition', raro.code);
  const anonimo = await intentar(() => credits.validatePurchaseCallable.run({ data: { provider: 'test', packageId: 'plus' } }));
  check('D1) y sin sesión, «unauthenticated» como siempre', !anonimo.ok && anonimo.code === 'unauthenticated', anonimo.code);

  const restaurar = [];
  for (const provider of [...PROVEEDORES, undefined]) restaurar.push(await intentar(() => credits.restorePurchaseCallable.run({ auth: { uid: 'u1' }, data: { provider, payload: {} } })));
  check('D2) restorePurchase rechaza con cualquier proveedor', restaurar.every((r) => !r.ok && r.code === 'unimplemented'), restaurar.map((r) => r.code).join(','));

  check('D3) y en ninguno de esos intentos se tocó la cuenta: ni ensureAccount, ni grantCredits, ni nada', nadaMovido(), JSON.stringify(cuenta));

  const directo = await intentar(() => pagos.validatePurchase({ userId: 'u1', provider: 'test', packageId: 'blackpro' }));
  check('D4) la función de validación, llamada directamente, tampoco acredita', !directo.ok && directo.code === 'NOT_IMPLEMENTED' && nadaMovido(), directo.code);
  check('D4) las recargas están declaradas cerradas', pagos.RECARGAS_ABIERTAS === false);

  /* El proveedor de prueba ya no regala Credits, aunque el entorno diga que es dev o el emulador. */
  const antes = { a: process.env.CREDITS_TEST_PURCHASES, b: process.env.FUNCTIONS_EMULATOR };
  process.env.CREDITS_TEST_PURCHASES = 'true';
  process.env.FUNCTIONS_EMULATOR = 'true';
  const verificado = await intentar(() => prueba.testProvider.verify({ userId: 'u1', packageId: 'plus', payload: {} }));
  process.env.CREDITS_TEST_PURCHASES = antes.a; process.env.FUNCTIONS_EMULATOR = antes.b;
  if (antes.a === undefined) delete process.env.CREDITS_TEST_PURCHASES;
  if (antes.b === undefined) delete process.env.FUNCTIONS_EMULATOR;
  check('D5) el proveedor de prueba no verifica ninguna compra, ni en el emulador', !verificado.ok && verificado.code === 'NOT_IMPLEMENTED', verificado.code);
  check('D6) el código ya no lee CREDITS_TEST_PURCHASES', !/CREDITS_TEST_PURCHASES/.test(sinComentarios(leer('functions/src/payments/providers/test.ts'))));
}

/* ── E · el historial se conserva ────────────────────────────────────────── */
console.log('\n── E · El historial se conserva ──');
{
  const servicio = sinComentarios(leer('services/creditsService.ts'));
  const describe = servicio.slice(servicio.indexOf('export const describeTransaction'), servicio.indexOf('export const newRequestId'));
  check('E1) un movimiento se describe por su tipo y su concepto, sin catálogo', /tx\.type === 'purchase' \? 'credits\.txPurchase'/.test(describe) && !/meta|package|productId/.test(describe));
  const fila = sinComentarios(leer('components/billetera/FilaDeMovimiento.tsx'));
  check('E2) la fila del historial tampoco mira el paquete', /describeTransaction\(item\)/.test(fila) && !/meta|package|productId/.test(fila));
  /*
   * Los conceptos que el servidor guardó en las compras antiguas («Compra de Credits», «Recarga de prueba», «Compra
   * restaurada») se siguen reconociendo donde hay catálogo del servidor (es, en, da); en los demás idiomas una compra
   * se dice por su tipo, `credits.txPurchase`, que tiene que seguir en los 16.
   */
  const conCatalogo = fs.readdirSync(path.join(RAIZ, 'i18n/textos')).filter((l) => fs.existsSync(path.join(RAIZ, 'i18n/textos', l, 'servidor/movimientos.ts')));
  const sinConcepto = conCatalogo.filter((l) => !['compra', 'recargaPrueba', 'compraRestaurada'].every((k) => new RegExp(`^\\s*${k}\\s*:`, 'm').test(leer(`i18n/textos/${l}/servidor/movimientos.ts`))));
  check(`E3) los conceptos de las compras antiguas se siguen reconociendo (${conCatalogo.join(', ')})`, conCatalogo.includes('es') && sinConcepto.length === 0, sinConcepto.join(' '));
  const todos = fs.readdirSync(path.join(RAIZ, 'i18n/textos')).filter((l) => fs.existsSync(path.join(RAIZ, 'i18n/textos', l, 'credits.ts')));
  const sinTipo = todos.filter((l) => !/^\s*txPurchase\s*:/m.test(leer(`i18n/textos/${l}/credits.ts`)));
  check(`E3) y en los ${todos.length} idiomas una compra se sigue diciendo por su tipo`, todos.length === 16 && sinTipo.length === 0, sinTipo.join(' '));
  check('E4) ninguna escritura de Credits ni de movimientos se añadió en la app', !/\b(setDoc|updateDoc|addDoc|deleteDoc|writeBatch|runTransaction)\b/.test(servicio));
}

/* ── F · la pantalla de Credits informa y no vende ───────────────────────── */
console.log('\n── F · La pantalla de Credits ──');
{
  const pantalla = sinComentarios(leer('screens/CreditStoreScreen.tsx'));
  check('F1) enseña el saldo, la conversión, el aviso y los últimos movimientos',
    /subscribeToBalance\(/.test(pantalla) && /CREDITS_POR_USD/.test(pantalla) && /t\('credits\.referenceRateValue'/.test(pantalla)
    && /t\('credits\.purchasesComingSoon'\)/.test(pantalla) && /subscribeToTransactions\(/.test(pantalla) && /<FilaDeMovimiento /.test(pantalla));
  check('F2) y no compra ni ofrece nada', !/purchase\(|validatePurchase|getCosts\(|packages|selectedPkg|buyBtn/.test(pantalla));
  const nav = leer('navigation/MainStackNavigator.tsx');
  check('F3) la ruta CreditStore sigue registrada', /CreditStore: undefined;/.test(nav) && /<Stack\.Screen name="CreditStore" component=\{CreditStoreScreen\} \/>/.test(nav));
  const enlaces = ['screens', 'components', 'navigation'].flatMap((c) => andar(path.join(RAIZ, c), (p) => /\.tsx$/.test(p)))
    .filter((p) => /'CreditStore'/.test(fs.readFileSync(p, 'utf8'))).map(rel);
  /* Eran 11 archivos antes de retirar la tienda (comprobado contra el commit 528dbd9) y siguen siendo los mismos. */
  check('F4) los enlaces a la pantalla siguen ahí', enlaces.length >= 11, `${enlaces.length} archivos`);
}

/* ── G · el bloque autorizado de la retirada es exacto (las guardas de gobernanza no se aflojaron) ── */
console.log('\n── G · El bloque autorizado de la retirada ──');
{
  const R = await import('./_retirada-de-paquetes.mjs');
  const base = ['ai_world: 39,', ...R.CREDIT_COSTS.quitadas];
  const limpio = R.restarBloque(base, R.CREDIT_COSTS.quitadas);
  check('G1) restado el bloque, queda exactamente lo de antes', JSON.stringify(limpio.resto) === JSON.stringify(['ai_world: 39,']) && limpio.faltan.length === 0);
  const conExtra = R.restarBloque([...base, "{ id: 'premium', credits: 500 },"], R.CREDIT_COSTS.quitadas);
  check('G2) SABOTAJE: una línea de más NO se esconde en el bloque (queda en el resto y la guarda cae)', conExtra.resto.includes("{ id: 'premium', credits: 500 },"));
  const incompleto = R.restarBloque(base.slice(0, -1), R.CREDIT_COSTS.quitadas);
  check('G3) SABOTAJE: si falta una línea del bloque, se nota (faltan)', incompleto.faltan.length === 1);
  check('G4) el tamaño exacto se suma solo a los dos archivos congelados', R.sumarRetirada('8\t0\tfunctions/src/credits/creditCosts.ts\n19\t3\tfunctions/src/credits/index.ts\n57\t9\tfunctions/src/credits/creditEngine.ts')
    === '16\t18\tfunctions/src/credits/creditCosts.ts\n29\t10\tfunctions/src/credits/index.ts\n57\t9\tfunctions/src/credits/creditEngine.ts');
  check('G5) el bloque no nombra el motor, el gasto, la concesión ni el reembolso',
    ![...R.CREDIT_COSTS.quitadas, ...R.CREDIT_COSTS.nuevas, ...R.CALLABLES.quitadas, ...R.CALLABLES.nuevas].some((l) => /grantCredits|spendCredits|refundCredits|completeCredits|assertAdmin|creditEngine\.(?!ensureAccount)/.test(l))
    && !R.ARCHIVOS_DE_LA_RETIRADA.some((f) => /creditEngine|creditValidation|creditTransactions|core\//.test(f)));
}

console.log(failures ? `\n${failures} comprobación(es) fallida(s).` : '\nSin paquetes, recargas cerradas y el historial intacto.');
process.exit(failures ? 1 : 0);
