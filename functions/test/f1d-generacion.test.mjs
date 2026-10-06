/**
 * F1-D · UNA TOMA DE UN PLANO, DE LA PRODUCCIÓN A SU `ShotNode`.
 *
 *     producción confirmada (revisión R) → requisito de F1-A → «Generar»
 *       → requestId de la toma (servidor) → generateVideo → texto (servidor)
 *       → Credit Engine → video.generate → Seedance → trabajo asíncrono
 *       → material asset_ → enlace verificado → ShotNode.producedAssetId
 *
 * De verdad: la puerta, el conductor, el Job Engine, el almacén, la atención,
 * el reconciliador, el barrendero, la liquidación, el materializador, el Content
 * Core, productions, F1-A, la callable `shots` y el Credit Engine, sobre un
 * Firestore en memoria. De mentira: el adaptador de Seedance, lo que ModelArk
 * contesta, los bytes y el almacén de objetos. Nada sale a la red.
 *
 * Y las guardas de F1-D, sobre TODO `functions/src`: ni segundo conductor, ni
 * alias, ni tercera puerta, ni otro motor de trabajos ni de Credits, ni llamadas
 * directas al motor de vídeo o al proveedor, ni cargas dinámicas, ni generación
 * desde `productions` o `filmmaker`.
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

/* ═══ ModelArk, de mentira ═══════════════════════════════════════════════ */
const seedance = ADAPTERS.seedance;
const posts = [];
let serie = 0;
seedance.isConfigured = () => true;
seedance.run = async (req) => {
  posts.push({ acceptAsync: req.acceptAsync, input: { ...req.input } });
  const taskId = `cgt-f1d-${String(++serie).padStart(4, '0')}`;
  return { accepted: { operationId: taskId }, costUSD: 0.2, latencyMs: 3, model: req.model?.id, meta: { providerTaskId: taskId } };
};
const enModelArk = new Map();
const resolutor = {
  async consultar(ref) {
    const e = enModelArk.get(ref.operationId);
    return e ? { conocido: true, aviso: leerAvisoDeSeedance(e) } : { conocido: false, motivo: 'no_contesta' };
  },
};
const termina = (taskId, status = 'succeeded') => enModelArk.set(taskId, {
  id: taskId, status, updated_at: Math.floor(Date.now() / 1000),
  ...(status === 'succeeded' ? { content: { video_url: `https://modelark.invalid/${taskId}.mp4` } } : { error: { code: 'X', message: status } }),
});
const pasada = () => rt.mantenimientoDeWee({
  reconciliacion: () => rt.reconciliacionDeWee({ db: base, resolutores: { seedance: resolutor }, quietoDesdeMs: 0 })(),
  liquidacion: () => rt.barridoDeLiquidacionDeWee({ db: base })(),
})();

/* ═══ Cuentas, la puerta abierta para ellas ══════════════════════════════ */
const A = 'fmUsuarioA001'; const B = 'fmUsuarioB001'; const C = 'fmUsuarioC001'; const SIN = 'fmUsuarioZ001';
/* Un uid del tamaño de los de Firebase Auth: 28 caracteres. Es con el que se mide el tope del Core. */
const L = 'fmUsuarioLargo0000000000001x';
const POBRE = 'fmUsuarioP001';
const SALDO = 5000;
for (const uid of [A, B, C, SIN, L, POBRE]) {
  base.docs.set(`users/doc_${uid}`, { uid, displayName: uid });
  await creditEngine.ensureAccount(uid);
  base.docs.get(`users/doc_${uid}`).creditsBalance = SALDO;
}
/* `SIN` no está en la puerta: para él, el camino Core no existe. */
base.docs.set('aiSettings/runtime', { habilitado: true, capacidades: ['video.generate'], cuentas: [A, B, C, L, POBRE], experiencias: ['studio'] });
olvidarLaPuerta();
base.docs.get(`users/doc_${POBRE}`).creditsBalance = 1;
const saldo = (uid) => base.docs.get(`users/doc_${uid}`).creditsBalance;
const uso = (requestId) => base.leer(`creditTransactions/usage_${requestId}`);
const reembolsos = (requestId) => base.de('creditTransactions').filter((t) => t.requestId === requestId && t.type === 'refund');
const cupoDeVideo = (uid) => base.de('aiRateLimits').filter((d) => d.userId === uid).reduce((s, d) => s + Number(d.video || 0), 0);
const codigo = (r) => (r.ok ? r.valor?.status ?? 'ok' : `${r.error.code} · ${r.error.details?.code ?? ''}${r.error.details?.reason ? ` · ${r.error.details.reason}` : ''}`);
const motivo = (r) => (r.ok ? r.valor?.reason : r.error?.details?.reason);

/* ═══ Producciones de verdad, con F1-A ═══════════════════════════════════ */
const clon = (x) => JSON.parse(JSON.stringify(x));
const pid = (k) => `prodfaro${String(k).padStart(16, '0')}`;
const conFaro = (extra = {}) => clon({
  ...M.produccionVacia({ title: 'El faro', aspectRatio: '16:9', resolution: '1080p' }),
  intent: { objective: 'Un faro al amanecer' },
  creativeDirection: { visualStyle: 'cinematográfico', mood: 'sereno', cinematography: { version: 1, lighting: { type: 'golden_hour' }, shot: { type: 'wide' } } },
  characters: [{ id: 'char-mar', name: 'Marina', identityDescription: 'farera de sesenta años', appearance: { wardrobe: { description: 'impermeable azul' } } }],
  locations: [{ id: 'loc-faro', name: 'El faro', setting: 'exterior', description: 'un faro blanco sobre un acantilado' }],
  objects: [{ id: 'obj-lampara', name: 'Lámpara', kind: 'prop' }],
  generation: { quality: 'high' },
  scenes: [
    {
      id: 'sc-0001', order: 0, title: 'Amanecer', description: 'El sol sale detrás del faro', locationId: 'loc-faro', timeOfDay: 'dawn', weather: 'clear', characterIds: ['char-mar'],
      shots: [
        { id: 'sh-0101', order: 0, durationSec: 5, description: 'Marina sube la escalera del faro', actions: ['sube despacio'], audio: { withSound: true } },
        { id: 'sh-0102', order: 1, durationSec: 2.5, description: 'La lámpara se enciende', objectIds: ['obj-lampara'] },
        { id: 'sh-0103', order: 2, durationSec: 20, description: 'El mar entero al amanecer' },
      ],
    },
    { id: 'sc-0002', order: 1, title: 'Mediodía', description: 'Las gaviotas vuelan sobre el faro', locationId: 'loc-faro', timeOfDay: 'midday', durationSec: 6, shots: [] },
  ],
  ...extra,
});
const HOY = Date.now();
const crear = async (uid, k, prod, material) => {
  const r = await producciones.crearProduccion({ accountId: uid, productionId: pid(k), production: prod, at: HOY }, { db: base, ...(material ? { material } : {}) });
  if (!r.ok) throw new Error(`no se creó la producción ${k}: ${r.code}`);
  return r.view;
};
const requisito = (prod, unitId) => {
  const r = Rq.requisitosDeProduccion(prod);
  if (!r.ok) throw new Error('la producción no está lista');
  return r.requirements.shots.find((s) => s.unitId === unitId);
};
const vista = (uid, k) => producciones.leerProduccion(uid, pid(k), { db: base });
/* La producción tal como estaba cuando se hizo el plan: para pedir con una revisión que ya no es la guardada. */
const planes = new WeakMap();
const produccionDe = (pl) => planes.get(pl);
/** La petición de una toma, tal como la manda la app: su requisito lo calcula el espejo de F1-A. */
const plan = async (uid, k, unitId, extra = {}) => {
  const v = await vista(uid, k);
  const req = requisito(v.view.production, unitId);
  const pl = { productionId: pid(k), sceneId: req.sceneId, unitId, revision: v.view.revision, quality: 'high', requirement: req, ...extra };
  planes.set(pl, v.view.production);
  return pl;
};
const cotizar = async (uid, pl) => intento(() => video.generateVideo.run({ auth: { uid }, data: { plano: pl, cotizar: true } }));
const generar = async (uid, pl, creditos) => intento(() => video.generateVideo.run({ auth: { uid }, data: { plano: pl, creditosCotizados: creditos } }));
/** Lo que hace la app: cotizar, enseñar el precio y generar por ese precio. */
const cotizarYGenerar = async (uid, pl) => {
  const q = await cotizar(uid, pl);
  if (!q.ok || !q.valor.allowed) return { q, g: null };
  return { q, g: await generar(uid, { ...pl, take: q.valor.takes.next.take }, q.valor.credits) };
};
const enlazar = (uid, t) => intento(() => shotsPuerta.shots.run({ auth: { uid }, data: { op: 'shot.result', ...t } }));

await crear(A, 1, conFaro());
await crear(A, 2, conFaro({ format: { aspectRatio: '4:5', resolution: '1080p', preset: 'ads' } }));
await crear(A, 3, conFaro({
  references: [{ id: 'ref-marina', kind: 'image', role: 'character', assetId: `asset_${'1'.repeat(32)}` }],
  characters: [{ id: 'char-mar', name: 'Marina', referenceIds: ['ref-marina'] }],
}), async (assetId) => ({ assetId, ownerAccountId: A, kind: 'image', status: 'ready' }));
const conExtras = conFaro();
conExtras.scenes[0].shots[0] = { ...conExtras.scenes[0].shots[0], advanced: { prompt: 'Texto avanzado de la persona' } };
conExtras.scenes[0].shots[1] = { ...conExtras.scenes[0].shots[1], dialogue: [{ id: 'ln-0001', kind: 'dialogue', characterId: 'char-mar', text: 'Buenos días, mar.' }] };
conExtras.intent = { ...conExtras.intent, constraints: [{ kind: 'no_music' }] };
await crear(A, 4, conExtras);
await crear(A, 5, conFaro());
await crear(A, 6, conFaro());
await crear(A, 7, conFaro());
await crear(A, 12, conFaro());

/* ═══ A–B · EL requestId DE UNA TOMA ════════════════════════════════════ */
console.log('\n── A–B · El requestId lo calcula el servidor, de la cuenta, la producción, la unidad y la toma ──');
{
  const r1 = toma.requestIdDeToma(A, pid(1), 'sh-0101', 1);
  check('A) determinista y con la forma pedida: fm.<32 hex>.<toma>, dentro del límite del Core (87)',
    /^fm\.[0-9a-f]{32}\.1$/.test(r1) && r1 === toma.requestIdDeToma(A, pid(1), 'sh-0101', 1) && r1.length <= 87, r1);
  check('B) mismo plano y misma toma → el mismo; otra toma, otro plano u otra cuenta → otro',
    r1 !== toma.requestIdDeToma(A, pid(1), 'sh-0101', 2) && r1 !== toma.requestIdDeToma(A, pid(1), 'sh-0102', 1) && r1 !== toma.requestIdDeToma(B, pid(1), 'sh-0101', 1));
  /*
   * El tope: la clave que baja al proveedor sale del jobId, que lleva la cuenta y `run_<requestId>`, y no
   * puede pasar de 160 (`core/job.ts`). Con un uid de 28 caracteres, el requestId cabe hasta 87.
   */
  const elMasLargo = toma.requestIdDeToma(L, pid(1), 'sh-0101', toma.MAX_TOMAS);
  check('A) y el más largo posible —uid de Firebase y la última toma— cabe en el Core: ≤ 87', L.length === 28 && elMasLargo.length <= 87, `${elMasLargo.length}`);
  check('B) el plano del Core se llama como la toma, sin el número: fm_<los mismos 32>',
    toma.idDeNodoDePlano(A, pid(1), 'sh-0101') === `fm_${r1.split('.')[1]}` && toma.idDeNodoDeEscena(A, pid(1), 'sc-0001') !== toma.idDeNodoDePlano(A, pid(1), 'sc-0001'));
}

/* ═══ Q · ACCEPTED, y lo que queda anotado ═══════════════════════════════ */
console.log('\n── Q · Cotizar y generar: ACCEPTED ──');
let tomaUno;
{
  const pl = await plan(A, 1, 'sh-0101');
  const antesDePedir = { posts: posts.length, saldo: saldo(A), cupo: cupoDeVideo(A) };
  const q = await cotizar(A, pl);
  check('Q) cotizar es de SOLO LECTURA: ni cupo, ni reserva, ni POST',
    q.ok && q.valor.status === 'QUOTED' && q.valor.allowed === true && q.valor.credits > 0 && q.valor.takes.next.take === 1 && q.valor.takes.current === null
    && posts.length === antesDePedir.posts && saldo(A) === antesDePedir.saldo && cupoDeVideo(A) === antesDePedir.cupo, codigo(q));
  const g = await generar(A, { ...pl, take: 1 }, q.valor.credits);
  tomaUno = { requestId: toma.requestIdDeToma(A, pid(1), 'sh-0101', 1), credits: q.valor.credits };
  check('Q) generar contesta ACCEPTED con SU requestId y su toma, y reserva exactamente lo cotizado',
    g.ok && g.valor.status === 'ACCEPTED' && g.valor.requestId === tomaUno.requestId && g.valor.take === 1 && g.valor.url === null
    && uso(tomaUno.requestId)?.status === 'AUTHORIZED' && saldo(A) === SALDO - q.valor.credits, codigo(g));
  const meta = uso(tomaUno.requestId)?.meta?.filmmaker;
  check('Q) la reserva dice de qué es: producción, escena, unidad, toma, revisión, firma y plantilla',
    meta?.productionId === pid(1) && meta?.unitId === 'sh-0101' && meta?.sceneId === 'sc-0001' && meta?.take === 1 && meta?.revision === pl.revision
    && /^[0-9a-f]{64}$/.test(meta?.firma ?? '') && meta?.plantilla === plano.PLANTILLA_DE_PLANO);
  check('Q) y la atribución sigue siendo la de Weë Studio', uso(tomaUno.requestId)?.source === 'weë-studio' && /Weë Studio/.test(uso(tomaUno.requestId)?.reason ?? ''));
  const post = posts.at(-1);
  check('Q) un POST, pidiendo aceptar y soltar, con el texto COMPUESTO en el servidor desde el requisito',
    posts.length === antesDePedir.posts + 1 && post.acceptAsync === true && /Marina sube la escalera del faro/.test(post.input.prompt)
    && /Camera: wide shot.*golden hour lighting/.test(post.input.prompt));
}

/* ═══ C–D · DOBLE CLIC, DOBLE PESTAÑA ═══════════════════════════════════ */
console.log('\n── C–D · Un segundo clic no crea un segundo trabajo, ni un segundo cobro, ni gasta cupo ──');
{
  const pl = await plan(A, 1, 'sh-0101');
  const antes = { posts: posts.length, saldo: saldo(A), cupo: cupoDeVideo(A), jobs: base.de('jobs').length };
  const r = await generar(A, { ...pl, take: 1 }, tomaUno.credits);
  check('C) doble clic: DUPLICATE_REQUEST, sin POST, sin trabajo nuevo, sin cobro', !r.ok && r.error.details?.code === 'DUPLICATE_REQUEST'
    && posts.length === antes.posts && base.de('jobs').length === antes.jobs && saldo(A) === antes.saldo, codigo(r));
  check('AA) y el duplicado no gasta un segundo cupo', cupoDeVideo(A) === antes.cupo, `cupo ${antes.cupo} → ${cupoDeVideo(A)}`);
  /* Dos pestañas a la vez, con una toma que no existía. */
  const plB = await plan(A, 5, 'sh-0101');
  const q = await cotizar(A, plB);
  const cupo0 = cupoDeVideo(A); const post0 = posts.length; const saldo0 = saldo(A);
  const dos = await Promise.all([generar(A, { ...plB, take: 1 }, q.valor.credits), generar(A, { ...plB, take: 1 }, q.valor.credits)]);
  const rid = toma.requestIdDeToma(A, pid(5), 'sh-0101', 1);
  check('D) dos pestañas a la vez: UNA operación —un POST, un trabajo, una reserva— y la otra es duplicado',
    posts.length === post0 + 1 && base.de('jobs').filter((j) => (j.json ?? '').includes(rid)).length === 1
    && saldo(A) === saldo0 - q.valor.credits && dos.filter((x) => x.ok).length === 1, dos.map(codigo).join(' / '));
  check('AA) y el cupo la cuenta UNA vez', cupoDeVideo(A) === cupo0 + 1, `${cupo0} → ${cupoDeVideo(A)}`);
  check('Z) un duplicado no cobra dos veces', base.de('creditTransactions').filter((t) => t.requestId === rid && t.type === 'usage').length === 1);
  const temprano = await enlazar(A, { productionId: pid(5), sceneId: 'sc-0001', unitId: 'sh-0101', take: 1 });
  check('R) enlazar una toma que todavía no se cobró: not_ready, y el plano sin tocar',
    temprano.ok && temprano.valor.result.status === 'not_ready' && temprano.valor.result.motivo === undefined && !base.leer(`shots/${toma.idDeNodoDePlano(A, pid(5), 'sh-0101')}`), JSON.stringify(temprano.valor?.result));
}

/* ═══ A · CON UN UID DE FIREBASE, DE PUNTA A PUNTA ════════════════════════ */
console.log('\n── A · Con un uid de 28 caracteres la toma cabe entera en el Core ──');
{
  await crear(L, 11, conFaro());
  const r = await cotizarYGenerar(L, await plan(L, 11, 'sh-0101'));
  const rid = toma.requestIdDeToma(L, pid(11), 'sh-0101', 1);
  const job = base.de('jobs').map((j) => JSON.parse(j.json)).find((j) => j.trace.traceId === rid);
  check('A) aceptada, con su trabajo y su reserva: el requestId de la toma no rompe ningún tope', r.g?.ok && r.g.valor.status === 'ACCEPTED' && !!job && uso(rid)?.status === 'AUTHORIZED', codigo(r.g ?? r.q));
}

/* ═══ E–F · OTRA CUENTA, OTRA OPERACIÓN ═════════════════════════════════ */
console.log('\n── E–F · Otra cuenta no llega; la misma toma con otra cosa, tampoco ──');
{
  const pl = await plan(A, 1, 'sh-0102');
  const deB = await generar(B, { ...pl, take: 1 }, 1);
  check('E) otra cuenta con la producción ajena: production_not_found, sin tocar nada', !deB.ok && motivo(deB) === 'production_not_found' && saldo(B) === SALDO, codigo(deB));
  const enlaceDeB = await enlazar(B, { productionId: pid(1), sceneId: 'sc-0001', unitId: 'sh-0101', take: 1 });
  check('E) y tampoco puede enlazar la toma ajena', enlaceDeB.ok && enlaceDeB.valor.result.status === 'not_found', JSON.stringify(enlaceDeB.valor?.result));
  /* El precio de la otra calidad, cotizado en un plano idéntico de otra producción: así se pide por lo que costaría. */
  const deMaxima = await cotizar(A, await plan(A, 6, 'sh-0101', { quality: 'max' }));
  const posts0 = posts.length; const saldo0 = saldo(A); const cupo0 = cupoDeVideo(A);
  const otra = await generar(A, { ...(await plan(A, 1, 'sh-0101')), take: 1, quality: 'max' }, deMaxima.valor?.credits);
  check('F) la misma toma con OTRA calidad —otra operación—: idempotency_conflict, sin POST, sin cobro, sin cupo',
    deMaxima.ok && deMaxima.valor.allowed && !otra.ok && motivo(otra) === 'idempotency_conflict' && posts.length === posts0 && saldo(A) === saldo0 && cupoDeVideo(A) === cupo0, codigo(otra));
}

/* ═══ G–H · EL TEXTO ════════════════════════════════════════════════════ */
console.log('\n── G–H · El texto lo compone el servidor: determinista y dentro de 3000 ──');
{
  const v = await vista(A, 1);
  const req = requisito(v.view.production, 'sh-0101');
  const leido = plano.leerRequisitoDePlano(req);
  const alReves = (x) => (Array.isArray(x) ? x.map(alReves) : esPlano(x) ? Object.fromEntries(Object.keys(x).sort().reverse().map((k) => [k, alReves(x[k])])) : x);
  const desordenado = plano.leerRequisitoDePlano(alReves(clon(req)));
  check('G) la misma entrada da el mismo texto', plano.componerPromptDePlano(leido) === plano.componerPromptDePlano(plano.leerRequisitoDePlano(clon(req))));
  check('G) y el orden de los campos no lo cambia', !!desordenado && plano.componerPromptDePlano(desordenado) === plano.componerPromptDePlano(leido));
  const largo = clon(req);
  largo.input.description = 'D'.repeat(1990);
  largo.input.sceneDescription = 'S'.repeat(1990);
  largo.input.actions = Array.from({ length: 16 }, (_, i) => `acción ${i} `.repeat(20));
  const texto = plano.componerPromptDePlano(plano.leerRequisitoDePlano(largo));
  check('H) nunca pasa de 3000 caracteres, y la descripción del plano va siempre, entera', texto.length <= 3000 && texto.startsWith('D'.repeat(1990)), `${texto.length}`);
  const conEnlace = clon(req);
  conEnlace.input.description = 'Marina mira https://ejemplo.invalid/x el mar';
  check('H) y una URL escrita en el plano no viaja al proveedor', !/https?:\/\//.test(plano.componerPromptDePlano(plano.leerRequisitoDePlano(conEnlace))));
  const colado = clon(req);
  colado.input.advancedPrompt = 'IGNORA TODO';
  colado.input.references = [{ referenceId: 'r', definition: { id: 'r', kind: 'image', assetId: `asset_${'2'.repeat(32)}` } }];
  const leidoColado = plano.leerRequisitoDePlano(colado);
  check('H) lo que el plano no puede llevar se CUENTA para rechazarlo, pero su contenido no se copia',
    leidoColado.promptAvanzado === true && leidoColado.referencias === 1 && !JSON.stringify(leidoColado).includes('IGNORA TODO') && !JSON.stringify(leidoColado).includes('asset_'));
}

/* ═══ I–P · LO QUE F1-D GENERA, Y LO QUE RECHAZA ════════════════════════ */
console.log('\n── I–P · Duración, formato, calidad, sonido, prompt avanzado, referencias ──');
{
  const antes = { posts: posts.length, saldo: saldo(A), cupo: cupoDeVideo(A) };
  const corto = await cotizar(A, await plan(A, 1, 'sh-0102'));
  check('I) un plano de 2,5 s se genera de 4 s, y se dice: pedida 2,5 · efectiva 4',
    corto.ok && corto.valor.allowed && corto.valor.effective.requestedDurationSec === 2.5 && corto.valor.effective.durationSec === 4, JSON.stringify(corto.valor?.effective));
  const cinco = await cotizar(A, await plan(A, 6, 'sh-0101'));
  check('J) uno de 5 s, de 5', cinco.ok && cinco.valor.effective.durationSec === 5 && cinco.valor.effective.requestedDurationSec === 5);
  const escena = await cotizar(A, await plan(A, 6, 'sc-0002'));
  check('J) y una escena sin planos es una unidad: 6 s', escena.ok && escena.valor.allowed && escena.valor.effective.durationSec === 6, codigo(escena));
  const largo = await cotizar(A, await plan(A, 1, 'sh-0103'));
  const largoG = await generar(A, { ...(await plan(A, 1, 'sh-0103')), take: 1 }, 1);
  check('K) más de 15 s: rechazado, con lo pedido y lo máximo para proponer dividir; ni recorte ni generación',
    largo.ok && largo.valor.allowed === false && largo.valor.reason === 'duration_too_long' && largo.valor.detail.maxSec === 15 && largo.valor.detail.requestedSec === 20
    && !largoG.ok && motivo(largoG) === 'duration_too_long', codigo(largoG));
  const cuatroCinco = await cotizar(A, await plan(A, 2, 'sh-0101'));
  check('L) 4:5 no se convierte: rechazado, y se proponen los formatos que sí',
    cuatroCinco.ok && cuatroCinco.valor.reason === 'aspect_ratio_not_supported' && cuatroCinco.valor.detail.suggestions.includes('9:16'), JSON.stringify(cuatroCinco.valor));
  const estandar = await cotizar(A, await plan(A, 6, 'sh-0101', { quality: 'standard' }));
  check('M) «estándar» no llega a 1080p: rechazado, diciendo hasta dónde llega, sin bajarlo en silencio',
    estandar.ok && estandar.valor.allowed === false && estandar.valor.reason === 'quality_not_representable' && estandar.valor.detail.resolution === '1080p' && ['480p', '720p'].includes(estandar.valor.detail.reachable), JSON.stringify(estandar.valor?.detail));
  const cuatroK = conFaro({ format: { aspectRatio: '16:9', resolution: '4k' } });
  await crear(A, 8, cuatroK);
  const maxima = await cotizar(A, await plan(A, 8, 'sh-0101', { quality: 'max' }));
  check('M) «máxima» en 4K obligaría a otro modelo: rechazado, y «máxima» llega hasta 1080p', maxima.ok && maxima.valor.reason === 'quality_not_representable' && maxima.valor.detail.reachable === '1080p', JSON.stringify(maxima.valor?.detail));
  const alta4k = await cotizar(A, await plan(A, 8, 'sh-0101', { quality: 'high' }));
  check('M) CONTROL · «alta» sí llega a 4K: se cotiza en 4K', alta4k.ok && alta4k.valor.allowed === true && alta4k.valor.effective.resolution === '4k', JSON.stringify(alta4k.valor?.effective ?? alta4k.valor));
  const sinCalidad = await cotizar(A, await plan(A, 6, 'sh-0101', { quality: undefined }));
  const inventada = await cotizar(A, await plan(A, 6, 'sh-0101', { quality: 'ultra' }));
  check('M) y sin calidad elegida —o con una que no existe— no hay generación: quality_required',
    sinCalidad.ok && sinCalidad.valor.reason === 'quality_required' && inventada.ok && inventada.valor.reason === 'quality_required', `${sinCalidad.valor?.reason}/${inventada.valor?.reason}`);
  const avanzado = await cotizar(A, await plan(A, 4, 'sh-0101'));
  check('O) un plano con prompt avanzado: bloqueado', avanzado.ok && avanzado.valor.reason === 'advanced_prompt_blocked', avanzado.valor?.reason);
  const dialogo = await cotizar(A, await plan(A, 4, 'sh-0102'));
  check('O) uno con diálogo a cámara tampoco: sin lip-sync no se representa', dialogo.ok && dialogo.valor.reason === 'dialogue_not_supported', dialogo.valor?.reason);
  const referencias = await cotizar(A, await plan(A, 3, 'sh-0101'));
  check('P) con referencias de personaje, el plano es `video.reference`: rechazado, sin desvío a legacy', referencias.ok && referencias.valor.reason === 'capability_not_supported', referencias.valor?.reason);
  const v = await vista(A, 6);
  const forzado = clon(requisito(v.view.production, 'sh-0101'));
  forzado.input.references = [{ referenceId: 'r', definition: { id: 'r', kind: 'image' } }];
  const forzadoG = await generar(A, { productionId: pid(6), sceneId: 'sc-0001', unitId: 'sh-0101', revision: v.view.revision, quality: 'high', requirement: forzado, take: 1 }, 1);
  const primerFotograma = clon(requisito(v.view.production, 'sh-0101'));
  primerFotograma.input.firstFrameReferenceId = 'ref-x';
  const primerFotogramaG = await generar(A, { productionId: pid(6), sceneId: 'sc-0001', unitId: 'sh-0101', revision: v.view.revision, quality: 'high', requirement: primerFotograma, take: 1 }, 1);
  check('P) y un requisito que diga `video.generate` con referencias o primer fotograma dentro, tampoco',
    !forzadoG.ok && motivo(forzadoG) === 'references_not_supported' && !primerFotogramaG.ok && motivo(primerFotogramaG) === 'references_not_supported', `${codigo(forzadoG)} / ${codigo(primerFotogramaG)}`);
  check('I–P) nada de lo rechazado gastó un POST, un Credit o un cupo', posts.length === antes.posts && saldo(A) === antes.saldo && cupoDeVideo(A) === antes.cupo);
  const conRestriccion = clon(requisito((await vista(A, 4)).view.production, 'sc-0002'));
  conRestriccion.output = { modality: 'video', withSound: true };
  const sonido = plano.evaluarPlano(plano.leerRequisitoDePlano(conRestriccion), 'high');
  check('N) sonido con «sin música» no se puede prometer: rechazado', sonido.ok === false && sonido.motivo === 'sound_constraints_not_supported');
}

/* ═══ N · EL SONIDO, SEGÚN EL PLANO ═════════════════════════════════════ */
console.log('\n── N · generateAudio solo si el plano lo pide ──');
{
  const conSonido = posts.find((p) => /Marina sube la escalera/.test(p.input.prompt));
  const { g } = await cotizarYGenerar(A, await plan(A, 6, 'sh-0102'));
  const sinSonido = posts.at(-1);
  check('N) con `withSound: true` el vídeo lleva sonido; sin él, no', conSonido?.input.generateAudio === true && g?.ok && sinSonido.input.generateAudio === false && sinSonido.input.durationSec === 4,
    `${conSonido?.input.generateAudio}/${sinSonido?.input.generateAudio}`);
}

/* ═══ Ficha 6 · EL PLAZO LLEGA AL PROVEEDOR ═════════════════════════════ */
console.log('\n── Ficha 6 · El plazo de plazos.ts llega a ModelArk, y solo por el camino asíncrono ──');
{
  const vida = rt.segundosParaElProveedor(rt.PLAZOS_DE_VIDEO);
  check('la tarea lleva su vida en el proveedor, de plazos.ts: 2 h, dentro de las 2 h 15 min del trabajo',
    posts.every((p) => p.input.vidaEnElProveedorSec === vida) && vida === 7200 && vida * 1000 <= rt.PLAZOS_DE_VIDEO.vidaDelTrabajoMs);
  const cuerpo = async (acceptAsync) => (await buildSeedanceBody({
    capability: 'video.generate', input: { prompt: 'x', durationSec: 5, aspectRatio: '16:9', resolution: '720p', generateAudio: false, vidaEnElProveedorSec: vida },
    model: { id: SEEDANCE_MODEL_IDS.SEEDANCE_2_0 }, prefs: {}, acceptAsync,
  })).body;
  check('el adaptador lo traduce a `execution_expires_after` al aceptar y soltar, y el sondeo de siempre no lo manda',
    (await cuerpo(true)).execution_expires_after === 7200 && (await cuerpo(false)).execution_expires_after === undefined);
}

/* ═══ R–T–V · COMPLETED, material asset_ y enlace verificado ════════════ */
console.log('\n── R · T · V · Termina, se cobra, y el resultado llega a SU plano ──');
let nodoUno;
{
  const jobs = base.de('jobs');
  const job = jobs.map((j) => JSON.parse(j.json)).find((j) => j.trace.traceId === tomaUno.requestId);
  termina(job.attempts[0].providerRef.operationId);
  const descargas0 = descargas;
  await pasada();
  check('R) el barrido lo trae, completa el trabajo y cobra lo reservado, una vez',
    uso(tomaUno.requestId)?.status === 'COMPLETED' && descargas === descargas0 + 1 && reembolsos(tomaUno.requestId).length === 0);
  const antesDeEnlazar = base.leer(`shots/${toma.idDeNodoDePlano(A, pid(1), 'sh-0101')}`);
  const e = await enlazar(A, { productionId: pid(1), sceneId: 'sc-0001', unitId: 'sh-0101', take: 1 });
  nodoUno = toma.idDeNodoDePlano(A, pid(1), 'sh-0101');
  const nodo = base.leer(`shots/${nodoUno}`);
  check('R) el enlace escribe el resultado: plano del Core generado, en su producción y su escena',
    e.ok && e.valor.result.status === 'linked' && !antesDeEnlazar && nodo?.state === 'generated' && nodo?.projectId === pid(1)
    && nodo?.sceneId === toma.idDeNodoDeEscena(A, pid(1), 'sc-0001') && nodo?.ownerAccountId === A, JSON.stringify(e.valor?.result));
  const material = contenido.leerMaterial ? await contenido.leerMaterial(nodo?.producedAssetId) : null;
  check('T) el material es asset_<32 hex>, un vídeo listo de la cuenta, nacido de ESA operación',
    /^asset_[0-9a-f]{32}$/.test(nodo?.producedAssetId ?? '') && material?.kind === 'video' && material?.status === 'ready' && material?.ownerAccountId === A
    && material?.provenance?.traceId === tomaUno.requestId && material?.provenance?.jobId === job.jobId);
  check('T) y es el que dice la identidad del Core para ese trabajo e intento', nodo?.producedAssetId === identidadDelMaterial(job.jobId, job.attempts[0].attemptId));
  check('T) el plano guarda el material por su id: ni una URL del proveedor ni de Storage', !/https?:\/\//.test(JSON.stringify(nodo)));
  const otroNodo = base.leer(`shots/${toma.idDeNodoDePlano(A, pid(1), 'sh-0102')}`);
  check('V) solo ESE plano: los demás siguen sin resultado', !otroNodo);
  const otraVez = await enlazar(A, { productionId: pid(1), sceneId: 'sc-0001', unitId: 'sh-0101', take: 1 });
  check('V) enlazar otra vez no cambia nada: ya estaba', otraVez.ok && otraVez.valor.result.status === 'already' && base.leer(`shots/${nodoUno}`).version === nodo.version);
  const conflicto = await enlazar(A, { productionId: pid(1), sceneId: 'sc-0001', unitId: 'sh-0101', take: 1, expectedVersion: 1 });
  check('V) con la versión que vio la app, si otra escritura se adelantó: conflicto', conflicto.ok && conflicto.valor.result.status === 'conflict' && conflicto.valor.result.motivo === 'version_changed', JSON.stringify(conflicto.valor?.result));
  const repetir = await generar(A, { ...(await plan(A, 1, 'sh-0101')), take: 1 }, tomaUno.credits);
  check('R) y repetir la toma terminada devuelve SU material, sin generar ni cobrar', repetir.ok && repetir.valor.status === 'COMPLETED' && repetir.valor.assetId === nodo.producedAssetId && repetir.valor.credits === 0, codigo(repetir));
  /*
   * AL DÍA SIGUIENTE. El cupo es un documento por día: el de hoy no sabe de las operaciones de ayer. Se simula
   * vaciando los de la cuenta. Repetir una toma que ya tiene su reserva no es una generación nueva y no gasta cupo.
   */
  for (const d of base.de('aiRateLimits').filter((x) => x.userId === A)) base.docs.delete(`aiRateLimits/${d.id}`);
  const manana = await generar(A, { ...(await plan(A, 1, 'sh-0101')), take: 1 }, tomaUno.credits);
  check('AA) y al día siguiente, repetir una toma ya reservada tampoco gasta cupo', manana.ok && manana.valor.status === 'COMPLETED' && cupoDeVideo(A) === 0, `${codigo(manana)} · cupo ${cupoDeVideo(A)}`);
  const q = await cotizar(A, await plan(A, 1, 'sh-0101'));
  check('R) la cotización cuenta la toma cobrada, el plano enlazado, y ofrece la siguiente (un cobro nuevo, a propósito)',
    q.ok && q.valor.takes.current?.take === 1 && q.valor.takes.current?.status === 'COMPLETED' && q.valor.takes.node?.producedAssetId === nodo.producedAssetId && q.valor.takes.next?.take === 2);
}

/* ═══ S · FAILED, y ModelArk que vence la tarea ═════════════════════════ */
console.log('\n── S · Falla o vence: reembolso exacto, una vez, y el plano queda sin enlazar ──');
{
  await crear(C, 9, conFaro());
  const pl = await plan(C, 9, 'sh-0101');
  const r = await cotizarYGenerar(C, pl);
  const rid = toma.requestIdDeToma(C, pid(9), 'sh-0101', 1);
  const job = base.de('jobs').map((j) => JSON.parse(j.json)).find((j) => j.trace.traceId === rid);
  termina(job.attempts[0].providerRef.operationId, 'expired');
  await pasada();
  check('S) ModelArk vence la tarea: FAILED, un intento, y el barrido devuelve lo reservado EXACTO',
    r.g?.ok && uso(rid)?.status === 'REFUNDED' && reembolsos(rid).length === 1 && reembolsos(rid)[0].amount === r.q.valor.credits && saldo(C) === SALDO);
  await pasada();
  check('S) otra pasada no devuelve dos veces', reembolsos(rid).length === 1 && saldo(C) === SALDO);
  const e = await enlazar(C, { productionId: pid(9), sceneId: 'sc-0001', unitId: 'sh-0101', take: 1 });
  check('S) y no hay nada que enlazar: failed', e.ok && e.valor.result.status === 'failed' && !base.leer(`shots/${toma.idDeNodoDePlano(C, pid(9), 'sh-0101')}`));
  const q2 = await cotizar(C, pl);
  check('S) la siguiente toma se puede pedir: la anterior terminó', q2.ok && q2.valor.allowed && q2.valor.takes.next.take === 2 && q2.valor.takes.current.status === 'REFUNDED');
}

/* ═══ Una toma viva por plano ═══════════════════════════════════════════ */
console.log('\n── Una toma viva por plano, y en orden ──');
{
  const pl = await plan(A, 5, 'sh-0101');
  const enVuelo = await generar(A, { ...pl, take: 2 }, 1);
  check('una segunda toma con la primera en marcha: take_in_flight, sin POST ni cobro', !enVuelo.ok && motivo(enVuelo) === 'take_in_flight', codigo(enVuelo));
  const salto = await generar(A, { ...pl, take: 3 }, 1);
  check('saltarse una toma: take_out_of_order', !salto.ok && motivo(salto) === 'take_out_of_order', codigo(salto));
  const q = await cotizar(A, pl);
  check('y la cotización lo dice: la toma 1 en marcha, ninguna siguiente', q.ok && q.valor.allowed === false && q.valor.reason === 'take_in_flight' && q.valor.takes.current.status === 'AUTHORIZED');
}

/* ═══ X · EL PLANO CAMBIÓ MIENTRAS SE GENERABA ══════════════════════════ */
console.log('\n── X · El plano cambió: el resultado no se enlaza solo, ni se regenera, ni se cobra otra vez ──');
{
  const pl = await plan(A, 7, 'sh-0101');
  const { q, g } = await cotizarYGenerar(A, pl);
  const rid = toma.requestIdDeToma(A, pid(7), 'sh-0101', 1);
  const cambio = await producciones.aplicarOperacionesGuardadas({ accountId: A, productionId: pid(7), expectedRevision: pl.revision, operations: [{ op: 'edit_text', target: { shotId: 'sh-0101' }, description: 'Marina baja la escalera' }], at: HOY + 1 }, { db: base });
  const job = base.de('jobs').map((j) => JSON.parse(j.json)).find((j) => j.trace.traceId === rid);
  termina(job.attempts[0].providerRef.operationId);
  const posts0 = posts.length;
  await pasada();
  const e = await enlazar(A, { productionId: pid(7), sceneId: 'sc-0001', unitId: 'sh-0101', take: 1 });
  check('X) generado sobre la revisión anterior: stale, sin enlazar', g?.ok && cambio.ok && e.ok && e.valor.result.status === 'stale' && !base.leer(`shots/${toma.idDeNodoDePlano(A, pid(7), 'sh-0101')}`),
    JSON.stringify(e.valor?.result));
  check('X) el vídeo sigue siendo de la cuenta —en sus creaciones—, cobrado UNA vez, sin regenerar',
    uso(rid)?.status === 'COMPLETED' && base.de('assets').some((a) => a.provenance?.traceId === rid && a.ownerAccountId === A) && posts.length === posts0 && q.valor.credits === Math.abs(uso(rid).amount));
  const otroPlano = await cotizar(A, await plan(A, 7, 'sh-0102'));
  check('X) editar ESE plano no toca a los demás de otra escena: la escena 2 se sigue pudiendo generar', otroPlano.ok && (await cotizar(A, await plan(A, 7, 'sc-0002'))).valor.allowed === true);
  const vieja = await generar(A, { ...pl, unitId: 'sh-0102', requirement: requisito(produccionDe(pl), 'sh-0102'), take: 1 }, 1);
  check('X) y pedir con la revisión de antes: production_changed, sin reservar', !vieja.ok && motivo(vieja) === 'production_changed' && !uso(toma.requestIdDeToma(A, pid(7), 'sh-0102', 1)), codigo(vieja));
}

/* ═══ W · MATERIAL AJENO ════════════════════════════════════════════════ */
console.log('\n── W · Un material ajeno, o de otra clase, nunca llega a un plano ──');
{
  const ajeno = `asset_${'a'.repeat(32)}`;
  base.docs.set(`assets/${ajeno}`, { assetId: ajeno, ownerAccountId: B, kind: 'video', status: 'ready' });
  const r = await shotsMod.fijarResultadoVerificado(A, nodoUno, { assetId: ajeno, at: HOY }, { db: base });
  check('W) el de otra cuenta: rechazado', r.status === 'referencia_rechazada' && base.leer(`shots/${nodoUno}`).producedAssetId !== ajeno);
  const imagen = `asset_${'b'.repeat(32)}`;
  base.docs.set(`assets/${imagen}`, { assetId: imagen, ownerAccountId: A, kind: 'image', status: 'ready' });
  const r2 = await shotsMod.fijarResultadoVerificado(A, nodoUno, { assetId: imagen, at: HOY }, { db: base });
  check('W) una imagen propia: rechazada', r2.status === 'referencia_rechazada');
  const cliente = await intento(() => shotsPuerta.shots.run({ auth: { uid: A }, data: { op: 'shot.update', shotId: nodoUno, producedAssetId: imagen } }));
  check('W) y el cliente ya no puede escribirlo: `shot.update` no toca un nodo de Filmmaker', !cliente.ok && cliente.error.code === 'permission-denied', cliente.ok ? 'aceptó' : cliente.error.code);
  const propio = await crearPlanoPropio();
  const noDeFilmmaker = await intento(() => shotsPuerta.shots.run({ auth: { uid: A }, data: { op: 'shot.update', shotId: propio, producedAssetId: imagen, narrative: 'Otro texto' } }));
  const escenaAjena = await intento(() => shotsPuerta.shots.run({ auth: { uid: A }, data: { op: 'scene.create', sceneId: toma.idDeNodoDeEscena(A, pid(1), 'sc-0009'), projectId: pid(1), order: 0 } }));
  const planoAjeno = await intento(() => shotsPuerta.shots.run({ auth: { uid: A }, data: { op: 'shot.create', shotId: 'fm_' + 'e'.repeat(32), sceneId: 'escena-propia', projectId: 'proyecto-propio', order: 1 } }));
  check('W) ni crear a mano una escena o un plano con nombre de Filmmaker: esos solo los hace el enlace verificado',
    !escenaAjena.ok && escenaAjena.error.code === 'permission-denied' && !planoAjeno.ok && planoAjeno.error.code === 'permission-denied', `${escenaAjena.error?.code}/${planoAjeno.error?.code}`);
  check('W) ni en ningún otro plano: `producedAssetId` ya no viaja por `shot.update`',
    noDeFilmmaker.ok && base.leer(`shots/${propio}`).producedAssetId === undefined && base.leer(`shots/${propio}`).narrative === 'Otro texto');
  const noEsDeEsa = `asset_${'c'.repeat(32)}`;
  base.docs.set(`assets/${noEsDeEsa}`, { assetId: noEsDeEsa, ownerAccountId: A, kind: 'video', status: 'ready', provenance: { traceId: 'otra-operacion', capability: 'video.generate' } });
  check('W) un vídeo propio de OTRA operación no se enlaza: la procedencia manda', !(await toma.enlazarToma(base, { uid: A, accountId: A }, { productionId: pid(1), sceneId: 'sc-0001', unitId: 'sh-0102', toma: 1 }, { at: HOY })).status.startsWith('linked'));
  const puesto = base.leer(`shots/${nodoUno}`).producedAssetId;
  const original = base.leer(`assets/${puesto}`);
  const conMaterial = async (cambio) => {
    base.docs.set(`assets/${puesto}`, { ...original, ...cambio, provenance: { ...original.provenance, ...(cambio.provenance ?? {}) } });
    try { return await toma.enlazarToma(base, { uid: A, accountId: A }, { productionId: pid(1), sceneId: 'sc-0001', unitId: 'sh-0101', toma: 1 }, { at: HOY }); }
    finally { base.docs.set(`assets/${puesto}`, original); }
  };
  const deOtraEjecucion = await conMaterial({ provenance: { runId: 'run_otra-cosa' } });
  const deOtraCuenta = await conMaterial({ ownerAccountId: B });
  const noEsVideo = await conMaterial({ kind: 'image' });
  const sinTerminar = await conMaterial({ status: 'processing' });
  const esperado = (r) => r.status === 'not_ready' && r.motivo === 'asset_mismatch';
  check('W) el enlace exige SU material: de esa ejecución, de la cuenta, un vídeo y listo — si no, no lo pone',
    esperado(deOtraEjecucion) && esperado(deOtraCuenta) && esperado(noEsVideo) && esperado(sinTerminar), [deOtraEjecucion, deOtraCuenta, noEsVideo, sinTerminar].map((r) => `${r.status}:${r.motivo ?? ''}`).join(' '));
  check('W) CONTROL · con su material de verdad, ya estaba', (await toma.enlazarToma(base, { uid: A, accountId: A }, { productionId: pid(1), sceneId: 'sc-0001', unitId: 'sh-0101', toma: 1 }, { at: HOY })).status === 'already');
}
async function crearPlanoPropio() {
  await shotsMod.crearEscena({ accountId: A, sceneId: 'escena-propia', projectId: 'proyecto-propio', order: 0, at: HOY }, { db: base });
  await shotsMod.crearPlano({ accountId: A, shotId: 'plano-propio', projectId: 'proyecto-propio', sceneId: 'escena-propia', order: 0, at: HOY }, { db: base });
  return 'plano-propio';
}

/* ═══ U · EL OBJETO SIN FICHA ═══════════════════════════════════════════ */
console.log('\n── U · El vídeo quedó en Storage sin su ficha: se adopta, sin descargarlo otra vez ──');
{
  const assetId = identidadDelMaterial('job-adopcion', 'job-adopcion#1');
  const ruta = `users/${A}/ai-generations/${assetId}.mp4`;
  objetos.set(ruta, { bytes: Buffer.from('vídeo ya guardado'), contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: 'tok-1', [MARCA_DE_MATERIAL]: assetId } });
  const descargas0 = descargas;
  const r = await materializadorDeWee.guardar({ assetId, userId: A, kind: 'video', recurso: 'https://modelark.invalid/adopcion.mp4', provenance: { createdAt: HOY, jobId: 'job-adopcion' } });
  const ficha = await contenido.leerMaterial(assetId);
  check('U) adopta el objeto que hay: una ficha, el mismo objeto y su token, CERO descargas',
    r.ok && r.assetId === assetId && descargas === descargas0 && ficha?.status === 'ready' && ficha?.storageRef?.objectKey === ruta && /token=tok-1/.test(ficha?.delivery?.url ?? ''));
  const otro = identidadDelMaterial('job-ajeno', 'job-ajeno#1');
  objetos.set(`users/${A}/ai-generations/${otro}.mp4`, { bytes: Buffer.from('x'), contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: 'tok-2', [MARCA_DE_MATERIAL]: 'asset_otro' } });
  const r2 = await materializadorDeWee.guardar({ assetId: otro, userId: A, kind: 'video', recurso: 'https://modelark.invalid/b.mp4', provenance: { createdAt: HOY, jobId: 'job-ajeno' } });
  check('U) CONTROL · un objeto sin SU marca no se adopta: se intenta guardar y choca, sin inventar la ficha', !r2.ok && !(await contenido.leerMaterial(otro)), JSON.stringify(r2));
  const nuevo = identidadDelMaterial('job-marca', 'job-marca#1');
  await materializadorDeWee.guardar({ assetId: nuevo, userId: A, kind: 'video', recurso: 'https://modelark.invalid/c.mp4', provenance: { createdAt: HOY, jobId: 'job-marca' } });
  check('U) y todo objeto que se guarda lleva la marca de su material', objetos.get(`users/${A}/ai-generations/${nuevo}.mp4`)?.metadata?.[MARCA_DE_MATERIAL] === nuevo);
}

/* ═══ LOS ERRORES: CREDITS QUE NO LLEGAN, Y UN RECHAZO ANTES DE ACEPTAR ═══ */
console.log('\n── Si los Credits no llegan no se genera; si ModelArk rechaza, se devuelve exacto ──');
{
  await crear(POBRE, 13, conFaro());
  const pl = await plan(POBRE, 13, 'sh-0101');
  const q = await cotizar(POBRE, pl);
  const posts0 = posts.length;
  const r = await generar(POBRE, { ...pl, take: 1 }, q.valor.credits);
  const rid = toma.requestIdDeToma(POBRE, pid(13), 'sh-0101', 1);
  check('Credits insuficientes: el Credit Engine lo rechaza y no se genera nada —ni POST, ni trabajo, ni reserva—',
    !r.ok && r.error.details?.code === 'INSUFFICIENT_CREDITS' && posts.length === posts0 && !uso(rid) && saldo(POBRE) === 1
    && !base.de('jobs').some((j) => (j.json ?? '').includes(rid)), codigo(r));
  await crear(C, 14, conFaro());
  const plC = await plan(C, 14, 'sh-0101');
  const qC = await cotizar(C, plC);
  const saldoC = saldo(C);
  const correr = seedance.run;
  seedance.run = async (req) => { posts.push({ acceptAsync: req.acceptAsync, input: { ...req.input } }); throw new ProviderError('seedance respondió 400: inválido', 'seedance', 400, false); };
  const rechazo = await generar(C, { ...plC, take: 1 }, qC.valor.credits);
  seedance.run = correr;
  const ridC = toma.requestIdDeToma(C, pid(14), 'sh-0101', 1);
  const jobC = base.de('jobs').map((j) => JSON.parse(j.json)).find((j) => j.trace.traceId === ridC);
  await pasada();
  check('ModelArk rechaza el POST antes de aceptar: el trabajo falla y la reserva vuelve EXACTA, una vez',
    !rechazo.ok && jobC?.state === 'failed' && uso(ridC)?.status === 'REFUNDED' && reembolsos(ridC).length === 1 && reembolsos(ridC)[0].amount === qC.valor.credits && saldo(C) === saldoC,
    `${codigo(rechazo)} · ${jobC?.state}`);
  const qC2 = await cotizar(C, plC);
  check('y la siguiente toma se puede pedir: la anterior terminó sin cobro', qC2.ok && qC2.valor.allowed && qC2.valor.takes.next.take === 2 && qC2.valor.takes.current.status === 'REFUNDED');
}

/* ═══ LO QUE EL CLIENTE NO PUEDE COLAR ══════════════════════════════════ */
console.log('\n── Una toma no usa lo que el cliente mande al lado del plano ──');
{
  const pl = await plan(A, 12, 'sh-0101');
  const q = await cotizar(A, pl);
  const posts0 = posts.length;
  const r = await intento(() => video.generateVideo.run({ auth: { uid: A }, data: {
    plano: { ...pl, take: 1 }, creditosCotizados: q.valor.credits,
    prompt: 'TEXTO DEL CLIENTE', requestId: 'cliente-0001', inputImage: 'https://ejemplo.invalid/x.png',
    references: { images: ['https://ejemplo.invalid/y.png'] }, durationSec: 15, aspectRatio: '9:16', model: 'SEEDANCE_2_5', quality: 'max',
  } }));
  const post = posts.at(-1);
  const rid = toma.requestIdDeToma(A, pid(12), 'sh-0101', 1);
  check('ni su texto, ni su requestId, ni sus imágenes o referencias, ni su duración, formato, modelo o calidad: la toma es la del plano',
    r.ok && r.valor.status === 'ACCEPTED' && r.valor.requestId === rid && posts.length === posts0 + 1
    && !/TEXTO DEL CLIENTE/.test(post.input.prompt) && /Marina sube la escalera/.test(post.input.prompt)
    && post.input.imageUrl === undefined && post.input.referenceImages === undefined && post.input.durationSec === 5 && post.input.aspectRatio === '16:9'
    && !uso('cliente-0001') && uso(rid)?.status === 'AUTHORIZED', codigo(r));
}

/* ═══ Y · EL PRECIO ═════════════════════════════════════════════════════ */
console.log('\n── Y · El precio sale de la configuración vigente, también en una instancia recién arrancada ──');
{
  const SERVICIOS_DE_VIDEO = ['ai_video_draft', 'ai_video', 'ai_video_hd', 'ai_video_advanced', 'ai_video_max'];
  const antes = await cotizar(A, await plan(A, 6, 'sc-0002'));
  for (const s of SERVICIOS_DE_VIDEO) base.docs.set(`creditCosts/${s}`, { credits: 99_999 });
  /* Una instancia recién arrancada: sin nada en caché. Sin `loadCostOverrides()` antes del precio, cotizaría con el catálogo del código. */
  creditCosts.invalidateCostOverrides();
  const q = await cotizar(A, await plan(A, 6, 'sc-0002'));
  const q2 = await cotizar(A, await plan(A, 6, 'sc-0002'));
  check('Y) la cotización usa la configuración vigente también en frío, y es la misma dos veces', antes.ok && antes.valor.credits < 99_999 && q.ok && q.valor.credits === 99_999 && q2.valor.credits === 99_999, `${antes.valor?.credits} → ${q.valor?.credits}/${q2.valor?.credits}`);
  const mal = await generar(A, { ...(await plan(A, 6, 'sc-0002')), take: 1 }, antes.valor.credits);
  check('Y) generar por un precio que ya no es el vigente: price_changed, sin reservar ni gastar cupo', !mal.ok && motivo(mal) === 'price_changed' && mal.error.details?.credits === 99_999 && !uso(toma.requestIdDeToma(A, pid(6), 'sc-0002', 1)), codigo(mal));
  for (const s of SERVICIOS_DE_VIDEO) base.docs.delete(`creditCosts/${s}`);
  creditCosts.invalidateCostOverrides();
}

/* ═══ La puerta cerrada ═════════════════════════════════════════════════ */
console.log('\n── Sin el Core, una toma se rechaza: ni legacy, ni cobro ──');
{
  await crear(SIN, 10, conFaro());
  const q = await cotizar(SIN, await plan(SIN, 10, 'sh-0101'));
  const g = await generar(SIN, { ...(await plan(SIN, 10, 'sh-0101')), take: 1 }, 1);
  check('una cuenta fuera de la puerta: route_unavailable, sin reservar, sin cupo y sin ningún POST',
    q.ok && q.valor.reason === 'route_unavailable' && !g.ok && motivo(g) === 'route_unavailable' && saldo(SIN) === SALDO && cupoDeVideo(SIN) === 0, codigo(g));
}

/* ═══ AB–AF · LAS GUARDAS, SOBRE TODO functions/src ═════════════════════ */
console.log('\n── AB–AF · Nada nuevo por detrás: ni conductor, ni puerta, ni motor, ni proveedor ──');
const FUENTES = git('ls-files functions/src').trim().split('\n').filter((f) => f.endsWith('.ts'));
const NUEVOS = ['functions/src/creator/plano.ts', 'functions/src/creator/toma.ts'].filter((f) => fs.existsSync(path.resolve(RAIZ, f)) && !FUENTES.includes(f));
const TODAS = [...FUENTES, ...NUEVOS];
const src = (f) => sinComentarios(leer(f));
const quienes = (re) => TODAS.filter((f) => re.test(src(f)));
{
  check('AB) Seedance y solo Seedance: la cadena de vídeo, la puerta y el normalizador',
    JSON.stringify((DEFAULT_ROUTING['video.generate']?.chain ?? []).map((e) => e.provider)) === JSON.stringify(['seedance'])
    && /allowedProviders: \['seedance'\]/.test(src('functions/src/creator/video.ts')) && /VIDEO_PROVIDERS = \['seedance'\]/.test(src('functions/src/engine/video.ts')));
  check('AB) nadie habla con ModelArk fuera de un adaptador, y las tareas de vídeo solo el de Seedance',
    quienes(/bytepluses|arkBase\(|arkHeaders\(/).every((f) => f.startsWith('functions/src/engine/providers/'))
    && JSON.stringify(quienes(/contents\/generations\/tasks/)) === JSON.stringify(['functions/src/engine/providers/seedance.ts']), quienes(/bytepluses|arkBase\(|arkHeaders\(/).join(', '));
  check('AB) ni ejecuta el adaptador a mano', quienes(/seedanceAdapter\.run\(|ADAPTERS\.seedance\.run\(|ADAPTERS\[['"]seedance['"]\]\.run\(/).length === 0);
  check('AC) el motor de vídeo lo llaman solo la rama legacy de la puerta y creatorRun',
    JSON.stringify(quienes(/videoEngine\.generate\(/)) === JSON.stringify(['functions/src/creator/index.ts', 'functions/src/creator/video.ts']), quienes(/videoEngine\.generate\(/).join(', '));
  const F1D = ['functions/src/creator/plano.ts', 'functions/src/creator/toma.ts', 'functions/src/shots/index.ts', 'functions/src/shots/puerta.ts'];
  check('AC) lo nuevo de F1-D no genera: ni motor, ni conductor, ni Job Engine, ni proveedor, ni Credits',
    F1D.every((f) => !/videoEngine|engine\.generate|conductorDeWee|crearConductor|pedirMedio|crearJobEngine|crearMotorDeTrabajosDeWee|spendCredits|completeCredits|refundCredits|creditEngine|seedance|modelark|ADAPTERS/i.test(src(f))));
  check('AD) un solo conductor, y nadie lo reexporta con otro nombre',
    JSON.stringify(quienes(/export const crearConductor\b/)) === JSON.stringify(['functions/src/runtime/conductor.ts'])
    && quienes(/(?:=|:)\s*conductorDeWee\b(?!\()|conductorDeWee\s+as\s+|as\s+conductorDeWee\b/).length === 0
    /* + misión mundo3d (FASE 5): la tercera puerta, la del mundo, autorizada por la misión del dueño. */
    && JSON.stringify(quienes(/conductorDeWee\(\{/)) === JSON.stringify(['functions/src/creator/brain.ts', 'functions/src/creator/mundo.ts', 'functions/src/creator/video.ts']));
  check('AE) tres puertas y ninguna más: `decidirRuntime(` fuera del runtime, solo en brain, mundo y video, una vez cada una, cada una con su candado',
    JSON.stringify(quienes(/decidirRuntime\(/).filter((f) => !f.startsWith('functions/src/runtime/'))) === JSON.stringify(['functions/src/creator/brain.ts', 'functions/src/creator/mundo.ts', 'functions/src/creator/video.ts'])
    && (src('functions/src/creator/video.ts').match(/decidirRuntime\(/g) || []).length === 1
    && (src('functions/src/creator/mundo.ts').match(/decidirRuntime\(/g) || []).length === 1
    && JSON.stringify(quienes(/const CAPACIDAD_DEL_CANARY/)) === JSON.stringify(['functions/src/creator/brain.ts', 'functions/src/creator/mundo.ts', 'functions/src/creator/video.ts']));
  check('AE) un solo Credit Engine y un solo Job Engine',
    JSON.stringify(quienes(/export function createCreditEngine\b/)) === JSON.stringify(['functions/src/credits/creditEngine.ts'])
    && JSON.stringify(quienes(/export const crearJobEngine\b/)) === JSON.stringify(['functions/src/core/job.ts']));
  /* Las que ya había en el puente —tipos, SDKs y un módulo del gateway—, fijadas una a una. Cualquier otra, en cualquier archivo, falla. */
  const CARGAS_CONOCIDAS = {
    'functions/src/core/algorithm/optimization-engine.ts': ["'./signals'"],
    'functions/src/core/registry/types.ts': ["'./capabilities'"],
    'functions/src/engine/gateway.ts': ["'./referencias-de-wee'", "'./referencias-de-wee'", "'./referencias-de-wee'"],
    'functions/src/engine/providers/gemini.ts': ["'@google/genai'"],
    'functions/src/media/procesador.ts': ["'sharp'"],
    'functions/src/vertexAI.ts': ["'@google/genai'", "'sharp'", "'firebase-admin'", "'uuid'", "'./engine/http'"],
  };
  const cargas = Object.fromEntries(TODAS.map((f) => [f, [...src(f).matchAll(/\b(?:import|require)\s*\(\s*([^)]*?)\s*\)/g)].map((m) => m[1])]).filter(([, l]) => l.length));
  check('AE) ni cargas dinámicas nuevas para esquivar el grafo: `import(`/`require(` solo donde ya estaban, con lo mismo',
    JSON.stringify(cargas) === JSON.stringify(CARGAS_CONOCIDAS), JSON.stringify(Object.keys(cargas).filter((f) => JSON.stringify(cargas[f]) !== JSON.stringify(CARGAS_CONOCIDAS[f]))));
  check('AF) productions no genera, no cobra y no carga el motor',
    ['functions/src/productions/index.ts', 'functions/src/productions/puerta.ts'].every((f) => !/generateVideo|videoEngine|conductorDeWee|pedirMedio|creditEngine|spendCredits|from '\.\.\/(engine|runtime|creator|credits)/.test(src(f))));
  check('AF) y filmmaker/ tampoco, ni entra a productions para generar',
    FUENTES.filter((f) => f.startsWith('functions/src/filmmaker/')).every((f) => !/generateVideo|videoEngine|conductorDeWee|creditEngine|from '\.\.\/(engine|runtime|creator|credits|productions)/.test(src(f))));
  check('AF) la puerta del vídeo no carga el dominio: F1-A solo entra al servidor por productions',
    !/from '\.\.\/(filmmaker|productions)/.test(src('functions/src/creator/video.ts') + src('functions/src/creator/plano.ts') + src('functions/src/creator/toma.ts')));
}

/* ═══ AG–AI · LO QUE NO SE TOCÓ ═════════════════════════════════════════ */
console.log('\n── AG–AI · F1-A, productions y Credits, intactos ──');
{
  check('AG) F1-A intacto', git(`diff --name-only ${PUENTE} -- functions/src/filmmaker`).trim() === '');
  check('AH) productions intacto', git(`diff --name-only ${PUENTE} -- functions/src/productions`).trim() === '');

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
  check('AI) Credits intactos: el Credit Engine, el Financial Core y el resto; credits/index, solo el cierre de spendCredits del Harness (b878068); el Router y creditCosts, solo la misión fal; del tamaño exacto',
    git(`diff --numstat ${CREDITS} -- functions/src/credits functions/src/core/financial functions/src/core/router.ts`).trim().replace(/\r$/, '') === `${CREDITS_DE_LA_MISION_FAL}\n${CREDITS_DEL_HARNESS}`);
  const legacy = (s) => { const a = s.indexOf('    try {\n      const result = await videoEngine.generate('); return a < 0 ? '' : s.slice(a, s.indexOf('  } catch (error) {\n    throw toEngineHttpsError(error);', a)); };
  check('creatorRun, solo con los arreglos del Harness (H0 #9, #11, #15a) y del tamaño exacto; y la rama legacy de generateVideo, byte a byte',
    git(`diff --numstat ${PUENTE} -- functions/src/creator/index.ts functions/src/creator/credits.ts functions/src/generateAvatar.ts`).trim().split('\n').map((l) => l.replace(/\r$/, '')).join('|')
      /* creator/index.ts: + 10 de la integración i18n da-DK (el locale) y + 2 de la observación del idioma de salida, ver video-asincrono H2.
       * + C-1 (2026-10-05, +16 −5, antes 124/16): creatorQuote guarda la calidad en una transacción, solo sus tres campos y
       * solo con el trabajo `planned`, sin reclamo reciente y sin reserva (ver creator-reclamo D3). */
      === /* + revisión post-auditoría 2026-10-01: el aviso del idioma lleva jobId/stepId (index) y el avatar devuelve sus reservas abandonadas (generateAvatar). */
      /* + cierre post-auditoría 2026-10-01: index +6 −5 (creatorChat/creatorQuote con MODEL_SECRETS; la adaptación de idioma de creatorRun con su sistema y `format: 'text'`) y generateAvatar +3 −3 (AVATAR_SECRETS, solo Gemini); creator/credits.ts sin tocar. */
      /* + segunda auditoría de cierre 2026-10-01: index +7 −1 (antes 117/15): creatorRun pregunta `vozSinNarracion` antes de elegir el siguiente paso —una voz que no tendría nada que leer para el trabajo ANTES de pagar el vídeo— y su import. */
      /* + misión mundo3d (2026-10-05, +17 −2, antes 140/21): materialesDeResultado guarda los derechos del modelo y anota las variantes de UN resultado; nada del reclamo ni del cobro. */
      '45\t4\tfunctions/src/creator/credits.ts|157\t23\tfunctions/src/creator/index.ts|132\t15\tfunctions/src/generateAvatar.ts'
    && legacy(leer('functions/src/creator/video.ts')).length > 500 && legacy(leer('functions/src/creator/video.ts')) === legacy(git(`show ${PUENTE}:functions/src/creator/video.ts`)));
}

check('esta suite está en la cadena de `npm test`', /f1d-generacion\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
