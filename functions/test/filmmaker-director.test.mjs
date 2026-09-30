/**
 * FILMMAKER ENGINE · FASE 34 — WEË AI DIRECTOR CON PROPUESTAS ESTRUCTURADAS (filmmaker-director).
 *
 *   A · «así quedaría»: una propuesta de Weë Brain aplicada EN MEMORIA con el F1-A del espejo —escenas, planos y
 *       segundos, antes y después, y qué planos habría que generar, con su sitio, sus segundos, si es nuevo, si lleva
 *       diálogo y cuántas referencias—; sin precio (eso lo dice el servidor al cotizar) y sin inventar nada;
 *   B · las puertas rápidas, según la producción y lo elegido: empezar, proponer escenas y planos, revisar, explicar,
 *       la continuidad, mejorar un plano, su cobertura y convertir un guion;
 *   C · qué unidades van en el lote: la producción entera o solo una escena («Generar esta escena»);
 *   D · la caja de Weë Brain: empezar en una producción vacía, cada puerta RELLENA la caja, «así quedaría», y tras
 *       aplicar, dónde está el precio («Ver el precio»);
 *   E · el lote de una escena: el mismo lote por la misma puerta, con su precio y su confirmación;
 *   F · los textos, en los once diccionarios;
 *   G · las guardas: nada llama a nadie, una puerta nunca envía, ni servidor ni espejo, la matriz al día, en la cadena.
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


/* ═══ A · ASÍ QUEDARÍA: la propuesta, aplicada en memoria con el F1-A del espejo ═══ */
console.log('\n── A · Así quedaría: escenas, planos, duración y qué planos habría que generar ──');
const { resumirPropuesta } = cargar('utils/resumenDePropuesta.ts');
{
  const antes = produccionUI();
  const ops = [
    { op: 'add_shot', sceneId: 'sc-0001', shot: { id: 'sh-0103', durationSec: 5, description: 'La luz barre el mar' } },
    { op: 'edit_text', target: { shotId: 'sh-0101' }, description: 'Una farera sube, despacio, la escalera' },
  ];
  const r = resumirPropuesta(antes, { operations: ops });
  check('A1) antes y después: las escenas, los planos y los segundos', !!r && r.antes.escenas === 1 && r.antes.planos === 2 && r.antes.segundos === 8
    && r.despues.escenas === 1 && r.despues.planos === 3 && r.despues.segundos === 13, JSON.stringify(r && { antes: r.antes, despues: r.despues }));
  const nombres = (r?.afectados ?? []).map((a) => `${a.escena}.${a.plano ?? '-'}${a.nuevo ? '*' : ''}`);
  check('A2) qué planos habría que generar, con su sitio de después y en su orden, y cuál es nuevo', JSON.stringify(nombres) === JSON.stringify(['1.1', '1.3*']), JSON.stringify(nombres));
  const primero = r?.afectados?.[0];
  check('A3) de cada uno, lo que pediría: sus segundos, si lleva diálogo y cuántas referencias', primero?.segundos === 4 && primero?.lineas === 1 && primero?.referencias === 0 && r?.afectados?.[1]?.segundos === 5);
  const quita = resumirPropuesta(antes, { operations: [{ op: 'remove_shot', shotId: 'sh-0102' }] });
  check('A4) lo que se quita, contado (su vídeo dejaría de estar en el montaje)', quita?.quitados === 1 && quita?.despues.planos === 1, JSON.stringify(quita));
  check('A5) una propuesta que aquí no se aplica no se inventa: sin resumen', resumirPropuesta(antes, { operations: [{ op: 'edit_text', target: { shotId: 'sh-9999' }, description: 'x' }] }) === null);
  const delServidor = resumirPropuesta(antes, { operations: ops, pending: { scenes: [], shots: ['sh-0102'], audio: [], removed: [] } });
  check('A6) si el servidor dijo qué habría que rehacer, manda lo suyo (es lo que se comprobó)', JSON.stringify((delServidor?.afectados ?? []).map((a) => a.unitId)) === JSON.stringify(['sh-0102']));
  const src = sinComentarios(leer('utils/resumenDePropuesta.ts'));
  check('A7) solo el espejo de F1-A: ni precio, ni puerta, ni servicio, ni Credits',
    /from '\.\.\/services\/filmmaker\/dominio'/.test(src) && !/priceVideo|credits|Credits|httpsCallable|fetch\(|Service|servicio/.test(src));
}

/* ═══ B · LAS PUERTAS RÁPIDAS ══════════════════════════════════════════════ */
console.log('\n── B · Las puertas rápidas de Weë AI Director, según la producción y lo elegido ──');
const { atajosDelDirector } = cargar('utils/atajosDelDirector.ts');
{
  const ids = (xs) => xs.map((a) => a.id).join(',');
  const vacia = atajosDelDirector({ scenes: [] }, null);
  /* Reanclada con 3D dentro de Filmmaker: «Detectar el reparto» va siempre, al final y sin destacar. */
  check('B1) sin escenas: empezar —proponer las escenas o convertir un guion—, las dos destacadas; y detectar el reparto', ids(vacia) === 'escenas,guion,reparto' && vacia.slice(0, 2).every((a) => a.principal) && !vacia[2].principal);
  const sinElegir = atajosDelDirector(produccionUI(), null);
  check('B2) con escenas y nada elegido: escenas, planos, revisar, explicar, continuidad (hay dos planos) y guion', ids(sinElegir) === 'escenas,planos,revisar,explicar,continuidad,guion,reparto'
    && sinElegir.find((a) => a.id === 'planos').texto === 'filmmaker.wsBrainQuickShotsText');
  const conPlano = atajosDelDirector(produccionUI(), { escena: 1, plano: 2 });
  check('B3) con un plano elegido: también mejorarlo y su cobertura, con su escena y su plano; «planos» es de SU escena',
    ids(conPlano) === 'escenas,planos,revisar,explicar,continuidad,mejorar,cobertura,guion,reparto'
    && JSON.stringify(conPlano.find((a) => a.id === 'mejorar').valores) === JSON.stringify({ escena: 1, plano: 2 })
    && conPlano.find((a) => a.id === 'planos').texto === 'filmmaker.wsBrainQuickShotsSceneText' && conPlano.find((a) => a.id === 'planos').valores.escena === 1);
  const unaSola = atajosDelDirector({ scenes: [{ shots: [] }] }, { escena: 1 });
  check('B4) con una sola unidad no hay continuidad que revisar; con una escena elegida, sin plano, no hay «mejorar» ni «cobertura»', ids(unaSola) === 'escenas,planos,revisar,explicar,guion,reparto');
  check('B5) cada puerta tiene su etiqueta y su petición en español', [...vacia, ...conPlano].every((a) => ES.filmmaker[a.clave.split('.')[1]] && ES.filmmaker[a.texto.split('.')[1]]));
}

/* ═══ C · EL LOTE, DE LA PRODUCCIÓN O DE UNA ESCENA ══════════════════════════ */
console.log('\n── C · Qué unidades van en el lote: la producción entera o solo una escena ──');
const { unidadesDelLote } = cargar('utils/unidadesDelLote.ts');
const { MAX_UNIDADES_POR_LOTE } = cargar('utils/controladorDeToma.ts');
{
  const dos = produccionUI({ scenes: [...produccionUI().scenes, { id: 'sc-0002', order: 1, title: 'Noche', shots: [{ id: 'sh-0201', order: 0, durationSec: 4 }] }] });
  check('C1) si la producción entera cabe, no se dice cuáles: van todas', JSON.stringify(unidadesDelLote(dos, new Map())) === JSON.stringify({ unidades: undefined, recortado: null }));
  check('C2) una escena: solo sus unidades, dichas', JSON.stringify(unidadesDelLote(dos, new Map(), 'sc-0002')) === JSON.stringify({ unidades: ['sh-0201'], recortado: null })
    && JSON.stringify(unidadesDelLote(dos, new Map(), 'sc-0001').unidades) === JSON.stringify(['sh-0101', 'sh-0102']));
  check('C3) una escena que ya no está no deja un lote vacío: vuelve a la producción entera', unidadesDelLote(dos, new Map(), 'sc-9999').unidades === undefined);
  const muchos = Array.from({ length: MAX_UNIDADES_POR_LOTE + 3 }, (_, i) => ({ id: `sh-9${String(i).padStart(3, '0')}`, order: i, durationSec: 4 }));
  const grande = produccionUI({ scenes: [{ id: 'sc-0009', order: 0, title: 'Larga', shots: muchos }] });
  const conVideo = new Map([[muchos[0].id, {}], [muchos[1].id, {}]]);
  const r = unidadesDelLote(grande, conVideo);
  check('C4) si no cabe: las primeras sin vídeo, hasta el máximo, y se dice que se recortó',
    r.recortado === MAX_UNIDADES_POR_LOTE && r.unidades.length === MAX_UNIDADES_POR_LOTE && r.unidades[0] === muchos[2].id && !r.unidades.includes(muchos[0].id));
  const re = unidadesDelLote(grande, conVideo, 'sc-0009');
  check('C5) la misma regla dentro de una escena que no cabe', re.recortado === MAX_UNIDADES_POR_LOTE && re.unidades[0] === muchos[2].id);
  const pantalla = sinComentarios(leer('screens/ProductionScreen.tsx'));
  check('C6) la pantalla usa esa regla, con la escena elegida para el lote (y una que ya no existe vuelve a «toda»), y la pasa al espacio',
    /const delLote = useMemo\(\(\) => unidadesDelLote\(vista, videos, escenaVigente\), \[vista, videos, escenaVigente\]\);/.test(pantalla)
    && /const escenaVigente = escenaDelLote && vista\?\.scenes\.some\(\(s\) => s\.id === escenaDelLote\) \? escenaDelLote : null;/.test(pantalla)
    && /alcanceDelLote: \{ escena: escenaVigente, elegir: setEscenaDelLote \}/.test(pantalla)
    && /useLoteDeTomas\(estado\.confirmada, hayCambios \|\| !!ocupado, delLote\.unidades, delLote\.recortado\)/.test(pantalla));
}

/* ═══ D · LA CAJA DE WEË BRAIN ═══════════════════════════════════════════ */
console.log('\n── D · La caja: empezar, las puertas, «así quedaría» y «ver el precio» ──');
{
  const Caja = cargar('components/studio/produccion/ProductionBrainBox.tsx').default;
  const brain = (extra) => ({
    fase: 'quieto', texto: null, propuesta: null, idDeLaPropuesta: null, sinPropuesta: false, bloque: null,
    cotizacion: { estado: 'nada' }, faltan: null, cotizar() {}, enviar() {}, descartar() {}, ...extra,
  });
  const vacia = produccionUI({ scenes: [] });
  const v = dibujar(hc(Caja, { espacio: espacioCon({ produccion: vacia, brain: brain(), revision: 3, seleccion: null }) }));
  check('D1) en una producción vacía: «Empieza por aquí», con lo que pasa y lo que no (nada se genera sin pedirlo y ver el precio)',
    v.texto.includes(ES.filmmaker.wsBrainStartTitle) && v.texto.includes(ES.filmmaker.wsBrainStartText));
  check('D2) y sus dos primeras puertas, destacadas: proponer las escenas y convertir un guion',
    !!boton(v, ES.filmmaker.wsBrainQuickScenes) && !!boton(v, ES.filmmaker.wsBrainQuickScript) && !boton(v, ES.filmmaker.wsBrainQuickShots));
  recordar(true);
  const c0 = dibujar(hc(Caja, { espacio: espacioCon({ brain: brain(), revision: 3, seleccion: { tipo: 'plano', id: 'sh-0102' } }) }));
  boton(c0, ES.filmmaker.wsBrainQuickCoverage).tocar();
  const c1 = dibujar(hc(Caja, { espacio: espacioCon({ brain: brain(), revision: 3, seleccion: { tipo: 'plano', id: 'sh-0102' } }) }));
  check('D3) con un plano elegido, «Cobertura de este plano» RELLENA la caja con su escena y su plano, y no envía nada',
    c1.cajas[0].valor === t('filmmaker.wsBrainQuickCoverageText', { escena: 1, plano: 2 }) && /plano 2 de la escena 1/.test(c1.cajas[0].valor));
  recordar(false);
  const todas = [ES.filmmaker.wsBrainQuickScenes, ES.filmmaker.wsBrainQuickShots, ES.filmmaker.wsBrainQuickReview, ES.filmmaker.wsBrainQuickExplain,
    ES.filmmaker.wsBrainQuickContinuity, ES.filmmaker.wsBrainQuickImproveShot, ES.filmmaker.wsBrainQuickCoverage, ES.filmmaker.wsBrainQuickScript];
  check('D4) las ocho puertas, cuando tienen sentido: Proponer escenas, Proponer planos, Revisar, Explicar, Continuidad, Mejorar, Cobertura y Tengo un guion',
    todas.every((e) => !!boton(c0, e)), todas.filter((e) => !boton(c0, e)).join(', '));
  const PROP = {
    productionId: pid(1), baseRevision: 3, applied: 2, timelineChanged: true,
    operations: [
      { op: 'add_shot', sceneId: 'sc-0001', shot: { id: 'sh-0103', durationSec: 5, description: 'La luz barre el mar' } },
      { op: 'edit_text', target: { shotId: 'sh-0101' }, description: 'Una farera sube, despacio, la escalera' },
    ],
    reasons: ['Falta el final.', null],
    pending: { scenes: [], shots: ['sh-0101', 'sh-0103'], audio: [], removed: [] },
  };
  const aplicadas = [];
  const conProp = (extra = {}) => espacioCon({
    brain: brain({ fase: 'contesto', texto: 'Te propongo un plano más.', propuesta: PROP, idDeLaPropuesta: 'wb_m_34' }), revision: 3,
    onAplicarPropuesta: async (ops, base, id) => { aplicadas.push({ ops, base, id }); return { ok: true, applied: 2, alreadyApplied: false }; }, ...extra,
  });
  const p = dibujar(hc(Caja, { espacio: conProp() }));
  check('D5) «Así quedaría»: escenas, planos y duración, antes y después',
    p.texto.includes(ES.filmmaker.wsBrainSummaryTitle) && p.texto.includes('Escenas: 1 → 1') && p.texto.includes('Planos: 2 → 3') && p.texto.includes('Duración: 8 s → 13 s'), p.texto.slice(0, 600));
  check('D6) qué habría que generar, plano a plano: su nombre, sus segundos, si es nuevo y si lleva diálogo',
    p.texto.includes('Habría que generar 2 planos:') && p.texto.includes('Escena 1 · Plano 1 (4 s): 1 línea de diálogo') && p.texto.includes('Escena 1 · Plano 3 (5 s): nuevo'), p.texto);
  check('D7) y dónde se ve su precio, antes de generar nada (aplicar sigue siendo gratis)', p.texto.includes(ES.filmmaker.wsBrainSummaryPrice) && p.texto.includes(ES.filmmaker.wsBrainApplyFree));
  const vieja = dibujar(hc(Caja, { espacio: conProp({ revision: 4 }) }));
  check('D8) si la producción ya no está en la revisión en que se comprobó, no se enseña cómo quedaría', !vieja.texto.includes(ES.filmmaker.wsBrainSummaryTitle) && vieja.texto.includes(ES.filmmaker.wsBrainStale));
  /* La producción SÍ es la que comprobó Weë Brain, pero la app no reproduce el cambio (el espejo de F1-A no lo aplica). */
  const noSeReproduce = dibujar(hc(Caja, { espacio: conProp({
    brain: brain({ fase: 'contesto', texto: 'Te propongo un cambio.', propuesta: { ...PROP, operations: [{ op: 'edit_text', target: { shotId: 'sh-9999' }, description: 'x' }] }, idDeLaPropuesta: 'wb_m_35' }),
  }) }));
  check('D8b) si la app no puede reproducir una propuesta VIGENTE, lo dice sin culpar a la producción, y queda qué habría que volver a generar',
    noSeReproduce.texto.includes(ES.filmmaker.wsBrainSummaryUnavailable) && !noSeReproduce.texto.includes(ES.filmmaker.wsBrainStale)
    && !noSeReproduce.texto.includes(ES.filmmaker.wsBrainSummaryTitle) && /volver a generar 2 planos/.test(noSeReproduce.texto)
    && !/ya no está como/.test(ES.filmmaker.wsBrainSummaryUnavailable), noSeReproduce.texto.slice(0, 500));
  recordar(true);
  const irA = [];
  const a0 = dibujar(hc(Caja, { espacio: conProp({ onIrAGenerar: () => irA.push(1) }) }));
  boton(a0, ES.filmmaker.wsBrainApply).tocar();
  await calma();
  const a1 = dibujar(hc(Caja, { espacio: espacioCon({ brain: brain(), revision: 4, onIrAGenerar: () => irA.push(1) }) }));
  check('D9) al aplicar: se dice que el precio está en «Generar la producción», y «Ver el precio» lleva allí', aplicadas.length === 1 && a1.texto.includes(ES.filmmaker.wsBrainAppliedNext) && !!boton(a1, ES.filmmaker.wsBrainSeePrice));
  boton(a1, ES.filmmaker.wsBrainSeePrice)?.tocar();
  check('D10) «Ver el precio» no genera nada: solo lleva', irA.length === 1 && aplicadas.length === 1);
  recordar(false);
  const movil = sinComentarios(leer('components/studio/produccion/ProductionMobileEditor.tsx'));
  const escritorio = sinComentarios(leer('components/studio/produccion/ProductionWorkspace.tsx'));
  check('D11) en escritorio lleva a la pestaña «Producción»; en el teléfono el lote está en la misma vista y solo se dice',
    /onIrAGenerar: \(\) => setPestanaDirector\('produccion'\)/.test(escritorio) && /<ProductionDirectorTabs espacio=\{espacioDelDirector\}/.test(escritorio) && !/onIrAGenerar/.test(movil));
}

/* ═══ E · EL LOTE: TODA LA PRODUCCIÓN O SOLO LA ESCENA ELEGIDA ══════════════ */
console.log('\n── E · «Generar esta escena»: el mismo lote, con su precio y su confirmación ──');
{
  const Lote = cargar('components/studio/produccion/ProductionLote.tsx').default;
  const lote = { fase: { fase: 'quieto' }, calidad: 'standard', disponible: true, recortado: null, elegirCalidad() {}, presupuestar() {}, generar() {} };
  const elegidas = [];
  const ver = (alcance) => dibujar(hc(Lote, { lote, produccion: produccionUI(), editable: true, alcance }));
  const sin = ver(undefined);
  const nada = ver({ elegida: null, escena: null, elegir: (x) => elegidas.push(x) });
  check('E1) sin escena elegida no hay nada que elegir: la producción entera, como siempre', !boton(sin, ES.filmmaker.wsBatchScopeAll) && !boton(nada, ES.filmmaker.wsBatchScopeAll));
  const con = ver({ elegida: 'sc-0001', escena: null, elegir: (x) => elegidas.push(x) });
  const toda = boton(con, ES.filmmaker.wsBatchScopeAll); const esta = boton(con, 'Solo la escena 1');
  check('E2) con una escena elegida: «Toda la producción» (elegida) y «Solo la escena 1», con su nota', !!toda && toda.elegido && !!esta && !esta.elegido && con.texto.includes(ES.filmmaker.wsBatchScopeNote));
  esta.tocar();
  check('E3) elegir la escena pide su lote; no genera nada', JSON.stringify(elegidas) === JSON.stringify(['sc-0001']));
  const ya = ver({ elegida: 'sc-0001', escena: 'sc-0001', elegir: (x) => elegidas.push(x) });
  check('E4) con el lote de la escena puesto, se ve elegida', boton(ya, 'Solo la escena 1')?.elegido === true && boton(ya, ES.filmmaker.wsBatchScopeAll)?.elegido === false);
  const panel = sinComentarios(leer('components/studio/produccion/ProductionDirectorPanel.tsx'));
  check('E5) el panel le pasa al lote la escena de lo elegido, en escritorio y en el teléfono',
    /alcance=\{alcanceDelLote \? \{ elegida: escenaDeLaSeleccion\(produccion, seleccion\), escena: alcanceDelLote\.escena, elegir: alcanceDelLote\.elegir \} : undefined\}/.test(panel)
    && /alcanceDelLote=\{espacio\.alcanceDelLote\}/.test(sinComentarios(leer('components/studio/produccion/ProductionDirectorTabs.tsx')))
    && /alcanceDelLote=\{espacio\.alcanceDelLote\}/.test(sinComentarios(leer('components/studio/produccion/ProductionMobileEditor.tsx'))));
  const E = cargar('components/studio/produccion/espacio.ts');
  check('E6) la escena de lo elegido: la del plano, o ella misma', E.escenaDeLaSeleccion(produccionUI(), { tipo: 'plano', id: 'sh-0102' }) === 'sc-0001'
    && E.escenaDeLaSeleccion(produccionUI(), { tipo: 'escena', id: 'sc-0001' }) === 'sc-0001' && E.escenaDeLaSeleccion(produccionUI(), null) === null
    && E.escenaDeLaSeleccion(produccionUI(), { tipo: 'plano', id: 'sh-9999' }) === null);
}

/* ═══ F · LOS ONCE IDIOMAS ═════════════════════════════════════════════════ */
console.log('\n── F · Los textos, en los once diccionarios ──');
{
  const LOCALES = ['es', 'en', 'pt', 'pt-PT', 'fr', 'de', 'it', 'ru', 'ko', 'zh', 'zh-TW'];
  const CLAVES = ['wsBrainQuickShots', 'wsBrainQuickShotsText', 'wsBrainQuickShotsSceneText', 'wsBrainQuickExplain', 'wsBrainQuickExplainText', 'wsBrainQuickContinuity',
    'wsBrainQuickContinuityText', 'wsBrainQuickImproveShot', 'wsBrainQuickImproveShotText', 'wsBrainQuickCoverage', 'wsBrainQuickCoverageText', 'wsBrainQuickScript',
    'wsBrainQuickScriptText', 'wsBrainStartTitle', 'wsBrainStartText', 'wsBrainSummaryTitle', 'wsBrainSummaryScenes', 'wsBrainSummaryShots', 'wsBrainSummaryDuration',
    'wsBrainSummaryToGenerate_one', 'wsBrainSummaryToGenerate_other', 'wsBrainSummaryShot', 'wsBrainSummaryShotWith', 'wsBrainSummaryNew', 'wsBrainSummaryWithSound', 'wsBrainSummaryRefs_one', 'wsBrainSummaryRefs_other',
    'wsBrainSummaryRemoved_one', 'wsBrainSummaryRemoved_other', 'wsBrainSummaryPrice', 'wsBrainSummaryUnavailable', 'wsBrainAppliedNext', 'wsBrainSeePrice',
    'wsBatchScopeAll', 'wsBatchScopeScene', 'wsBatchScopeNote'];
  const de = (l) => leer(`i18n/textos/${l}/filmmaker.ts`);
  const faltanEn = LOCALES.map((l) => [l, CLAVES.filter((k) => !new RegExp(`^  ${k}: '`, 'm').test(de(l)))]).filter(([, f]) => f.length);
  check('F1) las 36 claves en los once', faltanEn.length === 0, JSON.stringify(faltanEn));
  const ru = de('ru');
  check('F2) el ruso, con sus cuatro formas en cada plural', ['wsBrainSummaryToGenerate', 'wsBrainSummaryRefs', 'wsBrainSummaryRemoved'].every((k) => ['one', 'few', 'many', 'other'].every((f) => new RegExp(`^  ${k}_${f}: '`, 'm').test(ru))));
  check('F3) el portugués de Brasil trata de «você»; el europeo, de «tu»', /wsBrainStartText: '[^']*você/.test(de('pt')) && /wsBrainStartText: '[^']*tua peça/.test(de('pt-PT')) && /wsBrainQuickScript: 'Tenho um roteiro'/.test(de('pt')) && /guião/.test(de('pt-PT')));
  check('F4) «Weë Brain» no se traduce', LOCALES.every((l) => (de(l).match(/^  wsBrainStartText: '.*'/m)?.[0] ?? '').includes('Weë Brain')));
  check('F5) ninguna clave sin frase en español al pintar', faltan.size === 0, [...faltan].join(', '));
}

/* ═══ G · LAS GUARDAS ═════════════════════════════════════════════════════ */
console.log('\n── G · Las guardas ──');
{
  const nuevos = ['utils/resumenDePropuesta.ts', 'utils/atajosDelDirector.ts', 'utils/unidadesDelLote.ts'].map((f) => sinComentarios(leer(f)));
  check('G1) lo nuevo no llama a nadie: ni callables, ni red, ni el servidor, ni otro Weë Brain', nuevos.every((s) => !/httpsCallable|fetch\(|functions\/src|brainService|enviar\(/.test(s)));
  const caja = sinComentarios(leer('components/studio/produccion/ProductionBrainBox.tsx'));
  check('G2) una puerta rápida solo RELLENA la caja; enviar sigue siendo de la persona, con su precio', /onPress=\{\(\) => setTexto\(t\(a\.texto, a\.valores\)\)\}/.test(caja) && (caja.match(/brain\.enviar\(/g) ?? []).length === 1);
  const ANTES = git('log --format=%H -n 1 --grep "Phase 33: engine risks"').trim();
  const HASTA = git('log --format=%H -n 1 --grep "Phase 34: structured director"').trim();
  const tramo = HASTA ? `${ANTES} ${HASTA}` : ANTES;
  const tocados = git(`diff --name-only ${tramo}`).trim().split('\n').filter(Boolean).filter((p) => !p.startsWith('functions/lib/'));
  const servidor = tocados.filter((p) => /^functions\/src\/|^services\/filmmaker\/espejo\/|\.rules$|firestore\.indexes\.json$/.test(p));
  check('G3) ni el servidor, ni el espejo de F1-A, ni reglas: la Fase 34 es de la app', servidor.length === 0, servidor.join(','));
  const doc = leer('docs/FILMMAKER-CAPABILITY-MASTER.md');
  const estado = (id) => (doc.match(new RegExp(`^\\| ${id} \\|(?:[^|]*\\|){7} ([A-H]) \\|`, 'm')) ?? [])[1];
  check('G4) la matriz dice usables N01, N03, N04, N06, N07, N08, N09, I01 e I05', ['N01', 'N03', 'N04', 'N06', 'N07', 'N08', 'N09', 'I01', 'I05'].every((id) => estado(id) === 'A'),
    ['N01', 'N03', 'N04', 'N06', 'N07', 'N08', 'N09', 'I01', 'I05'].map((id) => `${id}:${estado(id)}`).join(' '));
  check('G5) documentado', /### Fase 34 · /.test(leer('docs/FILMMAKER.md')));
  check('G6) en la cadena, detrás de los riesgos del motor', /filmmaker-riesgos\.test\.mjs && node test\/filmmaker-director\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(`\n${failures ? '✘' : '✔'} filmmaker-director: ${n - failures}/${n}`);
process.exit(failures ? 1 : 0);
