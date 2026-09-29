/**
 * FILMMAKER ENGINE · FASE 29 — GENERAR LA PRODUCCIÓN ENTERA (el lote de la Fase 6, en Weë AI Director).
 *
 *   V · el servicio: la misma callable `generateVideo` con la producción GUARDADA —mirar con `cotizar`, generar por
 *       el total que se enseñó—, sin un id ni un texto; y la forma y el tope, los del servidor;
 *   H · el hook: se mira antes, se genera por lo mirado, un precio que cambió se vuelve a mirar y se dice, y lo mirado
 *       caduca con otra revisión, otra calidad u otras unidades; parado con cambios sin guardar;
 *   P · la sección: qué pasaría con cada plano, el total con su plural, el saldo, preguntar antes con el total
 *       delante, y lo que empezó y dónde se paró;
 *   D · dónde está: en el Director, donde había un «Generar» apagado, en el escritorio y en el teléfono;
 *   X · las guardas: nada del servidor; la sección no llama ni cobra; las frases del «Generar» apagado, fuera.
 *
 * El código de la app, con dobles de React Native y de Firebase y el traductor con el español de verdad; el arnés, el
 * de `f1d-postcanary.test.mjs`, copiado.
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

/* ═══ FASE 29 · lo que se prueba aquí ═══════════════════════════════════════ */
/** El último commit antes de esta fase. */
const ANTES = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 28 "').trim();
const HASTA = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 29 "').trim();
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

const PID = 'prodLote00000000000001';
const UNIDADES = [
  { sceneId: 'sc-0001', unitId: 'sh-0101', action: 'generate', take: 1, credits: 75 },
  { sceneId: 'sc-0001', unitId: 'sh-0102', action: 'done' },
];
const presupuestoDe = (extra = {}) => ({
  status: 'QUOTED_BATCH', productionId: PID, revision: 4, quality: 'standard',
  units: UNIDADES, total: { credits: 75, units: 1 }, skipped: { done: 1, inFlight: 0, blocked: 0 },
  balance: 240, enough: true, ...extra,
});

/* ═══ V · EL SERVICIO ═════════════════════════════════════════════════════ */
console.log('\n── V · El servicio: la misma callable, con la producción guardada ──');
{
  const cargarServicio = crearCargador({ dobles: { ...dobles, './creditsService': { newRequestId: () => 'nunca' } } });
  const VS = cargarServicio('services/videoService.ts').videoService;
  respuestaDe = async () => ({ data: presupuestoDe() });
  const q = await VS.quoteBatch({ productionId: PID, revision: 4, quality: 'standard' });
  const pedidaQ = llamadas.at(-1);
  respuestaDe = async () => ({ data: { status: 'STARTED_BATCH', units: [{ sceneId: 'sc-0001', unitId: 'sh-0101', take: 1, status: 'ACCEPTED' }], started: 1 } });
  const g = await VS.generateBatch({ productionId: PID, revision: 4, quality: 'standard', units: ['sh-0101'] }, 75);
  const pedidaG = llamadas.at(-1);
  check('V1) mirar es `generateVideo` con la producción y `cotizar`, sin un id ni un texto',
    pedidaQ?.nombre === 'generateVideo' && JSON.stringify(pedidaQ.datos) === JSON.stringify({ produccion: { productionId: PID, revision: 4, quality: 'standard' }, cotizar: true })
    && q.ok === true && q.valor.total.credits === 75);
  check('V2) y generar, la misma producción —con sus unidades si no caben todas— por el total que se enseñó',
    JSON.stringify(pedidaG?.datos) === JSON.stringify({ produccion: { productionId: PID, revision: 4, quality: 'standard', units: ['sh-0101'] }, creditosCotizados: 75 })
    && g.ok === true && g.valor.started === 1);
  respuestaDe = async () => { throw Object.assign(new Error('x'), { code: 'functions/invalid-argument', details: { reason: 'price_changed', credits: 80 } }); };
  const cambio = await VS.generateBatch({ productionId: PID, revision: 4, quality: 'standard' }, 75);
  respuestaDe = async () => ({ data: {} });
  check('V3) lo que dice el servidor llega como motivo, con su detalle', cambio.ok === false && cambio.rechazo.motivo === 'price_changed' && cambio.rechazo.detalle?.credits === 80);
  const lotes = lib('creator/lotes.js');
  const CT = cargar('utils/controladorDeToma.ts');
  check('V4) el tope de la app es el del servidor (12, el cupo diario de vídeo)', CT.MAX_UNIDADES_POR_LOTE === lotes.MAX_UNIDADES_POR_LOTE && CT.MAX_UNIDADES_POR_LOTE === 12);
  const LS = leer('functions/src/creator/lotes.ts');
  check('V5) y la forma de lo que se manda es la que el servidor lee (`units`, no otra)', /const \{ productionId, revision, quality, units \} = crudo;/.test(LS));
}

/* ═══ H · EL HOOK ═════════════════════════════════════════════════════════ */
console.log('\n── H · El lote: se mira antes, se genera por lo mirado, y lo mirado caduca ──');
{
  const mini = miniReact();
  const memos = []; let im = 0;
  const useCallbackQueMemoiza = (fn, deps) => {
    const x = im++; const p = memos[x];
    if (p && deps && p.deps.length === deps.length && deps.every((d, i) => Object.is(d, p.deps[i]))) return p.fn;
    memos[x] = { fn, deps: deps ?? [] };
    return fn;
  };
  const useMemoQueMemoiza = (fn, deps) => { const x = im++; const p = memos[x]; if (p && deps && p.deps.length === deps.length && deps.every((d, i) => Object.is(d, p.deps[i]))) return p.v; const v = fn(); memos[x] = { v, deps: deps ?? [] }; return v; };
  const pedidas = [];
  let presupuestos = [presupuestoDe()];
  let generacion = { ok: true, valor: { status: 'STARTED_BATCH', units: [{ sceneId: 'sc-0001', unitId: 'sh-0101', take: 1, status: 'ACCEPTED' }], started: 1 } };
  const cargarHook = crearCargador({ dobles: {
    ...dobles,
    react: { ...React, ...mini.react, useCallback: useCallbackQueMemoiza, useMemo: useMemoQueMemoiza },
    '../services/videoService': { videoService: {
      quoteBatch: async (lote) => { pedidas.push(['mirar', lote]); const p = presupuestos.shift(); return p ? { ok: true, valor: p } : { ok: false, rechazo: { motivo: 'network' } }; },
      generateBatch: async (lote, creditos) => { pedidas.push(['generar', lote, creditos]); return generacion; },
    } },
  } });
  const H = cargarHook('hooks/useLoteDeTomas.ts');
  let guardada = { productionId: PID, revision: 4 };
  let bloqueado = false;
  let unidades;
  const pasar = () => { im = 0; return mini.pasar(H.useLoteDeTomas, guardada, bloqueado, unidades, unidades ? 12 : null); };
  let h = pasar();
  check('H1) al llegar no se pide nada: quieto, en «Estándar»', h.fase.fase === 'quieto' && h.calidad === 'standard' && h.disponible === true && pedidas.length === 0);
  h.presupuestar(); await calma();
  h = pasar();
  check('H2) mirar pide el presupuesto de ESA revisión y esa calidad, y lo enseña', h.fase.fase === 'presupuesto' && h.fase.presupuesto.total.credits === 75
    && JSON.stringify(pedidas[0]) === JSON.stringify(['mirar', { productionId: PID, revision: 4, quality: 'standard' }]));
  h.generar(); await calma();
  h = pasar();
  check('H3) generar va por el total que se enseñó, y dice lo que empezó', h.fase.fase === 'hecho' && h.fase.resultado.started === 1
    && JSON.stringify(pedidas[1]) === JSON.stringify(['generar', { productionId: PID, revision: 4, quality: 'standard' }, 75]));
  h.generar(); await calma();
  check('H4) y no se genera dos veces lo mismo: sin mirar otra vez, generar no hace nada', pedidas.length === 2);
  presupuestos = [presupuestoDe({ units: [UNIDADES[1]], total: { credits: 0, units: 0 } })];
  h = pasar(); h.presupuestar(); await calma();
  const antesDeNada = pedidas.length;
  h = pasar(); h.generar(); await calma();
  check('H4b) y si no hay nada que generar, generar no pide nada', pedidas.length === antesDeNada && pasar().fase.fase === 'presupuesto');
  presupuestos = [presupuestoDe(), presupuestoDe({ total: { credits: 80, units: 1 } })];
  generacion = { ok: false, rechazo: { motivo: 'price_changed', detalle: { credits: 80 } } };
  h = pasar(); h.presupuestar(); await calma();
  h = pasar(); h.generar(); await calma();
  h = pasar();
  check('H5) si el precio cambió, no se empezó ninguna: se vuelve a mirar y se dice', h.fase.fase === 'presupuesto' && h.fase.precioCambiado === true && h.fase.presupuesto.total.credits === 80
    && pedidas.at(-1)[0] === 'mirar');
  guardada = { productionId: PID, revision: 5 };
  pasar(); await calma();
  h = pasar();
  check('H6) otra revisión: lo mirado ya no vale y vuelve a quieto', h.fase.fase === 'quieto');
  bloqueado = true;
  h = pasar();
  const antes = pedidas.length;
  h.presupuestar(); await calma();
  check('H7) con cambios sin guardar no se mira ni se genera', h.disponible === false && pedidas.length === antes);
  bloqueado = false;
  unidades = ['sh-0101', 'sh-0103'];
  pasar(); await calma();
  presupuestos = [presupuestoDe()];
  h = pasar(); h.presupuestar(); await calma();
  check('H8) si no caben todas, se piden las elegidas, y se dice cuántas van', JSON.stringify(pedidas.at(-1)[1].units) === JSON.stringify(['sh-0101', 'sh-0103']) && pasar().recortado === 12);
  h = pasar(); h.elegirCalidad('high');
  h = pasar();
  check('H9) otra calidad: vuelve a quieto, para mirar con ella', h.calidad === 'high' && h.fase.fase === 'quieto');
  const HK = sinComentarios(leer('hooks/useLoteDeTomas.ts'));
  check('H10) el hook no cuenta tiempo, no pone ids ni precios', !/setTimeout|setInterval|Date\.now|Math\.random|newRequestId|requestId|priceVideo|credits\s*[-+*]/.test(HK));
}

/* ═══ P · LA SECCIÓN ══════════════════════════════════════════════════════ */
console.log('\n── P · «Generar la producción»: qué pasaría con cada plano, el total y el saldo, y se pregunta antes ──');
{
  const Lote = cargar('components/studio/produccion/ProductionLote.tsx').default;
  /* Una escena con cuatro planos: uno para cada cosa que puede pasar en el lote. */
  const base = produccionUI();
  const prod = { ...base, scenes: [{ ...base.scenes[0], shots: [0, 1, 2, 3].map((i) => ({ id: `sh-010${i + 1}`, order: i, durationSec: 4, description: `Plano número ${i + 1}` })) }] };
  const acciones = [];
  const lote = (extra = {}) => ({
    fase: { fase: 'quieto' }, calidad: 'standard', disponible: true, recortado: null,
    elegirCalidad: (c) => acciones.push(['calidad', c]), presupuestar: () => acciones.push(['mirar']), generar: () => acciones.push(['generar']), ...extra,
  });
  const ver = (l, editable = true) => dibujar(hc(Lote, { lote: l, produccion: prod, editable }));
  const quieto = ver(lote());
  check('P1) antes de mirar: la calidad y «Ver qué se generaría»; ni un precio', !!boton(quieto, 'Ver qué se generaría') && !!boton(quieto, 'Estándar') && !/Credits/.test(quieto.texto));
  boton(quieto, 'Ver qué se generaría').tocar();
  boton(quieto, 'Alta').tocar();
  check('P2) mirar lo pide, y la calidad se elige', JSON.stringify(acciones) === JSON.stringify([['mirar'], ['calidad', 'high']]));
  const conTodo = presupuestoDe({
    units: [
      ...UNIDADES,
      { sceneId: 'sc-0001', unitId: 'sh-0103', action: 'in_flight', reason: 'take_in_flight' },
      { sceneId: 'sc-0001', unitId: 'sh-0104', action: 'blocked', reason: 'route_unavailable' },
    ],
  });
  const mirado = ver(lote({ fase: { fase: 'presupuesto', presupuesto: conTodo } }));
  const RUTA = t('filmmaker.takeReasonRoute');
  check('P3) cada plano dice qué pasaría: se genera y por cuánto, ya tiene su vídeo, tiene una toma en marcha, o no se puede y por qué',
    /Escena 1 · Plano 1/.test(mirado.texto) && /Se genera: 75 Credits/.test(mirado.texto) && /Ya tiene su vídeo/.test(mirado.texto) && /Ya tiene una toma en marcha/.test(mirado.texto)
    && mirado.texto.includes(RUTA), mirado.texto.slice(0, 400));
  check('P4) el total, con su plural, y el saldo', /Se generaría 1 plano por 75 Credits\./.test(mirado.texto) && /Tienes 240 Credits\./.test(mirado.texto));
  confirmaciones.length = 0;
  respuestaDeConfirmar = false;
  boton(mirado, 'Generar por 75 Credits').tocar();
  await calma();
  const preguntado = confirmaciones.at(-1);
  check('P5) generar pregunta antes, con el total delante; y un «no» no genera', preguntado?.[0] === '¿Generar 1 plano por 75 Credits?' && /uno detrás de otro/.test(preguntado?.[1] ?? '') && !acciones.some((a) => a[0] === 'generar'));
  respuestaDeConfirmar = true;
  boton(mirado, 'Generar por 75 Credits').tocar();
  await calma();
  check('P6) y un «sí», sí', acciones.at(-1)?.[0] === 'generar');
  const sinSaldo = ver(lote({ fase: { fase: 'presupuesto', presupuesto: presupuestoDe({ balance: 40, enough: false }) } }));
  check('P7) sin saldo para todo: se dice cuánto falta y no se ofrece generar', /hacen falta 75 y tienes 40/.test(sinSaldo.texto) && boton(sinSaldo, 'Generar por 75 Credits')?.apagado === true);
  const sinSaberSaldo = ver(lote({ fase: { fase: 'presupuesto', presupuesto: presupuestoDe({ balance: null, enough: false }) } }));
  check('P8) si el servidor no pudo leer el saldo, no se inventa: se deja generar y el Credit Engine decide', boton(sinSaberSaldo, 'Generar por 75 Credits')?.apagado === false && !/Tienes/.test(sinSaberSaldo.texto));
  const nada = ver(lote({ fase: { fase: 'presupuesto', presupuesto: presupuestoDe({ units: [UNIDADES[1]], total: { credits: 0, units: 0 } }) } }));
  check('P9) si no hay nada que generar, se dice, y no hay botón de generar (solo volver a mirar)',
    /Ahora no hay ningún plano que generar/.test(nada.texto) && !boton(nada, 'Generar por 0 Credits') && !!boton(nada, 'Volver a mirar'));
  const archivada = ver(lote({ fase: { fase: 'presupuesto', presupuesto: presupuestoDe() } }), false);
  check('P10) en una producción que no se puede editar, no se genera', boton(archivada, 'Generar por 75 Credits')?.apagado === true);
  const parada = ver(lote({ fase: { fase: 'hecho', presupuesto: presupuestoDe(), resultado: { status: 'STARTED_BATCH', units: [{ sceneId: 'sc-0001', unitId: 'sh-0101', take: 1, status: 'FAILED', reason: 'RATE_LIMITED' }], started: 0, stoppedAt: 'sh-0101' } } }));
  check('P11) lo que empezó, y dónde se paró y por qué', /Empezaron 0 planos/.test(parada.texto) && /Se paró en Escena 1 · Plano 1:/.test(parada.texto) && parada.texto.includes(t('filmmaker.takeReasonDaily')));
  const grande = ver(lote({ fase: { fase: 'rechazada', rechazo: { motivo: 'batch_too_large', detalle: { max: 12 } } } }));
  check('P12) lo que el lote entero no pudo, con su frase', /Son demasiados planos para una vez: como mucho 12/.test(grande.texto) && !!boton(grande, 'Volver a mirar'));
  const guardar = ver(lote({ disponible: false }));
  check('P13) con cambios sin guardar se dice, y mirar no se ofrece', /Primero tiene que estar todo guardado/.test(guardar.texto) && boton(guardar, 'Ver qué se generaría')?.apagado === true);
  const recortado = ver(lote({ recortado: 12 }));
  check('P14) si no caben todas, se dice cuántas van y cuáles', /Como mucho 12 planos cada vez/.test(recortado.texto));
  const cambiado = ver(lote({ fase: { fase: 'presupuesto', presupuesto: presupuestoDe({ total: { credits: 80, units: 1 } }), precioCambiado: true } }));
  check('P15) si el precio cambió, se dice, con el nuevo delante', cambiado.texto.includes(t('filmmaker.takePriceChanged')) && !!boton(cambiado, 'Generar por 80 Credits'));
}

/* ═══ D · EN WEË AI DIRECTOR ══════════════════════════════════════════════ */
console.log('\n── D · En el Director: la sección, donde estaba el «Generar» apagado ──');
{
  const Director = cargar('components/studio/produccion/ProductionDirectorPanel.tsx').default;
  const p = produccionUI();
  const props = { produccion: p, seleccion: null, recomendaciones: [], lista: undefined, porRehacer: { scenes: [], shots: [], audio: [], removed: [] }, rechazadas: new Set(), editable: true, onGesto: () => {}, onRechazar: () => {} };
  const loteQuieto = { fase: { fase: 'quieto' }, calidad: 'standard', disponible: true, recortado: null, elegirCalidad() {}, presupuestar() {}, generar() {} };
  const con = dibujar(hc(Director, { ...props, lote: loteQuieto }));
  const sin = dibujar(hc(Director, props));
  check('D1) con el lote, «Generar la producción» en el Director; ni «Todavía no disponible» ni «Pendiente de cotización»',
    /Generar la producción/.test(con.texto) && !!boton(con, 'Ver qué se generaría') && !/Todavía no disponible|Pendiente de cotización/.test(con.texto));
  check('D2) sin él, la sección no se pinta (y tampoco un botón muerto)', !/Generar la producción/.test(sin.texto) && !boton(sin, 'Generar'));
  const PS = sinComentarios(leer('screens/ProductionScreen.tsx'));
  check('D3) la pantalla da el lote al espacio, sobre lo GUARDADO y parado mientras hay cambios o algo en curso',
    /const lote = useLoteDeTomas\(estado\.confirmada, hayCambios \|\| !!ocupado, delLote\.unidades, delLote\.recortado\);/.test(PS) && /\n\s+lote,\n/.test(PS));
  check('D4) si no caben todas las unidades, van las primeras que no tienen vídeo, en su orden',
    /if \(todas\.length <= MAX_UNIDADES_POR_LOTE\) return \{ unidades: undefined, recortado: null \};/.test(PS)
    && /todas\.filter\(\(id\) => !videos\.has\(id\)\)\.slice\(0, MAX_UNIDADES_POR_LOTE\)/.test(PS));
  const TABS = sinComentarios(leer('components/studio/produccion/ProductionDirectorTabs.tsx'));
  const MOVIL = sinComentarios(leer('components/studio/produccion/ProductionMobileEditor.tsx'));
  check('D5) en el escritorio y en el teléfono', /lote=\{espacio\.lote\}/.test(TABS) && /lote=\{espacio\.lote\}/.test(MOVIL));
}

/* ═══ X · LAS GUARDAS ═════════════════════════════════════════════════════ */
console.log('\n── X · Ni servidor, ni un cobro en la app; los once idiomas ──');
{
  const servidor = git(`diff --name-only ${tramo} -- functions/src firestore.rules storage.rules firestore.indexes.json`).trim();
  check('X1) nada del servidor: el lote de la Fase 6 tal cual, ni una Function, ni reglas, ni índices', servidor === '', servidor);
  const LT = sinComentarios(leer('components/studio/produccion/ProductionLote.tsx'));
  check('X2) la sección no llama, no cobra y no suma: solo pinta lo que dice el lote', !/httpsCallable|firebase\/|videoService|spendCredits|creditsService|reduce\(|setTimeout/.test(LT));
  check('X3) en todo lo dibujado no faltó ni una clave', faltan.size === 0, [...faltan].join(', '));
  const quedan = ['es', 'en', 'de', 'fr', 'it', 'pt', 'pt-PT', 'ru', 'ko', 'zh', 'zh-TW'].filter((l) => /^ {2}(generateUnavailable|costPending):/m.test(leer(`i18n/textos/${l}/filmmaker.ts`)));
  check('X4) las frases del «Generar» apagado se fueron de los once diccionarios', quedan.length === 0, quedan.join(', '));
  check('X5) documentado', /### Fase 29 · /.test(leer('docs/FILMMAKER.md')));
  check('X6) esta suite está en la cadena de `npm test`', /filmmaker-produccion-entera\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 29 · generar la producción entera (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
