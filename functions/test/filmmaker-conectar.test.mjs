/**
 * FILMMAKER ENGINE · FASE 20 — CONECTAR EN LA APP LO QUE EL MOTOR YA HACE.
 *
 *   V · las versiones en el servidor: `productions` gana `history`, que solo LEE el registro —las más recientes
 *       primero, con tope, con lo que es cada una y, si es una vuelta, a cuál—; lo ajeno, como lo que no existe;
 *   E · lo guardado de una clase, en el servidor: `elements` gana `list` —los vivos de la cuenta, de ese tipo, sin sus
 *       materiales—;
 *   S · los servicios de la app: versiones, volver a una, lo guardado y Weë Brain con la producción delante;
 *   K · el controlador: volver a una versión, con CAS y sin pisar cambios sin guardar;
 *   H · los tres hooks —Weë Brain en el editor, las versiones y lo guardado—, con un React mínimo que guarda su estado
 *       y corre sus efectos: qué mandan, cuándo, y que lo que llega tarde no se pinta;
 *   U · en pantalla: el prompt avanzado (oculto hasta que se pide), las versiones con su confirmación, los vínculos de
 *       la hoja de la estructura y la caja de Weë Brain con su propuesta —aplicar solo si sigue valiendo—;
 *   G · las guardas: los paneles no hablan con el servidor, el servidor solo GANA, ni Credits ni Functions nuevas,
 *       los once idiomas, documentado.
 *
 * De verdad: las puertas `productions` y `elements`, productions con su registro, el runtime de Elements y F1-A, sobre
 * un Firestore en memoria (el arnés de `f1d-postcanary.test.mjs`, copiado tal cual); y el código de la app —servicios,
 * controlador y paneles— con dobles de React Native y de Firebase.
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

/* ═══ FASE 20 · lo que se prueba aquí ═══════════════════════════════════════ */
const puertaProd = lib('productions/puerta.js');
const puertaElem = lib('elements/puerta.js');
const nucleo = lib('core/index.js');
const { TOCADOS_POR_EL_MOTOR, DINERO } = await import('./motor-filmmaker-alcance.mjs');
/** El último commit antes de esta fase. */
const ANTES = '62b3ebb';
const HASTA = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 20 "').trim();
const tramo = HASTA ? `${ANTES} ${HASTA}` : ANTES;
const prod = (uid, data) => intento(() => puertaProd.productions.run({ auth: { uid }, data }));
const elems = (uid, data) => intento(() => puertaElem.elements.run({ auth: { uid }, data }));
let ops = 0;
const aplicarOp = async (uid, k, revision, operations) => prod(uid, { op: 'apply', productionId: pid(k), expectedRevision: revision, operations, operationId: `op-f20-${k}-${revision}-${++ops}` });

/* ═══ V · LAS VERSIONES, EN EL SERVIDOR ═══════════════════════════════════ */
console.log('\n── V · `productions` gana `history`: las versiones, solo leídas ──');
{
  await crear(A, 1, conFaro());
  const r1 = await aplicarOp(A, 1, 0, [{ op: 'rename_production', title: 'El faro, versión uno' }]);
  const r2 = await aplicarOp(A, 1, 1, [{ op: 'rename_production', title: 'El faro, versión dos' }]);
  const vuelta = await prod(A, { op: 'restore', productionId: pid(1), expectedRevision: 2, revision: 1, operationId: 'op-f20-vuelta-1' });
  const antesDeLeer = JSON.stringify([...base.docs.entries()].filter(([p]) => p.startsWith('productions/')));
  const h = await prod(A, { op: 'history', productionId: pid(1) });
  const versiones = h.ok ? h.valor.versions : [];
  check('V1) las versiones, de la más reciente a la primera: la vuelta a la 1, los dos lotes y cómo nació',
    r1.ok && r2.ok && vuelta.ok && JSON.stringify(versiones.map((v) => `${v.revision}:${v.kind}${v.restoredFrom !== undefined ? `<${v.restoredFrom}` : ''}`)) === JSON.stringify(['3:restore<1', '2:apply', '1:apply', '0:create']),
    JSON.stringify(h.ok ? versiones : codigo(h)));
  check('V2) de cada una, solo lo que se enseña: qué es, cuándo, cuántas escenas y planos —ni su foto ni sus operaciones—',
    versiones.every((v) => typeof v.createdAt === 'number' && Number.isInteger(v.scenes) && Number.isInteger(v.shots)
      && JSON.stringify(Object.keys(v).sort()) === JSON.stringify(['createdAt', 'kind', 'revision', 'scenes', 'shots', ...(v.restoredFrom !== undefined ? ['restoredFrom'] : [])].sort())));
  check('V3) leerlas no escribe nada', antesDeLeer === JSON.stringify([...base.docs.entries()].filter(([p]) => p.startsWith('productions/'))));
  await crear(A, 2, conFaro());
  let rev = 0;
  for (let i = 0; i < 33; i++) { const r = await aplicarOp(A, 2, rev, [{ op: 'rename_production', title: `Toma ${i}` }]); if (r.ok) rev = r.valor.revision; }
  const largo = await prod(A, { op: 'history', productionId: pid(2) });
  check('V4) con tope: treinta, las más recientes', largo.ok && largo.valor.versions.length === 30 && largo.valor.versions[0].revision === 33 && largo.valor.versions[29].revision === 4, `${largo.ok ? largo.valor.versions.length : codigo(largo)}`);
  const ajena = await prod(B, { op: 'history', productionId: pid(1) });
  const nada = await prod(A, { op: 'history', productionId: pid(99) });
  const mala = await prod(A, { op: 'history', productionId: 'x' });
  check('V5) lo ajeno contesta como lo que no existe, y un identificador sin forma también',
    !ajena.ok && ajena.error?.code === 'not-found' && !nada.ok && nada.error?.code === 'not-found' && !mala.ok && mala.error?.code === 'not-found', `${codigo(ajena)} · ${codigo(nada)} · ${codigo(mala)}`);
}

/* ═══ E · LO GUARDADO DE UNA CLASE, EN EL SERVIDOR ════════════════════════ */
console.log('\n── E · `elements` gana `list`: los vivos de la cuenta, de una clase ──');
const elemento = (elementId, type, { version = 1, status = 'active', owner = A, name } = {}) => ({
  contract: nucleo.ELEMENT_CONTRACT_VERSION, elementId, type, version, status, name: name ?? `Element ${elementId}`,
  refs: [], ownerAccountId: owner, createdAt: HOY, updatedAt: HOY, ...(status === 'archived' ? { archivedAt: HOY } : {}),
});
const sembrar = (e) => { if (!nucleo.elementoValido(e)) throw new Error(`Element de prueba mal formado: ${e.elementId}`); base.docs.set(`elements/${e.elementId}`, e); };
[
  elemento('el_luna_0001', 'character', { version: 3, name: 'Luna' }), elemento('el_mar_0001', 'character', { name: 'Mar' }),
  elemento('el_vieja_0001', 'character', { status: 'archived' }), elemento('el_ajeno_0001', 'character', { owner: B }),
  elemento('el_faro_0001', 'place', { name: 'El faro' }), elemento('el_set_0001', 'scene', { name: 'El set' }),
].forEach(sembrar);
{
  const l = await elems(A, { op: 'list', type: 'character' });
  check('E1) los personajes vivos de la cuenta: ni el archivado ni el ajeno', l.ok && JSON.stringify(l.valor.elements.map((e) => e.elementId).sort()) === JSON.stringify(['el_luna_0001', 'el_mar_0001']), JSON.stringify(l.ok ? l.valor.elements : codigo(l)));
  check('E2) de cada uno, solo su nombre, su clase y su versión: ni sus materiales ni de quién es',
    l.ok && l.valor.elements.every((e) => JSON.stringify(Object.keys(e).sort()) === JSON.stringify(['elementId', 'name', 'type', 'version'])) && l.valor.elements.find((e) => e.elementId === 'el_luna_0001')?.version === 3);
  const lugares = await elems(A, { op: 'list', type: 'place' });
  const escenas = await elems(A, { op: 'list', type: 'scene' });
  check('E3) cada clase, lo suyo', lugares.ok && lugares.valor.elements.map((e) => e.elementId).join() === 'el_faro_0001' && escenas.ok && escenas.valor.elements.map((e) => e.elementId).join() === 'el_set_0001');
  const deB = await elems(B, { op: 'list', type: 'character' });
  const mal = await elems(A, { op: 'list', type: 'dragon' });
  const sin = await intento(() => puertaElem.elements.run({ data: { op: 'list', type: 'character' } }));
  check('E4) otra cuenta ve lo suyo; una clase que no existe, datos sin forma; sin sesión, nada',
    deB.ok && deB.valor.elements.map((e) => e.elementId).join() === 'el_ajeno_0001' && !mal.ok && mal.error?.code === 'invalid-argument' && !sin.ok && sin.error?.code === 'unauthenticated',
    `${codigo(deB)} · ${codigo(mal)} · ${codigo(sin)}`);
}

/* ═══ La app, con dobles ═══════════════════════════════════════════════════ */
const { crearCargador } = await import('./filmmaker-cliente.mjs');
const requerirApp = createRequire(path.resolve(RAIZ, 'package.json'));
const React = requerirApp('react');
const { renderToStaticMarkup } = requerirApp('react-dom/server');
const hc = React.createElement;
let almacen = null; let indiceDeEstado = 0;
const useStatePersistente = (inicial) => {
  if (!almacen) return React.useState(inicial);
  const i = indiceDeEstado++;
  if (!(i in almacen)) almacen[i] = typeof inicial === 'function' ? inicial() : inicial;
  return [almacen[i], (v) => { almacen[i] = typeof v === 'function' ? v(almacen[i]) : v; }];
};
const recordar = (si) => { almacen = si ? [] : null; };
/*
 * Un dibujado estático no corre los efectos. La hoja de la estructura pide lo guardado AL ABRIRSE, en un efecto: solo
 * mientras se dibuja esa hoja, los efectos corren en el momento (lo que piden es un doble, sin estado que cambie).
 */
let correrEfectos = false;
const useEffectDePrueba = (fn, deps) => (correrEfectos ? void fn() : React.useEffect(fn, deps));
let botones = []; let cajas = []; let hojas = [];
const Caja = ({ children, accessibilityLabel }) => hc('div', { 'aria-label': accessibilityLabel }, children);
const Texto = ({ children }) => hc('span', null, children);
const Toque = ({ children, onPress, disabled, accessibilityLabel }) => { botones.push({ etiqueta: accessibilityLabel, tocar: onPress, apagado: !!disabled }); return hc('button', { 'aria-label': accessibilityLabel, disabled: !!disabled }, children); };
const rn = {
  View: Caja, Text: Texto, TouchableOpacity: Toque, ScrollView: Caja, Modal: Caja, TextInput: () => hc('textarea'),
  ActivityIndicator: ({ accessibilityLabel }) => hc('progress', { 'aria-label': accessibilityLabel }),
  Image: ({ source }) => hc('img', { src: source?.uri }),
  StyleSheet: { create: (s) => s, flatten: (s) => s, hairlineWidth: 1, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'web', select: (o) => o.web ?? o.default },
  Dimensions: { get: () => ({ width: 1280, height: 800 }), addEventListener: () => ({ remove() {} }) },
};
const colores = new Proxy({}, { get: () => '#000000' });
const cargarReal = crearCargador({ dobles: { 'react-native': rn } });
const { crearTraductor } = cargarReal('i18n/traducir.ts');
const formatoReal = cargarReal('i18n/formato.ts');
const ES = cargarReal('i18n/textos/es/index.ts').es;
const faltan = new Set();
const t = crearTraductor('es', { es: ES }, { alFaltarUnaClave: (k) => faltan.add(k) });
const formato = {
  numero: (v, o) => formatoReal.formatearNumero(v, 'es', o), lista: (c, tipo) => formatoReal.formatearLista(c, 'es', tipo),
  tiempoRelativo: (f) => formatoReal.formatearTiempoRelativo(f, 'es', HOY + 5 * 60_000), fecha: (f, o) => formatoReal.formatearFecha(f, 'es', o),
};
const avisos = []; let confirmar = true; const confirmaciones = [];
const tema = { useTheme: () => ({ theme: { colors: colores } }), enTemaClaro: (P) => P, useEnStudio: () => false };
const idioma = { useT: () => t, useIdioma: () => ({ t, formato, locale: 'es', idioma: 'es' }) };
const llamadas = [];
let respuestaDe = async () => ({ data: {} });
const dobles = {
  react: { ...React, useState: useStatePersistente, useEffect: useEffectDePrueba },
  'react-native': rn,
  '@expo/vector-icons': { Ionicons: ({ name }) => hc('i', { 'data-icono': name }) },
  'expo-av': { Video: () => hc('video'), ResizeMode: { COVER: 'cover', CONTAIN: 'contain' } },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }), SafeAreaView: Caja },
  'firebase/functions': { httpsCallable: (_f, nombre) => async (datos) => { llamadas.push({ nombre, datos }); return respuestaDe(nombre, datos); } },
  'firebase/firestore': { collection: () => ({}), getDocs: async () => ({ empty: true, docs: [] }), limit: () => ({}), onSnapshot: () => () => {}, orderBy: () => ({}), query: () => ({}), where: () => ({}) },
  '../config/firebase': { db: {}, functions: {} },
  '../../contexts/ThemeContext': tema, '../../../contexts/ThemeContext': tema, '../contexts/ThemeContext': tema,
  '../../contexts/IdiomaContext': idioma, '../../../contexts/IdiomaContext': idioma, '../contexts/IdiomaContext': idioma,
  '../../utils/scale': { scale: (x) => x }, '../../../utils/scale': { scale: (x) => x },
  '../../hooks/useResponsive': { useResponsive: () => ({ isDesktop: true, isMobile: false, isTablet: false }) },
  '../../../utils/notify': { notify: (...a) => avisos.push(a), confirmAction: async (...a) => { confirmaciones.push(a); return confirmar; } },
  '../../workspace/HojaInferior': { __esModule: true, default: ({ titulo, subtitulo, children }) => { hojas.push({ titulo, subtitulo }); return hc('section', { 'aria-label': titulo }, children); } },
  '../../creator/CajaDePrompt': { __esModule: true, default: (p) => { cajas.push(p); return hc('textarea', { 'aria-label': p.placeholder }); } },
};
const cargar = crearCargador({ dobles });
const dibujar = (el) => {
  botones = []; cajas = []; hojas = []; indiceDeEstado = 0;
  const html = renderToStaticMarkup(el);
  return { html, botones: botones.slice(), cajas: cajas.slice(), hojas: hojas.slice(), texto: html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ') };
};
const boton = (d, etiqueta) => d.botones.find((b) => b.etiqueta === etiqueta);
const calma = async () => { for (let i = 0; i < 30; i++) await new Promise((r) => setImmediate(r)); };

/* ═══ S · LOS SERVICIOS DE LA APP ═════════════════════════════════════════ */
console.log('\n── S · Los servicios: versiones, volver a una, lo guardado y Weë Brain con la producción ──');
const FS = cargar('services/filmmakerService.ts');
{
  const pedidas = [];
  const llamarFalso = async (d) => {
    pedidas.push(d);
    if (d.op === 'history') return { versions: [{ revision: 3, kind: 'restore', createdAt: 5, restoredFrom: 1, scenes: 1, shots: 2 }, { revision: 2, kind: 'apply', createdAt: 4, scenes: 1, shots: 2 }, { revision: 'x' }, { revision: 1, kind: 'rara', createdAt: 3, scenes: 1, shots: 2 }] };
    if (d.op === 'restore') return { productionId: pid(1), revision: 4, status: 'active', createdAt: 1, updatedAt: 9, production: conFaro(), restoredFrom: 1, changed: true, alreadyApplied: false };
    return {};
  };
  const s = FS.crearFilmmakerService(llamarFalso);
  const h = await s.historyOfProduction(pid(1));
  check('S1) las versiones, tal cual llegan; una entrada sin forma no se enseña',
    h.ok && JSON.stringify(h.valor.map((v) => `${v.revision}:${v.kind}${v.restoredFrom ?? ''}`)) === JSON.stringify(['3:restore1', '2:apply']) && JSON.stringify(pedidas.at(-1)) === JSON.stringify({ op: 'history', productionId: pid(1) }));
  const r = await s.restoreProduction({ productionId: pid(1), expectedRevision: 3, revision: 1, operationId: 'op_1' });
  check('S2) volver a una: se manda qué se ve y a cuál, con su id; vuelve la producción en su revisión NUEVA',
    r.ok && r.valor.produccion.revision === 4 && r.valor.restoredFrom === 1 && r.valor.changed === true
    && JSON.stringify(pedidas.at(-1)) === JSON.stringify({ op: 'restore', productionId: pid(1), expectedRevision: 3, revision: 1, operationId: 'op_1' }));
  const { elementsService } = cargar('services/elementsService.ts');
  respuestaDe = async (nombre, datos) => ({ data: nombre === 'elements' && datos.op === 'list' ? { elements: [{ elementId: 'el_luna_0001', type: 'character', name: 'Luna', version: 3 }, { elementId: 'mal', type: 'character' }] } : {} });
  const e = await elementsService.listar('character');
  /*
   * Reanclada por nombre en la Fase 22 del motor (auditoría final del 2026-09-28, arreglo R7): la lista va por páginas,
   * así que la petición lleva también cuántos quiere (`limit`, 20). Lo demás, igual.
   */
  check('S3) lo guardado de una clase, por `elements`: lo que no tiene forma no llega', e.ok && e.elementos.length === 1 && e.elementos[0].name === 'Luna'
    && llamadas.at(-1).nombre === 'elements' && JSON.stringify(llamadas.at(-1).datos) === JSON.stringify({ op: 'list', type: 'character', limit: 20 }));
  respuestaDe = async () => { throw new Error('sin red'); };
  check('S4) sin red, no hay ninguno: quien pinta lo dice', (await elementsService.listar('character')).ok === false);
  const { brainService } = cargar('services/brainService.ts');
  respuestaDe = async (nombre, datos) => ({ data: { chatId: 'c1', messageId: datos.messageId, text: 'Te propongo esto.', sources: [], suggestedExperience: null, credits: 0, demo: false, duplicate: false, proposal: null, proposalIssue: null } });
  await brainService.send({ message: 'hola', messageId: 'm_1', locale: 'es', produccion: { productionId: pid(1), revision: 3 } });
  check('S5) Weë Brain recibe la producción abierta por la misma puerta de siempre', llamadas.at(-1).nombre === 'brainChat' && JSON.stringify(llamadas.at(-1).datos.produccion) === JSON.stringify({ productionId: pid(1), revision: 3 }));
}

/* ═══ K · EL CONTROLADOR: VOLVER A UNA VERSIÓN ════════════════════════════ */
console.log('\n── K · El controlador vuelve a una versión con CAS, y nunca encima de cambios sin guardar ──');
{
  const { crearControladorDeProduccion } = cargar('utils/controladorDeProduccion.ts');
  const guardada = (revision) => ({ productionId: pid(1), revision, status: 'active', createdAt: 1, updatedAt: 1, production: conFaro() });
  const restauraciones = [];
  let restaurar = async (d) => { restauraciones.push(d); return { ok: true, valor: { produccion: guardada(4), restoredFrom: d.revision, changed: true, alreadyApplied: false } }; };
  const servicio = {
    getProduction: async () => ({ ok: true, valor: guardada(3) }),
    applyProductionOperations: async () => ({ ok: false, fallo: { tipo: 'desconocido', code: 'x', messageKey: 'x', problems: [], reintentable: false } }),
    archiveProduction: async () => ({ ok: false }), unarchiveProduction: async () => ({ ok: false }),
    restoreProduction: (d) => restaurar(d),
  };
  let serie = 0;
  const c = crearControladorDeProduccion(pid(1), { servicio, nuevoIdDeOperacion: () => `op_${++serie}`, programar: () => () => {} });
  await c.cargar();
  const bien = await c.restaurar(1);
  check('K1) vuelve con la revisión que tiene guardada (CAS) y un id de operación, y carga entera la que vuelve',
    bien.ok && bien.restauradaDesde === 1 && JSON.stringify(restauraciones[0]) === JSON.stringify({ productionId: pid(1), expectedRevision: 3, revision: 1, operationId: 'op_1' }) && c.leer().estado.confirmada?.revision === 4);
  c.gesto([{ op: 'rename_production', title: 'Sin guardar' }]);
  const conCambios = await c.restaurar(2);
  check('K2) con cambios sin guardar no se vuelve a nada: primero se guardan', !conCambios.ok && conCambios.motivo === 'cambios_sin_guardar' && restauraciones.length === 1);
  const c2 = crearControladorDeProduccion(pid(1), { servicio, nuevoIdDeOperacion: () => 'op_x', programar: () => () => {} });
  await c2.cargar();
  restaurar = async () => ({ ok: false, fallo: { tipo: 'conflicto', code: 'revision_conflict', messageKey: 'filmmaker.persistence.revision_conflict', problems: [], reintentable: false } });
  const mal = await c2.restaurar(1);
  check('K3) si el servidor no la acepta, se dice por qué y nada cambia', !mal.ok && mal.motivo === 'fallo' && mal.fallo.code === 'revision_conflict' && c2.leer().estado.confirmada?.revision === 3);
}

/* ═══ H · LOS TRES HOOKS ══════════════════════════════════════════════════ */
console.log('\n── H · Los hooks: Weë Brain en el editor, las versiones y lo guardado, con lo que llega tarde fuera ──');
/*
 * Un React mínimo para un hook: guarda su estado y sus refs por orden de llamada, y corre cada efecto cuando cambian
 * sus dependencias —limpiando el anterior—, como React. `pasar` es un dibujado.
 */
const miniReact = () => {
  const estado = []; const refs = []; const efectos = [];
  let i = 0; let j = 0; let k = 0;
  const react = {
    useState: (inicial) => {
      const x = i++;
      if (!(x in estado)) estado[x] = typeof inicial === 'function' ? inicial() : inicial;
      return [estado[x], (v) => { estado[x] = typeof v === 'function' ? v(estado[x]) : v; }];
    },
    useRef: (inicial) => { const x = j++; if (!(x in refs)) refs[x] = { current: inicial }; return refs[x]; },
    useCallback: (fn) => fn,
    useEffect: (fn, deps) => {
      const x = k++; const previo = efectos[x];
      if (previo && deps && deps.length === previo.deps.length && deps.every((d, y) => Object.is(d, previo.deps[y]))) return;
      if (previo && typeof previo.limpiar === 'function') previo.limpiar();
      efectos[x] = { deps: deps ?? [], limpiar: fn() };
    },
  };
  return { react, pasar: (hook, ...args) => { i = 0; j = 0; k = 0; return hook(...args); } };
};
const PROP = (productionId, baseRevision) => ({ productionId, baseRevision, operations: [{ op: 'rename_production', title: 'Otra' }], applied: 1, timelineChanged: false });
const RESP = (extra = {}) => ({ chatId: 'chat_1', messageId: 'm', text: 'Hecho.', sources: [], suggestedExperience: null, credits: 0, demo: false, duplicate: false, ...extra });
{
  const m = miniReact();
  const alBrain = []; let contestar = null;
  /* Fase 22 del motor (R1): el hook dice también cuánto falta si no alcanzan los Credits, con la regla de siempre. */
  const cargarH = crearCargador({ dobles: {
    react: m.react, '../contexts/IdiomaContext': idioma,
    '../services/creditsService': { creditsShortfall: () => null },
    '../services/brainService': {
      brainService: { send: (d) => { alBrain.push(d); return new Promise((res, rej) => { contestar = { res, rej }; }); } },
      newMessageId: () => `m_prueba_${alBrain.length + 1}`,
    },
  } });
  const { useWeeBrainDelEditor } = cargarH('hooks/useWeeBrainDelEditor.ts');
  const ver = (id = pid(1), rev = 3) => m.pasar(useWeeBrainDelEditor, id, rev);
  let b = ver();
  b.enviar('  Pon niebla en la primera escena  ');
  b = ver();
  check('H1) manda a Weë Brain lo escrito, limpio, con su id, el idioma y la producción GUARDADA; y piensa',
    b.fase === 'pensando' && JSON.stringify(alBrain) === JSON.stringify([{ message: 'Pon niebla en la primera escena', messageId: 'm_prueba_1', locale: 'es', produccion: { productionId: pid(1), revision: 3 } }]));
  b.enviar('otra');
  check('H2) mientras piensa no se manda otra', alBrain.length === 1);
  contestar.res(RESP({ bloque: { usadas: 2, total: 12, restantes: 10 }, proposal: PROP(pid(1), 3), proposalIssue: null }));
  await calma();
  b = ver();
  check('H3) contesta: su texto, su propuesta y lo que queda del bloque', b.fase === 'contesto' && b.texto === 'Hecho.' && b.propuesta?.baseRevision === 3 && b.bloque?.restantes === 10 && b.sinPropuesta === false);
  b.enviar('Y que llueva');
  b = ver();
  check('H4) el siguiente sigue la MISMA conversación, y la propuesta anterior se va mientras piensa', alBrain[1].chatId === 'chat_1' && b.propuesta === null && b.fase === 'pensando');
  contestar.res(RESP({ proposal: PROP(pid(9), 3), proposalIssue: null }));
  await calma();
  b = ver();
  check('H5) una propuesta de OTRA producción no se enseña', b.fase === 'contesto' && b.propuesta === null);
  b.enviar('Otra vez');
  contestar.res(RESP({ proposal: null, proposalIssue: 'invalid' }));
  await calma();
  b = ver();
  check('H6) si intentó proponer y no salió nada aplicable, se sabe', b.sinPropuesta === true && b.propuesta === null && b.fase === 'contesto');
  b.enviar('Falla');
  contestar.rej(new Error('sin red'));
  await calma();
  b = ver();
  check('H7) si no se pudo hablar con Weë Brain, error', b.fase === 'error');
  b.enviar('Con propuesta');
  contestar.res(RESP({ proposal: PROP(pid(1), 3), proposalIssue: null }));
  await calma();
  b = ver();
  const habia = !!b.propuesta;
  b.descartar();
  b = ver();
  check('H8) descartar quita la propuesta y nada más', habia && b.propuesta === null && b.texto === 'Hecho.' && b.fase === 'contesto');
  b.enviar('Tarde');
  const tarde = contestar;
  ver(pid(2), 0);
  tarde.res(RESP({ text: 'De la otra producción', proposal: PROP(pid(1), 3) }));
  await calma();
  b = ver(pid(2), 0);
  check('H9) al cambiar de producción, lo que llega tarde de la anterior no se pinta', b.fase === 'quieto' && b.texto === null && b.propuesta === null && b.bloque === null);
  b.enviar('Nueva');
  check('H10) y empieza otra conversación, con la revisión 0 como cualquier otra', !('chatId' in alBrain.at(-1)) && JSON.stringify(alBrain.at(-1).produccion) === JSON.stringify({ productionId: pid(2), revision: 0 }));
  const cuantos = alBrain.length;
  const m2 = miniReact();
  const cargarH2 = crearCargador({ dobles: { react: m2.react, '../contexts/IdiomaContext': idioma, '../services/creditsService': { creditsShortfall: () => null }, '../services/brainService': { brainService: { send: (d) => { alBrain.push(d); return new Promise(() => {}); } }, newMessageId: () => 'm_x' } } });
  const H2 = cargarH2('hooks/useWeeBrainDelEditor.ts').useWeeBrainDelEditor;
  m2.pasar(H2, null, null).enviar('Hola');
  m2.pasar(H2, pid(1), null).enviar('Hola');
  m2.pasar(H2, pid(1), 3).enviar('   ');
  check('H11) sin producción guardada, sin revisión, o con un mensaje vacío, no se manda nada', alBrain.length === cuantos);
}
{
  const m = miniReact();
  const pedidas = []; const responder = [];
  const cargarH = crearCargador({ dobles: { react: m.react, '../services/filmmakerService': { filmmakerService: { historyOfProduction: (id) => { pedidas.push(id); return new Promise((res) => responder.push(res)); } } } } });
  const { useHistorialDeProduccion } = cargarH('hooks/useHistorialDeProduccion.ts');
  const V = (revision) => ({ revision, kind: 'apply', createdAt: HOY, scenes: 1, shots: 2 });
  let h = m.pasar(useHistorialDeProduccion, null, null);
  check('H12) sin producción guardada no se pide nada, y se espera', pedidas.length === 0 && h.carga === 'cargando');
  m.pasar(useHistorialDeProduccion, pid(1), 3);
  const de3 = responder.at(-1);
  m.pasar(useHistorialDeProduccion, pid(1), 4);
  const de4 = responder.at(-1);
  de4({ ok: true, valor: [V(4), V(3)] });
  await calma();
  de3({ ok: true, valor: [V(3)] });
  await calma();
  h = m.pasar(useHistorialDeProduccion, pid(1), 4);
  check('H13) se piden otra vez al cambiar la revisión guardada, y lo que llega de la anterior no se pinta',
    JSON.stringify(pedidas) === JSON.stringify([pid(1), pid(1)]) && h.carga === 'listo' && h.versiones.map((v) => v.revision).join() === '4,3');
  const antes = pedidas.length;
  m.pasar(useHistorialDeProduccion, pid(1), 4);
  check('H14) dibujar otra vez sin cambios no vuelve a pedir', pedidas.length === antes);
  m.pasar(useHistorialDeProduccion, pid(1), 5);
  responder.at(-1)({ ok: false, fallo: { tipo: 'sin_conexion', code: 'x', messageKey: 'x', problems: [], reintentable: true } });
  await calma();
  h = m.pasar(useHistorialDeProduccion, pid(1), 5);
  check('H15) si no se pueden leer, error y ninguna', h.carga === 'error' && h.versiones.length === 0);
}
{
  const m = miniReact();
  const pedidos = []; const pendientes = [];
  /* Fase 22 del motor (R7): el hook pide por páginas (`pagina`); la primera de cada clase, a la vez, como antes. */
  const cargarH = crearCargador({ dobles: { react: m.react, '../services/elementsService': { elementsService: { pagina: (tipo) => { pedidos.push(tipo); return new Promise((res) => pendientes.push(res)); } } } } });
  const { useElementosParaVincular } = cargarH('hooks/useElementosParaVincular.ts');
  const EL = (elementId, type, name, version = 1) => ({ elementId, type, name, version });
  let e = m.pasar(useElementosParaVincular);
  check('H16) no pide nada hasta que se abre una hoja', e.carga === 'sin_pedir' && pedidos.length === 0);
  e.cargar(['place', 'scene']);
  e = m.pasar(useElementosParaVincular);
  check('H17) al pedir: cargando, y una pregunta por clase', e.carga === 'cargando' && JSON.stringify(pedidos) === '["place","scene"]');
  pendientes[0]({ ok: true, elementos: [EL('el_zoco_0001', 'place', 'Zoco')] });
  pendientes[1]({ ok: true, elementos: [EL('el_azotea_0001', 'scene', 'Azotea', 2)] });
  await calma();
  e = m.pasar(useElementosParaVincular);
  /*
   * Reanclada por nombre en la Fase 22 del motor (auditoría final del 2026-09-28, arreglo R7): el orden es ESTABLE
   * —clase a clase, en el orden en que se piden, y dentro de cada una el del servidor— y ya no se reordena por nombre,
   * porque con páginas lo que llega después saltaría al medio de la lista.
   */
  check('H18) las clases, juntas, clase a clase y en el orden del servidor', e.carga === 'listos' && e.lista.map((x) => x.name).join() === 'Zoco,Azotea' && e.hayMas === false);
  e.cargar(['character']);
  const vieja = pendientes.at(-1);
  e.cargar(['place']);
  const nueva = pendientes.at(-1);
  nueva({ ok: true, elementos: [EL('el_faro_0001', 'place', 'Faro')] });
  await calma();
  vieja({ ok: true, elementos: [EL('el_luna_0001', 'character', 'Luna')] });
  await calma();
  e = m.pasar(useElementosParaVincular);
  check('H19) lo que llega de una petición anterior no se pinta', e.carga === 'listos' && e.lista.map((x) => x.name).join() === 'Faro');
  e.cargar(['place', 'scene']);
  const [p1, p2] = pendientes.slice(-2);
  p1({ ok: true, elementos: [EL('el_faro_0001', 'place', 'Faro')] });
  p2({ ok: false });
  await calma();
  e = m.pasar(useElementosParaVincular);
  check('H20) si una clase no se puede leer, error y ninguna', e.carga === 'error' && e.lista.length === 0);
}

/* ── Una producción para las pantallas ── */
const produccionUI = () => clon({
  ...conFaro(),
  characters: [{ id: 'char-luna', name: 'Luna', identityDescription: 'Farera', element: { elementId: 'el_luna_0001', version: 3 } }, { id: 'char-mar', name: 'Mar' }],
  locations: [{ id: 'loc-faro', name: 'El faro', description: 'Un faro blanco' }],
  scenes: [{
    id: 'sc-0001', order: 0, title: 'Amanecer', description: 'El sol sale detrás del faro',
    shots: [
      { id: 'sh-0101', order: 0, durationSec: 4, description: 'Una farera sube despacio la escalera del faro', advanced: { prompt: 'Polvo dorado en el aire' } },
      { id: 'sh-0102', order: 1, durationSec: 4, description: 'La lámpara se enciende' },
    ],
  }],
});
const gestos = [];
const tomaQuieta = { fase: { fase: 'elige_calidad' }, calidad: null, enElPlano: null, ultima: null, aviso: null, calidades: null, economia: null, cancelacion: null, elegirCalidad() {}, generar() {}, reintentar() {}, cancelar() {} };
const espacioCon = (extra = {}) => ({
  produccion: produccionUI(), tarjetas: [], linea: undefined, lista: undefined, recomendaciones: [], porRehacer: { scenes: [], shots: [], audio: [], removed: [] },
  estados: {}, guardado: 'guardado', fallo: null, hayCambios: false, editable: true, ids: { escena: () => 'sc_n', plano: () => 'sh_n' }, videos: new Map(), toma: tomaQuieta,
  montaje: { fase: 'sin_montaje', montaje: null, url: null, poster: null, motivo: null, limite: null, cabeEnUnWeel: false, publicacion: { fase: 'nada' }, pedir() {}, publicar() {} },
  seleccion: { tipo: 'plano', id: 'sh-0101' }, rechazadas: new Set(),
  onSeleccionar() {}, onGesto: (o) => { gestos.push(o); return { ok: true }; }, onRechazar() {}, onGuardarAhora() {}, onReintentar() {}, onDuplicar() {}, onArchivar() {}, onLista() {}, onExportar() {},
  ...extra,
});

/* ═══ U · EN PANTALLA ═════════════════════════════════════════════════════ */
console.log('\n── U · En pantalla: el prompt avanzado, las versiones, los vínculos y Weë Brain ──');
{
  /* El prompt avanzado, oculto hasta que se pide. */
  const Propiedades = cargar('components/studio/produccion/ProductionShotProperties.tsx').default;
  recordar(true);
  const a0 = dibujar(hc(Propiedades, { espacio: espacioCon() }));
  boton(a0, 'Ver el prompt avanzado')?.tocar();
  const a1 = dibujar(hc(Propiedades, { espacio: espacioCon() }));
  check('U1) el prompt avanzado del plano no se ve hasta que se pide; pedido, su texto tal cual y cómo se usa',
    !!boton(a0, 'Ver el prompt avanzado') && !/Polvo dorado/.test(a0.texto) && /Polvo dorado en el aire/.test(a1.texto) && /Weë lo añade detrás de su propia descripción/.test(a1.texto) && !!boton(a1, 'Ocultar el prompt avanzado'));
  recordar(true);
  const a2 = dibujar(hc(Propiedades, { espacio: espacioCon({ seleccion: { tipo: 'plano', id: 'sh-0102' } }) }));
  check('U2) un plano sin prompt avanzado no tiene ni el botón', !boton(a2, 'Ver el prompt avanzado'));
  recordar(false);

  /* Las versiones, en el panel del proyecto. */
  const Proyecto = cargar('components/studio/produccion/ProductionProjectPanel.tsx').default;
  const restauradas = [];
  const historial = { carga: 'listo', versiones: [{ revision: 3, kind: 'restore', createdAt: HOY, restoredFrom: 1, scenes: 1, shots: 2 }, { revision: 2, kind: 'apply', createdAt: HOY, scenes: 1, shots: 2 }, { revision: 1, kind: 'apply', createdAt: HOY, scenes: 1, shots: 2 }] };
  const p1 = dibujar(hc(Proyecto, { espacio: espacioCon({ historial, revision: 3, onRestaurar: (n) => restauradas.push(n) }), onEstructura() {} }));
  check('U3) las versiones: la de ahora marcada, la vuelta dice a cuál, y cada anterior con «Volver a esta versión»',
    /Versiones/.test(p1.texto) && /Versión 3 ·/.test(p1.texto) && /Vuelta a la versión 1/.test(p1.texto) && /La de ahora/.test(p1.texto)
    && p1.botones.filter((b) => b.etiqueta === 'Volver a esta versión').length === 2, p1.texto.slice(p1.texto.indexOf('Versiones'), p1.texto.indexOf('Versiones') + 200));
  confirmar = false;
  p1.botones.find((b) => b.etiqueta === 'Volver a esta versión').tocar();
  await calma();
  const sinConfirmar = restauradas.length;
  confirmar = true;
  p1.botones.find((b) => b.etiqueta === 'Volver a esta versión').tocar();
  await calma();
  check('U4) volver pide confirmación —que dice que ninguna se pierde— y sin ella no vuelve a nada',
    sinConfirmar === 0 && JSON.stringify(restauradas) === '[2]' && confirmaciones.at(-1)?.[0] === '¿Volver a la versión 2?' && /ninguna se pierde/.test(confirmaciones.at(-1)?.[1] ?? ''));
  const p2 = dibujar(hc(Proyecto, { espacio: espacioCon({ historial, revision: 3, hayCambios: true, onRestaurar: () => {} }), onEstructura() {} }));
  check('U5) con cambios sin guardar, volver está apagado', p2.botones.filter((b) => b.etiqueta === 'Volver a esta versión').every((b) => b.apagado));
  const p3 = dibujar(hc(Proyecto, { espacio: espacioCon({ historial: { carga: 'error', versiones: [] }, revision: 3, onRestaurar: () => {} }), onEstructura() {} }));
  const p4 = dibujar(hc(Proyecto, { espacio: espacioCon(), onEstructura() {} }));
  check('U6) sin poder cargarlas, se dice; y sin historial, la sección no está', /No se pudieron cargar las versiones\./.test(p3.texto)
    && !p4.texto.includes('Versiones') && !boton(p4, 'Volver a esta versión'));

  /*
   * Los vínculos a lo guardado. Reancladas por nombre en la Fase 23 del motor (el espacio de trabajo, encargo del
   * 2026-09-28): el reparto y los lugares ya no se leen en la hoja de la estructura —que queda para el guion—, sino que
   * se EDITAN en el proyecto (`ProductionFichas`), y vincular vive allí, con el selector común. Las reglas son las de
   * la Fase 20: el nombre de lo vinculado, quitarlo con `element: null`, «Volver» y no «Cancelar», la versión elegida,
   * las clases de cada ficha, los errores y la producción archivada.
   */
  const cargarFichas = crearCargador({ dobles: { ...dobles, '../../creator/CampoQueCrece': { __esModule: true, default: () => null } } });
  const Fichas = cargarFichas('components/studio/produccion/ProductionFichas.tsx').default;
  const pedidasDeElementos = [];
  const elementos = (carga, lista) => ({ carga, lista, hayMas: false, cargandoMas: false, cargar: (tipos) => pedidasDeElementos.push(tipos), cargarMas() {} });
  const LISTA = [{ elementId: 'el_luna_0001', type: 'character', name: 'Luna', version: 3 }, { elementId: 'el_mar_0001', type: 'character', name: 'Mar', version: 2 }];
  const fichas = (clase, el, editable = true) => dibujar(hc(Fichas, { clase, espacio: espacioCon({ elementos: el, editable }), nuevoId: () => 'ch_n' }));
  const abrir = (d, nombre) => d.botones.find((b) => b.etiqueta === `Abrir ${nombre}`).tocar();
  gestos.length = 0;
  correrEfectos = true;
  recordar(true);
  const h0 = fichas('personaje', elementos('listos', LISTA));
  abrir(h0, 'Luna');
  const h0b = fichas('personaje', elementos('listos', LISTA));
  check('U7) el reparto: quien está vinculado lo dice con su nombre y puede dejar de estarlo; quien no, se puede vincular',
    /Vinculado a «Luna»/.test(h0.texto) && !!boton(h0b, 'Quitar el vínculo') && !boton(h0b, 'Vincular con uno guardado'));
  boton(h0b, 'Quitar el vínculo').tocar();
  check('U8) quitar el vínculo es la operación de F1-A de siempre, con `element: null`', JSON.stringify(gestos.at(-1)) === JSON.stringify([{ op: 'update_character', characterId: 'char-luna', changes: { element: null } }]));
  recordar(true);
  abrir(fichas('personaje', elementos('listos', LISTA)), 'Mar');
  boton(fichas('personaje', elementos('listos', LISTA)), 'Vincular con uno guardado').tocar();
  const h1 = fichas('personaje', elementos('listos', LISTA));
  check('U9) vincular abre la lista de lo guardado —con su nombre— y se puede volver sin elegir («Volver», no «Cancelar»: vuelve a las fichas)', /Elige uno de los que tienes guardados/.test(h1.texto) && !!boton(h1, 'Luna') && !!boton(h1, 'Mar') && !!boton(h1, 'Volver') && !boton(h1, 'Cancelar'));
  boton(h1, 'Mar').tocar();
  check('U10) elegir uno lo vincula en SU versión, con la operación de siempre', JSON.stringify(gestos.at(-1)) === JSON.stringify([{ op: 'update_character', characterId: 'char-mar', changes: { element: { elementId: 'el_mar_0001', version: 2 } } }]));
  recordar(true);
  const FARO = [{ elementId: 'el_faro_0001', type: 'place', name: 'El faro', version: 1 }];
  abrir(fichas('lugar', elementos('listos', FARO)), 'El faro');
  boton(fichas('lugar', elementos('listos', FARO)), 'Vincular con uno guardado').tocar();
  boton(fichas('lugar', elementos('listos', FARO)), 'El faro').tocar();
  check('U11) un lugar, con `update_location`; y al abrir cada selector se pide lo que encaja con esa ficha —personajes; lugares y escenas—',
    JSON.stringify(gestos.at(-1)) === JSON.stringify([{ op: 'update_location', locationId: 'loc-faro', changes: { element: { elementId: 'el_faro_0001', version: 1 } } }])
    && pedidasDeElementos.some((p) => JSON.stringify(p) === '["character"]') && pedidasDeElementos.some((p) => JSON.stringify(p) === '["place","scene"]'));
  recordar(true);
  abrir(fichas('personaje', elementos('error', [])), 'Mar');
  boton(fichas('personaje', elementos('error', [])), 'Vincular con uno guardado').tocar();
  const e1 = fichas('personaje', elementos('error', []));
  recordar(true);
  const v0 = fichas('personaje', elementos('listos', []));
  abrir(v0, 'Mar');
  boton(fichas('personaje', elementos('listos', [])), 'Vincular con uno guardado').tocar();
  const v1 = fichas('personaje', elementos('listos', []));
  check('U12) sin poder cargar lo guardado, se dice; sin nada guardado de esa clase, también; y un vínculo a algo que no llegó, sin nombre',
    /No se pudieron cargar los que tienes guardados\./.test(e1.texto) && /Todavía no tienes ninguno guardado de esta clase\./.test(v1.texto) && /Vinculado a uno de los que tienes guardados/.test(v0.texto));
  recordar(true);
  abrir(dibujar(hc(Fichas, { clase: 'personaje', espacio: espacioCon(), nuevoId: () => 'ch_n' })), 'Mar');
  const s0 = dibujar(hc(Fichas, { clase: 'personaje', espacio: espacioCon(), nuevoId: () => 'ch_n' }));
  recordar(true);
  abrir(fichas('personaje', elementos('listos', LISTA), false), 'Luna');
  const s1 = fichas('personaje', elementos('listos', LISTA), false);
  /* Y la ficha SIN vincular: su «Vincular» también (antes solo se miraba la vinculada, y un «Vincular» encendido pasaba). */
  recordar(true);
  abrir(fichas('personaje', elementos('listos', LISTA), false), 'Mar');
  const s2 = fichas('personaje', elementos('listos', LISTA), false);
  check('U13) sin cómo vincular, no se ofrece vincular; archivada, los botones están apagados —vincular y quitar el vínculo—',
    !boton(s0, 'Vincular con uno guardado') && !boton(s0, 'Quitar el vínculo')
    && boton(s1, 'Quitar el vínculo')?.apagado === true && boton(s2, 'Vincular con uno guardado')?.apagado === true);
  correrEfectos = false;
  recordar(false);

  /* Weë Brain en el editor. */
  const Caja = cargar('components/studio/produccion/ProductionBrainBox.tsx').default;
  const enviados = []; let descartes = 0;
  /*
   * Fase 22 del motor (auditoría final del 2026-09-28, arreglo R1): Weë Brain en el editor lleva también el precio del
   * próximo mensaje (sin él no se envía), lo que falta si no alcanzan los Credits y el id con que se aplica su
   * propuesta. Aquí, un precio ya calculado —el de una respuesta que no cobra— para que la caja se pueda usar.
   */
  const PRECIO = { service: 'ai_brain', label: 'Respuesta de Weë Brain', credits: 0, usd: 0.0004, creditsPerUsd: 100 };
  const brain = (extra) => ({
    fase: 'quieto', texto: null, propuesta: null, idDeLaPropuesta: 'wb_m_prueba_1', sinPropuesta: false, bloque: null,
    cotizacion: { estado: 'lista', precio: PRECIO }, faltan: null, cotizar() {},
    enviar: (m) => enviados.push(m), descartar: () => { descartes++; }, ...extra,
  });
  /* Aplicar ya no es un gesto (R1): va por `onAplicarPropuesta`, y aquí se anota cada llamada. */
  const aplicadas = [];
  const alAplicar = async (ops, baseRevision, operationId) => { aplicadas.push({ ops, baseRevision, operationId }); return { ok: true, applied: ops.length, alreadyApplied: false }; };
  const PROPUESTA = { productionId: pid(1), baseRevision: 3, operations: [{ op: 'rename_production', title: 'Otra' }, { op: 'change_weather', sceneId: 'sc-0001', weather: 'fog' }], applied: 2, timelineChanged: false };
  recordar(true);
  const b0 = dibujar(hc(Caja, { espacio: espacioCon({ brain: brain(), revision: 3 }) }));
  const caja = b0.cajas[0];
  caja.onCambiar('  Pon niebla en la primera escena  ');
  const b0b = dibujar(hc(Caja, { espacio: espacioCon({ brain: brain(), revision: 3 }) }));
  b0b.cajas[0].onEnviar();
  check('U14) la caja es la común de Weë AI, con su pregunta, y lo que se escribe se manda limpio a Weë Brain',
    !!caja && caja.placeholder === 'Cuéntale qué quieres cambiar de la producción' && caja.etiquetaEnviar === 'Enviar a Weë Brain' && JSON.stringify(enviados) === '["Pon niebla en la primera escena"]');
  recordar(false);
  const b1 = dibujar(hc(Caja, { espacio: espacioCon({ brain: brain({ fase: 'pensando' }), revision: 3 }) }));
  const b2 = dibujar(hc(Caja, { espacio: espacioCon({ brain: brain({ fase: 'error' }), revision: 3 }) }));
  check('U15) mientras piensa se dice —y la caja espera—; si no se pudo, también', /Weë Brain está pensando…/.test(b1.texto) && b1.cajas[0].ocupado === true && /No se pudo hablar con Weë Brain/.test(b2.texto));
  gestos.length = 0; avisos.length = 0;
  const b3 = dibujar(hc(Caja, { espacio: espacioCon({ brain: brain({ fase: 'contesto', texto: 'Te propongo niebla y otro título.', propuesta: PROPUESTA, bloque: { usadas: 1, total: 12, restantes: 11 } }), revision: 3, onAplicarPropuesta: alAplicar }) }));
  check('U16) su respuesta, tal cual; cuántos cambios propone; y lo que queda del bloque, con la frase de siempre',
    /Te propongo niebla y otro título\./.test(b3.texto) && /Cambios que propone: 2/.test(b3.texto) && /Te quedan 11 de 12 respuestas/.test(b3.texto) && !boton(b3, 'Aplicar los cambios').apagado);
  boton(b3, 'Aplicar los cambios').tocar();
  await calma();
  /*
   * Reanclada por nombre en la Fase 22 del motor (arreglo R1): aplicar una propuesta ya NO es un gesto —un gesto se
   * agrupa y, tras un conflicto, se vuelve a aplicar encima de otra revisión—. Va sola por `onAplicarPropuesta`, con
   * sus operaciones, la revisión en que Weë Brain las comprobó y el id de la propuesta; se dice y la propuesta se va.
   */
  check('U17) aplicarlos va por su propio camino, con sus operaciones, su revisión y su id —no como un gesto—; se dice y la propuesta se va',
    gestos.length === 0 && aplicadas.length === 1 && JSON.stringify(aplicadas[0]) === JSON.stringify({ ops: PROPUESTA.operations, baseRevision: 3, operationId: 'wb_m_prueba_1' })
    && avisos.at(-1)?.[0] === 'Cambios aplicados.' && descartes === 1);
  const b4 = dibujar(hc(Caja, { espacio: espacioCon({ brain: brain({ fase: 'contesto', propuesta: PROPUESTA }), revision: 4, onAplicarPropuesta: alAplicar }) }));
  const b5 = dibujar(hc(Caja, { espacio: espacioCon({ brain: brain({ fase: 'contesto', propuesta: PROPUESTA }), revision: 3, hayCambios: true, onAplicarPropuesta: alAplicar }) }));
  const antesDeTocar = gestos.length;
  const aplicadasAntes = aplicadas.length;
  boton(b4, 'Aplicar los cambios').tocar();
  await calma();
  check('U18) si la producción cambió desde que la propuso, no se aplica: se dice y se pide otra vez; con cambios sin guardar, primero se guardan',
    boton(b4, 'Aplicar los cambios').apagado && /La producción cambió desde que Weë Brain lo propuso/.test(b4.texto) && gestos.length === antesDeTocar && aplicadas.length === aplicadasAntes
    && boton(b5, 'Aplicar los cambios').apagado && /Espera a que se guarden tus cambios\./.test(b5.texto));
  boton(b3, 'Descartar').tocar();
  const b6 = dibujar(hc(Caja, { espacio: espacioCon({ brain: brain({ fase: 'contesto', texto: 'No sé cómo hacer eso.', sinPropuesta: true }), revision: 3 }) }));
  check('U19) descartar la quita sin tocar nada; y si intentó proponer y no salió nada aplicable, se dice', descartes === 2 && gestos.length === antesDeTocar && aplicadas.length === aplicadasAntes && /Esta vez Weë Brain no propuso cambios que se puedan aplicar\./.test(b6.texto));
  const b7 = dibujar(hc(Caja, { espacio: espacioCon() }));
  check('U20) sin Weë Brain en el editor, la caja no está', b7.html === '');
  const TABS = sinComentarios(leer('components/studio/produccion/ProductionDirectorTabs.tsx'));
  const MOV = sinComentarios(leer('components/studio/produccion/ProductionMobileEditor.tsx'));
  const PANTALLA = sinComentarios(leer('screens/ProductionScreen.tsx'));
  check('U21) está en Weë AI Director del escritorio y en el editor del teléfono; la pantalla lo junta todo sobre lo GUARDADO',
    /<ProductionBrainBox espacio=\{espacio\} \/>/.test(TABS) && /vista === 'director' && \(\s*<ProductionBrainBox espacio=\{espacio\} \/>/.test(MOV)
    && /useWeeBrainDelEditor\(estado\.confirmada\?\.productionId \?\? null, estado\.confirmada\?\.revision \?\? null\)/.test(PANTALLA)
    && /useHistorialDeProduccion\(estado\.confirmada\?\.productionId \?\? null, estado\.confirmada\?\.revision \?\? null\)/.test(PANTALLA)
    && /revision: estado\.confirmada\?\.revision \?\? null,/.test(PANTALLA));
}

/* ═══ G · LAS GUARDAS ═════════════════════════════════════════════════════ */
console.log('\n── G · Los paneles no hablan con el servidor; el servidor solo gana ──');
{
  const PANELES = ['ProductionBrainBox', 'ProductionStructureSheet', 'ProductionProjectPanel', 'ProductionShotProperties', 'ProductionDirectorTabs', 'ProductionMobileEditor', 'ProductionWorkspace']
    .map((f) => `components/studio/produccion/${f}.tsx`);
  const llaman = PANELES.filter((f) => /httpsCallable|firebase\/|brainService|elementsService|filmmakerService|creatorService|fetch\(/.test(sinComentarios(leer(f))));
  check('G1) ningún panel habla con el servidor ni con una IA: lo hacen los hooks, y la pantalla los junta', llaman.length === 0, llaman.join(', '));
  /* Lo que se QUITA en el servidor: nada, salvo en la puerta de producciones la lista de operaciones —que suma una— y su comentario. */
  const quitadas = (f) => git(`diff -U0 ${tramo} -- ${f}`).split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'));
  const enLaPuerta = quitadas('functions/src/productions/puerta.ts');
  check('G2) el servidor solo GANA: `history` en productions y `list` en elements; en la puerta, solo cambia la lista de operaciones y su comentario',
    quitadas('functions/src/productions/index.ts').length === 0 && quitadas('functions/src/elements/puerta.ts').length === 0 && enLaPuerta.length === 3
    && enLaPuerta.every((l) => /^-export const OPERACIONES_DE_PRODUCCION = Object\.freeze\(/.test(l) || /^- \* /.test(l)), enLaPuerta.join(' | '));
  check('G2b) lo que el servidor gana está en la lista del motor, y el dinero no',
    ['functions/src/productions/index.ts', 'functions/src/productions/puerta.ts', 'functions/src/elements/puerta.ts'].every((f) => TOCADOS_POR_EL_MOTOR.includes(f))
    && TOCADOS_POR_EL_MOTOR.every((f) => !DINERO.some((re) => re.test(f))));
  check('G3) ni una Function nueva, ni Credits, ni el Core, ni F1-A, ni los proveedores, ni las reglas',
    git(`diff --name-only ${tramo} -- functions/src/index.ts functions/src/credits functions/src/core functions/src/filmmaker functions/src/engine firestore.rules firestore.indexes.json storage.rules`).trim() === '');
  const CLAVES = ['wsAdvancedShow', 'wsAdvancedHide', 'wsAdvancedNote', 'wsVersions', 'wsVersionLine', 'wsVersionWasRestore', 'wsVersionCurrent', 'wsVersionRestore', 'wsVersionConfirmTitle',
    'wsVersionConfirmText', 'wsVersionRestored', 'wsVersionsError', 'wsElementLink', 'wsElementUnlink', 'wsElementLinked', 'wsElementPickTitle', 'wsElementPickEmpty', 'wsElementPickError',
    'wsElementLinkedUnknown', 'wsBrainTitle', 'wsBrainPlaceholder', 'wsBrainSend', 'wsBrainThinking', 'wsBrainProposalCount', 'wsBrainApply', 'wsBrainDiscard',
    'wsBrainApplied', 'wsBrainStale', 'wsBrainNoProposal', 'wsBrainError'];
  const IDIOMAS = ['es', 'en', 'pt', 'pt-PT', 'fr', 'de', 'it', 'ko', 'ru', 'zh', 'zh-TW'];
  const sinTexto = IDIOMAS.flatMap((l) => { const s = sinCR(leer(`i18n/textos/${l}/filmmaker.ts`)); return CLAVES.filter((k) => !new RegExp(`\\n {2}${k}: '[^'\\n]+',\\n`).test(s)).map((k) => `${l}.${k}`); });
  /*
   * Reanclada por nombre en la Fase 23 del motor: `wsStructureLinkable` —el subtítulo de la hoja que solo se leía y
   * dejaba vincular— se fue con ella; vincular vive en el proyecto. Quedan treinta.
   */
  check('G4) las treinta claves que siguen, en los once idiomas; Weë y Weë Brain, sin traducir', CLAVES.length === 30 && sinTexto.length === 0
    && IDIOMAS.every((l) => /wsBrainTitle: '[^'\n]*Weë Brain/.test(sinCR(leer(`i18n/textos/${l}/filmmaker.ts`)))), sinTexto.join(', '));
  /* En chino, «项目 / 項目» es «proyecto» en Weë (`nav.projects`): lo guardado no puede llamarse igual. */
  const guardadoEnChino = ['zh', 'zh-TW'].flatMap((l) => {
    const s = sinCR(leer(`i18n/textos/${l}/filmmaker.ts`));
    return CLAVES.filter((k) => k.startsWith('wsElement'))
      .filter((k) => { const m = s.match(new RegExp(`\\n {2}${k}: '([^'\\n]+)',`)); return !m || /项目|項目/.test(m[1]); }).map((k) => `${l}.${k}`);
  });
  check('G4b) en chino, lo guardado no se llama como los proyectos', guardadoEnChino.length === 0, guardadoEnChino.join(', '));
  check('G5) ninguna clave sin texto en todo lo dibujado', faltan.size === 0, [...faltan].join(', '));
  check('G6) documentado', /### Fase 20 · /.test(leer('docs/FILMMAKER.md')));
  check('G7) esta suite está en la cadena de `npm test`', /filmmaker-conectar\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 20 · conectar en la app lo que el motor ya hace (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
