/**
 * FILMMAKER ENGINE · FASE 12 (D12 DE F6) — RESTAURAR UNA VERSIÓN.
 *
 *   R · restaurar: la revisión pedida, reconstruida con el registro y guardada
 *       como una NUEVA encima de la de ahora, con CAS; sin perder ninguna;
 *   H · el registro: la entrada `restore` sin foto ni operaciones, y
 *       `reconstruirRevision` siguiendo restauraciones, también en cadena;
 *   N · lo que no se hace: una revisión que no es anterior, otra que ya cambió,
 *       un reintento, lo archivado, lo ajeno, un historial roto, lo que el modelo
 *       de hoy no acepta, y lo que vuelve y ya no vale (un Element archivado, un
 *       material retirado);
 *   G · las guardas: F1-A intacto, ni un código nuevo, ni dinero, ni IA, ni la app.
 *
 * De verdad: la puerta `productions` (la callable y `atenderProducciones`),
 * productions (F1-B), el lenguaje de F1-A y los Elements, sobre un Firestore en
 * memoria (el arnés de `f1d-postcanary.test.mjs`, copiado tal cual). Nada sale a la
 * red, y no se usa ninguna credencial.
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

/* ═══ FASE 12 · lo que se prueba aquí ═══════════════════════════════════════ */
const puertaProd = lib('productions/puerta.js');
const nucleo = lib('core/index.js');
const { TOCADOS_POR_EL_MOTOR, DINERO } = await import('./motor-filmmaker-alcance.mjs');
/** El último commit antes de esta fase: lo que no se toca se compara con él. */
const ANTES = '9f0e912';
/** El commit de esta fase, cuando ya existe: lo que la fase tocó se mide en SU tramo, y las siguientes no lo mueven. */
const HASTA = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 12 "').trim();

let serieDeOperaciones = 0;
const opId = (etiqueta) => `op-f12-${etiqueta}-${String(++serieDeOperaciones).padStart(4, '0')}`;
const aplicar = (uid, k, operations, revision) => intento(() => puertaProd.productions.run({
  auth: { uid }, data: { op: 'apply', productionId: pid(k), expectedRevision: revision, operations, operationId: opId('lote') },
}));
const restaurar = (uid, k, expectedRevision, revision, extra = {}) => intento(() => puertaProd.productions.run({
  auth: { uid }, data: { op: 'restore', productionId: pid(k), expectedRevision, revision, ...extra },
}));
const guardada = async (uid, k) => (await producciones.leerProduccion(uid, pid(k), { db: base })).view;
const registro = async (uid, k) => (await producciones.leerRegistro(uid, pid(k), { db: base })).entries;
const fotoDe = (k) => JSON.stringify([...base.docs.entries()].filter(([p]) => p.startsWith(`productions/${pid(k)}`)).sort());
const conRevision = (prod, revision) => ({ ...prod, metadata: { ...prod.metadata, revision } });
const mismo = (a, b) => producciones.huella(a) === producciones.huella(b);
const reconstruida = (entradas, k) => producciones.reconstruirRevision(entradas, k);
const codigoDe = (r) => r.error?.details?.code;
const tipoDe = (r) => r.error?.code;

/* Una producción, y tres lotes que la cambian: el tiempo, una escena más y el título. */
const inicial = () => clon({
  ...M.produccionVacia({ title: 'El faro', aspectRatio: '16:9', resolution: '720p' }),
  intent: { objective: 'Un faro al amanecer' },
  characters: [{ id: 'char-luna', name: 'Luna', identityDescription: 'Farera de sesenta años, pelo gris recogido' }],
  scenes: [{
    id: 'sc-0001', order: 0, title: 'Amanecer', description: 'El sol sale detrás del faro', characterIds: ['char-luna'],
    shots: [{ id: 'sh-0101', order: 0, durationSec: 4, description: 'Luna sube la escalera del faro' }],
  }],
});
const NOCHE = { id: 'sc-0002', order: 1, title: 'Noche', description: 'La lámpara gira sobre el mar', shots: [{ id: 'sh-0201', order: 0, durationSec: 4, description: 'La lámpara del faro gira' }] };
const LOTES = [
  [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }],
  [{ op: 'add_scene', scene: NOCHE }],
  [{ op: 'rename_production', title: 'El faro de noche' }],
];
const conHistoria = async (uid, k, prod = inicial(), lotes = LOTES) => {
  await crear(uid, k, prod);
  for (let i = 0; i < lotes.length; i++) {
    const r = await aplicar(uid, k, lotes[i], i);
    if (!r.ok) throw new Error(`no se aplicó el lote ${i + 1} de ${k}: ${codigo(r)}`);
  }
  return guardada(uid, k);
};

/* Elements de verdad —con la forma que exige el Core—, sembrados en la base. */
const elemento = (elementId, type, { version = 1, status = 'active', owner = A } = {}) => ({
  contract: nucleo.ELEMENT_CONTRACT_VERSION, elementId, type, version, status, name: `Element ${elementId}`,
  refs: [], ownerAccountId: owner, createdAt: HOY, updatedAt: HOY, ...(status === 'archived' ? { archivedAt: HOY } : {}),
});
const sembrar = (e) => { if (!nucleo.elementoValido(e)) throw new Error(`Element de prueba mal formado: ${e.elementId}`); base.docs.set(`elements/${e.elementId}`, e); };
sembrar(elemento('el_luna_0012', 'character'));

/* ═══ R · RESTAURAR ══════════════════════════════════════════════════════ */
console.log('\n── R · Restaurar: la revisión pedida, como una NUEVA, sin perder ninguna ──');
const v3 = await conHistoria(A, 1);
const registro3 = await registro(A, 1);
const deLa1 = reconstruida(registro3, 1).production;
const deLa3 = reconstruida(registro3, 3).production;
{
  check('R0) la historia de partida: cuatro revisiones, y la de ahora es la reconstruida',
    v3.revision === 3 && registro3.length === 4 && mismo(deLa3, v3.production) && deLa1.title === 'El faro' && deLa3.title === 'El faro de noche');
  const saldoAntes = saldo(A);
  const trabajos = base.de('jobs').length;
  const r = await restaurar(A, 1, 3, 1);
  const v4 = await guardada(A, 1);
  check('R1) volver a la revisión 1 deja una revisión NUEVA —la 4— con el contenido de la 1',
    r.ok && r.valor.revision === 4 && r.valor.restoredFrom === 1 && r.valor.changed === true && r.valor.alreadyApplied === false
    && mismo(r.valor.production, conRevision(deLa1, 4)) && v4.revision === 4 && mismo(v4.production, r.valor.production), codigo(r));
  check('R2) y lo guardado es eso: el título de entonces, una escena con su lluvia, y la escena que llegó después, borrada',
    v4.production.title === 'El faro' && v4.production.scenes.length === 1 && v4.production.scenes[0].weather === 'rain'
    && !base.docs.has(`productions/${pid(1)}/productionScenes/sc-0002`) && base.docs.has(`productions/${pid(1)}/productionScenes/sc-0001`));
  check('R3) lo pendiente de rehacer se dice como en un lote: la escena y el plano que se fueron, y la línea de tiempo cambió',
    r.valor.timelineChanged === true && r.valor.pending.removed.includes('sc-0002') && r.valor.pending.removed.includes('sh-0201'), JSON.stringify(r.valor.pending));
  check('R4) ni dinero ni trabajos: el saldo igual y ni un trabajo nuevo', saldo(A) === saldoAntes && base.de('jobs').length === trabajos);
  const r5 = await restaurar(A, 1, 4, 3);
  const v5 = await guardada(A, 1);
  check('R5) no se perdió nada: la revisión 3 sigue en el registro, y volver a ella deja la 5 con su contenido',
    r5.ok && r5.valor.revision === 5 && r5.valor.restoredFrom === 3 && mismo(v5.production, conRevision(deLa3, 5)) && v5.production.scenes.length === 2
    && base.docs.has(`productions/${pid(1)}/productionScenes/sc-0002`), codigo(r5));
  const r6 = await restaurar(A, 1, 5, 4);
  const v6 = await guardada(A, 1);
  check('R6) volver a una restauración: la 6 es la 4, que era la 1', r6.ok && r6.valor.revision === 6 && mismo(v6.production, conRevision(deLa1, 6)), codigo(r6));
  const lote = await aplicar(A, 1, [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'fog' }], 6);
  check('R7) y después se sigue editando con lotes, como siempre', lote.ok && lote.valor.revision === 7 && (await guardada(A, 1)).production.scenes[0].weather === 'fog', codigo(lote));
}

/* ═══ H · EL REGISTRO ════════════════════════════════════════════════════ */
console.log('\n── H · El registro: una entrada `restore` sin foto ni operaciones, y reconstruir siguiéndolas ──');
{
  const entradas = await registro(A, 1);
  const e4 = entradas.find((e) => e.revision === 4);
  check('H1) la entrada de la revisión 4: `restore`, de dónde viene, su huella, y ni foto ni operaciones',
    e4?.kind === 'restore' && JSON.stringify(e4.source) === JSON.stringify({ productionId: pid(1), revision: 1 }) && e4.snapshot === undefined && e4.operations === undefined
    && e4.result.hash === producciones.huella(conRevision(deLa1, 4)) && e4.result.scenes === 1 && e4.result.shots === 1 && e4.ownerAccountId === A && typeof e4.operationId === 'string',
    JSON.stringify(e4));
  check('H2) el registro entero sigue ahí: ocho revisiones, de la 0 a la 7, y solo se añadió',
    JSON.stringify(entradas.map((e) => e.revision)) === JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7])
    && JSON.stringify(entradas.map((e) => e.kind)) === JSON.stringify(['create', 'apply', 'apply', 'apply', 'restore', 'restore', 'restore', 'apply']));
  const todas = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => reconstruida(entradas, k));
  check('H3) cada revisión se reconstruye, huella a huella —también las restauradas y las que vienen detrás—, y la última es la guardada',
    todas.every((t) => t.ok) && mismo(todas[4].production, conRevision(deLa1, 4)) && mismo(todas[5].production, conRevision(deLa3, 5))
    && mismo(todas[6].production, conRevision(deLa1, 6)) && mismo(todas[7].production, (await guardada(A, 1)).production));
  const aSiMisma = clon(entradas).map((e) => (e.revision === 4 ? { ...e, source: { productionId: pid(1), revision: 4 } } : e));
  const aLaSiguiente = clon(entradas).map((e) => (e.revision === 4 ? { ...e, source: { productionId: pid(1), revision: 5 } } : e));
  const aOtra = clon(entradas).map((e) => (e.revision === 4 ? { ...e, source: { productionId: pid(9), revision: 1 } } : e));
  const sinFuente = clon(entradas).map((e) => (e.revision === 4 ? { ...e, source: undefined } : e));
  const motivoRoto = (t) => (!t.ok && t.code === 'history_broken' ? `${t.problems[0].path}:${t.problems[0].parameters.reason}` : 'ok');
  check('H4) una restauración que vuelve a sí misma, a una posterior, a otra producción o a ninguna es un historial roto, y se dice dónde',
    [aSiMisma, aLaSiguiente, aOtra, sinFuente].every((es) => motivoRoto(reconstruida(es, 6)) === 'revisions.4:restore_source_invalid'),
    [aSiMisma, aLaSiguiente, aOtra, sinFuente].map((es) => motivoRoto(reconstruida(es, 6))).join(' '));
  const huellaFalsa = clon(entradas).map((e) => (e.revision === 4 ? { ...e, result: { ...e.result, hash: 'sha256:0' } } : e));
  check('H5) y una restauración cuya huella no cuadra, también', motivoRoto(reconstruida(huellaFalsa, 4)) === 'revisions.4:hash_mismatch');
  check('H6) reconstruir antes de una restauración no la necesita: la 3 sale igual con el registro truncado en ella',
    mismo(reconstruida(entradas.filter((e) => e.revision <= 3), 3).production, deLa3));
}

/* ═══ N · LO QUE NO SE HACE ══════════════════════════════════════════════ */
console.log('\n── N · Lo que no se restaura, y no escribe nada ──');
{
  const antes = fotoDe(1);
  const viejo = await restaurar(A, 1, 3, 1, { operationId: opId('viejo') });
  check('N1) sobre una revisión que ya no es la de ahora: `revision_conflict` (aborted), con la de ahora, sin escribir nada',
    tipoDe(viejo) === 'aborted' && codigoDe(viejo) === 'revision_conflict' && viejo.error.details.currentRevision === 7 && fotoDe(1) === antes, codigo(viejo));
  const malas = await Promise.all([
    restaurar(A, 1, 7, 7), restaurar(A, 1, 7, 8), restaurar(A, 1, 7, -1), restaurar(A, 1, 7, '1'), restaurar(A, 1, 7, 1.5), restaurar(A, 1, undefined, 1), restaurar(A, 1, 7, undefined),
  ]);
  check('N2) solo a una revisión ANTERIOR, entera: la de ahora, una futura, una negativa, un texto o un decimal son `revision_invalid`, sin escribir nada',
    malas.every((m) => tipoDe(m) === 'invalid-argument' && codigoDe(m) === 'revision_invalid') && fotoDe(1) === antes, malas.map(codigo).join(' | '));
  const ajena = await restaurar(B, 1, 7, 1);
  check('N3) la de otra cuenta contesta como la que no existe, y no se toca', tipoDe(ajena) === 'not-found' && codigoDe(ajena) === 'production_not_found' && fotoDe(1) === antes);

  const conId = await restaurar(A, 1, 7, 2, { operationId: 'op-f12-reintento-0001' });
  const otraVez = await restaurar(A, 1, 7, 2, { operationId: 'op-f12-reintento-0001' });
  const otroDestino = await restaurar(A, 1, 8, 1, { operationId: 'op-f12-reintento-0001' });
  check('N4) un reintento con el mismo id no restaura dos veces; el mismo id para otra revisión está gastado',
    conId.ok && conId.valor.revision === 8 && otraVez.ok && otraVez.valor.alreadyApplied === true && otraVez.valor.revision === 8
    && (await registro(A, 1)).length === 9 && tipoDe(otroDestino) === 'already-exists' && codigoDe(otroDestino) === 'operation_id_reused', `${codigo(conId)} ${codigo(otraVez)} ${codigo(otroDestino)}`);
  const antesDelNoop = fotoDe(1);
  const noop = await restaurar(A, 1, 8, 2);
  check('N5) volver a lo que ya hay no escribe nada: `changed: false`, la misma revisión',
    noop.ok && noop.valor.changed === false && noop.valor.revision === 8 && fotoDe(1) === antesDelNoop && (await registro(A, 1)).length === 9, codigo(noop));

  await puertaProd.productions.run({ auth: { uid: A }, data: { op: 'archive', productionId: pid(1) } });
  const antesArchivada = fotoDe(1);
  const archivada = await restaurar(A, 1, 8, 1);
  const intactaArchivada = fotoDe(1) === antesArchivada;
  await puertaProd.productions.run({ auth: { uid: A }, data: { op: 'unarchive', productionId: pid(1) } });
  check('N6) archivada no se restaura (failed-precondition), como no se le aplican lotes',
    tipoDe(archivada) === 'failed-precondition' && codigoDe(archivada) === 'production_archived' && intactaArchivada, codigo(archivada));

  /* Un historial roto: la huella de la revisión 2 tocada en el registro guardado. */
  await conHistoria(A, 2);
  const ruta2 = `productions/${pid(2)}/productionRevisions/0000000002`;
  const bueno = base.leer(ruta2);
  base.docs.set(ruta2, { ...bueno, result: { ...bueno.result, hash: 'sha256:0' } });
  const antes2 = fotoDe(2);
  const rota = await restaurar(A, 2, 3, 2);
  const intactaRota = fotoDe(2) === antes2;
  base.docs.set(ruta2, bueno);
  check('N7) con el registro tocado no se restaura a ciegas: `history_broken` (data-loss) en su revisión, sin escribir nada',
    tipoDe(rota) === 'data-loss' && codigoDe(rota) === 'history_broken' && rota.error.details.problems[0].path === 'revisions.2' && intactaRota, codigo(rota));

  /* Lo que el modelo de hoy no acepta: una foto de la revisión 0 con su huella cuadrada, pero que no pasa `integridad()`. */
  await conHistoria(A, 3);
  const ruta0 = `productions/${pid(3)}/productionRevisions/0000000000`;
  const cero = base.leer(ruta0);
  const invalida = { ...cero.snapshot, provider: 'seedance' };
  base.docs.set(ruta0, { ...cero, snapshot: invalida, result: { ...cero.result, hash: producciones.huella(invalida) } });
  const antes3 = fotoDe(3);
  const noValida = await restaurar(A, 3, 3, 0);
  check('N8) una revisión que el modelo de hoy no acepta no se escribe: `production_invalid` con su motivo, sin escribir nada',
    tipoDe(noValida) === 'invalid-argument' && codigoDe(noValida) === 'production_invalid'
    && noValida.error.details.problems[0].parameters.reason === 'restored_revision_invalid' && fotoDe(3) === antes3, codigo(noValida));
}

/* ═══ V · LO QUE VUELVE CON LA REVISIÓN ══════════════════════════════════ */
console.log('\n── V · Lo que vuelve con la revisión pasa por la misma política que un lote ──');
{
  /* Nace vinculada a un Element; en la 1 se quita el vínculo; el Element se archiva; volver a la 0 lo traería otra vez. */
  const prod = inicial();
  prod.characters[0].element = { elementId: 'el_luna_0012', version: 1 };
  await conHistoria(A, 4, prod, [[{ op: 'update_character', characterId: 'char-luna', changes: { element: null } }]]);
  base.docs.set('elements/el_luna_0012', elemento('el_luna_0012', 'character', { status: 'archived' }));
  const antes = fotoDe(4);
  const archivado = await restaurar(A, 4, 1, 0);
  check('V1) volver a una revisión con un vínculo a un Element que ya está archivado: `element_binding_rejected`, con su ruta y su motivo, sin escribir nada',
    tipoDe(archivado) === 'invalid-argument' && codigoDe(archivado) === 'element_binding_rejected'
    && archivado.error.details.problems[0].path === 'characters.char-luna.element' && archivado.error.details.problems[0].parameters.reason === 'archived' && fotoDe(4) === antes,
    codigo(archivado));
  base.docs.set('elements/el_luna_0012', elemento('el_luna_0012', 'character'));
  const activo = await restaurar(A, 4, 1, 0);
  check('V2) con el Element activo, sí: el vínculo vuelve', activo.ok && activo.valor.revision === 2 && (await guardada(A, 4)).production.characters[0].element?.elementId === 'el_luna_0012', codigo(activo));

  /* Un material que se retiró: con un lector inyectado, la misma política de `productions`, sin la puerta. */
  const conMaterial = inicial();
  const assetId = `asset_${'f'.repeat(32)}`;
  conMaterial.references = [{ id: 'ref-foto', kind: 'image', assetId }];
  const listo = async (id) => (id === assetId ? { assetId, ownerAccountId: A, kind: 'image', status: 'ready' } : null);
  const retirado = async (id) => (id === assetId ? { assetId, ownerAccountId: A, kind: 'image', status: 'deleted' } : null);
  const creada = await producciones.crearProduccion({ accountId: A, productionId: pid(5), production: conMaterial, at: HOY }, { db: base, material: listo });
  const sin = await producciones.aplicarOperacionesGuardadas({
    accountId: A, productionId: pid(5), expectedRevision: 0, operations: [{ op: 'remove_reference', referenceId: 'ref-foto' }], operationId: opId('sin-material'), at: HOY,
  }, { db: base, material: listo });
  const antes5 = fotoDe(5);
  const conRetirado = await producciones.restaurarRevision({ accountId: A, productionId: pid(5), expectedRevision: 1, revision: 0, at: HOY }, { db: base, material: retirado });
  check('V3) volver a una revisión con un material que ya se retiró: `reference_rejected`, sin escribir nada',
    creada.ok && sin.ok && !conRetirado.ok && conRetirado.code === 'reference_rejected' && conRetirado.problems[0].path === 'references.ref-foto.assetId' && fotoDe(5) === antes5,
    `${creada.ok} ${sin.ok} ${conRetirado.code}`);
  const conListo = await producciones.restaurarRevision({ accountId: A, productionId: pid(5), expectedRevision: 1, revision: 0, at: HOY }, { db: base, material: listo });
  check('V4) y con el material listo, vuelve', conListo.ok && conListo.view.revision === 2 && conListo.view.production.references[0]?.assetId === assetId);
}

/* ═══ G · LAS GUARDAS ════════════════════════════════════════════════════ */
console.log('\n── G · Lo que restaurar no hace ──');
{
  const src = (f) => sinComentarios(leer(`functions/src/productions/${f}`));
  const indice = src('index.ts');
  /* Los códigos, como quedaron AL CERRAR la fase: una fase posterior puede añadir los suyos. */
  const indiceDeLaFase = HASTA ? sinComentarios(git(`show ${HASTA}:functions/src/productions/index.ts`)) : indice;
  const cuerpo = indice.slice(indice.indexOf('export const restaurarRevision'));
  check('G1) F1-A intacto: el lenguaje, el modelo y la validación no se tocan', git(`diff --name-only ${ANTES} ${HASTA} -- functions/src/filmmaker`).trim() === '');
  const codigos = (s) => (s.match(/export type CodigoDePersistencia =[\s\S]*?;/) || [''])[0];
  check('G2) ni un código nuevo: todo lo que puede salir mal ya tenía nombre (y su frase en los once idiomas)',
    codigos(indiceDeLaFase).length > 100 && codigos(indiceDeLaFase) === codigos(sinComentarios(git(`show ${ANTES}:functions/src/productions/index.ts`))));
  check('G3) ni dinero, ni trabajos, ni IA: restaurar solo lee el registro y escribe la producción',
    cuerpo.length > 500 && !/credit|spendCredits|crearTrabajo|conductor|engine|pedirMedio|fetch|http/i.test(cuerpo));
  const laEntrada = cuerpo.slice(cuerpo.indexOf("kind: 'restore', operationId"), cuerpo.indexOf('result:', cuerpo.indexOf("kind: 'restore', operationId")));
  check('G4) el registro de una restauración no guarda foto ni operaciones: solo de dónde viene y su huella',
    laEntrada.length > 40 && /source: \{ productionId, revision: destino \}/.test(laEntrada) && !/snapshot|operations/.test(laEntrada), laEntrada);
  check('G5) la app, las reglas y los índices no se tocan en esta fase',
    git(`diff --name-only ${ANTES} ${HASTA} -- services components screens hooks utils firestore.rules firestore.indexes.json storage.rules`).trim() === '');
  check('G6) productions ya estaba en la lista del motor, y el dinero no',
    ['functions/src/productions/index.ts', 'functions/src/productions/puerta.ts'].every((f) => TOCADOS_POR_EL_MOTOR.includes(f)) && TOCADOS_POR_EL_MOTOR.every((f) => !DINERO.some((re) => re.test(f))));
  /* Reanclada por nombre en la Fase 20 del motor: la puerta gana `history`, que solo lee las versiones para enseñarlas. */
  check('G7) la puerta: nueve operaciones —la novena, `history`, solo lee—, y `restore` solo lleva la revisión que se ve y a cuál se vuelve',
    JSON.stringify([...puertaProd.OPERACIONES_DE_PRODUCCION]) === JSON.stringify(['create', 'get', 'list', 'apply', 'archive', 'unarchive', 'duplicate', 'restore', 'history'])
    && /case 'restore': \{[\s\S]*?restaurarRevision\(\{\s*accountId, productionId: data\.productionId, expectedRevision: data\.expectedRevision,\s*revision: data\.revision, operationId: data\.operationId, at,\s*\}, deps\)/.test(src('puerta.ts')));
  check('G8) documentado', /### Fase 12 · /.test(leer('docs/FILMMAKER.md')) && /\| D12 \| [^\n]*\*\*decidida\*\* en la Fase 12/.test(leer('docs/FILMMAKER.md')));
  check('G9) esta suite está en la cadena de `npm test`', /filmmaker-restaurar\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 12 · restaurar una versión (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
