/**
 * FILMMAKER ENGINE · FASE 8 (F5 DEL ROADMAP, SEGUNDA PARTE) — EL RENDER FINAL, DE VERDAD.
 *
 *   R · el pedido: la puerta cerrada por defecto, el manifiesto del servidor, los
 *       topes, el cupo del día, un trabajo del Job Engine y su registro;
 *   E · el render: el trabajador de siempre con el ejecutor nuevo, FFmpeg DE VERDAD
 *       sobre vídeos de verdad, y el material `asset_` con sus planos como origen;
 *   C · converger: el objeto sin ficha, el trabajador que murió antes y después de
 *       guardar, dos pasadas a la vez;
 *   S · seguridad: el paquete tocado, un plano de otra cuenta, y los trabajos de IA,
 *       que la pasada no toca;
 *   G · las guardas: ni Credits, ni proveedores, ni shell, ni `.run(`.
 *
 * De verdad: la puerta `renders`, el Job Engine, su almacén, el trabajador
 * (`atenderEntrega`), la cola de invocación, el ejecutor del render, FFmpeg
 * (`ffmpeg-static`), el Content Core, productions, F1-A, la cadena de F1-D y el
 * limitador diario, sobre un Firestore en memoria (el arnés de
 * `f1d-postcanary.test.mjs`, copiado tal cual). De mentira: el adaptador de
 * Seedance, lo que ModelArk contesta y el almacén de objetos —que guarda, en
 * memoria, los bytes de vídeos mp4 de verdad generados aquí mismo con FFmpeg—.
 * Nada sale a la red, y no se usa ninguna credencial.
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

/* ═══ FASE 8 · lo que se prueba aquí ═══════════════════════════════════════ */
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const R = lib('creator/render.js');
const RZ = lib('creator/renderizador.js');
const RS = lib('creator/renders.js');
const comp = lib('creator/composicion.js');
const jobIdx = lib('job/index.js');
const almacen = lib('runtime/almacen.js');
const core = lib('core/index.js');
const { TOCADOS_POR_EL_MOTOR, DINERO } = await import('./motor-filmmaker-alcance.mjs');
const FFMPEG = require('ffmpeg-static');

/* ═══ Vídeos de verdad, hechos aquí con FFmpeg ═══════════════════════════ */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fase8-'));
const TMP_RENDER = fs.mkdtempSync(path.join(os.tmpdir(), 'fase8-render-'));
const generarClip = (nombre, { seg = 4, w = 1280, h = 720, sonido = false } = {}) => {
  const salida = path.join(TMP, nombre);
  const args = ['-hide_banner', '-nostdin', '-y', '-f', 'lavfi', '-i', `testsrc2=size=${w}x${h}:rate=24:duration=${seg}`];
  if (sonido) args.push('-f', 'lavfi', '-i', `sine=frequency=440:duration=${seg}`);
  args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', ...(sonido ? ['-c:a', 'aac', '-shortest'] : ['-an']), salida);
  const r = spawnSync(FFMPEG, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`no se generó ${nombre}`);
  return fs.readFileSync(salida);
};
const CLIP_MUDO = generarClip('mudo.mp4');
const CLIP_SONIDO = generarClip('sonido.mp4', { sonido: true });
const CLIP_VERTICAL = generarClip('vertical.mp4', { w: 720, h: 1280, sonido: true });
const sondaDe = (bytes) => {
  const f = path.join(TMP, `sonda-${Math.random().toString(16).slice(2)}.mp4`);
  fs.writeFileSync(f, bytes);
  const s = RZ.leerSonda(spawnSync(FFMPEG, ['-hide_banner', '-nostdin', '-i', f], { encoding: 'utf8' }).stderr);
  fs.rmSync(f, { force: true });
  return s;
};

/* Lo que «devuelve ModelArk» para cada tarea: un mp4 de verdad, el que se elija. */
const clipDeLaTarea = new Map();
http.fetchBytes = async (url) => {
  descargas++;
  const tarea = /\/([^/]+)\.mp4$/.exec(url)?.[1];
  return { buffer: clipDeLaTarea.get(tarea) ?? CLIP_MUDO, contentType: 'video/mp4' };
};

/* El almacén de objetos de mentira sabe además bajar a disco y subir desde disco, con la misma precondición. */
const archivoDelArnes = cubo.file;
let bajadas = 0;
cubo.file = (ruta) => ({
  ...archivoDelArnes(ruta),
  async download({ destination }) {
    const o = objetos.get(ruta);
    if (!o) throw Object.assign(new Error('no existe'), { code: 404 });
    bajadas++;
    fs.writeFileSync(destination, o.bytes);
  },
});
cubo.upload = async (origen, { destination, metadata, preconditionOpts }) => {
  if (preconditionOpts?.ifGenerationMatch === 0 && objetos.has(destination)) throw Object.assign(new Error('precondición'), { code: 412 });
  objetos.set(destination, { bytes: fs.readFileSync(origen), contentType: metadata?.contentType, metadata: { ...(metadata?.metadata ?? {}) } });
};

/* ═══ Producciones listas para montar, por la cadena entera de F1-D ═════════ */
const escena = (shots) => clon({
  ...M.produccionVacia({ title: 'El faro', aspectRatio: '16:9', resolution: '720p' }),
  intent: { objective: 'Un faro al amanecer' },
  scenes: [{ id: 'sc-0001', order: 0, title: 'Amanecer', description: 'El sol sale detrás del faro', shots }],
});
const TRES = [
  { id: 'sh-0101', order: 0, durationSec: 4, description: 'Una farera sube la escalera del faro', visual: { creative: { version: 1, transition: { type: 'dissolve' } } } },
  { id: 'sh-0102', order: 1, durationSec: 4, description: 'La lámpara se enciende', audio: { withSound: true } },
  { id: 'sh-0103', order: 2, durationSec: 4, description: 'El mar entero al amanecer' },
];
const UNO = [{ id: 'sh-0101', order: 0, durationSec: 4, description: 'La lámpara del faro gira' }];
/** Crea la producción, genera cada plano con el vídeo que se diga, lo cierra y lo enlaza. Devuelve la revisión. */
const lista = async (uid, k, shots, clips) => {
  await crear(uid, k, escena(shots));
  for (const s of shots) {
    const p = await pedir(uid, k, s.id);
    if (!p.rid) throw new Error(`no se pidió el plano ${s.id} de ${k}: ${codigo(p.q)} ${codigo(p.g)}`);
    const tarea = await tareaDe(uid, p.rid);
    clipDeLaTarea.set(tarea, clips[s.id] ?? CLIP_MUDO);
    termina(tarea, 'succeeded');
  }
  await pasada();
  for (const s of shots) {
    const e = await enlazar(uid, k, 1, s.id);
    if (!e.ok) throw new Error(`no se enlazó ${s.id} de ${k}: ${codigo(e)}`);
  }
  return (await producciones.leerProduccion(uid, pid(k), { db: base })).view.revision;
};
const montajeDe = async (uid, k, revision) => {
  const r = await shotsPuerta.shots.run({ auth: { uid }, data: { op: 'shot.montage', productionId: pid(k), revision } });
  return r.montage.ready ? r.montage.manifest : null;
};

/* Las puertas y el trabajador. */
const puerta = (uid, data) => intento(() => RS.renders.run({ auth: { uid }, data }));
const renderizar = (uid, k, revision) => puerta(uid, { op: 'render.request', productionId: pid(k), revision });
const estadoDe = (uid, k, montage) => puerta(uid, { op: 'render.status', productionId: pid(k), montage });
/* Cuántas veces se montó de verdad (las sondas no cuentan) y con qué argumentos. */
let montajes = 0;
const lanzarContando = (lanzar) => (argv) => { if (argv.includes('-filter_complex')) montajes++; return lanzar(argv); };
const LANZAR = lanzarContando(RZ.lanzarFfmpegDeWee(FFMPEG));
const ejecutorDePrueba = (extra = {}) => RZ.crearEjecutorDeRender({ lanzar: LANZAR, temporal: TMP_RENDER, ...extra });
const trabajar = (extra = {}) => RS.pasadaDeRender({ db: base, presupuestoMs: 25 * 60_000, ejecutor: ejecutorDePrueba(extra.ejecutor ?? {}), ...(extra.ahora ? { ahora: extra.ahora } : {}) });
const store = almacen.almacenDeTrabajos(base);
const trabajoDe = (uid, requestId) => R.trabajoDelRender(base, uid, requestId);
const cupoDelRender = (uid) => base.de('aiRateLimits').filter((d) => d.userId === uid).reduce((s, d) => s + Number(d.render || 0), 0);
const abrir = (cuentas) => base.docs.set('aiSettings/render', { habilitado: true, cuentas });

/* ═══ R · EL PEDIDO ══════════════════════════════════════════════════════ */
console.log('\n── R · Pedir el render: la puerta, el manifiesto del servidor, el cupo, el trabajo y el registro ──');
const rev1 = await lista(A, 1, TRES, { 'sh-0101': CLIP_MUDO, 'sh-0102': CLIP_SONIDO, 'sh-0103': CLIP_VERTICAL });
const m1 = await montajeDe(A, 1, rev1);
let v1;
{
  const cerrada = await renderizar(A, 1, rev1);
  check('R1) sin `aiSettings/render`, la puerta está cerrada: no se pide nada, no se lee la producción, no se gasta cupo',
    cerrada.ok && cerrada.valor.refused?.reason === 'render_not_enabled' && cupoDelRender(A) === 0 && base.de('jobs').length === base.de('jobs').filter((j) => j.task !== 'media.render').length, JSON.stringify(cerrada.valor ?? codigo(cerrada)));
  base.docs.set('aiSettings/render', { habilitado: true });
  const sinCuentas = await renderizar(A, 1, rev1);
  abrir([B]);
  const deOtra = await renderizar(A, 1, rev1);
  check('R2) habilitada sin cuentas NO abre para todas; abierta para otra cuenta, tampoco para esta',
    sinCuentas.valor?.refused?.reason === 'render_not_enabled' && deOtra.valor?.refused?.reason === 'render_not_enabled');
  check('R2b) y la puerta se lee así: cerrada, por cuenta, o para todas si se escribe',
    !R.puertaAbiertaPara(R.PUERTA_CERRADA, A) && R.puertaAbiertaPara({ habilitado: true, todas: false, cuentas: [A] }, A)
    && !R.puertaAbiertaPara({ habilitado: true, todas: false, cuentas: [] }, A) && R.puertaAbiertaPara({ habilitado: true, todas: true, cuentas: [] }, A)
    && !R.puertaAbiertaPara({ habilitado: false, todas: true, cuentas: [A] }, A));
  abrir([A, B, C, D, E, F]);
  await crear(A, 2, escena(TRES));
  const rev2 = (await producciones.leerProduccion(A, pid(2), { db: base })).view.revision;
  const sinVideos = await renderizar(A, 2, rev2);
  check('R3) sin vídeos en los planos no se monta: se dice cuáles faltan, y ni trabajo ni cupo',
    sinVideos.valor?.refused?.reason === 'not_ready' && JSON.stringify(sinVideos.valor.refused.missing) === JSON.stringify(['sh-0101', 'sh-0102', 'sh-0103']) && cupoDelRender(A) === 0);
  const saldoAntes = saldo(A);
  const pedido = await renderizar(A, 1, rev1);
  v1 = pedido.valor?.render;
  const rid1 = v1?.requestId;
  const j1 = rid1 ? await trabajoDe(A, rid1) : undefined;
  check('R4) listo: el render queda EN COLA, pedido por el servidor con el manifiesto de la Fase 7 (su huella, su revisión, su formato)',
    pedido.ok && pedido.valor.created === true && v1.state === 'queued' && /^fmr\.[0-9a-f]{32}\.1$/.test(rid1) && v1.huella === m1.huella && v1.revision === rev1
    && v1.durationSec === 11.5 && v1.shots === 3 && JSON.stringify(v1.format) === JSON.stringify({ aspectRatio: '16:9', resolution: '720p', width: 1280, height: 720, fps: 24, audio: true })
    && v1.assetId === undefined, JSON.stringify(pedido.valor ?? codigo(pedido)));
  check('R5) y es un trabajo del Job Engine: tarea general `media.render`, sin capacidad, sin proveedor, de esta cuenta y con la política del render',
    !!j1 && j1.task?.name === 'media.render' && j1.capability === undefined && j1.implementation === undefined && j1.owner.userId === A && j1.state === 'queued'
    && JSON.stringify(j1.policy) === JSON.stringify(R.POLITICA_DEL_RENDER) && j1.trace.requestId === rid1 && j1.idempotency.key === rid1);
  check('R6) su paquete lleva referencias y el manifiesto, nunca bytes ni una URL; y se lee de vuelta, identidad y huella incluidas',
    j1.input.version === 'fm-render-1' && j1.input.assetId === R.materialDelRender(rid1) && j1.input.manifiesto.huella === m1.huella
    && !/https?:|users\/|token/i.test(JSON.stringify(j1.input)) && R.leerPaqueteDeRender(j1.input, A).ok && !R.leerPaqueteDeRender(j1.input, B).ok);
  const reg = base.leer(`productions/${pid(1)}/productionRenders/${m1.huella}`);
  check('R7) y su registro, en la producción: montaje, revisión, serie, trabajo y material —sin estado, que sale del trabajo—',
    !!reg && reg.ownerAccountId === A && reg.productionId === pid(1) && reg.revision === rev1 && reg.huella === m1.huella && reg.serie === 1
    && reg.requestId === rid1 && reg.jobId === j1.jobId && reg.assetId === R.materialDelRender(rid1) && reg.state === undefined && reg.status === undefined);
  check('R8) cuenta UNO en el cupo del día —en el limitador de siempre, con su propia clave—', cupoDelRender(A) === 1);
  const otraVez = await renderizar(A, 1, rev1);
  check('R9) pedirlo otra vez es el MISMO render: ni otro trabajo, ni otro cupo',
    otraVez.ok && otraVez.valor.created === false && otraVez.valor.render.requestId === rid1 && cupoDelRender(A) === 1
    && base.de('jobs').filter((d) => d.task === 'media.render').length === 1);
  check('R10) y no toca el dinero: ni una transacción de Credits, ni un céntimo del saldo',
    saldo(A) === saldoAntes && !base.de('creditTransactions').some((t) => String(t.requestId ?? '').startsWith('fmr.')));
  const ajeno = await renderizar(B, 1, rev1);
  const viejo = await renderizar(A, 1, rev1 + 1);
  const sinForma = await puerta(A, { op: 'render.request', productionId: pid(1), revision: 'la última' });
  check('R11) de otra cuenta no hay producción; en otra revisión, cambió; sin forma, ni se mira',
    ajeno.valor?.refused?.reason === 'production_not_found' && viejo.valor?.refused?.reason === 'production_changed' && !sinForma.ok && sinForma.error?.code === 'invalid-argument');
  const lim = (x) => R.fueraDeLosLimites({ ...m1, ...x });
  check('R12) los topes: 4K no se monta (ningún plano llega), ni más de 60 planos, ni más de diez minutos',
    lim({ salida: { ...m1.salida, resolution: '4k' } }) === 'resolution_not_supported' && lim({ clips: Array.from({ length: 61 }, () => m1.clips[0]) }) === 'too_many_shots'
    && lim({ duracionSec: 600.001 }) === 'too_long' && lim({}) === undefined);
}

/* ═══ E · EL RENDER ══════════════════════════════════════════════════════ */
console.log('\n── E · Montar: el trabajador de siempre, el ejecutor nuevo, FFmpeg de verdad ──');
{
  /* Un milisegundo menos que un intento: con el justo, una búsqueda de menos de un milisegundo lo dejaría caber. */
  const justa = await RS.pasadaDeRender({ db: base, presupuestoMs: R.POLITICA_DEL_RENDER.attemptTimeoutMs - 1, ejecutor: ejecutorDePrueba() });
  check('E0) una pasada a la que no le cabe un intento entero no empieza ninguno: lo deja en la cola para la siguiente',
    justa.encolados === 1 && justa.atendidos === 0 && (await trabajoDe(A, v1.requestId)).state === 'queued' && montajes === 0, JSON.stringify(justa));
  const antes = montajes;
  const informe = await trabajar();
  const j = await trabajoDe(A, v1.requestId);
  const asset = await contenido.leerMaterial(R.materialDelRender(v1.requestId));
  check('E1) una pasada: el trabajo se reclama, se monta UNA vez y termina completado en un intento',
    informe.deRender === 1 && informe.encolados === 1 && informe.atendidos === 1 && informe.completados === 1 && montajes === antes + 1
    && j.state === 'completed' && j.attempts.length === 1 && j.result?.outputRefs?.[0] === asset?.assetId, JSON.stringify(informe));
  check('E2) el material: `asset_` calculado, de la cuenta, vídeo listo, mp4, con su cuadro y su duración',
    !!asset && asset.assetId === R.materialDelRender(v1.requestId) && asset.ownerAccountId === A && asset.kind === 'video' && asset.status === 'ready'
    && asset.mimeType === 'video/mp4' && asset.width === 1280 && asset.height === 720 && Math.abs(asset.durationSec - 11.5) <= RZ.TOLERANCIA_DE_DURACION_SEC);
  check('E3) su procedencia: el trabajo, la petición y los TRES planos de los que salió —un derivado, no una subida—',
    asset.provenance.jobId === j.jobId && asset.provenance.requestId === v1.requestId && JSON.stringify([...(asset.provenance.sourceAssetIds ?? [])].sort()) === JSON.stringify([...new Set(m1.clips.map((c) => c.assetId))].sort())
    && asset.provenance.capability === undefined && asset.provenance.provider === undefined && core.origenDe(asset) === 'derivado');
  check('E4) y su asociación con la producción: su id, su revisión y la huella del montaje',
    asset.metadata?.productionId === pid(1) && asset.metadata?.revision === rev1 && asset.metadata?.montage === m1.huella && asset.metadata?.experienceId === 'studio');
  const ruta = `users/${A}/ai-generations/${asset.assetId}.mp4`;
  const objeto = objetos.get(ruta);
  check('E5) el objeto, en la carpeta de la cuenta, con la marca de ESE material',
    !!objeto && objeto.contentType === 'video/mp4' && objeto.metadata.weeMaterial === asset.assetId && !!objeto.metadata.firebaseStorageDownloadTokens);
  const visto = sondaDe(objeto.bytes);
  check('E6) y es un montaje de verdad: 11,5 s (12 menos el fundido), 1280×720 aunque un plano sea vertical, h264 y con sonido',
    visto.video === 'h264' && visto.ancho === 1280 && visto.alto === 720 && Math.abs(visto.duracionSec - 11.5) <= 0.1 && visto.conSonido === true, JSON.stringify(visto));
  const est = await estadoDe(A, 1, m1.huella);
  const lst = await puerta(A, { op: 'render.list', productionId: pid(1) });
  check('E7) quien lo pidió lo ve hecho, con su material; y en la lista de la producción',
    est.ok && est.valor.render.state === 'completed' && est.valor.render.assetId === asset.assetId && lst.ok && lst.valor.renders.length === 1 && lst.valor.renders[0].state === 'completed');
  const ajeno = await estadoDe(B, 1, m1.huella);
  const ajenaLista = await puerta(B, { op: 'render.list', productionId: pid(1) });
  check('E8) otra cuenta no ve nada: ni el estado, ni la lista', ajeno.ok && ajeno.valor.render === null && ajenaLista.ok && ajenaLista.valor.renders.length === 0);
  const otraVez = await renderizar(A, 1, rev1);
  const montadoAntes = montajes;
  await trabajar();
  check('E9) pedirlo hecho devuelve el hecho: sin trabajo nuevo, sin cupo y sin volver a montar',
    otraVez.valor?.render?.state === 'completed' && otraVez.valor.created === false && otraVez.valor.render.assetId === asset.assetId && cupoDelRender(A) === 1 && montajes === montadoAntes);
  check('E10) la carpeta temporal se limpia', fs.readdirSync(TMP_RENDER).length === 0, fs.readdirSync(TMP_RENDER).join(','));
  /* Un plano que pidió sonido y cuyo vídeo no trae pista: se monta con silencio, no se para. */
  const rev3 = await lista(A, 3, TRES, { 'sh-0102': CLIP_MUDO });
  const m3 = await montajeDe(A, 3, rev3);
  const p3 = await renderizar(A, 3, rev3);
  await trabajar();
  const a3 = await contenido.leerMaterial(R.materialDelRender(p3.valor.render.requestId));
  const v3 = a3 ? sondaDe(objetos.get(`users/${A}/ai-generations/${a3.assetId}.mp4`).bytes) : {};
  check('E11) un plano con sonido pedido y sin pista en su vídeo: silencio, con la pista de sonido que dice el manifiesto',
    m3.salida.audio === 'aac' && m3.clips[1].conSonido === true && a3?.status === 'ready' && v3.conSonido === true && Math.abs(v3.duracionSec - 11.5) <= 0.1, JSON.stringify(v3));
}

/* ═══ C · CONVERGER ══════════════════════════════════════════════════════ */
console.log('\n── C · Lo que se queda a medias se termina, sin montar dos veces ──');
const reclamarComoMuerto = async (requestId, uid, at) => {
  const { motor } = jobIdx.crearMotorDeTrabajosDeWee(R.POLITICA_DEL_RENDER);
  let job = await trabajoDe(uid, requestId);
  const principal = { userId: uid, appId: 'studio' };
  const rec = motor.reclamar(job, { principal, at, worker: 'muerto' });
  job = (await store.aplicar(rec.transition)).job;
  const mar = motor.marcarEnvio(job, { principal, at, worker: 'muerto', attemptId: rec.dispatch.attemptId });
  job = (await store.aplicar(mar.transition)).job;
  return { job, dispatch: rec.dispatch };
};
{
  /* C1 · Guardó el objeto y no llegó a crear la ficha: el siguiente intento lo ADOPTA. */
  const rev = await lista(C, 9, UNO, { 'sh-0101': CLIP_SONIDO });
  const p = await renderizar(C, 9, rev);
  const rid = p.valor.render.requestId;
  let falla = true;
  const crearMaterial = async (d) => { if (falla) { falla = false; return null; } return contenido.crearMaterialDesdeUrl(d); };
  const antes = montajes;
  const primera = await trabajar({ ejecutor: { crearMaterial } });
  const tras1 = await trabajoDe(C, rid);
  const ruta = `users/${C}/ai-generations/${R.materialDelRender(rid)}.mp4`;
  check('C1) el objeto se guardó y la ficha falló: el intento falla con su motivo, queda el objeto, y el trabajo vuelve a la cola',
    primera.atendidos === 1 && tras1.state === 'queued' && tras1.attempts.length === 1 && tras1.attempts[0].error?.details?.reason === 'material_not_created'
    && objetos.has(ruta) && !(await contenido.leerMaterial(R.materialDelRender(rid))), `${tras1.state} ${tras1.attempts[0]?.error?.details?.reason}`);
  const segunda = await trabajar({ ejecutor: { crearMaterial }, ahora: () => Date.now() + 40_000 });
  const tras2 = await trabajoDe(C, rid);
  const a = await contenido.leerMaterial(R.materialDelRender(rid));
  check('C2) el segundo intento ADOPTA el objeto: ficha creada, trabajo completado, y FFmpeg montó UNA sola vez',
    segunda.completados === 1 && tras2.state === 'completed' && tras2.attempts.length === 2 && a?.status === 'ready' && montajes === antes + 1, JSON.stringify(segunda));

  /* C3 · El trabajador murió montando, sin dejar nada: se espera, se da por perdido y se repite. */
  const revD = await lista(D, 16, UNO, { 'sh-0101': CLIP_MUDO });
  const pD = await renderizar(D, 16, revD);
  const ridD = pD.valor.render.requestId;
  const t0 = Date.now();
  await reclamarComoMuerto(ridD, D, t0);
  const antesD = montajes;
  const p1 = await trabajar({ ahora: () => t0 + 90_000 });
  const e1 = await trabajoDe(D, ridD);
  check('C3) la concesión caducó: el Job Engine lo deja esperando —salió y no se sabe—, y sin material todavía no se da por perdido',
    p1.recuperados === 1 && e1.state === 'waiting' && e1.attempts[0].outcome === 'unknown' && montajes === antesD, `${e1.state}`);
  const vistaEspera = await estadoDe(D, 16, pD.valor.render.huella);
  check('C4) mientras tanto, quien lo pidió lo ve «reconciliando»', vistaEspera.valor?.render?.state === 'reconciling');
  const p2 = await trabajar({ ahora: () => t0 + 90_000 + RS.GRACIA_DE_UN_INTENTO_PERDIDO_MS + 5_000 });
  const e2 = await trabajoDe(D, ridD);
  check('C5) pasada la gracia y sin material: ese intento se da por perdido y el Job Engine decide el siguiente',
    p2.reconciliados === 1 && e2.attempts[0].outcome === 'failed' && e2.attempts[0].error?.details?.reason === 'render_lost' && e2.state === 'queued', `${e2.state}`);
  const p3 = await trabajar({ ahora: () => t0 + 90_000 + RS.GRACIA_DE_UN_INTENTO_PERDIDO_MS + 60_000 });
  const e3 = await trabajoDe(D, ridD);
  check('C6) y el segundo intento lo monta y lo termina', p3.completados === 1 && e3.state === 'completed' && e3.attempts.length === 2 && montajes === antesD + 1);

  /* C7 · Murió DESPUÉS de guardar y fichar, antes de contarlo: el material manda y no se vuelve a montar. */
  const revE = await lista(D, 17, UNO, { 'sh-0101': CLIP_SONIDO });
  const pE = await renderizar(D, 17, revE);
  const ridE = pE.valor.render.requestId;
  const t1 = Date.now();
  const { dispatch } = await reclamarComoMuerto(ridE, D, t1);
  const informeHuerfano = await ejecutorDePrueba().ejecutar(dispatch, { renovar: async () => true });
  const antesE = montajes;
  const q1 = await trabajar({ ahora: () => t1 + 90_000 });
  const f1 = await trabajoDe(D, ridE);
  check('C7) murió tras guardar y fichar: el material está, así que el render está hecho —por el mismo camino que un aviso—, sin volver a montar',
    informeHuerfano.outcome === 'succeeded' && q1.reconciliados === 1 && f1.state === 'completed' && f1.result?.outputRefs?.[0] === R.materialDelRender(ridE) && montajes === antesE, `${f1.state}`);

  /* C8 · Dos pasadas a la vez sobre el mismo trabajo: una lo monta, la otra lo pierde en el compare-and-set. */
  const revF = await lista(C, 10, UNO, { 'sh-0101': CLIP_MUDO });
  const pF = await renderizar(C, 10, revF);
  const antesF = montajes;
  const [x, y] = await Promise.all([trabajar(), trabajar()]);
  const fF = await trabajoDe(C, pF.valor.render.requestId);
  check('C8) dos trabajadores a la vez: UN montaje, UN intento, UN material',
    montajes === antesF + 1 && fF.state === 'completed' && fF.attempts.length === 1 && x.completados + y.completados === 1, `${montajes - antesF} ${x.completados}+${y.completados}`);
}

/* ═══ S · SEGURIDAD ══════════════════════════════════════════════════════ */
console.log('\n── S · Lo que no se monta: el paquete tocado, lo ajeno, y lo que no es un render ──');
{
  /* S1 · El paquete guardado se toca: la huella ya no cuadra y no se monta nada. */
  const rev = await lista(E, 18, UNO, { 'sh-0101': CLIP_MUDO });
  const p = await renderizar(E, 18, rev);
  const rid = p.valor.render.requestId;
  const job = await trabajoDe(E, rid);
  const [ruta, doc] = [...base.docs.entries()].find(([k, d]) => k.startsWith('jobs/') && d.jobId === job.jobId);
  const tocado = JSON.parse(doc.json);
  tocado.input.manifiesto.clips[0].duracionSec = 3;
  base.docs.set(ruta, { ...doc, json: JSON.stringify(tocado) });
  const antes = montajes;
  await trabajar();
  const j = await trabajoDe(E, rid);
  check('S1) un paquete tocado —la huella no cuadra— no se monta: falla sin reintento y sin material',
    j.state === 'failed' && j.error?.details?.reason === 'package_manifest' && montajes === antes && !(await contenido.leerMaterial(R.materialDelRender(rid))), `${j.state} ${j.error?.details?.reason}`);

  /* S2 · Un paquete bien formado que apunta al vídeo de OTRA cuenta: se niega sin bajarlo. */
  const ajenoId = m1.clips[0].assetId;
  const clips = [{ unitId: 'sh-0101', sceneId: 'sc-0001', assetId: ajenoId, inicioSec: 0, finSec: 4, duracionSec: 4, conSonido: false }];
  const sinHuella = { version: 'fm-montaje-1', productionId: pid(19), revision: 1, salida: { ...m1.salida, audio: 'none' }, clips, duracionSec: 4, duracionDeLaLineaDeTiempoSec: 4 };
  const falso = { ...sinHuella, huella: comp.huellaDelManifiesto(sinHuella) };
  const ridFalso = R.requestIdDeRender(E, pid(19), falso.huella, 1);
  const { motor } = jobIdx.crearMotorDeTrabajosDeWee(R.POLITICA_DEL_RENDER);
  await jobIdx.crearTrabajo(store, motor, {
    contract: core.JOB_ENGINE_CONTRACT_VERSION, principal: { userId: E }, at: Date.now(), task: { name: 'media.render' },
    input: R.paqueteDeRender(E, ridFalso, falso), trace: { traceId: 'render-falso', requestId: ridFalso, userId: E }, idempotencyKey: ridFalso, policy: R.POLITICA_DEL_RENDER,
  });
  const bajadasAntes = bajadas;
  await trabajar();
  const jf = await trabajoDe(E, ridFalso);
  check('S2) un plano de otra cuenta no se baja ni se monta: `clip_not_available`, sin material',
    jf.state === 'failed' && jf.error?.details?.reason === 'clip_not_available' && bajadas === bajadasAntes && !(await contenido.leerMaterial(R.materialDelRender(ridFalso))), `${jf.state} ${jf.error?.details?.reason}`);

  /* S3 · Un paquete de esta cuenta metido en el trabajo de otra: la identidad no cuadra. */
  const ridOtro = R.requestIdDeRender(F, pid(19), falso.huella, 1);
  await jobIdx.crearTrabajo(store, motor, {
    contract: core.JOB_ENGINE_CONTRACT_VERSION, principal: { userId: F }, at: Date.now(), task: { name: 'media.render' },
    input: R.paqueteDeRender(E, ridFalso, falso), trace: { traceId: 'render-otro', requestId: ridOtro, userId: F }, idempotencyKey: ridOtro, policy: R.POLITICA_DEL_RENDER,
  });
  await trabajar();
  const jo = await trabajoDe(F, ridOtro);
  check('S3) el paquete de una cuenta en el trabajo de otra: `package_identity`, nada se monta', jo.state === 'failed' && jo.error?.details?.reason === 'package_identity', `${jo.state} ${jo.error?.details?.reason}`);
  /* Y al revés: la petición y el material, bien calculados para la dueña, pero el paquete diciendo que es de otra cuenta. */
  const deF = R.paqueteDeRender(F, ridOtro, falso);
  const mentiroso = R.leerPaqueteDeRender({ ...deF, accountId: E }, F);
  check('S3b) un paquete con la petición de la dueña y la cuenta de otra: tampoco —la cuenta del paquete ES la dueña, o no hay paquete—',
    R.leerPaqueteDeRender(deF, F).ok && !mentiroso.ok && mentiroso.motivo === 'identity');

  /* S4 · Un vídeo de IA sin terminar comparte almacén: la pasada del render no lo toca. */
  await crear(E, 20, escena(UNO));
  const pv = await pedir(E, 20, 'sh-0101');
  const ia = await trabajo(E, pv.rid);
  const [rutaIa, docIa] = [...base.docs.entries()].find(([k, d]) => k.startsWith('jobs/') && d.jobId === ia.jobId);
  const antesIa = JSON.stringify(docIa);
  const pasadaIa = await trabajar({ ahora: () => Date.now() + 3 * 60 * 60_000 });
  check('S4) un trabajo de vídeo de IA sin terminar, incluso vencido: la pasada lo ve y NO lo toca —es del conductor—',
    ia.capability === 'video.generate' && !ia.task && JSON.stringify(base.docs.get(rutaIa)) === antesIa && pasadaIa.mirados > pasadaIa.deRender);
  check('S5) el ejecutor tampoco ejecuta nada que no sea un render',
    (await ejecutorDePrueba().ejecutar({ jobId: 'j', attemptId: 'a', attempt: 1, capability: 'video.generate', implementation: { providerId: 'seedance', modelId: 'm' }, input: {}, trace: { traceId: 't', requestId: 'rrrr', userId: E }, mode: 'sync', idempotencyKey: 'k', timeoutMs: 1000, deadlineAt: Date.now() + 1000 }, { renovar: async () => true })).error?.details?.reason === 'not_a_render');
}

/* ═══ L · EL CUPO ════════════════════════════════════════════════════════ */
console.log('\n── L · Gratis, con cinco al día por cuenta ──');
{
  const rev = await lista(F, 23, UNO, { 'sh-0101': CLIP_MUDO });
  base.docs.set(`aiRateLimits/${F}_${new Date().toISOString().slice(0, 10)}`, { userId: F, render: 5 });
  const sexto = await renderizar(F, 23, rev);
  check('L1) el sexto render del día se niega con su motivo y su tope, sin trabajo',
    sexto.valor?.refused?.reason === 'daily_limit' && sexto.valor.refused.limit === 5 && !base.leer(`productions/${pid(23)}/productionRenders/${(await montajeDe(F, 23, rev)).huella}`), JSON.stringify(sexto.valor ?? codigo(sexto)));
  check('L2) el tope es el de la decisión del usuario, y un render no cobra Credits por ningún camino',
    R.LIMITES_DEL_RENDER.maxPorDia === 5 && R.CUPO_DEL_RENDER.perUserPerDay.render === 5 && R.CLAVE_DEL_CUPO === 'render');
}

/* ═══ X · EL EJECUTOR, CAMINO A CAMINO ═══════════════════════════════════ */
console.log('\n── X · El ejecutor ante lo que el render de verdad no enseña ──');
{
  /* Un paquete de verdad —el de un render pedido y sin ejecutar— y un despacho armado como lo arma el Job Engine. */
  const rev = await lista(C, 11, UNO, { 'sh-0101': CLIP_SONIDO });
  const p = await renderizar(C, 11, rev);
  const job = await trabajoDe(C, p.valor.render.requestId);
  const despacho = (extra = {}) => ({
    jobId: job.jobId, attemptId: `${job.jobId}:x`, attempt: 1, task: { name: 'media.render' }, input: job.input, trace: job.trace,
    mode: 'async', idempotencyKey: 'k', timeoutMs: 20 * 60_000, deadlineAt: Date.now() + 60 * 60_000, ...extra,
  });
  const real = RZ.lanzarFfmpegDeWee(FFMPEG);
  /* FFmpeg de mentira SOLO para montar; las sondas son las de verdad. */
  const conMontaje = (montar) => (argv) => (argv.includes('-filter_complex') ? montar(argv) : real(argv));
  const colgado = () => { let matar; const terminado = new Promise((r) => { matar = () => r({ codigo: null, stderr: '' }); }); return { terminado, matar: () => { muertos++; matar(); } }; };
  let muertos = 0;
  const sinMaterial = async () => !(await contenido.leerMaterial(R.materialDelRender(p.valor.render.requestId)));

  const hecho = await ejecutorDePrueba().ejecutar({ ...despacho(), jobId: (await trabajoDe(A, v1.requestId)).jobId, input: (await trabajoDe(A, v1.requestId)).input, trace: (await trabajoDe(A, v1.requestId)).trace }, { renovar: async () => true });
  const antesX = montajes;
  check('X1) si el material ya está, termina sin montar: el mismo material, ningún FFmpeg',
    hecho.outcome === 'succeeded' && hecho.result.outputRefs[0] === R.materialDelRender(v1.requestId) && montajes === antesX);

  const perdida = await ejecutorDePrueba({ lanzar: conMontaje(colgado), renovarCadaMs: 30 }).ejecutar(despacho(), { renovar: async () => false });
  check('X2) si la concesión deja de ser suya a mitad de montaje, para FFmpeg y lo dice: `lease_lost`, sin material',
    perdida.outcome === 'failed' && perdida.error.details.reason === 'lease_lost' && muertos === 1 && await sinMaterial());

  const vencido = await ejecutorDePrueba({ lanzar: conMontaje(colgado), renovarCadaMs: 60_000 }).ejecutar(despacho({ timeoutMs: 60_000 + 150 }), { renovar: async () => true });
  check('X3) si se acaba el tiempo del intento, para FFmpeg: `render_timeout` —reintentable—, sin material',
    vencido.outcome === 'failed' && vencido.error.details.reason === 'render_timeout' && vencido.error.code === 'TIMEOUT' && muertos === 2 && await sinMaterial());
  const sinTiempo = await ejecutorDePrueba({ lanzar: conMontaje(colgado), limite: () => Date.now() }).ejecutar(despacho(), { renovar: async () => true });
  check('X4) y si la invocación no deja tiempo para montar, ni empieza: `no_time_to_render`', sinTiempo.error?.details?.reason === 'no_time_to_render' && muertos === 2);

  const falla = await ejecutorDePrueba({ lanzar: conMontaje(() => ({ terminado: Promise.resolve({ codigo: 1, stderr: 'Error while filtering' }), matar: () => {} })) }).ejecutar(despacho(), { renovar: async () => true });
  check('X5) FFmpeg que falla: `render_failed`, reintentable, y NADA de lo que escribió sale de aquí',
    falla.outcome === 'failed' && falla.error.details.reason === 'render_failed' && falla.error.code === 'PROVIDER_ERROR' && !JSON.stringify(falla).includes('filtering') && await sinMaterial());

  const basura = await ejecutorDePrueba({ lanzar: conMontaje((argv) => { fs.writeFileSync(argv[argv.length - 1], 'esto no es un vídeo'); return { terminado: Promise.resolve({ codigo: 0, stderr: '' }), matar: () => {} }; }) })
    .ejecutar(despacho(), { renovar: async () => true });
  check('X6) una salida que no es lo que dice el manifiesto no se guarda: `render_unverifiable`, sin objeto y sin material',
    basura.error?.details?.reason === 'render_unverifiable' && !objetos.has(`users/${C}/ai-generations/${R.materialDelRender(p.valor.render.requestId)}.mp4`) && await sinMaterial());

  /* Su material existe y es de OTRA cuenta: no se monta ni se toca. Adoptar lo tapaba todo menos esto. */
  const idDelConflicto = R.materialDelRender(p.valor.render.requestId);
  base.docs.set(`assets/${idDelConflicto}`, { ...base.leer(`assets/${m1.clips[0].assetId}`), assetId: idDelConflicto, ownerAccountId: B });
  const antesDelConflicto = montajes;
  const conflicto = await ejecutorDePrueba().ejecutar(despacho(), { renovar: async () => true });
  base.docs.delete(`assets/${idDelConflicto}`);
  check('X9) si su material ya existe y es de otra cuenta: `material_conflict`, sin montar ni tocar nada',
    conflicto.outcome === 'failed' && conflicto.error?.details?.reason === 'material_conflict' && montajes === antesDelConflicto, JSON.stringify(conflicto.error?.details));

  const sonda = RZ.leerSonda('Duration: 00:01:02.50, start: 0.0\n  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 1920x1080 [SAR 1:1 DAR 16:9], 24 fps\n  Stream #0:1[0x2](und): Audio: aac (LC)\n');
  check('X7) la sonda lee la cabecera de FFmpeg: duración, códec, cuadro y sonido',
    sonda.duracionSec === 62.5 && sonda.video === 'h264' && sonda.ancho === 1920 && sonda.alto === 1080 && sonda.conSonido === true && RZ.leerSonda('').conSonido === false);
  check('X8) y la carpeta temporal queda limpia también cuando falla', fs.readdirSync(TMP_RENDER).length === 0, fs.readdirSync(TMP_RENDER).join(','));
}

/* ═══ Q · EL PEDIDO, CUANDO ALGO SE QUEDÓ A MEDIAS ═══════════════════════ */
console.log('\n── Q · Pedir otra vez después de una llamada que murió, o de un trabajo que ya no está ──');
{
  const revB = await lista(B, 26, UNO, { 'sh-0101': CLIP_MUDO });
  const mB = await montajeDe(B, 26, revB);
  const ridB = R.requestIdDeRender(B, pid(26), mB.huella, 1);
  /* La llamada que murió justo después de reservar el cupo: su reserva está, su trabajo no. */
  await lib('engine/limits.js').limiter.reserve(B, { render: 1 }, R.CUPO_DEL_RENDER, ridB);
  const q1 = await renderizar(B, 26, revB);
  check('Q1) la siguiente petición NO vuelve a contar el cupo: el limitador lo cuenta una vez por petición',
    q1.valor?.render?.requestId === ridB && q1.valor.created === true && cupoDelRender(B) === 1, `${cupoDelRender(B)}`);
  const jobB = await trabajoDe(B, ridB);
  const [rutaDelTrabajo] = [...base.docs.entries()].find(([k, d]) => k.startsWith('jobs/') && d.jobId === jobB.jobId);
  base.docs.delete(rutaDelTrabajo);
  const q2 = await renderizar(B, 26, revB);
  check('Q2) un registro cuyo trabajo ya no está se rehace con la MISMA serie: la misma petición, el mismo material y ni otro cupo',
    q2.valor?.render?.requestId === ridB && q2.valor.render.state === 'queued' && !!(await trabajoDe(B, ridB)) && cupoDelRender(B) === 1, q2.valor?.render?.requestId);
}

/* ═══ G · LAS GUARDAS ════════════════════════════════════════════════════ */
console.log('\n── G · Lo que el render no hace ──');
{
  const src = (f) => sinComentarios(leer(`functions/src/creator/${f}`));
  const NUEVOS = ['render.ts', 'renderizador.ts', 'renders.ts'];
  const todo = NUEVOS.map(src).join('\n');
  check('G1) ni Credits ni liquidación: ni reservar, ni cobrar, ni devolver',
    !/spendCredits|completeCredits|refundCredits|creditEngine|liquidacionDeWee|reembolsar|creditsBalance/.test(todo));
  check('G2) ni proveedores de IA ni el conductor: ni Router, ni Gateway, ni adaptadores',
    !/conductorDeWee|pedirMedio|engine\.generate|runCapability|ADAPTERS|DEFAULT_ROUTING|createRouter|videoEngine|fetchBytes\(/.test(todo));
  check('G3) FFmpeg se lanza con una lista de argumentos y SIN shell; nada de exec',
    /spawn\(binario, \[\.\.\.argv\], \{ shell: false/.test(src('renderizador.ts')) && !/(?<!\.)\bexec(Sync|File)?\(|shell: true/.test(todo)
    /* `.exec(` de una expresión regular no es un proceso: lo que no puede aparecer es el `exec` de child_process. */
    && /import \{ spawn \} from 'child_process';/.test(src('renderizador.ts')));
  check('G4) ni `.run(` —la autoridad del Gateway no se toca— ni imports perezosos más allá del binario',
    !/\.run\(/.test(todo) && (todo.match(/require\(/g) ?? []).length === 1 && /require\('ffmpeg-static'\)/.test(todo) && !/import\(/.test(todo));
  const pasadaSrc = src('renders.ts');
  check('G5) la pasada descarta lo que no es un render ANTES de evaluar nada',
    pasadaSrc.indexOf('if (!esTrabajoDeRender(job)) continue;') > 0 && pasadaSrc.indexOf('if (!esTrabajoDeRender(job)) continue;') < pasadaSrc.indexOf('motor.evaluar('));
  check('G6) la tarea tiene la forma de F8 y NO es una capacidad de IA',
    core.FORMA_DE_TAREA.test(R.TAREA_DE_RENDER) && !core.CAPABILITY_CATALOG.some((c) => c.id === R.TAREA_DE_RENDER));
  check('G7) los módulos nuevos y la puerta están en la lista del motor, y el dinero no',
    [...NUEVOS.map((f) => `functions/src/creator/${f}`), 'functions/src/index.ts'].every((f) => TOCADOS_POR_EL_MOTOR.includes(f)) && TOCADOS_POR_EL_MOTOR.every((f) => !DINERO.some((re) => re.test(f))));
  const reglas = leer('firestore.rules');
  check('G8) el registro se lee solo si es tuyo, y el cliente no lo escribe',
    /match \/productionRenders\/\{renderId\} \{\s*allow read: if isAuthenticated\(\) && resource\.data\.ownerAccountId == request\.auth\.uid;\s*allow create, update, delete: if false;/.test(reglas));
  check('G9) el binario es una dependencia del servidor, y la colección de las producciones es la de productions',
    /"ffmpeg-static": "\^5\.3\.0"/.test(leer('functions/package.json')) && R.COLECCION_DE_LAS_PRODUCCIONES === producciones.COLECCION_DE_PRODUCCIONES);
  check('G10) documentado', /### Fase 8 · /.test(leer('docs/FILMMAKER.md')) && /media\.render/.test(leer('docs/FILMMAKER.md')) && /productionRenders/.test(leer('docs/FILMMAKER.md')));
  check('G11) esta suite está en la cadena de `npm test`', /filmmaker-render\.test\.mjs/.test(leer('functions/package.json')));
}

fs.rmSync(TMP, { recursive: true, force: true });
fs.rmSync(TMP_RENDER, { recursive: true, force: true });
console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 8 · el render final, con FFmpeg de verdad (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
