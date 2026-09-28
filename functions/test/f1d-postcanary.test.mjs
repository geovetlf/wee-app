/**
 * F1-D TRAS EL CANARY REAL (2026-09-28) — lo que el canary enseñó, cerrado y probado.
 *
 *   PC · el coste del proveedor, separado: estimado, real o no disponible —nunca 0
 *        por defecto—, de la aceptación al final (A–G del encargo);
 *   EC · por qué no salió una generación, en cinco categorías y sin nada de dentro;
 *   MD · qué calidades se pueden pedir: solo las que tienen su modelo validado
 *        («Estándar»); «Alta», «Máxima» y 4K, no, y el servidor lo cumple;
 *   QR · cotización = reserva; cobro y reembolso exactos, nunca de más ni dos veces;
 *   PA · solo una generación completada pone el vídeo en su plano, y nada lo pisa;
 *   PV · qué plano tiene qué vídeo (`shot.videos`), para la tarjeta del storyboard.
 *
 * De verdad: la puerta, el conductor, el Job Engine, el almacén, la atención, el
 * reconciliador, el barrendero, la liquidación, el libro, el materializador, el
 * Content Core, productions, F1-A, la callable `shots` y el Credit Engine, sobre
 * un Firestore en memoria (el arnés de `f1d-generacion.test.mjs`, copiado tal
 * cual). De mentira: el adaptador de Seedance —que acepta, estima y falla como el
 * de verdad—, lo que ModelArk contesta, los bytes y el almacén de objetos. Nada
 * sale a la red, y no se usa ninguna credencial.
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

for (const [uid, ks] of [[A, [1, 2, 3, 4, 5, 6, 7, 8]], [C, [9, 10, 11, 12, 13, 14, 15, 25]], [D, [16, 17]], [E, [18, 19, 20, 21, 22]], [F, [23, 24]]]) {
  for (const k of ks) await crear(uid, k, conFaro());
}
await crear(D, 40, conFaro({ aspectRatio: '16:9', resolution: '1080p' }));
await crear(D, 41, conFaro({ aspectRatio: '16:9', resolution: '4k' }));
await crear(D, 42, conFaro({ aspectRatio: '16:9' }));

/* ═══ PC · EL COSTE REAL DEL PROVEEDOR ══════════════════════════════════ */
console.log('\n── PC · El coste del proveedor: estimado, real o no disponible — nunca 0 por defecto ──');
let tomaA;
{
  /* A · ModelArk declara lo que consumió. */
  const r = await pedir(A, 1);
  tomaA = r;
  check('PC-A0) aceptada en «Estándar»', r.g?.ok && r.g.valor.status === 'ACCEPTED', codigo(r.g ?? r.q));
  let [fila] = filas(r.rid);
  check('PC-A1) al aceptar, la fila NO se cierra: PROCESSING, con el nombre de la tarea y sin completedAt',
    filas(r.rid).length === 1 && fila.status === 'PROCESSING' && typeof fila.providerTaskId === 'string' && fila.completedAt === undefined, JSON.stringify({ status: fila?.status }));
  check('PC-A2) el coste, separado: estimado el del adaptador, real `null`, «estimated», y SIN `providerCost`',
    fila.providerCostStatus === 'estimated' && fila.estimatedProviderCost === ESTIMACION.estimatedUsd && fila.actualProviderCost === null
    && fila.providerRateUsdPerMillionTokens === ESTIMACION.usdPerMillionTokens && !('providerCost' in fila), JSON.stringify(fila));
  const antesDelDia = { ...delDia() };
  termina(fila.providerTaskId, 'succeeded', { usage: { completion_tokens: 48_600, total_tokens: 48_600 } });
  await pasada();
  [fila] = filas(r.rid);
  const esperado = (48_600 * 3.3) / 1_000_000;
  check('PC-A3) al terminar, lo real: los tokens que DECLARÓ ModelArk, a su tarifa oficial',
    fila.status === 'COMPLETED' && fila.providerCostStatus === 'actual' && Math.abs(fila.actualProviderCost - esperado) < 1e-12
    && fila.providerCostSource === 'provider_usage' && fila.providerUsageTokens === 48_600 && fila.providerCost === fila.actualProviderCost && !!fila.completedAt, JSON.stringify(fila));
  check('PC-A4) y lo estimado se conserva aparte, sin pisarlo', fila.estimatedProviderCost === ESTIMACION.estimatedUsd && fila.estimatedProviderCost !== fila.actualProviderCost);
  const dia = delDia();
  check('PC-A5) el resumen del día suma ESA llamada una vez, con su coste real',
    (dia.calls ?? 0) === (antesDelDia.calls ?? 0) + 1 && Math.abs((dia.usd ?? 0) - (antesDelDia.usd ?? 0) - esperado) < 1e-9 && (dia.unpricedCalls ?? 0) === (antesDelDia.unpricedCalls ?? 0));
  check('PC-E1) E · terminó bien: la reserva se cobró EXACTA y la fila lleva lo cobrado',
    uso(r.rid)?.status === 'COMPLETED' && uso(r.rid)?.finalAmount === r.credits && fila.creditsCharged === r.credits, JSON.stringify(uso(r.rid)));
}
{
  /* B · ModelArk no dice lo que consumió. */
  const r = await pedir(A, 2);
  const antesDelDia = { ...delDia() };
  termina(await tareaDe(A, r.rid), 'succeeded');
  await pasada();
  const [fila] = filas(r.rid);
  check('PC-B1) terminó sin decir lo que consumió: real `null`, «unavailable», y SIN providerCost —no es 0—',
    fila.status === 'COMPLETED' && fila.actualProviderCost === null && fila.providerCostStatus === 'unavailable' && !('providerCost' in fila) && fila.providerUsageTokens === undefined, JSON.stringify(fila));
  check('PC-B2) lo estimado sigue ahí, aparte', fila.estimatedProviderCost === ESTIMACION.estimatedUsd);
  const dia = delDia();
  check('PC-B3) el día la cuenta como llamada SIN precio, y no le suma dinero inventado',
    (dia.unpricedCalls ?? 0) === (antesDelDia.unpricedCalls ?? 0) + 1 && Math.abs((dia.usd ?? 0) - (antesDelDia.usd ?? 0)) < 1e-12);
  check('PC-B4) y el cobro de la toma no depende de eso: cobrada exacta', uso(r.rid)?.status === 'COMPLETED' && uso(r.rid)?.finalAmount === r.credits);
  const nulo = leerAvisoDeSeedance({ id: 'cgt-nulo', status: 'succeeded', usage: { completion_tokens: null } });
  const total = leerAvisoDeSeedance({ id: 'cgt-total', status: 'succeeded', usage: { completion_tokens: null, total_tokens: 7 } });
  check('PC-B5) un `null` de ModelArk no es cero tokens: no hay consumo declarado; si trae el total, vale el total',
    nulo.usage === undefined && total.usage?.tokens === 7);
}
{
  /* C · 0 tokens, dichos por ModelArk: un coste real de 0. */
  const r = await pedir(A, 3);
  termina(await tareaDe(A, r.rid), 'succeeded', { usage: { completion_tokens: 0 } });
  await pasada();
  const [fila] = filas(r.rid);
  check('PC-C1) 0 tokens declarados es un coste REAL de 0: «actual», no «unavailable»',
    fila.providerCostStatus === 'actual' && fila.actualProviderCost === 0 && fila.providerCost === 0 && fila.providerUsageTokens === 0, JSON.stringify(fila));
}
{
  /* D · Falla antes de ACCEPTED: el 404 del canary real. */
  modo = 'http404';
  const r = await pedir(A, 4);
  modo = 'aceptar';
  const [fila] = filas(r.rid);
  const job = await trabajo(A, r.rid);
  check('PC-D1) 404 antes de aceptar: FAILED, real `null`, «unavailable», sin providerCost y sin tarea',
    fila?.status === 'FAILED' && fila.actualProviderCost === null && fila.providerCostStatus === 'unavailable' && !('providerCost' in fila) && fila.providerTaskId === undefined, JSON.stringify(fila));
  check('PC-D2) y lo estimado —el del catálogo, el cotizado— se conserva', typeof fila.estimatedProviderCost === 'number' && fila.estimatedProviderCost > 0);
  check('PC-D3) el trabajo, fallido; la reserva, devuelta EXACTA una vez', job?.state === 'failed' && uso(r.rid)?.status === 'REFUNDED' && reembolsos(r.rid).length === 1 && reembolsos(r.rid)[0].amount === r.credits);
}
{
  /* El cierre de un intento, uno por uno, sobre el libro en memoria. */
  const libro = ledger.memoryLedger();
  const lb = rt.libroDelMotor(libro);
  const despacho = { capability: 'video.generate', implementation: { providerId: 'seedance', modelId: 'm' }, metadata: { estimatedUsd: 0.48, creditsEstimated: 75 },
    trace: { userId: A, requestId: 'req-u', stepId: 'crear', runId: 'run_u', workplace: 'studio' }, attempt: 1, jobId: 'job-u', attemptId: 'job-u#1' };
  const resultado = (extra) => ({ contract: 'x', status: 'completed', requestId: 'r', traceId: 't', idempotencyKey: 'k', capability: 'video.generate',
    implementation: { providerId: 'seedance', modelId: 'm' }, timing: { startedAt: 0, finishedAt: 1 }, warnings: [], ...extra });
  const respuesta = (usd, meta = {}) => ({ kind: 'video', urls: ['https://x.invalid/v.mp4'], actual: { provider: { lines: [], usd, provider: 'seedance', model: 'm' }, latencyMs: 1 }, model: 'm', meta });
  const cerrar = async (res, extra = {}) => { const id = await lb.abrir(despacho); await lb.cerrar(id, { dispatch: despacho, resultado: res, durationMs: 1, ...extra }); return libro.records[id]; };
  const abierta = libro.records[await lb.abrir(despacho)];
  check('PC-U0) toda fila del Core nace con el coste separado: estimado el cotizado, real `null`, sin providerCost',
    abierta.providerCostStatus === 'estimated' && abierta.estimatedProviderCost === 0.48 && abierta.actualProviderCost === null && !('providerCost' in abierta), JSON.stringify(abierta));
  const u1 = await cerrar(resultado({ response: respuesta(0.165, { providerReportedTokens: 1000, usdPerMillionTokens: 3.3 }) }));
  check('PC-U1) el adaptador declara lo que dijo el proveedor: ese es el coste real', u1.providerCostStatus === 'actual' && Math.abs(u1.actualProviderCost - 0.0033) < 1e-12 && u1.providerCostSource === 'provider_usage' && u1.providerUsageTokens === 1000);
  const u2 = await cerrar(resultado({ response: respuesta(0.165, { providerReportedTokens: null, usdPerMillionTokens: 3.3 }) }));
  check('PC-U2) si el proveedor NO lo dijo, la estimación del adaptador NO pasa por real —aunque venga como coste—',
    u2.providerCostStatus === 'unavailable' && u2.actualProviderCost === null && !('providerCost' in u2), JSON.stringify(u2));
  const u3 = await cerrar(resultado({ response: respuesta(0.002) }));
  check('PC-U3) sin declaración, lo que el adaptador midió como coste de la respuesta', u3.providerCostStatus === 'actual' && u3.actualProviderCost === 0.002 && u3.providerCostSource === 'adapter_measure');
  const u4 = await cerrar(resultado({ response: respuesta(undefined) }));
  check('PC-U4) y sin nada medido: «unavailable», nunca 0', u4.providerCostStatus === 'unavailable' && u4.actualProviderCost === null && !('providerCost' in u4));
  const u5 = await cerrar(resultado({ status: 'accepted', operation: { providerId: 'seedance', operationId: 'cgt-u5' } }), { avance: ESTIMACION });
  check('PC-U5) aceptada: no se cierra; queda PROCESSING con la tarea, la estimación del adaptador y su tarifa',
    u5.status === 'PROCESSING' && u5.providerTaskId === 'cgt-u5' && u5.estimatedProviderCost === 0.165 && u5.providerRateUsdPerMillionTokens === 3.3 && u5.actualProviderCost === null && u5.providerCostStatus === 'estimated', JSON.stringify(u5));
  const u6 = await cerrar(resultado({ status: 'failed', error: { code: 'PROVIDER_ERROR', source: 'adapter:seedance', details: { providerRetryable: true } } }), { desconocido: true });
  check('PC-U6) salió y no volvió nada: tampoco se cierra, ni como fallo', u6.status === 'PROCESSING' && u6.providerCostStatus === 'estimated');
  const u7 = await cerrar(resultado({ status: 'failed', error: { code: 'MODEL_UNAVAILABLE', source: 'gateway', details: { reason: 'model_disabled' } } }));
  check('PC-D4) D · lo paró el Gateway sin llegar al proveedor: costó 0, y eso SÍ se sabe', u7.status === 'FAILED' && u7.providerCostStatus === 'actual' && u7.actualProviderCost === 0 && u7.providerCostSource === 'not_dispatched');
  const u8 = await cerrar(resultado({ status: 'failed', error: { code: 'PROVIDER_ERROR', source: 'adapter:seedance', providerCode: '500', details: {} } }));
  check('PC-D5) D · falló en el proveedor: no dijo nada, «unavailable»', u8.status === 'FAILED' && u8.providerCostStatus === 'unavailable' && u8.actualProviderCost === null);
}
{
  /* F · El plazo: ModelArk la da por vencida; y el POST que no vuelve. */
  const r = await pedir(A, 5);
  termina(await tareaDe(A, r.rid), 'expired');
  await pasada();
  const [fila] = filas(r.rid);
  check('PC-F1) vencida en el proveedor: FAILED, «unavailable», real `null`', fila.status === 'FAILED' && fila.providerCostStatus === 'unavailable' && fila.actualProviderCost === null, JSON.stringify(fila));
  check('PC-F2) y la reserva, devuelta EXACTA una vez', uso(r.rid)?.status === 'REFUNDED' && reembolsos(r.rid).length === 1 && reembolsos(r.rid)[0].amount === r.credits);
  modo = 'sinRespuesta';
  const s = await pedir(A, 6);
  modo = 'aceptar';
  const [filaS] = filas(s.rid);
  const jobS = await trabajo(A, s.rid);
  check('PC-F3) el POST no volvió: la fila NO se cierra como fallida —sigue PROCESSING y «estimated»—',
    filaS?.status === 'PROCESSING' && filaS.providerCostStatus === 'estimated' && filaS.completedAt === undefined, JSON.stringify(filaS));
  await pasada();
  check('PC-F4) y ni se cobra ni se devuelve: no se sabe si la tarea existe (decisión del puente pre-F1-D, intacta)',
    uso(s.rid)?.status === 'AUTHORIZED' && reembolsos(s.rid).length === 0 && jobS?.state !== 'failed', `${uso(s.rid)?.status} · ${jobS?.state}`);
}
{
  /* G · Reintentos e idempotencia. */
  const [antes] = filas(tomaA.rid);
  const diaAntes = { ...delDia() };
  await pasada(); await pasada();
  const otra = await ledger.firestoreLedger.closeOperation({ provider: 'seedance', providerTaskId: antes.providerTaskId, status: 'COMPLETED', reportedTokens: 999_999 });
  const [despues] = filas(tomaA.rid);
  check('PC-G1) cerrar otra vez —más pasadas, o con OTRO consumo— no cambia nada ni suma otra vez',
    otra.already === true && otra.closed === 0 && despues.actualProviderCost === antes.actualProviderCost && despues.providerUsageTokens === 48_600
    && (delDia().calls ?? 0) === (diaAntes.calls ?? 0) && Math.abs((delDia().usd ?? 0) - (diaAntes.usd ?? 0)) < 1e-12);
  const r = await pedir(A, 7);
  const tarea = await tareaDe(A, r.rid);
  const dos = await Promise.all([
    ledger.firestoreLedger.closeOperation({ provider: 'seedance', providerTaskId: tarea, status: 'COMPLETED', reportedTokens: 1000 }),
    ledger.firestoreLedger.closeOperation({ provider: 'seedance', providerTaskId: tarea, status: 'COMPLETED', reportedTokens: 1000 }),
  ]);
  check('PC-G2) dos cierres a la vez: exactamente uno cierra', dos.filter((x) => x.closed === 1).length === 1 && dos.filter((x) => x.already).length === 1, JSON.stringify(dos));
  /* La atención no pudo escribir en el libro: la liquidación lo cierra con lo que guardó el trabajo. */
  const r3 = await pedir(A, 8);
  termina(await tareaDe(A, r3.rid), 'succeeded', { usage: { completion_tokens: 20_000 } });
  const original = ledger.firestoreLedger.closeOperation;
  ledger.firestoreLedger.closeOperation = async () => { throw new Error('libro caído'); };
  await rt.reconciliacionDeWee({ db: base, resolutores: { seedance: resolutor }, quietoDesdeMs: 0 })();
  ledger.firestoreLedger.closeOperation = original;
  const [aMedias] = filas(r3.rid);
  const job3 = await trabajo(A, r3.rid);
  check('PC-G3) si el libro falla al atender el aviso, el trabajo termina igual y la fila queda PROCESSING, a la vista',
    job3?.state === 'completed' && aMedias.status === 'PROCESSING' && aMedias.providerCostStatus === 'estimated', `${job3?.state} · ${aMedias.status}`);
  await rt.barridoDeLiquidacionDeWee({ db: base })();
  const [cerrada] = filas(r3.rid);
  check('PC-G4) y la liquidación, con lo que el proveedor declaró —guardado en el trabajo—, la cierra con su coste real',
    cerrada.status === 'COMPLETED' && cerrada.providerCostStatus === 'actual' && Math.abs(cerrada.actualProviderCost - (20_000 * 3.3) / 1e6) < 1e-12 && uso(r3.rid)?.status === 'COMPLETED', JSON.stringify(cerrada));
  const idLegacy = await ledger.firestoreLedger.open({ userId: A, capability: 'video.generate', modality: 'video', provider: 'seedance', model: 'm', attempt: 1, estimatedUsd: 0.4, pricingMode: 'simulated' });
  await ledger.firestoreLedger.progress(idLegacy, { status: 'PROCESSING', providerTaskId: 'cgt-legacy-1' });
  const r4 = await ledger.firestoreLedger.closeOperation({ provider: 'seedance', providerTaskId: 'cgt-legacy-1', status: 'COMPLETED', reportedTokens: 10 });
  const legacy = base.leer(`aiGenerations/${idLegacy}`);
  check('PC-G5) una fila del camino de siempre —sin coste separado— no se toca: su providerCost sigue siendo el de siempre',
    r4.found === false && r4.closed === 0 && legacy.status === 'PROCESSING' && legacy.providerCost === 0 && legacy.providerCostStatus === undefined);
}

/* ═══ EC · POR QUÉ NO SALIÓ ═════════════════════════════════════════════ */
console.log('\n── EC · Por qué no salió: cinco categorías, y nada de dentro ──');
{
  const cat = fallos.categoriaDelFallo;
  const e = (code, providerCode, details = {}) => ({ code, source: 'adapter:seedance', ...(providerCode ? { providerCode } : {}), details });
  const tabla = [
    [e('PROVIDER_ERROR', '404', { providerRetryable: false }), 'MODEL_UNAVAILABLE', '404 al pedir la tarea (ModelNotOpen)'],
    [{ code: 'MODEL_UNAVAILABLE', source: 'gateway', details: { reason: 'model_disabled' } }, 'MODEL_UNAVAILABLE', 'modelo apagado'],
    [e('PROVIDER_ERROR', '503', { providerRetryable: true }), 'PROVIDER_TEMPORARY_ERROR', '5xx'],
    [e('RATE_LIMIT', '429'), 'PROVIDER_TEMPORARY_ERROR', 'cuota'],
    [e('PROVIDER_UNAVAILABLE', '401', { reason: 'provider_auth_failed' }), 'PROVIDER_TEMPORARY_ERROR', 'credencial rechazada'],
    [{ code: 'PROVIDER_UNAVAILABLE', source: 'adapter:seedance', details: { reason: 'not_configured' } }, 'PROVIDER_TEMPORARY_ERROR', 'sin configurar'],
    [e('PROVIDER_ERROR', undefined, { providerRetryable: true }), 'PROVIDER_TEMPORARY_ERROR', 'reintentable, sin código'],
    [e('PROVIDER_ERROR', '400', { providerRetryable: false }), 'PROVIDER_REJECTED', '400'],
    [e('CONTENT_POLICY', '400', { reason: 'input_rejected' }), 'PROVIDER_REJECTED', 'contenido'],
    [e('PROVIDER_ERROR', 'InputImageSensitiveContentDetected', { reason: 'provider_reported_failure', providerStatus: 'failed', providerMessage: 'rechazo de entrada: sensitive' }), 'PROVIDER_REJECTED', 'rechazo de entrada contado en el aviso'],
    [e('TIMEOUT', undefined, { reason: 'timeout' }), 'TIMEOUT', 'plazo de Weë'],
    [e('PROVIDER_ERROR', 'X', { reason: 'provider_reported_failure', providerStatus: 'expired' }), 'TIMEOUT', 'vencida en el proveedor'],
    [e('PROVIDER_ERROR', 'InternalServiceError', { reason: 'provider_reported_failure', providerStatus: 'failed', providerMessage: 'algo' }), 'UNKNOWN_PROVIDER_ERROR', 'fallo contado sin más'],
    [{ code: 'INTERNAL_ERROR', source: 'gateway', details: {} }, 'UNKNOWN_PROVIDER_ERROR', 'fallo de Weë'],
    [null, 'UNKNOWN_PROVIDER_ERROR', 'sin error'],
  ];
  const mal = tabla.filter(([err, esperada]) => cat(err) !== esperada).map(([err, esperada, que]) => `${que}: ${cat(err)}≠${esperada}`);
  check('EC1) cada error del Core cae en su categoría', mal.length === 0, mal.join(' | '));
  check('EC2) las categorías son cinco, y solo cinco', JSON.stringify([...fallos.CATEGORIAS_DE_FALLO]) === JSON.stringify(['MODEL_UNAVAILABLE', 'PROVIDER_TEMPORARY_ERROR', 'PROVIDER_REJECTED', 'TIMEOUT', 'UNKNOWN_PROVIDER_ERROR']));
  const sinc = async (m, k) => { modo = m; const r = await pedir(C, k); modo = 'aceptar'; return r; };
  const r404 = await sinc('http404', 9);
  const d = r404.g?.error?.details ?? {};
  check('EC3) el 404 de ModelArk llega a la app como MODEL_UNAVAILABLE, con el reembolso CONFIRMADO', !r404.g?.ok && d.code === 'PROVIDER_ERROR' && d.reason === 'MODEL_UNAVAILABLE' && d.refunded === true, JSON.stringify(d));
  const dicho = JSON.stringify({ message: r404.g?.error?.message, details: d });
  check('EC4) y sin nada de dentro: ni el 404, ni el adaptador, ni ModelArk, ni el trabajo, ni la operación',
    !/404|seedance|modelark|ModelNotOpen|adapter|run_|fm\.|jobId|requestId|providerCode/i.test(dicho), dicho);
  const r503 = await sinc('http503', 10);
  const r400 = await sinc('http400', 11);
  check('EC5) un 5xx es PROVIDER_TEMPORARY_ERROR y un 400, PROVIDER_REJECTED — los dos devueltos exactos, una vez',
    r503.g?.error?.details?.reason === 'PROVIDER_TEMPORARY_ERROR' && r400.g?.error?.details?.reason === 'PROVIDER_REJECTED'
    && [r503, r400].every((r) => uso(r.rid)?.status === 'REFUNDED' && reembolsos(r.rid).length === 1 && reembolsos(r.rid)[0].amount === r.credits), `${codigo(r503.g)} / ${codigo(r400.g)}`);
  const falla = async (k, status, extra) => { const r = await pedir(C, k); termina(await tareaDe(C, r.rid), status, extra); await pasada(); return r; };
  const consultaDe = async (k) => (await cotizar(C, await plan(C, k, 'sh-0101', null))).valor;
  const rechazo = await falla(12, 'failed', { codigo: 'InputImageSensitiveContentDetected', mensaje: 'The input may contain sensitive content' });
  const vencida = await falla(13, 'expired');
  const rara = await falla(14, 'failed', { codigo: 'InternalServiceError', mensaje: 'algo raro' });
  const [c12, c13, c14] = [await consultaDe(12), await consultaDe(13), await consultaDe(14)];
  check('EC6) después de aceptar, la consulta dice cómo acabó el TRABAJO y por qué, con la reserva ya devuelta',
    c12.takes.current.outcome === 'failed' && c12.takes.current.failure === 'PROVIDER_REJECTED'
    && c13.takes.current.failure === 'TIMEOUT' && c14.takes.current.failure === 'UNKNOWN_PROVIDER_ERROR'
    && [rechazo, vencida, rara].every((r) => uso(r.rid)?.status === 'REFUNDED'), JSON.stringify([c12.takes.current, c13.takes.current, c14.takes.current]));
  const salioBien = await pedir(C, 25);
  termina(await tareaDe(C, salioBien.rid), 'succeeded'); await pasada();
  const bien = await consultaDe(25);
  const enMarcha = await pedir(C, 15);
  const viva = await consultaDe(15);
  check('EC7) y de una que salió bien, o que sigue en marcha, lo dice sin categoría',
    bien.takes.current.outcome === 'succeeded' && bien.takes.current.failure === undefined && viva.takes.current.outcome === 'in_progress' && enMarcha.g?.ok);
  check('EC8) la consulta tampoco cuenta nada de dentro', !/404|seedance|modelark|adapter|providerCode|jobId/i.test(JSON.stringify([c12, c13, c14, viva])));
}

/* ═══ MD · QUÉ MODELOS HAY ══════════════════════════════════════════════ */
console.log('\n── MD · Qué calidades se pueden pedir: solo las que tienen su modelo validado ──');
{
  const consulta = async (k) => (await cotizar(D, await plan(D, k, 'sh-0101', null))).valor;
  const SIN_MODELO = { available: false, reason: 'model_unavailable' };
  const q720 = await consulta(16);
  check('MD1) a 720p: «Estándar» sí; «Alta» y «Máxima», sin su modelo',
    JSON.stringify(q720.qualities) === JSON.stringify({ standard: { available: true }, high: SIN_MODELO, max: SIN_MODELO }), JSON.stringify(q720.qualities));
  const q1080 = await consulta(40);
  check('MD2) a 1080p: «Estándar» no llega (y se dice hasta dónde); «Alta» y «Máxima», sin modelo',
    q1080.qualities.standard.available === false && q1080.qualities.standard.reason === 'quality_not_representable' && q1080.qualities.standard.resolution === '1080p'
    && q1080.qualities.high.reason === 'model_unavailable' && q1080.qualities.max.reason === 'model_unavailable', JSON.stringify(q1080.qualities));
  const q4k = await consulta(41);
  check('MD3) en 4K no queda ninguna: 4K no está disponible', Object.values(q4k.qualities).every((x) => x.available === false), JSON.stringify(q4k.qualities));
  const qAuto = await consulta(42);
  check('MD4) sin resolución fijada, igual: solo «Estándar»', qAuto.qualities.standard.available === true && !qAuto.qualities.high.available && !qAuto.qualities.max.available);
  const antes = { posts: posts.length, saldo: saldo(D), cupo: cupoDeVideo(D), asientos: base.de('creditTransactions').length, trabajos: base.de('jobs').length };
  const plAlta = await plan(D, 17, 'sh-0101', 'high');
  const plMax = await plan(D, 17, 'sh-0101', 'max');
  const qAlta = await cotizar(D, plAlta);
  const qMax = await cotizar(D, plMax);
  const gAlta = await generar(D, { ...plAlta, take: 1 }, 999);
  const gMax = await generar(D, { ...plMax, take: 1 }, 999);
  const g4k = await generar(D, { ...(await plan(D, 41, 'sh-0101', 'high')), take: 1 }, 999);
  check('MD5) cotizar «Alta» o «Máxima»: no se permite, model_unavailable, sin precio',
    [qAlta, qMax].every((q) => q.ok && q.valor.allowed === false && q.valor.reason === 'model_unavailable' && q.valor.credits === undefined), [qAlta, qMax].map(codigo).join(' / '));
  check('MD6) generarlas —o «Alta» en 4K— se para ANTES de todo: sin POST, sin trabajo, sin reserva, sin cupo, sin cobro',
    [gAlta, gMax, g4k].every((g) => !g.ok && motivo(g) === 'model_unavailable') && posts.length === antes.posts && base.de('jobs').length === antes.trabajos
    && saldo(D) === antes.saldo && cupoDeVideo(D) === antes.cupo && base.de('creditTransactions').length === antes.asientos, [gAlta, gMax, g4k].map(codigo).join(' / '));
  check('MD7) y nunca se desvía a otro modelo para poder ofrecerla: ningún POST ha salido con «Alta» ni «Máxima»', !posts.some((p) => p.input?.quality === 'high' || p.input?.quality === 'max'));
  const control = await pedir(D, 17, 'sh-0101', 'standard');
  check('MD8) CONTROL · la misma unidad en «Estándar» sí se genera, con Seedance 2.0 fast',
    control.g?.ok && control.g.valor.status === 'ACCEPTED' && posts.at(-1).modelo === SEEDANCE_MODEL_IDS.SEEDANCE_2_0_FAST, codigo(control.g ?? control.q));
}

/* ═══ QR · COTIZACIÓN, RESERVA, COBRO Y REEMBOLSO ═══════════════════════ */
console.log('\n── QR · Cotización = reserva; cobro y reembolso exactos; nunca de más, nunca dos veces ──');
{
  const liq = rt.liquidacionDeWee();
  const s0 = saldo(E);
  const ok = await pedir(E, 18);
  check('QR1) lo cotizado es exactamente lo reservado', uso(ok.rid)?.status === 'AUTHORIZED' && uso(ok.rid).amount === -ok.q.valor.credits && saldo(E) === s0 - ok.credits);
  termina(await tareaDe(E, ok.rid), 'succeeded', { usage: { completion_tokens: 1000 } });
  await pasada();
  check('QR2) salió bien: COMPLETED, cobrado EXACTAMENTE lo reservado, un asiento, ningún reembolso',
    uso(ok.rid).status === 'COMPLETED' && uso(ok.rid).finalAmount === ok.credits && saldo(E) === s0 - ok.credits
    && base.de('creditTransactions').filter((t) => t.requestId === ok.rid).length === 1, JSON.stringify(uso(ok.rid)));
  await pasada(); await pasada();
  const job = await trabajo(E, ok.rid);
  const reserva = rt.reservaDe(job);
  const reservaAntes = JSON.stringify(uso(ok.rid));
  const otraVez = await liq.liquidar({ userId: E, reserva, importe: reserva.importe, jobId: job.jobId });
  const devolverCobrada = await liq.reembolsar({ userId: E, reserva, motivo: 'fallo_definitivo', jobId: job.jobId });
  /* Liquidar lo ya cobrado contesta «liquidada» —el Credit Engine devuelve COMPLETED y no toca nada (lección de la ruta asíncrona)—: lo que se exige es que nada se mueva. */
  check('QR3) cobrar otra vez, o devolver lo ya cobrado: la reserva no cambia, no se mueve un Credit, ningún reembolso',
    ['liquidada', 'ya_estaba'].includes(otraVez.desenlace) && devolverCobrada.desenlace === 'ya_estaba' && JSON.stringify(uso(ok.rid)) === reservaAntes
    && saldo(E) === s0 - ok.credits && reembolsos(ok.rid).length === 0, `${otraVez.desenlace}/${devolverCobrada.desenlace}`);
  check('QR4) lo que se cobra es lo que el trabajo guarda de su reserva: ni un Credit más', reserva.importe === ok.credits);
  const s1 = saldo(E);
  const mas = await pedir(E, 19);
  const jobMas = await trabajo(E, mas.rid);
  const forzado = await liq.liquidar({ userId: E, reserva: rt.reservaDe(jobMas), importe: mas.credits + 500, jobId: jobMas.jobId });
  check('QR5) aunque algo pidiera cobrar de más, el Credit Engine cobra como mucho lo reservado',
    forzado.desenlace === 'liquidada' && uso(mas.rid).finalAmount === mas.credits && saldo(E) === s1 - mas.credits, JSON.stringify(uso(mas.rid)));
  const s2 = saldo(E);
  const fallo = await pedir(E, 20); termina(await tareaDe(E, fallo.rid), 'failed'); await pasada();
  const vence = await pedir(E, 21); termina(await tareaDe(E, vence.rid), 'expired'); await pasada();
  modo = 'http400'; const rechazo = await pedir(E, 22); modo = 'aceptar';
  const tres = [fallo, vence, rechazo];
  check('QR6) falló, venció o lo rechazó: REFUNDED, devuelto EXACTO una vez, y el saldo como estaba',
    tres.every((x) => uso(x.rid)?.status === 'REFUNDED' && reembolsos(x.rid).length === 1 && reembolsos(x.rid)[0].amount === x.credits) && saldo(E) === s2,
    tres.map((x) => `${uso(x.rid)?.status}/${reembolsos(x.rid).length}`).join(' '));
  await pasada(); await pasada();
  const jobF = await trabajo(E, fallo.rid);
  const otraDevolucion = await liq.reembolsar({ userId: E, reserva: rt.reservaDe(jobF), motivo: 'fallo_definitivo', jobId: jobF.jobId });
  const cobrarDevuelta = await liq.liquidar({ userId: E, reserva: rt.reservaDe(jobF), importe: fallo.credits, jobId: jobF.jobId });
  check('QR7) devolver otra vez, o cobrar lo devuelto: nada se mueve',
    otraDevolucion.desenlace === 'ya_estaba' && cobrarDevuelta.desenlace === 'ya_estaba' && reembolsos(fallo.rid).length === 1 && uso(fallo.rid).status === 'REFUNDED' && saldo(E) === s2,
    `${otraDevolucion.desenlace}/${cobrarDevuelta.desenlace}`);
  const todos = [ok, mas, fallo, vence, rechazo].map((x) => x.rid);
  const nunca = todos.filter((rid) => { const u = uso(rid); const devuelto = reembolsos(rid).reduce((s, t) => s + t.amount, 0); return (u.finalAmount ?? 0) > Math.abs(u.amount) || devuelto > Math.abs(u.amount); });
  check('QR8) en ninguna toma se cobró ni se devolvió más de lo reservado', nunca.length === 0, nunca.join(', '));
}

/* ═══ PA · EL VÍDEO EN SU PLANO ═════════════════════════════════════════ */
console.log('\n── PA · Solo una generación completada pone el vídeo en su plano, y nada lo pisa sin motivo ──');
{
  const k = 23;
  const nodo = toma.idDeNodoDePlano(F, pid(k), 'sh-0101');
  const t1 = await pedir(F, k);
  const enMarcha = await enlazar(F, k, t1.take);
  check('PA1) en marcha (waiting): not_ready, y el plano sin tocar', enMarcha.ok && enMarcha.valor.result.status === 'not_ready' && !base.leer(`shots/${nodo}`), JSON.stringify(enMarcha.valor?.result));
  termina(await tareaDe(F, t1.rid), 'failed'); await pasada();
  const fallida = await enlazar(F, k, t1.take);
  check('PA2) fallida: failed, y ningún producedAssetId', fallida.ok && fallida.valor.result.status === 'failed' && !base.leer(`shots/${nodo}`));
  const t2 = await pedir(F, k);
  termina(await tareaDe(F, t2.rid), 'succeeded', { usage: { completion_tokens: 1 } }); await pasada();
  const e2 = await enlazar(F, k, t2.take);
  const materiales = (rid) => base.de('assets').filter((a) => a.provenance?.traceId === rid);
  check('PA3) completada: su material —uno— puesto en el plano',
    e2.ok && e2.valor.result.status === 'linked' && base.leer(`shots/${nodo}`).producedAssetId === e2.valor.result.assetId && materiales(t2.rid).length === 1, JSON.stringify(e2.valor?.result));
  const version = base.leer(`shots/${nodo}`).version;
  await pasada(); await pasada();
  const repetido = await rt.atenderAviso(rt.atencionDeWee({ db: base }), leerAvisoDeSeedance(enModelArk.get(await tareaDe(F, t2.rid))));
  const otraVez = await enlazar(F, k, t2.take);
  check('PA4) repetir —más pasadas, el mismo aviso, el mismo enlace— no crea otro material ni cambia lo puesto',
    repetido.estado === 'repetido' && otraVez.valor.result.status === 'already' && base.leer(`shots/${nodo}`).version === version
    && materiales(t2.rid).length === 1 && base.leer(`shots/${nodo}`).producedAssetId === e2.valor.result.assetId, `${repetido.estado} · ${otraVez.valor?.result?.status}`);
  const t3 = await pedir(F, k);
  termina(await tareaDe(F, t3.rid), 'succeeded'); await pasada();
  const e3 = await enlazar(F, k, t3.take);
  check('PA5) una toma más nueva y completada sí lo sustituye —es «generar otra toma»—',
    e3.ok && e3.valor.result.status === 'linked' && base.leer(`shots/${nodo}`).producedAssetId === e3.valor.result.assetId && e3.valor.result.assetId !== e2.valor.result.assetId);
  const vieja = await enlazar(F, k, t2.take);
  check('PA6) y una más vieja ya no lo pisa: stale · take_superseded, y el plano sigue con la nueva',
    vieja.ok && vieja.valor.result.status === 'stale' && vieja.valor.result.motivo === 'take_superseded' && base.leer(`shots/${nodo}`).producedAssetId === e3.valor.result.assetId,
    JSON.stringify(vieja.valor?.result));
}

/* ═══ PV · QUÉ PLANO TIENE QUÉ VÍDEO ════════════════════════════════════ */
console.log('\n── PV · shot.videos: lo que cada plano tiene puesto, para su tarjeta ──');
{
  const nodo = base.leer(`shots/${toma.idDeNodoDePlano(F, pid(23), 'sh-0101')}`);
  const docsAntes = base.docs.size;
  const r = await videosDe(F, pid(23));
  check('PV1) de su producción: el plano con vídeo, con el material que tiene PUESTO, y solo ese',
    r.ok && JSON.stringify(r.valor.videos) === JSON.stringify([{ unitId: 'sh-0101', producedAssetId: nodo.producedAssetId, version: nodo.version }]), JSON.stringify(r.valor));
  const vacia = await videosDe(F, pid(24));
  check('PV2) una producción sin vídeos: ninguno', vacia.ok && vacia.valor.videos.length === 0);
  const ajena = await videosDe(B, pid(23));
  const noExiste = await videosDe(F, `prodpc${'9'.repeat(18)}`);
  const sinForma = await videosDe(F, '../x');
  check('PV3) la de otra cuenta, la que no existe y la que no tiene forma contestan igual: ninguno',
    [ajena, noExiste, sinForma].every((x) => x.ok && x.valor.videos.length === 0));
  const sinProduccion = await videosDe(F, undefined);
  check('PV4) sin producción: invalid-argument', !sinProduccion.ok && sinProduccion.error.code === 'invalid-argument');
  check('PV5) y preguntar no escribe nada', base.docs.size === docsAntes);
}

/* ═══ GU · LO QUE NO SE PUEDE MOVER SIN QUE SE VEA ═════════════════════ */
console.log('\n── GU · Las guardas de esta fase ──');
{
  check('GU1) los modelos validados para una toma: Seedance 2.0 fast, y solo ese',
    /MODELOS_VALIDADOS_PARA_TOMAS: ReadonlySet<string> = new Set\(\[SEEDANCE_MODEL_IDS\.SEEDANCE_2_0_FAST\]\)/.test(leer('functions/src/creator/video.ts')));
  check('GU2) la clasificación no sabe de proveedores', !/seedance|modelark|gemini|bytedance|byteplus/i.test(sinComentarios(leer('functions/src/creator/fallos.ts'))));
  check('GU3) el cierre del Core ya no cae a 0: ni `?? 0` ni `|| 0` en el coste del proveedor',
    !/providerCost: [^,\n]*(\?\?|\|\|) 0/.test(sinComentarios(leer('functions/src/runtime/index.ts'))));
  check('GU4) el Credit Engine y el Financial Core, sin tocar', git(`diff --name-only ${CREDITS} -- functions/src/credits functions/src/core/financial functions/src/core/router.ts`).trim() === '');
  check('GU5) esta suite está en la cadena de `npm test`', /f1d-postcanary\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ F1-D tras el canary real (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
