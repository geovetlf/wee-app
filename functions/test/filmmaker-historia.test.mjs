/**
 * FILMMAKER ENGINE · FASE 24 — LA HISTORIA: EL GUION EDITABLE, LA CONTINUIDAD POR NIVELES Y LAS TOMAS DE CADA PLANO.
 *
 *   C · la continuidad: qué sigue igual —en la producción, en una escena o en un plano— y con cuánta fuerza, con las
 *       reglas del Core (conservar al menos una cosa; no pedir a la vez conservar y dejar cambiar lo mismo) y lo
 *       heredado dicho como heredado; y eso es lo que viaja a la toma;
 *   G · el guion: para qué sirve cada escena, y sus líneas —qué dicen, cómo y quién—, con las operaciones de F1-A de
 *       siempre; y la verdad sobre generar: una línea a cámara impide hoy generar su plano (F1-D);
 *   T · las tomas de cada plano: cuántas, en qué están, lo cobrado y lo devuelto, cuál está en el plano y su vídeo;
 *       volver a una anterior no se puede (el servidor pone siempre la más nueva) y se dice;
 *   V · dónde está cada cosa: la hoja del guion, «Historia» en el teléfono, la continuidad en las propiedades del
 *       plano y en «Dirección», y las tomas debajo de la toma en los tres sitios donde se genera;
 *   X · las guardas: nada del servidor, ni F1-A; ni campos sueltos, ni temporizadores; los once idiomas.
 *
 * Cada gesto se APLICA con F1-A de verdad sobre una producción viva (X4: F1-A aceptó todo lo que se pulsó). El código
 * de la app, con dobles de React Native y de Firebase y el traductor con el español de verdad; el arnés, el de
 * `f1d-postcanary.test.mjs`, copiado tal cual.
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

/* ═══ FASE 24 · lo que se prueba aquí ═══════════════════════════════════════ */
const Ops = lib('filmmaker/operaciones.js');
const R = lib('filmmaker/requisitos.js');
const P = lib('creator/plano.js');
const Core = lib('core/continuity.js');
/** El último commit antes de esta fase. */
const ANTES = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 23 "').trim();
const HASTA = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 24 "').trim();
const tramo = HASTA ? `${ANTES} ${HASTA}` : ANTES;
/** Cada pregunta que se hizo, y qué se contesta. */
const confirmaciones = [];
let respuestaDeConfirmar = true;
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
  botones.push({ etiqueta: accessibilityLabel, tocar: onPress, apagado: !!disabled, elegido: !!(accessibilityState?.selected || accessibilityState?.checked) });
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
  '../../../utils/notify': { notify: (...a) => avisos.push(a), confirmAction: async (...a) => { confirmaciones.push(a); return respuestaDeConfirmar; } },
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


/* ═══ Una producción VIVA: cada gesto se aplica con F1-A, y si F1-A no lo acepta, se dice ═══ */
let viva = null;
const aplicados = [];
const rechazos = [];
const vivir = (prod) => { viva = clon(prod); aplicados.length = 0; rechazos.length = 0; };
const gestoVivo = (ops) => {
  const r = Ops.aplicarOperaciones(viva, ops);
  if (!r.ok) { rechazos.push({ ops, problems: r.problems }); return { ok: false, problems: r.problems }; }
  viva = r.production;
  aplicados.push(ops);
  return { ok: true };
};
let serieDeIds = 0;
const idsDeFichas = { personaje: () => `ch_prueba_${++serieDeIds}`, lugar: () => `lc_prueba_${++serieDeIds}`, objeto: () => `ob_prueba_${++serieDeIds}` };
const espacioVivo = (extra = {}) => espacioCon({ produccion: viva, onGesto: gestoVivo, idsDeFichas, ...extra });
const campo = (d, etiqueta) => d.campos.find((c) => c.etiqueta === etiqueta);

const etq = (grupo, valor) => t('filmmaker.wsSettingIs', { ajuste: grupo, valor });
/** Dos reglas son la misma aunque sus claves vengan en otro orden. */
const ordenado = (x) => (Array.isArray(x) ? x.map(ordenado) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, ordenado(x[k])])) : x);
const mismo = (a, b) => JSON.stringify(ordenado(a)) === JSON.stringify(ordenado(b));
const enOrdenDelCore = (l) => [...l].sort((a, b) => Core.ASPECTOS_DE_CONTINUIDAD.indexOf(a) - Core.ASPECTOS_DE_CONTINUIDAD.indexOf(b));
/** Lo que F1-D diría hoy de generar esa unidad: 'ok' o su motivo. */
const motivoDe = (prod, unitId) => {
  const r = R.requisitosDeProduccion(prod);
  const s = r.ok ? r.requirements.shots.find((x) => x.unitId === unitId) : undefined;
  const rp = s ? P.leerRequisitoDePlano(s) : null;
  const e = rp ? P.evaluarPlano(rp, 'standard') : null;
  return e ? (e.ok ? 'ok' : e.motivo) : 'sin_requisito';
};

/* ═══ C · LA CONTINUIDAD ══════════════════════════════════════════════════ */
console.log('\n── C · La continuidad: tres niveles, manda el más cercano, con las reglas del Core ──');
{
  const CF = cargar('constants/filmmaker.ts');
  const Cont = cargar('components/studio/produccion/ProductionContinuidad.tsx').default;
  check('C1) los diez aspectos que se ofrecen y las tres fuerzas son los del Core, tal cual',
    CF.ASPECTOS_DE_CONTINUIDAD_VISIBLES.length === 10 && CF.ASPECTOS_DE_CONTINUIDAD_VISIBLES.every((a) => Core.ASPECTOS_DE_CONTINUIDAD.includes(a.aspecto))
    && JSON.stringify(CF.FUERZAS_VISIBLES.map((f) => f.fuerza)) === JSON.stringify([...Core.FUERZAS_DE_CONTINUIDAD]));
  const base = produccionUI();
  vivir({ ...base, scenes: [{ ...base.scenes[0], continuity: { preserve: ['outfit.complete'] } }] });
  recordar(true);
  const verCont = (sel, nivel) => dibujar(hc(Cont, { espacio: espacioVivo({ seleccion: sel }), ...(nivel ? { nivel } : {}) }));
  const EN_EL_PLANO = { tipo: 'plano', id: 'sh-0101' };
  const ropa = (d) => d.botones.find((b) => /^La ropa/.test(b.etiqueta ?? ''));
  const plano1 = () => viva.scenes[0].shots[0];
  const c0 = verCont(EN_EL_PLANO);
  check('C2) lo que llega de la escena se ve marcado y se dice heredado', !!ropa(c0)?.elegido && /heredado/.test(ropa(c0).etiqueta) && /viene de la escena o de la producción/.test(c0.texto));
  boton(c0, 'La cara').tocar();
  check('C3) marcar algo en el plano le da su propia regla, con change_continuity, y F1-A la acepta', mismo(plano1().continuity, { preserve: ['identity.face'] }) && rechazos.length === 0, JSON.stringify(plano1().continuity));
  ropa(verCont(EN_EL_PLANO)).tocar();
  check('C4) dejar que cambie aquí algo heredado lo dice con «puede cambiar» —el silencio no es permiso—',
    mismo(plano1().continuity, { preserve: ['identity.face'], mayChange: ['outfit.complete'] }) && rechazos.length === 0, JSON.stringify(plano1().continuity));
  const req = R.requisitosDeProduccion(viva);
  const delPlano = req.ok ? req.requirements.shots.find((s) => s.unitId === 'sh-0101') : undefined;
  check('C5) y eso es lo que viaja a la toma: la cara sí, la ropa no', !!delPlano?.continuity && delPlano.continuity.preserve.includes('identity.face') && !delPlano.continuity.preserve.includes('outfit.complete'), JSON.stringify(delPlano?.continuity));
  const antesC6 = aplicados.length;
  boton(verCont(EN_EL_PLANO), 'La cara').tocar();
  const c6 = verCont(EN_EL_PLANO);
  check('C6) apagar lo último que el plano conserva mientras deja cambiar otra cosa: el Core no lo admite; se dice y no se manda nada',
    aplicados.length === antesC6 && rechazos.length === 0 && /hay que conservar al menos otra cosa/.test(c6.texto));
  ropa(c6).tocar();
  check('C7) volver a marcarla la conserva otra vez aquí, y deja de estar en «puede cambiar»', mismo(plano1().continuity, { preserve: enOrdenDelCore(['identity.face', 'outfit.complete']) }), JSON.stringify(plano1().continuity));
  boton(verCont(EN_EL_PLANO), 'Usar lo de la escena').tocar();
  check('C8) «Usar lo de la escena» quita la regla del plano: vuelve a heredar', plano1().continuity === undefined && rechazos.length === 0);
  const c9 = verCont(EN_EL_PLANO);
  check('C9) sin regla propia, la fuerza se ve pero aquí no se cambia; y se dice por qué', boton(c9, 'Normal')?.elegido && boton(c9, 'Estricta')?.apagado && /elige primero qué conservar aquí/.test(c9.texto) && !boton(c9, 'Usar lo de la escena'));
  boton(c9, 'La cara').tocar();
  boton(verCont(EN_EL_PLANO), 'Estricta').tocar();
  check('C10) con regla propia, la fuerza se cambia y lo demás se queda', mismo(plano1().continuity, { preserve: ['identity.face'], strength: 'strict' }) && rechazos.length === 0, JSON.stringify(plano1().continuity));
  /* Una regla que ya trae anclajes y fuerza —de Weë Brain, por ejemplo—: tocar un aspecto no los pierde. */
  const conAnclajes = produccionUI();
  vivir({ ...conAnclajes, scenes: [{ ...conAnclajes.scenes[0], shots: [{ ...conAnclajes.scenes[0].shots[0], continuity: { preserve: ['identity.face'], anchors: ['char-luna'], strength: 'strict' } }, conAnclajes.scenes[0].shots[1]] }] });
  recordar(true);
  boton(verCont(EN_EL_PLANO), 'El lugar').tocar();
  check('C11) lo que la regla ya decía —sus anclajes, su fuerza— se queda', mismo(plano1().continuity, { preserve: enOrdenDelCore(['identity.face', 'environment.location']), anchors: ['char-luna'], strength: 'strict' }) && rechazos.length === 0, JSON.stringify(plano1().continuity));
  boton(verCont(EN_EL_PLANO), 'Flexible').tocar();
  check('C11b) y cambiar la fuerza tampoco pierde nada de lo demás', mismo(plano1().continuity, { preserve: enOrdenDelCore(['identity.face', 'environment.location']), anchors: ['char-luna'], strength: 'relaxed' }) && rechazos.length === 0, JSON.stringify(plano1().continuity));
  /* La escena hereda de la producción; la producción, de nadie. */
  vivir({ ...produccionUI(), continuity: { preserve: ['identity.face', 'camera.framing', 'narrative.logic'] } });
  recordar(true);
  const cE = verCont({ tipo: 'escena', id: 'sc-0001' });
  check('C12) en una escena se dice que es la escena, y lo de la producción llega heredado', /seguir igual en esta escena/.test(cE.texto) && /heredado/.test(boton(cE, 'La cara, heredado')?.etiqueta ?? '') && !!boton(cE, 'La cara, heredado')?.elegido);
  const cP = verCont(undefined, 'produccion');
  check('C13) en la producción entera: nada heredado, y lo que se conserva y no se ofrece aquí se cuenta, no se esconde', /seguir igual en toda la producción/.test(cP.texto) && !!boton(cP, 'La cara')?.elegido && /Y 2 cosas más que se conservan/.test(cP.texto));
  boton(cP, 'La luz').tocar();
  check('C14) y se respeta al cambiar lo demás', mismo(viva.continuity, { preserve: enOrdenDelCore(['identity.face', 'lighting.type', 'camera.framing', 'narrative.logic']) }) && rechazos.length === 0, JSON.stringify(viva.continuity));
  vivir({ ...produccionUI(), continuity: { preserve: ['identity.face'] } });
  recordar(true);
  boton(verCont(undefined, 'produccion'), 'La cara').tocar();
  check('C15) apagar lo último de la producción la deja sin continuidad (no hay nada arriba que heredar)', viva.continuity === undefined && rechazos.length === 0);
  const Brief = cargar('components/studio/produccion/ProductionBrief.tsx');
  const dir = dibujar(hc(Brief.ProductionDireccion, { espacio: espacioVivo() }));
  check('C16) y la de la producción se edita en «Dirección»', /seguir igual en toda la producción/.test(dir.texto) && /Continuidad/.test(dir.texto));
  recordar(false);
}

/* ═══ G · EL GUION ════════════════════════════════════════════════════════ */
console.log('\n── G · El guion: para qué sirve cada escena y sus líneas, editables, y la verdad sobre generar ──');
{
  const Guion = cargar('components/studio/produccion/ProductionGuion.tsx').default;
  vivir(produccionUI());
  recordar(true);
  let elegida = null;
  const verGuion = () => dibujar(hc(Guion, { espacio: espacioVivo({ onSeleccionar: (s) => { elegida = s; } }) }));
  const linea = () => viva.scenes[0].shots[0].dialogue?.[0];
  const g0 = verGuion();
  check('G1) cada escena con su título y sus líneas: quién, en qué plano y cómo se dice', /Amanecer/.test(g0.texto) && /Ya amanece\./.test(g0.texto) && /Luna · plano 1 · Diálogo/.test(g0.texto));
  check('G2) una línea a cámara avisa, ANTES de generar, de que hoy impide generar su plano —y F1-D dice lo mismo—',
    /no se puede generar todavía/.test(g0.texto) && motivoDe(viva, 'sh-0101') === 'dialogue_not_supported');
  boton(g0, etq('Para qué sirve en la historia', 'Clímax')).tocar();
  check('G3) para qué sirve la escena, con update_scene', viva.scenes[0].narrativePurpose === 'climax' && rechazos.length === 0);
  const g1 = verGuion();
  check('G4) lo elegido se ve elegido; tocarlo otra vez lo quita', !!boton(g1, etq('Para qué sirve en la historia', 'Clímax'))?.elegido
    && (boton(g1, etq('Para qué sirve en la historia', 'Clímax')).tocar(), viva.scenes[0].narrativePurpose === undefined));
  boton(verGuion(), 'Cambiar la línea de Luna').tocar();
  campo(verGuion(), 'Lo que se dice').onGuardar('  Ya amanece, por fin.  ');
  check('G5) corregir lo que dice, con change_dialogue', linea()?.text === 'Ya amanece, por fin.' && rechazos.length === 0);
  boton(verGuion(), etq('Cómo se dice', 'Voz en off')).tocar();
  const g6 = verGuion();
  check('G6) pasarla a voz en off la deja con quién la dice; el aviso se va, y F1-D ya no lo impide por eso',
    linea()?.kind === 'voiceover' && linea()?.characterId === 'char-luna' && !/no se puede generar todavía/.test(g6.texto) && motivoDe(viva, 'sh-0101') !== 'dialogue_not_supported');
  boton(g6, etq('Cómo se dice', 'Narrador')).tocar();
  check('G7) narrada no la dice nadie: se quita quién, como exige F1-A', linea()?.kind === 'narration' && linea()?.characterId === undefined && rechazos.length === 0);
  const g8 = verGuion();
  check('G8) de la narración a una voz no se pasa aquí —hace falta elegir quién—: apagado, y se dice dónde se hace',
    !!boton(g8, etq('Cómo se dice', 'Voz en off'))?.apagado && /añádela en «Texto» eligiendo quién/.test(g8.texto));
  boton(g8, 'Quitar la línea').tocar();
  check('G9) quitarla, con remove_dialogue', !(viva.scenes[0].shots[0].dialogue ?? []).length && rechazos.length === 0);
  vivir(produccionUI());
  recordar(true);
  boton(verGuion(), 'Ir al plano 1 de la escena 1').tocar();
  check('G10) ir al plano de una línea lo elige', elegida?.tipo === 'plano' && elegida.id === 'sh-0101');
  const Cons = cargar('constants/filmmaker.ts');
  check('G11) los propósitos son los nueve de F1-A, cada uno con su nombre; los tipos de línea, los tres', Object.keys(Cons.CLAVE_DEL_PROPOSITO).join() === M.PROPOSITOS_NARRATIVOS.join()
    && Cons.TIPOS_DE_LINEA.map((x) => x.kind).join() === M.TIPOS_DE_LINEA.join());
  recordar(false);
}

/* ═══ T · LAS TOMAS DE CADA PLANO ═════════════════════════════════════════ */
console.log('\n── T · Las tomas de cada plano: cuántas, en qué están, lo cobrado y lo devuelto, y su vídeo ──');
{
  const CT = cargar('utils/controladorDeToma.ts');
  check('T1) de lo que cuenta el servidor solo se enseña lo que se entiende',
    CT.tomaVista({ take: 2, requestId: 'r2', state: 'completed', link: 'linked', credits: { reserved: 10, charged: 10, refunded: 0 }, assetId: 'a2', revision: 4 })?.assetId === 'a2'
    && CT.tomaVista({ take: 1, requestId: 'r1', state: 'teleported', link: 'linked', credits: {} }) === null
    && CT.tomaVista({ take: 1, requestId: 'r1', state: 'failed', link: 'nowhere', credits: {} }) === null
    && CT.tomaVista({ take: 0, requestId: 'r0', state: 'failed', link: 'none', credits: {} }) === null
    && CT.tomaVista({ take: 3, requestId: 'r3', state: 'refunded', link: 'none', credits: { reserved: 5, charged: -1, refunded: 5 } })?.credits.charged === 0);
  const Tomas = cargar('components/studio/produccion/ProductionTomas.tsx').default;
  const urls = [];
  const historial = {
    carga: 'listas',
    tomas: [
      { take: 3, requestId: 'r3', state: 'processing', link: 'none', credits: { reserved: 12, charged: 0, refunded: 0 } },
      { take: 2, requestId: 'r2', state: 'completed', link: 'linked', credits: { reserved: 12, charged: 12, refunded: 0 }, assetId: 'asset_t2' },
      { take: 1, requestId: 'r1', state: 'refunded', link: 'none', credits: { reserved: 12, charged: 0, refunded: 12 } },
    ],
    urlDe: async (id) => { urls.push(id); return `https://ejemplo.test/${id}.mp4`; },
  };
  recordar(true);
  const t0 = dibujar(hc(Tomas, { historial, tipo: 'plano' }));
  check('T2) cerrado, dice cuántas tomas tiene el plano', !!boton(t0, '3 tomas de este plano') && !/Toma 3/.test(t0.texto));
  boton(t0, '3 tomas de este plano').tocar();
  const t1 = dibujar(hc(Tomas, { historial, tipo: 'plano' }));
  check('T3) abierto: cada toma con su número, en qué está, lo cobrado y lo devuelto, y cuál está en el plano',
    /Toma 3/.test(t1.texto) && /En proceso/.test(t1.texto) && /Lista · 12 Credits cobrados/.test(t1.texto) && /Devuelta · 12 Credits devueltos/.test(t1.texto) && /En el plano/.test(t1.texto));
  check('T4) y se dice la regla: el plano usa la última lista; las anteriores siguen en «Mis creaciones»', /El plano usa siempre su última toma lista/.test(t1.texto));
  check('T5) solo se ofrece ver las que tienen vídeo', !!boton(t1, 'Ver la toma 2') && !boton(t1, 'Ver la toma 3') && !boton(t1, 'Ver la toma 1'));
  boton(t1, 'Ver la toma 2').tocar();
  await calma();
  const t2 = dibujar(hc(Tomas, { historial, tipo: 'plano' }));
  check('T6) ver una toma la abre dentro de Weë, en su reproductor', urls[0] === 'asset_t2' && t2.hojas.some((h) => h.titulo === 'Toma 2'));
  recordar(false);
  const tErr = dibujar(hc(Tomas, { historial: { carga: 'error', tomas: [], urlDe: async () => null }, tipo: 'plano' }));
  const tVacio = dibujar(hc(Tomas, { historial: { carga: 'listas', tomas: [], urlDe: async () => null }, tipo: 'plano' }));
  check('T7) si no se pudieron leer, se dice; si no hay ninguna, no se pinta nada', /No se pudieron leer las tomas/.test(tErr.texto) && tVacio.texto.trim() === '');
  /* El hook: se pregunta al elegir la unidad y cuando la toma cambia de fase. */
  const mini = miniReact();
  const pedidas = [];
  let respuestaTomas = [{ take: 1, requestId: 'r1', state: 'completed', link: 'linked', credits: { reserved: 12, charged: 12, refunded: 0 }, assetId: 'asset_1' }];
  const cargarHook = crearCargador({ dobles: {
    ...dobles,
    react: { ...React, ...mini.react, useMemo: (fn) => fn() },
    '../services/tomaService': { tomaService: { tomasDeLaUnidad: async (u) => { pedidas.push(u); return respuestaTomas; }, urlDelMaterial: async () => null } },
  } });
  const HT = cargarHook('hooks/useTomasDelPlano.ts');
  const guardada = { productionId: 'prod_tomas_0000000000001', revision: 3, status: 'active', production: produccionUI() };
  const PLANO = { tipo: 'plano', id: 'sh-0101' };
  check('T8) la unidad de lo elegido: un plano; una escena con planos no lo es',
    JSON.stringify(HT.unidadDeLaSeleccion(guardada, { tipo: 'plano', id: 'sh-0102' })) === JSON.stringify({ productionId: guardada.productionId, sceneId: 'sc-0001', unitId: 'sh-0102' })
    && HT.unidadDeLaSeleccion(guardada, { tipo: 'escena', id: 'sc-0001' }) === null);
  mini.pasar(HT.useTomasDelPlano, guardada, PLANO, 'elige_calidad||');
  await calma();
  let h = mini.pasar(HT.useTomasDelPlano, guardada, PLANO, 'elige_calidad||');
  check('T9) se preguntan al elegir la unidad —una vez, con su producción, su escena y su plano— y se enseñan',
    pedidas.length === 1 && JSON.stringify(pedidas[0]) === JSON.stringify({ productionId: guardada.productionId, sceneId: 'sc-0001', unitId: 'sh-0101' }) && h?.carga === 'listas' && h.tomas[0].take === 1);
  respuestaTomas = [...respuestaTomas, { take: 2, requestId: 'r2', state: 'completed', link: 'linked', credits: { reserved: 12, charged: 12, refunded: 0 }, assetId: 'asset_2' }];
  mini.pasar(HT.useTomasDelPlano, guardada, PLANO, 'en_proceso|2||');
  await calma();
  h = mini.pasar(HT.useTomasDelPlano, guardada, PLANO, 'en_proceso|2||');
  check('T10) y otra vez cuando la toma en curso cambia de fase —no cada tanto—; la más nueva, arriba', pedidas.length === 2 && h?.tomas[0].take === 2);
  respuestaTomas = null;
  mini.pasar(HT.useTomasDelPlano, guardada, PLANO, 'rechazada||');
  await calma();
  h = mini.pasar(HT.useTomasDelPlano, guardada, PLANO, 'rechazada||');
  check('T11) si no se pueden leer, el historial lo dice (no se inventa una lista vacía)', h?.carga === 'error' && h.tomas.length === 0);
  /* El servicio: la puerta de siempre, `shots`, con `shot.takes`. */
  const cargarServicio = crearCargador({ dobles: {
    ...dobles,
    './assetsService': { assetsService: { urlDeEntrega: () => null } },
    'firebase/firestore': { ...dobles['firebase/firestore'], doc: () => ({}), getDoc: async () => ({ exists: () => false }) },
  } });
  const TS = cargarServicio('services/tomaService.ts').tomaService;
  respuestaDe = async (_nombre, datos) => (datos?.op === 'shot.takes'
    ? { data: { takes: [
      { take: 2, requestId: 'r2', state: 'completed', link: 'linked', credits: { reserved: 12, charged: 12, refunded: 0 }, assetId: 'asset_2', revision: 4 },
      { take: 1, requestId: 'r1', state: 'weird', link: 'none', credits: {} },
    ] } }
    : { data: {} });
  const leidas = await TS.tomasDeLaUnidad({ productionId: 'p1', sceneId: 's1', unitId: 'u1' });
  check('T12) el servicio pregunta `shot.takes` a `shots`, con la unidad, y se queda con lo que entiende',
    llamadas.at(-1)?.nombre === 'shots' && JSON.stringify(llamadas.at(-1).datos) === JSON.stringify({ op: 'shot.takes', productionId: 'p1', sceneId: 's1', unitId: 'u1' })
    && leidas?.length === 1 && leidas[0].take === 2);
  respuestaDe = async () => { throw Object.assign(new Error('caída'), { code: 'functions/unavailable' }); };
  check('T13) y si no se puede preguntar, `null`', (await TS.tomasDeLaUnidad({ productionId: 'p1', sceneId: 's1', unitId: 'u1' })) === null);
  respuestaDe = async () => ({ data: {} });
  check('T14) volver a una toma anterior no se puede: el servidor pone siempre la más nueva, y esta fase no lo cambia',
    /if \(tomas\.some\(\(x\) => x\.toma > t\.toma && x\.estado === 'COMPLETED'\)\) return \{ status: 'stale', motivo: 'take_superseded' \};/.test(leer('functions/src/creator/toma.ts')));
}

/* ═══ V · DÓNDE ESTÁ CADA COSA ════════════════════════════════════════════ */
console.log('\n── V · La hoja del guion, «Historia» en el teléfono, la continuidad y las tomas donde se genera ──');
{
  const Hoja = cargar('components/studio/produccion/ProductionStructureSheet.tsx').default;
  const h0 = dibujar(hc(Hoja, { espacio: espacioCon(), que: 'guion', onCerrar() {} }));
  check('V1) la hoja del guion del escritorio es el guion editable', h0.hojas[0]?.titulo === 'Guion' && /Para qué sirve en la historia/.test(h0.texto) && /Ya amanece\./.test(h0.texto));
  const MOV = sinComentarios(leer('components/studio/produccion/ProductionMobileEditor.tsx'));
  check('V2) en el teléfono, «Historia»: el storyboard y el guion', /\{ id: 'storyboard', clave: 'filmmaker\.wsStory' \}/.test(MOV) && /historia === 'guion' && <ProductionGuion espacio=\{espacio\} \/>/.test(MOV));
  const SPR = sinComentarios(leer('components/studio/produccion/ProductionShotProperties.tsx'));
  const BRF = sinComentarios(leer('components/studio/produccion/ProductionBrief.tsx'));
  check('V3) la continuidad de lo elegido, en sus propiedades (escritorio y «Ajustes»); la de toda la producción, en «Dirección»',
    /<ProductionContinuidad espacio=\{espacio\} \/>/.test(SPR) && /<ProductionContinuidad espacio=\{espacio\} nivel="produccion" \/>/.test(BRF));
  const TAB = sinComentarios(leer('components/studio/produccion/ProductionDirectorTabs.tsx'));
  const TOOLS = sinComentarios(leer('components/studio/produccion/ProductionTools.tsx'));
  const DP = sinComentarios(leer('components/studio/produccion/ProductionDirectorPanel.tsx'));
  const SG = sinComentarios(leer('components/studio/produccion/ProductionShotGeneration.tsx'));
  check('V4) las tomas, debajo de la toma, en los tres sitios donde se genera', /historial=\{espacio\.historialDeTomas\}/.test(TAB) && /historial=\{espacio\.historialDeTomas\}/.test(TOOLS)
    && /historial=\{historial\}/.test(DP) && /historial=\{espacio\.historialDeTomas\}/.test(MOV) && /<ProductionTomas historial=\{historial\}/.test(SG));
  const PS = sinComentarios(leer('screens/ProductionScreen.tsx'));
  check('V5) la pantalla las pregunta para lo elegido y las pone en el espacio', /useTomasDelPlano\(estado\.confirmada, seleccion, refrescoDeTomas\)/.test(PS) && /\n\s+historialDeTomas,\n/.test(PS));
  const Gen = cargar('components/studio/produccion/ProductionShotGeneration.tsx').default;
  const conTomas = { carga: 'listas', tomas: [{ take: 1, requestId: 'r1', state: 'completed', link: 'linked', credits: { reserved: 12, charged: 12, refunded: 0 } }], urlDe: async () => null };
  check('V6) y se pintan de verdad debajo de la toma', /1 toma de este plano/.test(dibujar(hc(Gen, { toma: tomaQuieta, tipo: 'plano', historial: conTomas })).texto));
  /* Lo que hoy impide generar se lee entero: un aviso que se parte en líneas, no una etiqueta cortada a una. */
  const PZ = sinComentarios(leer('components/studio/produccion/ProductionPiezas.tsx'));
  const pieza = PZ.slice(PZ.indexOf('export const Aviso'), PZ.indexOf('export const BotonPequeno'));
  check('V7) lo que hoy impide generar se dice entero, sin cortarse: en el guion y en el plano',
    pieza.length > 0 && !/numberOfLines/.test(pieza)
    && /<Aviso texto=\{t\('filmmaker\.wsLineBlocksTake'\)\} \/>/.test(sinComentarios(leer('components/studio/produccion/ProductionGuion.tsx')))
    && /<Aviso texto=\{t\('filmmaker\.wsReferencesBlockTake'\)\} \/>/.test(sinComentarios(leer('components/studio/produccion/ProductionEnElPlano.tsx'))));
}

/* ═══ X · LAS GUARDAS ═════════════════════════════════════════════════════ */
console.log('\n── X · Ni servidor, ni F1-A; ni campos sueltos, ni temporizadores; los once idiomas ──');
{
  const servidor = git(`diff --name-only ${tramo} -- functions/src firestore.rules storage.rules firestore.indexes.json`).trim();
  check('X1) nada del servidor: ni una Function, ni reglas, ni índices, ni F1-A, ni la regla de las tomas', servidor === '', servidor);
  const piezas = fs.readdirSync(path.resolve(RAIZ, 'components/studio/produccion')).map((f) => ({ f, s: leer(`components/studio/produccion/${f}`) }));
  check('X2) ninguna pieza trae un campo suelto ni una caja de prompt nueva',
    piezas.every(({ f, s }) => !/<TextInput\b/.test(s) && (f === 'ProductionBrainBox.tsx' || !/<CajaDePrompt\b/.test(s))));
  check('X3) ni temporizadores, ni el servidor, ni Credits en las piezas', piezas.every(({ s }) => !/httpsCallable|firebase\/|spendCredits|creditsService|tomaService|setTimeout|setInterval/.test(s.replace(/\/\*[\s\S]*?\*\//g, ''))));
  check('X4) todo lo que se pulsó en esta suite fue aceptado por F1-A', rechazos.length === 0, JSON.stringify(rechazos.slice(0, 2)));
  check('X5) en todo lo dibujado no faltó ni una clave', faltan.size === 0, [...faltan].join(', '));
  check('X6) documentado', /### Fase 24 · /.test(leer('docs/FILMMAKER.md')));
  check('X7) esta suite está en la cadena de `npm test`', /filmmaker-historia\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 24 · la historia: el guion, la continuidad y las tomas (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
