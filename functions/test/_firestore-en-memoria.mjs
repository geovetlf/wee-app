/**
 * UNA FIRESTORE EN MEMORIA, PARA RECORRER LAS FUNCIONES DE VERDAD SIN EMULADOR.
 *
 * Es un módulo, no una suite (el guion bajo lo dice: `ci-workflow` 13 solo exige en la cadena las `*.test.mjs`).
 * Lo usan las suites de aceptación (`aceptacion-*.test.mjs`): ejecutan `creatorChat`, `creatorQuote` y `creatorRun`
 * COMPILADOS (`functions/lib`) y el Credit Engine de verdad, y lo único que sustituyen es el sitio donde se guardan
 * los documentos.
 *
 * Es el mismo almacén que ya llevan `idempotencia-de-cobro.test.mjs` y `credits.test.mjs`, con tres añadidos que pide
 * recorrer un trabajo entero: la lectura de un campo (`snap.get('campo')`), el lote (`batch()`, que usa la liquidación
 * del libro de generaciones) y `orderBy` (se ignora el orden: ninguna de estas pruebas depende de él).
 *
 * Lo que SÍ imita de Firestore, porque de ello depende el dinero:
 *   · las transacciones se serializan (lo que escribe una lo lee la siguiente);
 *   · `FieldValue.increment` y `serverTimestamp` se resuelven con el valor anterior y la hora de verdad;
 *   · `set` sin `merge` REEMPLAZA el documento; `update` sobre un documento que no existe LANZA.
 *
 * Lo que NO imita: reglas de seguridad, índices, límites de tamaño ni consultas con operadores distintos de «==».
 * Esas cosas solo las prueba un emulador (`*.emulator.mjs`).
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const requerir = createRequire(path.resolve(aqui, '../package.json'));
export const lib = (p) => requerir(path.resolve(aqui, '../lib', p));
const fa = requerir('firebase-admin/firestore');

const esTipo = (v, nombre) => !!v && typeof v === 'object' && v.constructor?.name === nombre;
const esPlano = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
/** Copia lo plano y deja tal cual lo que no lo es (un Timestamp es inmutable y tiene que seguir siéndolo). */
const copia = (v) => (Array.isArray(v) ? v.map(copia) : esPlano(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copia(x)])) : v);
const resolver = (valor, previo, profundo) => {
  if (esTipo(valor, 'NumericIncrementTransform')) return (typeof previo === 'number' ? previo : 0) + valor.operand;
  if (esTipo(valor, 'ServerTimestampTransform')) return fa.Timestamp.now();
  if (Array.isArray(valor)) return valor.map((x) => resolver(x, undefined, true));
  if (profundo && esPlano(valor)) {
    const salida = esPlano(previo) ? { ...previo } : {};
    for (const [k, v] of Object.entries(valor)) salida[k] = resolver(v, salida[k], true);
    return salida;
  }
  return copia(valor);
};
const leerCampo = (d, f) => f.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d);

const escribir = (base, w) => {
  const previo = base.docs.get(w.ref.path);
  if (w.tipo === 'delete') { base.docs.delete(w.ref.path); return; }
  if (w.tipo === 'set') { base.docs.set(w.ref.path, resolver(w.data, w.merge ? (previo || {}) : undefined, true)); return; }
  if (!previo) throw new Error(`update sobre un documento que no existe: ${w.ref.path}`);
  const salida = { ...previo };
  for (const [k, v] of Object.entries(w.data)) salida[k] = resolver(v, salida[k], false);
  base.docs.set(w.ref.path, salida);
};

const instantanea = (ref, d) => ({ exists: d !== undefined, id: ref.id, ref, data: () => d, get: (f) => leerCampo(d, f) });

class Ref {
  constructor(base, p) { this.base = base; this.path = p; this.id = p.split('/').pop(); }
  collection(c) { return new Consulta(this.base, `${this.path}/${c}`); }
  async get() { return instantanea(this, this.base.leer(this.path)); }
  async set(data, opts) { escribir(this.base, { tipo: 'set', ref: this, data, merge: !!opts?.merge }); }
  async update(data) { escribir(this.base, { tipo: 'update', ref: this, data }); }
  async delete() { this.base.docs.delete(this.path); }
}

class Consulta {
  constructor(base, p, filtros = [], tope = null) { Object.assign(this, { base, path: p, filtros, tope }); }
  doc(id) { return new Ref(this.base, `${this.path}/${id ?? `auto_${++this.base.auto}`}`); }
  where(campo, op, valor) {
    if (op !== '==') throw new Error(`esta base de prueba solo sabe «==»: ${op}`);
    return new Consulta(this.base, this.path, [...this.filtros, [campo, valor]], this.tope);
  }
  orderBy() { return this; }
  limit(tope) { return new Consulta(this.base, this.path, this.filtros, tope); }
  async get() {
    let filas = [...this.base.docs.entries()].filter(([p]) => p.startsWith(`${this.path}/`) && !p.slice(this.path.length + 1).includes('/'));
    filas = filas.filter(([, d]) => this.filtros.every(([f, v]) => leerCampo(d, f) === v));
    if (this.tope) filas = filas.slice(0, this.tope);
    const docs = filas.map(([p, d]) => instantanea(new Ref(this.base, p), copia(d)));
    return { docs, empty: !docs.length, size: docs.length, forEach: (fn) => docs.forEach(fn) };
  }
}

class Transaccion {
  constructor(base) { this.base = base; this.escrituras = []; }
  get(objetivo) { return objetivo.get(); }
  set(ref, data, opts) { this.escrituras.push({ tipo: 'set', ref, data, merge: !!opts?.merge }); return this; }
  update(ref, data) { this.escrituras.push({ tipo: 'update', ref, data }); return this; }
  delete(ref) { this.escrituras.push({ tipo: 'delete', ref }); return this; }
  confirmar() { for (const w of this.escrituras) escribir(this.base, w); }
}

export class BaseEnMemoria {
  constructor() { this.docs = new Map(); this.cola = Promise.resolve(); this.auto = 0; }
  collection(p) { return new Consulta(this, p); }
  doc(p) { return new Ref(this, p); }
  batch() {
    const pendientes = [];
    const lote = {
      set: (ref, data, opts) => { pendientes.push({ tipo: 'set', ref, data, merge: !!opts?.merge }); return lote; },
      update: (ref, data) => { pendientes.push({ tipo: 'update', ref, data }); return lote; },
      delete: (ref) => { pendientes.push({ tipo: 'delete', ref }); return lote; },
      commit: async () => { for (const w of pendientes) escribir(this, w); },
    };
    return lote;
  }
  /* Transacciones en fila, como las serializa Firestore: lo que una escribe lo lee la siguiente. */
  runTransaction(fn) {
    const correr = async () => { const tx = new Transaccion(this); const r = await fn(tx); tx.confirmar(); return r; };
    const p = this.cola.then(correr, correr);
    this.cola = p.catch(() => {});
    return p;
  }
  /** Una copia del documento, o undefined si no existe. */
  leer(p) { return this.docs.has(p) ? copia(this.docs.get(p)) : undefined; }
  /** Los documentos de una colección (sin subcolecciones), con su id. */
  de(c) { return [...this.docs.entries()].filter(([p]) => p.startsWith(`${c}/`) && !p.slice(c.length + 1).includes('/')).map(([p, d]) => ({ id: p.slice(c.length + 1), ...copia(d) })); }
}

/** Pone UNA base como la Firestore de todo el proceso. Devuelve cómo dejarlo todo como estaba. */
export const instalarLaBase = (obtener) => {
  const original = fa.getFirestore;
  fa.getFirestore = () => obtener();
  return () => { fa.getFirestore = original; };
};

/**
 * Una cuenta con billetera, como la deja la app: su documento de `users` y la bienvenida del Credit Engine.
 * Devuelve el saldo con el que empieza. Con `saldo` se fija otro (para probar «no alcanza»).
 */
export const darDeAlta = async (base, uid, { saldo } = {}) => {
  base.docs.set(`users/doc_${uid}`, { uid, displayName: uid });
  await lib('credits/creditEngine.js').creditEngine.ensureAccount(uid);
  if (saldo !== undefined) base.docs.get(`users/doc_${uid}`).creditsBalance = saldo;
  return base.docs.get(`users/doc_${uid}`).creditsBalance;
};

export const saldoDe = (base, uid) => base.docs.get(`users/doc_${uid}`)?.creditsBalance;
