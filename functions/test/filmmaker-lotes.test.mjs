/**
 * FILMMAKER ENGINE · FASE 6 (F4 DEL ROADMAP) — VARIOS PLANOS A LA VEZ (2026-09-28).
 *
 * El lote pasa por la MISMA puerta que una toma (`generateVideo`, modo `produccion`): cada unidad vuelve a entrar como
 * una toma, con el requisito que calcula el servidor, y su cotización, su cupo y su reserva son los de siempre. No hay
 * un cobro del lote.
 *
 *   L · el presupuesto: las unidades en orden, qué se genera y qué no y por qué, el total —la suma de las tomas—, el
 *       resumen por capacidad y si hay saldo; sin tocar nada;
 *   G · generar: por el total que se enseñó, una reserva por toma, en orden, y parando al primer fallo;
 *   S · lo que ya está: hechas, en marcha y bloqueadas no se repiten;
 *   R · los rechazos: otra cuenta, otra revisión, sin forma, demasiadas, sin saldo y la puerta cerrada;
 *   D · las guardas: el lote no cobra, no pone precio y no decide nada de lo que decide la puerta.
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

/* ═══ FASE 6 · lo que se prueba aquí ═══════════════════════════════════════ */
const { MAX_UNIDADES_POR_LOTE } = lib('creator/lotes.js');
const { TOCADOS_POR_EL_MOTOR, DINERO } = await import('./motor-filmmaker-alcance.mjs');

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
        { id: 'sh-0101', order: 0, durationSec: 5, description: 'Marina sube la escalera del faro', actions: ['sube despacio'] },
        { id: 'sh-0102', order: 1, durationSec: 2.5, description: 'La lámpara se enciende', objectIds: ['obj-lampara'] },
        { id: 'sh-0103', order: 2, durationSec: 20, description: 'El mar entero al amanecer' },
      ],
    },
    { id: 'sc-0002', order: 1, title: 'Mediodía', description: 'Las gaviotas vuelan sobre el faro', locationId: 'loc-faro', timeOfDay: 'midday', durationSec: 6, shots: [] },
  ],
});
const revisionDe = async (uid, k) => (await producciones.leerProduccion(uid, pid(k), { db: base })).view.revision;
const lote = (uid, produccion, extra = {}) => intento(() => video.generateVideo.run({ auth: { uid }, data: { produccion, ...extra } }));
const cotizarLote = (uid, produccion) => lote(uid, produccion, { cotizar: true });
const generarLote = (uid, produccion, total) => lote(uid, produccion, { creditosCotizados: total });
const deUnaEnUna = async (uid, k, unitId) => cotizar(uid, await plan(uid, k, unitId));
const huella = () => ({ posts: posts.length, saldoA: saldo(A), cupoA: cupoDeVideo(A), reservas: base.de('creditTransactions').filter((t) => t.type === 'usage').length });

await crear(A, 1, rico());

/* ═══ L · EL PRESUPUESTO ═════════════════════════════════════════════════ */
console.log('\n── L · El presupuesto del lote: las cotizaciones de la puerta, sumadas, sin tocar nada ──');
let presupuesto;
{
  const antes = huella();
  const r = await cotizarLote(A, { productionId: pid(1), revision: await revisionDe(A, 1), quality: 'standard' });
  presupuesto = r.ok ? r.valor : null;
  const acciones = presupuesto?.units.map((u) => `${u.unitId}:${u.action}`).join(' ');
  check('L1) las unidades en el orden de la línea de tiempo, con lo que se hará con cada una',
    r.ok && presupuesto.status === 'QUOTED_BATCH' && acciones === 'sh-0101:generate sh-0102:generate sh-0103:blocked sc-0002:generate', acciones ?? codigo(r));
  const larga = presupuesto?.units.find((u) => u.unitId === 'sh-0103');
  check('L2) la que no se puede, con su porqué: más de 15 s', larga?.reason === 'duration_too_long' && larga.detail?.maxSec === 15, JSON.stringify(larga));
  const sueltas = await Promise.all(['sh-0101', 'sh-0102', 'sc-0002'].map((u) => deUnaEnUna(A, 1, u)));
  const deCadaUna = presupuesto?.units.filter((u) => u.action === 'generate');
  check('L3) cada unidad cuesta lo mismo que su cotización suelta, con su toma y lo que se generará',
    deCadaUna?.length === 3 && deCadaUna.every((u, i) => sueltas[i].ok && sueltas[i].valor.credits === u.credits && sueltas[i].valor.takes.next.take === u.take && u.take === 1
      && JSON.stringify(sueltas[i].valor.effective) === JSON.stringify(u.effective)), JSON.stringify(deCadaUna?.map((u) => u.credits)));
  check('L4) el total es la suma de las tomas, y se cuentan las que no',
    presupuesto?.total.credits === deCadaUna.reduce((s, u) => s + u.credits, 0) && presupuesto.total.units === 3
    && JSON.stringify(presupuesto.skipped) === JSON.stringify({ done: 0, inFlight: 0, blocked: 1 }), JSON.stringify(presupuesto?.total));
  const video = presupuesto?.capabilities.find((c) => c.capability === 'video.generate');
  check('L5) con el resumen por capacidad de F1-A: cuánto vídeo hace falta para la producción entera',
    presupuesto?.capabilities.length >= 1 && video?.count === 4, JSON.stringify(presupuesto?.capabilities));
  check('L6) y si hay saldo para todo', presupuesto?.balance === saldo(A) && presupuesto.enough === true);
  check('L7) presupuestar no tocó nada: ni un POST, ni un Credit, ni el cupo, ni una reserva', JSON.stringify(huella()) === JSON.stringify(antes));
}

/* ═══ G · GENERAR ════════════════════════════════════════════════════════ */
console.log('\n── G · Generar el lote: por el total enseñado, una reserva por toma, en orden ──');
{
  const antes = huella();
  const pedido = { productionId: pid(1), revision: await revisionDe(A, 1), quality: 'standard' };
  const caro = await generarLote(A, pedido, presupuesto.total.credits + 1);
  check('G1) por otro total no se genera nada: el precio cambió, y se dice el de ahora',
    !caro.ok && motivo(caro) === 'price_changed' && caro.error?.details?.credits === presupuesto.total.credits && JSON.stringify(huella()) === JSON.stringify(antes), codigo(caro));
  const r = await generarLote(A, pedido, presupuesto.total.credits);
  const orden = r.ok ? r.valor.units.map((u) => `${u.unitId}:${u.status}`).join(' ') : codigo(r);
  check('G2) por el total enseñado: las tres, aceptadas, en orden, y ninguna parada',
    r.ok && r.valor.status === 'STARTED_BATCH' && orden === 'sh-0101:ACCEPTED sh-0102:ACCEPTED sc-0002:ACCEPTED' && r.valor.started === 3 && r.valor.stoppedAt === undefined, orden);
  const rids = ['sh-0101', 'sh-0102', 'sc-0002'].map((u) => toma.requestIdDeToma(A, pid(1), u, 1));
  const porToma = presupuesto.units.filter((u) => u.action === 'generate').map((u) => u.credits);
  check('G3) una reserva por toma —la suya, con su importe—, no una del lote',
    rids.every((rid, i) => uso(rid)?.status === 'AUTHORIZED' && Math.abs(uso(rid).amount) === porToma[i]) && huella().reservas === antes.reservas + 3);
  check('G4) tres POST, tres del cupo y el saldo, menos el total', huella().posts === antes.posts + 3 && huella().cupoA === antes.cupoA + 3 && saldo(A) === antes.saldoA - presupuesto.total.credits);
  check('G5) y cada unidad responde con su requestId, el de su toma', r.ok && r.valor.units.every((u, i) => u.requestId === rids[i] && u.take === 1));
}

/* ═══ S · LO QUE YA ESTÁ ═════════════════════════════════════════════════ */
console.log('\n── S · Lo hecho, lo que está en marcha y lo bloqueado no se repite ──');
{
  const pedido = { productionId: pid(1), revision: await revisionDe(A, 1), quality: 'standard' };
  const enMarcha = (await cotizarLote(A, pedido)).valor;
  check('S1) con las tres en marcha: «in_flight», y la larga sigue bloqueada; nada que generar',
    enMarcha?.units.map((u) => u.action).join(',') === 'in_flight,in_flight,blocked,in_flight' && enMarcha.total.units === 0 && enMarcha.total.credits === 0, JSON.stringify(enMarcha?.units.map((u) => u.action)));
  const antes = huella();
  const nada = await generarLote(A, pedido, 0);
  check('S2) y generarlo no hace nada: ni una llamada', nada.ok && nada.valor.status === 'NOTHING_TO_GENERATE' && JSON.stringify(huella()) === JSON.stringify(antes), codigo(nada));
  for (const u of ['sh-0101', 'sh-0102', 'sc-0002']) termina(await tareaDe(A, toma.requestIdDeToma(A, pid(1), u, 1)), 'succeeded');
  await pasada();
  for (const [sceneId, unitId] of [['sc-0001', 'sh-0101'], ['sc-0001', 'sh-0102'], ['sc-0002', 'sc-0002']]) {
    await intento(() => shotsPuerta.shots.run({ auth: { uid: A }, data: { op: 'shot.result', productionId: pid(1), sceneId, unitId, take: 1 } }));
  }
  const hechas = (await cotizarLote(A, pedido)).valor;
  check('S3) terminadas y en su plano: «done», y no se vuelven a pedir',
    hechas?.units.map((u) => u.action).join(',') === 'done,done,blocked,done' && JSON.stringify(hechas.skipped) === JSON.stringify({ done: 3, inFlight: 0, blocked: 1 }) && hechas.total.units === 0,
    JSON.stringify(hechas?.units.map((u) => u.action)));
  await crear(A, 2, rico());
  const soloUna = (await cotizarLote(A, { productionId: pid(2), revision: await revisionDe(A, 2), quality: 'standard', units: ['sh-0102'] })).valor;
  check('S4) y se puede pedir solo algunas', soloUna?.units.length === 1 && soloUna.units[0].unitId === 'sh-0102' && soloUna.units[0].action === 'generate' && soloUna.total.units === 1);
}

/* ═══ R · LOS RECHAZOS ═══════════════════════════════════════════════════ */
console.log('\n── R · Otra cuenta, otra revisión, sin forma, demasiadas, sin saldo, la puerta cerrada ──');
{
  const rev1 = await revisionDe(A, 1);
  const ajena = await cotizarLote(B, { productionId: pid(1), revision: rev1, quality: 'standard' });
  const otraRevision = await cotizarLote(A, { productionId: pid(1), revision: rev1 + 1, quality: 'standard' });
  const sinForma = await cotizarLote(A, { productionId: 'corto', revision: rev1, quality: 'standard' });
  check('R1) de otra cuenta, no hay producción; en otra revisión, cambió; sin forma, no',
    !ajena.ok && motivo(ajena) === 'production_not_found' && !otraRevision.ok && motivo(otraRevision) === 'production_changed' && !sinForma.ok && motivo(sinForma) === 'batch_invalid',
    `${codigo(ajena)} · ${codigo(otraRevision)} · ${codigo(sinForma)}`);
  /* Trece planos: uno más que el tope. */
  const trece = clon({ ...rico(), scenes: [{ id: 'sc-0001', order: 0, title: 'Muchos', description: 'Muchos planos', shots: Array.from({ length: 13 }, (_, i) => ({ id: `sh-${String(i + 1).padStart(4, '0')}`, order: i, durationSec: 4, description: `Plano ${i + 1}` })) }] });
  await crear(A, 3, trece);
  const demasiadas = await cotizarLote(A, { productionId: pid(3), revision: await revisionDe(A, 3), quality: 'standard' });
  check('R2) más unidades que el tope: se dice, con el tope', !demasiadas.ok && motivo(demasiadas) === 'batch_too_large' && demasiadas.error?.details?.max === MAX_UNIDADES_POR_LOTE && MAX_UNIDADES_POR_LOTE === 12, codigo(demasiadas));
  /* Sin saldo para el total: no se empieza ninguna. */
  await crear(C, 4, rico());
  const pedidoC = { productionId: pid(4), revision: await revisionDe(C, 4), quality: 'standard' };
  const pC = (await cotizarLote(C, pedidoC)).valor;
  base.docs.get(`users/doc_${C}`).creditsBalance = pC.total.credits - 1;
  const postsC = posts.length;
  const pocos = await generarLote(C, pedidoC, pC.total.credits);
  check('R3) sin Credits para el total, no se empieza ninguna: ni un POST, ni una reserva',
    !pocos.ok && motivo(pocos) === 'insufficient_credits' && pocos.error?.details?.required === pC.total.credits && posts.length === postsC
    && ['sh-0101', 'sh-0102', 'sc-0002'].every((u) => !uso(toma.requestIdDeToma(C, pid(4), u, 1))), codigo(pocos));
  base.docs.get(`users/doc_${C}`).creditsBalance = SALDO;
  /* La puerta cerrada para una cuenta: el lote no la salta. */
  const G = 'pcUsuarioG0001';
  base.docs.set(`users/doc_${G}`, { uid: G, displayName: G });
  await creditEngine.ensureAccount(G);
  base.docs.get(`users/doc_${G}`).creditsBalance = SALDO;
  await crear(G, 5, rico());
  const cerrada = (await cotizarLote(G, { productionId: pid(5), revision: await revisionDe(G, 5), quality: 'standard' })).valor;
  check('R4) con la puerta del Core cerrada para la cuenta, nada se genera: cada unidad lo dice',
    cerrada?.total.units === 0 && cerrada.units.filter((u) => u.action === 'blocked' && u.reason === 'route_unavailable').length === 3, JSON.stringify(cerrada?.units.map((u) => u.reason)));
}
{
  /* Al primer fallo, se para: la primera empieza, la segunda falla —y se devuelve—, la tercera no se pide. */
  await crear(D, 6, rico());
  const pedidoD = { productionId: pid(6), revision: await revisionDe(D, 6), quality: 'standard' };
  const pD = (await cotizarLote(D, pedidoD)).valor;
  const postsD = posts.length;
  const original = seedance.run;
  let llamadas = 0;
  seedance.run = async (req) => { llamadas++; if (llamadas === 2) modo = 'http404'; try { return await original(req); } finally { modo = 'aceptar'; } };
  const r = await generarLote(D, pedidoD, pD.total.credits);
  seedance.run = original;
  const [u1, u2, u3] = ['sh-0101', 'sh-0102', 'sc-0002'].map((u) => toma.requestIdDeToma(D, pid(6), u, 1));
  check('G6) al primer fallo se para: la primera en marcha, la segunda falló y se devolvió, la tercera ni se pidió',
    r.ok && r.valor.started === 1 && r.valor.stoppedAt === 'sh-0102' && r.valor.units.length === 2 && r.valor.units[1].status === 'FAILED'
    && uso(u1)?.status === 'AUTHORIZED' && uso(u2)?.status === 'REFUNDED' && !uso(u3) && posts.length === postsD + 2,
    JSON.stringify(r.ok ? r.valor : codigo(r)));
}

/* ═══ D · LAS GUARDAS ════════════════════════════════════════════════════ */
console.log('\n── D · El lote no cobra, no pone precio y no decide nada de lo que decide la puerta ──');
{
  const LOTES = sinComentarios(leer('functions/src/creator/lotes.ts'));
  check('D1) el lote no mueve dinero, no pone precio, no reserva cupo y no monta el conductor',
    !/spendCredits|completeCredits|refundCredits|priceVideo|loadCostOverrides|chooseSeedanceModel|limiter|conductorDeWee|pedirMedio|decidirRuntime|settle\(/.test(LOTES));
  check('D2) cada unidad se la pide a la puerta del vídeo, con el requisito del servidor: la app no manda ninguno',
    (LOTES.match(/deps\.porUnidad\(/g) || []).length === 2 && /requisitosDelServidor\(deps\.db, accountId/.test(LOTES) && !/\.requirement\b/.test(LOTES));
  const VIDEO = sinComentarios(leer('functions/src/creator/video.ts'));
  /* Y sin `.run(`: la puerta se llama por su nombre, no como a un adaptador (valla gateway-autoridad A). */
  check('D3) la puerta despacha el lote antes que la toma, y cada unidad vuelve a entrar por ella misma',
    VIDEO.indexOf('if (data.produccion !== undefined)') > 0 && VIDEO.indexOf('if (data.produccion !== undefined)') < VIDEO.indexOf('const cotizar = data.cotizar === true;')
    && /atenderVideo\(\{ \.\.\.request, data: datos \}\)/.test(VIDEO) && /export const generateVideo = onCall\(\{[^}]*\}, atenderVideo\);/.test(VIDEO)
    && !/\.run\(/.test(VIDEO));
  check('D4) sigue habiendo UNA puerta de vídeo que decide Core o legacy, una vez', (VIDEO.match(/decidirRuntime\(/g) || []).length === 1);
  check('D5) el módulo nuevo está en la lista del motor, y el dinero no', TOCADOS_POR_EL_MOTOR.includes('functions/src/creator/lotes.ts') && TOCADOS_POR_EL_MOTOR.every((f) => !DINERO.some((re) => re.test(f))));
  check('D6) documentado', /### Fase 6 · /.test(leer('docs/FILMMAKER.md')) && /produccion/.test(leer('docs/FILMMAKER.md')));
  check('D7) esta suite está en la cadena de `npm test`', /filmmaker-lotes\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 6 · varios planos a la vez, por la misma puerta (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
