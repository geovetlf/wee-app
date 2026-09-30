/**
 * FILMMAKER ENGINE · 3D DENTRO DE FILMMAKER · IMPORTAR UN MODELO 3D (filmmaker-3d-importar).
 *
 * Una persona trae un modelo suyo (un GLB) desde Reparto, Lugares u Objetos y ese archivo pasa a ser material de su
 * CUENTA —el de Mis creaciones— y la cosa guardada que apunta a él. Aquí se prueba que eso es verdad sin un segundo
 * almacén, sin un segundo camino de subida y sin abrir nada:
 *
 *   A · la puerta `models3d`: cerrada por defecto y por cuenta; solo un GLB; la cuenta de la sesión; lo que cuenta del
 *       modelo, acotado; pedir y confirmar por MC-3, mirando el objeto; idempotente; lo ajeno no existe;
 *   B · el GLB, comprobado en la app antes de gastar una subida (la cabecera y el JSON de glTF 2.0);
 *   C · el hook: el recorrido entero, el progreso, cancelar, y reintentar con la MISMA clave sin duplicar;
 *   D · la pantalla: dentro de «Crear de otra forma», cerrada con su porqué hasta que el servidor la abre, cada estado
 *       dicho, y lo importado entra como lo de Mis creaciones (un Element que apunta al material, la ficha vinculada);
 *   E · los textos, en los once diccionarios;
 *   F · las guardas: la puerta sin exportar (Media Cloud sigue apagado), ni Credits, ni IA, ni contratos de F1, ni
 *       el workplace aprobado, ni una dependencia.
 *
 * El servidor, compilado, con el almacén de mentira de Media Cloud; la app, con dobles de React Native y de Firebase y
 * el traductor con el español de verdad. Nada sale a la red: ni un byte a un almacén, ni un proveedor, ni un Credit.
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


/* ═══ 3D DENTRO DE FILMMAKER · IMPORTAR UN MODELO 3D: lo que se prueba aquí ═══ */
const BASE_IMP = 'a861005';
/* Las vallas miran SU tramo en cuanto esta fase esté en un commit (antes, el árbol de trabajo): una fase posterior no las rompe. */
const HASTA_IMP = git('log --format=%H -n 1 --grep "3D inside Filmmaker: import a 3D model"').trim();
const TRAMO_IMP = HASTA_IMP ? `${BASE_IMP} ${HASTA_IMP}` : BASE_IMP;
const P3I = 'components/studio/produccion/';

/* ═══ A · LA PUERTA `models3d` ═══════════════════════════════════════════ */
console.log('\n── A · La puerta: cerrada por cuenta, solo un GLB, la cuenta de la sesión y MC-3 mirando el objeto ──');
const M3 = lib('models3d/index.js');
const { crearRegistroDeMedios, claveDelObjeto: claveDelObjeto3d } = lib('core/index.js');
const { crearAlmacenFalso: almacenFalso3d, DESCRIPTOR_FALSO: DESCRIPTOR_FALSO_3D, FAKE_PROVIDER_ID: FALSO_3D } = lib('media/falso.js');
const { identidadDeMaterialDeSubida: identidad3d } = lib('media/subida.js');
const REGISTRO_3D = crearRegistroDeMedios([DESCRIPTOR_FALSO_3D]).registro;
const ANA3 = 'cuentaDeAna3d';
const BEA3 = 'cuentaDeBea3d';
const T3 = 1_700_000_000_000;
const CLAVE3 = 'imp_ClaveDeAnaParaElRobot01';

const mundo3d = (o = {}) => {
  const almacen = almacenFalso3d({ ahora: () => T3 });
  const materiales = new Map(o.materiales ?? []);
  const fichas = new Map();
  const escrituras = [];
  const lineas = [];
  const abiertas = new Set(o.abiertas ?? [ANA3]);
  const deps = {
    db: {},
    cuentaDelPrincipal: async (p) => (p ? { accountId: p } : null),
    crearMaterial: async (d) => {
      escrituras.push(['crearMaterial', d.assetId]);
      const previo = materiales.get(d.assetId);
      if (previo) return previo.ownerAccountId === d.ownerAccountId ? { status: 'ya_estaba', material: previo } : { status: 'no_es_tuyo' };
      const m = {
        contract: 1, assetId: d.assetId, ownerAccountId: d.ownerAccountId, kind: d.kind, status: 'uploading', storageRef: d.storageRef,
        mimeType: d.mimeType, ...(d.name ? { name: d.name } : {}), ...(d.metadata ? { metadata: d.metadata } : {}), provenance: d.provenance, createdAt: T3, updatedAt: T3,
      };
      materiales.set(d.assetId, m);
      return { status: 'creado', material: m };
    },
    anotarPermiso: async () => {},
    leerMaterial: async (id) => materiales.get(id) ?? null,
    marcarSubido: async (accountId, assetId, medido) => {
      escrituras.push(['marcarSubido', assetId]);
      const m = materiales.get(assetId);
      if (!m) return { status: 'no_encontrado' };
      if (m.ownerAccountId !== accountId) return { status: 'no_es_tuyo' };
      if (m.status === 'ready') return { status: 'ya_estaba_listo', material: m };
      const nuevo = { ...m, status: 'ready', bytes: medido.bytes, mimeType: medido.mimeType ?? m.mimeType };
      materiales.set(assetId, nuevo);
      return { status: 'listo', material: nuevo };
    },
    objetos: {
      async leer(objectRef, accountId) { const f = fichas.get(objectRef); return f && f.accountId === accountId ? f : undefined; },
      async registrar(f) {
        escrituras.push(['registrarFicha', f.objectRef]);
        const previo = fichas.get(f.objectRef);
        if (previo) return previo.accountId === f.accountId ? { ok: true, objeto: previo, yaEstaba: true } : { ok: false, motivo: 'de_otra_cuenta' };
        fichas.set(f.objectRef, f);
        return { ok: true, objeto: f, yaEstaba: false };
      },
      async marcarBorrado() { throw new Error('no debe borrar nada'); },
    },
    registro: REGISTRO_3D,
    adaptadores: { [FALSO_3D]: almacen },
    proveedor: FALSO_3D,
    ahora: () => T3,
    puertaAbierta: async (cuenta) => abiertas.has(cuenta),
    registrar: (l) => lineas.push(l),
  };
  return { deps, almacen, materiales, fichas, escrituras, lineas };
};
const pedir3d = (m, quien = ANA3, extra = {}) => M3.atenderModelos3d(m.deps, quien, { op: 'pedir_subida', operationId: CLAVE3, bytes: 5000, nombre: 'Robot', ...extra });
const confirmar3d = (m, quien = ANA3, clave = CLAVE3) => M3.atenderModelos3d(m.deps, quien, { op: 'confirmar_subida', operationId: clave });
const ponerBytes3d = (m, cuenta = ANA3, clave = CLAVE3, cuerpo = Buffer.alloc(4242, 7)) =>
  m.almacen.guardar({ destino: { provider: FALSO_3D, objectKey: claveDelObjeto3d(cuenta, identidad3d(cuenta, clave)) }, cuerpo, contentType: 'model/gltf-binary', siNoExiste: true });

{
  /* La puerta, leída de su documento: cerrada si no dice otra cosa. */
  const dbCon = (d, falla) => {
    const rutas = [];
    return { rutas, doc: (ruta) => ({ get: async () => { rutas.push(ruta); if (falla) throw new Error('sin lectura'); return { exists: d !== undefined, data: () => d }; } }) };
  };
  const sin = dbCon(undefined);
  const cerradaSinDoc = await M3.leerPuertaDeModelos3d(sin);
  check('A1) sin documento, cerrada; y se lee `aiSettings/modelos3d`', !M3.puertaDeModelos3dAbiertaPara(cerradaSinDoc, ANA3) && sin.rutas[0] === 'aiSettings/modelos3d' && M3.PUERTA_DE_MODELOS_3D === 'aiSettings/modelos3d');
  const soloAna = await M3.leerPuertaDeModelos3d(dbCon({ habilitado: true, cuentas: [ANA3] }));
  check('A2) abierta por cuentas concretas: para Ana sí, para Bea no', M3.puertaDeModelos3dAbiertaPara(soloAna, ANA3) && !M3.puertaDeModelos3dAbiertaPara(soloAna, BEA3));
  const vacia = await M3.leerPuertaDeModelos3d(dbCon({ habilitado: true, cuentas: [] }));
  const sinSi = await M3.leerPuertaDeModelos3d(dbCon({ habilitado: 'true', todas: true }));
  const rota = await M3.leerPuertaDeModelos3d(dbCon({ habilitado: true, todas: true }, true));
  check('A3) una lista vacía NO abre para todas; un «sí» que no es `true`, tampoco; y lo que no se puede leer, cerrada',
    !M3.puertaDeModelos3dAbiertaPara(vacia, ANA3) && !M3.puertaDeModelos3dAbiertaPara(sinSi, ANA3) && !M3.puertaDeModelos3dAbiertaPara(rota, ANA3));
  const todas = await M3.leerPuertaDeModelos3d(dbCon({ habilitado: true, todas: true }));
  check('A4) y para todas solo si se escribe', M3.puertaDeModelos3dAbiertaPara(todas, BEA3));

  const m = mundo3d();
  const estadoAna = await M3.atenderModelos3d(m.deps, ANA3, { op: 'estado' });
  const estadoBea = await M3.atenderModelos3d(m.deps, BEA3, { op: 'estado' });
  check('A5) `estado` dice si está abierta PARA ESA CUENTA, sin escribir nada', estadoAna.ok && estadoAna.importar === true && estadoBea.ok && estadoBea.importar === false && m.escrituras.length === 0);
  const cerrada = await pedir3d(m, BEA3);
  check('A6) cerrada para Bea: `cerrada`, y NI UNA escritura (ni material a medias)', !cerrada.ok && cerrada.motivo === 'cerrada' && m.escrituras.length === 0 && m.materiales.size === 0);

  const r = await pedir3d(m, ANA3, { kind: 'video', contentType: 'text/html', accountId: BEA3, metadatos: { mallas: 3, materiales: 2, animaciones: 1, nodos: 9, cosa: 'x', trucos: -1 } });
  const assetId = identidad3d(ANA3, CLAVE3);
  const mat = m.materiales.get(assetId);
  check('A7) abierta para Ana: el permiso trae a dónde, cómo, las cabeceras firmadas, hasta cuándo y su material',
    r.ok && r.op === 'pedir_subida' && r.subida.assetId === assetId && r.subida.metodo === 'PUT' && typeof r.subida.url === 'string'
    && r.subida.cabeceras['content-type'] === 'model/gltf-binary' && r.subida.cabeceras['if-none-match'] === '*' && r.subida.maxBytes === 5000, JSON.stringify(r).slice(0, 200));
  check('A8) el tipo y el formato los pone la puerta: lo que manda quien llama (vídeo, HTML) no se lee',
    mat?.kind === 'model3d' && mat?.mimeType === 'model/gltf-binary' && mat?.status === 'uploading');
  check('A9) la cuenta sale de la sesión: un `accountId` en los datos no existe', mat?.ownerAccountId === ANA3);
  check('A10) lo que se cuenta del modelo, acotado: enteros pequeños y nada más; el formato lo pone la puerta',
    JSON.stringify(mat?.metadata) === JSON.stringify({ formato: 'glb', gltf: '2.0', mallas: 3, materiales: 2, animaciones: 1, nodos: 9 }), JSON.stringify(mat?.metadata));
  check('A11) el nombre, el suyo', mat?.name === 'Robot');
  check('A12) la respuesta no lleva contenedor, clave del objeto, proveedor ni credencial',
    r.ok && Object.keys(r.subida).sort().join(',') === 'assetId,cabeceras,expiraEn,intentId,maxBytes,metodo,url,vigenciaSegundos' && !('providerId' in r.subida) && !/secret|credential|accessKey/i.test(JSON.stringify(r)));
  check('A13) y lo que se registra no lleva la URL (una URL de subida es una credencial)',
    m.lineas.length === 1 && !JSON.stringify(m.lineas).includes('https://') && m.lineas[0].resultado === 'concedida');

  const otra = await pedir3d(m, ANA3, { bytes: 5000 });
  check('A14) la misma clave, otra vez: el MISMO material y ninguno más', otra.ok && otra.subida.assetId === assetId && m.materiales.size === 1);

  const pronto = await confirmar3d(m);
  check('A15) confirmar sin bytes: `pendiente`, y el material sigue esperando', !pronto.ok && pronto.motivo === 'pendiente' && m.materiales.get(assetId).status === 'uploading');
  await ponerBytes3d(m);
  const hecho = await confirmar3d(m);
  check('A16) con los bytes puestos: listo, con lo que PESA de verdad (no lo que se dijo al pedir)',
    hecho.ok && hecho.assetId === assetId && hecho.bytes === 4242 && m.materiales.get(assetId).status === 'ready' && m.materiales.get(assetId).bytes === 4242);
  const dos = await confirmar3d(m);
  check('A17) confirmar dos veces no duplica nada', dos.ok && m.fichas.size === 1);
  const deBea = await confirmar3d(m, BEA3);
  check('A18) Bea, con la puerta cerrada para ella, no confirma nada; el material de Ana sigue como estaba',
    !deBea.ok && deBea.motivo === 'cerrada' && m.materiales.get(assetId).status === 'ready' && m.materiales.get(assetId).ownerAccountId === ANA3);

  /* Con la puerta abierta también para Bea, lo ajeno sigue sin existir. */
  const mb = mundo3d({ abiertas: [ANA3, BEA3] });
  await pedir3d(mb, ANA3);
  const ajeno = await confirmar3d(mb, BEA3);
  check('A19) abierta para las dos, la clave de Ana en manos de Bea: `no_disponible`, y el material de Ana, intacto',
    !ajeno.ok && ajeno.motivo === 'no_disponible' && mb.materiales.get(assetId).status === 'uploading' && mb.materiales.get(assetId).ownerAccountId === ANA3);

  /* Esta puerta solo cierra lo que ella abrió: la misma clave usada para otra clase de material no se confirma aquí. */
  const vid = identidad3d(ANA3, 'imp_OtraClaveParaUnVideo01');
  const mv = mundo3d({ materiales: [[vid, { contract: 1, assetId: vid, ownerAccountId: ANA3, kind: 'video', mimeType: 'video/mp4', status: 'uploading', storageRef: { provider: FALSO_3D, objectKey: claveDelObjeto3d(ANA3, vid) }, provenance: { createdAt: T3 }, createdAt: T3, updatedAt: T3 }]] });
  const otroTipo = await confirmar3d(mv, ANA3, 'imp_OtraClaveParaUnVideo01');
  check('A20) un material de otra clase con esa identidad: `no_disponible`, sin tocarlo', !otroTipo.ok && otroTipo.motivo === 'no_disponible' && mv.materiales.get(vid).status === 'uploading');

  const mc = mundo3d();
  const malas = await Promise.all([
    M3.atenderModelos3d(mc.deps, ANA3, { op: 'pedir_subida', operationId: 'corta', bytes: 10 }),
    M3.atenderModelos3d(mc.deps, ANA3, { op: 'pedir_subida', operationId: 'imp_con espacios y $$', bytes: 10 }),
    M3.atenderModelos3d(mc.deps, ANA3, { op: 'pedir_subida', operationId: CLAVE3, bytes: 10, nombre: 'x'.repeat(121) }),
    M3.atenderModelos3d(mc.deps, ANA3, { op: 'pedir_subida', operationId: CLAVE3, bytes: -5 }),
    M3.atenderModelos3d(mc.deps, ANA3, { op: 'pedir_subida', operationId: CLAVE3, bytes: 3 * 1024 ** 3 }),
    M3.atenderModelos3d(mc.deps, ANA3, { op: 'borrar' }),
  ]);
  check('A21) una clave sin forma, un nombre largo, un tamaño imposible o una operación que no existe: rechazados y dichos',
    malas[0].detalle === 'clave' && malas[1].detalle === 'clave' && malas[2].detalle === 'nombre' && malas[3].detalle === 'tamano' && malas[4].detalle === 'tamano' && malas[5].detalle === 'operacion',
    JSON.stringify(malas));
  check('A22) y ninguno deja un material a medias', mc.materiales.size === 0 && mc.escrituras.length === 0);
  const sinSesion = await M3.atenderModelos3d(mc.deps, '', { op: 'estado' });
  check('A23) sin sesión, nada', !sinSesion.ok && sinSesion.motivo === 'no_disponible');
  check('A24) lo que se cuenta del modelo, sin forma: solo el formato', JSON.stringify(M3.metadatosDelModelo(undefined)) === JSON.stringify({ formato: 'glb', gltf: '2.0' })
    && JSON.stringify(M3.metadatosDelModelo({ mallas: 1.5, materiales: '2', animaciones: 100001, nodos: null })) === JSON.stringify({ formato: 'glb', gltf: '2.0' }));
}

/* ═══ B · EL GLB, COMPROBADO EN LA APP ═══════════════════════════════════ */
console.log('\n── B · Un GLB, comprobado antes de gastar una subida ──');
const U3 = cargar('utils/modelo3d.ts');
const glb3 = ({ magia = 0x46546c67, version = 2, json = { asset: { version: '2.0' }, meshes: [{}], materials: [{}, {}], animations: [] }, tipo = 0x4e4f534a, largo, rellenar = true, extra = 0 } = {}) => {
  let texto = typeof json === 'string' ? json : JSON.stringify(json);
  while (rellenar && Buffer.byteLength(texto) % 4) texto += ' ';
  const cuerpo = Buffer.from(texto, 'utf8');
  const total = 20 + cuerpo.length + extra;
  const b = Buffer.alloc(total);
  b.writeUInt32LE(magia, 0); b.writeUInt32LE(version, 4); b.writeUInt32LE(largo ?? total, 8);
  b.writeUInt32LE(cuerpo.length, 12); b.writeUInt32LE(tipo, 16); cuerpo.copy(b, 20);
  return b;
};
const cabeza3 = (b, tam = b.length) => U3.leerCabeceraDeModelo(new Uint8Array(b.buffer, b.byteOffset, Math.min(b.length, 20)), tam);
{
  const bueno = glb3();
  const c = cabeza3(bueno);
  check('B1) un GLB 2.0 bien formado pasa, con el largo de su JSON', c.ok && c.bytesDelJson === bueno.length - 20);
  const json = U3.leerJsonDelModelo(bueno.subarray(20, 20 + c.bytesDelJson).toString('utf8'));
  check('B2) y se cuentan sus piezas', json.ok && JSON.stringify(json.piezas) === JSON.stringify({ mallas: 1, materiales: 2, animaciones: 0 }), JSON.stringify(json));
  check('B3) otra cosa (una imagen, un texto) no es un GLB', cabeza3(glb3({ magia: 0x474e5089 })).motivo === 'no_es_glb' && cabeza3(Buffer.from('hi')).motivo === 'no_es_glb');
  check('B4) un GLB de glTF 1.0: otra versión', cabeza3(glb3({ version: 1 })).motivo === 'version');
  check('B5) cortado o con algo pegado detrás: incompleto', cabeza3(glb3({ largo: 999999 })).motivo === 'incompleto' && cabeza3(glb3({ extra: 8 }), glb3({ extra: 8 }).length + 4).motivo === 'incompleto');
  check('B6) el primer trozo tiene que ser el JSON', cabeza3(glb3({ tipo: 0x004e4942 })).motivo === 'no_es_glb');
  check('B7) un JSON cuyo largo no es múltiplo de cuatro (no cuadra con el formato): incompleto', cabeza3(glb3({ rellenar: false, json: '{"asset":{"version":"2.0"}}' })).motivo === 'incompleto');
  check('B8) vacío', cabeza3(Buffer.alloc(0), 0).motivo === 'vacio');
  check('B9) un JSON roto es un archivo dañado; uno de glTF 1.x, otra versión',
    U3.leerJsonDelModelo('{roto').motivo === 'incompleto' && U3.leerJsonDelModelo('{"asset":{"version":"1.0"}}').motivo === 'version' && U3.leerJsonDelModelo('{"asset":{}}').motivo === 'version');
  const a = U3.nuevaClaveDeImportacion();
  const b = U3.nuevaClaveDeImportacion();
  check('B10) la clave de una importación tiene la forma que admite la puerta, y cada una es otra', M3.FORMA_DE_CLAVE_DE_IMPORTACION.test(a) && a !== b && a.startsWith('imp_'));
  check('B11) los fallos del ARCHIVO se arreglan eligiendo otro; los de la subida, reintentando',
    ['no_es_glb', 'version', 'incompleto', 'vacio', 'demasiado_grande'].every(U3.esFalloDelArchivo) && !['cerrada', 'no_disponible', 'subida_cortada', 'sigue_llegando', 'sin_respuesta'].some(U3.esFalloDelArchivo));
}

/* ═══ C · EL HOOK ═════════════════════════════════════════════════════════ */
console.log('\n── C · El recorrido entero: elegir, comprobar, pedir, mandar, confirmar y reintentar sin duplicar ──');
const archivo3 = (b, nombre = 'robot.glb') => ({
  name: nombre, size: b.length,
  slice: (desde, hasta) => ({ arrayBuffer: async () => { const s = b.subarray(desde, hasta); return s.buffer.slice(s.byteOffset, s.byteOffset + s.byteLength); } }),
});
const servicio3 = { llamadas: [], estado: true, pedir: null, envios: [], confirmaciones: [] };
let elegible3 = true;
let proximo3 = null;
const assetsDoble3 = {
  assetsService: {
    importacionDeModelosAbierta: async () => { servicio3.llamadas.push(['estado']); return servicio3.estado; },
    pedirSubidaDeModelo: async (p) => { servicio3.llamadas.push(['pedir', p]); return servicio3.pedir(p); },
    enviarModelo: async (subida, archivo, alAvanzar) => { servicio3.llamadas.push(['enviar', subida.url]); alAvanzar(0.42); return servicio3.envios.shift() ?? 'ok'; },
    confirmarSubidaDeModelo: async (clave) => { servicio3.llamadas.push(['confirmar', clave]); return servicio3.confirmaciones.shift() ?? { ok: false, motivo: 'pendiente' }; },
  },
};
const SUBIDA3 = { assetId: 'asset_del_robot_0001', url: 'https://almacen.invalid/sube', metodo: 'PUT', cabeceras: { 'content-type': 'model/gltf-binary' }, maxBytes: 1, expiraEn: 1 };
const nuevoHook3 = () => {
  const m = miniReact();
  const cargarHook = crearCargador({ dobles: { ...dobles, react: { ...React, ...m.react }, '../services/assetsService': assetsDoble3,
    '../utils/elegirArchivo': { sePuedeElegirUnArchivo: () => elegible3, elegirUnArchivo: async () => proximo3 } } });
  const { useImportarModelo3d } = cargarHook('hooks/useImportarModelo3d.ts');
  return () => m.pasar(useImportarModelo3d);
};
const reiniciar3 = () => { servicio3.llamadas = []; servicio3.estado = true; servicio3.envios = []; servicio3.confirmaciones = []; servicio3.pedir = async () => ({ ok: true, subida: SUBIDA3 }); elegible3 = true; };
{
  reiniciar3();
  const usar = nuevoHook3();
  const h0 = usar();
  check('C1) sin preguntar, no se sabe (`null`); en la web se puede elegir', h0.abierta === null && h0.puedeElegir === true && h0.fase === 'lista');
  h0.comprobarPuerta(); h0.comprobarPuerta();
  await calma();
  check('C2) se pregunta UNA vez, y se sabe', usar().abierta === true && servicio3.llamadas.filter(([q]) => q === 'estado').length === 1);

  proximo3 = archivo3(glb3());
  servicio3.confirmaciones = [{ ok: true, assetId: 'asset_del_robot_0001', bytes: glb3().length }];
  const c = await usar().importar('Robot');
  const h1 = usar();
  const pedida = servicio3.llamadas.find(([q]) => q === 'pedir')?.[1];
  check('C3) un GLB bueno: se pide con su clave, lo que pesa, su nombre y sus piezas', pedida && M3.FORMA_DE_CLAVE_DE_IMPORTACION.test(pedida.operationId) && pedida.bytes === glb3().length
    && pedida.nombre === 'Robot' && JSON.stringify(pedida.metadatos) === JSON.stringify({ mallas: 1, materiales: 2, animaciones: 0 }), JSON.stringify(pedida));
  check('C4) se manda a donde dijo la puerta y se confirma con la MISMA clave',
    servicio3.llamadas.some(([q, u]) => q === 'enviar' && u === SUBIDA3.url) && servicio3.llamadas.find(([q]) => q === 'confirmar')?.[1] === pedida?.operationId);
  check('C5) y sale un material de Mis creaciones, de clase modelo 3D, listo para guardarse en la cuenta',
    c?.assetId === 'asset_del_robot_0001' && c?.clase === 'model3d' && c?.nombre === 'Robot' && h1.fase === 'hecha' && h1.progreso === 1 && h1.archivo?.piezas?.mallas === 1);

  reiniciar3();
  const usarMal = nuevoHook3();
  proximo3 = archivo3(Buffer.from('no soy un modelo, soy un texto cualquiera'), 'notas.glb');
  const nada = await usarMal().importar('Robot');
  check('C6) un archivo que no es un GLB: se dice, y no se pide NADA al servidor', nada === null && usarMal().fallo === 'no_es_glb' && usarMal().fase === 'fallida' && !servicio3.llamadas.some(([q]) => q === 'pedir'));

  const motivos = [];
  for (const [respuesta, esperado] of [
    [{ ok: false, motivo: 'cerrada' }, 'cerrada'],
    [{ ok: false, motivo: 'peticion_invalida', detalle: 'tamano' }, 'demasiado_grande'],
    [{ ok: false, motivo: 'no_disponible' }, 'no_disponible'],
    [{ ok: false, motivo: 'sin_respuesta' }, 'sin_respuesta'],
  ]) {
    reiniciar3();
    servicio3.pedir = async () => respuesta;
    const u = nuevoHook3();
    proximo3 = archivo3(glb3());
    await u().importar('Robot');
    motivos.push([u().fallo, esperado]);
  }
  check('C7) lo que dice la puerta, en su fallo: cerrada, demasiado grande, no disponible, sin respuesta', motivos.every(([a, b]) => a === b), JSON.stringify(motivos));

  /* Se corta: la confirmación no ve los bytes. Reintentar usa la MISMA clave: el mismo destino, ningún duplicado. */
  reiniciar3();
  const usarCorte = nuevoHook3();
  proximo3 = archivo3(glb3());
  servicio3.envios = ['fallo'];
  servicio3.confirmaciones = [{ ok: false, motivo: 'pendiente' }];
  await usarCorte().importar('Robot');
  check('C8) la subida se corta: `subida_cortada`', usarCorte().fallo === 'subida_cortada');
  servicio3.confirmaciones = [{ ok: true, assetId: 'asset_del_robot_0001', bytes: 100 }];
  const reintento = await usarCorte().reintentar('Robot');
  const claves = servicio3.llamadas.filter(([q]) => q === 'pedir').map(([, p]) => p.operationId);
  check('C9) reintentar pide con la MISMA clave (el mismo material) y termina', reintento?.assetId === 'asset_del_robot_0001' && claves.length === 2 && claves[0] === claves[1]);

  /* El envío falla porque los bytes YA estaban (un reintento): se pregunta antes de darlo por perdido. */
  reiniciar3();
  const usarYa = nuevoHook3();
  proximo3 = archivo3(glb3());
  servicio3.envios = ['fallo'];
  servicio3.confirmaciones = [{ ok: true, assetId: 'asset_del_robot_0001', bytes: 100 }];
  const ya = await usarYa().importar('Robot');
  check('C10) un envío que falla pero cuyos bytes ya están: se confirma y termina, sin volver a subir', ya?.assetId === 'asset_del_robot_0001' && servicio3.llamadas.filter(([q]) => q === 'enviar').length === 1);

  reiniciar3();
  const usarCancel = nuevoHook3();
  proximo3 = archivo3(glb3());
  servicio3.envios = ['cancelado'];
  const cancelado = await usarCancel().importar('Robot');
  check('C11) cancelar: vuelve al principio, sin fallo y sin confirmar nada', cancelado === null && usarCancel().fase === 'lista' && usarCancel().fallo === null && !servicio3.llamadas.some(([q]) => q === 'confirmar'));

  reiniciar3();
  elegible3 = false;
  const usarMovil = nuevoHook3();
  proximo3 = archivo3(glb3());
  const movil = await usarMovil().importar('Robot');
  check('C12) donde no se puede elegir un archivo (la app nativa): no se hace nada y se dice que no se puede', movil === null && usarMovil().puedeElegir === false && servicio3.llamadas.length === 0);

  reiniciar3();
  const usarLento = nuevoHook3();
  proximo3 = archivo3(glb3());
  servicio3.confirmaciones = [{ ok: false, motivo: 'pendiente' }, { ok: false, motivo: 'pendiente' }, { ok: false, motivo: 'pendiente' }];
  await usarLento().importar('Robot');
  check('C13) si los bytes no aparecen tras unas pocas esperas: `sigue_llegando` (no es una cola: se reintenta a mano)',
    usarLento().fallo === 'sigue_llegando' && servicio3.llamadas.filter(([q]) => q === 'confirmar').length === 3);
}

/* ═══ D · LA PANTALLA ═════════════════════════════════════════════════════ */
console.log('\n── D · Dentro de «Crear de otra forma»: cerrada con su porqué hasta que el servidor la abre, y cada estado dicho ──');
const Fichas3 = cargar(`${P3I}ProductionFichas.tsx`).default;
const Importar3 = cargar(`${P3I}ProductionImportarModelo.tsx`).default;
let pedidasAElements3 = [];
const crearEnLaCuenta3 = async (n) => { pedidasAElements3.push(n); return { ok: true, elemento: { elementId: 'el_del_servidor3d', type: n.type, name: n.name, version: 1 } }; };
const guardados3 = { carga: 'listos', lista: [], hayMas: false, cargandoMas: false, cargar() {}, cargarMas() {}, crear: crearEnLaCuenta3 };
const creaciones3 = { carga: 'listas', clase: 'image', lista: [], hayMas: false, cargandoMas: false, cargar() {}, cargarMas() {} };
let comprobadas3 = 0;
const MODELO3 = { assetId: 'asset_del_robot_0001', clase: 'model3d', nombre: 'Robot', miniatura: null, creadoEn: HOY };
const importacionCon = (o = {}) => ({
  abierta: true, puedeElegir: true, fase: 'lista', progreso: 0, fallo: null, archivo: null,
  comprobarPuerta() { comprobadas3 += 1; }, importar: async () => MODELO3, reintentar: async () => MODELO3, cancelar() {}, reiniciar() {}, ...o,
});
const espacio3 = (importacion) => espacioCon({ elementos: guardados3, creaciones: creaciones3, idsDeFichas: { personaje: () => 'ch_import_0001', lugar: () => 'lc_import_0001', objeto: () => 'ob_import_0001' }, ...(importacion ? { importacion } : {}) });
const abrirCrear3 = (espacio) => {
  boton(dibujar(hc(Fichas3, { clase: 'personaje', espacio, nuevoId: () => 'ch_import_0001' })), ES.filmmaker.wsCreateOther).tocar();
  return dibujar(hc(Fichas3, { clase: 'personaje', espacio, nuevoId: () => 'ch_import_0001' }));
};
{
  recordar(true);
  const sinServidor = abrirCrear3(espacio3(null));
  const imp0 = boton(sinServidor, ES.filmmaker.wsImport3d);
  check('D1) sin respuesta del servidor (o sin la puerta), cerrada con su porqué de siempre', imp0?.apagado === false && sinServidor.texto.includes(ES.filmmaker.wsImport3dWhy.slice(0, 30)));
  recordar(false);

  recordar(true);
  comprobadas3 = 0;
  const abiertaWeb = importacionCon();
  /* Los efectos corren solo aquí: al abrir el panel se pregunta al servidor. */
  correrEfectos = true;
  const hoja = abrirCrear3(espacio3(abiertaWeb));
  correrEfectos = false;
  check('D2) al abrir «Crear de otra forma» se pregunta al servidor', comprobadas3 >= 1);
  const imp = boton(hoja, ES.filmmaker.wsImport3d);
  check('D3) con la puerta abierta para la cuenta y un dispositivo que elige archivos: disponible, sin porqué', !!imp && !hoja.texto.includes(ES.filmmaker.wsImport3dWhy.slice(0, 30)));
  imp.tocar();
  const nombre = dibujar(hc(Fichas3, { clase: 'personaje', espacio: espacio3(abiertaWeb), nuevoId: () => 'ch_import_0001' }));
  check('D4) primero el nombre (como «Desde Mis creaciones»)', nombre.campos.some((c) => c.etiqueta === ES.filmmaker.wsCreateNameFirst));
  nombre.campos.find((c) => c.etiqueta === ES.filmmaker.wsCreateNameFirst).onGuardar('Robot');
  const paso = dibujar(hc(Fichas3, { clase: 'personaje', espacio: espacio3(abiertaWeb), nuevoId: () => 'ch_import_0001' }));
  check('D5) luego el paso de importar, en el sitio de la lista: para quién, qué formato y «Elegir el archivo»',
    paso.texto.includes('Para «Robot».') && paso.texto.includes(ES.filmmaker.wsImport3dFormats.slice(0, 30)) && !!boton(paso, ES.filmmaker.wsImport3dPick));
  pedidasAElements3 = [];
  const antes = gestos.length;
  boton(paso, ES.filmmaker.wsImport3dPick).tocar();
  await calma();
  check('D6) importado: se guarda en la cuenta como PERSONAJE apuntando al modelo (su id, ni una copia ni una URL)',
    pedidasAElements3.length === 1 && pedidasAElements3[0].type === 'character' && pedidasAElements3[0].name === 'Robot'
    && JSON.stringify(pedidasAElements3[0].refs) === JSON.stringify([{ assetId: 'asset_del_robot_0001', role: 'primary', kind: 'model3d' }]), JSON.stringify(pedidasAElements3));
  check('D7) y entra en el reparto vinculado, con las operaciones de F1-A de siempre',
    gestos.length === antes + 1 && JSON.stringify(gestos.at(-1)) === JSON.stringify([
      { op: 'add_character', character: { id: 'ch_import_0001', name: 'Robot' } },
      { op: 'update_character', characterId: 'ch_import_0001', changes: { element: { elementId: 'el_del_servidor3d', version: 1 } } },
    ]), JSON.stringify(gestos.at(-1)));
  const despues = dibujar(hc(Fichas3, { clase: 'personaje', espacio: espacio3(abiertaWeb), nuevoId: () => 'ch_import_0001' }));
  check('D8) y se dice que se importó y dónde está', despues.texto.includes('«Robot» se importó'));
  recordar(false);

  recordar(true);
  const hojaMovil = abrirCrear3(espacio3(importacionCon({ puedeElegir: false })));
  const impMovil = boton(hojaMovil, ES.filmmaker.wsImport3d);
  const avisosAntes = avisos.length;
  impMovil?.tocar();
  check('D9) abierta en el servidor pero sin poder elegir archivo (la app nativa): cerrada con ESE porqué, y tocarla lo dice',
    hojaMovil.texto.includes(ES.filmmaker.wsImport3dWhyDevice.slice(0, 30)) && avisos.length === avisosAntes + 1 && avisos.at(-1)?.[1] === ES.filmmaker.wsImport3dWhyDevice);
  recordar(false);

  /* Cada estado, dicho. */
  const pinta = (o, extra = {}) => dibujar(hc(Importar3, { nombre: 'Robot', importacion: importacionCon(o), guardando: false, error: null, onListo() {}, onVolver() {}, ...extra }));
  const archivo = { nombre: 'robot.glb', bytes: 12_400_000, piezas: { mallas: 3, materiales: 2, animaciones: 1 } };
  const comprobando = pinta({ fase: 'comprobando', archivo });
  check('D10) comprobando: el archivo, lo que pesa y sus piezas, y la frase', comprobando.texto.includes('robot.glb') && comprobando.texto.includes('12,4 MB')
    && comprobando.texto.includes('3 mallas') && comprobando.texto.includes('2 materiales') && comprobando.texto.includes('1 animación') && comprobando.texto.includes(ES.filmmaker.wsImport3dChecking), comprobando.texto.slice(0, 300));
  const subiendo = pinta({ fase: 'subiendo', progreso: 0.42, archivo });
  check('D11) subiendo: su barra y su porcentaje, y se puede cancelar', subiendo.texto.includes('Subiendo el modelo… 42') && !!boton(subiendo, ES.filmmaker.wsImport3dCancel) && !boton(subiendo, t('common.back')));
  const terminando = pinta({ fase: 'terminando', archivo });
  check('D12) terminando: dicho, sin botones para irse a medias', terminando.texto.includes(ES.filmmaker.wsImport3dFinishing) && terminando.botones.length === 0);
  const cortada = pinta({ fase: 'fallida', fallo: 'subida_cortada', archivo });
  check('D13) cortada: por qué, «Reintentar» y «Elegir otro archivo»', cortada.texto.includes(ES.filmmaker.wsImport3dErrUpload) && !!boton(cortada, ES.filmmaker.wsImport3dRetry) && !!boton(cortada, ES.filmmaker.wsImport3dOther));
  const noGlb = pinta({ fase: 'fallida', fallo: 'no_es_glb' });
  check('D14) un archivo que no vale: por qué y «Elegir otro archivo», sin «Reintentar»', noGlb.texto.includes(ES.filmmaker.wsImport3dErrNotGlb) && !boton(noGlb, ES.filmmaker.wsImport3dRetry) && !!boton(noGlb, ES.filmmaker.wsImport3dOther));
  const cerradaD = pinta({ fase: 'fallida', fallo: 'cerrada' });
  check('D15) cerrada para la cuenta: se dice, y solo se puede volver', cerradaD.texto.includes(ES.filmmaker.wsImport3dErrClosed) && !boton(cerradaD, ES.filmmaker.wsImport3dRetry) && !boton(cerradaD, ES.filmmaker.wsImport3dOther) && !!boton(cerradaD, t('common.back')));
  const guardando = pinta({ fase: 'hecha', progreso: 1, archivo }, { guardando: true });
  check('D16) importado y guardándose en la cuenta: dicho', guardando.texto.includes(ES.filmmaker.wsCreateSaving));
  const movil = pinta({ puedeElegir: false });
  check('D17) sin poder elegir un archivo, «Elegir el archivo» se ve apagado y dice por qué', boton(movil, ES.filmmaker.wsImport3dPick)?.apagado === false && movil.texto.includes(ES.filmmaker.wsImport3dFormats.slice(0, 20)));
  const frases = ['no_es_glb', 'version', 'incompleto', 'vacio', 'demasiado_grande', 'cerrada', 'no_disponible', 'subida_cortada', 'sigue_llegando', 'sin_respuesta']
    .map((f) => [f, pinta({ fase: 'fallida', fallo: f }).texto]);
  check('D18) cada fallo tiene su frase', frases.every(([, x]) => !/filmmaker\.wsImport3dErr/.test(x) && x.length > 60), frases.filter(([, x]) => x.length <= 60).map(([f]) => f).join(', '));

  const PIEZAS = [`${P3I}ProductionImportarModelo.tsx`, `${P3I}ProductionCrearFicha.tsx`, `${P3I}ProductionFichas.tsx`, 'constants/assetsDeFilmmaker.ts', 'utils/modelo3d.ts'];
  const hablan = PIEZAS.filter((f) => /httpsCallable|firebase\/|fetch\(|XMLHttpRequest|models3d'/.test(sinComentarios(leer(f)).replace(/import type [^;]*;/g, '')));
  check('D19) ninguna pieza habla con el servidor: lo hacen el hook y el servicio de Mis creaciones', hablan.length === 0, hablan.join(', '));
  const SERV = sinComentarios(leer('services/assetsService.ts'));
  check('D20) el servicio es el de Mis creaciones de siempre: la puerta `models3d` y el envío directo, sin URL escrita ni cuenta que mandar',
    /call<[^>]*>\('models3d'/.test(SERV) && /new XMLHttpRequest\(\)/.test(SERV) && !/https?:\/\//.test(SERV) && !/accountId/.test(SERV.slice(SERV.indexOf('importacionDeModelosAbierta'))));
}

/* ═══ E · LOS TEXTOS ══════════════════════════════════════════════════════ */
console.log('\n── E · Los textos, en los once diccionarios ──');
{
  const LOCALES = ['es', 'en', 'pt', 'pt-PT', 'fr', 'de', 'it', 'ru', 'ko', 'zh', 'zh-TW'];
  const NUEVAS = ['wsImport3dWhyDevice', 'wsImport3dFor', 'wsImport3dFormats', 'wsImport3dPick', 'wsImport3dChecking', 'wsImport3dPreparing', 'wsImport3dUploading',
    'wsImport3dFinishing', 'wsImport3dCancel', 'wsImport3dRetry', 'wsImport3dOther', 'wsImport3dErrNotGlb', 'wsImport3dErrVersion', 'wsImport3dErrBroken',
    'wsImport3dErrTooBig', 'wsImport3dErrClosed', 'wsImport3dErrUnavailable', 'wsImport3dErrUpload', 'wsImport3dErrArriving', 'wsImport3dErrNoAnswer', 'wsImport3dDone'];
  const PLURALES = ['wsImport3dMeshes', 'wsImport3dMaterials', 'wsImport3dAnimations'];
  const dic = (l) => new Map([...leer(`i18n/textos/${l}/filmmaker.ts`).matchAll(/^ {2}([A-Za-z][A-Za-z0-9_]*): '((?:[^'\\]|\\.)*)',$/gm)].map((m) => [m[1], m[2]]));
  const todos = Object.fromEntries(LOCALES.map((l) => [l, dic(l)]));
  const faltanE = LOCALES.flatMap((l) => [...NUEVAS, ...PLURALES.flatMap((p) => [`${p}_one`, `${p}_other`]), ...(l === 'ru' ? PLURALES.flatMap((p) => [`${p}_few`, `${p}_many`]) : [])]
    .filter((k) => !todos[l].has(k)).map((k) => `${l}:${k}`));
  check('E1) las claves nuevas están en los once (y en ruso, sus cuatro formas del plural)', faltanE.length === 0, faltanE.join(', '));
  const marcas = (v) => [...v.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join(',');
  const huecos = LOCALES.flatMap((l) => [...NUEVAS, ...PLURALES.map((p) => `${p}_other`)].filter((k) => marcas(todos[l].get(k) ?? '') !== marcas(todos.es.get(k))).map((k) => `${l}:${k}`));
  check('E2) cada traducción conserva sus huecos ({{nombre}}, {{porcentaje}}, {{contador}})', huecos.length === 0, huecos.join(', '));
  const PROVEEDORES = /\bR2\b|Cloudflare|Amazon|\bS3\b|Tripo|Hunyuan|Meshy|World Labs|Seedance|BytePlus|Firebase|Google/i;
  const nombran = LOCALES.flatMap((l) => [...todos[l]].filter(([k, v]) => k.startsWith('wsImport3d') && PROVEEDORES.test(v)).map(([k]) => `${l}:${k}`));
  check('E3) ningún texto nombra un almacén, un proveedor ni un modelo', nombran.length === 0, nombran.join(', '));
  check('E4) portugués de Brasil y europeo, cada uno el suyo', /arquivo/.test(todos.pt.get('wsImport3dPick')) && /celular/.test(todos.pt.get('wsImport3dWhyDevice'))
    && /ficheiro/.test(todos['pt-PT'].get('wsImport3dPick')) && /telemóvel/.test(todos['pt-PT'].get('wsImport3dWhyDevice')));
  check('E5) lo que ya existía dice la verdad nueva: solo GLB, y lo que falta es activar la subida',
    /GLB/.test(todos.es.get('wsImport3dText')) && !/glTF u OBJ/.test(todos.es.get('wsImport3dText')) && !/visor/.test(todos.es.get('wsImport3dWhy')) && /activar/.test(todos.es.get('wsImport3dWhy')));
  check('E6) en todo lo dibujado no faltó ni una clave', faltan.size === 0, [...faltan].join(', '));
}

/* ═══ F · LAS GUARDAS ═════════════════════════════════════════════════════ */
console.log('\n── F · La puerta sin exportar, ni Credits, ni IA, ni contratos, ni el workplace, ni una dependencia ──');
{
  const INDICE = sinComentarios(leer('functions/src/index.ts'));
  check('F1) la puerta NO está exportada: Media Cloud sigue sin estar activo para nadie', !/models3d/.test(INDICE) && (INDICE.match(/from '\.\/media\//g) || []).length === 1);
  const LOGICA = sinComentarios(leer('functions/src/models3d/index.ts'));
  const PUERTA = sinComentarios(leer('functions/src/models3d/puerta.ts'));
  check('F2) compone MC-3 y la Fase 11: ni otro camino de bytes, ni otro almacén', /solicitarSubida\(/.test(LOGICA) && /confirmarSubida\(/.test(LOGICA) && /from '\.\.\/media'/.test(LOGICA)
    && !/fetch\(|\.file\(|storageBucket|getStorage|XMLHttpRequest|collection\(/.test(LOGICA + PUERTA));
  check('F3) importar no cobra ni llama a ninguna IA: ni Credits, ni el motor, y solo los secretos del almacén',
    !/credit|engine|gateway|AI_SECRETS|runtime/i.test(LOGICA + PUERTA) && /secrets: MEDIA_SECRETS/.test(PUERTA));
  check('F4) la cuenta sale de la sesión; ningún `accountId` de los datos', !/\bd\.accountId|data\.accountId|datos\.accountId/.test(LOGICA + PUERTA) && /request\.auth\.uid/.test(PUERTA));
  check('F5) el tipo y el formato, escritos en el código', /kind: 'model3d'/.test(LOGICA) && /contentType: 'model\/gltf-binary'/.test(LOGICA));
  const nuevos = git(`diff --name-only --diff-filter=A ${TRAMO_IMP} -- components screens hooks services constants utils functions/src`).trim().split('\n').filter(Boolean).sort();
  const ESPERADOS_IMP = [`${P3I}ProductionImportarModelo.tsx`, 'functions/src/models3d/index.ts', 'functions/src/models3d/puerta.ts', 'hooks/useImportarModelo3d.ts', 'utils/elegirArchivo.ts', 'utils/modelo3d.ts'].sort();
  check('F6) lo nuevo: la puerta (lógica y callable), el hook, el paso de importar y dos utilidades puras; ni una pantalla, ni un servicio, ni una biblioteca',
    JSON.stringify(nuevos) === JSON.stringify(ESPERADOS_IMP), nuevos.join(', '));
  const pantallas = git(`diff --name-only ${TRAMO_IMP} -- screens navigation constants/studioWorkspace.ts components/workspace`).trim();
  check('F7) ni una pantalla ni una ruta nuevas: ProductionScreen solo pasa el hook al espacio', pantallas === 'screens/ProductionScreen.tsx', pantallas);
  const DISPOSICION = ['ProductionWorkspace', 'ProductionMobileEditor', 'ProductionTimeline', 'ProductionViewer', 'ProductionInspector', 'ProductionDirectorTabs',
    'ProductionDirectorPanel', 'ProductionProjectPanel', 'ProductionProyecto', 'ProductionShotProperties', 'ProductionTools'].map((f) => `${P3I}${f}.tsx`);
  const disp = git(`diff --name-only ${TRAMO_IMP} -- ${DISPOSICION.join(' ')}`).trim();
  check('F8) la disposición aprobada del workplace, sin tocar', disp === '', disp);
  const contratos = git(`diff --name-only ${TRAMO_IMP} -- functions/src/filmmaker functions/src/productions functions/src/shots functions/src/creator functions/src/core functions/src/media functions/src/content functions/src/credits services/filmmaker/espejo firestore.rules storage.rules firestore.indexes.json`).trim();
  check('F9) ni F1-A/B/C/D, ni el Core, ni Media Cloud, ni el material, ni Credits, ni el espejo, ni reglas', contratos === '', contratos);
  check('F10) ni una dependencia nueva', git(`diff ${TRAMO_IMP} -- package.json package-lock.json functions/package-lock.json`).trim() === '');
  const MAPA = cargar('constants/assetsDeFilmmaker.ts').CAPACIDADES_DE_CREACION;
  const imp = MAPA.find((c) => c.id === 'importar_modelo_3d');
  check('F11) en el mapa sigue CERRADA por defecto (activación) y la abre, por cuenta, su puerta del servidor; ninguna otra se abre así',
    imp?.disponible === false && imp?.bloqueo === 'activacion' && imp?.puerta === 'modelos3d' && MAPA.filter((c) => c.puerta).length === 1);
  check('F12) esta suite está en la cadena de `npm test`', /test\/filmmaker-3d-importar\.test\.mjs/.test(leer('functions/package.json')));
  const { TOCADOS_POR_EL_MOTOR } = await import('./motor-filmmaker-alcance.mjs');
  check('F13) la lista nominal del motor nombra los dos archivos de la puerta', ['functions/src/models3d/index.ts', 'functions/src/models3d/puerta.ts'].every((f) => TOCADOS_POR_EL_MOTOR.includes(f)));
}

console.log(failures ? `\n✘ filmmaker-3d-importar: ${n - failures}/${n}` : `\n✔ filmmaker-3d-importar: ${n}/${n}`);
if (failures) process.exit(1);
