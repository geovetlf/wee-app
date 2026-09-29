/**
 * FILMMAKER ENGINE · FASE 18 — LAS REFERENCIAS DE LOS ELEMENTS: PREPARADAS, Y CERRADAS.
 *
 *   R · lo puro: los vínculos de un plano, en su orden y sin repetir; la decisión, caso a caso; la lista de modelos
 *       validados, VACÍA y en el código;
 *   S · el resolvedor, con Elements y materiales de verdad en la base: solo imágenes, listas y de la cuenta, la
 *       principal primero, con tope; archivado, en otra versión, borrado, ajeno o sin imágenes, dicho;
 *   Q · la puerta de la cuenta, cerrada por defecto;
 *   D · por la puerta del vídeo: la cotización lo cuenta —y sin vínculos, ni el campo—; los vínculos salen del
 *       requisito del SERVIDOR; y generar no cambia nada: `video.generate`, el texto de siempre, el mismo precio y ni
 *       una imagen de referencia;
 *   G · las guardas: ni proveedores, ni Credits, ni una capacidad nueva al Core; la lista, en el motor; documentado.
 *
 * De verdad: la puerta `generateVideo`, productions con su verificación de vínculos (Fase 10), el runtime de Elements,
 * el Content Core, F1-A, el conductor y el Credit Engine, sobre un Firestore en memoria (el arnés de
 * `f1d-postcanary.test.mjs`, copiado tal cual). De mentira: el adaptador de Seedance.
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

/* ═══ FASE 18 · lo que se prueba aquí ═══════════════════════════════════════ */
const RE = lib('creator/referenciasDeElementos.js');
const nucleo = lib('core/index.js');
const { TOCADOS_POR_EL_MOTOR, DINERO } = await import('./motor-filmmaker-alcance.mjs');
/** El último commit antes de esta fase. */
const ANTES = 'c06f889';
const HASTA = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 18 "').trim();
const tramo = HASTA ? `${ANTES} ${HASTA}` : ANTES;

/* Materiales de la cuenta, como los deja el Content Core: su ficha en `assets`. */
const aid = (k) => `asset_${String(k).padStart(32, '0')}`;
const material = (k, { owner = A, kind = 'image', status = 'ready' } = {}) =>
  base.docs.set(`assets/${aid(k)}`, { assetId: aid(k), ownerAccountId: owner, kind, status, createdAt: HOY, updatedAt: HOY });
for (let k = 1; k <= 8; k++) material(k);
material(9, { kind: 'video' });
material(10, { owner: B });
material(11, { status: 'processing' });
material(12);
/* Un vídeo que un Element dice que es una imagen: la ficha del Content Core manda. */
material(13, { kind: 'video' });
/* Elements de verdad —con la forma que exige el Core—, con sus materiales. */
const ref = (k, role = 'reference', kind = 'image') => ({ assetId: aid(k), role, kind });
const elemento = (elementId, type, refs, { version = 1, status = 'active', owner = A } = {}) => ({
  contract: nucleo.ELEMENT_CONTRACT_VERSION, elementId, type, version, status, name: `Element ${elementId}`,
  refs, ownerAccountId: owner, createdAt: HOY, updatedAt: HOY, ...(status === 'archived' ? { archivedAt: HOY } : {}),
});
const sembrar = (e) => { if (!nucleo.elementoValido(e)) throw new Error(`Element de prueba mal formado: ${e.elementId}`); base.docs.set(`elements/${e.elementId}`, e); };
[
  /* La principal va después en la lista a propósito: el resolvedor la pone primero. El vídeo, el ajeno y el que no está listo no cuentan. */
  elemento('el_luna_0001', 'character', [ref(2), ref(1, 'primary'), ref(9, 'reference', 'video'), ref(10), ref(11)], { version: 3 }),
  elemento('el_faro_0001', 'place', [ref(3, 'primary'), ref(4)]),
  elemento('el_farol_0001', 'object', [ref(5, 'primary'), ref(6), ref(7)], { version: 2 }),
  elemento('el_sinfotos_0001', 'character', [ref(8, 'supporting')]),
  elemento('el_repe_0001', 'object', [ref(1, 'primary'), ref(12)]),
  elemento('el_ajeno_0001', 'character', [], { owner: B }),
  elemento('el_mentira_0001', 'object', [ref(13, 'primary', 'image')]),
].forEach(sembrar);
const vinculo = (elementId, version) => ({ elementId, version });
/* Una producción con un personaje, un lugar y un objeto, y un plano en el que salen los tres (la de la Fase 10). */
const conFichas = (vinculos = {}) => {
  const p = clon({
    ...M.produccionVacia({ title: 'El faro', aspectRatio: '16:9', resolution: '720p' }),
    intent: { objective: 'Un faro al amanecer' },
    characters: [{ id: 'char-luna', name: 'Luna', identityDescription: 'Farera de sesenta años, pelo gris recogido' }],
    locations: [{ id: 'loc-faro', name: 'El faro', description: 'Un faro blanco sobre un acantilado' }],
    objects: [{ id: 'obj-farol', name: 'El farol', kind: 'prop', description: 'Un farol de latón' }],
    scenes: [{
      id: 'sc-0001', order: 0, title: 'Amanecer', description: 'El sol sale detrás del faro', locationId: 'loc-faro', characterIds: ['char-luna'], objectIds: ['obj-farol'],
      shots: [{ id: 'sh-0101', order: 0, durationSec: 4, description: 'Luna sube la escalera con el farol' }],
    }],
  });
  if (vinculos.personaje) p.characters[0].element = vinculos.personaje;
  if (vinculos.lugar) p.locations[0].element = vinculos.lugar;
  if (vinculos.objeto) p.objects[0].element = vinculos.objeto;
  return p;
};
const TRES = { personaje: vinculo('el_luna_0001', 3), lugar: vinculo('el_faro_0001', 1), objeto: vinculo('el_farol_0001', 2) };
const cotizarLa = async (uid, k) => cotizar(uid, await plan(uid, k));
const refsDe = (q) => (q.ok ? q.valor.elementReferences : undefined);
const abrirReferencias = (d) => base.docs.set('aiSettings/referencias', d);
const cerrarReferencias = () => base.docs.delete('aiSettings/referencias');

/* ═══ R · LO PURO ═════════════════════════════════════════════════════════ */
console.log('\n── R · Los vínculos de un plano y la decisión ──');
{
  const b = (elementId, version) => ({ element: { elementId, version } });
  const crudo = {
    input: {
      subject: { characterId: 'char-b' },
      characters: [{ id: 'char-a', definition: b('el_a_0001', 1) }, { id: 'char-b', definition: b('el_b_0001', 2) }, { id: 'char-c', definition: {} }, { id: 'char-d', definition: b('el_a_0001', 1) }],
      location: { id: 'loc-x', definition: b('el_l_0001', 1) },
      objects: [{ id: 'obj-y', definition: b('el_o_0001', 1) }, { id: 'obj-z', definition: b('mal id!', 1) }, { id: 'obj-w', definition: b('el_w_0001', 0) }],
    },
  };
  const v = RE.vinculosDelRequisito(crudo);
  check('R1) los vínculos de un plano: el sujeto primero, luego personajes, lugar y objetos; sin repetir un Element; lo que no tiene forma no cuenta',
    JSON.stringify(v.map((x) => `${x.ficha}:${x.fichaId}:${x.elementId}@${x.version}`)) === JSON.stringify(['character:char-b:el_b_0001@2', 'character:char-a:el_a_0001@1', 'location:loc-x:el_l_0001@1', 'object:obj-y:el_o_0001@1']),
    JSON.stringify(v));
  const muchos = { input: { characters: Array.from({ length: 12 }, (_, i) => ({ id: `char-${i}0`, definition: b(`el_c${i}_0001`, 1) })) } };
  check('R2) con tope: ocho Elements por toma como mucho; y sin requisito, ninguno',
    RE.vinculosDelRequisito(muchos).length === RE.MAX_ELEMENTOS_POR_TOMA && RE.MAX_ELEMENTOS_POR_TOMA === 8
    && RE.vinculosDelRequisito(null).length === 0 && RE.vinculosDelRequisito({ input: {} }).length === 0);
  const img = [{ elementId: 'el_a_0001', assetId: aid(1), role: 'primary' }];
  const d = (e) => RE.decidirReferencias({ vinculos: 1, imagenes: img, puertaAbierta: true, modelo: 'modelo-x', ...e });
  check('R3) la decisión, en su orden: sin vínculos; sin imágenes; con la puerta cerrada; con un modelo sin validar —y la lista está vacía—',
    d({ vinculos: 0 }).motivo === 'no_bindings' && d({ imagenes: [] }).motivo === 'no_images' && d({ puertaAbierta: false }).motivo === 'gate_closed'
    && d({}).motivo === 'model_not_validated' && d({ modelo: null }).motivo === 'model_not_validated' && d({ puertaAbierta: false, modelo: null }).motivo === 'gate_closed');
  const si = d({ validados: ['modelo-x'] });
  check('R4) solo con la puerta abierta Y un modelo en la lista se usarían, y entonces son esas imágenes (la lista de verdad, vacía, nunca lo deja)',
    si.usar === true && JSON.stringify(si.imagenes) === JSON.stringify(img) && d({ validados: ['otro'] }).usar === false);
  check('R5) la lista de modelos validados está VACÍA, congelada y en el código: la configuración no la amplía',
    Array.isArray(RE.MODELOS_VALIDADOS_CON_REFERENCIAS) && RE.MODELOS_VALIDADOS_CON_REFERENCIAS.length === 0 && Object.isFrozen(RE.MODELOS_VALIDADOS_CON_REFERENCIAS)
    && /export const MODELOS_VALIDADOS_CON_REFERENCIAS: readonly string\[\] = Object\.freeze\(\[\]\);/.test(leer('functions/src/creator/referenciasDeElementos.ts')));
  const congelado = Object.freeze({ vinculos: 1, imagenes: Object.freeze([...img]), puertaAbierta: true, modelo: 'modelo-x', validados: Object.freeze(['modelo-x']) });
  check('R6) pura: lo mismo da lo mismo, y no toca lo que recibe', JSON.stringify(RE.decidirReferencias(congelado)) === JSON.stringify(RE.decidirReferencias(congelado)));
}

/* ═══ S · EL RESOLVEDOR ═══════════════════════════════════════════════════ */
console.log('\n── S · Las imágenes de los Elements, resueltas ──');
{
  const V = (elementId, version, ficha = 'character') => ({ elementId, version, ficha, fichaId: `f-${elementId}` });
  const antesDeLeer = JSON.stringify([...base.docs.entries()].filter(([p]) => p.startsWith('elements/') || p.startsWith('assets/')));
  const luna = await RE.resolverReferencias(A, [V('el_luna_0001', 3)]);
  check('S1) de un Element: la principal primero, luego las de referencia; ni el vídeo, ni el material ajeno, ni el que no está listo',
    JSON.stringify(luna.imagenes.map((i) => `${i.assetId.slice(-2)}:${i.role}`)) === JSON.stringify(['01:primary', '02:reference']) && luna.descartados.length === 0, JSON.stringify(luna));
  const tres = await RE.resolverReferencias(A, [V('el_luna_0001', 3), V('el_faro_0001', 1, 'location'), V('el_farol_0001', 2, 'object')]);
  check('S2) cuatro imágenes por toma como mucho, en el orden de los vínculos; el que ya no cabe no se da por «sin imágenes»',
    JSON.stringify(tres.imagenes.map((i) => i.assetId.slice(-2))) === JSON.stringify(['01', '02', '03', '04']) && RE.MAX_IMAGENES_POR_TOMA === 4 && tres.descartados.length === 0, JSON.stringify(tres));
  const repe = await RE.resolverReferencias(A, [V('el_luna_0001', 3), V('el_repe_0001', 1, 'object')]);
  check('S3) el mismo material en dos Elements cuenta una vez', JSON.stringify(repe.imagenes.map((i) => i.assetId.slice(-2))) === JSON.stringify(['01', '02', '12']), JSON.stringify(repe.imagenes));
  const malos = await RE.resolverReferencias(A, [V('el_ajeno_0001', 1), V('el_nada_0001', 1), V('el_luna_0001', 2), V('el_sinfotos_0001', 1)]);
  check('S4) lo ajeno y lo que no existe, «not_found»; otra versión que la del vínculo, «version_mismatch»; solo fotos de apoyo, «no_images»',
    malos.imagenes.length === 0 && JSON.stringify(malos.descartados.map((d) => `${d.elementId}:${d.motivo}`)) === JSON.stringify(['el_ajeno_0001:not_found', 'el_nada_0001:not_found', 'el_luna_0001:version_mismatch', 'el_sinfotos_0001:no_images']),
    JSON.stringify(malos.descartados));
  const guardado = base.leer('elements/el_faro_0001');
  base.docs.set('elements/el_faro_0001', { ...guardado, status: 'archived', archivedAt: HOY });
  const archivado = await RE.resolverReferencias(A, [V('el_faro_0001', 1, 'location')]);
  base.docs.set('elements/el_faro_0001', guardado);
  check('S5) un Element archivado después de vincularlo: «archived», y sus imágenes no se usan', archivado.imagenes.length === 0 && archivado.descartados[0]?.motivo === 'archived');
  check('S6) resolver solo LEE: ni un Element ni un material cambian',
    antesDeLeer === JSON.stringify([...base.docs.entries()].filter(([p]) => p.startsWith('elements/') || p.startsWith('assets/'))));
  const mentira = await RE.resolverReferencias(A, [V('el_mentira_0001', 1, 'object')]);
  check('S8) lo que el Element llama imagen y el Content Core dice que es un vídeo, no es una imagen', mentira.imagenes.length === 0 && mentira.descartados[0]?.motivo === 'no_images');
  const MOD = sinComentarios(leer('functions/src/creator/referenciasDeElementos.ts'));
  check('S7) por el runtime de Elements y el Content Core, sin leer sus colecciones a mano',
    /import \{ leerElemento \} from '\.\.\/elements';/.test(MOD) && /import \{ leerMaterial \} from '\.\.\/content';/.test(MOD) && !/collection\(|\.doc\(['"`](elements|assets)/.test(MOD));
}

/* ═══ Q · LA PUERTA DE LA CUENTA ══════════════════════════════════════════ */
console.log('\n── Q · La puerta de las referencias, cerrada por defecto ──');
{
  const lee = async (d, cuenta = A) => { if (d === null) cerrarReferencias(); else abrirReferencias(d); const r = await RE.leerPuertaDeReferencias(base, cuenta); cerrarReferencias(); return r; };
  check('Q1) sin documento, sin el sí, o con un sí que no es `true`: cerrada', !(await lee(null)) && !(await lee({ cuentas: [A] })) && !(await lee({ referenciasDeElementos: 'true', cuentas: [A] })));
  check('Q2) con el sí y sin cuentas, o con la lista vacía: cerrada (una lista vacía NO abre para todos)', !(await lee({ referenciasDeElementos: true })) && !(await lee({ referenciasDeElementos: true, cuentas: [] })));
  check('Q3) con cuentas, solo para ellas; `todas`, hay que escribirlo',
    (await lee({ referenciasDeElementos: true, cuentas: [A] })) && !(await lee({ referenciasDeElementos: true, cuentas: [A] }, B)) && (await lee({ referenciasDeElementos: true, todas: true }, B)));
}

/* ═══ D · POR LA PUERTA DEL VÍDEO ═════════════════════════════════════════ */
console.log('\n── D · Al cotizar se cuenta; al generar, nada cambia ──');
{
  await crear(A, 1, conFichas(TRES));
  await crear(A, 2, conFichas());
  await crear(A, 3, conFichas({ personaje: vinculo('el_sinfotos_0001', 1) }));
  const q1 = await cotizarLa(A, 1);
  check('D1) un plano con tres Elements vinculados: se cuenta —tres, cuatro imágenes, ninguna usada— y por qué: la puerta, cerrada',
    q1.ok && q1.valor.allowed === true && JSON.stringify(refsDe(q1)) === JSON.stringify({ bound: 3, images: 4, used: 0, reason: 'gate_closed' }), JSON.stringify(refsDe(q1) ?? codigo(q1)));
  abrirReferencias({ referenciasDeElementos: true, cuentas: [A] });
  const q2 = await cotizarLa(A, 1);
  abrirReferencias({ referenciasDeElementos: true, todas: true });
  const q2b = await cotizarLa(A, 1);
  check('D2) con la puerta abierta para la cuenta —o para todas—, tampoco: ningún modelo está validado',
    JSON.stringify(refsDe(q2)) === JSON.stringify({ bound: 3, images: 4, used: 0, reason: 'model_not_validated' }) && JSON.stringify(refsDe(q2b)) === JSON.stringify(refsDe(q2)), JSON.stringify(refsDe(q2)));
  const q3 = await cotizarLa(A, 2);
  check('D3) sin vínculos, la cotización no gana ni un campo: la de siempre',
    q3.ok && q3.valor.allowed === true && !('elementReferences' in q3.valor)
    && JSON.stringify(Object.keys(q3.valor).sort()) === JSON.stringify(Object.keys(q1.valor).filter((k) => k !== 'elementReferences').sort()));
  const q4 = await cotizarLa(A, 3);
  check('D4) vinculado, pero sin imágenes que se puedan usar: «no_images»', JSON.stringify(refsDe(q4)) === JSON.stringify({ bound: 1, images: 0, used: 0, reason: 'no_images' }), JSON.stringify(refsDe(q4)));
  check('D5) el precio es el mismo con Elements que sin ellos: las referencias no se cobran porque no se usan', q1.valor.credits === q3.valor.credits && q2.valor.credits === q3.valor.credits);
  const inventado = await plan(A, 2);
  inventado.requirement.input.characters[0].definition.element = vinculo('el_luna_0001', 3);
  const q5 = await cotizar(A, inventado);
  check('D6) los vínculos salen del requisito del SERVIDOR: uno añadido por la app no cuenta', q5.ok && q5.valor.allowed === true && !('elementReferences' in q5.valor), JSON.stringify(q5.ok ? Object.keys(q5.valor) : codigo(q5)));
  /* Generar, con la puerta ABIERTA para la cuenta: ni así cambia la toma. */
  const antesDePedir = posts.length;
  const conRefs = await pedir(A, 1);
  const sinRefs = await pedir(A, 2);
  const [pc, ps] = [posts[antesDePedir], posts[antesDePedir + 1]];
  check('D7) y generar, con la puerta abierta, no cambia nada: `video.generate`, el texto de siempre y ni una imagen de referencia',
    conRefs.g?.ok && sinRefs.g?.ok && posts.length === antesDePedir + 2 && pc.input.referenceImages === undefined && pc.input.imageUrl === undefined
    && pc.input.prompt === ps.input.prompt && !/asset_|el_luna|el_faro|el_farol/.test(pc.input.prompt) && pc.modelo === ps.modelo,
    `${codigo(conRefs.g)} · ${Object.keys(pc?.input ?? {}).join(',')}`);
  const job = await trabajo(A, conRefs.rid);
  check('D8) el trabajo de la toma pide al Core lo mismo de siempre', job?.capability === 'video.generate' || job?.request?.capability === 'video.generate' || JSON.stringify(job ?? {}).includes('"video.generate"'));
  cerrarReferencias();
}

/* ═══ G · LAS GUARDAS ═════════════════════════════════════════════════════ */
console.log('\n── G · Ni proveedores, ni Credits, ni una capacidad nueva ──');
{
  const MOD = sinComentarios(leer('functions/src/creator/referenciasDeElementos.ts'));
  const importa = [...MOD.matchAll(/from '([^']+)'/g)].map((m) => m[1]).sort();
  check('G1) el módulo solo lee: Elements, el Content Core, el Core (tipos) y el requisito del servidor; ni un proveedor, ni Credits, ni el runtime',
    JSON.stringify(importa) === JSON.stringify(['../content', '../core/element', '../elements', './requisitoDelServidor', 'firebase-admin/firestore'])
    && !/spendCredits|refundCredits|completeCredits|creditEngine|engine\.generate|fetch\(|httpsCallable|\.set\(|\.update\(|\.create\(|\.delete\(/.test(MOD), importa.join(', '));
  const VID = sinComentarios(leer('functions/src/creator/video.ts'));
  const numstat = git(`diff --numstat ${tramo} -- functions/src/creator/video.ts`).trim();
  check('G2) la puerta del vídeo solo GANA la cuenta al cotizar: ni una línea quitada, ni `video.reference`, ni otra capacidad para el Core',
    /^\d+\t0\t/.test(numstat) && !/video\.reference/.test(VID) && /referenciasDeLaToma\(getFirestore\(\), deToma\.accountId/.test(VID)
    && (VID.match(/const CAPACIDAD_DEL_CANARY: CapabilityId = 'video\.generate';/g) ?? []).length === 1, numstat);
  check('G3) ni el adaptador, ni el Core, ni el Job Engine, ni el runtime, ni los Credits, ni F1-A, ni productions, ni una Function',
    git(`diff --name-only ${tramo} -- functions/src/engine functions/src/core functions/src/job functions/src/runtime functions/src/credits functions/src/filmmaker functions/src/productions functions/src/elements functions/src/content functions/src/index.ts`).trim() === '');
  check('G4) el módulo nuevo, en la lista del motor; el dinero, nunca',
    TOCADOS_POR_EL_MOTOR.includes('functions/src/creator/referenciasDeElementos.ts') && !TOCADOS_POR_EL_MOTOR.some((f) => DINERO.some((r) => r.test(f))));
  const DOC = sinComentarios(leer('docs/FILMMAKER.md'));
  check('G5) documentado', /### Fase 18 · /.test(leer('docs/FILMMAKER.md')) && /video\.reference/.test(leer('docs/FILMMAKER.md')) && DOC.length > 0);
  check('G6) esta suite está en la cadena de `npm test`', /filmmaker-referencias\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 18 · las referencias de los Elements (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
