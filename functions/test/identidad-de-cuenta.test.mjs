/*
 * NACER UNA CUENTA: el seam de Identity, ejecutado (Fase 11.x-2).
 *
 *   A · Lo puro del Core: número, cuenta y entidades a partir de una posición.
 *   B · El protocolo sobre un almacén de mentira con transacciones optimistas:
 *       cuentas distintas a la vez reciben números distintos y consecutivos;
 *       la misma cuenta diez veces a la vez nace UNA; la cara Weë es la
 *       entidad 2 de su cuenta y no puede colgar de otra.
 *   C · La composición sobre Firestore, con un Admin SDK de mentira: qué
 *       documentos escribe, con qué forma, y que `create` no pisa nada.
 *   D · Lo que sigue sin cablearse, a propósito.
 *
 * Requiere `npm run build`: lee `functions/lib`.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../lib/core/identity.js');
const comp = require('../lib/identity/index.js');
const RAIZ = new URL('../../', import.meta.url);
const leer = (p) => fs.readFileSync(new URL(p, RAIZ), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const cede = () => new Promise((r) => setTimeout(r, Math.floor(Math.random() * 3)));

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Lo puro del Core ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const n = core.nacerCuenta({ accountId: 'cuentaA', posicion: 1, at: 1000 });
  check('1) la posición 1 nace como 0000001 con su Perfil Real como entidad 00000011 de secuencia 1',
    n && n.cuenta.accountNumber === '0000001' && n.perfilReal.entityId === '00000011' && n.perfilReal.entityType === 'REAL_PROFILE' && n.perfilReal.entitySequence === 1 && n.perfilReal.ownerAccountId === 'cuentaA');
  check('1) la cuenta es el uid de Auth, y no otra cosa', n.cuenta.accountId === 'cuentaA' && core.cuentaValida(n.cuenta) && core.entidadValida(n.perfilReal));
  const wee = core.entidadDeCuenta(n.cuenta, core.SECUENCIA_DE_PERFIL_WEE, 2000);
  const page = core.entidadDeCuenta(n.cuenta, core.PRIMERA_SECUENCIA_DE_PAGE, 2000);
  check('2) la secuencia 2 es el Perfil Weë (00000012) y la 3 una Página (00000013), con el tipo GUARDADO',
    wee.entityType === 'WEE_PROFILE' && wee.entityId === '00000012' && page.entityType === 'PAGE' && page.entityId === '00000013');
  check('3) lo que no vale devuelve undefined, no un número de otra cuenta',
    core.nacerCuenta({ accountId: 'hidi_cuenta', posicion: 1, at: 1 }) === undefined
    && core.nacerCuenta({ accountId: 'cuentaA', posicion: 0, at: 1 }) === undefined
    && core.nacerCuenta({ accountId: 'cuentaA', posicion: 12345678, at: 1, ancho: 7 }) === undefined
    && core.nacerCuenta({ accountId: 'cuentaA', posicion: 1, at: 1.5 }) === undefined);
  check('4) la misma posición da siempre el mismo nacimiento', JSON.stringify(core.nacerCuenta({ accountId: 'cuentaA', posicion: 7, at: 5 })) === JSON.stringify(core.nacerCuenta({ accountId: 'cuentaA', posicion: 7, at: 5 })));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · El protocolo sobre un almacén de mentira ──');
// ════════════════════════════════════════════════════════════════════════════
class AlmacenDeMentira {
  constructor() { this.cuentas = new Map(); this.entidades = new Map(); this.ultima = 0; this.version = 0; this.transacciones = 0; this.reintentos = 0; }
  /*
   * Modela la SERIALIZABILIDAD de Firestore, no el presupuesto de intentos del
   * SDK: diez nacimientos a la vez chocan todos en el mismo contador y se
   * repiten hasta que cada uno pasa. En producción el Admin SDK reintenta con
   * espera creciente; sin espera, cinco intentos no bastan para diez
   * contendientes, y eso es justo el techo de un contador único (~1 alta/s
   * sostenida) que documenta el Core.
   */
  async enTransaccion(cuerpo) {
    for (let intento = 1; intento <= 40; intento++) {
      this.transacciones++;
      if (intento > 1) this.reintentos++;
      const versionLeida = this.version;
      const escrituras = [];
      const tx = {
        leerCuenta: async (id) => { await cede(); return this.cuentas.get(id) || null; },
        leerEntidad: async (id) => { await cede(); return this.entidades.get(id) ? this.entidades.get(id).entidad : null; },
        ultimaPosicion: async () => { await cede(); return this.ultima; },
        reservarPosicion: (p) => escrituras.push(() => { this.ultima = p; }),
        guardarCuenta: (c) => escrituras.push(() => { if (this.cuentas.has(c.accountId)) throw new Error('create sobre cuenta existente'); this.cuentas.set(c.accountId, c); }),
        guardarEntidad: (e, perfilUid) => escrituras.push(() => { if (this.entidades.has(e.entityId)) throw new Error('create sobre entidad existente'); this.entidades.set(e.entityId, { entidad: e, perfilUid }); }),
      };
      const resultado = await cuerpo(tx);
      await cede();
      if (this.version !== versionLeida) continue; // alguien escribió entre medias: se repite entera
      if (escrituras.length) { for (const e of escrituras) e(); this.version++; }
      return resultado;
    }
    throw new Error('transacción abortada tras 40 intentos');
  }
}
{
  const al = new AlmacenDeMentira();
  const r = await Promise.all(Array.from({ length: 10 }, (_, i) => core.asegurarIdentidadDeCuenta(al, { accountId: 'cuenta' + i, at: 1 })));
  check('4b) diez cuentas a la vez chocan en el contador y se repiten: la contención es real y se resuelve', al.reintentos > 0, al.reintentos + ' reintentos');
  const numeros = r.map((x) => x.nacimiento.cuenta.accountNumber).sort();
  check('5) diez cuentas distintas a la vez nacen con diez números distintos y consecutivos',
    new Set(numeros).size === 10 && numeros[0] === '0000001' && numeros[9] === '0000010' && al.ultima === 10 && r.every((x) => x.creada));
  check('5) y cada una con su Perfil Real como entidad 1 guardada con su uid de puente',
    r.every((x) => al.entidades.get(x.nacimiento.perfilReal.entityId).perfilUid === x.nacimiento.cuenta.accountId));
}
{
  let rondasBien = 0;
  for (let ronda = 0; ronda < 25; ronda++) {
    const al = new AlmacenDeMentira();
    const r = await Promise.all(Array.from({ length: 10 }, () => core.asegurarIdentidadDeCuenta(al, { accountId: 'cuentaX', at: 1 })));
    if (al.cuentas.size === 1 && al.ultima === 1 && r.filter((x) => x.creada).length === 1 && new Set(r.map((x) => x.nacimiento.cuenta.accountNumber)).size === 1) rondasBien++;
  }
  check('6) la misma cuenta diez veces a la vez, 25 rondas: nace UNA, se reparte UNA posición, todos ven el mismo número', rondasBien === 25, rondasBien + '/25');
}
{
  const al = new AlmacenDeMentira();
  const primera = await core.asegurarIdentidadDeCuenta(al, { accountId: 'cuentaY', at: 1 });
  const segunda = await core.asegurarIdentidadDeCuenta(al, { accountId: 'cuentaY', at: 99 });
  check('7) la segunda llamada devuelve lo mismo, `creada: false`, y no reparte nada',
    primera.creada && !segunda.creada && segunda.nacimiento.cuenta.accountNumber === primera.nacimiento.cuenta.accountNumber && al.ultima === 1 && segunda.nacimiento.perfilReal.entityId === primera.nacimiento.perfilReal.entityId);
  const cara = await Promise.all(Array.from({ length: 10 }, () => core.asegurarEntidadWee(al, { accountId: 'cuentaY', perfilWeeUid: 'hidi_cuentaY', at: 5 })));
  check('8) la cara Weë es la entidad 2 de su cuenta: diez veces a la vez, una sola, con el uid heredado de puente',
    al.entidades.size === 2 && cara.filter((x) => x.creada).length === 1 && cara.every((x) => x.entidad.entityId === primera.nacimiento.cuenta.accountNumber + '2' && x.entidad.entityType === 'WEE_PROFILE' && x.entidad.ownerAccountId === 'cuentaY')
    && al.entidades.get(primera.nacimiento.cuenta.accountNumber + '2').perfilUid === 'hidi_cuentaY');
  let sinCuenta = false; try { await core.asegurarEntidadWee(al, { accountId: 'cuentaZ', perfilWeeUid: 'hidi_cuentaZ', at: 5 }); } catch (e) { sinCuenta = /no ha nacido/.test(e.message); }
  check('9) una cara no crea otra cuenta: sin cuenta nacida, no hay entidad Weë', sinCuenta && al.entidades.size === 2);
  let ajena = false; try { await core.asegurarEntidadWee(al, { accountId: 'cuentaY', perfilWeeUid: 'cuentaY', at: 5 }); } catch (e) { ajena = true; }
  check('10) y el puente de la cara no puede ser la propia cuenta ni un id vacío', ajena);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · La composición sobre Firestore, con un Admin SDK de mentira ──');
// ════════════════════════════════════════════════════════════════════════════
class FirestoreAdminDeMentira {
  constructor() { this.docs = new Map(); this.escrituras = []; }
  ref(path) { const self = this; return { path, get id() { return path.split('/').pop(); } }; }
  collection(nombre) { return { doc: (id) => this.ref(nombre + '/' + id) }; }
  doc(path) { return this.ref(path); }
  async runTransaction(cuerpo) {
    const pendientes = [];
    const tx = {
      get: async (ref) => { const d = this.docs.get(ref.path); return { exists: !!d, data: () => d }; },
      set: (ref, datos, opts) => pendientes.push(() => { const previo = opts && opts.merge ? this.docs.get(ref.path) || {} : {}; this.docs.set(ref.path, { ...previo, ...datos }); this.escrituras.push(['set', ref.path]); }),
      create: (ref, datos) => pendientes.push(() => { if (this.docs.has(ref.path)) throw new Error('ALREADY_EXISTS ' + ref.path); this.docs.set(ref.path, { ...datos }); this.escrituras.push(['create', ref.path]); }),
      update: (ref, datos) => pendientes.push(() => { if (!this.docs.has(ref.path)) throw new Error('NOT_FOUND ' + ref.path); this.docs.set(ref.path, { ...this.docs.get(ref.path), ...datos }); this.escrituras.push(['update', ref.path]); }),
    };
    const r = await cuerpo(tx);
    for (const p of pendientes) p();
    return r;
  }
}
{
  const db = new FirestoreAdminDeMentira();
  const a = await comp.asegurarIdentidadDeCuentaEnWee(db, 'cuentaQ', 1000);
  const b = await comp.asegurarIdentidadDeCuentaEnWee(db, 'cuentaQ', 2000);
  check('11) nacer escribe la cuenta en accounts/{uid}, la entidad en entities/{entityId} y el contador, y nada más',
    a.creada && !b.creada && db.docs.has('accounts/cuentaQ') && db.docs.has('entities/00000011') && db.docs.get('contadores/cuentas').ultimaPosicion === 1
    && db.escrituras.length === 3 && db.docs.get('entities/00000011').perfilUid === 'cuentaQ' && db.docs.get('entities/00000011').ownerAccountId === 'cuentaQ');
  const w = await comp.asegurarEntidadWeeEnWee(db, 'cuentaQ', 'hidi_cuentaQ', 3000);
  check('12) la cara Weë va a entities/00000012 con su uid heredado de puente, sin tocar la cuenta ni el contador',
    w.creada && db.docs.get('entities/00000012').perfilUid === 'hidi_cuentaQ' && db.docs.get('entities/00000012').entityType === 'WEE_PROFILE' && db.docs.get('contadores/cuentas').ultimaPosicion === 1 && db.escrituras.length === 4);
  const otra = await comp.asegurarIdentidadDeCuentaEnWee(db, 'cuentaR', 4000);
  check('13) la siguiente cuenta recibe la siguiente posición', otra.nacimiento.cuenta.accountNumber === '0000002' && db.docs.get('contadores/cuentas').ultimaPosicion === 2);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Lo que sigue sin cablearse, a propósito, y lo que las reglas cierran ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const indice = leer('functions/src/index.ts');
  const reglas = leer('firestore.rules');
  const nucleo = leer('functions/src/core/identity.ts');
  check('14) ninguna callable ni disparador llama todavía al nacimiento: no hay backfill por la puerta de atrás',
    !/identity'/.test(indice) && !/asegurarIdentidadDeCuenta/.test(indice));
  check('15) las reglas cierran accounts, entities y el contador a los clientes',
    /match \/accounts\/\{accountId\} \{\s*\n\s*allow read: if isAuthenticated\(\) && request\.auth\.uid == accountId;\s*\n\s*allow write: if false;/.test(reglas)
    && /match \/entities\/\{entityId\} \{\s*\n\s*allow read: if isAuthenticated\(\) && resource\.data\.ownerAccountId == request\.auth\.uid;\s*\n\s*allow write: if false;/.test(reglas)
    && /match \/contadores\/\{contador\} \{\s*\n\s*allow read, write: if false;/.test(reglas));
  check('16) el Core sigue sin saber de Firebase ni de relojes: la posición y la hora llegan de fuera',
    !/firebase|Date\.now|firestore/i.test(nucleo.replace(/\/\*[\s\S]*?\*\//g, '')));
  check('17) el id de la cuenta es el uid de Auth y nunca la forma heredada de una cara', !core.esIdDeCuenta('hidi_abc') && core.esIdDeCuenta('abc123'));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
