/**
 * FILMMAKER ENGINE · FASE 25 — LA LÍNEA DE TIEMPO Y EL SONIDO: LAS TRANSICIONES, EN SU PISTA Y EN SU HERRAMIENTA, Y EL
 * SONIDO DEL PLANO, DE LA ESCENA Y DE LA PRODUCCIÓN.
 *
 *   M · la pista de las transiciones: la de cada plano, en su corte, con su nombre; la del último no se ve, y sin
 *       línea de tiempo exacta no se inventa ningún corte;
 *   T · la herramienta «Transiciones», de verdad (antes decía que «llegarían»): la del plano y la de la producción, con
 *       `change_transition`, y lo heredado dicho; y en el teléfono también;
 *   A · el sonido: el propio del vídeo —con él se cotiza la toma y suena en el montaje— y lo que tiene que sonar, del
 *       plano o de la escena; y los sonidos descritos, cada uno donde suena y con su nivel en la mezcla, diciendo que
 *       todavía no se mezclan porque generar música y efectos sigue cerrado;
 *   X · las guardas: nada del servidor, ni F1-A; ni un proveedor de audio; los once idiomas.
 *
 * Cada gesto se APLICA con F1-A de verdad sobre una producción viva (X3). El código de la app, con dobles de React
 * Native y de Firebase y el traductor con el español de verdad; el arnés, el de `f1d-postcanary.test.mjs`, copiado.
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

/* ═══ FASE 25 · lo que se prueba aquí ═══════════════════════════════════════ */
const Ops = lib('filmmaker/operaciones.js');
const R = lib('filmmaker/requisitos.js');
const P = lib('creator/plano.js');
const Core = lib('core/continuity.js');
/** El último commit antes de esta fase. */
const ANTES = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 24 "').trim();
const HASTA = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 25 "').trim();
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
const Tools = cargar('components/studio/produccion/ProductionTools.tsx').default;
const MJ = cargar('utils/montajeDeProduccion.ts');
const CF = cargar('constants/filmmaker.ts');
const nombres = { clima: (w) => w, momento: (m) => m, transicion: (v) => t(CF.CLAVE_DE_TRANSICION[v]) };
let serieDeSonidos = 0;
const verHerramienta = (herramienta, seleccion) => {
  const linea = R.lineaDeTiempo(viva);
  return dibujar(hc(Tools, {
    herramienta, espacio: espacioVivo({ seleccion, linea }), montaje: MJ.montajeDe(viva, linea, nombres), cabezal: 0,
    ids: { sonido: () => `sd_prueba_${++serieDeSonidos}`, linea: () => 'ln_prueba_1' },
  }));
};
const PLANO1 = { tipo: 'plano', id: 'sh-0101' };
const conTransicion = (prod, shotId, tipo) => Ops.aplicarOperaciones(prod, [{ op: 'change_transition', target: { scope: 'shot', shotId }, transition: tipo }]).production;

/* ═══ M · LA PISTA DE LAS TRANSICIONES ════════════════════════════════════ */
console.log('\n── M · La línea de tiempo: la pista de las transiciones, en su corte ──');
{
  const prod = conTransicion(produccionUI(), 'sh-0101', 'dissolve');
  const linea = R.lineaDeTiempo(prod);
  const m = MJ.montajeDe(prod, linea, nombres);
  const corte = linea.segments[0].endSec;
  check('M1) la transición de un plano se ve en su corte, con su nombre, y es de ese plano',
    m.transiciones.length === 1 && m.transiciones[0].texto === 'Fundido encadenado' && m.transiciones[0].inicio < corte && m.transiciones[0].fin > corte && m.transiciones[0].shotId === 'sh-0101', JSON.stringify(m.transiciones));
  const alFinal = MJ.montajeDe(conTransicion(produccionUI(), 'sh-0102', 'fade'), R.lineaDeTiempo(conTransicion(produccionUI(), 'sh-0102', 'fade')), nombres);
  const sinLinea = MJ.montajeDe(prod, undefined, nombres);
  check('M2) la del último plano no se ve —no da paso a nada—; y sin línea de tiempo exacta no se inventa ningún corte', alFinal.transiciones.length === 0 && sinLinea.transiciones.length === 0);
  const TL = sinComentarios(leer('components/studio/produccion/ProductionTimeline.tsx'));
  check('M3) es una pista más, en el escritorio y en el teléfono', /\{ id: 'transiciones', clave: 'filmmaker\.wsToolTransitions'/.test(TL) && /PISTAS_DEL_TELEFONO: readonly string\[\] = \['video', 'transiciones'/.test(TL));
  const Linea = cargar('components/studio/produccion/ProductionTimeline.tsx').default;
  const d = dibujar(hc(Linea, { espacio: espacioCon({ produccion: prod, linea }), montaje: m, pestana: 'linea', onPestana() {}, cabezal: 0, onCabezal() {} }));
  check('M4) y se dibuja: la pista y su tramo, que al tocarlo elige su plano', /Transiciones/.test(d.texto) && d.botones.some((b) => /Fundido encadenado/.test(b.etiqueta ?? '')));
  const MOVIL = sinComentarios(leer('components/studio/produccion/ProductionMobileEditor.tsx'));
  const ESCRITORIO = sinComentarios(leer('components/studio/produccion/ProductionWorkspace.tsx'));
  check('M5) el escritorio y el teléfono le dan a cada transición su nombre, en el idioma de quien mira',
    [MOVIL, ESCRITORIO].every((s) => /transicion: \(v\) => t\(CLAVE_DE_TRANSICION\[v as TransitionType\]\),/.test(s)));
}

/* ═══ T · LA HERRAMIENTA «TRANSICIONES» ══════════════════════════════════ */
console.log('\n── T · «Transiciones», de verdad: la del plano y la de toda la producción ──');
{
  vivir(produccionUI());
  recordar(true);
  const t0 = verHerramienta('transiciones', PLANO1);
  check('T1) ya no dice que «llegarán»: se eligen', !/llegarán/.test(t0.texto) && !!boton(t0, etq('Cómo da paso el plano 1 al siguiente', 'Fundido')));
  check('T2) sin la suya, se dice cuál vale', /Sin la suya, vale «Corte»/.test(t0.texto));
  boton(t0, etq('Cómo da paso el plano 1 al siguiente', 'Fundido')).tocar();
  const propia = viva.scenes[0].shots[0].visual?.creative?.transition?.type;
  check('T3) la del plano, con change_transition, y F1-A la acepta', propia === 'fade' && rechazos.length === 0, String(propia));
  boton(verHerramienta('transiciones', PLANO1), etq('Para toda la producción', 'Barrido')).tocar();
  check('T4) la de toda la producción, también', viva.creativeDirection.cinematography?.transition?.type === 'whip' && rechazos.length === 0);
  const MOV = sinComentarios(leer('components/studio/produccion/ProductionMobileEditor.tsx'));
  check('T5) y en el teléfono ya está entre las herramientas', /\.\.\.HERRAMIENTAS,/.test(MOV) && !/h\.id !== 'transiciones'/.test(MOV));
  recordar(false);
}

/* ═══ A · EL SONIDO ═══════════════════════════════════════════════════════ */
console.log('\n── A · El sonido: el propio del vídeo, lo que tiene que sonar, dónde suena cada cosa y su nivel ──');
{
  const base = produccionUI();
  vivir({ ...base, scenes: [{ ...base.scenes[0], audio: { withSound: false } }] });
  recordar(true);
  const a0 = verHerramienta('audio', PLANO1);
  check('A1) el plano sin el suyo dice que vale lo de la escena', /Sin elegir aquí, vale lo de la escena: Sin sonido\./.test(a0.texto));
  boton(a0, etq('Sonido propio del vídeo', 'Con sonido')).tocar();
  const audio1 = () => viva.scenes[0].shots[0].audio;
  const req = R.requisitosDeProduccion(viva);
  const s1 = req.ok ? req.requirements.shots.find((s) => s.unitId === 'sh-0101') : undefined;
  check('A2) con sonido, con update_shot; y la toma lo pedirá así', audio1()?.withSound === true && rechazos.length === 0 && s1?.output?.withSound === true, JSON.stringify(s1?.output));
  campo(verHerramienta('audio', PLANO1), 'Qué tiene que sonar').onGuardar('  Olas y una gaviota  ');
  check('A3) lo que tiene que sonar, sin perder lo demás', audio1()?.notes === 'Olas y una gaviota' && audio1()?.withSound === true);
  boton(verHerramienta('audio', PLANO1), etq('Sonido propio del vídeo', 'Con sonido')).tocar();
  check('A4) tocar lo elegido lo quita: vuelve a valer lo de la escena', audio1()?.withSound === undefined && audio1()?.notes === 'Olas y una gaviota');
  boton(verHerramienta('audio', { tipo: 'escena', id: 'sc-0001' }), etq('Sonido propio del vídeo', 'Con sonido')).tocar();
  check('A5) en una escena, con update_scene', viva.scenes[0].audio?.withSound === true && rechazos.length === 0);
  const a5 = verHerramienta('audio', PLANO1);
  boton(a5, etq('Dónde suena', 'En esta escena')).tocar();
  campo(verHerramienta('audio', PLANO1), 'Cómo suena').onGuardar('Olas contra el faro');
  const nuevo = viva.audio.cues.find((c) => c.description === 'Olas contra el faro');
  check('A6) un sonido nuevo suena donde se dice: en la escena', JSON.stringify(nuevo?.target) === JSON.stringify({ scope: 'scenes', sceneIds: ['sc-0001'] }) && /En la escena 1/.test(verHerramienta('audio', PLANO1).texto));
  boton(verHerramienta('audio', PLANO1), etq('Nivel de «Olas contra el faro» en la mezcla', formato.numero(0.5, { style: 'percent' }))).tocar();
  check('A7) su nivel en la mezcla, con modify_audio', viva.audio.cues.find((c) => c.id === nuevo.id)?.volume === 0.5 && rechazos.length === 0);
  boton(verHerramienta('audio', PLANO1), etq('Nivel de «Olas contra el faro» en la mezcla', formato.numero(0.5, { style: 'percent' }))).tocar();
  check('A8) tocar el nivel elegido lo quita', viva.audio.cues.find((c) => c.id === nuevo.id)?.volume === undefined && rechazos.length === 0);
  const a8 = verHerramienta('audio', PLANO1);
  check('A9) y se dice la verdad: los descritos se guardan pero todavía no se mezclan; nada de «Todavía no disponible»', /todavía no se mezclan en el montaje/.test(a8.texto) && !/Todavía no disponible/.test(a8.texto));
  check('A10) el sonido propio llega al montaje: el montaje final lee si cada toma pidió sonido', /salida\?\.withSound === true/.test(leer('functions/src/creator/composicion.ts')));
  recordar(false);
}

/* ═══ R · (ARREGLO DE LA FASE 23) EL PAPEL DE UNA REFERENCIA ENCAJA CON SU MATERIAL ═══ */
console.log('\n── R · El papel de una referencia, el que F1-A acepta para su material ──');
{
  const Refs = cargar('components/studio/produccion/ProductionReferencias.tsx').default;
  vivir({ ...produccionUI(), references: [{ id: 'ref-faro', kind: 'image', assetId: 'asset_faro_0001', description: 'El faro' }] });
  recordar(true);
  dibujar(hc(Refs, { espacio: espacioVivo() })).botones.find((b) => /Abrir El faro/.test(b.etiqueta ?? '')).tocar();
  const r0 = dibujar(hc(Refs, { espacio: espacioVivo() }));
  check('R1) a una imagen no se le ofrece ser movimiento ni audio: apagados, y se dice por qué',
    boton(r0, 'Movimiento')?.apagado === true && boton(r0, 'Audio')?.apagado === true && boton(r0, 'Primer fotograma')?.apagado === false
    && /Un fotograma tiene que ser una imagen/.test(r0.texto));
  boton(r0, 'Primer fotograma').tocar();
  check('R2) y el que encaja se elige, y F1-A lo acepta', viva.references[0].role === 'first_frame' && rechazos.length === 0);
  recordar(false);
}

/* ═══ X · LAS GUARDAS ═════════════════════════════════════════════════════ */
console.log('\n── X · Ni servidor, ni F1-A; ni proveedores de audio; los once idiomas ──');
{
  const servidor = git(`diff --name-only ${tramo} -- functions/src firestore.rules storage.rules firestore.indexes.json`).trim();
  check('X1) nada del servidor: ni una Function, ni reglas, ni índices, ni F1-A, ni el montaje', servidor === '', servidor);
  const piezas = fs.readdirSync(path.resolve(RAIZ, 'components/studio/produccion')).map((f) => ({ f, s: leer(`components/studio/produccion/${f}`) }));
  check('X2) ninguna pieza llama a un proveedor de audio ni cobra', piezas.every(({ s }) => !/(?<![A-Za-z])(elevenlabs|suno|minimax)(?![A-Za-z])|spendCredits|creditsService|httpsCallable/i.test(s.replace(/\/\*[\s\S]*?\*\//g, ''))));
  check('X3) todo lo que se pulsó en esta suite fue aceptado por F1-A', rechazos.length === 0, JSON.stringify(rechazos.slice(0, 2)));
  check('X4) en todo lo dibujado no faltó ni una clave', faltan.size === 0, [...faltan].join(', '));
  check('X5) documentado', /### Fase 25 · /.test(leer('docs/FILMMAKER.md')));
  check('X6) esta suite está en la cadena de `npm test`', /filmmaker-sonido\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 25 · la línea de tiempo y el sonido (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
