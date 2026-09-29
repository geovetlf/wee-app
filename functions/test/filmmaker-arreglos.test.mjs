/**
 * FILMMAKER ENGINE · FASE 22 — LOS ARREGLOS DE LA AUDITORÍA FINAL (fase A del encargo del 2026-09-28).
 *
 *   I · R1, los ids de lo nuevo: los pone el servidor, deterministas —de la semilla del mensaje y su posición—, sin
 *       chocar con nada, y los marcadores `@…` enlazan lo nuevo dentro del mismo bloque;
 *   P · R1, la propuesta: el porqué de cada cambio, aparte; ni vínculos ni material; el prompt avanzado no lo escribe
 *       Weë Brain; y una respuesta cuya propuesta no se puede aplicar NO cuenta en el bloque (no se cobra);
 *   D · R1, lo que propone, dicho en frases: qué, dónde, lo que trae y por qué;
 *   W · R1, Weë Brain en el editor: el precio antes de enviar, los atajos que solo rellenan, la lista de cambios, lo
 *       que cuesta aplicarla y lo que deja por rehacer;
 *   C · R1 y R6, el controlador: aplicar una propuesta sobre SU revisión y con su id, y volver a una versión, las dos
 *       con la producción OCUPADA —nada se edita ni se pierde— y lo que hay que rehacer SUMADO;
 *   L · R7, lo guardado por páginas: en el servidor, en el servicio, en el hook y en la hoja, con su búsqueda;
 *   M · R10, las miniaturas: el póster del elegido se conserva y ninguna miniatura carga el vídeo;
 *   Q · R12, quién lo dice: un diálogo o una voz en off no salen sin un personaje válido;
 *   T · R13, el estilo como token: se guarda `cinematic` y se traduce al pintarlo;
 *   X · R14, R16 y R17: el documento dice la verdad, la duración redondeada no se llama «mínimo», y el coreano y el
 *       chino siguen sus reglas;
 *   G · las guardas: ni Credits, ni una Function, ni reglas, ni índices, ni F1-A, ni el texto del plano; los once
 *       idiomas; en la cadena.
 *
 * De verdad: la puerta `elements` con su runtime, `productions`, F1-A y la lectura de propuestas de Weë Brain, sobre un
 * Firestore en memoria (el arnés de `f1d-postcanary.test.mjs`, copiado tal cual); y el código de la app —servicios,
 * hooks, controlador y paneles— con dobles de React Native y de Firebase y el traductor con el español de verdad.
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

/* ═══ FASE 22 · lo que se prueba aquí ═══════════════════════════════════════ */
const puertaElem = lib('elements/puerta.js');
const elemMod = lib('elements/index.js');
const nucleo = lib('core/index.js');
const PB = lib('creator/produccionEnBrain.js');
const Pr = lib('creator/prompts.js');
const Ops = lib('filmmaker/operaciones.js');
const { TOCADOS_POR_EL_MOTOR, DINERO } = await import('./motor-filmmaker-alcance.mjs');
/** El último commit antes de esta fase. */
const ANTES = '312719a';
const HASTA = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 22 "').trim();
const tramo = HASTA ? `${ANTES} ${HASTA}` : ANTES;
const elems = (uid, data) => intento(() => puertaElem.elements.run({ auth: { uid }, data }));
const paraBrain = (production, revision = 3) => ({ productionId: pid(1), revision, production, resumen: '' });
const leerProp = (ops, production, semilla, revision) => PB.leerPropuesta(JSON.stringify(ops), paraBrain(production, revision), semilla);

/* ═══ I · LOS IDS DE LO NUEVO ═════════════════════════════════════════════ */
console.log('\n── I · R1: el id de lo nuevo lo pone el servidor, determinista, y los marcadores lo enlazan ──');
const OPS_NUEVAS = [
  { op: 'add_character', character: { id: '@luna', name: 'Luna', identityDescription: 'La farera' }, why: 'Hace falta alguien que suba al faro.' },
  { op: 'add_scene', scene: { id: '@noche', title: 'Noche', description: 'La lámpara gira', shots: [{ durationSec: 4, description: 'La luz barre el mar', advanced: { prompt: 'Nada de esto' } }] } },
  { op: 'update_scene', sceneId: '@noche', changes: { characterIds: ['@luna'] }, reason: '  Luna   sale\n en la noche  ' },
  { op: 'add_shot', sceneId: 'sc-0001', shot: { id: '@cierre', durationSec: 4, description: 'Cierre' } },
];
{
  const prod = conFaro();
  const r1 = leerProp(OPS_NUEVAS, prod, 'm_semilla_1');
  const r2 = leerProp(OPS_NUEVAS, prod, 'm_semilla_1');
  const r3 = leerProp(OPS_NUEVAS, prod, 'm_semilla_2');
  const o = r1.ok ? r1.propuesta.operations : [];
  const idLuna = o[0]?.character?.id; const idNoche = o[1]?.scene?.id; const idPlanoNoche = o[1]?.scene?.shots?.[0]?.id; const idCierre = o[3]?.shot?.id;
  check('I1) lo nuevo recibe su id del servidor, con el prefijo de su clase: personaje, escena, su plano y el plano suelto',
    r1.ok && /^ch_[0-9a-f]{10}_\d+$/.test(idLuna) && /^sc_[0-9a-f]{10}_\d+$/.test(idNoche) && /^sh_[0-9a-f]{10}_\d+$/.test(idPlanoNoche) && /^sh_[0-9a-f]{10}_\d+$/.test(idCierre),
    JSON.stringify(r1.ok ? [idLuna, idNoche, idPlanoNoche, idCierre] : r1));
  check('I2) cada marcador se sustituye en TODO el bloque: la escena nueva y su reparto apuntan a lo nuevo, y no queda ninguna «@»',
    o[2]?.sceneId === idNoche && o[2]?.changes?.characterIds?.[0] === idLuna && !JSON.stringify(o).includes('"@'));
  check('I3) determinista: el mismo mensaje, los mismos ids; otro mensaje, otros',
    r2.ok && JSON.stringify(r2.propuesta.operations) === JSON.stringify(o) && r3.ok && r3.propuesta.operations[1].scene.id !== idNoche);
  const existentes = M.idsDeLaProduccion(prod);
  check('I4) cada id nuevo es un id válido de F1-A, distinto de todos los de la producción y de los demás nuevos',
    [idLuna, idNoche, idPlanoNoche, idCierre].every((id) => M.esId(id) && !existentes.has(id)) && new Set([idLuna, idNoche, idPlanoNoche, idCierre]).size === 4);
  check('I5) el prompt avanzado de un plano nuevo no lo escribe Weë Brain: se quita', o[1]?.scene?.shots?.[0]?.advanced === undefined);
  const ocupada = clon({ ...prod, characters: [{ id: idLuna, name: 'Ya estaba' }] });
  const r4 = leerProp([OPS_NUEVAS[0]], ocupada, 'm_semilla_1');
  check('I6) si el id que tocaba ya existe, se deriva otro (`derivarId`): nunca se pisa nada',
    r4.ok && r4.propuesta.operations[0].character.id === `${idLuna}-2`, r4.ok ? r4.propuesta.operations[0].character.id : JSON.stringify(r4));
  const r5 = leerProp([{ op: 'add_character', character: { id: 'ch_literal_01', name: 'Mar' } }], prod, 'm_semilla_3');
  check('I7) un id escrito que no es marcador se respeta tal cual (si chocara, F1-A lo diría)', r5.ok && r5.propuesta.operations[0].character.id === 'ch_literal_01');
  const r6 = leerProp([{ op: 'update_scene', sceneId: '@fantasma', changes: { actions: ['Nada'] } }], prod, 'm_semilla_4');
  check('I8) un marcador que nadie define no se convierte en id: la propuesta no es aplicable', !r6.ok && r6.motivo === 'invalid', JSON.stringify(r6));
  check('I9) un marcador nunca es un id de F1-A', PB.esMarcador('@luna') && !M.esId('@luna') && !PB.esMarcador('luna') && !PB.esMarcador('@'));
  const apl = r1.ok ? Ops.aplicarOperaciones(prod, o) : { ok: false };
  check('I10) y la propuesta con ids se aplica en F1-A: Luna existe y sale en la escena nueva', apl.ok && apl.production.characters.some((c) => c.id === idLuna)
    && apl.production.scenes.find((s) => s.id === idNoche)?.characterIds?.includes(idLuna));
}

/* ═══ P · LA PROPUESTA: SU PORQUÉ, LO VEDADO Y LO QUE NO SE COBRA ═════════ */
console.log('\n── P · R1: el porqué, aparte; ni vínculos ni material; y una propuesta que no se aplica no cuenta ──');
{
  const prod = conFaro();
  const r = leerProp(OPS_NUEVAS, prod, 'm_semilla_1');
  check('P1) el porqué de cada cambio llega aparte, en su orden, y lo que no lo trae es `null`',
    r.ok && r.propuesta.reasons.length === 4 && r.propuesta.reasons[0] === 'Hace falta alguien que suba al faro.' && r.propuesta.reasons[1] === null && r.propuesta.reasons[3] === null);
  check('P2) limpio y acotado —una línea, 200 como mucho— y fuera de la operación: F1-A no lo ve',
    r.ok && r.propuesta.reasons[2] === 'Luna sale en la noche' && r.propuesta.operations.every((op) => !('why' in op) && !('reason' in op)));
  const largo = leerProp([{ op: 'rename_production', title: 'Otro', why: 'x'.repeat(500) }], prod, 'm_largo');
  check('P3) un porqué largo se corta en 200', largo.ok && largo.propuesta.reasons[0].length === 200);
  const conVinculo = leerProp([{ op: 'update_character', characterId: 'x', changes: { element: { elementId: 'el_x_0001', version: 1 } } }], prod, 'm_v');
  const conMaterial = leerProp([{ op: 'add_reference', reference: { id: '@r', kind: 'image', assetId: 'asset_x' } }], prod, 'm_m');
  check('P4) una propuesta que toca lo guardado (`element`) o el material (`assetId`) no se da por buena',
    !conVinculo.ok && conVinculo.problemas?.[0] === 'field_not_allowed' && !conMaterial.ok && conMaterial.problemas?.[0] === 'field_not_allowed');
  const BR = sinComentarios(leer('functions/src/creator/brain.ts'));
  check('P5) la semilla de los ids es el MENSAJE: repetirlo da la misma propuesta', /leerPropuesta\(separada\.bloque, produccion, messageId\)/.test(BR));
  check('P6) con la producción abierta, una respuesta que intentó proponer y no dejó nada aplicable NO cuenta en el bloque —y por tanto no se cobra—',
    /const sinPropuestaAplicable = !!produccion && !!propuesta && !propuesta\.ok;/.test(BR)
    && /if \(!webSearch && !sinPropuestaAplicable\) \{\s*const consumo = await contarRespuesta\(uid, messageId\);/.test(BR)
    && (BR.match(/contarRespuesta\(/g) ?? []).length === 1);
  const I = Pr.instruccionDeProduccion('RESUMEN');
  const ensenadas = [...new Set([...I.matchAll(/"op":"(\w+)"/g)].map((m) => m[1]))];
  check('P7) Weë Brain aprende a crear el mundo: personajes, lugares, objetos, quién sale, la dirección y la intención —todas de F1-A—',
    ['add_character', 'update_character', 'add_location', 'update_location', 'change_location', 'add_object', 'update_object', 'update_scene', 'update_shot', 'change_direction', 'change_intent', 'modify_audio']
      .every((op) => ensenadas.includes(op)) && ensenadas.every((op) => Ops.OPERACIONES.includes(op)), ensenadas.join(','));
  check('P8) y las reglas: marcadores para lo nuevo, un «why» por cambio, y ni vínculos, ni material, ni prompt avanzado',
    /"id":"@escena1"/.test(I) && /pon un marcador como "@escena1"/.test(I) && /cada operación lleva "why"/.test(I) && /no vincules nada guardado ni material, y no escribas el prompt avanzado/.test(I));
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
let correrEfectos = false;
const useEffectDePrueba = (fn, deps) => (correrEfectos ? void fn() : React.useEffect(fn, deps));
let botones = []; let cajas = []; let hojas = []; let campos = []; let buscadores = []; let imagenes = [];
const Caja = ({ children, accessibilityLabel }) => hc('div', { 'aria-label': accessibilityLabel }, children);
const Texto = ({ children }) => hc('span', null, children);
const Toque = ({ children, onPress, disabled, accessibilityLabel, accessibilityState }) => {
  botones.push({ etiqueta: accessibilityLabel, tocar: onPress, apagado: !!disabled, elegido: !!accessibilityState?.selected });
  return hc('button', { 'aria-label': accessibilityLabel, disabled: !!disabled, 'aria-selected': accessibilityState?.selected ? 'true' : undefined }, children);
};
const rn = {
  View: Caja, Text: Texto, TouchableOpacity: Toque, ScrollView: Caja, Modal: Caja, TextInput: () => hc('textarea'),
  ActivityIndicator: ({ accessibilityLabel }) => hc('progress', { 'aria-label': accessibilityLabel }),
  Image: ({ source, accessibilityLabel }) => { imagenes.push({ src: source?.uri, etiqueta: accessibilityLabel }); return hc('img', { src: source?.uri, 'aria-label': accessibilityLabel }); },
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
const avisos = [];
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
  '../../../utils/notify': { notify: (...a) => avisos.push(a), confirmAction: async () => true },
  '../../workspace/HojaInferior': { __esModule: true, default: ({ titulo, subtitulo, children }) => { hojas.push({ titulo, subtitulo }); return hc('section', { 'aria-label': titulo }, children); } },
  '../../workspace/CampoDeBusqueda': { __esModule: true, default: (p) => { buscadores.push(p); return hc('input', { 'aria-label': p.placeholder, value: p.valor }); } },
  '../../creator/CajaDePrompt': { __esModule: true, default: (p) => { cajas.push(p); return hc('textarea', { 'aria-label': p.placeholder }); } },
  '../../creator/CampoQueCrece': { __esModule: true, default: (p) => { campos.push(p); return hc('textarea', { 'aria-label': p.etiqueta, disabled: p.editable === false }); } },
};
const cargar = crearCargador({ dobles });
const dibujar = (el) => {
  botones = []; cajas = []; hojas = []; campos = []; buscadores = []; imagenes = []; indiceDeEstado = 0;
  const html = renderToStaticMarkup(el);
  return { html, botones: botones.slice(), cajas: cajas.slice(), hojas: hojas.slice(), campos: campos.slice(), buscadores: buscadores.slice(), imagenes: imagenes.slice(),
    texto: html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ') };
};
const boton = (d, etiqueta) => d.botones.find((b) => b.etiqueta === etiqueta);
const calma = async () => { for (let i = 0; i < 30; i++) await new Promise((r) => setImmediate(r)); };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
/* Un React mínimo para un hook (el de filmmaker-conectar): su estado y sus refs por orden, y sus efectos cuando cambian sus dependencias. */
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

/* ── Una producción para las pantallas: Luna sale en el primer plano; Mar, no ── */
const produccionUI = (extra = {}) => clon({
  ...conFaro(),
  /* Mar va antes en la ficha, pero no sale en el primer plano: el selector de quién habla pone primero a Luna. */
  characters: [{ id: 'char-mar', name: 'Mar' }, { id: 'char-luna', name: 'Luna' }],
  locations: [{ id: 'loc-faro', name: 'El faro' }],
  audio: { cues: [{ id: 'sd-olas', kind: 'ambience', description: 'Olas contra las rocas', target: { scope: 'production' } }] },
  scenes: [{
    id: 'sc-0001', order: 0, title: 'Amanecer', description: 'El sol sale detrás del faro', characterIds: ['char-luna'],
    shots: [
      { id: 'sh-0101', order: 0, durationSec: 4, description: 'Una farera sube la escalera', characterIds: ['char-luna'], dialogue: [{ id: 'ln-1', kind: 'dialogue', characterId: 'char-luna', text: 'Ya amanece.' }] },
      { id: 'sh-0102', order: 1, durationSec: 4, description: 'La lámpara se enciende' },
    ],
  }],
  ...extra,
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

/* ═══ D · LO QUE PROPONE, EN FRASES ═══════════════════════════════════════ */
console.log('\n── D · R1: cada cambio propuesto, dicho en una frase: qué, dónde, lo que trae y por qué ──');
{
  const { describirPropuesta } = cargar('utils/describirOperacion.ts');
  const C = cargar('constants/filmmaker.ts');
  const Cam = cargar('constants/camaraCinematica.ts');
  const antes = produccionUI();
  const ops = [
    { op: 'add_scene', scene: { id: 'sc_nueva_0001', title: 'Noche', shots: [{ id: 'sh_nuevo_0001', durationSec: 4 }] } },
    { op: 'change_weather', sceneId: 'sc-0001', weather: 'fog' },
    { op: 'change_camera', target: { scope: 'shot', shotId: 'sh-0102' }, shotType: 'close_up', focalLengthMm: 35 },
    { op: 'remove_shot', shotId: 'sh-0102' },
    { op: 'modify_audio', change: { action: 'remove', cueId: 'sd-olas' } },
    { op: 'change_style', target: { scope: 'production' }, style: 'cinematic' },
    { op: 'add_dialogue', target: { shotId: 'sh-0101' }, line: { id: 'ln-nueva', kind: 'dialogue', characterId: 'char-luna', text: 'Mira el mar.' } },
  ];
  const razones = ['Falta la noche.', null, 'Para ver su cara.', null, null, null, null];
  const d = describirPropuesta(ops, razones, antes, t, formato);
  check('D1) una escena nueva: qué, DÓNDE quedaría —Escena 2— y su título, tal cual', d[0].accion === 'Añadir una escena' && d[0].donde === 'Escena 2' && d[0].detalle === 'Noche' && d[0].razon === 'Falta la noche.');
  check('D2) el clima: la escena y el valor en palabras', d[1].accion === 'Cambiar el clima' && d[1].donde === 'Escena 1' && d[1].detalle === t(C.CLAVE_DEL_CLIMA.fog) && d[1].razon === undefined);
  check('D3) la cámara: el plano, el encuadre en palabras y la focal', d[2].accion === 'Cambiar la cámara' && d[2].donde === 'Escena 1 · Plano 2'
    && d[2].detalle.includes(t(Cam.claveDelValor('shot.type', 'close_up'))) && d[2].detalle.includes('Focal de 35 mm'), d[2].detalle);
  check('D4) lo que se quita se busca en la producción de ahora', d[3].accion === 'Quitar un plano' && d[3].donde === 'Escena 1 · Plano 2');
  check('D5) un sonido que se quita, con su descripción (es contenido: tal cual)', d[4].accion === 'Quitar un sonido' && d[4].detalle === 'Olas contra las rocas');
  check('D6) el estilo, con su nombre si es un token; la línea, con su texto', d[5].detalle === 'Cinemático' && d[5].donde === 'Toda la producción' && d[6].detalle === 'Mira el mar.' && d[6].donde === 'Escena 1 · Plano 1');
  check('D7) cada cambio lleva su icono', d.every((x) => typeof x.icono === 'string' && x.icono.length > 3));
  const claves = Object.keys(C.CLAVE_DE_OPERACION);
  check('D8) una frase por operación de F1-A: las 56, ni una más ni una menos, y todas con texto en español',
    claves.length === 56 && JSON.stringify([...claves].sort()) === JSON.stringify([...Ops.OPERACIONES].sort())
    && [...Object.values(C.CLAVE_DE_OPERACION), C.CLAVE_DE_SONIDO_QUITADO, C.CLAVE_DEL_NARRADOR, C.CLAVE_SIN_DURACION_OBJETIVO].every((k) => t(k) !== k));
  check('D9) y las seis transiciones del lenguaje creativo, con su nombre', Object.keys(C.CLAVE_DE_TRANSICION).length === 6 && Object.values(C.CLAVE_DE_TRANSICION).every((k) => t(k) !== k));
  const todas = Ops.OPERACIONES.map((op) => ({ op }));
  const sinRomper = intento(async () => describirPropuesta(todas, [], antes, t, formato));
  check('D10) una operación a medio escribir no rompe la lista: cada una se dice, aunque no sepa dónde', (await sinRomper).ok && (await sinRomper).valor.every((x) => !!x.accion));
}

/* ═══ W · WEË BRAIN EN EL EDITOR ══════════════════════════════════════════ */
console.log('\n── W · R1: el precio antes de enviar, los atajos que solo rellenan, y la propuesta con su porqué ──');
{
  const m = miniReact();
  const cotizaciones = []; let cotizar = null; const enviados = []; let contestar = null;
  const cargarH = crearCargador({ dobles: {
    react: m.react, '../contexts/IdiomaContext': idioma,
    '../services/creditsService': { creditsShortfall: (e) => (e?.faltan ? { required: 3, available: 1 } : null) },
    '../services/brainService': {
      brainService: {
        quote: (d) => { cotizaciones.push(d); return new Promise((res, rej) => { cotizar = { res, rej }; }); },
        send: (d) => { enviados.push(d); return new Promise((res, rej) => { contestar = { res, rej }; }); },
      },
      newMessageId: () => `m_prueba_${enviados.length + 1}`,
    },
  } });
  const H = cargarH('hooks/useWeeBrainDelEditor.ts');
  const ver = () => m.pasar(H.useWeeBrainDelEditor, pid(1), 3);
  let b = ver();
  b.cotizar('Pon ');
  b.cotizar('Pon niebla');
  b = ver();
  check('W1) mientras se escribe se está calculando, y no se pregunta hasta que se para de escribir', b.cotizacion.estado === 'calculando' && cotizaciones.length === 0);
  await espera(H.ESPERA_DEL_PRECIO_MS + 80);
  check('W2) una sola pregunta, la del último texto, con la producción GUARDADA —el servidor la cuenta en el precio—',
    cotizaciones.length === 1 && JSON.stringify(cotizaciones[0]) === JSON.stringify({ message: 'Pon niebla', locale: 'es', produccion: { productionId: pid(1), revision: 3 } }) && H.ESPERA_DEL_PRECIO_MS === 350);
  cotizar.res({ service: 'ai_brain', label: 'x', credits: 1, usd: 0.004, creditsPerUsd: 100, bloque: { usadas: 11, total: 12, restantes: 1 } });
  await calma();
  b = ver();
  check('W3) con el precio, se sabe cuánto y lo que queda del bloque', b.cotizacion.estado === 'lista' && b.cotizacion.precio.credits === 1 && b.bloque?.restantes === 1);
  b.cotizar('Uno');
  await espera(H.ESPERA_DEL_PRECIO_MS + 80);
  const primera = cotizar;
  b.cotizar('Uno y dos');
  await espera(H.ESPERA_DEL_PRECIO_MS + 80);
  cotizar.res({ service: 'ai_brain', label: 'x', credits: 2, usd: 0.008, creditsPerUsd: 100 });
  await calma();
  primera.res({ service: 'ai_brain', label: 'x', credits: 9, usd: 0.09, creditsPerUsd: 100 });
  await calma();
  b = ver();
  check('W3b) un precio que llega tarde no pisa al del último texto', b.cotizacion.estado === 'lista' && b.cotizacion.precio.credits === 2);
  b.cotizar('   ');
  b = ver();
  check('W4) sin texto no hay nada que cotizar', b.cotizacion.estado === 'nada');
  b.enviar('Añade una escena de noche');
  b = ver();
  contestar.res({ chatId: 'chat_1', messageId: 'm_prueba_1_wee', text: 'Hecho.', sources: [], suggestedExperience: null, credits: 0, demo: false, duplicate: false,
    proposal: { productionId: pid(1), baseRevision: 3, operations: [{ op: 'rename_production', title: 'Otra' }], reasons: ['Porque sí.'], applied: 1, timelineChanged: false } });
  await calma();
  b = ver();
  check('W5) la propuesta llega con su id para aplicarla: el del mensaje que la pidió, con la forma de un id de operación',
    b.propuesta?.reasons?.[0] === 'Porque sí.' && b.idDeLaPropuesta === 'wb_m_prueba_1' && lib('productions/index.js').FORMA_DE_ID_DE_OPERACION.test(b.idDeLaPropuesta));
  check('W6) el id de operación aguanta cualquier id de mensaje', H.idDeOperacionDeLaPropuesta('m:1/2 x') === 'wb_m_1_2_x' && H.idDeOperacionDeLaPropuesta('m'.repeat(300)).length === 128);
  b.enviar('Otra');
  contestar.rej({ faltan: true });
  await calma();
  b = ver();
  check('W7) sin Credits suficientes, se sabe cuánto hacía falta', b.fase === 'error' && b.faltan?.required === 3 && b.propuesta === null && b.idDeLaPropuesta === null);

  /* La caja. */
  const Caja2 = cargar('components/studio/produccion/ProductionBrainBox.tsx').default;
  const PRECIO = (credits) => ({ service: 'ai_brain', label: 'x', credits, usd: 0.004, creditsPerUsd: 100 });
  const envios = [];
  const brain = (extra) => ({
    fase: 'quieto', texto: null, propuesta: null, idDeLaPropuesta: null, sinPropuesta: false, bloque: null,
    cotizacion: { estado: 'nada' }, faltan: null, cotizar() {}, enviar: (x) => envios.push(x), descartar() {}, ...extra,
  });
  recordar(true);
  const c0 = dibujar(hc(Caja2, { espacio: espacioCon({ brain: brain(), revision: 3 }) }));
  boton(c0, 'Proponer escenas').tocar();
  const c1 = dibujar(hc(Caja2, { espacio: espacioCon({ brain: brain({ cotizacion: { estado: 'calculando' } }), revision: 3 }) }));
  check('W8) un atajo RELLENA la caja con la petición, y no manda nada', c1.cajas[0].valor === t('filmmaker.wsBrainQuickScenesText') && envios.length === 0 && !!boton(c0, 'Revisar la producción'));
  check('W9) mientras se calcula el precio, se dice, y la caja no envía', /Calculando el costo…/.test(c1.texto) && c1.cajas[0].ocupado === true);
  c1.cajas[0].onEnviar();
  check('W10) sin precio no hay envío', envios.length === 0);
  const c2 = dibujar(hc(Caja2, { espacio: espacioCon({ brain: brain({ cotizacion: { estado: 'error' } }), revision: 3 }) }));
  check('W11) si el precio no se pudo calcular, se dice, y tampoco se envía', /No pudimos calcular el costo/.test(c2.texto) && c2.cajas[0].ocupado === true);
  const c3 = dibujar(hc(Caja2, { espacio: espacioCon({ brain: brain({ cotizacion: { estado: 'lista', precio: PRECIO(1) } }), revision: 3 }) }));
  c3.cajas[0].onEnviar();
  check('W12) con precio que cobra: lo que cuesta, con las palabras de Weë Brain, y el botón lo dice; y se envía',
    /Respuesta de Weë Brain/.test(c3.texto) && /1 Credits/.test(c3.texto) && c3.cajas[0].etiquetaEnviar === 'Enviar por 1 Credits' && c3.cajas[0].ocupado === false && envios.length === 1);
  recordar(false);
  const c4 = dibujar(hc(Caja2, { espacio: espacioCon({ brain: brain({ cotizacion: { estado: 'lista', precio: PRECIO(0) }, bloque: { usadas: 2, total: 12, restantes: 10 } }), revision: 3 }) }));
  check('W13) si no cobra, en vez de «0 Credits» se dice cuántas respuestas quedan del bloque', !/0 Credits/.test(c4.texto) && /Te quedan 10 de 12 respuestas/.test(c4.texto));
  const PROPUESTA = {
    productionId: pid(1), baseRevision: 3,
    operations: [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'fog' }, { op: 'extend_duration', target: { shotId: 'sh-0101' }, bySec: 1 }],
    reasons: ['Más misterio.', null], applied: 2, pending: { scenes: [], shots: ['sh-0101', 'sh-0102'], audio: [], removed: [] }, timelineChanged: true,
  };
  const aplicadas = [];
  let respuestaDeAplicar = { ok: true, applied: 2, alreadyApplied: false };
  const alAplicar = async (ops, baseRevision, operationId) => { aplicadas.push({ ops, baseRevision, operationId }); return respuestaDeAplicar; };
  let descartes = 0;
  const conProp = (extra = {}) => espacioCon({ brain: brain({ fase: 'contesto', texto: 'Te propongo niebla.', propuesta: PROPUESTA, idDeLaPropuesta: 'wb_m_7', descartar: () => { descartes++; } }), revision: 3, onAplicarPropuesta: alAplicar, ...extra });
  const p0 = dibujar(hc(Caja2, { espacio: conProp() }));
  check('W14) cada cambio, en una frase: qué, dónde y el porqué de Weë Brain', /Cambiar el clima/.test(p0.texto) && /Escena 1/.test(p0.texto) && /Por qué: Más misterio\./.test(p0.texto) && /Alargar 1 s/.test(p0.texto));
  /*
   * Fase 34 del motor: con «así quedaría» a la vista (la propuesta está vigente y la app la reproduce), lo que deja por
   * rehacer lo dice el resumen —cuántos planos, cuáles, y que se cotizan antes de generarlos— y no se repite con la
   * frase de siempre; sin resumen (W15b), sigue la frase de siempre.
   */
  check('W15) lo que cuesta aplicarla —nada— y lo que deja por rehacer, que se cotiza antes de generarlo',
    /Aplicar estos cambios no cuesta Credits\./.test(p0.texto) && /Habría que generar 2 planos:/.test(p0.texto)
    && /allí se cotiza cada plano antes de generar nada/.test(p0.texto) && !/volver a generar 2 planos/.test(p0.texto));
  const sinResumen = dibujar(hc(Caja2, { espacio: conProp({ hayCambios: true }) }));
  check('W15b) y sin «así quedaría» (hay cambios sin guardar), lo que deja por rehacer con la frase de siempre',
    /Aplicar estos cambios no cuesta Credits\./.test(sinResumen.texto) && /volver a generar 2 planos; cada uno se cotiza antes de generarlo/.test(sinResumen.texto)
    && !/Habría que generar 2 planos:/.test(sinResumen.texto));
  avisos.length = 0;
  boton(p0, 'Aplicar los cambios').tocar();
  await calma();
  check('W16) aplicar va por su camino, con la revisión en que se comprobó y SU id; se dice y la propuesta se va',
    aplicadas.length === 1 && JSON.stringify(aplicadas[0]) === JSON.stringify({ ops: PROPUESTA.operations, baseRevision: 3, operationId: 'wb_m_7' }) && avisos.at(-1)?.[0] === 'Cambios aplicados.' && descartes === 1);
  respuestaDeAplicar = { ok: false, motivo: 'cambio' };
  boton(dibujar(hc(Caja2, { espacio: conProp() })), 'Aplicar los cambios').tocar();
  await calma();
  check('W17) si la producción cambió entre medias (CAS), se dice y la propuesta se queda', avisos.at(-1)?.[0] === t('filmmaker.wsBrainStale') && descartes === 1);
  const p1 = dibujar(hc(Caja2, { espacio: conProp({ ocupado: 'aplicando' }) }));
  check('W18) mientras se aplica, se dice, y ni aplicar ni descartar se pueden tocar', /Aplicando los cambios de Weë Brain…/.test(p1.texto) && boton(p1, 'Aplicar los cambios').apagado && boton(p1, 'Descartar').apagado);
  const p2 = dibujar(hc(Caja2, { espacio: espacioCon({ brain: brain({ fase: 'contesto', texto: 'No sé.', sinPropuesta: true }), revision: 3 }) }));
  check('W19) si intentó proponer y no salió nada aplicable, se dice —y que esa respuesta no cuenta en el bloque—',
    /no propuso cambios que se puedan aplicar/.test(p2.texto) && /Esta respuesta no cuenta en tu bloque de respuestas\./.test(p2.texto));
  const p3 = dibujar(hc(Caja2, { espacio: espacioCon({ brain: brain({ fase: 'error', faltan: { required: 3, available: 1 } }), revision: 3 }) }));
  check('W20) sin Credits suficientes, la frase de siempre de los Credits', new RegExp(t('weeai.errNotEnoughCredits').slice(0, 30)).test(p3.texto));
}

/* ═══ C · EL CONTROLADOR: APLICAR UNA PROPUESTA Y VOLVER A UNA VERSIÓN ════ */
console.log('\n── C · R1 y R6: ocupada mientras viaja, con su revisión y su id, y lo que hay que rehacer se suma ──');
{
  const { crearControladorDeProduccion } = cargar('utils/controladorDeProduccion.ts');
  const guardada = (revision, production = conFaro(), status = 'active') => ({ productionId: pid(1), revision, status, createdAt: 1, updatedAt: 1, production });
  const PEND = (shots) => ({ scenes: [], shots, audio: [], removed: [] });
  const aplicaciones = []; let resolverAplicar = null; let modoAplicar = 'esperar';
  const restauraciones = []; let respuestaDeRestaurar = null;
  const servicio = {
    getProduction: async () => ({ ok: true, valor: guardada(3) }),
    applyProductionOperations: (l) => {
      aplicaciones.push(l);
      if (modoAplicar === 'conflicto') return Promise.resolve({ ok: false, fallo: { tipo: 'conflicto', code: 'revision_conflict', messageKey: 'x', problems: [], reintentable: false } });
      return new Promise((res) => { resolverAplicar = res; });
    },
    archiveProduction: async () => ({ ok: false }), unarchiveProduction: async () => ({ ok: false }),
    restoreProduction: (d) => { restauraciones.push(d); return respuestaDeRestaurar(d); },
  };
  let serie = 0;
  const c = crearControladorDeProduccion(pid(1), { servicio, nuevoIdDeOperacion: () => `op_${++serie}`, programar: () => () => {} });
  await c.cargar();
  const OPS = [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'fog' }];
  const enVuelo = c.aplicarPropuesta(OPS, 3, 'wb_m_9');
  const vistaAntes = c.leer().estado.vista;
  const gestoOcupado = c.gesto([{ op: 'rename_production', title: 'Durante' }]);
  const vueltaOcupada = await c.restaurar(1);
  check('C1) mientras se aplica, la producción está OCUPADA: no acepta gestos ni otra vuelta, y nada cambia en pantalla',
    c.leer().ocupado === 'aplicando' && !gestoOcupado.ok && c.leer().estado.vista === vistaAntes && !vueltaOcupada.ok && vueltaOcupada.motivo === 'ocupado' && restauraciones.length === 0);
  const aplicada = Ops.aplicarOperaciones(conFaro(), OPS);
  resolverAplicar({ ok: true, valor: { produccion: guardada(4, aplicada.production), applied: 1, pending: PEND(['sh-0101', 'sh-0102']), timelineChanged: false, operationId: 'wb_m_9', alreadyApplied: false } });
  const r = await enVuelo;
  check('C2) viaja SOLA —no como un gesto—, con la revisión en que se comprobó y el id que le dieron',
    r.ok && aplicaciones.length === 1 && JSON.stringify(aplicaciones[0]) === JSON.stringify({ productionId: pid(1), expectedRevision: 3, operations: OPS, operationId: 'wb_m_9' }));
  check('C3) lo que vuelve manda, deja de estar ocupada y lo que hay que rehacer se suma', c.leer().ocupado === null && c.leer().estado.confirmada.revision === 4
    && c.leer().estado.vista.scenes[0].weather === 'fog' && c.leer().estado.porRehacer.shots.join() === 'sh-0101,sh-0102' && c.leer().estado.guardado === 'guardado');
  const otraRev = await c.aplicarPropuesta(OPS, 3, 'wb_m_10');
  check('C4) sobre otra revisión no se aplica: «cambió», y no se pregunta al servidor', !otraRev.ok && otraRev.motivo === 'cambio' && aplicaciones.length === 1);
  const mala = await c.aplicarPropuesta([{ op: 'change_weather', sceneId: 'sc-no-existe', weather: 'fog' }], 4, 'wb_m_11');
  check('C5) lo que F1-A no acepta sobre la revisión guardada no viaja: se dice por qué', !mala.ok && mala.motivo === 'rechazada' && mala.problems?.length > 0 && aplicaciones.length === 1);
  modoAplicar = 'conflicto';
  const choque = await c.aplicarPropuesta([{ op: 'rename_production', title: 'Choque' }], 4, 'wb_m_12');
  check('C6) si el servidor dice que la revisión ya no es esa (CAS), «cambió», y nada se toca', !choque.ok && choque.motivo === 'cambio' && c.leer().estado.confirmada.revision === 4 && c.leer().ocupado === null);
  c.gesto([{ op: 'rename_production', title: 'Sin guardar' }]);
  const sinGuardar = await c.aplicarPropuesta(OPS, 4, 'wb_m_13');
  check('C7) con cambios sin guardar, primero se guardan', !sinGuardar.ok && sinGuardar.motivo === 'cambios_sin_guardar');

  /* Volver a una versión (R6). */
  let resolverVuelta = null;
  const c2 = crearControladorDeProduccion(pid(1), { servicio: { ...servicio, applyProductionOperations: async (l) => ({ ok: true, valor: { produccion: guardada(4, Ops.aplicarOperaciones(conFaro(), l.operations).production), applied: 1, pending: PEND(['sh-0101']), timelineChanged: false, operationId: l.operationId, alreadyApplied: false } }) }, nuevoIdDeOperacion: () => `op_${++serie}`, programar: () => () => {} });
  await c2.cargar();
  c2.gesto([{ op: 'extend_duration', target: { shotId: 'sh-0101' }, bySec: 1 }]);
  c2.guardarAhora();
  await calma();
  respuestaDeRestaurar = () => new Promise((res) => { resolverVuelta = res; });
  const vuelta = c2.restaurar(1);
  const gestoDurante = c2.gesto([{ op: 'rename_production', title: 'Durante la vuelta' }]);
  check('C8) mientras vuelve, «restaurando»: ni gestos ni nada que mandar', c2.leer().ocupado === 'restaurando' && !gestoDurante.ok && c2.leer().estado.pendientes.length === 0);
  resolverVuelta({ ok: true, valor: { produccion: guardada(5), restoredFrom: 1, changed: true, alreadyApplied: false, pending: PEND(['sh-0102']) } });
  const rv = await vuelta;
  check('C9) lo que vuelve se pone ENCIMA sin olvidar lo que había que rehacer —antes se «cargaba» entero y se perdía—',
    rv.ok && c2.leer().ocupado === null && c2.leer().estado.confirmada.revision === 5 && c2.leer().estado.porRehacer.shots.join() === 'sh-0101,sh-0102');
  const idsDeVuelta = () => restauraciones.map((x) => x.operationId);
  respuestaDeRestaurar = async () => ({ ok: false, fallo: { tipo: 'sin_conexion', code: 'network', messageKey: 'x', problems: [], reintentable: true } });
  await c2.restaurar(2);
  await c2.restaurar(2);
  const [a1, a2] = idsDeVuelta().slice(-2);
  check('C10) si no se sabe si llegó, repetir la MISMA vuelta usa el MISMO id: el servidor no la aplica dos veces', a1 === a2 && restauraciones.at(-1).expectedRevision === 5);
  respuestaDeRestaurar = async () => ({ ok: false, fallo: { tipo: 'rechazada', code: 'x', messageKey: 'x', problems: [], reintentable: false } });
  await c2.restaurar(2);
  await c2.restaurar(2);
  const [b1, b2] = idsDeVuelta().slice(-2);
  check('C11) lo que el servidor rechazó ya no se repite: la siguiente vuelta es otra, con otro id', b1 === a1 && b2 !== b1);
  respuestaDeRestaurar = async () => ({ ok: true, valor: { produccion: guardada(6), restoredFrom: 3, changed: true, alreadyApplied: false } });
  const sinPend = await c2.restaurar(3);
  check('C12) un servidor que no dice qué rehacer no inventa nada: se suma lo que se sabía', sinPend.ok && c2.leer().estado.porRehacer.shots.join() === 'sh-0101,sh-0102');

  /* El reductor y el servicio. */
  const R = cargar('utils/produccionOptimista.ts');
  const e0 = R.reducirProduccion(R.ESTADO_INICIAL, { tipo: 'cargada', produccion: guardada(3) });
  const eOtra = R.reducirProduccion(e0, { tipo: 'externa', produccion: { ...guardada(9), productionId: pid(2) }, pending: PEND(['x']) });
  check('C13) una revisión de OTRA producción no se pone', eOtra === e0);
  const FS = cargar('services/filmmakerService.ts');
  const s = FS.crearFilmmakerService(async () => ({ ...guardada(7), productionId: pid(1), summary: {}, restoredFrom: 2, changed: true, pending: { scenes: ['sc-0001'], shots: [], audio: [], removed: [] } }));
  const rs = await s.restoreProduction({ productionId: pid(1), expectedRevision: 6, revision: 2, operationId: 'op_x' });
  check('C14) el servicio lee lo que hay que rehacer al volver (el servidor ya lo mandaba)', rs.ok && rs.valor.pending.scenes.join() === 'sc-0001');
  const P = sinComentarios(leer('screens/ProductionScreen.tsx'));
  check('C15) la pantalla no deja editar mientras está ocupada, y la toma tampoco se pide entonces',
    /const editable = esEditable\(estado\) && !ocupado;/.test(P) && /useTomaDePlano\(estado\.confirmada, hayCambios \|\| !!ocupado, seleccion\)/.test(P) && /onAplicarPropuesta: controlador\.aplicarPropuesta,/.test(P));
  const Guardado = cargar('components/studio/produccion/ProductionSaveState.tsx').default;
  const g1 = dibujar(hc(Guardado, { guardado: 'guardado', fallo: null, onGuardarAhora() {}, onReintentar() {}, ocupado: 'restaurando' }));
  const g2 = dibujar(hc(Guardado, { guardado: 'pendiente', fallo: null, onGuardarAhora() {}, onReintentar() {}, ocupado: 'aplicando' }));
  check('C16) y el estado de guardado dice qué la tiene ocupada, sin botones', /Volviendo a una versión anterior…/.test(g1.texto) && /Aplicando los cambios de Weë Brain…/.test(g2.texto) && g2.botones.length === 0);
}

/* ═══ L · LO GUARDADO, POR PÁGINAS ════════════════════════════════════════ */
console.log('\n── L · R7: lo guardado por páginas, en orden estable, con cursor; y en la app, «Cargar más» y la búsqueda ──');
const elemento = (elementId, type, { version = 1, status = 'active', owner = A, name } = {}) => ({
  contract: nucleo.ELEMENT_CONTRACT_VERSION, elementId, type, version, status, name: name ?? `Element ${elementId}`,
  refs: [], ownerAccountId: owner, createdAt: HOY, updatedAt: HOY, ...(status === 'archived' ? { archivedAt: HOY } : {}),
});
const sembrar = (e) => { if (!nucleo.elementoValido(e)) throw new Error(`Element de prueba mal formado: ${e.elementId}`); base.docs.set(`elements/${e.elementId}`, e); };
{
  const nombres = Array.from({ length: 55 }, (_, i) => `el_pj_${String(54 - i).padStart(4, '0')}`);
  nombres.forEach((id, i) => sembrar(elemento(id, 'character', { name: `Personaje ${i}` })));
  sembrar(elemento('el_pj_archivado', 'character', { status: 'archived' }));
  sembrar(elemento('el_pj_ajeno_01', 'character', { owner: B }));
  sembrar(elemento('el_lugar_0001', 'place'));
  const p1 = await elems(A, { op: 'list', type: 'character', limit: 20 });
  const p2 = p1.ok ? await elems(A, { op: 'list', type: 'character', limit: 20, after: p1.valor.next }) : p1;
  const p3 = p2.ok ? await elems(A, { op: 'list', type: 'character', limit: 20, after: p2.valor.next }) : p2;
  const ids = [p1, p2, p3].flatMap((p) => (p.ok ? p.valor.elements.map((e) => e.elementId) : []));
  check('L1) por páginas: 20 + 20 + 15, cada una con el cursor de la siguiente, y la última sin él',
    p1.ok && p1.valor.elements.length === 20 && typeof p1.valor.next === 'string' && p2.ok && p2.valor.elements.length === 20 && p3.ok && p3.valor.elements.length === 15 && p3.valor.next === undefined,
    [p1, p2, p3].map((p) => (p.ok ? `${p.valor.elements.length}${p.valor.next ? '+' : ''}` : codigo(p))).join(' · '));
  check('L2) todas las vivas de la cuenta, una vez cada una y en orden estable por su id: ni la archivada, ni la ajena, ni otra clase',
    ids.length === 55 && new Set(ids).size === 55 && JSON.stringify(ids) === JSON.stringify([...nombres].sort()));
  const tope = await elems(A, { op: 'list', type: 'character', limit: 500 });
  const porDefecto = await elems(A, { op: 'list', type: 'character' });
  check('L3) como mucho 50 por página; sin decir nada, 20', tope.ok && tope.valor.elements.length === 50 && !!tope.valor.next && porDefecto.ok && porDefecto.valor.elements.length === 20);
  const raro = await elems(A, { op: 'list', type: 'character', limit: 5, after: '../../x' });
  check('L4) un cursor sin forma no se usa: se empieza por el principio', raro.ok && raro.valor.elements[0]?.elementId === [...nombres].sort()[0]);
  const otra = await elems(B, { op: 'list', type: 'character', limit: 50 });
  check('L5) otra cuenta ve solo lo suyo', otra.ok && otra.valor.elements.map((e) => e.elementId).join() === 'el_pj_ajeno_01');
  const cand = (s) => { const i = s.indexOf('export const candidatosDeLaCuenta'); return s.slice(i, s.indexOf('\n};', i)); };
  check('L6) el contexto visual de Weë Brain sigue igual: `candidatosDeLaCuenta` no cambia ni una coma',
    cand(sinCR(git(`show ${ANTES}:functions/src/elements/index.ts`))) === cand(leer('functions/src/elements/index.ts')) && cand(leer('functions/src/elements/index.ts')).length > 200);
  check('L7) y la página es la de la cuenta de la sesión, como todo en la puerta', /paginaDeElementosDeLaCuenta\(\{ accountId, type/.test(sinComentarios(leer('functions/src/elements/puerta.ts'))) && elemMod.MAX_POR_PAGINA_DE_ELEMENTOS === 50);

  /* El servicio. */
  const { elementsService } = cargar('services/elementsService.ts');
  respuestaDe = async (nombre, datos) => ({ data: nombre === 'elements' && datos.op === 'list' ? { elements: [{ elementId: 'el_luna_0001', type: 'character', name: 'Luna', version: 3 }], ...(datos.after ? {} : { next: 'el_luna_0001' }) } : {} });
  const s1 = await elementsService.pagina('character');
  const s2 = await elementsService.pagina('character', { after: 'el_luna_0001' });
  check('L8) el servicio pide su página —20— y con el cursor la siguiente; devuelve el cursor que llega',
    s1.ok && s1.siguiente === 'el_luna_0001' && JSON.stringify(llamadas.at(-2).datos) === JSON.stringify({ op: 'list', type: 'character', limit: 20 })
    && s2.ok && s2.siguiente === undefined && JSON.stringify(llamadas.at(-1).datos) === JSON.stringify({ op: 'list', type: 'character', limit: 20, after: 'el_luna_0001' }));

  /* El hook. */
  const m = miniReact();
  const pedidas = []; const pendientes = [];
  const cargarH = crearCargador({ dobles: { react: m.react, '../services/elementsService': { elementsService: { pagina: (tipo, o = {}) => { pedidas.push(`${tipo}${o.after ? `>${o.after}` : ''}`); return new Promise((res) => pendientes.push(res)); } } } } });
  const { useElementosParaVincular } = cargarH('hooks/useElementosParaVincular.ts');
  const EL = (elementId, type, name) => ({ elementId, type, name, version: 1 });
  let e = m.pasar(useElementosParaVincular);
  e.cargar(['place', 'scene']);
  pendientes[0]({ ok: true, elementos: [EL('el_b', 'place', 'Bahía'), EL('el_z', 'place', 'Zoco')], siguiente: 'el_z' });
  pendientes[1]({ ok: true, elementos: [EL('el_a', 'scene', 'Azotea')] });
  await calma();
  e = m.pasar(useElementosParaVincular);
  check('L9) la primera página de cada clase a la vez; clase a clase y en el orden del servidor; y se sabe que hay más',
    JSON.stringify(pedidas) === '["place","scene"]' && e.lista.map((x) => x.name).join() === 'Bahía,Zoco,Azotea' && e.hayMas === true);
  e.cargarMas();
  e = m.pasar(useElementosParaVincular);
  check('L10) «Cargar más» pide solo lo de la clase que tiene más, desde su cursor', pedidas.at(-1) === 'place>el_z' && pedidas.length === 3 && e.cargandoMas === true);
  pendientes[2]({ ok: true, elementos: [EL('el_z', 'place', 'Zoco'), EL('el_zz', 'place', 'Zulueta')] });
  await calma();
  e = m.pasar(useElementosParaVincular);
  check('L11) lo que llega va DETRÁS de lo suyo, sin repetir, y nada se reordena; sin cursor, ya no hay más',
    e.lista.map((x) => x.name).join() === 'Bahía,Zoco,Zulueta,Azotea' && e.hayMas === false && e.cargandoMas === false);
  e.cargar(['character']);
  const vieja = pendientes.at(-1);
  e.cargar(['place']);
  pendientes.at(-1)({ ok: true, elementos: [EL('el_f', 'place', 'Faro')] });
  vieja({ ok: true, elementos: [EL('el_l', 'character', 'Luna')] });
  await calma();
  e = m.pasar(useElementosParaVincular);
  check('L12) lo que llega de una petición anterior no se pinta', e.lista.map((x) => x.name).join() === 'Faro');
  const { coincideConLaBusqueda } = cargar('utils/buscarPorNombre.ts');
  check('L13) buscar: sin mayúsculas ni acentos, por cualquier parte; vacío, todo', coincideConLaBusqueda('Álvaro', 'alv') && coincideConLaBusqueda('La Bahía', 'BAHIA') && !coincideConLaBusqueda('Zoco', 'mar') && coincideConLaBusqueda('Zoco', '  '));

  /*
   * El selector. Reancladas por nombre en la Fase 23 del motor (el espacio de trabajo): el filtro y «Cargar más» viven
   * en el selector común (`ProductionSelectorDeGuardados`), que abren las fichas del proyecto; la hoja de la
   * estructura quedó para el guion. Las reglas, las de la Fase 22.
   */
  const Selector = cargar('components/studio/produccion/ProductionSelectorDeGuardados.tsx').default;
  let masPedidas = 0;
  const elementos = (extra = {}) => ({ carga: 'listos', lista: [EL('el_luna', 'character', 'Luna'), EL('el_lucia', 'character', 'Lucía'), EL('el_mar', 'character', 'Mar')], hayMas: true, cargandoMas: false, cargar() {}, cargarMas: () => { masPedidas++; }, ...extra });
  const elegidos = [];
  const selector = (el) => dibujar(hc(Selector, { elementos: el, onElegir: (e) => elegidos.push(e.elementId), onVolver() {} }));
  recordar(true);
  const h1 = selector(elementos());
  h1.buscadores[0].onCambiar('lu');
  const h2 = selector(elementos());
  check('L14) la lista de lo guardado se filtra por nombre, y dice que busca en lo ya cargado',
    !!h1.buscadores[0] && boton(h2, 'Luna') && boton(h2, 'Lucía') && !boton(h2, 'Mar') && /Busca entre lo que ya se ha cargado: puede haber más\./.test(h2.texto));
  h2.buscadores[0].onCambiar('zzz');
  const h3 = selector(elementos());
  check('L15) si nada de lo cargado se llama así, se dice', /Nada de lo cargado se llama así\./.test(h3.texto));
  boton(h3, 'Cargar más').tocar();
  const h4 = selector(elementos({ hayMas: false }));
  check('L16) «Cargar más» mientras queda algo, y pide más; cuando no queda, no está', masPedidas === 1 && !boton(h4, 'Cargar más'));
  recordar(false);
}

/* ═══ M · LAS MINIATURAS Y EL PÓSTER DEL ELEGIDO ══════════════════════════ */
console.log('\n── M · R10: el elegido conserva su póster, y ninguna miniatura carga el vídeo ──');
{
  const Mini = cargar('components/studio/produccion/MiniaturaDeVideo.tsx').default;
  const m1 = dibujar(hc(Mini, { video: { assetId: 'a', url: 'https://cdn.invalid/a.mp4', poster: 'https://cdn.invalid/a.jpg' }, nombre: 'Plano 1' }));
  const m2 = dibujar(hc(Mini, { video: { assetId: 'a', url: 'https://cdn.invalid/a.mp4' }, nombre: 'Plano 1' }));
  const m3 = dibujar(hc(Mini, { video: null, nombre: 'Plano 1' }));
  check('M1) con póster, su imagen fija; sin él, el aviso de que ya tiene vídeo; sin vídeo, nada',
    m1.imagenes[0]?.src === 'https://cdn.invalid/a.jpg' && !/<video/.test(m1.html) && /aria-label="Vídeo listo de Plano 1"/.test(m2.html) && /play-circle/.test(m2.html) && !/<video/.test(m2.html) && m3.html === '');
  const miniaturas = ['ProductionViewer', 'ProductionTimeline', 'ProductionProjectPanel', 'ProductionShotCard'].map((f) => sinComentarios(leer(`components/studio/produccion/${f}.tsx`)));
  check('M2) la tira, la línea de tiempo, la rejilla y la tarjeta pintan la miniatura común y ninguna monta un vídeo',
    miniaturas.every((s) => /<MiniaturaDeVideo\b/.test(s) && !/<Video\b/.test(s) && !/from 'expo-av'/.test(s)));
  const P = sinComentarios(leer('screens/ProductionScreen.tsx'));
  check('M3) el vídeo del elegido que trae su toma conserva el póster —y la dirección— si es EL MISMO material; si es otro, no hereda un póster ajeno',
    /conElElegido\.set\(seleccion\.id, conocido && conocido\.assetId === toma\.enElPlano\.assetId\s*\?\s*\{ \.\.\.toma\.enElPlano, url: toma\.enElPlano\.url \?\? conocido\.url, poster: toma\.enElPlano\.poster \?\? conocido\.poster \?\? null \}\s*:\s*toma\.enElPlano/.test(P));
}

/* ═══ Q · QUIÉN LO DICE ═══════════════════════════════════════════════════ */
console.log('\n── Q · R12: ni un diálogo ni una voz en off sin un personaje válido ──');
{
  const Herr = cargar('components/studio/produccion/ProductionTools.tsx').default;
  const verTexto = (espacio) => dibujar(hc(Herr, { herramienta: 'texto', espacio, montaje: { video: [], pistas: [] }, cabezal: 0, ids: { sonido: () => 'sd_n', linea: () => 'ln_n' } }));
  gestos.length = 0;
  recordar(true);
  const q0 = verTexto(espacioCon());
  const opcionesDeHablante = q0.botones.filter((b) => b.etiqueta === 'Luna' || b.etiqueta === 'Mar').map((b) => b.etiqueta);
  const campo0 = q0.campos.find((c) => c.etiqueta === t('filmmaker.wsLineText'));
  check('Q1) un diálogo pide quién lo dice: los personajes de la producción, primero los que salen en el plano; y hasta elegir, no se escribe',
    /¿Quién lo dice\?/.test(q0.texto) && opcionesDeHablante.join() === 'Luna,Mar' && campo0?.editable === false && /Elige quién dice la línea para poder añadirla\./.test(q0.texto));
  campo0.onGuardar('Hola');
  check('Q2) sin elegir, no sale ninguna línea', gestos.length === 0);
  boton(q0, 'Mar').tocar();
  const q1 = verTexto(espacioCon());
  check('Q3) si quien lo dice no sale en el plano, se avisa (F1-A lo guarda con un aviso)', /Mar no sale en este plano/.test(q1.texto) && q1.campos.find((c) => c.etiqueta === t('filmmaker.wsLineText')).editable === true);
  q1.campos.find((c) => c.etiqueta === t('filmmaker.wsLineText')).onGuardar('  ¿Hay alguien?  ');
  check('Q4) la línea sale CON su personaje, por la operación de F1-A de siempre',
    JSON.stringify(gestos.at(-1)) === JSON.stringify([{ op: 'add_dialogue', target: { shotId: 'sh-0101' }, line: { id: 'ln_n', kind: 'dialogue', text: '¿Hay alguien?', characterId: 'char-mar' } }]));
  const aplicado = Ops.aplicarOperaciones(produccionUI(), gestos.at(-1));
  check('Q5) y F1-A la acepta', aplicado.ok);
  boton(q1, t('filmmaker.audioNarrator')).tocar();
  const q2 = verTexto(espacioCon());
  q2.campos.find((c) => c.etiqueta === t('filmmaker.wsLineText')).onGuardar('Era la última noche.');
  check('Q6) la narración no lleva a nadie: ni se pregunta, ni viaja un personaje', !/¿Quién lo dice\?/.test(q2.texto) && gestos.at(-1)[0].line.characterId === undefined && gestos.at(-1)[0].line.kind === 'narration'
    && Ops.aplicarOperaciones(produccionUI(), gestos.at(-1)).ok);
  recordar(true);
  const q3 = verTexto(espacioCon({ produccion: produccionUI({ characters: [] }) }));
  check('Q7) sin personajes en la producción, se dice por qué, y el diálogo no se puede escribir', /todavía no tiene personajes/.test(q3.texto) && q3.campos.find((c) => c.etiqueta === t('filmmaker.wsLineText')).editable === false);
  check('Q8) las líneas que ya hay dicen quién las dice', /Luna/.test(q0.texto) && /Ya amanece\./.test(q0.texto));
  recordar(false);
}

/* ═══ T · EL ESTILO COMO TOKEN ════════════════════════════════════════════ */
console.log('\n── T · R13: se guarda el token, y el nombre sale al pintarlo ──');
{
  const C = cargar('constants/filmmaker.ts');
  check('T1) cuatro estilos, cada uno con su token estable y la clave de su nombre', C.ESTILOS_CANONICOS.map((e) => e.token).join() === 'cinematic,realistic,anime,3d' && C.ESTILOS_CANONICOS.every((e) => t(e.clave) !== e.clave));
  check('T2) un token se enseña con su nombre; lo escrito por alguien, tal cual', C.nombreDelEstilo('cinematic', t) === 'Cinemático' && C.nombreDelEstilo('Noir de los cuarenta', t) === 'Noir de los cuarenta');
  check('T3) lo guardado antes con el nombre traducido se sigue reconociendo', C.esElEstilo('Cinemático', 'cinematic', t) && C.esElEstilo('cinematic', 'cinematic', t) && !C.esElEstilo('Realista', 'cinematic', t) && !C.esElEstilo(undefined, 'cinematic', t));
  const Visor = cargar('components/studio/produccion/ProductionViewer.tsx').default;
  gestos.length = 0;
  recordar(true);
  const v0 = dibujar(hc(Visor, { espacio: espacioCon(), onIrAlDirector() {} }));
  v0.botones.find((b) => /^Estilo/.test(b.etiqueta ?? '')).tocar();
  const v1 = dibujar(hc(Visor, { espacio: espacioCon(), onIrAlDirector() {} }));
  boton(v1, 'Cinemático').tocar();
  check('T4) elegir un estilo guarda su TOKEN, no su nombre', JSON.stringify(gestos.at(-1)) === JSON.stringify([{ op: 'change_style', target: { scope: 'production' }, style: 'cinematic' }]));
  recordar(true);
  const conToken = espacioCon({ produccion: produccionUI({ creativeDirection: { visualStyle: 'cinematic' } }) });
  const v2 = dibujar(hc(Visor, { espacio: conToken, onIrAlDirector() {} }));
  v2.botones.find((b) => /^Estilo/.test(b.etiqueta ?? '')).tocar();
  const v3 = dibujar(hc(Visor, { espacio: conToken, onIrAlDirector() {} }));
  check('T5) guardado el token, la píldora dice su nombre y el chip está elegido; tocarlo otra vez lo quita',
    /Estilo: Cinemático|Cinemático/.test(v2.texto) && boton(v3, 'Cinemático').elegido && (boton(v3, 'Cinemático').tocar(), JSON.stringify(gestos.at(-1)) === JSON.stringify([{ op: 'change_style', target: { scope: 'production' }, style: null }])));
  recordar(true);
  const antiguo = espacioCon({ produccion: produccionUI({ creativeDirection: { visualStyle: 'Cinemático' } }) });
  dibujar(hc(Visor, { espacio: antiguo, onIrAlDirector() {} })).botones.find((b) => /^Estilo/.test(b.etiqueta ?? '')).tocar();
  const v4 = dibujar(hc(Visor, { espacio: antiguo, onIrAlDirector() {} }));
  check('T6) lo guardado antes de esta fase —el nombre, en español— se reconoce como ese estilo', boton(v4, 'Cinemático').elegido);
  recordar(false);
  const Pestanas = cargar('components/studio/produccion/ProductionDirectorTabs.tsx').default;
  const d0 = dibujar(hc(Pestanas, { espacio: espacioCon({ brain: undefined }), pestana: 'director', onPestana() {} }));
  boton(d0, t('filmmaker.wsApplyTouch', { toque: 'Cinemático' })).tocar();
  check('T7) el toque rápido del plano guarda también el token', JSON.stringify(gestos.at(-1)) === JSON.stringify([{ op: 'change_style', target: { scope: 'shot', shotId: 'sh-0101' }, style: 'cinematic' }]));
  const Prop = cargar('components/studio/produccion/ProductionShotProperties.tsx').default;
  const s0 = dibujar(hc(Prop, { espacio: conToken }));
  check('T8) y las propiedades del plano lo dicen con su nombre', /Estilo: Cinemático/.test(s0.texto));
  check('T9) el texto del plano no cambia: el token llega al modelo tal cual («style cinematic»), y lo de antes, byte a byte',
    git(`diff --name-only ${tramo} -- functions/src/creator/plano.ts functions/src/filmmaker`).trim() === '');
}

/* ═══ X · EL DOCUMENTO, LA DURACIÓN Y LOS IDIOMAS ═════════════════════════ */
console.log('\n── X · R14, R16 y R17 ──');
{
  const Gen = cargar('components/studio/produccion/ProductionShotGeneration.tsx').default;
  const cotizada = (pedida, efectiva) => ({ ...tomaQuieta, calidad: 'standard', fase: { fase: 'cotizada', creditos: 3, toma: 1, efectiva: { requestedDurationSec: pedida, durationSec: efectiva, aspectRatio: '16:9', resolution: '720p', quality: 'standard', withSound: false } } });
  const redondeo = dibujar(hc(Gen, { toma: cotizada(5.5, 6), tipo: 'plano', formato: '16:9' }));
  const minimo = dibujar(hc(Gen, { toma: cotizada(2, 4), tipo: 'plano', formato: '16:9' }));
  check('X1) R16: redondear a segundos enteros se dice como redondeo, no como «el más corto que se puede generar»',
    /los vídeos se generan por segundos enteros, así que saldrá de 6 s/.test(redondeo.texto) && !/el vídeo más corto/.test(redondeo.texto), redondeo.texto.slice(0, 300));
  check('X2) y subir hasta el mínimo se sigue diciendo como mínimo', /el vídeo más corto que se puede generar es de 4 s/.test(minimo.texto) && !/segundos enteros/.test(minimo.texto));
  const ko = leer('i18n/textos/ko/filmmaker.ts');
  const PEGADAS = ['(으)로', '(이)', '(을)', '(를)', '(은)', '(는)', '(가)', '(과)', '(와)', '을(를)', '은(는)', '이(가)', '와(과)'];
  check('X3) R17: en coreano ninguna partícula va pegada a un hueco', PEGADAS.every((p) => !ko.includes(`}}${p}`)) && /wsVersionRestored: '\{\{numero\}\}번 버전으로 되돌렸어요\.'/.test(ko));
  const zh = leer('i18n/textos/zh/filmmaker.ts'); const tw = leer('i18n/textos/zh-TW/filmmaker.ts');
  const sinCom = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
  check('X4) R17: en chino una producción es 影片 y en Taiwán 製作; 作品 solo en «我的作品»',
    !/作品/.test(sinCom(zh).replace(/我的作品/g, '')) && !/作品/.test(sinCom(tw).replace(/我的作品/g, '')) && /wsBrainStale: 'Weë Brain 提出建议后，影片已经变了/.test(zh) && /wsBrainStale: 'Weë Brain 提出建議後，製作已經變了/.test(tw));
  check('X5) y en Taiwán la voz en off ya no se llama igual que el narrador', /wsLineVoiceover: '畫外音'/.test(tw) && /audioNarrator: '旁白'/.test(tw));
  const hoja = sinComentarios(leer('components/workspace/HojaInferior.tsx'));
  check('X5b) el filtro de lo guardado vive en una hoja que, en el teléfono, sube lo que mide el teclado',
    /const teclado = useAlturaDelTeclado\(\);/.test(hoja) && /paddingBottom: Math\.max\(insets\.bottom, SPACING\.lg\) \+ teclado/.test(hoja)
    && /'components\/workspace\/CampoDeBusqueda\.tsx': 'filtro de una línea ARRIBA/.test(leer('functions/test/teclado.test.mjs')));
  const doc = leer('docs/FILMMAKER.md');
  /*
   * Cuántas operaciones de F1-A tienen un control propio en la app, calculado del código: las del lenguaje de F1-A que
   * alguna pieza del editor manda con su nombre. Reanclada en la Fase 23 del motor: el recuento ya no se fija a mano, y
   * cualquier fase que dé un control nuevo tiene que decirlo en el documento (decía 29 cuando ya eran más).
   */
  const lenguaje = [...new Set([...leer('functions/src/filmmaker/operaciones.ts').matchAll(/readonly op: '([a-z_]+)'/g)].map((m) => m[1]))];
  const delEditor = fs.readdirSync(path.resolve(RAIZ, 'components/studio/produccion')).map((f) => leer(`components/studio/produccion/${f}`)).join('\n');
  const conControl = lenguaje.filter((o) => delEditor.includes(`op: '${o}'`)).length;
  check('X6) R14: el documento ya no da por conectado lo que solo está en el servidor, y dice qué está cerrado y por qué puerta',
    !/\*\*Hecho, y conectado en la app\*\*: el lenguaje completo/.test(doc) && /Corregido en la Fase 22 \(arreglo R14/.test(doc)
    && doc.includes(`**${conControl} de las ${lenguaje.length} operaciones**`) && doc.includes(`**${lenguaje.length - conControl} operaciones sin control propio**`)
    && /`aiSettings\/render`/.test(doc) && /### Fase 22 · /.test(doc), `${conControl} de ${lenguaje.length}`);
}

/* ═══ G · LAS GUARDAS ═════════════════════════════════════════════════════ */
console.log('\n── G · Ni Credits, ni Functions, ni reglas, ni índices, ni F1-A; los once idiomas; en la cadena ──');
{
  const servidor = git(`diff --name-only ${tramo} -- functions/src`).trim().split('\n').filter(Boolean).sort();
  check('G1) del servidor solo cambian la lectura de propuestas, la puerta de Weë Brain, sus instrucciones y lo guardado por páginas',
    JSON.stringify(servidor) === JSON.stringify(['functions/src/creator/brain.ts', 'functions/src/creator/produccionEnBrain.ts', 'functions/src/creator/prompts.ts', 'functions/src/elements/index.ts', 'functions/src/elements/puerta.ts']), servidor.join(' · '));
  check('G2) y todos están en la lista del motor, donde el dinero no está', servidor.every((f) => TOCADOS_POR_EL_MOTOR.includes(f)) && TOCADOS_POR_EL_MOTOR.every((f) => !DINERO.some((re) => re.test(f))));
  check('G3) ni reglas, ni índices, ni una Function nueva', git(`diff --name-only ${tramo} -- firestore.rules storage.rules firestore.indexes.json functions/src/index.ts`).trim() === '');
  const BR = sinComentarios(leer('functions/src/creator/brain.ts'));
  check('G4) la puerta del conductor no se amplía: sigue declarando solo su capacidad', /const CAPACIDAD_DEL_CANARY: CapabilityId = 'text\.generate';/.test(leer('functions/src/creator/brain.ts')) && /const porElCore = puerta\.runtime === 'core' && capacidad === CAPACIDAD_DEL_CANARY && !produccion;/.test(BR));
  const PE = sinComentarios(leer('functions/src/creator/produccionEnBrain.ts'));
  check('G5) leer una propuesta sigue siendo solo LEER: ni escribe, ni cobra, ni llama al modelo', !/\.(set|update|create|delete)\(|runTransaction|batch\(|spendCredits|refundCredits|completeCredits|creditEngine|engine\.generate/.test(PE));
  const piezas = fs.readdirSync(path.resolve(RAIZ, 'components/studio/produccion')).map((f) => leer(`components/studio/produccion/${f}`));
  check('G6) los paneles no hablan con el servidor, ni con los Credits, ni usan temporizadores', piezas.every((s) => !/httpsCallable|firebase\/|spendCredits|creditsService|setTimeout|setInterval/.test(s.replace(/\/\*[\s\S]*?\*\//g, ''))));
  const nuevasEs = [...leer('i18n/textos/es/filmmaker.ts').matchAll(/^ {2}([A-Za-z][A-Za-z0-9_]*): '/gm)].map((m) => m[1]);
  const deEstaFase = ['busyApplying', 'busyRestoring', 'wsBusy', 'videoReadyNoPoster', 'takeDurationRounded', 'wsWhoSaysIt', 'wsPickSpeaker', 'wsNoSpeakers', 'wsSpeakerNotInShot',
    'wsElementLoadMore', 'wsElementSearch', 'wsElementSearchLoaded', 'wsElementSearchNone', 'wsBrainQuickScenes', 'wsBrainQuickScenesText', 'wsBrainQuickReview', 'wsBrainQuickReviewText',
    'wsBrainCost', 'wsBrainReason', 'wsBrainApplyFree', 'wsBrainRedo_one', 'wsBrainRedo_other', 'wsBrainApplyError', 'wsBrainNotCounted', 'opWhereProduction', 'opFocal', 'opFromTo',
    'opClearTargetDuration', 'opModifyAudioRemove', 'opModifyAudioNarrator', ...Object.values(cargar('constants/filmmaker.ts').CLAVE_DE_OPERACION).map((k) => k.replace('filmmaker.', '')),
    ...Object.values(cargar('constants/filmmaker.ts').CLAVE_DE_TRANSICION).map((k) => k.replace('filmmaker.', ''))];
  const unicas = [...new Set(deEstaFase)];
  const IDIOMAS = ['es', 'en', 'de', 'fr', 'it', 'pt', 'pt-PT', 'ru', 'ko', 'zh', 'zh-TW'];
  const faltanEn = IDIOMAS.flatMap((l) => { const s = leer(`i18n/textos/${l}/filmmaker.ts`); return unicas.filter((k) => !new RegExp(`^ {2}${k}: '`, 'm').test(s)).map((k) => `${l}:${k}`); });
  check(`G7) las ${unicas.length} claves de esta fase, en los once idiomas`, unicas.length === 92 && unicas.every((k) => nuevasEs.includes(k)) && faltanEn.length === 0, faltanEn.slice(0, 6).join(', ') || `${unicas.length}`);
  check('G8) el portugués es el de Brasil: «você», nunca la forma europea, en lo nuevo', /wsNoSpeakers: '[^']*'/.test(leer('i18n/textos/pt/filmmaker.ts')) && !/\bficheiro|ecrã|telemóvel\b/.test(leer('i18n/textos/pt/filmmaker.ts')));
  check('G9) en todo lo dibujado no faltó ni una clave', faltan.size === 0, [...faltan].join(', '));
  check('G10) documentado', /### Fase 22 · /.test(leer('docs/FILMMAKER.md')));
  check('G11) esta suite está en la cadena de `npm test`', /filmmaker-arreglos\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 22 · los arreglos de la auditoría final (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
