/**
 * FIRESTORE DOBLE QUE CUENTA — ronda R7, tarea I («M4» de la auditoría D).
 *
 * Una Firestore en memoria con la superficie que usa `functions/lib` en los caminos de IA
 * (documentos, subcolecciones, consultas, lotes, transacciones, `FieldValue`, `Timestamp`)
 * y, además, CUENTA cada llamada lógica al servicio (RPC) y le pone una latencia VIRTUAL.
 *
 * ── Cómo cuenta (y de dónde sale cada regla) ────────────────────────────────
 *
 * Reglas verificadas leyendo `@google-cloud/firestore` 7.11.6 instalado en `functions/node_modules`
 * (build/src/transaction.js), no de memoria:
 *
 *   · `ref.get()` y `tx.get(ref)` ........................ 1 RPC (BatchGetDocuments).
 *   · `query.get()` y `tx.get(query)` .................... 1 RPC (RunQuery).
 *   · `query.count().get()` .............................. 1 RPC (RunAggregationQuery).
 *   · `ref.set/update/create/delete` ..................... 1 RPC (Commit de un solo documento).
 *   · `batch.commit()` ................................... 1 RPC (Commit de N escrituras).
 *   · `runTransaction`: NO hay BeginTransaction aparte: la transacción empieza dentro de su PRIMERA
 *     lectura (`withLazyStartedTransaction`). Al final hay UN Commit si hubo lecturas o escrituras (con
 *     lecturas y sin escrituras es un Commit vacío que libera la transacción) y ninguno si no hubo nada.
 *     Cada `tx.get` es 1 RPC y, si las llamadas están encadenadas con `await`, van EN SERIE.
 *   · Un fallo del callback hace `rollback` (1 RPC de «mejor esfuerzo» que no se espera).
 *   · Un choque de transacciones reintenta hasta 5 veces (DEFAULT_MAX_TRANSACTION_ATTEMPTS) con espera
 *     exponencial de 1 s × 1,5^n (± 50 % de jitter en el SDK; aquí sin jitter, para que sea reproducible).
 *
 * Facturación (lo que mide el recibo, no las RPC): una lectura por documento devuelto (mínimo 1 por
 * consulta, también si no hay resultados y también para un documento que no existe), una escritura por
 * cada `set/update/create` y un borrado por cada `delete`; `count()` factura 1 lectura por cada 1 000
 * entradas de índice (mínimo 1).
 *
 * ── Qué NO modela ───────────────────────────────────────────────────────────
 *
 * La concurrencia de Firestore real es PESIMISTA en el servidor para las bibliotecas de servidor (cada
 * transacción bloquea los documentos que lee y los que escribe hasta confirmar, y las demás esperan). Aquí
 * se modela con un bloqueo EXCLUSIVO por documento (FIFO) tomado al leer dentro de una transacción y, para las
 * escrituras a ciegas, al confirmar; una escritura suelta espera si el documento está bloqueado, y las lecturas
 * sueltas no esperan. El bloqueo se mantiene mientras dura la RPC de confirmación (`latencia.commit`). Es un
 * MODELO: sirve para ver QUÉ se serializa y en qué orden, no para predecir cuánto espera Firestore de verdad
 * (el tiempo de servicio real de un documento caliente es un dato desconocido). Tampoco hay índices (una
 * consulta compuesta sin índice funciona aquí y falla en producción), ni reglas de seguridad, ni límites de
 * tamaño de documento. La latencia real de una RPC NO se mide aquí: es el parámetro `latencia`.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const requerir = createRequire(path.join(RAIZ, 'functions', 'package.json'));
const { Timestamp } = requerir('firebase-admin/firestore');

const ELIMINAR = Symbol('eliminar');
const nombreDeTipo = (v) => (v && typeof v === 'object' ? v.constructor?.name : undefined);
const esPlano = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const TRANSFORMS = new Set(['NumericIncrementTransform', 'ArrayUnionTransform', 'ArrayRemoveTransform', 'ServerTimestampTransform', 'DeleteTransform']);
const esTransform = (v) => TRANSFORMS.has(nombreDeTipo(v));

/** Tamaño aproximado de lo que viaja en una escritura: JSON de los datos (los Timestamp y las transformaciones pesan unos pocos bytes). */
const tamanio = (datos) => {
  try {
    return JSON.stringify(datos, (k, v) => (typeof v === 'bigint' ? Number(v) : v)).length;
  } catch {
    return 0;
  }
};

export const copia = (v) => {
  if (Array.isArray(v)) return v.map(copia);
  if (esPlano(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copia(x)]));
  return v;
};
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Lo que hace el SDK real antes de enviar nada: rechaza `undefined` a cualquier profundidad. */
const rechazaUndefined = (valor, ruta = '') => {
  if (valor === undefined) {
    throw new Error(`Value for argument "data" is not a valid Firestore document. Cannot use "undefined" as a Firestore value${ruta ? ` (found in field "${ruta}").` : '.'}`);
  }
  if (Array.isArray(valor)) valor.forEach((x, i) => rechazaUndefined(x, `${ruta}.${i}`));
  else if (esPlano(valor)) for (const [k, x] of Object.entries(valor)) rechazaUndefined(x, ruta ? `${ruta}.${k}` : k);
};

const resolver = (valor, previo) => {
  switch (nombreDeTipo(valor)) {
    case 'NumericIncrementTransform': return (typeof previo === 'number' ? previo : 0) + valor.operand;
    case 'ServerTimestampTransform': return Timestamp.now();
    case 'DeleteTransform': return ELIMINAR;
    case 'ArrayUnionTransform': {
      const base = Array.isArray(previo) ? [...previo] : [];
      for (const e of valor.elements) if (!base.some((x) => igual(x, e))) base.push(copia(e));
      return base;
    }
    case 'ArrayRemoveTransform': return (Array.isArray(previo) ? previo : []).filter((x) => !valor.elements.some((e) => igual(x, e)));
    default:
  }
  if (Array.isArray(valor)) return valor.map((x) => resolver(x, undefined));
  if (esPlano(valor)) {
    const out = {};
    for (const [k, x] of Object.entries(valor)) {
      const r = resolver(x, esPlano(previo) ? previo[k] : undefined);
      if (r !== ELIMINAR) out[k] = r;
    }
    return out;
  }
  return valor;
};
const fusionar = (previo, datos) => {
  const out = { ...previo };
  for (const [k, v] of Object.entries(datos)) {
    if (esPlano(v) && !esTransform(v)) out[k] = fusionar(esPlano(previo?.[k]) ? previo[k] : {}, v);
    else {
      const r = resolver(v, previo?.[k]);
      if (r === ELIMINAR) delete out[k];
      else out[k] = r;
    }
  }
  return out;
};
const leerRuta = (obj, segs) => segs.reduce((o, k) => (o == null ? undefined : o[k]), obj);
const escribirRuta = (obj, segs, valor) => {
  let cursor = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    if (!esPlano(cursor[segs[i]])) cursor[segs[i]] = {};
    cursor = cursor[segs[i]];
  }
  if (valor === ELIMINAR) delete cursor[segs[segs.length - 1]];
  else cursor[segs[segs.length - 1]] = valor;
};
const actualizar = (previo, datos) => {
  const out = copia(previo);
  for (const [clave, v] of Object.entries(datos)) {
    const segs = clave.split('.');
    escribirRuta(out, segs, resolver(v, leerRuta(previo, segs)));
  }
  return out;
};

const errorDeFirestore = (code, mensaje) => Object.assign(new Error(mensaje), { code });
const ALREADY_EXISTS = (p) => errorDeFirestore(6, `6 ALREADY_EXISTS: Document already exists: ${p}`);
const NOT_FOUND = (p) => errorDeFirestore(5, `5 NOT_FOUND: No document to update: ${p}`);

const valorDeCampo = (datos, campo) => {
  if (campo && typeof campo === 'object') return undefined;
  return String(campo).split('.').reduce((o, k) => (o == null ? undefined : o[k]), datos);
};
const comparable = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : v);
const comparar = (a, b) => {
  const x = comparable(a);
  const y = comparable(b);
  if (x === y) return 0;
  if (x === undefined) return -1;
  if (y === undefined) return 1;
  return x < y ? -1 : 1;
};
const cumple = (datos, id, [campo, op, valor]) => {
  const v = campo && typeof campo === 'object' ? id : valorDeCampo(datos, campo);
  switch (op) {
    case '==': return comparar(v, valor) === 0 && (v !== undefined || valor === undefined);
    case '!=': return comparar(v, valor) !== 0;
    case '<': return v !== undefined && comparar(v, valor) < 0;
    case '<=': return v !== undefined && comparar(v, valor) <= 0;
    case '>': return v !== undefined && comparar(v, valor) > 0;
    case '>=': return v !== undefined && comparar(v, valor) >= 0;
    case 'array-contains': return Array.isArray(v) && v.some((x) => igual(x, valor));
    case 'in': return Array.isArray(valor) && valor.some((x) => comparar(v, x) === 0);
    default: throw new Error(`el doble de Firestore no conoce el operador «${op}»`);
  }
};

/** Agrega las entradas del registro: RPC por tipo, facturación (lecturas / escrituras / borrados) y reparto por colección y documento. */
export const resumir = (entradas) => {
  const porTipo = {};
  const porColeccion = {};
  const porDocumento = {};
  let lecturas = 0;
  let escrituras = 0;
  let borrados = 0;
  let bytesEscritos = 0;
  const tocar = (mapa, clave, campo, n = 1) => {
    const fila = (mapa[clave] = mapa[clave] || { lecturas: 0, escrituras: 0, borrados: 0, bytes: 0 });
    fila[campo] += n;
  };
  const patron = (p) => p.split('/').map((s, i) => (i % 2 === 1 ? '*' : s)).join('/');
  for (const e of entradas) {
    if (e.almacen) continue;
    porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1;
    for (const p of e.lee ?? []) {
      lecturas++;
      tocar(porDocumento, p, 'lecturas');
      tocar(porColeccion, patron(p), 'lecturas');
    }
    /* Una consulta sin resultados también factura una lectura. */
    if (e.consulta && !e.noContarDocs && !(e.lee ?? []).length) {
      lecturas++;
      tocar(porColeccion, patron(`${e.consulta}/x`), 'lecturas');
    }
    for (const [i, p] of (e.escribe ?? []).entries()) {
      escrituras++;
      tocar(porDocumento, p, 'escrituras');
      tocar(porColeccion, patron(p), 'escrituras');
      const b = e.bytesPorDoc?.[i] ?? 0;
      bytesEscritos += b;
      tocar(porDocumento, p, 'bytes', b);
      tocar(porColeccion, patron(p), 'bytes', b);
    }
    for (const p of e.borra ?? []) {
      borrados++;
      tocar(porDocumento, p, 'borrados');
      tocar(porColeccion, patron(p), 'borrados');
    }
    if (e.lecturasExtra) {
      lecturas += e.lecturasExtra;
      tocar(porColeccion, patron(`${e.consulta}/x`), 'lecturas', e.lecturasExtra);
    }
  }
  const rpc = entradas.filter((e) => !e.almacen).length;
  return { rpc, porTipo, lecturas, escrituras, borrados, bytesEscritos, porColeccion, porDocumento };
};

class Ref {
  constructor(banco, ruta) {
    this.banco = banco;
    this.path = ruta;
    this.id = ruta.split('/').pop();
  }
  get parent() {
    const partes = this.path.split('/');
    return new Consulta(this.banco, partes.slice(0, -1).join('/'));
  }
  collection(sub) {
    return new Consulta(this.banco, `${this.path}/${sub}`);
  }
  async get() {
    return this.banco._leerDoc(this, null);
  }
  async create(datos) {
    await this.banco._escribirSuelto({ tipo: 'create', ref: this, datos });
  }
  async set(datos, opciones) {
    await this.banco._escribirSuelto({ tipo: 'set', ref: this, datos, merge: !!opciones?.merge });
  }
  async update(datos) {
    await this.banco._escribirSuelto({ tipo: 'update', ref: this, datos });
  }
  async delete() {
    await this.banco._escribirSuelto({ tipo: 'delete', ref: this });
  }
  isEqual(otra) {
    return otra && otra.path === this.path;
  }
}

class Consulta {
  constructor(banco, ruta, estado = {}) {
    this.banco = banco;
    this.path = ruta;
    this.estado = { filtros: [], orden: [], tope: null, despues: null, ...estado };
  }
  _otra(cambios) {
    return new Consulta(this.banco, this.path, { ...this.estado, ...cambios });
  }
  get id() {
    return this.path.split('/').pop();
  }
  doc(id) {
    return new Ref(this.banco, `${this.path}/${id ?? this.banco._autoId()}`);
  }
  async add(datos) {
    const ref = this.doc();
    await ref.create(datos);
    return ref;
  }
  where(campo, op, valor) {
    return this._otra({ filtros: [...this.estado.filtros, [campo, op, valor]] });
  }
  orderBy(campo, dir = 'asc') {
    return this._otra({ orden: [...this.estado.orden, [campo, dir]] });
  }
  limit(n) {
    return this._otra({ tope: n });
  }
  startAfter(valor) {
    return this._otra({ despues: valor });
  }
  select() {
    return this;
  }
  count() {
    return {
      get: async () => {
        const docs = this.banco._filtrar(this);
        await this.banco._rpc({ tipo: 'agregacion', consulta: this.path, lecturasExtra: Math.max(1, Math.ceil(docs.length / 1000)), noContarDocs: true }, this.banco.latencia.query);
        return { data: () => ({ count: docs.length }) };
      },
    };
  }
  async get() {
    return this.banco._consultar(this, null);
  }
}

class Tx {
  constructor(banco, numero) {
    this.banco = banco;
    this.numero = numero;
    this.leidas = new Map();
    this.escrituras = [];
    this.empezada = false;
  }
  async get(objetivo) {
    this.empezada = true;
    if (objetivo instanceof Consulta) return this.banco._consultar(objetivo, this);
    return this.banco._leerDoc(objetivo, this);
  }
  create(ref, datos) {
    this.escrituras.push({ tipo: 'create', ref, datos });
    return this;
  }
  set(ref, datos, opciones) {
    this.escrituras.push({ tipo: 'set', ref, datos, merge: !!opciones?.merge });
    return this;
  }
  update(ref, datos) {
    this.escrituras.push({ tipo: 'update', ref, datos });
    return this;
  }
  delete(ref) {
    this.escrituras.push({ tipo: 'delete', ref });
    return this;
  }
}

class Lote {
  constructor(banco) {
    this.banco = banco;
    this.ops = [];
  }
  set(ref, datos, opciones) {
    this.ops.push({ tipo: 'set', ref, datos, merge: !!opciones?.merge });
    return this;
  }
  update(ref, datos) {
    this.ops.push({ tipo: 'update', ref, datos });
    return this;
  }
  create(ref, datos) {
    this.ops.push({ tipo: 'create', ref, datos });
    return this;
  }
  delete(ref) {
    this.ops.push({ tipo: 'delete', ref });
    return this;
  }
  async commit() {
    if (!this.ops.length) return [];
    const banco = this.banco;
    const dueno = `l${++banco._op}`;
    for (const p of [...new Set(this.ops.map((o) => o.ref.path))].sort()) await banco._adquirir(p, dueno);
    try {
      await banco._rpc(
        { tipo: 'lote', escribe: this.ops.filter((o) => o.tipo !== 'delete').map((o) => o.ref.path), bytesPorDoc: this.ops.filter((o) => o.tipo !== 'delete').map((o) => tamanio(o.datos)), borra: this.ops.filter((o) => o.tipo === 'delete').map((o) => o.ref.path) },
        banco.latencia.write,
      );
      banco._aplicarTodas(this.ops);
    } finally {
      banco._liberar(dueno);
    }
    return [];
  }
}

/**
 * @param {object} o
 * @param {ReturnType<import('./reloj-virtual.mjs').crearRelojVirtual>} o.reloj
 * @param {{get?:number, query?:number, write?:number, commit?:number}} [o.latencia]  ms virtuales por RPC.
 */
export function crearBanco({ reloj, latencia = {} }) {
  const banco = {
    reloj,
    latencia: { get: 1, query: 1, write: 1, commit: 1, ...latencia },
    docs: new Map(),
    log: [],
    conflictos: 0,
    fallos: [],
    _auto: 0,
    _tx: 0,
    _op: 0,
    etiqueta: '',
    bloqueos: new Map(),
    /** Esperas por un bloqueo de documento: `{ ruta, ms }` (solo las que de verdad esperaron). */
    esperasDeBloqueo: [],
    /** Tiempo máximo esperando un bloqueo antes de abortar (ABORTED), en ms virtuales. */
    maxEsperaDeBloqueo: 20_000,

    /* ── API pública del doble ─────────────────────────────────────────── */
    collection: (ruta) => new Consulta(banco, ruta),
    doc: (ruta) => new Ref(banco, ruta),
    batch: () => new Lote(banco),
    async getAll(...refs) {
      const salida = [];
      for (const r of refs) salida.push(await r.get());
      return salida;
    },
    runTransaction: (fn, opciones = {}) => banco._transaccion(fn, opciones),

    /* ── Utilidades de la prueba (no cuentan ni tardan) ────────────────── */
    sembrar(ruta, datos) {
      banco.docs.set(ruta, { datos: copia(datos), version: 1 });
    },
    leer(ruta) {
      const d = banco.docs.get(ruta);
      return d ? copia(d.datos) : undefined;
    },
    existe: (ruta) => banco.docs.has(ruta),
    hijos(coleccion) {
      return [...banco.docs.entries()]
        .filter(([p]) => p.startsWith(`${coleccion}/`) && !p.slice(coleccion.length + 1).includes('/'))
        .map(([p, d]) => ({ id: p.slice(coleccion.length + 1), ...copia(d.datos) }));
    },
    /** Marca el punto de partida de una medida; `desde(marca)` devuelve lo ocurrido después. */
    marca: () => banco.log.length,
    desde: (marca) => banco.log.slice(marca),
    resumen: (marca = 0) => resumir(banco.log.slice(marca)),
    etiquetar(texto) {
      banco.etiqueta = texto;
    },
    /** Hace que la próxima(s) RPC que cumpla(n) `cuando` falle(n) con `error`. */
    inyectarFallo(cuando, { veces = 1, error = errorDeFirestore(14, '14 UNAVAILABLE: la base no contesta (inyectado por la prueba)') } = {}) {
      const regla = { cuando, restantes: veces, error, disparado: 0 };
      banco.fallos.push(regla);
      return regla;
    },

    /* ── Bloqueos por documento (modelo pesimista, FIFO) ───────────────── */
    _adquirir(ruta, dueno) {
      let b = banco.bloqueos.get(ruta);
      if (!b) banco.bloqueos.set(ruta, (b = { dueno: null, cola: [] }));
      if (b.dueno === null || b.dueno === dueno) {
        b.dueno = dueno;
        return Promise.resolve();
      }
      const desde = reloj.ahora;
      return new Promise((resolve, reject) => {
        const turno = {
          dueno,
          resolve: () => {
            clearTimeout(turno.timer);
            banco.esperasDeBloqueo.push({ ruta, ms: reloj.ahora - desde });
            resolve();
          },
        };
        turno.timer = setTimeout(() => {
          b.cola = b.cola.filter((x) => x !== turno);
          reject(errorDeFirestore(10, `10 ABORTED: espera de bloqueo agotada en ${ruta}`));
        }, banco.maxEsperaDeBloqueo);
        b.cola.push(turno);
      });
    },
    _liberar(dueno) {
      for (const [ruta, b] of [...banco.bloqueos]) {
        if (b.dueno !== dueno) continue;
        const siguiente = b.cola.shift();
        b.dueno = siguiente ? siguiente.dueno : null;
        if (siguiente) siguiente.resolve();
        else banco.bloqueos.delete(ruta);
      }
    },

    /* ── Internos ──────────────────────────────────────────────────────── */
    _autoId: () => `auto${String(++banco._auto).padStart(16, '0')}`,
    _snapDoc(ref, d) {
      const datos = d ? copia(d.datos) : undefined;
      return { exists: !!d, id: ref.id, ref, data: () => datos, get: (campo) => (datos ? valorDeCampo(datos, campo) : undefined), updateTime: undefined };
    },
    async _rpc(entrada, latencia) {
      const e = { n: ++banco._op, etiqueta: banco.etiqueta, desde: reloj.ahora, ...entrada };
      banco.log.push(e);
      if (latencia > 0) await reloj.dormir(latencia);
      else await Promise.resolve();
      e.hasta = reloj.ahora;
      const regla = banco.fallos.find((f) => f.restantes > 0 && f.cuando(e));
      if (regla) {
        regla.restantes--;
        regla.disparado++;
        e.fallo = String(regla.error.message);
        throw regla.error;
      }
      return e;
    },
    async _leerDoc(ref, tx) {
      if (tx) await banco._adquirir(ref.path, `tx${tx.numero}`);
      const e = await banco._rpc({ tipo: tx ? 'tx-get' : 'get', lee: [ref.path], tx: tx?.numero ?? null }, banco.latencia.get);
      const d = banco.docs.get(ref.path);
      if (tx) tx.leidas.set(ref.path, d ? d.version : 0);
      e.existe = !!d;
      return banco._snapDoc(ref, d);
    },
    _filtrar(consulta) {
      const { filtros, orden, tope, despues } = consulta.estado;
      let filas = [...banco.docs.entries()].filter(([p]) => p.startsWith(`${consulta.path}/`) && !p.slice(consulta.path.length + 1).includes('/'));
      filas = filas.filter(([p, d]) => filtros.every((f) => cumple(d.datos, p.split('/').pop(), f)));
      if (orden.length) {
        filas.sort(([pa, a], [pb, b]) => {
          for (const [campo, dir] of orden) {
            const porId = campo && typeof campo === 'object';
            const va = porId ? pa.split('/').pop() : valorDeCampo(a.datos, campo);
            const vb = porId ? pb.split('/').pop() : valorDeCampo(b.datos, campo);
            const c = comparar(va, vb);
            if (c !== 0) return dir === 'desc' ? -c : c;
          }
          return 0;
        });
      } else {
        /* Sin orden, Firestore devuelve por identificador. */
        filas.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      }
      if (despues !== null && orden.length && orden[0][0] && typeof orden[0][0] === 'object') filas = filas.filter(([p]) => p.split('/').pop() > despues);
      if (tope) filas = filas.slice(0, tope);
      return filas;
    },
    async _consultar(consulta, tx) {
      if (tx) for (const [p] of banco._filtrar(consulta)) await banco._adquirir(p, `tx${tx.numero}`);
      const e = await banco._rpc({ tipo: tx ? 'tx-consulta' : 'consulta', consulta: consulta.path, lee: [], tx: tx?.numero ?? null }, banco.latencia.query);
      /* La lectura se hace al terminar la espera: así se ve lo que cambió mientras tanto. */
      const filas = banco._filtrar(consulta);
      e.lee = filas.map(([p]) => p);
      e.devueltos = filas.length;
      if (tx) for (const [p, d] of filas) tx.leidas.set(p, d.version);
      const docs = filas.map(([p, d]) => banco._snapDoc(new Ref(banco, p), d));
      return { docs, empty: !docs.length, size: docs.length, forEach: (fn) => docs.forEach(fn) };
    },
    _aplicarUna(w) {
      const p = w.ref.path;
      const previo = banco.docs.get(p);
      if (w.tipo === 'delete') {
        banco.docs.delete(p);
        return;
      }
      rechazaUndefined(w.datos);
      if (w.tipo === 'create') {
        if (previo) throw ALREADY_EXISTS(p);
        banco.docs.set(p, { datos: resolver(w.datos, undefined), version: 1 });
        return;
      }
      if (w.tipo === 'set') {
        const datos = w.merge ? fusionar(previo?.datos ?? {}, w.datos) : resolver(w.datos, undefined);
        banco.docs.set(p, { datos, version: (previo?.version ?? 0) + 1 });
        return;
      }
      if (w.tipo === 'update') {
        if (!previo) throw NOT_FOUND(p);
        banco.docs.set(p, { datos: actualizar(previo.datos, w.datos), version: previo.version + 1 });
        return;
      }
      throw new Error(`escritura desconocida ${w.tipo}`);
    },
    _aplicarTodas(ws) {
      /* Todo o nada: si una escritura falla, no queda ninguna (como un Commit). */
      const respaldo = new Map();
      for (const w of ws) if (!respaldo.has(w.ref.path)) respaldo.set(w.ref.path, banco.docs.get(w.ref.path));
      try {
        for (const w of ws) banco._aplicarUna(w);
      } catch (error) {
        for (const [p, d] of respaldo) {
          if (d === undefined) banco.docs.delete(p);
          else banco.docs.set(p, d);
        }
        throw error;
      }
    },
    async _escribirSuelto(w) {
      const base = w.tipo === 'delete' ? { borra: [w.ref.path] } : { escribe: [w.ref.path], bytesPorDoc: [tamanio(w.datos)] };
      if (w.tipo !== 'delete') rechazaUndefined(w.datos);
      const dueno = `w${++banco._op}`;
      await banco._adquirir(w.ref.path, dueno);
      try {
        await banco._rpc({ tipo: w.tipo, ...base }, banco.latencia.write);
        banco._aplicarTodas([w]);
      } finally {
        banco._liberar(dueno);
      }
    },
    async _transaccion(fn, opciones) {
      const maximo = opciones.maxAttempts ?? 5;
      const numero = ++banco._tx;
      const dueno = `tx${numero}`;
      let ultimo;
      for (let intento = 1; intento <= maximo; intento++) {
        if (intento > 1) await reloj.dormir(1000 * 1.5 ** (intento - 2));
        const tx = new Tx(banco, numero);
        let resultado;
        try {
          try {
            resultado = await fn(tx);
          } catch (error) {
            /* Rollback de «mejor esfuerzo»: una RPC que no se espera. */
            if (tx.empezada) banco.log.push({ n: ++banco._op, etiqueta: banco.etiqueta, desde: reloj.ahora, hasta: reloj.ahora, tipo: 'tx-rollback', tx: numero });
            throw error;
          }
          const escribe = tx.escrituras.filter((w) => w.tipo !== 'delete').map((w) => w.ref.path);
          const borra = tx.escrituras.filter((w) => w.tipo === 'delete').map((w) => w.ref.path);
          const bytesPorDoc = tx.escrituras.filter((w) => w.tipo !== 'delete').map((w) => tamanio(w.datos));
          if (!tx.empezada && !tx.escrituras.length) return resultado;
          for (const w of tx.escrituras) if (w.tipo !== 'delete') rechazaUndefined(w.datos);
          /* Las escrituras a ciegas toman su bloqueo al confirmar, en orden, para no provocar interbloqueos. */
          for (const p of [...new Set(tx.escrituras.map((w) => w.ref.path))].sort()) await banco._adquirir(p, dueno);
          const e = await banco._rpc({ tipo: 'tx-commit', escribe, bytesPorDoc, borra, tx: numero, intento, soloLiberar: !tx.escrituras.length }, banco.latencia.commit);
          /* Con los bloqueos tomados no debería cambiar nada de lo leído; si cambia, es un fallo del modelo y se ve. */
          const choque = [...tx.leidas].some(([p, version]) => (banco.docs.get(p)?.version ?? 0) !== version);
          if (choque) {
            banco.conflictos++;
            e.conflicto = true;
            ultimo = errorDeFirestore(10, '10 ABORTED: too much contention on these documents. Please try again.');
            continue;
          }
          banco._aplicarTodas(tx.escrituras);
          return resultado;
        } catch (error) {
          if (error?.code === 10 && /espera de bloqueo/.test(String(error.message))) {
            banco.conflictos++;
            ultimo = error;
            continue;
          }
          throw error;
        } finally {
          banco._liberar(dueno);
        }
      }
      throw ultimo;
    },
  };
  return banco;
}

/** Almacén (Cloud Storage) doble: solo cuenta y tarda; no guarda bytes. */
export function crearAlmacenDoble({ reloj, banco, latencia = {}, nombreDelCubo = 'demo-wee.firebasestorage.app' }) {
  const lat = { metadata: 1, descarga: 1, guardar: 1, ...latencia };
  const llamadas = [];
  /** `conDimensiones`: el archivo trae `width`/`height` como metadatos (lo normal cuando lo sube la app). */
  const config = { conDimensiones: true };
  const registrar = async (tipo, ruta, ms) => {
    const e = { n: ++banco._op, etiqueta: banco.etiqueta, desde: reloj.ahora, tipo: `almacen-${tipo}`, almacen: true, ruta };
    banco.log.push(e);
    llamadas.push(e);
    await reloj.dormir(ms);
    e.hasta = reloj.ahora;
  };
  const archivo = (ruta) => ({
    name: ruta,
    async getMetadata() {
      await registrar('metadata', ruta, lat.metadata);
      return [{ contentType: 'image/png', size: '1048576', metadata: config.conDimensiones ? { width: '1024', height: '768' } : {} }];
    },
    async download() {
      await registrar('descarga', ruta, lat.descarga);
      return [Buffer.alloc(1_048_576)];
    },
    async save() {
      await registrar('guardar', ruta, lat.guardar);
    },
    async exists() {
      await registrar('existe', ruta, lat.metadata);
      return [true];
    },
  });
  const cubo = { name: nombreDelCubo, file: archivo };
  return { cubo, getStorage: () => ({ bucket: () => cubo }), llamadas, config };
}
