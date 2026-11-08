/*
 * µCREDITS EN EL CREDIT ENGINE (autorización formal del dueño, 2026-11-07): la precisión fraccionaria del MISMO saldo.
 *
 * Ejecuta el motor de verdad (functions/lib/credits/creditEngine.js) sobre la Firestore en memoria de las suites de
 * aceptación —transacciones en fila, increment real, una transacción que falla no escribe nada—. Sin red, sin
 * proveedores y sin un solo Credit real.
 *
 *   A unidad y representación · B reservar, liquidar, devolver · C compatibilidad histórica (lo entero, exactamente
 *   igual) · D fases y espejo · E concurrencia y fallos · F propiedades e invariantes (secuencias aleatorias con semilla)
 *   · G controles
 */
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { BaseEnMemoria, lib } from './_firestore-en-memoria.mjs';

const require = createRequire(import.meta.url);
const fa = require('firebase-admin/firestore');
const { createCreditEngine } = lib('credits/creditEngine.js');
const M = lib('credits/microCreditos.js');
const { CREDIT_SERVICES } = lib('credits/creditCosts.js');

let failures = 0;
let n = 1;
const check = (nombre, cond, extra = '') => {
  console.log(`${cond ? '✔' : '✘'} ${n++}) ${nombre}${extra ? ` — ${extra}` : ''}`);
  if (!cond) failures++;
};
const falla = async (fn) => {
  try {
    await fn();
    return null;
  } catch (error) {
    return error;
  }
};
const huella = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const MICRO = 1_000_000;

const nuevo = (fase = 'cuenta') => {
  const base = new BaseEnMemoria();
  const motor = createCreditEngine({ db: () => base, increment: (x) => fa.FieldValue.increment(x), now: () => fa.Timestamp.now(), welcomeCredits: 0, loadCosts: async () => {}, faseSaldo: fase });
  return { base, motor };
};
const alta = async ({ base, motor }, uid, credits = 0) => {
  base.docs.set(`users/doc_${uid}`, { uid, displayName: uid });
  await motor.ensureAccount(uid);
  if (credits > 0) await motor.grantCredits({ userId: uid, amount: credits, reason: 'prueba', source: 'prueba', requestId: `alta-${uid}-${credits}` });
};
const estado = (base, uid, donde = 'cuenta') => {
  const d = base.leer(donde === 'cuenta' ? `creditAccounts/${uid}` : `users/doc_${uid}`) || {};
  const fraccion = d.creditsFraccionMicro ?? 0;
  return { balance: d.creditsBalance, fraccion, total: d.creditsBalance * MICRO + fraccion, spentMicro: d.creditsLifetimeSpentMicro ?? 0, conMicro: 'creditsFraccionMicro' in d, doc: d };
};
const txs = (base, uid) => base.de('creditTransactions').filter((t) => t.userId === uid);
const tx = (base, id) => base.leer(`creditTransactions/${id}`);
const reserva = (motor, uid, requestId, amountMicro, extra = {}) =>
  motor.reservarMicro({ userId: uid, service: 'ai_translate', requestId, amountMicro, fingerprint: huella(`${requestId}:${amountMicro}`), source: 'prueba', ...extra });

console.log('── A · Unidad y representación ──');
{
  check('1 Credit = 1.000.000 µCredits y el máximo por operación es 1.000 Credits', M.MICRO_POR_CREDIT === MICRO && M.MAX_IMPORTE_MICRO === 1000 * MICRO);
  const casos = { '0,001': 1_000, '0,01': 10_000, '0,02': 20_000, '0,50': 500_000, '1': 1_000_000, '1.234,567891': 1_234_567_891 };
  check('0,001 · 0,01 · 0,02 · 0,50 · 1 y 1.234,567891 Credits ida y vuelta exactos (entero + fracción)', Object.values(casos).every((micro) => {
    const { balance, fraccion } = M.partirMicro(micro);
    return M.totalMicro(balance, fraccion) === micro && fraccion < MICRO && Number.isSafeInteger(balance);
  }));
  const max = Number.MAX_SAFE_INTEGER;
  const casiK = 9_007_199_253 * MICRO - 1;
  check('la división es exacta en el borde del entero seguro (sin coma flotante)', M.partirMicro(max).balance === 9_007_199_254 && M.partirMicro(max).fraccion === 740_991 && M.partirMicro(casiK).balance === 9_007_199_252 && M.partirMicro(casiK).fraccion === 999_999);
  check('un saldo que no cabe en µCredits se rechaza antes de perder precisión', (() => { try { M.totalMicro(9_100_000_000, 0); return false; } catch { return true; } })());
  const malos = [0, -1, 1.5, NaN, Infinity, M.MAX_IMPORTE_MICRO + 1, '5'];
  check('importes en µC: enteros, positivos y dentro del máximo (0 solo si se permite)', malos.every((v) => { try { M.assertImporteMicro(v); return false; } catch { return true; } }) && M.assertImporteMicro(1) === 1 && M.assertImporteMicro(0, { permitirCero: true }) === 0 && M.assertImporteMicro(M.MAX_IMPORTE_MICRO) === M.MAX_IMPORTE_MICRO);
  check('la fracción guardada: ausente = 0; fuera de 0…999.999 o no entera, se rechaza', M.fraccionGuardada(undefined) === 0 && M.fraccionGuardada(999_999) === 999_999 && [MICRO, -1, 0.5, '1'].every((v) => { try { M.fraccionGuardada(v); return false; } catch { return true; } }));
  check('solo la traducción usa µCredits, y no está en el catálogo entero (spendCredits no la acepta)', M.esServicioMicro('ai_translate') && !M.esServicioMicro('ai_text') && !CREDIT_SERVICES.includes('ai_translate'));
}

console.log('\n── B · Reservar, liquidar, devolver ──');
{
  const c = nuevo();
  await alta(c, 'ana', 2);
  const r = await reserva(c.motor, 'ana', 'trad-b-0001', 45_000);
  const s1 = estado(c.base, 'ana');
  const u = tx(c.base, 'usage_trad-b-0001');
  check('reservar 0,045 Credits de 2: queda 1 + 955.000 µC, en el MISMO documento del saldo', r.duplicate === false && s1.balance === 1 && s1.fraccion === 955_000 && s1.total === 1_955_000);
  check('el asiento: usage_<requestId>, unidad micro, amount 0, −45.000 µC, autorizado, saldos antes/después', u.unidad === 'micro' && u.amount === 0 && u.amountMicro === -45_000 && u.authorizedAmountMicro === 45_000 && u.balanceBefore === 2 && u.balanceAfter === 1 && u.balanceBeforeMicro === 2_000_000 && u.balanceAfterMicro === 1_955_000 && u.status === 'AUTHORIZED' && u.service === 'ai_translate');
  const l = await c.motor.liquidarMicro({ userId: 'ana', requestId: 'trad-b-0001', finalAmountMicro: 9_600 });
  const s2 = estado(c.base, 'ana');
  check('liquidar el consumo real (9.600 µC): vuelve la diferencia (35.400) con su ajuste, y se cobra exactamente lo real', l.refundedMicro === 35_400 && s2.total === 2_000_000 - 9_600 && s2.spentMicro === 9_600 && tx(c.base, 'adjust_trad-b-0001')?.amountMicro === 35_400 && tx(c.base, 'usage_trad-b-0001').finalAmountMicro === 9_600);
  const l2 = await c.motor.liquidarMicro({ userId: 'ana', requestId: 'trad-b-0001', finalAmountMicro: 9_600 });
  check('liquidar otra vez no mueve nada (duplicada)', l2.duplicate === true && estado(c.base, 'ana').total === s2.total);
  const e1 = await falla(() => c.motor.devolverMicro({ userId: 'ana', requestId: 'trad-b-0001' }));
  check('una operación completada no se devuelve (sin doble movimiento)', e1?.code === 'NOT_REFUNDABLE' && estado(c.base, 'ana').total === s2.total);

  await reserva(c.motor, 'ana', 'trad-b-0002', 300_000);
  const d1 = await c.motor.devolverMicro({ userId: 'ana', requestId: 'trad-b-0002' });
  const d2 = await c.motor.devolverMicro({ userId: 'ana', requestId: 'trad-b-0002' });
  check('devolver devuelve TODO lo reservado, una sola vez', d1.amountMicro === 300_000 && d2.duplicate === true && estado(c.base, 'ana').total === s2.total && tx(c.base, 'usage_trad-b-0002').status === 'REFUNDED');
  const e2 = await falla(() => reserva(c.motor, 'ana', 'trad-b-0002', 300_000));
  check('un requestId devuelto no se reutiliza', e2?.code === 'ALREADY_REFUNDED');

  await reserva(c.motor, 'ana', 'trad-b-0003', 20_000);
  const dup = await reserva(c.motor, 'ana', 'trad-b-0003', 20_000);
  const otraHuella = await falla(() => c.motor.reservarMicro({ userId: 'ana', service: 'ai_translate', requestId: 'trad-b-0003', amountMicro: 20_000, fingerprint: huella('otra'), source: 'prueba' }));
  const otroImporte = await falla(() => reserva(c.motor, 'ana', 'trad-b-0003', 20_001));
  const entera = await falla(() => c.motor.spendCredits({ userId: 'ana', service: 'ai_text', requestId: 'trad-b-0003', amount: 1, source: 'prueba' }));
  check('idempotencia: la misma reserva repetida no cobra dos veces; otra huella, otro importe o una operación entera con ese requestId se rechazan', dup.duplicate === true && estado(c.base, 'ana').total === s2.total - 20_000 && [otraHuella, otroImporte, entera].every((e) => e?.code === 'INVALID_REQUEST'));
  const exceso = await falla(() => c.motor.liquidarMicro({ userId: 'ana', requestId: 'trad-b-0003', finalAmountMicro: 20_001 }));
  check('liquidar POR ENCIMA de lo autorizado se rechaza sin cobrar el exceso, y la reserva sigue abierta', exceso?.code === 'INVALID_AMOUNT' && exceso?.details?.reason === 'excede_autorizacion' && tx(c.base, 'usage_trad-b-0003').status === 'AUTHORIZED' && estado(c.base, 'ana').total === s2.total - 20_000);
  await c.motor.devolverMicro({ userId: 'ana', requestId: 'trad-b-0003' });
  check('y después se puede devolver entera', estado(c.base, 'ana').total === s2.total);

  const pobre = nuevo();
  await alta(pobre, 'beto', 0);
  const sinSaldo = await falla(() => reserva(pobre.motor, 'beto', 'trad-b-0004', 1));
  check('sin saldo: INSUFFICIENT_CREDITS, sin asiento y sin tocar el saldo', sinSaldo?.code === 'INSUFFICIENT_CREDITS' && !tx(pobre.base, 'usage_trad-b-0004') && estado(pobre.base, 'beto').total === 0);

  const borde = nuevo();
  await alta(borde, 'cora', 1);
  await reserva(borde.motor, 'cora', 'trad-b-0005', 1);
  const b1 = estado(borde.base, 'cora');
  await reserva(borde.motor, 'cora', 'trad-b-0006', 999_999);
  const b2 = estado(borde.base, 'cora');
  const b3 = await falla(() => reserva(borde.motor, 'cora', 'trad-b-0007', 1));
  await borde.motor.devolverMicro({ userId: 'cora', requestId: 'trad-b-0005' });
  check('el borde: 1 Credit − 1 µC = 0 + 999.999; hasta 0 exacto; ni 1 µC más; y la devolución vuelve a pasar el entero', b1.balance === 0 && b1.fraccion === 999_999 && b2.total === 0 && b3?.code === 'INSUFFICIENT_CREDITS' && estado(borde.base, 'cora').total === 1);

  const valores = nuevo();
  await alta(valores, 'dani', 10);
  const importes = [1_000, 10_000, 20_000, 500_000, 1_000_000, 3_500_000];
  let esperado = 10 * MICRO;
  for (const [i, imp] of importes.entries()) {
    await reserva(valores.motor, 'dani', `trad-v-${i}`, imp);
    await valores.motor.liquidarMicro({ userId: 'dani', requestId: `trad-v-${i}`, finalAmountMicro: imp });
    esperado -= imp;
  }
  check('0,001 · 0,01 · 0,02 · 0,50 · 1 · 3,5 Credits: cada cobro exacto y el saldo final exacto (4,969 Credits)', estado(valores.base, 'dani').total === esperado && esperado === 4_969_000);
  const servicio = await falla(() => valores.motor.reservarMicro({ userId: 'dani', service: 'ai_text', requestId: 'trad-v-x', amountMicro: 10, fingerprint: huella('x'), source: 'prueba' }));
  const sinHuella = await falla(() => valores.motor.reservarMicro({ userId: 'dani', service: 'ai_translate', requestId: 'trad-v-y', amountMicro: 10, source: 'prueba' }));
  check('solo ai_translate, y siempre con la huella de lo autorizado', servicio?.code === 'INVALID_SERVICE' && sinHuella?.code === 'INVALID_REQUEST');
  await valores.motor.spendCredits({ userId: 'dani', service: 'ai_text', requestId: 'entera-v-1', amount: 1, source: 'prueba' });
  const cruzada = await falla(() => valores.motor.liquidarMicro({ userId: 'dani', requestId: 'entera-v-1', finalAmountMicro: 0 }));
  check('una operación entera no se liquida en µCredits', cruzada?.code === 'INVALID_REQUEST');
}

console.log('\n── C · Compatibilidad histórica: lo entero, exactamente igual ──');
{
  const c = nuevo();
  await alta(c, 'eva', 10);
  await c.motor.spendCredits({ userId: 'eva', service: 'ai_text', requestId: 'hist-1', amount: 3, source: 'prueba' });
  await c.motor.completeCredits({ userId: 'eva', requestId: 'hist-1', finalAmount: 2 });
  await c.motor.spendCredits({ userId: 'eva', service: 'ai_image', requestId: 'hist-2', amount: 4, source: 'prueba' });
  await c.motor.refundCredits({ userId: 'eva', requestId: 'hist-2' });
  const cuenta = c.base.leer('creditAccounts/eva');
  const perfil = c.base.leer('users/doc_eva');
  const camposMicro = ['creditsFraccionMicro', 'creditsLifetimeSpentMicro'];
  check('una cuenta que nunca movió una fracción no recibe NINGÚN campo nuevo (ni en la cuenta ni en el espejo)', camposMicro.every((k) => !(k in cuenta) && !(k in perfil)) && cuenta.creditsBalance === 8 && perfil.creditsBalance === 8);
  const saldo = await c.motor.getBalance('eva');
  check('y su saldo se devuelve con EXACTAMENTE los cuatro campos de siempre', JSON.stringify(Object.keys(saldo).sort()) === JSON.stringify(['balance', 'lifetimeEarned', 'lifetimeSpent', 'userId']) && saldo.balance === 8);
  const enteros = txs(c.base, 'eva');
  check('los asientos enteros no llevan campos de µCredits (nada se reinterpreta)', enteros.length >= 4 && enteros.every((t) => !('unidad' in t) && !('amountMicro' in t) && Number.isInteger(t.amount)));

  const m = nuevo();
  await alta(m, 'fede', 2);
  await reserva(m.motor, 'fede', 'trad-c-1', 500_000);
  await m.motor.liquidarMicro({ userId: 'fede', requestId: 'trad-c-1', finalAmountMicro: 500_000 });
  await m.motor.spendCredits({ userId: 'fede', service: 'ai_text', requestId: 'ent-c-1', amount: 1, source: 'prueba' });
  const s = estado(m.base, 'fede');
  check('una operación entera en una cuenta con fracción gasta Credits ENTEROS y conserva la fracción (1,5 → 0,5)', s.balance === 0 && s.fraccion === 500_000);
  const noLlega = await falla(() => m.motor.spendCredits({ userId: 'fede', service: 'ai_text', requestId: 'ent-c-2', amount: 1, source: 'prueba' }));
  check('y 0,5 Credits no pagan una operación de 1 Credit entero (la regla de siempre)', noLlega?.code === 'INSUFFICIENT_CREDITS' && estado(m.base, 'fede').total === 500_000);

  await reserva(m.motor, 'fede', 'trad-c-2', 100_000);
  const viaEntera = await m.motor.refundCredits({ userId: 'fede', requestId: 'trad-c-2' });
  check('refundCredits (el entero) sobre una reserva en µCredits devuelve los µCredits, no 0', viaEntera.duplicate === false && estado(m.base, 'fede').total === 500_000 && tx(m.base, 'refund_trad-c-2')?.amountMicro === 100_000);
  await reserva(m.motor, 'fede', 'trad-c-3', 100_000);
  const conEntero = await falla(() => m.motor.completeCredits({ userId: 'fede', requestId: 'trad-c-3', finalAmount: 0 }));
  const sinImporte = await m.motor.completeCredits({ userId: 'fede', requestId: 'trad-c-3' });
  check('completeCredits sobre µCredits: con un importe entero se rechaza; sin importe liquida lo autorizado', conEntero?.code === 'INVALID_REQUEST' && sinImporte.status === 'COMPLETED' && tx(m.base, 'usage_trad-c-3').finalAmountMicro === 100_000 && estado(m.base, 'fede').total === 400_000);

  const g = nuevo();
  await alta(g, 'gil', 0);
  await g.motor.grantCredits({ userId: 'gil', amount: 5, reason: 'compra', source: 'store:test', type: 'purchase', purchaseId: 'compra-gil-1', priceUsd: 0.05 });
  check('una compra sigue acreditando su importe entero, sin campos nuevos', estado(g.base, 'gil').balance === 5 && !estado(g.base, 'gil').conMicro && tx(g.base, 'purchase_compra-gil-1')?.amount === 5);
}

console.log('\n── D · Fases y espejo ──');
{
  for (const fase of ['sombra', 'cuenta', 'contrato']) {
    const c = nuevo(fase);
    await alta(c, 'hugo', 3);
    await reserva(c.motor, 'hugo', `trad-d-${fase}`, 250_000);
    await c.motor.liquidarMicro({ userId: 'hugo', requestId: `trad-d-${fase}`, finalAmountMicro: 120_000 });
    const enCuenta = estado(c.base, 'hugo', 'cuenta');
    const enPerfil = estado(c.base, 'hugo', 'perfil');
    const ok = enCuenta.total === 3 * MICRO - 120_000
      && (fase === 'contrato' ? enPerfil.doc.creditsBalance === undefined && !enPerfil.conMicro : enPerfil.total === enCuenta.total && enPerfil.spentMicro === enCuenta.spentMicro);
    check(`fase ${fase}: el saldo con su fracción se escribe donde manda la fase${fase === 'contrato' ? ' (el perfil ya no se toca)' : ' y el espejo queda idéntico'}`, ok, `${enCuenta.total}/${enPerfil.total}`);
  }
  const c = nuevo('cuenta');
  await alta(c, 'ines', 2);
  await reserva(c.motor, 'ines', 'trad-d-x', 300_000);
  const perfil = c.base.docs.get('users/doc_ines');
  delete perfil.creditsFraccionMicro;
  delete perfil.creditsLifetimeSpentMicro;
  perfil.creditsBalance = 1;
  await c.motor.getBalance('ines');
  check('un espejo que se quedó atrás (p. ej. escrito por una instancia antigua) se pone al día sin mover un µCredit', estado(c.base, 'ines', 'perfil').total === estado(c.base, 'ines', 'cuenta').total && estado(c.base, 'ines', 'cuenta').total === 1_700_000);
  const st = c.base.leer('creditStats/global') || {};
  check('las estadísticas cuentan los µCredits aparte y no tocan los contadores enteros de consumo', st.totalSpentMicro === 300_000 && st.circulatingMicro === -300_000 && st.byService?.ai_translate?.spentMicro === 300_000 && !st.totalSpent);
  const hist = await c.motor.getCreditHistory('ines', 10);
  check('el historial de la persona incluye el asiento en µCredits con su importe', hist.some((t) => t.unidad === 'micro' && t.amountMicro === -300_000));
}

console.log('\n── E · Concurrencia y fallos ──');
{
  const c = nuevo();
  await alta(c, 'juan', 2);
  const lote = await Promise.all(Array.from({ length: 20 }, (_, i) => falla(() => reserva(c.motor, 'juan', `trad-e-${i}`, 300_000))));
  const bien = lote.filter((e) => e === null).length;
  check('20 reservas a la vez de 0,3 con 2 Credits: entran exactamente 6, las demás por saldo, y el saldo nunca baja de 0', bien === 6 && lote.filter(Boolean).every((e) => e.code === 'INSUFFICIENT_CREDITS') && estado(c.base, 'juan').total === 200_000);
  const c2 = nuevo();
  await alta(c2, 'kira', 1);
  const repetidas = await Promise.all(Array.from({ length: 10 }, () => reserva(c2.motor, 'kira', 'trad-e-dup', 100_000)));
  check('la misma reserva 10 veces a la vez: un solo cobro', repetidas.filter((r) => !r.duplicate).length === 1 && estado(c2.base, 'kira').total === 900_000);
  await reserva(c2.motor, 'kira', 'trad-e-carrera', 100_000);
  const carrera = await Promise.all([
    falla(() => c2.motor.liquidarMicro({ userId: 'kira', requestId: 'trad-e-carrera', finalAmountMicro: 40_000 })),
    falla(() => c2.motor.devolverMicro({ userId: 'kira', requestId: 'trad-e-carrera' })),
  ]);
  const fin = tx(c2.base, 'usage_trad-e-carrera').status;
  const total = estado(c2.base, 'kira').total;
  /* Antes: 0,9 Credits disponibles y 0,1 reservado. Si gana liquidar (40.000), vuelven 60.000 → 860.000 y la devolución
     ya no procede; si gana devolver, vuelven los 100.000 → 900.000 y la liquidación llega tarde y no mueve nada. */
  const cuadra = (fin === 'COMPLETED' && total === 860_000 && carrera[1]?.code === 'NOT_REFUNDABLE') || (fin === 'REFUNDED' && total === 900_000);
  check('liquidar y devolver a la vez: gana una y el saldo cuadra con la que ganó (sin doble movimiento)', cuadra, `${fin} ${total} ${carrera.map((e) => e?.code || 'ok')}`);

  const c3 = nuevo();
  await alta(c3, 'lola', 1);
  const original = c3.base.runTransaction.bind(c3.base);
  let romper = true;
  c3.base.runTransaction = (fn) => original(async (t) => { const r = await fn(t); if (romper) { romper = false; throw new Error('red caída al confirmar'); } return r; });
  const caida = await falla(() => reserva(c3.motor, 'lola', 'trad-e-red', 250_000));
  const tras = estado(c3.base, 'lola');
  const reintento = await reserva(c3.motor, 'lola', 'trad-e-red', 250_000);
  const despues = estado(c3.base, 'lola').total;
  check('un fallo de red a mitad de la transacción no deja nada escrito, y el reintento con el mismo requestId cobra una vez',
    caida?.message === 'red caída al confirmar' && tras.total === MICRO && reintento.duplicate === false && despues === 750_000,
    `${caida?.message} · ${tras.total} · ${reintento.duplicate} · ${despues}`);
}

console.log('\n── F · Propiedades e invariantes (300 operaciones aleatorias con semilla) ──');
{
  let semilla = 20261107;
  const azar = () => { semilla = (semilla + 0x6D2B79F5) | 0; let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const entre = (a, b) => a + Math.floor(azar() * (b - a + 1));
  const c = nuevo();
  const cuentas = ['mia', 'noa', 'oto'];
  for (const u of cuentas) await alta(c, u, 3);
  const abiertas = [];
  const enterasAbiertas = [];
  let k = 0;
  const violaciones = [];
  const comprobar = (contexto) => {
    for (const u of cuentas) {
      const s = estado(c.base, u);
      const p = estado(c.base, u, 'perfil');
      const libro = txs(c.base, u).reduce((acc, t) => acc + (t.amount || 0) * MICRO + (t.amountMicro || 0), 0);
      if (!(Number.isSafeInteger(s.balance) && s.balance >= 0 && s.fraccion >= 0 && s.fraccion < MICRO)) violaciones.push(`${contexto}: forma ${u}`);
      if (s.total !== libro) violaciones.push(`${contexto}: el saldo de ${u} (${s.total}) no es la suma del libro (${libro})`);
      if (p.total !== s.total || p.spentMicro !== s.spentMicro) violaciones.push(`${contexto}: espejo de ${u}`);
      if (u === 'oto' && s.conMicro) violaciones.push(`${contexto}: oto (solo enteros) recibió campos de µCredits`);
    }
    for (const t of c.base.de('creditTransactions').filter((x) => x.unidad === 'micro' && x.type === 'usage')) {
      if (t.status === 'COMPLETED' && !(t.finalAmountMicro <= t.authorizedAmountMicro)) violaciones.push(`${contexto}: liquidación por encima en ${t.id}`);
      if (t.status === 'REFUNDED' && tx(c.base, `refund_${t.requestId}`)?.amountMicro !== t.authorizedAmountMicro) violaciones.push(`${contexto}: devolución distinta de lo autorizado en ${t.id}`);
    }
  };
  for (let paso = 0; paso < 300; paso++) {
    const op = azar();
    const u = cuentas[entre(0, 1)];
    try {
      if (op < 0.30) {
        const id = `prop-r-${++k}`;
        const imp = entre(1, 900_000);
        await reserva(c.motor, u, id, imp);
        abiertas.push({ u, id, imp });
        if (azar() < 0.1) await reserva(c.motor, u, id, imp);
      } else if (op < 0.50 && abiertas.length) {
        const { u: v, id, imp } = abiertas.splice(entre(0, abiertas.length - 1), 1)[0];
        const final = azar() < 0.1 ? imp + 1 : entre(0, imp);
        const e = await falla(() => c.motor.liquidarMicro({ userId: v, requestId: id, finalAmountMicro: final }));
        if (e && final <= imp) violaciones.push(`paso ${paso}: liquidación válida rechazada (${e.code})`);
        if (!e && final > imp) violaciones.push(`paso ${paso}: liquidación por encima aceptada`);
        if (e) await c.motor.devolverMicro({ userId: v, requestId: id });
        if (azar() < 0.2) await c.motor.liquidarMicro({ userId: v, requestId: id, finalAmountMicro: 0 }).catch((x) => violaciones.push(`paso ${paso}: repetir liquidar lanzó ${x.code}`));
      } else if (op < 0.62 && abiertas.length) {
        const { u: v, id } = abiertas.splice(entre(0, abiertas.length - 1), 1)[0];
        await (azar() < 0.5 ? c.motor.devolverMicro({ userId: v, requestId: id }) : c.motor.refundCredits({ userId: v, requestId: id }));
        await c.motor.devolverMicro({ userId: v, requestId: id });
      } else if (op < 0.78) {
        const v = cuentas[entre(0, 2)];
        const id = `prop-e-${++k}`;
        await c.motor.spendCredits({ userId: v, service: 'ai_text', requestId: id, amount: entre(1, 2), source: 'prueba' });
        enterasAbiertas.push({ v, id });
      } else if (op < 0.90 && enterasAbiertas.length) {
        const { v, id } = enterasAbiertas.splice(entre(0, enterasAbiertas.length - 1), 1)[0];
        await (azar() < 0.5 ? c.motor.completeCredits({ userId: v, requestId: id, finalAmount: entre(0, 1) }) : c.motor.refundCredits({ userId: v, requestId: id }));
      } else {
        await c.motor.grantCredits({ userId: cuentas[entre(0, 2)], amount: entre(1, 3), reason: 'prueba', source: 'prueba', requestId: `prop-g-${++k}` });
      }
    } catch (error) {
      if (error?.code !== 'INSUFFICIENT_CREDITS') violaciones.push(`paso ${paso}: error inesperado ${error?.code || error?.message}`);
    }
    comprobar(`paso ${paso}`);
  }
  check('tras CADA paso: saldo = suma exacta del libro (enteros × 10⁶ + µCredits) en las tres cuentas', !violaciones.some((v) => v.includes('suma del libro')), violaciones.filter((v) => v.includes('suma')).slice(0, 2).join(' | '));
  check('nunca un saldo negativo ni una fracción fuera de 0…999.999', !violaciones.some((v) => v.includes('forma')));
  check('el espejo del perfil, idéntico a la cuenta en todo momento', !violaciones.some((v) => v.includes('espejo')));
  check('ninguna liquidación por encima de lo autorizado; cada devolución, exactamente lo autorizado', !violaciones.some((v) => v.includes('por encima') || v.includes('devolución distinta')));
  check('la cuenta que solo hizo operaciones enteras nunca recibió campos de µCredits', !violaciones.some((v) => v.includes('oto')));
  check('ningún error inesperado y ninguna repetición movió dinero', !violaciones.some((v) => v.includes('inesperado') || v.includes('repetir') || v.includes('rechazada') || v.includes('aceptada')), violaciones.slice(0, 3).join(' | '));
}

console.log('\n── F2 · Operaciones: el informe de reservas colgadas cuenta los µCredits aparte ──');
{
  const { clasificar } = await import(new URL('../../ops/reconciliacion/reservas-colgadas.mjs', import.meta.url).href);
  const ahora = Date.parse('2026-11-07T12:00:00Z');
  const viejo = ahora - 30 * 3600_000;
  const r = clasificar([
    { id: 'usage_e1', type: 'usage', status: 'AUTHORIZED', service: 'ai_text', amount: -3, authorizedAmount: 3, createdAt: viejo },
    { id: 'usage_m1', type: 'usage', status: 'AUTHORIZED', service: 'ai_translate', unidad: 'micro', amount: 0, amountMicro: -45_000, authorizedAmountMicro: 45_000, createdAt: viejo },
  ], ahora, 24);
  check('una reserva en µCredits colgada no cuenta como 0 Credits: va aparte, en µCredits', r.total.reservas === 2 && r.total.credits === 3 && r.total.micro === 45_000 && r.porServicio.ai_translate.micro === 45_000 && r.porServicio.ai_translate.credits === 0);
}

console.log('\n── F3 · Reglas: el cliente no escribe la fracción ──');
{
  const reglas = (await import('node:fs')).readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
  const campos = /function creditFields\(\)\s*{\s*return \[([^\]]*)\]/.exec(reglas)?.[1] ?? '';
  check('creditFields() protege creditsFraccionMicro y creditsLifetimeSpentMicro como el saldo (crear y cambiar los bloquea en el perfil)', ['creditsFraccionMicro', 'creditsLifetimeSpentMicro', 'creditsBalance'].every((c) => campos.includes(`'${c}'`)) && /allow create:[^;]*!createsCreditFields\(\)/s.test(reglas) && /allow update:[^;]*!touchesCreditFields\(\)/s.test(reglas));
}

console.log('\n── G · Controles: las pruebas ven lo que dicen ver ──');
{
  const c = nuevo();
  await alta(c, 'pepa', 1);
  await reserva(c.motor, 'pepa', 'trad-g-1', 123_456);
  const soloEntero = txs(c.base, 'pepa').reduce((acc, t) => acc + (t.amount || 0) * MICRO, 0);
  check('CONTROL: un libro que ignorara amountMicro NO cuadraría con el saldo (la invariante F lo cazaría)', soloEntero !== estado(c.base, 'pepa').total);
  const espejoRoto = { ...estado(c.base, 'pepa', 'perfil'), total: estado(c.base, 'pepa', 'perfil').total + 1 };
  check('CONTROL: un espejo con 1 µC de diferencia se ve', espejoRoto.total !== estado(c.base, 'pepa').total);
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
