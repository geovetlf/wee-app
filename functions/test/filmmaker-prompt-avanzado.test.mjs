/**
 * FILMMAKER ENGINE · FASE 13 (D9 DE F6) — EL PROMPT AVANZADO, USADO AL GENERAR.
 *
 *   A · el traductor: la toma SIN prompt avanzado, EXACTAMENTE la de antes
 *       (comparada con la versión anterior de `plano.ts`, compilada aquí mismo
 *       desde git); CON él, el texto de Weë de antes entero y, detrás, su bloque
 *       —una vez, en la última línea, limpio—; vacío, inválido, que no cabe;
 *       las validaciones de siempre, antes y en su orden; determinismo;
 *   V · las producciones antiguas y sus revisiones, también las restauradas;
 *   B · por la puerta del vídeo: el mismo precio, lo que sale hacia el proveedor,
 *       la plantilla en la reserva, ni Credits ni trabajos de más, y el que no
 *       cabe sin reservar ni gastar cupo;
 *   C · la app: la frase del rechazo nuevo, en los once idiomas;
 *   G · las guardas: F1-A, el dinero, el Job Engine y el motor de IA, sin tocar;
 *       ni una ruta de IA ni una puerta nueva.
 *
 * De verdad: la puerta `generateVideo`, el traductor del plano, productions (con
 * restaurar), F1-A, el Credit Engine, el limitador y el cuerpo que armaría el
 * adaptador de Seedance, sobre un Firestore en memoria (el arnés de
 * `f1d-postcanary.test.mjs`, copiado tal cual). De mentira: lo que ModelArk
 * contesta. Nada sale a la red, y no se usa ninguna credencial.
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

/* ═══ FASE 13 · lo que se prueba aquí ═══════════════════════════════════════ */
const os = require('node:os');
const ts = require('typescript');
const MSJ_ORIGEN = 'utils/mensajesDeFilmmaker.ts';
/** El último commit antes de esta fase: lo que no se toca se compara con él. */
const ANTES = '3e997b8';
/** El commit de esta fase, cuando ya existe: lo que la fase tocó se mide en SU tramo, y las siguientes no lo mueven. */
const HASTA = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 13 "').trim();
const tocadoEnLaFase = (rutas) => git(`diff --name-only ${ANTES} ${HASTA} -- ${rutas}`).trim();

/* La versión ANTERIOR del traductor, compilada aquí mismo desde git: lo que no lleva prompt avanzado tiene que salir igual. */
const archivoAntes = path.join(os.tmpdir(), `plano-antes-${process.pid}.cjs`);
fs.writeFileSync(archivoAntes, ts.transpileModule(git(`show ${ANTES}:functions/src/creator/plano.ts`), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText.replace(/require\("\.\.\/core"\)/g, `require(${JSON.stringify(path.resolve(RAIZ, 'functions/lib/core/index.js'))})`));
const planoAntes = require(archivoAntes);
/** El texto de Weë tal como lo componía la plantilla `fm-plano-1` antes de esta fase: la vara con la que se mide. */
const deWeeAntes = (raw) => planoAntes.componerPromptDePlano(planoAntes.leerRequisitoDePlano(raw));

/* Producciones de verdad para sacar requisitos de verdad (F1-A). */
const conFichas = () => clon({
  ...M.produccionVacia({ title: 'El faro', aspectRatio: '16:9', resolution: '720p' }),
  intent: { objective: 'Un faro al amanecer' },
  characters: [{ id: 'char-luna', name: 'Luna', identityDescription: 'Farera de sesenta años, pelo gris recogido' }],
  locations: [{ id: 'loc-faro', name: 'El faro', description: 'Un faro blanco sobre un acantilado' }],
  objects: [{ id: 'obj-farol', name: 'El farol', kind: 'prop', description: 'Un farol de latón' }],
  scenes: [{
    id: 'sc-0001', order: 0, title: 'Amanecer', description: 'El sol sale detrás del faro', locationId: 'loc-faro', characterIds: ['char-luna'], objectIds: ['obj-farol'], weather: 'rain',
    shots: [{ id: 'sh-0101', order: 0, durationSec: 4, description: 'Luna sube la escalera con el farol' }, { id: 'sh-0102', order: 1, durationSec: 6, description: 'La lámpara se enciende; mira https://ejemplo.invalid/x' }],
  }],
});
const conLarga = () => { const p = conFaro(); p.scenes[0].shots[0].description = `${'Una farera sube la escalera. '.repeat(70)}`.slice(0, 1990); return p; };
const requisitosDe = (prod) => { const r = Rq.requisitosDeProduccion(prod); if (!r.ok) throw new Error('producción de prueba no válida'); return r.requirements.shots; };
const conAvanzado = (texto, prod = conFaro()) => { prod.scenes[0].shots[0].advanced = { prompt: texto }; return prod; };
const TEXTO = 'Cámara en mano, grano de 16 mm y luz de amanecer muy cálida --rs 1080p --dur 15 --seed 7 --cf true https://ejemplo.invalid/ref';
const ETIQUETA = 'Additional direction: ';
const leido = (raw) => plano.leerRequisitoDePlano(raw);
const conEntrada = (raw, cambios) => ({ ...raw, input: { ...raw.input, ...cambios } });
/** Cuántas líneas del texto empiezan con la etiqueta del bloque. */
const bloques = (texto) => texto.split('\n').filter((l) => l.startsWith(ETIQUETA)).length;

/* ═══ A · EL TRADUCTOR ═══════════════════════════════════════════════════ */
console.log('\n── A · El traductor: el texto de Weë intacto y, detrás, el bloque del prompt avanzado ──');
const rawCon = requisitosDe(conAvanzado(TEXTO))[0];
/*
 * Un requisito con TODAS las secciones de `fm-plano-1` —acción, sujeto, personajes, objetos, lugar, escena, look,
 * cámara y continuidad—: que ninguna se pueda cambiar sin que se vea.
 */
const completo = (() => {
  const x = clon(requisitosDe(conFichas())[0]);
  x.input.actions = ['Luna sube despacio', 'Levanta el farol hacia el mar'];
  x.input.subject = { focus: 'close_up', description: 'La mano de Luna', characterId: 'char-luna' };
  x.input.look = {
    visualStyle: 'cinematográfico', mood: 'sereno', tone: 'cálido', pacing: 'slow', sceneStyle: 'natural', sceneMood: 'tranquilo',
    shotStyle: 'íntimo', shotMood: 'esperanza', color: { grading: 'teal and orange', palette: ['#112233', '#AABBCC'] },
  };
  x.input.creative = {
    version: 1, shot: { type: 'close_up' }, camera: { type: 'handheld', perspective: 'eye_level' }, lens: { type: 'wide', focalLengthMm: 24 },
    movement: { type: 'dolly_in', speed: 'slow' }, motion: { smoothness: 'smooth' }, lighting: { type: 'golden_hour' }, composition: { type: 'rule_of_thirds' },
  };
  x.input.narrativePurpose = 'establishing';
  x.input.environment = { timeOfDay: 'dawn', weather: 'fog' };
  x.continuity = { preserve: ['character.face', 'location.layout'], strength: 'strict' };
  return x;
})();
const SECCIONES = ['Action:', 'Subject:', 'Characters:', 'Objects:', 'Location:', 'Scene:', 'Look:', 'Camera:', 'Continuity:'];
{
  const sinAvanzado = [...[conFaro(), conFichas(), conLarga()].flatMap(requisitosDe), completo];
  const distintos = sinAvanzado.filter((raw) => {
    const nuevo = leido(raw);
    return deWeeAntes(raw) !== plano.componerPromptDePlano(nuevo)
      || JSON.stringify(planoAntes.evaluarPlano(planoAntes.leerRequisitoDePlano(raw), 'standard')) !== JSON.stringify(plano.evaluarPlano(nuevo, 'standard'))
      || plano.plantillaDePlano(nuevo) !== 'fm-plano-1';
  });
  check('A1) toma SIN prompt avanzado: el texto, la evaluación y la plantilla son EXACTAMENTE los de antes (la versión anterior, compilada desde git), con TODAS las secciones de la plantilla',
    sinAvanzado.length === 7 && distintos.length === 0 && SECCIONES.every((e) => deWeeAntes(completo).includes(e)),
    `${sinAvanzado.length} requisitos, ${distintos.length} distintos, faltan ${SECCIONES.filter((e) => !deWeeAntes(completo).includes(e)).join(' ')}`);
  const completoCon = leido(conEntrada(completo, { advancedPrompt: TEXTO }));
  check('A1b) y con TODAS las secciones y prompt avanzado: las secciones de Weë, las de antes y en su orden; el bloque, detrás',
    plano.componerPromptDePlano(completoCon) === `${deWeeAntes(completo)}\n${plano.bloqueDelPromptAvanzado(completoCon)}` && plano.evaluarPlano(completoCon, 'standard').ok);

  const r = leido(rawCon);
  const texto = plano.componerPromptDePlano(r);
  const deWee = deWeeAntes(rawCon);
  check('A2) toma CON prompt avanzado: el texto de Weë de antes, ENTERO y sin tocar, y detrás —en la última línea— su bloque; plantilla `fm-plano-2`',
    texto === `${deWee}\n${plano.bloqueDelPromptAvanzado(r)}` && texto.startsWith(`${deWee}\n${ETIQUETA}`) && texto.split('\n').at(-1).startsWith(ETIQUETA)
    && plano.componerTextoDeWee(r) === deWee && plano.plantillaDePlano(r) === 'fm-plano-2' && plano.evaluarPlano(r, 'standard').ok, texto);
  check('A3) se AÑADE y no sustituye: el bloque aparece UNA vez, y el texto de Weë no pierde ni una sección',
    bloques(texto) === 1 && deWee.split('\n').every((linea) => texto.split('\n').includes(linea)) && texto.length === deWee.length + 1 + plano.bloqueDelPromptAvanzado(r).length);
  const bloque = texto.split('\n').at(-1);
  check('A4) el bloque va limpio: sin órdenes de proveedor (`--rs`, `--dur`, `--seed`, `--cf`) ni enlaces; las palabras se quedan',
    !/(^|\s)--\S/.test(bloque) && !/https?:\/\//.test(bloque) && bloque.includes('rs 1080p dur 15 seed 7 cf true') && bloque.startsWith(`${ETIQUETA}Cámara en mano, grano de 16 mm`), bloque);
  const conSaltos = leido(conEntrada(rawCon, { advancedPrompt: 'Primera idea.\nSegunda idea;\n\n   tercera.' }));
  const tSaltos = plano.componerPromptDePlano(conSaltos);
  check('A5) y es UNA línea: los saltos del texto de la persona se juntan, para que el bloque sea la última línea y nada más',
    tSaltos.split('\n').at(-1) === `${ETIQUETA}Primera idea. Segunda idea; tercera.` && bloques(tSaltos) === 1, tSaltos.split('\n').at(-1));
  check('A6) las órdenes de proveedor, fuera; el resto del texto, tal cual (un guion dentro de una palabra o un guion largo no se tocan)',
    plano.sinOrdenesDeProveedor('plano a--b — con pausa --rs 480p') === 'plano a--b — con pausa rs 480p' && plano.sinOrdenesDeProveedor('--dur 4') === 'dur 4');

  const sitio = plano.sitioParaElPromptAvanzado(r);
  const justo = leido(conEntrada(rawCon, { advancedPrompt: 'a'.repeat(sitio) }));
  const tJusto = plano.componerPromptDePlano(justo);
  const unoMas = leido(conEntrada(rawCon, { advancedPrompt: 'a'.repeat(sitio + 1) }));
  const eUnoMas = plano.evaluarPlano(unoMas, 'standard');
  check('A7) cabe lo que queda del tope detrás del texto de Weë: justo eso entra ENTERO (3000 en total); uno más se rechaza con cuánto mide y cuánto cabe, sin recortar',
    sitio === plano.MAX_PROMPT_DE_PLANO - deWee.length - 1 - ETIQUETA.length && plano.evaluarPlano(justo, 'standard').ok && tJusto.length === plano.MAX_PROMPT_DE_PLANO
    && tJusto.endsWith('a'.repeat(sitio)) && !eUnoMas.ok && eUnoMas.motivo === 'advanced_prompt_too_long' && eUnoMas.detalle.chars === sitio + 1 && eUnoMas.detalle.maxChars === sitio,
    `sitio ${sitio} · ${tJusto.length} · ${JSON.stringify(eUnoMas)}`);

  const vacios = ['', '   ', '\n\t'].map((v) => leido(conEntrada(rawCon, { advancedPrompt: v })));
  check('A8) prompt avanzado VACÍO (o en blanco): como no tener —ni rechazo, ni bloque, plantilla de siempre, el texto de antes—',
    vacios.every((v) => plano.evaluarPlano(v, 'standard').ok && plano.componerPromptDePlano(v) === deWee && plano.plantillaDePlano(v) === 'fm-plano-1'));
  const noTexto = leido(conEntrada(rawCon, { advancedPrompt: 42 }));
  const soloEnlace = leido(conEntrada(rawCon, { advancedPrompt: 'https://ejemplo.invalid/solo' }));
  const enorme = leido(conEntrada(rawCon, { advancedPrompt: 'x'.repeat(4001) }));
  const eEnorme = plano.evaluarPlano(enorme, 'standard');
  check('A9) prompt avanzado INVÁLIDO: lo que no es texto se ignora, lo que al limpiarlo se queda en nada es nada, y lo que pasa de lo que guarda F1-A (4000) se rechaza',
    plano.componerPromptDePlano(noTexto) === deWee && plano.plantillaDePlano(noTexto) === 'fm-plano-1'
    && plano.componerPromptDePlano(soloEnlace) === deWee && plano.plantillaDePlano(soloEnlace) === 'fm-plano-1' && plano.evaluarPlano(soloEnlace, 'standard').ok
    && !eEnorme.ok && eEnorme.motivo === 'advanced_prompt_too_long' && eEnorme.detalle.chars === 4001, JSON.stringify(eEnorme));

  const reglas = [
    ['referencias', { references: [{ referenceId: 'r' }] }, 'references_not_supported'],
    ['diálogo', { dialogue: [{ id: 'l1' }] }, 'dialogue_not_supported'],
    ['sin descripción', { description: undefined, sceneDescription: undefined, actions: [] }, 'description_missing'],
  ];
  const conMucho = { advancedPrompt: 'x'.repeat(3900) };
  const saltadas = reglas.filter(([, cambios, motivo]) => plano.evaluarPlano(leido(conEntrada(rawCon, { ...cambios, ...conMucho })), 'standard').motivo !== motivo).map(([n]) => n);
  const demasiadoLargo = plano.evaluarPlano(leido({ ...conEntrada(rawCon, conMucho), durationSec: 20 }), 'standard');
  const sinCalidad = plano.evaluarPlano(leido(conEntrada(rawCon, conMucho)), undefined);
  check('A10) las validaciones de siempre van ANTES y en el mismo orden: con un prompt avanzado que tampoco cabe, manda la regla de antes',
    saltadas.length === 0 && demasiadoLargo.motivo === 'duration_too_long' && sinCalidad.motivo === 'quality_required', saltadas.join(', '));

  const desordenado = Object.fromEntries(Object.entries(rawCon).reverse());
  desordenado.input = Object.fromEntries(Object.entries(rawCon.input).reverse());
  const veces = Array.from({ length: 20 }, () => plano.componerPromptDePlano(leido(rawCon)));
  check('A11) determinista: la misma toma da el MISMO texto veinte veces, y también con las claves en otro orden',
    veces.every((v) => v === texto) && plano.componerPromptDePlano(leido(desordenado)) === texto && plano.plantillaDePlano(leido(desordenado)) === 'fm-plano-2');
  const porLargo = Array.from({ length: 10 }, (_, i) => [i + 1, plano.componerPromptDePlano(leido(conEntrada(rawCon, { advancedPrompt: 'y'.repeat(i + 1) })))]);
  const fuera = porLargo.filter(([k, t]) => t !== `${deWee}\n${ETIQUETA}${'y'.repeat(k)}`).map(([k]) => k);
  check('A11b) la posición no depende del texto: con diez prompts avanzados de largos distintos, el bloque es SIEMPRE la última línea, detrás del texto de Weë',
    fuera.length === 0, fuera.join(','));
  const conLaEtiqueta = leido(conEntrada(rawCon, { advancedPrompt: `${ETIQUETA}otra vez` }));
  check('A12) aunque la persona escriba la etiqueta, el bloque es UNO y es la última línea',
    bloques(plano.componerPromptDePlano(conLaEtiqueta)) === 1 && plano.componerPromptDePlano(conLaEtiqueta).startsWith(`${deWee}\n${ETIQUETA}`));
  const todas = [rawCon, ...vacios.map(() => rawCon), conEntrada(rawCon, { advancedPrompt: 'x'.repeat(3900) })].map((x) => plano.evaluarPlano(leido(x), 'standard'));
  check('A13) `advanced_prompt_blocked` desaparece: la versión anterior lo decía de esta toma, la de ahora no lo dice de ninguna',
    planoAntes.evaluarPlano(planoAntes.leerRequisitoDePlano(rawCon), 'standard').motivo === 'advanced_prompt_blocked' && todas.every((e) => e.motivo !== 'advanced_prompt_blocked'));
}

/* ═══ V · LAS REVISIONES ═════════════════════════════════════════════════ */
console.log('\n── V · Las producciones antiguas y sus revisiones ──');
{
  /* Nace con prompt avanzado; un lote cambia otra cosa; y se restaura la revisión 0 (Fase 12). */
  await crear(E, 20, conAvanzado(TEXTO));
  const lote = await producciones.aplicarOperacionesGuardadas({
    accountId: E, productionId: pid(20), expectedRevision: 0, operations: [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'fog' }], operationId: 'op-f13-niebla-0001', at: HOY,
  }, { db: base });
  const vuelta = await producciones.restaurarRevision({ accountId: E, productionId: pid(20), expectedRevision: 1, revision: 0, at: HOY }, { db: base });
  const registro = (await producciones.leerRegistro(E, pid(20), { db: base })).entries;
  const deLaRevision = (k) => requisitosDe(producciones.reconstruirRevision(registro, k).production)[0];
  const [r0, r1, r2] = [0, 1, 2].map((k) => deLaRevision(k));
  const t = (raw) => plano.componerPromptDePlano(leido(raw));
  check('V1) cada revisión compone con su contenido: el bloque sigue ahí tras un lote que cambia otra cosa, y la restaurada da el MISMO texto que la original',
    lote.ok && vuelta.ok && t(r0).startsWith(`${deWeeAntes(r0)}\n${ETIQUETA}`) && t(r1).startsWith(`${deWeeAntes(r1)}\n${ETIQUETA}`)
    && t(r1).includes('weather: fog') && t(r2) === t(r0) && [r0, r1, r2].every((raw) => plano.plantillaDePlano(leido(raw)) === 'fm-plano-2'),
    `${codigo(lote)} ${codigo(vuelta)}`);
  /* Una producción de antes, sin prompt avanzado, en todas sus revisiones: la plantilla de siempre y el texto de siempre. */
  await crear(E, 21, conFaro());
  await producciones.aplicarOperacionesGuardadas({
    accountId: E, productionId: pid(21), expectedRevision: 0, operations: [{ op: 'rename_production', title: 'El faro de noche' }], operationId: 'op-f13-titulo-0001', at: HOY,
  }, { db: base });
  await producciones.restaurarRevision({ accountId: E, productionId: pid(21), expectedRevision: 1, revision: 0, at: HOY }, { db: base });
  const reg21 = (await producciones.leerRegistro(E, pid(21), { db: base })).entries;
  const antiguas = [0, 1, 2].flatMap((k) => requisitosDe(producciones.reconstruirRevision(reg21, k).production));
  check('V2) una producción antigua, sin prompt avanzado, en cada revisión —también la restaurada—: `fm-plano-1` y el texto de antes',
    reg21.length === 3 && antiguas.every((raw) => plano.plantillaDePlano(leido(raw)) === 'fm-plano-1' && plano.componerPromptDePlano(leido(raw)) === deWeeAntes(raw)));
}

/* ═══ B · POR LA PUERTA DEL VÍDEO ════════════════════════════════════════ */
console.log('\n── B · Por la puerta del vídeo: el mismo precio, el texto de Weë + el bloque, y el que no cabe ──');
{
  await crear(A, 1, conAvanzado(TEXTO));
  await crear(A, 2, conFaro());
  const antes1 = posts.length;
  const trabajosAntes = base.de('jobs').length;
  const asientosAntes = base.de('creditTransactions').length;
  const con = await pedir(A, 1, 'sh-0101');
  const postCon = posts[antes1];
  const trabajosCon = base.de('jobs').length - trabajosAntes;
  const asientosCon = base.de('creditTransactions').length - asientosAntes;
  const antes2 = posts.length;
  const sin = await pedir(A, 2, 'sh-0101');
  const postSin = posts[antes2];
  check('B1) con prompt avanzado se cotiza y se pide al MISMO precio que sin él',
    con.q.ok && con.q.valor.allowed === true && sin.q.valor.allowed === true && con.credits === sin.credits && con.g?.ok && sin.g?.ok, `${con.credits} vs ${sin.credits} · ${codigo(con.g)}`);
  check('B2) lo que sale hacia el proveedor es el texto de Weë de la toma normal, ENTERO, y detrás el bloque —una vez, en la última línea, limpio—',
    typeof postCon?.input?.prompt === 'string' && postCon.input.prompt.startsWith(`${postSin.input.prompt}\n${ETIQUETA}`) && bloques(postCon.input.prompt) === 1
    && !/(^|\s)--\S/.test(postCon.input.prompt) && !/https?:\/\//.test(postCon.input.prompt), postCon?.input?.prompt);
  const cuerpoCon = await buildSeedanceBody({ capability: 'video.generate', input: postCon.input, model: { id: postCon.modelo }, prefs: {} });
  const cuerpoSin = await buildSeedanceBody({ capability: 'video.generate', input: postSin.input, model: { id: postSin.modelo }, prefs: {} });
  check('B3) y el cuerpo que armaría el adaptador pide lo MISMO: modelo, resolución, duración y proporción; solo cambia el texto, que entra entero',
    cuerpoCon.body.model === cuerpoSin.body.model && cuerpoCon.body.resolution === cuerpoSin.body.resolution && cuerpoCon.body.duration === cuerpoSin.body.duration
    && cuerpoCon.body.ratio === cuerpoSin.body.ratio && cuerpoCon.body.content[0].text === postCon.input.prompt,
    `${cuerpoCon.body.resolution}/${cuerpoCon.body.duration} vs ${cuerpoSin.body.resolution}/${cuerpoSin.body.duration}`);
  check('B4) la reserva de cada toma dice con qué plantilla se compuso su texto',
    uso(con.rid)?.meta?.filmmaker?.plantilla === 'fm-plano-2' && uso(sin.rid)?.meta?.filmmaker?.plantilla === 'fm-plano-1',
    `${uso(con.rid)?.meta?.filmmaker?.plantilla} / ${uso(sin.rid)?.meta?.filmmaker?.plantilla}`);
  check('B5) ni Credits, ni trabajos, ni pagos de más: la toma con prompt avanzado es UNA toma —una reserva, un trabajo—, como cualquier otra',
    asientosCon === 1 && trabajosCon === 1 && base.de('creditTransactions').filter((x) => x.requestId === con.rid).length === 1, `${asientosCon} asientos, ${trabajosCon} trabajos`);

  await crear(A, 3, conAvanzado('x'.repeat(3500)));
  const cupoAntes = cupoDeVideo(A);
  const saldoAntes = saldo(A);
  const postsAntes = posts.length;
  const pl = await plan(A, 3, 'sh-0101');
  const q = await cotizar(A, pl);
  const g = await generar(A, { ...pl, take: 1 }, con.credits);
  const rid3 = toma.requestIdDeToma(A, pid(3), 'sh-0101', 1);
  check('B6) el que no cabe: al cotizar se dice por qué y con sus números —cuánto mide y cuánto cabe detrás del texto de Weë—',
    q.ok && q.valor.allowed === false && q.valor.reason === 'advanced_prompt_too_long' && q.valor.detail?.chars === 3500 && q.valor.detail?.maxChars > 0 && q.valor.detail.maxChars < 3500,
    JSON.stringify(q.valor ?? codigo(q)));
  check('B7) y pedirlo igual no reserva, no gasta cupo ni saldo, y no sale hacia el proveedor',
    !g.ok && motivo(g) === 'advanced_prompt_too_long' && !uso(rid3) && cupoDeVideo(A) === cupoAntes && saldo(A) === saldoAntes && posts.length === postsAntes, codigo(g));
}

/* ═══ C · LA APP ═════════════════════════════════════════════════════════ */
console.log('\n── C · La app: la frase del rechazo nuevo ──');
{
  const tabla = leer(MSJ_ORIGEN);
  check('C1) la app traduce el motivo nuevo con su clave y le pasa sus dos números',
    /advanced_prompt_too_long: 'filmmaker\.takeReasonAdvancedTooLong'/.test(tabla)
    && /case 'advanced_prompt_too_long':\s*return t\(clave, \{ caracteres: formato\.numero\(Number\(d\.chars\)\), maximo: formato\.numero\(Number\(d\.maxChars\)\) \}\);/.test(tabla));
  const IDIOMAS = ['es', 'en', 'de', 'fr', 'it', 'pt', 'pt-PT', 'ru', 'ko', 'zh', 'zh-TW'];
  const sinFrase = IDIOMAS.filter((l) => {
    const m = /^ {2}takeReasonAdvancedTooLong: '([^']*)',$/m.exec(leer(`i18n/textos/${l}/filmmaker.ts`));
    return !m || !m[1].includes('{{caracteres}}') || !m[1].includes('{{maximo}}');
  });
  check('C2) su frase está en los once diccionarios, con los dos números', sinFrase.length === 0, sinFrase.join(', '));
  check('C3) en portugués, la de Brasil («você»: «encurte») y, aparte, la europea («encurta-o»)',
    /takeReasonAdvancedTooLong: '[^']*encurte o texto/.test(leer('i18n/textos/pt/filmmaker.ts')) && /takeReasonAdvancedTooLong: '[^']*encurta-o/.test(leer('i18n/textos/pt-PT/filmmaker.ts')));
}

/* ═══ G · LAS GUARDAS ════════════════════════════════════════════════════ */
console.log('\n── G · Lo que el prompt avanzado no toca ──');
{
  const src = sinComentarios(leer('functions/src/creator/plano.ts'));
  check('G1) F1-A, el Credit Engine, el Core, el motor de IA, el Job Engine y el runtime, sin tocar en esta fase',
    tocadoEnLaFase('functions/src/filmmaker functions/src/credits functions/src/core functions/src/engine functions/src/job functions/src/runtime functions/src/payments') === '');
  check('G2) el traductor sigue siendo puro: una sola importación, la de siempre, y ni una llamada',
    [...src.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]).join(',') === '../core' && !/getFirestore|fetch\(|require\(|http/.test(src.replace(/https\?:/g, '')));
  check('G3) ni una segunda ruta de IA ni una puerta nueva: las mismas Functions, el mismo compositor y la misma llamada',
    tocadoEnLaFase('functions/src/index.ts') === '' && (sinComentarios(leer('functions/src/creator/video.ts')).match(/componerPromptDePlano\(/g) || []).length === 1
    && !/brainChat|creatorChat|onCall\(|onRequest\(/.test(src));
  check('G4) la plantilla de siempre sigue siendo `fm-plano-1`; la nueva, `fm-plano-2`, solo la lleva la toma con prompt avanzado',
    plano.PLANTILLA_DE_PLANO === 'fm-plano-1' && plano.PLANTILLA_DE_PLANO_CON_INDICACIONES === 'fm-plano-2'
    && /plantilla: plantillaDePlano\(deToma\.requisito\)/.test(sinComentarios(leer('functions/src/creator/video.ts'))));
  check('G5) documentado', /### Fase 13 · /.test(leer('docs/FILMMAKER.md')) && /\| D9 \| [^\n]*usarlo al generar, decidido en la Fase 13/.test(leer('docs/FILMMAKER.md')));
  check('G6) esta suite está en la cadena de `npm test`', /filmmaker-prompt-avanzado\.test\.mjs/.test(leer('functions/package.json')));
}

fs.rmSync(archivoAntes, { force: true });
console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 13 · el prompt avanzado, usado (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
