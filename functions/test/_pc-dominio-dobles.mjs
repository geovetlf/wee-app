/*
 * DOBLES EN MEMORIA de `firebase/firestore`, `firebase/functions` y `config/firebase` para `pc-dominio-cliente`.
 * Módulo, no suite. Un único estado compartido en `globalThis.__pc` (las tres «caras» se cargan con ?m=…).
 * Imita lo que usan el contrato y los servicios: igualdad e `in`, orden por un campo, `limit`, `startAfter` por
 * instantánea, `count()`, lotes atómicos (o todo o nada) y `deleteField`. Cuenta las lecturas de documentos.
 */
const E = (globalThis.__pc ??= { docs: new Map(), lecturas: 0, llamadas: [], callable: null, falloDeLote: null, auto: 0 });

const leerCampo = (d, f) => f.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d);
const DELETE = { __borrar: true };
const valorDeOrden = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : v);

export class Timestamp {
  constructor(ms) { this.ms = ms; }
  static now() { return new Timestamp((E.reloj ? E.reloj() : Date.now())); }
  toMillis() { return this.ms; }
}
export const deleteField = () => DELETE;
export const collection = (_db, nombre) => ({ tipo: 'col', nombre });
export const doc = (_db, col, id) => ({ tipo: 'doc', path: `${col}/${id}`, id });
export const where = (campo, op, valor) => ({ tipo: 'where', campo, op, valor });
export const orderBy = (campo, dir = 'asc') => ({ tipo: 'orderBy', campo, dir });
export const limit = (n) => ({ tipo: 'limit', n });
export const startAfter = (snap) => ({ tipo: 'startAfter', snap });
export const query = (col, ...partes) => ({ tipo: 'query', col: col.nombre, partes });

const instantanea = (path, d) => ({ id: path.split('/').pop(), ref: { tipo: 'doc', path, id: path.split('/').pop() }, exists: () => d !== undefined, data: () => (d === undefined ? undefined : JSON.parse(JSON.stringify(d))) });

const ejecutar = (q) => {
  let filas = [...E.docs.entries()].filter(([p]) => p.startsWith(`${q.col}/`) && !p.slice(q.col.length + 1).includes('/'));
  for (const w of q.partes.filter((x) => x.tipo === 'where')) {
    filas = filas.filter(([, d]) => (w.op === '==' ? leerCampo(d, w.campo) === w.valor : w.op === 'in' ? w.valor.includes(leerCampo(d, w.campo)) : (() => { throw new Error(`op ${w.op}`); })()));
  }
  const o = q.partes.find((x) => x.tipo === 'orderBy');
  if (o) filas.sort(([pa, a], [pb, b]) => { const x = valorDeOrden(leerCampo(a, o.campo)); const y = valorDeOrden(leerCampo(b, o.campo)); return (x < y ? -1 : x > y ? 1 : pa < pb ? -1 : 1) * (o.dir === 'desc' ? -1 : 1); });
  const s = q.partes.find((x) => x.tipo === 'startAfter');
  if (s) { const i = filas.findIndex(([p]) => p === s.snap.ref.path); filas = filas.slice(i + 1); }
  const l = q.partes.find((x) => x.tipo === 'limit');
  if (l) filas = filas.slice(0, l.n);
  return filas;
};

export const getDocs = async (q) => {
  const filas = ejecutar(q);
  E.lecturas += filas.length;
  E.porColeccion = E.porColeccion || {};
  E.porColeccion[q.col] = (E.porColeccion[q.col] || 0) + filas.length;
  const docs = filas.map(([p, d]) => instantanea(p, d));
  return { docs, empty: docs.length === 0, size: docs.length };
};
export const getCountFromServer = async (q) => { E.lecturas += 1; const n = ejecutar(q).length; return { data: () => ({ count: n }) }; };
export const getDoc = async (ref) => { E.lecturas += 1; return instantanea(ref.path, E.docs.get(ref.path)); };
const aplicar = (path, cambios) => {
  const previo = E.docs.get(path);
  if (!previo) throw new Error(`update sobre un documento que no existe: ${path}`);
  const nuevo = { ...previo };
  for (const [k, v] of Object.entries(cambios)) { if (v === DELETE) delete nuevo[k]; else nuevo[k] = v; }
  E.docs.set(path, nuevo);
};
export const updateDoc = async (ref, cambios) => aplicar(ref.path, cambios);
export const deleteDoc = async (ref) => { E.docs.delete(ref.path); };
export const addDoc = async (col, datos) => { const id = `auto_${++E.auto}`; E.docs.set(`${col.nombre}/${id}`, { ...datos }); return { id }; };
export const writeBatch = () => {
  const ops = [];
  const lote = {
    update: (ref, cambios) => { ops.push(['update', ref.path, cambios]); return lote; },
    delete: (ref) => { ops.push(['delete', ref.path]); return lote; },
    set: (ref, datos) => { ops.push(['set', ref.path, datos]); return lote; },
    commit: async () => {
      if (E.falloDeLote && E.falloDeLote(ops)) throw new Error('lote rechazado');
      const copia = new Map(E.docs);
      try {
        for (const [t, p, c] of ops) { if (t === 'update') aplicar(p, c); else if (t === 'delete') E.docs.delete(p); else E.docs.set(p, { ...c }); }
      } catch (e) { E.docs = copia; globalThis.__pc.docs = copia; throw e; }
    },
  };
  return lote;
};

/* firebase/functions */
export const httpsCallable = (_f, nombre) => async (datos) => {
  E.llamadas.push({ nombre, datos });
  if (!E.callable) { const e = new Error('not found'); e.code = 'functions/not-found'; throw e; }
  return { data: await E.callable(nombre, datos) };
};

/* config/firebase */
export const db = { doble: 'firestore' };
export const functions = { doble: 'functions' };
