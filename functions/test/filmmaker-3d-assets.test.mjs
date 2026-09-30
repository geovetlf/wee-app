/**
 * FILMMAKER ENGINE · 3D DENTRO DE FILMMAKER (filmmaker-3d-assets).
 *
 * «3D vive dentro de Filmmaker; Filmmaker no vive dentro de 3D.» UN WEË · UN ASSET ENGINE · UN SISTEMA DE ELEMENTS ·
 * UN GRAN MOTOR · MUCHAS EXPERIENCIAS. Aquí se prueba que eso es verdad en el código:
 *
 *   A · ni sección, ni pestaña, ni pantalla, ni ruta 3D; el workplace aprobado, sin tocar; un solo sistema de assets;
 *   B · el mapa de entradas: cada forma de crear tiene su sitio, su estado y, si está cerrada, su porqué; y lo cerrado
 *       por falta de proveedor sigue cerrado mientras el catálogo del Core no lo pueda servir;
 *   C · Reparto, Lugares y Objetos: crear desde lo guardado y desde Mis creaciones, guardar para reutilizar, y el 3D
 *       y la escena 3D, cerrados con su porqué;
 *   D · el plano: desde lo guardado, con el MISMO ID si ya está en la producción (la continuidad por identidad);
 *   E · Referencias y Mis creaciones: el modelo 3D, cerrado como referencia de toma y disponible como cosa guardada;
 *   F · Weë Brain: «Detectar el reparto» propone; la persona decide;
 *   G · el servidor de verdad: dueño, archivado, clase, versión, reutilización sin copias y continuidad por ID;
 *   H · el catálogo y el registro: 3D declarado, sin proveedor y sin puerta;
 *   I · los textos, en los once diccionarios;
 *   J · las guardas: ni un contrato de F1, ni el motor, ni un proveedor tocados.
 *
 * El código de la app, con dobles de React Native y de Firebase y el traductor con el español de verdad; el servidor,
 * compilado, sobre el Firestore en memoria del arnés de `f1d-postcanary.test.mjs` (copiado, con el bloque de dobles de
 * la Fase 22). Nada sale a la red: ni un proveedor, ni un Credit.
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


/* ═══ 3D DENTRO DE FILMMAKER · lo que se prueba aquí ═══════════════════════ */
const BASE3D = 'dd764e4';
/* Las vallas miran SU tramo en cuanto esta fase esté en un commit (antes, el árbol de trabajo): así una fase posterior no las rompe. */
const HASTA3D = git('log --format=%H -n 1 --grep "3D inside Filmmaker: create, save and reuse"').trim();
const TRAMO3D = HASTA3D ? `${BASE3D} ${HASTA3D}` : BASE3D;
const P3 = 'components/studio/produccion/';
const Mapa = cargar('constants/assetsDeFilmmaker.ts');
const CATALOGO = lib('core/registry/capabilities.js').CAPABILITY_CATALOG;
const entradaDelCatalogo = (id) => CATALOGO.find((e) => e.id === id);
const gestos3 = () => gestos.slice();
const avisos3 = () => avisos.slice();

/* Lo guardado de la cuenta (el hook de siempre, con dobles) y Mis creaciones. */
const guardadosCon = (lista, crear) => ({ carga: 'listos', lista, hayMas: false, cargandoMas: false, cargar() {}, cargarMas() {}, ...(crear ? { crear } : {}) });
const creacionesCon = (lista, clase = 'image') => ({ carga: 'listas', clase, lista, hayMas: false, cargandoMas: false, cargar() {}, cargarMas() {} });
const ALEX = { elementId: 'el_alex_0001', type: 'character', name: 'Alex', version: 2 };
const CIUDAD = { elementId: 'el_ciudad_0001', type: 'place', name: 'Ciudad futurista', version: 1 };
const ESPADA = { elementId: 'el_espada_0001', type: 'object', name: 'Espada', version: 4 };
const RETRATO = { assetId: 'asset_retrato_0001', clase: 'image', nombre: 'Retrato de Alex', miniatura: null, creadoEn: HOY };
const MODELO = { assetId: 'asset_robot_glb_01', clase: 'model3d', nombre: 'Robot', miniatura: null, creadoEn: HOY };
const idsDeFichas = { personaje: () => 'ch_nuevo_0001', lugar: () => 'lc_nuevo_0001', objeto: () => 'ob_nuevo_0001' };
/* Lo que se le pide al servidor al guardar en la cuenta, y lo que contesta. */
let pedidasAElements = [];
const ID_DEL_SERVIDOR = 'el_del_servidor01';
let respuestaDeElements = async (n) => ({ ok: true, elemento: { elementId: n.elementId ?? ID_DEL_SERVIDOR, type: n.type, name: n.name, version: 1 } });
const crearEnLaCuenta = async (n) => { pedidasAElements.push(n); return respuestaDeElements(n); };
const conLaCuenta = (extra = {}) => espacioCon({ elementos: guardadosCon([ALEX, CIUDAD, ESPADA], crearEnLaCuenta), creaciones: creacionesCon([RETRATO]), idsDeFichas, ...extra });

/* ═══ A · SIN SECCIÓN 3D, EL WORKPLACE APROBADO INTACTO, UN SOLO SISTEMA DE ASSETS ═══ */
console.log('\n── A · Ni sección, ni pestaña, ni pantalla, ni ruta 3D; el workplace aprobado, sin tocar ──');
{
  const tocados = git(`diff --name-only ${TRAMO3D} -- screens navigation constants/studioWorkspace.ts components/workspace`).trim();
  check('A1) ni una pantalla, ni una ruta, ni una entrada del menú de Weë Studio, ni una pieza del marco: nada nuevo ni cambiado', tocados === '', tocados);
  const DISPOSICION = ['ProductionWorkspace', 'ProductionMobileEditor', 'ProductionTimeline', 'ProductionViewer', 'ProductionInspector', 'ProductionDirectorTabs',
    'ProductionDirectorPanel', 'ProductionProjectPanel', 'ProductionProyecto', 'ProductionShotProperties', 'ProductionTools'].map((f) => `${P3}${f}.tsx`);
  const cambiados = git(`diff --name-only ${TRAMO3D} -- ${DISPOSICION.join(' ')}`).trim();
  check('A2) la disposición aprobada —espacio, teléfono, línea de tiempo, visor, inspector, Weë AI Director, panel y proyecto— sin tocar', cambiados === '', cambiados);
  const PR = sinComentarios(leer(`${P3}ProductionProyecto.tsx`));
  const secciones = [...PR.matchAll(/\{ id: '([a-z]+)', clave: 'filmmaker\.[A-Za-z]+', icono:/g)].map((m) => m[1]);
  check('A3) el proyecto sigue con sus siete secciones y ninguna más (nada llamado 3D)', JSON.stringify(secciones) === JSON.stringify(['brief', 'direccion', 'reparto', 'lugares', 'objetos', 'referencias', 'versiones']), secciones.join(','));
  const nuevos = git(`diff --name-only --diff-filter=A ${TRAMO3D} -- components screens hooks services constants utils`).trim().split('\n').filter(Boolean);
  check('A4) las piezas nuevas son solo dos: el mapa de entradas y el panel de crear (ninguna pantalla, ningún servicio, ninguna biblioteca)',
    JSON.stringify(nuevos.sort()) === JSON.stringify([`${P3}ProductionCrearFicha.tsx`, 'constants/assetsDeFilmmaker.ts']), nuevos.join(', '));
  const DE_LA_FASE = [`${P3}ProductionCrearFicha.tsx`, `${P3}ProductionFichas.tsx`, `${P3}ProductionEnElPlano.tsx`, `${P3}ProductionSelectorDeCreaciones.tsx`, 'constants/assetsDeFilmmaker.ts', 'utils/atajosDelDirector.ts'];
  const hablan = DE_LA_FASE.filter((f) => /httpsCallable|firebase\/|fetch\(|collection\(|meshy|tripo|hunyuan|rodin|ark\.ap-southeast/i.test(sinComentarios(leer(f))));
  check('A5) ninguna pieza habla con el servidor ni con un proveedor: lo hacen los servicios de siempre (Elements, Mis creaciones)', hablan.length === 0, hablan.join(', '));
  const SERV = sinComentarios(leer('services/elementsService.ts'));
  check('A6) guardar en la cuenta es la puerta `elements` de siempre (op create): ni otra función, ni otra colección, ni una URL',
    (SERV.match(/httpsCallable[^(]*\(functions, '([a-z]+)'/g) ?? []).every((x) => /'elements'/.test(x)) && /op: 'create'/.test(SERV) && !/collection\(|https?:\/\//.test(SERV));
  const MAPA = sinComentarios(leer('constants/assetsDeFilmmaker.ts'));
  check('A7) el mapa de entradas no guarda proveedores, modelos, URLs ni precios: es un mapa de la UX, no un segundo motor',
    !/provider|endpoint|https?:|credits|precio|usd/i.test(MAPA) && !/model[A-Z]|modelId/.test(MAPA));
}

/* ═══ B · EL MAPA DE ENTRADAS ════════════════════════════════════════════ */
console.log('\n── B · Cada forma de crear: su sitio, su estado y, si está cerrada, su porqué ──');
{
  const C = Mapa.CAPACIDADES_DE_CREACION;
  check('B1) diez formas, cada una con su etiqueta en español', C.length === 10 && C.every((c) => t(c.clave) !== c.clave), C.map((c) => c.id).join(','));
  const cerradas = C.filter((c) => !c.disponible);
  check('B2) cada cerrada dice QUÉ le falta y POR QUÉ; ninguna disponible trae un bloqueo',
    cerradas.every((c) => !!c.bloqueo && !!c.porque && t(c.porque) !== c.porque) && C.filter((c) => c.disponible).every((c) => !c.bloqueo && !c.porque));
  check('B3) las cerradas son las que el sistema todavía no puede servir: imagen con IA, 3D, importar, la escena 3D y el 3D como referencia',
    JSON.stringify(cerradas.map((c) => c.id).sort()) === JSON.stringify(['crear_en_3d', 'escena_3d', 'imagen_con_ia', 'importar_modelo_3d', 'referencia_3d']));
  /* Lo cerrado por falta de proveedor sigue cerrado mientras el catálogo del Core no lo pueda servir, y al revés. */
  const porProveedor = C.filter((c) => c.bloqueo === 'proveedor');
  check('B4) «En 3D con IA» depende de `3d.generate`, que el catálogo del Core tiene DECLARED (sin matriz): cerrada con razón',
    porProveedor.length === 1 && porProveedor[0].id === 'crear_en_3d' && entradaDelCatalogo('3d.generate')?.status === 'DECLARED');
  check('B5) CONTROL: el día que el catálogo la sirva (ROUTABLE), esta prueba obliga a abrirla — hoy ninguna cerrada por proveedor es servible',
    porProveedor.every((c) => (c.catalogo ?? []).some((id) => entradaDelCatalogo(id) && entradaDelCatalogo(id).status !== 'ROUTABLE')));
  const puerta = sinComentarios(leer('functions/src/creator/video.ts'));
  check('B6) «Imagen con IA» está cerrada por AUTORIZACIÓN: la imagen existe en el motor, pero la puerta de Filmmaker solo deja pasar `video.generate` (regla 10)',
    C.find((c) => c.id === 'imagen_con_ia')?.bloqueo === 'autorizacion' && entradaDelCatalogo('image.generate')?.status === 'ROUTABLE'
    && /const CAPACIDAD_DEL_CANARY: CapabilityId = 'video\.generate';/.test(puerta));
  /* Cada sitio de cada forma tiene la pieza que la enseña. */
  const PIEZAS = {
    crear_personaje: `${P3}ProductionCrearFicha.tsx`, crear_lugar: `${P3}ProductionCrearFicha.tsx`, crear_objeto: `${P3}ProductionCrearFicha.tsx`,
    ficha: `${P3}ProductionFichas.tsx`, ficha_lugar: `${P3}ProductionFichas.tsx`, referencias: `${P3}ProductionSelectorDeCreaciones.tsx`,
    plano: `${P3}ProductionEnElPlano.tsx`, director: 'utils/atajosDelDirector.ts',
  };
  const sinPieza = [];
  for (const c of C) {
    for (const sitio of c.sitios) {
      const src = sinComentarios(leer(PIEZAS[sitio]));
      const la = sitio.startsWith('crear_') ? /capacidadesEn\(SITIO\[clase\]\)/.test(src) : sitio === 'director' ? src.includes(`'${c.clave}'`) : src.includes(`capacidadDeCreacion('${c.id}')`);
      if (!la) sinPieza.push(`${c.id}@${sitio}`);
    }
  }
  check('B7) ninguna capacidad sin punto de entrada: cada sitio de cada una tiene la pieza que la enseña', sinPieza.length === 0, sinPieza.join(', '));
}

/* ═══ C · REPARTO, LUGARES Y OBJETOS ═════════════════════════════════════ */
console.log('\n── C · Crear de otra forma, guardar para reutilizar y el 3D cerrado, dentro de Reparto, Lugares y Objetos ──');
{
  const Fichas = cargar(`${P3}ProductionFichas.tsx`).default;
  const d0 = dibujar(hc(Fichas, { clase: 'personaje', espacio: conLaCuenta(), nuevoId: idsDeFichas.personaje }));
  check('C1) al lado de «Añadir personaje», «Crear de otra forma»', !!boton(d0, ES.filmmaker.wsCreateOther) && d0.campos.some((c) => c.etiqueta === ES.filmmaker.wsCastAdd));
  const soloLectura = dibujar(hc(Fichas, { clase: 'personaje', espacio: conLaCuenta({ editable: false }), nuevoId: idsDeFichas.personaje }));
  check('C1b) sin poder editar, no se ofrece', !boton(soloLectura, ES.filmmaker.wsCreateOther));

  recordar(true);
  const antesDeCrear = gestos3().length;
  boton(dibujar(hc(Fichas, { clase: 'personaje', espacio: conLaCuenta(), nuevoId: idsDeFichas.personaje })), ES.filmmaker.wsCreateOther).tocar();
  const hoja = dibujar(hc(Fichas, { clase: 'personaje', espacio: conLaCuenta(), nuevoId: idsDeFichas.personaje }));
  const formas = ['wsCreateFromSaved', 'wsCreateFromCreations', 'wsCreateWithImage', 'wsCreateIn3d', 'wsImport3d'].map((k) => boton(hoja, ES.filmmaker[k]));
  check('C2) se abre EN EL SITIO de la lista, con su título y las cinco formas', hoja.texto.includes(ES.filmmaker.wsCreateCharacterTitle) && formas.every(Boolean)
    && !hoja.campos.some((c) => c.etiqueta === ES.filmmaker.wsCastAdd), hoja.texto.slice(0, 300));
  check('C3) las cerradas dicen su porqué a la vista: la imagen (autorización), el 3D (proveedor) e importar (activación y visor)',
    ['wsCreateWithImageWhy', 'wsCreateIn3dWhy', 'wsImport3dWhy'].every((k) => hoja.texto.includes(ES.filmmaker[k].slice(0, 40))));
  const avisosAntes = avisos3().length;
  formas[3].tocar();
  check('C4) tocar una cerrada no hace nada en la producción: dice su porqué', gestos3().length === antesDeCrear && avisos3().length === avisosAntes + 1
    && avisos3().at(-1)?.[1] === ES.filmmaker.wsCreateIn3dWhy);

  /* Desde lo guardado: Alex todavía no está → ficha nueva, vinculada a su versión. */
  formas[0].tocar();
  const selector = dibujar(hc(Fichas, { clase: 'personaje', espacio: conLaCuenta(), nuevoId: idsDeFichas.personaje }));
  boton(selector, 'Alex').tocar();
  check('C5) desde lo guardado: la ficha nueva, con su nombre, vinculada a ESE guardado en su versión (dos operaciones de F1-A de siempre)',
    JSON.stringify(gestos3().at(-1)) === JSON.stringify([{ op: 'add_character', character: { id: 'ch_nuevo_0001', name: 'Alex' } }, { op: 'update_character', characterId: 'ch_nuevo_0001', changes: { element: { elementId: 'el_alex_0001', version: 2 } } }]),
    JSON.stringify(gestos3().at(-1)));
  recordar(false);

  /* Si ya está en la producción, es LA MISMA ficha: ni otra, ni un duplicado. */
  recordar(true);
  const conAlex = conLaCuenta({ produccion: produccionUI({ characters: [{ id: 'char-alex', name: 'Alex', element: { elementId: 'el_alex_0001', version: 2 } }] }) });
  boton(dibujar(hc(Fichas, { clase: 'personaje', espacio: conAlex, nuevoId: idsDeFichas.personaje })), ES.filmmaker.wsCreateOther).tocar();
  boton(dibujar(hc(Fichas, { clase: 'personaje', espacio: conAlex, nuevoId: idsDeFichas.personaje })), ES.filmmaker.wsCreateFromSaved).tocar();
  const antesDeRepetir = gestos3().length;
  boton(dibujar(hc(Fichas, { clase: 'personaje', espacio: conAlex, nuevoId: idsDeFichas.personaje })), 'Alex').tocar();
  const despues = dibujar(hc(Fichas, { clase: 'personaje', espacio: conAlex, nuevoId: idsDeFichas.personaje }));
  check('C6) un guardado que ya está en la producción no crea otra ficha: se dice, y se abre la que había', gestos3().length === antesDeRepetir
    && despues.texto.includes('Ya está en esta producción: «Alex»'));
  recordar(false);

  /* Desde Mis creaciones: el nombre, luego la imagen; se guarda en la cuenta APUNTANDO al material (sin copiarlo) y entra vinculada. */
  recordar(true);
  pedidasAElements = [];
  const conCuenta = conLaCuenta();
  boton(dibujar(hc(Fichas, { clase: 'personaje', espacio: conCuenta, nuevoId: idsDeFichas.personaje })), ES.filmmaker.wsCreateOther).tocar();
  boton(dibujar(hc(Fichas, { clase: 'personaje', espacio: conCuenta, nuevoId: idsDeFichas.personaje })), ES.filmmaker.wsCreateFromCreations).tocar();
  dibujar(hc(Fichas, { clase: 'personaje', espacio: conCuenta, nuevoId: idsDeFichas.personaje })).campos.find((c) => c.etiqueta === ES.filmmaker.wsCreateNameFirst).onGuardar('Alex');
  const conNombre = dibujar(hc(Fichas, { clase: 'personaje', espacio: conCuenta, nuevoId: idsDeFichas.personaje }));
  check('C7) con el nombre dado, se elige qué será: imágenes y modelos 3D de Mis creaciones (la biblioteca de siempre)',
    conNombre.texto.includes('Elige qué será «Alex».') && !!boton(conNombre, t('creaciones.kindImage')) && !!boton(conNombre, t('creaciones.kindModel3d')));
  const antesDeGuardar = gestos3().length;
  boton(conNombre, ES.filmmaker.wsCreateUse.replace('{{nombre}}', 'Retrato de Alex')).tocar();
  await calma();
  const pedida = pedidasAElements[0];
  check('C8) se guarda en la cuenta como PERSONAJE, con su nombre y el material como principal —su id, no una copia ni una URL—',
    pedidasAElements.length === 1 && pedida.type === 'character' && pedida.name === 'Alex' && pedida.elementId === undefined
    && JSON.stringify(pedida.refs) === JSON.stringify([{ assetId: 'asset_retrato_0001', role: 'primary', kind: 'image' }]), JSON.stringify(pedida));
  check('C9) y entra en el reparto vinculada a lo que el servidor guardó, en su versión',
    gestos3().length === antesDeGuardar + 1 && JSON.stringify(gestos3().at(-1)) === JSON.stringify([
      { op: 'add_character', character: { id: 'ch_nuevo_0001', name: 'Alex' } },
      { op: 'update_character', characterId: 'ch_nuevo_0001', changes: { element: { elementId: ID_DEL_SERVIDOR, version: 1 } } },
    ]), JSON.stringify(gestos3().at(-1)));
  recordar(false);
  const ES_SRV = cargar('services/elementsService.ts');
  const HOOK_EL = sinComentarios(leer('hooks/useElementosParaVincular.ts'));
  check('C9b) el id de lo guardado lo pone el hook —con la forma que admite el Core—, no la pieza (regla de la Fase 24)',
    /elementId: nuevo\.elementId \?\? nuevoIdDeElemento\(\)/.test(HOOK_EL) && /^el_[A-Za-z0-9]{16}$/.test(ES_SRV.nuevoIdDeElemento())
    && !/from '\.\.\/\.\.\/\.\.\/services\/elementsService'/.test(sinComentarios(leer(`${P3}ProductionFichas.tsx`)).replace(/import type [^;]*;/g, '')));

  /* Guardar para reutilizar: una ficha sin vincular, con su descripción y sus referencias. */
  pedidasAElements = [];
  const conRefs = conLaCuenta({ produccion: produccionUI({
    objects: [{ id: 'obj-caja', name: 'La caja', kind: 'product', description: 'Una caja de galletas', referenceIds: ['ref-a', 'ref-b', 'ref-sin'] }],
    references: [{ id: 'ref-a', kind: 'image', assetId: 'asset_caja_frente' }, { id: 'ref-b', kind: 'model3d', assetId: 'asset_caja_glb' }, { id: 'ref-sin', kind: 'image' }],
  }) });
  recordar(true);
  dibujar(hc(Fichas, { clase: 'objeto', espacio: conRefs, nuevoId: idsDeFichas.objeto })).botones.find((b) => b.etiqueta === t('filmmaker.wsCardOpen', { nombre: 'La caja' })).tocar();
  const abierta = dibujar(hc(Fichas, { clase: 'objeto', espacio: conRefs, nuevoId: idsDeFichas.objeto }));
  const antesDeReutilizar = gestos3().length;
  boton(abierta, ES.filmmaker.wsSaveForReuse).tocar();
  await calma();
  const guardada = pedidasAElements[0];
  check('C10) «Guardar para reutilizar»: un objeto que es un producto se guarda como PRODUCTO (así lo encontrará Weë Design), con su nombre y lo que dice',
    guardada?.type === 'product' && guardada.name === 'La caja' && guardada.description === 'Una caja de galletas', JSON.stringify(guardada));
  check('C11) con los materiales de sus referencias —el primero, principal; el modelo 3D también—, y ninguna sin material',
    JSON.stringify(guardada?.refs) === JSON.stringify([{ assetId: 'asset_caja_frente', role: 'primary', kind: 'image' }, { assetId: 'asset_caja_glb', role: 'reference', kind: 'model3d' }]));
  check('C12) y la ficha queda vinculada a lo guardado, en su versión', JSON.stringify(gestos3().at(-1)) === JSON.stringify([{ op: 'update_object', objectId: 'obj-caja', changes: { element: { elementId: ID_DEL_SERVIDOR, version: 1 } } }])
    && gestos3().length === antesDeReutilizar + 1 && dibujar(hc(Fichas, { clase: 'objeto', espacio: conRefs, nuevoId: idsDeFichas.objeto })).texto.includes('Guardado en tu cuenta como «La caja»'));
  /* Un fallo del servidor se dice y no vincula nada. */
  respuestaDeElements = async () => ({ ok: false, motivo: 'material' });
  const antesDelFallo = gestos3().length;
  boton(dibujar(hc(Fichas, { clase: 'objeto', espacio: conRefs, nuevoId: idsDeFichas.objeto })), ES.filmmaker.wsSaveForReuse).tocar();
  await calma();
  check('C13) si un material no es de la cuenta o ya no está, se dice así y no se vincula nada', gestos3().length === antesDelFallo
    && dibujar(hc(Fichas, { clase: 'objeto', espacio: conRefs, nuevoId: idsDeFichas.objeto })).texto.includes(ES.filmmaker.wsSaveFailedMaterial));
  respuestaDeElements = async (n) => ({ ok: true, elemento: { elementId: n.elementId ?? ID_DEL_SERVIDOR, type: n.type, name: n.name, version: 1 } });
  check('C14) su versión 3D, cerrada con su porqué, en cada ficha', !!boton(abierta, ES.filmmaker.wsCreateVersion3d));
  recordar(false);

  recordar(true);
  const lugar = conLaCuenta();
  dibujar(hc(Fichas, { clase: 'lugar', espacio: lugar, nuevoId: idsDeFichas.lugar })).botones.find((b) => b.etiqueta === t('filmmaker.wsCardOpen', { nombre: 'El faro' })).tocar();
  const faro = dibujar(hc(Fichas, { clase: 'lugar', espacio: lugar, nuevoId: idsDeFichas.lugar }));
  const antesDeLaEscena = [gestos3().length, avisos3().length];
  boton(faro, ES.filmmaker.wsOpenScene3d).tocar();
  check('C15) un lugar, además, «Abrir la escena 3D»: cerrada, dice su porqué y no toca la producción',
    gestos3().length === antesDeLaEscena[0] && avisos3().length === antesDeLaEscena[1] + 1 && avisos3().at(-1)?.[1] === ES.filmmaker.wsScene3dWhy);
  check('C16) una ficha ya vinculada no ofrece guardarla otra vez (no se duplica lo guardado)',
    !boton(dibujar(hc(Fichas, { clase: 'personaje', espacio: conAlex, nuevoId: idsDeFichas.personaje })), ES.filmmaker.wsSaveForReuse));
  recordar(false);
}

/* ═══ D · EL PLANO ═══════════════════════════════════════════════════════ */
console.log('\n── D · Desde lo guardado, en el plano: el MISMO ID si ya está (la continuidad por identidad) ──');
{
  const EnElPlano = cargar(`${P3}ProductionEnElPlano.tsx`).default;
  const conAlexEnLaProduccion = () => conLaCuenta({ produccion: produccionUI({ characters: [{ id: 'char-mar', name: 'Mar' }, { id: 'char-luna', name: 'Luna' }, { id: 'char-alex', name: 'Alex', element: { elementId: 'el_alex_0001', version: 2 } }] }) });
  const d0 = dibujar(hc(EnElPlano, { espacio: conLaCuenta() }));
  check('D1) «Desde tus guardados» en quién sale, qué hay y dónde', d0.botones.filter((b) => b.etiqueta === ES.filmmaker.wsShotFromSaved).length === 3);
  recordar(true);
  const e1 = conAlexEnLaProduccion();
  dibujar(hc(EnElPlano, { espacio: e1 })).botones.filter((b) => b.etiqueta === ES.filmmaker.wsShotFromSaved)[0].tocar();
  boton(dibujar(hc(EnElPlano, { espacio: e1 })), 'Alex').tocar();
  check('D2) Alex ya está en la producción: entra ESA ficha en el plano —su ID—, sin crear otra',
    JSON.stringify(gestos3().at(-1)) === JSON.stringify([{ op: 'update_shot', shotId: 'sh-0101', changes: { characterIds: ['char-luna', 'char-alex'] } }]), JSON.stringify(gestos3().at(-1)));
  recordar(false);
  recordar(true);
  const e2 = conLaCuenta();
  dibujar(hc(EnElPlano, { espacio: e2 })).botones.filter((b) => b.etiqueta === ES.filmmaker.wsShotFromSaved)[0].tocar();
  boton(dibujar(hc(EnElPlano, { espacio: e2 })), 'Alex').tocar();
  check('D3) Alex no está: la ficha nueva, vinculada a su versión, y entra en el plano, en UN gesto',
    JSON.stringify(gestos3().at(-1)) === JSON.stringify([
      { op: 'add_character', character: { id: 'ch_nuevo_0001', name: 'Alex' } },
      { op: 'update_character', characterId: 'ch_nuevo_0001', changes: { element: { elementId: 'el_alex_0001', version: 2 } } },
      { op: 'update_shot', shotId: 'sh-0101', changes: { characterIds: ['char-luna', 'ch_nuevo_0001'] } },
    ]), JSON.stringify(gestos3().at(-1)));
  recordar(false);
  recordar(true);
  const e3 = conLaCuenta();
  dibujar(hc(EnElPlano, { espacio: e3 })).botones.filter((b) => b.etiqueta === ES.filmmaker.wsShotFromSaved)[1].tocar();
  boton(dibujar(hc(EnElPlano, { espacio: e3 })), 'Espada').tocar();
  check('D4) un objeto: su ficha, vinculada, y en lo que hay en el plano',
    JSON.stringify(gestos3().at(-1)) === JSON.stringify([
      { op: 'add_object', object: { id: 'ob_nuevo_0001', name: 'Espada' } },
      { op: 'update_object', objectId: 'ob_nuevo_0001', changes: { element: { elementId: 'el_espada_0001', version: 4 } } },
      { op: 'update_shot', shotId: 'sh-0101', changes: { objectIds: ['ob_nuevo_0001'] } },
    ]), JSON.stringify(gestos3().at(-1)));
  recordar(false);
  recordar(true);
  const e4 = conLaCuenta();
  dibujar(hc(EnElPlano, { espacio: e4 })).botones.filter((b) => b.etiqueta === ES.filmmaker.wsShotFromSaved)[2].tocar();
  boton(dibujar(hc(EnElPlano, { espacio: e4 })), 'Ciudad futurista').tocar();
  check('D5) un lugar: su ficha, vinculada, y es el lugar de la escena',
    JSON.stringify(gestos3().at(-1)) === JSON.stringify([
      { op: 'add_location', location: { id: 'lc_nuevo_0001', name: 'Ciudad futurista' } },
      { op: 'update_location', locationId: 'lc_nuevo_0001', changes: { element: { elementId: 'el_ciudad_0001', version: 1 } } },
      { op: 'change_location', sceneId: 'sc-0001', locationId: 'lc_nuevo_0001' },
    ]), JSON.stringify(gestos3().at(-1)));
  recordar(false);
  recordar(true);
  const escena = conLaCuenta({ seleccion: { tipo: 'escena', id: 'sc-0001' } });
  dibujar(hc(EnElPlano, { espacio: escena })).botones.filter((b) => b.etiqueta === ES.filmmaker.wsShotFromSaved)[0].tocar();
  boton(dibujar(hc(EnElPlano, { espacio: escena })), 'Alex').tocar();
  check('D6) con una escena elegida, entra en la escena', JSON.stringify(gestos3().at(-1)?.at(-1)) === JSON.stringify({ op: 'update_scene', sceneId: 'sc-0001', changes: { characterIds: ['char-luna', 'ch_nuevo_0001'] } }));
  recordar(false);
  const antesDeLaPuesta = [gestos3().length, avisos3().length];
  boton(d0, ES.filmmaker.wsScene3d).tocar();
  check('D7) la puesta en escena en 3D, en el plano: cerrada, dice su porqué (un aviso más, el suyo), no toca nada',
    gestos3().length === antesDeLaPuesta[0] && avisos3().length === antesDeLaPuesta[1] + 1 && avisos3().at(-1)?.[1] === ES.filmmaker.wsScene3dWhy);
  check('D8) sin lo guardado de la cuenta (o sin ids), no se ofrece: nada de botones que no llegan', dibujar(hc(EnElPlano, { espacio: espacioCon() })).botones.every((b) => b.etiqueta !== ES.filmmaker.wsShotFromSaved));
  check('D9) el teléfono lleva las mismas piezas: «Proyecto» monta el proyecto y «Ajustes» las propiedades del plano (con quién sale, qué hay y dónde)',
    /vista === 'proyecto' && <ProductionProyecto/.test(sinComentarios(leer(`${P3}ProductionMobileEditor.tsx`))) && /<ProductionEnElPlano espacio=\{espacio\} \/>/.test(sinComentarios(leer(`${P3}ProductionShotProperties.tsx`))));
}

/* ═══ E · REFERENCIAS Y MIS CREACIONES ═══════════════════════════════════ */
console.log('\n── E · El modelo 3D: cerrado como referencia de la toma, disponible como cosa guardada ──');
{
  const Sel = cargar(`${P3}ProductionSelectorDeCreaciones.tsx`).default;
  const ref = dibujar(hc(Sel, { creaciones: creacionesCon([RETRATO]), onElegirCreacion() {}, onElegirGuardado() {}, onVolver() {} }));
  const antes = avisos3().length;
  boton(ref, ES.filmmaker.wsReference3d).tocar();
  check('E1) en Referencias, «Modelo 3D» se enseña cerrado y dice su porqué (ninguna toma recibe 3D)', avisos3().length === antes + 1 && avisos3().at(-1)?.[1] === ES.filmmaker.wsReference3dWhy
    && ['kindImage', 'kindVideo', 'kindAudio'].every((k) => !!boton(ref, t(`creaciones.${k}`))));
  const crear = dibujar(hc(Sel, { creaciones: creacionesCon([MODELO], 'model3d'), clases: ['image', 'model3d'], titulo: 'x', onElegirCreacion() {}, onElegirGuardado() {}, onVolver() {} }));
  check('E2) al crear algo desde Mis creaciones, los modelos 3D de la cuenta se pueden elegir (y no hay otra biblioteca)', !!boton(crear, t('creaciones.kindModel3d')) && !boton(crear, ES.filmmaker.wsReference3d)
    && !!boton(crear, ES.filmmaker.wsRefUse.replace('{{nombre}}', 'Robot')));
  const hook = sinComentarios(leer('hooks/useCreacionesParaReferencia.ts'));
  check('E3) Mis creaciones se piden como siempre —`assetsService.listar` por clase—; `model3d` es una clase más', /export type ClaseDeReferencia = 'image' \| 'video' \| 'audio' \| 'model3d';/.test(hook) && /assetsService\.listar/.test(hook));
}

/* ═══ F · WEË BRAIN ══════════════════════════════════════════════════════ */
console.log('\n── F · «Detectar el reparto»: propone; decide la persona ──');
{
  const { atajosDelDirector } = cargar('utils/atajosDelDirector.ts');
  const vacia = atajosDelDirector({ scenes: [] }, null);
  const llena = atajosDelDirector({ scenes: [{ shots: [{}, {}] }] }, { escena: 1, plano: 1 });
  check('F1) está en la caja de siempre, con y sin escenas', vacia.some((a) => a.id === 'reparto') && llena.some((a) => a.id === 'reparto'));
  const texto = ES.filmmaker.wsBrainQuickCastText;
  check('F2) pide PROPONER fichas —personajes, lugares y objetos que faltan— y ni escenas ni planos', /Propón añadir como fichas/.test(texto) && /No propongas escenas ni planos/.test(texto) && /personajes, lugares y objetos/.test(texto));
  const caja = sinComentarios(leer(`${P3}ProductionBrainBox.tsx`));
  check('F3) una puerta rápida solo rellena la caja: enviar y aplicar siguen siendo de la persona (Fase 34)', !/enviar\(\s*atajo|aplicar\(\s*atajo/.test(caja) && /atajosDelDirector\(/.test(caja));
}

/* ═══ G · EL SERVIDOR DE VERDAD ══════════════════════════════════════════ */
console.log('\n── G · Dueño, archivado, clase, versión, reutilización sin copias y continuidad por ID ──');
{
  const Rt = lib('elements/index.js');
  const nucleo3 = lib('core/index.js');
  const puertaP = lib('productions/puerta.js');
  const FICHAS3 = {
    glb_robot: { assetId: 'glb_robot', ownerAccountId: A, kind: 'model3d', status: 'ready' },
    glb_ajeno: { assetId: 'glb_ajeno', ownerAccountId: B, kind: 'model3d', status: 'ready' },
    glb_subiendo: { assetId: 'glb_subiendo', ownerAccountId: A, kind: 'model3d', status: 'uploading' },
    img_robot: { assetId: 'img_robot', ownerAccountId: A, kind: 'image', status: 'ready' },
  };
  const deps3 = { db: base, material: async (id) => FICHAS3[id] ?? null };
  const nuevo3 = (extra = {}) => ({ accountId: A, elementId: 'el_robot_0001', type: 'character', name: 'Robot rojo', refs: [{ assetId: 'glb_robot', role: 'primary', kind: 'model3d' }, { assetId: 'img_robot', role: 'reference', kind: 'image' }], at: HOY, ...extra });
  const materialesAntes = base.de('assets').length;
  const creado = await Rt.crearElemento(nuevo3(), deps3);
  check('G1) un personaje guardado con su modelo 3D (y una vista): un Element de la cuenta que APUNTA al material `model3d`',
    creado.status === 'creado' && creado.element.ownerAccountId === A && creado.element.refs.some((r) => r.kind === 'model3d' && r.assetId === 'glb_robot') && nucleo3.elementoValido(creado.element),
    JSON.stringify(creado).slice(0, 200));
  check('G2) sin copiar ni un material: la colección de materiales, igual', base.de('assets').length === materialesAntes);
  const ajeno = await Rt.crearElemento(nuevo3({ elementId: 'el_robot_ajeno', refs: [{ assetId: 'glb_ajeno', role: 'primary', kind: 'model3d' }] }), deps3);
  const subiendo = await Rt.crearElemento(nuevo3({ elementId: 'el_robot_subiendo', refs: [{ assetId: 'glb_subiendo', role: 'primary', kind: 'model3d' }] }), deps3);
  const otraClase = await Rt.crearElemento(nuevo3({ elementId: 'el_robot_clase', refs: [{ assetId: 'glb_robot', role: 'primary', kind: 'image' }] }), deps3);
  const fantasma = await Rt.crearElemento(nuevo3({ elementId: 'el_robot_fantasma', refs: [{ assetId: 'glb_nada', role: 'primary', kind: 'model3d' }] }), deps3);
  check('G3) un modelo de otra cuenta, uno a medio subir, uno declarado como otra clase o uno que no existe: rechazados, sin guardar nada',
    [ajeno, subiendo, otraClase, fantasma].every((r) => r.status === 'material_rechazado') && !base.leer('elements/el_robot_ajeno') && !base.leer('elements/el_robot_fantasma'),
    [ajeno, subiendo, otraClase, fantasma].map((r) => r.status).join(','));
  /* Reutilizado en DOS producciones, y en DOS escenas y DOS planos de una de ellas: siempre el mismo Element, sin copias. */
  const dosEscenas = () => clon({
    ...M.produccionVacia({ title: 'Robot', aspectRatio: '16:9', resolution: '720p' }),
    intent: { objective: 'Un robot humanoide rojo en una ciudad futurista' },
    characters: [{ id: 'char-robot', name: 'Robot rojo', identityDescription: 'Un robot humanoide rojo' }],
    scenes: [
      { id: 'sc-0001', order: 0, description: 'El robot camina', characterIds: ['char-robot'], shots: [{ id: 'sh-0101', order: 0, durationSec: 4, description: 'Se acerca' }, { id: 'sh-0102', order: 1, durationSec: 4, description: 'Mira arriba' }] },
      { id: 'sc-0002', order: 1, description: 'El robot se sienta', characterIds: ['char-robot'], shots: [{ id: 'sh-0201', order: 0, durationSec: 4, description: 'Se sienta' }] },
    ],
  });
  const vincular3 = (uid, k, revision) => intento(() => puertaP.productions.run({ auth: { uid }, data: { op: 'apply', productionId: pid(k), expectedRevision: revision,
    operations: [{ op: 'update_character', characterId: 'char-robot', changes: { element: { elementId: 'el_robot_0001', version: 1 } } }], operationId: `op-3d-${k}-${revision}` } }));
  await crear(A, 301, dosEscenas());
  await crear(A, 302, dosEscenas());
  const r301 = (await producciones.leerProduccion(A, pid(301), { db: base })).view;
  const r302 = (await producciones.leerProduccion(A, pid(302), { db: base })).view;
  const v1 = await vincular3(A, 301, r301.revision);
  const v2 = await vincular3(A, 302, r302.revision);
  const p301 = (await producciones.leerProduccion(A, pid(301), { db: base })).view.production;
  const p302 = (await producciones.leerProduccion(A, pid(302), { db: base })).view.production;
  check('G4) el MISMO guardado en dos producciones: las dos lo vinculan, las dos apuntan a él, y sigue siendo uno',
    v1.ok && v2.ok && p301.characters[0].element?.elementId === 'el_robot_0001' && p302.characters[0].element?.elementId === 'el_robot_0001'
    && base.de('elements').filter((e) => e.elementId === 'el_robot_0001').length === 1, `${codigo(v1)} · ${codigo(v2)}`);
  const req = Rq.requisitosDeProduccion(p301);
  const quien = (unitId) => req.ok ? req.requirements.shots.find((s) => s.unitId === unitId)?.input?.characters?.[0] : undefined;
  check('G5) la continuidad por identidad: en los tres planos de sus dos escenas sale la MISMA ficha, con el MISMO Element',
    ['sh-0101', 'sh-0102', 'sh-0201'].every((u) => quien(u)?.id === 'char-robot' && quien(u)?.definition?.element?.elementId === 'el_robot_0001'),
    JSON.stringify(['sh-0101', 'sh-0102', 'sh-0201'].map((u) => quien(u)?.id)));
  const ajenoEl = { contract: nucleo3.ELEMENT_CONTRACT_VERSION, elementId: 'el_robot_de_b', type: 'character', version: 1, status: 'active', name: 'De B', refs: [], ownerAccountId: B, createdAt: HOY, updatedAt: HOY };
  base.docs.set('elements/el_robot_de_b', ajenoEl);
  await crear(A, 303, dosEscenas());
  const r303 = (await producciones.leerProduccion(A, pid(303), { db: base })).view.revision;
  const conAjeno = await intento(() => puertaP.productions.run({ auth: { uid: A }, data: { op: 'apply', productionId: pid(303), expectedRevision: r303,
    operations: [{ op: 'update_character', characterId: 'char-robot', changes: { element: { elementId: 'el_robot_de_b', version: 1 } } }], operationId: 'op-3d-ajeno' } }));
  await Rt.archivarElemento(A, 'el_robot_0001', HOY + 1, { db: base });
  const conArchivado = await intento(() => puertaP.productions.run({ auth: { uid: A }, data: { op: 'apply', productionId: pid(303), expectedRevision: r303,
    operations: [{ op: 'update_character', characterId: 'char-robot', changes: { element: { elementId: 'el_robot_0001', version: 1 } } }], operationId: 'op-3d-archivado' } }));
  const reason = (r) => r.error?.details?.problems?.[0]?.parameters?.reason;
  check('G6) el guardado de OTRA cuenta no se vincula (y contesta lo mismo que uno que no existe); uno archivado, tampoco',
    !conAjeno.ok && reason(conAjeno) === 'not_found' && !conArchivado.ok && reason(conArchivado) === 'archived', `${reason(conAjeno)} · ${reason(conArchivado)}`);
  const p301b = (await producciones.leerProduccion(A, pid(301), { db: base })).view.production;
  check('G7) archivar lo guardado no rompe lo que ya lo usaba ni borra un material', p301b.characters[0].element?.elementId === 'el_robot_0001' && base.de('assets').length === materialesAntes);
}

/* ═══ H · EL CATÁLOGO Y EL REGISTRO ══════════════════════════════════════ */
console.log('\n── H · El 3D, declarado en el Gran Motor: sin proveedor, sin cadena y sin puerta ──');
{
  const reg = lib('registry/index.js').registroDeWee();
  const TRES_D = ['3d.generate', '3d.edit', '3d.analyze', '3d.texture', '3d.retopology', '3d.rig', '3d.convert', '3d.export'];
  check('H1) las capacidades 3D del catálogo siguen DECLARED y sin una sola implementación', TRES_D.every((id) => entradaDelCatalogo(id)?.status === 'DECLARED' && reg.findImplementations(id).length === 0));
  const pendientes = lib('registry/index.js').datosDelRegistro().providers.filter((p) => p.status === 'PENDING');
  check('H2) las matrices 3D candidatas —Tripo, Hunyuan 3D, Meshy y World Labs— siguen PENDING, sin capacidades ni modelos: nada puede elegirlas', ['tripo', 'hunyuan3d', 'meshy', 'worldlabs'].every((id) => pendientes.some((p) => p.id === id))
    && pendientes.every((p) => p.capabilities.length === 0 && reg.getProviderModels(p.id).length === 0));
  const motor = lib('engine/registry.js');
  check('H3) el motor no enruta 3D: ninguna cadena para una capacidad 3D', Object.keys(motor.DEFAULT_ROUTING).every((c) => !c.startsWith('3d.')));
}

/* ═══ I · LOS TEXTOS ═════════════════════════════════════════════════════ */
console.log('\n── I · Los textos, en los once diccionarios (pt, de Brasil; pt-PT, aparte) ──');
{
  const CLAVES = ['wsCreateOther', 'wsCreateCharacterTitle', 'wsCreatePlaceTitle', 'wsCreateObjectTitle', 'wsCreateFromSaved', 'wsCreateFromSavedText', 'wsCreateFromCreations',
    'wsCreateFromCreationsText', 'wsCreateWithImage', 'wsCreateWithImageText', 'wsCreateWithImageWhy', 'wsCreateIn3d', 'wsCreateIn3dText', 'wsCreateIn3dWhy', 'wsImport3d',
    'wsImport3dText', 'wsImport3dWhy', 'wsCreateNameFirst', 'wsCreateNext', 'wsCreatePickFor', 'wsCreateSaving', 'wsCreateAlreadyHere', 'wsSaveForReuse', 'wsSaveForReuseDone',
    'wsSaveFailedMaterial', 'wsSaveFailedShape', 'wsSaveFailedNoAnswer', 'wsCreateVersion3d', 'wsOpenScene3d', 'wsScene3d', 'wsScene3dWhy', 'wsReference3d', 'wsReference3dWhy',
    'wsShotFromSaved', 'wsBrainQuickCast', 'wsBrainQuickCastText', 'wsCreateUse'];
  const faltanAqui = [];
  for (const l of ['es', 'en', 'pt', 'pt-PT', 'fr', 'de', 'it', 'ru', 'ko', 'zh', 'zh-TW']) {
    const src = leer(`i18n/textos/${l}/filmmaker.ts`);
    for (const k of CLAVES) if (!new RegExp(`^  ${k}: '`, 'm').test(src)) faltanAqui.push(`${l}:${k}`);
  }
  check(`I1) las ${CLAVES.length} claves, en los once`, faltanAqui.length === 0, faltanAqui.slice(0, 8).join(', '));
  const pt = leer('i18n/textos/pt/filmmaker.ts'); const ptPT = leer('i18n/textos/pt-PT/filmmaker.ts');
  check('I2) pt es de Brasil —«arquivo», «você salvou»— y pt-PT, europeo —«ficheiro», «tens guardado»—',
    /wsImport3dText: 'Um arquivo GLB/.test(pt) && /wsCreateFromSaved: 'Do que você salvou'/.test(pt) && /wsImport3dText: 'Um ficheiro GLB/.test(ptPT) && /wsCreateFromSaved: 'Do que tens guardado'/.test(ptPT));
  check('I3) las marcas no se traducen', ['en', 'fr', 'de', 'ko', 'zh'].every((l) => /Weë/.test(leer(`i18n/textos/${l}/filmmaker.ts`).match(/wsCreateIn3dText: '[^']*'/)?.[0] ?? '')));
}

/* ═══ J · LAS GUARDAS ════════════════════════════════════════════════════ */
console.log('\n── J · Ni un contrato de F1, ni el motor, ni un proveedor, ni una puerta ──');
{
  const servidor = git(`diff --name-only ${TRAMO3D} -- functions/src firestore.rules storage.rules firestore.indexes.json`).trim().split('\n').filter(Boolean);
  check('J1) del servidor solo cambia el registro de matrices candidatas (PENDING): ni F1-A/B/C/D, ni el Core, ni el motor, ni Credits, ni reglas',
    servidor.every((f) => f === 'functions/src/registry/matrices.ts'), servidor.join(', '));
  const espejo = git(`diff --name-only ${TRAMO3D} -- services/filmmaker/espejo`).trim();
  check('J2) el espejo de F1-A, idéntico', espejo === '', espejo);
  const pk = JSON.parse(leer('package.json'));
  check('J3) ni una dependencia nueva (ningún visor 3D metido a escondidas)', git(`diff ${TRAMO3D} -- package.json package-lock.json`).trim() === '' && !Object.keys({ ...pk.dependencies, ...pk.devDependencies }).some((k) => /three|model-viewer|webview/.test(k)));
  check('J4) esta suite está en la cadena de `npm test`', /test\/filmmaker-3d-assets\.test\.mjs/.test(leer('functions/package.json')));
  check('J5) en todo lo dibujado no faltó ni una clave', faltan.size === 0, [...faltan].join(', '));
  /* La matriz maestra y la documentación, al día con lo que el código hace. */
  const MAESTRA = leer('docs/FILMMAKER-CAPABILITY-MASTER.md');
  const estadoEnLaMatriz = (id) => (MAESTRA.split('\n').find((l) => l.startsWith(`| ${id} |`)) ?? '').split(' | ')[8];
  const ESPERADO = { T01: 'A', T02: 'A', T03: 'A', T04: 'A', T05: 'A', T06: 'G', T07: 'E', T08: 'G', T09: 'F', T10: 'G', T11: 'G', T12: 'F', I11: 'F' };
  const distintos = Object.entries(ESPERADO).filter(([id, e]) => estadoEnLaMatriz(id) !== e);
  check('J6) la matriz maestra dice lo que el código hace: T01–T05 usables, lo cerrado con su letra, y la escena 3D (I11) ya dentro del mapa', distintos.length === 0,
    distintos.map(([id, e]) => `${id}:${estadoEnLaMatriz(id)}≠${e}`).join(', '));
  const DOC3D = leer('docs/FILMMAKER-3D.md');
  check('J7) documentado: la sección de la fase en FILMMAKER.md y el mapa completo, con proveedores, contratos y canaries',
    /\n### 3D dentro de Filmmaker · /.test(leer('docs/FILMMAKER.md')) && ['## A. ', '## B. ', '## C. ', '### C.2 Proveedores', '## D. ', '## E. ', '## F. ', '## G. ', '## H. '].every((x) => DOC3D.includes(x))
    && /No se creó ninguna sección, pestaña, pantalla, ruta, workspace, biblioteca ni motor 3D/.test(DOC3D));
}

console.log(failures ? `\n✘ filmmaker-3d-assets: ${n - failures}/${n}` : `\n✔ filmmaker-3d-assets: ${n}/${n}`);
if (failures) process.exit(1);
