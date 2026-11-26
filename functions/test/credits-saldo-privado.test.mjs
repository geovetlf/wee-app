/*
 * EL SALDO SE MUDA AL SITIO PRIVADO SIN PERDER UN CREDIT — F-06.
 *
 *   node test/credits-saldo-privado.test.mjs        (usa el compilado)
 *
 * `users/{id}` es público y llevaba el saldo. El Credit Engine lo muda a
 * `creditAccounts/{uid}` por fases (`FaseSaldo`): `sombra` (P2, el perfil manda
 * y se escribe además el sitio privado), `cuenta` (P4, manda el privado,
 * migración perezosa en la misma transacción, espejo al perfil) y `contrato`
 * (P6, solo preparado: el perfil ya no se escribe). Esta suite fija, con el
 * motor COMPILADO sobre una Firestore en memoria:
 *
 *   A · la fase sale del entorno y una errata nunca cae en `contrato`;
 *   B · `sombra`: los dos sitios iguales tras cada operación, y manda el perfil;
 *   C · `cuenta`: la migración perezosa conserva saldo y acumulados, sin
 *       bienvenida ni `migration_<uid>` repetidas y sin tocar el circulante;
 *   D · el mismo requestId antes y después del giro no cobra dos veces, y
 *       complete/refund tras el giro van al sitio privado;
 *   E · instancias de las dos fases a la vez (un despliegue a medias) y la
 *       marcha atrás `cuenta` → `sombra` dejan saldo y libro coherentes;
 *   F · `contrato`: el perfil no se escribe, y una cuenta sin documento privado
 *       se migra desde el perfil; sin perfil ni privado, ACCOUNT_NOT_FOUND;
 *   G · lo que no cambia: cara Weë, multi-perfil, lectura de administración sin
 *       efectos;
 *   H · sabotaje: un motor que escribe solo el perfil hace fallar el invariante.
 *
 * Las carreras de verdad (dos transacciones a la vez contra Firestore) están en
 * `saldo-privado.emulator.mjs`; aquí las transacciones se serializan.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const motorMod = require(path.resolve(here, '../lib/credits/creditEngine.js'));
const { createCreditEngine, faseSaldoDelEntorno, FASE_SALDO_POR_DEFECTO, COLECCION_SALDO, perfilQueGuardaElSaldo } = motorMod;

let failures = 0;
let total = 0;
const check = (name, cond, extra = '') => {
  total++;
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const codigo = (p) => p.then(() => 'ok', (e) => e?.code || String(e));

/* ── Firestore en memoria (como la de credits.test.mjs; consultas ordenadas por id, como la real) ── */
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
  constructor() { this.docs = new Map(); this.queue = Promise.resolve(); this.escrituras = []; this.filtro = null; }
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
  async get() { const d = this.db.read(this.path); return { exists: d !== undefined, id: this.id, ref: this, data: () => d }; }
}
class Coll {
  constructor(db, p, f = [], max = null) { Object.assign(this, { db, path: p, f, max }); }
  doc(id) { return new Ref(this.db, `${this.path}/${id}`); }
  where(c, _op, v) { return new Coll(this.db, this.path, [...this.f, [c, v]], this.max); }
  orderBy() { return this; }
  limit(n) { return new Coll(this.db, this.path, this.f, n); }
  async get() {
    let rows = [...this.db.docs.entries()].filter(([p]) => p.startsWith(this.path + '/') && !p.slice(this.path.length + 1).includes('/'));
    rows = rows.filter(([, d]) => this.f.every(([c, v]) => d[c] === v));
    rows.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
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
      if (this.db.filtro && !this.db.filtro(w.ref.path)) continue; // sabotaje: escrituras que «se pierden»
      this.db.escrituras.push(w.ref.path);
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
  }
}

let reloj = 0;
const motor = (db, faseSaldo) => createCreditEngine({ db: () => db, increment: (n) => ({ [INC]: n }), now: () => ++reloj, welcomeCredits: 240, loadCosts: async () => {}, faseSaldo });
const perfil = (db, uid, extra = {}, id = `doc_${uid}`) => db.docs.set(`users/${id}`, { uid, displayName: uid, profileType: 'real', ...extra });
const privado = (db, uid) => db.read(`${COLECCION_SALDO}/${uid}`);
const libro = (db, uid) => [...db.docs.entries()].filter(([p, d]) => p.startsWith('creditTransactions/') && d.userId === uid).map(([p, d]) => ({ id: p.split('/').pop(), ...d }));
const CAMPOS = ['creditsBalance', 'creditsLifetimeEarned', 'creditsLifetimeSpent'];
/** El invariante de la transición: el sitio privado y el espejo dicen lo mismo, campo a campo. */
const iguales = (db, uid, idPerfil = `doc_${uid}`) => {
  const a = privado(db, uid) || {};
  const b = db.read(`users/${idPerfil}`) || {};
  return CAMPOS.every((c) => typeof a[c] === 'number' && a[c] === b[c]);
};
/** El saldo cuadra con el libro: suma de los movimientos que mueven saldo (usage −, refund/grant/purchase +, los reembolsos ya cuentan). */
const cuadraConElLibro = (db, uid) => {
  const suma = libro(db, uid).reduce((s, t) => s + (typeof t.amount === 'number' ? t.amount : 0), 0);
  return suma === (privado(db, uid) || {}).creditsBalance;
};

/* ═══ A ═════════════════════════════════════════════════════════════════ */
console.log('── A · la fase ──');
check('A1) por defecto, `cuenta` (P4): manda el sitio privado y se espeja el perfil', FASE_SALDO_POR_DEFECTO === 'cuenta' && faseSaldoDelEntorno(undefined) === 'cuenta');
check('A2) el entorno elige `sombra` o `contrato` solo si lo dice exactamente', faseSaldoDelEntorno('sombra') === 'sombra' && faseSaldoDelEntorno(' CONTRATO ') === 'contrato');
check('A3) una errata nunca cae en `contrato`: cae en la de por defecto', ['contrat', 'perfil', '1', 'true', ''].every((v) => faseSaldoDelEntorno(v) === 'cuenta'));
check('A4) el motor dice en qué fase está', motor(new FakeDb(), 'sombra').faseSaldo === 'sombra' && motor(new FakeDb()).faseSaldo === faseSaldoDelEntorno());
check('A5) la colección del saldo es creditAccounts (no wallets, que es la billetera antigua)', COLECCION_SALDO === 'creditAccounts');

/* ═══ B · sombra ════════════════════════════════════════════════════════ */
console.log('\n── B · sombra (P2): el perfil manda y el sitio privado se escribe a la vez ──');
{
  const db = new FakeDb();
  const m = motor(db, 'sombra');
  perfil(db, 'ana');
  const a = await m.ensureAccount('ana');
  check('B1) cuenta nueva: bienvenida una vez y los dos sitios iguales', a.balance === 240 && a.welcomeGranted && iguales(db, 'ana'));
  const p = privado(db, 'ana');
  check('B2) el documento privado dice de quién es y de qué perfil vino, y no lleva nada público', p.uid === 'ana' && p.profileRef === 'doc_ana'
    && !('displayName' in p) && !('email' in p) && !('linkedAccountId' in p));
  await m.spendCredits({ userId: 'ana', service: 'ai_image', requestId: 'b_img', source: 'test' });
  await m.spendCredits({ userId: 'ana', service: 'ai_video', amount: 50, requestId: 'b_vid', source: 'test' });
  await m.completeCredits({ userId: 'ana', requestId: 'b_img', finalAmount: 4 });
  await m.refundCredits({ userId: 'ana', requestId: 'b_vid', reason: 'prueba' });
  await m.grantCredits({ userId: 'ana', amount: 40, reason: 'compra', source: 'test', type: 'purchase', purchaseId: 'b_pay', priceUsd: 4.99 });
  check('B3) tras gastar, ajustar, reembolsar y comprar: los dos sitios iguales y el saldo cuadra con el libro',
    iguales(db, 'ana') && cuadraConElLibro(db, 'ana') && privado(db, 'ana').creditsBalance === 240 - 4 + 40, String(privado(db, 'ana').creditsBalance));
  /* Manda el perfil: si el privado se desvía (no debería), sombra lo iguala al perfil. */
  db.docs.get(`${COLECCION_SALDO}/ana`).creditsBalance = 9999;
  const g = await m.getBalance('ana');
  check('B4) en sombra manda el perfil: un privado desviado se corrige al del perfil', g.balance === 276 && privado(db, 'ana').creditsBalance === 276);
}

/* ═══ C · cuenta: migración perezosa ═══════════════════════════════════ */
console.log('\n── C · cuenta (P4): una cuenta antigua se migra en la misma transacción que la usa ──');
{
  const db = new FakeDb();
  const viejo = motor(db, 'sombra');
  /* Una cuenta antigua: inicializada por el motor de antes (solo el perfil), con su bienvenida y su billetera migradas. */
  perfil(db, 'beto');
  db.docs.set('wallets/beto', { balance: 100, totalPurchased: 100, totalSpent: 0 });
  await viejo.ensureAccount('beto');
  db.docs.delete(`${COLECCION_SALDO}/beto`); // como si se hubiera inicializado antes de P2
  const antes = db.read('users/doc_beto');
  const stats0 = clone(db.read('creditStats/global'));
  const libro0 = libro(db, 'beto').length;
  const m = motor(db, 'cuenta');
  const leido = await m.readBalance('beto');
  check('C1) readBalance (administración) no escribe nada, ni migra', leido.balance === 340 && leido.initialized && privado(db, 'beto') === undefined);
  const r = await m.spendCredits({ userId: 'beto', service: 'ai_image', requestId: 'c_img', source: 'test' });
  const p = privado(db, 'beto');
  check('C2) el primer cobro migra el saldo y cobra en la MISMA transacción', r.balanceBefore === 340 && r.balanceAfter === 330 && p?.creditsBalance === 330);
  check('C3) se conservan los acumulados del perfil', p.creditsLifetimeEarned === antes.creditsLifetimeEarned && p.creditsLifetimeSpent === antes.creditsLifetimeSpent + 10
    && p.creditsInitializedAt === antes.creditsInitializedAt);
  check('C4) el espejo del perfil queda igual que el privado', iguales(db, 'beto'));
  check('C5) migrar no crea bienvenida ni migration_ otra vez (solo el cobro nuevo en el libro)', libro(db, 'beto').length === libro0 + 1
    && libro(db, 'beto').filter((t) => t.source === 'welcome').length === 1 && libro(db, 'beto').filter((t) => t.id === 'migration_beto').length === 1);
  const stats1 = db.read('creditStats/global');
  check('C6) migrar no toca el circulante: solo baja lo cobrado', stats1.circulating === stats0.circulating - 10);
  check('C7) el documento privado dice que vino del perfil', p.creadoDesde === 'perfil' && p.profileRef === 'doc_beto');
  const otra = await m.ensureAccount('beto');
  check('C8) ensureAccount después: nada que conceder', !otra.welcomeGranted && otra.migrated === 0 && otra.balance === 330);

  /* La migración perezosa también la hace getBalance (la callable de la píldora). */
  perfil(db, 'cata');
  await viejo.ensureAccount('cata');
  db.docs.delete(`${COLECCION_SALDO}/cata`);
  const g = await m.getBalance('cata');
  check('C9) getBalance de una cuenta sin documento privado lo crea con su saldo', g.balance === 240 && privado(db, 'cata')?.creditsBalance === 240 && iguales(db, 'cata'));
  /* Una cuenta antigua que nunca se inicializó: la de siempre (billetera + bienvenida), ya directamente al privado. */
  perfil(db, 'dani');
  db.docs.set('wallets/dani', { balance: 7, totalPurchased: 7, totalSpent: 0 });
  const d = await m.ensureAccount('dani');
  check('C10) cuenta sin inicializar en P4: billetera + bienvenida, al privado y al espejo', d.balance === 247 && d.migrated === 7 && d.welcomeGranted && iguales(db, 'dani'));
}

/* ═══ D · el giro y la idempotencia ═════════════════════════════════════ */
console.log('\n── D · el mismo requestId antes y después del giro ──');
{
  const db = new FakeDb();
  const sombra = motor(db, 'sombra');
  const cuenta = motor(db, 'cuenta');
  perfil(db, 'eva');
  await sombra.ensureAccount('eva');
  const r1 = await sombra.spendCredits({ userId: 'eva', service: 'ai_video', amount: 60, requestId: 'giro_1', source: 'test' });
  const r2 = await cuenta.spendCredits({ userId: 'eva', service: 'ai_video', amount: 60, requestId: 'giro_1', source: 'test' });
  check('D1) reservado en P2 y repetido en P4: duplicado, sin segundo cobro', !r1.duplicate && r2.duplicate && privado(db, 'eva').creditsBalance === 180 && iguales(db, 'eva'));
  const c = await cuenta.completeCredits({ userId: 'eva', requestId: 'giro_1', finalAmount: 40 });
  check('D2) completado tras el giro: el ajuste vuelve al sitio privado (y al espejo)', c.refunded === 20 && privado(db, 'eva').creditsBalance === 200 && iguales(db, 'eva'));
  await sombra.spendCredits({ userId: 'eva', service: 'ai_video', amount: 30, requestId: 'giro_2', source: 'test' });
  const rf = await cuenta.refundCredits({ userId: 'eva', requestId: 'giro_2', reason: 'fallo' });
  const rf2 = await cuenta.refundCredits({ userId: 'eva', requestId: 'giro_2', reason: 'fallo' });
  check('D3) reservado antes, reembolsado después: una sola devolución', !rf.duplicate && rf2.duplicate && privado(db, 'eva').creditsBalance === 200 && iguales(db, 'eva'));
  const reus = await codigo(cuenta.spendCredits({ userId: 'eva', service: 'ai_video', amount: 30, requestId: 'giro_2', source: 'test' }));
  check('D4) y la clave reembolsada sigue sin servir tras el giro', reus === 'ALREADY_REFUNDED');
  const g1 = await sombra.grantCredits({ userId: 'eva', amount: 15, reason: 'regalo', source: 'test', requestId: 'giro_g' });
  const g2 = await cuenta.grantCredits({ userId: 'eva', amount: 15, reason: 'regalo', source: 'test', requestId: 'giro_g' });
  check('D5) un regalo con la misma clave a los dos lados del giro se da una vez', !g1.duplicate && g2.duplicate && privado(db, 'eva').creditsBalance === 215);
  check('D6) el saldo cuadra con el libro de punta a punta', cuadraConElLibro(db, 'eva'));
}

/* ═══ E · despliegue a medias y marcha atrás ════════════════════════════ */
console.log('\n── E · instancias de las dos fases a la vez, y la marcha atrás ──');
{
  const db = new FakeDb();
  const sombra = motor(db, 'sombra');
  const cuenta = motor(db, 'cuenta');
  perfil(db, 'fer');
  await sombra.ensureAccount('fer');
  const ops = [];
  for (let i = 0; i < 12; i++) {
    const m = i % 2 ? sombra : cuenta;
    ops.push(m.spendCredits({ userId: 'fer', service: 'ai_text', amount: 3, requestId: `mez_${i}`, source: 'test' }));
    if (i % 3 === 0) ops.push(m.grantCredits({ userId: 'fer', amount: 5, reason: 'x', source: 'test', requestId: `mezg_${i}` }));
  }
  await Promise.all(ops);
  check('E1) 12 cobros y 4 regalos repartidos entre las dos fases: saldo exacto, sitios iguales, libro cuadrado',
    privado(db, 'fer').creditsBalance === 240 - 36 + 20 && iguales(db, 'fer') && cuadraConElLibro(db, 'fer'), String(privado(db, 'fer').creditsBalance));
  /* Marcha atrás de P4 a P2: el espejo estaba al día, así que el perfil manda con el mismo saldo. */
  const tras = await sombra.getBalance('fer');
  await sombra.spendCredits({ userId: 'fer', service: 'ai_text', amount: 4, requestId: 'atras_1', source: 'test' });
  check('E2) volver a sombra no pierde ni inventa nada', tras.balance === 224 && privado(db, 'fer').creditsBalance === 220 && iguales(db, 'fer') && cuadraConElLibro(db, 'fer'));
}

/* ═══ F · contrato ══════════════════════════════════════════════════════ */
console.log('\n── F · contrato (P6, solo preparado): el perfil deja de escribirse ──');
{
  const db = new FakeDb();
  const cuenta = motor(db, 'cuenta');
  const contrato = motor(db, 'contrato');
  perfil(db, 'gil');
  await cuenta.ensureAccount('gil');
  const espejo = db.read('users/doc_gil').creditsBalance;
  await contrato.spendCredits({ userId: 'gil', service: 'ai_image', requestId: 'k_img', source: 'test' });
  check('F1) en contrato se cobra del privado y el perfil NO se toca', privado(db, 'gil').creditsBalance === 230 && db.read('users/doc_gil').creditsBalance === espejo
    && !db.escrituras.slice(-4).includes('users/doc_gil'));
  /* El script de P6 borra los campos del perfil: el motor sigue igual. */
  for (const c of [...CAMPOS, 'creditsInitializedAt']) delete db.docs.get('users/doc_gil')[c];
  const tras = await contrato.getBalance('gil');
  check('F2) sin campos de saldo en el perfil, el saldo sigue siendo el privado', tras.balance === 230 && !('creditsBalance' in db.read('users/doc_gil')));
  /* Una cuenta que llega a contrato sin documento privado: se migra desde el perfil. */
  perfil(db, 'hugo', { creditsBalance: 77, creditsLifetimeEarned: 300, creditsLifetimeSpent: 223, creditsInitializedAt: 5 });
  db.docs.set('creditTransactions/grant_welcome_hugo', { userId: 'hugo', type: 'grant', amount: 240, status: 'COMPLETED' });
  const h = await contrato.ensureAccount('hugo');
  check('F3) contrato migra perezosamente a quien aún no tenía documento privado, sin bienvenida', h.balance === 77 && !h.welcomeGranted
    && privado(db, 'hugo')?.creditsBalance === 77 && privado(db, 'hugo').creditsLifetimeSpent === 223);
  /* Una cuenta cuyo perfil desapareció conserva sus Credits en contrato. */
  db.docs.delete('users/doc_gil');
  check('F4) en contrato el saldo ya no depende del perfil', (await contrato.readBalance('gil')).balance === 230);
  check('F5) sin privado y sin perfil: ACCOUNT_NOT_FOUND, en todas las fases', (await codigo(contrato.ensureAccount('nadie'))) === 'ACCOUNT_NOT_FOUND'
    && (await codigo(cuenta.ensureAccount('nadie'))) === 'ACCOUNT_NOT_FOUND' && privado(db, 'nadie') === undefined);
}

/* ═══ G · lo que no cambia ══════════════════════════════════════════════ */
console.log('\n── G · cara Weë, varios perfiles y lecturas sin efectos ──');
{
  const db = new FakeDb();
  const m = motor(db, 'cuenta');
  perfil(db, 'hidi_ines', { profileType: 'hidi', linkedAccountId: 'ines' }, 'hidi_ines');
  const cara = await codigo(m.ensureAccount('hidi_ines'));
  check('G1) una cara Weë no tiene Credits y no se le crea documento privado', (cara === 'ACCOUNT_NOT_FOUND' || cara === 'INVALID_REQUEST') && privado(db, 'hidi_ines') === undefined, cara);
  /* Dos Perfiles Reales: se migra el que estaba inicializado, como elige el motor de siempre. */
  perfil(db, 'jon', { creditsBalance: 55, creditsLifetimeEarned: 55, creditsLifetimeSpent: 0 }, 'zz_auto_jon');
  perfil(db, 'jon', {}, 'jon');
  db.docs.set('creditTransactions/grant_welcome_jon', { userId: 'jon', type: 'grant', amount: 240, status: 'COMPLETED' });
  const j = await m.getBalance('jon');
  check('G2) con dos perfiles reales se migra el inicializado y queda anotado de cuál vino', j.balance === 55 && privado(db, 'jon').profileRef === 'zz_auto_jon'
    && typeof db.read('users/jon').creditsBalance !== 'number' && iguales(db, 'jon', 'zz_auto_jon'));
  const docs = [{ id: 'a', data: () => ({ uid: 'k', profileType: 'real' }) }, { id: 'b', data: () => ({ uid: 'k', creditsBalance: 3 }) }];
  check('G3) los scripts eligen el perfil con la misma función que el motor', perfilQueGuardaElSaldo('k', docs)?.id === 'b' && perfilQueGuardaElSaldo('otra', docs) === undefined);
  const antes = db.escrituras.length;
  await m.readBalance('jon');
  await m.getBalance('jon');
  check('G4) con todo al día, leer el saldo no escribe nada', db.escrituras.length === antes);
}

/* ═══ H · sabotaje ═════════════════════════════════════════════════════ */
console.log('\n── H · sabotaje: un motor que solo escribe el perfil no pasa ──');
{
  const db = new FakeDb();
  const m = motor(db, 'cuenta');
  perfil(db, 'kai');
  await m.ensureAccount('kai');
  db.filtro = (ruta) => !ruta.startsWith(`${COLECCION_SALDO}/`); // las escrituras al sitio privado «se pierden»
  await m.spendCredits({ userId: 'kai', service: 'ai_image', requestId: 's_img', source: 'test' });
  db.filtro = null;
  check('H1) el invariante lo detecta (privado ≠ espejo)', !iguales(db, 'kai'));
  check('H2) y el saldo privado ya no cuadra con el libro', !cuadraConElLibro(db, 'kai'));
  const g = await m.getBalance('kai');
  check('H3) en P4 manda el privado: el perfil desviado se corrige al privado, no al revés', g.balance === 240 && db.read('users/doc_kai').creditsBalance === 240);
}

/* ═══ La suite está en la cadena ════════════════════════════════════════ */
const pkg = JSON.parse(fs.readFileSync(path.resolve(here, '../package.json'), 'utf8'));
check('Z) esta suite está en la cadena de `npm test`', /node test\/credits-saldo-privado\.test\.mjs/.test(pkg.scripts.test));

console.log(failures ? `\n✘ ${failures} de ${total} comprobaciones fallaron` : `\n✔ F-06: el saldo se muda sin perder un Credit (${total} comprobaciones)`);
process.exit(failures ? 1 : 0);
