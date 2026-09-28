/**
 * FILMMAKER ENGINE · FASE 2 — EN QUÉ ESTÁ UNA TOMA, Y DE DÓNDE VIENE (2026-09-28).
 *
 *   A · el estado, puro: cada combinación de reserva y trabajo da UN estado, sin
 *       contradecir nunca lo que `decidirLiquidacion` dice del dinero;
 *   B · el dinero en tres números (la misma regla que la app), el vídeo en su
 *       plano, la categoría del fallo y lo que ve la app —nada de dentro—;
 *   C · de punta a punta: una toma que sale bien, otra que la sustituye, un plano
 *       que cambia, un fallo al pedir, un fallo después, un POST sin respuesta,
 *       una reserva que se queda sin trabajo, cuentas separadas y la traza entera;
 *   D · las guardas: solo lectura, la liquidación de siempre, el plazo de la
 *       llamada de vídeo y ni una fuga hacia la app.
 *
 * De verdad: la puerta del vídeo, el conductor, el Job Engine, el almacén, la
 * atención, el reconciliador, el barrendero, la liquidación, el libro, el
 * materializador, el Content Core, productions, F1-A, la callable `shots` y el
 * Credit Engine, sobre un Firestore en memoria (el arnés de
 * `f1d-postcanary.test.mjs`, copiado tal cual). De mentira: el adaptador de
 * Seedance, lo que ModelArk contesta, los bytes y el almacén de objetos. Nada sale
 * a la red, y no se usa ninguna credencial.
 *
 * Usa el compilado: `npm run build` antes de `npm test`.
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

/* ═══ FASE 2 · lo que se prueba aquí ═══════════════════════════════════════ */
const {
  decidirEstadoDeLaToma, dineroDeLaReserva, decidirEnlace, vistaDeLaToma, falloDeLaToma, trazasDeLaUnidad,
  ESTADOS_DE_TOMA, ESTADOS_CERRADOS_DE_TOMA,
} = lib('creator/estadoDeToma.js');
const { decidirLiquidacion } = lib('runtime/liquidacion.js');
const { TOCADOS_POR_EL_MOTOR, DINERO, fueraDelMotor } = await import('./motor-filmmaker-alcance.mjs');
const { crearCargador } = await import('./filmmaker-cliente.mjs');
/** El plazo de la llamada de vídeo, el MISMO número que `generateVideo`. */
const VIDA = video.PLAZO_DE_VIDEO_MS;

const tomasDe = (uid, k, unitId = 'sh-0101', productionId = pid(k)) =>
  intento(() => shotsPuerta.shots.run({ auth: { uid }, data: { op: 'shot.takes', productionId, sceneId: 'sc-0001', unitId } }));
const trazas = (uid, k, at = Date.now(), unitId = 'sh-0101', db = base) =>
  trazasDeLaUnidad(db, { uid, accountId: uid }, { productionId: pid(k), sceneId: 'sc-0001', unitId }, { at, vidaDeLaLlamadaMs: VIDA });
const reconciliar = () => rt.reconciliacionDeWee({ db: base, resolutores: { seedance: resolutor }, quietoDesdeMs: 0 })();
const liquidar = () => rt.barridoDeLiquidacionDeWee({ db: base })();

/* ═══ A · EL ESTADO, PURO ════════════════════════════════════════════════ */
console.log('\n── A · El estado, puro: una respuesta por evidencia, y nunca contra el dinero ──');
const T0 = 1_800_000_000_000;
const CONTABILIDAD = { creditRequestId: 'fm.prueba.1', creditTransactionId: 'usage_fm.prueba.1', creditsEstimated: 75, service: 'ai_video' };
const intentoJ = (o = {}) => ({ attemptId: 'at_1', number: 1, startedAt: T0, dispatched: false, providerKey: 'pk_1', ...o });
const REF = { providerId: 'seedance', operationId: 'cgt-prueba-1' };
const VIVA = { owner: 'trabajador', until: T0 + 60_000 };
const CADUCADA = { owner: 'trabajador', until: T0 - 1 };
const trabajoJ = (o = {}) => ({
  contract: '1', jobId: 'job_prueba', revision: 1, state: 'running', owner: { userId: 'u' }, context: {}, input: {}, trace: {},
  mode: 'sync', policy: {}, idempotency: { key: 'k', scope: 's', fingerprint: 'f' }, createdAt: T0, updatedAt: T0,
  deadlineAt: T0 + 8_100_000, availableAt: T0, attempts: [], attemptCount: 0, seenEvents: [], metadata: CONTABILIDAD, ...o,
});
const reservaJ = (estado, o = {}) => ({ estado, reservado: 75, autorizadaEn: T0, ...o });
const AHORA = T0 + 10_000;
const estadoDe = (r, j, at = AHORA) => decidirEstadoDeLaToma({ reserva: r, trabajo: j }, at, VIDA);
const es = (d, estado, motivo) => !!d && d.estado === estado && d.motivo === motivo;
const salio = (o = {}) => intentoJ({ dispatched: true, ...o });
const casos = [
  ['A2) reservada y sin trabajo todavía: «queued», la llamada lo está creando', reservaJ('AUTHORIZED'), null, 'queued', 'starting'],
  ['A4) el trabajo en la cola: «queued»', reservaJ('AUTHORIZED'), trabajoJ({ state: 'queued' }), 'queued', 'in_queue'],
  ['A5) un trabajador la tiene y no la ha mandado: «preparing»', reservaJ('AUTHORIZED'), trabajoJ({ attempts: [intentoJ({ lease: VIVA })], attemptCount: 1 }), 'preparing', 'sending'],
  ['A6) la mandó y el proveedor no ha contestado, con la concesión viva: «preparing»', reservaJ('AUTHORIZED'), trabajoJ({ attempts: [salio({ lease: VIVA })], attemptCount: 1 }), 'preparing', 'sending'],
  ['A7) el proveedor la aceptó y le puso nombre: «accepted»', reservaJ('AUTHORIZED'), trabajoJ({ state: 'waiting', attempts: [salio({ outcome: 'unknown', providerRef: REF, lease: CADUCADA })], attemptCount: 1 }), 'accepted', 'provider_has_it'],
  ['A7b) aceptada con la concesión todavía viva: «accepted», no «preparing»', reservaJ('AUTHORIZED'), trabajoJ({ attempts: [salio({ providerRef: REF, lease: VIVA })], attemptCount: 1 }), 'accepted', 'provider_has_it'],
  ['A8) salió y no volvió nadie, sin concesión: «reconciling»', reservaJ('AUTHORIZED'), trabajoJ({ state: 'waiting', attempts: [salio({ outcome: 'unknown', lease: CADUCADA })], attemptCount: 1 }), 'reconciling', 'unknown_outcome'],
  ['A9) terminó bien y el vídeo está en casa, sin cobrar todavía: «processing»', reservaJ('AUTHORIZED'), trabajoJ({ state: 'completed', attempts: [salio({ outcome: 'succeeded', providerRef: REF, endedAt: T0 + 5 })], attemptCount: 1 }), 'processing', 'settling'],
  ['A10) salió y falló sin dudas: «failed», devolución pendiente', reservaJ('AUTHORIZED'), trabajoJ({ state: 'failed', attempts: [salio({ outcome: 'failed', endedAt: T0 + 5 })], attemptCount: 1 }), 'failed', 'refund_pending'],
  ['A11) falló sin llegar a salir: «failed», devolución pendiente', reservaJ('AUTHORIZED'), trabajoJ({ state: 'failed', attempts: [intentoJ({ outcome: 'failed', endedAt: T0 + 5 })], attemptCount: 1 }), 'failed', 'refund_pending'],
  ['A12) aceptada y vencida por plazo: no se devuelve sola, «reconciling»', reservaJ('AUTHORIZED'), trabajoJ({ state: 'timed_out', attempts: [salio({ outcome: 'unknown', providerRef: REF })], attemptCount: 1 }), 'reconciling', 'unknown_outcome'],
  ['A13) cobrada y terminada: «completed»', reservaJ('COMPLETED', { final: 75 }), trabajoJ({ state: 'completed', attempts: [salio({ outcome: 'succeeded', providerRef: REF })], attemptCount: 1 }), 'completed', 'charged'],
  ['A14) cobrada y sin trabajo: se contradicen, «reconciling»', reservaJ('COMPLETED', { final: 75 }), null, 'reconciling', 'evidence_mismatch'],
  ['A15) cobrada con el trabajo fallado: se contradicen', reservaJ('COMPLETED', { final: 75 }), trabajoJ({ state: 'failed', attempts: [salio({ outcome: 'failed' })], attemptCount: 1 }), 'reconciling', 'evidence_mismatch'],
  ['A16) devuelta y fallada: «refunded»', reservaJ('REFUNDED'), trabajoJ({ state: 'failed', attempts: [salio({ outcome: 'failed' })], attemptCount: 1 }), 'refunded', 'refunded'],
  ['A17) devuelta sin trabajo: «refunded»', reservaJ('REFUNDED'), null, 'refunded', 'refunded'],
  ['A18) devuelta con un vídeo hecho: se contradicen', reservaJ('REFUNDED'), trabajoJ({ state: 'completed', attempts: [salio({ outcome: 'succeeded', providerRef: REF })], attemptCount: 1 }), 'reconciling', 'evidence_mismatch'],
  ['A19) una reserva FAILED no es de una toma', reservaJ('FAILED'), null, 'reconciling', 'evidence_mismatch'],
  ['A20) un trabajo sin su reserva dentro no es de esta toma', reservaJ('AUTHORIZED'), trabajoJ({ metadata: {} }), 'reconciling', 'evidence_mismatch'],
  ['A21) nadie lo tiene y nada es incierto: el Job Engine lo vuelve a coger, «queued»', reservaJ('AUTHORIZED'), trabajoJ({ attempts: [intentoJ({ lease: CADUCADA })], attemptCount: 1 }), 'queued', 'in_queue'],
];
for (const [nombre, r, j, estado, motivo] of casos) check(nombre, es(estadoDe(r, j), estado, motivo), JSON.stringify(estadoDe(r, j)));
check('A1) sin reserva no hay toma: ninguna respuesta, tenga o no trabajo', estadoDe(null, null) === null && estadoDe(null, trabajoJ()) === null);
check('A3) reservada y sin trabajo más de lo que vive la llamada: «failed», abandonada — un instante antes, todavía «queued»',
  es(estadoDe(reservaJ('AUTHORIZED'), null, T0 + VIDA), 'failed', 'abandoned') && es(estadoDe(reservaJ('AUTHORIZED'), null, T0 + VIDA - 1), 'queued', 'starting'));
check('A3b) sin saber cuándo se reservó, nunca se da por abandonada', es(estadoDe(reservaJ('AUTHORIZED', { autorizadaEn: undefined }), null, T0 + 100 * VIDA), 'queued', 'starting'));
check('A3c) y ese plazo es el de la llamada de vídeo: veinticinco minutos', VIDA === 1_500_000);
{
  const todas = new Set([...casos.map(([, r, j]) => estadoDe(r, j)?.estado), estadoDe(reservaJ('AUTHORIZED'), null, T0 + VIDA)?.estado]);
  check('A22) salen los ocho estados, y solo esos', ESTADOS_DE_TOMA.length === 8 && ESTADOS_DE_TOMA.every((s) => todas.has(s)) && [...todas].every((s) => ESTADOS_DE_TOMA.includes(s)), [...todas].join(', '));
  check('A23) cerrados, donde el dinero ya no se mueve: completed y refunded', JSON.stringify(ESTADOS_CERRADOS_DE_TOMA) === JSON.stringify(['completed', 'refunded']));
  /* Con el dinero retenido, el estado nunca dice otra cosa que la liquidación que usa el barrido para cobrar o devolver. */
  const ACORDE = { liquidar: ['processing'], reembolsar: ['failed'], reconciliar: ['reconciling'], esperar: ['queued', 'preparing', 'accepted'], nada: ['reconciling'] };
  const conTrabajo = casos.filter(([, r, j]) => j && r.estado === 'AUTHORIZED');
  const desacuerdos = conTrabajo.filter(([, r, j]) => !ACORDE[decidirLiquidacion(j, AHORA).tipo].includes(estadoDe(r, j).estado));
  check('A24) con el dinero retenido, cada estado dice lo mismo que `decidirLiquidacion`', conTrabajo.length === 12 && desacuerdos.length === 0, desacuerdos.map(([n]) => n).join(' | '));
  const lejos = T0 + 100 * VIDA;
  const cerradas = casos.filter(([, r]) => r.estado !== 'AUTHORIZED');
  check('A25) determinista, y lo que ya se cerró no depende de la hora', casos.every(([, r, j]) => JSON.stringify(estadoDe(r, j)) === JSON.stringify(estadoDe(r, j)))
    && cerradas.every(([, r, j]) => JSON.stringify(estadoDe(r, j)) === JSON.stringify(estadoDe(r, j, lejos))));
}

/* ═══ B · EL DINERO, EL PLANO, EL PORQUÉ Y LO QUE VE LA APP ═══════════════ */
console.log('\n── B · El dinero, el vídeo en su plano, el porqué y lo que ve la app ──');
{
  const app = crearCargador({})('utils/controladorDeToma.ts');
  const docs = [
    { status: 'AUTHORIZED', amount: -75 }, { status: 'PENDING', amount: -75 }, { status: 'COMPLETED', amount: -75, finalAmount: 75 },
    { status: 'COMPLETED', amount: -75, finalAmount: 60 }, { status: 'COMPLETED', amount: -75 }, { status: 'REFUNDED', amount: -75 }, { status: 'FAILED', amount: -75 },
  ];
  const distintos = docs.filter((d) => {
    const a = app.economiaDeLaReserva(1, d);
    const s = dineroDeLaReserva({ estado: d.status, reservado: Math.abs(d.amount), ...(d.finalAmount !== undefined ? { final: d.finalAmount } : {}) });
    return a.reservados !== s.reservado || a.cobrados !== s.cobrado || a.reembolsados !== s.reembolsado;
  });
  check('B1) los tres números salen con la MISMA regla que la app: reservado, cobrado y devuelto', distintos.length === 0, JSON.stringify(distintos));
  check('B1b) y sin reserva, ceros', JSON.stringify(dineroDeLaReserva(null)) === JSON.stringify({ reservado: 0, cobrado: 0, reembolsado: 0 }));
  const M1 = { assetId: `asset_${'a'.repeat(32)}`, estado: 'ready', clase: 'video' };
  const listo = { estado: 'completed', material: M1, producedAssetId: null, posteriorCobrada: false, unidadCambio: false };
  check('B2) cobrada, con su vídeo y el plano esperándolo: «pending»', decidirEnlace(listo) === 'pending');
  check('B3) el plano tiene puesto su material: «linked»', decidirEnlace({ ...listo, producedAssetId: M1.assetId }) === 'linked');
  check('B4) una toma posterior ya cobrada: «superseded», aunque el plano no haya cambiado', decidirEnlace({ ...listo, posteriorCobrada: true }) === 'superseded');
  check('B5) el plano cambió desde que se pidió: «stale»', decidirEnlace({ ...listo, unidadCambio: true }) === 'stale');
  check('B6) sin terminar, sin material o sin un vídeo listo: nada que enlazar',
    decidirEnlace({ ...listo, estado: 'processing' }) === 'none' && decidirEnlace({ ...listo, material: null }) === 'none'
    && decidirEnlace({ ...listo, material: { ...M1, estado: 'deleted' } }) === 'none' && decidirEnlace({ ...listo, material: { ...M1, clase: 'image' } }) === 'none');
  check('B7) lo que el plano tiene puesto manda: si ya es este vídeo, «linked» aunque haya otra cobrada después',
    decidirEnlace({ ...listo, producedAssetId: M1.assetId, posteriorCobrada: true }) === 'linked');
  const fallado = (error, state = 'failed') => trabajoJ({ state, attempts: [salio({ outcome: 'failed', ...(error ? { error } : {}) })], attemptCount: 1 });
  check('B8) por qué no salió: las cinco categorías de siempre, y un vencido sin error es TIMEOUT',
    falloDeLaToma('failed', fallado({ code: 'PROVIDER_ERROR', providerCode: '404', message: 'x' })) === 'MODEL_UNAVAILABLE'
    && falloDeLaToma('refunded', fallado({ code: 'PROVIDER_ERROR', providerCode: '503', message: 'x' })) === 'PROVIDER_TEMPORARY_ERROR'
    && falloDeLaToma('reconciling', trabajoJ({ state: 'timed_out', attempts: [salio({ outcome: 'unknown', providerRef: REF })], attemptCount: 1 })) === 'TIMEOUT');
  check('B9) y solo cuando acabó sin vídeo o no se sabe: ni en marcha, ni cobrada, ni sin trabajo',
    falloDeLaToma('accepted', fallado({ code: 'PROVIDER_ERROR' })) === null && falloDeLaToma('completed', trabajoJ({ state: 'completed' })) === null
    && falloDeLaToma('failed', null) === null && falloDeLaToma('reconciling', trabajoJ({ state: 'waiting' })) === null);
  const traza = {
    cuenta: 'cuenta', produccion: 'produccion', escena: 'sc-0001', unidad: 'sh-0101', toma: 2, requestId: 'fm.abc.2', revision: 4,
    firma: 'f'.repeat(64), plantilla: 'fm-plano-1', huella: 'e'.repeat(64), estado: 'failed', motivo: 'refund_pending', fallo: 'PROVIDER_REJECTED',
    dinero: { reservado: 75, cobrado: 0, reembolsado: 0 }, trabajo: { jobId: 'job_secreto', estado: 'failed', intentos: 1, salio: true, aceptada: true },
    generacion: { generationId: 'gen_secreto', estado: 'FAILED', costeEstimadoUsd: 0.165, costeRealUsd: null, estadoDelCoste: 'unavailable' },
    material: { assetId: M1.assetId, estado: 'ready', clase: 'video' }, plano: { shotNodeId: `fm_${'b'.repeat(32)}`, producedAssetId: null, version: 3 }, enlace: 'none',
  };
  const v = vistaDeLaToma(traza);
  check('B10) lo que ve la app: toma, request, estado, motivo, porqué, Credits, su vídeo, su plano y su revisión — y nada más',
    JSON.stringify(Object.keys(v).sort()) === JSON.stringify(['assetId', 'credits', 'failure', 'link', 'reason', 'requestId', 'revision', 'state', 'take'])
    && JSON.stringify(v.credits) === JSON.stringify({ reserved: 75, charged: 0, refunded: 0 }) && v.failure === 'PROVIDER_REJECTED' && v.take === 2 && v.revision === 4, JSON.stringify(v));
  const plano = JSON.stringify(v);
  check('B11) ni el trabajo, ni la fila del libro, ni el coste del proveedor, ni la huella, ni la firma, ni la plantilla, ni el nodo',
    !/job_secreto|gen_secreto|0\.165|unavailable|fm-plano|fm_b|eeee|ffff|usd|jobId|generation|fingerprint|prompt/i.test(plano), plano);
  check('B12) un material que no es un vídeo listo no se ofrece',
    !('assetId' in vistaDeLaToma({ ...traza, material: { ...traza.material, estado: 'processing' } })) && !('assetId' in vistaDeLaToma({ ...traza, material: null })));
}

/* ═══ C · DE PUNTA A PUNTA ═══════════════════════════════════════════════ */
console.log('\n── C · De punta a punta: cada toma, en su estado, sobre lo guardado ──');
for (const [uid, ks] of [[A, [1, 2]], [C, [3, 4, 5]], [D, [6]]]) for (const k of ks) await crear(uid, k, conFaro());
let primera;
{
  const r = await pedir(A, 1);
  primera = r;
  check('C0) una toma pedida en «Estándar», aceptada', r.g?.ok && r.g.valor.status === 'ACCEPTED', codigo(r.g ?? r.q));
  const q = await tomasDe(A, 1);
  const [a] = q.ok ? q.valor.takes : [];
  check('C1) aceptada: «accepted», reservado lo cotizado, nada cobrado ni devuelto, sin vídeo y nada que enlazar',
    q.ok && q.valor.takes.length === 1 && a.take === 1 && a.requestId === r.rid && a.state === 'accepted' && a.reason === 'provider_has_it'
    && a.credits.reserved === r.credits && a.credits.charged === 0 && a.credits.refunded === 0 && !('assetId' in a) && a.link === 'none' && !('failure' in a), JSON.stringify(q.ok ? q.valor : codigo(q)));
  check('C1b) y dice de qué revisión salió', a?.revision === (await plan(A, 1)).revision);
  termina(await tareaDe(A, r.rid), 'succeeded', { usage: { completion_tokens: 48_600, total_tokens: 48_600 } });
  await reconciliar();
  const [b] = (await tomasDe(A, 1)).valor.takes;
  check('C2) terminó y el vídeo está en casa, sin cobrar todavía: «processing», con su vídeo y nada cobrado',
    b.state === 'processing' && b.reason === 'settling' && typeof b.assetId === 'string' && b.credits.charged === 0 && b.link === 'none' && uso(r.rid)?.status === 'AUTHORIZED', JSON.stringify(b));
  await liquidar();
  const [c] = (await tomasDe(A, 1)).valor.takes;
  check('C3) cobrada exacta: «completed», cobrado = reservado, nada devuelto, y el plano esperándolo',
    c.state === 'completed' && c.reason === 'charged' && c.credits.charged === r.credits && c.credits.refunded === 0 && c.link === 'pending' && c.assetId === b.assetId, JSON.stringify(c));
  const e = await enlazar(A, 1, 1);
  const [d] = (await tomasDe(A, 1)).valor.takes;
  check('C4) enlazada: «linked», y es el mismo vídeo que el plano tiene puesto',
    e.ok && e.valor.result.status === 'linked' && d.link === 'linked' && e.valor.result.assetId === d.assetId, JSON.stringify(d));
}
{
  const r2 = await pedir(A, 1);
  check('C5) una segunda toma del mismo plano sale con el número siguiente', r2.g?.ok && r2.take === 2, codigo(r2.g ?? r2.q));
  termina(await tareaDe(A, r2.rid), 'succeeded');
  await pasada();
  const [u1, u2] = (await tomasDe(A, 1)).valor.takes;
  check('C6) cobradas las dos: la primera sigue «linked» —el plano es suyo— y la segunda, «pending»',
    u1.state === 'completed' && u1.link === 'linked' && u2.state === 'completed' && u2.link === 'pending' && u1.assetId !== u2.assetId, `${u1.link} · ${u2.link}`);
  await enlazar(A, 1, 2);
  const [w1, w2] = (await tomasDe(A, 1)).valor.takes;
  check('C7) enlazada la segunda: ella «linked» y la primera «superseded»', w2.link === 'linked' && w1.link === 'superseded', `${w1.link} · ${w2.link}`);
}
{
  /* El plano cambia después de cobrar y antes de enlazar: su vídeo no se engancha a un plano que ya es otro. */
  const r = await pedir(A, 2, 'sh-0102');
  termina(await tareaDe(A, r.rid), 'succeeded');
  await pasada();
  const antes = (await tomasDe(A, 2, 'sh-0102')).valor.takes[0];
  const escena = base.docs.get(`productions/${pid(2)}/productionScenes/sc-0001`);
  escena.shots = escena.shots.map((s) => (s.id === 'sh-0102' ? { ...s, description: 'La lámpara se apaga' } : s));
  const despues = (await tomasDe(A, 2, 'sh-0102')).valor.takes[0];
  const e = await enlazar(A, 2, 1, 'sh-0102');
  check('C8) cobrada y con el plano cambiado: «stale» — y el enlace de verdad dice lo mismo',
    antes?.link === 'pending' && despues?.link === 'stale' && despues.state === 'completed' && e.ok && e.valor.result.status === 'stale',
    `${antes?.link} → ${despues?.link} · ${e.ok ? e.valor.result.status : codigo(e)}`);
}
{
  modo = 'http404';
  const r = await pedir(C, 3);
  modo = 'aceptar';
  const [f] = (await tomasDe(C, 3)).valor.takes;
  check('C9) falló al pedirla (el modelo no está): «refunded», con su porqué y devuelta entera',
    r.g && !r.g.ok && f?.state === 'refunded' && f.reason === 'refunded' && f.failure === 'MODEL_UNAVAILABLE'
    && f.credits.refunded === f.credits.reserved && f.credits.reserved > 0 && f.credits.charged === 0, JSON.stringify(f));
}
{
  const r = await pedir(C, 4);
  termina(await tareaDe(C, r.rid), 'failed', { codigo: 'InternalServiceError', mensaje: 'fallo del proveedor' });
  await reconciliar();
  const [f] = (await tomasDe(C, 4)).valor.takes;
  check('C10) falló después de aceptarla: «failed», con su porqué, la devolución pendiente y nada devuelto todavía',
    f?.state === 'failed' && f.reason === 'refund_pending' && typeof f.failure === 'string' && f.credits.refunded === 0 && uso(r.rid)?.status === 'AUTHORIZED', JSON.stringify(f));
  await liquidar();
  const [g] = (await tomasDe(C, 4)).valor.takes;
  check('C11) y el barrido la devuelve: «refunded», exacta y una vez', g?.state === 'refunded' && g.credits.refunded === r.credits && reembolsos(r.rid).length === 1, JSON.stringify(g));
}
{
  modo = 'sinRespuesta';
  const r = await pedir(C, 5);
  modo = 'aceptar';
  const ya = await trazas(C, 5);
  const luego = await trazas(C, 5, Date.now() + 10 * 60_000);
  /* La llamada que la mandó ya terminó y soltó la concesión: nadie la tiene, salió y no volvió nadie. */
  check('C12) el POST no volvió: en cuanto la llamada termina, «reconciling» —y sigue así— ni cobrada ni devuelta',
    ya[0]?.estado === 'reconciling' && luego[0]?.estado === 'reconciling' && luego[0].motivo === 'unknown_outcome'
    && luego[0].dinero.cobrado === 0 && luego[0].dinero.reembolsado === 0 && luego[0].trabajo?.salio === true && luego[0].trabajo?.aceptada === false,
    `${ya[0]?.estado} → ${luego[0]?.estado}`);
  await pasada();
  check('C13) y el barrido no la toca: sigue retenida, porque no se sabe si existe', uso(r.rid)?.status === 'AUTHORIZED' && reembolsos(r.rid).length === 0);
}
{
  /* Una reserva que se quedó sin trabajo: la llamada que tenía que crearlo murió en medio. */
  const rid = toma.requestIdDeToma(D, pid(6), 'sh-0102', 1);
  await creditEngine.spendCredits({
    userId: D, service: uso(primera.rid).service, amount: 75, requestId: rid, reason: 'prueba', source: 'weë-studio',
    meta: { filmmaker: { productionId: pid(6), sceneId: 'sc-0001', unitId: 'sh-0102', take: 1 } },
  });
  const ya = await trazas(D, 6, Date.now(), 'sh-0102');
  const pasado = await trazas(D, 6, Date.now() + VIDA + 1_000, 'sh-0102');
  check('C14) reservada y sin trabajo: «queued» mientras la llamada todavía puede crearlo…',
    ya.length === 1 && ya[0].estado === 'queued' && ya[0].motivo === 'starting' && ya[0].trabajo === null, JSON.stringify(ya[0]?.estado));
  check('C15) …y «failed», abandonada, cuando ya no puede: el dinero sigue retenido y no se inventa un porqué',
    pasado[0]?.estado === 'failed' && pasado[0].motivo === 'abandoned' && pasado[0].dinero.reservado === 75 && pasado[0].dinero.reembolsado === 0
    && pasado[0].fallo === null && uso(rid)?.status === 'AUTHORIZED', JSON.stringify(pasado[0]?.estado));
}
{
  const ajena = await tomasDe(B, 1, 'sh-0101', pid(1));
  const inexistente = await tomasDe(A, 99);
  const sinTomas = await tomasDe(A, 2, 'sh-0101');
  check('C16) de otra cuenta, de una producción que no existe o de un plano sin tomas: ninguna, la misma respuesta',
    ajena.ok && ajena.valor.takes.length === 0 && inexistente.ok && inexistente.valor.takes.length === 0 && sinTomas.ok && sinTomas.valor.takes.length === 0);
  const mal = await intento(() => shotsPuerta.shots.run({ auth: { uid: A }, data: { op: 'shot.takes', productionId: 'corto', sceneId: 'sc-0001', unitId: 'sh-0101' } }));
  const sinSesion = await intento(() => shotsPuerta.shots.run({ data: { op: 'shot.takes', productionId: pid(1), sceneId: 'sc-0001', unitId: 'sh-0101' } }));
  check('C17) sin forma, no; y sin sesión, tampoco', !mal.ok && mal.error?.code === 'invalid-argument' && !sinSesion.ok && sinSesion.error?.code === 'unauthenticated');
}
{
  const [x1, x2] = await trazas(A, 1);
  const g = x2?.generacion;
  check('C18) la traza entera: cuenta, producción, escena, plano, toma, request, revisión, firma, plantilla y huella',
    x2?.cuenta === A && x2.produccion === pid(1) && x2.escena === 'sc-0001' && x2.unidad === 'sh-0101' && x2.toma === 2
    && x2.requestId === toma.requestIdDeToma(A, pid(1), 'sh-0101', 2) && Number.isInteger(x2.revision)
    && /^[0-9a-f]{64}$/.test(x2.firma ?? '') && x2.plantilla === plano.PLANTILLA_DE_PLANO && /^[0-9a-f]{64}$/.test(x2.huella ?? ''),
    JSON.stringify({ ...x2, trabajo: undefined, generacion: undefined }));
  check('C19) su trabajo, su fila del libro, su material y su plano, cada uno por su llave',
    x2?.trabajo?.estado === 'completed' && x2.trabajo.intentos === 1 && x2.trabajo.salio && x2.trabajo.aceptada && typeof x2.trabajo.jobId === 'string'
    && typeof g?.generationId === 'string' && base.leer(`aiGenerations/${g.generationId}`)?.creditTransactionId === `usage_${x2.requestId}`
    && x2.material?.estado === 'ready' && x2.material.clase === 'video' && x2.plano?.producedAssetId === x2.material.assetId
    && x2.plano.shotNodeId === toma.idDeNodoDePlano(A, pid(1), 'sh-0101'),
    JSON.stringify({ trabajo: x2?.trabajo, generacion: g, material: x2?.material, plano: x2?.plano }));
  check('C20) el coste del proveedor, en dólares y aparte: estimado el del adaptador; real solo si lo declaró —nunca 0 por defecto—',
    g?.costeEstimadoUsd === ESTIMACION.estimatedUsd && g.costeRealUsd === null && g.estadoDelCoste === 'unavailable'
    && typeof x1?.generacion?.costeRealUsd === 'number' && x1.generacion.costeRealUsd > 0 && x1.generacion.estadoDelCoste === 'actual',
    JSON.stringify({ primera: x1?.generacion, segunda: g }));
  check('C21) y los Credits, en su sitio: tres números que no se mezclan con el coste del proveedor',
    JSON.stringify(Object.keys(x2?.dinero ?? {}).sort()) === JSON.stringify(['cobrado', 'reembolsado', 'reservado']) && !Object.keys(g ?? {}).some((k) => /credit/i.test(k)));
}
{
  const antes = JSON.stringify([...base.docs.entries()]);
  const postsAntes = posts.length;
  const descargasAntes = descargas;
  await tomasDe(A, 1);
  await tomasDe(C, 5);
  await trazas(D, 6, Date.now(), 'sh-0102');
  check('C22) mirar no cambia nada: ni un documento, ni un POST, ni una descarga',
    JSON.stringify([...base.docs.entries()]) === antes && posts.length === postsAntes && descargas === descargasAntes);
  const rota = {
    collection: (c) => (c === 'jobs' ? { doc: () => ({ get: async () => { throw new Error('almacén caído'); } }) } : base.collection(c)),
    doc: (p) => base.doc(p),
    runTransaction: (f) => base.runTransaction(f),
  };
  const r = await intento(() => trazas(A, 1, Date.now(), 'sh-0101', rota));
  check('C23) si no se puede leer el trabajo, contesta un error: no se inventa un estado', !r.ok && /almacén caído/.test(String(r.error?.message)),
    r.ok ? JSON.stringify(r.valor.map((t) => t.estado)) : '');
}

/* ═══ D · LAS GUARDAS ════════════════════════════════════════════════════ */
console.log('\n── D · Solo lectura, la liquidación de siempre, el plazo de la llamada y ni una fuga ──');
{
  const src = sinComentarios(leer('functions/src/creator/estadoDeToma.ts'));
  check('D1) solo lectura: ni escribe, ni mueve dinero, ni habla con el proveedor, ni monta el conductor',
    !/\.(set|update|create|delete)\(|runTransaction|batch\(|spendCredits|completeCredits|refundCredits|creditEngine|settle\(|conductorDeWee|pedirMedio|videoEngine|ADAPTERS|consultar\(|atenderAviso|barrerLiquidaciones/.test(src));
  check('D2) el dinero lo dice la liquidación del barrido —`decidirLiquidacion`—, sin una regla propia de concesiones',
    /decidirLiquidacion\(job, at\)/.test(src) && !/lease|until|concesion/i.test(src));
  const puerta = sinComentarios(leer('functions/src/shots/puerta.ts'));
  check('D3) el plazo es el de la llamada de vídeo: el mismo número, pasado por la puerta, y ninguna copia',
    /export const PLAZO_DE_VIDEO_MS = 1_500_000;/.test(leer('functions/src/creator/video.ts')) && !/1_500_000|1500000|25 \* 60/.test(src)
    && /vidaDeLaLlamadaMs: PLAZO_DE_VIDEO_MS/.test(puerta));
  check('D4) la puerta solo deja salir la vista, nunca la traza', /return \{ takes: trazas\.map\(vistaDeLaToma\) \};/.test(puerta) && (puerta.match(/trazasDeLaUnidad\(/g) || []).length === 1);
  check('D5) el módulo nuevo está en la lista del motor, y el dinero no', TOCADOS_POR_EL_MOTOR.includes('functions/src/creator/estadoDeToma.ts') && TOCADOS_POR_EL_MOTOR.every((f) => !DINERO.some((re) => re.test(f))));
  check('D6) ni el runtime, ni los Credits, ni el Core: esta fase los lee, no los cambia',
    fueraDelMotor(git('diff --name-only d8d11ea -- functions/src/runtime functions/src/credits functions/src/core').trim().split('\n').filter(Boolean)).length === 0);
  /*
   * Defensa en profundidad que la prueba de punta a punta no puede ver: el `requestId` de una toma ya lleva la
   * cuenta dentro, así que otra cuenta nunca llega a estas lecturas. Se fija que, aun así, cada una sea de su dueño.
   */
  check('D9) el material se busca por su dueño Y su procedencia', /\.where\('ownerAccountId', '==', uid\)\s*\.where\('provenance\.traceId', '==', requestId\)/.test(src));
  check('D10) la reserva cuenta solo si es de quien pregunta, y la fila del libro también',
    /if \(!esObj\(d\) \|\| d\.userId !== uid\) break;/.test(src) && /d\.get\('userId'\) === uid/.test(src));
  check('D7) documentado en FILMMAKER.md', /### Fase 2 · /.test(leer('docs/FILMMAKER.md')) && /shot\.takes/.test(leer('docs/FILMMAKER.md')));
  check('D8) esta suite está en la cadena de `npm test`', /filmmaker-toma-estado\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 2 · el estado y la traza de una toma (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
