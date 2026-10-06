/**
 * PUENTE PRE-F1-D · UN SOLO ESPACIO DE MATERIAL, UN CIERRE QUE SE PUEDE REPETIR
 * Y UN POST SIN RESPUESTA QUE NO SE DEVUELVE A CIEGAS.
 *
 * Los tres contratos que quedaban abiertos entre la ruta asíncrona de vídeo y
 * F1-D, cerrados sin un segundo nada:
 *
 *   1 · EL MATERIAL. Lo que produce el Core se llama `asset_<32 hex>`, como
 *       cualquier otro material. Así lo leen `leerMaterial`, `deleteAsset`,
 *       productions y la propia materialización cuando se pregunta «¿ya está?»,
 *       y un vídeo terminado se puede devolver. `mat_` deja de existir.
 *   2 · LA LIQUIDACIÓN. Entiende el «ya estaba» del Credit Engine tal y como el
 *       motor lo dice —`NOT_REFUNDABLE` sobre algo cobrado—: un segundo cierre no
 *       mueve Credits, ni libro, ni material, y no es un fallo.
 *   3 · EL POST SIN RESPUESTA. Con la aceptación pedida, un POST que no vuelve
 *       —plazo agotado, conexión rota— es un desenlace DESCONOCIDO: ni se
 *       devuelve el dinero ni se repite el POST ni se inventa una referencia. Lo
 *       aparta la liquidación para reconciliar, que es lo que ya existía.
 *
 * De verdad: la puerta, el conductor, el Job Engine, el almacén de trabajos, la
 * atención, el reconciliador, el barrendero, la liquidación, el ejecutor, el
 * materializador, el Content Core, `deleteAsset`, productions y el Credit
 * Engine, sobre un Firestore en memoria. De mentira: el adaptador de Seedance,
 * lo que ModelArk contesta, los bytes del vídeo y el almacén de objetos. Nada
 * sale a la red.
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
/** Lo autorizado antes de este puente: la ruta asíncrona (b023f24) y el Credit Engine de 8e91daa. */
const RUTA = 'b023f24';
const CREDITS = '8e91daa';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const intento = async (fn) => { try { return { ok: true, valor: await fn() }; } catch (error) { return { ok: false, error }; } };

/* ═══ Firestore en memoria, con lo que piden el almacén, el libro, productions y el Credit Engine ═══ */
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
  constructor() { this.docs = new Map(); this.cola = Promise.resolve(); this.auto = 0; }
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
  async get() { return foto(this, this.base.leer(this.path)); }
  async create(data) { escribir(this.base, { tipo: 'create', ref: this, data }); }
  async set(data, opts) { escribir(this.base, { tipo: 'set', ref: this, data, merge: !!opts?.merge }); }
  async update(data) { escribir(this.base, { tipo: 'update', ref: this, data }); }
  async delete() { this.base.docs.delete(this.path); }
}
class Consulta {
  constructor(base, p, filtros = [], tope = null, porId = false, despues = null) { Object.assign(this, { base, path: p, filtros, tope, porId, despues }); }
  doc(id) { return new Ref(this.base, `${this.path}/${id ?? `auto_${++this.base.auto}`}`); }
  otra(c) { return Object.assign(new Consulta(this.base, this.path, this.filtros, this.tope, this.porId, this.despues), c); }
  where(campo, op, valor) {
    if (op !== '==' && op !== 'array-contains') throw new Error(`esta base de prueba solo sabe «==» y «array-contains»: ${op}`);
    return this.otra({ filtros: [...this.filtros, [campo, op, valor]] });
  }
  orderBy() { return this.otra({ porId: true }); }
  startAfter(cursor) { return this.otra({ despues: cursor }); }
  limit(tope) { return this.otra({ tope }); }
  count() { return { get: async () => { const s = await this.get(); return { data: () => ({ count: s.size }) }; } }; }
  async get() {
    let filas = [...this.base.docs.entries()].filter(([p]) => p.startsWith(`${this.path}/`) && !p.slice(this.path.length + 1).includes('/'));
    filas = filas.filter(([, d]) => this.filtros.every(([f, op, v]) => (op === '==' ? leerCampo(d, f) === v : Array.isArray(leerCampo(d, f)) && leerCampo(d, f).includes(v))));
    if (this.porId) filas.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    if (this.despues !== null) filas = filas.filter(([p]) => p.split('/').pop() > this.despues);
    if (this.tope) filas = filas.slice(0, this.tope);
    const docs = filas.map(([p, d]) => foto(new Ref(this.base, p), copia(d)));
    return { docs, empty: !docs.length, size: docs.length, forEach: (fn) => docs.forEach(fn) };
  }
}
class Tx {
  constructor(base) { this.base = base; this.escrituras = []; }
  get(objetivo) { return objetivo.get(); }
  create(ref, data) { this.escrituras.push({ tipo: 'create', ref, data }); return this; }
  set(ref, data, opts) { this.escrituras.push({ tipo: 'set', ref, data, merge: !!opts?.merge }); return this; }
  update(ref, data) { this.escrituras.push({ tipo: 'update', ref, data }); return this; }
  delete(ref) { this.escrituras.push({ tipo: 'delete', ref }); return this; }
  confirmar() { for (const w of this.escrituras) escribir(this.base, w); }
}
const base = new Base();
fa.getFirestore = () => base;

/* ═══ El almacén de objetos y los bytes del vídeo, de mentira ═══════════════ */
const http = lib('engine/http.js');
const objetos = new Map();
let descargas = 0;
const cubo = {
  name: 'cubo-de-prueba',
  file: (ruta) => ({
    async save(bytes, opts) {
      /* `ifGenerationMatch: 0`: solo si no existe, como el de verdad. */
      if (opts?.preconditionOpts?.ifGenerationMatch === 0 && objetos.has(ruta)) throw Object.assign(new Error('precondición'), { code: 412 });
      objetos.set(ruta, { bytes, contentType: opts?.metadata?.contentType });
    },
    async getMetadata() {
      const o = objetos.get(ruta);
      if (!o) throw Object.assign(new Error('no existe'), { code: 404 });
      return [{ contentType: o.contentType, size: String(o.bytes.length) }];
    },
    async delete() { objetos.delete(ruta); },
    async exists() { return [objetos.has(ruta)]; },
  }),
};
http.storageBucket = () => cubo;
http.fetchBytes = async (url) => {
  descargas++;
  return { buffer: Buffer.from(`vídeo de ${url}`), contentType: 'video/mp4' };
};

/* ═══ Las piezas de verdad ═════════════════════════════════════════════════ */
const video = lib('creator/video.js');
const rt = lib('runtime/index.js');
const core = lib('core/index.js');
const { almacenDeTrabajos } = lib('runtime/almacen.js');
const { crearEjecutor } = lib('runtime/ejecutor.js');
const { identidadDelMaterial } = lib('runtime/materializacion.js');
const { materializadorDeWee } = lib('content/materializador.js');
const contenido = lib('content/index.js');
const producciones = lib('productions/index.js');
const M = lib('filmmaker/modelo.js');
const { olvidarLaPuerta } = lib('runtime/configuracion.js');
const { creditEngine } = lib('credits/creditEngine.js');
const { ProviderError } = http;
const { leerAvisoDeSeedance } = lib('engine/providers/seedance.js');
const { DEFAULT_ROUTING, ADAPTERS } = lib('engine/registry.js');

/* ═══ ModelArk, de mentira ═════════════════════════════════════════════════ */
const seedance = ADAPTERS.seedance;
const posts = [];
let modelArk = null;
seedance.isConfigured = () => true;
seedance.run = async (req) => { posts.push({ acceptAsync: req.acceptAsync }); return modelArk(req); };
let serie = 0;
const aceptar = () => async (req) => {
  const taskId = `cgt-puente-${String(++serie).padStart(4, '0')}`;
  return { accepted: { operationId: taskId }, costUSD: 0.21, latencyMs: 4, model: req.model?.id, meta: { providerTaskId: taskId } };
};
const lanzar = (error) => async () => { throw error; };
const enModelArk = new Map();
const resolutor = {
  async consultar(ref) {
    const e = enModelArk.get(ref.operationId);
    return e ? { conocido: true, aviso: leerAvisoDeSeedance(e) } : { conocido: false, motivo: 'no_contesta' };
  },
};
const termino = (taskId) => enModelArk.set(taskId, { id: taskId, status: 'succeeded', updated_at: Math.floor(Date.now() / 1000), content: { video_url: `https://modelark.invalid/${taskId}.mp4` } });
/* El barrido desplegado: el materializador y la atención son los de VERDAD. */
const pasada = () => rt.mantenimientoDeWee({
  reconciliacion: () => rt.reconciliacionDeWee({ db: base, resolutores: { seedance: resolutor }, quietoDesdeMs: 0 })(),
  liquidacion: () => rt.barridoDeLiquidacionDeWee({ db: base })(),
})();

/* ═══ Cuentas, la puerta abierta para ellas, y cómo se pide ═══════════════ */
const CUENTAS = ['puenteMat0001', 'puenteOtra0001', 'puenteLiq0001', 'puenteDup0001', 'puenteCon0001', 'puentePost0001', 'puentePost0002', 'puentePost0003', 'puentePost0004', 'puenteBrain0001'];
const SALDO = 5000;
for (const uid of CUENTAS) {
  base.docs.set(`users/doc_${uid}`, { uid, displayName: uid });
  await creditEngine.ensureAccount(uid);
  base.docs.get(`users/doc_${uid}`).creditsBalance = SALDO;
}
base.docs.set('aiSettings/runtime', { habilitado: true, capacidades: ['video.generate'], cuentas: CUENTAS, experiencias: ['studio'] });
olvidarLaPuerta();
const PETICION = { prompt: 'Un faro al amanecer, olas suaves', durationSec: 5, aspectRatio: '16:9' };
const pedir = (uid, requestId, extra = {}) => intento(() => video.generateVideo.run({ auth: { uid }, data: { ...PETICION, requestId, ...extra } }));
const saldo = (uid) => base.docs.get(`users/doc_${uid}`).creditsBalance;
const uso = (requestId) => base.leer(`creditTransactions/usage_${requestId}`);
const reembolsos = (requestId) => base.de('creditTransactions').filter((t) => t.requestId === requestId && t.type === 'refund');
const trabajoDe = (uid, requestId) => rt.trabajoDelMedioDeWee(base, uid, requestId);
const codigo = (r) => (r.ok ? r.valor?.status ?? 'ok' : `${r.error.code} · ${r.error.details?.code ?? ''}${r.error.details?.reason ? ` · ${r.error.details.reason}` : ''}`);
const almacen = almacenDeTrabajos(base);
const HEX = /^asset_[0-9a-f]{32}$/;

/* ═══ A · UN SOLO ESPACIO DE MATERIAL ══════════════════════════════════════ */
console.log('\n── A · Lo que produce el Core es asset_, y lo lee todo Weë ──');
const DUENO = 'puenteMat0001';
const idA = identidadDelMaterial('job-puente-a', 'job-puente-a#1');
const idB = identidadDelMaterial('job-puente-b', 'job-puente-b#1');
{
  check('A1) la identidad del Core es asset_ y 32 hexadecimales: calculada, estable y distinta por intento',
    HEX.test(idA) && idA === identidadDelMaterial('job-puente-a', 'job-puente-a#1') && idA !== identidadDelMaterial('job-puente-a', 'job-puente-a#2')
    && core.FORMA_DE_ID_DE_MATERIAL.test(idA), idA);
  const fuentes = git('ls-files functions/src').trim().split('\n').filter((f) => f.endsWith('.ts'));
  const conMat = fuentes.filter((f) => /[`'"]mat_/.test(sinComentarios(leer(f))));
  check('A2) ningún código de Weë genera `mat_`: no queda un segundo espacio de nombres', conMat.length === 0, conMat.join(', ') || 'ninguno');
  const g = await materializadorDeWee.guardar({ assetId: idA, userId: DUENO, kind: 'video', recurso: 'https://modelark.invalid/a.mp4', provenance: { createdAt: Date.now(), jobId: 'job-puente-a' } });
  const ficha = await contenido.leerMaterial(idA);
  check('A3) la materialización lo guarda y `leerMaterial` lo encuentra, con dueño, clase, estado y entrega',
    g.ok && g.assetId === idA && ficha?.ownerAccountId === DUENO && ficha?.kind === 'video' && ficha?.status === 'ready'
    && ficha?.storageRef?.objectKey?.startsWith(`users/${DUENO}/`) && !!ficha?.delivery?.url && objetos.has(ficha.storageRef.objectKey));
  /*
   * Lo que YA existe con el prefijo de antes —en producción, el material del canario M-1— no se vuelve
   * legible: no hay compatibilidad con `mat_`. Nunca lo fue: `leerMaterial` solo reconoció siempre `asset_`.
   */
  const LEGADO = `mat_${idA.slice(6)}`;
  base.docs.set(`assets/${LEGADO}`, { assetId: LEGADO, ownerAccountId: DUENO, kind: 'video', status: 'ready', delivery: { url: 'https://almacen.invalid/legado.mp4', kind: 'bearer_token' } });
  const borrarLegado = await intento(() => contenido.deleteAsset.run({ auth: { uid: DUENO }, data: { assetId: LEGADO } }));
  check('A4) CONTROL · un material `mat_`, aunque exista, no lo lee `leerMaterial` ni lo retira `deleteAsset`: ninguna compatibilidad con el prefijo de antes',
    (await contenido.leerMaterial(LEGADO)) === null && !borrarLegado.ok && borrarLegado.error.code === 'not-found' && !!base.leer(`assets/${LEGADO}`));
  await materializadorDeWee.guardar({ assetId: idB, userId: DUENO, kind: 'video', recurso: 'https://modelark.invalid/b.mp4', provenance: { createdAt: Date.now(), jobId: 'job-puente-b' } });
  const claveB = (await contenido.leerMaterial(idB))?.storageRef?.objectKey;
  const ajeno = await intento(() => contenido.deleteAsset.run({ auth: { uid: 'puenteOtra0001' }, data: { assetId: idB } }));
  check('A5) `deleteAsset` de OTRA cuenta no lo encuentra, ni lo toca', !ajeno.ok && ajeno.error.code === 'not-found' && objetos.has(claveB) && (await contenido.leerMaterial(idB))?.status === 'ready');
  const borrado = await intento(() => contenido.deleteAsset.run({ auth: { uid: DUENO }, data: { assetId: idB } }));
  check('A6) `deleteAsset` de su dueño lo localiza y lo retira: la ficha queda retirada y el objeto borrado',
    borrado.ok && borrado.valor.status === 'deleted' && borrado.valor.already === false && (await contenido.leerMaterial(idB))?.status === 'deleted' && !objetos.has(claveB), codigo(borrado));
  const conRef = (assetId) => ({
    ...M.produccionVacia({ title: 'Puente', aspectRatio: '16:9' }),
    references: [{ id: 'ref-video', kind: 'video', role: 'motion', assetId }],
  });
  const pid = (k) => `prodpuente${String(k).padStart(15, '0')}`;
  const acepta = await producciones.crearProduccion({ accountId: DUENO, productionId: pid(1), production: conRef(idA), at: Date.now() }, { db: base });
  check('A7) productions acepta como referencia el material que produjo el Core', acepta.ok === true, acepta.ok ? 'ok' : acepta.code);
  const rechaza = await producciones.crearProduccion({ accountId: DUENO, productionId: pid(2), production: conRef(LEGADO), at: Date.now() }, { db: base });
  check('A8) CONTROL · el `mat_` que existe, productions lo rechaza: `reference_rejected`', rechaza.ok === false && rechaza.code === 'reference_rejected', rechaza.ok ? 'aceptó' : rechaza.code);
}

/* ═══ B · LA RECONCILIACIÓN REUTILIZA LO QUE YA ESTÁ ═══════════════════════ */
console.log('\n── B · Llegar otra vez no descarga ni duplica ──');
{
  const idC = identidadDelMaterial('job-puente-c', 'job-puente-c#1');
  const peticion = { assetId: idC, userId: DUENO, kind: 'video', recurso: 'https://modelark.invalid/c.mp4', provenance: { createdAt: Date.now(), jobId: 'job-puente-c' } };
  const antes = descargas;
  const primera = await materializadorDeWee.guardar(peticion);
  const segunda = await materializadorDeWee.guardar(peticion);
  check('B1) la segunda llegada del mismo resultado lo encuentra: `yaEstaba`, sin volver a descargarlo',
    primera.ok && !primera.yaEstaba && segunda.ok && segunda.yaEstaba && descargas - antes === 1
    && base.de('assets').filter((a) => a.assetId === idC).length === 1, `descargas: ${descargas - antes}`);
  const idD = identidadDelMaterial('job-puente-d', 'job-puente-d#1');
  const antesD = descargas;
  const dos = await Promise.all([1, 2].map(() => materializadorDeWee.guardar({ ...peticion, assetId: idD, recurso: 'https://modelark.invalid/d.mp4' })));
  const objetosD = [...objetos.keys()].filter((k) => k.includes(idD)).length;
  check('B2) dos llegadas A LA VEZ: un objeto y una ficha, y ninguna llegada inventa otra',
    dos.some((r) => r.ok) && objetosD === 1 && base.de('assets').filter((a) => a.assetId === idD).length === 1, `descargas: ${descargas - antesD}`);
}
{
  /* B3 · La llegada anterior guardó el material y se cayó ANTES de cerrar el trabajo. */
  modelArk = aceptar();
  const r = await pedir(DUENO, 'puente-B3');
  const job = await trabajoDe(DUENO, 'puente-B3');
  const tarea = job.attempts[0].providerRef.operationId;
  termino(tarea);
  await materializadorDeWee.guardar({
    assetId: identidadDelMaterial(job.jobId, job.attempts[0].attemptId), userId: DUENO, kind: 'video',
    recurso: `https://modelark.invalid/${tarea}.mp4`, provenance: { createdAt: Date.now(), jobId: job.jobId },
  });
  const antes = descargas;
  const postsAntes = posts.length;
  await pasada();
  const hecho = await trabajoDe(DUENO, 'puente-B3');
  check('B3) reinicio a medias —material guardado, trabajo sin cerrar—: la reconciliación lo REUTILIZA y cierra, sin descargar ni pedir otra vez',
    r.ok && hecho.state === 'completed' && HEX.test(hecho.result.outputRefs[0]) && descargas === antes && posts.length === postsAntes
    && uso('puente-B3')?.status === 'COMPLETED', `descargas: ${descargas - antes}`);
  /* B4 · Dos reconciliaciones completas a la vez, con el materializador de verdad. */
  modelArk = aceptar();
  await pedir('puenteCon0001', 'puente-B4');
  const jobC = await trabajoDe('puenteCon0001', 'puente-B4');
  termino(jobC.attempts[0].providerRef.operationId);
  const saldoAntes = saldo('puenteCon0001');
  const antesC = descargas;
  await Promise.all([pasada(), pasada()]);
  const hechoC = await trabajoDe('puenteCon0001', 'puente-B4');
  const idDeC = hechoC.result?.outputRefs?.[0];
  check('B4) dos reconciliaciones a la vez: UNA liquidación, UN cobro, UN material lógico y UN objeto',
    hechoC.state === 'completed' && uso('puente-B4')?.status === 'COMPLETED' && saldo('puenteCon0001') === saldoAntes
    && base.de('assets').filter((a) => a.ownerAccountId === 'puenteCon0001').length === 1
    && [...objetos.keys()].filter((k) => k.includes(idDeC)).length === 1 && reembolsos('puente-B4').length === 0,
    `descargas del mismo vídeo: ${descargas - antesC}`);
  const antesOtra = descargas;
  await pasada();
  check('B5) y otra pasada ya no descarga, ni cobra, ni toca nada', descargas === antesOtra && saldo('puenteCon0001') === saldoAntes && uso('puente-B4')?.status === 'COMPLETED');
  const rOtra = await pedir('puenteCon0001', 'puente-B4');
  check('B6) y un reintento del cliente RECUPERA ese material, sin generar ni cobrar',
    rOtra.ok && rOtra.valor.status === 'COMPLETED' && rOtra.valor.assetId === idDeC && rOtra.valor.url === (await contenido.leerMaterial(idDeC))?.delivery?.url
    && rOtra.valor.credits === 0 && saldo('puenteCon0001') === saldoAntes, codigo(rOtra));
  /* B7 · Un trabajo que nombrara el material de OTRA cuenta —un dato roto— no se lo entrega a quien reintenta. */
  const jobIdB3 = (await trabajoDe(DUENO, 'puente-B3')).jobId;
  const docB3 = base.de('jobs').find((j) => j.jobId === jobIdB3);
  const original = docB3.json;
  const torcido = JSON.parse(original);
  torcido.result.outputRefs = [idDeC];
  base.docs.get(`jobs/${docB3.id}`).json = JSON.stringify(torcido);
  const ajeno = await pedir(DUENO, 'puente-B3');
  base.docs.get(`jobs/${docB3.id}`).json = original;
  check('B7) si el trabajo nombrara un material AJENO, el reintento no lo entrega: `result_not_available`',
    !ajeno.ok && ajeno.error.details?.reason === 'result_not_available', codigo(ajeno));
  /* B8 · Retirado por su dueño: ya no se puede entregar, y no se genera otro con el cobro del primero. */
  await contenido.deleteAsset.run({ auth: { uid: 'puenteCon0001' }, data: { assetId: idDeC } });
  const postsB8 = posts.length;
  const retirado = await pedir('puenteCon0001', 'puente-B4');
  check('B8) un material RETIRADO no se entrega ni se vuelve a generar: `result_not_available`, sin POST ni cobro',
    !retirado.ok && retirado.error.details?.reason === 'result_not_available' && posts.length === postsB8 && saldo('puenteCon0001') === saldoAntes, codigo(retirado));
}

/* ═══ C · LA LIQUIDACIÓN, EN EL IDIOMA DEL CREDIT ENGINE ═══════════════════ */
console.log('\n── C · Un cierre repetido es «ya estaba», no un fallo ──');
{
  const liq = rt.liquidacionDeWee();
  const U = 'puenteLiq0001';
  const reservar = async (requestId) => {
    await creditEngine.spendCredits({ userId: U, service: 'ai_video', amount: 75, requestId, source: 'weë-studio' });
    base.docs.set(`aiGenerations/gen-${requestId}`, { requestId, userId: U, capability: 'video.generate', provider: 'seedance', status: 'COMPLETED', creditsEstimated: 75, creditTransactionId: `usage_${requestId}`, createdAt: fa.Timestamp.now() });
    return { requestId, transactionId: `usage_${requestId}`, importe: 75, service: 'ai_video' };
  };
  const dinero = () => JSON.stringify(['creditTransactions', 'aiGenerations', 'aiUsage', 'creditStats'].map((c) => base.de(c)));
  const r1 = await reservar('puente-liq-1');
  const saldo0 = saldo(U);
  const primero = await liq.liquidar({ userId: U, reserva: r1, importe: 75, jobId: 'job-liq-1' });
  const fila = base.leer('aiGenerations/gen-puente-liq-1');
  check('C1) el primer cierre liquida UNA vez: la reserva pasa a COMPLETED y el libro anota lo cobrado',
    primero.desenlace === 'liquidada' && uso('puente-liq-1')?.status === 'COMPLETED' && saldo(U) === saldo0 && fila?.creditsCharged === 75 && !!fila?.settledAt);
  const antes = dinero();
  const segundo = await liq.liquidar({ userId: U, reserva: r1, importe: 75, jobId: 'job-liq-1' });
  check('C2) el segundo cierre no mueve Credits ni escribe libro: todo queda byte a byte igual, y no es un fallo',
    segundo.desenlace !== 'fallo' && dinero() === antes && saldo(U) === saldo0, segundo.desenlace);
  const alReves = await liq.reembolsar({ userId: U, reserva: r1, motivo: 'fallo_definitivo', jobId: 'job-liq-1' });
  check('C3) devolver lo ya cobrado es «ya estaba» —estado COMPLETED—, sin reembolso, sin error y sin tocar nada',
    alReves.desenlace === 'ya_estaba' && alReves.estado === 'COMPLETED' && reembolsos('puente-liq-1').length === 0 && dinero() === antes, JSON.stringify(alReves));
  const motor = await intento(() => creditEngine.refundCredits({ userId: U, requestId: 'puente-liq-1' }));
  const LIQ = sinComentarios(leer('functions/src/runtime/index.ts'));
  const cuerpo = LIQ.slice(LIQ.indexOf('export const liquidacionDeWee'), LIQ.indexOf('export const barridoDeLiquidacionDeWee'));
  check('C4) es lo que el Credit Engine dice de verdad —`NOT_REFUNDABLE` con su estado— y la liquidación ya no espera un código que nadie dice',
    !motor.ok && motor.error.code === 'NOT_REFUNDABLE' && motor.error.details?.status === 'COMPLETED'
    && /code === 'NOT_REFUNDABLE'/.test(cuerpo) && !/ALREADY_COMPLETED/.test(cuerpo));
  const r2 = await reservar('puente-liq-2');
  const saldo2 = saldo(U);
  const dev1 = await liq.reembolsar({ userId: U, reserva: r2, motivo: 'fallo_definitivo', jobId: 'job-liq-2' });
  const dev2 = await liq.reembolsar({ userId: U, reserva: r2, motivo: 'fallo_definitivo', jobId: 'job-liq-2' });
  const cobrarDespues = await liq.liquidar({ userId: U, reserva: r2, importe: 75, jobId: 'job-liq-2' });
  check('C5) devolver dos veces devuelve UNA, y cobrar después de devolver no cobra',
    dev1.desenlace === 'reembolsada' && dev2.desenlace === 'ya_estaba' && reembolsos('puente-liq-2').length === 1 && saldo(U) === saldo2 + 75
    && cobrarDespues.desenlace === 'ya_estaba' && uso('puente-liq-2')?.status === 'REFUNDED');
  /* El barrendero con una reserva ya cobrada y un trabajo que acabó mal: antes, un fallo en cada pasada. */
  const politica = { ...core.POLITICA_DE_TRABAJO, retry: { ...core.POLITICA_DE_TRABAJO.retry, maxAttempts: 1 } };
  const motorDeTrabajos = core.crearJobEngine(politica);
  const T = Date.now();
  const trabajoCon = (requestId, final) => {
    let job = motorDeTrabajos.crear({
      contract: core.JOB_ENGINE_CONTRACT_VERSION, principal: { userId: U }, at: T, capability: 'video.generate',
      implementation: { providerId: 'seedance', modelId: 'seedance-2-0-fast' }, input: { prompt: 'una ola' },
      trace: { traceId: `tr-${requestId}`, requestId: `rq-${requestId}`, userId: U },
      metadata: { creditRequestId: requestId, creditTransactionId: `usage_${requestId}`, creditsEstimated: 75, service: 'ai_video' },
      mode: 'sync', idempotencyKey: `k-${requestId}`, deadlineAt: T + 60 * 60_000, context: { appId: 'wee', operationId: requestId },
    }).job;
    const reclamo = motorDeTrabajos.reclamar(job, { principal: { userId: U }, at: T + 1, worker: 'w-puente' });
    job = motorDeTrabajos.marcarEnvio(reclamo.job, { principal: { userId: U }, at: T + 2, worker: 'w-puente', attemptId: reclamo.dispatch.attemptId }).job;
    const report = final === 'succeeded'
      ? { attemptId: reclamo.dispatch.attemptId, outcome: 'succeeded', dispatched: true, result: { outputRefs: [identidadDelMaterial(job.jobId, reclamo.dispatch.attemptId)] } }
      : { attemptId: reclamo.dispatch.attemptId, outcome: 'failed', dispatched: true, error: core.errorDelCore('PROVIDER_ERROR', 'adapter:seedance') };
    return motorDeTrabajos.informar(job, { principal: { userId: U }, at: T + 3, worker: 'w-puente', report }).job;
  };
  const fallido = trabajoCon('puente-liq-1', 'failed');
  await almacen.crearSiAusente(fallido);
  const informe = await rt.barrerLiquidaciones({ trabajos: almacen, liquidacion: liq, ahora: () => Date.now() });
  const visto = informe.vistos.find((v) => v.jobId === fallido.jobId);
  check('C6) el barrendero ante una reserva ya cobrada: «ya estaba», CERO fallos, y deja de mirarla',
    fallido.state === 'failed' && visto?.desenlace === 'ya_estaba' && informe.fallos === 0
    && base.de('jobs').find((j) => j.jobId === fallido.jobId)?.liquidacion === 'hecha' && reembolsos('puente-liq-1').length === 0,
    `${visto?.accion}/${visto?.desenlace} · fallos=${informe.fallos}`);
  await reservar('puente-liq-3');
  const saldo3 = saldo(U);
  const hecho = trabajoCon('puente-liq-3', 'succeeded');
  await almacen.crearSiAusente(hecho);
  await Promise.all([1, 2].map(() => rt.barrerLiquidaciones({ trabajos: almacen, liquidacion: liq, ahora: () => Date.now() })));
  const u3 = uso('puente-liq-3');
  check('C7) dos barrenderos a la vez sobre el mismo trabajo terminado: UNA liquidación, UN cobro',
    hecho.state === 'completed' && u3?.status === 'COMPLETED' && saldo(U) === saldo3 && reembolsos('puente-liq-3').length === 0
    && (u3?.statusHistory ?? []).filter((s) => (s?.status ?? s) === 'COMPLETED').length === 1);
}

/* ═══ D · EL POST QUE NO VUELVE ════════════════════════════════════════════ */
console.log('\n── D · Un POST sin respuesta es un desenlace desconocido, no un reembolso ──');
let precio = 0;
{
  const sinRespuesta = async (uid, requestId, error) => {
    modelArk = lanzar(error);
    const antes = posts.length;
    const r = await pedir(uid, requestId);
    const job = await trabajoDe(uid, requestId);
    precio = Math.abs(uso(requestId)?.amount ?? 0);
    return { r, job, salio: posts.length - antes };
  };
  const plazo = await sinRespuesta('puentePost0001', 'puente-post-1', new ProviderError('seedance: This operation was aborted', 'seedance'));
  check('D1) el plazo vence con el POST en vuelo: el intento queda DESCONOCIDO, sin referencia inventada, y no se devuelve nada',
    plazo.salio === 1 && plazo.job?.state === 'waiting' && plazo.job.attempts[0].outcome === 'unknown' && plazo.job.attempts[0].dispatched === true
    && !plazo.job.attempts[0].providerRef && uso('puente-post-1')?.status === 'AUTHORIZED' && reembolsos('puente-post-1').length === 0 && saldo('puentePost0001') === SALDO - precio,
    `${codigo(plazo.r)} · ${plazo.job?.state}/${plazo.job?.attempts?.[0]?.outcome}`);
  const red = await sinRespuesta('puentePost0002', 'puente-post-2', new ProviderError('seedance: fetch failed', 'seedance'));
  check('D2) la conexión se corta: lo mismo', red.job?.state === 'waiting' && red.job.attempts[0].outcome === 'unknown' && !red.job.attempts[0].providerRef
    && uso('puente-post-2')?.status === 'AUTHORIZED' && reembolsos('puente-post-2').length === 0, codigo(red.r));
  check('D3) en la puerta, mientras tanto, se ve como un vídeo en marcha: ni URL, ni reembolso, ni error que diga «no te cobré»',
    plazo.r.ok && plazo.r.valor.status === 'ACCEPTED' && plazo.r.valor.url === null, codigo(plazo.r));
  const postsAntes = posts.length;
  await pasada();
  const jobs = base.de('jobs').filter((j) => [plazo.job.jobId, red.job.jobId].includes(j.jobId));
  check('D4) el barrido NO lo devuelve: lo aparta para reconciliar, sin preguntar a nadie —no hay a quién— ni repetir el POST',
    uso('puente-post-1')?.status === 'AUTHORIZED' && uso('puente-post-2')?.status === 'AUTHORIZED' && reembolsos('puente-post-1').length === 0
    && jobs.length === 2 && jobs.every((j) => j.liquidacion === 'hecha') && posts.length === postsAntes
    && rt.decidirLiquidacion(await trabajoDe('puentePost0001', 'puente-post-1'), Date.now()).tipo === 'reconciliar');
  const reintento = await pedir('puentePost0001', 'puente-post-1');
  check('D5) y reintentar la misma petición no vuelve a llamar a ModelArk', !reintento.ok && reintento.error.details?.code === 'DUPLICATE_REQUEST' && posts.length === postsAntes, codigo(reintento));
  /* CONTROLES: cuando ModelArk SÍ contestó, es una respuesta, y se devuelve como siempre. */
  const cinco = await sinRespuesta('puentePost0003', 'puente-post-3', new ProviderError('seedance respondió 503: saturado', 'seedance', 503, true));
  check('D6) CONTROL · un 5xx es una respuesta de ModelArk: falla y se devuelve exacto', !cinco.r.ok && cinco.job?.state === 'failed'
    && uso('puente-post-3')?.status === 'REFUNDED' && reembolsos('puente-post-3')[0]?.amount === precio && saldo('puentePost0003') === SALDO, codigo(cinco.r));
  const cuatro = await sinRespuesta('puentePost0004', 'puente-post-4', new ProviderError('seedance respondió 400: inválido', 'seedance', 400, false));
  check('D7) CONTROL · un 4xx, igual: rechazo explícito, devuelto exacto', !cuatro.r.ok && cuatro.job?.state === 'failed'
    && uso('puente-post-4')?.status === 'REFUNDED' && saldo('puentePost0004') === SALDO, codigo(cuatro.r));
  /* Y solo cuando se pidió aceptar: el mismo tiempo agotado, sin aceptación, sigue siendo lo de siempre. */
  const conTiempoAgotado = (source) => ({ status: 'failed', error: { code: 'TIMEOUT', source, details: { reason: 'timeout', scope: 'http', providerRetryable: true } } });
  const despacho = { jobId: 'job-ej', attemptId: 'job-ej#1', attempt: 1, capability: 'video.generate', implementation: { providerId: 'seedance', modelId: 'm' }, input: { prompt: 'x' }, trace: { traceId: 'tr-ej', requestId: 'rq-ej', userId: 'u-ej' }, mode: 'sync', idempotencyKey: 'k-ej', timeoutMs: 1000, deadlineAt: Date.now() + 60_000 };
  const informeDe = async (acepta, resultado) => crearEjecutor({ gateway: { ejecutar: async () => resultado }, ahora: () => Date.now(), repetir: () => () => {}, ...(acepta === undefined ? {} : { aceptaAsincrono: acepta }) })
    .ejecutar(despacho, { renovar: async () => true });
  const conAceptacion = await informeDe(true, conTiempoAgotado('adapter:seedance'));
  const sinAceptacion = await informeDe(undefined, conTiempoAgotado('adapter:seedance'));
  const delGateway = await informeDe(true, conTiempoAgotado('gateway'));
  const validacion = await informeDe(true, { status: 'failed', error: { code: 'PROVIDER_ERROR', source: 'adapter:seedance', details: { reason: 'provider_error', providerRetryable: false } } });
  check('D8) la regla vive en el ejecutor y SOLO con la aceptación pedida: sin ella, un plazo agotado sigue siendo `timed_out` (Brain no cambia)',
    conAceptacion.outcome === 'unknown' && !conAceptacion.providerRef && sinAceptacion.outcome === 'timed_out', `${conAceptacion.outcome}/${sinAceptacion.outcome}`);
  check('D9) y solo si el POST salió: un plazo del Gateway antes de llamar, o un error de validación, siguen siendo fallos',
    delGateway.outcome !== 'unknown' && validacion.outcome === 'failed', `${delGateway.outcome}/${validacion.outcome}`);
}

/* ═══ E · IDEMPOTENCIA Y PROVEEDOR ═════════════════════════════════════════ */
console.log('\n── E · La regla del dinero y el proveedor, intactas ──');
{
  modelArk = aceptar();
  const antes = posts.length;
  const otra = await pedir('puenteCon0001', 'puente-B4', { prompt: 'Otra cosa: un tren de noche' });
  check('E1) el mismo requestId con OTRA operación: idempotency_conflict, sin POST', !otra.ok && otra.error.details?.reason === 'idempotency_conflict' && posts.length === antes, codigo(otra));
  await creditEngine.spendCredits({ userId: 'puenteBrain0001', service: 'ai_brain', amount: 1, requestId: 'brain_puente_1', source: 'weë-brain' });
  await creditEngine.completeCredits({ userId: 'puenteBrain0001', requestId: 'brain_puente_1' });
  const brain = await pedir('puenteBrain0001', 'brain_puente_1');
  check('E2) el requestId de una respuesta de Brain no sirve para un vídeo', !brain.ok && brain.error.details?.reason === 'idempotency_conflict' && posts.length === antes, codigo(brain));
  const postsAntes = posts.length;
  await pasada();
  await pasada();
  check('E3) ninguna reconciliación hace un POST: solo el que pide la persona sale hacia ModelArk',
    posts.length === postsAntes && posts.every((p) => p.acceptAsync === true));
  /* F1-D toca dos piezas del motor, nominales y de tamaño fijo (ver video-asincrono H2): ni un proveedor ni una cadena. Los arreglos de la FASE 1 del Harness, tampoco: también van por nombre y tamaño (harness/fase-2 añade H0 #22: ledger, limits y router). */
  /*
   * + misión fal (2026-10-05), con autorización del dueño: el ÚNICO proveedor y la ÚNICA cadena nuevos son fal y
   *   `world.generate` —el vídeo sigue siendo Seedance y solo Seedance—. En el motor: elegibilidad.ts (nuevo, la regla
   *   común), providers/fal.ts y fal-modelos.ts (nuevos), verification.ts +8 (su ficha), registry.ts +15 −1 (antes 2/0),
   *   router.ts +63 −9 (antes 59/4), types.ts +120 −3 (antes 29/0), index.ts +3 −1 y jurisdiccion.ts (nuevo, el conector de la jurisdicción de la cuenta), gateway.ts +8 −2 (antes 2/0) y limits.ts +2 −1
   *   (antes 38/3). Cifras de `git diff --numstat b023f24`; el detalle de cada una, en video-asincrono H2.
   * + misión mundo3d (2026-10-05): mundo.ts (nuevo, el contrato de world.generate para los adaptadores), types.ts +45
   *   (antes 149/3), fal.ts +31 (antes 393/0) y fal-modelos.ts +31 (antes 116/0). Ni un proveedor ni una cadena nuevos.
   *   FASE 2 (NOT_AVAILABLE semántico): errors.ts +58 −1 (antes 1/1), router.ts +22 −12 (antes 122/13), types.ts +18
   *   (antes 194/3) y elegibilidad.ts +17 (antes 193/0): la causa de cada descarte y el motivo público, sin proveedor.
   *   FASES 3 y 4 (derechos; mundo y vista previa): derechos.ts (nuevo, los derechos del modelo que atendió) y fal.ts +55
   *   (antes 424/0): la salida por papeles y la cola configurable solo a https o a esta máquina.
   *   FASE 5 (la tercera puerta del conductor): gateway.ts +18 −2 (antes 10/2), la elegibilidad del ejecutor con la
   *   jurisdicción de la cuenta; registry.ts +12 −1 (antes 17/1), los resolutores de estado junto a los adaptadores; y
   *   fal.ts +7 (antes 479/0), el nombre de la operación sin «/» (con «:») y el resolutor que sabe parar. Ni un proveedor ni una cadena nuevos.
   */
  check('E4) para el vídeo, Seedance y solo Seedance; el único proveedor nuevo es fal, con la única cadena nueva (world.generate)',
    JSON.stringify((DEFAULT_ROUTING['video.generate']?.chain ?? []).map((e) => e.provider)) === JSON.stringify(['seedance'])
    && git(`diff --numstat ${RUTA} -- functions/src/engine`).trim().split('\n').map((l) => l.replace(/\r$/, '')).join('|')
      /* i18n da-DK: errors.ts y router.ts, una línea de texto cada uno; harness/fase-2 (H0 #22): ledger, limits y router. Cifras de `git diff --numstat b023f24` sobre el árbol consolidado. */
      /*
       * + cierre post-auditoría 2026-10-01 (cifras reales de `git diff --numstat b023f24` sobre el árbol): admin.ts +2 −2
       * (engineAdmin monta MODEL_SECRETS, sin el token del webhook); promptLanguage.ts +21 (SISTEMA_POR_DEFECTO neutro y
       * `pideTextoPlano`); los adaptadores de TEXTO claude/deepseek/openai +3 −2 y gemini +4 −2 (ese sistema y `format: 'text'`
       * respetado); router.ts +2 −1 (el aviso de fallo, saneado). Ningún proveedor nuevo y ninguna cadena nueva: seedance,
       * registry y la cadena de `video.generate` quedan como estaban.
       *
       * + F2-C1 (el camino real del Eval Engine): ledger.ts 12/1 → 19/2 (el gasto con attribution:'eval' va a
       * evalUsage/{día}, no al tope del usuario), types.ts 19/0 → 29/0 (attribution?/evalRunId? en EngineContext y
       * GenerationRecord) y router.ts 57/4 → 59/4 (reenvía esos dos campos al contexto del libro). SIGUE sin haber
       * proveedor ni cadena nuevos.
       *
       * + misión de gobernanza del mundo 3D (2026-10-06): limits.ts 40/4 → 169/14 («5 mundos que salen»: comprobar,
       * el día explícito, cada operación anota lo que ocupó, liberar, consumir), jurisdiccion.ts 46/0 → 62/0 (solo
       * países del catálogo de Weë, del archivo generado; basta uno fuera para fallar cerrado),
       * fal-modelos.ts 147/0 → 152/0 (Hunyuan: resto APPROVED por territorio, revisión global intacta) y
       * elegibilidad.ts 210/0 → 212/0 (un comentario). Ni proveedor ni cadena nuevos.
       */
      === '11\t4\tfunctions/src/engine/admin.ts|36\t1\tfunctions/src/engine/config.ts|26\t0\tfunctions/src/engine/derechos.ts|212\t0\tfunctions/src/engine/elegibilidad.ts|59\t2\tfunctions/src/engine/errors.ts|28\t4\tfunctions/src/engine/gateway.ts|26\t1\tfunctions/src/engine/http.ts|3\t1\tfunctions/src/engine/index.ts|62\t0\tfunctions/src/engine/jurisdiccion.ts|19\t2\tfunctions/src/engine/ledger.ts|169\t14\tfunctions/src/engine/limits.ts|12\t0\tfunctions/src/engine/mundo.ts|21\t0\tfunctions/src/engine/promptLanguage.ts|3\t2\tfunctions/src/engine/providers/claude.ts|3\t2\tfunctions/src/engine/providers/deepseek.ts|152\t0\tfunctions/src/engine/providers/fal-modelos.ts|486\t0\tfunctions/src/engine/providers/fal.ts|4\t2\tfunctions/src/engine/providers/gemini.ts|3\t2\tfunctions/src/engine/providers/openai.ts|33\t19\tfunctions/src/engine/providers/seedance.ts|29\t2\tfunctions/src/engine/registry.ts|144\t25\tfunctions/src/engine/router.ts|212\t3\tfunctions/src/engine/types.ts|8\t0\tfunctions/src/engine/verification.ts|38\t14\tfunctions/src/engine/webhooks.ts'
    && Object.keys(DEFAULT_ROUTING).filter((c) => (DEFAULT_ROUTING[c]?.chain ?? []).some((e) => e.provider === 'fal')).join() === 'world.generate');
}

/* ═══ F · NADA MÁS SE MOVIÓ ════════════════════════════════════════════════ */
console.log('\n── F · Lo que este puente toca, y lo que no ──');
{
  /*
   * Lo del puente —la puerta, el ejecutor, la composición del runtime y la
   * identidad del material— y lo de F1-D, por nombre: el traductor del plano y
   * las tomas (nuevos), la puerta del vídeo, el enlace verificado de `shots`, la
   * adopción del objeto sin ficha y las dos piezas del motor. Un archivo más, y
   * esto falla. Los nuevos cuentan aunque todavía no estén en un commit.
   */
  const nuevos = git('ls-files --others --exclude-standard functions/src').trim().split('\n').filter(Boolean);
  const tocados = [...git(`diff --name-only ${RUTA} -- functions/src`).trim().split('\n').filter(Boolean), ...nuevos].sort();
  /* Los de la FASE 1 del Harness (auditoría H0), por nombre: H0 #9, #11, #15a, #16, #18, #19, #20, #21, #24, §27 y FASE 8.
     #18 (harness/fase-2): el barrido, una pasada a la vez — solo sus opciones de despliegue (settlement/programado.ts). */
  const DEL_HARNESS = [
    'functions/src/creator/credits.ts', 'functions/src/creator/index.ts', 'functions/src/creator/types.ts', 'functions/src/credits/index.ts',
    'functions/src/engine/admin.ts', 'functions/src/engine/config.ts', 'functions/src/engine/gateway.ts', 'functions/src/engine/http.ts', 'functions/src/engine/ledger.ts',
    'functions/src/engine/registry.ts', 'functions/src/engine/router.ts', 'functions/src/engine/types.ts', 'functions/src/engine/webhooks.ts',
    'functions/src/gateway/index.ts', 'functions/src/gateway/types.ts', 'functions/src/generateAvatar.ts', 'functions/src/index.ts',
    'functions/src/opciones.ts', 'functions/src/secrets.ts', 'functions/src/settlement/programado.ts',
  ];
  /*
   * Los de la integración i18n da-DK (rama i18n/da-dk, 2026-10-01), por nombre: el idioma de quien crea llega a los
   * pasos de texto (inputs, prompts), Weë Business deja de prometer que publica (templates y el texto de la demo), dos
   * errores del motor dejan de nombrar al proveedor, y el push y la página pública se escriben en el idioma de quien
   * los lee (avisos, la página y sus dos piezas compartidas, una de ellas GENERADA desde los diccionarios).
   */
  const DE_I18N_DA = [
    'functions/src/creator/inputs.ts', 'functions/src/creator/prompts.ts', 'functions/src/creator/templates.ts',
    'functions/src/engine/errors.ts', 'functions/src/gateway/providers/mock.ts',
    'functions/src/public/postPage.ts', 'functions/src/public/postPageHtml.ts', 'functions/src/social/avisos.ts',
    'functions/src/shared/idiomaDelServidor.ts', 'functions/src/shared/textosDelServidor.ts',
    /* La observación del idioma de lo que escribe la IA: se apunta, no se rechaza. */
    'functions/src/creator/idiomaDeSalida.ts', 'functions/src/shared/idiomaDelTexto.ts',
  ];
  /*
   * Los de la revisión post-auditoría (2026-10-01), por nombre: el cobro de Weë Brain cuando falla tras generar
   * (brainUsage), el Credit Engine con dos perfiles (creditEngine), el cupo de avisos (avisos ya estaba; index ya estaba)
   * y la forma de la etiqueta de idioma desde el Core (idiomaDelServidor ya estaba).
   */
  const DE_LA_REVISION = ["functions/src/creator/brain.ts","functions/src/creator/brainUsage.ts","functions/src/credits/creditEngine.ts"];
  /*
   * Los del cierre post-auditoría (2026-10-01), por nombre. Los que ya estaban declarados (brain, brainUsage, index y
   * prompts de creator; creditEngine y credits/index; admin y router del motor; generateAvatar, runtime/index y secrets)
   * siguen en sus listas; estos son los que el cierre toca por primera vez desde b023f24:
   *  · content/index.ts — `yaExistia`: solo el código 6 (ALREADY_EXISTS) es «ya existía»; lo demás se registra (server/errores-tragados);
   *  · credits/creditValidation.ts — `toHttpsError` genérico y la causa saneada (money/error-interno-al-cliente; exacto en job-queue 63p);
   *  · engine/promptLanguage.ts y los cuatro adaptadores de texto — el sistema por defecto neutro y `format: 'text'` (server/prompts-internos);
   *  · identity/nacimiento.ts — la consulta de perfiles acotada con `.limit(10)` (escala/consulta-sin-limite).
   */
  const DEL_CIERRE = ["functions/src/content/index.ts","functions/src/credits/creditValidation.ts","functions/src/engine/promptLanguage.ts","functions/src/engine/providers/claude.ts","functions/src/engine/providers/deepseek.ts","functions/src/engine/providers/gemini.ts","functions/src/engine/providers/openai.ts","functions/src/identity/nacimiento.ts",
    /* + cierre: solo el COMENTARIO de isAdmin (dónde vive hoy WEE_ADMIN_UIDS: el entorno get-wee de GitHub); el código no cambia. */
    "functions/src/shared/admin.ts"];
  /*
   * Los de F2-C1 (el camino real del Eval Engine, 2026-10-05), por nombre y todos NUEVOS: el motor común de
   * evaluaciones (evals/motor/: contrato, dominios, puntuación, presupuesto, corrida, permisos, holdout y
   * EL corredor, que ops/evals reexporta), el dominio real del Router y su registro (evals/dominios*), su dataset y
   * graders deterministas (evals/datos.ts) y `evalRun`, que solo aporta el entorno de Firestore (evals/index.ts). El
   * motor de IA solo gana el reenvío de attribution/evalRunId (engine/types, router y ledger: ya estaban en
   * DEL_HARNESS) e index.ts exporta evalRun (ya estaba).
   */
  const DE_LOS_EVALS = ['functions/src/evals/datos.ts', 'functions/src/evals/dominios.ts', 'functions/src/evals/dominios/router.ts',
    'functions/src/evals/index.ts', 'functions/src/evals/motor/contrato.ts',
    'functions/src/evals/motor/corredor.ts', 'functions/src/evals/motor/corrida.ts', 'functions/src/evals/motor/dominios.ts',
    'functions/src/evals/motor/holdout.ts', 'functions/src/evals/motor/permisos.ts', 'functions/src/evals/motor/presupuesto.ts',
    'functions/src/evals/motor/puntuacion.ts'];
  /*
   * Los de la MISIÓN fal (2026-10-05), por nombre: la capacidad world.generate y la modalidad 3d en el Core (capability,
   * su catálogo y la guardia de modalidades del Router), el material `world` y sus derechos (asset y su adopción en
   * content/index, que ya estaba en DEL_CIERRE), el núcleo 3D (escena3d, nuevo, y su contrato y su exportación), el
   * tipo `aggregator` del registro y la excepción que lo permite, los dos tipos de resultado, la regla común de
   * elegibilidad, el adaptador y sus datos, su ficha, y el servicio `ai_world`. engine/registry, router, types,
   * gateway, config, limits, creator/types y secrets ya estaban declarados (sus tamaños, en E4 y video-asincrono H2).
   */
  const DE_LA_MISION_FAL = ['functions/src/core/capability.ts', 'functions/src/core/content/asset.ts', 'functions/src/core/contracts.ts',
    'functions/src/core/escena3d.ts', 'functions/src/core/index.ts', 'functions/src/core/provider.ts', 'functions/src/core/registry/capabilities.ts',
    'functions/src/core/registry/types.ts', 'functions/src/core/router.ts', 'functions/src/credits/creditCosts.ts', 'functions/src/engine/elegibilidad.ts',
    'functions/src/engine/providers/fal-modelos.ts', 'functions/src/engine/providers/fal.ts', 'functions/src/engine/verification.ts',
    'functions/src/registry/excepciones.ts', 'functions/src/registry/index.ts',
    /* + la jurisdicción de la cuenta conectada al Router (engine/index y el conector) y runtime/politica alineada a fail-closed. */
    'functions/src/engine/index.ts', 'functions/src/engine/jurisdiccion.ts', 'functions/src/runtime/politica.ts'];
  /*
   * Los de la MISIÓN mundo3d (2026-10-05, «cerrar los gaps de world.generate»), por nombre: el contrato canónico del
   * mundo en el Core (mundo3d, nuevo) y su reexportación para los adaptadores (engine/mundo, nuevo). contracts, index,
   * escena3d, types, fal y fal-modelos ya estaban declarados (sus tamaños, en E4, F3 y video-asincrono H2/H3).
   */
  /* + FASES 3 y 4: los derechos (engine/derechos, nuevo) y las variantes viajan por el aviso y su atención (runtime/aviso, runtime/atencion). */
  const DE_LA_MISION_MUNDO3D = ['functions/src/core/mundo3d.ts', 'functions/src/engine/mundo.ts',
    'functions/src/engine/derechos.ts', 'functions/src/runtime/atencion.ts', 'functions/src/runtime/aviso.ts',
    /* + FASE 5: la puerta del mundo (creator/mundo, nueva), pedir parada (runtime/parada, nueva), los relojes del mundo y por capacidad
       (runtime/plazos), un resolutor que puede saber parar (runtime/reconciliacion) y la reconciliación que lo usa (runtime/reconciliador). */
    'functions/src/creator/mundo.ts', 'functions/src/runtime/parada.ts', 'functions/src/runtime/plazos.ts', 'functions/src/runtime/reconciliacion.ts',
    'functions/src/runtime/reconciliador.ts'];
  /*
   * Los del CICLO DE VIDA 3D (2026-10-05), por nombre: el linaje del material —versiones, derivados, derechos que solo
   * se endurecen y dónde se usa— (`core/content/linaje.ts`, nuevo, puro y sin conectar a ningún camino) y su línea de
   * exportación en la puerta del Content Core (`core/content/index.ts`). Ver docs/3D-ASSET-LIFECYCLE.md.
   */
  const DEL_CICLO_DE_VIDA_3D = ['functions/src/core/content/index.ts', 'functions/src/core/content/linaje.ts'];
  /*
   * Los de la GOBERNANZA DEL MUNDO 3D (2026-10-06), por nombre: la lista de cuentas obligatoria en la puerta de siempre
   * (`runtime/puerta.ts`, `listaObligatoria`), las claves del hueco del cupo diario que viajan con el trabajo para que
   * la liquidación lo devuelva con el dinero (`runtime/liquidacion.ts`) y los países del registro para el servidor,
   * GENERADOS por `scripts/paises-del-catalogo.mjs` (`shared/paisesDelCatalogo.ts`, nuevo). Ver docs/3D-EXPERIENCIA.md
   * §§ 11b, 14 y 15.
   */
  const DE_LA_GOBERNANZA_DEL_MUNDO = ['functions/src/runtime/liquidacion.ts', 'functions/src/runtime/puerta.ts', 'functions/src/shared/paisesDelCatalogo.ts'];
  check('F1) en el código solo se tocan la puerta, el ejecutor, la composición del runtime y la identidad del material — y los archivos nominales de F1-D, del Harness, de la integración i18n da-DK, de los evals (F2-C1), de la misión fal, de la misión mundo3d y del ciclo de vida 3D',
    JSON.stringify(tocados) === JSON.stringify([...DEL_HARNESS, ...DE_I18N_DA, ...DE_LA_REVISION, ...DEL_CIERRE, ...DE_LOS_EVALS, ...DE_LA_MISION_FAL, ...DE_LA_MISION_MUNDO3D,
      'functions/src/content/materializador.ts', 'functions/src/creator/plano.ts', 'functions/src/creator/toma.ts', 'functions/src/creator/video.ts',
      'functions/src/engine/limits.ts', 'functions/src/engine/providers/seedance.ts',
      'functions/src/runtime/ejecutor.ts', 'functions/src/runtime/index.ts', 'functions/src/runtime/materializacion.ts',
      'functions/src/shots/index.ts', 'functions/src/shots/puerta.ts',
      ...DEL_CICLO_DE_VIDA_3D, ...DE_LA_GOBERNANZA_DEL_MUNDO,
    ].filter((f, i, a) => a.indexOf(f) === i).sort()),
    tocados.join(', '));

  /* La FASE 1 del Harness cierra spendCredits al cliente (b878068, H0 #24): solo su callable, en credits/index.ts, y de ese tamaño. */
  /* + creditEngine.ts: revisión post-auditoría 2026-10-01 (money/remigracion-por-segundo-perfil), bloques exactos en job-queue 63p. */
  /*
   * + cierre post-auditoría 2026-10-01 (cifras de `git diff --numstat` sobre el árbol; antes 34/8, —, 14/0):
   *   creditEngine.ts +23 −1: `readBalance`, el saldo SOLO LEYENDO para `creditsAdmin` · `balance`, y su nombre en lo
   *   que devuelve el motor (money/admin-balance-con-efecto); creditValidation.ts +10 −2: `toHttpsError` genérico para
   *   lo que no es un CreditError y su causa al registro con `sanitizeForLog` (money/error-interno-al-cliente);
   *   credits/index.ts +5 −3: `balance` → `readBalance` y `failed` → `assertLimit`. Bloques exactos en job-queue 63k/63p.
   */
  const CREDITS_DEL_HARNESS = '57\t9\tfunctions/src/credits/creditEngine.ts\n10\t2\tfunctions/src/credits/creditValidation.ts\n19\t3\tfunctions/src/credits/index.ts';
  /* + misión fal (2026-10-05): core/router.ts +2 −2 (la modalidad 3d) y creditCosts.ts +8 (el servicio ai_world). Líneas exactas en job-queue 63fal. */
  const CREDITS_DE_LA_MISION_FAL = '2\t2\tfunctions/src/core/router.ts\n8\t0\tfunctions/src/credits/creditCosts.ts';
  check('F2) el Credit Engine, el Financial Core, el Router y creditCosts: sin tocar; credits/index, solo el cierre de spendCredits del Harness (b878068); el Router y creditCosts, solo la misión fal; del tamaño exacto',
    git(`diff --numstat ${CREDITS} -- functions/src/credits functions/src/core/financial functions/src/core/router.ts`).trim().replace(/\r$/, '') === `${CREDITS_DE_LA_MISION_FAL}\n${CREDITS_DEL_HARNESS}`);
  /* Del contenido, solo la adopción del objeto sin ficha (F1-D, ficha 5), y de su tamaño. Del Core, solo la misión fal (video-asincrono H3). */
  /* + misión mundo3d (2026-10-05): mundo3d (nuevo), contracts +6, index +1 y escena3d +1 (ver video-asincrono H3). */
  /* + misión mundo3d FASE 5: capability.ts +2 (`world: '3d'`) y mundo3d.ts +15 (364 → 379, los derechos visibles). */
  /* + misión gobernanza (2026-10-06): mundo3d.ts +1 (379 → 380), el comentario de los derechos visibles con la decisión del dueño. */
  const CORE_DE_LA_MISION_FAL = '6\t2\tfunctions/src/core/capability.ts\n44\t2\tfunctions/src/core/content/asset.ts\n12\t0\tfunctions/src/core/contracts.ts'
    + '\n217\t0\tfunctions/src/core/escena3d.ts\n2\t0\tfunctions/src/core/index.ts\n380\t0\tfunctions/src/core/mundo3d.ts\n2\t1\tfunctions/src/core/provider.ts'
    + '\n6\t0\tfunctions/src/core/registry/capabilities.ts\n6\t2\tfunctions/src/core/registry/types.ts\n2\t2\tfunctions/src/core/router.ts';
  /* + ciclo de vida 3D (2026-10-05): el linaje del material (nuevo) y su línea de exportación en la puerta del Content Core. */
  const CORE_DEL_CICLO_DE_VIDA_3D = '3\t0\tfunctions/src/core/content/index.ts\n651\t0\tfunctions/src/core/content/linaje.ts';
  /* Varias listas de `numstat`, juntas en el orden en que las da git: por ruta. */
  const porRuta = (...listas) => listas.join('\n').split('\n').sort((a, b) => (a.split('\t')[2] < b.split('\t')[2] ? -1 : 1)).join('\n');
  check('F3) ni F1-A ni productions; del Core, solo la misión fal y el linaje del ciclo de vida 3D; del contenido, solo la adopción de F1-D, el cierre y los derechos del material',
    git(`diff --name-only ${RUTA} -- functions/src/filmmaker functions/src/productions`).trim() === ''
    && git(`diff --numstat ${RUTA} -- functions/src/core`).trim() === porRuta(CORE_DE_LA_MISION_FAL, CORE_DEL_CICLO_DE_VIDA_3D)
    /* + cierre post-auditoría 2026-10-01: content/index.ts +32 −3, `yaExistia` en los tres `create` (server/errores-tragados). */
    /* + misión fal (2026-10-05): content/index.ts +9 (antes 32/3): el tipo declarado `world`/`model3d` manda sobre el MIME y los derechos viajan al material. */
    && git(`diff --numstat ${RUTA} -- functions/src/content`).trim().replace(/\r$/, '') === '68\t3\tfunctions/src/content/index.ts\n126\t4\tfunctions/src/content/materializador.ts');
    /* + FASE 5: materializador.ts +2 (antes 124/4): el nombre del material, las palabras de quien lo pidió. */
    /* + misión mundo3d (2026-10-05): content/index.ts +27 (antes 41/3), las variantes de UN resultado; materializador.ts +62 −2 (antes 62/2), los derechos al material y sus variantes después. */
  const legacy = (s) => {
    const a = s.indexOf('    try {\n      const result = await videoEngine.generate(');
    return a < 0 ? '' : s.slice(a, s.indexOf('  } catch (error) {\n    throw toEngineHttpsError(error);', a));
  };
  /* creatorRun y el avatar solo con los arreglos de la FASE 1 del Harness (H0 #9, #11, #15a), por tamaño. */
  check('F4) creatorRun, solo con los arreglos del Harness y del tamaño exacto; y la rama legacy de generateVideo, byte a byte',
    git(`diff --numstat ${RUTA} -- functions/src/creator/index.ts functions/src/creator/credits.ts functions/src/generateAvatar.ts`).trim().split('\n').map((l) => l.replace(/\r$/, '')).join('|')
      /* creator/index.ts: + 10 de la integración i18n da-DK (el locale) y + 2 de la observación del idioma de salida, ver video-asincrono H2.
       * + C-1 (2026-10-05, +16 −5, antes 124/16): creatorQuote guarda la calidad en una transacción, solo sus tres campos y
       * solo con el trabajo `planned`, sin reclamo reciente y sin reserva (ver creator-reclamo D3). */
      === /* + revisión post-auditoría 2026-10-01: el aviso del idioma lleva jobId/stepId (index) y el avatar devuelve sus reservas abandonadas (generateAvatar). */
      /* + cierre post-auditoría 2026-10-01: index +6 −5 (creatorChat/creatorQuote con MODEL_SECRETS; la adaptación de idioma de creatorRun con su sistema y `format: 'text'`) y generateAvatar +3 −3 (AVATAR_SECRETS, solo Gemini); creator/credits.ts sin tocar. */
      /* + segunda auditoría de cierre 2026-10-01: index +7 −1 (antes 117/15): creatorRun pregunta `vozSinNarracion` antes de elegir el siguiente paso —una voz que no tendría nada que leer para el trabajo ANTES de pagar el vídeo— y su import. */
      /* + misión mundo3d (2026-10-05, +17 −2, antes 140/21): materialesDeResultado guarda los derechos y las variantes; nada del reclamo ni del cobro. */
      '45\t4\tfunctions/src/creator/credits.ts|157\t23\tfunctions/src/creator/index.ts|132\t15\tfunctions/src/generateAvatar.ts'
    && legacy(leer('functions/src/creator/video.ts')).length > 500 && legacy(leer('functions/src/creator/video.ts')) === legacy(git(`show ${RUTA}:functions/src/creator/video.ts`)));
}

check('esta suite está en la cadena de `npm test`', /puente-pre-f1d\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
