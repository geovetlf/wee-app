/**
 * FILMMAKER ENGINE · 3D DENTRO DE FILMMAKER · VER UN MODELO 3D (filmmaker-3d-visor).
 *
 * Un modelo 3D que la cuenta ya tiene —el que apunta lo guardado de una ficha, o uno de Mis creaciones— se VE, en la
 * hoja contextual de siempre, sin salir de donde se está trabajando. Aquí se prueba que eso es verdad con lo que ya
 * existía y sin inventar nada:
 *
 *   A · la puerta `models3d`, `entregar`: la llave temporal de Media Cloud solo para un modelo tuyo y listo, tras la
 *       misma puerta cerrada; lo ajeno y lo que no existe contestan igual;
 *   B · qué se ve en el lienzo, decidido sin pantalla;
 *   C · el visor en la web (`<model-viewer>`, pedido la primera vez que se abre un modelo);
 *   D · el visor en la app nativa: todavía no, dicho en su sitio;
 *   E · el hook: si lo guardado tiene modelo (una pregunta) y la dirección pedida al verlo (nunca guardada);
 *   F · los servicios: `elements` (`get`) y Mis creaciones (su entrega, o la llave de `models3d`);
 *   G · la ficha: «Ver el modelo 3D» solo si hay un modelo, y el visor en su hoja;
 *   H · Mis creaciones: un modelo 3D se ve en el visor, no se descarga;
 *   I · los textos, en los once diccionarios;
 *   J · las guardas: dos dependencias y solo dos, la librería solo en el visor web, ni una pantalla, ni un contrato.
 *
 * El servidor, compilado, con dobles; la app, con dobles de React Native y de Firebase y el traductor con el español de
 * verdad. Nada sale a la red: ni un byte de un almacén, ni un proveedor, ni un Credit.
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


/* ═══ 3D DENTRO DE FILMMAKER · VER UN MODELO 3D: lo que se prueba aquí ═══ */
const BASE_V = '65fdc6f';
const HASTA_V = git('log --format=%H -n 1 --grep "3D inside Filmmaker: see a 3D model"').trim();
const TRAMO_V = HASTA_V ? `${BASE_V} ${HASTA_V}` : BASE_V;
const P3V = 'components/studio/produccion/';

/* ═══ A · LA PUERTA `models3d`: ENTREGAR ═════════════════════════════════ */
console.log('\n── A · La llave para ver un modelo: tuyo, un modelo y listo, tras la misma puerta cerrada ──');
const M3V = lib('models3d/index.js');
const T_V = 1_700_000_000_000;
const materialV = (assetId, o = {}) => [assetId, {
  contract: 1, assetId, ownerAccountId: o.dueno ?? 'ana', kind: o.kind ?? 'model3d', status: o.status ?? 'ready',
  storageRef: { provider: 'r2', objectKey: `cuentas/${o.dueno ?? 'ana'}/${assetId}/original` }, mimeType: 'model/gltf-binary',
  provenance: { createdAt: T_V }, createdAt: T_V, updatedAt: T_V,
}];
const mundoV = (o = {}) => {
  const materiales = new Map(o.materiales ?? [
    materialV('asset_robot_de_ana1'), materialV('asset_robot_de_bea1', { dueno: 'bea' }), materialV('asset_foto_de_ana01', { kind: 'image' }),
    materialV('asset_llegando_ana1', { status: 'uploading' }),
  ]);
  const pedidas = [];
  const lineas = [];
  const deps = {
    cuentaDelPrincipal: async (p) => (p ? { accountId: p } : null),
    leerMaterial: async (id) => materiales.get(id) ?? null,
    puertaAbierta: async (c) => (o.abiertas ?? ['ana', 'bea']).includes(c),
    ...(o.sinEntrega ? {} : {
      pedirEntrega: async (principal, assetId) => {
        pedidas.push([principal, assetId]);
        return o.entregaFalla ? { ok: false } : { ok: true, url: `https://almacen.invalid/lee/${assetId}?firma=secreta`, expiraEn: T_V + 300_000 };
      },
    }),
    registrar: (l) => lineas.push(l),
  };
  return { deps, pedidas, lineas };
};
const entregarV = (m, quien, assetId) => M3V.atenderModelos3d(m.deps, quien, { op: 'entregar', assetId });
{
  const m = mundoV();
  const bien = await entregarV(m, 'ana', 'asset_robot_de_ana1');
  check('A1) tu modelo, listo: la llave temporal y hasta cuándo vale', bien.ok && bien.op === 'entregar' && bien.url.startsWith('https://almacen.invalid/lee/asset_robot_de_ana1') && bien.expiraEn === T_V + 300_000);
  check('A2) la decide MC-2: se le pide con quién llama y ese material', JSON.stringify(m.pedidas) === JSON.stringify([['ana', 'asset_robot_de_ana1']]));
  const ajeno = await entregarV(m, 'ana', 'asset_robot_de_bea1');
  const inventado = await entregarV(m, 'ana', 'asset_no_existe_001');
  check('A3) el de otra cuenta y uno que no existe contestan lo MISMO, y no se pide nada', !ajeno.ok && ajeno.motivo === 'no_disponible' && !inventado.ok && inventado.motivo === 'no_disponible' && m.pedidas.length === 1);
  const foto = await entregarV(m, 'ana', 'asset_foto_de_ana01');
  const llegando = await entregarV(m, 'ana', 'asset_llegando_ana1');
  check('A4) solo un modelo 3D, y solo listo: ni una imagen, ni uno que todavía está llegando', !foto.ok && foto.motivo === 'no_disponible' && !llegando.ok && llegando.motivo === 'no_disponible' && m.pedidas.length === 1);
  const malas = await Promise.all(['', '../otra/cosa', 'x', 5, null].map((a) => M3V.atenderModelos3d(m.deps, 'ana', { op: 'entregar', assetId: a })));
  check('A5) un identificador sin forma de material: `material`', malas.every((r) => !r.ok && r.motivo === 'peticion_invalida' && r.detalle === 'material'));
  const cerrada = await entregarV(mundoV({ abiertas: ['bea'] }), 'ana', 'asset_robot_de_ana1');
  check('A6) con la puerta cerrada para la cuenta: `cerrada`, antes de leer nada', !cerrada.ok && cerrada.motivo === 'cerrada');
  const sinLlave = await entregarV(mundoV({ sinEntrega: true }), 'ana', 'asset_robot_de_ana1');
  const falla = await entregarV(mundoV({ entregaFalla: true }), 'ana', 'asset_robot_de_ana1');
  check('A7) sin quien firme, o si MC-2 no concede: no hay entrega', !sinLlave.ok && sinLlave.motivo === 'no_disponible' && !falla.ok && falla.motivo === 'no_disponible');
  check('A8) lo que se registra no lleva la llave', m.lineas.length >= 1 && !JSON.stringify(m.lineas).includes('firma=') && !JSON.stringify(m.lineas).includes('https://'));
  const PUERTA_V = sinComentarios(leer('functions/src/models3d/puerta.ts'));
  check('A9) la puerta la compone con MC-2 tal cual (`solicitarEntrega` con `depsDeEntregaDeWee`), sin firmar nada por su cuenta',
    /solicitarEntrega\(depsDeEntregaDeWee\(db\), \{ principalId, assetId \}\)/.test(PUERTA_V) && !/\bfirmar\b|createHmac|X-Amz/i.test(PUERTA_V + sinComentarios(leer('functions/src/models3d/index.ts'))));
  check('A10) y sigue SIN exportarse: Media Cloud, apagado para todos', !/models3d/.test(sinComentarios(leer('functions/src/index.ts'))) && M3V.OPERACIONES_DE_MODELOS_3D.includes('entregar'));
}

/* ═══ B · QUÉ SE VE EN EL LIENZO ═════════════════════════════════════════ */
console.log('\n── B · Qué se ve en el lienzo, decidido sin pantalla ──');
const COMUN = cargar('components/workspace/visorDeModelo3d.comun.ts');
{
  const capa = (o) => COMUN.capaDelVisor({ url: null, libreria: 'cargando', modelo: 'cargando', ...o });
  check('B1) sin dirección: buscándola, o nada que enseñar (con su porqué)', capa({ buscando: true }) === 'buscando' && capa({}) === 'sin_modelo');
  check('B2) con dirección, mientras llegan el visor o el modelo: cargando', capa({ url: 'u' }) === 'cargando' && capa({ url: 'u', libreria: 'lista' }) === 'cargando');
  check('B3) los dos listos: el modelo', capa({ url: 'u', libreria: 'lista', modelo: 'listo' }) === 'listo');
  check('B4) la librería o el modelo que no se pudo abrir: error (con «Inténtalo de nuevo»)', capa({ url: 'u', libreria: 'fallo' }) === 'error' && capa({ url: 'u', libreria: 'lista', modelo: 'error' }) === 'error');
  const claves = Object.values(COMUN.CLAVE_DEL_PORQUE_DEL_MODELO);
  check('B5) cada porqué tiene su frase (la entrega sin activar, llegando, retirado, desconocido)', claves.length === 4 && claves.every((k) => t(k) !== k), claves.join(', '));
}

/* ═══ C · EL VISOR EN LA WEB ═════════════════════════════════════════════ */
console.log('\n── C · El visor en la web: `<model-viewer>`, pedido la primera vez que se abre un modelo ──');
let libreriaPedida = 0;
const cargarWeb = crearCargador({ dobles: { ...dobles, '@google/model-viewer': new Proxy({}, { get: (o, k) => { if (k === '__esModule') return true; libreriaPedida += 1; return undefined; } }) } });
const VisorWeb = cargarWeb('components/workspace/VisorDeModelo3d.web.tsx').default;
{
  const buscando = dibujar(hc(VisorWeb, { url: null, nombre: 'Robot', buscando: true }));
  check('C1) buscando la dirección: dicho, con la rueda, y sin visor', buscando.texto.includes(ES.creaciones.model3dSearching) && !/<model-viewer/.test(buscando.html));
  const sinEntrega = dibujar(hc(VisorWeb, { url: null, nombre: 'Robot', porque: ES.creaciones.model3dNoDelivery }));
  check('C2) sin dirección: el porqué que le pasan (la entrega sin activar)', sinEntrega.texto.includes(ES.creaciones.model3dNoDelivery) && !/<model-viewer/.test(sinEntrega.html));
  recordar(true);
  correrEfectos = true;
  const primera = dibujar(hc(VisorWeb, { url: 'https://almacen.invalid/robot.glb', nombre: 'Robot' }));
  correrEfectos = false;
  check('C3) con dirección, lo primero es cargar: su frase con cuánto va', primera.texto.includes('Cargando el modelo… 0'));
  await calma();
  const lista = dibujar(hc(VisorWeb, { url: 'https://almacen.invalid/robot.glb', nombre: 'Robot' }));
  recordar(false);
  const etiqueta = lista.html.match(/<model-viewer[^>]*>/)?.[0] ?? '';
  check('C4) con la librería lista: el visor de verdad, con la dirección que le pasaron —nunca una de ejemplo—',
    /src="https:\/\/almacen\.invalid\/robot\.glb"/.test(etiqueta) && /camera-controls=""/.test(etiqueta) && /interaction-prompt="none"/.test(etiqueta)
    && /alt="Modelo 3D: Robot"/.test(etiqueta), etiqueta.slice(0, 300));
  check('C5) mientras el modelo llega, la rueda sigue encima, con su frase', lista.texto.includes('Cargando el modelo… 0'));
  const WEB = sinComentarios(leer('components/workspace/VisorDeModelo3d.web.tsx'));
  check('C6) la librería se pide al abrir un modelo (import dinámico dentro de un efecto), no al arrancar la app',
    /useEffect\(\(\) => \{[\s\S]*?import\('@google\/model-viewer'\)/.test(WEB) && !/^import '@google\/model-viewer'/m.test(WEB) && !/^import [^t][^;]*from '@google\/model-viewer'/m.test(WEB));
  check('C7) los controles, solo con el modelo listo: encuadrar (el encuadre que el visor calcula) y girar solo',
    /\{capa === 'listo' && \(/.test(WEB) && /jumpCameraToGoal\(\)/.test(WEB) && /cameraOrbit = 'auto auto auto'/.test(WEB) && /'auto-rotate': girando/.test(WEB)
    && /creaciones\.model3dFrame/.test(WEB) && /creaciones\.model3dSpin/.test(WEB) && /creaciones\.model3dHint/.test(WEB));
  check('C8) el error se dice y se reintenta de verdad (monta el visor otra vez)', /capa === 'error'/.test(WEB) && /setIntento\(\(i\) => i \+ 1\)/.test(WEB) && /key: `\$\{url\}#\$\{intento\}`/.test(WEB));
  check('C9) escucha lo que el visor dice que pasa: cargado, fallo y cuánto va', /addEventListener\('load'/.test(WEB) && /addEventListener\('error'/.test(WEB) && /addEventListener\('progress'/.test(WEB) && /removeEventListener\('progress'/.test(WEB));
}

/* ═══ D · EL VISOR EN LA APP NATIVA ══════════════════════════════════════ */
console.log('\n── D · En la app nativa, todavía no: dicho en su sitio ──');
const VisorNativo = cargar('components/workspace/VisorDeModelo3d.tsx').default;
{
  const conUrl = dibujar(hc(VisorNativo, { url: 'https://almacen.invalid/robot.glb', nombre: 'Robot' }));
  check('D1) con modelo: que el visor llega con la próxima versión y que se ve en la web (ni un botón muerto)', conUrl.texto.includes(ES.creaciones.model3dNative) && conUrl.botones.length === 0);
  check('D2) buscando, y sin dirección con su porqué, se dicen igual que en la web',
    dibujar(hc(VisorNativo, { url: null, nombre: 'Robot', buscando: true })).texto.includes(ES.creaciones.model3dSearching)
    && dibujar(hc(VisorNativo, { url: null, nombre: 'Robot', porque: ES.creaciones.model3dGone })).texto.includes(ES.creaciones.model3dGone));
  check('D3) la versión nativa no carga ninguna librería 3D', !/model-viewer|three/.test(sinComentarios(leer('components/workspace/VisorDeModelo3d.tsx'))));
}

/* ═══ E · EL HOOK ════════════════════════════════════════════════════════ */
console.log('\n── E · Si lo guardado tiene modelo (una pregunta) y su dirección, pedida al verlo ──');
const servicioV = { modelos: [], direcciones: [], respuestaModelo: async () => ({ estado: 'con_modelo', assetId: 'asset_robot_de_ana1' }), respuestaDireccion: async () => ({ estado: 'lista', url: 'https://almacen.invalid/robot.glb' }) };
const nuevoHookV = () => {
  const m = miniReact();
  const cargarHook = crearCargador({ dobles: { ...dobles, react: { ...React, ...m.react },
    '../services/elementsService': { elementsService: { modelo3dDe: (id) => { servicioV.modelos.push(id); return servicioV.respuestaModelo(id); } } },
    '../services/assetsService': { assetsService: { direccionDelModelo: (id) => { servicioV.direcciones.push(id); return servicioV.respuestaDireccion(id); } } } } });
  const { useModelos3d } = cargarHook('hooks/useModelos3d.ts');
  return () => m.pasar(useModelos3d);
};
{
  servicioV.modelos = []; servicioV.direcciones = [];
  const usar = nuevoHookV();
  usar().buscar('el_robot'); usar().buscar('el_robot');
  check('E1) mientras se pregunta: buscando; y se pregunta UNA vez', usar().de('el_robot')?.fase === 'buscando' && servicioV.modelos.length === 1);
  await calma();
  check('E2) lo guardado tiene modelo: su material', usar().de('el_robot')?.fase === 'con_modelo' && usar().de('el_robot')?.assetId === 'asset_robot_de_ana1');

  servicioV.respuestaModelo = async () => ({ estado: 'sin_respuesta' });
  usar().buscar('el_sin_red');
  await calma();
  check('E3) sin respuesta: error, y se puede volver a preguntar', usar().de('el_sin_red')?.fase === 'error' && (usar().buscar('el_sin_red'), servicioV.modelos.filter((x) => x === 'el_sin_red').length === 2));
  servicioV.respuestaModelo = async () => ({ estado: 'sin_modelo' });
  usar().buscar('el_sin_modelo');
  await calma();
  check('E4) sin modelo: se sabe (y no se vuelve a preguntar)', usar().de('el_sin_modelo')?.fase === 'sin_modelo' && (usar().buscar('el_sin_modelo'), servicioV.modelos.filter((x) => x === 'el_sin_modelo').length === 1));

  usar().ver('asset_robot_de_ana1', 'Robot');
  check('E5) ver: el visor se abre enseguida, buscando la dirección', usar().vista.fase === 'abriendo' && usar().vista.nombre === 'Robot');
  await calma();
  check('E6) y se pide la dirección EN ESE MOMENTO: el visor, con ella', usar().vista.fase === 'lista' && usar().vista.url === 'https://almacen.invalid/robot.glb' && servicioV.direcciones.at(-1) === 'asset_robot_de_ana1');
  const fases = [];
  for (const estado of ['sin_entrega', 'llegando', 'retirado', 'desconocido']) {
    servicioV.respuestaDireccion = async () => ({ estado });
    usar().ver('asset_x_0001', 'X');
    await calma();
    fases.push(usar().vista.fase);
  }
  check('E7) sin dirección, cada porqué: la entrega sin activar, llegando, retirado, desconocido', fases.join(',') === 'sin_entrega,llegando,retirado,desconocido', fases.join(','));

  /* Lo que llega tarde no pisa lo que se pidió después, ni lo cerrado. */
  let soltar;
  servicioV.respuestaDireccion = (id) => (id === 'asset_lento_0001' ? new Promise((r) => { soltar = () => r({ estado: 'lista', url: 'https://almacen.invalid/lento.glb' }); }) : Promise.resolve({ estado: 'lista', url: 'https://almacen.invalid/rapido.glb' }));
  usar().ver('asset_lento_0001', 'Lento');
  usar().ver('asset_rapido_001', 'Rápido');
  await calma();
  soltar(); await calma();
  check('E8) una dirección que llega tarde no pisa la del modelo que se pidió después', usar().vista.fase === 'lista' && usar().vista.url === 'https://almacen.invalid/rapido.glb');
  usar().ver('asset_lento_0001', 'Lento');
  usar().cerrar();
  soltar(); await calma();
  check('E9) cerrar el visor: cerrado, aunque llegue una respuesta después', usar().vista.fase === 'cerrada');
}

/* ═══ F · LOS SERVICIOS ══════════════════════════════════════════════════ */
console.log('\n── F · Las preguntas, a lo que ya existía: `elements` (get) y Mis creaciones ──');
{
  const ES_V = cargar('services/elementsService.ts');
  respuestaDe = async (nombre, datos) => (nombre === 'elements' && datos.op === 'get' ? { data: { element: { refs: [
    { assetId: 'asset_foto_0001', role: 'primary', kind: 'image' }, { assetId: 'asset_glb_secundario', role: 'reference', kind: 'model3d' }, { assetId: 'asset_glb_principal', role: 'primary', kind: 'model3d' },
  ] } } } : { data: {} });
  const principal = await ES_V.elementsService.modelo3dDe('el_robot_0001');
  const pedido = llamadas.at(-1);
  check('F1) se pregunta a `elements` con `get`, solo con el id; y se prefiere el modelo PRINCIPAL', pedido?.nombre === 'elements' && JSON.stringify(pedido?.datos) === JSON.stringify({ op: 'get', elementId: 'el_robot_0001' })
    && principal.estado === 'con_modelo' && principal.assetId === 'asset_glb_principal');
  respuestaDe = async () => ({ data: { element: { refs: [{ assetId: 'asset_foto_0001', role: 'primary', kind: 'image' }] } } });
  const sinModelo = await ES_V.elementsService.modelo3dDe('el_foto_0001');
  respuestaDe = async () => { const e = new Error('no'); e.code = 'functions/not-found'; throw e; };
  const ajeno = await ES_V.elementsService.modelo3dDe('el_ajeno_0001');
  respuestaDe = async () => { throw new Error('red'); };
  const sinRed = await ES_V.elementsService.modelo3dDe('el_robot_0001');
  check('F2) sin modelo; ajeno, archivado o que ya no está (lo mismo para la ficha); y sin respuesta', sinModelo.estado === 'sin_modelo' && ajeno.estado === 'sin_modelo' && sinRed.estado === 'sin_respuesta');
  respuestaDe = async () => ({ data: {} });

  /* Mis creaciones: la ficha del material, de la propia cuenta (lectura), y la llave de `models3d` si hace falta. */
  const docsV = {};
  let leerFalla = false;
  const firestoreV = { ...dobles['firebase/firestore'], doc: (_db, col, id) => ({ col, id }), getDoc: async (ref) => {
    if (leerFalla) throw new Error('sin red');
    const d = docsV[ref.id];
    return { exists: () => !!d, data: () => d };
  } };
  const AS_V = crearCargador({ dobles: { ...dobles, 'firebase/firestore': firestoreV } })('services/assetsService.ts').assetsService;
  const base = { contract: 1, ownerAccountId: 'ana', kind: 'model3d', provenance: { createdAt: 1 }, createdAt: 1, updatedAt: 1 };
  docsV.asset_wee_0001 = { ...base, assetId: 'asset_wee_0001', status: 'ready', delivery: { url: 'https://storage.invalid/robot.glb?token=t', kind: 'bearer_token' } };
  docsV.asset_r2_00001 = { ...base, assetId: 'asset_r2_00001', status: 'ready', storageRef: { provider: 'r2', objectKey: 'x' } };
  docsV.asset_subiendo01 = { ...base, assetId: 'asset_subiendo01', status: 'uploading' };
  docsV.asset_borrado01 = { ...base, assetId: 'asset_borrado01', status: 'deleted', deletedAt: 2 };
  docsV.asset_foto_00001 = { ...base, assetId: 'asset_foto_00001', kind: 'image', status: 'ready', delivery: { url: 'https://storage.invalid/foto.png', kind: 'bearer_token' } };
  const antes = llamadas.length;
  const wee = await AS_V.direccionDelModelo('asset_wee_0001');
  check('F3) guardado en el almacén de Weë: su entrega de siempre, sin preguntar a nadie más', wee.estado === 'lista' && wee.url === 'https://storage.invalid/robot.glb?token=t' && llamadas.length === antes);
  respuestaDe = async (nombre, datos) => (nombre === 'models3d' && datos.op === 'entregar' ? { data: { ok: true, op: 'entregar', url: 'https://almacen.invalid/lee/r2', expiraEn: 9 } } : { data: {} });
  const r2 = await AS_V.direccionDelModelo('asset_r2_00001');
  check('F4) en Media Cloud: la llave temporal de `models3d` (`entregar`), pedida solo con el id', r2.estado === 'lista' && r2.url === 'https://almacen.invalid/lee/r2'
    && JSON.stringify(llamadas.at(-1)) === JSON.stringify({ nombre: 'models3d', datos: { op: 'entregar', assetId: 'asset_r2_00001' } }));
  respuestaDe = async () => ({ data: { ok: false, motivo: 'cerrada' } });
  const cerradaF = await AS_V.direccionDelModelo('asset_r2_00001');
  respuestaDe = async () => { throw new Error('la puerta no está desplegada'); };
  const sinPuerta = await AS_V.direccionDelModelo('asset_r2_00001');
  check('F5) la puerta cerrada o sin desplegar: `sin_entrega` (se dice por qué, no se finge)', cerradaF.estado === 'sin_entrega' && sinPuerta.estado === 'sin_entrega');
  respuestaDe = async () => ({ data: {} });
  const estados = await Promise.all(['asset_subiendo01', 'asset_borrado01', 'asset_no_existe1', 'asset_foto_00001'].map((id) => AS_V.direccionDelModelo(id)));
  check('F6) llegando, retirado, que ya no está (retirado) y lo que no es un modelo (desconocido)', estados.map((e) => e.estado).join(',') === 'llegando,retirado,retirado,desconocido', estados.map((e) => e.estado).join(','));
  leerFalla = true;
  const sinLeer = await AS_V.direccionDelModelo('asset_wee_0001');
  leerFalla = false;
  check('F7) si no se puede leer la ficha: desconocido', sinLeer.estado === 'desconocido');
}

/* ═══ G · LA FICHA ═══════════════════════════════════════════════════════ */
console.log('\n── G · «Ver el modelo 3D» solo si lo guardado tiene uno, y el visor en su hoja ──');
const FichasV = cargar(`${P3V}ProductionFichas.tsx`).default;
{
  const buscados = [];
  const vistos = [];
  let cerrado = 0;
  const modelosCon = (o = {}) => ({
    de: (id) => (o.porGuardado ?? {})[id], buscar: (id) => buscados.push(id), vista: o.vista ?? { fase: 'cerrada' },
    ver: (assetId, nombre) => vistos.push([assetId, nombre]), cerrar: () => { cerrado += 1; },
  });
  const conRobot = (modelos3d) => espacioCon({
    produccion: produccionUI({ characters: [{ id: 'char-robot', name: 'Robot', element: { elementId: 'el_robot_0001', version: 1 } }] }),
    elementos: { carga: 'listos', lista: [], hayMas: false, cargandoMas: false, cargar() {}, cargarMas() {} },
    ...(modelos3d ? { modelos3d } : {}),
  });
  const abrirFicha = (modelos3d) => {
    boton(dibujar(hc(FichasV, { clase: 'personaje', espacio: conRobot(modelos3d), nuevoId: () => 'ch_x' })), t('filmmaker.wsCardOpen', { nombre: 'Robot' })).tocar();
    return dibujar(hc(FichasV, { clase: 'personaje', espacio: conRobot(modelos3d), nuevoId: () => 'ch_x' }));
  };
  recordar(true);
  correrEfectos = true;
  abrirFicha(modelosCon());
  correrEfectos = false;
  check('G1) al abrir una ficha vinculada, se pregunta si lo guardado tiene modelo', buscados.includes('el_robot_0001'));
  recordar(false);

  recordar(true);
  const conModelo = abrirFicha(modelosCon({ porGuardado: { el_robot_0001: { fase: 'con_modelo', assetId: 'asset_robot_de_ana1' } } }));
  const verBoton = boton(conModelo, ES.filmmaker.wsModel3dView);
  check('G2) con modelo: «Ver el modelo 3D», disponible', !!verBoton && !verBoton.apagado);
  verBoton?.tocar();
  check('G3) tocarlo abre el visor con ESE material y el nombre de la ficha', JSON.stringify(vistos.at(-1)) === JSON.stringify(['asset_robot_de_ana1', 'Robot']));
  recordar(false);

  recordar(true);
  const sinModelo = abrirFicha(modelosCon({ porGuardado: { el_robot_0001: { fase: 'sin_modelo' } } }));
  check('G4) sin modelo: nada que ver (ni un botón), y su versión 3D sigue cerrada con su porqué',
    !boton(sinModelo, ES.filmmaker.wsModel3dView) && !!boton(sinModelo, ES.filmmaker.wsCreateVersion3d));
  recordar(false);

  const conVisor = dibujar(hc(FichasV, { clase: 'personaje', espacio: conRobot(modelosCon({ vista: { fase: 'lista', nombre: 'Robot', url: 'https://almacen.invalid/robot.glb' } })), nuevoId: () => 'ch_x' }));
  check('G5) el visor, en la hoja contextual de siempre (nunca una pantalla), con su título', conVisor.hojas.some((h) => h.titulo === 'Modelo 3D · Robot'));
  const sinEntregaG = dibujar(hc(FichasV, { clase: 'personaje', espacio: conRobot(modelosCon({ vista: { fase: 'sin_entrega', nombre: 'Robot' } })), nuevoId: () => 'ch_x' }));
  check('G6) sin entrega: el visor dice por qué', sinEntregaG.texto.includes(ES.creaciones.model3dNoDelivery));
  const sinHook = dibujar(hc(FichasV, { clase: 'personaje', espacio: conRobot(null), nuevoId: () => 'ch_x' }));
  check('G7) sin el hook (otra pantalla que monte la ficha), nada se rompe y no hay visor', sinHook.hojas.length === 0 && !boton(sinHook, ES.filmmaker.wsModel3dView));
  const FICHAS_V = sinComentarios(leer(`${P3V}ProductionFichas.tsx`)).replace(/import type [^;]*;/g, '');
  check('G8) la ficha no habla con el servidor: lo hace el hook', !/httpsCallable|firebase\/|fetch\(|elementsService|assetsService/.test(FICHAS_V));
}

/* ═══ H · MIS CREACIONES ═════════════════════════════════════════════════ */
console.log('\n── H · En Mis creaciones, un modelo 3D se ve en el visor, no se descarga ──');
{
  const MC = sinComentarios(leer('screens/MisCreacionesScreen.tsx'));
  const abrir = MC.slice(MC.indexOf('const abrir = (asset: AssetDoc) => {'), MC.indexOf('const eliminar'));
  check('H1) abrir un modelo 3D va al visor ANTES que a su trabajo o a su archivo', /if \(asset\.kind === 'model3d' && asset\.status !== 'deleted'\) \{\s*modelos3d\.ver\(asset\.assetId,/.test(abrir)
    && abrir.indexOf('modelos3d.ver') < abrir.indexOf('navigation.navigate') && abrir.indexOf('modelos3d.ver') < abrir.indexOf('Linking.openURL'));
  check('H2) con el mismo visor y la misma hoja que la ficha, y los mismos porqués', /<HojaInferior visible titulo=\{t\('creaciones\.model3dTitle'/.test(MC) && /<VisorDeModelo3d/.test(MC) && /CLAVE_DEL_PORQUE_DEL_MODELO\[/.test(MC) && /useModelos3d\(\)/.test(MC));
}

/* ═══ I · LOS TEXTOS ═════════════════════════════════════════════════════ */
console.log('\n── I · Los textos, en los once diccionarios ──');
{
  const LOCALES = ['es', 'en', 'pt', 'pt-PT', 'fr', 'de', 'it', 'ru', 'ko', 'zh', 'zh-TW'];
  const dic = (l, m) => new Map([...leer(`i18n/textos/${l}/${m}.ts`).matchAll(/^ {2}([A-Za-z][A-Za-z0-9_]*): '((?:[^'\\]|\\.)*)',$/gm)].map((x) => [x[1], x[2]]));
  const CLAVES = ['model3dAlt', 'model3dTitle', 'model3dSearching', 'model3dLoading', 'model3dNone', 'model3dError', 'model3dFrame', 'model3dSpin', 'model3dStopSpin',
    'model3dHint', 'model3dNative', 'model3dNoDelivery', 'model3dArriving', 'model3dGone', 'model3dUnknown'];
  const faltanI = LOCALES.flatMap((l) => { const c = dic(l, 'creaciones'); const f = dic(l, 'filmmaker'); return [...CLAVES.filter((k) => !c.has(k)).map((k) => `${l}:creaciones.${k}`), ...(f.has('wsModel3dView') ? [] : [`${l}:filmmaker.wsModel3dView`])]; });
  check('I1) las del visor (en Mis creaciones) y la de la ficha, en los once', faltanI.length === 0, faltanI.join(', '));
  const huecos = (v) => [...v.matchAll(/\{\{(\w+)\}\}/g)].map((x) => x[1]).sort().join(',');
  const es = dic('es', 'creaciones');
  const malos = LOCALES.flatMap((l) => { const d = dic(l, 'creaciones'); return CLAVES.filter((k) => huecos(d.get(k) ?? '') !== huecos(es.get(k))).map((k) => `${l}:${k}`); });
  check('I2) cada traducción conserva sus huecos', malos.length === 0, malos.join(', '));
  const PROVEEDORES_V = /\bR2\b|Cloudflare|Google|three|model-viewer|Seedance|BytePlus|Firebase/i;
  const nombran = LOCALES.flatMap((l) => { const d = dic(l, 'creaciones'); return CLAVES.filter((k) => PROVEEDORES_V.test(d.get(k) ?? '')).map((k) => `${l}:${k}`); });
  check('I3) ningún texto nombra un almacén, una librería ni un proveedor', nombran.length === 0, nombran.join(', '));
  check('I4) portugués de Brasil y europeo, cada uno el suyo', /celular/.test(dic('pt', 'creaciones').get('model3dNative')) && /telemóvel/.test(dic('pt-PT', 'creaciones').get('model3dNative')));
  check('I5) el módulo del workspace no habla de «modelos» (la regla del Studio): los textos del visor viven en Mis creaciones', !/model/i.test((leer('i18n/textos/es/workspace.ts') + leer('i18n/textos/en/workspace.ts')).replace(/^\s*\*.*$/gm, '')));
  check('I6) en todo lo dibujado no faltó ni una clave', faltan.size === 0, [...faltan].join(', '));
}

/* ═══ J · LAS GUARDAS ════════════════════════════════════════════════════ */
console.log('\n── J · Dos dependencias y solo dos, la librería solo en el visor web, ni una pantalla, ni un contrato ──');
{
  const antes = JSON.parse(git(`show ${BASE_V}:package.json`));
  const ahora = HASTA_V ? JSON.parse(git(`show ${HASTA_V}:package.json`)) : JSON.parse(leer('package.json'));
  const nuevas = Object.keys(ahora.dependencies).filter((k) => !(k in antes.dependencies)).sort();
  const quitadas = Object.keys(antes.dependencies).filter((k) => !(k in ahora.dependencies));
  const cambiadas = Object.keys(antes.dependencies).filter((k) => k in ahora.dependencies && antes.dependencies[k] !== ahora.dependencies[k]);
  check('J1) dos dependencias nuevas —el visor y su motor gráfico, que el proyecto instala sin pares automáticos— y ninguna quitada ni cambiada',
    JSON.stringify(nuevas) === JSON.stringify(['@google/model-viewer', 'three']) && quitadas.length === 0 && cambiadas.length === 0
    && JSON.stringify(antes.devDependencies) === JSON.stringify(ahora.devDependencies), `${nuevas.join(',')} · ${quitadas.join(',')} · ${cambiadas.join(',')}`);
  const CODIGO_APP = ['components', 'screens', 'hooks', 'services', 'utils', 'constants', 'navigation', 'contexts'].flatMap((d) => {
    const andar = (dir) => fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? andar(`${dir}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${dir}/${e.name}`] : []));
    return andar(d);
  });
  const conLibreria = CODIGO_APP.filter((f) => /from '@google\/model-viewer'|import\('@google\/model-viewer'\)|from 'three'/.test(leer(f)));
  check('J2) la librería 3D solo la toca el visor web; three, nadie directamente', JSON.stringify(conLibreria) === JSON.stringify(['components/workspace/VisorDeModelo3d.web.tsx']), conLibreria.join(', '));
  const nuevosV = git(`diff --name-only --diff-filter=A ${TRAMO_V} -- components screens hooks services constants utils functions/src`).trim().split('\n').filter(Boolean).sort();
  check('J3) lo nuevo: el visor (web, nativo y lo común) y el hook; ni una pantalla, ni un servicio, ni una biblioteca',
    JSON.stringify(nuevosV) === JSON.stringify(['components/workspace/VisorDeModelo3d.tsx', 'components/workspace/VisorDeModelo3d.web.tsx', 'components/workspace/visorDeModelo3d.comun.ts', 'hooks/useModelos3d.ts']), nuevosV.join(', '));
  const pantallas = git(`diff --name-only ${TRAMO_V} -- screens navigation constants/studioWorkspace.ts`).trim().split('\n').filter(Boolean).sort();
  check('J4) ni una pantalla ni una ruta nuevas: la de la producción y Mis creaciones, las de siempre', JSON.stringify(pantallas) === JSON.stringify(['screens/MisCreacionesScreen.tsx', 'screens/ProductionScreen.tsx']), pantallas.join(', '));
  const DISPOSICION = ['ProductionWorkspace', 'ProductionMobileEditor', 'ProductionTimeline', 'ProductionViewer', 'ProductionInspector', 'ProductionDirectorTabs',
    'ProductionDirectorPanel', 'ProductionProjectPanel', 'ProductionProyecto', 'ProductionShotProperties', 'ProductionTools'].map((f) => `${P3V}${f}.tsx`);
  check('J5) la disposición aprobada del workplace, sin tocar', git(`diff --name-only ${TRAMO_V} -- ${DISPOSICION.join(' ')}`).trim() === '');
  const servidor = git(`diff --name-only ${TRAMO_V} -- functions/src firestore.rules storage.rules firestore.indexes.json services/filmmaker/espejo`).trim().split('\n').filter(Boolean);
  check('J6) del servidor solo cambia la puerta de los modelos (`entregar`): ni F1, ni el Core, ni Media Cloud, ni Credits, ni reglas, ni el espejo',
    servidor.every((f) => f.startsWith('functions/src/models3d/')), servidor.join(', '));
  check('J7) el marco del Studio, igual: solo se añade el visor', git(`diff --name-only --diff-filter=M ${TRAMO_V} -- components/workspace`).trim() === '');
  check('J8) esta suite está en la cadena de `npm test`', /test\/filmmaker-3d-visor\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ filmmaker-3d-visor: ${n - failures}/${n}` : `\n✔ filmmaker-3d-visor: ${n}/${n}`);
if (failures) process.exit(1);
