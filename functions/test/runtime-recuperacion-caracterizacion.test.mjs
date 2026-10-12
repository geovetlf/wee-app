/**
 * R7 · M-04 — CARACTERIZACIÓN DE LA COLA DURABLE Y DE LA RECUPERACIÓN DE TRABAJOS.
 *
 * Esta suite NO arregla nada y NO cambia comportamiento: MIDE lo que el código hace HOY cuando un proceso muere, un
 * trabajo se queda a medias, un aviso llega dos veces o el barrido no llega a un trabajo, y lo FIJA tal cual. Es el
 * contrato de lo que existe, y la base sobre la que se decidirá M-05 (recuperar huérfanos en el barrido).
 *
 * Dos clases de comprobación, y se distinguen por el nombre:
 *
 *   · CONTRATO. Lo que hoy es correcto. Si falla, se rompió algo que funcionaba.
 *   · BLOCKED — HUMAN DECISION. Lo que hoy es MALO (una reserva retenida sin fin, un reintento que recibe «ya en curso»
 *     para siempre, una tarea viva en el proveedor que Weë no puede nombrar) y está fijado TAL CUAL a propósito, para no
 *     normalizarlo: es una bandera. El día que alguien lo corrija, esa comprobación FALLARÁ, y quien la vea debe
 *     actualizar `docs/RUNTIME-RECUPERACION-CARACTERIZACION.md` y retirar la bandera —no «arreglar la prueba»—.
 *
 * Las de A son guardas del CABLEADO de hoy (quién llama a quién): conectar la recuperación (M-05) las moverá A PROPÓSITO —y
 * es lo que tienen que hacer—; entonces se actualizan junto con el documento. B, F, G y H miden las piezas por separado: no
 * dependen de que alguien las llame.
 *
 * ── Cómo se «mata» un proceso aquí ──────────────────────────────────────────
 *
 * Todo lo que Weë sabe de un trabajo está en el almacén. Un proceso que muere deja exactamente lo que ya había escrito
 * y nada de lo que iba a escribir después. Así que la muerte se modela en el Firestore en memoria: la escritura N-ésima
 * a `jobs/` NO se aplica y quien la pidió se queda esperando para siempre (ni siquiera falla: no corre ningún `catch`,
 * ni ningún `finally`, como en un SIGKILL). Lo que ve esta suite después es lo que vería el barrido real.
 *
 * Se usa el compilado y las piezas de VERDAD —la puerta `generateVideo`, el conductor, el Job Engine, el almacén de
 * trabajos, el reconciliador, el barrendero y el Credit Engine— sobre un Firestore en memoria. De mentira solo está lo que
 * queda al otro lado de la red: el adaptador de Seedance, lo que ModelArk contesta cuando se le pregunta y el almacén de
 * vídeos. Ninguna petición sale de la máquina, ningún emulador, ninguna clave.
 *
 * Cada escenario dice si lo EJECUTA esta suite o solo lo INFIERE de leer el código (ver el documento).
 *
 *   A · Qué mecanismos de recuperación existen DE VERDAD hoy (guardas sobre el código: quién llama a quién).
 *   B · Las máquinas de estado: qué haría `evaluar` con cada trabajo atascado, y qué haría el dinero.
 *   C · El proceso muere después de aceptar un trabajo: cuatro momentos.
 *   D · Un trabajo sin referencia del proveedor: tres formas de quedarse así.
 *   E · La reserva de Credits de un trabajo que no se completa: qué ve el barrido, y qué la recupera.
 *   F · Reanudar tras un reinicio: ¿otro trabajador retoma, con un solo POST?
 *   G · Duplicados, reintentos y avisos repetidos.
 *   H · Cancelar mientras se recupera.
 *   I · La inanición del barrido: la ventana de 10×100 y las 12 preguntas.
 *   J · El camino legacy, que es el vivo con la puerta cerrada.
 *
 * Usa el compilado: `npm run build` antes de `npm test`.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
/* Con memoria: las guardas de A recorren cientos de archivos varias veces, y leer del disco es lo que más tarda de toda la suite. */
const memoriaDeLecturas = new Map();
const leer = (p) => { if (!memoriaDeLecturas.has(p)) memoriaDeLecturas.set(p, fs.readFileSync(path.resolve(RAIZ, p), 'utf8')); return memoriaDeLecturas.get(p); };
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const memoriaDeLimpios = new Map();
const limpio = (p) => { if (!memoriaDeLimpios.has(p)) memoriaDeLimpios.set(p, sinComentarios(leer(p))); return memoriaDeLimpios.get(p); };

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
/**
 * UNA BANDERA: lo que hoy es MALO, fijado tal cual. Pasa mientras el defecto exista; FALLA el día que se corrija, y
 * entonces hay que actualizar el documento de caracterización (no «arreglar» la comprobación).
 */
const bandera = (nombre, cond, detalle = '') => check(`BLOCKED — HUMAN DECISION · ${nombre}`, cond,
  cond ? detalle : `${detalle ? `${detalle} · ` : ''}LA BANDERA CAYÓ: el comportamiento CAMBIÓ — actualizar docs/RUNTIME-RECUPERACION-CARACTERIZACION.md y retirar la bandera, no «arreglar» la comprobación`);
/** Lo medido, sin ✔/✘: no cuenta como comprobación. Es lo que el documento copia. */
const medida = (texto) => console.log(`  · ${texto}`);
const intento = async (fn) => { try { return { ok: true, valor: await fn() }; } catch (error) { return { ok: false, error }; } };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const esperarHasta = async (cond, ms = 20_000) => { const fin = Date.now() + ms; while (!cond()) { if (Date.now() > fin) throw new Error('esperarHasta: no ocurrió'); await dormir(2); } };

/* ═══ El reloj: la puerta, el conductor y el Credit Engine leen `Date.now`, y aquí se adelanta ═══ */
const relojReal = Date.now.bind(Date);
let adelanto = 0;
Date.now = () => relojReal() + adelanto;
const SEG = 1000;
const MINUTO = 60 * SEG;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
const HORAS_2_15 = 2 * HORA + 15 * MINUTO;

/* ═══ Firestore en memoria, con lo que piden el almacén de trabajos, el libro y el Credit Engine ═══ */
const fa = require('firebase-admin/firestore');
const esTipo = (v, nombre) => !!v && typeof v === 'object' && v.constructor?.name === nombre;
const esPlano = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const copia = (v) => (Array.isArray(v) ? v.map(copia) : esPlano(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copia(x)])) : v);
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
const leerCampo = (d, f) => f.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d);
const yaExiste = (p) => Object.assign(new Error(`ALREADY_EXISTS: ${p}`), { code: 6 });
/** Lo que se lanza DENTRO de una transacción para matar al proceso en ella: el borde de fuera lo convierte en «nunca vuelve». */
const MUERTE = Symbol('el proceso murió aquí');
const esDeTrabajos = (p) => p.startsWith('jobs/');

class Base {
  constructor() { this.docs = new Map(); this.cola = Promise.resolve(); this.auto = 0; this.matar = null; }
  collection(p) { return new Consulta(this, p); }
  doc(p) { return new Ref(this, p); }
  /**
   * Transacciones en fila, como las serializa Firestore: lo que una escribe lo lee la siguiente.
   * Con `this.matar` armado, la escritura N-ésima a `jobs/` no se aplica y quien la pidió no vuelve jamás: la fila de las
   * demás transacciones SÍ se libera (otro proceso sigue vivo), pero el que murió no recibe ni el éxito ni el error.
   */
  runTransaction(fn) {
    const correr = async () => {
      const tx = new Tx(this);
      const r = await fn(tx);
      if (this.matar && tx.escrituras.some((w) => esDeTrabajos(w.ref.path))) {
        this.matar.cuenta++;
        if (this.matar.cuenta === this.matar.en) { this.matar.disparado = true; throw MUERTE; }
      }
      tx.confirmar();
      return r;
    };
    const p = this.cola.then(correr, correr);
    this.cola = p.catch(() => {});
    return p.catch((e) => (e === MUERTE ? new Promise(() => {}) : Promise.reject(e)));
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
  de(c) { return [...this.docs.entries()].filter(([p]) => p.startsWith(`${c}/`) && !p.slice(c.length + 1).includes('/')).map(([p, d]) => ({ id: p.slice(c.length + 1), ...d })); }
}
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
class Ref {
  constructor(base, p) { this.base = base; this.path = p; this.id = p.split('/').pop(); }
  collection(c) { return new Consulta(this.base, `${this.path}/${c}`); }
  async get() { return foto(this, this.base.leer(this.path)); }
  /** La creación de un trabajo (`create`, no transacción) es la PRIMERA escritura a `jobs/`: también se puede morir en ella. */
  async create(data) {
    const m = this.base.matar;
    if (m && esDeTrabajos(this.path)) {
      m.cuenta++;
      if (m.cuenta === m.en) { m.disparado = true; return new Promise(() => {}); }
    }
    escribir(this.base, { tipo: 'create', ref: this, data });
  }
  async set(data, opts) { escribir(this.base, { tipo: 'set', ref: this, data, merge: !!opts?.merge }); }
  async update(data) { escribir(this.base, { tipo: 'update', ref: this, data }); }
  async delete() { this.base.docs.delete(this.path); }
}
class Consulta {
  constructor(base, p, filtros = [], tope = null, porId = false, despues = null) { Object.assign(this, { base, path: p, filtros, tope, porId, despues }); }
  doc(id) { return new Ref(this.base, `${this.path}/${id ?? `auto_${++this.base.auto}`}`); }
  otra(cambios) { return Object.assign(new Consulta(this.base, this.path, this.filtros, this.tope, this.porId, this.despues), cambios); }
  where(campo, op, valor) {
    if (op !== '==' && op !== 'array-contains') throw new Error(`esta base de prueba solo sabe «==» y «array-contains»: ${op}`);
    return this.otra({ filtros: [...this.filtros, [campo, op, valor]] });
  }
  /* El único orden que usan el almacén de trabajos y el barrendero: por el identificador del documento. */
  orderBy() { return this.otra({ porId: true }); }
  startAfter(cursor) { return this.otra({ despues: cursor }); }
  limit(tope) { return this.otra({ tope }); }
  count() { return { get: async () => { const s = await this.get(); return { data: () => ({ count: s.size }) }; } }; }
  async get() {
    let filas = [...this.base.docs.entries()].filter(([p]) => p.startsWith(`${this.path}/`) && !p.slice(this.path.length + 1).includes('/'));
    filas = filas.filter(([, d]) => this.filtros.every(([f, op, v]) => (op === '==' ? leerCampo(d, f) === v : Array.isArray(leerCampo(d, f)) && leerCampo(d, f).includes(v))));
    if (this.porId) filas.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
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

/** La base de ESTE escenario. Cada escenario estrena la suya: ninguno ve los trabajos ni el reloj de otro. */
let base = new Base();
fa.getFirestore = () => base;

/* ═══ Las piezas de verdad ═══════════════════════════════════════════════ */
const video = lib('creator/video.js');
const rt = lib('runtime/index.js');
const core = lib('core/index.js');
const { olvidarLaPuerta } = lib('runtime/configuracion.js');
const { almacenDeTrabajos } = lib('runtime/almacen.js');
const { colaDeInvocacion } = lib('runtime/cola.js');
const { atenderEntrega, barrerRecuperables } = lib('job/worker.js');
const { crearMotorDeTrabajosDeWee, crearTrabajo } = lib('job/index.js');
const { creditEngine } = lib('credits/creditEngine.js');
const { ProviderError } = lib('engine/http.js');
const { leerAvisoDeSeedance } = lib('engine/providers/seedance.js');
const { ADAPTERS } = lib('engine/registry.js');
const { videoEngine } = lib('engine/video.js');
const { usageTransactionId } = lib('credits/creditTransactions.js');
/** El informe manual de reservas colgadas (`ops/`): SOLO LECTURA; se importa su función pura, no se ejecuta nada contra producción. */
const manual = await import(pathToFileURL(path.resolve(RAIZ, 'ops/reconciliacion/reservas-colgadas.mjs')).href);

/* ═══ Lo que está al otro lado de la red, de mentira ═════════════════════ */

/** El adaptador de Seedance: acepta y suelta, rechaza el POST, o no contesta nunca. Nada sale de aquí. */
const seedance = ADAPTERS.seedance;
const llamadas = [];
let modelArk = null;
seedance.isConfigured = () => true;
seedance.run = async (req) => {
  llamadas.push({ capability: req.capability, acceptAsync: req.acceptAsync, input: req.input });
  return modelArk(req);
};
let serieDeTareas = 0;
/** Las tareas que ModelArk TIENE (las que aceptó): lo que Weë no ve si no la guardó. */
const tareasEnModelArk = [];
const aceptar = () => async (req) => {
  const taskId = `cgt-cola-${String(++serieDeTareas).padStart(4, '0')}`;
  tareasEnModelArk.push(taskId);
  return { accepted: { operationId: taskId }, costUSD: 0.21, latencyMs: 4, model: req.model?.id, meta: { providerTaskId: taskId, requestedDurationSec: 5 } };
};
/** El POST sale y la respuesta no vuelve: un plazo o una conexión que se corta, sin código del proveedor. */
const sinRespuesta = () => async () => { throw new ProviderError('seedance: la conexión se cortó antes de contestar', 'seedance', undefined, true); };
const noContestaNunca = () => () => new Promise(() => {});

/* Lo que ModelArk contesta cuando se le PREGUNTA por una tarea. Sin entrada: no contesta. */
const enModelArk = new Map();
const cuerpo = (taskId, status, extra = {}) => ({ id: taskId, status, updated_at: Math.floor(Date.now() / 1000), ...extra });
const resolutor = {
  preguntas: [],
  async consultar(ref) {
    this.preguntas.push(ref.operationId);
    const e = enModelArk.get(ref.operationId);
    if (!e || e === 'no_contesta') return { conocido: false, motivo: 'no_contesta' };
    return { conocido: true, aviso: leerAvisoDeSeedance(e) };
  },
};
/* El almacén al que se trae el vídeo. Cuando dice que sí, deja la ficha como la dejaría el de verdad. */
const traidos = [];
const materializador = {
  async guardar(p) {
    traidos.push(p);
    if (!base.docs.has(`assets/${p.assetId}`)) {
      base.docs.set(`assets/${p.assetId}`, {
        assetId: p.assetId, ownerAccountId: p.userId, kind: p.kind, status: 'ready',
        delivery: { url: `https://almacen.invalid/users/${p.userId}/ai-generations/${p.assetId}.mp4?token=t`, kind: 'bearer_token' },
      });
    }
    return { ok: true, assetId: p.assetId, yaEstaba: false };
  },
};

/**
 * UNA PASADA DEL BARRIDO DESPLEGADO, compuesta como en producción —`mantenimientoDeWee`: preguntar y después liquidar— con
 * los valores de producción (sin `quietoDesdeMs` propio: rigen los 60 s de siempre). Lo único de mentira es a quién se
 * le pregunta y a dónde se trae el vídeo.
 */
const barrido = () => rt.mantenimientoDeWee({
  reconciliacion: () => rt.reconciliacionDeWee({ db: base, resolutores: { seedance: resolutor }, materializar: materializador })(),
  liquidacion: () => rt.barridoDeLiquidacionDeWee({ db: base })(),
})();

/* ═══ Un mundo por escenario: base nueva, cuentas con saldo y la puerta abierta para ellas ═══ */
const SALDO = 5000;
const mundoNuevo = async (...uids) => {
  base = new Base();
  adelanto = 0;
  llamadas.length = 0; tareasEnModelArk.length = 0; traidos.length = 0; resolutor.preguntas.length = 0; enModelArk.clear();
  modelArk = aceptar();
  for (const uid of uids) {
    base.docs.set(`users/doc_${uid}`, { uid, displayName: uid });
    await creditEngine.ensureAccount(uid);
    base.docs.get(`users/doc_${uid}`).creditsBalance = SALDO;
  }
  base.docs.set('aiSettings/runtime', { habilitado: true, porCapacidad: { 'video.generate': { cuentas: uids, experiencias: ['studio'] } } });
  olvidarLaPuerta();
};
/** La puerta cerrada, que es como está en producción (CLAUDE.md §10): todo el vídeo va por el camino de siempre. */
const cerrarLaPuerta = () => { base.docs.set('aiSettings/runtime', { habilitado: false, porCapacidad: {} }); olvidarLaPuerta(); };

const PETICION = { prompt: 'Un faro al amanecer, olas suaves', durationSec: 5, aspectRatio: '16:9' };
const pedir = (uid, requestId, extra = {}) => intento(() => video.generateVideo.run({ auth: { uid }, data: { ...PETICION, requestId, ...extra } }));
const saldo = (uid) => base.docs.get(`users/doc_${uid}`).creditsBalance;
const uso = (requestId) => base.leer(`creditTransactions/usage_${requestId}`);
const reembolso = (requestId) => base.leer(`creditTransactions/refund_${requestId}`);
const trabajoDe = (uid, requestId) => rt.trabajoDelMedioDeWee(base, uid, requestId);
const codigo = (r) => (r.ok ? 'ok' : `${r.error.details?.code ?? r.error.code}${r.error.details?.reason ? ` · ${r.error.details.reason}` : ''}`);
/* El limitador pone el día con `new Date()` (el reloj de verdad, no el adelantado): hoy y ayer, por si la prueba cruza la medianoche UTC. */
const diaDe = (ms) => new Date(ms).toISOString().slice(0, 10);
const cupoDeVideo = (uid) => [diaDe(relojReal()), diaDe(relojReal() - DIA)].reduce((n, d) => n + Number(base.leer(`aiRateLimits/${uid}_${d}`)?.video ?? 0), 0);
const dejarPasar = (ms) => { adelanto += ms; };

/**
 * PIDE UN VÍDEO Y MATA AL PROCESO EN LA ESCRITURA N-ÉSIMA A `jobs/`.
 *   1 · el trabajo se crea            2 · se reclama            3 · se marca que sale            4 · se informa
 * Devuelve cuando la muerte ocurrió; la invocación queda colgada para siempre, como un proceso que ya no existe.
 */
const pedirYMatar = async (uid, requestId, matarEn, { invocar, extra = {} } = {}) => {
  base.matar = { en: matarEn, cuenta: 0, disparado: false };
  const colgada = invocar ? intento(invocar) : pedir(uid, requestId, extra);
  /* Si la invocación TERMINA antes de morir, la prueba no mide lo que dice medir: se para y se cuenta cómo acabó. */
  const quien = await Promise.race([esperarHasta(() => base.matar.disparado).then(() => 'murio'), colgada.then((r) => ({ terminoAntes: codigo(r) }))]);
  if (quien !== 'murio') throw new Error(`la invocación terminó antes de morir en la escritura ${matarEn}: ${JSON.stringify(quien)} (escrituras a jobs/ vistas: ${base.matar.cuenta})`);
  base.matar = null;
  /* En un objeto, no sola: un `async` que devolviera la promesa colgada se quedaría esperándola. */
  return { colgada };
};

/** Qué dejó guardado un trabajo, sin ids ni sellos de tiempo: lo que el barrido puede leer. */
const resumenDe = (job) => {
  if (!job) return null;
  const a = job.attempts[job.attempts.length - 1];
  return {
    estado: job.state, intentos: job.attemptCount,
    ...(a ? {
      despachado: a.dispatched === true,
      referencia: a.providerRef?.operationId ?? null,
      desenlace: a.outcome ?? null,
      concesion: a.lease ? (a.lease.until > Date.now() ? 'viva' : 'caducada') : 'ninguna',
    } : { despachado: false, referencia: null, desenlace: null, concesion: 'ninguna' }),
  };
};
const mismo = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ═══════════════════════════════════════════════════════════════════════════
 * A · QUÉ MECANISMOS DE RECUPERACIÓN EXISTEN DE VERDAD HOY
 * ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n── A · Quién llama a quién: los mecanismos de recuperación que existen de verdad ──');
const fuentes = (dir) => fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? fuentes(`${dir}/${e.name}`) : e.name.endsWith('.ts') ? [`${dir}/${e.name}`] : []));
const SRC = fuentes('functions/src');
const quienLo = (re, lista = SRC, excluye = []) => lista.filter((f) => !excluye.includes(f) && re.test(limpio(f))).map((f) => f.replace(/^functions\/(src|lib)\//, ''));
{
  const SIN_WORKER = ['functions/src/job/worker.ts'];
  const llamadores = quienLo(/\bbarrerRecuperables\b/, SRC, SIN_WORKER);
  check('A1) `barrerRecuperables` existe en el trabajador y NINGÚN otro archivo de functions/src lo nombra: 0 llamadores de producción',
    SRC.includes('functions/src/job/worker.ts') && /export const barrerRecuperables/.test(leer('functions/src/job/worker.ts')) && llamadores.length === 0, llamadores.join(', ') || '0');
  /* El compilado sale de estas mismas fuentes (la cadena exige que `lib` esté al día): basta mirar el módulo que la exporta y la composición del runtime. */
  const COMPILADO_DEL_TRABAJADOR = limpio('functions/lib/job/worker.js');
  check('A2) y en el compilado (functions/lib) ocurre lo mismo: `job/worker.js` la exporta, y ni `runtime/index.js` (la composición) ni `settlement/programado.js` la nombran — solo un COMENTARIO de runtime/cola.ts la menciona',
    /exports\.barrerRecuperables = barrerRecuperables/.test(COMPILADO_DEL_TRABAJADOR) && !/barrerRecuperables/.test(limpio('functions/lib/runtime/index.js')) && !/barrerRecuperables/.test(limpio('functions/lib/settlement/programado.js'))
    && !/barrerRecuperables/.test(limpio('functions/src/runtime/cola.ts')) && /\(`barrerRecuperables`\)/.test(leer('functions/src/runtime/cola.ts')));
  const fuera = ['scripts', 'ops'].flatMap((d) => (fs.existsSync(path.resolve(RAIZ, d)) ? (function andar(dir) {
    return fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'node_modules' ? [] : andar(`${dir}/${e.name}`)) : [`${dir}/${e.name}`]));
  }(d)) : []));
  check('A3) ni scripts/ ni ops/ lo llaman (ni ningún `.mjs`, `.js`, `.ts` ni `.json` de ahí)', fuera.every((f) => !/barrerRecuperables/.test(leer(f))), `${fuera.length} archivos mirados`);
  /* Quien la llama son las pruebas del trabajador: la cobertura que tiene es de la función en sí, no de ningún camino de producción. */
  const SUS_PRUEBAS = ['job-queue.test.mjs', 'cola-durable.test.mjs'];
  check('A4) lo único que la llama son pruebas (las del trabajador: `job-queue` 47–49 y `cola-durable`): una función que existe, está probada y nadie programa',
    SUS_PRUEBAS.every((f) => /await barrerRecuperables\(/.test(limpio(`functions/test/${f}`))), SUS_PRUEBAS.join(', '));

  /* `evaluar`, el que recupera una concesión caducada, lo invoca solo el trabajador: dentro de una entrega y dentro del barrido (que nadie llama). */
  const evaluadores = quienLo(/\bengine\.evaluar\(/, SRC, ['functions/src/core/job.ts']);
  check('A5) `evaluar` del Job Engine (la concesión caducada → recuperar) solo se invoca desde el trabajador: dentro de `atenderEntrega` y de `barrerRecuperables`',
    mismo(evaluadores, ['job/worker.ts']) && (sinComentarios(leer('functions/src/job/worker.ts')).match(/\bengine\.evaluar\(/g) || []).length === 2, evaluadores.join(', '));
  const quienAtiende = quienLo(/\batenderEntrega\b/, SRC, SIN_WORKER);
  check('A6) y `atenderEntrega` solo la invocan DOS composiciones: el conductor (dentro de una invocación) y el canary de Media Cloud',
    mismo(quienAtiende.sort(), ['media/canary.ts', 'runtime/conductor.ts']), quienAtiende.join(', '));

  /* La tarea programada: un barrido que pregunta y liquida, y NADA más. */
  const MANTENIMIENTO = sinComentarios(leer('functions/src/runtime/index.ts'));
  const cuerpoMantenimiento = MANTENIMIENTO.slice(MANTENIMIENTO.indexOf('export const mantenimientoDeWee'), MANTENIMIENTO.indexOf('export const paradaDeWee'));
  check('A7) `barridoDeLiquidacion` (cada 5 min) pasa por `mantenimientoDeWee`: preguntar y liquidar',
    /mantenimientoDeWee\(/.test(sinComentarios(leer('functions/src/settlement/programado.ts'))) && /every \$\{minutosDelBarrido\(\)\} minutes/.test(leer('functions/src/settlement/programado.ts'))
    && /barridoDeLiquidacion/.test(sinComentarios(leer('functions/src/index.ts'))));
  check('A8) y `mantenimientoDeWee` NO reclama, NO evalúa, NO recupera y NO atiende entregas: lo que pasó a medias no es asunto suyo',
    cuerpoMantenimiento.length > 200 && !/evaluar|reclamar|atenderEntrega|barrerRecuperables|recuperables\(|colaDeInvocacion|cancelar/.test(cuerpoMantenimiento));
  const reconciliador = sinComentarios(leer('functions/src/runtime/reconciliador.ts'));
  check('A9) el reconciliador solo PREGUNTA al proveedor por lo que salió CON referencia (y pide parar un plazo vencido): no recupera concesiones',
    !/\.evaluar\(|reclamar|atenderEntrega/.test(reconciliador) && /recuperables/.test(reconciliador));

  /* `operacionAbandonada`: el reintento de quien lo pidió, sin barrido. */
  const abandonadas = quienLo(/\boperacionAbandonada\(/, SRC, ['functions/src/core/job.ts']);
  check('A10) `operacionAbandonada` («pasó el plazo y sigue en marcha ⇒ el proceso murió ⇒ devolver») la usan creatorRun, generateVideo (rama sin trabajo del Core), generateWorld y el avatar, y todos al REINTENTAR',
    mismo(abandonadas.sort(), ['creator/index.ts', 'creator/mundo.ts', 'creator/video.ts', 'generateAvatar.ts']), abandonadas.join(', '));

  /* La cola durable: un transporte que nadie enchufa. */
  const importaCola = quienLo(/cola-durable/, SRC, ['functions/src/runtime/cola-durable.ts']);
  check('A11) la cola durable (`jobQueue`) existe, tiene reglas e índice y NINGÚN módulo de producción la importa: 0 consumidores', importaCola.length === 0, importaCola.join(', ') || '0');
  check('A12) y la de producción es la de UNA invocación, que muere con ella: `conductorDeWee` solo construye `colaDeInvocacion`',
    /cola: colaDeInvocacion\(ahora\)/.test(sinComentarios(leer('functions/src/runtime/index.ts'))) && !/colaDurable/.test(sinComentarios(leer('functions/src/runtime/index.ts'))));

  /* El vídeo no se puede cancelar; el mundo sí. */
  const V = sinComentarios(leer('functions/src/creator/video.ts'));
  const M = sinComentarios(leer('functions/src/creator/mundo.ts'));
  check('A13) la puerta de VÍDEO no tiene cancelación: no nombra `pedirParada`, `cancelar` ni `cancel_requested` — y la del MUNDO sí',
    !/pedirParada|\.cancelar\(|cancel_requested|cancelled/.test(V) && /pedirParada/.test(M) && /op === 'cancelar'/.test(M));
  const WEBHOOKS = sinComentarios(leer('functions/src/engine/webhooks.ts'));
  const legacy = WEBHOOKS.slice(WEBHOOKS.indexOf('export const seedanceCallback'), WEBHOOKS.indexOf('export const MAX_CUERPO_DE_AVISO'));
  const INDICE = sinComentarios(leer('functions/src/index.ts'));
  check('A14) el aviso del proveedor que está DESPLEGADO (`seedanceCallback`) solo anota { provider, status, receivedAt } y no mueve ningún trabajo',
    legacy.length > 300 && /\.set\(\{ provider: 'seedance', status: aviso\.providerStatus, receivedAt: Timestamp\.now\(\) \}\)/.test(legacy)
    && !/atenderAviso|aplicar\(|recibirEvento|informar\(|reclamar/.test(legacy));
  check('A14b) y el receptor que SÍ mueve trabajos (`avisoDeProveedor`, por `atenderAviso`) existe pero NO se exporta: de `engine/webhooks` solo sale `seedanceCallback`',
    /export const avisoDeProveedor = onRequest/.test(WEBHOOKS) && /atenderAviso\(atencionDeWee\(\), aviso\)/.test(WEBHOOKS)
    && !/avisoDeProveedor/.test(INDICE) && /export \{ seedanceCallback \} from '\.\/engine\/webhooks';/.test(INDICE));
  /* El informe manual: ve, no cierra. */
  const OPS = sinComentarios(leer('ops/reconciliacion/reservas-colgadas.mjs'));
  check('A15) `ops/reconciliacion/reservas-colgadas.mjs` es SOLO LECTURA: exporta `clasificar` (pura) y no escribe ni reembolsa', typeof manual.clasificar === 'function'
    && !/\.set\(|\.update\(|\.delete\(|\.create\(|\brefundCredits\(|\bcompleteCredits\(|runTransaction/.test(OPS));
  const ADMIN = sinComentarios(leer('functions/src/credits/index.ts'));
  check('A16) y lo único que cierra una reserva a mano es el callable de ADMINISTRACIÓN `refundCredits`; `creditsAdmin` no tiene ninguna acción que liste las AUTHORIZED',
    /export const refundCredits = onCall/.test(ADMIN) && /assertAdmin\(request\.auth/.test(ADMIN.slice(ADMIN.indexOf('export const refundCredits'), ADMIN.indexOf('export const validatePurchaseCallable')))
    && !/'authorized'|AUTHORIZED/.test(ADMIN.slice(ADMIN.indexOf('export const creditsAdmin'))));
}

/* ═══════════════════════════════════════════════════════════════════════════
 * B · LAS MÁQUINAS DE ESTADO: QUÉ HARÍA `evaluar` CON CADA TRABAJO ATASCADO
 * ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n── B · Un trabajo atascado, visto por el Job Engine y por el dinero (con el `barrerRecuperables` que existe) ──');

/** La política que usa `generateVideo`: los relojes de plazos.ts y UN intento. */
const POLITICA_DE_VIDEO = rt.politicaDe(rt.PLAZOS_DE_VIDEO, { ...core.POLITICA_DE_TRABAJO, retry: { ...core.POLITICA_DE_TRABAJO.retry, maxAttempts: 1 } });
const motorDeVideo = crearMotorDeTrabajosDeWee(POLITICA_DE_VIDEO).motor;
const peticionDeTrabajo = (uid, requestId, vida = HORAS_2_15) => ({
  contract: core.JOB_ENGINE_CONTRACT_VERSION, principal: { userId: uid }, at: Date.now(), capability: 'video.generate',
  implementation: { providerId: 'seedance', modelId: 'seedance-2-0-fast' }, input: { prompt: PETICION.prompt },
  trace: { traceId: requestId, requestId, userId: uid, workplace: 'studio' },
  metadata: { service: 'ai_video_draft', creditsEstimated: 75, creditTransactionId: `usage_${requestId}`, creditRequestId: requestId },
  mode: 'sync', idempotencyKey: requestId, deadlineAt: Date.now() + vida, context: { appId: 'wee', operationId: requestId },
});
const reservar = (uid, requestId) => creditEngine.spendCredits({ userId: uid, service: 'ai_video_draft', amount: 75, requestId, reason: 'prueba', source: 'weë-studio' });

/**
 * SIEMBRA UN TRABAJO EN UN ESTADO ATASCADO, con las operaciones de verdad del Job Engine y el almacén de verdad: cada
 * transición pasa por `aplicar` (compare-and-set por revisión), como la haría un trabajador que luego muriera.
 */
let serieDeTareasSembradas = 0;
const sembrar = async (uid, requestId, estado, { tarea } = {}) => {
  const store = almacenDeTrabajos(base);
  const principal = { userId: uid };
  let job = (await crearTrabajo(store, motorDeVideo, peticionDeTrabajo(uid, requestId))).job;
  const aplicar = async (decision) => {
    if (decision.status !== 'transition') throw new Error(`sembrar(${estado}): ${decision.status} ${decision.refusal ?? ''}`);
    const r = await store.aplicar(decision.transition);
    if (!r.applied) throw new Error(`sembrar(${estado}): no se aplicó`);
    job = r.job;
  };
  if (estado === 'queued') return job;
  const reclamo = motorDeVideo.reclamar(job, { principal, at: Date.now(), worker: 'w-muerto' });
  await aplicar(reclamo);
  if (estado === 'reclamado') return job;
  const intento = reclamo.dispatch.attemptId;
  await aplicar(motorDeVideo.marcarEnvio(job, { principal, at: Date.now(), worker: 'w-muerto', attemptId: intento }));
  if (estado === 'envio_marcado') return job;
  const referencia = estado === 'aceptado_con_referencia' ? { providerRef: { providerId: 'seedance', operationId: tarea ?? `cgt-sembrada-${String(++serieDeTareasSembradas).padStart(4, '0')}` } } : {};
  await aplicar(motorDeVideo.informar(job, { principal, at: Date.now(), worker: 'w-muerto', report: { attemptId: intento, outcome: 'unknown', dispatched: true, ...referencia } }));
  return job;
};
const actual = async (jobId) => almacenDeTrabajos(base).obtener(jobId);
/** `barrerRecuperables` tal como se lo daría quien algún día lo conecte: el almacén de verdad, el motor de verdad y una cola de invocación. */
const recuperacion = () => {
  const cola = colaDeInvocacion(() => Date.now());
  return { cola, deps: { store: almacenDeTrabajos(base), queue: cola, engine: motorDeVideo, now: () => Date.now() } };
};
const accion = (job) => { const a = rt.decidirLiquidacion(job, Date.now()); return a.tipo + ('motivo' in a ? `:${a.motivo}` : ''); };

{
  await mundoNuevo('colaB1');
  const U = 'colaB1';
  const casos = [
    ['nunca reclamado (queued)', 'queued'],
    ['reclamado y muerto antes de enviar', 'reclamado'],
    ['envío marcado y muerto (salió, sin referencia)', 'envio_marcado'],
    ['aceptado por el proveedor, con referencia', 'aceptado_con_referencia'],
    ['salió y no volvió nada, sin referencia', 'aceptado_sin_referencia'],
  ];
  const trabajos = {};
  for (const [i, [, estado]] of casos.entries()) {
    const requestId = `estado-${i}`;
    await reservar(U, requestId);
    trabajos[estado] = (await sembrar(U, requestId, estado)).jobId;
  }
  const verdad = async (estado) => resumenDe(await actual(trabajos[estado]));
  const accionDe = async (estado) => accion(await actual(trabajos[estado]));
  medida('— el trabajo recién dejado, a los 30 s (la concesión de un minuto sigue viva) —');
  dejarPasar(30 * SEG);
  for (const [nombre, estado] of casos) medida(`${nombre}: ${JSON.stringify(await verdad(estado))} · dinero: ${await accionDe(estado)}`);
  check('B1) a los 30 s, con la concesión viva, el dinero espera «en marcha» sin tocar nada (`running` con concesión viva)',
    (await accionDe('reclamado')) === 'esperar:en_marcha' && (await accionDe('envio_marcado')) === 'esperar:en_marcha');

  /* ── +2 min: las concesiones caducaron. Esto es lo que HARÍA el trabajador si alguien lo llamara. ── */
  dejarPasar(90 * SEG);
  const antes = {};
  for (const [, estado] of casos) antes[estado] = { verdad: await verdad(estado), dinero: await accionDe(estado) };
  check('B2) A LOS 2 MIN, SIN NADIE QUE EVALÚE: las concesiones caducaron y NADA cambió — `running` sigue `running`, y el dinero dice «recuperable» (esperar), no devolver',
    antes.reclamado.verdad.estado === 'running' && antes.reclamado.verdad.concesion === 'caducada' && antes.reclamado.dinero === 'esperar:recuperable'
    && antes.envio_marcado.verdad.estado === 'running' && antes.envio_marcado.dinero === 'esperar:recuperable'
    && antes.queued.verdad.estado === 'queued' && antes.queued.dinero === 'esperar:recuperable');
  const r1 = recuperacion();
  const pasada1 = await barrerRecuperables(r1.deps, { limit: 100 });
  medida(`barrerRecuperables a los 2 min → ${JSON.stringify(pasada1)}; avisos encolados: ${r1.cola.pendientes()}`);
  const despues = {};
  for (const [nombre, estado] of casos) { despues[estado] = { verdad: await verdad(estado), dinero: await accionDe(estado) }; medida(`${nombre}: ${despues[estado].verdad.estado} → dinero ${despues[estado].dinero}`); }
  check('B3) si se EVALUARA: el reclamado que nunca salió se cierra `failed` (un intento, `lease_expired`) y el dinero se DEVUELVE (`no_salio`) — el único caso que cierra por sí solo a los 2 min',
    despues.reclamado.verdad.estado === 'failed' && despues.reclamado.verdad.desenlace === 'failed' && despues.reclamado.verdad.despachado === false && despues.reclamado.dinero === 'reembolsar:no_salio');
  check('B4) si se EVALUARA: el que SALIÓ sin referencia pasa a `waiting` con el intento `unknown`, y el dinero lo marca «reconciliar» (ni cobrar ni devolver): nadie lo resuelve',
    despues.envio_marcado.verdad.estado === 'waiting' && despues.envio_marcado.verdad.desenlace === 'unknown' && despues.envio_marcado.verdad.referencia === null && despues.envio_marcado.dinero === 'reconciliar:desenlace_desconocido');
  check('B5) si se EVALUARA: el `queued` nunca reclamado NO se mueve a los 2 min (`evaluar` no hace nada con un `queued` hasta su plazo) y el aviso se re-encola; el aceptado con referencia tampoco',
    despues.queued.verdad.estado === 'queued' && despues.aceptado_con_referencia.verdad.estado === 'waiting' && despues.aceptado_con_referencia.dinero === 'esperar:aceptada_por_el_proveedor'
    && pasada1.recuperados === 2 && pasada1.avisados === 1 && pasada1.revisados === 5);

  /* ── +2 h 16: pasó el plazo del trabajo. ── */
  dejarPasar(HORAS_2_15 + MINUTO);
  const r2 = recuperacion();
  const pasada2 = await barrerRecuperables(r2.deps, { limit: 100 });
  medida(`barrerRecuperables a las 2 h 16 → ${JSON.stringify(pasada2)}`);
  const alFinal = {};
  for (const [nombre, estado] of casos) { alFinal[estado] = { verdad: await verdad(estado), dinero: await accionDe(estado) }; medida(`${nombre}: ${alFinal[estado].verdad.estado}/${alFinal[estado].verdad.desenlace} → dinero ${alFinal[estado].dinero}`); }
  check('B6) si se EVALUARA pasado el plazo: el `queued` que nadie reclamó VENCE (`timed_out`) y el dinero se DEVUELVE (`no_salio`): hasta entonces `evaluar` no mueve un `queued`, así que su espera es la vida entera del trabajo (2 h 15)',
    alFinal.queued.verdad.estado === 'timed_out' && alFinal.queued.dinero === 'reembolsar:no_salio');
  check('B7) y el que salió sin referencia acaba `timed_out` pero sigue «reconciliar»: vencer no resuelve la incertidumbre, y nadie la resuelve',
    alFinal.envio_marcado.verdad.estado === 'timed_out' && alFinal.envio_marcado.dinero === 'reconciliar:desenlace_desconocido'
    && alFinal.aceptado_sin_referencia.verdad.estado === 'timed_out' && alFinal.aceptado_sin_referencia.dinero === 'reconciliar:desenlace_desconocido');
  /*
   * LA TRAMPA DE CONECTARLO A CIEGAS. Un trabajo ACEPTADO por el proveedor, con su referencia, se está esperando a propósito.
   * `evaluar` lo vence al pasar el plazo del TRABAJO (2 h 15), y vencido es terminal: el reconciliador deja de preguntar por él
   * (solo mira los no terminales) mientras el proveedor puede seguir con la tarea —y cobrándola—.
   */
  check('B8) LA TRAMPA: `evaluar` también vence a un aceptado CON referencia al pasar el plazo (`timed_out`), y el dinero lo deja en «reconciliar» —por eso M-05 no puede evaluar los `waiting`—',
    alFinal.aceptado_con_referencia.verdad.estado === 'timed_out' && alFinal.aceptado_con_referencia.verdad.referencia !== null && alFinal.aceptado_con_referencia.dinero === 'reconciliar:desenlace_desconocido');
  const interrogable = rt.decidirReconciliacion(await actual(trabajos.aceptado_con_referencia), Date.now(), rt.PLAZOS_DE_VIDEO);
  check('B9) y vencido deja de ser candidato del reconciliador (`trabajo_terminal`): la tarea viva en el proveedor ya no se pregunta nunca más', interrogable.tipo === 'nada' && interrogable.motivo === 'trabajo_terminal');
}

/* ═══════════════════════════════════════════════════════════════════════════
 * C · EL PROCESO MUERE DESPUÉS DE ACEPTAR UN TRABAJO: CUATRO MOMENTOS (y uno antes)
 * ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n── C · generateVideo con la puerta abierta: el proceso muere, y el barrido pasa durante 30 días ──');

const trabajosGuardados = () => base.de('jobs').map((d) => JSON.parse(d.json));
/** La fila del libro de ESA reserva: se une por la transacción de Credits (su `requestId` es el del PASO, no el de la persona). */
const filaDelLibro = (requestId) => base.de('aiGenerations').find((r) => r.creditTransactionId === usageTransactionId(requestId));
const informeDeBarrido = (r) => ({
  mirados: r.liquidacion.examined, cobrados: r.liquidacion.settled, devueltos: r.liquidacion.refunded, esperando: r.liquidacion.skipped,
  aReconciliar: r.liquidacion.unknown, errores: r.liquidacion.errors,
  preguntados: r.reconciliacion?.preguntados ?? 0, omitidos: r.reconciliacion?.omitidos ?? 0,
});
/** Un barrido en cada hito del reloj, como los de cada 5 min pero saltando: lo que cada pasada deja es lo mismo que la anterior. */
const HITOS = [['+2 min', 2 * MINUTO], ['+1 h', HORA], ['+2 h 16', HORAS_2_15 + MINUTO], ['+8 d', 8 * DIA], ['+30 d', 30 * DIA]];
const hitos = async (uid, requestId) => {
  const salida = [];
  for (const [nombre, t] of HITOS) {
    adelanto = t;
    const r = await barrido();
    const job = await trabajoDe(uid, requestId);
    salida.push({ nombre, job: resumenDe(job), reserva: uso(requestId)?.status ?? null, barrido: informeDeBarrido(r) });
  }
  adelanto = 0;
  return salida;
};
const quieto = (lineas, estado) => lineas.every((l) => l.job?.estado === estado && l.reserva === 'AUTHORIZED' && l.barrido.devueltos === 0 && l.barrido.cobrados === 0 && l.barrido.preguntados === 0);

/* ── P0 · ANTES de que exista el trabajo: la reserva está, el trabajo no ── */
{
  await mundoNuevo('colaP0');
  const U = 'colaP0';
  await pedirYMatar(U, 'vid-p0', 1);
  const precio = Math.abs(uso('vid-p0').amount);
  check('C0) P0 · muere al CREAR el trabajo: la reserva existe (`AUTHORIZED`, saldo debitado, hueco del día ocupado) y NO hay trabajo ni POST',
    uso('vid-p0')?.status === 'AUTHORIZED' && saldo(U) === SALDO - precio && cupoDeVideo(U) === 1 && trabajosGuardados().length === 0 && llamadas.length === 0);
  const lineas = await hitos(U, 'vid-p0');
  for (const l of lineas) medida(`P0 ${l.nombre}: reserva ${l.reserva} · barrido ${JSON.stringify(l.barrido)}`);
  bandera('C1) P0 · el barrido NO ve una reserva sin trabajo (mira `jobs`, no `creditTransactions`): 30 días después sigue `AUTHORIZED`, con 0 trabajos mirados y 0 devueltos',
    lineas.every((l) => l.reserva === 'AUTHORIZED' && l.barrido.mirados === 0 && l.barrido.devueltos === 0));
  const informe = manual.clasificar(base.de('creditTransactions'), relojReal() + 3 * HORA, 2);
  check('C2) P0 · lo único que la VE es el informe manual de solo lectura (más de 2 h: 1 reserva, sus Credits); no la cierra', informe.total.reservas === 1 && informe.total.credits === precio, JSON.stringify(informe.total));
  /* Quien la recupera es LA PERSONA, reintentando: antes de 25 min «ya en curso»; pasados, se devuelve. */
  dejarPasar(5 * MINUTO);
  const pronto = await pedir(U, 'vid-p0');
  check('C3) P0 · reintentar a los 5 min: DUPLICATE_REQUEST (se cree en marcha) y no se toca nada', !pronto.ok && codigo(pronto) === 'DUPLICATE_REQUEST' && uso('vid-p0').status === 'AUTHORIZED' && llamadas.length === 0, codigo(pronto));
  dejarPasar(21 * MINUTO);
  const tarde = await pedir(U, 'vid-p0');
  check('C4) P0 · reintentar pasados 25 min (`operacionAbandonada`): se DEVUELVE exacta y se dice «te devolví los Credits» — es el único mecanismo que cierra esta reserva, y exige que la persona vuelva',
    !tarde.ok && tarde.error.details?.code === 'TIMEOUT' && uso('vid-p0').status === 'REFUNDED' && reembolso('vid-p0')?.amount === precio && saldo(U) === SALDO, codigo(tarde));
  bandera('C5) P0 · y el hueco del día NO vuelve con ese reembolso (el vídeo no lo devuelve): la persona pagó un hueco por un vídeo que no existió', cupoDeVideo(U) === 1);
}

/* ── P1 · TRAS ACEPTAR EL TRABAJO, ANTES DE RECLAMARLO ── */
const ESCENARIOS = {};
const escenarioDeMuerte = async (clave, uid, requestId, matarEn, prepararAdaptador) => {
  await mundoNuevo(uid);
  if (prepararAdaptador) modelArk = prepararAdaptador();
  await pedirYMatar(uid, requestId, matarEn);
  const precio = Math.abs(uso(requestId).amount);
  const job = await trabajoDe(uid, requestId);
  ESCENARIOS[clave] = { uid, requestId, precio, quieto: resumenDe(job), libro: filaDelLibro(requestId), llamadas: llamadas.length, tareas: [...tareasEnModelArk] };
  return ESCENARIOS[clave];
};
{
  const e = await escenarioDeMuerte('P1', 'colaP1', 'vid-p1', 2);
  medida(`P1 recién muerto: trabajo ${JSON.stringify(e.quieto)} · reserva ${uso('vid-p1')?.status} · POST ${e.llamadas} · tareas en ModelArk ${e.tareas.length}`);
  check('C6) P1 · muere ANTES de reclamar: el trabajo está `queued`, sin intentos, y NADA salió (0 POST, 0 tareas en el proveedor)',
    e.quieto.estado === 'queued' && e.quieto.intentos === 0 && e.llamadas === 0 && e.tareas.length === 0 && uso('vid-p1').status === 'AUTHORIZED' && saldo('colaP1') === SALDO - e.precio);
  const lineas = await hitos('colaP1', 'vid-p1');
  for (const l of lineas) medida(`P1 ${l.nombre}: ${JSON.stringify(l.job)} · reserva ${l.reserva} · barrido ${JSON.stringify(l.barrido)}`);
  bandera('C7) P1 · el barrido desplegado lo deja `queued` y la reserva `AUTHORIZED` durante 30 días: «esperar · recuperable», sin devolver ni preguntar jamás', quieto(lineas, 'queued') && lineas.every((l) => l.barrido.esperando === 1));
  const reintento = await pedir('colaP1', 'vid-p1');
  bandera('C8) P1 · y el reintento de la persona recibe DUPLICATE_REQUEST para siempre: la puerta no reanuda un trabajo que ya existe (`generateVideo` no vuelve al conductor), así que «ya en curso» es un callejón sin salida',
    !reintento.ok && codigo(reintento) === 'DUPLICATE_REQUEST' && llamadas.length === 0 && (await trabajoDe('colaP1', 'vid-p1')).state === 'queued', codigo(reintento));
  const informe = manual.clasificar(base.de('creditTransactions'), relojReal() + 3 * HORA, 2);
  check('C9) P1 · el informe manual la lista como colgada (la única forma de enterarse)', informe.total.reservas === 1 && informe.colgadas[0].requestId === 'vid-p1');
}

/* ── P2 · TRAS RECLAMAR, ANTES DE MARCAR QUE SALE ── */
{
  const e = await escenarioDeMuerte('P2', 'colaP2', 'vid-p2', 3);
  medida(`P2 recién muerto: trabajo ${JSON.stringify(e.quieto)} · reserva ${uso('vid-p2')?.status} · POST ${e.llamadas}`);
  check('C10) P2 · muere tras RECLAMAR y antes de marcar el envío: `running`, UN intento sin enviar (`dispatched: false`), concesión viva de 1 min, 0 POST',
    e.quieto.estado === 'running' && e.quieto.intentos === 1 && e.quieto.despachado === false && e.quieto.concesion === 'viva' && e.llamadas === 0 && e.tareas.length === 0);
  const lineas = await hitos('colaP2', 'vid-p2');
  for (const l of lineas) medida(`P2 ${l.nombre}: ${JSON.stringify(l.job)} · reserva ${l.reserva} · barrido ${JSON.stringify(l.barrido)}`);
  bandera('C11) P2 · la concesión caduca a los 60 s y NADIE la evalúa: el trabajo sigue `running` con la concesión «caducada» y la reserva `AUTHORIZED` 30 días después', quieto(lineas, 'running') && lineas.every((l) => l.job.concesion === 'caducada'));
  const reintento = await pedir('colaP2', 'vid-p2');
  bandera('C12) P2 · el reintento recibe DUPLICATE_REQUEST: la puerta no reanuda, así que ningún otro trabajador retoma el intento muerto (un solo trabajo, 0 POST)', !reintento.ok && codigo(reintento) === 'DUPLICATE_REQUEST' && llamadas.length === 0 && trabajosGuardados().length === 1, codigo(reintento));
}

/* ── P3a · TRAS MARCAR EL ENVÍO, CON EL POST SIN CONTESTAR (el proveedor no tiene nada) ── */
{
  await mundoNuevo('colaP3a');
  modelArk = noContestaNunca();
  void pedir('colaP3a', 'vid-p3a');   /* el POST no contesta nunca: esta invocación se queda esperando, como la de un proceso que ya no existe */
  await esperarHasta(() => trabajosGuardados().some((j) => j.attempts[0]?.dispatched === true) && llamadas.length === 1);
  const quietoP3a = resumenDe(await trabajoDe('colaP3a', 'vid-p3a'));
  ESCENARIOS.P3a = { quieto: quietoP3a };
  medida(`P3a recién muerto: trabajo ${JSON.stringify(quietoP3a)} · POST ${llamadas.length} · tareas en ModelArk ${tareasEnModelArk.length}`);
  check('C13) P3a · muere tras MARCAR EL ENVÍO con el POST en vuelo: `running`, `dispatched: true`, SIN referencia — y el proveedor no recibió nada (0 tareas)',
    quietoP3a.estado === 'running' && quietoP3a.despachado === true && quietoP3a.referencia === null && tareasEnModelArk.length === 0);
  const lineas = await hitos('colaP3a', 'vid-p3a');
  bandera('C14) P3a · y el barrido lo deja igual 30 días: ni pregunta (no hay referencia), ni devuelve, ni lo marca «a reconciliar» (sigue `running`: `esperar · recuperable`)',
    quieto(lineas, 'running') && lineas.every((l) => l.barrido.aReconciliar === 0 && l.barrido.esperando === 1));
}

/* ── P3b · TRAS ACEPTAR EL PROVEEDOR, ANTES DE GUARDAR LA REFERENCIA ── */
{
  const e = await escenarioDeMuerte('P3b', 'colaP3b', 'vid-p3b', 4);
  medida(`P3b recién muerto: trabajo ${JSON.stringify(e.quieto)} · POST ${e.llamadas} · tareas en ModelArk ${JSON.stringify(e.tareas)} · libro ${JSON.stringify({ estado: e.libro?.status, tarea: e.libro?.providerTaskId })}`);
  check('C15) P3b · muere tras ACEPTAR el proveedor y antes de guardar el informe: UN POST salió, ModelArk TIENE la tarea, y el trabajo guardado es `running`, `dispatched: true`, sin referencia',
    e.quieto.estado === 'running' && e.quieto.despachado === true && e.quieto.referencia === null && e.llamadas === 1 && e.tareas.length === 1);
  check('C15b) y P3a y P3b dejan EXACTAMENTE el mismo trabajo guardado: Weë no puede distinguir «murió antes de que el POST llegara» de «murió después de que ModelArk aceptara»; lo único distinto está en el proveedor (0 tareas frente a 1)',
    mismo(ESCENARIOS.P3a.quieto, e.quieto), JSON.stringify(e.quieto));
  bandera('C16) P3b · la referencia que NO está en el trabajo SÍ está guardada en otro sitio —la fila del libro `aiGenerations` (`providerTaskId`)— y nada la lleva de vuelta al trabajo: la tarea viva del proveedor es innombrable para el barrido',
    e.libro?.status === 'PROCESSING' && e.libro?.providerTaskId === e.tareas[0] && e.quieto.referencia === null);
  check('C17) P3b · el POST pidió al proveedor que la tarea EXPIRE sola a las 2 h (`vidaEnElProveedorSec` 7 200): es lo único que acota una tarea viva que Weë no puede nombrar',
    llamadas[0]?.acceptAsync === true && llamadas[0]?.input?.vidaEnElProveedorSec === 7200);
  const lineas = await hitos('colaP3b', 'vid-p3b');
  for (const l of lineas) medida(`P3b ${l.nombre}: ${JSON.stringify(l.job)} · reserva ${l.reserva} · barrido ${JSON.stringify(l.barrido)}`);
  bandera('C18) P3b · el barrido NO pregunta por una tarea que no sabe nombrar (0 preguntas en 30 días), no la liquida y no la marca: reserva `AUTHORIZED` y tarea viva/facturable sin dueño', quieto(lineas, 'running') && resolutor.preguntas.length === 0);
  const reintento = await pedir('colaP3b', 'vid-p3b');
  bandera('C19) P3b · el reintento recibe DUPLICATE_REQUEST: «ya en curso» sobre un trabajo que nadie va a terminar', !reintento.ok && codigo(reintento) === 'DUPLICATE_REQUEST' && llamadas.length === 1, codigo(reintento));
}

/* ── P4 · CONTROL: el informe SÍ se guardó, y solo se perdió la respuesta ── */
{
  await mundoNuevo('colaP4');
  const r = await pedir('colaP4', 'vid-p4');
  const job = await trabajoDe('colaP4', 'vid-p4');
  const tarea = job.attempts[0].providerRef.operationId;
  check('C20) P4 · CONTROL: si el informe llega a guardarse, el trabajo queda `waiting` CON referencia (ACCEPTED, UN POST) — este sí lo puede cerrar el barrido',
    r.ok && r.valor.status === 'ACCEPTED' && job.state === 'waiting' && !!tarea && llamadas.length === 1);
  adelanto = 10 * MINUTO;
  await barrido();
  check('C21) P4 · con el proveedor en silencio, a los 10 min sigue `waiting` y la reserva `AUTHORIZED` (esperar es lo correcto) y se le PREGUNTÓ por su referencia', (await trabajoDe('colaP4', 'vid-p4')).state === 'waiting' && uso('vid-p4').status === 'AUTHORIZED' && resolutor.preguntas.includes(tarea));
  enModelArk.set(tarea, cuerpo(tarea, 'succeeded', { content: { video_url: `https://modelark.invalid/${tarea}.mp4` } }));
  adelanto = 20 * MINUTO;
  await barrido();
  check('C22) P4 · cuando contesta «terminó», el barrido lo trae, lo completa y COBRA una vez: es el único camino de cierre que existe hoy y solo cubre lo que salió CON referencia',
    (await trabajoDe('colaP4', 'vid-p4')).state === 'completed' && uso('vid-p4').status === 'COMPLETED' && traidos.length === 1);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * D · UN TRABAJO SIN REFERENCIA DEL PROVEEDOR: TRES FORMAS DE QUEDARSE ASÍ
 * ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n── D · `dispatched` sin `providerRef`: muerte (ya vista), POST sin respuesta y referencia inservible ──');
{
  /* El POST sale y la respuesta no vuelve (§23.3): el trabajo espera, sin referencia, y la puerta contesta ACCEPTED. */
  await mundoNuevo('colaD1');
  modelArk = sinRespuesta();
  const r = await pedir('colaD1', 'vid-d1');
  const job = await trabajoDe('colaD1', 'vid-d1');
  medida(`D1/D2 POST sin respuesta: puerta ${r.ok ? r.valor.status : codigo(r)} · trabajo ${JSON.stringify(resumenDe(job))} · reserva ${uso('vid-d1')?.status}`);
  check('D1) el POST sale y no vuelve: el trabajo queda `waiting`, `dispatched: true`, intento `unknown` y SIN referencia; la reserva sigue `AUTHORIZED`; UN POST',
    job?.state === 'waiting' && job.attempts[0].dispatched === true && job.attempts[0].outcome === 'unknown' && !job.attempts[0].providerRef && uso('vid-d1')?.status === 'AUTHORIZED' && llamadas.length === 1);
  check('D2) y la puerta contesta ACCEPTED igualmente: todavía no distingue «en marcha con referencia» de «desconocido sin referencia» (decisión de producto pendiente, RUNTIME §23.3)', r.ok && r.valor.status === 'ACCEPTED' && r.valor.jobId === job.jobId);
  adelanto = 6 * MINUTO;
  const p1 = informeDeBarrido(await barrido());
  const marca = base.de('jobs').find((d) => JSON.parse(d.json).jobId === job.jobId)?.liquidacion;
  medida(`D3 primera pasada:${JSON.stringify(p1)} · marca de búsqueda del trabajo: ${marca}`);
  check('D3) la PRIMERA pasada lo cuenta «a reconciliar» (1) y no pregunta al proveedor (no hay a quién): `sin_referencia`', p1.aReconciliar === 1 && p1.devueltos === 0 && p1.cobrados === 0 && resolutor.preguntas.length === 0);
  const p2 = informeDeBarrido(await barrido());
  bandera('D4) y a partir de la SEGUNDA el barrido ya no lo ve (queda marcado `hecha`: 0 mirados): «a reconciliar» solo existe en la línea de registro de UNA pasada, a nivel INFO — no hay lista, ni alerta, ni dueño',
    p2.mirados === 0 && p2.aReconciliar === 0 && marca === 'hecha' && uso('vid-d1').status === 'AUTHORIZED');
  const S = sinComentarios(leer('functions/src/settlement/programado.ts'));
  const anotarBarrido = S.slice(S.indexOf('export const anotarBarrido'), S.indexOf('export const anotarReconciliacion'));
  bandera('D5) y esa línea sale con `console.log` (INFO) aunque haya `a_reconciliar` o `errores`: nada de WARNING ni ERROR que una alerta de Cloud Monitoring pueda vigilar',
    /console\.log\(/.test(anotarBarrido) && !/console\.(warn|error)/.test(anotarBarrido) && /a_reconciliar=/.test(anotarBarrido));
  dejarPasar(8 * DIA);
  await barrido();
  bandera('D6) 8 días después sigue igual: `waiting`, reserva `AUTHORIZED`, ni cobrada ni devuelta, y 0 preguntas al proveedor en toda su vida', (await trabajoDe('colaD1', 'vid-d1')).state === 'waiting' && uso('vid-d1').status === 'AUTHORIZED' && resolutor.preguntas.length === 0);
  const informe = manual.clasificar(base.de('creditTransactions'), Date.now(), 2);
  check('D7) el informe manual SÍ la lista (más de 2 h retenida): es lo único que la ve después de la primera pasada', informe.total.reservas === 1 && informe.colgadas[0].requestId === 'vid-d1');
}
{
  /* Un nombre de tarea que el Gateway no admite como referencia: `accepted_without_operation`. */
  await mundoNuevo('colaD2');
  modelArk = async (req) => { const taskId = 'cgt con espacios y símbolos <no válido>'; tareasEnModelArk.push(taskId); return { accepted: { operationId: taskId }, costUSD: 0.21, latencyMs: 4, model: req.model?.id, meta: { providerTaskId: taskId } }; };
  const r = await pedir('colaD2', 'vid-d2');
  const job = await trabajoDe('colaD2', 'vid-d2');
  const precio = Math.abs(uso('vid-d2')?.amount ?? 0);
  medida(`D8/D9 referencia inservible: puerta ${codigo(r)} · trabajo ${JSON.stringify(resumenDe(job))} · reserva ${uso('vid-d2')?.status} · tareas en ModelArk ${tareasEnModelArk.length}`);
  check('D8) una tarea aceptada con un nombre inservible NO queda esperando: el Gateway la rechaza (`accepted_without_operation`), el intento falla (`dispatched: true`) y el trabajo es `failed` sin referencia',
    !r.ok && job?.state === 'failed' && job.attempts[0].dispatched === true && !job.attempts[0].providerRef && job.attempts[0].outcome === 'failed');
  bandera('D9) y entonces la puerta DEVUELVE la reserva entera aunque el proveedor SÍ tiene la tarea (1 en ModelArk): la persona queda a salvo y el coste de proveedor queda sin dueño —la fila del libro lo anota «en riesgo»—',
    uso('vid-d2')?.status === 'REFUNDED' && reembolso('vid-d2')?.amount === precio && saldo('colaD2') === SALDO && tareasEnModelArk.length === 1
    && filaDelLibro('vid-d2')?.providerCostStatus === 'desconocido');
}

/* ═══════════════════════════════════════════════════════════════════════════
 * E · LA RESERVA DE UN TRABAJO QUE NO SE COMPLETA: QUÉ LA CIERRA HOY, Y QUÉ LA CERRARÍA EL MECANISMO QUE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n── E · Cerrar una reserva huérfana: a mano, y con el `barrerRecuperables` que nadie llama ──');
{
  /* a mano: el administrador reembolsa una reserva huérfana (P1) */
  await escenarioDeMuerte('P1m', 'colaE1', 'vid-e1', 2);
  const r = await creditEngine.refundCredits({ userId: 'colaE1', requestId: 'vid-e1', reason: 'administración', source: 'admin' });
  const p = informeDeBarrido(await barrido());
  const job = await trabajoDe('colaE1', 'vid-e1');
  check('E1) UN reembolso de administración cierra la reserva (`REFUNDED`, saldo entero) y es idempotente: repetirlo no devuelve dos veces',
    r.duplicate === false && uso('vid-e1').status === 'REFUNDED' && saldo('colaE1') === SALDO && (await creditEngine.refundCredits({ userId: 'colaE1', requestId: 'vid-e1', reason: 'otra vez', source: 'admin' })).duplicate === true && saldo('colaE1') === SALDO);
  bandera('E2) pero el TRABAJO queda `queued` (nadie lo cierra ni lo cancela): el barrido lo sigue viendo «esperar · recuperable» para siempre, aunque su dinero ya esté devuelto',
    job.state === 'queued' && p.esperando === 1 && p.devueltos === 0);
  const nuevo = await pedir('colaE1', 'vid-e1');
  check('E3) y la persona no puede reutilizar esa petición: ALREADY_REFUNDED (una petición devuelta no se reutiliza); tiene que pedir otra', !nuevo.ok && codigo(nuevo) === 'ALREADY_REFUNDED' && llamadas.length === 0, codigo(nuevo));
}
{
  /* SI SE CONECTARA `barrerRecuperables` (hoy 0 llamadores): P1, P2 y P3 con el barrido de dinero que ya existe. */
  const cerrar = async (uid, requestId, t) => {
    adelanto = t;
    const rec = recuperacion();
    const recuperada = await barrerRecuperables(rec.deps, { limit: 100 });
    const dinero = informeDeBarrido(await barrido());
    return { recuperada, dinero, job: await trabajoDe(uid, requestId) };
  };
  await escenarioDeMuerte('P1c', 'colaE2', 'vid-e2', 2);
  const precio1 = ESCENARIOS.P1c.precio;
  const c1 = await cerrar('colaE2', 'vid-e2', HORAS_2_15 + MINUTO);
  medida(`SI SE CONECTARA · P1 (queued) a las 2 h 16: ${JSON.stringify(c1.recuperada)} · trabajo ${c1.job.state} · barrido ${JSON.stringify(c1.dinero)} · reserva ${uso('vid-e2').status}`);
  check('E4) SI SE CONECTARA · P1 (`queued`, nunca reclamado): solo al pasar el plazo (2 h 15) vence, y entonces el barrido de dinero lo DEVUELVE entero, UNA vez',
    c1.job.state === 'timed_out' && uso('vid-e2').status === 'REFUNDED' && reembolso('vid-e2')?.amount === precio1 && saldo('colaE2') === SALDO && c1.dinero.devueltos === 1);
  const otra = informeDeBarrido(await barrido());
  check('E5) y otra pasada no devuelve dos veces (idempotente): 0 devueltos, el saldo no cambia', otra.devueltos === 0 && saldo('colaE2') === SALDO && base.de('creditTransactions').filter((t) => t.requestId === 'vid-e2' && t.type === 'refund').length === 1);

  await escenarioDeMuerte('P2c', 'colaE3', 'vid-e3', 3);
  const c2 = await cerrar('colaE3', 'vid-e3', 2 * MINUTO);
  medida(`SI SE CONECTARA · P2 (reclamado, sin salir) a los 2 min: ${JSON.stringify(c2.recuperada)} · trabajo ${c2.job.state} · barrido ${JSON.stringify(c2.dinero)} · reserva ${uso('vid-e3').status}`);
  check('E6) SI SE CONECTARA · P2 (reclamado, no salió, concesión caducada): el trabajo se cierra `failed` (con UN intento el reclamo se gasta) y el dinero se DEVUELVE a los 2 min, sin ningún POST',
    c2.job.state === 'failed' && c2.job.attempts[0].dispatched === false && uso('vid-e3').status === 'REFUNDED' && saldo('colaE3') === SALDO && llamadas.length === 0 && c2.dinero.devueltos === 1);

  await escenarioDeMuerte('P3c', 'colaE4', 'vid-e4', 4);
  const c3 = await cerrar('colaE4', 'vid-e4', 2 * MINUTO);
  const marca = base.de('jobs').find((d) => JSON.parse(d.json).jobId === c3.job.jobId)?.liquidacion;
  medida(`SI SE CONECTARA · P3 (salió, sin referencia) a los 2 min: ${JSON.stringify(c3.recuperada)} · trabajo ${c3.job.state} · barrido ${JSON.stringify(c3.dinero)} · reserva ${uso('vid-e4').status}`);
  check('E7) SI SE CONECTARA · P3 (salió y no se guardó la referencia): pasa a `waiting`/`unknown` y el barrido lo cuenta «a reconciliar» UNA vez, sin devolver: sigue `AUTHORIZED` y la tarea de ModelArk sigue sin nombre',
    c3.job.state === 'waiting' && c3.job.attempts[0].outcome === 'unknown' && !c3.job.attempts[0].providerRef && c3.dinero.aReconciliar === 1 && c3.dinero.devueltos === 0 && uso('vid-e4').status === 'AUTHORIZED' && marca === 'hecha' && tareasEnModelArk.length === 1);

  /* dos pasadas a la vez: una transición y un reembolso */
  await escenarioDeMuerte('P2d', 'colaE5', 'vid-e5', 3);
  adelanto = 2 * MINUTO;
  const a = recuperacion(); const b = recuperacion();
  const [ra, rb] = await Promise.all([barrerRecuperables(a.deps, { limit: 100 }), barrerRecuperables(b.deps, { limit: 100 })]);
  const [da, db2] = await Promise.all([barrido(), barrido()]);
  const reembolsos = base.de('creditTransactions').filter((t) => t.requestId === 'vid-e5' && t.type === 'refund').length;
  medida(`dos recuperaciones a la vez: ${JSON.stringify([ra, rb])} · dos barridos a la vez: ${JSON.stringify([informeDeBarrido(da).devueltos, informeDeBarrido(db2).devueltos])} · reembolsos escritos ${reembolsos}`);
  check('E8) DOS pasadas de recuperación y DOS barridos a la vez sobre el mismo huérfano: UNA transición (la otra pierde el compare-and-set) y UN reembolso, el saldo entero',
    ra.recuperados + rb.recuperados === 1 && (await trabajoDe('colaE5', 'vid-e5')).state === 'failed' && reembolsos === 1 && uso('vid-e5').status === 'REFUNDED' && saldo('colaE5') === SALDO);
}

/* ── E3 · el proveedor mudo: aceptado con referencia, y ModelArk no contesta ── */
{
  await mundoNuevo('colaE6');
  const r = await pedir('colaE6', 'vid-e6');
  const job = await trabajoDe('colaE6', 'vid-e6');
  const tarea = job.attempts[0].providerRef.operationId;
  const lineas = [];
  for (const [nombre, t] of [['+2 h 16', HORAS_2_15 + MINUTO], ['+6 d', 6 * DIA], ['+8 d', 8 * DIA], ['+30 d', 30 * DIA]]) {
    adelanto = t;
    const rep = await barrido();
    lineas.push({ nombre, estado: (await trabajoDe('colaE6', 'vid-e6')).state, reserva: uso('vid-e6').status, preguntados: rep.reconciliacion?.preguntados ?? 0, rendidos: rep.reconciliacion?.rendidos ?? 0, esperando: rep.liquidacion.skipped });
    medida(`E3 proveedor mudo ${nombre}: ${JSON.stringify(lineas[lineas.length - 1])}`);
  }
  check('E9) un aceptado CON referencia y un proveedor que no contesta: pasadas las 2 h 15 (plazo del trabajo) NADIE lo vence: sigue `waiting`, `AUTHORIZED`, y se le sigue preguntando en cada pasada',
    r.ok && lineas[0].estado === 'waiting' && lineas[0].reserva === 'AUTHORIZED' && lineas[0].preguntados === 1 && lineas[1].preguntados === 1 && lineas[0].esperando === 1);
  bandera('E10) a los 7 días de silencio ModelArk ya no recuerda la tarea: el reconciliador SE RINDE (deja de preguntar: `rendidos`) y no cierra nada: el trabajo sigue `waiting` y la reserva `AUTHORIZED` 30 días después',
    lineas[2].rendidos === 1 && lineas[2].preguntados === 0 && lineas[3].estado === 'waiting' && lineas[3].reserva === 'AUTHORIZED' && tarea !== undefined);
  /* y si ModelArk dice `expired` (la tarea pidió expirar a las 2 h), el barrido devuelve exacto: el único final automático del silencio */
  await mundoNuevo('colaE7');
  await pedir('colaE7', 'vid-e7');
  const tarea2 = (await trabajoDe('colaE7', 'vid-e7')).attempts[0].providerRef.operationId;
  enModelArk.set(tarea2, cuerpo(tarea2, 'expired'));
  adelanto = HORAS_2_15 + MINUTO;
  const rep = await barrido();
  check('E11) si ModelArk contesta `expired` (la tarea pidió expirar a las 2 h) el trabajo falla y el barrido DEVUELVE exacto: es el único final automático de una tarea que no termina',
    (await trabajoDe('colaE7', 'vid-e7')).state === 'failed' && uso('vid-e7').status === 'REFUNDED' && saldo('colaE7') === SALDO && rep.liquidacion.refunded === 1);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * F · REANUDAR TRAS UN REINICIO: ¿OTRO TRABAJADOR RETOMA, CON UN SOLO POST?
 * ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n── F · Otro trabajador retoma lo que dejó uno muerto (por el conductor, que sí sabe retomar) ──');
const { loadConfig } = lib('engine/config.js');
const { normalizeVideoRequest } = lib('engine/video.js');
/**
 * LO QUE HARÍA UNA PUERTA QUE REANUDARA: pedir el medio otra vez con la misma petición, como lo pide `generateVideo` (el
 * conductor de verdad, la misma `pedirMedio`, la misma ejecución `run_<requestId>`). La puerta de hoy NO lo hace —le
 * contesta DUPLICATE_REQUEST a quien reintenta—, pero el conductor SÍ sabe, y Weë Brain lo usa así.
 */
const pedirMedioComoLaPuerta = async (uid, requestId, { politica = POLITICA_DE_VIDEO } = {}) => {
  const { settings } = await loadConfig();
  const normalizado = normalizeVideoRequest({ prompt: PETICION.prompt, durationSec: PETICION.durationSec, aspectRatio: PETICION.aspectRatio, quality: 'auto', model: 'auto' }, settings);
  const conductor = await rt.conductorDeWee({ db: base, aceptaAsincrono: true, ...(politica ? { politica } : {}) });
  return rt.pedirMedio({
    conductor, principal: { userId: uid },
    trace: { traceId: requestId, requestId, userId: uid, workplace: 'studio' },
    capability: 'video.generate', input: { ...normalizado.input, vidaEnElProveedorSec: rt.segundosParaElProveedor(rt.PLAZOS_DE_VIDEO) }, proposito: 'Crear un vídeo',
    ruteo: { modelId: normalizado.modelId, allowedProviders: ['seedance'] },
    contabilidad: { service: 'ai_video_draft', creditsEstimated: 75, creditTransactionId: usageTransactionId(requestId), creditRequestId: requestId },
    contexto: { appId: 'wee', operationId: requestId }, deadlineAt: Date.now() + HORAS_2_15,
  });
};
/* ── Ayudantes de ENTREGAS: el trabajador de verdad (`atenderEntrega`) con un ejecutor espía, sin Gateway ni red ── */
/** El reloj de A es el de la máquina; el de B va 90 s por delante: más de una concesión entera (60 s). */
const relojA = () => Date.now();
const relojB = () => Date.now() + 90 * SEG;
const config = (worker) => ({ worker, visibilityMs: 30_000, backpressureDelayMs: 1_000 });
/** Un ejecutor que apunta que salió y contesta «aceptada» con una referencia; opcionalmente espera a que se le abra una compuerta. */
const ejecutor = (nombre, registro, { compuerta, referencia = 'cgt-desfase-0001' } = {}) => ({
  async ejecutar(dispatch) {
    registro.push(nombre);
    if (compuerta) await compuerta;
    return { attemptId: dispatch.attemptId, outcome: 'unknown', dispatched: true, providerRef: { providerId: 'seedance', operationId: referencia } };
  },
});
const abrir = () => { let soltar; const p = new Promise((r) => { soltar = r; }); return { p, soltar }; };
/** Un trabajo `queued` con su reserva y N avisos suyos en una cola de invocación, ya reclamados: una entrega por trabajador. */
const armarEntregas = async (uid, requestId, motor, { vida = HORAS_2_15, avisos = 2 } = {}) => {
  await mundoNuevo(uid);
  await reservar(uid, requestId);
  const store = almacenDeTrabajos(base);
  const job = (await crearTrabajo(store, motor, peticionDeTrabajo(uid, requestId, vida))).job;
  /* Avisos del MISMO trabajo, como los que dejaría un transporte «al menos una vez». */
  const cola = colaDeInvocacion(() => Date.now());
  for (let i = 0; i < avisos; i++) await cola.enqueue(core.mensajeDeCola(job, Date.now(), i === 0 ? 'created' : 'requeued'));
  const entregas = [];
  for (let i = 0; i < avisos; i++) entregas.push(await cola.claim({ worker: `w-${i}`, at: Date.now(), visibilityMs: 30_000 }));
  if (entregas.some((e) => !e)) throw new Error('armarEntregas: la cola no entregó todos los avisos');
  return { store, cola, job, entregas, entregaA: entregas[0], entregaB: entregas[1] };
};

{
  /* P1 · el trabajo `queued` que nadie reclamó: retomarlo lo ejecuta, con UN POST. */
  await escenarioDeMuerte('F1', 'colaF1', 'vid-f1', 2);
  dejarPasar(2 * MINUTO);
  const d1 = await pedirMedioComoLaPuerta('colaF1', 'vid-f1');
  const j1 = await trabajoDe('colaF1', 'vid-f1');
  medida(`F1 retomar P1: ${JSON.stringify({ estado: d1.estado, motivo: d1.motivo })} · trabajo ${JSON.stringify(resumenDe(j1))} · POST ${llamadas.length}`);
  check('F1) RETOMAR P1 (`queued` sin reclamar): otro trabajador lo reclama y lo ejecuta — UN solo POST, referencia guardada, `waiting`, UN intento',
    d1.estado === 'en_marcha' && j1.state === 'waiting' && j1.attemptCount === 1 && !!j1.attempts[0].providerRef && llamadas.length === 1 && tareasEnModelArk.length === 1);
  const tarea = j1.attempts[0].providerRef.operationId;
  enModelArk.set(tarea, cuerpo(tarea, 'succeeded', { content: { video_url: `https://modelark.invalid/${tarea}.mp4` } }));
  adelanto += 10 * MINUTO;
  await barrido();
  check('F1b) y desde ahí el barrido de siempre lo cierra: se COBRA lo reservado, una vez — la cadena entera funciona SI alguien reanuda', (await trabajoDe('colaF1', 'vid-f1')).state === 'completed' && uso('vid-f1').status === 'COMPLETED');

  /* P2 · reclamado y muerto sin enviar, con UN intento: reanudar lo cierra fallido (no hay segundo intento) y devuelve. */
  await escenarioDeMuerte('F2', 'colaF2', 'vid-f2', 3);
  dejarPasar(2 * MINUTO);
  const d2 = await pedirMedioComoLaPuerta('colaF2', 'vid-f2');
  const j2 = await trabajoDe('colaF2', 'vid-f2');
  medida(`F2 retomar P2 (vídeo, 1 intento): ${JSON.stringify({ estado: d2.estado, reembolsoSeguro: d2.reembolsoSeguro })} · trabajo ${JSON.stringify(resumenDe(j2))} · POST ${llamadas.length}`);
  check('F2) RETOMAR P2 con la política del vídeo (UN intento): el reclamo muerto se gastó, así que NO hay retoma: el trabajo se cierra `failed`, 0 POST, y se dice que devolver es seguro',
    d2.estado === 'fallado' && d2.reembolsoSeguro === true && j2.state === 'failed' && j2.attemptCount === 1 && j2.attempts[0].dispatched === false && llamadas.length === 0);

  /* P2 con la política de siempre (tres intentos): sí se retoma, con un intento NUEVO. */
  await mundoNuevo('colaF3');
  await reservar('colaF3', 'vid-f3');
  await pedirYMatar('colaF3', 'vid-f3', 3, { invocar: () => pedirMedioComoLaPuerta('colaF3', 'vid-f3', { politica: null }) });
  const antes = resumenDe(await trabajoDe('colaF3', 'vid-f3'));
  dejarPasar(2 * MINUTO);
  const d3 = await pedirMedioComoLaPuerta('colaF3', 'vid-f3', { politica: null });
  const j3 = await trabajoDe('colaF3', 'vid-f3');
  medida(`F3 retomar P2 (3 intentos): antes ${JSON.stringify(antes)} · ${JSON.stringify({ estado: d3.estado })} · trabajo ${JSON.stringify(resumenDe(j3))} · POST ${llamadas.length}`);
  check('F3) RETOMAR P2 con la política de siempre (tres intentos): el intento muerto se cierra `failed` (`lease_expired`) y hay un intento NUEVO, con otra identidad y otra clave de proveedor — UN solo POST en total',
    antes.estado === 'running' && j3.attemptCount === 2 && j3.attempts[0].outcome === 'failed' && j3.attempts[0].dispatched === false && j3.attempts[1].dispatched === true
    && j3.attempts[0].attemptId !== j3.attempts[1].attemptId && j3.attempts[0].providerKey !== j3.attempts[1].providerKey && llamadas.length === 1 && d3.estado === 'en_marcha');

  /* P3b · salió y no se guardó la referencia: reanudar NO repite el POST. */
  await escenarioDeMuerte('F4', 'colaF4', 'vid-f4', 4);
  dejarPasar(2 * MINUTO);
  const d4 = await pedirMedioComoLaPuerta('colaF4', 'vid-f4');
  const j4 = await trabajoDe('colaF4', 'vid-f4');
  medida(`F4 retomar P3b: ${JSON.stringify({ estado: d4.estado, motivo: d4.motivo })} · trabajo ${JSON.stringify(resumenDe(j4))} · POST ${llamadas.length}`);
  check('F4) RETOMAR P3b (salió, sin referencia): NO se repite el POST (sigue habiendo UNO y UNA tarea en ModelArk); el trabajo pasa a `waiting`/`unknown` sin referencia y se dice `outcome_unknown`',
    d4.estado === 'en_marcha' && d4.motivo === 'outcome_unknown' && j4.state === 'waiting' && j4.attempts[0].outcome === 'unknown' && !j4.attempts[0].providerRef && llamadas.length === 1 && tareasEnModelArk.length === 1);
  bandera('F5) y su dinero queda en «reconciliar» (la tarea de ModelArk sin nombre): reanudar evita el segundo POST pero NO recupera la referencia que se perdió', uso('vid-f4').status === 'AUTHORIZED' && informeDeBarrido(await barrido()).aReconciliar === 1);

  /* DOS conductores a la vez retoman el mismo huérfano */
  await escenarioDeMuerte('F6', 'colaF6', 'vid-f6', 2);
  dejarPasar(2 * MINUTO);
  const [ua, ub] = await Promise.all([pedirMedioComoLaPuerta('colaF6', 'vid-f6'), pedirMedioComoLaPuerta('colaF6', 'vid-f6')]);
  const j6 = await trabajoDe('colaF6', 'vid-f6');
  medida(`F6 dos conductores a la vez: ${JSON.stringify([ua.estado, ub.estado])} · POST ${llamadas.length} · trabajo ${JSON.stringify(resumenDe(j6))}`);
  check('F6) DOS trabajadores retoman el mismo huérfano a la vez: UN solo POST y un solo trabajo, `waiting` (el compare-and-set decide; el otro dice «en curso»)', llamadas.length === 1 && trabajosGuardados().length === 1 && j6.state === 'waiting' && j6.attemptCount === 1);
}

/* ── El desfase de reloj entre instancias: un trabajador cuyo reloj va 90 s por delante ve caducada una concesión VIVA ── */
{
  const T = relojReal();
  const armarElMundo = (uid, requestId, motor, vida) => armarEntregas(uid, requestId, motor, { vida, avisos: 2 });

  /* 1 · A ya ENVIÓ y su proveedor tarda; B, con el reloj adelantado, ve la concesión caducada. */
  {
    const { store, cola, job, entregaA, entregaB } = await armarElMundo('colaF7', 'vid-f7', motorDeVideo);
    const salidas = []; const compuerta = abrir();
    const pa = atenderEntrega({ store, queue: cola, engine: motorDeVideo, executor: ejecutor('A', salidas, { compuerta: compuerta.p }), config: config('w-A'), now: relojA }, entregaA);
    await esperarHasta(() => trabajosGuardados().some((j) => j.attempts[0]?.dispatched === true));
    const rb = await atenderEntrega({ store, queue: cola, engine: motorDeVideo, executor: ejecutor('B', salidas), config: config('w-B'), now: relojB }, entregaB);
    const mitad = await store.obtener(job.jobId);
    compuerta.soltar();
    const ra = await pa;
    const final = await store.obtener(job.jobId);
    medida(`F7 desfase de 90 s, A ya envió: B → ${rb.outcome}/${rb.detail}; a medias ${JSON.stringify(resumenDe(mitad))}; A → ${ra.outcome}; final ${JSON.stringify(resumenDe(final))}; ejecuciones ${salidas.join(',')}`);
    check('F7) DESFASE DE RELOJ (B va 90 s por delante) con A ya enviado: B recupera la concesión «caducada» (el intento pasa a `waiting`/`unknown`), NO ejecuta nada, y SOLO sale A — un POST',
      rb.outcome === 'skipped' && mitad.state === 'waiting' && mitad.attempts[0].outcome === 'unknown' && salidas.join(',') === 'A');
    check('F8) y el informe TARDÍO de A (con la referencia) SÍ aterriza: el intento `unknown` sigue abierto a que alguien cuente qué pasó, así que la referencia no se pierde — `waiting` con referencia, un intento',
      ra.outcome === 'executed' && final.state === 'waiting' && final.attempts[0].providerRef?.operationId === 'cgt-desfase-0001' && final.attemptCount === 1);
  }
  /* 2 · A todavía NO había marcado el envío (lento antes de salir), con UN intento. */
  {
    const { store, cola, job, entregaA, entregaB } = await armarElMundo('colaF8', 'vid-f8', motorDeVideo);
    const salidas = []; const compuerta = abrir(); let escrituras = 0;
    const tiendaDeA = { ...store, async aplicar(t) { escrituras++; if (escrituras === 2) await compuerta.p; return store.aplicar(t); } };
    const pa = atenderEntrega({ store: tiendaDeA, queue: cola, engine: motorDeVideo, executor: ejecutor('A', salidas), config: config('w-A'), now: relojA }, entregaA);
    await esperarHasta(() => escrituras === 2);
    const rb = await atenderEntrega({ store, queue: cola, engine: motorDeVideo, executor: ejecutor('B', salidas), config: config('w-B'), now: relojB }, entregaB);
    compuerta.soltar();
    const ra = await pa;
    const final = await store.obtener(job.jobId);
    medida(`F9 desfase de 90 s, A sin enviar, 1 intento: B → ${rb.outcome}/${rb.detail}; A → ${ra.outcome}/${ra.detail}; final ${JSON.stringify(resumenDe(final))}; ejecuciones ${salidas.join(',') || 'ninguna'}`);
    check('F9) DESFASE con A SIN enviar y UN intento: B cierra el intento (`failed`, el reclamo se gasta); A pierde la carrera al marcar el envío (`dispatch_mark_race`) y NO sale: 0 POST, trabajo `failed`, dinero «no salió»',
      rb.outcome === 'skipped' && ra.outcome === 'lost' && ra.detail === 'dispatch_mark_race' && salidas.length === 0 && final.state === 'failed' && rt.decidirLiquidacion(final, T + 120 * SEG).tipo === 'reembolsar');
  }
  /* 3 · lo mismo con los tres intentos de siempre: B retoma y sale UNA vez; A, no. */
  {
    const motorDeSiempre = crearMotorDeTrabajosDeWee().motor;
    const { store, cola, job, entregaA, entregaB } = await armarElMundo('colaF9', 'vid-f9', motorDeSiempre, 9 * MINUTO);
    const salidas = []; const compuerta = abrir(); let escrituras = 0;
    const tiendaDeA = { ...store, async aplicar(t) { escrituras++; if (escrituras === 2) await compuerta.p; return store.aplicar(t); } };
    const pa = atenderEntrega({ store: tiendaDeA, queue: cola, engine: motorDeSiempre, executor: ejecutor('A', salidas), config: config('w-A'), now: relojA }, entregaA);
    await esperarHasta(() => escrituras === 2);
    const rb = await atenderEntrega({ store, queue: cola, engine: motorDeSiempre, executor: ejecutor('B', salidas, { referencia: 'cgt-desfase-0002' }), config: config('w-B'), now: relojB }, entregaB);
    compuerta.soltar();
    const ra = await pa;
    const final = await store.obtener(job.jobId);
    medida(`F10 desfase de 90 s, A sin enviar, 3 intentos: B → ${rb.outcome}; A → ${ra.outcome}/${ra.detail}; final ${JSON.stringify(resumenDe(final))}; ejecuciones ${salidas.join(',')}`);
    check('F10) DESFASE con A SIN enviar y TRES intentos: B recupera y sale UNA vez (intento 2); A pierde al marcar el envío y no sale — un POST en total, `waiting` con la referencia de B',
      rb.outcome === 'executed' && ra.outcome === 'lost' && salidas.join(',') === 'B' && final.attemptCount === 2 && final.attempts[1].providerRef?.operationId === 'cgt-desfase-0002');
  }
  medida('UNKNOWN que sigue siéndolo: cuánto se desfasan DE VERDAD dos instancias de Cloud Run no se puede medir aquí (el reloj entra por la puerta); F7–F10 fijan el comportamiento con 90 s de desfase, muy por encima de lo esperable');
}

/* ═══════════════════════════════════════════════════════════════════════════
 * G · DUPLICADOS, REINTENTOS Y AVISOS REPETIDOS
 * ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n── G · El mismo requestId, otro requestId con lo mismo, y un aviso que llega dos veces ──');
{
  /* G1 · EL MISMO requestId, A LA VEZ, por la puerta. */
  await mundoNuevo('colaG1');
  const [a, b] = await Promise.all([pedir('colaG1', 'vid-g1'), pedir('colaG1', 'vid-g1')]);
  const ganadoras = [a, b].filter((r) => r.ok);
  const perdedoras = [a, b].filter((r) => !r.ok);
  const precio = Math.abs(uso('vid-g1').amount);
  medida(`G1 mismo requestId a la vez: ${JSON.stringify([a.ok ? a.valor.status : codigo(a), b.ok ? b.valor.status : codigo(b)])} · trabajos ${trabajosGuardados().length} · POST ${llamadas.length} · reservas ${base.de('creditTransactions').filter((t) => t.requestId === 'vid-g1' && t.type === 'usage').length}`);
  check('G1) EL MISMO requestId A LA VEZ: una invocación gana (ACCEPTED) y la otra recibe DUPLICATE_REQUEST; UN trabajo, UN POST, UNA reserva (saldo debitado una vez) y UN hueco del día',
    ganadoras.length === 1 && ganadoras[0].valor.status === 'ACCEPTED' && perdedoras.length === 1 && codigo(perdedoras[0]) === 'DUPLICATE_REQUEST'
    && trabajosGuardados().length === 1 && llamadas.length === 1 && saldo('colaG1') === SALDO - precio && cupoDeVideo('colaG1') === 1
    && base.de('creditTransactions').filter((t) => t.requestId === 'vid-g1' && t.type === 'usage').length === 1);
}
{
  /* G2 · OTRO requestId con el mismo contenido: es otra petición. Y lo único que lo frena es el cupo diario. */
  await mundoNuevo('colaG2');
  const x = await pedir('colaG2', 'vid-g2-01');
  const y = await pedir('colaG2', 'vid-g2-02');
  const precio = Math.abs(uso('vid-g2-01').amount);
  bandera('G2) OTRO requestId CON EL MISMO CONTENIDO es otra petición: dos reservas, dos trabajos, DOS POST, el saldo debitado dos veces y dos huecos del día — no hay deduplicación por contenido, solo por requestId',
    x.ok && y.ok && trabajosGuardados().length === 2 && llamadas.length === 2 && saldo('colaG2') === SALDO - 2 * precio && cupoDeVideo('colaG2') === 2 && mismo(llamadas[0].input.prompt, llamadas[1].input.prompt));
  for (let i = 3; i <= 12; i++) await pedir('colaG2', `vid-g2-${String(i).padStart(2, '0')}`);
  const trece = await pedir('colaG2', 'vid-g2-13');
  check('G3) y lo ÚNICO que frena la repetición es el cupo de 12 vídeos al día: el decimotercero recibe RATE_LIMITED ANTES de tocar Credits ni proveedor (12 POST, sin reserva nueva)',
    !trece.ok && trece.error.details?.code === 'RATE_LIMITED' && llamadas.length === 12 && !uso('vid-g2-13') && saldo('colaG2') === SALDO - 12 * precio, codigo(trece));
  const reintento = await pedir('colaG2', 'vid-g2-01');
  bandera('G4) y DESPUÉS de un ACCEPTED, repetir la MISMA petición contesta DUPLICATE_REQUEST (un error), no el estado ni el ACCEPTED de antes: quien perdió la respuesta no puede saber cómo va su vídeo repitiendo la llamada (la puerta del mundo sí cuenta cómo va)',
    !reintento.ok && codigo(reintento) === 'DUPLICATE_REQUEST' && llamadas.length === 12, codigo(reintento));
}
{
  /* G5 · el aviso del proveedor, dos veces a la vez y tarde. */
  await mundoNuevo('colaG5');
  await pedir('colaG5', 'vid-g5');
  const job = await trabajoDe('colaG5', 'vid-g5');
  const tarea = job.attempts[0].providerRef.operationId;
  const final = leerAvisoDeSeedance(cuerpo(tarea, 'succeeded', { content: { video_url: `https://modelark.invalid/${tarea}.mp4` } }));
  const atencion = rt.atencionDeWee({ db: base, materializar: materializador });
  const [r1, r2] = await Promise.all([rt.atenderAviso(atencion, final), rt.atenderAviso(atencion, final)]);
  const estados = [r1.estado, r2.estado].sort();
  const materiales = base.de('assets').filter((m) => m.ownerAccountId === 'colaG5');
  medida(`G5 aviso doble a la vez: ${JSON.stringify(estados)} · material ${materiales.length} · descargas pedidas ${traidos.length}`);
  check('G5) EL MISMO AVISO DOS VECES A LA VEZ (un webhook reintentado): uno se aplica y el otro es «repetido» — un trabajo completado, UN material con la misma identidad calculada', mismo(estados, ['aplicado', 'repetido']) && (await trabajoDe('colaG5', 'vid-g5')).state === 'completed' && materiales.length === 1);
  const antes = traidos.length;
  const r3 = await rt.atenderAviso(atencion, final);
  const tardio = await rt.atenderAviso(atencion, leerAvisoDeSeedance(cuerpo(tarea, 'failed', { error: { code: 'InternalServiceError', message: 'fallo tardío' } })));
  check('G6) y otra vez después, o un FALLO tardío sobre algo ya completado: «repetido», sin traer nada otra vez y sin deshacer lo hecho — el trabajo sigue completado', r3.estado === 'repetido' && tardio.estado === 'repetido' && traidos.length === antes && (await trabajoDe('colaG5', 'vid-g5')).state === 'completed');
  adelanto = 10 * MINUTO;
  const p1 = informeDeBarrido(await barrido());
  const p2 = informeDeBarrido(await barrido());
  check('G7) y el dinero se cobra UNA vez: dos pasadas del barrido dejan `COMPLETED`, el saldo en lo reservado menos el precio, sin reembolso', uso('vid-g5').status === 'COMPLETED' && !reembolso('vid-g5') && p1.cobrados === 1 && p2.mirados === 0 && saldo('colaG5') === SALDO - Math.abs(uso('vid-g5').amount));
}
{
  /* G8 · un aviso DE LA COLA entregado tres veces a la vez: una ejecución. */
  const { store, cola, job, entregas } = await armarEntregas('colaG8', 'vid-g8', motorDeVideo, { avisos: 3 });
  const salidas = [];
  const resultados = await Promise.all(entregas.map((e, i) => atenderEntrega({ store, queue: cola, engine: motorDeVideo, executor: ejecutor(`w${i}`, salidas), config: config(`w-${i}`), now: relojA }, e)));
  const finalG8 = await store.obtener(job.jobId);
  medida(`G8 tres entregas a la vez: ${JSON.stringify(resultados.map((r) => `${r.outcome}/${r.detail}`))} · ejecuciones ${salidas.length} · trabajo ${JSON.stringify(resumenDe(finalG8))}`);
  check('G8) EL MISMO AVISO ENTREGADO TRES VECES A LA VEZ (cola «al menos una vez»): UNA ejecución, UN intento; las otras dos entregas no hacen nada (`lost`/`skipped`)',
    salidas.length === 1 && resultados.filter((r) => r.outcome === 'executed').length === 1 && finalG8.attemptCount === 1 && finalG8.state === 'waiting');
}

/* ═══════════════════════════════════════════════════════════════════════════
 * H · CANCELAR MIENTRAS SE RECUPERA
 * ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n── H · Cancelar un huérfano, y cancelar a la vez que se recupera ──');
const deParada = () => ({ motor: motorDeVideo, almacen: almacenDeTrabajos(base), resolutores: {}, ahora: () => Date.now() });
{
  /* H1 · un `queued` que nadie reclamó: se cancela en el acto. */
  await escenarioDeMuerte('H1', 'colaH1', 'vid-h1', 2);
  const parada = await rt.pedirParada(deParada(), await trabajoDe('colaH1', 'vid-h1'), { userId: 'colaH1' });
  const rep = informeDeBarrido(await barrido());
  check('H1) CANCELAR el `queued` huérfano (P1): se cancela en el acto (`cancelled`: nadie lo tenía, nada que parar) y el barrido DEVUELVE la reserva entera, una vez — lo que haría una puerta de cancelación (la de vídeo no la tiene)',
    parada.estado === 'cancelado' && (await trabajoDe('colaH1', 'vid-h1')).state === 'cancelled' && rep.devueltos === 1 && uso('vid-h1').status === 'REFUNDED' && saldo('colaH1') === SALDO && llamadas.length === 0);
}
{
  /* H2 · reclamado y muerto sin enviar: la parada se consuma al evaluar, y se devuelve. */
  await escenarioDeMuerte('H2', 'colaH2', 'vid-h2', 3);
  const parada = await rt.pedirParada(deParada(), await trabajoDe('colaH2', 'vid-h2'), { userId: 'colaH2' });
  const pedido = (await trabajoDe('colaH2', 'vid-h2')).state;
  const pasada0 = informeDeBarrido(await barrido());
  adelanto = 2 * MINUTO;
  await barrerRecuperables(recuperacion().deps, { limit: 100 });
  const consumada = (await trabajoDe('colaH2', 'vid-h2')).state;
  const rep = informeDeBarrido(await barrido());
  medida(`H2 cancelar P2: parada ${parada.estado} → ${pedido}; barrido sin evaluar ${JSON.stringify(pasada0)}; tras evaluar a los 2 min → ${consumada}; barrido → devueltos ${rep.devueltos}`);
  check('H2) CANCELAR el reclamado que no salió (P2): queda `cancel_requested` (se PIDE parar), el barrido de hoy NO lo cierra, y SOLO si alguien evalúa la concesión caducada se consuma `cancelled` y se devuelve',
    parada.estado === 'pedida' && pedido === 'cancel_requested' && pasada0.devueltos === 0 && pasada0.esperando === 1 && consumada === 'cancelled' && rep.devueltos === 1 && uso('vid-h2').status === 'REFUNDED');
}
{
  /* H3 · salió y no hay referencia: no hay a quién pedirle parar, y el dinero se queda. */
  await escenarioDeMuerte('H3', 'colaH3', 'vid-h3', 4);
  const parada = await rt.pedirParada(deParada(), await trabajoDe('colaH3', 'vid-h3'), { userId: 'colaH3' });
  adelanto = 2 * MINUTO;
  await barrerRecuperables(recuperacion().deps, { limit: 100 });
  const tras2 = (await trabajoDe('colaH3', 'vid-h3')).state;
  adelanto = HORAS_2_15 + MINUTO;
  await barrerRecuperables(recuperacion().deps, { limit: 100 });
  const repFinal = informeDeBarrido(await barrido());
  const jobFinal = await trabajoDe('colaH3', 'vid-h3');
  medida(`H3 cancelar P3b: parada ${parada.estado} (proveedor ${parada.proveedor ?? '—'}) · a los 2 min ${tras2} · tras el plazo ${jobFinal.state} · barrido ${JSON.stringify(repFinal)}`);
  bandera('H3) CANCELAR el que SALIÓ sin referencia (P3b): se pide parar pero no hay a quién (Seedance no tiene `cancelar` y no hay referencia), el trabajo se queda `cancel_requested` hasta el plazo y acaba `timed_out` con el dinero en «reconciliar»: cancelar NO libera la reserva',
    parada.estado === 'pedida' && parada.proveedor === undefined && tras2 === 'cancel_requested' && jobFinal.state === 'timed_out' && repFinal.aReconciliar === 1 && uso('vid-h3').status === 'AUTHORIZED' && !('cancelar' in (lib('engine/registry.js').RESOLUTORES_DE_ESTADO.seedance)));
}
{
  /* H4 · cancelar y recuperar a la vez, desde la misma revisión: gana UNO. */
  await escenarioDeMuerte('H4', 'colaH4', 'vid-h4', 3);
  adelanto = 2 * MINUTO;
  const job = await trabajoDe('colaH4', 'vid-h4');
  const evaluada = motorDeVideo.evaluar(job, Date.now());
  const cancelada = motorDeVideo.cancelar(job, { userId: 'colaH4' }, Date.now());
  const store = almacenDeTrabajos(base);
  const [ra, rb] = await Promise.all([store.aplicar(evaluada.transition), store.aplicar(cancelada.transition)]);
  const aplicadas = [ra, rb].filter((r) => r.applied).length;
  medida(`H4 cancelar y recuperar a la vez: evaluar → ${evaluada.transition.to} (${ra.applied ? 'aplicada' : 'perdió'}) · cancelar → ${cancelada.transition.to} (${rb.applied ? 'aplicada' : 'perdió'}) · final ${(await trabajoDe('colaH4', 'vid-h4')).state}`);
  check('H4) CANCELAR y RECUPERAR a la vez sobre el mismo trabajo y la misma revisión: exactamente UNA transición se aplica (compare-and-set) y la otra pierde sin error; el trabajo no queda a medias', aplicadas === 1 && ['failed', 'cancel_requested'].includes((await trabajoDe('colaH4', 'vid-h4')).state));
}

{
  /*
   * H5/H6 · CANCELAR MIENTRAS EL PROVEEDOR TRABAJA: se PIDE parar (que no es parar) y manda el final que él diga. Es el motor de
   * siempre —el que usa la puerta del mundo—; la de vídeo no lo expone, y el resolutor de Seedance no sabe pedir parada.
   */
  for (const [uid, rid, respuesta] of [['colaH5', 'vid-h5', 'cancelled'], ['colaH6', 'vid-h6', 'succeeded']]) {
    await mundoNuevo(uid);
    await pedir(uid, rid);
    const job = await trabajoDe(uid, rid);
    const tarea = job.attempts[0].providerRef.operationId;
    const peticiones = [];
    const conParada = { seedance: { consultar: (ref) => resolutor.consultar(ref), async cancelar(ref) { peticiones.push(ref.operationId); return 'pedida'; } } };
    const parada = await rt.pedirParada({ motor: motorDeVideo, almacen: almacenDeTrabajos(base), resolutores: conParada, ahora: () => Date.now() }, job, { userId: uid });
    const alPedir = { estado: (await trabajoDe(uid, rid)).state, reserva: uso(rid).status };
    enModelArk.set(tarea, respuesta === 'cancelled' ? cuerpo(tarea, 'cancelled') : cuerpo(tarea, 'succeeded', { content: { video_url: `https://modelark.invalid/${tarea}.mp4` } }));
    adelanto = 10 * MINUTO;
    await barrido();
    const alFinal = { estado: (await trabajoDe(uid, rid)).state, reserva: uso(rid).status };
    medida(`${respuesta === 'cancelled' ? 'H5' : 'H6'} cancelar con el proveedor trabajando y él contesta «${respuesta}»: parada ${parada.estado}/${parada.proveedor} · al pedir ${JSON.stringify(alPedir)} · al final ${JSON.stringify(alFinal)}`);
    if (respuesta === 'cancelled') {
      check('H5) CANCELAR con el proveedor trabajando (tarea aceptada, CON referencia): `cancel_requested` y se le pide parar a él; si él contesta «cancelada», la parada se consuma `cancelled` y se DEVUELVE exacta',
        parada.estado === 'pedida' && parada.proveedor === 'pedida' && peticiones.length === 1 && alPedir.estado === 'cancel_requested' && alPedir.reserva === 'AUTHORIZED'
        && alFinal.estado === 'cancelled' && alFinal.reserva === 'REFUNDED' && saldo(uid) === SALDO);
    } else {
      check('H6) y si EL FINAL BUENO llega después de pedir parar, GANA el final: `completed` y se COBRA lo reservado — lo que ya existe y costó dinero no se tira por una cancelación que llegó tarde',
        parada.estado === 'pedida' && alPedir.estado === 'cancel_requested' && alFinal.estado === 'completed' && alFinal.reserva === 'COMPLETED' && !reembolso(rid));
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * I · LA INANICIÓN DEL BARRIDO: LA VENTANA DE 10×100 SIN CURSOR PERSISTIDO Y LAS 12 PREGUNTAS
 * ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n── I · Mil trabajos esperando delante: el que sí se puede cerrar no llega a verse ──');
{
  await mundoNuevo('colaI1');
  const U = 'colaI1';
  const store = almacenDeTrabajos(base);
  const principal = { userId: U };
  /** Un trabajo ya en su estado final de interés, construido con las operaciones de verdad del motor y guardado de una vez (`crearSiAusente`). */
  const jobEn = (requestId, estado, tarea) => {
    let job = motorDeVideo.crear(peticionDeTrabajo(U, requestId)).job;
    const r = motorDeVideo.reclamar(job, { principal, at: Date.now(), worker: 'w-relleno' }); job = r.job;
    job = motorDeVideo.marcarEnvio(job, { principal, at: Date.now(), worker: 'w-relleno', attemptId: r.dispatch.attemptId }).job;
    const report = estado === 'completed'
      ? { attemptId: r.dispatch.attemptId, outcome: 'succeeded', dispatched: true, providerRef: { providerId: 'seedance', operationId: tarea }, result: { outputRefs: [`asset_${'0'.repeat(31)}1`] } }
      : { attemptId: r.dispatch.attemptId, outcome: 'unknown', dispatched: true, providerRef: { providerId: 'seedance', operationId: tarea } };
    return motorDeVideo.informar(job, { principal, at: Date.now(), worker: 'w-relleno', report }).job;
  };
  const idDelDocumento = (requestId) => `j.${core.claveDeIdempotencia(core.alcanceDeIdempotencia(U), requestId)}`;
  /* Estos trabajos no los creó la puerta (que nombra su paso `run_<requestId>`): se buscan por la clave con la que se sembraron. */
  const sembrado = (requestId) => store.porIdempotencia(core.alcanceDeIdempotencia(U), requestId);
  const N = 1000;
  for (let i = 1; i <= N; i++) await store.crearSiAusente(jobEn(`vid-i-relleno-${String(i).padStart(4, '0')}`, 'waiting', `cgt-relleno-${String(i).padStart(4, '0')}`));
  const maximo = base.de('jobs').map((d) => d.id).sort().pop();
  /* Dos trabajos cuyo documento va DESPUÉS de los mil: un completado (dinero por cobrar) y un aceptado cuyo proveedor ya terminó. */
  const despuesDeTodos = (prefijo) => { for (let k = 0; ; k++) { const rid = `${prefijo}-${k}`; if (idDelDocumento(rid) > maximo) return rid; } };
  const ridCobrable = despuesDeTodos('vid-i-cobrable');
  const ridTerminado = despuesDeTodos('vid-i-terminado');
  await reservar(U, ridCobrable);
  await store.crearSiAusente(jobEn(ridCobrable, 'completed', 'cgt-cobrable-0001'));
  await reservar(U, ridTerminado);
  await store.crearSiAusente(jobEn(ridTerminado, 'waiting', 'cgt-terminado-0001'));
  enModelArk.set('cgt-terminado-0001', cuerpo('cgt-terminado-0001', 'succeeded', { content: { video_url: 'https://modelark.invalid/cgt-terminado-0001.mp4' } }));
  medida(`I · ${N} trabajos que solo esperan, y 2 más (uno cobrable, uno cuyo proveedor ya terminó) DESPUÉS en el orden de documentos`);
  check('I0) los dos que SÍ se pueden cerrar quedan los dos ÚLTIMOS por identificador de documento (el orden en que los pagina el almacén)', idDelDocumento(ridCobrable) > maximo && idDelDocumento(ridTerminado) > maximo && base.de('jobs').length === N + 2);

  const vistos = [];
  const pasadas = [];
  for (let i = 1; i <= 3; i++) {
    adelanto = (10 + 5 * i) * MINUTO;
    const antes = resolutor.preguntas.length;
    const rep = await barrido();
    vistos.push(resolutor.preguntas.slice(antes));
    pasadas.push({ barrido: informeDeBarrido(rep), agotadas: rep.reconciliacion.agotadas, pendiente: rep.liquidacion.pending });
    medida(`I pasada ${i}: ${JSON.stringify(pasadas[i - 1])} · preguntas ${vistos[i - 1].length} (${vistos[i - 1][0]} … ${vistos[i - 1][vistos[i - 1].length - 1]})`);
  }
  bandera('I1) LA VENTANA DEL BARRENDERO: con 1 000 trabajos que solo esperan DELANTE (10 páginas de 100, siempre desde el principio, sin cursor guardado), tres pasadas miran 1 000 cada una, dejan «quedan páginas» y NO llegan al completado que tiene su dinero por cobrar',
    pasadas.every((p) => p.barrido.mirados === N && p.pendiente === true && p.barrido.cobrados === 0 && p.barrido.esperando === N) && uso(ridCobrable).status === 'AUTHORIZED');
  bandera('I2) LAS 12 PREGUNTAS: cada pasada le hace al proveedor EXACTAMENTE las mismas 12 preguntas, en el mismo orden (por identificador de documento), y para (`agotadas`); el aceptado cuyo proveedor YA TERMINÓ no recibe turno mientras haya 12 delante que no contestan',
    pasadas.every((p) => p.barrido.preguntados === 12 && p.agotadas === true) && vistos.every((v) => v.length === 12 && mismo(v, vistos[0])) && !resolutor.preguntas.includes('cgt-terminado-0001')
    && (await sembrado(ridTerminado)).state === 'waiting' && uso(ridTerminado).status === 'AUTHORIZED');
  check('I3) el cursor NO se guarda en ninguna parte: el informe de la pasada lo devuelve y la tarea programada no escribe nada (ni `set` ni `update` ni `runTransaction` en `settlement/programado.ts`)',
    !/\.set\(|\.update\(|runTransaction|\.create\(/.test(sinComentarios(leer('functions/src/settlement/programado.ts'))) && /porPagina|POR_PAGINA = 100/.test(sinComentarios(leer('functions/src/runtime/barrendero.ts'))) && /MAX_PAGINAS = 10/.test(sinComentarios(leer('functions/src/runtime/barrendero.ts'))));
  /* Y se acaba cuando delante quedan menos de 1 000: marcar como cerrados tres de los que esperaban deja pasar al cobrable. */
  for (const i of [1, 2, 3]) await store.marcarLiquidado(`${idDelDocumento(`vid-i-relleno-${String(i).padStart(4, '0')}`).slice(2)}`);
  adelanto = 30 * MINUTO;
  const alivio = informeDeBarrido(await barrido());
  check('I4) La inanición NO es para siempre: al cerrarse tres de los de delante, el cobrable entra en la ventana de 1 000 y la SIGUIENTE pasada lo cobra (el atraso dura lo que tarden en cerrarse los de delante, no hay cursor que lo adelante)',
    alivio.cobrados === 1 && uso(ridCobrable).status === 'COMPLETED' && (await sembrado(ridTerminado)).state === 'waiting');
}

/* ═══════════════════════════════════════════════════════════════════════════
 * J · EL CAMINO DE SIEMPRE (LEGACY), QUE ES EL VIVO CON LA PUERTA CERRADA
 * ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n── J · Con `aiSettings/runtime` cerrada (producción): el proceso muere a mitad del sondeo ──');
{
  await mundoNuevo('colaJ1');
  cerrarLaPuerta();
  const generarOriginal = videoEngine.generate;
  let sondeos = 0;
  /* El sondeo de Seedance dentro de la llamada: se queda esperando para siempre, como una instancia que muere en mitad. */
  videoEngine.generate = () => { sondeos++; return new Promise(() => {}); };
  const colgada = pedir('colaJ1', 'vid-j1');
  await esperarHasta(() => sondeos === 1);
  videoEngine.generate = generarOriginal;
  const precio = Math.abs(uso('vid-j1').amount);
  check('J1) con la puerta cerrada la llamada va por el camino de siempre: reserva `AUTHORIZED`, saldo debitado, hueco del día ocupado, y NINGÚN trabajo del Core (nada que el barrido pueda ver)',
    uso('vid-j1')?.status === 'AUTHORIZED' && saldo('colaJ1') === SALDO - precio && cupoDeVideo('colaJ1') === 1 && trabajosGuardados().length === 0 && llamadas.length === 0 && colgada instanceof Promise);
  const lineas = await hitos('colaJ1', 'vid-j1');
  bandera('J2) el barrido (cada 5 min, 30 días) NO ve esta reserva —no hay trabajo en `jobs`—: 0 mirados, `AUTHORIZED`, sin devolver; la tarea de ModelArk (si el sondeo ya la había creado) sigue y se factura', lineas.every((l) => l.reserva === 'AUTHORIZED' && l.barrido.mirados === 0 && l.barrido.devueltos === 0));
  const informe = manual.clasificar(base.de('creditTransactions'), Date.now() + 3 * HORA, 2);
  check('J3) el informe manual (solo lectura) la lista pasadas 2 h: es lo único que la ve sin que la persona vuelva', informe.total.reservas === 1 && informe.colgadas[0].requestId === 'vid-j1');
  dejarPasar(5 * MINUTO);
  const pronto = await pedir('colaJ1', 'vid-j1');
  dejarPasar(21 * MINUTO);
  const tarde = await pedir('colaJ1', 'vid-j1');
  check('J4) y se recupera SOLO si la persona repite la misma petición: a los 5 min «ya en curso»; pasados 25 min (`operacionAbandonada`) se devuelve exacta y se le dice',
    !pronto.ok && codigo(pronto) === 'DUPLICATE_REQUEST' && !tarde.ok && tarde.error.details?.code === 'TIMEOUT' && uso('vid-j1').status === 'REFUNDED' && reembolso('vid-j1')?.amount === precio && saldo('colaJ1') === SALDO);
  bandera('J5) y su hueco del día tampoco vuelve (un vídeo devuelto sigue contando para los 12 de hoy)', cupoDeVideo('colaJ1') === 1);
}

check('esta suite está en la cadena de `npm test`', leer('functions/package.json').includes('node test/runtime-recuperacion-caracterizacion.test.mjs'));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
