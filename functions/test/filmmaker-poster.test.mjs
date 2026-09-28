/**
 * FILMMAKER ENGINE · FASE 11 — LOS PÓSTERS: UNA IMAGEN FIJA DE CADA VÍDEO.
 *
 *   P · pedir: la puerta del render, cerrada por defecto; qué vídeos (los de los
 *       planos y los montajes, calculados por el servidor); un trabajo del Job
 *       Engine por vídeo, idempotente, con su cupo y sin Credits;
 *   E · hacer: el trabajador de siempre con el ejecutor nuevo, FFmpeg DE VERDAD, la
 *       variante `poster` en el material y su dirección calculada al leer;
 *   M · el montaje: su póster, en el momento, del archivo que ya estaba en disco;
 *   C · converger: el objeto sin anotar, el trabajador que murió antes y después,
 *       dos pasadas a la vez, y las series que se agotan;
 *   S · seguridad: el paquete tocado, lo ajeno, otro almacén, un objeto que no es
 *       el suyo, el póster de otro, y retirar el vídeo;
 *   L · el latido y los topes del ejecutor;
 *   G · las guardas: ni Credits, ni proveedores, ni shell, ni el Content Core.
 *
 * De verdad: la puerta `renders`, el Job Engine, su almacén, el trabajador
 * (`atenderEntrega`), la cola de invocación, los ejecutores del render y del
 * póster, FFmpeg (`ffmpeg-static`), el Content Core (`anotarVariante`,
 * `retirarMaterial`), productions, F1-A, la cadena de F1-D y el limitador diario,
 * sobre un Firestore en memoria (el arnés de `f1d-postcanary.test.mjs`, copiado
 * tal cual). De mentira: el adaptador de Seedance, lo que ModelArk contesta y el
 * almacén de objetos —que guarda, en memoria, los bytes de vídeos mp4 de verdad
 * generados aquí mismo con FFmpeg—. Nada sale a la red, y no se usa ninguna
 * credencial.
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

/* ═══ FASE 11 · lo que se prueba aquí ═══════════════════════════════════════ */
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const P = lib('creator/poster.js');
const R = lib('creator/render.js');
const RZ = lib('creator/renderizador.js');
const RS = lib('creator/renders.js');
const jobIdx = lib('job/index.js');
const almacen = lib('runtime/almacen.js');
const core = lib('core/index.js');
const limites = lib('engine/limits.js');
const { TOCADOS_POR_EL_MOTOR, DINERO } = await import('./motor-filmmaker-alcance.mjs');
const FFMPEG = require('ffmpeg-static');
/** El último commit antes de esta fase: lo que no se toca se compara con él. */
const ANTES = 'f159f9e';
/** El commit de esta fase, cuando ya existe: lo que la fase tocó se mide en SU tramo, y las siguientes no lo mueven. */
const HASTA = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 11 "').trim();

/* ═══ Vídeos de verdad, hechos aquí con FFmpeg ═══════════════════════════ */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fase11-'));
const TMP_W = fs.mkdtempSync(path.join(os.tmpdir(), 'fase11-trabajo-'));
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
const sondaDe = (bytes, ext = 'mp4') => {
  const f = path.join(TMP, `sonda-${Math.random().toString(16).slice(2)}.${ext}`);
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
const rutasBajadas = [];
cubo.file = (ruta) => ({
  ...archivoDelArnes(ruta),
  async download({ destination }) {
    const o = objetos.get(ruta);
    if (!o) throw Object.assign(new Error('no existe'), { code: 404 });
    bajadas++;
    rutasBajadas.push(ruta);
    fs.writeFileSync(destination, o.bytes);
  },
});
cubo.upload = async (origen, { destination, metadata, preconditionOpts }) => {
  if (preconditionOpts?.ifGenerationMatch === 0 && objetos.has(destination)) throw Object.assign(new Error('precondición'), { code: 412 });
  objetos.set(destination, { bytes: fs.readFileSync(origen), contentType: metadata?.contentType, metadata: { ...(metadata?.metadata ?? {}) } });
};

/* ═══ Producciones con vídeo en sus planos, por la cadena entera de F1-D ═══ */
const escena = (shots) => clon({
  ...M.produccionVacia({ title: 'El faro', aspectRatio: '16:9', resolution: '720p' }),
  intent: { objective: 'Un faro al amanecer' },
  scenes: [{ id: 'sc-0001', order: 0, title: 'Amanecer', description: 'El sol sale detrás del faro', shots }],
});
const TRES = [
  { id: 'sh-0101', order: 0, durationSec: 4, description: 'Una farera sube la escalera del faro' },
  { id: 'sh-0102', order: 1, durationSec: 4, description: 'La lámpara se enciende', audio: { withSound: true } },
  { id: 'sh-0103', order: 2, durationSec: 4, description: 'El mar entero al amanecer' },
];
const UNO = [{ id: 'sh-0101', order: 0, durationSec: 4, description: 'La lámpara del faro gira' }];
/** Crea la producción, genera cada plano con el vídeo que se diga, lo cierra y lo enlaza. Devuelve la revisión. */
const lista = async (uid, k, shots, clips = {}) => {
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
const videosDeLa = async (uid, k) => (await videosDe(uid, pid(k))).valor?.videos ?? [];

/* Las puertas y el trabajador. */
const puerta = (uid, data) => intento(() => RS.renders.run({ auth: { uid }, data }));
const posters = (uid, k) => puerta(uid, { op: 'poster.request', productionId: pid(k) });
const listar = (uid, k) => puerta(uid, { op: 'poster.list', productionId: pid(k) });
const renderizar = (uid, k, revision) => puerta(uid, { op: 'render.request', productionId: pid(k), revision });
/* Cuántos fotogramas se sacaron y cuántos montajes se hicieron de verdad (las sondas no cuentan). */
let fotogramas = 0;
let montajes = 0;
const REAL = RZ.lanzarFfmpegDeWee(FFMPEG);
const LANZAR = (argv) => { if (argv.includes('-frames:v')) fotogramas++; if (argv.includes('-filter_complex')) montajes++; return REAL(argv); };
const ejecutores = (extra = {}) => ({
  ejecutor: RZ.crearEjecutorDeRender({ lanzar: LANZAR, temporal: TMP_W, ...(extra.render ?? {}) }),
  ejecutorDePoster: RZ.crearEjecutorDePoster({ lanzar: LANZAR, temporal: TMP_W, ...(extra.poster ?? {}) }),
});
const trabajar = (extra = {}) => RS.pasadaDeRender({
  db: base, presupuestoMs: extra.presupuestoMs ?? 25 * 60_000, ...ejecutores(extra), ...(extra.ahora ? { ahora: extra.ahora } : {}),
});
const store = almacen.almacenDeTrabajos(base);
const trabajoDe = (uid, assetId, serie = 1) => P.trabajoDelPoster(base, uid, P.requestIdDePoster(uid, assetId, serie));
const trabajosDePoster = () => base.de('jobs').filter((d) => d.task === 'media.video_poster');
const cupoDePoster = (uid) => base.de('aiRateLimits').filter((d) => d.userId === uid).reduce((s, d) => s + Number(d.poster || 0), 0);
const abrir = (cuentas) => base.docs.set('aiSettings/render', { habilitado: true, cuentas });
const material = (assetId) => contenido.leerMaterial(assetId);
const suPoster = async (uid, assetId) => { const m = await material(assetId); return m ? P.posterDelMaterial(m, uid) : undefined; };
const crearTrabajoDePoster = async (uid, assetId, requestId = P.requestIdDePoster(uid, assetId, 1)) => {
  const { motor } = jobIdx.crearMotorDeTrabajosDeWee(P.POLITICA_DEL_POSTER);
  return jobIdx.crearTrabajo(store, motor, {
    contract: core.JOB_ENGINE_CONTRACT_VERSION, principal: { userId: uid }, at: Date.now(), task: { name: 'media.video_poster' },
    input: P.paqueteDePoster(uid, assetId, requestId), trace: { traceId: 'poster-prueba', requestId, userId: uid }, idempotencyKey: requestId, policy: P.POLITICA_DEL_POSTER,
  });
};

/* ═══ U · LAS PIEZAS ═════════════════════════════════════════════════════ */
console.log('\n── U · Las piezas: el tamaño, el segundo, los argumentos, el sitio y la petición ──');
{
  check('U1) el lado mayor, como mucho 640 y par; el otro, en proporción',
    JSON.stringify(RZ.escalaDelPoster(1280, 720)) === JSON.stringify({ filtro: 'scale=640:-2', ancho: 640 })
    && JSON.stringify(RZ.escalaDelPoster(720, 1280)) === JSON.stringify({ filtro: 'scale=-2:640', alto: 640 })
    && RZ.escalaDelPoster(320, 240).filtro === 'scale=320:-2' && RZ.escalaDelPoster(333, 100).filtro === 'scale=332:-2' && RZ.escalaDelPoster(1, 1).filtro === 'scale=2:-2');
  check('U2) el segundo: el primero, o la mitad de un vídeo que dure menos de dos',
    RZ.segundoDelPoster(4) === 1 && RZ.segundoDelPoster(2) === 1 && RZ.segundoDelPoster(1.5) === 0.75 && RZ.segundoDelPoster(undefined) === 0 && RZ.segundoDelPoster(0) === 0);
  const raro = path.join(TMP, 'con espacios; rm -rf', 'v.mp4');
  const argv = RZ.argumentosDelPoster(raro, '/tmp/p.jpg', 1, 'scale=640:-2');
  check('U3) los argumentos son una lista: una ruta rara es UN argumento, y el filtro solo lleva números',
    argv.includes(raro) && argv[argv.indexOf('-vf') + 1] === 'scale=640:-2' && argv[argv.indexOf('-frames:v') + 1] === '1' && argv[argv.indexOf('-ss') + 1] === '1.000'
    && argv.indexOf('-ss') < argv.indexOf('-i') && argv.at(-1) === '/tmp/p.jpg');
  const id = `asset_${'a'.repeat(32)}`;
  check('U4) su sitio no puede ser el de ningún material: la virgulilla no cabe en un id, y queda fuera del prefijo que adopta el materializador',
    P.rutaDelPoster(A, id) === `users/${A}/ai-generations/${id}~poster.jpg` && !core.FORMA_DE_ID_DE_MATERIAL.test(`${id}~poster`)
    && !P.rutaDelPoster(A, id).startsWith(`users/${A}/ai-generations/${id}.`) && P.marcaDelPoster(id) !== id);
  check('U5) la petición: su forma, su serie, y cambia con la cuenta, el vídeo y la serie',
    /^fmp\.[0-9a-f]{32}\.2$/.test(P.requestIdDePoster(A, id, 2)) && P.serieDePoster(P.requestIdDePoster(A, id, 3)) === 3
    && P.requestIdDePoster(A, id, 1) !== P.requestIdDePoster(B, id, 1) && P.requestIdDePoster(A, id, 1) !== P.requestIdDePoster(A, `asset_${'b'.repeat(32)}`, 1)
    && P.serieDePoster('fmr.x.1') === undefined);
  check('U6) la tarea tiene la forma de F8, NO es una capacidad de IA, y no es la de Media Cloud',
    core.FORMA_DE_TAREA.test(P.TAREA_DE_POSTER) && !core.CAPABILITY_CATALOG.some((c) => c.id === P.TAREA_DE_POSTER) && P.TAREA_DE_POSTER !== 'media.poster'
    && P.TAREA_DE_POSTER !== R.TAREA_DE_RENDER);
  const paquete = P.paqueteDePoster(A, id, P.requestIdDePoster(A, id, 1));
  check('U7) el paquete se lee solo para su dueña, con su serie en su sitio y su identidad recalculada',
    P.leerPaqueteDePoster(paquete, A).ok && P.leerPaqueteDePoster(paquete, B).motivo === 'identity'
    && P.leerPaqueteDePoster({ ...paquete, assetId: `asset_${'b'.repeat(32)}` }, A).motivo === 'identity'
    && P.leerPaqueteDePoster({ ...paquete, requestId: P.requestIdDePoster(A, id, 4) }, A).motivo === 'identity'
    && P.leerPaqueteDePoster({ ...paquete, assetId: '../x' }, A).motivo === 'malformed' && P.leerPaqueteDePoster({ ...paquete, version: 'otra' }, A).motivo === 'malformed');
}

/* ═══ P · PEDIR ══════════════════════════════════════════════════════════ */
console.log('\n── P · Pedir los pósters: la puerta, qué vídeos, un trabajo por vídeo, idempotente y sin Credits ──');
await lista(A, 1, TRES, { 'sh-0101': CLIP_MUDO, 'sh-0102': CLIP_SONIDO, 'sh-0103': CLIP_VERTICAL });
const videos1 = await videosDeLa(A, 1);
const idDe = (vs, unitId) => vs.find((v) => v.unitId === unitId)?.producedAssetId;
const ids1 = ['sh-0101', 'sh-0102', 'sh-0103'].map((u) => idDe(videos1, u));
{
  const jobsAntes = base.de('jobs').length;
  const cerrada = await posters(A, 1);
  check('P1) sin `aiSettings/render` la puerta está cerrada: se contesta lo que hay —tres vídeos, sin póster— y no se pide nada',
    cerrada.ok && cerrada.valor.refused?.reason === 'poster_not_enabled' && cerrada.valor.requested === 0 && cerrada.valor.posters.length === 3
    && cerrada.valor.posters.every((p) => p.state === 'missing' && p.source === 'shot' && !p.url) && base.de('jobs').length === jobsAntes && cupoDePoster(A) === 0,
    JSON.stringify(cerrada.valor ?? codigo(cerrada)));
  abrir([B]);
  const deOtra = await posters(A, 1);
  check('P2) abierta para otra cuenta, tampoco para esta', deOtra.valor?.refused?.reason === 'poster_not_enabled' && trabajosDePoster().length === 0);
  abrir([A, B, C, D, E, F]);
  const saldoAntes = saldo(A);
  const pedido = await posters(A, 1);
  check('P3) abierta: un trabajo por vídeo, pendientes, y la respuesta dice de qué plano es cada uno',
    pedido.ok && pedido.valor.requested === 3 && !pedido.valor.refused && pedido.valor.posters.length === 3 && pedido.valor.posters.every((p) => p.state === 'pending' && !p.failure)
    && JSON.stringify(pedido.valor.posters.map((p) => p.unitId).sort()) === JSON.stringify(['sh-0101', 'sh-0102', 'sh-0103']) && trabajosDePoster().length === 3,
    JSON.stringify(pedido.valor ?? codigo(pedido)));
  const rid = P.requestIdDePoster(A, ids1[0], 1);
  const j = await trabajoDe(A, ids1[0]);
  check('P4) es un trabajo del Job Engine: tarea general `media.video_poster`, sin capacidad ni proveedor, de esta cuenta y con su política',
    !!j && j.task?.name === 'media.video_poster' && j.capability === undefined && j.implementation === undefined && j.owner.userId === A && j.state === 'queued'
    && JSON.stringify(j.policy) === JSON.stringify(P.POLITICA_DEL_POSTER) && j.trace.requestId === rid && j.idempotency.key === rid && /^fmp\.[0-9a-f]{32}\.1$/.test(rid));
  check('P5) su paquete lleva el vídeo por su id —nunca una URL, una ruta o un token— y se lee de vuelta solo para su dueña',
    j.input.version === 'fm-poster-1' && j.input.assetId === ids1[0] && j.input.accountId === A && !/https?:|users\/|token|~poster/i.test(JSON.stringify(j.input))
    && P.leerPaqueteDePoster(j.input, A).ok && !P.leerPaqueteDePoster(j.input, B).ok);
  check('P6) cuenta en el cupo del día —el limitador de siempre, con su propia clave—: uno por trabajo nuevo', cupoDePoster(A) === 3, `${cupoDePoster(A)}`);
  const otraVez = await posters(A, 1);
  check('P7) pedirlos otra vez no crea nada: los mismos trabajos, el mismo cupo, «pendientes»',
    otraVez.ok && otraVez.valor.requested === 0 && otraVez.valor.posters.every((p) => p.state === 'pending') && trabajosDePoster().length === 3 && cupoDePoster(A) === 3);
  check('P8) y no toca el dinero: ni una transacción de Credits, ni un Credit del saldo',
    saldo(A) === saldoAntes && !base.de('creditTransactions').some((t) => String(t.requestId ?? '').startsWith('fmp.')));
  const ajena = await posters(B, 1);
  const ajenaLista = await listar(B, 1);
  check('P9) de la producción de otra cuenta no hay vídeos: ni pósters, ni trabajos',
    ajena.ok && ajena.valor.posters.length === 0 && ajena.valor.requested === 0 && ajenaLista.ok && ajenaLista.valor.posters.length === 0 && trabajosDePoster().length === 3);
  const sinForma = await puerta(A, { op: 'poster.request' });
  check('P10) sin producción, ni se mira', !sinForma.ok && sinForma.error?.code === 'invalid-argument');
  const lst = await listar(A, 1);
  check('P11) `poster.list` contesta lo mismo y no pide nada', lst.ok && lst.valor.posters.length === 3 && lst.valor.posters.every((p) => p.state === 'pending') && trabajosDePoster().length === 3);
}

/* ═══ E · HACERLOS ═══════════════════════════════════════════════════════ */
console.log('\n── E · Hacerlos: el trabajador de siempre, el ejecutor nuevo, FFmpeg de verdad ──');
{
  const antes = { fotogramas, bajadas };
  const informe = await trabajar();
  const js = await Promise.all(ids1.map((id) => trabajoDe(A, id)));
  check('E1) una pasada: los tres trabajos se reclaman, se saca UN fotograma de cada vídeo y terminan en un intento',
    informe.dePoster === 3 && informe.atendidos === 3 && informe.completados === 3 && fotogramas === antes.fotogramas + 3
    && js.every((j, i) => j.state === 'completed' && j.attempts.length === 1 && j.result?.outputRefs?.[0] === ids1[i]), JSON.stringify(informe));
  const m0 = await material(ids1[0]);
  const v0 = m0.variants?.find((v) => v.kind === 'poster');
  const ruta0 = P.rutaDelPoster(A, ids1[0]);
  check('E2) la variante `poster` en SU material: del Storage de Weë, en su sitio, JPEG, 640×360 de un vídeo 1280×720',
    !!v0 && v0.storageRef.provider === 'wee' && v0.storageRef.bucket === cubo.name && v0.storageRef.objectKey === ruta0 && v0.mimeType === 'image/jpeg'
    && v0.width === 640 && v0.height === 360 && v0.bytes > 0 && m0.variants.length === 1 && v0.url === undefined, JSON.stringify(v0));
  check('E3) el material sigue siendo el mismo: listo, su objeto, su entrega y su procedencia, sin tocar',
    m0.status === 'ready' && m0.kind === 'video' && m0.storageRef.objectKey === `users/${A}/ai-generations/${ids1[0]}.mp4` && !!m0.delivery?.url
    && m0.provenance.capability === 'video.generate');
  const o0 = objetos.get(ruta0);
  check('E4) el objeto: en la carpeta de la cuenta, junto a su vídeo y fuera del prefijo del materializador, con la marca de ESTE póster y su token',
    !!o0 && o0.contentType === 'image/jpeg' && o0.metadata.weeMaterial === `${ids1[0]}:poster` && !!o0.metadata.firebaseStorageDownloadTokens
    && ruta0.startsWith(`users/${A}/ai-generations/`) && !ruta0.startsWith(`users/${A}/ai-generations/${ids1[0]}.`));
  const s0 = sondaDe(o0.bytes, 'jpg');
  check('E5) y es un JPEG de verdad, del tamaño que dice', s0.video === 'mjpeg' && s0.ancho === 640 && s0.alto === 360 && o0.bytes.length === v0.bytes, JSON.stringify(s0));
  const vv = (await material(ids1[2])).variants?.find((v) => v.kind === 'poster');
  const sv = sondaDe(objetos.get(P.rutaDelPoster(A, ids1[2])).bytes, 'jpg');
  check('E6) de un vídeo vertical, el lado mayor es el alto: 360×640', vv?.width === 360 && vv?.height === 640 && sv.ancho === 360 && sv.alto === 640, JSON.stringify(vv));
  const listos = await posters(A, 1);
  const p0 = listos.valor?.posters.find((p) => p.assetId === ids1[0]);
  const token0 = o0.metadata.firebaseStorageDownloadTokens;
  check('E7) pedirlos ahora los devuelve LISTOS, con su tamaño y su dirección —la de su objeto, con su token—, y no pide nada',
    listos.ok && listos.valor.requested === 0 && listos.valor.posters.every((p) => p.state === 'ready' && typeof p.url === 'string')
    && p0.url === http.downloadUrlFor(cubo.name, ruta0, token0) && p0.width === 640 && p0.height === 360 && trabajosDePoster().length === 3, JSON.stringify(p0));
  const lst = await listar(A, 1);
  check('E8) `poster.list` también; y la dirección no se guarda en ningún sitio: ni en el material, ni en el trabajo',
    lst.valor?.posters.every((p) => p.state === 'ready' && !!p.url) && !JSON.stringify(base.leer(`assets/${ids1[0]}`)).includes(token0)
    && !JSON.stringify(base.de('jobs')).includes(token0));
  const otraPasada = await trabajar();
  check('E9) otra pasada no hace nada: nada que atender, ni un fotograma más', otraPasada.dePoster === 0 && otraPasada.atendidos === 0 && fotogramas === antes.fotogramas + 3);
  check('E10) una descarga por vídeo, por su referencia de almacén; y la carpeta temporal queda limpia',
    bajadas === antes.bajadas + 3 && fs.readdirSync(TMP_W).length === 0, `${bajadas - antes.bajadas} ${fs.readdirSync(TMP_W).join(',')}`);
}

/* ═══ O · EL ORDEN Y EL TIEMPO ═══════════════════════════════════════════ */
console.log('\n── O · Los pósters delante, y cada trabajo solo si le cabe SU intento ──');
let renderD3;
let bajadasDeO2 = [];
{
  const rev2 = await lista(D, 2, UNO, { 'sh-0101': CLIP_SONIDO });
  const r2 = await renderizar(D, 2, rev2);
  await posters(D, 2);
  const orden = [];
  const registrar = (e) => ({ ejecutar: (d, c) => { orden.push(d.task?.name); return e.ejecutar(d, c); } });
  const ej = ejecutores();
  const corta = await RS.pasadaDeRender({
    db: base, presupuestoMs: P.POLITICA_DEL_POSTER.attemptTimeoutMs + 60_000, ejecutor: registrar(ej.ejecutor), ejecutorDePoster: registrar(ej.ejecutorDePoster),
  });
  const jr2 = await R.trabajoDelRender(base, D, r2.valor.render.requestId);
  check('O1) una pasada sin veinte minutos por delante: hace el póster y deja el montaje en la cola —del almacén— para la siguiente',
    corta.dePoster === 1 && corta.deRender === 1 && corta.completados === 1 && corta.aplazados === 1 && JSON.stringify(orden) === JSON.stringify(['media.video_poster'])
    && jr2.state === 'queued' && jr2.attempts.length === 0, JSON.stringify(corta));
  const rev3 = await lista(D, 3, TRES, { 'sh-0102': CLIP_SONIDO });
  renderD3 = await renderizar(D, 3, rev3);
  await posters(D, 3);
  orden.length = 0;
  const b0 = rutasBajadas.length;
  const larga = await RS.pasadaDeRender({ db: base, presupuestoMs: 25 * 60_000, ejecutor: registrar(ej.ejecutor), ejecutorDePoster: registrar(ej.ejecutorDePoster) });
  check('O2) con tiempo, todo: los pósters delante —aunque el montaje se pidiera antes— y los dos montajes después',
    larga.completados === 5 && JSON.stringify(orden) === JSON.stringify(['media.video_poster', 'media.video_poster', 'media.video_poster', 'media.render', 'media.render']),
    `${JSON.stringify(orden)} ${JSON.stringify(larga)}`);
  bajadasDeO2 = rutasBajadas.slice(b0);

  /*
   * O3 · Que el orden no sea casualidad. El almacén devuelve los trabajos por su identificador —un resumen de la
   * petición—, así que el orden «natural» es el que salga. Se busca un montaje cuyo identificador vaya ANTES que el del
   * póster, y aun así el póster tiene que hacerse primero.
   */
  await lista(D, 16, UNO, { 'sh-0101': CLIP_MUDO });
  await posters(D, 16);
  const [v16] = await videosDeLa(D, 16);
  const idEnElAlmacen = (clave) => `j.${core.claveDeIdempotencia(core.alcanceDeIdempotencia(D), clave)}`;
  const idDelPoster = idEnElAlmacen(P.requestIdDePoster(D, v16.producedAssetId, 1));
  let clave;
  for (let i = 0; i < 1_000_000 && !clave; i++) if (idEnElAlmacen(`orden-${i}`) < idDelPoster) clave = `orden-${i}`;
  const { motor } = jobIdx.crearMotorDeTrabajosDeWee(R.POLITICA_DEL_RENDER);
  await jobIdx.crearTrabajo(store, motor, {
    contract: core.JOB_ENGINE_CONTRACT_VERSION, principal: { userId: D }, at: Date.now(), task: { name: 'media.render' }, input: { version: 'fm-render-1' },
    trace: { traceId: 'render-orden', requestId: clave, userId: D }, idempotencyKey: clave, policy: R.POLITICA_DEL_RENDER,
  });
  orden.length = 0;
  await RS.pasadaDeRender({ db: base, presupuestoMs: 25 * 60_000, ejecutor: registrar(ej.ejecutor), ejecutorDePoster: registrar(ej.ejecutorDePoster) });
  check('O3) y no es casualidad: aunque el almacén devuelva antes el montaje —va por identificador—, el póster se hace primero',
    !!clave && base.docs.has(`jobs/${idDelPoster}`) && base.docs.has(`jobs/${idEnElAlmacen(clave)}`) && JSON.stringify(orden) === JSON.stringify(['media.video_poster', 'media.render']),
    `${JSON.stringify(orden)} ${clave}`);
}

/* ═══ M · EL PÓSTER DEL MONTAJE ══════════════════════════════════════════ */
console.log('\n── M · El póster del montaje, en el momento, del archivo que ya estaba en disco ──');
{
  const a3 = R.materialDelRender(renderD3.valor.render.requestId);
  const m3 = await material(a3);
  const v3 = m3?.variants?.find((v) => v.kind === 'poster');
  check('M1) el montaje termina CON su póster: 640×360, en su sitio y con su marca',
    m3?.status === 'ready' && !!v3 && v3.width === 640 && v3.height === 360 && v3.storageRef.objectKey === P.rutaDelPoster(D, a3)
    && objetos.get(P.rutaDelPoster(D, a3))?.metadata.weeMaterial === `${a3}:poster`, JSON.stringify(v3));
  check('M2) sin bajar el montaje otra vez: esa pasada solo bajó los tres vídeos de los pósters y los cuatro planos de los dos montajes',
    bajadasDeO2.length === 7 && !bajadasDeO2.some((r) => r.includes(a3)) && bajadasDeO2.every((r) => r.endsWith('.mp4')), JSON.stringify(bajadasDeO2));
  const lp = await posters(D, 3);
  check('M3) la producción lo cuenta entre sus pósters: el de cada plano y el del montaje, listos',
    lp.valor?.posters.length === 4 && lp.valor.posters.filter((p) => p.source === 'render' && p.assetId === a3).length === 1
    && lp.valor.posters.every((p) => p.state === 'ready' && !!p.url) && lp.valor.requested === 0, JSON.stringify(lp.valor?.posters?.map((p) => [p.source, p.state])));

  const rev5 = await lista(E, 5, UNO, { 'sh-0101': CLIP_MUDO });
  const r5 = await renderizar(E, 5, rev5);
  const a5 = R.materialDelRender(r5.valor.render.requestId);
  const f0 = fotogramas;
  await trabajar({ render: { anotar: async () => false } });
  const m5 = await material(a5);
  check('M4) si el póster del montaje no se puede anotar, el render termina igual: completado, con su vídeo y sin póster',
    m5?.status === 'ready' && !(m5.variants ?? []).some((v) => v.kind === 'poster') && (await R.trabajoDelRender(base, E, r5.valor.render.requestId)).state === 'completed'
    && fotogramas === f0 + 1 && objetos.has(P.rutaDelPoster(E, a5)));
  const f1 = fotogramas;
  const b1 = rutasBajadas.length;
  const pedidos5 = await posters(E, 5);
  await trabajar();
  const nuevas = rutasBajadas.slice(b1);
  check('M5) y después se pide como cualquier otro: su objeto ya estaba, así que se comprueba y se ANOTA —sin sacar otro fotograma ni bajar el montaje—',
    pedidos5.valor?.requested === 2 && !!(await suPoster(E, a5)) && fotogramas === f1 + 1 && !nuevas.some((r) => r.endsWith(`${a5}.mp4`))
    && nuevas.includes(P.rutaDelPoster(E, a5)), JSON.stringify(nuevas));
}

/* ═══ C · CONVERGER ══════════════════════════════════════════════════════ */
console.log('\n── C · Lo que se queda a medias se termina, sin sacar dos veces el mismo fotograma ──');
const reclamarComoMuerto = async (uid, assetId, at) => {
  const { motor } = jobIdx.crearMotorDeTrabajosDeWee(P.POLITICA_DEL_POSTER);
  let job = await trabajoDe(uid, assetId);
  const principal = { userId: uid, appId: 'studio' };
  const rec = motor.reclamar(job, { principal, at, worker: 'muerto' });
  job = (await store.aplicar(rec.transition)).job;
  const mar = motor.marcarEnvio(job, { principal, at, worker: 'muerto', attemptId: rec.dispatch.attemptId });
  job = (await store.aplicar(mar.transition)).job;
  return { job, dispatch: rec.dispatch };
};
let videoC9;
{
  /* C1 · Guardó el objeto y la anotación falló: el siguiente intento lo ADOPTA. */
  await lista(C, 6, UNO, { 'sh-0101': CLIP_SONIDO });
  await posters(C, 6);
  const [v6] = await videosDeLa(C, 6);
  let falla = true;
  const anotar = async (...a) => { if (falla) { falla = false; return false; } return contenido.anotarVariante(...a); };
  const f0 = fotogramas;
  await trabajar({ poster: { anotar } });
  const j1 = await trabajoDe(C, v6.producedAssetId);
  check('C1) el objeto se guardó y la anotación falló: el intento falla con su motivo, el objeto queda, y el trabajo vuelve a la cola',
    j1.state === 'queued' && j1.attempts.length === 1 && j1.attempts[0].error?.details?.reason === 'poster_not_annotated'
    && objetos.has(P.rutaDelPoster(C, v6.producedAssetId)) && fotogramas === f0 + 1 && !(await suPoster(C, v6.producedAssetId)), `${j1.state} ${j1.attempts[0]?.error?.details?.reason}`);
  await trabajar({ poster: { anotar }, ahora: () => Date.now() + 40_000 });
  const j2 = await trabajoDe(C, v6.producedAssetId);
  check('C2) el segundo intento lo ADOPTA: comprueba que es un póster y lo anota, sin sacar otro fotograma',
    j2.state === 'completed' && j2.attempts.length === 2 && !!(await suPoster(C, v6.producedAssetId)) && fotogramas === f0 + 1, `${j2.state}`);

  /* C3 · El trabajador murió a mitad, sin dejar nada: se espera, se da por perdido y se repite. */
  await lista(C, 7, UNO, { 'sh-0101': CLIP_MUDO });
  await posters(C, 7);
  const [v7] = await videosDeLa(C, 7);
  const t0 = Date.now();
  await reclamarComoMuerto(C, v7.producedAssetId, t0);
  const f7 = fotogramas;
  await trabajar({ ahora: () => t0 + 90_000 });
  const e1 = await trabajoDe(C, v7.producedAssetId);
  check('C3) la concesión caducó: el Job Engine lo deja esperando —salió y no se sabe— y, sin variante, todavía no se da por perdido',
    e1.state === 'waiting' && e1.attempts[0].outcome === 'unknown' && fotogramas === f7, `${e1.state}`);
  const q2 = await trabajar({ ahora: () => t0 + 90_000 + RS.GRACIA_DE_UN_INTENTO_PERDIDO_MS + 5_000 });
  const e2 = await trabajoDe(C, v7.producedAssetId);
  check('C4) pasada la gracia y sin variante: ese intento se da por perdido —`poster_lost`, por el mismo camino que un aviso— y el Job Engine decide el siguiente',
    q2.reconciliados >= 1 && e2.attempts[0].outcome === 'failed' && e2.attempts[0].error?.details?.reason === 'poster_lost' && e2.state === 'queued', `${e2.state}`);
  await trabajar({ ahora: () => t0 + 90_000 + RS.GRACIA_DE_UN_INTENTO_PERDIDO_MS + 60_000 });
  const e3 = await trabajoDe(C, v7.producedAssetId);
  check('C5) y el segundo intento lo hace', e3.state === 'completed' && e3.attempts.length === 2 && fotogramas === f7 + 1 && !!(await suPoster(C, v7.producedAssetId)));

  /* C6 · Murió DESPUÉS de anotar, antes de contarlo: la variante manda y no se saca otra vez. */
  await lista(C, 8, UNO, { 'sh-0101': CLIP_SONIDO });
  await posters(C, 8);
  const [v8] = await videosDeLa(C, 8);
  const t1 = Date.now();
  const { dispatch } = await reclamarComoMuerto(C, v8.producedAssetId, t1);
  const huerfano = await ejecutores().ejecutorDePoster.ejecutar(dispatch, { renovar: async () => true });
  const f8 = fotogramas;
  const q = await trabajar({ ahora: () => t1 + 90_000 });
  const e8 = await trabajoDe(C, v8.producedAssetId);
  check('C6) murió tras anotar: la variante está, así que el póster está hecho —por el mismo camino que un aviso—, sin sacar otro fotograma',
    huerfano.outcome === 'succeeded' && q.reconciliados >= 1 && e8.state === 'completed' && e8.result?.outputRefs?.[0] === v8.producedAssetId && fotogramas === f8, `${e8.state}`);

  /* C7 · Dos pasadas a la vez sobre el mismo trabajo: una lo hace, la otra lo pierde en el compare-and-set. */
  await lista(C, 9, UNO, { 'sh-0101': CLIP_MUDO });
  await posters(C, 9);
  [videoC9] = await videosDeLa(C, 9);
  const f9 = fotogramas;
  const [x, y] = await Promise.all([trabajar(), trabajar()]);
  const e9 = await trabajoDe(C, videoC9.producedAssetId);
  check('C7) dos trabajadores a la vez: UN fotograma, UN intento, UN póster',
    fotogramas === f9 + 1 && e9.state === 'completed' && e9.attempts.length === 1 && x.completados + y.completados === 1, `${fotogramas - f9} ${x.completados}+${y.completados}`);

  /* C8 · Un vídeo del que no sale nada: tres series y ni una más. */
  await lista(F, 10, UNO, { 'sh-0101': CLIP_MUDO });
  const [v10] = await videosDeLa(F, 10);
  const m10 = await material(v10.producedAssetId);
  objetos.get(m10.storageRef.objectKey).bytes = Buffer.from('esto no es un vídeo');
  const series = [];
  for (let i = 1; i <= 3; i++) {
    await posters(F, 10);
    await trabajar();
    series.push(await trabajoDe(F, v10.producedAssetId, i));
  }
  const cuarta = await posters(F, 10);
  check('C8) un vídeo del que no se puede sacar nada: cada trabajo falla sin reintento —`source_unreadable`—, tres series y ni una más',
    series.every((j) => j?.state === 'failed' && j.attempts.length === 1 && j.error?.details?.reason === 'source_unreadable')
    && cuarta.valor?.posters[0].state === 'failed' && cuarta.valor.posters[0].failure === 'too_many_attempts' && cuarta.valor.requested === 0
    && !(await trabajoDe(F, v10.producedAssetId, 4)) && cupoDePoster(F) === 3,
    JSON.stringify(cuarta.valor?.posters));

  /* C9 · El cupo del día, lleno. */
  await lista(B, 11, UNO, { 'sh-0101': CLIP_MUDO });
  const [v11] = await videosDeLa(B, 11);
  await limites.limiter.reserve(B, { poster: P.LIMITES_DEL_POSTER.maxPorDia }, P.CUPO_DEL_POSTER);
  const lleno = await posters(B, 11);
  check('C9) con el cupo del día lleno no se pide nada: se dice, y el vídeo sigue sin póster',
    lleno.valor?.refused?.reason === 'daily_limit' && lleno.valor.requested === 0 && lleno.valor.posters[0].state === 'missing' && !(await trabajoDe(B, v11.producedAssetId)));
}

/* ═══ S · SEGURIDAD ══════════════════════════════════════════════════════ */
console.log('\n── S · Lo que no se hace: el paquete tocado, lo ajeno, otro almacén, lo que no es suyo ──');
{
  /* S1 · El paquete guardado se toca: la identidad ya no cuadra. */
  await lista(E, 12, UNO, { 'sh-0101': CLIP_MUDO });
  await posters(E, 12);
  const [v12] = await videosDeLa(E, 12);
  const job = await trabajoDe(E, v12.producedAssetId);
  const [ruta, doc] = [...base.docs.entries()].find(([k, d]) => k.startsWith('jobs/') && d.jobId === job.jobId);
  const tocado = JSON.parse(doc.json);
  tocado.input.assetId = ids1[1];
  base.docs.set(ruta, { ...doc, json: JSON.stringify(tocado) });
  const f0 = fotogramas;
  const b0 = bajadas;
  const antesDeA = JSON.stringify((await material(ids1[1])).variants);
  await trabajar();
  const j = await trabajoDe(E, v12.producedAssetId);
  check('S1) un paquete tocado —el vídeo de otra cuenta con la petición de esta—: la identidad no cuadra, falla sin reintento, sin bajar ni sacar nada',
    j.state === 'failed' && j.error?.details?.reason === 'package_identity' && fotogramas === f0 && bajadas === b0 && JSON.stringify((await material(ids1[1])).variants) === antesDeA,
    `${j.state} ${j.error?.details?.reason}`);

  /* S2 · Un paquete bien formado con el vídeo de OTRA cuenta. */
  await crearTrabajoDePoster(E, ids1[1]);
  await trabajar();
  const jx = await trabajoDe(E, ids1[1]);
  check('S2) un paquete bien formado con el vídeo de OTRA cuenta: contesta como si no existiera, sin bajarlo, y el material ajeno no se toca',
    jx.state === 'failed' && jx.error?.details?.reason === 'source_not_found' && bajadas === b0 && fotogramas === f0 && JSON.stringify((await material(ids1[1])).variants) === antesDeA,
    `${jx.state} ${jx.error?.details?.reason}`);

  /* S3 · Un vídeo de otro almacén. */
  const idNube = `asset_${'c'.repeat(32)}`;
  base.docs.set(`assets/${idNube}`, { ...base.leer(`assets/${v12.producedAssetId}`), assetId: idNube, storageRef: { provider: 'cloudinary', bucket: 'nube/video', objectKey: 'videos/x.mp4' } });
  await crearTrabajoDePoster(E, idNube);
  await trabajar();
  const jn = await trabajoDe(E, idNube);
  check('S3) de un vídeo de otro almacén no se saca póster aquí: `source_not_supported`, sin bajar nada',
    P.porQueNoHayPoster(await material(idNube), E) === 'not_supported' && jn.state === 'failed' && jn.error?.details?.reason === 'source_not_supported' && bajadas === b0);

  /* S4 · En su sitio hay un objeto que no es su póster. */
  await lista(E, 13, UNO, { 'sh-0101': CLIP_MUDO });
  const [v13] = await videosDeLa(E, 13);
  const ruta13 = P.rutaDelPoster(E, v13.producedAssetId);
  objetos.set(ruta13, { bytes: Buffer.from('otra cosa'), contentType: 'image/jpeg', metadata: { weeMaterial: 'otra-cosa', firebaseStorageDownloadTokens: 'tk' } });
  await posters(E, 13);
  await trabajar();
  const j13 = await trabajoDe(E, v13.producedAssetId);
  const vista13 = await listar(E, 13);
  check('S4) si en su sitio hay un objeto que no es su póster, no se pisa ni se anota: `object_conflict`, sin reintento, y sin dirección',
    j13.state === 'failed' && j13.error?.details?.reason === 'object_conflict' && objetos.get(ruta13).bytes.toString() === 'otra cosa'
    && !(await suPoster(E, v13.producedAssetId)) && vista13.valor?.posters[0].state === 'failed' && !vista13.valor.posters[0].url, `${j13.state} ${j13.error?.details?.reason}`);

  /* S5 · Un vídeo que ya tiene el póster de OTRO. */
  await lista(E, 14, UNO, { 'sh-0101': CLIP_MUDO });
  const [v14] = await videosDeLa(E, 14);
  const ajena = { kind: 'poster', storageRef: { provider: 'r2', bucket: 'medios', objectKey: 'x/poster.jpg' }, mimeType: 'image/jpeg' };
  base.docs.set(`assets/${v14.producedAssetId}`, { ...base.leer(`assets/${v14.producedAssetId}`), variants: [ajena] });
  const p14 = await posters(E, 14);
  check('S5) un vídeo con el póster de OTRO (de Media Cloud): no se pide ni se pisa',
    p14.valor?.posters[0].state === 'not_supported' && p14.valor.posters[0].failure === 'foreign_poster' && p14.valor.requested === 0
    && JSON.stringify((await material(v14.producedAssetId)).variants) === JSON.stringify([ajena]) && !(await trabajoDe(E, v14.producedAssetId)));

  /* S6 · La dirección solo sale de SU objeto. */
  const o = objetos.get(P.rutaDelPoster(A, ids1[0]));
  const buena = o.metadata.weeMaterial;
  o.metadata.weeMaterial = 'otra';
  const sinDireccion = await listar(A, 1);
  o.metadata.weeMaterial = buena;
  const conDireccion = await listar(A, 1);
  const deEse = (r) => r.valor?.posters.find((p) => p.assetId === ids1[0]);
  check('S6) una dirección solo sale de un objeto con la marca de ESE póster',
    deEse(sinDireccion)?.state === 'ready' && !deEse(sinDireccion).url && !!deEse(conDireccion)?.url);

  /* S7 · Retirar el vídeo se lleva su póster. */
  const ruta9 = P.rutaDelPoster(C, videoC9.producedAssetId);
  const hayAntes = objetos.has(ruta9);
  const ret = await contenido.retirarMaterial(C, videoC9.producedAssetId);
  check('S7) retirar el vídeo borra también su póster: es una variante de la cuenta',
    hayAntes && ret.status === 'retirado' && ret.objetosBorrados === 2 && !objetos.has(ruta9) && !objetos.has(`users/${C}/ai-generations/${videoC9.producedAssetId}.mp4`));
  const ajenos = () => JSON.stringify(base.de('jobs').filter((d) => d.task !== 'media.video_poster' && d.task !== 'media.render'));
  const antesDeLaPasada = ajenos();
  const tras = await trabajar();
  check('S8) y la pasada no toca lo que no es suyo: los trabajos de IA quedan byte a byte como estaban',
    antesDeLaPasada.length > 2 && ajenos() === antesDeLaPasada && tras.mirados >= tras.dePoster + tras.deRender);
}

/* ═══ L · EL LATIDO Y LOS TOPES DEL EJECUTOR ═════════════════════════════ */
console.log('\n── L · El latido y los topes del ejecutor del póster ──');
{
  await lista(D, 15, UNO, { 'sh-0101': CLIP_MUDO });
  await posters(D, 15);
  const [v15] = await videosDeLa(D, 15);
  const job = await trabajoDe(D, v15.producedAssetId);
  const despacho = (extra = {}) => ({
    jobId: job.jobId, attemptId: `${job.jobId}:x`, attempt: 1, task: { name: 'media.video_poster' }, input: job.input, trace: job.trace,
    mode: 'async', idempotencyKey: 'k', timeoutMs: 5 * 60_000, deadlineAt: Date.now() + 60 * 60_000, ...extra,
  });
  /* FFmpeg de mentira SOLO para sacar el fotograma; las sondas son las de verdad. */
  const conFotograma = (f) => (argv) => (argv.includes('-frames:v') ? f(argv) : REAL(argv));
  let muertos = 0;
  const colgado = () => { let matar; const terminado = new Promise((r) => { matar = () => r({ codigo: null, stderr: '' }); }); return { terminado, matar: () => { muertos++; matar(); } }; };
  const sinPoster = async () => !(await suPoster(D, v15.producedAssetId)) && !objetos.has(P.rutaDelPoster(D, v15.producedAssetId));
  const ej = (extra) => RZ.crearEjecutorDePoster({ temporal: TMP_W, ...extra });

  let sacando = false;
  const perdida = await ej({ lanzar: conFotograma(() => { sacando = true; return colgado(); }), renovarCadaMs: 30 }).ejecutar(despacho(), { renovar: async () => !sacando });
  check('L1) si la concesión deja de ser suya mientras saca el fotograma, para FFmpeg: `lease_lost`, sin póster',
    perdida.outcome === 'failed' && perdida.error?.details?.reason === 'lease_lost' && muertos === 1 && await sinPoster(), `${perdida.error?.details?.reason} ${muertos}`);
  const alBajar = await ej({ lanzar: conFotograma(colgado), renovarCadaMs: 1 }).ejecutar(despacho(), { renovar: async () => false });
  check('L2) y si se pierde mientras baja y sondea el vídeo, ni lo intenta', alBajar.error?.details?.reason === 'lease_lost' && muertos === 1 && await sinPoster(), `${alBajar.error?.details?.reason} ${muertos}`);
  const vencido = await ej({ lanzar: conFotograma(colgado), renovarCadaMs: 60_000 }).ejecutar(despacho({ timeoutMs: 30_000 + 1_500 }), { renovar: async () => true });
  check('L3) si se acaba el tiempo del intento, para FFmpeg: `poster_timeout` —reintentable—, sin póster',
    vencido.error?.details?.reason === 'poster_timeout' && vencido.error.code === 'TIMEOUT' && muertos === 2 && await sinPoster(), `${vencido.error?.details?.reason} ${muertos}`);
  const sinTiempo = await ej({ lanzar: conFotograma(colgado), limite: () => Date.now() }).ejecutar(despacho(), { renovar: async () => true });
  check('L4) y si la invocación no deja tiempo, ni empieza: `no_time_for_poster`', sinTiempo.error?.details?.reason === 'no_time_for_poster' && muertos === 2);
  const falla = await ej({ lanzar: conFotograma(() => ({ terminado: Promise.resolve({ codigo: 1, stderr: 'Invalid data found when processing input' }), matar: () => {} })) })
    .ejecutar(despacho(), { renovar: async () => true });
  check('L5) FFmpeg que falla: `poster_failed`, reintentable, y NADA de lo que escribió sale de aquí',
    falla.error?.details?.reason === 'poster_failed' && falla.error.code === 'PROVIDER_ERROR' && !JSON.stringify(falla).includes('Invalid data') && await sinPoster());
  const basura = await ej({ lanzar: conFotograma((argv) => { fs.writeFileSync(argv[argv.length - 1], 'no es un jpeg'); return { terminado: Promise.resolve({ codigo: 0, stderr: '' }), matar: () => {} }; }) })
    .ejecutar(despacho(), { renovar: async () => true });
  check('L6) una salida que no es un JPEG del tamaño pedido no se guarda: `poster_unverifiable`, sin objeto', basura.error?.details?.reason === 'poster_unverifiable' && await sinPoster());
  const noEs = await ej({}).ejecutar({ ...despacho(), task: { name: 'media.render' } }, { renovar: async () => true });
  check('L7) el ejecutor del póster solo hace pósters', noEs.outcome === 'failed' && noEs.error?.details?.reason === 'not_a_poster');
  check('L8) y la carpeta temporal queda limpia también cuando falla', fs.readdirSync(TMP_W).length === 0, fs.readdirSync(TMP_W).join(','));
  const f0 = fotogramas;
  const bien = await ej({ lanzar: LANZAR }).ejecutar(despacho(), { renovar: async () => true });
  const otra = await ej({ lanzar: LANZAR }).ejecutar(despacho(), { renovar: async () => true });
  check('L9) con todo en orden, lo hace; y otra vez es el mismo póster, sin sacar otro',
    bien.outcome === 'succeeded' && otra.outcome === 'succeeded' && fotogramas === f0 + 1 && bien.result.outputRefs[0] === v15.producedAssetId
    && bien.result.metadata.width === 640 && bien.result.metadata.height === 360 && !!(await suPoster(D, v15.producedAssetId)));
}

/* ═══ G · LAS GUARDAS ════════════════════════════════════════════════════ */
console.log('\n── G · Lo que el póster no hace ──');
{
  const src = (f) => sinComentarios(leer(`functions/src/creator/${f}`));
  const poster = src('poster.ts');
  const todo = ['poster.ts', 'renderizador.ts', 'renders.ts'].map(src).join('\n');
  check('G1) ni Credits ni liquidación: ni reservar, ni cobrar, ni devolver',
    !/spendCredits|completeCredits|refundCredits|creditEngine|liquidacionDeWee|reembolsar|creditsBalance/.test(todo));
  check('G2) ni proveedores de IA ni el conductor: ni Router, ni Gateway, ni adaptadores',
    !/conductorDeWee|pedirMedio|engine\.generate|runCapability|ADAPTERS|DEFAULT_ROUTING|createRouter|videoEngine|fetchBytes\(/.test(todo));
  check('G3) FFmpeg lo lanza solo el renderizador, con lista y sin shell; el módulo del póster no lanza nada',
    !/child_process|spawn\(|ffmpeg-static/.test(poster) && /spawn\(binario, \[\.\.\.argv\], \{ shell: false/.test(src('renderizador.ts')) && !/shell: true|(?<!\.)\bexec(Sync|File)?\(/.test(todo));
  check('G4) ni `.run(` ni cargas perezosas; del renderizador, el póster solo importa un TIPO (sin ciclo)',
    !/\.run\(|\brequire\s*\(|\bimport\s*\(/.test(todo) && /import type \{ AlmacenDelRender \} from '\.\/renderizador';/.test(leer('functions/src/creator/poster.ts'))
    && !/from '\.\/renderizador'/.test(poster.replace(/import type \{ AlmacenDelRender \} from '\.\/renderizador';/, '')));
  check('G5) el Content Core no se toca: la variante se escribe con `anotarVariante`, tal cual',
    git(`diff --name-only ${ANTES} ${HASTA} -- functions/src/content functions/src/core`).trim() === '' && /anotarVariante/.test(src('renderizador.ts')));
  const anotarSrc = src('renderizador.ts').slice(src('renderizador.ts').indexOf('const anotarElPoster'), src('renderizador.ts').indexOf('export const guardarPoster'));
  check('G6) la variante no lleva dirección: la calcula quien lee, y no se guarda', anotarSrc.length > 100 && !/url|token/i.test(anotarSrc));
  check('G7) los módulos del póster están en la lista del motor, y el dinero no',
    ['functions/src/creator/poster.ts', 'functions/src/creator/renderizador.ts', 'functions/src/creator/renders.ts'].every((f) => TOCADOS_POR_EL_MOTOR.includes(f))
    && TOCADOS_POR_EL_MOTOR.every((f) => !DINERO.some((re) => re.test(f))));
  check('G8) ni una regla nueva: la variante vive en `assets` —la lee su dueño— y el objeto en la carpeta de la cuenta',
    git(`diff --name-only ${ANTES} ${HASTA} -- firestore.rules storage.rules`).trim() === '' && /match \/users\/\{userId\}\/ai-generations\/\{fileName\}/.test(leer('storage.rules')));
  const servicio = sinComentarios(leer('services/tomaService.ts'));
  const tarjeta = sinComentarios(leer('components/studio/produccion/ProductionShotCard.tsx'));
  check('G9) la app pide los pósters por la puerta y pinta su imagen; sin póster, el vídeo, como antes',
    /\(functions, 'renders', \{ timeout: 60_000 \}\)/.test(servicio) && /op: 'poster\.request', productionId/.test(servicio)
    && /video\.poster \? \(\s*<Image\s+source=\{\{ uri: video\.poster \}\}/.test(tarjeta) && /<Video\s+source=\{\{ uri: video\.url \}\}/.test(tarjeta)
    && /tomaService\.postersDeLaProduccion\(productionId\)/.test(leer('hooks/useVideosDeLaProduccion.ts')));
  check('G10) documentado', /### Fase 11 · /.test(leer('docs/FILMMAKER.md')) && /media\.video_poster/.test(leer('docs/FILMMAKER.md')) && /~poster\.jpg/.test(leer('docs/FILMMAKER.md')));
  check('G11) esta suite está en la cadena de `npm test`', /filmmaker-poster\.test\.mjs/.test(leer('functions/package.json')));
}

fs.rmSync(TMP, { recursive: true, force: true });
fs.rmSync(TMP_W, { recursive: true, force: true });
console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 11 · los pósters, con FFmpeg de verdad (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
