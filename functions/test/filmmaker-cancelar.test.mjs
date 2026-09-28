/**
 * FILMMAKER ENGINE · FASE 15 (D11) — CANCELAR (DETENER) UNA TOMA.
 *
 *   A · la decisión, pura: cada caso de la tabla, con trabajos de verdad;
 *   B · de punta a punta por la puerta de la toma: aceptada con la puerta de
 *       parada cerrada y abierta (en cola, en marcha, terminada, sin respuesta),
 *       el POST perdido, el fallo del proveedor, la cobrada, en cola en casa,
 *       corriendo sin salir, el POST en vuelo, la reserva sin trabajo (a tiempo
 *       y abandonada), dos veces, tres a la vez, la carrera por el mismo trabajo,
 *       otra cuenta y datos sin forma;
 *   P · la pasada programada que consuma lo pedido parar;
 *   V · la toma, vista: los motivos nuevos y sin categoría de fallo;
 *   Q · la puerta de parada, cerrada por defecto;
 *   G · las guardas: el adaptador solo gana su función, nadie más la llama, el
 *       dinero solo por el puerto, ni una Function nueva;
 *   C · en la app: el servicio, el controlador y el botón.
 *
 * De verdad: la puerta `generateVideo`, el conductor, el Job Engine y su almacén,
 * la reconciliación, la liquidación, el Credit Engine, productions, F1-A y la
 * cadena de F1-D, sobre un Firestore en memoria (el arnés de
 * `f1d-postcanary.test.mjs`, copiado tal cual). De mentira: el adaptador de
 * Seedance al crear, y ModelArk al preguntar y al borrar (`fetchJson`).
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const sinCR = (s) => s.replace(/\r\n/g, '\n');
const leer = (p) => sinCR(fs.readFileSync(path.resolve(RAIZ, p), 'utf8'));
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const git = (args) => sinCR(execSync(`git ${args}`, { cwd: RAIZ, encoding: 'utf8' }));
/** El puente cerrado y aprobado: lo que F1-D no puede mover se compara con él. */
const PUENTE = 'a0eb853';
const CREDITS = '8e91daa';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const intento = async (fn) => { try { return { ok: true, valor: await fn() }; } catch (error) { return { ok: false, error }; } };

/* ═══ Firestore en memoria ═══════════════════════════════════════════════ */
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
class Base {
  constructor() { this.docs = new Map(); this.cola = Promise.resolve(); this.auto = 0; this.lecturas = []; }
  collection(p) { return new Consulta(this, p); }
  doc(p) { return new Ref(this, p); }
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
      create: (ref, data) => { escrituras.push({ tipo: 'create', ref, data }); return b; },
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
  for (const [k, v] of Object.entries(w.data)) { const r = resolver(v, out[k], false); if (r === undefined) delete out[k]; else out[k] = r; }
  base.docs.set(w.ref.path, out);
};
const foto = (ref, d) => ({ exists: d !== undefined, id: ref.id, ref, data: () => d, get: (f) => (d === undefined ? undefined : leerCampo(d, f)) });
class Ref {
  constructor(base, p) { this.base = base; this.path = p; this.id = p.split('/').pop(); }
  collection(c) { return new Consulta(this.base, `${this.path}/${c}`); }
  async get() { this.base.lecturas.push(this.path); return foto(this, this.base.leer(this.path)); }
  async create(data) { escribir(this.base, { tipo: 'create', ref: this, data }); }
  async set(data, opts) { escribir(this.base, { tipo: 'set', ref: this, data, merge: !!opts?.merge }); }
  async update(data) { escribir(this.base, { tipo: 'update', ref: this, data }); }
  async delete() { this.base.docs.delete(this.path); }
}
class Consulta {
  constructor(base, p, filtros = [], tope = null, orden = null, despues = null) { Object.assign(this, { base, path: p, filtros, tope, orden, despues }); }
  doc(id) { return new Ref(this.base, `${this.path}/${id ?? `auto_${++this.base.auto}`}`); }
  otra(c) { return Object.assign(new Consulta(this.base, this.path, this.filtros, this.tope, this.orden, this.despues), c); }
  where(campo, op, valor) {
    if (!['==', 'array-contains'].includes(op)) throw new Error(`esta base de prueba solo sabe «==» y «array-contains»: ${op}`);
    return this.otra({ filtros: [...this.filtros, [String(campo), op, valor]] });
  }
  orderBy(campo, dir) { return this.otra({ orden: [typeof campo === 'string' ? campo : '__id__', dir] }); }
  startAfter(cursor) { return this.otra({ despues: cursor }); }
  limit(tope) { return this.otra({ tope }); }
  count() { return { get: async () => { const s = await this.get(); return { data: () => ({ count: s.size }) }; } }; }
  async get() {
    let filas = [...this.base.docs.entries()].filter(([p]) => p.startsWith(`${this.path}/`) && !p.slice(this.path.length + 1).includes('/'));
    filas = filas.filter(([, d]) => this.filtros.every(([f, op, v]) => (op === '==' ? leerCampo(d, f) === v : Array.isArray(leerCampo(d, f)) && leerCampo(d, f).includes(v))));
    if (this.orden) {
      const [campo, dir] = this.orden;
      const valor = (fila) => (campo === '__id__' ? fila[0].split('/').pop() : leerCampo(fila[1], campo));
      filas.sort((a, b) => (valor(a) < valor(b) ? -1 : valor(a) > valor(b) ? 1 : 0) * (dir === 'desc' ? -1 : 1));
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
  getAll(...refs) { return Promise.all(refs.map((r) => r.get())); }
  create(ref, data) { this.escrituras.push({ tipo: 'create', ref, data }); return this; }
  set(ref, data, opts) { this.escrituras.push({ tipo: 'set', ref, data, merge: !!opts?.merge }); return this; }
  update(ref, data) { this.escrituras.push({ tipo: 'update', ref, data }); return this; }
  delete(ref) { this.escrituras.push({ tipo: 'delete', ref }); return this; }
  confirmar() { for (const w of this.escrituras) escribir(this.base, w); }
}
const base = new Base();
fa.getFirestore = () => base;

/* ═══ El almacén de objetos y los bytes, de mentira ═══════════════════════ */
const http = lib('engine/http.js');
const { ProviderError } = http;
const objetos = new Map();
let descargas = 0;
const archivo = (ruta) => ({
  name: ruta,
  async save(bytes, opts) {
    if (opts?.preconditionOpts?.ifGenerationMatch === 0 && objetos.has(ruta)) throw Object.assign(new Error('precondición'), { code: 412 });
    objetos.set(ruta, { bytes, contentType: opts?.metadata?.contentType, metadata: { ...(opts?.metadata?.metadata ?? {}) } });
  },
  async getMetadata() {
    const o = objetos.get(ruta);
    if (!o) throw Object.assign(new Error('no existe'), { code: 404 });
    return [{ contentType: o.contentType, size: String(o.bytes.length), metadata: { ...o.metadata } }];
  },
  async delete() { objetos.delete(ruta); },
  async exists() { return [objetos.has(ruta)]; },
});
const cubo = {
  name: 'cubo-de-prueba',
  file: archivo,
  async getFiles({ prefix, maxResults } = {}) {
    return [[...objetos.keys()].filter((k) => !prefix || k.startsWith(prefix)).slice(0, maxResults ?? 1000).map(archivo)];
  },
};
http.storageBucket = () => cubo;
http.fetchBytes = async (url) => { descargas++; return { buffer: Buffer.from(`vídeo de ${url}`), contentType: 'video/mp4' }; };

/* ═══ Las piezas de verdad ═══════════════════════════════════════════════ */
const video = lib('creator/video.js');
const toma = lib('creator/toma.js');
const plano = lib('creator/plano.js');
const rt = lib('runtime/index.js');
const shotsPuerta = lib('shots/puerta.js');
const shotsMod = lib('shots/index.js');
const producciones = lib('productions/index.js');
const M = lib('filmmaker/modelo.js');
const Rq = lib('filmmaker/requisitos.js');
const contenido = lib('content/index.js');
const { materializadorDeWee, MARCA_DE_MATERIAL } = lib('content/materializador.js');
const { identidadDelMaterial } = lib('runtime/materializacion.js');
const { olvidarLaPuerta } = lib('runtime/configuracion.js');
const { creditEngine } = lib('credits/creditEngine.js');
const creditCosts = lib('credits/creditCosts.js');
const { leerAvisoDeSeedance, buildSeedanceBody, SEEDANCE_MODEL_IDS } = lib('engine/providers/seedance.js');
const { DEFAULT_ROUTING, ADAPTERS } = lib('engine/registry.js');

/* ═══ ModelArk, de mentira: acepta como el adaptador de verdad, o falla como él ═══ */
const { ProviderError: ErrorDeProveedor } = http;
const ledger = lib('engine/ledger.js');
const fallos = lib('creator/fallos.js');
const seedance = ADAPTERS.seedance;
const posts = [];
let serie = 0;
/* Cómo contesta el próximo POST: 'aceptar' —lo normal— o un fallo del proveedor. */
let modo = 'aceptar';
/* Lo que el adaptador de verdad cuenta al aceptar: su estimación, y la tarifa oficial de «Estándar» a 480p. */
const ESTIMACION = { estimatedTokens: 50_000, estimatedUsd: 0.165, usdPerMillionTokens: 3.3, resolution: '480p' };
seedance.isConfigured = () => true;
seedance.run = async (req) => {
  posts.push({ acceptAsync: req.acceptAsync, input: { ...req.input }, modelo: req.model?.id });
  if (modo === 'http404') throw new ErrorDeProveedor('seedance respondió 404: {"error":{"code":"ModelNotOpen","message":"Your account has not activated the model"}}', 'seedance', 404, false);
  if (modo === 'http503') throw new ErrorDeProveedor('seedance respondió 503: servicio no disponible', 'seedance', 503, true);
  if (modo === 'http400') throw new ErrorDeProveedor('seedance respondió 400: {"error":{"code":"InvalidParameter"}}', 'seedance', 400, false);
  if (modo === 'sinRespuesta') throw new ErrorDeProveedor('seedance: socket hang up', 'seedance');
  const taskId = `cgt-pc-${String(++serie).padStart(4, '0')}`;
  /* Justo después del POST, como el de verdad: su estimación y su tarifa, por el gancho de avance. */
  if (req.onStatus) await req.onStatus('PROCESSING', { providerTaskId: taskId, ...ESTIMACION });
  return { accepted: { operationId: taskId }, costUSD: ESTIMACION.estimatedUsd, latencyMs: 3, model: req.model?.id, meta: { providerTaskId: taskId, ...ESTIMACION } };
};
const enModelArk = new Map();
const resolutor = {
  async consultar(ref) {
    const e = enModelArk.get(ref.operationId);
    return e ? { conocido: true, aviso: leerAvisoDeSeedance(e) } : { conocido: false, motivo: 'no_contesta' };
  },
};
/* Cómo acaba la tarea del otro lado: su estado y, SI LO DICE, lo que consumió. */
const termina = (taskId, status = 'succeeded', extra = {}) => enModelArk.set(taskId, {
  id: taskId, status, updated_at: Math.floor(Date.now() / 1000),
  ...(status === 'succeeded' ? { content: { video_url: `https://modelark.invalid/${taskId}.mp4` } } : { error: { code: extra.codigo ?? 'X', message: extra.mensaje ?? status } }),
  ...(extra.usage ? { usage: extra.usage } : {}),
});
const pasada = () => rt.mantenimientoDeWee({
  reconciliacion: () => rt.reconciliacionDeWee({ db: base, resolutores: { seedance: resolutor }, quietoDesdeMs: 0 })(),
  liquidacion: () => rt.barridoDeLiquidacionDeWee({ db: base })(),
})();

/* ═══ Cuentas, la puerta abierta para ellas ══════════════════════════════ */
/* Una cuenta por sección: el cupo diario de vídeo (12) es por cuenta, y aquí se queda como está. */
const A = 'pcUsuarioA0001'; const B = 'pcUsuarioB0001'; const C = 'pcUsuarioC0001';
const D = 'pcUsuarioD0001'; const E = 'pcUsuarioE0001'; const F = 'pcUsuarioF0001';
const SALDO = 50_000;
for (const uid of [A, B, C, D, E, F]) {
  base.docs.set(`users/doc_${uid}`, { uid, displayName: uid });
  await creditEngine.ensureAccount(uid);
  base.docs.get(`users/doc_${uid}`).creditsBalance = SALDO;
}
base.docs.set('aiSettings/runtime', { habilitado: true, capacidades: ['video.generate'], cuentas: [A, B, C, D, E, F], experiencias: ['studio'] });
olvidarLaPuerta();
const saldo = (uid) => base.docs.get(`users/doc_${uid}`).creditsBalance;
const uso = (requestId) => base.leer(`creditTransactions/usage_${requestId}`);
const reembolsos = (requestId) => base.de('creditTransactions').filter((t) => t.requestId === requestId && t.type === 'refund');
const cupoDeVideo = (uid) => base.de('aiRateLimits').filter((d) => d.userId === uid).reduce((s, d) => s + Number(d.video || 0), 0);
const motivo = (r) => (r.ok ? r.valor?.reason : r.error?.details?.reason);
const codigo = (r) => (!r ? '—' : r.ok ? r.valor?.status ?? 'ok' : `${r.error.code} · ${r.error.details?.code ?? ''}${r.error.details?.reason ? ` · ${r.error.details.reason}` : ''}`);
/* La fila del libro de una toma: la de su ejecución, `run_<requestId>`. */
const filas = (requestId) => base.de('aiGenerations').filter((g) => g.jobId === `run_${requestId}`);
const trabajo = (uid, requestId) => rt.trabajoDelMedioDeWee(base, uid, requestId);
const delDia = () => base.leer(`aiUsage/${new Date().toISOString().slice(0, 10)}`)?.['video.generate']?.seedance ?? {};

/* ═══ Producciones de verdad, con F1-A ═══════════════════════════════════ */
const clon = (x) => JSON.parse(JSON.stringify(x));
const pid = (k) => `prodpc${String(k).padStart(18, '0')}`;
/* Por defecto a 720p: a donde llega «Estándar», la única calidad con modelo validado. */
const conFaro = (format = { aspectRatio: '16:9', resolution: '720p' }) => clon({
  ...M.produccionVacia({ title: 'El faro', aspectRatio: '16:9', resolution: '720p' }),
  format,
  intent: { objective: 'Un faro al amanecer' },
  scenes: [{
    id: 'sc-0001', order: 0, title: 'Amanecer', description: 'El sol sale detrás del faro',
    shots: [
      { id: 'sh-0101', order: 0, durationSec: 4, description: 'Una farera sube despacio la escalera del faro' },
      { id: 'sh-0102', order: 1, durationSec: 4, description: 'La lámpara se enciende' },
    ],
  }],
});
const HOY = Date.now();
const crear = async (uid, k, prod) => {
  const r = await producciones.crearProduccion({ accountId: uid, productionId: pid(k), production: prod, at: HOY }, { db: base });
  if (!r.ok) throw new Error(`no se creó la producción ${k}: ${r.code}`);
  return r.view;
};
const requisito = (prod, unitId) => {
  const r = Rq.requisitosDeProduccion(prod);
  if (!r.ok) throw new Error('la producción no está lista');
  return r.requirements.shots.find((s) => s.unitId === unitId);
};
const plan = async (uid, k, unitId = 'sh-0101', calidad = 'standard') => {
  const v = await producciones.leerProduccion(uid, pid(k), { db: base });
  const req = requisito(v.view.production, unitId);
  return { productionId: pid(k), sceneId: req.sceneId, unitId, revision: v.view.revision, ...(calidad ? { quality: calidad } : {}), requirement: req };
};
const cotizar = (uid, pl) => intento(() => video.generateVideo.run({ auth: { uid }, data: { plano: pl, cotizar: true } }));
const generar = (uid, pl, creditos) => intento(() => video.generateVideo.run({ auth: { uid }, data: { plano: pl, creditosCotizados: creditos } }));
/** Lo que hace la app: cotizar la siguiente toma, enseñar el precio, y generarla por ese precio. */
const pedir = async (uid, k, unitId = 'sh-0101', calidad = 'standard') => {
  const pl = await plan(uid, k, unitId, calidad);
  const q = await cotizar(uid, pl);
  if (!q.ok || !q.valor.allowed) return { q, g: null, rid: null };
  const take = q.valor.takes.next.take;
  const g = await generar(uid, { ...pl, take }, q.valor.credits);
  return { q, g, take, credits: q.valor.credits, rid: toma.requestIdDeToma(uid, pid(k), unitId, take) };
};
const tareaDe = async (uid, rid) => (await trabajo(uid, rid))?.attempts?.at(-1)?.providerRef?.operationId;
const enlazar = (uid, k, take, unitId = 'sh-0101') => intento(() => shotsPuerta.shots.run({ auth: { uid }, data: { op: 'shot.result', productionId: pid(k), sceneId: 'sc-0001', unitId, take } }));
const videosDe = (uid, productionId) => intento(() => shotsPuerta.shots.run({ auth: { uid }, data: { op: 'shot.videos', ...(productionId !== undefined ? { productionId } : {}) } }));

/* ═══ FASE 15 · lo que se prueba aquí ═══════════════════════════════════════ */
const CA = lib('creator/cancelacionDeToma.js');
const ET = lib('creator/estadoDeToma.js');
const almacen = lib('runtime/almacen.js');
const jobIdx = lib('job/index.js');
const { TOCADOS_POR_EL_MOTOR, DINERO } = await import('./motor-filmmaker-alcance.mjs');
/** El último commit antes de esta fase. */
const ANTES = 'b076613';
const HASTA = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 15 "').trim();
const store = almacen.almacenDeTrabajos(base);
const VIDA = video.PLAZO_DE_VIDEO_MS;

/* ═══ ModelArk al preguntar y al borrar, de mentira (el adaptador de verdad) ═══ */
process.env.ARK_API_KEY = 'clave-de-prueba-no-es-real';
const llamadasArk = [];
let arkSinRed = false;
const fetchJsonDelArnes = http.fetchJson;
http.fetchJson = async (url, opts = {}) => {
  const m = /\/contents\/generations\/tasks\/([^/?]+)$/.exec(String(url));
  if (!m) return fetchJsonDelArnes(url, opts);
  const id = decodeURIComponent(m[1]);
  const metodo = opts.method ?? (opts.body ? 'POST' : 'GET');
  llamadasArk.push(`${metodo} ${id}`);
  if (arkSinRed) throw new ErrorDeProveedor('seedance: socket hang up', 'seedance');
  const e = enModelArk.get(id);
  if (!e) throw new ErrorDeProveedor('seedance respondió 404: not found', 'seedance', 404, false);
  if (metodo === 'DELETE') {
    /* Como la de verdad: solo cancela lo que está en cola. */
    if (e.status !== 'queued') throw new ErrorDeProveedor('seedance respondió 400: task cannot be cancelled', 'seedance', 400, false);
    enModelArk.set(id, { id, status: 'cancelled', updated_at: Math.floor(Date.now() / 1000), error: { code: 'Cancelled', message: 'cancelled by user' } });
    return {};
  }
  return clon(e);
};
const enCola = (tarea) => enModelArk.set(tarea, { id: tarea, status: 'queued', updated_at: Math.floor(Date.now() / 1000) });
const enMarcha = (tarea) => enModelArk.set(tarea, { id: tarea, status: 'running', updated_at: Math.floor(Date.now() / 1000) });
const deArk = (tarea) => llamadasArk.filter((l) => l.endsWith(` ${tarea}`)).map((l) => l.split(' ')[0]);

/* ═══ Las piezas de la prueba ═════════════════════════════════════════════ */
const cancelar = (uid, k, take, unitId = 'sh-0101') => intento(() => video.generateVideo.run({
  auth: { uid }, data: { plano: { productionId: pid(k), sceneId: 'sc-0001', unitId, take }, cancelar: true },
}));
const dice = (r) => (!r.ok ? `error:${r.error?.code}` : r.valor.status === 'CANCELLED' ? r.valor.state : r.valor.reason);
const abrirParada = (cuentas) => base.docs.set('aiSettings/cancelacion', { paradaEnElProveedor: true, cuentas });
const cerrarParada = () => base.docs.delete('aiSettings/cancelacion');
/** Reescribe el trabajo guardado de una toma, por el almacén de verdad (con su compare-and-set). */
const reescribir = async (uid, rid, cambiar) => {
  const j = await trabajo(uid, rid);
  const nuevo = { ...clon(j), ...cambiar(clon(j)), revision: j.revision + 1 };
  const r = await store.aplicar({ jobId: j.jobId, from: j.state, to: nuevo.state, at: Date.now(), expectedRevision: j.revision, job: nuevo, reason: 'recovered' });
  if (!r.applied) throw new Error('no se pudo reescribir el trabajo');
  return nuevo;
};
/** Una toma aceptada por el proveedor, en una producción nueva. */
const aceptada = async (uid, k, unitId = 'sh-0101') => {
  if (!base.leer(`productions/${pid(k)}`)) await crear(uid, k, conFaro());
  const p = await pedir(uid, k, unitId);
  if (!p.rid) throw new Error(`no se pidió la toma de ${k}: ${codigo(p.q)} ${codigo(p.g)}`);
  return { ...p, tarea: await tareaDe(uid, p.rid) };
};
const reservado = (rid) => Math.abs(Number(uso(rid)?.amount ?? 0));
const sinMover = (uid, rid, antes) => uso(rid)?.status === 'AUTHORIZED' && reembolsos(rid).length === 0 && saldo(uid) === antes;

/* ═══ A · LA DECISIÓN, PURA ══════════════════════════════════════════════ */
console.log('\n── A · La decisión: cada caso, con trabajos de verdad ──');
const muestra = await aceptada(A, 1);
const J = clon(await trabajo(A, muestra.rid));
{
  const d = (reserva, trabajo, extra = {}) => CA.decidirCancelacion({ reserva, trabajo, at: HOY + 1000, vidaDeLaLlamadaMs: VIDA, paradaEnElProveedor: false, ...extra });
  const R = (estado, autorizadaEn = HOY) => ({ estado, importe: 75, autorizadaEn });
  const intento0 = J.attempts[J.attempts.length - 1];
  check('A1) sin reserva, o ajena: no hay toma', d(null, undefined).motivo === 'take_not_found');
  check('A2) cobrada: ya terminó', d(R('COMPLETED'), J).motivo === 'take_finished');
  check('A3) devuelta o fallida: ya estaba devuelta', d(R('REFUNDED'), J).tipo === 'ya_devuelta' && d(R('FAILED'), undefined).tipo === 'ya_devuelta');
  check('A4) reservada sin trabajo: mientras la llamada puede crearlo, se espera; pasada su vida, se devuelve',
    d(R('AUTHORIZED', HOY), undefined).motivo === 'take_starting'
    && d(R('AUTHORIZED', HOY + 1000 - VIDA + 1), undefined).motivo === 'take_starting'
    && d(R('AUTHORIZED', HOY + 1000 - VIDA), undefined).tipo === 'devolver_sin_trabajo'
    && d({ estado: 'AUTHORIZED', importe: 75 }, undefined).motivo === 'take_starting');
  check('A5) en cola en casa: se cancela el trabajo', d(R('AUTHORIZED'), { ...J, state: 'queued', attempts: [] }).tipo === 'cancelar_el_trabajo');
  check('A6) corriendo sin haber salido: también',
    d(R('AUTHORIZED'), { ...J, state: 'running', attempts: [{ ...intento0, dispatched: false, providerRef: undefined, outcome: undefined }] }).tipo === 'cancelar_el_trabajo'
    && d(R('AUTHORIZED'), { ...J, state: 'running', attempts: [] }).tipo === 'cancelar_el_trabajo');
  check('A7) corriendo, salió y sin respuesta todavía: el POST está en vuelo',
    d(R('AUTHORIZED'), { ...J, state: 'running', attempts: [{ ...intento0, dispatched: true, providerRef: undefined, outcome: undefined }] }).motivo === 'take_sending');
  check('A8) aceptada por el proveedor: sin la puerta de parada, termina y se cobra; con ella, se le pide parar',
    J.state === 'waiting' && !!intento0.providerRef && d(R('AUTHORIZED'), J).motivo === 'take_accepted'
    && d(R('AUTHORIZED'), J, { paradaEnElProveedor: true }).tipo === 'parar_en_el_proveedor'
    && d(R('AUTHORIZED'), J, { paradaEnElProveedor: true }).operacion.operationId === intento0.providerRef.operationId);
  check('A9) salió y nadie sabe cómo acabó: se reconcilia, no se cancela',
    d(R('AUTHORIZED'), { ...J, state: 'waiting', attempts: [{ ...intento0, providerRef: undefined }] }).motivo === 'take_reconciling');
  check('A10) pedida parar: se intenta consumar', d(R('AUTHORIZED'), { ...J, state: 'cancel_requested' }).tipo === 'terminar_la_cancelacion');
  check('A11) terminado: cobrado → ya terminó; cancelado sin salir → devolver; falló tras aceptarse sin saber → reconciliar',
    d(R('AUTHORIZED'), { ...J, state: 'completed' }).motivo === 'take_finished'
    && d(R('AUTHORIZED'), { ...J, state: 'cancelled', attempts: [] }).tipo === 'devolver_con_trabajo'
    && d(R('AUTHORIZED'), { ...J, state: 'failed', attempts: [{ ...intento0, outcome: 'unknown' }] }).motivo === 'take_reconciling'
    && d(R('AUTHORIZED'), { ...J, state: 'failed', attempts: [{ ...intento0, outcome: 'failed' }] }).tipo === 'devolver_con_trabajo');
  check('A12) pura: la misma evidencia da lo mismo, y no toca lo que recibe',
    JSON.stringify(d(R('AUTHORIZED'), J)) === JSON.stringify(d(R('AUTHORIZED'), J)) && JSON.stringify(J) === JSON.stringify(clon(J)));
}

/* ═══ B · DE PUNTA A PUNTA ════════════════════════════════════════════════ */
console.log('\n── B · De punta a punta por la puerta de la toma ──');
{
  /* B1 · aceptada, puerta de parada cerrada: no se toca nada y termina como siempre. */
  const s0 = saldo(A);
  const antes = await trabajo(A, muestra.rid);
  const r1 = await cancelar(A, 1, muestra.take);
  const despues = await trabajo(A, muestra.rid);
  check('B1) aceptada y sin puerta de parada: «el proveedor ya la tiene», sin mover dinero, ni el trabajo, ni llamar a ModelArk',
    dice(r1) === 'take_accepted' && sinMover(A, muestra.rid, s0) && despues.revision === antes.revision && deArk(muestra.tarea).length === 0, dice(r1));
  termina(muestra.tarea, 'succeeded');
  await pasada();
  check('B1b) y terminó y se cobró como cualquier otra', uso(muestra.rid)?.status === 'COMPLETED' && reembolsos(muestra.rid).length === 0);
}
{
  /* B2 · aceptada, puerta abierta, todavía en cola en ModelArk: se para, y se devuelve entera. */
  abrirParada([B]);
  const t = await aceptada(B, 2);
  enCola(t.tarea);
  const s0 = saldo(B);
  const r = await cancelar(B, 2, t.take);
  const j = await trabajo(B, t.rid);
  check('B2) en cola en ModelArk: se detiene y se devuelve ENTERA, una vez',
    dice(r) === 'cancelada' && r.valor.refund === 'reembolsada' && uso(t.rid)?.status === 'REFUNDED' && reembolsos(t.rid).length === 1
    && saldo(B) === s0 + reservado(t.rid) && j.state === 'failed', `${dice(r)} · ${uso(t.rid)?.status} · ${j?.state}`);
  const orden = deArk(t.tarea);
  check('B3) a ModelArk: primero se pregunta, solo entonces se borra —una vez— y se vuelve a preguntar',
    orden[0] === 'GET' && orden.filter((x) => x === 'DELETE').length === 1 && orden.indexOf('DELETE') === 1 && orden[2] === 'GET', orden.join(','));
  const f = filas(t.rid)[0];
  check('B4) el libro cierra la operación como fallida, sin coste inventado', !!f && f.status === 'FAILED' && f.providerCostStatus !== 'actual', `${f?.status} · ${f?.providerCostStatus}`);
  const otra = await cancelar(B, 2, t.take);
  check('B5) pedirlo otra vez: «ya estaba devuelta», sin segundo reembolso ni otro DELETE',
    dice(otra) === 'ya_devuelta' && reembolsos(t.rid).length === 1 && deArk(t.tarea).filter((x) => x === 'DELETE').length === 1);

  /* B6 · en marcha en ModelArk: no se puede parar. */
  const m = await aceptada(B, 3);
  enMarcha(m.tarea);
  const s1 = saldo(B);
  const rm = await cancelar(B, 3, m.take);
  check('B6) ya en marcha en ModelArk: no se puede parar, termina y se cobra; ni un DELETE',
    dice(rm) === 'take_processing' && sinMover(B, m.rid, s1) && !deArk(m.tarea).includes('DELETE'), `${dice(rm)} · ${deArk(m.tarea)}`);

  /* B7 · ya terminada en ModelArk: NUNCA se borra (borrar una terminada perdería su resultado). */
  const h = await aceptada(B, 4);
  termina(h.tarea, 'succeeded');
  const rh = await cancelar(B, 4, h.take);
  const jh = await trabajo(B, h.rid);
  check('B7) terminada en ModelArk: no se borra; entra por la reconciliación, se guarda el vídeo y se dice que ya terminó',
    dice(rh) === 'take_finished' && !deArk(h.tarea).includes('DELETE') && jh.state === 'completed' && reembolsos(h.rid).length === 0, `${dice(rh)} · ${jh?.state}`);

  /* B8 · ModelArk no contesta: no se sabe nada, no se toca nada. */
  const u = await aceptada(B, 5);
  enCola(u.tarea);
  arkSinRed = true;
  const s2 = saldo(B);
  const ru = await cancelar(B, 5, u.take);
  arkSinRed = false;
  check('B8) ModelArk no contesta: «no se sabe», y ni dinero ni trabajo se mueven', dice(ru) === 'provider_unknown' && sinMover(B, u.rid, s2));
  cerrarParada();
}
{
  /* B9 · el POST perdido: salió y nadie sabe → se reconcilia, no se cancela. */
  modo = 'sinRespuesta';
  await crear(C, 6, conFaro());
  const p = await pedir(C, 6);
  modo = 'aceptar';
  const s0 = saldo(C);
  const r = await cancelar(C, 6, 1);
  check('B9) POST perdido: se reconcilia; no se toca ni el dinero ni el trabajo', dice(r) === 'take_reconciling' && sinMover(C, toma.requestIdDeToma(C, pid(6), 'sh-0101', 1), s0), dice(r));

  /* B10 · el proveedor rechazó en el POST: ya estaba devuelta. */
  modo = 'http404';
  await crear(C, 7, conFaro());
  await pedir(C, 7);
  modo = 'aceptar';
  const rid7 = toma.requestIdDeToma(C, pid(7), 'sh-0101', 1);
  const r7 = await cancelar(C, 7, 1);
  check('B10) fallida al enviarla (404): «ya estaba devuelta», sin un segundo reembolso', dice(r7) === 'ya_devuelta' && reembolsos(rid7).length === 1, `${dice(r7)} · ${reembolsos(rid7).length}`);
}
{
  /* B11 · en cola EN CASA: se para en el acto y se devuelve entera (nunca salió). */
  const t = await aceptada(D, 8);
  await reescribir(D, t.rid, (j) => ({ state: 'queued', attempts: [], attemptCount: 0 }));
  const s0 = saldo(D);
  const r = await cancelar(D, 8, t.take);
  const j = await trabajo(D, t.rid);
  check('B11) en cola en casa: cancelada, y devuelta ENTERA',
    dice(r) === 'cancelada' && j.state === 'cancelled' && j.error?.details?.reason === 'cancelled_by_request'
    && uso(t.rid)?.status === 'REFUNDED' && reembolsos(t.rid).length === 1 && saldo(D) === s0 + reservado(t.rid), `${dice(r)} · ${j?.state}`);

  /* B12 · corriendo sin haber salido: se pide parar, y se consuma cuando no queda nadie en vuelo. */
  const c = await aceptada(D, 9);
  const intento = (await trabajo(D, c.rid)).attempts.at(-1);
  await reescribir(D, c.rid, () => ({ state: 'running', attempts: [{ ...intento, dispatched: false, providerRef: undefined, outcome: undefined, endedAt: undefined, lease: { owner: 'trabajador-de-prueba', until: Date.now() + 60_000 } }] }));
  const s1 = saldo(D);
  const r1 = await cancelar(D, 9, c.take);
  const j1 = await trabajo(D, c.rid);
  const r2 = await cancelar(D, 9, c.take);
  check('B12) corriendo sin salir: «cancelando»; el trabajo queda pedido parar y el dinero, retenido mientras alguien lo tenga',
    dice(r1) === 'cancelando' && j1.state === 'cancel_requested' && dice(r2) === 'cancelando' && sinMover(D, c.rid, s1), `${dice(r1)} · ${j1?.state} · ${dice(r2)}`);
  const pedido = await trabajo(D, c.rid);
  await reescribir(D, c.rid, () => ({ attempts: [{ ...pedido.attempts.at(-1), lease: { owner: 'trabajador-de-prueba', until: Date.now() - 1 } }] }));
  const r3 = await cancelar(D, 9, c.take);
  check('B13) y cuando la concesión caduca, la siguiente petición la consuma y la devuelve entera',
    dice(r3) === 'cancelada' && (await trabajo(D, c.rid)).state === 'cancelled' && uso(c.rid)?.status === 'REFUNDED' && reembolsos(c.rid).length === 1, dice(r3));

  /* B14 · el POST en vuelo: se espera unos segundos; cancelar ahora perdería el vídeo con el dinero retenido. */
  const v = await aceptada(D, 10);
  const iv = (await trabajo(D, v.rid)).attempts.at(-1);
  await reescribir(D, v.rid, () => ({ state: 'running', attempts: [{ ...iv, dispatched: true, providerRef: undefined, outcome: undefined, lease: { owner: 'trabajador-de-prueba', until: Date.now() + 60_000 } }] }));
  const s2 = saldo(D);
  const rv = await cancelar(D, 10, v.take);
  check('B14) POST en vuelo: «otra vez en unos segundos», sin tocar nada', dice(rv) === 'take_sending' && sinMover(D, v.rid, s2) && (await trabajo(D, v.rid)).state === 'running');
}
{
  /* B15 · reserva sin trabajo: a tiempo, se espera; abandonada, se devuelve. */
  const t = await aceptada(E, 11);
  /* Sin trabajo: se quita su documento (por su jobId: la traza lleva el id del paso, no el de la toma). */
  const suTrabajo = await trabajo(E, t.rid);
  const docDelTrabajo = [...base.docs.keys()].find((k) => k.startsWith('jobs/') && (() => { try { return JSON.parse(base.docs.get(k).json).jobId === suTrabajo?.jobId; } catch { return false; } })());
  base.docs.delete(docDelTrabajo);
  const sinTrabajo = !!docDelTrabajo && !(await trabajo(E, t.rid));
  const s0 = saldo(E);
  const aTiempo = await cancelar(E, 11, t.take);
  const doc = base.docs.get(`creditTransactions/usage_${t.rid}`);
  doc.createdAt = fa.Timestamp.fromMillis(Date.now() - VIDA - 10_000);
  const tarde = await cancelar(E, 11, t.take);
  check('B15) reserva sin trabajo: a tiempo «se está preparando»; abandonada, devuelta entera y una vez',
    sinTrabajo && dice(aTiempo) === 'take_starting' && dice(tarde) === 'devuelta' && uso(t.rid)?.status === 'REFUNDED'
    && reembolsos(t.rid).length === 1 && saldo(E) === s0 + reservado(t.rid), `${sinTrabajo} · ${dice(aTiempo)} · ${dice(tarde)}`);

  /* B16 · tres a la vez sobre la misma toma en cola: una la para, ninguna devuelve dos veces. */
  const q = await aceptada(E, 12);
  await reescribir(E, q.rid, () => ({ state: 'queued', attempts: [], attemptCount: 0 }));
  const rq = await Promise.all([cancelar(E, 12, q.take), cancelar(E, 12, q.take), cancelar(E, 12, q.take)]);
  check('B16) tres a la vez: todas contestan bien, el trabajo se cancela una vez y se devuelve UNA vez',
    rq.every((x) => x.ok && x.valor.status === 'CANCELLED') && reembolsos(q.rid).length === 1 && (await trabajo(E, q.rid)).state === 'cancelled',
    rq.map(dice).join(','));

  /* B17 · la carrera por el mismo trabajo: otro lo mueve entre la lectura y la escritura. */
  const w = await aceptada(E, 13);
  await reescribir(E, w.rid, () => ({ state: 'queued', attempts: [], attemptCount: 0 }));
  let primera = true;
  const storeConCarrera = {
    aplicar: async (tr) => {
      if (primera) {
        primera = false;
        /* Justo antes: el trabajador lo coge y lo manda, y ModelArk lo acepta. */
        const actual = await store.obtener(tr.jobId);
        await store.aplicar({ ...tr, job: { ...actual, state: 'waiting', attempts: [{ ...J.attempts.at(-1), attemptId: `${actual.jobId}#1` }], revision: actual.revision + 1 }, expectedRevision: actual.revision });
      }
      return store.aplicar(tr);
    },
  };
  const rw = await CA.cancelarToma(base, { accountId: E }, { productionId: pid(13), sceneId: 'sc-0001', unitId: 'sh-0101', toma: w.take }, { at: Date.now(), vidaDeLaLlamadaMs: VIDA, store: storeConCarrera });
  check('B17) si otro lo mueve entre medias, no se pisa: se vuelve a mirar y se decide con lo nuevo (aceptada → no se cancela)',
    !rw.ok && rw.motivo === 'take_accepted' && uso(w.rid)?.status === 'AUTHORIZED' && reembolsos(w.rid).length === 0, JSON.stringify(rw));

  /* B18 · otra cuenta, y datos sin forma. */
  const ajena = await cancelar(F, 12, q.take);
  const malos = await intento(() => video.generateVideo.run({ auth: { uid: E }, data: { plano: { productionId: 'x', take: 1 }, cancelar: true } }));
  const sinSesion = await intento(() => video.generateVideo.run({ data: { plano: { productionId: pid(12), sceneId: 'sc-0001', unitId: 'sh-0101', take: 1 }, cancelar: true } }));
  check('B18) otra cuenta no llega a la toma; datos sin forma y sin sesión se rechazan',
    dice(ajena) === 'take_not_found' && !malos.ok && !sinSesion.ok, `${dice(ajena)} · ${codigo(malos)} · ${codigo(sinSesion)}`);
  check('B19) cancelar nunca genera: ni un POST a ModelArk desde las cancelaciones', posts.every((p) => p.acceptAsync === true));

  /*
   * B20 · Defensa en profundidad: la petición de la toma ya lleva la cuenta dentro, pero una reserva con ESA petición
   * escrita para otra cuenta tampoco es de esta toma. Y la misma, de la cuenta, sí (el contraste).
   */
  const ridX = toma.requestIdDeToma(A, pid(90), 'sh-0101', 1);
  const idX = { productionId: pid(90), unitId: 'sh-0101', toma: 1 };
  const plantada = { userId: B, requestId: ridX, type: 'usage', status: 'AUTHORIZED', amount: -75, meta: { filmmaker: { productionId: pid(90), unitId: 'sh-0101', take: 1 } }, createdAt: Date.now() };
  base.docs.set(`creditTransactions/usage_${ridX}`, plantada);
  const deOtra = await CA.leerReservaDeLaToma(base, A, ridX, idX);
  base.docs.set(`creditTransactions/usage_${ridX}`, { ...plantada, userId: A });
  const deLaCuenta = await CA.leerReservaDeLaToma(base, A, ridX, idX);
  base.docs.delete(`creditTransactions/usage_${ridX}`);
  check('B20) una reserva con la petición de la toma pero escrita para OTRA cuenta no es suya; la de la cuenta, sí',
    deOtra === null && deLaCuenta?.estado === 'AUTHORIZED' && deLaCuenta.importe === 75, `${JSON.stringify(deOtra)} · ${JSON.stringify(deLaCuenta)}`);
}

/* ═══ P · LA PASADA PROGRAMADA ════════════════════════════════════════════ */
console.log('\n── P · La pasada programada consuma lo pedido parar ──');
{
  const t = await aceptada(F, 14);
  const i = (await trabajo(F, t.rid)).attempts.at(-1);
  await reescribir(F, t.rid, () => ({ state: 'running', attempts: [{ ...i, dispatched: false, providerRef: undefined, outcome: undefined, endedAt: undefined, lease: { owner: 'x', until: Date.now() + 60_000 } }] }));
  await cancelar(F, 14, t.take);
  const vivo = await CA.terminarCancelacionesPendientes(base, { at: Date.now() });
  const sigue = (await trabajo(F, t.rid)).state;
  const pedido = await trabajo(F, t.rid);
  await reescribir(F, t.rid, () => ({ attempts: [{ ...pedido.attempts.at(-1), lease: { owner: 'x', until: Date.now() - 1 } }] }));
  const s0 = saldo(F);
  const hecho = await CA.terminarCancelacionesPendientes(base, { at: Date.now() + 1 });
  check('P1) con la concesión viva no se toca; caducada, se consuma y se devuelve',
    sigue === 'cancel_requested' && vivo.consumadas === 0 && hecho.consumadas === 1 && hecho.devueltas === 1
    && (await trabajo(F, t.rid)).state === 'cancelled' && saldo(F) === s0 + reservado(t.rid), `${sigue} · ${JSON.stringify(hecho)}`);
  const otra = await CA.terminarCancelacionesPendientes(base, { at: Date.now() + 2 });
  check('P2) otra pasada no hace nada más: ni otra consumación ni otro reembolso', otra.consumadas === 0 && reembolsos(t.rid).length === 1);
  const PROG = sinComentarios(leer('functions/src/settlement/programado.ts'));
  check('P3) la tarea programada la compone junto a las reservas sin trabajo, y una no impide la otra',
    /cancelaciones: cancelacionesPendientesDeWee\(/.test(PROG) && /try \{\s*return await deps\.reservas\(\);\s*\} finally \{\s*await deps\.cancelaciones\(\)\.catch\(\(\) => undefined\);/.test(PROG));

  /*
   * P4 · La pasada solo mira TOMAS de Filmmaker, y una toma se reconoce por su reserva. Un trabajo pedido parar cuya
   * reserva no tiene forma de toma, o que no tiene reserva, no es suyo: se queda como está. Con su reserva de vuelta,
   * la misma pasada lo consuma y lo devuelve (el contraste: lo único que cambia es la reserva).
   */
  const n = await aceptada(F, 15);
  const i2 = (await trabajo(F, n.rid)).attempts.at(-1);
  await reescribir(F, n.rid, () => ({ state: 'running', attempts: [{ ...i2, dispatched: false, providerRef: undefined, outcome: undefined, endedAt: undefined, lease: { owner: 'x', until: Date.now() + 60_000 } }] }));
  await cancelar(F, 15, n.take);
  const pedido2 = await trabajo(F, n.rid);
  const suMetadata = clon(pedido2.metadata);
  const caducada = { ...pedido2.attempts.at(-1), lease: { owner: 'x', until: Date.now() - 1 } };
  await reescribir(F, n.rid, () => ({ attempts: [caducada], metadata: { ...suMetadata, creditRequestId: 'vid.0000000000000001' } }));
  await CA.terminarCancelacionesPendientes(base, { at: Date.now() + 1 });
  const conOtra = (await trabajo(F, n.rid)).state;
  const sinReserva = { ...suMetadata };
  delete sinReserva.creditRequestId;
  await reescribir(F, n.rid, () => ({ metadata: sinReserva }));
  await CA.terminarCancelacionesPendientes(base, { at: Date.now() + 2 });
  const sinNinguna = (await trabajo(F, n.rid)).state;
  await reescribir(F, n.rid, () => ({ metadata: suMetadata }));
  const s1 = saldo(F);
  await CA.terminarCancelacionesPendientes(base, { at: Date.now() + 3 });
  check('P4) lo que no es una toma —reserva de otra forma, o ninguna— no se toca; con su reserva, se consuma y se devuelve una vez',
    conOtra === 'cancel_requested' && sinNinguna === 'cancel_requested'
    && (await trabajo(F, n.rid)).state === 'cancelled' && reembolsos(n.rid).length === 1 && saldo(F) === s1 + reservado(n.rid),
    `${conOtra} · ${sinNinguna} · ${(await trabajo(F, n.rid)).state} · ${reembolsos(n.rid).length}`);
}

/* ═══ V · LA TOMA, VISTA ══════════════════════════════════════════════════ */
console.log('\n── V · La toma, vista ──');
{
  const cancelado = await trabajo(D, toma.requestIdDeToma(D, pid(8), 'sh-0101', 1));
  const ev = (estado, trabajo) => ET.decidirEstadoDeLaToma({ reserva: { estado, reservado: 75, autorizadaEn: HOY }, trabajo }, Date.now(), VIDA);
  check('V1) devuelta porque la detuvo la persona: «cancelled», no «refunded»', ev('REFUNDED', cancelado).motivo === 'cancelled' && ev('REFUNDED', null).motivo === 'refunded');
  check('V2) pedida parar: «preparing» / «cancel_pending»', JSON.stringify(ev('AUTHORIZED', { ...J, state: 'cancel_requested' })) === JSON.stringify({ estado: 'preparing', motivo: 'cancel_pending' }));
  check('V3) detenerla no es un fallo de nadie: sin categoría (antes, PROVIDER_REJECTED)', ET.falloDeLaToma('refunded', cancelado) === null);
  const q = await cotizar(D, await plan(D, 8));
  check('V4) la consulta de la toma lo dice: «cancelled», sin categoría', q.ok && q.valor.takes?.current?.cancelled === true && !q.valor.takes.current.failure, JSON.stringify(q.ok ? q.valor.takes?.current : codigo(q)));
}

/* ═══ Q · LA PUERTA DE LA PARADA ══════════════════════════════════════════ */
console.log('\n── Q · La puerta de la parada en el proveedor, cerrada por defecto ──');
{
  const lee = async (doc, cuenta = 'cuentaQ0001') => { if (doc) base.docs.set('aiSettings/cancelacion', doc); else base.docs.delete('aiSettings/cancelacion'); return CA.leerPuertaDeParada(base, cuenta); };
  check('Q1) sin documento, o sin el sí: cerrada', !(await lee(null)) && !(await lee({ cuentas: ['cuentaQ0001'] })) && !(await lee({ paradaEnElProveedor: 'true', cuentas: ['cuentaQ0001'] })));
  check('Q2) con el sí y sin cuentas ni `todas`: cerrada (una lista vacía NO abre para todos)', !(await lee({ paradaEnElProveedor: true })) && !(await lee({ paradaEnElProveedor: true, cuentas: [] })));
  check('Q3) con cuentas, solo para ellas; `todas`, hay que escribirlo', (await lee({ paradaEnElProveedor: true, cuentas: ['cuentaQ0001'] })) && !(await lee({ paradaEnElProveedor: true, cuentas: ['otra00001'] }))
    && (await lee({ paradaEnElProveedor: true, todas: true })));
  base.docs.delete('aiSettings/cancelacion');
}

/* ═══ G · LAS GUARDAS ═════════════════════════════════════════════════════ */
console.log('\n── G · Las guardas ──');
{
  const tramo = HASTA ? `${ANTES} ${HASTA}` : ANTES;
  const numstat = git(`diff --numstat ${tramo} -- functions/src/engine/providers/seedance.ts`).trim();
  const diff = git(`diff ${tramo} -- functions/src/engine/providers/seedance.ts`);
  const quitadas = diff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'));
  check('G1) el adaptador solo GANA la parada: 33 líneas añadidas, ninguna quitada', numstat.startsWith('33\t0\t') && quitadas.length === 0, numstat);
  const parada = sinComentarios(leer('functions/src/engine/providers/seedance.ts')).split('export const pararTareaDeSeedance')[1] ?? '';
  check('G2) y la parada PREGUNTA antes, borra solo lo que está en cola, una vez, y vuelve a preguntar',
    /const antes = await leer\(\);[\s\S]*if \(antes !== 'queued'\) return[\s\S]*method: 'DELETE'[\s\S]*const despues = await leer\(\);/.test(parada)
    && (parada.match(/method: 'DELETE'/g) || []).length === 1);
  const llaman = git('grep -l "pararTareaDeSeedance" -- functions/src').trim().split('\n').filter(Boolean).sort();
  check('G3) nadie más la llama: solo la puerta de la toma', JSON.stringify(llaman) === JSON.stringify(['functions/src/creator/video.ts', 'functions/src/engine/providers/seedance.ts']), llaman.join(','));
  const src = sinComentarios(leer('functions/src/creator/cancelacionDeToma.ts'));
  check('G4) el dinero SOLO por el puerto: ni creditEngine, ni refundCredits, ni completeCredits, ni spendCredits',
    /puerto\.reembolsar\(/.test(src) && !/creditEngine|refundCredits|completeCredits|spendCredits|\.settle\(/.test(src));
  check('G5) ni el Credit Engine, ni el Core, ni el Job Engine, ni el runtime, ni F1-A, ni productions',
    git(`diff --name-only ${tramo} -- functions/src/credits functions/src/core functions/src/job functions/src/runtime functions/src/filmmaker functions/src/productions`).trim() === '');
  check('G6) ni una Function nueva', git(`diff --name-only ${tramo} -- functions/src/index.ts`).trim() === '');
  check('G7) el módulo nuevo en la lista del motor, el adaptador fuera (lo fijan H2/E4) y el dinero, nunca',
    TOCADOS_POR_EL_MOTOR.includes('functions/src/creator/cancelacionDeToma.ts') && !TOCADOS_POR_EL_MOTOR.includes('functions/src/engine/providers/seedance.ts')
    && TOCADOS_POR_EL_MOTOR.every((f) => !DINERO.some((re) => re.test(f))));
  check('G8) documentado', /### Fase 15 · /.test(leer('docs/FILMMAKER.md')) && /\| D11 \| [^\n]*\*\*decidida\*\* en la Fase 15/.test(leer('docs/FILMMAKER.md')));
  check('G9) esta suite está en la cadena de `npm test`', /filmmaker-cancelar\.test\.mjs/.test(leer('functions/package.json')));
}

/* ═══ C · EN LA APP ═══════════════════════════════════════════════════════ */
console.log('\n── C · En la app: el servicio, el controlador y el botón ──');
{
  const { crearCargador } = await import('./filmmaker-cliente.mjs');
  const requerirApp = createRequire(path.resolve(RAIZ, 'package.json'));
  const React = requerirApp('react');
  const { renderToStaticMarkup } = requerirApp('react-dom/server');
  const hc = React.createElement;
  let botones = [];
  const Caja = ({ children, accessibilityLabel }) => hc('div', { 'aria-label': accessibilityLabel }, children);
  const Texto = ({ children }) => hc('span', null, children);
  const Toque = ({ children, onPress, disabled, accessibilityLabel }) => { botones.push({ etiqueta: accessibilityLabel, tocar: onPress, apagado: !!disabled }); return hc('button', { 'aria-label': accessibilityLabel, disabled: !!disabled }, children); };
  const rn = {
    View: Caja, Text: Texto, TouchableOpacity: Toque, ScrollView: Caja, StyleSheet: { create: (s) => s, flatten: (s) => s },
    Platform: { OS: 'web', select: (o) => o.web ?? o.default }, Linking: { openURL: async () => {} },
  };
  const colores = new Proxy({}, { get: () => '#000000' });
  const cargarReal = crearCargador({ dobles: { 'react-native': rn } });
  const { crearTraductor } = cargarReal('i18n/traducir.ts');
  const formatoReal = cargarReal('i18n/formato.ts');
  const ES = cargarReal('i18n/textos/es/index.ts').es;
  const faltan = new Set();
  const t = crearTraductor('es', { es: ES }, { alFaltarUnaClave: (k) => faltan.add(k) });
  const formato = { numero: (v, o) => formatoReal.formatearNumero(v, 'es', o), lista: (c, tipo) => formatoReal.formatearLista(c, 'es', tipo) };
  const llamadas = [];
  let confirmar = true;
  const dobles = {
    react: React,
    'react-native': rn,
    '@expo/vector-icons': { Ionicons: ({ name }) => hc('i', { 'data-icono': name }) },
    'firebase/functions': { httpsCallable: (_f, nombre) => async (datos) => { llamadas.push({ nombre, datos }); return { data: { status: 'CANCELLED', state: 'cancelada' } }; } },
    '../config/firebase': { db: {}, functions: {} },
    './creditsService': { newRequestId: () => 'id-que-no-debe-viajar' },
    '../../../contexts/ThemeContext': { useTheme: () => ({ theme: { colors: colores } }) },
    '../../../contexts/IdiomaContext': { useT: () => t, useIdioma: () => ({ t, formato, locale: 'es' }) },
    '../../../utils/scale': { scale: (x) => x },
    '../../../utils/notify': { notify: () => {}, confirmAction: async () => confirmar },
  };
  const cargar = crearCargador({ dobles });
  const { videoService } = cargar('services/videoService.ts');
  const vr = await videoService.cancelTake({ productionId: 'prodC00001', sceneId: 'sc-0001', unitId: 'sh-0101', take: 2 });
  check('C1) el servicio manda qué toma y nada más, por la misma puerta',
    llamadas.length === 1 && llamadas[0].nombre === 'generateVideo'
    && JSON.stringify(llamadas[0].datos) === JSON.stringify({ plano: { productionId: 'prodC00001', sceneId: 'sc-0001', unitId: 'sh-0101', take: 2 }, cancelar: true })
    && vr.ok && vr.valor.state === 'cancelada');

  /* El controlador, con un servicio de mentira. */
  const { crearControladorDeToma } = cargar('utils/controladorDeToma.ts');
  const calma = async () => { for (let i = 0; i < 30; i++) await new Promise((r) => setImmediate(r)); };
  let oyente = null;
  let respuestaCancelar = async () => ({ ok: true, valor: { status: 'CANCELLED', state: 'cancelada' } });
  const pedidas = [];
  let actual = { take: 1, requestId: 'fm.x.1', status: 'AUTHORIZED', outcome: 'in_progress' };
  const servicio = {
    cotizar: async () => ({ ok: true, valor: { status: 'QUOTED', allowed: false, reason: 'take_in_flight', takes: { current: actual, next: null, node: null } } }),
    generar: async () => ({ ok: false, rechazo: { motivo: 'unknown' } }),
    enlazar: async () => ({ ok: true, valor: { status: 'not_ready' } }),
    cancelar: async (unidad, n) => { pedidas.push([unidad.unitId, n]); return respuestaCancelar(); },
    observarReserva: (_rid, alCambiar) => { oyente = alCambiar; return () => { oyente = null; }; },
    urlDelMaterial: async () => null,
  };
  const UNIDAD = { tipo: 'unidad', unidad: { productionId: 'prodC00001', sceneId: 'sc-0001', unitId: 'sh-0101', revision: 3, requirement: {} } };
  const c = crearControladorDeToma(servicio);
  c.cancelar();
  check('C2) sin toma en proceso no se pide nada', pedidas.length === 0);
  c.abrir(UNIDAD);
  await calma();
  check('C3) una toma viva: en proceso', c.leer().fase.fase === 'en_proceso');
  c.cancelar();
  c.cancelar();
  const mientras = c.leer().cancelacion;
  await calma();
  check('C4) una vez a la vez: la segunda mientras la primera va, no sale', pedidas.length === 1 && JSON.stringify(pedidas[0]) === '["sh-0101",1]' && mientras?.estado === 'pidiendo');
  check('C5) el servidor dice «cancelada»: se dice, sin tocar ningún número', JSON.stringify(c.leer().cancelacion) === JSON.stringify({ estado: 'hecha', como: 'cancelada' }) && c.leer().economia === null);
  actual = { take: 1, requestId: 'fm.x.1', status: 'REFUNDED', cancelled: true };
  oyente?.('REFUNDED', { status: 'REFUNDED', amount: -75 });
  await calma();
  check('C6) llega la devolución: «detenida», no «falló», y los tres números salen de la reserva',
    c.leer().ultima?.estado === 'fallida' && c.leer().ultima?.cancelada === true && !c.leer().ultima?.categoria && c.leer().economia?.reembolsados === 75, JSON.stringify(c.leer().ultima));
  /* Un rechazo del servidor. */
  actual = { take: 2, requestId: 'fm.x.2', status: 'AUTHORIZED', outcome: 'in_progress' };
  respuestaCancelar = async () => ({ ok: true, valor: { status: 'NOT_CANCELLED', reason: 'take_accepted' } });
  const c2 = crearControladorDeToma(servicio);
  c2.abrir(UNIDAD);
  await calma();
  c2.cancelar();
  await calma();
  check('C7) «el proveedor ya la tiene»: se dice y la toma sigue en proceso', JSON.stringify(c2.leer().cancelacion) === JSON.stringify({ estado: 'rechazada', motivo: 'take_accepted' }) && c2.leer().fase.fase === 'en_proceso');
  /* Una respuesta que llega tarde, de otra unidad, no cuenta. */
  let soltar;
  respuestaCancelar = () => new Promise((r) => { soltar = () => r({ ok: true, valor: { status: 'CANCELLED', state: 'cancelada' } }); });
  const c3 = crearControladorDeToma(servicio);
  c3.abrir(UNIDAD);
  await calma();
  c3.cancelar();
  c3.abrir({ tipo: 'sin_unidad', porque: 'nada' });
  soltar();
  await calma();
  check('C8) si se cambia de unidad, la respuesta de antes no cuenta', c3.leer().cancelacion === null);
  /* Sin detener: una devolución por fallo sigue siendo un fallo. */
  respuestaCancelar = async () => ({ ok: true, valor: { status: 'CANCELLED', state: 'cancelada' } });
  actual = { take: 3, requestId: 'fm.x.3', status: 'AUTHORIZED', outcome: 'in_progress' };
  const c4 = crearControladorDeToma(servicio);
  c4.abrir(UNIDAD);
  await calma();
  actual = { take: 3, requestId: 'fm.x.3', status: 'REFUNDED', failure: 'PROVIDER_REJECTED' };
  oyente?.('REFUNDED', { status: 'REFUNDED', amount: -75 });
  await calma();
  check('C9) una devolución sin haberla detenido sigue siendo un fallo, con su categoría', c4.leer().ultima?.cancelada !== true && c4.leer().ultima?.categoria === 'PROVIDER_REJECTED');
  /*
   * La devolución puede llegar por la escucha ANTES que la respuesta de «detener»: en ese mismo instante ya se dice
   * «detenida» —ni un momento «no salió»—, y sigue así cuando llegan la respuesta y la consulta.
   */
  let soltar5;
  respuestaCancelar = () => new Promise((r) => { soltar5 = () => r({ ok: true, valor: { status: 'CANCELLED', state: 'cancelada' } }); });
  actual = { take: 4, requestId: 'fm.x.4', status: 'AUTHORIZED', outcome: 'in_progress' };
  const c5 = crearControladorDeToma(servicio);
  c5.abrir(UNIDAD);
  await calma();
  c5.cancelar();
  actual = { take: 4, requestId: 'fm.x.4', status: 'REFUNDED', cancelled: true };
  oyente?.('REFUNDED', { status: 'REFUNDED', amount: -75 });
  const alMomento = c5.leer().ultima;
  soltar5?.();
  await calma();
  check('C9b) la devolución llega antes que la respuesta: «detenida» al momento, sin categoría, y así se queda',
    alMomento?.estado === 'fallida' && alMomento.cancelada === true && !alMomento.categoria
    && c5.leer().ultima?.cancelada === true && JSON.stringify(c5.leer().cancelacion) === JSON.stringify({ estado: 'hecha', como: 'cancelada' }),
    `${JSON.stringify(alMomento)} · ${JSON.stringify(c5.leer().ultima)}`);

  /* El botón. */
  const Generacion = cargar('components/studio/produccion/ProductionShotGeneration.tsx').default;
  const detenidas = [];
  const ver = (extra) => {
    botones = [];
    const html = renderToStaticMarkup(hc(Generacion, { tipo: 'plano', toma: {
      fase: { fase: 'en_proceso', toma: 1 }, calidad: null, enElPlano: null, ultima: null, aviso: null, calidades: null, economia: null, cancelacion: null,
      elegirCalidad: () => {}, generar: () => {}, reintentar: () => {}, cancelar: () => detenidas.push(1), ...extra,
    } }));
    return { html, texto: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), botones: botones.slice() };
  };
  const enProceso = ver({});
  const b = enProceso.botones.find((x) => x.etiqueta === 'Detener la toma');
  confirmar = false;
  b?.tocar();
  await calma();
  const sinConfirmar = detenidas.length;
  confirmar = true;
  b?.tocar();
  await calma();
  check('C10) en proceso, «Detener la toma», con confirmación: sin ella no se detiene nada', !!b && sinConfirmar === 0 && detenidas.length === 1);
  const pidiendo = ver({ cancelacion: { estado: 'pidiendo' } });
  const pendiente = ver({ cancelacion: { estado: 'hecha', como: 'cancelando' } });
  const tarde = ver({ cancelacion: { estado: 'rechazada', motivo: 'take_accepted' } });
  check('C11) mientras se pide, y ya pedida, sin botón; rechazada, el porqué y el botón otra vez',
    !pidiendo.botones.some((x) => x.etiqueta === 'Detener la toma') && pidiendo.texto.includes(ES.filmmaker.takeStopping)
    && !pendiente.botones.some((x) => x.etiqueta === 'Detener la toma') && pendiente.texto.includes(ES.filmmaker.takeStopPending)
    && tarde.texto.includes(ES.filmmaker.takeStopTooLate) && tarde.botones.some((x) => x.etiqueta === 'Detener la toma'));
  const detenida = ver({ fase: { fase: 'elige_calidad' }, ultima: { toma: 1, estado: 'fallida', cancelada: true } });
  check('C12) la última, detenida: «Toma detenida», no un fallo', detenida.texto.includes(ES.filmmaker.takeStopped) && !detenida.texto.includes('no salió'));
  const MSJ = cargar('utils/mensajesDeFilmmaker.ts');
  const frase = (motivo) => MSJ.fraseDeLaCancelacion({ estado: 'rechazada', motivo }, t);
  check('C13) cada motivo del servidor, su frase',
    frase('take_starting') === ES.filmmaker.takeStopRetrySoon && frase('take_sending') === ES.filmmaker.takeStopRetrySoon
    && frase('take_processing') === ES.filmmaker.takeStopTooLate && frase('take_finished') === ES.filmmaker.takeStopFinished
    && frase('provider_unknown') === ES.filmmaker.takeStopUnknown && frase('take_reconciling') === ES.filmmaker.takeStopUnknown
    && frase('network') === ES.filmmaker.takeStopFailed && frase('take_not_found') === ES.filmmaker.takeStopFailed);
  check('C14) ninguna clave sin frase en español', faltan.size === 0, [...faltan].join(', '));
}

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 15 · detener una toma (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
