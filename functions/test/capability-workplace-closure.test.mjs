/**
 * FILMMAKER ENGINE · FASE 31 — CADA CAPACIDAD, EN SU SITIO (capability-workplace-closure).
 *
 *   M · la matriz de `docs/CAPABILITY-WORKPLACE-CLOSURE.md`: las 76 de la auditoría y las del repaso, cada una con su
 *       categoría y sus reglas (una A no pide canary ni contrato; una E pide canary; una F, contrato), y cada anclaje
 *       apunta a un archivo y a una marca que existen;
 *   O · las operaciones de F1-A: 54 de 56 con control propio, y las dos que no, dichas y por qué;
 *   P · lo que llega de verdad: cada control nuevo produce la operación de F1-A de siempre, y aplicada con el F1-A del
 *       servidor, lo que cambia llega al texto de la toma (o a la lista, o a la estructura) — sin gastar nada;
 *   D · dónde está cada uno: en el panel del Plano, en el Proyecto, al elegir el formato y en Weë Studio;
 *   U · ni un botón muerto: lo que no hace nada está apagado y dice por qué;
 *   S · ni una llamada por fuera: ni proveedores, ni callables, ni el servidor desde una pantalla;
 *   X · las guardas: nada del servidor ni de los contratos, ninguna puerta, los once idiomas y las frases con sus huecos.
 *
 * El código de la app, con dobles de React Native y de Firebase y el traductor con el español de verdad; el arnés, el
 * de `f1d-postcanary.test.mjs`, copiado, con el bloque de dobles de la Fase 22 y el de Weë Studio de la Fase 28.
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

/* ═══ FASE 31 · lo que se prueba aquí ═══════════════════════════════════════ */
/** El último commit antes de esta fase, y el suyo si ya existe (sin él, el árbol de trabajo). */
const ANTES = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 29 "').trim();
const HASTA = git('log --format=%H -n 1 --grep "Phase 31: capability workplace closure"').trim();
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

/* ═══ Weë Studio, con los dobles de la Fase 28 (copiados tal cual de weeai-sin-simulacros) ═══ */
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


const existeArchivo = (p) => fs.existsSync(path.resolve(RAIZ, p));
const OPS = lib('filmmaker/operaciones.js');
const VAL = lib('filmmaker/validacion.js');
/** Las operaciones que produjo un control, aplicadas con el F1-A del servidor. */
const aplicar = (prod, ops) => {
  const r = OPS.aplicarOperaciones(prod, ops);
  if (!r.ok) throw new Error(`F1-A no la aplicó: ${JSON.stringify(r.problems?.[0])}`);
  return r.production;
};
/** El texto que la toma mandaría para esa unidad: el requisito de F1-A, leído por F1-D, con la plantilla de siempre. */
const textoDeLaToma = (prod, unitId) => plano.componerTextoDeWee(plano.leerRequisitoDePlano(requisito(prod, unitId)));
const ultimoGesto = () => gestos.at(-1);
const cuantosGestos = () => gestos.length;
const pieza = (f) => cargar(`components/studio/produccion/${f}.tsx`);
const DP = pieza('ProductionDireccionDelPlano');
const ASSET = (n) => `asset_${String(n).repeat(32).slice(0, 32)}`;

/* ═══ M · LA MATRIZ ═══════════════════════════════════════════════════════ */
console.log('\n── M · La matriz: las 76 y las del repaso, cada una con su categoría, sus reglas y su anclaje ──');
const DOC = leer('docs/CAPABILITY-WORKPLACE-CLOSURE.md');
const COLUMNAS = ['id', 'capacidad', 'descripcion', 'engine', 'adapter', 'provider', 'server', 'brain', 'ux', 'workplace', 'control', 'ruta', 'contrato', 'canary', 'dinero', 'cambio', 'cat', 'estado', 'accion', 'pendiente', 'anclaje'];
const crudas = DOC.split('\n').filter((l) => /^\| [CX]\d\d \|/.test(l)).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
const filasDeLaMatriz = crudas.map((c) => Object.fromEntries(COLUMNAS.map((k, i) => [k, c[i] ?? ''])));
const porId = new Map(filasDeLaMatriz.map((f) => [f.id, f]));
{
  const ids = filasDeLaMatriz.map((f) => f.id);
  const auditadas = Array.from({ length: 76 }, (_, i) => `C${String(i + 1).padStart(2, '0')}`);
  const faltan76 = auditadas.filter((id) => !ids.includes(id));
  check('M1) las 76 de la auditoría están todas, una vez, y ninguna fila se repite', faltan76.length === 0 && new Set(ids).size === ids.length && ids.length >= 76,
    faltan76.join(',') || `${ids.length} filasDeLaMatriz`);
  const malas = crudas.filter((c) => c.length !== COLUMNAS.length).map((c) => c[0]);
  check('M2) cada fila tiene las 21 columnas del encargo, y su categoría es una de A a G', malas.length === 0 && filasDeLaMatriz.every((f) => /^[A-G]$/.test(f.cat)),
    malas.join(',') || filasDeLaMatriz.filter((f) => !/^[A-G]$/.test(f.cat)).map((f) => f.id).join(','));
  const aMal = filasDeLaMatriz.filter((f) => f.cat === 'A' && (!/^no\b/.test(f.cambio) || /^sí/.test(f.canary) || f.anclaje === '—' || !f.anclaje));
  check('M3) una A no pide cambio de contrato ni un canary para usarse, y dice dónde está (su anclaje)', aMal.length === 0, aMal.map((f) => f.id).join(','));
  const eMal = filasDeLaMatriz.filter((f) => f.cat === 'E' && !/^sí/.test(f.canary));
  const fMal = filasDeLaMatriz.filter((f) => f.cat === 'F' && !/^sí/.test(f.cambio));
  const dMal = filasDeLaMatriz.filter((f) => f.cat === 'D' && !/^✔/.test(f.adapter));
  check('M4) una E pide canary; una F, un cambio de contrato (y dice cuál); una D tiene el adaptador y Filmmaker no lo usa',
    eMal.length === 0 && fMal.length === 0 && dMal.length === 0 && filasDeLaMatriz.filter((f) => f.cat === 'F').every((f) => f.cambio.length > 4),
    [...eMal, ...fMal, ...dMal].map((f) => f.id).join(','));
  const bs = filasDeLaMatriz.filter((f) => f.cat === 'B');
  const cMal = filasDeLaMatriz.filter((f) => f.cat === 'C' && (f.estado !== 'SIN EFECTO HOY' || !/^No se conecta/.test(f.accion)));
  check('M5) no queda ni una B; y una C solo si nadie la lee, dicho con su porqué', bs.length === 0 && cMal.length === 0, [...bs, ...cMal].map((f) => f.id).join(','));
  const ES_POR_MODULO = new Map();
  const tieneClave = (clave) => {
    const [mod, k] = clave.split('.');
    if (!ES_POR_MODULO.has(mod)) ES_POR_MODULO.set(mod, existeArchivo(`i18n/textos/es/${mod}.ts`) ? leer(`i18n/textos/es/${mod}.ts`) : '');
    return new RegExp(`^ {2}${k}(_one)?: '`, 'm').test(ES_POR_MODULO.get(mod));
  };
  const rotos = [];
  for (const f of filasDeLaMatriz) {
    if (!f.anclaje || f.anclaje === '—') continue;
    const [archivo, marca] = f.anclaje.split('#');
    if (!archivo || !marca || !existeArchivo(archivo)) { rotos.push(`${f.id}:${archivo}`); continue; }
    const fuente = sinComentarios(leer(archivo));
    const esClave = /^[a-z]+\.[A-Za-z_]+$/.test(marca);
    if (esClave ? !fuente.includes(`'${marca}'`) || !tieneClave(marca) : !fuente.includes(marca)) rotos.push(`${f.id}:${marca}`);
  }
  check('M6) cada anclaje existe: el archivo, la marca en su código (no en un comentario) y, si es un texto, su clave en español', rotos.length === 0, rotos.join(' · '));
  const cuenta = (c) => filasDeLaMatriz.filter((f) => f.cat === c).length;
  const dice = (etiqueta) => Number((new RegExp(`^\\| ${etiqueta} \\| (\\d+)`, 'm').exec(DOC) || [])[1]);
  check('M7) el resumen dice lo que la matriz cuenta',
    dice('A · Engine \\+ UX completo') === cuenta('A') && dice('B · Engine existe, UX incompleto') === cuenta('B') && dice('C · Engine existe, UX no existe') === cuenta('C')
    && dice('D · Adapter o proveedor existe, Filmmaker no lo usa') === cuenta('D') && dice('E · Requiere canary') === cuenta('E')
    && dice('F · Requiere cambio de contrato') === cuenta('F') && dice('G · No existe') === cuenta('G')
    && new RegExp(`^\\| Filas en la matriz \\| ${filasDeLaMatriz.length} `, 'm').test(DOC),
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((c) => `${c}:${cuenta(c)}/${dice(c === 'A' ? 'A · Engine \\+ UX completo' : c === 'B' ? 'B · Engine existe, UX incompleto' : c === 'C' ? 'C · Engine existe, UX no existe' : c === 'D' ? 'D · Adapter o proveedor existe, Filmmaker no lo usa' : c === 'E' ? 'E · Requiere canary' : c === 'F' ? 'F · Requiere cambio de contrato' : 'G · No existe')}`).join(' '));
  const bloqueadas = ['C49', 'C50', 'C51', 'C52', 'C59', 'C60', 'C67', 'X18'];
  check('M8) lo bloqueado sigue bloqueado en la matriz: ni una de las que esperan canary o contrato pasa por utilizable',
    bloqueadas.every((id) => porId.get(id) && porId.get(id).cat !== 'A'), bloqueadas.filter((id) => porId.get(id)?.cat === 'A').join(','));
  check('M9) y lo que se ve cerrado en la app dice su porqué en su sitio (C49, C51, C52, C59, C60, C67 anclan su motivo)',
    ['C49', 'C51', 'C52', 'C59', 'C60', 'C67'].every((id) => porId.get(id)?.anclaje && porId.get(id).anclaje !== '—'));
  const secciones = ['## A. Capacidades conectadas', '## B. Existentes pero bloqueadas', '## C. Requieren un cambio de contrato', '## D. Requieren canary',
    '## E. Las que de verdad no existen', '## F. Detectadas en Seedance', '## Los doce puntos'];
  check('M10) el documento tiene las secciones A–F y los doce puntos del encargo', secciones.every((s) => DOC.includes(s)), secciones.filter((s) => !DOC.includes(s)).join(' · '));
  const seedance = ['`first_frame`', '`last_frame`', '`reference_image`', '`reference_video`', '`reference_audio`', '`omni_reference_task_type: edit`', '`extend`', '`generate_audio`'];
  check('M11) Seedance, entrada por entrada: fotogramas, las tres referencias, editar, extender y el audio nativo', seedance.every((x) => DOC.includes(x)));
}

/* ═══ O · LAS OPERACIONES DE F1-A ═════════════════════════════════════════ */
console.log('\n── O · Las operaciones: 54 de 56 con control, y las dos que no, dichas ──');
{
  const lenguaje = [...new Set([...leer('functions/src/filmmaker/operaciones.ts').matchAll(/readonly op: '([a-z_]+)'/g)].map((m) => m[1]))];
  const delEditor = fs.readdirSync(path.resolve(RAIZ, 'components/studio/produccion')).map((f) => sinComentarios(leer(`components/studio/produccion/${f}`))).join('\n');
  const sin = lenguaje.filter((o) => !delEditor.includes(`op: '${o}'`));
  check('O1) de las 56 operaciones de F1-A, 54 tienen control propio', lenguaje.length === 56 && sin.length === 2, `${lenguaje.length - sin.length} de ${lenguaje.length}: faltan ${sin.join(', ')}`);
  check('O2) las dos que no son la calidad preferida y el plan de montaje, y la matriz dice que hoy no tienen efecto',
    JSON.stringify(sin.sort()) === JSON.stringify(['change_edit_plan', 'change_generation'])
    && porId.get('X10')?.estado === 'SIN EFECTO HOY' && porId.get('X11')?.estado === 'SIN EFECTO HOY' && /`change_generation`/.test(porId.get('X10')?.descripcion ?? ''));
  const conectadas = ['rename_production', 'change_subject', 'move_shot', 'replace_character', 'replace_reference'];
  check('O3) las cinco que se conectan en esta fase, cada una en su pieza', conectadas.every((o) => delEditor.includes(`op: '${o}'`)));
  check('O4) y Weë Brain sigue pudiendo decir las 56 con palabras', Object.keys(cargar('constants/filmmaker.ts').CLAVE_DE_OPERACION).length === 56);
}

/* ═══ P · LO QUE LLEGA DE VERDAD ══════════════════════════════════════════ */
console.log('\n── P · Cada control nuevo: la operación de siempre, y lo que cambia llega a la toma ──');
{
  /* P1–P3 · Qué pasa: en un plano, en una escena sin planos, y nada en una escena con planos */
  const Q = DP.ProductionQuePasa;
  const conSegunda = (extra = {}) => produccionUI({ ...extra });
  let d = dibujar(hc(Q, { espacio: espacioCon({ seleccion: { tipo: 'plano', id: 'sh-0102' } }) }));
  const nueva = d.campos.find((c) => c.etiqueta === 'Añadir una acción');
  const antes = cuantosGestos();
  nueva?.onGuardar('   ');
  const sinNada = cuantosGestos() === antes;
  nueva?.onGuardar('La lámpara parpadea tres veces');
  const opAccion = ultimoGesto()?.[0];
  const conAccion = aplicar(produccionUI(), ultimoGesto());
  check('P1) «Qué pasa» añade una acción al plano (`update_shot`), y en blanco no hace nada',
    sinNada && opAccion?.op === 'update_shot' && opAccion.shotId === 'sh-0102' && JSON.stringify(opAccion.changes) === JSON.stringify({ actions: ['La lámpara parpadea tres veces'] }));
  check('P2) y llega a la toma justo después de la descripción («Action: …»)',
    /^La lámpara se enciende\nAction: La lámpara parpadea tres veces\./.test(textoDeLaToma(conAccion, 'sh-0102')), textoDeLaToma(conAccion, 'sh-0102').slice(0, 120));
  const conDos = produccionUI();
  conDos.scenes[0].shots[0].actions = ['Sube la escalera', 'Abre la puerta'];
  d = dibujar(hc(Q, { espacio: espacioCon({ produccion: conDos }) }));
  const subir1 = boton(d, 'Subir la acción 1');
  boton(d, 'Bajar la acción 1')?.tocar();
  const bajada = ultimoGesto()?.[0]?.changes?.actions;
  boton(d, 'Quitar la acción 2')?.tocar();
  const quitada = ultimoGesto()?.[0]?.changes?.actions;
  check('P3) cada acción se reescribe, se sube, se baja y se quita (la primera no sube)',
    d.campos.some((c) => c.etiqueta === 'Acción 1' && c.valor === 'Sube la escalera') && subir1?.apagado === true
    && JSON.stringify(bajada) === JSON.stringify(['Abre la puerta', 'Sube la escalera']) && JSON.stringify(quitada) === JSON.stringify(['Sube la escalera']));
  const llena = produccionUI();
  llena.scenes[0].shots[0].actions = Array.from({ length: 16 }, (_, i) => `Acción ${i + 1}`);
  d = dibujar(hc(Q, { espacio: espacioCon({ produccion: llena }) }));
  check('P4) con 16 (el tope de F1-A) ya no se ofrece otra, y se dice', !d.campos.some((c) => c.etiqueta === 'Añadir una acción') && /Caben 16 acciones/.test(d.texto));
  const conEscenaSola = produccionUI();
  conEscenaSola.scenes.push({ id: 'sc-0002', order: 1, title: 'Noche', description: 'El mar de noche', durationSec: 3, shots: [] });
  const enLaEscena = dibujar(hc(Q, { espacio: espacioCon({ produccion: conEscenaSola, seleccion: { tipo: 'escena', id: 'sc-0002' } }) }));
  enLaEscena.campos.find((c) => c.etiqueta === 'Añadir una acción')?.onGuardar('Las olas rompen');
  const opEscena = ultimoGesto()?.[0];
  const conPlanos = dibujar(hc(Q, { espacio: espacioCon({ seleccion: { tipo: 'escena', id: 'sc-0001' } }) }));
  check('P5) en una escena sin planos va a la escena (y llega a su toma); en una con planos no se ofrece: nadie la leería',
    opEscena?.op === 'update_scene' && opEscena.sceneId === 'sc-0002' && /Action: Las olas rompen\./.test(textoDeLaToma(aplicar(conEscenaSola, [opEscena]), 'sc-0002'))
    && !/Qué pasa/.test(conPlanos.texto) && conPlanos.campos.length === 0);

  /* P6–P8 · El sujeto */
  const S = DP.ProductionSujeto;
  const conObjeto = produccionUI({ objects: [{ id: 'obj-lampara', name: 'La lámpara' }] });
  d = dibujar(hc(S, { espacio: espacioCon({ produccion: conObjeto }) }));
  boton(d, 'Luna')?.tocar();
  const opSujeto = ultimoGesto()?.[0];
  const conLuna = aplicar(conObjeto, [opSujeto]);
  check('P6) el sujeto es `change_subject` sobre el plano, y llega a la toma («Subject: Luna»)',
    opSujeto?.op === 'change_subject' && JSON.stringify(opSujeto.target) === JSON.stringify({ shotId: 'sh-0101' })
    && JSON.stringify(opSujeto.subject) === JSON.stringify({ characterId: 'char-luna' }) && /\nSubject: Luna\./.test(textoDeLaToma(conLuna, 'sh-0101')));
  d = dibujar(hc(S, { espacio: espacioCon({ produccion: conLuna }) }));
  boton(d, 'Rostro')?.tocar();
  const conCara = aplicar(conLuna, ultimoGesto());
  d = dibujar(hc(S, { espacio: espacioCon({ produccion: conCara }) }));
  d.campos.find((c) => c.etiqueta === 'El sujeto, en palabras')?.onGuardar('Mira el mar');
  const conPalabras = aplicar(conCara, ultimoGesto());
  check('P7) cómo de cerca y en palabras, sin perder lo que ya decía',
    /\nSubject: Luna, face framing\./.test(textoDeLaToma(conCara, 'sh-0101')) && /Subject: Luna, face framing, Mira el mar\./.test(textoDeLaToma(conPalabras, 'sh-0101'))
    && JSON.stringify(ultimoGesto()[0].subject) === JSON.stringify({ characterId: 'char-luna', focus: 'face', description: 'Mira el mar' }));
  d = dibujar(hc(S, { espacio: espacioCon({ produccion: conCara }) }));
  boton(d, 'La lámpara')?.tocar();
  const aObjeto = ultimoGesto()?.[0]?.subject;
  const tras = aplicar(conCara, ultimoGesto());
  check('P8) un personaje O un objeto, nunca los dos (F1-A no admite dos sujetos); en una escena no se ofrece',
    JSON.stringify(aObjeto) === JSON.stringify({ focus: 'face', objectId: 'obj-lampara' })
    && !VAL.validarProduccion(tras).problems.some((p) => p.parameters?.reason === 'two_subjects')
    && dibujar(hc(S, { espacio: espacioCon({ seleccion: { tipo: 'escena', id: 'sc-0001' } }) })).texto.trim() === '');

  /* P9–P11 · El estilo y el ánimo de cada nivel */
  const L = DP.ProductionAspectoDelNivel;
  confirmaciones.length = 0;
  d = dibujar(hc(L, { espacio: espacioCon() }));
  boton(d, 'Cinemático')?.tocar();
  await calma();
  const opEstilo = ultimoGesto()?.[0];
  d.campos.find((c) => c.etiqueta === 'Ánimo')?.onGuardar('Tenso');
  await calma();
  const opAnimo = ultimoGesto()?.[0];
  const conLook = aplicar(produccionUI(), [opEstilo, opAnimo]);
  check('P9) en un plano: `change_style` y `change_mood` con el plano como ámbito, sin preguntar, y llegan a la toma',
    opEstilo?.op === 'change_style' && JSON.stringify(opEstilo.target) === JSON.stringify({ scope: 'shot', shotId: 'sh-0101' }) && opEstilo.style === 'cinematic'
    && opAnimo?.op === 'change_mood' && opAnimo.mood === 'Tenso' && confirmaciones.length === 0
    && /shot style cinematic/.test(textoDeLaToma(conLook, 'sh-0101')) && /shot mood Tenso/.test(textoDeLaToma(conLook, 'sh-0101')));
  const conPropio = produccionUI();
  conPropio.scenes[0].shots[0].visual = { style: 'anime' };
  d = dibujar(hc(L, { espacio: espacioCon({ produccion: conPropio, seleccion: { tipo: 'escena', id: 'sc-0001' } }) }));
  const g0 = cuantosGestos();
  respuestaDeConfirmar = false;
  boton(d, 'Realista')?.tocar();
  await calma();
  const noSeAplico = cuantosGestos() === g0;
  const pregunta = confirmaciones.at(-1);
  respuestaDeConfirmar = true;
  boton(d, 'Realista')?.tocar();
  await calma();
  const enEscena = aplicar(conPropio, ultimoGesto());
  check('P10) en una escena, antes de quitar el estilo propio de sus planos se pregunta diciendo cuántos; sin un «sí», nada',
    noSeAplico && pregunta?.[0] === '1 escena o plano perderá su propio estilo' && /cada uno de sus planos/.test(pregunta?.[1] ?? '')
    && enEscena.scenes[0].visual?.style === 'realistic' && enEscena.scenes[0].shots[0].visual?.style === undefined, JSON.stringify(pregunta));
  const deBrain = produccionUI();
  deBrain.scenes[0].shots[0].visual = { style: 'noir' };
  d = dibujar(hc(L, { espacio: espacioCon({ produccion: deBrain }) }));
  boton(d, 'Quitar el estilo propio')?.tocar();
  await calma();
  check('P11) un estilo que no es de la lista (lo escribió Weë Brain) se ve tal cual y se quita',
    /Estilo: noir/.test(d.texto) && ultimoGesto()?.[0]?.op === 'change_style' && ultimoGesto()[0].style === null);

  /* P12 · Mover un plano a otra escena */
  const MV = DP.ProductionMoverPlano;
  const dosEscenas = produccionUI();
  dosEscenas.scenes.push({ id: 'sc-0002', order: 1, title: 'Noche', description: 'El mar de noche', shots: [{ id: 'sh-0201', order: 0, durationSec: 3, description: 'Olas' }] });
  recordar(true);
  const verMover = () => dibujar(hc(MV, { espacio: espacioCon({ produccion: dosEscenas }) }));
  verMover();
  boton(verMover(), 'Mover a otra escena')?.tocar();
  d = verMover();
  boton(d, 'Escena 2 · Noche')?.tocar();
  recordar(false);
  const movido = aplicar(dosEscenas, ultimoGesto());
  const conUna = dibujar(hc(MV, { espacio: espacioCon() }));
  check('P12) mover es `move_shot` a la escena elegida, al final; con una sola escena no se ofrece',
    JSON.stringify(ultimoGesto()?.[0]) === JSON.stringify({ op: 'move_shot', shotId: 'sh-0101', toSceneId: 'sc-0002' })
    && movido.scenes[1].shots.at(-1).id === 'sh-0101' && !boton(conUna, 'Mover a otra escena') && /Se pone al final de esa escena/.test(d.texto));

  /* P13–P15 · El brief: el nombre y las reglas de la pieza */
  const { ProductionBrief, ProductionDireccion } = pieza('ProductionBrief');
  d = dibujar(hc(ProductionBrief, { espacio: espacioCon() }));
  const nombre = d.campos.find((c) => c.etiqueta === 'Nombre de la producción');
  const g1 = cuantosGestos();
  nombre?.onGuardar('  ');
  const vacioNo = cuantosGestos() === g1;
  nombre?.onGuardar('El faro de Luna');
  check('P13) el nombre es `rename_production`; vacío, no (F1-A exige título)',
    nombre?.valor === 'El faro' && vacioNo && JSON.stringify(ultimoGesto()?.[0]) === JSON.stringify({ op: 'rename_production', title: 'El faro de Luna' })
    && aplicar(produccionUI(), ultimoGesto()).title === 'El faro de Luna');
  boton(d, 'Sin diálogo')?.tocar();
  const reglas = ultimoGesto()?.[0];
  const sinDialogo = aplicar(produccionUI(), [reglas]);
  const problemas = VAL.validarProduccion(sinDialogo).problems;
  const conSonido = produccionUI();
  conSonido.scenes[0].shots[1].audio = { withSound: true };
  const sonidoSinMusica = aplicar(conSonido, [{ op: 'change_intent', changes: { constraints: [{ kind: 'no_music' }] } }]);
  check('P14) las reglas son `change_intent` con sus restricciones: F1-A avisa si la pieza no las cumple, y la toma no genera sonido propio «sin música»',
    reglas?.op === 'change_intent' && JSON.stringify(reglas.changes) === JSON.stringify({ constraints: [{ kind: 'no_dialogue' }] })
    && problemas.some((p) => p.code === 'constraints_incompatible' && p.parameters?.reason === 'dialogue_present')
    && plano.evaluarPlano(plano.leerRequisitoDePlano(requisito(sonidoSinMusica, 'sh-0102')), 'standard').motivo === 'sound_constraints_not_supported');
  const conReglas = produccionUI({ intent: { objective: 'Un faro', constraints: [{ kind: 'no_music' }, { kind: 'aspect_ratio', aspectRatio: '9:16' }, { kind: 'note', text: 'Sin logos' }, { kind: 'include_character', characterId: 'char-luna' }, { kind: 'max_duration', seconds: 60 }] } });
  d = dibujar(hc(ProductionBrief, { espacio: espacioCon({ produccion: conReglas }) }));
  boton(d, 'Sin música')?.tocar();
  /* Sin reglas, F1-A quita el campo (`null`): se lee como lista vacía para que un fallo se diga, no reviente. */
  const quitaMusica = ultimoGesto()?.[0]?.changes?.constraints ?? [];
  const quitar = d.botones.filter((b) => b.etiqueta === 'Quitar esta regla');
  quitar[0]?.tocar();
  const quitaFormato = ultimoGesto()?.[0]?.changes?.constraints ?? [];
  const botonDe60 = d.botones.filter((b) => b.etiqueta === '60 s');
  check('P15) lo elegido se ve elegido; apagar una deja las demás; las que no tienen control (formato, nota) se ven y se quitan',
    boton(d, 'Sin música')?.elegido === true && boton(d, 'Luna')?.elegido === true && botonDe60[1]?.elegido === true
    && /El formato tiene que ser 9:16/.test(d.texto) && /Sin logos/.test(d.texto) && quitar.length === 2
    && !quitaMusica.some((c) => c.kind === 'no_music') && quitaMusica.length === 4
    && !quitaFormato.some((c) => c.kind === 'aspect_ratio') && quitaFormato.length === 4);

  /* P16–P17 · La paleta, y preguntar antes de pisar lo de dentro */
  const conGrading = produccionUI();
  conGrading.creativeDirection = { ...conGrading.creativeDirection, color: { grading: 'Cálido', palette: ['#F5B731'] } };
  d = dibujar(hc(ProductionDireccion, { espacio: espacioCon({ produccion: conGrading }) }));
  boton(d, 'Añadir #2E86AB a la paleta')?.tocar();
  const anadida = aplicar(conGrading, ultimoGesto());
  boton(d, 'Quitar #F5B731 de la paleta')?.tocar();
  const quitadaColor = ultimoGesto()?.[0]?.changes?.color;
  check('P16) la paleta es `change_direction` con el color entero: añadir y quitar sin perder el etalonaje, y llega a la toma',
    JSON.stringify(anadida.creativeDirection.color) === JSON.stringify({ grading: 'Cálido', palette: ['#F5B731', '#2E86AB'] })
    && /palette #F5B731 #2E86AB/.test(textoDeLaToma(anadida, 'sh-0101')) && JSON.stringify(quitadaColor) === JSON.stringify({ grading: 'Cálido' }));
  const llenaDeColor = produccionUI();
  llenaDeColor.creativeDirection = { ...llenaDeColor.creativeDirection, color: { palette: Array.from({ length: 16 }, (_, i) => `#0000${String(i).padStart(2, '0')}`) } };
  d = dibujar(hc(ProductionDireccion, { espacio: espacioCon({ produccion: llenaDeColor }) }));
  const ofrecidos = d.botones.filter((b) => /^Añadir #/.test(b.etiqueta ?? ''));
  const llenaDice = /La paleta está llena/.test(d.texto);
  const conDentro = produccionUI();
  conDentro.scenes[0].visual = { mood: 'Sereno' };
  conDentro.scenes[0].shots[0].visual = { mood: 'Tenso' };
  d = dibujar(hc(ProductionDireccion, { espacio: espacioCon({ produccion: conDentro }) }));
  confirmaciones.length = 0;
  respuestaDeConfirmar = false;
  const g2 = cuantosGestos();
  d.campos.find((c) => c.etiqueta === 'Ánimo')?.onGuardar('Melancólico');
  await calma();
  respuestaDeConfirmar = true;
  check('P17) con la paleta llena (16, el tope de F1-A) no se ofrece otro color; y fijar el ánimo de todo pregunta cuántos se perderían',
    ofrecidos.length > 0 && ofrecidos.every((b) => b.apagado) && llenaDice
    && confirmaciones.at(-1)?.[0] === '2 escenas o planos perderán su propio ánimo' && cuantosGestos() === g2, JSON.stringify(confirmaciones.at(-1)));

  /* P18–P20 · Las fichas: la apariencia y sustituir a un personaje */
  const Fichas = pieza('ProductionFichas').default;
  recordar(true);
  const verFichas = (esp) => dibujar(hc(Fichas, { clase: 'personaje', espacio: esp, nuevoId: () => 'char-n' }));
  const esp = espacioCon();
  verFichas(esp);
  boton(verFichas(esp), 'Abrir Luna')?.tocar();
  d = verFichas(esp);
  const apariencia0 = !!boton(d, 'Apariencia (0)');
  boton(d, 'Apariencia (0)')?.tocar();
  d = verFichas(esp);
  const rasgos = d.campos.map((c) => c.etiqueta).filter((e) => ['Rostro', 'Pelo', 'Cuerpo', 'Vestuario de siempre', 'Accesorios', 'Maquillaje'].includes(e));
  d.campos.find((c) => c.etiqueta === 'Pelo')?.onGuardar('Pelo gris recogido');
  const opPelo = ultimoGesto()?.[0];
  const conPelo = aplicar(produccionUI(), [opPelo]);
  check('P18) la apariencia rasgo a rasgo (los seis de un personaje) es `update_character`, y cada rasgo llega a la toma con su nombre',
    apariencia0 && rasgos.length === 6 && opPelo?.op === 'update_character' && JSON.stringify(opPelo.changes) === JSON.stringify({ appearance: { hair: { description: 'Pelo gris recogido' } } })
    && /Characters: Luna \(Pelo gris recogido\)/.test(textoDeLaToma(conPelo, 'sh-0101')), textoDeLaToma(conPelo, 'sh-0101'));
  confirmaciones.length = 0;
  boton(d, 'Sustituir por otro personaje')?.tocar();
  d = verFichas(esp);
  const g3 = cuantosGestos();
  respuestaDeConfirmar = false;
  boton(d, 'Mar')?.tocar();
  await calma();
  const sinSi = cuantosGestos() === g3;
  respuestaDeConfirmar = true;
  boton(d, 'Mar')?.tocar();
  await calma();
  recordar(false);
  const sustituido = aplicar(produccionUI(), ultimoGesto());
  check('P19) sustituir a un personaje pregunta antes y es `replace_character`: donde salía Luna —plano y línea— sale Mar, y Luna sigue en el reparto',
    sinSi && confirmaciones[0]?.[0] === '¿Sustituir a Luna por Mar?' && JSON.stringify(ultimoGesto()?.[0]) === JSON.stringify({ op: 'replace_character', fromCharacterId: 'char-luna', toCharacterId: 'char-mar' })
    && JSON.stringify(sustituido.scenes[0].shots[0].characterIds) === JSON.stringify(['char-mar']) && sustituido.scenes[0].shots[0].dialogue[0].characterId === 'char-mar'
    && sustituido.characters.some((c) => c.id === 'char-luna'));
  const unoSolo = produccionUI({ characters: [{ id: 'char-luna', name: 'Luna' }] });
  recordar(true);
  const esp1 = espacioCon({ produccion: unoSolo });
  verFichas(esp1);
  boton(verFichas(esp1), 'Abrir Luna')?.tocar();
  d = verFichas(esp1);
  recordar(false);
  recordar(true);
  const espL = espacioCon();
  const verLugares = () => dibujar(hc(Fichas, { clase: 'lugar', espacio: espL, nuevoId: () => 'loc-n' }));
  verLugares();
  boton(verLugares(), 'Abrir El faro')?.tocar();
  boton(verLugares(), 'Apariencia (0)')?.tocar();
  const lugares = verLugares();
  recordar(false);
  const deLugar = lugares.campos.map((c) => c.etiqueta).filter((e) => ['Entorno', 'Luz', 'Colores'].includes(e));
  check('P20) con un solo personaje no se ofrece sustituir; y un lugar tiene su apariencia (entorno, luz, colores), sin sustituir',
    !boton(d, 'Sustituir por otro personaje') && !/Sustituir/.test(lugares.texto) && deLugar.length === 3, deLugar.join(','));

  /* P21–P22 · Sustituir una referencia (solo por otra de su clase) */
  const Refs = pieza('ProductionReferencias').default;
  const conRefs = produccionUI({ references: [
    { id: 'ref-a', kind: 'image', assetId: ASSET('a'), description: 'Faro al alba', role: 'first_frame' },
    { id: 'ref-b', kind: 'image', assetId: ASSET('b'), description: 'Faro de noche' },
    { id: 'ref-v', kind: 'video', assetId: ASSET('c'), description: 'Olas' },
  ] });
  conRefs.scenes[0].shots[0].referenceIds = ['ref-a'];
  recordar(true);
  const espR = espacioCon({ produccion: conRefs });
  const verRefs = () => dibujar(hc(Refs, { espacio: espR }));
  verRefs();
  boton(verRefs(), 'Abrir Faro al alba')?.tocar();
  d = verRefs();
  boton(d, 'Sustituir por otra referencia')?.tocar();
  d = verRefs();
  const opciones = d.botones.map((b) => b.etiqueta).filter((e) => /en su lugar$/.test(e ?? ''));
  confirmaciones.length = 0;
  const g4 = cuantosGestos();
  respuestaDeConfirmar = false;
  boton(d, 'Usar «Faro de noche» en su lugar')?.tocar();
  await calma();
  const sinSiRef = cuantosGestos() === g4;
  respuestaDeConfirmar = true;
  boton(d, 'Usar «Faro de noche» en su lugar')?.tocar();
  await calma();
  const reemplazada = aplicar(conRefs, ultimoGesto());
  check('P21) sustituir una referencia pregunta (sin un «sí», nada) y es `replace_reference`: solo se ofrecen las de su clase, y el plano pasa a usar la otra',
    sinSiRef && JSON.stringify(opciones) === JSON.stringify(['Usar «Faro de noche» en su lugar']) && confirmaciones[0]?.[0] === '¿Sustituir «Faro al alba» por «Faro de noche»?'
    && JSON.stringify(ultimoGesto()?.[0]) === JSON.stringify({ op: 'replace_reference', fromReferenceId: 'ref-a', toReferenceId: 'ref-b' })
    && JSON.stringify(reemplazada.scenes[0].shots[0].referenceIds) === JSON.stringify(['ref-b']));
  boton(verRefs(), 'Abrir Olas')?.tocar();
  d = verRefs();
  recordar(false);
  check('P22) una referencia sin otra de su clase dice por qué no se puede sustituir', /Para sustituirla hace falta otra referencia de la misma clase/.test(d.texto) && !boton(d, 'Sustituir por otra referencia'));

  /* P23–P25 · Las referencias del plano, por papel */
  const EP = pieza('ProductionEnElPlano').default;
  const dosFotogramas = clon(conRefs);
  dosFotogramas.references.push({ id: 'ref-c', kind: 'image', assetId: ASSET('d'), description: 'Faro con niebla', role: 'first_frame' });
  d = dibujar(hc(EP, { espacio: espacioCon({ produccion: dosFotogramas }) }));
  const huecos = ['Primer fotograma', 'Último fotograma', 'Movimiento', 'Audio', 'Otras referencias'];
  boton(d, 'Faro con niebla')?.tocar();
  const opFotograma = ultimoGesto()?.[0];
  const unFotograma = aplicar(dosFotogramas, [opFotograma]);
  check('P23) cada papel tiene su hueco; un fotograma es uno como mucho: elegir otro sustituye al primero (F1-A no admite dos)',
    huecos.every((h) => d.texto.includes(h)) && opFotograma?.op === 'update_shot' && JSON.stringify(opFotograma.changes) === JSON.stringify({ referenceIds: ['ref-c'] })
    && !VAL.validarProduccion(unFotograma).problems.some((p) => p.parameters?.reason === 'more_than_one_frame'));
  const req = requisito(unFotograma, 'sh-0101');
  const veredicto = plano.evaluarPlano(plano.leerRequisitoDePlano(req), 'standard');
  check('P24) y se dice la verdad: con un fotograma el plano pediría imagen a vídeo, que hoy no se genera (y se avisa)',
    req.capability === 'video.image_to_video' && veredicto.ok === false && /Con referencias, este plano no se puede generar todavía/.test(d.texto)
    && /Generar con fotogramas y referencias llegará cuando se valide un modelo/.test(d.texto) && /vídeo a partir de una imagen/.test(d.texto));
  d = dibujar(hc(EP, { espacio: espacioCon() }));
  check('P25) sin referencias, los huecos siguen ahí —el fotograma inicial se encuentra en el plano— con dónde dárselas',
    huecos.every((h) => d.texto.includes(h)) && (d.texto.match(/Dáselo en Proyecto › Referencias/g) || []).length === 4 && /Sin referencias\./.test(d.texto));
}

/* ═══ D · DÓNDE ESTÁ CADA UNO ═════════════════════════════════════════════ */
console.log('\n── D · Dónde está: el panel del Plano, el Proyecto, el formato, el selector y Weë Studio ──');
{
  const Prop = pieza('ProductionShotProperties').default;
  const d = dibujar(hc(Prop, { espacio: espacioCon() }));
  const orden = ['Qué pasa', 'Sujeto del plano', 'Paso al plano siguiente', 'Estilo y ánimo de este plano', 'Quién sale', 'Referencias del plano'].map((x) => d.texto.indexOf(x));
  /* Los campos no salen como texto (el doble los pinta con su etiqueta como aria-label): su orden, por los campos. */
  const etiquetas = d.campos.map((c) => c.etiqueta);
  const camposEnOrden = ['Descripción', 'Añadir una acción', 'El sujeto, en palabras', 'Ánimo'].map((x) => etiquetas.indexOf(x));
  check('D1) en «Propiedades del plano», por su orden: qué se ve, qué pasa, el sujeto, la cámara, el estilo y el ánimo, quién sale y las referencias por papel',
    orden.every((i) => i >= 0) && orden.every((i, k) => k === 0 || i > orden[k - 1]) && camposEnOrden.every((i) => i >= 0) && camposEnOrden.every((i, k) => k === 0 || i > camposEnOrden[k - 1]),
    JSON.stringify(orden) + JSON.stringify(camposEnOrden));
  const conDos = produccionUI();
  conDos.scenes.push({ id: 'sc-0002', order: 1, title: 'Noche', description: 'El mar de noche', shots: [{ id: 'sh-0201', order: 0, durationSec: 3, description: 'Olas' }] });
  const conMover = dibujar(hc(Prop, { espacio: espacioCon({ produccion: conDos }) }));
  const enEscena = dibujar(hc(Prop, { espacio: espacioCon({ produccion: conDos, seleccion: { tipo: 'escena', id: 'sc-0001' } }) }));
  check('D1b) con dos escenas, «Mover a otra escena» está en la cabecera del plano (y en una escena, no); y la escena tiene su propio estilo y ánimo',
    !!boton(conMover, 'Mover a otra escena') && !boton(d, 'Mover a otra escena') && !boton(enEscena, 'Mover a otra escena') && /Estilo y ánimo de esta escena/.test(enEscena.texto));
  const dir = pieza('ProductionDirectorPanel').default;
  const director = dibujar(hc(dir, { produccion: produccionUI(), seleccion: { tipo: 'plano', id: 'sh-0101' }, recomendaciones: [], lista: undefined, porRehacer: { scenes: [], shots: [], audio: [], removed: [] }, rechazadas: new Set(), editable: true, onGesto: () => {}, onRechazar: () => {} }));
  check('D2) el inspector del Director sigue como estaba (ni qué pasa ni el sujeto: son del panel del Plano)', !/Qué pasa|Sujeto del plano/.test(director.texto));
  const Proyecto = pieza('ProductionProyecto').default;
  const brief = dibujar(hc(Proyecto, { espacio: espacioCon(), inicial: 'brief' }));
  const direccion = dibujar(hc(Proyecto, { espacio: espacioCon(), inicial: 'direccion' }));
  check('D3) en el Proyecto: el nombre y las reglas en el Brief; la paleta en la Dirección',
    brief.campos.some((c) => c.etiqueta === 'Nombre de la producción') && /Reglas de la pieza/.test(brief.texto) && /Paleta de color/.test(direccion.texto) && /Añadir un color/.test(direccion.texto));
  const FS = pieza('ProductionFormatSelector').default;
  const con45 = dibujar(hc(FS, { aspectRatio: '4:5', preset: 'ads', editable: true, onPreset() {}, onProporcion() {} }));
  const con169 = dibujar(hc(FS, { aspectRatio: '16:9', preset: 'youtube', editable: true, onPreset() {}, onProporcion() {} }));
  const CF = cargar('constants/filmmaker.ts');
  check('D4) al elegir 4:5 se dice que la toma no lo genera, con los más parecidos; en 16:9, nada',
    /Todavía no se pueden generar planos en 4:5\. Los formatos más parecidos que sí se generan: 9:16 y 1:1\./.test(con45.texto) && !/Todavía no se pueden generar/.test(con169.texto));
  check('D5) y lo que se dice es lo del servidor: el espejo de la app es igual a `LIMITES_DE_PLANO` de F1-D',
    JSON.stringify(CF.PROPORCIONES_QUE_SE_GENERAN) === JSON.stringify(plano.LIMITES_DE_PLANO.proporciones)
    && JSON.stringify(CF.PROPORCIONES_SUGERIDAS) === JSON.stringify(plano.LIMITES_DE_PLANO.proporcionesSugeridas));
  const Sel = pieza('ProductionSelectorDeCreaciones').default;
  const selector = dibujar(hc(Sel, { creaciones: { carga: 'sin_pedir', clase: null, lista: [], hayMas: false, cargandoMas: false, cargar() {}, cargarMas() {} }, onElegirCreacion() {}, onElegirGuardado() {}, onVolver() {} }));
  check('D6) el selector de Mis creaciones dice qué no sirve como referencia, y por qué', /los textos y los documentos de Mis creaciones no sirven como referencia/.test(selector.texto));

  /* D7–D8 · Weë Studio: las referencias de la caja no pasan a «Varias escenas», y se dice antes de crear */
  const Studio = cargarWeeAi('screens/StudioScreen.tsx').default;
  const verStudio = () => dibujar(hc(Studio));
  recordar(true);
  verStudio();
  ultima(capturas.entradas).onAbrir('videos');
  verStudio();
  ultima(capturas.panel).onElegir({ entrada: 'videos', experiencia: { id: 'multiScene', clave: 'studio.xpMultiScene' }, controles: {} });
  verStudio();
  await ultima(capturas.composer).onReferencia();
  await calma();
  const s = verStudio();
  capturas.navegar.length = 0;
  ultima(capturas.composer).onCambiar('Un faro al amanecer');
  verStudio();
  ultima(capturas.composer).onCrear();
  const [ruta, params] = ultima(capturas.navegar) ?? [];
  recordar(false);
  check('D7) con «Varias escenas» y una referencia en la caja, se dice que no pasa a la producción y dónde añadirla',
    /En «Varias escenas» estas referencias no pasan a la producción\. Dentro, añádelas desde Mis creaciones en Proyecto › Referencias\./.test(s.texto), s.texto.slice(0, 200));
  check('D8) y la producción se abre como siempre, sin inventar una referencia (no hay por dónde subirla sin su prueba real)',
    ruta === 'Production' && params?.intencion === 'Un faro al amanecer' && !('adjuntos' in (params ?? {})), JSON.stringify(ultima(capturas.navegar)));
  recordar(true);
  verStudio();
  ultima(capturas.entradas).onAbrir('images');
  verStudio();
  ultima(capturas.panel).onElegir({ entrada: 'images', controles: {} });
  verStudio();
  await ultima(capturas.composer).onReferencia();
  await calma();
  const otra = verStudio();
  recordar(false);
  check('D9) con otra puerta la referencia sí viaja, y el aviso no aparece', !/no pasan a la producción/.test(otra.texto));
}

/* ═══ U · NI UN BOTÓN MUERTO ══════════════════════════════════════════════ */
console.log('\n── U · Lo que no hace nada está apagado, y dice por qué ──');
{
  const tsx = (dir) => fs.readdirSync(path.resolve(RAIZ, dir), { recursive: true }).filter((f) => /\.tsx$/.test(f)).map((f) => `${dir}/${String(f).replace(/\\/g, '/')}`);
  /*
   * Las superficies de Weë Studio y de Weë AI: donde viven las capacidades de Filmmaker y sus puertas. Fuera de ellas hay
   * un «⋯» del perfil de otra persona que no hace nada (anterior a esto, fuera de Filmmaker): se propone arreglarlo aparte.
   */
  const PANTALLAS = ['BrainChatScreen', 'CrearVideoScreen', 'CreatorFlowScreen', 'DesignScreen', 'MisCreacionesScreen', 'ProductionScreen', 'ProjectScreen',
    'ProjectsScreen', 'SpecialistScreen', 'StudioPerfilScreen', 'StudioScreen', 'WeeCreatorScreen'].map((p) => `screens/${p}.tsx`);
  const archivos = [...['studio', 'creator', 'design', 'brain', 'proyectos', 'workspace', 'inspira'].flatMap((d) => tsx(`components/${d}`)), ...PANTALLAS];
  const NADA = /onPress=\{\(\) => (?:undefined|\{\s*\}|null)\}/g;
  /* La hoja de ajustes se traga el toque para que no cierre la hoja (y lo dice su comentario): no es un botón. */
  const PERMITIDOS = new Set(['components/creator/AjustesContextuales.tsx']);
  const muertos = [];
  for (const f of archivos) {
    if (PERMITIDOS.has(f)) continue;
    const s = sinComentarios(leer(f));
    for (const m of s.matchAll(NADA)) {
      const inicio = s.lastIndexOf('<', m.index);
      const fin = s.indexOf('>', m.index + m[0].length);
      const etiqueta = s.slice(inicio, fin + 1);
      if (!/\sdisabled(?:[\s/>]|=\{true\})/.test(etiqueta)) muertos.push(`${f}: ${etiqueta.slice(0, 80)}`);
    }
  }
  check(`U1) en Weë Studio y Weë AI (${archivos.length} archivos), un botón que no hace nada está apagado`, archivos.length > 100 && muertos.length === 0, muertos.join(' · '));
  const cerrados = [
    ['components/studio/produccion/ProductionShotGeneration.tsx', 'filmmaker.wsEditVideo', 'filmmaker.wsEditExtendClosed'],
    ['components/studio/produccion/ProductionFichas.tsx', 'filmmaker.wsVoiceChoose', 'filmmaker.wsVoiceCatalogClosed'],
  ];
  check('U2) y a su lado dice por qué (editar y extender; la voz de Weë)', cerrados.every(([f, a, b]) => { const s = sinComentarios(leer(f)); return s.includes(`'${a}'`) && s.includes(`'${b}'`); }));
  const nuevos = sinComentarios(leer('components/studio/produccion/ProductionDireccionDelPlano.tsx'));
  check('U3) las piezas nuevas no tienen ni un botón vacío', !/onPress=\{\(\) => (?:undefined|\{\s*\}|null)\}/.test(nuevos) && !/onPress=\{undefined\}/.test(nuevos));
}

/* ═══ S · NI UNA LLAMADA POR FUERA ════════════════════════════════════════ */
console.log('\n── S · Ni proveedores, ni callables, ni el servidor desde una pantalla ──');
{
  const todos = (dir) => (existeArchivo(dir) ? fs.readdirSync(path.resolve(RAIZ, dir), { recursive: true }).filter((f) => /\.(tsx?|jsx?)$/.test(f)).map((f) => `${dir}/${String(f).replace(/\\/g, '/')}`) : []);
  const APP = ['components', 'screens', 'hooks', 'utils', 'services', 'constants', 'contexts', 'navigation'].flatMap(todos).filter((f) => !f.includes('/espejo/'));
  const fuente = new Map(APP.map((f) => [f, sinComentarios(leer(f))]));
  const importan = (re) => APP.filter((f) => re.test(fuente.get(f)));
  check('S1) el servicio del vídeo solo lo usan sus dos hooks: ninguna pantalla ni pieza lo importa',
    JSON.stringify(importan(/from '[^']*services\/videoService'|from '\.\/videoService'/).filter((f) => !f.startsWith('services/')).sort()) === JSON.stringify(['hooks/useLoteDeTomas.ts', 'hooks/useTomaDePlano.ts']),
    importan(/services\/videoService'/).join(', '));
  /* La callable por su nombre (`'generateVideo'`); `crear.generateVideo` es una clave de texto, no una llamada. */
  check('S2) la callable `generateVideo` se nombra solo en su servicio', JSON.stringify(importan(/'generateVideo'/)) === JSON.stringify(['services/videoService.ts']), importan(/'generateVideo'/).join(', '));
  check('S3) ninguna pieza ni pantalla llama a una callable', importan(/httpsCallable/).every((f) => !f.startsWith('components/') && !f.startsWith('screens/')), importan(/httpsCallable/).filter((f) => f.startsWith('components/') || f.startsWith('screens/')).join(', '));
  check('S4) nada de la app importa el servidor', importan(/from '[^']*functions\/(src|lib)\//).length === 0, importan(/functions\/(src|lib)\//).join(', '));
  const PROVEEDORES = /bytepluses|volces\.com|ark\.cn-|api\.elevenlabs|generativelanguage\.googleapis|api\.openai\.com|api\.minimax|replicate\.com|fal\.ai|fal\.run|openrouter|together\.ai|huggingface/;
  check('S5) ni un proveedor ni un intermediario en la app: todo pasa por el WEË AI ENGINE del servidor', importan(PROVEEDORES).length === 0, importan(PROVEEDORES).join(', '));
  const piezas = ['components/studio/produccion/ProductionDireccionDelPlano.tsx', 'utils/produccionEditable.ts'].map((f) => fuente.get(f) ?? '');
  check('S6) las piezas de esta fase no hablan con nadie: ni servicios, ni Firebase, ni Credits, ni temporizadores',
    piezas.every((s) => s.length > 0 && !/services\/(?!filmmaker\/dominio)|firebase|Credits|spendCredits|setTimeout|setInterval|fetch\(/.test(s)));
}

/* ═══ X · LAS GUARDAS ═════════════════════════════════════════════════════ */
console.log('\n── X · Ni servidor, ni contratos, ni puertas; los once idiomas y cada frase con sus huecos ──');
{
  const servidor = git(`diff --name-only ${tramo} -- functions/src services/filmmaker/espejo firestore.rules storage.rules firestore.indexes.json`).trim();
  check('X1) nada del servidor, del espejo de F1-A, de las reglas ni de los índices: los contratos, cerrados como estaban', servidor === '', servidor);
  const appConAjustes = ['components', 'screens', 'hooks', 'utils', 'services', 'constants', 'contexts']
    .flatMap((dir) => fs.readdirSync(path.resolve(RAIZ, dir), { recursive: true }).filter((f) => /\.(tsx?)$/.test(f)).map((f) => `${dir}/${String(f).replace(/\\/g, '/')}`))
    .filter((f) => /aiSettings/.test(sinComentarios(leer(f))));
  check('X2) la app no toca ninguna puerta: `aiSettings` solo lo nombra el panel de administración, para enseñarlo',
    JSON.stringify(appConAjustes) === JSON.stringify(['screens/EngineAdminScreen.tsx']), appConAjustes.join(', '));
  check('X3) y las dos puertas del Core declaran lo mismo que antes', /const CAPACIDAD_DEL_CANARY: CapabilityId = 'text\.generate';/.test(leer('functions/src/creator/brain.ts'))
    && /const CAPACIDAD_DEL_CANARY[^=]*= 'video\.generate';/.test(leer('functions/src/creator/video.ts')));
  check('X4) en todo lo dibujado no faltó ni una clave', faltan.size === 0, [...faltan].join(', '));
  /* Cada `t('clave', { … })` de las piezas de esta fase pasa exactamente los huecos de su frase (Fase 31: `{{numero}}` no es `contador`). */
  const ES_FM = leer('i18n/textos/es/filmmaker.ts');
  const ES_ST = leer('i18n/textos/es/studio.ts');
  const frase = (clave) => {
    const [mod, k] = clave.split('.');
    const texto = mod === 'filmmaker' ? ES_FM : mod === 'studio' ? ES_ST : '';
    const m = new RegExp(`^ {2}${k}(?:_one|_other)?: '((?:[^'\\\\]|\\\\.)*)',`, 'm').exec(texto);
    return m ? m[1] : null;
  };
  const DE_LA_FASE = ['components/studio/produccion/ProductionDireccionDelPlano.tsx', 'components/studio/produccion/ProductionBrief.tsx', 'components/studio/produccion/ProductionFichas.tsx',
    'components/studio/produccion/ProductionReferencias.tsx', 'components/studio/produccion/ProductionEnElPlano.tsx', 'components/studio/produccion/ProductionFormatSelector.tsx',
    'components/studio/produccion/ProductionSelectorDeCreaciones.tsx', 'components/studio/produccion/ProductionShotProperties.tsx'];
  const descuadres = [];
  for (const f of DE_LA_FASE) {
    const s = sinComentarios(leer(f));
    for (const m of s.matchAll(/\bt\(\s*((?:[^(),]|\([^()]*\))*?'(?:filmmaker|studio)\.[A-Za-z_]+'(?:[^(),]|\([^()]*\))*?)(?:,\s*(\{(?:[^{}]|\{[^{}]*\})*\}))?\s*\)/g)) {
      const claves = [...m[1].matchAll(/'((?:filmmaker|studio)\.[A-Za-z_]+)'/g)].map((x) => x[1]);
      const dados = m[2] ? [...m[2].matchAll(/(?:^|[{,])\s*([A-Za-z_]+)\s*(?=[:,}])/g)].map((x) => x[1]) : [];
      for (const clave of claves) {
        const texto = frase(clave);
        if (texto === null) { descuadres.push(`${clave}: sin texto`); continue; }
        const huecos = [...new Set([...texto.matchAll(/\{\{(\w+)\}\}/g)].map((x) => x[1]))];
        const faltaHueco = huecos.filter((h) => !dados.includes(h));
        const sobra = dados.filter((d) => !huecos.includes(d) && !(d === 'contador' && /_one/.test(ES_FM.match(new RegExp(`^ {2}${clave.split('.')[1]}_one:`, 'm'))?.[0] ?? '')));
        if (faltaHueco.length || sobra.length) descuadres.push(`${clave}: faltan ${faltaHueco.join('/')} sobran ${sobra.join('/')}`);
      }
    }
  }
  check('X5) cada frase recibe exactamente sus huecos (un `{{numero}}` con `numero`, un plural con `contador`)', descuadres.length === 0, descuadres.slice(0, 5).join(' · '));
  /* Fase 34 del motor: el bloque de la Fase 31 acaba donde empieza el de la fase siguiente, si lo hay. */
  const inicio31 = ES_FM.indexOf('/* ── Fase 31 del motor: cada capacidad, en su sitio ── */');
  const siguiente = ES_FM.indexOf('/* ── Fase ', inicio31 + 1);
  const bloque = ES_FM.slice(inicio31, siguiente < 0 ? undefined : siguiente);
  const nuevas = [...bloque.matchAll(/^ {2}([A-Za-z][A-Za-z0-9_]*): '/gm)].map((m) => m[1]);
  const IDIOMAS = ['es', 'en', 'de', 'fr', 'it', 'pt', 'pt-PT', 'ru', 'ko', 'zh', 'zh-TW'];
  const faltanEn = IDIOMAS.flatMap((l) => {
    const s = leer(`i18n/textos/${l}/filmmaker.ts`) + leer(`i18n/textos/${l}/studio.ts`);
    return [...nuevas, 'refsNotInProduction'].filter((k) => !new RegExp(`^ {2}${k}: '`, 'm').test(s)).map((k) => `${l}:${k}`);
  });
  const ru = leer('i18n/textos/ru/filmmaker.ts');
  check(`X6) las ${nuevas.length + 1} frases de esta fase, en los once idiomas; y en ruso con sus cuatro formas de plural`,
    nuevas.length === 83 && faltanEn.length === 0 && ['wsOverrideStyleConfirm', 'wsOverrideMoodConfirm'].every((k) => ['_one', '_few', '_many', '_other'].every((f) => new RegExp(`^ {2}${k}${f}: '`, 'm').test(ru))),
    faltanEn.slice(0, 6).join(', ') || `${nuevas.length}`);
  const PT = leer('i18n/textos/pt/filmmaker.ts');
  const ptNuevo = PT.slice(PT.indexOf('/* ── Fase 31 del motor'));
  check('X7) el portugués es el de Brasil («você»), sin formas europeas; en chino, 作品 solo en «我的作品»',
    /você/.test(ptNuevo) && !/ficheiro|ecrã|telemóvel|Registe|\bestás\b|\btu\b/.test(ptNuevo)
    && ['zh', 'zh-TW'].every((l) => { const z = leer(`i18n/textos/${l}/filmmaker.ts`); return !/作品/.test(z.slice(z.indexOf('/* ── Fase 31 del motor')).replace(/我的作品/g, '')); }));
  check('X8) documentado: la matriz de cierre y la fase en el documento del motor',
    existeArchivo('docs/CAPABILITY-WORKPLACE-CLOSURE.md') && /### Fase 31 · /.test(leer('docs/FILMMAKER.md')) && /CAPABILITY-WORKPLACE-CLOSURE\.md/.test(leer('docs/FILMMAKER.md')));
  check('X9) esta suite está en la cadena de `npm test`', /capability-workplace-closure\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 31 · cada capacidad, en su sitio (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
