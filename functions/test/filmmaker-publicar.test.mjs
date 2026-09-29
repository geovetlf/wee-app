/**
 * FILMMAKER ENGINE · FASE 14 (D8) — PUBLICAR EL MONTAJE.
 *
 *   P · publicar: un Weël o un vídeo del Home, con la MISMA forma que escribe el
 *       compositor, el vídeo por su material y su dirección con token;
 *   I · idempotente: dos veces, a la vez, después de borrarla, y un documento
 *       ajeno en su sitio;
 *   D · la duración: la del montaje y la medida, en los dos destinos, con la
 *       tolerancia del renderizador;
 *   O · permisos y dueño: la cara, otra cuenta, sin sesión, datos sin forma;
 *   E · los estados: sin pedir, en cola, fallido, retirado, otro montaje, otro
 *       almacén, el archivo que no está o no es el suyo;
 *   N · sin efectos: ni Credits, ni trabajos, ni cupo, ni proveedores, ni tocar
 *       el material ni el registro, y los rechazos no escriben nada;
 *   G · las guardas: lo que importa, las operaciones de la puerta, las reglas de
 *       `posts`, el Content Core y el dinero, sin tocar.
 *
 * De verdad: la puerta `renders`, el render de la Fase 8 con FFmpeg
 * (`ffmpeg-static`), el Job Engine, el Content Core, productions, F1-A y la
 * cadena de F1-D, sobre un Firestore en memoria (el arnés de
 * `f1d-postcanary.test.mjs`, copiado tal cual). De mentira: el adaptador de
 * Seedance, lo que ModelArk contesta y el Storage (un mapa con la misma
 * precondición).
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

/* ═══ FASE 14 · lo que se prueba aquí ═══════════════════════════════════════ */
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const PB = lib('creator/publicacion.js');
const R = lib('creator/render.js');
const RZ = lib('creator/renderizador.js');
const RS = lib('creator/renders.js');
const { rutaDelResultado } = lib('content/materializador.js');
const { TOCADOS_POR_EL_MOTOR, DINERO } = await import('./motor-filmmaker-alcance.mjs');
const FFMPEG = require('ffmpeg-static');
/** El último commit antes de esta fase. */
const ANTES = '2df8fbe';
/** El commit de esta fase, cuando ya existe: lo que la fase tocó se mide en SU tramo. */
const HASTA = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 14 "').trim();

/* ═══ Vídeos de verdad, hechos aquí con FFmpeg ═══════════════════════════ */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fase14-'));
const TMP_W = fs.mkdtempSync(path.join(os.tmpdir(), 'fase14-trabajo-'));
const generarClip = (nombre, { seg = 4, w = 1280, h = 720 } = {}) => {
  const salida = path.join(TMP, nombre);
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostdin', '-y', '-f', 'lavfi', '-i', `testsrc2=size=${w}x${h}:rate=24:duration=${seg}`,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-an', salida], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`no se generó ${nombre}`);
  return fs.readFileSync(salida);
};
const CLIP = generarClip('mudo.mp4');
http.fetchBytes = async () => { descargas++; return { buffer: CLIP, contentType: 'video/mp4' }; };

/* El almacén de mentira sabe además bajar a disco y subir desde disco, con la misma precondición. */
const archivoDelArnes = cubo.file;
cubo.file = (ruta) => ({
  ...archivoDelArnes(ruta),
  async download({ destination }) {
    const o = objetos.get(ruta);
    if (!o) throw Object.assign(new Error('no existe'), { code: 404 });
    fs.writeFileSync(destination, o.bytes);
  },
});
cubo.upload = async (origen, { destination, metadata, preconditionOpts }) => {
  if (preconditionOpts?.ifGenerationMatch === 0 && objetos.has(destination)) throw Object.assign(new Error('precondición'), { code: 412 });
  objetos.set(destination, { bytes: fs.readFileSync(origen), contentType: metadata?.contentType, metadata: { ...(metadata?.metadata ?? {}) } });
};

/* ═══ Producciones con vídeo en sus planos y su montaje hecho ═══════════ */
const escena = (shots) => clon({
  ...M.produccionVacia({ title: 'El faro', aspectRatio: '16:9', resolution: '720p' }),
  intent: { objective: 'Un faro al amanecer' },
  scenes: [{ id: 'sc-0001', order: 0, title: 'Amanecer', description: 'El sol sale detrás del faro', shots }],
});
const planos = (n) => Array.from({ length: n }, (_, i) => ({ id: `sh-01${String(i + 1).padStart(2, '0')}`, order: i, durationSec: 4, description: `El faro, toma ${i + 1}` }));
const lista = async (uid, k, n) => {
  const shots = planos(n);
  await crear(uid, k, escena(shots));
  for (const s of shots) {
    const p = await pedir(uid, k, s.id);
    if (!p.rid) throw new Error(`no se pidió el plano ${s.id} de ${k}: ${codigo(p.q)} ${codigo(p.g)}`);
    termina(await tareaDe(uid, p.rid), 'succeeded');
  }
  await pasada();
  for (const s of shots) {
    const e = await enlazar(uid, k, 1, s.id);
    if (!e.ok) throw new Error(`no se enlazó ${s.id} de ${k}: ${codigo(e)}`);
  }
  return (await producciones.leerProduccion(uid, pid(k), { db: base })).view.revision;
};
const puerta = (uid, data) => intento(() => RS.renders.run({ auth: uid ? { uid } : undefined, data }));
const REAL = RZ.lanzarFfmpegDeWee(FFMPEG);
const trabajar = () => RS.pasadaDeRender({
  db: base, presupuestoMs: 25 * 60_000,
  ejecutor: RZ.crearEjecutorDeRender({ lanzar: REAL, temporal: TMP_W }),
  ejecutorDePoster: RZ.crearEjecutorDePoster({ lanzar: REAL, temporal: TMP_W }),
});
base.docs.set('aiSettings/render', { habilitado: true, cuentas: [A, B, C, D] });
/** Monta una producción y devuelve la vista de su render. `trabajo: false` lo deja en cola. */
const montada = async (uid, k, n, { trabajo = true } = {}) => {
  const revision = await lista(uid, k, n);
  const r = await puerta(uid, { op: 'render.request', productionId: pid(k), revision });
  if (!r.ok || !r.valor.render) throw new Error(`no se pidió el render de ${k}: ${JSON.stringify(r.ok ? r.valor : r.error?.message)}`);
  if (trabajo) await trabajar();
  const v = await puerta(uid, { op: 'render.status', productionId: pid(k), montage: r.valor.render.huella });
  return v.valor.render;
};
const publicar = (uid, k, huella, extra = {}) => puerta(uid, {
  op: 'render.publish', productionId: pid(k), montage: huella, destination: 'weels', face: uid, ...extra,
});
const publicacion = (postId) => base.leer(`posts/${postId}`);
const postsDe = () => base.de('posts');
const material = (assetId) => contenido.leerMaterial(assetId);
const rutaDe = (uid, assetId) => rutaDelResultado(uid, assetId, 'video/mp4');
const hayPost = (r) => r.ok && !!r.valor.published;
const refused = (r) => (r.ok ? r.valor.refused?.reason : `error:${r.error?.code}`);

const renderA1 = await montada(A, 1, 3);   // 12 s: cabe en un Weël
const renderA2 = await montada(A, 2, 4);   // 16 s: solo el Home
const renderC5 = await montada(C, 5, 1);   // hecho, y luego retirado
const renderD4 = await montada(D, 4, 1);   // hecho, para tocar lo que se guarda
/* El que se queda en cola, el ÚLTIMO: cada pasada del trabajador atiende todos los renders en cola. */
const renderC3 = await montada(C, 3, 1, { trabajo: false }); // en cola

/* Lo que no debe moverse al publicar: se mira antes y después. */
const transacciones0 = base.de('creditTransactions').length;
const trabajos0 = base.de('jobs').length;
const cupos0 = JSON.stringify(base.de('aiRateLimits'));
const descargas0 = descargas;
const materialA1_0 = JSON.stringify(await material(renderA1.assetId));
const registroA1_0 = JSON.stringify(base.leer(`productions/${pid(1)}/productionRenders/${renderA1.huella}`));

/* ═══ P · PUBLICAR ═══════════════════════════════════════════════════════ */
console.log('\n── P · Publicar: un Weël o el Home, con la forma del compositor ──');
{
  check('P0) los montajes están hechos: 12 s y 16 s, con su material',
    renderA1.state === 'completed' && renderA1.durationSec === 12 && !!renderA1.assetId
    && renderA2.state === 'completed' && renderA2.durationSec === 16 && renderC3.state === 'queued' && renderD4.state === 'completed',
    `${renderA1.state}/${renderA1.durationSec} · ${renderA2.state}/${renderA2.durationSec} · ${renderC3.state} · ${renderD4.state}`);
  const r = await publicar(A, 1, renderA1.huella, { text: 'Mi primer montaje #faro #amanecer' });
  const id = PB.idDeLaPublicacion(A, renderA1.assetId, 'weels', A);
  check('P1) un Weël: publicado, con su id calculado y sin «ya estaba»',
    hayPost(r) && r.valor.published.postId === id && r.valor.published.destination === 'weels' && r.valor.published.alreadyPublished === false, JSON.stringify(r.ok ? r.valor : r.error?.message));
  const p = publicacion(id);
  const token = objetos.get(rutaDe(A, renderA1.assetId))?.metadata?.firebaseStorageDownloadTokens;
  check('P2) el vídeo por su material, con la dirección del archivo y su token',
    !!p && p.videoAssetId === renderA1.assetId && !!token && p.videoUrl === http.downloadUrlFor(cubo.name, rutaDe(A, renderA1.assetId), token), p?.videoUrl);
  check('P3) Weël, público, en el muro general, desde Weë Studio, con la herramienta que se enseña',
    p?.isWeel === true && p.isPrivate === false && JSON.stringify(p.destinations) === '["general"]' && p.sourceSection === 'studio'
    && JSON.stringify(p.aiTools) === '["Weë Studio"]' && p.userId === A);
  check('P4) el texto, recortado, y sus hashtags con la expresión del compositor',
    p?.content === 'Mi primer montaje #faro #amanecer' && JSON.stringify(p.hashtags) === '["#faro","#amanecer"]');
  check('P5) los contadores a cero y las fechas de verdad (Timestamp)',
    ['likes', 'comments', 'shares', 'views', 'agreementCount', 'disagreementCount'].every((k) => p?.[k] === 0)
    && esTipo(p?.createdAt, 'Timestamp') && esTipo(p?.updatedAt, 'Timestamp'));
  const CLAVES = ['agreementCount', 'aiTools', 'comments', 'content', 'createdAt', 'destinations', 'disagreementCount', 'hashtags', 'imageUrls',
    'imageUrlsThumbnails', 'isPrivate', 'isWeel', 'likes', 'shares', 'sourceSection', 'updatedAt', 'userId', 'videoAssetId', 'videoUrl', 'views'];
  check('P6) exactamente las claves del compositor para un vídeo: ni una propia', JSON.stringify(Object.keys(p ?? {}).sort()) === JSON.stringify(CLAVES), Object.keys(p ?? {}).sort().join(','));
  const compositor = leer('screens/CreateScreen.tsx');
  check('P7) y esas claves son las que escribe el compositor (`postData`)',
    CLAVES.filter((k) => !['isWeel', 'videoAssetId', 'videoUrl', 'aiTools', 'sourceSection', 'destinations'].includes(k)).every((k) => new RegExp(`\\b${k}\\b`).test(compositor))
    && /isWeel: true/.test(compositor) && /videoAssetId/.test(compositor) && /destinations: destinos/.test(compositor));
  const h = await publicar(A, 1, renderA1.huella, { destination: 'home' });
  const ph = hayPost(h) ? publicacion(h.valor.published.postId) : undefined;
  check('P8) el Home: otro documento, el mismo vídeo, sin `isWeel`',
    hayPost(h) && h.valor.published.postId === PB.idDeLaPublicacion(A, renderA1.assetId, 'home', A) && h.valor.published.postId !== id
    && ph?.videoAssetId === renderA1.assetId && !('isWeel' in (ph ?? {})) && ph?.content === '' && JSON.stringify(ph?.hashtags) === '[]');
  const w = await publicar(A, 1, renderA1.huella, { face: `hidi_${A}` });
  check('P9) con el Perfil Weë: la cara Weë de la cuenta firma, en su propio documento',
    hayPost(w) && publicacion(w.valor.published.postId)?.userId === `hidi_${A}` && w.valor.published.postId === PB.idDeLaPublicacion(A, renderA1.assetId, 'weels', `hidi_${A}`));
  const largo = await publicar(A, 2, renderA2.huella, { destination: 'home', text: 'x'.repeat(500) });
  check('P10) 16 s al Home, con 500 caracteres de texto', hayPost(largo) && publicacion(largo.valor.published.postId)?.content.length === 500);
}

/* ═══ I · IDEMPOTENTE ════════════════════════════════════════════════════ */
console.log('\n── I · Idempotente: dos veces, a la vez, después de borrarla, y lo ajeno ──');
{
  const id = PB.idDeLaPublicacion(A, renderA1.assetId, 'weels', A);
  const antes = JSON.stringify(publicacion(id));
  const r = await publicar(A, 1, renderA1.huella, { text: 'Otro texto' });
  check('I1) la segunda vez contesta el mismo, «ya estaba», y no lo reescribe',
    hayPost(r) && r.valor.published.postId === id && r.valor.published.alreadyPublished === true && JSON.stringify(publicacion(id)) === antes);
  const cuantos = postsDe().length;
  const [x, y] = await Promise.all([publicar(A, 2, renderA2.huella, { destination: 'home', face: `hidi_${A}` }), publicar(A, 2, renderA2.huella, { destination: 'home', face: `hidi_${A}` })]);
  check('I2) dos a la vez: uno se escribe, el otro contesta «ya estaba»',
    hayPost(x) && hayPost(y) && x.valor.published.postId === y.valor.published.postId
    && [x.valor.published.alreadyPublished, y.valor.published.alreadyPublished].sort().join() === 'false,true' && postsDe().length === cuantos + 1);
  base.docs.delete(`posts/${id}`);
  const otra = await publicar(A, 1, renderA1.huella);
  check('I3) borrada por la persona, se puede volver a publicar', hayPost(otra) && otra.valor.published.alreadyPublished === false && !!publicacion(id));
  const ajenoId = PB.idDeLaPublicacion(D, renderD4.assetId, 'weels', D);
  base.docs.set(`posts/${ajenoId}`, { userId: 'otraPersona01', videoAssetId: 'asset_00000000000000000000000000000000', content: 'no es suyo' });
  const choca = await publicar(D, 4, renderD4.huella);
  check('I4) si en su sitio hay un documento que NO es el suyo, no lo da por publicado ni lo pisa',
    !choca.ok && publicacion(ajenoId)?.content === 'no es suyo', choca.ok ? JSON.stringify(choca.valor) : choca.error?.code);
  base.docs.delete(`posts/${ajenoId}`);
}

/* ═══ D · LA DURACIÓN ════════════════════════════════════════════════════ */
console.log('\n── D · La duración: la del montaje y la medida, con la tolerancia del renderizador ──');
{
  const r = await publicar(A, 2, renderA2.huella);
  check('D1) 16 s no caben en un Weël', refused(r) === 'too_long_for_weels' && !postsDe().some((p) => p.videoAssetId === renderA2.assetId && p.isWeel));
  const c = PB.porQueNoCabe;
  check('D2) el límite del Weël: 15 s del montaje, y lo medido hasta 15,25',
    c('weels', 15, 15.25) === undefined && c('weels', 15, 15.26) === 'too_long_for_weels' && c('weels', 15.01, undefined) === 'too_long_for_weels'
    && c('weels', 15, undefined) === undefined && c('weels', 12, 11.98) === undefined);
  check('D3) nada de duraciones absurdas: cero, negativas, NaN o infinitas',
    c('weels', 0, undefined) === 'too_long_for_weels' && c('weels', -3, undefined) === 'too_long_for_weels' && c('weels', Number.NaN, undefined) === 'too_long_for_weels'
    && c('home', Number.POSITIVE_INFINITY, undefined) === 'too_long' && c('weels', 10, Number.NaN) === 'too_long_for_weels');
  check('D4) el Home: lo que puede durar un render (600 s)',
    PB.LIMITES_DE_LA_PUBLICACION.maxHomeSec === R.LIMITES_DEL_RENDER.maxDuracionSec && c('home', 600, 600.25) === undefined && c('home', 600.5, undefined) === 'too_long' && c('home', 16, 16.1) === undefined);
  check('D5) la tolerancia es la del renderizador, no otra', PB.LIMITES_DE_LA_PUBLICACION.toleranciaSec === RZ.TOLERANCIA_DE_DURACION_SEC && PB.LIMITES_DE_LA_PUBLICACION.maxWeelSec === 15);
  const mD = await material(renderD4.assetId);
  base.docs.set(`assets/${renderD4.assetId}`, { ...mD, durationSec: 15.4 });
  const medida = await publicar(D, 4, renderD4.huella);
  check('D6) lo MEDIDO manda también: un archivo de 15,4 s no es un Weël aunque el montaje diga 4', refused(medida) === 'too_long_for_weels');
  base.docs.set(`assets/${renderD4.assetId}`, mD);
}

/* ═══ O · PERMISOS Y DUEÑO ═══════════════════════════════════════════════ */
console.log('\n── O · Permisos y dueño: la cara, otra cuenta, sin sesión, datos sin forma ──');
{
  check('O1) otra cuenta no publica un montaje ajeno: contesta lo mismo que si no existiera',
    refused(await publicar(B, 1, renderA1.huella, { face: B })) === 'render_not_found');
  check('O2) la cara tiene que ser de la cuenta: ni la de otra, ni su Weë, ni nada',
    refused(await publicar(A, 1, renderA1.huella, { face: B })) === 'face_not_allowed'
    && refused(await publicar(A, 1, renderA1.huella, { face: `hidi_${B}` })) === 'face_not_allowed'
    && refused(await publicar(A, 1, renderA1.huella, { face: '' })) === 'face_not_allowed'
    && refused(await publicar(A, 1, renderA1.huella, { face: 42 })) === 'face_not_allowed'
    && refused(await publicar(A, 1, renderA1.huella, { face: undefined })) === 'face_not_allowed');
  const sin = await publicar(undefined, 1, renderA1.huella);
  check('O3) sin sesión, nada', !sin.ok && sin.error?.code === 'unauthenticated');
  const malo = await puerta(A, { op: 'render.publish', productionId: pid(1), montage: 'no-es-una-huella', destination: 'weels', face: A });
  const sinProd = await puerta(A, { op: 'render.publish', montage: renderA1.huella, destination: 'weels', face: A });
  check('O4) un montaje sin forma o sin producción: datos no válidos',
    !malo.ok && malo.error?.code === 'invalid-argument' && !sinProd.ok && sinProd.error?.code === 'invalid-argument');
  check('O5) destinos que no existen',
    refused(await publicar(A, 1, renderA1.huella, { destination: 'stories' })) === 'invalid_destination'
    && refused(await publicar(A, 1, renderA1.huella, { destination: undefined })) === 'invalid_destination');
  check('O6) el texto: como mucho 500, y solo texto (antes que «ya estaba»)',
    refused(await publicar(A, 1, renderA1.huella, { text: 'x'.repeat(501) })) === 'invalid_text'
    && refused(await publicar(A, 1, renderA1.huella, { text: 12 })) === 'invalid_text'
    && refused(await publicar(A, 1, renderA1.huella, { text: { a: 1 } })) === 'invalid_text');
}

/* ═══ E · LOS ESTADOS ════════════════════════════════════════════════════ */
console.log('\n── E · Los estados: sin pedir, en cola, retirado, otro montaje, otro almacén, el archivo ──');
{
  check('E1) un montaje que nunca se pidió', refused(await publicar(A, 1, 'a'.repeat(64))) === 'render_not_found');
  const cola = await publicar(C, 3, renderC3.huella);
  check('E2) en cola: no se publica, y se dice en qué estado está', refused(cola) === 'render_not_completed' && cola.valor.refused.state === 'queued');
  const ret = await contenido.retirarMaterial(C, renderC5.assetId);
  const retirado = await publicar(C, 5, renderC5.huella);
  check('E3) retirado por la persona: el render ya no está hecho', ret.status === 'retirado' && refused(retirado) === 'render_not_completed' && retirado.valor.refused.state === 'failed', ret.status);
  const mD = await material(renderD4.assetId);
  const con = async (cambio, ruta = `assets/${renderD4.assetId}`) => { base.docs.set(ruta, { ...mD, ...cambio }); const r = await publicar(D, 4, renderD4.huella); base.docs.set(ruta, mD); return refused(r); };
  check('E4) un material que no es el de ESE montaje, o de esa producción',
    (await con({ metadata: { ...mD.metadata, montage: 'b'.repeat(64) } })) === 'material_mismatch'
    && (await con({ metadata: { ...mD.metadata, productionId: pid(1) } })) === 'material_mismatch'
    && (await con({ metadata: undefined })) === 'material_mismatch');
  check('E5) de otro almacén, o de otra carpeta: no se publica por aquí',
    (await con({ storageRef: { ...mD.storageRef, provider: 'cloudinary' } })) === 'material_not_supported'
    && (await con({ storageRef: { ...mD.storageRef, objectKey: `users/${A}/ai-generations/${renderD4.assetId}.mp4` } })) === 'material_not_supported');
  check('E6) en su carpeta pero en otro sitio: no es EL archivo del render',
    (await con({ storageRef: { ...mD.storageRef, objectKey: `users/${D}/ai-generations/otro.mp4` } })) === 'material_mismatch');
  check('E7) un material que no está listo: el render deja de estar hecho', (await con({ status: 'processing' })) === 'render_not_completed');
  const ruta = rutaDe(D, renderD4.assetId);
  const o = objetos.get(ruta);
  objetos.delete(ruta);
  const sinArchivo = refused(await publicar(D, 4, renderD4.huella));
  objetos.set(ruta, { ...o, metadata: { ...o.metadata, weeMaterial: 'asset_ffffffffffffffffffffffffffffffff' } });
  const otraMarca = refused(await publicar(D, 4, renderD4.huella));
  objetos.set(ruta, { ...o, metadata: { weeMaterial: renderD4.assetId } });
  const sinToken = refused(await publicar(D, 4, renderD4.huella));
  objetos.set(ruta, o);
  check('E8) el archivo: que no esté, que sea de otro material o que no tenga token → no se publica',
    sinArchivo === 'file_missing' && otraMarca === 'file_missing' && sinToken === 'file_missing', `${sinArchivo} · ${otraMarca} · ${sinToken}`);
  check('E9) y con todo en su sitio otra vez, sí', hayPost(await publicar(D, 4, renderD4.huella)));
  /*
   * E10 · LA SEGUNDA LECTURA CUENTA POR SÍ MISMA. El estado del render ya mira el
   * material; pero entre esa lectura y la de publicar puede cambiar (lo retiran,
   * lo reprocesan). Aquí el render sigue viéndolo listo y la lectura de publicar
   * no: tiene que decir que no.
   */
  const mismo = await material(renderD4.assetId);
  const directo = (cambio) => PB.publicarMontaje(base, { accountId: D }, { productionId: pid(4), huella: renderD4.huella, destino: 'home', cara: D }, {
    almacen: RZ.almacenDelRenderDeWee(), leer: async () => (cambio === null ? null : { ...mismo, ...cambio }),
  });
  const [sinListo, noVideo, ajeno, sinSitio, nada] = await Promise.all([
    directo({ status: 'processing' }), directo({ kind: 'image' }), directo({ ownerAccountId: A }), directo({ storageRef: undefined }), directo(null),
  ]);
  check('E10) si el material cambió entre las dos lecturas, la de publicar manda: ni listo, ni vídeo, ni suyo, ni en su sitio, ni existente',
    sinListo.motivo === 'material_not_ready' && noVideo.motivo === 'material_not_video' && ajeno.motivo === 'material_not_found'
    && sinSitio.motivo === 'material_not_supported' && nada.motivo === 'material_not_found',
    [sinListo, noVideo, ajeno, sinSitio, nada].map((r) => r.motivo).join(','));
}

/* ═══ N · SIN EFECTOS ════════════════════════════════════════════════════ */
console.log('\n── N · Sin efectos: ni Credits, ni trabajos, ni cupo, ni proveedores ──');
{
  const esperados = new Set([
    PB.idDeLaPublicacion(A, renderA1.assetId, 'weels', A), PB.idDeLaPublicacion(A, renderA1.assetId, 'home', A),
    PB.idDeLaPublicacion(A, renderA1.assetId, 'weels', `hidi_${A}`), PB.idDeLaPublicacion(A, renderA2.assetId, 'home', A),
    PB.idDeLaPublicacion(A, renderA2.assetId, 'home', `hidi_${A}`), PB.idDeLaPublicacion(D, renderD4.assetId, 'weels', D),
  ]);
  const ids = [...base.docs.keys()].filter((k) => k.startsWith('posts/')).map((k) => k.slice(6));
  check('N1) solo existen las publicaciones que se pidieron bien: los rechazos no escribieron nada',
    ids.length === esperados.size && ids.every((i) => esperados.has(i)), ids.join(','));
  check('N2) publicar no toca Credits', base.de('creditTransactions').length === transacciones0);
  check('N3) ni crea trabajos, ni gasta cupo, ni llama a ningún proveedor',
    base.de('jobs').length === trabajos0 && JSON.stringify(base.de('aiRateLimits')) === cupos0 && descargas === descargas0);
  check('N4) ni cambia el material ni el registro del render',
    JSON.stringify(await material(renderA1.assetId)) === materialA1_0 && JSON.stringify(base.leer(`productions/${pid(1)}/productionRenders/${renderA1.huella}`)) === registroA1_0);
}

/* ═══ G · LAS GUARDAS ════════════════════════════════════════════════════ */
console.log('\n── G · Las guardas: lo que importa, las operaciones, las reglas y el dinero ──');
{
  const src = sinComentarios(leer('functions/src/creator/publicacion.ts'));
  const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1]).sort();
  check('G1) publicar importa solo lo suyo: ni Credits, ni proveedores, ni el modelo `Publication`',
    JSON.stringify(imports) === JSON.stringify(['../content', '../content/materializador', '../engine/http', '../identity/compatibilidad', './render', './renderizador', 'crypto', 'firebase-admin/firestore'])
    && !/credits\/|spendCredits|creditEngine|engine\/providers|seedance|gateway|core\/content\/publication|crearTrabajo|conductor|fetchJson/i.test(src), imports.join(','));
  const puertaSrc = sinComentarios(leer('functions/src/creator/renders.ts'));
  const ops = [...puertaSrc.matchAll(/op === '([a-z.]+)'/g)].map((m) => m[1]);
  /*
   * Reanclada por nombre en la Fase 19 del motor (las voces del diálogo; encargo del 2026-09-28): la puerta gana una
   * séptima operación, `voice.plan`, que solo LEE el plan de voces de una producción guardada. La de publicar no cambia.
   */
  check('G2) la puerta `renders`: siete operaciones —la de publicar solo lleva montaje, destino, cara y texto—',
    JSON.stringify(ops) === JSON.stringify(['render.request', 'render.status', 'render.list', 'render.publish', 'poster.request', 'poster.list', 'voice.plan'])
    && /publicarMontaje\(\s*db,\s*quien,\s*\{ productionId: productionId as string, huella: huella as string, destino: data\.destination, cara: data\.face, texto: data\.text \},/.test(puertaSrc));
  const tramo = HASTA ? `${ANTES} ${HASTA}` : ANTES;
  check('G3) las reglas de `posts`, los índices y las del Storage no se tocan', git(`diff --name-only ${tramo} -- firestore.rules firestore.indexes.json storage.rules`).trim() === '');
  check('G4) ni el Content Core, ni el Job Engine, ni productions, ni F1-A',
    git(`diff --name-only ${tramo} -- functions/src/content functions/src/core functions/src/job functions/src/productions functions/src/filmmaker`).trim() === '');
  check('G5) ni el dinero', git(`diff --name-only ${tramo} -- functions/src/credits functions/src/core/financial functions/src/core/router.ts`).trim() === '');
  const servidor = git(`diff --name-only ${tramo} -- functions/src`).trim().split('\n').filter(Boolean).sort();
  check('G6) en el servidor, solo la puerta y el módulo nuevo (sin Function nueva: `index.ts` igual)',
    JSON.stringify(servidor) === JSON.stringify(['functions/src/creator/publicacion.ts', 'functions/src/creator/renders.ts']), servidor.join(','));
  check('G7) el módulo nuevo está en la lista del motor, y el dinero no',
    TOCADOS_POR_EL_MOTOR.includes('functions/src/creator/publicacion.ts') && TOCADOS_POR_EL_MOTOR.every((f) => !DINERO.some((re) => re.test(f))));
  check('G8) documentado', /### Fase 14 · /.test(leer('docs/FILMMAKER.md')) && /\| D8 \| [^\n]*\*\*decidida\*\* en la Fase 14/.test(leer('docs/FILMMAKER.md')));
  check('G9) esta suite está en la cadena de `npm test`', /filmmaker-publicar\.test\.mjs/.test(leer('functions/package.json')));
}

/* ═══ C · EN LA APP ══════════════════════════════════════════════════════ */
console.log('\n── C · En la app: el servicio, el hook y el panel ──');
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
    View: Caja, Text: Texto, TouchableOpacity: Toque, ScrollView: Caja, ActivityIndicator: () => hc('i'), StyleSheet: { create: (s) => s, flatten: (s) => s },
    Platform: { OS: 'web', select: (o) => o.web ?? o.default }, Dimensions: { get: () => ({ width: 1280, height: 800 }), addEventListener: () => ({ remove() {} }) },
  };
  const colores = new Proxy({}, { get: () => '#000000' });
  const cargarReal = crearCargador({ dobles: { 'react-native': rn } });
  const { crearTraductor } = cargarReal('i18n/traducir.ts');
  const formatoReal = cargarReal('i18n/formato.ts');
  const ES = cargarReal('i18n/textos/es/index.ts').es;
  const faltan = new Set();
  const t = crearTraductor('es', { es: ES }, { alFaltarUnaClave: (k) => faltan.add(k) });
  const formato = { numero: (v, o) => formatoReal.formatearNumero(v, 'es', o), lista: (c, tipo) => formatoReal.formatearLista(c, 'es', tipo) };

  /* El servicio, con Firebase doblado: se apunta todo lo que se pide. */
  const llamadas = [];
  let respuesta = async () => ({ data: {} });
  const dobles = {
    react: React,
    'react-native': rn,
    '@expo/vector-icons': { Ionicons: ({ name }) => hc('i', { 'data-icono': name }) },
    '@react-navigation/native': { useNavigation: () => ({ navigate() {} }) },
    'firebase/functions': { httpsCallable: (_f, nombre) => async (datos) => { llamadas.push({ nombre, datos }); return respuesta(nombre, datos); } },
    'firebase/firestore': { doc: (_d, ...p) => ({ path: p.join('/') }), getDoc: async () => ({ exists: () => false }), onSnapshot: () => () => {} },
    '../config/firebase': { db: {}, functions: {} },
    './assetsService': { assetsService: { urlDeEntrega: () => null } },
    '../../../contexts/ThemeContext': { useTheme: () => ({ theme: { colors: colores } }) },
    '../../contexts/ThemeContext': { useTheme: () => ({ theme: { colors: colores } }) },
    '../../../contexts/IdiomaContext': { useT: () => t, useIdioma: () => ({ t, formato, locale: 'es' }) },
    '../../contexts/IdiomaContext': { useT: () => t, useIdioma: () => ({ t, formato, locale: 'es' }) },
    '../../utils/scale': { scale: (x) => x },
    '../../../utils/scale': { scale: (x) => x },
    '../../../utils/notify': { notify: () => {}, confirmAction: async () => confirmar },
    '../../workspace/HojaInferior': { __esModule: true, default: ({ children }) => hc('section', null, children) },
    '../../workspace/SelectorDeOpciones': { __esModule: true, default: () => null },
    '../../workspace/ReproductorDeVideo': { __esModule: true, default: ({ nombre }) => hc('video', { 'aria-label': nombre }) },
    '../../workspace/MensajeDeEstado': { __esModule: true, default: ({ estado, detalle }) => hc('output', { 'data-estado': estado }, detalle ?? estado) },
    '../../../services/assetDownload': { descargarCreacion: async () => 'guardado' },
  };
  let confirmar = true;
  const cargar = crearCargador({ dobles });
  const { tomaService, montajeDe } = cargar('services/tomaService.ts');
  const HUELLA = 'c'.repeat(64);
  const PID = 'prod0000000000000000000001';

  respuesta = async () => ({ data: { render: { huella: HUELLA, revision: 4, state: 'queued', durationSec: 12, shots: 3, assetId: 'asset_no_viaja' } } });
  llamadas.length = 0;
  const pedido = await tomaService.pedirMontaje(PID, 4);
  check('C1) pedir el montaje: `renders` con la operación, la producción y la revisión, y nada más',
    llamadas.length === 1 && llamadas[0].nombre === 'renders' && JSON.stringify(llamadas[0].datos) === JSON.stringify({ op: 'render.request', productionId: PID, revision: 4 })
    && pedido.ok && pedido.montaje.state === 'queued' && !('assetId' in pedido.montaje), JSON.stringify(pedido));
  respuesta = async () => ({ data: { refused: { reason: 'daily_limit', limit: 5 } } });
  const topado = await tomaService.pedirMontaje(PID, 4);
  respuesta = async () => { throw Object.assign(new Error('x'), { code: 'functions/unavailable' }); };
  const sinRed = await tomaService.pedirMontaje(PID, 4);
  check('C2) un rechazo trae su código y su tope; sin red, «network»',
    !topado.ok && topado.motivo === 'daily_limit' && topado.limite === 5 && !sinRed.ok && sinRed.motivo === 'network');
  respuesta = async () => ({ data: { renders: [{ huella: HUELLA, revision: 4, state: 'completed', assetId: 'asset_a', durationSec: 12, shots: 3 }, { huella: 'corta', state: 'completed' }, { huella: HUELLA, state: 'inventado' }, null] } });
  const lista = await tomaService.montajesDeLaProduccion(PID);
  check('C3) la lista solo se queda con lo que tiene forma de montaje', lista.length === 1 && lista[0].assetId === 'asset_a' && llamadas.at(-1).datos.op === 'render.list');
  respuesta = async () => ({ data: { render: null } });
  llamadas.length = 0;
  const nadie = await tomaService.estadoDelMontaje(PID, HUELLA);
  check('C4) mirar un montaje: su huella, y `null` si no es de la cuenta',
    nadie === null && JSON.stringify(llamadas[0].datos) === JSON.stringify({ op: 'render.status', productionId: PID, montage: HUELLA }));
  respuesta = async () => ({ data: { published: { postId: 'fmpub_x', destination: 'weels', alreadyPublished: true } } });
  llamadas.length = 0;
  const pub = await tomaService.publicarMontaje(PID, HUELLA, 'weels', 'uidDeLaCara01');
  check('C5) publicar: el montaje, el destino y la cara —nada de url, material ni duración—, y «ya estaba» se entiende',
    JSON.stringify(llamadas[0].datos) === JSON.stringify({ op: 'render.publish', productionId: PID, montage: HUELLA, destination: 'weels', face: 'uidDeLaCara01' })
    && pub.ok && pub.postId === 'fmpub_x' && pub.yaEstaba === true);
  respuesta = async () => ({ data: { refused: { reason: 'too_long_for_weels' } } });
  const larga = await tomaService.publicarMontaje(PID, HUELLA, 'weels', 'uidDeLaCara01');
  check('C6) y un rechazo al publicar trae su código', !larga.ok && larga.motivo === 'too_long_for_weels');
  check('C7) `montajeDe` desconfía: sin huella de 64, estado raro o material sin estar hecho, no hay montaje o no hay material',
    montajeDe({ huella: 'x', state: 'completed' }) === null && montajeDe({ huella: HUELLA, state: 'raro' }) === null
    && !('assetId' in montajeDe({ huella: HUELLA, state: 'processing', assetId: 'asset_a' })));

  /* El bloque del panel, en cada fase. */
  const { BloqueDelMontaje } = cargar('components/studio/produccion/ProductionExportPanel.tsx');
  const llamadasDelHook = [];
  const montaje = (extra) => ({
    fase: 'sin_montaje', montaje: null, url: null, poster: null, motivo: null, limite: null, cabeEnUnWeel: false, publicacion: { fase: 'nada' },
    pedir: () => llamadasDelHook.push(['pedir']), publicar: (d) => llamadasDelHook.push(['publicar', d]), ...extra,
  });
  const dibujar = (m, hayCambios = false) => { botones = []; const html = renderToStaticMarkup(hc(BloqueDelMontaje, { espacio: { montaje: m, hayCambios } })); return { html, texto: html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '’').replace(/\s+/g, ' '), botones: botones.slice() }; };
  const boton = (d, etiqueta) => d.botones.find((b) => b.etiqueta === etiqueta);
  const hecho = (seg, extra = {}) => montaje({ fase: 'hecho', montaje: { huella: HUELLA, revision: 4, state: 'completed', assetId: 'asset_a', durationSec: seg, shots: 3 }, url: 'https://cdn.invalid/m.mp4', cabeEnUnWeel: seg <= 15, ...extra });

  const cerrada = dibujar(montaje({ fase: 'no_disponible' }));
  check('C8) con la puerta del render cerrada, el aviso de siempre y ningún botón', cerrada.texto.includes(ES.filmmaker.wsExportFinalSoon) && cerrada.botones.length === 0);
  const sin = dibujar(montaje({}));
  llamadasDelHook.length = 0;
  boton(sin, 'Crear el montaje final')?.tocar();
  check('C9) sin montaje: qué es, y «Crear el montaje final» lo pide', sin.texto.includes(ES.filmmaker.wsFinalCutWhat) && JSON.stringify(llamadasDelHook) === '[["pedir"]]');
  const conCambios = dibujar(montaje({}), true);
  check('C10) con cambios sin guardar, se pide guardar antes y el botón se apaga', conCambios.texto.includes(ES.filmmaker.saveFirst) && boton(conCambios, 'Crear el montaje final')?.apagado === true);
  check('C11) pidiendo y en marcha: el estado de siempre (preparando, en cola, generando)',
    /data-estado="preparando"/.test(dibujar(montaje({ fase: 'pidiendo' })).html)
    && /data-estado="en_cola"/.test(dibujar(montaje({ fase: 'en_marcha', montaje: { huella: HUELLA, state: 'queued', durationSec: 12, shots: 3, revision: 4 } })).html)
    && /data-estado="generando"/.test(dibujar(montaje({ fase: 'en_marcha', montaje: { huella: HUELLA, state: 'processing', durationSec: 12, shots: 3, revision: 4 } })).html));
  const listo = dibujar(hecho(12));
  check('C12) hecho: listo, con su duración en el idioma de quien mira, y los dos destinos',
    listo.texto.includes('Tu montaje final está listo (12 s).') && !!boton(listo, 'Publicar como Weël') && !!boton(listo, 'Publicar en Weë'), listo.texto);
  llamadasDelHook.length = 0;
  confirmar = false;
  boton(listo, 'Publicar como Weël').tocar();
  await new Promise((r) => setImmediate(r));
  const sinConfirmar = llamadasDelHook.length;
  confirmar = true;
  boton(listo, 'Publicar como Weël').tocar();
  await new Promise((r) => setImmediate(r));
  check('C13) publicar pide confirmación: sin ella no se publica nada; con ella, el Weël', sinConfirmar === 0 && JSON.stringify(llamadasDelHook) === '[["publicar","weels"]]');
  llamadasDelHook.length = 0;
  boton(listo, 'Publicar en Weë').tocar();
  await new Promise((r) => setImmediate(r));
  check('C14) y el Home, por su botón', JSON.stringify(llamadasDelHook) === '[["publicar","home"]]');
  const largo = dibujar(hecho(16));
  check('C15) un montaje de 16 s no ofrece el Weël: solo el Wäll', !boton(largo, 'Publicar como Weël') && !!boton(largo, 'Publicar en Weë'));
  const publicando = dibujar(hecho(12, { publicacion: { fase: 'publicando', destino: 'weels' } }));
  check('C16) mientras publica, los dos botones se apagan', boton(publicando, 'Publicar como Weël')?.apagado === true && boton(publicando, 'Publicar en Weë')?.apagado === true);
  const frase = (p) => dibujar(hecho(12, { publicacion: p })).texto;
  check('C17) lo que pasó al publicar, en una frase',
    frase({ fase: 'publicada' }).includes(ES.filmmaker.wsPublished) && frase({ fase: 'ya_estaba' }).includes(ES.filmmaker.wsPublishedAlready)
    && frase({ fase: 'rechazada', motivo: 'too_long_for_weels' }).includes(ES.filmmaker.wsPublishTooLongWeel)
    && frase({ fase: 'rechazada', motivo: 'file_missing' }).includes(ES.filmmaker.wsPublishNotReady)
    && frase({ fase: 'rechazada', motivo: 'network' }).includes(ES.filmmaker.wsPublishFailed));
  const rechazado = (motivo, limite = null) => dibujar(montaje({ fase: 'rechazado', motivo, limite }));
  const topeDelDia = rechazado('daily_limit', 5);
  check('C18) por qué no se pudo pedir, con su frase, y «Reintentar»',
    rechazado('not_ready').texto.includes(ES.filmmaker.wsFinalCutNotReady) && rechazado('resolution_required').texto.includes(ES.filmmaker.wsFinalCutNeedsResolution)
    && topeDelDia.texto.includes('Ya llegaste al máximo de montajes de hoy (5).') && rechazado('network').texto.includes(ES.filmmaker.wsFinalCutFailed)
    && !!boton(topeDelDia, t('common.retry')));
  const fallido = dibujar(montaje({ fase: 'fallido', montaje: { huella: HUELLA, state: 'failed', durationSec: 12, shots: 3, revision: 4 } }));
  check('C19) fallido: el estado de siempre y otra oportunidad', /data-estado="fallido"/.test(fallido.html) && !!boton(fallido, t('common.retry')));
  check('C20) ninguna clave sin frase en español', faltan.size === 0, [...faltan].join(', '));

  const hook = sinComentarios(leer('hooks/useMontajeFinal.ts'));
  check('C21) el hook pregunta SOLO mientras el montaje está en marcha, y deja de hacerlo al irse',
    /if \(!productionId \|\| !montaje \|\| !EN_MARCHA\.has\(montaje\.state\)\) return undefined;/.test(hook) && /return \(\) => clearTimeout\(reloj\);/.test(hook)
    && /EN_MARCHA: ReadonlySet<string> = new Set\(\['queued', 'processing', 'reconciling'\]\)/.test(hook));
  check('C22) publica con la cara activa, como el compositor, y la puerta cerrada es «no disponible»',
    /const cara = userProfile\?\.uid \|\| user\?\.uid \|\| null;/.test(hook) && /r\.motivo === 'render_not_enabled' \? 'no_disponible' : 'rechazado'/.test(hook));
  check('C23) la app no llama a `renders` desde el panel ni la pantalla: solo el servicio',
    !/httpsCallable|firebase\//.test(sinComentarios(leer('components/studio/produccion/ProductionExportPanel.tsx'))) && !/httpsCallable|firebase\//.test(hook)
    && /montaje = useMontajeFinal\(estado\.confirmada\?\.productionId \?\? null, estado\.confirmada\?\.revision \?\? null\)/.test(leer('screens/ProductionScreen.tsx')));
}

fs.rmSync(TMP, { recursive: true, force: true });
fs.rmSync(TMP_W, { recursive: true, force: true });
console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 14 · publicar el montaje (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
