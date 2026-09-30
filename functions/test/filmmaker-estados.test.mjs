/**
 * FILMMAKER ENGINE · CIERRE (2026-09-30) · LOS ESTADOS: UN BOTÓN APAGADO DICE POR QUÉ (filmmaker-estados).
 *
 * El encargo del cierre pide que cada capacidad tenga sus estados —normal, apagado, bloqueado, cargando, error…— y
 * ningún botón muerto: «si una capability no tiene efecto real, no mostrarla como activa, o dejarla claramente
 * bloqueada». En el workplace quedaban botones apagados sin su porqué: alargar y acortar un plano o una escena que no
 * tiene duración (F1-A no se la da: `needs_duration`, un contrato que espera autorización), dividir en dos uno sin
 * duración o demasiado corto, y dividir en el cabezal. Ahora, apagados, lo dicen al tocarlos (y a quien no ve, como
 * pista), con la pieza de siempre (`BotonPequeno`, `porque`):
 *
 *   A · la tarjeta del plano;
 *   B · la escena sin planos;
 *   C · las propiedades del plano;
 *   D · la herramienta «Cortar» de la línea de tiempo (y, en una producción archivada, siguen apagados sin más: ya lo
 *       dice la producción entera);
 *   E · la valla: ningún botón apagado del workplace sin su porqué, salvo lo que se explica solo o ya se explica al
 *       lado —cada excepción, con su motivo—;
 *   F · las guardas: solo esas cuatro piezas, los once diccionarios y las pruebas; F1-A y el espejo, sin tocar.
 *
 * La app, con dobles de React Native y de Firebase y el traductor con el español de verdad.
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


/* ═══ LOS ESTADOS: lo que se prueba aquí ═══ */
const BASE_ES = git('log --format=%H -n 1 --grep "R18 closed in code"').trim();
const HASTA_ES = git('log --format=%H -n 1 --grep "every disabled duration or split control says why"').trim();
const TRAMO_ES = HASTA_ES ? `${BASE_ES} ${HASTA_ES}` : BASE_ES;
const P3E = 'components/studio/produccion/';
const { PASO_DE_DURACION_SEC } = cargar('constants/filmmaker.ts');
const MJ = cargar('utils/montajeDeProduccion.ts');
const ACORTAR = t('filmmaker.shorterBy', { segundos: PASO_DE_DURACION_SEC });
const ALARGAR = t('filmmaker.longerBy', { segundos: PASO_DE_DURACION_SEC });
const SIN_DURACION = t('filmmaker.wsWhyNoDuration');
const DIVIDIR_SIN_DURACION = t('filmmaker.wsWhySplitNoDuration');
const DEMASIADO_CORTO = t('filmmaker.wsWhySplitTooShort', { segundos: formato.numero(1) });
const IDS = { escena: () => 'sc_n', plano: () => 'sh_n' };

/** La producción de siempre con el primer plano de la duración que se diga (sin ella, si es `undefined`). */
const conPrimerPlano = (durationSec) => {
  const p = produccionUI();
  const escena = p.scenes[0];
  const primero = { ...escena.shots[0] };
  if (durationSec === undefined) delete primero.durationSec; else primero.durationSec = durationSec;
  const esc = { ...escena, shots: [primero, escena.shots[1]] };
  return { produccion: { ...p, scenes: [esc] }, escena: esc, plano: primero };
};
/** Toca un botón y dice qué pasó: el aviso que dio (si lo dio) y cuántos gestos mandó. */
const tocarY = (d, etiqueta) => {
  const b = boton(d, etiqueta);
  const avisosAntes = avisos.length; const gestosAntes = gestos.length;
  b?.tocar?.();
  return { existe: !!b, apagadoALaVista: b?.apagado, aviso: avisos.length > avisosAntes ? avisos.at(-1) : null, gestos: gestos.length - gestosAntes };
};

/* ═══ A · LA TARJETA DEL PLANO ═══════════════════════════════════════════ */
console.log('\n── A · La tarjeta del plano: sin duración, o demasiado corto, lo dice ──');
{
  const Tarjeta = cargar(`${P3E}ProductionShotCard.tsx`).default;
  const pintar = (durationSec) => {
    const { produccion, escena, plano } = conPrimerPlano(durationSec);
    return dibujar(hc(Tarjeta, { produccion, escena, plano, tarjeta: undefined, seleccionado: false, porRehacer: false, editable: true, ids: IDS, video: null,
      onSeleccionar() {}, onGesto: (o) => { gestos.push(o); return { ok: true }; }, onQuitar() {} }));
  };
  const sin = pintar(undefined);
  const acortar = tocarY(sin, ACORTAR); const alargar = tocarY(sin, ALARGAR);
  check('A1) sin duración, «Acortar» y «Alargar» dicen por qué no se puede —y no mandan nada a F1-A—',
    acortar.aviso?.[0] === ACORTAR && acortar.aviso?.[1] === SIN_DURACION && alargar.aviso?.[1] === SIN_DURACION && acortar.gestos === 0 && alargar.gestos === 0,
    JSON.stringify([acortar, alargar]));
  const dividir = tocarY(sin, t('filmmaker.splitShot'));
  check('A2) y «Dividir en dos», que primero necesita una duración', dividir.aviso?.[1] === DIVIDIR_SIN_DURACION && dividir.gestos === 0, JSON.stringify(dividir));
  const corto = tocarY(pintar(0.8), t('filmmaker.splitShot'));
  check('A3) con 0,8 s, «Dividir en dos» dice el mínimo (dos mitades de 0,5 s: 1 s)', corto.aviso?.[1] === DEMASIADO_CORTO && corto.gestos === 0, JSON.stringify(corto));
  const normal = pintar(4);
  const hecho = tocarY(normal, ACORTAR);
  check('A4) CONTROL · con duración, «Acortar» hace lo de siempre (`shorten_duration`), sin avisos',
    hecho.aviso === null && hecho.gestos === 1 && gestos.at(-1)[0].op === 'shorten_duration', JSON.stringify(hecho));
  const partido = tocarY(normal, t('filmmaker.splitShot'));
  check('A5) CONTROL · y «Dividir en dos» parte el plano (`split_shot`)', partido.aviso === null && partido.gestos === 1 && gestos.at(-1)[0].op === 'split_shot');
}

/* ═══ B · LA ESCENA SIN PLANOS ═══════════════════════════════════════════ */
console.log('\n── B · Una escena sin planos y sin duración lo dice ──');
{
  const Escena = cargar(`${P3E}ProductionSceneCard.tsx`).default;
  const p = produccionUI();
  const vacia = { id: 'sc-0002', order: 1, title: 'Noche', description: 'El faro, de noche', shots: [] };
  const produccion = { ...p, scenes: [p.scenes[0], vacia] };
  const d = dibujar(hc(Escena, { produccion, escena: vacia, indice: 1, tarjetas: [], seleccion: null, porRehacer: new Set(), editable: true, ids: IDS,
    onSeleccionar() {}, onGesto: (o) => { gestos.push(o); return { ok: true }; }, onQuitarEscena() {}, onQuitarPlano() {} }));
  const acortar = tocarY(d, ACORTAR); const alargar = tocarY(d, ALARGAR);
  check('B1) sin duración, «Acortar» y «Alargar» de la escena dicen por qué, sin mandar nada',
    acortar.aviso?.[1] === SIN_DURACION && alargar.aviso?.[1] === SIN_DURACION && acortar.gestos === 0 && alargar.gestos === 0, JSON.stringify([acortar, alargar]));
}

/* ═══ C · LAS PROPIEDADES DEL PLANO ══════════════════════════════════════ */
console.log('\n── C · Las propiedades del plano, lo mismo ──');
{
  const Propiedades = cargar(`${P3E}ProductionShotProperties.tsx`).default;
  const { produccion } = conPrimerPlano(undefined);
  const d = dibujar(hc(Propiedades, { espacio: espacioCon({ produccion, seleccion: { tipo: 'plano', id: 'sh-0101' } }) }));
  const acortar = tocarY(d, ACORTAR); const alargar = tocarY(d, ALARGAR);
  check('C1) junto a «Sin duración», «Acortar» y «Alargar» dicen por qué', /Sin duración/.test(d.texto)
    && acortar.aviso?.[1] === SIN_DURACION && alargar.aviso?.[1] === SIN_DURACION && acortar.gestos === 0 && alargar.gestos === 0, JSON.stringify([acortar, alargar]));
}

/* ═══ D · LA HERRAMIENTA «CORTAR» ════════════════════════════════════════ */
console.log('\n── D · «Cortar», en la línea de tiempo: cada botón apagado dice por qué; archivada, ya lo dice la producción ──');
{
  const Herramientas = cargar(`${P3E}ProductionTools.tsx`).default;
  const nombres = { clima: (x) => x, momento: (x) => x };
  const pintar = (durationSec, cabezal, editable = true) => {
    const { produccion } = conPrimerPlano(durationSec);
    return dibujar(hc(Herramientas, { herramienta: 'cortar', espacio: espacioCon({ produccion, editable, seleccion: { tipo: 'plano', id: 'sh-0101' } }),
      montaje: MJ.montajeDe(produccion, undefined, nombres), cabezal, ids: { sonido: () => 'sd_n', linea: () => 'ln_n' } }));
  };
  const sin = pintar(undefined, 1);
  const enCabezal = tocarY(sin, t('filmmaker.wsSplitAtPlayhead'));
  const enDos = tocarY(sin, t('filmmaker.splitShot'));
  const acortar = tocarY(sin, ACORTAR);
  check('D1) sin duración: dividir en el cabezal, en dos, acortar y alargar lo dicen, sin mandar nada',
    enCabezal.aviso?.[1] === DIVIDIR_SIN_DURACION && enDos.aviso?.[1] === DIVIDIR_SIN_DURACION && acortar.aviso?.[1] === SIN_DURACION
    && tocarY(sin, ALARGAR).aviso?.[1] === SIN_DURACION && enCabezal.gestos + enDos.gestos + acortar.gestos === 0, JSON.stringify([enCabezal, enDos, acortar]));
  const alBorde = tocarY(pintar(4, 0.2), t('filmmaker.wsSplitAtPlayhead'));
  check('D2) con el cabezal pegado al borde (0,2 s), «Dividir en el cabezal» dice dónde ponerlo', alBorde.aviso?.[1] === t('filmmaker.wsSplitHint') && alBorde.gestos === 0, JSON.stringify(alBorde));
  const dentro = tocarY(pintar(4, 1), t('filmmaker.wsSplitAtPlayhead'));
  check('D3) CONTROL · dentro del plano, parte ahí (`split_shot` en el segundo 1)', dentro.aviso === null && dentro.gestos === 1
    && gestos.at(-1)[0].op === 'split_shot' && gestos.at(-1)[0].atSec === 1, JSON.stringify(gestos.at(-1)));
  const archivada = pintar(undefined, 1, false);
  check('D4) en una producción archivada siguen apagados, sin un aviso por botón: ya lo dice la producción entera',
    [t('filmmaker.wsSplitAtPlayhead'), t('filmmaker.splitShot'), ACORTAR, ALARGAR].every((e) => boton(archivada, e)?.apagado === true));
}

/* ═══ E · LA VALLA ═══════════════════════════════════════════════════════ */
console.log('\n── E · Ningún botón apagado del workplace sin su porqué, salvo lo que se explica solo ──');
{
  /*
   * Lo que se explica solo o ya se explica AL LADO, cada cosa con su motivo. Todo lo demás que apague un botón necesita
   * su `porque`: una capacidad cerrada se enseña con su porqué, nunca como un botón muerto.
   */
  const EXPLICADOS = [
    [/!editable\b/g, 'la producción archivada: lo dice la producción entera'],
    [/\bindice === 0\b|!siguiente\b|\bi === 0\b|\bi === acciones\.length - 1\b/g, 'el primero no sube; el último no baja ni se une con el siguiente'],
    [/\baplicando\b|\bpublicando\b|\bcreando\b|\bcargandoMas\b|\bpidiendo\b|!!bajando\b|\bguardando !== null/g, 'mientras hace algo, con su etiqueta de «…ando»'],
    [/\bhayCambios\b/g, 'lo que se está guardando solo; la cabecera lo dice'],
    [/!lote\.disponible\b|\bsinSaldo\b/g, 'el lote dice al lado «guarda primero» y el saldo que falta'],
    [/!vigente\b/g, 'la propuesta dice al lado que cambió la producción'],
    [/!direccionDe\b/g, 'cableado: el hook siempre la da'],
    [/!idea\.trim\(\)/g, 'la caja vacía'],
    [/objetivo - PASO_DEL_OBJETIVO_SEC < LIMITES\.duracionMinimaSec|objetivo \+ PASO_DEL_OBJETIVO_SEC > LIMITES\.produccionMaxSec/g, 'el objetivo en su límite, a la vista'],
  ];
  /** La expresión entre las llaves de `disabled={…}`, con las llaves de dentro contadas. */
  const expresion = (bloque) => {
    const i = bloque.indexOf('disabled={');
    if (i < 0) return null;
    let n = 0; let j = i + 'disabled='.length;
    for (; j < bloque.length; j++) { if (bloque[j] === '{') n++; else if (bloque[j] === '}' && --n === 0) break; }
    return bloque.slice(i + 'disabled={'.length, j);
  };
  const mudos = [];
  let conPorque = 0;
  for (const f of fs.readdirSync(path.resolve(RAIZ, P3E)).filter((x) => x.endsWith('.tsx'))) {
    const src = sinComentarios(leer(`${P3E}${f}`));
    for (const m of src.matchAll(/<BotonPequeno\b[\s\S]*?\/>/g)) {
      const e = expresion(m[0]);
      if (e === null) continue;
      if (/\bporque=\{/.test(m[0])) { conPorque++; continue; }
      const resto = EXPLICADOS.reduce((s, [re]) => s.replace(re, ' '), e).replace(/\|\||&&|[()!\s]/g, '');
      if (resto) mudos.push(`${f}: disabled={${e.trim()}}`);
    }
  }
  check('E1) todo botón apagado dice por qué, o lo explica lo de al lado (con su motivo, arriba)', mudos.length === 0, mudos.join(' · '));
  check('E2) y los de duración y dividir son de los que lo dicen (al menos los once de este cierre)', conPorque >= 11, `${conPorque}`);
  /* CONTROL: la valla sabe encontrar uno mudo. */
  const falso = '<BotonPequeno icono="x" etiqueta={t(\'a\')} disabled={duracion === undefined} onPress={() => {}} />';
  const restoFalso = EXPLICADOS.reduce((s, [re]) => s.replace(re, ' '), expresion(falso)).replace(/\|\||&&|[()!\s]/g, '');
  check('E3) CONTROL · la valla reconocería un botón apagado sin su porqué', restoFalso.length > 0, restoFalso);
}

/* ═══ F · LAS GUARDAS ════════════════════════════════════════════════════ */
console.log('\n── F · Solo cambian las piezas de los estados, los diccionarios y las pruebas ──');
{
  const tocados = git(`diff --name-only ${TRAMO_ES} -- components screens hooks services constants utils functions/src`).trim().split('\n').filter(Boolean).sort();
  check('F1) solo cambian las cuatro piezas con botones de duración y de dividir',
    JSON.stringify(tocados) === JSON.stringify([`${P3E}ProductionSceneCard.tsx`, `${P3E}ProductionShotCard.tsx`, `${P3E}ProductionShotProperties.tsx`, `${P3E}ProductionTools.tsx`]), tocados.join(', '));
  check('F2) F1-A, el espejo y las reglas, idénticos (dar una primera duración a un plano sigue esperando autorización: contratos, § 2)',
    git(`diff --name-only ${TRAMO_ES} -- functions/src/filmmaker services/filmmaker/espejo firestore.rules`).trim() === '');
  const LOCALES = ['es', 'en', 'pt', 'pt-PT', 'de', 'fr', 'it', 'ko', 'ru', 'zh', 'zh-TW'];
  /* Entre comillas simples, con los apóstrofos escapados (`can\'t`, `d\'allonger`). */
  const sinTraducir = LOCALES.filter((l) => !['wsWhyNoDuration', 'wsWhySplitNoDuration', 'wsWhySplitTooShort'].every((k) => new RegExp(`^  ${k}: '(?:[^'\\\\]|\\\\.)+',$`, 'm').test(leer(`i18n/textos/${l}/filmmaker.ts`))));
  check('F3) las tres frases, en los once idiomas; y con `{{segundos}}` donde dicen un número', sinTraducir.length === 0
    && LOCALES.every((l) => /  wsWhySplitTooShort: ['"][^'"\n]*\{\{segundos\}\}/.test(leer(`i18n/textos/${l}/filmmaker.ts`))), sinTraducir.join(','));
  check('F4) esta suite está en la cadena de `npm test`', /test\/filmmaker-estados\.test\.mjs/.test(leer('functions/package.json')));
  check('F5) en todo lo dibujado no faltó ni una clave', faltan.size === 0, [...faltan].join(', '));
}

console.log(failures ? `\n✘ filmmaker-estados: ${n - failures}/${n}` : `\n✔ filmmaker-estados: ${n}/${n}`);
if (failures) process.exit(1);
