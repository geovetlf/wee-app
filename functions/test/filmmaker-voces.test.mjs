/**
 * FILMMAKER ENGINE · FASE 19 — LAS VOCES DEL DIÁLOGO: EL CATÁLOGO, LA ASIGNACIÓN Y SU COMPROBACIÓN, CERRADOS.
 *
 *   R · lo puro: las líneas con voz de unos requisitos de F1-A; la comprobación de una asignación, motivo a motivo y en
 *       su orden; el catálogo, VACÍO y en el código;
 *   Q · la puerta de la cuenta, cerrada por defecto;
 *   P · el plan de voces por la puerta `renders` (`voice.plan`): qué líneas, de quién, en qué idiomas, cuántas tienen
 *       voz (ninguna) y por qué; las asignaciones pedidas, comprobadas sin guardar nada; lo ajeno, otra revisión y los
 *       datos sin forma;
 *   G · las guardas: ni un proveedor, ni Credits, ni una escritura; F1-A sin tocar; la lista del motor; documentado.
 *
 * De verdad: la puerta `renders`, productions, F1-A y sus requisitos, sobre un Firestore en memoria (el arnés de
 * `f1d-postcanary.test.mjs`, copiado tal cual).
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

/* ═══ FASE 19 · lo que se prueba aquí ═══════════════════════════════════════ */
const VZ = lib('creator/vocesDeDialogo.js');
const rendersPuerta = lib('creator/renders.js');
const { TOCADOS_POR_EL_MOTOR, DINERO } = await import('./motor-filmmaker-alcance.mjs');
/** El último commit antes de esta fase. */
const ANTES = '81b62b1';
const HASTA = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 19 "').trim();
const tramo = HASTA ? `${ANTES} ${HASTA}` : ANTES;

const planPorLaPuerta = (uid, datos) => intento(() => rendersPuerta.renders.run({ auth: { uid }, data: { op: 'voice.plan', ...datos } }));
const abrirVoces = (d) => base.docs.set('aiSettings/voces', d);
const cerrarVoces = () => base.docs.delete('aiSettings/voces');
/** Una producción con un personaje y tres líneas: diálogo y voz en off de Luna, y una narración. */
const conLineas = () => clon({
  ...M.produccionVacia({ title: 'El faro', aspectRatio: '16:9', resolution: '720p' }),
  intent: { objective: 'Un faro al amanecer' },
  characters: [{ id: 'char-luna', name: 'Luna', identityDescription: 'Farera de sesenta años' }, { id: 'char-mudo', name: 'El farero', identityDescription: 'No habla' }],
  scenes: [{
    id: 'sc-0001', order: 0, title: 'Amanecer', description: 'El sol sale detrás del faro', characterIds: ['char-luna'],
    dialogue: [{ id: 'ln-off', kind: 'voiceover', characterId: 'char-luna', text: 'Cada mañana subo los mismos escalones.', language: 'es-MX' }],
    shots: [
      { id: 'sh-0101', order: 0, durationSec: 4, description: 'Luna sube la escalera', dialogue: [{ id: 'ln-dice', kind: 'dialogue', characterId: 'char-luna', text: 'Buenos días, faro.', language: 'es' }] },
      { id: 'sh-0102', order: 1, durationSec: 4, description: 'La lámpara se enciende', dialogue: [{ id: 'ln-narra', kind: 'narration', text: 'And the light came back.', language: 'en' }] },
    ],
  }],
});
/* Un catálogo de mentira, SOLO para esta prueba: el de verdad está vacío. */
const CATALOGO = Object.freeze([
  { id: 'wv_calida', idiomas: ['es'], usos: ['dialogue', 'voiceover'] },
  { id: 'wv_narradora', idiomas: ['en', 'es'], usos: ['narration'] },
  { id: 'wv_solo_en', idiomas: ['en'], usos: ['dialogue', 'voiceover', 'narration'] },
]);

/* ═══ R · LO PURO ═════════════════════════════════════════════════════════ */
console.log('\n── R · Las líneas con voz y la comprobación de una asignación ──');
const requisitos = Rq.requisitosDeProduccion(conLineas());
const lineas = VZ.lineasConVoz(requisitos.ok ? requisitos.requirements.audio : []);
{
  check('R1) las líneas con voz son los requisitos `voice.tts` de F1-A: una por línea, con su clase, quién habla, su idioma y su largo',
    requisitos.ok && lineas.length === 3
    && JSON.stringify(lineas.map((l) => `${l.lineId}:${l.kind}:${l.speakerId ?? '-'}:${l.language ?? '-'}:${l.chars}`).sort())
      === JSON.stringify(['ln-dice:dialogue:char-luna:es:18', 'ln-narra:narration:-:en:24', 'ln-off:voiceover:char-luna:es-MX:38'].sort()),
    JSON.stringify(lineas));
  check('R2) lo que no es una línea con voz no cuenta: sonidos, otras capacidades, formas rotas',
    VZ.lineasConVoz([{ id: 'cue:horno', kind: 'sfx', capability: 'audio.sfx', input: {} }, { id: 'line:x', kind: 'dialogue', capability: 'image.generate', input: {} }, null, 'line:y', { id: 'line:z', kind: 'grito', capability: 'voice.tts', input: {} }]).length === 0);
  check('R3) la narración es del narrador; lo demás, de quien habla', VZ.vozDeQuien(lineas.find((l) => l.kind === 'narration')) === 'narrator' && VZ.vozDeQuien(lineas.find((l) => l.kind === 'dialogue')) === 'char-luna');
  const base0 = { puertaAbierta: true, catalogo: CATALOGO, lineas, personajes: ['char-luna', 'char-mudo'] };
  const c = (e) => VZ.comprobarAsignacion({ ...base0, ...e });
  const motivos = [
    c({ puertaAbierta: false, quien: 'char-luna', vozId: 'wv_calida' }), c({ catalogo: [], quien: 'char-luna', vozId: 'wv_calida' }),
    c({ quien: 'char-luna', vozId: 'Calida' }), c({ quien: 'char-luna', vozId: 'wv_nadie' }), c({ quien: 'char-otro', vozId: 'wv_calida' }),
    c({ quien: 'char-mudo', vozId: 'wv_calida' }), c({ quien: 'narrator', vozId: 'wv_calida' }), c({ quien: 'char-luna', vozId: 'wv_solo_en' }),
  ].map((r) => (r.ok ? 'ok' : r.motivo));
  check('R4) una asignación, motivo a motivo y en su orden: la puerta, el catálogo, la voz, quien habla, sus líneas, el uso y el idioma',
    JSON.stringify(motivos) === JSON.stringify(['gate_closed', 'catalog_empty', 'voice_invalid', 'voice_not_in_catalog', 'speaker_not_found', 'speaker_has_no_lines', 'use_not_supported', 'language_not_supported']),
    motivos.join(', '));
  check('R5) y vale cuando todo encaja: el idioma se compara por su raíz («es-MX» es «es»)', c({ quien: 'char-luna', vozId: 'wv_calida' }).ok === true && c({ quien: 'narrator', vozId: 'wv_narradora' }).ok === true);
  check('R6) el catálogo de verdad está VACÍO, congelado y en el código: la configuración no lo amplía',
    Array.isArray(VZ.CATALOGO_DE_VOCES) && VZ.CATALOGO_DE_VOCES.length === 0 && Object.isFrozen(VZ.CATALOGO_DE_VOCES)
    && /export const CATALOGO_DE_VOCES: readonly VozDelCatalogo\[\] = Object\.freeze\(\[\]\);/.test(leer('functions/src/creator/vocesDeDialogo.ts')));
  check('R7) una voz del catálogo es de Weë (`wv_…`): ni un proveedor ni su identificador caben', VZ.FORMA_DE_VOZ.test('wv_calida') && !VZ.FORMA_DE_VOZ.test('21m00Tcm4TlvDq8ikWAM') && !VZ.FORMA_DE_VOZ.test('elevenlabs:rachel'));
}

/* ═══ Q · LA PUERTA ═══════════════════════════════════════════════════════ */
console.log('\n── Q · La puerta de las voces, cerrada por defecto ──');
{
  const lee = async (d, cuenta = A) => { if (d === null) cerrarVoces(); else abrirVoces(d); const r = await VZ.leerPuertaDeVoces(base, cuenta); cerrarVoces(); return r; };
  check('Q1) sin documento, sin el sí, o con un sí que no es `true`: cerrada', !(await lee(null)) && !(await lee({ cuentas: [A] })) && !(await lee({ vocesDeDialogo: 'true', cuentas: [A] })));
  check('Q2) con el sí y sin cuentas, o con la lista vacía: cerrada', !(await lee({ vocesDeDialogo: true })) && !(await lee({ vocesDeDialogo: true, cuentas: [] })));
  check('Q3) con cuentas, solo para ellas; `todas`, hay que escribirlo', (await lee({ vocesDeDialogo: true, cuentas: [A] })) && !(await lee({ vocesDeDialogo: true, cuentas: [A] }, B)) && (await lee({ vocesDeDialogo: true, todas: true }, B)));
}

/* ═══ P · EL PLAN, POR LA PUERTA `renders` ════════════════════════════════ */
console.log('\n── P · El plan de voces de una producción guardada ──');
{
  const vista = await crear(A, 1, conLineas());
  await crear(A, 2, conFaro());
  const antes = JSON.stringify([...base.docs.entries()].filter(([p]) => !p.startsWith('aiSettings/')));
  const p1 = await planPorLaPuerta(A, { productionId: pid(1), revision: vista.revision });
  const plan1 = p1.ok ? p1.valor.voices : null;
  check('P1) tres líneas —un diálogo, una voz en off, una narración—, de Luna y del narrador, en español e inglés; ninguna con voz: la puerta, cerrada',
    !!plan1 && plan1.lines === 3 && JSON.stringify(plan1.byKind) === JSON.stringify({ dialogue: 1, voiceover: 1, narration: 1 })
    && JSON.stringify([...plan1.speakers].sort()) === JSON.stringify(['char-luna', 'narrator']) && JSON.stringify(plan1.languages) === JSON.stringify(['en', 'es'])
    && plan1.voiced === 0 && plan1.reason === 'gate_closed' && !('checks' in plan1), JSON.stringify(plan1 ?? codigo(p1)));
  abrirVoces({ vocesDeDialogo: true, cuentas: [A] });
  const p2 = await planPorLaPuerta(A, { productionId: pid(1), revision: vista.revision, assign: { 'char-luna': 'wv_calida', narrator: 'wv_narradora' } });
  check('P2) con la puerta abierta, tampoco: el catálogo está vacío —y cada asignación pedida lo dice, sin guardar nada—',
    p2.ok && p2.valor.voices.reason === 'catalog_empty' && p2.valor.voices.voiced === 0
    && JSON.stringify(p2.valor.voices.checks) === JSON.stringify([{ speaker: 'char-luna', ok: false, reason: 'catalog_empty' }, { speaker: 'narrator', ok: false, reason: 'catalog_empty' }]),
    JSON.stringify(p2.ok ? p2.valor.voices : codigo(p2)));
  const directo = await VZ.planDeVoces(base, { accountId: A }, { productionId: pid(1), revision: vista.revision, asignar: { 'char-luna': 'wv_solo_en', narrator: 'wv_solo_en', 'char-mudo': 'wv_calida' } }, { catalogo: CATALOGO });
  check('P3) con un catálogo de prueba y la puerta abierta: cada asignación se comprueba de verdad —una voz inglesa no sirve para las líneas en español de Luna y sí para la narración en inglés—, y aun así nada tiene voz: guardarla no existe todavía',
    directo.ok && directo.plan.reason === 'not_stored' && directo.plan.voiced === 0
    && JSON.stringify(directo.plan.checks) === JSON.stringify([{ speaker: 'char-luna', ok: false, reason: 'language_not_supported' }, { speaker: 'narrator', ok: true }, { speaker: 'char-mudo', ok: false, reason: 'speaker_has_no_lines' }]),
    JSON.stringify(directo.ok ? directo.plan.checks : directo));
  cerrarVoces();
  const sin = await planPorLaPuerta(A, { productionId: pid(2), revision: (await producciones.leerProduccion(A, pid(2), { db: base })).view.revision });
  check('P4) una producción sin líneas: «no_lines», y ni siquiera se mira la puerta', sin.ok && sin.valor.voices.lines === 0 && sin.valor.voices.reason === 'no_lines');
  const otra = await planPorLaPuerta(A, { productionId: pid(1), revision: vista.revision + 5 });
  const ajena = await planPorLaPuerta(B, { productionId: pid(1), revision: vista.revision });
  const sinRevision = await planPorLaPuerta(A, { productionId: pid(1) });
  check('P5) otra revisión, «production_changed»; lo ajeno, como lo que no existe; sin revisión, datos sin forma',
    otra.ok && otra.valor.refused?.reason === 'production_changed' && ajena.ok && ajena.valor.refused?.reason === 'production_not_found'
    && !sinRevision.ok && sinRevision.error?.code === 'invalid-argument', `${codigo(otra)} · ${codigo(ajena)} · ${codigo(sinRevision)}`);
  const muchas = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`char-${i}`, 'wv_calida']));
  const tope = await VZ.planDeVoces(base, { accountId: A }, { productionId: pid(1), revision: vista.revision, asignar: muchas });
  check('P6) las asignaciones pedidas tienen tope: 32 como mucho; y una que no es un objeto no cuenta',
    tope.ok && tope.plan.checks.length === 32
    && (await VZ.planDeVoces(base, { accountId: A }, { productionId: pid(1), revision: vista.revision, asignar: ['wv_calida'] })).plan?.checks === undefined);
  check('P7) mirar no escribe nada: ni la producción, ni un registro, ni un trabajo', antes === JSON.stringify([...base.docs.entries()].filter(([p]) => !p.startsWith('aiSettings/'))));
}

/* ═══ G · LAS GUARDAS ═════════════════════════════════════════════════════ */
console.log('\n── G · Ni un proveedor, ni Credits, ni una escritura ──');
{
  const MOD = sinComentarios(leer('functions/src/creator/vocesDeDialogo.ts'));
  const importa = [...MOD.matchAll(/from '([^']+)'/g)].map((m) => m[1]).sort();
  check('G1) el módulo lee por la puerta de siempre —el requisito del servidor— y nada más: ni un proveedor, ni ElevenLabs, ni Credits, ni una escritura',
    JSON.stringify(importa) === JSON.stringify(['./requisitoDelServidor', 'firebase-admin/firestore'])
    && !/elevenlabs|voiceId|spendCredits|refundCredits|completeCredits|creditEngine|fetch\(|httpsCallable|\.set\(|\.update\(|\.create\(|\.delete\(/i.test(MOD), importa.join(', '));
  const delRequisito = git(`diff --numstat ${tramo} -- functions/src/creator/requisitoDelServidor.ts`).trim();
  check('G1b) y esa puerta solo GANA dos campos —el audio y quién sale—: ni una línea quitada',
    /^\d+\t0\t/.test(delRequisito) && /audio: r\.audio\.map\(\(a\) => JSON\.parse\(JSON\.stringify\(a\)\)\),/.test(leer('functions/src/creator/requisitoDelServidor.ts'))
    && /personajes: leida\.view\.production\.characters\.map\(\(c\) => c\.id\),/.test(leer('functions/src/creator/requisitoDelServidor.ts')), delRequisito);
  const numstat = git(`diff --numstat ${tramo} -- functions/src/creator/renders.ts`).trim();
  check('G2) la puerta `renders` solo GANA `voice.plan`: ni una línea quitada', /^\d+\t0\t/.test(numstat) && /if \(op === 'voice\.plan'\)/.test(leer('functions/src/creator/renders.ts')), numstat);
  check('G3) ni F1-A, ni productions, ni el Core, ni los proveedores, ni los Credits, ni una Function',
    git(`diff --name-only ${tramo} -- functions/src/filmmaker functions/src/productions functions/src/core functions/src/engine functions/src/credits functions/src/index.ts`).trim() === '');
  check('G4) el módulo nuevo, en la lista del motor; el dinero, nunca',
    TOCADOS_POR_EL_MOTOR.includes('functions/src/creator/vocesDeDialogo.ts') && !TOCADOS_POR_EL_MOTOR.some((f) => DINERO.some((r) => r.test(f))));
  check('G5) documentado', /### Fase 19 · /.test(leer('docs/FILMMAKER.md')));
  check('G6) esta suite está en la cadena de `npm test`', /filmmaker-voces\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 19 · las voces del diálogo (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
