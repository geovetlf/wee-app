/**
 * R7 · K · UN FIRESTORE EN MEMORIA PARA LAS PRUEBAS DE CAMINO (módulo auxiliar, no una suite).
 *
 * Es la base de `video-asincrono.test.mjs` —la que piden el almacén de trabajos, el libro de intentos, el Credit Engine y el
 * barrendero— ampliada con lo que piden `runtime/conversaciones.ts` y los callables de Weë Brain: `where` con «<», «<=», «>» y
 * «>=», y orden por campo. Nada más: no es un emulador ni quiere serlo (las reglas, los índices y la concurrencia real se prueban
 * en las suites `*.emulator.mjs`).
 *
 *   const { base, instalar } = crearFirestoreEnMemoria(require('firebase-admin/firestore'));
 *   instalar();                        // getFirestore() devuelve `base` en todo el proceso
 *   base.docs.set('users/doc_u1', {…}); // lo escrito, tal cual; `base.de('creatorJobs')`, `base.leer(ruta)` para mirar
 */

const esTipo = (v, nombre) => !!v && typeof v === 'object' && v.constructor?.name === nombre;
const esPlano = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const copia = (v) => (Array.isArray(v) ? v.map(copia) : esPlano(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copia(x)])) : v);
const leerCampo = (d, f) => f.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d);
const yaExiste = (p) => Object.assign(new Error(`ALREADY_EXISTS: ${p}`), { code: 6 });
const numero = (x) => (x && typeof x.toMillis === 'function' ? x.toMillis() : x);

export const crearFirestoreEnMemoria = (fa) => {
  /** Lo que escribe el SDK como valor especial (incrementos, marcas de tiempo, borrados), resuelto como lo haría el servidor. */
  const resolver = (valor, previo, profundo) => {
    if (esTipo(valor, 'NumericIncrementTransform')) return (typeof previo === 'number' ? previo : 0) + valor.operand;
    if (esTipo(valor, 'ServerTimestampTransform')) return fa.Timestamp.now();
    if (esTipo(valor, 'DeleteTransform')) return undefined;
    if (Array.isArray(valor)) return valor.map((x) => resolver(x, undefined, true));
    if (profundo && esPlano(valor)) {
      const out = esPlano(previo) ? { ...previo } : {};
      for (const [k, v] of Object.entries(valor)) out[k] = resolver(v, out[k], true);
      return out;
    }
    return copia(valor);
  };

  const escribir = (base, w) => {
    const previo = base.docs.get(w.ref.path);
    if (w.tipo === 'delete') { base.docs.delete(w.ref.path); return; }
    if (w.tipo === 'create') { if (previo) throw yaExiste(w.ref.path); base.docs.set(w.ref.path, resolver(w.data, undefined, true)); return; }
    if (w.tipo === 'set') { base.docs.set(w.ref.path, resolver(w.data, w.merge ? (previo || {}) : undefined, true)); return; }
    if (!previo) throw new Error(`update sobre un documento que no existe: ${w.ref.path}`);
    const out = { ...previo };
    for (const [k, v] of Object.entries(w.data)) {
      const r = resolver(v, out[k], false);
      if (r === undefined) delete out[k]; else out[k] = r;
    }
    base.docs.set(w.ref.path, out);
  };

  const foto = (ref, d) => ({ exists: d !== undefined, id: ref.id, ref, data: () => d, get: (f) => (d === undefined ? undefined : leerCampo(d, f)) });

  class Base {
    constructor() { this.docs = new Map(); this.cola = Promise.resolve(); this.auto = 0; }
    collection(p) { return new Consulta(this, p); }
    doc(p) { return new Ref(this, p); }
    /* Transacciones en fila, como las serializa Firestore: lo que una escribe lo lee la siguiente. */
    runTransaction(fn) {
      const correr = async () => { const tx = new Tx(this); const r = await fn(tx); tx.confirmar(); return r; };
      const p = this.cola.then(correr, correr);
      this.cola = p.catch(() => {});
      return p;
    }
    batch() {
      const escrituras = [];
      const b = {
        set: (ref, data, opts) => { escrituras.push({ tipo: 'set', ref, data, merge: !!opts?.merge }); return b; },
        update: (ref, data) => { escrituras.push({ tipo: 'update', ref, data }); return b; },
        delete: (ref) => { escrituras.push({ tipo: 'delete', ref }); return b; },
        commit: async () => { for (const w of escrituras) escribir(this, w); },
      };
      return b;
    }
    leer(p) { return this.docs.has(p) ? copia(this.docs.get(p)) : undefined; }
    /** Los documentos de una colección (sin subcolecciones), con su identificador en `id`. */
    de(c) { return [...this.docs.entries()].filter(([p]) => p.startsWith(`${c}/`) && !p.slice(c.length + 1).includes('/')).map(([p, d]) => ({ id: p.slice(c.length + 1), ...d })); }
  }

  class Ref {
    constructor(base, p) { this.base = base; this.path = p; this.id = p.split('/').pop(); }
    collection(c) { return new Consulta(this.base, `${this.path}/${c}`); }
    async get() { return foto(this, this.base.leer(this.path)); }
    async create(data) { escribir(this.base, { tipo: 'create', ref: this, data }); }
    async set(data, opts) { escribir(this.base, { tipo: 'set', ref: this, data, merge: !!opts?.merge }); }
    async update(data) { escribir(this.base, { tipo: 'update', ref: this, data }); }
    async delete() { this.base.docs.delete(this.path); }
  }

  class Consulta {
    constructor(base, p, filtros = [], tope = null, orden = null, despues = null) { Object.assign(this, { base, path: p, filtros, tope, orden, despues }); }
    doc(id) { return new Ref(this.base, `${this.path}/${id ?? `auto_${++this.base.auto}`}`); }
    otra(cambios) { return Object.assign(new Consulta(this.base, this.path, this.filtros, this.tope, this.orden, this.despues), cambios); }
    where(campo, op, valor) {
      if (!['==', 'array-contains', '<', '<=', '>', '>='].includes(op)) throw new Error(`esta base de prueba no sabe «${op}»`);
      return this.otra({ filtros: [...this.filtros, [campo, op, valor]] });
    }
    orderBy(campo, dir = 'asc') { return this.otra({ orden: [typeof campo === 'string' ? campo : null, dir] }); }
    startAfter(cursor) { return this.otra({ despues: cursor }); }
    limit(tope) { return this.otra({ tope }); }
    count() { return { get: async () => { const s = await this.get(); return { data: () => ({ count: s.size }) }; } }; }
    async get() {
      const cumple = (d, [f, op, v]) => {
        const x = leerCampo(d, f);
        if (op === '==') return x === v;
        if (op === 'array-contains') return Array.isArray(x) && x.includes(v);
        if (x === undefined || x === null) return false;
        const a = numero(x); const b = numero(v);
        return op === '<' ? a < b : op === '<=' ? a <= b : op === '>' ? a > b : a >= b;
      };
      let filas = [...this.base.docs.entries()].filter(([p]) => p.startsWith(`${this.path}/`) && !p.slice(this.path.length + 1).includes('/'));
      filas = filas.filter(([, d]) => this.filtros.every((fl) => cumple(d, fl)));
      if (this.orden) {
        const [campo, dir] = this.orden;
        const signo = dir === 'desc' ? -1 : 1;
        if (campo && campo !== '__name__') {
          filas.sort(([, a], [, b]) => (numero(leerCampo(a, campo)) < numero(leerCampo(b, campo)) ? -1 : numero(leerCampo(a, campo)) > numero(leerCampo(b, campo)) ? 1 : 0) * signo);
        } else {
          filas.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0) * signo);
        }
      }
      if (this.despues !== null) filas = filas.filter(([p]) => p.split('/').pop() > this.despues);
      if (this.tope) filas = filas.slice(0, this.tope);
      const docs = filas.map(([p, d]) => foto(new Ref(this.base, p), copia(d)));
      return { docs, empty: !docs.length, size: docs.length, forEach: (fn) => docs.forEach(fn) };
    }
  }

  class Tx {
    constructor(base) { this.base = base; this.escrituras = []; }
    get(objetivo) { return objetivo.get(); }
    create(ref, data) { this.escrituras.push({ tipo: 'create', ref, data }); return this; }
    set(ref, data, opts) { this.escrituras.push({ tipo: 'set', ref, data, merge: !!opts?.merge }); return this; }
    update(ref, data) { this.escrituras.push({ tipo: 'update', ref, data }); return this; }
    delete(ref) { this.escrituras.push({ tipo: 'delete', ref }); return this; }
    confirmar() { for (const w of this.escrituras) escribir(this.base, w); }
  }

  const base = new Base();
  return { base, instalar: () => { fa.getFirestore = () => base; } };
};
