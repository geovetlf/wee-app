/**
 * FILMMAKER ENGINE · FASE 10 (F3 DEL ROADMAP) — LOS VÍNCULOS A ELEMENTS, VERIFICADOS.
 *
 *   V · vincular: un Element de la cuenta, activo, de la clase que toca y en su
 *       versión de ahora; lo ajeno, lo que no existe, lo archivado, lo que no
 *       encaja y la versión que no es, se rechazan con su motivo y sin escribir;
 *   A · lo que ya estaba no se vuelve a mirar: archivar un Element después no
 *       bloquea nada;
 *   G · generar no cambia: el plano sigue siendo `video.generate` y su prompt sale
 *       de lo escrito en la ficha, sin el vínculo;
 *   S · las guardas.
 *
 * De verdad: productions (su puerta y su almacén), el runtime de Elements, F1-A y
 * el traductor del plano de F1-D, sobre un Firestore en memoria (el arnés de
 * `f1d-postcanary.test.mjs`, copiado tal cual). Nada sale a la red.
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

/* ═══ FASE 10 · lo que se prueba aquí ═════════════════════════════════════ */
const puertaProd = lib('productions/puerta.js');
const plano10 = lib('creator/plano.js');
const nucleo = lib('core/index.js');
const { TOCADOS_POR_EL_MOTOR, DINERO } = await import('./motor-filmmaker-alcance.mjs');

/* Elements de verdad —con la forma que exige el Core—, sembrados en la base. */
const elemento = (elementId, type, { version = 1, status = 'active', owner = A } = {}) => ({
  contract: nucleo.ELEMENT_CONTRACT_VERSION, elementId, type, version, status, name: `Element ${elementId}`,
  refs: [], ownerAccountId: owner, createdAt: HOY, updatedAt: HOY, ...(status === 'archived' ? { archivedAt: HOY } : {}),
});
const sembrar = (e) => { if (!nucleo.elementoValido(e)) throw new Error(`Element de prueba mal formado: ${e.elementId}`); base.docs.set(`elements/${e.elementId}`, e); };
[
  elemento('el_luna_0001', 'character', { version: 3 }), elemento('el_faro_0001', 'place'), elemento('el_farol_0001', 'object', { version: 2 }),
  elemento('el_marca_0001', 'brand'), elemento('el_set_0001', 'scene'), elemento('el_vieja_0001', 'character', { status: 'archived' }),
  elemento('el_ajeno_0001', 'character', { owner: B }),
].forEach(sembrar);

/* Una producción con un personaje, un lugar y un objeto, y un plano en el que salen los tres. */
const conFichas = () => clon({
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
const vinculo = (elementId, version) => ({ elementId, version });
const aplicar = (uid, k, operations, revision) => intento(() => puertaProd.productions.run({
  auth: { uid }, data: { op: 'apply', productionId: pid(k), expectedRevision: revision, operations, operationId: `op-f10-${k}-${revision}-${operations.length}-${Math.random().toString(36).slice(2, 8)}` },
}));
const guardada = async (uid, k) => (await producciones.leerProduccion(uid, pid(k), { db: base })).view;
const motivoDe = (r) => r.error?.details?.problems?.[0]?.parameters?.reason;

/* ═══ V · VINCULAR ═════════════════════════════════════════════════════════ */
console.log('\n── V · Vincular una ficha a un Element de la cuenta ──');
{
  const prod = conFichas();
  prod.characters[0].element = vinculo('el_luna_0001', 3);
  prod.locations[0].element = vinculo('el_faro_0001', 1);
  prod.objects[0].element = vinculo('el_farol_0001', 2);
  await crear(A, 1, prod);
  const v = await guardada(A, 1);
  check('V1) una producción nace con sus fichas vinculadas a Elements de la cuenta, activos, de su clase y en su versión',
    v.production.characters[0].element?.elementId === 'el_luna_0001' && v.production.locations[0].element?.version === 1 && v.production.objects[0].element?.elementId === 'el_farol_0001');

  await crear(A, 2, conFichas());
  const r0 = (await guardada(A, 2)).revision;
  const bien = await aplicar(A, 2, [{ op: 'update_character', characterId: 'char-luna', changes: { element: vinculo('el_luna_0001', 3) } }], r0);
  check('V2) y se vincula después, con el lenguaje de F1-A por la puerta de siempre', bien.ok && bien.valor.revision === r0 + 1 && (await guardada(A, 2)).production.characters[0].element?.version === 3, codigo(bien));

  const casos = [
    ['no existe', 'char-luna', 'update_character', 'characterId', vinculo('el_nada_0001', 1), 'not_found'],
    ['de otra cuenta', 'char-luna', 'update_character', 'characterId', vinculo('el_ajeno_0001', 1), 'not_found'],
    ['archivado', 'char-luna', 'update_character', 'characterId', vinculo('el_vieja_0001', 1), 'archived'],
    ['de otra clase', 'char-luna', 'update_character', 'characterId', vinculo('el_faro_0001', 1), 'wrong_kind'],
    ['en otra versión', 'char-luna', 'update_character', 'characterId', vinculo('el_luna_0001', 2), 'version_mismatch'],
  ];
  const resultados = [];
  for (const [nombre, id, op, clave, el, esperado] of casos) {
    const antes = fotoDe2();
    const r = await aplicar(A, 2, [{ op, [clave]: id, changes: { element: el } }], r0 + 1);
    resultados.push({ nombre, ok: !r.ok && r.error?.code === 'invalid-argument' && r.error.details?.code === 'element_binding_rejected' && motivoDe(r) === esperado
      && r.error.details.problems[0].path === 'characters.char-luna.element' && fotoDe2() === antes, motivo: motivoDe(r) });
  }
  check('V3) lo que no existe, lo de otra cuenta, lo archivado, lo de otra clase y otra versión: rechazado con su motivo, su ruta, y sin escribir nada',
    resultados.every((x) => x.ok), JSON.stringify(resultados.filter((x) => !x.ok)));
  check('V4) lo de otra cuenta contesta lo MISMO que lo que no existe: un id no dice nada', resultados[0].motivo === resultados[1].motivo);
  const marca = await aplicar(A, 2, [{ op: 'update_object', objectId: 'obj-farol', changes: { element: vinculo('el_marca_0001', 1) } }], r0 + 1);
  const escenaGuardada = await aplicar(A, 2, [{ op: 'update_location', locationId: 'loc-faro', changes: { element: vinculo('el_set_0001', 1) } }], r0 + 2);
  const referencia = await aplicar(A, 2, [{ op: 'add_reference', reference: { id: 'ref-luna', kind: 'image', element: vinculo('el_luna_0001', 3) } }], r0 + 3);
  check('V5) cada ficha, a lo que le encaja: un objeto a una marca, un lugar a una escena guardada, una referencia a cualquiera',
    marca.ok && escenaGuardada.ok && referencia.ok, `${codigo(marca)} · ${codigo(escenaGuardada)} · ${codigo(referencia)}`);
  check('V6) las clases de cada ficha son clases del Core, y la de las referencias son TODAS',
    Object.values(producciones.CLASES_DE_ELEMENTO_POR_FICHA).every((xs) => xs.every((t) => nucleo.TIPOS_DE_ELEMENTO.includes(t)))
    && JSON.stringify([...producciones.CLASES_DE_ELEMENTO_POR_FICHA.references].sort()) === JSON.stringify([...nucleo.TIPOS_DE_ELEMENTO].sort()));
  let lecturas = 0;
  const contando = async (accountId, elementId) => { lecturas++; const d = base.leer(`elements/${elementId}`); return d && d.ownerAccountId === accountId ? d : null; };
  const tres = conFichas();
  tres.references = [{ id: 'ref-a', kind: 'image', element: vinculo('el_luna_0001', 3) }, { id: 'ref-b', kind: 'image', element: vinculo('el_luna_0001', 3) }];
  tres.characters[0].element = vinculo('el_luna_0001', 3);
  const r3 = await producciones.crearProduccion({ accountId: A, productionId: pid(3), production: tres, at: HOY }, { db: base, elementos: contando });
  check('V7) el mismo Element en tres fichas se lee UNA vez', r3.ok && lecturas === 1, `${lecturas}`);
}
function fotoDe2() { return JSON.stringify([...base.docs.entries()].filter(([p]) => p.startsWith(`productions/${pid(2)}`)).sort()); }

/* ═══ A · LO QUE YA ESTABA ═════════════════════════════════════════════════ */
console.log('\n── A · Lo que ya estaba vinculado no se vuelve a mirar ──');
{
  /* Se archiva el Element de Luna DESPUÉS de vincularlo en la producción 1. */
  sembrar(elemento('el_luna_0001', 'character', { version: 3, status: 'archived' }));
  const r = (await guardada(A, 1)).revision;
  const otra = await aplicar(A, 1, [{ op: 'rename_production', title: 'El faro, otra vez' }], r);
  check('A1) archivar un Element después NO bloquea: el resto de la producción se sigue editando', otra.ok && otra.valor.revision === r + 1, codigo(otra));
  const volver = await aplicar(A, 1, [{ op: 'update_character', characterId: 'char-luna', changes: { element: vinculo('el_luna_0001', 2) } }], r + 1);
  check('A2) pero un vínculo CAMBIADO se vuelve a comprobar: al archivado ya no se vincula', !volver.ok && motivoDe(volver) === 'archived', codigo(volver));
  const quitar = await aplicar(A, 1, [{ op: 'update_character', characterId: 'char-luna', changes: { element: null } }], r + 1);
  check('A3) y quitar el vínculo siempre se puede', quitar.ok && (await guardada(A, 1)).production.characters[0].element === undefined, codigo(quitar));
  sembrar(elemento('el_luna_0001', 'character', { version: 3 }));
}

/* ═══ G · GENERAR NO CAMBIA ═══════════════════════════════════════════════ */
console.log('\n── G · Generar sigue saliendo de lo escrito en la ficha ──');
{
  const prod = conFichas();
  prod.characters[0].element = vinculo('el_luna_0001', 3);
  await crear(A, 4, prod);
  const req = Rq.requisitosDeProduccion((await guardada(A, 4)).production);
  const delPlano = req.ok ? req.requirements.shots.find((s) => s.unitId === 'sh-0101') : undefined;
  check('G1) con un personaje vinculado, el plano sigue siendo `video.generate`: un vínculo no es una imagen de referencia',
    delPlano?.capability === 'video.generate', delPlano?.capability);
  const leido = plano10.leerRequisitoDePlano(JSON.parse(JSON.stringify(delPlano)));
  const evaluacion = leido ? plano10.evaluarPlano(leido, 'standard') : undefined;
  const prompt = leido ? plano10.componerPromptDePlano(leido) : '';
  check('G2) y se puede generar: la plantilla del plano lo acepta', !!leido && evaluacion?.ok === true, JSON.stringify(evaluacion ?? {}).slice(0, 160));
  check('G3) su prompt dice quién es con lo escrito en la ficha, y no nombra el Element', prompt.includes('Luna') && prompt.includes('Farera de sesenta años') && !prompt.includes('el_luna_0001') && plano10.PLANTILLA_DE_PLANO === 'fm-plano-1', prompt.slice(0, 200));
  const q = await cotizar(A, await plan(A, 4));
  check('G4) y la cotización de su toma sale como la de cualquier plano', q.ok && q.valor?.allowed === true, codigo(q));
}

/* ═══ S · LAS GUARDAS ═════════════════════════════════════════════════════ */
console.log('\n── S · Guardar solo LEE Elements ──');
{
  const P = sinComentarios(leer('functions/src/productions/index.ts'));
  check('S1) productions lee Elements por su runtime, y nunca los escribe', /import \{ leerElemento \} from '\.\.\/elements';/.test(P) && !/collection\(['"]elements['"]\)|COLECCION_DE_ELEMENTOS/.test(P));
  check('S2) y no queda el rechazo de antes: `element_binding_not_supported` ya no existe', !/element_binding_not_supported/.test(P) && !/element_binding_not_supported/.test(sinComentarios(leer('functions/src/productions/puerta.ts'))));
  check('S3) los archivos del motor están en su lista, y el dinero no',
    ['functions/src/productions/index.ts', 'functions/src/productions/puerta.ts'].every((f) => TOCADOS_POR_EL_MOTOR.includes(f)) && TOCADOS_POR_EL_MOTOR.every((f) => !DINERO.some((re) => re.test(f))));
  check('S4) documentado', /### Fase 10 · /.test(leer('docs/FILMMAKER.md')) && /\| D10 \| Identidad de personajes \| \*\*decidida\*\*/.test(leer('docs/FILMMAKER.md')));
  check('S5) esta suite está en la cadena de `npm test`', /filmmaker-elementos\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 10 · los vínculos a Elements, verificados (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
