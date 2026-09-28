/**
 * FILMMAKER ENGINE · FASE 5 — EL REQUISITO DE CADA PLANO LO CALCULA EL SERVIDOR (2026-09-28).
 *
 * Decisión del usuario: la valla G12 se amplía para que el servidor calcule con F1-A el requisito de cada plano de la
 * producción GUARDADA, en la revisión pedida. De él sale el texto que va al proveedor, la duración, el formato y las
 * calidades; el de la app solo se compara, y si no es el mismo no se genera —ni reserva, ni cupo—.
 *
 *   R · el mismo requisito: el del servidor y el de la app son iguales, unidad a unidad, en producciones de verdad;
 *   T · el texto que sale hacia el proveedor es el del requisito del servidor;
 *   M · lo que la app mande de más —otro texto, otra duración, referencias coladas— se para antes del dinero;
 *   V · la revisión: una producción que cambió entre la cotización y la generación no se genera;
 *   G · las guardas: solo lectura, una puerta con nombre y los documentos.
 *
 * De verdad: la puerta del vídeo, el conductor, el Job Engine, el Credit Engine, productions, F1-A y el Content Core,
 * sobre un Firestore en memoria (el arnés de `f1d-postcanary.test.mjs`, copiado tal cual). De mentira: el adaptador
 * de Seedance, los bytes y el almacén de objetos. Nada sale a la red, y no se usa ninguna credencial.
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

/* ═══ FASE 5 · lo que se prueba aquí ═══════════════════════════════════════ */
const { requisitoDelServidor, mismoRequisito } = lib('creator/requisitoDelServidor.js');
const { TOCADOS_POR_EL_MOTOR, DINERO } = await import('./motor-filmmaker-alcance.mjs');

/* Una producción con de todo: personaje, lugar, objeto, dirección creativa, sonido y una escena sin planos. */
const rico = () => clon({
  ...M.produccionVacia({ title: 'El faro', aspectRatio: '16:9', resolution: '720p' }),
  intent: { objective: 'Un faro al amanecer' },
  creativeDirection: { visualStyle: 'cinematográfico', mood: 'sereno', cinematography: { version: 1, lighting: { type: 'golden_hour' }, shot: { type: 'wide' } } },
  characters: [{ id: 'char-mar', name: 'Marina', identityDescription: 'farera de sesenta años', appearance: { wardrobe: { description: 'impermeable azul' } } }],
  locations: [{ id: 'loc-faro', name: 'El faro', setting: 'exterior', description: 'un faro blanco sobre un acantilado' }],
  objects: [{ id: 'obj-lampara', name: 'Lámpara', kind: 'prop' }],
  scenes: [
    {
      id: 'sc-0001', order: 0, title: 'Amanecer', description: 'El sol sale detrás del faro', locationId: 'loc-faro', timeOfDay: 'dawn', weather: 'clear', characterIds: ['char-mar'],
      shots: [
        { id: 'sh-0101', order: 0, durationSec: 5, description: 'Marina sube la escalera del faro', actions: ['sube despacio'], audio: { withSound: true } },
        { id: 'sh-0102', order: 1, durationSec: 2.5, description: 'La lámpara se enciende', objectIds: ['obj-lampara'] },
        { id: 'sh-0103', order: 2, durationSec: 20, description: 'El mar entero al amanecer' },
      ],
    },
    { id: 'sc-0002', order: 1, title: 'Mediodía', description: 'Las gaviotas vuelan sobre el faro', locationId: 'loc-faro', timeOfDay: 'midday', durationSec: 6, shots: [] },
  ],
});
const unidadesDe = (prod) => { const r = Rq.requisitosDeProduccion(prod); return r.ok ? r.requirements.shots : []; };
await crear(A, 1, conFaro());
await crear(A, 2, rico());

/* ═══ R · EL MISMO REQUISITO ═════════════════════════════════════════════ */
console.log('\n── R · El requisito del servidor es el de la app, unidad a unidad ──');
{
  let comparadas = 0;
  const distintas = [];
  let ejemplo = null;
  for (const k of [1, 2]) {
    const v = await producciones.leerProduccion(A, pid(k), { db: base });
    for (const s of unidadesDe(v.view.production)) {
      const servidor = await requisitoDelServidor(base, A, { productionId: pid(k), sceneId: s.sceneId, unitId: s.unitId, revision: v.view.revision });
      const app = plano.leerRequisitoDePlano(clon(s));
      comparadas++;
      if (!ejemplo && servidor.ok) ejemplo = { servidor: servidor.requisito, app };
      if (!servidor.ok || !mismoRequisito(servidor.requisito, app) || plano.componerPromptDePlano(servidor.requisito) !== plano.componerPromptDePlano(app)) distintas.push(`${k}/${s.unitId}`);
    }
  }
  check('R1) en producciones de verdad —una sencilla y otra con personaje, lugar, objeto, dirección y una escena sin planos—, el requisito del servidor es el de la app, y su texto también',
    comparadas === 6 && distintas.length === 0, `${comparadas} unidades · distintas: ${distintas.join(', ') || 'ninguna'}`);
  const alReves = (x) => (Array.isArray(x) ? x.map(alReves) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).reverse().map((k) => [k, alReves(x[k])])) : x);
  check('R2) el orden de los campos no cuenta; cualquier dato, sí',
    mismoRequisito(ejemplo.app, alReves(ejemplo.app)) && !mismoRequisito(ejemplo.app, { ...ejemplo.app, descripcion: 'otra cosa' }) && !mismoRequisito(ejemplo.app, { ...ejemplo.app, duracionSec: 1 }));
  const v1 = await producciones.leerProduccion(A, pid(1), { db: base });
  const ajena = await requisitoDelServidor(base, B, { productionId: pid(1), sceneId: 'sc-0001', unitId: 'sh-0101', revision: v1.view.revision });
  const otraRevision = await requisitoDelServidor(base, A, { productionId: pid(1), sceneId: 'sc-0001', unitId: 'sh-0101', revision: v1.view.revision + 1 });
  const otraUnidad = await requisitoDelServidor(base, A, { productionId: pid(1), sceneId: 'sc-0001', unitId: 'sh-9999', revision: v1.view.revision });
  check('R3) de otra cuenta no hay producción; en otra revisión, la producción cambió; y una unidad que no está, no está',
    !ajena.ok && ajena.motivo === 'production_not_found' && !otraRevision.ok && otraRevision.motivo === 'production_changed' && !otraRevision.causa
    && !otraUnidad.ok && otraUnidad.motivo === 'unit_not_found');
}

/* ═══ T · EL TEXTO QUE SALE ══════════════════════════════════════════════ */
console.log('\n── T · El texto que va al proveedor es el del requisito del servidor ──');
{
  const r = await pedir(A, 2, 'sh-0101');
  check('T1) con el requisito honrado, la toma se cotiza y se genera como siempre', r.g?.ok && r.g.valor.status === 'ACCEPTED', codigo(r.g ?? r.q));
  const v = await producciones.leerProduccion(A, pid(2), { db: base });
  const servidor = await requisitoDelServidor(base, A, { productionId: pid(2), sceneId: 'sc-0001', unitId: 'sh-0101', revision: v.view.revision });
  const enviado = posts[posts.length - 1]?.input?.prompt;
  check('T2) y lo que recibe el proveedor es EXACTAMENTE el texto del requisito del servidor', servidor.ok && typeof enviado === 'string' && enviado === plano.componerPromptDePlano(servidor.requisito),
    `${String(enviado).slice(0, 80)}…`);
}

/* ═══ M · LO QUE LA APP MANDE DE MÁS ═════════════════════════════════════ */
console.log('\n── M · Lo que la app mande distinto de lo guardado se para antes del dinero ──');
{
  const pl = await plan(A, 1, 'sh-0102');
  const antes = { posts: posts.length, saldo: saldo(A), cupo: cupoDeVideo(A) };
  const otroTexto = { ...pl, requirement: { ...pl.requirement, input: { ...pl.requirement.input, description: 'Otra cosa que no está guardada' } } };
  const q1 = await cotizar(A, otroTexto);
  check('M1) otro texto: la cotización dice que la producción cambió —con su causa— y no da precio',
    q1.ok && q1.valor.allowed === false && q1.valor.reason === 'production_changed' && q1.valor.detail?.cause === 'requirement_mismatch' && q1.valor.credits === undefined,
    JSON.stringify(q1.valor ?? codigo(q1)).slice(0, 200));
  const g1 = await generar(A, { ...otroTexto, take: 1 }, 1);
  check('M2) y la generación se para igual', !g1.ok && motivo(g1) === 'production_changed' && g1.error?.details?.cause === 'requirement_mismatch', codigo(g1));
  const g2 = await generar(A, { ...pl, requirement: { ...pl.requirement, durationSec: 1 }, take: 1 }, 1);
  check('M3) otra duración —para pagar menos— tampoco', !g2.ok && motivo(g2) === 'production_changed' && g2.error?.details?.cause === 'requirement_mismatch', codigo(g2));
  const colado = clon(pl.requirement);
  colado.input.references = [{ referenceId: 'r', definition: { id: 'r', kind: 'image' } }];
  const g3 = await generar(A, { ...pl, requirement: colado, take: 1 }, 1);
  check('M4) ni referencias coladas', !g3.ok && motivo(g3) === 'production_changed' && g3.error?.details?.cause === 'requirement_mismatch', codigo(g3));
  check('M5) y nada de eso gastó un POST, un Credit o un cupo', posts.length === antes.posts && saldo(A) === antes.saldo && cupoDeVideo(A) === antes.cupo);
  const bien = await cotizar(A, pl);
  check('M6) con lo guardado, la misma unidad se cotiza bien', bien.ok && bien.valor.allowed === true && typeof bien.valor.credits === 'number', codigo(bien));
  /*
   * Lo guardado deja de ser una producción que F1-A pueda leer —aquí, a mano: una duración que no es un número—,
   * pero la unidad sigue ahí. El servidor no puede calcular su requisito, y entonces NO se genera con el de la app.
   */
  await crear(A, 3, conFaro());
  const pl3 = await plan(A, 3, 'sh-0101');
  const escena3 = base.docs.get(`productions/${pid(3)}/productionScenes/sc-0001`);
  escena3.shots = escena3.shots.map((s) => (s.id === 'sh-0101' ? { ...s, durationSec: 'cuatro' } : s));
  const antes3 = { posts: posts.length, saldo: saldo(A), cupo: cupoDeVideo(A) };
  const q3 = await cotizar(A, pl3);
  const g3b = await generar(A, { ...pl3, take: 1 }, 1);
  check('M7) si el servidor no puede calcular el requisito, no se genera con el de la app: ni precio, ni POST, ni Credit, ni cupo',
    q3.ok && q3.valor.allowed === false && !g3b.ok
    && posts.length === antes3.posts && saldo(A) === antes3.saldo && cupoDeVideo(A) === antes3.cupo,
    `${q3.ok ? q3.valor.reason : codigo(q3)} · ${codigo(g3b)}`);
}

/* ═══ V · LA REVISIÓN ════════════════════════════════════════════════════ */
console.log('\n── V · Lo guardado en OTRA revisión no sirve ──');
{
  const pl = await plan(A, 1, 'sh-0102');
  const g = await generar(A, { ...pl, revision: pl.revision + 1, take: 1 }, 1);
  check('V1) una revisión que no es la guardada: la producción cambió, sin causa de requisito', !g.ok && motivo(g) === 'production_changed' && g.error?.details?.cause === undefined, codigo(g));
}

/* ═══ G · LAS GUARDAS ════════════════════════════════════════════════════ */
console.log('\n── G · Solo lectura, una puerta con nombre y los documentos ──');
{
  const src = sinComentarios(leer('functions/src/creator/requisitoDelServidor.ts'));
  check('G1) solo lee y calcula: ni escribe, ni cobra, ni genera, ni aplica operaciones',
    !/\.(set|update|create|delete)\(|runTransaction|batch\(|spendCredits|refundCredits|completeCredits|creditEngine|generateVideo|pedirMedio|conductorDeWee|aplicarOperacion/.test(src));
  check('G2) lee la producción con el lector de productions —con su dueño— y calcula con F1-A',
    /await leerProduccion\(accountId, u\.productionId, \{ db \}\)/.test(src) && /requisitosDeProduccion\(leida\.view\.production\)/.test(src));
  check('G3) y el suyo y el de la app se leen con la MISMA función', /leerRequisitoDePlano\(JSON\.parse\(JSON\.stringify\(deLaUnidad\)\)\)/.test(src));
  const VIDEO = sinComentarios(leer('functions/src/creator/video.ts'));
  check('G4) la puerta del vídeo usa el del servidor para todo, y el de la app solo para comparar',
    /const requisito = delServidor\?\.ok \? delServidor\.requisito : requisitoDeLaApp;/.test(VIDEO) && /mismoRequisito\(delServidor\.requisito, requisitoDeLaApp\)/.test(VIDEO)
    && /evaluarPlano\(requisito, d\.quality\)/.test(VIDEO) && /componerPromptDePlano\(requisito\)/.test(VIDEO)
    && !/evaluarPlano\(requisitoDeLaApp|componerPromptDePlano\(requisitoDeLaApp/.test(VIDEO));
  check('G5) y si el servidor no pudo calcularlo, no se genera: se para antes de evaluar nada',
    /if \(delServidor && !delServidor\.ok\) \{\s*return \{ \.\.\.vacia, toma, requestId, motivo: delServidor\.motivo/.test(VIDEO)
    && VIDEO.indexOf('if (delServidor && !delServidor.ok)') < VIDEO.indexOf('const evaluacion = evaluarPlano(requisito, d.quality)'));
  check('G6) el módulo nuevo está en la lista del motor, y el dinero no', TOCADOS_POR_EL_MOTOR.includes('functions/src/creator/requisitoDelServidor.ts') && TOCADOS_POR_EL_MOTOR.every((f) => !DINERO.some((re) => re.test(f))));
  const doc = leer('docs/FILMMAKER.md');
  check('G7) documentado: la Fase 5 en FILMMAKER.md, y ni allí ni en RUNTIME.md queda dicho que el servidor no recalcula el requisito',
    /### Fase 5 · /.test(doc) && /requisitoDelServidor/.test(doc)
    && !/el servidor no lo recalcula|no recalcula F1-A/.test(doc + leer('docs/RUNTIME.md')));
  check('G8) esta suite está en la cadena de `npm test`', /filmmaker-requisito-servidor\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 5 · el requisito de cada plano, calculado por el servidor (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
