/**
 * FILMMAKER ENGINE · FASE 28 — WEË STUDIO Y WEË DESIGN, SIN SIMULACROS (§25 del «MASTER EXECUTION PROMPT»).
 *
 *   A · los ajustes viajan: lo elegido en la hoja se dice con palabras detrás de lo escrito —solo lo que se pregunta en
 *       ese contexto, nunca «Automático»—, con la puntuación de cada idioma; y no se inventa estructura;
 *   S · Weë Studio, pintado: el micrófono dice «todavía no»; la fila de «Mis creaciones» es la de verdad; Crear lleva a
 *       crear con lo elegido, y lo que no encaja en ninguna puerta va a Weë Brain, escrito y sin enviar; y no queda
 *       ni un temporizador que finja una creación;
 *   D · Weë Design, pintado: lo mismo, con sus referencias de verdad y su catálogo;
 *   B · Weë Brain recibe el borrador sin enviarlo;
 *   X · las guardas: nada del servidor; ni una clave que falte; las que se fueron, en los once idiomas.
 *
 * El código de la app, con dobles de React Native y de lo que no se prueba aquí, y el traductor con el español de
 * verdad; el arnés, el de `f1d-postcanary.test.mjs`, copiado.
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

/* ═══ FASE 28 · lo que se prueba aquí ═══════════════════════════════════════ */
/** El último commit antes de esta fase. */
const ANTES = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 27 "').trim();
const HASTA = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 28 "').trim();
const tramo = HASTA ? `${ANTES} ${HASTA}` : ANTES;
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

const existe = (p) => fs.existsSync(path.resolve(RAIZ, p));
/* ═══ Los dobles de esta fase: las pantallas de Weë AI, y en su sitio lo que no se prueba aquí ═══════════ */
const capturas = { composer: [], ajustes: [], entradas: [], panel: [], navegar: [], avisos: [], listar: [], fotos: 0 };
const nav = { navigate: (...a) => capturas.navegar.push(a), replace() {}, goBack() {}, canGoBack: () => false, setOptions() {} };
const CUANDO = 1790000000000;
const DOCS = [
  { assetId: 'asset_faro', kind: 'image', status: 'ready', ownerAccountId: 'cuenta28', name: 'El faro de noche', createdAt: CUANDO, updatedAt: CUANDO, delivery: { url: 'https://ejemplo.test/faro.jpg', kind: 'public' } },
  { assetId: 'asset_olas', kind: 'audio', status: 'ready', ownerAccountId: 'cuenta28', createdAt: CUANDO, updatedAt: CUANDO },
  { assetId: 'asset_vuelo', kind: 'video', status: 'ready', ownerAccountId: 'cuenta28', name: 'Vuelo', durationSec: 12, createdAt: CUANDO, updatedAt: CUANDO },
];
const LLENA = async () => ({ items: DOCS, cursor: null, hayMas: false });
let listarResponde = LLENA;
const assetsDoble = {
  assetsService: {
    listar: async (cuenta, filtro, cursor) => { capturas.listar.push({ cuenta, filtro, cursor }); return listarResponde(); },
    miniatura: (a) => (a.delivery?.url ? { url: a.delivery.url, esElOriginal: true } : null),
  },
};
const fotoElegida = { uri: 'file:///referencias/salon.jpg', fileName: 'salon.jpg' };
const limpiezas = [];
const conCaptura = (lista) => ({ __esModule: true, default: (p) => { lista.push(p); return hc('div'); } });
const doblesDeWeeAi = {
  ...dobles,
  'react-native': { ...rn, BackHandler: { addEventListener: () => ({ remove() {} }) } },
  'expo-image': { Image: rn.Image },
  'expo-image-picker': {
    requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
    launchImageLibraryAsync: async () => { capturas.fotos++; return { canceled: false, assets: [fotoElegida] }; },
  },
  '@react-navigation/native': {
    useNavigation: () => nav,
    useRoute: () => ({ params: {} }),
    /*
     * Como el de React Navigation al ganar el foco —aquí, en cada pintado con los efectos encendidos—, y su limpieza
     * al perderlo (`desenfocar`): lo que llega tarde de una pantalla que ya no se ve no escribe en ninguna otra.
     */
    useFocusEffect: (fn) => { if (!correrEfectos) return; const limpiar = fn(); if (typeof limpiar === 'function') limpiezas.push(limpiar); },
  },
  '../contexts/ThemeContext': { ...tema, useEnStudio: () => true },
  '../contexts/AuthContext': { useAuth: () => ({ user: { uid: 'cuenta28' } }) },
  '../hooks/useResponsive': { useResponsive: () => ({ isDesktop: true, isMobile: false, isTablet: false }) },
  '../services/assetsService': assetsDoble,
  '../../services/assetsService': assetsDoble,
  '../utils/notify': { notify: (...a) => capturas.avisos.push(a), confirmAction: async () => true },
  '../utils/scale': { scale: (x) => x },
  '../components/creator/CajaQueCrece': { PaginaDeCajas: Caja },
  '../components/EspacioDeEscritura': { __esModule: true, default: Caja, useAlturaDelTeclado: () => 0 },
  '../components/BarraInferior': { ALTO_BARRA: 0 },
  '../components/studio/StudioHeader': conCaptura([]),
  '../components/studio/StudioPromptComposer': conCaptura(capturas.composer),
  '../components/creator/AjustesContextuales': conCaptura(capturas.ajustes),
  '../components/studio/StudioEntradas': conCaptura(capturas.entradas),
  '../components/studio/StudioPanel': conCaptura(capturas.panel),
  '../components/design/DesignExplore': conCaptura([]),
  '../components/design/DesignPanel': conCaptura([]),
  '../components/creator/FichaDeContexto': {
    __esModule: true,
    default: ({ texto, onQuitar, etiquetaQuitar }) => hc(Toque, { onPress: onQuitar, accessibilityLabel: `${etiquetaQuitar ?? ''} ${texto}`.trim() }, texto),
  },
};
const cargarWeeAi = crearCargador({ dobles: doblesDeWeeAi });
/** Perder el foco: cada efecto de foco limpia lo suyo (en el hook, deja de escribir lo que llegue tarde). */
const desenfocar = async () => { await calma(); limpiezas.splice(0).forEach((f) => f()); };
const ultima = (lista) => lista[lista.length - 1];
const PRONTO = ['Muy pronto', 'Hablar con Weë llegará en una próxima versión. Por ahora, escríbelo.'];

/* ═══ A · LOS AJUSTES VIAJAN, DICHOS CON PALABRAS ═════════════════════════ */
console.log('\n── A · Lo elegido en los ajustes viaja dicho con palabras; ni «Automático» ni lo que no se pregunta ──');
{
  const AJ = cargarWeeAi('constants/ajustesContextuales.ts');
  const DT = cargarWeeAi('constants/designTools.ts');
  check('A1) lo elegido se dice con su nombre: «Formato: Vertical», «Calidad: Alta»',
    JSON.stringify(AJ.ajustesEnPalabras({ format: 'portrait', quality: 'high' }, 'general', t)) === JSON.stringify(['Formato: Vertical', 'Calidad: Alta']));
  check('A2) «Automático» es no haber elegido, y lo que no se pregunta en ese contexto no viaja (la duración, en una imagen)',
    JSON.stringify(AJ.ajustesEnPalabras({ format: 'auto', duration: '10s', quality: 'high' }, 'imagen', t)) === JSON.stringify(['Calidad: Alta']));
  const orden = AJ.ajustesEnPalabras({ style: 'minimal', format: 'square' }, 'imagen', t);
  check('A3) en el orden de la tabla, no en el que se eligió', JSON.stringify(orden) === JSON.stringify(['Formato: Cuadrado', 'Estilo: Minimalista']), orden.join(' | '));
  check('A4) Weë Design, con su catálogo', JSON.stringify(AJ.ajustesEnPalabras({ materials: 'wood' }, 'imagen', t, AJ.siempreSePregunta(DT.AJUSTES_DE_DESIGN))) === JSON.stringify(['Materiales: Madera']));
  check('A5) y en cada idioma con su puntuación: la misma con la que Filmmaker dice un ajuste',
    ['es', 'en', 'de', 'fr', 'it', 'pt', 'pt-PT', 'ru', 'ko', 'zh', 'zh-TW'].every((l) => {
      const de = (m, k) => (new RegExp(`^ {2}${k}: '([^']*)',$`, 'm').exec(leer(`i18n/textos/${l}/${m}.ts`)) || [])[1];
      return !!de('studio', 'settingInWords') && de('studio', 'settingInWords') === de('filmmaker', 'wsSettingIs');
    }));
  const ST = sinComentarios(leer('screens/StudioScreen.tsx'));
  check('A6) y no se inventa estructura: `creative` sigue saliendo solo de los controles de cámara',
    /const creative = filtrarCreativo\(controles\);/.test(ST) && !/filtrarCreativo\(\{[^)]*ajustes/.test(ST) && !/creative[^;\n]*ajustes/.test(ST));
}

/* ═══ S · WEË STUDIO, PINTADO ═════════════════════════════════════════════ */
console.log('\n── S · Weë Studio: el micrófono, Mis creaciones de verdad, y Crear lleva a crear o a Weë Brain ──');
{
  const Studio = cargarWeeAi('screens/StudioScreen.tsx').default;
  const verStudio = () => dibujar(hc(Studio));
  correrEfectos = true;
  await desenfocar();
  recordar(true);
  capturas.listar.length = 0;
  verStudio();
  await calma();
  let s = verStudio();
  check('S1) la fila pide lo último de la CUENTA —no de la cara—, lo más reciente primero',
    capturas.listar[0]?.cuenta === 'cuenta28' && capturas.listar[0]?.filtro?.orden === 'recent' && !capturas.listar[0]?.filtro?.kind);
  check('S2) y enseña las de verdad: su nombre —o cuándo se hizo—, la miniatura de la imagen y cuánto dura el vídeo; ni una de muestra',
    /El faro de noche/.test(s.texto) && s.texto.includes(formato.fecha(CUANDO)) && s.imagenes.some((i) => i.src === 'https://ejemplo.test/faro.jpg')
    && s.texto.includes(formato.numero(12, { style: 'unit', unit: 'second', unitDisplay: 'narrow' }))
    && !/Lago entre montañas|Salon en calido|Narracion en espanol|Good Ideas Better People/.test(s.texto), s.texto.slice(0, 300));
  capturas.navegar.length = 0;
  boton(s, 'Abrir creación: El faro de noche')?.tocar?.();
  boton(s, 'Ver todas')?.tocar?.();
  check('S3) tocar una, o «Ver todas», abre Mis creaciones', JSON.stringify(capturas.navegar) === JSON.stringify([['MisCreaciones'], ['MisCreaciones']]), JSON.stringify(capturas.navegar));
  const fotosAntes = capturas.fotos;
  const avisosAntes = capturas.avisos.length;
  await ultima(capturas.composer).onVoz();
  await calma();
  check('S4) el micrófono dice que dictar llega más adelante —las palabras del de Weë Brain— y ya no abre el selector de imágenes',
    capturas.avisos.length === avisosAntes + 1 && JSON.stringify(ultima(capturas.avisos)) === JSON.stringify(PRONTO) && capturas.fotos === fotosAntes);

  /* Por una puerta (Imágenes), con dos ajustes: el formato se pregunta en una imagen; la duración, no. */
  ultima(capturas.entradas).onAbrir('images');
  verStudio();
  ultima(capturas.panel).onElegir({ entrada: 'images', controles: {} });
  verStudio();
  ultima(capturas.ajustes).onElegir('format', 'portrait');
  ultima(capturas.ajustes).onElegir('duration', '10s');
  ultima(capturas.composer).onCambiar('Un retrato de mi perro');
  verStudio();
  capturas.navegar.length = 0;
  ultima(capturas.composer).onCrear();
  const [ruta, ctx] = ultima(capturas.navegar) ?? [];
  check('S5) Crear, por una puerta: a la experiencia común, con lo escrito entero y detrás lo elegido en los ajustes',
    ruta === 'CreatorFlow' && ctx?.experienceId === 'photo' && ctx?.workspace === 'studio' && ctx?.goal === 'Un retrato de mi perro · Formato: Vertical' && !('creative' in (ctx ?? {})),
    JSON.stringify(ultima(capturas.navegar)));

  /* Sin puerta, y con algo que no encaja en ninguna. */
  await desenfocar();
  recordar(true);
  verStudio();
  ultima(capturas.ajustes).onElegir('format', 'portrait');
  ultima(capturas.composer).onCambiar('xyzzy plugh');
  verStudio();
  capturas.navegar.length = 0;
  ultima(capturas.composer).onCrear();
  check('S6) sin destino, a Weë Brain: escrito en su caja y sin enviar —no se inventa un destino ni se finge una creación—',
    JSON.stringify(capturas.navegar) === JSON.stringify([['Specialist', { id: 'brain', borrador: 'xyzzy plugh · Formato: Vertical' }]]), JSON.stringify(capturas.navegar));

  listarResponde = async () => ({ items: [], cursor: null, hayMas: false });
  await desenfocar();
  recordar(true);
  verStudio();
  await calma();
  const vacia = verStudio();
  listarResponde = async () => { throw Object.assign(new Error('caída'), { code: 'unavailable' }); };
  await desenfocar();
  recordar(true);
  verStudio();
  await calma();
  const caida = verStudio();
  listarResponde = LLENA;
  check('S7) sin creaciones se dice que lo creado aparecerá ahí; y si no se pudieron cargar, también se dice',
    /Lo que crees aparecerá aquí/.test(vacia.texto) && /No pudimos cargar tus creaciones\./.test(caida.texto) && !/Lo que crees aparecerá aquí/.test(caida.texto));
  await desenfocar();
  recordar(false);
  correrEfectos = false;

  const ST = sinComentarios(leer('screens/StudioScreen.tsx'));
  const DS = sinComentarios(leer('screens/DesignScreen.tsx'));
  check('S8) no queda ni una creación de mentira: ni temporizador, ni aviso de demostración, ni creaciones de muestra',
    [ST, DS].every((x) => !/setTimeout|LO_QUE_TARDA_LA_DEMO|AvisoDeCreacion|setEstado\('creando'\)|studioMocks|CREACIONES_DE_DESIGN|CREACIONES_DEL_STUDIO/.test(x))
    && !existe('constants/studioMocks.ts') && !existe('components/creator/AvisoDeCreacion.tsx'));
  check('S9) y el micrófono ya no es el botón de las referencias', [ST, DS].every((x) => !/onVoz=\{alAnadirReferencia\}/.test(x) && /onVoz=\{alDictar\}/.test(x)));
}

/* ═══ D · WEË DESIGN, PINTADO ═════════════════════════════════════════════ */
console.log('\n── D · Weë Design: referencias de verdad, sus ajustes, y Crear lleva a crear ──');
{
  const Design = cargarWeeAi('screens/DesignScreen.tsx').default;
  const verDesign = () => dibujar(hc(Design));
  correrEfectos = true;
  await desenfocar();
  recordar(true);
  capturas.fotos = 0;
  verDesign();
  await calma();
  let d = verDesign();
  check('D1) la fila: las mismas creaciones de la cuenta; ni un diseño de muestra', /El faro de noche/.test(d.texto) && !/Yate de 15 metros|Salon luminoso|Casa entre pinos|Butaca de madera/.test(d.texto));
  const avisosAntes = capturas.avisos.length;
  await ultima(capturas.composer).onVoz();
  await calma();
  check('D2) el micrófono dice «muy pronto», como en Weë Studio, y no añade nada',
    capturas.avisos.length === avisosAntes + 1 && JSON.stringify(ultima(capturas.avisos)) === JSON.stringify(PRONTO) && capturas.fotos === 0);
  await ultima(capturas.composer).onReferencia();
  d = verDesign();
  check('D3) una referencia de verdad, con el selector de siempre: se ve su nombre, los ajustes la cuentan y se puede quitar',
    capturas.fotos === 1 && /salon\.jpg/.test(d.texto) && ultima(capturas.ajustes).referencias === 1 && !!boton(d, 'Quitar salon.jpg') && !/referencia-1\.png/.test(d.texto));
  ultima(capturas.ajustes).onElegir('materials', 'wood');
  ultima(capturas.composer).onCambiar('Un salón luminoso');
  verDesign();
  capturas.navegar.length = 0;
  ultima(capturas.composer).onCrear();
  const [ruta, ctx] = ultima(capturas.navegar) ?? [];
  check('D4) Crear lleva a la experiencia común con Weë Design: lo escrito, sus ajustes con palabras y la referencia con su clase',
    ruta === 'CreatorFlow' && ctx?.experienceId === 'design' && ctx?.workspace === 'design' && ctx?.goal === 'Un salón luminoso · Materiales: Madera'
    && JSON.stringify(ctx?.adjuntos) === JSON.stringify([{ clase: 'referencia', uri: fotoElegida.uri, nombre: 'salon.jpg' }]) && ctx?.imageUri === fotoElegida.uri,
    JSON.stringify(ultima(capturas.navegar)));
  boton(verDesign(), 'Quitar salon.jpg').tocar();
  verDesign();
  check('D5) y quitarla la quita de lo que viaja', ultima(capturas.ajustes).referencias === 0);
  await desenfocar();
  recordar(false);
  correrEfectos = false;
}

/* ═══ B · WEË BRAIN RECIBE EL BORRADOR ════════════════════════════════════ */
console.log('\n── B · Weë Brain: el borrador llega escrito, y no se envía solo ──');
{
  const BR = sinComentarios(leer('screens/BrainChatScreen.tsx'));
  check('B1) la caja de Weë Brain empieza con el borrador que trae la ruta, y uno nuevo sustituye al anterior',
    /const route = useRoute<any>\(\);/.test(BR) && /const \[draft, setDraft\] = useState\(borrador \?\? ''\);/.test(BR)
    && /useEffect\(\(\) => \{\s*if \(borrador\) setDraft\(borrador\);\s*\}, \[borrador\]\);/.test(BR));
  check('B2) y llegar no envía nada: el efecto solo escribe en la caja', !/if \(borrador\)[^\n]*(send|enviar|chat\.)/.test(BR));
  check('B3) la ruta lo declara', /Specialist: \{ id: string; borrador\?: string \};/.test(leer('navigation/MainStackNavigator.tsx')));
}

/* ═══ X · LAS GUARDAS ═════════════════════════════════════════════════════ */
console.log('\n── X · Ni servidor, ni una clave que falte; las que describían lo simulado, fuera de los once ──');
{
  const servidor = git(`diff --name-only ${tramo} -- functions/src firestore.rules storage.rules firestore.indexes.json`).trim();
  check('X1) nada del servidor: ni una Function, ni reglas, ni índices (la fila usa la consulta de Mis creaciones de siempre)', servidor === '', servidor);
  check('X2) en todo lo dibujado no faltó ni una clave', faltan.size === 0, [...faltan].join(', '));
  const FUERA = {
    studio: ['kindImage', 'kindVideo', 'kindAudio', 'kindDocument', 'creationOptions', 'creating', 'ready', 'readyHint'],
    design: ['kindInterior', 'kindArchitecture', 'kindBoat', 'kindFurniture'],
  };
  const siguen = ['es', 'en', 'de', 'fr', 'it', 'pt', 'pt-PT', 'ru', 'ko', 'zh', 'zh-TW'].flatMap((l) =>
    Object.entries(FUERA).flatMap(([m, ks]) => ks.filter((k) => new RegExp(`^ {2}${k}:`, 'm').test(leer(`i18n/textos/${l}/${m}.ts`))).map((k) => `${l}.${m}.${k}`)));
  check('X3) las doce claves de lo simulado ya no están en ninguno de los once diccionarios', siguen.length === 0, siguen.slice(0, 4).join(', '));
  check('X4) documentado', /### Fase 28 · /.test(leer('docs/FILMMAKER.md')));
  check('X5) esta suite está en la cadena de `npm test`', /weeai-sin-simulacros\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 28 · Weë Studio y Weë Design, sin simulacros (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
