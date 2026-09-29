/**
 * FILMMAKER ENGINE · FASE 35 — HISTORIA: ESCENAS Y CONTINUIDAD PLANO A PLANO (filmmaker-historia-vistas).
 *
 *   A · la continuidad, plano a plano, pura y con el F1-A del espejo: quién sale y cómo está (lo de la escena, dicho),
 *       quién entra y quién sale, en quién cambia algo, los objetos, el lugar, el momento y el clima;
 *   B · Historia › Escenas: cada escena con su propósito, su lugar, su momento, su clima, su reparto, su duración y sus
 *       planos, y desde aquí se va a ella;
 *   C · Historia › Continuidad: la evolución plano a plano, y lo que F1-A todavía no tiene, dicho;
 *   D · dónde están: «Estructura» en escritorio (en su hoja, como el guion) e «Historia» en el teléfono;
 *   F · los textos, en los once diccionarios;
 *   G · las guardas: solo leen, ni servidor ni espejo, la matriz al día, en la cadena.
 *
 * El código de la app, con dobles de React Native y de Firebase y el traductor con el español de verdad; el arnés, el
 * de `f1d-postcanary.test.mjs`, copiado, con el bloque de dobles de la Fase 22.
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


/* ═══ A · LA CONTINUIDAD, PLANO A PLANO (puro, con el F1-A del espejo) ═══════ */
console.log('\n── A · La continuidad, plano a plano: quién sale y cómo está, quién entra y sale, qué cambia ──');
const { continuidadPlanoAPlano } = cargar('utils/continuidadPlanoAPlano.ts');
const conEstados = () => produccionUI({
  objects: [{ id: 'obj-lampara', name: 'La lámpara', kind: 'prop' }],
  scenes: [
    {
      id: 'sc-0001', order: 0, title: 'Amanecer', characterIds: ['char-luna'], locationId: 'loc-faro', timeOfDay: 'dawn', weather: 'fog', objectIds: ['obj-lampara'],
      characterStates: [{ characterId: 'char-luna', wardrobe: 'Chaqueta azul' }],
      shots: [
        { id: 'sh-0101', order: 0, durationSec: 4, description: 'Sube la escalera', characterIds: ['char-luna'] },
        { id: 'sh-0102', order: 1, durationSec: 4, description: 'Se moja', characterIds: ['char-luna'], characterStates: [{ characterId: 'char-luna', appearanceNotes: 'Empapada' }] },
      ],
    },
    { id: 'sc-0002', order: 1, title: 'Noche', characterIds: ['char-mar'], shots: [] },
  ],
});
{
  const f = continuidadPlanoAPlano(conEstados());
  check('A1) una fila por unidad, en orden: los dos planos y la escena sin planos', f.length === 3 && f[0].unitId === 'sh-0101' && f[1].unitId === 'sh-0102' && f[2].unitId === 'sc-0002' && f[2].plano === undefined);
  check('A2) quién sale y cómo está: el vestuario viene de la escena y se dice', f[0].personajes[0].nombre === 'Luna' && f[0].personajes[0].vestuario === 'Chaqueta azul' && f[0].personajes[0].vestuarioDeLaEscena === true);
  check('A3) el plano 2 dice «empapada» (suyo) y se marca que cambia respecto al anterior', f[1].personajes[0].comoEsta === 'Empapada' && f[1].personajes[0].comoEstaDeLaEscena === false && f[1].personajes[0].cambia === true && f[0].personajes[0].cambia === false);
  check('A4) quién entra y quién sale de un plano a otro', JSON.stringify(f[2].entran) === JSON.stringify(['Mar']) && JSON.stringify(f[2].salen) === JSON.stringify(['Luna']) && f[0].entran.length === 0);
  check('A5) los objetos, el lugar, el momento y el clima de su escena', JSON.stringify(f[0].objetos) === JSON.stringify(['La lámpara']) && f[0].lugar === 'El faro' && f[0].momento === 'dawn' && f[0].clima === 'fog');
  const E = cargar('services/filmmaker/dominio.ts');
  const escena = conEstados().scenes[0];
  check('A6) el estado es el de F1-A (`estadoEfectivo`), el mismo que llega a la toma', JSON.stringify(E.estadoEfectivo(escena, escena.shots[1], 'char-luna')) === JSON.stringify({ characterId: 'char-luna', wardrobe: 'Chaqueta azul', appearanceNotes: 'Empapada' }));
  const src = sinComentarios(leer('utils/continuidadPlanoAPlano.ts'));
  check('A7) solo lectura y sin inventar: solo el espejo, ni servicio, ni callables', /estadoEfectivo\(scene, shot, id\)/.test(src) && /repartoDelPlano\(scene, shot\)/.test(src) && !/httpsCallable|Service|onGesto/.test(src));
}

/* ═══ B · HISTORIA › ESCENAS ═════════════════════════════════════════════ */
console.log('\n── B · Historia › Escenas ──');
{
  const Escenas = cargar('components/studio/produccion/ProductionEscenas.tsx').default;
  const elegidas = [];
  const cerradas = [];
  const d = dibujar(hc(Escenas, { espacio: espacioCon({ produccion: conEstados(), seleccion: null, onSeleccionar: (s) => elegidas.push(s) }), onIrALaEscena: () => cerradas.push(1) }));
  check('B1) cada escena con su título, su lugar, su momento, su clima, cuántos planos y cuánto dura',
    d.texto.includes('Escena 1 · Amanecer') && d.texto.includes('En El faro') && d.texto.includes(t('filmmaker.' + 'shots', { contador: 2 })) && d.texto.includes('8 s')
    && d.texto.includes(t(cargar('constants/filmmaker.ts').CLAVE_DEL_MOMENTO.dawn)) && d.texto.includes(t(cargar('constants/filmmaker.ts').CLAVE_DEL_CLIMA.fog)), d.texto.slice(0, 400));
  /* Sin todas las duraciones F1-A no hace línea de tiempo; cada escena dice la suya igualmente (la Noche no tiene). */
  const corte = d.texto.indexOf('Escena 2 · Noche');
  check('B1b) una escena sin duración lo dice, y no deja a las demás sin la suya',
    corte > 0 && d.texto.slice(corte).includes(ES.filmmaker.noDuration) && d.texto.slice(0, corte).includes('8 s') && !d.texto.includes('0 s'), d.texto.slice(0, 400));
  check('B2) quién sale en cada escena, y si no sale nadie se dice', d.texto.includes('Salen: Luna') && d.texto.includes('Escena 2 · Noche') && d.texto.includes('Salen: Mar'));
  boton(d, 'Ir a la escena 2').tocar();
  check('B3) «Ir a la escena» la elige y cierra la hoja; no cambia nada', JSON.stringify(elegidas) === JSON.stringify([{ tipo: 'escena', id: 'sc-0002' }]) && cerradas.length === 1 && gestos.length === 0);
  const vacia = dibujar(hc(Escenas, { espacio: espacioCon({ produccion: produccionUI({ scenes: [] }), seleccion: null }) }));
  check('B4) sin escenas, dice qué hacer', vacia.texto.includes(ES.filmmaker.wsScenesEmpty));
}

/* ═══ C · HISTORIA › CONTINUIDAD ═════════════════════════════════════════ */
console.log('\n── C · Historia › Continuidad ──');
{
  const Flujo = cargar('components/studio/produccion/ProductionContinuidadPlanoAPlano.tsx').default;
  const elegidas = [];
  const d = dibujar(hc(Flujo, { espacio: espacioCon({ produccion: conEstados(), seleccion: null, onSeleccionar: (s) => elegidas.push(s) }) }));
  check('C1) plano a plano: su nombre, el lugar y quién sale con su vestuario (de la escena, dicho)',
    d.texto.includes('Escena 1 · Plano 1') && d.texto.includes('Vestuario: Chaqueta azul (de la escena)') && d.texto.includes('Objetos: La lámpara'));
  check('C2) lo que cambia se marca, y lo del propio plano no dice «de la escena»', d.texto.includes('Luna · cambia respecto al plano anterior') && d.texto.includes('Cómo está: Empapada') && !d.texto.includes('Empapada (de la escena)'));
  check('C3) quién entra y quién sale', d.texto.includes('Entrada: Mar') && d.texto.includes('Salida: Luna'));
  check('C4) y lo que F1-A todavía no tiene (postura, emoción, estado de lugares y objetos) se dice, no se inventa', d.texto.includes(ES.filmmaker.wsFlowStructuredSoon));
  boton(d, 'Ir a Escena 1 · Plano 2').tocar();
  check('C5) desde aquí se va al plano', JSON.stringify(elegidas) === JSON.stringify([{ tipo: 'plano', id: 'sh-0102' }]));
}

/* ═══ D · DÓNDE ESTÁN: escritorio y teléfono ═══════════════════════════════ */
console.log('\n── D · Dónde están: «Estructura» en escritorio e «Historia» en el teléfono ──');
{
  const panel = sinComentarios(leer('components/studio/produccion/ProductionProjectPanel.tsx'));
  const escritorio = sinComentarios(leer('components/studio/produccion/ProductionWorkspace.tsx'));
  const hoja = sinComentarios(leer('components/studio/produccion/ProductionStructureSheet.tsx'));
  const movil = sinComentarios(leer('components/studio/produccion/ProductionMobileEditor.tsx'));
  check('D1) en «Estructura»: Escenas (con cuántas) y Continuidad, justo después del Guion',
    /\{ id: 'guion'[^\n]*\n\s*\{ id: 'escenas', clave: 'filmmaker\.wsScenesTab', icono: 'albums-outline', cuenta: produccion\.scenes\.length \},\n\s*\{ id: 'continuidad', clave: 'filmmaker\.wsContinuityTitle'/.test(panel));
  check('D2) se abren en su hoja, como el guion', /if \(e === 'escenas' \|\| e === 'continuidad'\) \{ setHoja\(e\); return; \}/.test(escritorio)
    && /que === 'escenas' && <ProductionEscenas espacio=\{espacio\} onIrALaEscena=\{onCerrar\} \/>/.test(hoja) && /que === 'continuidad' && <ProductionContinuidadPlanoAPlano espacio=\{espacio\} onIrAlPlano=\{onCerrar\} \/>/.test(hoja));
  check('D3) en el teléfono, Historia tiene cuatro: Storyboard, Guion, Escenas y Continuidad; ir a algo vuelve al storyboard',
    /\(\['storyboard', 'guion', 'escenas', 'continuidad'\] as const\)/.test(movil) && /historia === 'escenas' && <ProductionEscenas espacio=\{espacio\} onIrALaEscena=\{\(\) => setHistoria\('storyboard'\)\} \/>/.test(movil)
    && /historia === 'continuidad' && <ProductionContinuidadPlanoAPlano espacio=\{espacio\} onIrAlPlano=\{\(\) => setHistoria\('storyboard'\)\} \/>/.test(movil));
  const Hoja = cargar('components/studio/produccion/ProductionStructureSheet.tsx').default;
  const h = dibujar(hc(Hoja, { espacio: espacioCon({ produccion: conEstados() }), que: 'escenas', onCerrar() {} }));
  check('D4) la hoja de Escenas se titula «Escenas»', h.hojas[0]?.titulo === ES.filmmaker.wsScenesTab && h.texto.includes('Escena 1 · Amanecer'));
  check('D5) a 360 px las cuatro vistas de la historia miden su nombre y se reparten el resto, no cuartos iguales (ni «Sceneggiatura» ni «Непрерывность» se cortan)',
    /style=\{\[styles\.vista, styles\.vistaDeHistoria, historia === h/.test(movil) && /vistaDeHistoria: \{ flexGrow: 1, flexShrink: 1, flexBasis: 'auto'/.test(movil));
}

/* ═══ F · LOS ONCE IDIOMAS ═════════════════════════════════════════════════ */
console.log('\n── F · Los textos, en los once diccionarios ──');
{
  const LOCALES = ['es', 'en', 'pt', 'pt-PT', 'fr', 'de', 'it', 'ru', 'ko', 'zh', 'zh-TW'];
  const CLAVES = ['wsScenesTab', 'wsScenesEmpty', 'wsScenesIntro', 'wsSceneTitled', 'wsScenePlace', 'wsSceneCast', 'wsSceneNoCast', 'wsGoToScene', 'wsFlowIntro', 'wsFlowEnter',
    'wsFlowLeave', 'wsFlowNameChanges', 'wsFlowWardrobe', 'wsFlowWardrobeFromScene', 'wsFlowNoWardrobe', 'wsFlowState', 'wsFlowStateFromScene', 'wsFlowObjects', 'wsFlowGoTo', 'wsFlowStructuredSoon'];
  const de = (l) => leer(`i18n/textos/${l}/filmmaker.ts`);
  const faltanEn = LOCALES.map((l) => [l, CLAVES.filter((k) => !new RegExp(`^  ${k}: '`, 'm').test(de(l)))]).filter(([, f]) => f.length);
  check('F1) las 20 claves en los once', faltanEn.length === 0, JSON.stringify(faltanEn));
  check('F2) el coreano sin partículas pegadas a un hueco', !/\}\}\((으)\)로|\}\}\(을\)|\}\}\(를\)/.test(de('ko')));
  check('F3) ninguna clave sin frase en español al pintar', faltan.size === 0, [...faltan].join(', '));
}

/* ═══ G · LAS GUARDAS ═════════════════════════════════════════════════════ */
console.log('\n── G · Las guardas ──');
{
  const ANTES = git('log --format=%H -n 1 --grep "Phase 34: structured director"').trim();
  const HASTA = git('log --format=%H -n 1 --grep "Phase 35: story scenes and continuity"').trim();
  const tramo = HASTA ? `${ANTES} ${HASTA}` : ANTES;
  const tocados = git(`diff --name-only ${tramo}`).trim().split('\n').filter(Boolean).filter((p) => !p.startsWith('functions/lib/'));
  const servidor = tocados.filter((p) => /^functions\/src\/|^services\/filmmaker\/espejo\/|\.rules$|firestore\.indexes\.json$/.test(p));
  check('G1) ni el servidor, ni el espejo de F1-A, ni reglas: dos vistas de lo que ya se sabe', servidor.length === 0, servidor.join(','));
  const vistas = ['components/studio/produccion/ProductionEscenas.tsx', 'components/studio/produccion/ProductionContinuidadPlanoAPlano.tsx'].map((f) => sinComentarios(leer(f)));
  check('G2) solo leen: ninguna operación, ni callables', vistas.every((s) => !/onGesto\(|httpsCallable|op: '/.test(s)));
  const doc = leer('docs/FILMMAKER-CAPABILITY-MASTER.md');
  const estado = (id) => (doc.match(new RegExp(`^\\| ${id} \\|(?:[^|]*\\|){7} ([A-H]) \\|`, 'm')) ?? [])[1];
  check('G3) la matriz dice usables N10 y N11', estado('N10') === 'A' && estado('N11') === 'A', `${estado('N10')} ${estado('N11')}`);
  check('G4) documentado', /### Fase 35 · /.test(leer('docs/FILMMAKER.md')));
  check('G5) en la cadena, detrás del Director', /filmmaker-director\.test\.mjs && node test\/filmmaker-historia-vistas\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(`\n${failures ? '✘' : '✔'} filmmaker-historia-vistas: ${n - failures}/${n}`);
process.exit(failures ? 1 : 0);
