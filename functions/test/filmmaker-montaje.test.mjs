/**
 * FILMMAKER ENGINE · FASE 7 (F5 DEL ROADMAP) — EL MONTAJE FINAL, COMO MANIFIESTO (2026-09-28).
 *
 *   M · el manifiesto, puro: los planos en el orden de la línea de tiempo de F1-A, con su vídeo, recortados, con su
 *       transición y el formato de salida; su huella; y lo que falta cuando no se puede montar;
 *   F · los argumentos de FFmpeg (decisión del usuario: FFmpeg propio): una lista para ejecutarse sin shell, con solo
 *       números y nombres fijos en el grafo de filtros, que cuadra con la duración del manifiesto;
 *   I · de punta a punta: una producción generada con el lote (Fase 6), sus tomas cerradas y enlazadas, y
 *       `shot.montage` diciendo qué se montaría;
 *   D · las guardas: nada se ejecuta, nada se cobra, nada se escribe.
 *
 * De verdad: la puerta del vídeo, el conductor, el Job Engine, el Credit Engine, productions, F1-A, el Content Core y
 * la callable `shots`, sobre un Firestore en memoria (el arnés de `f1d-postcanary.test.mjs`, copiado tal cual). De
 * mentira: el adaptador de Seedance, los bytes y el almacén de objetos. No hay FFmpeg en esta prueba: sus argumentos
 * se comprueban por su forma. Nada sale a la red, y no se usa ninguna credencial.
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

/* ═══ FASE 7 · lo que se prueba aquí ═══════════════════════════════════════ */
const comp = lib('creator/composicion.js');
const ff = lib('creator/ffmpeg.js');
const { TOCADOS_POR_EL_MOTOR, DINERO } = await import('./motor-filmmaker-alcance.mjs');

/* ═══ M · EL MANIFIESTO, PURO ════════════════════════════════════════════ */
console.log('\n── M · El manifiesto: qué se monta, en qué orden, con qué y cómo ──');
const linea = (tramos) => ({ totalSec: tramos.reduce((s, t) => Math.max(s, t.endSec), 0), segments: tramos });
const tres = linea([
  { unitId: 'sh-0101', sceneId: 'sc-0001', startSec: 0, endSec: 5, transitionOut: 'dissolve' },
  { unitId: 'sh-0102', sceneId: 'sc-0001', startSec: 5, endSec: 7.5 },
  { unitId: 'sh-0103', sceneId: 'sc-0001', startSec: 7.5, endSec: 13.5 },
]);
const videosDeUnidades = (...ids) => new Map(ids.map((u) => [u, `asset_${u.replace(/\D/g, '').padStart(32, '0')}`]));
const entradaBase = {
  productionId: 'prodmontaje00000000001', revision: 3, lineaDeTiempo: tres, formato: { aspectRatio: '16:9', resolution: '720p' },
  conSonido: new Map([['sh-0102', true]]), videos: videosDeUnidades('sh-0101', 'sh-0102', 'sh-0103'),
};
const listo = comp.manifiestoDeMontaje(entradaBase);
const m = listo.ok ? listo.manifiesto : null;
{
  check('M1) el tamaño del cuadro sale de la proporción y del lado corto de la resolución, siempre par',
    JSON.stringify(comp.dimensiones('16:9', '720p')) === JSON.stringify({ ancho: 1280, alto: 720 })
    && JSON.stringify(comp.dimensiones('9:16', '720p')) === JSON.stringify({ ancho: 720, alto: 1280 })
    && JSON.stringify(comp.dimensiones('1:1', '1080p')) === JSON.stringify({ ancho: 1080, alto: 1080 })
    && JSON.stringify(comp.dimensiones('4:5', '720p')) === JSON.stringify({ ancho: 720, alto: 900 })
    && JSON.stringify(comp.dimensiones('4k' === '4k' ? '16:9' : '', '4k')) === JSON.stringify({ ancho: 3840, alto: 2160 })
    && comp.dimensiones('3:2', '720p') === null && comp.dimensiones('16:9', undefined) === null);
  check('M2) los planos, en el orden de la línea de tiempo, cada uno con su vídeo y su tramo',
    listo.ok && m.version === 'fm-montaje-1' && m.clips.map((c) => `${c.unitId}@${c.inicioSec}-${c.finSec}:${c.duracionSec}`).join(' ') === 'sh-0101@0-5:5 sh-0102@5-7.5:2.5 sh-0103@7.5-13.5:6'
    && m.clips.every((c) => c.assetId === entradaBase.videos.get(c.unitId)), JSON.stringify(m?.clips.map((c) => c.unitId)));
  check('M3) el fundido encadenado de F1-A se monta solapando medio segundo; el corte, sin solape; el último, sin salida',
    m.clips[0].salida?.tipo === 'dissolve' && m.clips[0].salida.como === 'crossfade' && m.clips[0].salida.duracionSec === 0.5
    && m.clips[1].salida?.como === 'cut' && m.clips[1].salida.duracionSec === 0 && m.clips[2].salida === undefined);
  check('M4) y dura la línea de tiempo menos lo que se solapa: 13,5 − 0,5', m.duracionSec === 13 && m.duracionDeLaLineaDeTiempoSec === 13.5);
  check('M5) la salida: el cuadro de la producción, 24 fps, mp4 con h264, y con pista de sonido porque un plano la tiene',
    JSON.stringify(m.salida) === JSON.stringify({ aspectRatio: '16:9', resolution: '720p', ancho: 1280, alto: 720, fps: 24, contenedor: 'mp4', video: 'h264', audio: 'aac' })
    && m.clips[1].conSonido === true && m.clips[0].conSonido === false);
  const otraVez = comp.manifiestoDeMontaje({ ...entradaBase, videos: new Map([...entradaBase.videos].reverse()), conSonido: new Map([...entradaBase.conSonido]) });
  const otroTramo = comp.manifiestoDeMontaje({ ...entradaBase, lineaDeTiempo: linea([{ ...tres.segments[0], endSec: 4.9 }, ...tres.segments.slice(1)]) });
  check('M6) la huella: la misma entrada da la misma, en cualquier orden; cualquier cambio da otra',
    /^[0-9a-f]{64}$/.test(m.huella) && otraVez.ok && otraVez.manifiesto.huella === m.huella && otroTramo.ok && otroTramo.manifiesto.huella !== m.huella);
  const sinUno = comp.manifiestoDeMontaje({ ...entradaBase, videos: videosDeUnidades('sh-0101', 'sh-0103') });
  check('M7) sin el vídeo de un plano no se monta, y se dice cuál falta',
    !sinUno.ok && sinUno.motivo === 'not_ready' && JSON.stringify(sinUno.faltan) === JSON.stringify(['sh-0102']));
  check('M8) sin línea de tiempo, nada que montar; sin resolución, no se inventa; con una proporción que no se sabe montar, tampoco',
    comp.manifiestoDeMontaje({ ...entradaBase, lineaDeTiempo: null }).motivo === 'nothing_to_assemble'
    && comp.manifiestoDeMontaje({ ...entradaBase, formato: { aspectRatio: '16:9' } }).motivo === 'resolution_required'
    && comp.manifiestoDeMontaje({ ...entradaBase, formato: { aspectRatio: '3:2', resolution: '720p' } }).motivo === 'aspect_ratio_not_supported');
  const corto = comp.manifiestoDeMontaje({ ...entradaBase, lineaDeTiempo: linea([{ ...tres.segments[0], endSec: 0.6, transitionOut: 'fade' }, { ...tres.segments[1], startSec: 0.6, endSec: 3.1 }]), videos: videosDeUnidades('sh-0101', 'sh-0102') });
  check('M9) una transición nunca se come más de la mitad de un plano', corto.ok && corto.manifiesto.clips[0].salida.duracionSec === 0.3 && corto.manifiesto.clips[0].salida.como === 'fade_black');
  const intencion = comp.manifiestoDeMontaje({ ...entradaBase, lineaDeTiempo: linea([{ ...tres.segments[0], transitionOut: 'match_cut' }, { ...tres.segments[1], transitionOut: 'seamless' }, tres.segments[2]]) });
  check('M10) `match_cut` y `seamless` son intención de edición: se cortan, y se guarda cuál era',
    intencion.ok && intencion.manifiesto.clips[0].salida.como === 'cut' && intencion.manifiesto.clips[0].salida.tipo === 'match_cut' && intencion.manifiesto.clips[1].salida.tipo === 'seamless' && intencion.manifiesto.duracionSec === 13.5);
  const mudo = comp.manifiestoDeMontaje({ ...entradaBase, conSonido: new Map() });
  check('M11) sin ningún plano con sonido, la salida no lleva pista', mudo.ok && mudo.manifiesto.salida.audio === 'none');
}

/* ═══ F · LOS ARGUMENTOS DE FFMPEG ═══════════════════════════════════════ */
console.log('\n── F · Los argumentos de FFmpeg: una lista, sin shell, que cuadra con el manifiesto ──');
{
  const rutas = Object.fromEntries(m.clips.map((c, i) => [c.assetId, `/tmp/montaje/${i} con espacio;y "comillas".mp4`]));
  const argv = ff.argumentosDeFfmpeg(m, rutas, '/tmp/montaje/salida.mp4');
  const grafo = argv[argv.indexOf('-filter_complex') + 1];
  const entradas = argv.map((a, i) => (a === '-i' ? argv[i + 1] : null)).filter(Boolean);
  check('F1) una entrada por plano, en orden, y cada ruta es UN argumento tal cual —con espacios, punto y coma y comillas—',
    entradas.length === 3 && entradas.every((e, i) => e === rutas[m.clips[i].assetId]) && argv[0] === '-hide_banner' && argv.includes('-nostdin'));
  check('F2) y ninguna ruta, ni ningún identificador, entra en el grafo de filtros', !Object.values(rutas).some((r) => grafo.includes(r)) && !/sh-0|asset_|sc-0|prodmontaje/.test(grafo));
  check('F3) cada plano se recorta a su duración y se lleva al cuadro de salida, sin deformar',
    /\[0:v\]trim=start=0:duration=5\.000,setpts=PTS-STARTPTS,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720/.test(grafo)
    && /\[1:v\]trim=start=0:duration=2\.500/.test(grafo) && /\[2:v\]trim=start=0:duration=6\.000/.test(grafo));
  check('F4) el fundido encadenado solapa medio segundo desde el final del primero; el corte, concatena',
    /\[v0\]\[v1\]xfade=transition=fade:duration=0\.500:offset=4\.500\[vj1\]/.test(grafo) && /\[vj1\]\[v2\]concat=n=2:v=1:a=0\[vj2\]/.test(grafo), grafo.slice(0, 120));
  check('F5) el sonido: el del plano que lo tiene, silencio de su duración para los mudos, y un fundido de audio donde hay transición',
    /\[1:a\]atrim=start=0:duration=2\.500/.test(grafo) && /anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=5\.000[^;]*\[a0\]/.test(grafo)
    && /\[a0\]\[a1\]acrossfade=d=0\.500\[aj1\]/.test(grafo) && argv.includes('[aout]') && argv.includes('aac'));
  check('F6) la salida: h264, yuv420p, 24 fps, arranque rápido, y cortada a lo que dura el manifiesto',
    argv.join(' ').includes('-r 24 -c:v libx264') && argv.includes('yuv420p') && argv.includes('+faststart') && argv[argv.indexOf('-t') + 1] === '13.000' && argv[argv.length - 1] === '/tmp/montaje/salida.mp4');
  check('F7) y la cuenta de los argumentos es la del manifiesto', ff.duracionDelMontaje(m) === m.duracionSec);
  const mudo = comp.manifiestoDeMontaje({ ...entradaBase, conSonido: new Map() }).manifiesto;
  const argvMudo = ff.argumentosDeFfmpeg(mudo, rutas, '/tmp/s.mp4');
  check('F8) sin sonido, ni pistas de audio ni silencios: `-an`', argvMudo.includes('-an') && !argvMudo.join(' ').includes('anullsrc') && !argvMudo.includes('[aout]'));
  const lanza = (fn) => { try { fn(); return false; } catch { return true; } };
  check('F9) una entrada que falta, una salida sin forma o una duración imposible: se para, no se adivina',
    lanza(() => ff.argumentosDeFfmpeg(m, { [m.clips[0].assetId]: '/a.mp4' }, '/s.mp4')) && lanza(() => ff.argumentosDeFfmpeg(m, rutas, ''))
    && lanza(() => ff.argumentosDeFfmpeg({ ...m, clips: [{ ...m.clips[0], duracionSec: -1 }] }, rutas, '/s.mp4'))
    && lanza(() => ff.argumentosDeFfmpeg({ ...m, clips: [] }, rutas, '/s.mp4')) && lanza(() => ff.argumentosDeFfmpeg(m, { ...rutas, [m.clips[0].assetId]: 'a\0b' }, '/s.mp4')));
  check('F10) en el grafo solo hay números y nombres de la tabla', /^[\w\[\]:=.,;()\/+*\- ]+$/.test(grafo) && Object.values(ff.XFADE).every((x) => /^[a-z]+$/.test(x)), grafo.match(/[^\w\[\]:=.,;()\/+*\- ]/g)?.join(''));
}

/* ═══ I · DE PUNTA A PUNTA ═══════════════════════════════════════════════ */
console.log('\n── I · Una producción generada con el lote, enlazada, y lo que se montaría ──');
{
  const conTransicion = clon({
    ...M.produccionVacia({ title: 'El faro', aspectRatio: '16:9', resolution: '720p' }),
    intent: { objective: 'Un faro al amanecer' },
    scenes: [{
      id: 'sc-0001', order: 0, title: 'Amanecer', description: 'El sol sale detrás del faro',
      shots: [
        { id: 'sh-0101', order: 0, durationSec: 5, description: 'Una farera sube la escalera del faro', visual: { creative: { version: 1, transition: { type: 'dissolve' } } } },
        { id: 'sh-0102', order: 1, durationSec: 2.5, description: 'La lámpara se enciende', audio: { withSound: true } },
        { id: 'sh-0103', order: 2, durationSec: 6, description: 'El mar entero al amanecer' },
      ],
    }],
  });
  await crear(A, 1, conTransicion);
  const revision = (await producciones.leerProduccion(A, pid(1), { db: base })).view.revision;
  const montaje = (uid, productionId = pid(1), rev = revision) => intento(() => shotsPuerta.shots.run({ auth: { uid }, data: { op: 'shot.montage', productionId, revision: rev } }));
  const antes = await montaje(A);
  check('I1) sin vídeos todavía: no se puede montar, y se dice qué falta',
    antes.ok && antes.valor.montage.ready === false && antes.valor.montage.reason === 'not_ready' && JSON.stringify(antes.valor.montage.missing) === JSON.stringify(['sh-0101', 'sh-0102', 'sh-0103']), JSON.stringify(antes.valor ?? codigo(antes)));
  const pedido = { productionId: pid(1), revision, quality: 'standard' };
  const q = await intento(() => video.generateVideo.run({ auth: { uid: A }, data: { produccion: pedido, cotizar: true } }));
  const g = await intento(() => video.generateVideo.run({ auth: { uid: A }, data: { produccion: pedido, creditosCotizados: q.valor?.total?.credits } }));
  check('I2) el lote de la Fase 6 las pide las tres', g.ok && g.valor.started === 3, codigo(g));
  for (const u of ['sh-0101', 'sh-0102', 'sh-0103']) termina(await tareaDe(A, toma.requestIdDeToma(A, pid(1), u, 1)), 'succeeded');
  await pasada();
  const enCasa = await montaje(A);
  check('I3) cobradas pero sin enlazar: todavía no se monta —el plano no tiene su vídeo—',
    enCasa.ok && enCasa.valor.montage.ready === false && enCasa.valor.montage.missing.length === 3);
  for (const u of ['sh-0101', 'sh-0102', 'sh-0103']) await enlazar(A, 1, 1, u);
  const listoDeVerdad = await montaje(A);
  const mm = listoDeVerdad.ok && listoDeVerdad.valor.montage.ready ? listoDeVerdad.valor.montage.manifest : null;
  const puestos = await Promise.all(['sh-0101', 'sh-0102', 'sh-0103'].map((u) => toma.nodoDeLaUnidad(base, A, { productionId: pid(1), unitId: u })));
  check('I4) enlazadas: el manifiesto, con los vídeos que tienen puestos los planos, en orden',
    !!mm && mm.clips.map((c) => c.unitId).join(',') === 'sh-0101,sh-0102,sh-0103' && mm.clips.every((c, i) => c.assetId === puestos[i]?.producedAssetId), JSON.stringify(listoDeVerdad.valor?.montage ?? codigo(listoDeVerdad)).slice(0, 200));
  const segmentos = Rq.requisitosDeProduccion(conTransicion).requirements.timeline.segments;
  check('I5) y con la línea de tiempo de F1-A: sus tramos, su fundido encadenado y su sonido',
    mm.clips.every((c, i) => c.inicioSec === segmentos[i].startSec && c.finSec === segmentos[i].endSec) && mm.clips[0].salida.tipo === 'dissolve'
    && mm.clips[1].conSonido === true && mm.salida.audio === 'aac' && mm.duracionSec === 13 && mm.revision === revision && mm.productionId === pid(1));
  const argv = ff.argumentosDeFfmpeg(mm, Object.fromEntries(mm.clips.map((c, i) => [c.assetId, `/tmp/${i}.mp4`])), '/tmp/final.mp4');
  check('I6) y de él salen los argumentos de FFmpeg que lo montarían', argv.filter((a) => a === '-i').length === 3 && argv[argv.length - 1] === '/tmp/final.mp4');
  const ajena = await montaje(B);
  const otraRevision = await montaje(A, pid(1), revision + 1);
  const mal = await montaje(A, pid(1), -1);
  check('I7) de otra cuenta, no hay producción; en otra revisión, cambió; sin forma, no',
    ajena.ok && ajena.valor.montage.reason === 'production_not_found' && otraRevision.ok && otraRevision.valor.montage.reason === 'production_changed'
    && !mal.ok && mal.error?.code === 'invalid-argument');
  const huellaAntes = JSON.stringify([...base.docs.entries()]);
  const postsAntes = posts.length;
  await montaje(A);
  check('I8) componer el montaje no cambia nada: ni un documento, ni un POST', JSON.stringify([...base.docs.entries()]) === huellaAntes && posts.length === postsAntes);
}

/* ═══ D · LAS GUARDAS ════════════════════════════════════════════════════ */
console.log('\n── D · Nada se ejecuta, nada se cobra, nada se escribe ──');
{
  const COMP = sinComentarios(leer('functions/src/creator/composicion.ts'));
  const FF = sinComentarios(leer('functions/src/creator/ffmpeg.ts'));
  /* El `.update(` de la huella es de un hash, no de Firestore: se quita antes de mirar. */
  check('D1) el manifiesto solo lee y calcula: ni escribe, ni cobra, ni genera, ni ejecuta procesos',
    !/\.(set|update|create|delete)\(|runTransaction|batch\(|spendCredits|refundCredits|completeCredits|creditEngine|generateVideo|pedirMedio|child_process|spawn|exec\(/
      .test(COMP.replace(/createHash\('sha256'\)\.update\(/g, 'hash(')));
  check('D2) y lo puro es puro: sin reloj ni azar', !/Date\.now\(|new Date\(|Math\.random\(|randomUUID/.test(COMP));
  check('D3) los argumentos de FFmpeg no ejecutan nada ni tocan disco ni red', !/child_process|spawn|exec|require\(|from 'fs'|from 'node:fs'|fetch\(|http/.test(FF.replace(/'-hide_banner'/g, '')));
  check('D4) la puerta del montaje solo lee', /if \(op === 'shot\.montage'\)/.test(sinComentarios(leer('functions/src/shots/puerta.ts'))) && /componerMontaje\(db, \{ uid: request\.auth\.uid, accountId \}/.test(sinComentarios(leer('functions/src/shots/puerta.ts'))));
  check('D5) los módulos nuevos están en la lista del motor, y el dinero no',
    ['functions/src/creator/composicion.ts', 'functions/src/creator/ffmpeg.ts'].every((f) => TOCADOS_POR_EL_MOTOR.includes(f)) && TOCADOS_POR_EL_MOTOR.every((f) => !DINERO.some((re) => re.test(f))));
  check('D6) documentado', /### Fase 7 · /.test(leer('docs/FILMMAKER.md')) && /shot\.montage/.test(leer('docs/FILMMAKER.md')));
  check('D7) esta suite está en la cadena de `npm test`', /filmmaker-montaje\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 7 · el montaje final, como manifiesto y argumentos de FFmpeg (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
