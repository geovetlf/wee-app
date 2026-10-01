/*
 * UN SEGUNDO PERFIL REAL NO MUEVE EL SALDO NI VUELVE A MIGRAR LA BILLETERA — revisión post-auditoría 2026-10-01,
 * hallazgo money/remigracion-por-segundo-perfil/functions/src/credits/creditEngine.ts#ensureAccount.
 *
 *   node test/credits-perfil-duplicado.test.mjs        (usa el compilado)
 *
 * El caso: una cuenta antigua tiene su Perfil Real con id AUTOMÁTICO y ya inicializado (saldo, billetera antigua
 * migrada). Las reglas dejan crear además `users/<uid>` —el id canónico de la Fase 11.x—, porque no pueden consultar
 * si ya hay otro (la app no lo hace: lo haría un cliente modificado). Firestore devuelve las consultas por igualdad
 * ORDENADAS POR ID; si `<uid>` ordena antes que el id automático, `findAccount` (que cogía «el primero») pasaba al
 * perfil nuevo, sin saldo: el saldo de verdad quedaba inalcanzable en el viejo, y `ensureAccount` volvía a migrar
 * `wallets/{uid}` —que nunca se pone a cero— sobrescribiendo `migration_<uid>`. Las reglas no dejan borrar perfiles,
 * así que no era un bucle, pero sí un saldo cambiado y una billetera acreditada dos veces.
 *
 * Esta suite lo REPRODUCE con el Credit Engine compilado sobre una Firestore en memoria que ordena como la real.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const { createCreditEngine } = require(path.resolve(here, '../lib/credits/creditEngine.js'));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── Firestore en memoria. Como la real: una consulta sin orderBy sale ORDENADA POR ID de documento. ── */
const INC = Symbol('inc');
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const resolver = (v, prev) => (v && typeof v === 'object' && v[INC] !== undefined ? (typeof prev === 'number' ? prev : 0) + v[INC] : v);
class Db {
  constructor() { this.docs = new Map(); this.cola = Promise.resolve(); }
  collection(p) { return new Coll(this, p); }
  runTransaction(fn) {
    const run = async () => { const tx = new Tx(this); const r = await fn(tx); tx.commit(); return r; };
    const p = this.cola.then(run, run); this.cola = p.catch(() => {}); return p;
  }
}
class Ref {
  constructor(db, p) { this.db = db; this.path = p; this.id = p.split('/').pop(); }
  async get() { const d = this.db.docs.get(this.path); return { exists: d !== undefined, id: this.id, ref: this, data: () => clone(d) }; }
}
class Coll {
  constructor(db, p, f = [], max = null) { Object.assign(this, { db, path: p, f, max }); }
  doc(id) { return new Ref(this.db, `${this.path}/${id}`); }
  where(campo, _op, valor) { return new Coll(this.db, this.path, [...this.f, [campo, valor]], this.max); }
  orderBy() { return this; }
  limit(n) { return new Coll(this.db, this.path, this.f, n); }
  async get() {
    let filas = [...this.db.docs.entries()].filter(([p]) => p.startsWith(this.path + '/') && !p.slice(this.path.length + 1).includes('/'));
    filas = filas.filter(([, d]) => this.f.every(([c, v]) => d[c] === v));
    filas.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    if (this.max) filas = filas.slice(0, this.max);
    const docs = filas.map(([p, d]) => ({ exists: true, id: p.split('/').pop(), ref: new Ref(this.db, p), data: () => clone(d) }));
    return { docs, empty: docs.length === 0 };
  }
}
class Tx {
  constructor(db) { this.db = db; this.w = []; }
  get(t) { return t.get(); }
  set(ref, data, o) { this.w.push(['set', ref, data, !!(o && o.merge)]); }
  update(ref, data) { this.w.push(['update', ref, data]); }
  commit() {
    for (const [k, ref, data, merge] of this.w) {
      const prev = this.db.docs.get(ref.path);
      if (k === 'update' && !prev) throw new Error('update sobre documento inexistente: ' + ref.path);
      const base = k === 'update' || merge ? { ...(prev || {}) } : {};
      for (const [c, v] of Object.entries(data)) base[c] = resolver(v, base[c]);
      this.db.docs.set(ref.path, base);
    }
  }
}

let reloj = 0;
const db = new Db();
const motor = createCreditEngine({ db: () => db, increment: (n) => ({ [INC]: n }), now: () => ++reloj, welcomeCredits: 240, loadCosts: async () => {} });
const transacciones = (uid) => [...db.docs.entries()].filter(([p, d]) => p.startsWith('creditTransactions/') && d.userId === uid).map(([p, d]) => ({ id: p.split('/').pop(), ...d }));

/* La cuenta antigua: perfil con id automático (ordena DESPUÉS de su uid) y billetera de antes con 100. */
const UID = 'ana';
db.docs.set(`users/zz_auto_${UID}`, { uid: UID, displayName: 'Ana', profileType: 'real' });
db.docs.set(`wallets/${UID}`, { balance: 100, totalPurchased: 100, totalSpent: 0 });
const primera = await motor.ensureAccount(UID);
check('1) CONTROL: la primera vez migra la billetera (100) y da la bienvenida (240): 340', primera.balance === 340 && primera.migrated === 100);
await motor.spendCredits({ userId: UID, service: 'ai_image', requestId: 'req_uno', source: 'test' });
const antes = (await motor.getBalance(UID)).balance;
check('2) CONTROL: gasta, y el saldo baja en el perfil de siempre', antes < 340 && db.docs.get(`users/zz_auto_${UID}`).creditsBalance === antes, String(antes));

/* El segundo perfil real, con el id canónico, que ordena ANTES. */
db.docs.set(`users/${UID}`, { uid: UID, displayName: 'Ana', profileType: 'real' });
const despues = await motor.ensureAccount(UID);
check('3) con un segundo perfil real, el saldo sigue siendo el de la cuenta (no salta al perfil vacío)',
  despues.balance === antes, `${antes} → ${despues.balance}`);
check('4) la billetera antigua NO se vuelve a migrar', despues.migrated === 0
  && transacciones(UID).filter((t) => t.id === `migration_${UID}`).length === 1
  && db.docs.get(`creditTransactions/migration_${UID}`)?.amount === 100);
check('5) el perfil nuevo no recibe Credits de nadie (ni migración ni bienvenida otra vez)', typeof db.docs.get(`users/${UID}`).creditsBalance !== 'number'
  && transacciones(UID).filter((t) => t.source === 'welcome').length === 1);
const gasto = await motor.spendCredits({ userId: UID, service: 'ai_image', requestId: 'req_dos', source: 'test' });
check('6) y los cobros siguen saliendo del perfil que tiene el saldo', gasto.balanceBefore === antes && db.docs.get(`users/zz_auto_${UID}`).creditsBalance === gasto.balanceAfter);

/* Ninguna cuenta nueva cambia: un solo perfil, el canónico. */
const db2 = new Db();
const motor2 = createCreditEngine({ db: () => db2, increment: (n) => ({ [INC]: n }), now: () => ++reloj, welcomeCredits: 240, loadCosts: async () => {} });
db2.docs.set('users/bea', { uid: 'bea', profileType: 'real' });
const nueva = await motor2.ensureAccount('bea');
check('7) CONTROL: una cuenta nueva con su único perfil recibe la bienvenida como siempre', nueva.balance === 240 && nueva.welcomeGranted === true);
const sinPerfil = await motor2.ensureAccount('nadie').then(() => 'ok', (e) => e.code);
check('8) CONTROL: sin perfil real, sigue siendo ACCOUNT_NOT_FOUND', sinPerfil === 'ACCOUNT_NOT_FOUND', String(sinPerfil));
db2.docs.set('users/hidi_bea', { uid: 'hidi_bea', profileType: 'hidi', linkedAccountId: 'bea' });
const cara = await motor2.ensureAccount('hidi_bea').then(() => 'ok', (e) => e.code);
check('9) CONTROL: una cara Weë no guarda Credits de nadie (se rechaza antes de buscar perfil)', cara === 'ACCOUNT_NOT_FOUND' || cara === 'INVALID_REQUEST', String(cara));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
