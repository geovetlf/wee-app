/**
 * F1-B · WEË FILMMAKER — UNA PRODUCCIÓN, GUARDADA.
 *
 * Lo que se demuestra aquí: la producción de F1-A se guarda, se lee, se lista, se
 * cambia con su lenguaje de operaciones, se archiva y se duplica SIN escrituras a
 * medias, sin pisar cambios ajenos (CAS), sin que otra cuenta vea nada, con un
 * registro que solo se añade y del que se puede reconstruir cualquier revisión.
 *
 *   A create · B idempotencia · C get · D list · E ownership · F not-found
 *   G apply · H CAS · I operación inválida · J operación sin cambios · K atomicidad
 *   L archive · M unarchive · N duplicate · O límites · P tamaño · Q referencias
 *   R advanced.prompt · S registro · T revisión 0 · U revisión incremental
 *   V sin proveedor ni modelo · W sin URLs · X sin Elements · Y sin tocar el Core
 *   Z reglas, índice, puerta y documentación
 *
 * Con un Firestore de mentira que se comporta como el de verdad en lo que importa:
 * transacciones con lecturas antes que escrituras, `create` que falla si ya existe,
 * reintento si alguien cambió lo leído, y un fallo que se puede provocar justo
 * antes de confirmar. Lo que solo se ve con Firestore de verdad —las reglas— está
 * en `productions.emulator.mjs`, fuera de la cadena.
 *
 * Usa el compilado: `npm run build` antes de `npm test`.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
/** Una sección que lanza no tumba la suite: su excepción es una comprobación fallida, con el motivo. */
const seccion = async (letra, fn) => {
  try { await fn(); } catch (e) { check(`${letra}) la sección termina sin lanzar`, false, String(e && e.stack ? e.stack : e).split('\n').slice(0, 3).join(' · ')); }
};

/* El módulo de Firestore se sustituye ANTES de cargar la puerta: así `.run` corre contra la base de mentira. */
const firestoreAdmin = require('firebase-admin/firestore');
const getFirestoreReal = firestoreAdmin.getFirestore;
let baseDeLaPuerta = null;
firestoreAdmin.getFirestore = () => baseDeLaPuerta;

const M = lib('filmmaker/modelo.js');
const V = lib('filmmaker/validacion.js');
const O = lib('filmmaker/operaciones.js');
const Rq = lib('filmmaker/requisitos.js');
const P = lib('productions/index.js');
const Pu = lib('productions/puerta.js');
const shotCore = lib('core/shot.js');
const contratos = lib('core/contracts.js');

const clon = (x) => JSON.parse(JSON.stringify(x));
const iguales = (a, b) => M.canonico(a) === M.canonico(b);
const A = 'cuentaA';
const B = 'cuentaB';
const HOY = 1_800_000_000_000;
const pid = (k) => `prod${String(k).padStart(20, '0')}`;
const hex = (c) => c.repeat(32);
const ASSET_IMG = `asset_${hex('a')}`;
const ASSET_AUDIO = `asset_${hex('b')}`;
const ASSET_FRAME = `asset_${hex('c')}`;
const ASSET_AJENO = `asset_${hex('d')}`;
const ASSET_CRUDO = `asset_${hex('e')}`;
const ASSET_NADA = `asset_${hex('f')}`;
const PROMPT = 'Luna a contraluz de neón, en cámara lenta, con la lluvia de frente';

/* ── Un Firestore de mentira, con transacciones que se portan como las de verdad ── */

const fakeDb = () => {
  const docs = new Map(); /* ruta → { data, version } */
  let reloj = 0;
  const registro = { lecturas: 0, consultas: [], commits: [], directas: [], transacciones: 0, reintentos: 0 };
  const ganchos = { antesDeConfirmar: null, entreLecturaYConfirmacion: null };
  const copia = (x) => JSON.parse(JSON.stringify(x));
  const pausa = () => new Promise((r) => setImmediate(r));
  const snap = (ruta) => {
    const e = docs.get(ruta);
    return { exists: !!e, id: ruta.split('/').pop(), ref: docRef(ruta), __ruta: ruta, __version: e ? e.version : 0, data: () => (e ? copia(e.data) : undefined) };
  };
  const escribirYa = (tipo, ruta, data) => {
    if (tipo === 'delete') docs.delete(ruta);
    else docs.set(ruta, { data: copia(data), version: ++reloj });
  };
  const docRef = (ruta) => ({
    __tipo: 'doc', path: ruta, id: ruta.split('/').pop(),
    collection: (sub) => colRef(`${ruta}/${sub}`),
    async get() { await pausa(); registro.lecturas++; return snap(ruta); },
    async create(d) { await pausa(); if (docs.has(ruta)) throw new Error(`ALREADY_EXISTS ${ruta}`); registro.directas.push(`create ${ruta}`); escribirYa('create', ruta, d); },
    async set(d) { await pausa(); registro.directas.push(`set ${ruta}`); escribirYa('set', ruta, d); },
    async delete() { await pausa(); registro.directas.push(`delete ${ruta}`); escribirYa('delete', ruta); },
  });
  const hijos = (ruta) => [...docs.keys()].filter((k) => k.startsWith(`${ruta}/`) && !k.slice(ruta.length + 1).includes('/'));
  const comparar = (q) => {
    const orden = q.orden;
    const dirId = orden.length ? orden[orden.length - 1].dir : 'asc';
    return (a, b) => {
      for (const o of orden) {
        const va = a.data[o.campo]; const vb = b.data[o.campo];
        if (va !== vb) return (va < vb ? -1 : 1) * (o.dir === 'desc' ? -1 : 1);
      }
      return (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) * (dirId === 'desc' ? -1 : 1);
    };
  };
  const ejecutar = (ruta, q, apuntar = true) => {
    if (apuntar) registro.consultas.push({ ruta, filtros: q.filtros.map((f) => `${f.campo}${f.op}${JSON.stringify(f.valor)}`), orden: q.orden.map((o) => `${o.campo} ${o.dir}`), tope: q.tope, cursor: !!q.tras });
    let filas = hijos(ruta).map((k) => ({ ruta: k, id: k.split('/').pop(), data: docs.get(k).data, version: docs.get(k).version }));
    for (const f of q.filtros) {
      if (f.op !== '==') throw new Error(`operador no soportado: ${f.op}`);
      filas = filas.filter((x) => x.data[f.campo] === f.valor);
    }
    const cmp = comparar(q);
    filas.sort(cmp);
    if (q.tras) {
      const c = { id: q.tras.id, data: q.tras.data() ?? {} };
      filas = filas.filter((x) => cmp(x, c) > 0);
    }
    if (q.tope !== null) filas = filas.slice(0, q.tope);
    if (apuntar) registro.lecturas += Math.max(1, filas.length);
    const docsSnap = filas.map((x) => ({ id: x.id, exists: true, ref: docRef(x.ruta), __ruta: x.ruta, __version: x.version, data: () => copia(x.data) }));
    return { docs: docsSnap, empty: docsSnap.length === 0, size: docsSnap.length };
  };
  const colRef = (ruta, q = { filtros: [], orden: [], tope: null, tras: null }) => ({
    __tipo: 'query', path: ruta, __q: q,
    doc: (id) => docRef(`${ruta}/${id}`),
    where: (campo, op, valor) => colRef(ruta, { ...q, filtros: [...q.filtros, { campo, op, valor }] }),
    orderBy: (campo, dir = 'asc') => colRef(ruta, { ...q, orden: [...q.orden, { campo: String(campo), dir }] }),
    limit: (k) => colRef(ruta, { ...q, tope: k }),
    startAfter: (s) => colRef(ruta, { ...q, tras: s }),
    async get() { await pausa(); return ejecutar(ruta, q); },
  });
  const firma = (r) => r.docs.map((d) => `${d.__ruta}@${d.__version}`).join('|');
  const db = {
    registro, ganchos, docs,
    collection: (c) => colRef(c),
    collectionGroup: () => { throw new Error('collectionGroup no se usa aquí'); },
    batch: () => { throw new Error('batch no se usa aquí'); },
    async runTransaction(fn) {
      registro.transacciones++;
      for (let intento = 0; intento < 5; intento++) {
        const leidos = new Map();
        const consultas = [];
        const escrituras = [];
        let escribio = false;
        const tx = {
          async get(x) {
            if (escribio) throw new Error('Firestore transactions require all reads to be executed before all writes.');
            await pausa();
            if (x.__tipo === 'doc') { registro.lecturas++; const s = snap(x.path); leidos.set(x.path, s.__version); return s; }
            const r = ejecutar(x.path, x.__q);
            consultas.push({ x, f: firma(r) });
            return r;
          },
          create(ref, d) { escribio = true; escrituras.push({ tipo: 'create', ruta: ref.path, data: copia(d) }); },
          set(ref, d) { escribio = true; escrituras.push({ tipo: 'set', ruta: ref.path, data: copia(d) }); },
          update(ref, d) { escribio = true; escrituras.push({ tipo: 'update', ruta: ref.path, data: copia(d) }); },
          delete(ref) { escribio = true; escrituras.push({ tipo: 'delete', ruta: ref.path }); },
        };
        const resultado = await fn(tx);
        if (ganchos.entreLecturaYConfirmacion) { const g = ganchos.entreLecturaYConfirmacion; ganchos.entreLecturaYConfirmacion = null; await g(); }
        await pausa();
        const cambiado = [...leidos].some(([r, v]) => (docs.get(r)?.version ?? 0) !== v)
          || consultas.some(({ x, f }) => firma(ejecutar(x.path, x.__q, false)) !== f);
        if (cambiado) { registro.reintentos++; continue; }
        if (escrituras.length > 500) throw new Error('INVALID_ARGUMENT: más de 500 escrituras');
        for (const e of escrituras) if (e.tipo === 'create' && docs.has(e.ruta)) throw new Error(`ALREADY_EXISTS ${e.ruta}`);
        if (ganchos.antesDeConfirmar) ganchos.antesDeConfirmar(escrituras);
        for (const e of escrituras) {
          if (e.tipo === 'update') escribirYa('set', e.ruta, { ...docs.get(e.ruta).data, ...e.data });
          else escribirYa(e.tipo, e.ruta, e.data);
        }
        registro.commits.push(escrituras.map((e) => `${e.tipo} ${e.ruta}`));
        return resultado;
      }
      throw new Error('ABORTED: demasiados reintentos');
    },
  };
  return db;
};

/* Las fichas de material de la cuenta, como las da el Content Core. */
const FICHAS = {
  [ASSET_IMG]: { assetId: ASSET_IMG, ownerAccountId: A, kind: 'image', status: 'ready' },
  [ASSET_AUDIO]: { assetId: ASSET_AUDIO, ownerAccountId: A, kind: 'audio', status: 'ready' },
  [ASSET_FRAME]: { assetId: ASSET_FRAME, ownerAccountId: A, kind: 'image', status: 'ready' },
  [ASSET_AJENO]: { assetId: ASSET_AJENO, ownerAccountId: B, kind: 'image', status: 'ready' },
  [ASSET_CRUDO]: { assetId: ASSET_CRUDO, ownerAccountId: A, kind: 'image', status: 'processing' },
};
const mundo = () => {
  const db = fakeDb();
  const leidos = [];
  const material = async (assetId) => { leidos.push(assetId); return FICHAS[assetId] ?? null; };
  return { db, leidos, deps: { db, material } };
};

/** UNA PRODUCCIÓN DE REFERENCIA, lista para producir: 15 s, dos escenas, tres planos y un prompt avanzado. */
const rica = () => clon({
  ...M.produccionVacia({ title: 'Anuncio de zapatilla', aspectRatio: '9:16', resolution: '1080p' }),
  ...M.configuracionDePreset('tiktok'),
  intent: { objective: 'Vender la zapatilla nueva', productionType: 'ad', requestedDurationSec: 15 },
  creativeDirection: { visualStyle: 'cinematográfico', pacing: 'fast', cinematography: { version: 1, lighting: { type: 'night' } } },
  characters: [
    { id: 'char-luna', name: 'Luna', appearance: { wardrobe: { description: 'chaqueta amarilla' } }, referenceIds: ['ref-luna'], voice: { description: 'cálida', referenceId: 'ref-voz' } },
    { id: 'char-sol', name: 'Sol' },
  ],
  locations: [{ id: 'loc-city', name: 'Ciudad', setting: 'exterior' }],
  objects: [{ id: 'obj-shoe', name: 'Zapatilla', kind: 'product' }],
  references: [
    { id: 'ref-luna', kind: 'image', role: 'character', assetId: ASSET_IMG },
    { id: 'ref-voz', kind: 'audio', role: 'audio', assetId: ASSET_AUDIO },
    { id: 'ref-frame', kind: 'image', role: 'first_frame', assetId: ASSET_FRAME },
  ],
  metadata: { revision: 0, locale: 'es' },
  scenes: [
    {
      id: 'sc-0001', order: 0, title: 'Salida', locationId: 'loc-city', timeOfDay: 'night', characterIds: ['char-luna'],
      shots: [
        { id: 'sh-0101', order: 0, durationSec: 5, description: 'Luna se ata la zapatilla', objectIds: ['obj-shoe'], advanced: { prompt: PROMPT } },
        { id: 'sh-0102', order: 1, durationSec: 5, description: 'Luna sale corriendo', dependsOn: ['sh-0101'] },
      ],
    },
    {
      id: 'sc-0002', order: 1, title: 'Llegada', locationId: 'loc-city', timeOfDay: 'night', characterIds: ['char-luna'],
      shots: [{ id: 'sh-0201', order: 0, durationSec: 5, description: 'Luna cruza la meta' }],
    },
  ],
});

/* Utilidades sobre la base de mentira. */
const rutaRaiz = (id) => `productions/${id}`;
const rutaEscena = (id, s) => `productions/${id}/productionScenes/${s}`;
const rutaRev = (id, r) => `productions/${id}/productionRevisions/${String(r).padStart(10, '0')}`;
const dato = (db, ruta) => (db.docs.get(ruta) ? clon(db.docs.get(ruta).data) : undefined);
const foto = (db) => M.canonico([...db.docs.entries()].map(([k, v]) => [k, v.data]).sort((a, b) => (a[0] < b[0] ? -1 : 1)));
const rutasBajo = (db, pre) => [...db.docs.keys()].filter((k) => k.startsWith(pre)).sort();
const escrituras = (db) => db.registro.commits.flat();
const codigoDe = (r) => (r && r.ok === false ? r.code : r && r.ok === true ? 'ok' : 'nada');
const clavesDe = (v, salida = [], ruta = '') => {
  if (Array.isArray(v)) v.forEach((x) => clavesDe(x, salida, ruta));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { salida.push(ruta ? `${ruta}.${k}` : k); clavesDe(x, salida, ruta ? `${ruta}.${k}` : k); }
  return salida;
};
const crear = (m, extra = {}) => P.crearProduccion({ accountId: A, productionId: pid(1), production: rica(), at: HOY, ...extra }, m.deps);
const aplicar = (m, ops, extra = {}) => P.aplicarOperacionesGuardadas({ accountId: A, productionId: pid(1), expectedRevision: 0, operations: ops, at: HOY + 1000, ...extra }, m.deps);
const lanza = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };

/* ═══ A · CREATE ════════════════════════════════════════════════════════════ */
console.log('\n── A · Crear ──');
await seccion('A', async () => {
  const m = mundo();
  const r = await P.crearProduccion({ accountId: A, productionId: pid(1), title: 'Mi primera', aspectRatio: '16:9', at: HOY }, m.deps);
  check('A1) una producción vacía nace en la revisión 0, activa, con su id y sus horas',
    r.ok && r.created === true && r.view.revision === 0 && r.view.status === 'active' && r.view.createdAt === HOY && r.view.updatedAt === HOY
    && r.view.production.id === pid(1) && r.view.production.title === 'Mi primera' && V.integridad(r.view.production).length === 0);
  const raiz = dato(m.db, rutaRaiz(pid(1)));
  check('A2) la raíz es la producción SIN escenas más su sobre, y la cuenta es la de la sesión',
    raiz && raiz.ownerAccountId === A && raiz.status === 'active' && raiz.createdAt === HOY && raiz.updatedAt === HOY
    && !('scenes' in raiz) && raiz.id === pid(1) && raiz.version === 1 && raiz.metadata.revision === 0 && !('archivedAt' in raiz));
  const cero = dato(m.db, rutaRev(pid(1), 0));
  check('A3) y el registro empieza con la revisión 0: la foto entera, quién, cuándo y su huella',
    cero && cero.revision === 0 && cero.kind === 'create' && cero.productionId === pid(1) && cero.ownerAccountId === A && cero.actorAccountId === A
    && cero.createdAt === HOY && cero.modelVersion === 1 && iguales(cero.snapshot, r.view.production) && cero.result.hash === P.huella(r.view.production)
    && typeof cero.operationId === 'string' && cero.operationId.length >= 8);
  const pre = await P.crearProduccion({ accountId: A, productionId: pid(2), title: 'Vertical', preset: 'tiktok', at: HOY }, m.deps);
  check('A4) desde un preset: su formato y su duración, y nada más',
    pre.ok && pre.view.production.format.preset === 'tiktok' && pre.view.production.format.aspectRatio === '9:16' && pre.view.production.duration.targetSec === 15);
  const m2 = mundo();
  const antes = m2.db.registro.commits.length;
  const r2 = await crear(m2);
  const deEscenas = rutasBajo(m2.db, `productions/${pid(1)}/productionScenes/`);
  check('A5) una producción entera: una escena por documento, con su cuenta y su producción',
    r2.ok && deEscenas.length === 2 && deEscenas.every((k) => { const d = dato(m2.db, k); return d.ownerAccountId === A && d.productionId === pid(1); })
    && dato(m2.db, rutaEscena(pid(1), 'sc-0001')).shots.length === 2);
  const commit = m2.db.registro.commits[antes];
  check('A6) en UNA transacción: raíz, dos escenas y la revisión 0, todas con `create`',
    m2.db.registro.commits.length === antes + 1 && commit.length === 4 && commit.every((w) => w.startsWith('create ')));
  const conRev = rica(); conRev.metadata.revision = 3;
  const r3 = await P.crearProduccion({ accountId: A, productionId: pid(3), production: conRev, at: HOY }, m.deps);
  const conId = { ...rica(), id: pid(9) };
  const r4 = await P.crearProduccion({ accountId: A, productionId: pid(4), production: conId, at: HOY }, m.deps);
  const r5 = await P.crearProduccion({ accountId: A, productionId: pid(5), production: rica(), title: 'x', at: HOY }, m.deps);
  check('A7) la revisión y el id son de quien guarda: una revisión ≠ 0, otro id o producción y campos sueltos a la vez se rechazan',
    codigoDe(r3) === 'production_invalid' && r3.problems.some((x) => x.path === 'metadata.revision' && x.parameters.reason === 'revision_must_be_zero')
    && codigoDe(r4) === 'production_invalid' && r4.problems.some((x) => x.path === 'id' && x.parameters.reason === 'id_mismatch')
    && codigoDe(r5) === 'production_invalid' && r5.problems.some((x) => x.parameters.reason === 'production_and_fields'));
  const rota = rica(); rota.scenes[1].id = 'sc-0001';
  const r6 = await P.crearProduccion({ accountId: A, productionId: pid(6), production: rota, at: HOY }, m.deps);
  check('A8) lo que el dominio rechaza no se guarda, y se dice con SUS códigos y sus claves',
    codigoDe(r6) === 'production_invalid' && r6.problems.some((x) => x.code === 'id_duplicated' && x.messageKey === 'filmmaker.validation.id_duplicated')
    && rutasBajo(m.db, rutaRaiz(pid(6))).length === 0);
  const malos = ['abc', 'prod/000000000000000000001', `__${'x'.repeat(20)}__`, 'x'.repeat(129), 42, undefined];
  const rs = await Promise.all(malos.map((id) => P.crearProduccion({ accountId: A, productionId: id, title: 'T', aspectRatio: '1:1', at: HOY }, m.deps)));
  check('A9) un id que no tiene la forma —corto, con barra, reservado, largo, no texto— es `production_id_invalid`, y no se escribe nada',
    rs.every((x) => codigoDe(x) === 'production_id_invalid') && ![...m.db.docs.keys()].some((k) => /abc|__x/.test(k)));
  const r7 = await P.crearProduccion({ accountId: A, productionId: pid(7), title: 'T', preset: 'myspace', at: HOY }, m.deps);
  check('A10) un preset que no existe no se inventa', codigoDe(r7) === 'production_invalid' && r7.problems.some((x) => x.path === 'format.preset'));
  const r8 = await P.crearProduccion({ accountId: A, productionId: pid(8), aspectRatio: '1:1', at: HOY }, m.deps);
  check('A11) sin título no hay producción: lo dice el dominio', codigoDe(r8) === 'production_invalid' && r8.problems.some((x) => x.path === 'title'));
});

/* ═══ B · IDEMPOTENCIA ═════════════════════════════════════════════════════ */
console.log('\n── B · Idempotencia ──');
await seccion('B', async () => {
  const m = mundo();
  const r1 = await crear(m);
  const escritas = escrituras(m.db).length;
  const r2 = await crear(m);
  check('B1) crear dos veces lo mismo devuelve la que hay, sin escribir nada',
    r1.ok && r2.ok && r2.created === false && iguales(r2.view.production, r1.view.production) && escrituras(m.db).length === escritas);
  const fotoAntes = foto(m.db);
  const otra = rica(); otra.title = 'Otra cosa';
  const r3 = await crear(m, { production: otra });
  check('B2) el mismo id con otra cosa dentro es `production_id_taken`, y lo que había no se toca', codigoDe(r3) === 'production_id_taken' && foto(m.db) === fotoAntes);
  const r4 = await P.crearProduccion({ accountId: B, productionId: pid(1), title: 'De B', aspectRatio: '1:1', at: HOY }, m.deps);
  check('B3) y desde otra cuenta, igual: ni se pisa ni se lee', codigoDe(r4) === 'production_id_taken' && foto(m.db) === fotoAntes
    && r4.problems.length === 1 && Object.keys(r4.problems[0].parameters).length === 0);
  const lote = [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }];
  const a1 = await aplicar(m, lote, { operationId: 'lote-0001' });
  const a2 = await aplicar(m, lote, { operationId: 'lote-0001' });
  const entradas = rutasBajo(m.db, `productions/${pid(1)}/productionRevisions/`);
  check('B4) un reintento del mismo lote con su id no lo aplica dos veces: `alreadyApplied`, y la revisión sigue en 1',
    a1.ok && a1.view.revision === 1 && a2.ok && a2.alreadyApplied === true && a2.view.revision === 1 && entradas.length === 2);
  const lote2 = [{ op: 'change_weather', sceneId: 'sc-0002', weather: 'fog' }];
  const b1 = await aplicar(m, lote2, { expectedRevision: 1 });
  const b2 = await aplicar(m, lote2, { expectedRevision: 1 });
  check('B5) sin id, el lote tiene uno derivado de la petición: el mismo reintento se reconoce',
    b1.ok && b1.view.revision === 2 && b2.ok && b2.alreadyApplied === true && b2.operationId === b1.operationId && /^op_[a-f0-9]{40}$/.test(b1.operationId));
  const fotoB = foto(m.db);
  const b3 = await aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0002', weather: 'snow' }], { expectedRevision: 2, operationId: 'lote-0001' });
  check('B6) un id de lote ya gastado con OTRO lote es `operation_id_reused`, y no se escribe nada', codigoDe(b3) === 'operation_id_reused' && foto(m.db) === fotoB);
  const d1 = await P.duplicarProduccion({ accountId: A, productionId: pid(1), newProductionId: pid(2), at: HOY + 5 }, m.deps);
  const escritasD = escrituras(m.db).length;
  const d2 = await P.duplicarProduccion({ accountId: A, productionId: pid(1), newProductionId: pid(2), at: HOY + 6 }, m.deps);
  check('B7) duplicar dos veces con el mismo id devuelve la copia que hay', d1.ok && d1.created && d2.ok && d2.created === false
    && iguales(d2.view.production, d1.view.production) && escrituras(m.db).length === escritasD);
});

/* ═══ C · GET ══════════════════════════════════════════════════════════════ */
console.log('\n── C · Leer ──');
await seccion('C', async () => {
  const m = mundo();
  const original = rica();
  await crear(m, { production: original });
  const lecturasAntes = m.db.registro.lecturas;
  const consultasAntes = m.db.registro.consultas.length;
  const g = await P.leerProduccion(A, pid(1), m.deps);
  check('C1) se lee la producción entera, igual que se guardó, con su prompt avanzado',
    g.ok && iguales(g.view.production, { ...original, id: pid(1) }) && g.view.production.scenes[0].shots[0].advanced.prompt === PROMPT);
  const nuevas = m.db.registro.consultas.slice(consultasAntes);
  check('C2) y cuesta la raíz más UNA consulta acotada de sus escenas, y nada más',
    nuevas.length === 1 && nuevas[0].ruta === `productions/${pid(1)}/productionScenes` && nuevas[0].tope === 201 && nuevas[0].filtros.length === 0
    && m.db.registro.lecturas - lecturasAntes === 3);
  const q1 = Rq.requisitosDeProduccion({ ...original, id: pid(1) });
  const q2 = Rq.requisitosDeProduccion(g.view.production);
  check('C3) lo que se lee es la MISMA producción: sus requisitos son idénticos', q1.ok && q2.ok && iguales(q1, q2));
  const desordenada = rica();
  desordenada.scenes = [{ ...desordenada.scenes[0], id: 'zz-escena' }, { ...desordenada.scenes[1], id: 'aa-escena' }];
  await P.crearProduccion({ accountId: A, productionId: pid(2), production: desordenada, at: HOY }, m.deps);
  const g2 = await P.leerProduccion(A, pid(2), m.deps);
  check('C4) las escenas salen por su `order`, no por el orden de sus documentos', g2.ok && g2.view.production.scenes.map((s) => s.id).join() === 'zz-escena,aa-escena');

  /* Lo guardado ROTO no se devuelve como si nada: cada caso, en una base limpia con dos producciones de la misma cuenta. */
  const roto = async (estropear) => {
    const mr = mundo();
    await crear(mr);
    await P.crearProduccion({ accountId: A, productionId: pid(2), production: rica(), at: HOY }, mr.deps);
    estropear(mr.db);
    return { mr, g: await P.leerProduccion(A, pid(1), mr.deps) };
  };
  const motivo = (r) => (r.ok ? 'ok' : `${r.code}:${r.problems.map((x) => x.parameters.reason ?? x.code).join('+')}`);
  const ajena = await roto((db) => db.docs.set(rutaEscena(pid(1), 'sc-0009'), { data: { ...clon(db.docs.get(rutaEscena(pid(2), 'sc-0002')).data), id: 'sc-0009', order: 2 }, version: 1e6 }));
  check('C5) una escena de OTRA producción metida en esta no se cuela: `production_corrupted`', motivo(ajena.g) === 'production_corrupted:scene_production_mismatch');
  const deOtra = await roto((db) => { const d = db.docs.get(rutaEscena(pid(1), 'sc-0002')); d.data.ownerAccountId = B; });
  check('C6) ni una escena con otra cuenta', motivo(deOtra.g) === 'production_corrupted:scene_owner_mismatch');
  const otroId = await roto((db) => { const d = db.docs.get(rutaEscena(pid(1), 'sc-0002')); d.data.id = 'sc-0007'; });
  check('C7) ni una escena cuyo id no es el de su documento', motivo(otroId.g) === 'production_corrupted:scene_id_mismatch');
  const conArchivo = await roto((db) => { db.docs.get(rutaRaiz(pid(1))).data.archivedAt = HOY; });
  const conEscenas = await roto((db) => { db.docs.get(rutaRaiz(pid(1))).data.scenes = []; });
  const conCampo = await roto((db) => { db.docs.get(rutaRaiz(pid(1))).data.sceneIds = ['sc-0001']; });
  check('C8) ni una raíz incoherente: archivada sin estarlo, con escenas dentro o con un campo que el dominio no conoce',
    motivo(conArchivo.g) === 'production_corrupted:archive_mismatch' && motivo(conEscenas.g) === 'production_corrupted:scenes_in_root'
    && !conCampo.g.ok && conCampo.g.code === 'production_corrupted' && conCampo.g.problems.some((x) => x.code === 'field_unknown' && x.path === 'sceneIds'));
  const hueco = await roto((db) => db.docs.delete(rutaEscena(pid(1), 'sc-0001')));
  check('C9) ni una producción a la que le falta una escena de en medio', !hueco.g.ok && hueco.g.code === 'production_corrupted' && hueco.g.problems.some((x) => x.code === 'order_mismatch'));
  const fotoRota = foto(ajena.mr.db);
  const sobreRota = await P.aplicarOperacionesGuardadas({ accountId: A, productionId: pid(1), expectedRevision: 0, operations: [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }], at: HOY }, ajena.mr.deps);
  check('C10) y a una producción rota no se le aplica nada', codigoDe(sobreRota) === 'production_corrupted' && foto(ajena.mr.db) === fotoRota);
  const aislada = mundo();
  await crear(aislada);
  await P.crearProduccion({ accountId: A, productionId: pid(2), production: rica(), at: HOY }, aislada.deps);
  const deLaOtra = M.canonico(rutasBajo(aislada.db, `productions/${pid(2)}`).map((k) => [k, dato(aislada.db, k)]));
  const cambio = await aplicar(aislada, [{ op: 'remove_scene', sceneId: 'sc-0002' }, { op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }]);
  check('C11) dos producciones con los mismos ids de escena no se tocan: cambiar una deja la otra byte a byte',
    cambio.ok && M.canonico(rutasBajo(aislada.db, `productions/${pid(2)}`).map((k) => [k, dato(aislada.db, k)])) === deLaOtra
    && dato(aislada.db, rutaEscena(pid(2), 'sc-0002')) !== undefined);
});

/* ═══ D · LIST ═════════════════════════════════════════════════════════════ */
console.log('\n── D · Listar ──');
await seccion('D', async () => {
  const m = mundo();
  for (let k = 1; k <= 5; k++) await P.crearProduccion({ accountId: A, productionId: pid(k), title: `P${k}`, aspectRatio: '1:1', at: HOY + k }, m.deps);
  await P.crearProduccion({ accountId: B, productionId: pid(90), title: 'De B', aspectRatio: '1:1', at: HOY + 50 }, m.deps);
  const l = await P.listarProducciones({ accountId: A }, m.deps);
  check('D1) las activas de la cuenta, las más recientes primero', l.ok && l.productions.map((x) => x.title).join() === 'P5,P4,P3,P2,P1');
  const PERMITIDAS = ['productionId', 'title', 'status', 'aspectRatio', 'resolution', 'preset', 'revision', 'createdAt', 'updatedAt', 'archivedAt'];
  check('D2) y solo resúmenes: ni escenas, ni planos, ni prompts', l.ok && l.productions.every((x) => Object.keys(x).every((k) => PERMITIDAS.includes(k))));
  const consulta = m.db.registro.consultas[m.db.registro.consultas.length - 1];
  check('D3) UNA consulta: cuenta, estado, `updatedAt` descendente y con tope (uno más, para saber si hay otra página)',
    consulta.ruta === 'productions' && consulta.filtros.join() === `ownerAccountId=="${A}",status=="active"` && consulta.orden.join() === 'updatedAt desc' && consulta.tope === 21);
  const p1 = await P.listarProducciones({ accountId: A, limit: 2 }, m.deps);
  const p2 = await P.listarProducciones({ accountId: A, limit: 2, after: p1.nextCursor }, m.deps);
  const p3 = await P.listarProducciones({ accountId: A, limit: 2, after: p2.nextCursor }, m.deps);
  const vistos = [p1, p2, p3].flatMap((p) => p.productions.map((x) => x.title));
  check('D4) paginado: 2, 2 y 1, cada una una vez, y la última sin cursor',
    p1.productions.length === 2 && p2.productions.length === 2 && p3.productions.length === 1 && !!p1.nextCursor && !!p2.nextCursor && !p3.nextCursor
    && vistos.join() === 'P5,P4,P3,P2,P1');
  await P.archivarProduccion(A, pid(2), HOY + 100, m.deps);
  const arch = await P.listarProducciones({ accountId: A, status: 'archived' }, m.deps);
  const act = await P.listarProducciones({ accountId: A, status: 'active' }, m.deps);
  check('D5) archivadas y activas se listan aparte', arch.ok && arch.productions.map((x) => x.productionId).join() === pid(2) && act.productions.length === 4);
  const malas = await Promise.all([
    P.listarProducciones({ accountId: A, limit: 51 }, m.deps), P.listarProducciones({ accountId: A, limit: 0 }, m.deps),
    P.listarProducciones({ accountId: A, limit: 2.5 }, m.deps), P.listarProducciones({ accountId: A, status: 'deleted' }, m.deps),
    P.listarProducciones({ accountId: A, after: '../x' }, m.deps), P.listarProducciones({ accountId: A, after: pid(90) }, m.deps),
  ]);
  check('D6) un tope fuera de 1–50, un estado que no existe o un cursor que no es tuyo son `list_query_invalid`', malas.every((x) => codigoDe(x) === 'list_query_invalid'));
  const lb = await P.listarProducciones({ accountId: B }, m.deps);
  check('D7) cada cuenta ve lo suyo', lb.ok && lb.productions.map((x) => x.productionId).join() === pid(90));
});

/* ═══ E · OWNERSHIP ════════════════════════════════════════════════════════ */
console.log('\n── E · De quién es ──');
await seccion('E', async () => {
  const m = mundo();
  const suplantada = { ...rica(), ownerAccountId: B };
  const r = await P.crearProduccion({ accountId: A, productionId: pid(1), production: suplantada, at: HOY }, m.deps);
  check('E1) una cuenta metida en la producción no entra: el dominio no la conoce', codigoDe(r) === 'production_invalid' && r.problems.some((x) => x.path === 'ownerAccountId' && x.code === 'field_unknown'));
  await crear(m);
  const res = await Pu.atenderProducciones(A, { op: 'create', productionId: pid(2), title: 'T', aspectRatio: '1:1', ownerAccountId: B, accountId: B }, { db: m.db, material: m.deps.material, at: HOY });
  check('E2) la puerta ignora la cuenta que mande el cliente: se guarda con la de la sesión', res.created === true && dato(m.db, rutaRaiz(pid(2))).ownerAccountId === A);
  const fotoAntes = foto(m.db);
  const ajenos = await Promise.all([
    P.leerProduccion(B, pid(1), m.deps),
    P.aplicarOperacionesGuardadas({ accountId: B, productionId: pid(1), expectedRevision: 0, operations: [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }], at: HOY }, m.deps),
    P.archivarProduccion(B, pid(1), HOY, m.deps),
    P.desarchivarProduccion(B, pid(1), HOY, m.deps),
    P.duplicarProduccion({ accountId: B, productionId: pid(1), newProductionId: pid(3), at: HOY }, m.deps),
    P.leerRegistro(B, pid(1), m.deps),
  ]);
  check('E3) otra cuenta no lee, no cambia, no archiva, no duplica y no ve el registro: `production_not_found`, sin escribir nada',
    ajenos.every((x) => codigoDe(x) === 'production_not_found') && foto(m.db) === fotoAntes);
  const consultas = m.db.registro.consultas.length;
  await P.leerProduccion(B, pid(1), m.deps);
  await P.aplicarOperacionesGuardadas({ accountId: B, productionId: pid(1), expectedRevision: 0, operations: [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }], at: HOY }, m.deps);
  await P.duplicarProduccion({ accountId: B, productionId: pid(1), newProductionId: pid(3), at: HOY }, m.deps);
  await P.leerRegistro(B, pid(1), m.deps);
  check('E6) y lo ajeno se descarta por su raíz: ni una consulta a sus escenas ni a su registro', m.db.registro.consultas.length === consultas,
    m.db.registro.consultas.slice(consultas).map((q) => q.ruta).join(', '));
  const deEscenas = rutasBajo(m.db, `productions/${pid(1)}/productionScenes/`).map((k) => dato(m.db, k));
  const deRegistro = rutasBajo(m.db, `productions/${pid(1)}/productionRevisions/`).map((k) => dato(m.db, k));
  check('E4) cada escena y cada revisión llevan la cuenta, para que las reglas no tengan que leer la raíz',
    deEscenas.every((d) => d.ownerAccountId === A) && deRegistro.every((d) => d.ownerAccountId === A && d.actorAccountId === A));
  const src = sinComentarios(leer('functions/src/productions/puerta.ts'));
  check('E5) la puerta resuelve la cuenta de la sesión y NUNCA lee una cuenta de los datos',
    /cuentaDelPrincipalEnWee\(db, request\.auth\.uid\)/.test(src) && !/data\.(ownerAccountId|accountId|actorAccountId|uid)/.test(src));
});

/* ═══ F · NOT-FOUND ════════════════════════════════════════════════════════ */
console.log('\n── F · Lo que no existe ──');
await seccion('F', async () => {
  const m = mundo();
  await crear(m);
  const noExiste = await P.leerProduccion(A, pid(77), m.deps);
  const ajena = await P.leerProduccion(B, pid(1), m.deps);
  check('F1) lo que no existe y lo ajeno contestan EXACTAMENTE igual', codigoDe(noExiste) === 'production_not_found' && iguales(noExiste, ajena));
  const otros = await Promise.all([
    aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }], { productionId: pid(77) }),
    P.archivarProduccion(A, pid(77), HOY, m.deps),
    P.duplicarProduccion({ accountId: A, productionId: pid(77), newProductionId: pid(78), at: HOY }, m.deps),
  ]);
  check('F2) cambiar, archivar o duplicar lo que no existe, igual', otros.every((x) => iguales(x, noExiste)));
  const formas = await Promise.all(['x', '../../users/a', 5, null].map((id) => P.leerProduccion(A, id, m.deps)));
  check('F3) un id sin forma tampoco existe: la misma respuesta', formas.every((x) => iguales(x, noExiste)));
});

/* ═══ G · APPLY ════════════════════════════════════════════════════════════ */
console.log('\n── G · Aplicar un lote ──');
await seccion('G', async () => {
  const m = mundo();
  const c = await crear(m);
  const lote = [
    { op: 'add_shot', sceneId: 'sc-0002', shot: { id: 'sh-0202', durationSec: 3, description: 'Luna levanta los brazos' } },
    { op: 'change_movement', target: { scope: 'scene', sceneId: 'sc-0002' }, movement: 'dolly_in', speed: 'slow' },
    { op: 'edit_text', target: { sceneId: 'sc-0002' }, title: 'La meta' },
  ];
  const antes = escrituras(m.db).length;
  const r = await aplicar(m, lote);
  check('G1) tres operaciones, UNA revisión: el lote sube uno', r.ok && r.applied === 3 && r.view.revision === 1 && r.view.production.metadata.revision === 1);
  const enMemoria = O.aplicarOperaciones(c.view.production, lote);
  check('G2) en memoria el dominio cuenta operaciones (0 → 3); guardada, la revisión cuenta lotes (0 → 1)',
    enMemoria.ok && enMemoria.production.metadata.revision === 3 && iguales({ ...enMemoria.production, metadata: { ...enMemoria.production.metadata, revision: 1 } }, r.view.production));
  check('G3) y dice lo pendiente y si cambió el montaje, que es lo que dice el dominio',
    iguales(r.pending, O.pendientesEntre(c.view.production, r.view.production).pending) && r.pending.shots.includes('sh-0202') && r.timelineChanged === true);
  const nuevas = escrituras(m.db).slice(antes);
  check('G4) solo se escribe lo que cambió: la raíz, la escena 2 y la entrada del registro',
    nuevas.length === 3 && nuevas.includes(`set ${rutaRaiz(pid(1))}`) && nuevas.includes(`set ${rutaEscena(pid(1), 'sc-0002')}`)
    && nuevas.includes(`create ${rutaRev(pid(1), 1)}`) && !nuevas.some((w) => w.includes('sc-0001')));
  const g = await P.leerProduccion(A, pid(1), m.deps);
  check('G5) lo que devuelve es lo que queda guardado, con la hora del lote y la de creación de siempre',
    g.ok && iguales(g.view.production, r.view.production) && g.view.updatedAt === HOY + 1000 && g.view.createdAt === HOY && dato(m.db, rutaRaiz(pid(1))).createdAt === HOY);
  const quitar = await aplicar(m, [{ op: 'remove_scene', sceneId: 'sc-0001' }], { expectedRevision: 1 });
  check('G6) quitar una escena borra su documento', quitar.ok && !m.db.docs.has(rutaEscena(pid(1), 'sc-0001')) && escrituras(m.db).includes(`delete ${rutaEscena(pid(1), 'sc-0001')}`)
    && dato(m.db, rutaEscena(pid(1), 'sc-0002')).order === 0);
  const m2 = mundo();
  await crear(m2);
  const antes2 = escrituras(m2.db).length;
  const re = await aplicar(m2, [{ op: 'reorder_scene', sceneId: 'sc-0002', toOrder: 0 }]);
  const nuevas2 = escrituras(m2.db).slice(antes2);
  check('G7) reordenar reescribe las escenas que cambian de sitio, sin borrar ninguna',
    re.ok && nuevas2.filter((w) => w.includes('productionScenes')).length === 2 && !nuevas2.some((w) => w.startsWith('delete'))
    && re.view.production.scenes.map((s) => s.id).join() === 'sc-0002,sc-0001');
  /* Una producción grande: 200 escenas con 5 planos y un lote de 50 operaciones. Se mide, para la puerta. */
  const grande = M.produccionVacia({ title: 'Serie', aspectRatio: '16:9' });
  grande.scenes = Array.from({ length: 200 }, (_, i) => ({
    id: `sc-${String(i).padStart(4, '0')}`, order: i,
    shots: Array.from({ length: 5 }, (__, j) => ({ id: `sh-${String(i).padStart(4, '0')}-${j}`, order: j, durationSec: 2, description: `Plano ${j} de la escena ${i}` })),
  }));
  const mg = mundo();
  const cg = await P.crearProduccion({ accountId: A, productionId: pid(1), production: grande, at: HOY }, mg.deps);
  const lote50 = Array.from({ length: 50 }, (_, i) => ({ op: 'change_weather', sceneId: `sc-${String(i * 4).padStart(4, '0')}`, weather: i % 2 ? 'rain' : 'fog' }));
  const t0 = Date.now();
  const rg = await aplicar(mg, lote50);
  const ms = Date.now() - t0;
  const ultimo = mg.db.registro.commits[mg.db.registro.commits.length - 1];
  check('G8) una producción de 200 escenas y 1000 planos se guarda, y un lote de 50 operaciones sobre ella escribe 52 documentos',
    cg.ok && rg.ok && rg.applied === 50 && ultimo.length === 52, `${ms} ms para el lote`);
});

/* ═══ H · CAS ══════════════════════════════════════════════════════════════ */
console.log('\n── H · La revisión esperada (CAS) ──');
await seccion('H', async () => {
  const m = mundo();
  await crear(m);
  await aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }]);
  const fotoAntes = foto(m.db);
  const viejo = await aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0002', weather: 'fog' }], { expectedRevision: 0 });
  check('H1) un lote escrito sobre una revisión vieja no se aplica: `revision_conflict`, con la revisión que hay, y nada escrito',
    codigoDe(viejo) === 'revision_conflict' && viejo.currentRevision === 1 && viejo.problems[0].parameters.expected === 0 && foto(m.db) === fotoAntes);
  const [x, y] = await Promise.all([
    aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0002', weather: 'fog' }], { expectedRevision: 1 }),
    aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0002', weather: 'snow' }], { expectedRevision: 1 }),
  ]);
  const gana = [x, y].filter((r) => r.ok);
  const pierde = [x, y].filter((r) => !r.ok);
  const g = await P.leerProduccion(A, pid(1), m.deps);
  check('H2) dos lotes A LA VEZ sobre la misma revisión: uno entra y el otro choca; la revisión sube una sola vez',
    gana.length === 1 && pierde.length === 1 && pierde[0].code === 'revision_conflict' && g.view.revision === 2
    && rutasBajo(m.db, `productions/${pid(1)}/productionRevisions/`).length === 3 && m.db.registro.reintentos >= 1);
  const invalidas = await Promise.all([undefined, -1, 1.5, '2', null].map((e) => aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0002', weather: 'rain' }], { expectedRevision: e })));
  check('H3) sin revisión esperada, o una que no es un entero ≥ 0, no hay lote: `revision_invalid`', invalidas.every((r) => codigoDe(r) === 'revision_invalid'));
  const m2 = mundo();
  await crear(m2);
  m2.db.ganchos.entreLecturaYConfirmacion = async () => {
    await P.aplicarOperacionesGuardadas({ accountId: A, productionId: pid(1), expectedRevision: 0, operations: [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'storm' }], at: HOY + 5 }, m2.deps);
  };
  const tarde = await aplicar(m2, [{ op: 'change_weather', sceneId: 'sc-0002', weather: 'rain' }]);
  const g2 = await P.leerProduccion(A, pid(1), m2.deps);
  check('H4) si alguien escribe entre la lectura y la confirmación, la transacción se repite y el CAS lo ve',
    codigoDe(tarde) === 'revision_conflict' && tarde.currentRevision === 1 && g2.view.production.scenes[1].weather === undefined && g2.view.production.scenes[0].weather === 'storm');
});

/* ═══ I · OPERACIÓN INVÁLIDA ═══════════════════════════════════════════════ */
console.log('\n── I · Un lote que no vale ──');
await seccion('I', async () => {
  const m = mundo();
  await crear(m);
  const fotoAntes = foto(m.db);
  const r = await aplicar(m, [
    { op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' },
    { op: 'edit_text', target: { sceneId: 'sc-0002' }, title: 'Bien' },
    { op: 'change_weather', sceneId: 'sc-9999', weather: 'rain' },
  ]);
  check('I1) si la tercera falla, no se aplica ninguna: `operations_invalid`, con el índice y el código del dominio',
    codigoDe(r) === 'operations_invalid' && r.problems.some((x) => x.parameters.index === 2 && x.messageKey.startsWith('filmmaker.operation.')) && foto(m.db) === fotoAntes);
  const r2 = await aplicar(m, [{ op: 'add_shot', sceneId: 'sc-0001', shot: { id: 'sh-0103', durationSec: 2, dependsOn: ['sh-nadie'] } }]);
  check('I2) una operación que dejaría la producción rota no entra', codigoDe(r2) === 'operations_invalid' && foto(m.db) === fotoAntes);
  const r3 = await aplicar(m, [{ op: 'borrar_todo' }]);
  const r4 = await aplicar(m, 'change_weather');
  const r5 = await aplicar(m, []);
  check('I3) una operación que no existe, algo que no es una lista o un lote vacío no llegan a la base',
    codigoDe(r3) === 'operations_invalid' && codigoDe(r4) === 'operations_invalid' && codigoDe(r5) === 'operations_empty' && foto(m.db) === fotoAntes);
});

/* ═══ J · OPERACIÓN SIN CAMBIOS ════════════════════════════════════════════ */
console.log('\n── J · Un lote que no cambia nada ──');
await seccion('J', async () => {
  const m = mundo();
  await crear(m);
  const fotoAntes = foto(m.db);
  const commits = m.db.registro.commits.length;
  const r = await aplicar(m, [{ op: 'change_time_of_day', sceneId: 'sc-0001', timeOfDay: 'night' }, { op: 'edit_text', target: { sceneId: 'sc-0001' }, title: 'Salida' }]);
  check('J1) no escribe, no sube la revisión, no añade al registro y no toca la hora',
    r.ok && r.applied === 0 && r.view.revision === 0 && r.alreadyApplied === false && foto(m.db) === fotoAntes
    && m.db.registro.commits.length === commits + 1 && m.db.registro.commits[m.db.registro.commits.length - 1].length === 0);
  check('J2) y lo dice: nada pendiente, el montaje igual', r.pending.shots.length === 0 && r.pending.scenes.length === 0 && r.timelineChanged === false);
});

/* ═══ K · ATOMICIDAD ═══════════════════════════════════════════════════════ */
console.log('\n── K · Todo o nada ──');
await seccion('K', async () => {
  const m = mundo();
  await crear(m);
  const fotoAntes = foto(m.db);
  m.db.ganchos.antesDeConfirmar = () => { m.db.ganchos.antesDeConfirmar = null; throw new Error('UNAVAILABLE: se cayó la red al confirmar'); };
  const e = await lanza(() => aplicar(m, [
    { op: 'add_shot', sceneId: 'sc-0002', shot: { id: 'sh-0202', durationSec: 3 } },
    { op: 'remove_scene', sceneId: 'sc-0001', cascade: true },
  ]));
  check('K1) si la confirmación falla, NADA cambió: ni la raíz, ni las escenas, ni el registro', e && /UNAVAILABLE/.test(e.message) && foto(m.db) === fotoAntes);
  const m2 = mundo();
  m2.db.ganchos.antesDeConfirmar = () => { m2.db.ganchos.antesDeConfirmar = null; throw new Error('UNAVAILABLE'); };
  const e2 = await lanza(() => crear(m2));
  check('K2) crear, igual: o está entera o no está', e2 && m2.db.docs.size === 0);
  const m3 = mundo();
  await crear(m3);
  const fotoAntes3 = foto(m3.db);
  m3.db.ganchos.antesDeConfirmar = () => { m3.db.ganchos.antesDeConfirmar = null; throw new Error('UNAVAILABLE'); };
  const e3 = await lanza(() => P.duplicarProduccion({ accountId: A, productionId: pid(1), newProductionId: pid(2), at: HOY }, m3.deps));
  check('K3) duplicar, igual', e3 && foto(m3.db) === fotoAntes3);
  const m4 = mundo();
  await crear(m4);
  await aplicar(m4, [{ op: 'add_shot', sceneId: 'sc-0002', shot: { id: 'sh-0202', durationSec: 3 } }, { op: 'reorder_scene', sceneId: 'sc-0002', toOrder: 0 }]);
  const ultimo = m4.db.registro.commits[m4.db.registro.commits.length - 1];
  check('K4) todo un lote va en UNA confirmación, y este módulo no escribe nunca fuera de una transacción',
    ultimo.length === 4 && m.db.registro.directas.length === 0 && m2.db.registro.directas.length === 0 && m4.db.registro.directas.length === 0);
  const m5 = mundo();
  await crear(m5);
  m5.db.docs.set(rutaRev(pid(1), 1), { data: { plantada: true }, version: 999 });
  const fotoAntes5 = foto(m5.db);
  const e5 = await lanza(() => aplicar(m5, [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }]));
  check('K5) si la entrada del registro ya existiera, el lote entero falla: el registro no se pisa y la raíz no se adelanta',
    e5 && /ALREADY_EXISTS/.test(e5.message) && foto(m5.db) === fotoAntes5);
});

/* ═══ L · ARCHIVE ══════════════════════════════════════════════════════════ */
console.log('\n── L · Archivar ──');
await seccion('L', async () => {
  const m = mundo();
  await crear(m);
  const escenasAntes = M.canonico(rutasBajo(m.db, `productions/${pid(1)}/productionScenes/`).map((k) => dato(m.db, k)));
  const antes = escrituras(m.db).length;
  const r = await P.archivarProduccion(A, pid(1), HOY + 7, m.deps);
  const raiz = dato(m.db, rutaRaiz(pid(1)));
  check('L1) archivar cambia el sobre y nada más: estado, hora de archivo y de cambio; la revisión y las escenas, igual',
    r.ok && r.changed === true && raiz.status === 'archived' && raiz.archivedAt === HOY + 7 && raiz.updatedAt === HOY + 7 && raiz.metadata.revision === 0
    && escrituras(m.db).slice(antes).join() === `set ${rutaRaiz(pid(1))}` && M.canonico(rutasBajo(m.db, `productions/${pid(1)}/productionScenes/`).map((k) => dato(m.db, k))) === escenasAntes
    && rutasBajo(m.db, `productions/${pid(1)}/productionRevisions/`).length === 1);
  const antes2 = escrituras(m.db).length;
  const r2 = await P.archivarProduccion(A, pid(1), HOY + 8, m.deps);
  check('L2) archivar lo archivado es un no-op que se dice', r2.ok && r2.changed === false && escrituras(m.db).length === antes2);
  const fotoAntes = foto(m.db);
  const a = await aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }]);
  check('L3) a una producción archivada no se le aplican operaciones: `production_archived`, y nada escrito', codigoDe(a) === 'production_archived' && foto(m.db) === fotoAntes);
  const g = await P.leerProduccion(A, pid(1), m.deps);
  check('L4) archivada se sigue leyendo, con su estado', g.ok && g.view.status === 'archived' && g.view.archivedAt === HOY + 7);
  const d = await P.duplicarProduccion({ accountId: A, productionId: pid(1), newProductionId: pid(2), at: HOY + 9 }, m.deps);
  check('L5) y se puede duplicar: la copia nace activa y la original sigue archivada',
    d.ok && d.view.status === 'active' && dato(m.db, rutaRaiz(pid(1))).status === 'archived');
});

/* ═══ M · UNARCHIVE ════════════════════════════════════════════════════════ */
console.log('\n── M · Desarchivar ──');
await seccion('M', async () => {
  const m = mundo();
  await crear(m);
  await P.archivarProduccion(A, pid(1), HOY + 7, m.deps);
  const r = await P.desarchivarProduccion(A, pid(1), HOY + 8, m.deps);
  const raiz = dato(m.db, rutaRaiz(pid(1)));
  check('M1) desarchivar la devuelve a activa, sin hora de archivo y sin tocar la revisión',
    r.ok && r.changed === true && raiz.status === 'active' && !('archivedAt' in raiz) && raiz.updatedAt === HOY + 8 && raiz.metadata.revision === 0);
  const r2 = await P.desarchivarProduccion(A, pid(1), HOY + 9, m.deps);
  check('M2) desarchivar lo activo es un no-op', r2.ok && r2.changed === false);
  const a = await aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }]);
  check('M3) y vuelve a admitir operaciones', a.ok && a.view.revision === 1);
});

/* ═══ N · DUPLICATE ════════════════════════════════════════════════════════ */
console.log('\n── N · Duplicar ──');
await seccion('N', async () => {
  const m = mundo();
  await crear(m);
  await aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }]);
  const origen = await P.leerProduccion(A, pid(1), m.deps);
  const fotoOrigen = M.canonico(rutasBajo(m.db, `productions/${pid(1)}`).map((k) => [k, dato(m.db, k)]));
  const leidosAntes = m.leidos.length;
  const d = await P.duplicarProduccion({ accountId: A, productionId: pid(1), newProductionId: pid(2), title: 'Copia', at: HOY + 20 }, m.deps);
  check('N1) la copia es otra producción de la misma cuenta: otro id, su título, activa y en la revisión 0',
    d.ok && d.created && d.view.productionId === pid(2) && d.view.production.id === pid(2) && d.view.production.title === 'Copia' && d.view.revision === 0
    && d.view.status === 'active' && dato(m.db, rutaRaiz(pid(2))).ownerAccountId === A
    && iguales({ ...d.view.production, id: pid(1), title: origen.view.production.title, metadata: { ...d.view.production.metadata, revision: 1 } }, origen.view.production));
  check('N2) la original no se toca', M.canonico(rutasBajo(m.db, `productions/${pid(1)}`).map((k) => [k, dato(m.db, k)])) === fotoOrigen);
  const cero = dato(m.db, rutaRev(pid(2), 0));
  check('N3) su revisión 0 es SU foto, y dice de dónde viene', cero.kind === 'duplicate' && iguales(cero.snapshot, d.view.production)
    && iguales(cero.source, { productionId: pid(1), revision: 1 }) && iguales(d.source, cero.source) && rutasBajo(m.db, `productions/${pid(2)}/productionRevisions/`).length === 1);
  const deCopia = rutasBajo(m.db, `productions/${pid(2)}/productionScenes/`);
  check('N4) sus escenas son suyas: los mismos ids locales, bajo otra producción', deCopia.length === 2 && deCopia.every((k) => dato(m.db, k).productionId === pid(2))
    && deCopia.map((k) => k.split('/').pop()).join() === 'sc-0001,sc-0002');
  check('N5) no se copian materiales, ni Elements, ni se toca el Core: ni una lectura de material, ni una escritura fuera de la copia',
    m.leidos.length === leidosAntes && [...m.db.docs.keys()].every((k) => k.startsWith('productions/')));
  await P.crearProduccion({ accountId: B, productionId: pid(90), title: 'B', aspectRatio: '1:1', at: HOY }, m.deps);
  const fotoAntes = foto(m.db);
  const malas = await Promise.all([
    P.duplicarProduccion({ accountId: A, productionId: pid(1), newProductionId: pid(1), at: HOY }, m.deps),
    P.duplicarProduccion({ accountId: A, productionId: pid(1), newProductionId: 'corto', at: HOY }, m.deps),
    P.duplicarProduccion({ accountId: A, productionId: pid(1), newProductionId: pid(90), at: HOY }, m.deps),
    P.duplicarProduccion({ accountId: A, productionId: pid(1), newProductionId: pid(3), title: '', at: HOY }, m.deps),
    P.duplicarProduccion({ accountId: B, productionId: pid(1), newProductionId: pid(4), at: HOY }, m.deps),
  ]);
  check('N6) sobre sí misma o con un id sin forma, `production_id_invalid`; sobre un id ocupado, `production_id_taken`; con un título vacío, `production_invalid`; y la ajena no existe',
    iguales(malas.map(codigoDe), ['production_id_invalid', 'production_id_invalid', 'production_id_taken', 'production_invalid', 'production_not_found']) && foto(m.db) === fotoAntes);
  await P.crearProduccion({ accountId: A, productionId: pid(5), title: 'Otra original', aspectRatio: '1:1', at: HOY }, m.deps);
  const sobreCopia = await P.duplicarProduccion({ accountId: A, productionId: pid(5), newProductionId: pid(2), at: HOY }, m.deps);
  check('N7) el id de una copia no sirve para copiar OTRA original: `production_id_taken`', codigoDe(sobreCopia) === 'production_id_taken');
});

/* ═══ O · LÍMITES ══════════════════════════════════════════════════════════ */
console.log('\n── O · Límites ──');
await seccion('O', async () => {
  const m = mundo();
  await crear(m);
  const muchas = Array.from({ length: 51 }, (_, i) => ({ op: 'change_weather', sceneId: 'sc-0001', weather: i % 2 ? 'rain' : 'fog' }));
  const r = await aplicar(m, muchas);
  check('O1) más de 50 operaciones en un lote: `operations_too_many`, antes de leer nada', codigoDe(r) === 'operations_too_many' && r.problems[0].parameters.max === 50);
  const cincuenta = await aplicar(m, muchas.slice(0, 50));
  check('O2) cincuenta sí, y siguen siendo UNA revisión', cincuenta.ok && cincuenta.applied === 50 && cincuenta.view.revision === 1);
  check('O3) el id de una producción: de 20 a 128 caracteres', P.esIdDeProduccion('a'.repeat(20)) && !P.esIdDeProduccion('a'.repeat(19)) && P.esIdDeProduccion('a'.repeat(128)) && !P.esIdDeProduccion('a'.repeat(129)));
  const reservadaEscena = rica(); reservadaEscena.scenes[0].id = '__sc01__';
  const rr = await P.crearProduccion({ accountId: A, productionId: pid(5), production: reservadaEscena, at: HOY }, m.deps);
  check('O4) una escena con un id que Firestore reserva (`__…__`) no se puede guardar: `id_not_storable`', codigoDe(rr) === 'id_not_storable' && rr.problems[0].path === 'scenes.__sc01__');
  const doscientas = M.produccionVacia({ title: 'Límite', aspectRatio: '16:9' });
  doscientas.scenes = Array.from({ length: 200 }, (_, i) => ({ id: `sc-${String(i).padStart(4, '0')}`, order: i, durationSec: 2, shots: [] }));
  const m2 = mundo();
  await P.crearProduccion({ accountId: A, productionId: pid(1), production: doscientas, at: HOY }, m2.deps);
  const mas = await aplicar(m2, [{ op: 'add_scene', scene: { id: 'sc-0200', durationSec: 2 } }]);
  check('O5) el límite del dominio manda también al guardar: la escena 201 no entra', codigoDe(mas) === 'operations_invalid' && mas.problems.some((x) => x.code === 'limit_exceeded'));
  const quinientas = Array.from({ length: 501 }, (_, i) => ({ ruta: ['productions', pid(1), 'productionScenes', `sc-${i}`], tipo: 'set', datos: { a: 1 } }));
  const t = P.medirEscrituras(quinientas);
  check('O6) más de 500 escrituras no caben en una transacción: se rechaza con su código, sin partir nada', t && t.code === 'transaction_too_large' && t.problems[0].parameters.writes === 501);
  check('O7) y 500 sí', P.medirEscrituras(quinientas.slice(0, 500)) === null);
});

/* ═══ P · TAMAÑO ═══════════════════════════════════════════════════════════ */
console.log('\n── P · Tamaño ──');
await seccion('P', async () => {
  check('P1) el tamaño se cuenta como lo cuenta Firestore: su ejemplo publicado da 147 bytes',
    P.bytesDeDocumento(['users', 'jeff', 'tasks', 'my_task_id'], { type: 'Personal', done: false, priority: 1, description: 'Learn Cloud Firestore' }) === 147);
  const pesado = (id, k, relleno = 'x') => ({
    id, order: k, durationSec: 1, description: relleno.repeat(2000), advanced: { prompt: relleno.repeat(4000) },
    actions: Array.from({ length: 16 }, () => relleno.repeat(280)),
  });
  const escenaPesada = (id, orden, planos) => ({ id, order: orden, shots: Array.from({ length: planos }, (_, k) => pesado(`${id}-p${k}`, k)) });
  const m = mundo();
  const enorme = M.produccionVacia({ title: 'Enorme', aspectRatio: '16:9' });
  enorme.scenes = [escenaPesada('sc-gorda', 0, 100)];
  const r = await P.crearProduccion({ accountId: A, productionId: pid(1), production: enorme, at: HOY }, m.deps);
  check('P2) una escena de más de un megabyte no se guarda: `document_too_large`, con su ruta y sus bytes, y nada escrito',
    codigoDe(r) === 'document_too_large' && r.problems.some((x) => x.path === `productions/${pid(1)}/productionScenes/sc-gorda` && x.parameters.bytes > 1_000_000) && m.db.docs.size === 0);
  const muchos = M.produccionVacia({ title: 'Reparto', aspectRatio: '16:9' });
  const rasgo = (t) => ({ description: t.repeat(1990) });
  muchos.characters = Array.from({ length: 64 }, (_, i) => ({ id: `char-${String(i).padStart(3, '0')}`, name: `P${i}`,
    appearance: { face: rasgo('a'), hair: rasgo('b'), body: rasgo('c'), wardrobe: rasgo('d'), accessories: rasgo('e'), makeup: rasgo('f'), materials: rasgo('g'), lighting: rasgo('h'), visualStyle: rasgo('i'), environment: rasgo('j') } }));
  const r2 = await P.crearProduccion({ accountId: A, productionId: pid(2), production: muchos, at: HOY }, m.deps);
  check('P3) una raíz de más de un megabyte, tampoco', codigoDe(r2) === 'document_too_large' && r2.problems.some((x) => x.path === `productions/${pid(2)}`));
  /* Dos escenas de 600 KB: cada documento cabe, la foto entera no. */
  const dos = M.produccionVacia({ title: 'Dos', aspectRatio: '16:9' });
  dos.scenes = [escenaPesada('sc-a', 0, 55), escenaPesada('sc-b', 1, 55)];
  const r3 = await P.crearProduccion({ accountId: A, productionId: pid(3), production: dos, at: HOY }, m.deps);
  check('P4) si la foto de la revisión 0 no cabe en un documento, no se crea: lo dice la ruta de la revisión',
    codigoDe(r3) === 'document_too_large' && r3.problems.some((x) => x.path === `productions/${pid(3)}/productionRevisions/0000000000`) && m.db.docs.size === 0);
  const m2 = mundo();
  await P.crearProduccion({ accountId: A, productionId: pid(1), title: 'Crece', aspectRatio: '16:9', at: HOY }, m2.deps);
  const a1 = await aplicar(m2, [{ op: 'add_scene', scene: { id: 'sc-a', shots: escenaPesada('sc-a', 0, 55).shots.map(({ order, ...s }) => s) } }]);
  const a2 = await aplicar(m2, [{ op: 'add_scene', scene: { id: 'sc-b', shots: escenaPesada('sc-b', 1, 55).shots.map(({ order, ...s }) => s) } }], { expectedRevision: 1 });
  const fotoAntes = foto(m2.db);
  const d = await P.duplicarProduccion({ accountId: A, productionId: pid(1), newProductionId: pid(2), at: HOY }, m2.deps);
  check('P5) crecer a golpe de lotes sí cabe —cada documento es suyo—, pero duplicarla exige una foto que no cabe: se rechaza y no se escribe nada',
    a1.ok && a2.ok && codigoDe(d) === 'document_too_large' && d.problems.some((x) => x.path.endsWith('/productionRevisions/0000000000')) && foto(m2.db) === fotoAntes);
  /* Diez escenas de ~900 KB, añadidas de una en una; moverlas todas a la vez no cabe en una transacción. */
  const m3 = mundo();
  await P.crearProduccion({ accountId: A, productionId: pid(1), title: 'Diez', aspectRatio: '16:9', at: HOY }, m3.deps);
  let revision = 0; let bien = true;
  for (let k = 0; k < 10; k++) {
    const s = await aplicar(m3, [{ op: 'add_scene', scene: { id: `sc-${k}`, shots: escenaPesada(`sc-${k}`, k, 86).shots.map(({ order, ...x }) => x) } }], { expectedRevision: revision });
    bien = bien && s.ok; revision++;
  }
  const bytes = P.bytesDeDocumento(['productions', pid(1), 'productionScenes', 'sc-0'], dato(m3.db, rutaEscena(pid(1), 'sc-0')));
  const fotoDiez = foto(m3.db);
  const t = await aplicar(m3, [{ op: 'reorder_scene', sceneId: 'sc-0', toOrder: 9 }], { expectedRevision: revision });
  check('P6) diez escenas de ~900 KB se guardan una a una; moverlas todas en un lote pasaría de 9 MB: `transaction_too_large`, sin partirlo',
    bien && bytes > 900_000 && bytes < 1_000_000 && codigoDe(t) === 'transaction_too_large' && t.problems[0].parameters.bytes > 9_000_000 && foto(m3.db) === fotoDiez, `${bytes} bytes por escena`);
});

/* ═══ P · TAMAÑO (2): la producción entera ═══ */
await seccion('P', async () => {
  /* Un plano de ~21 KB: el texto que el dominio admite, más diez líneas de narración de mil caracteres. */
  const pesado = (id) => ({
    id, durationSec: 1, description: 'x'.repeat(2000), advanced: { prompt: 'x'.repeat(4000) }, actions: Array.from({ length: 16 }, () => 'x'.repeat(280)),
    dialogue: Array.from({ length: 10 }, (_, i) => ({ id: `${id}-l${i}`, kind: 'narration', text: 'x'.repeat(1000) })),
  });
  const escena = (k) => ({ id: `sc-${k}`, shots: Array.from({ length: 45 }, (_, j) => pesado(`sc-${k}-p${j}`)) });
  const m = mundo();
  await P.crearProduccion({ accountId: A, productionId: pid(1), title: 'Veintidós', aspectRatio: '16:9', at: HOY }, m.deps);
  let bien = true;
  for (let k = 0; k < 21; k++) {
    const s = await aplicar(m, [{ op: 'add_scene', scene: escena(k) }], { expectedRevision: k });
    bien = bien && s.ok;
    if (!s.ok) console.log('   P7 · el lote', k, 'falló:', s.code, JSON.stringify(s.problems[0]).slice(0, 200));
  }
  const bytes = P.bytesDeDocumento(['productions', pid(1), 'productionScenes', 'sc-0'], dato(m.db, rutaEscena(pid(1), 'sc-0')));
  const fotoAntes = foto(m.db);
  const r = await aplicar(m, [{ op: 'add_scene', scene: escena(21) }], { expectedRevision: 21 });
  check('P7) una producción no pasa de 20 MB aunque cada documento quepa: la escena que la pasaría se rechaza con `production_too_large`, y nada escrito',
    bien && bytes < 1_000_000 && codigoDe(r) === 'production_too_large' && r.problems[0].parameters.bytes > 20_000_000 && r.problems[0].parameters.max === 20_000_000
    && foto(m.db) === fotoAntes, `${codigoDe(r)} · ${r.problems?.[0]?.parameters?.bytes ?? '—'} bytes en total · ${bytes} por escena`);
});

/* ═══ Q · REFERENCIAS ══════════════════════════════════════════════════════ */
console.log('\n── Q · Referencias a materiales ──');
await seccion('Q', async () => {
  const m = mundo();
  const r = await crear(m);
  check('Q1) cada material nuevo se comprueba una vez con el Content Core y `puedeReferenciar`', r.ok && iguales([...m.leidos].sort(), [ASSET_IMG, ASSET_AUDIO, ASSET_FRAME].sort()));
  const conRef = (assetId, kind = 'image') => { const p = rica(); p.references.push({ id: 'ref-nueva', kind, role: 'style', assetId }); return p; };
  const casos = await Promise.all([
    P.crearProduccion({ accountId: A, productionId: pid(2), production: conRef(ASSET_AJENO), at: HOY }, m.deps),
    P.crearProduccion({ accountId: A, productionId: pid(3), production: conRef(ASSET_NADA), at: HOY }, m.deps),
    P.crearProduccion({ accountId: A, productionId: pid(4), production: conRef(ASSET_CRUDO), at: HOY }, m.deps),
    P.crearProduccion({ accountId: A, productionId: pid(5), production: conRef(ASSET_AUDIO, 'image'), at: HOY }, m.deps),
  ]);
  const motivo = (x) => x.problems?.find((p) => p.path === 'references.ref-nueva.assetId')?.parameters.reason;
  check('Q2) un material ajeno y uno que no existe se contestan IGUAL (`not_found`)', motivo(casos[0]) === 'not_found' && iguales(casos[0].problems, casos[1].problems));
  check('Q3) uno tuyo que aún no está listo es `not_usable`; uno de otra clase, `kind_mismatch`', motivo(casos[2]) === 'not_usable' && motivo(casos[3]) === 'kind_mismatch');
  check('Q4) y ninguno de los cuatro se guarda', casos.every((x) => codigoDe(x) === 'reference_rejected') && [2, 3, 4, 5].every((k) => rutasBajo(m.db, rutaRaiz(pid(k))).length === 0));
  const leidos = m.leidos.length;
  const rr = await aplicar(m, [{ op: 'replace_reference', fromReferenceId: 'ref-luna', toReferenceId: 'ref-frame' }]);
  check('Q5) lo que ya estaba no se vuelve a leer al aplicar un lote', rr.ok && rr.applied === 1 && m.leidos.length === leidos);
  const guardadas = dato(m.db, rutaRaiz(pid(1))).references;
  check('Q6) una referencia guarda el id del material y nada más del material: ni URL, ni bytes, ni su ficha',
    guardadas.every((x) => Object.keys(x).every((k) => ['id', 'kind', 'role', 'assetId', 'description'].includes(k))));
});

/* ═══ R · ADVANCED.PROMPT ══════════════════════════════════════════════════ */
console.log('\n── R · El prompt avanzado ──');
await seccion('R', async () => {
  const m = mundo();
  await crear(m);
  check('R1) se guarda DENTRO de la producción, en su plano', dato(m.db, rutaEscena(pid(1), 'sc-0001')).shots[0].advanced.prompt === PROMPT);
  await aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }, { op: 'reorder_scene', sceneId: 'sc-0002', toOrder: 0 }]);
  const g = await P.leerProduccion(A, pid(1), m.deps);
  check('R2) y se conserva entre revisiones', g.view.revision === 1 && g.view.production.scenes[1].shots[0].advanced.prompt === PROMPT);
  const otro = 'Plano cenital, la meta en primer término';
  const r = await aplicar(m, [{ op: 'add_shot', sceneId: 'sc-0002', shot: { id: 'sh-0202', durationSec: 2, advanced: { prompt: otro } } }], { expectedRevision: 1 });
  check('R3) una operación también puede traerlo, y el registro lo conserva para restaurar', r.ok && dato(m.db, rutaRev(pid(1), 2)).operations[0].shot.advanced.prompt === otro);
  const l = await P.listarProducciones({ accountId: A }, m.deps);
  check('R4) una lista nunca lo enseña', l.ok && !JSON.stringify(l).includes(PROMPT) && !JSON.stringify(l).includes(otro));
  check('R5) y nunca llega a una colección del Core: ni `scenes`, ni `shots`, ni `jobs`, ni `assets`', [...m.db.docs.keys()].every((k) => k.startsWith('productions/')));
  const largo = rica(); largo.scenes[0].shots[0].advanced = { prompt: 'x'.repeat(4001) };
  const neg = rica(); neg.scenes[0].shots[0].advanced = { prompt: 'bien', negativePrompt: 'mal' };
  const mod = rica(); mod.scenes[0].shots[0].advanced = { prompt: 'bien', model: 'cualquiera' };
  const fuera = rica(); fuera.scenes[0].shots[0].prompt = 'fuera de su sitio';
  const rs = await Promise.all([largo, neg, mod, fuera].map((p, i) => P.crearProduccion({ accountId: A, productionId: pid(10 + i), production: p, at: HOY }, m.deps)));
  check('R6) si viola el modelo se rechaza con el código del dominio: largo, con prompt negativo, con modelo o fuera de `advanced`',
    rs.every((x) => codigoDe(x) === 'production_invalid')
    && rs[0].problems.some((x) => x.path === 'scenes.sc-0001.shots.sh-0101.advanced.prompt' && x.parameters.reason === 'too_long')
    && rs[1].problems.some((x) => x.code === 'field_forbidden' && x.path.endsWith('advanced.negativePrompt'))
    && rs[2].problems.some((x) => x.code === 'field_forbidden' && x.path.endsWith('advanced.model'))
    && rs[3].problems.some((x) => x.code === 'field_forbidden' && x.path === 'scenes.sc-0001.shots.sh-0101.prompt'));
  const codigo = ['index.ts', 'puerta.ts'].map((f) => sinComentarios(leer(`functions/src/productions/${f}`))).join('\n');
  check('R7) este módulo no escribe en los registros —ni `console` ni `logger`— y no habla con ningún motor ni proveedor',
    !/console\.|logger\.|functions\.logger/.test(codigo) && !/from '\.\.\/(engine|creator|gateway|runtime|credits|planner|brain)/.test(codigo) && !/fetch\(|https?:\/\//.test(codigo));
});

/* ═══ S · EL REGISTRO ══════════════════════════════════════════════════════ */
console.log('\n── S · El registro de operaciones ──');
await seccion('S', async () => {
  const m = mundo();
  const c = await crear(m);
  const estados = [c.view.production];
  const lotes = [
    [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }],
    [{ op: 'split_shot', shotId: 'sh-0201', atSec: 2.5 }, { op: 'change_movement', target: { scope: 'production' }, movement: 'tracking', speed: 'fast' }],
    [{ op: 'duplicate_scene', sceneId: 'sc-0001' }],
  ];
  const huellas = [];
  for (let i = 0; i < lotes.length; i++) {
    const r = await aplicar(m, lotes[i], { expectedRevision: i });
    estados.push(r.view.production);
    huellas.push(M.canonico(dato(m.db, rutaRev(pid(1), i + 1))));
  }
  const ids = rutasBajo(m.db, `productions/${pid(1)}/productionRevisions/`).map((k) => k.split('/').pop());
  check('S1) una entrada por revisión, con el número en su id', ids.join() === '0000000000,0000000001,0000000002,0000000003');
  check('S2) y el registro solo se AÑADE: sus entradas siempre se escriben con `create`',
    escrituras(m.db).filter((w) => w.includes('/productionRevisions/')).every((w) => w.startsWith('create ')));
  await aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0002', weather: 'fog' }], { expectedRevision: 3 });
  check('S3) lo escrito no cambia después', [1, 2, 3].every((k) => M.canonico(dato(m.db, rutaRev(pid(1), k))) === huellas[k - 1]));
  const e2 = dato(m.db, rutaRev(pid(1), 2));
  const PERMITIDAS = ['productionId', 'ownerAccountId', 'revision', 'kind', 'operationId', 'actorAccountId', 'createdAt', 'modelVersion', 'operations', 'snapshot', 'source', 'result'];
  check('S4) cada entrada lleva revisión, id, tipo, lote, hora, quién, versión del modelo y cómo quedó; y nada de proveedores ni de lo pendiente',
    Object.keys(e2).every((k) => PERMITIDAS.includes(k)) && e2.kind === 'apply' && iguales(e2.operations, lotes[1]) && e2.modelVersion === 1
    && e2.result.hash === P.huella(estados[2]) && e2.result.applied === 2 && !('pending' in e2.result));
  const reg = await P.leerRegistro(A, pid(1), m.deps);
  check('S5) el registro se lee en orden', reg.ok && reg.entries.map((e) => e.revision).join() === '0,1,2,3,4');
  const todas = [0, 1, 2, 3].map((k) => P.reconstruirRevision(reg.entries, k));
  check('S6) y de él se reconstruye CUALQUIER revisión, idéntica a la que hubo', todas.every((x, k) => x.ok && iguales(x.production, estados[k])));
  const trucado = clon(reg.entries); trucado[2].operations = [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'snow' }];
  const hueco = reg.entries.filter((e) => e.revision !== 2);
  const t1 = P.reconstruirRevision(trucado, 3);
  const t2 = P.reconstruirRevision(hueco, 3);
  check('S7) un registro trucado o con un hueco no se reconstruye a ciegas: `history_broken`, en su revisión',
    codigoDe(t1) === 'history_broken' && t1.problems[0].path === 'revisions.2' && t1.problems[0].parameters.reason === 'hash_mismatch'
    && codigoDe(t2) === 'history_broken' && t2.problems[0].parameters.reason === 'missing');
  const antes = rutasBajo(m.db, `productions/${pid(1)}/productionRevisions/`).length;
  await aplicar(m, [{ op: 'change_weather', sceneId: 'sc-9999', weather: 'fog' }], { expectedRevision: 4 });
  await aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0002', weather: 'fog' }], { expectedRevision: 4 });
  check('S8) un lote que falla o que no cambia nada no deja entrada', rutasBajo(m.db, `productions/${pid(1)}/productionRevisions/`).length === antes);
});

/* ═══ T · REVISIÓN 0 ═══════════════════════════════════════════════════════ */
console.log('\n── T · La revisión 0 ──');
await seccion('T', async () => {
  const m = mundo();
  const c = await crear(m);
  const reg = await P.leerRegistro(A, pid(1), m.deps);
  const r0 = P.reconstruirRevision(reg.entries, 0);
  check('T1) una producción recién creada tiene UNA entrada, la foto, y reconstruirla da la producción',
    reg.ok && reg.entries.length === 1 && reg.entries[0].kind === 'create' && r0.ok && iguales(r0.production, c.view.production));
  check('T2) su huella es la de lo que se lee', reg.entries[0].result.hash === P.huella((await P.leerProduccion(A, pid(1), m.deps)).view.production));
  await aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }]);
  const d = await P.duplicarProduccion({ accountId: A, productionId: pid(1), newProductionId: pid(2), at: HOY }, m.deps);
  const regD = await P.leerRegistro(A, pid(2), m.deps);
  check('T3) la revisión 0 de una copia es la foto de la COPIA, no la de la original', regD.ok && regD.entries.length === 1
    && iguales(P.reconstruirRevision(regD.entries, 0).production, d.view.production) && regD.entries[0].snapshot.scenes[0].weather === 'rain');
});

/* ═══ U · REVISIÓN INCREMENTAL ═════════════════════════════════════════════ */
console.log('\n── U · Revisión a revisión ──');
await seccion('U', async () => {
  const m = mundo();
  await crear(m);
  const cinco = [
    { op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }, { op: 'change_weather', sceneId: 'sc-0002', weather: 'fog' },
    { op: 'edit_text', target: { sceneId: 'sc-0001' }, title: 'Uno' }, { op: 'edit_text', target: { sceneId: 'sc-0002' }, title: 'Dos' },
    { op: 'change_time_of_day', sceneId: 'sc-0001', timeOfDay: 'dawn' },
  ];
  const r1 = await aplicar(m, cinco);
  const r2 = await aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'clear' }], { expectedRevision: 1 });
  const r3 = await aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0002', weather: 'clear' }], { expectedRevision: 2 });
  check('U1) 0 → 1 → 2 → 3: una por lote, tenga una operación o cinco', r1.ok && r1.applied === 5 && r1.view.revision === 1 && r2.view.revision === 2 && r3.view.revision === 3);
  const vieja = await aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0002', weather: 'snow' }], { expectedRevision: 2 });
  const nueva = await aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0002', weather: 'snow' }], { expectedRevision: 3 });
  check('U2) la revisión esperada es la última: la anterior choca y la actual entra', codigoDe(vieja) === 'revision_conflict' && nueva.ok && nueva.view.revision === 4);
  check('U3) la raíz, el registro y la respuesta dicen la misma revisión', dato(m.db, rutaRaiz(pid(1))).metadata.revision === 4 && dato(m.db, rutaRev(pid(1), 4)).revision === 4);
});

/* ═══ V · SIN PROVEEDOR NI MODELO ══════════════════════════════════════════ */
console.log('\n── V · Ni proveedor ni modelo ──');
await seccion('V', async () => {
  const m = mundo();
  const conProveedor = { ...rica(), provider: 'alguno' };
  const enPlano = rica(); enPlano.scenes[0].shots[0].modelId = 'x';
  const enPersonaje = rica(); enPersonaje.characters[0].seed = 42;
  const rs = await Promise.all([conProveedor, enPlano, enPersonaje].map((p, i) => P.crearProduccion({ accountId: A, productionId: pid(20 + i), production: p, at: HOY }, m.deps)));
  check('V1) proveedor, modelo o semilla, en la raíz, en un plano o en un personaje: `field_forbidden`, y nada escrito',
    rs.every((x) => codigoDe(x) === 'production_invalid' && x.problems.some((p) => p.code === 'field_forbidden')) && m.db.docs.size === 0);
  await crear(m);
  const op = await aplicar(m, [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain', provider: 'x' }]);
  const nodo = await aplicar(m, [{ op: 'add_shot', sceneId: 'sc-0001', shot: { id: 'sh-0103', durationSec: 2, model: 'x' } }]);
  check('V2) ni en una operación ni en lo que trae', codigoDe(op) === 'operations_invalid' && codigoDe(nodo) === 'operations_invalid');
  await aplicar(m, [{ op: 'add_shot', sceneId: 'sc-0002', shot: { id: 'sh-0202', durationSec: 2, advanced: { prompt: 'otro' } } }]);
  const prohibidas = [...m.db.docs.values()].flatMap((v) => clavesDe(v.data)).filter((k) => {
    const ultima = k.split('.').pop();
    return shotCore.claveProhibidaDeNodo(ultima) && !(ultima === 'prompt' && k.split('.').slice(-2)[0] === 'advanced');
  });
  check('V3) en todo lo guardado —raíz, escenas y registro— no hay una sola clave prohibida por el Core, salvo `advanced.prompt`', prohibidas.length === 0, prohibidas.slice(0, 3).join(', '));
  const PROVEEDORES = ['gemini', 'seedance', 'seedream', 'deepseek', 'openai', 'claude', 'anthropic', 'elevenlabs', 'minimax', 'flux', 'kling', 'runway', 'veo', 'suno', 'bytedance', 'byteplus', 'replicate'];
  const fuentes = ['index.ts', 'puerta.ts'].map((f) => leer(`functions/src/productions/${f}`)).join('\n');
  check('V4) ni un proveedor nombrado en el código de F1-B', !PROVEEDORES.some((pr) => new RegExp(`(?<![a-z])${pr}(?![a-z])`, 'i').test(fuentes)));
});

/* ═══ W · SIN URLS ═════════════════════════════════════════════════════════ */
console.log('\n── W · Sin URLs ──');
await seccion('W', async () => {
  const m = mundo();
  const comoId = rica(); comoId.references[0].assetId = 'https://ejemplo.invalid/luna.png';
  const conUrl = rica(); conUrl.references[0].url = 'https://ejemplo.invalid/luna.png';
  const enFicha = rica(); enFicha.characters[0].imageUrl = 'https://ejemplo.invalid/luna.png';
  const rs = await Promise.all([comoId, conUrl, enFicha].map((p, i) => P.crearProduccion({ accountId: A, productionId: pid(30 + i), production: p, at: HOY }, m.deps)));
  check('W1) una URL no entra: ni como id de material, ni como campo, ni en una ficha',
    rs.every((x) => codigoDe(x) === 'production_invalid') && rs[0].problems.some((x) => x.code === 'id_invalid' && x.path.endsWith('assetId'))
    && rs[1].problems.some((x) => x.code === 'field_forbidden') && rs[2].problems.some((x) => ['field_forbidden', 'field_unknown'].includes(x.code) && x.path.endsWith('imageUrl'))
    && m.db.docs.size === 0);
  await crear(m);
  const valores = [];
  const andar = (v) => { if (Array.isArray(v)) v.forEach(andar); else if (v && typeof v === 'object') Object.values(v).forEach(andar); else if (typeof v === 'string') valores.push(v); };
  [...m.db.docs.values()].forEach((v) => andar(v.data));
  check('W2) y guardar no añade ninguna: ni la de entrega de un material, ni ninguna otra', !valores.some((s) => /^(https?|gs):\/\//.test(s)));
});

/* ═══ X · SIN ELEMENTS ═════════════════════════════════════════════════════ */
console.log('\n── X · Sin Elements (F3) ──');
await seccion('X', async () => {
  const m = mundo();
  const binding = { elementId: 'el_luna_0001', version: 2 };
  const enPersonaje = rica(); enPersonaje.characters[0].element = binding;
  const enLugar = rica(); enLugar.locations[0].element = binding;
  const enObjeto = rica(); enObjeto.objects[0].element = binding;
  const enReferencia = rica(); enReferencia.references.push({ id: 'ref-el', kind: 'image', element: binding });
  const rs = await Promise.all([enPersonaje, enLugar, enObjeto, enReferencia].map((p, i) => P.crearProduccion({ accountId: A, productionId: pid(40 + i), production: p, at: HOY }, m.deps)));
  check('X1) un vínculo a un Element de verdad se rechaza con su código y su ruta, esté donde esté: eso es F3',
    rs.every((x) => codigoDe(x) === 'element_binding_not_supported')
    && iguales(rs.map((x) => x.problems[0].path), ['characters.char-luna.element', 'locations.loc-city.element', 'objects.obj-shoe.element', 'references.ref-el.element'])
    && rs.every((x) => x.problems[0].parameters.until === 'F3'));
  check('X2) y no se escribe nada', m.db.docs.size === 0);
  const codigo = ['index.ts', 'puerta.ts'].map((f) => sinComentarios(leer(`functions/src/productions/${f}`))).join('\n');
  check('X3) este módulo no importa `elements` ni `shots`, y `shots` no exporta nada nuevo',
    !/from '\.\.\/(elements|shots)/.test(codigo) && !/export (const|function|async function) revisarElementos/.test(leer('functions/src/shots/index.ts')));
});

/* ═══ Y · SIN TOCAR EL CORE ════════════════════════════════════════════════ */
console.log('\n── Y · El Core, intacto ──');
await seccion('Y', async () => {
  check('Y1) los contratos siguen donde estaban: 1.12, SHOT 1.0, CONTINUITY 1.0, CREATIVE 1, ELEMENT 1.0; y el modelo de Filmmaker, en 1',
    contratos.ALGORITHM_CONTRACT_VERSION === '1.12' && contratos.SHOT_CONTRACT_VERSION === '1.0' && contratos.CONTINUITY_CONTRACT_VERSION === '1.0'
    && contratos.CREATIVE_PARAMETERS_VERSION === 1 && contratos.ELEMENT_CONTRACT_VERSION === '1.0' && M.FILMMAKER_MODEL_VERSION === 1);
  check('Y2) `ShotNode` sigue sin admitir un prompt',
    shotCore.validarPlano({ contract: '1.0', shotId: 'sh-0001', projectId: 'proj-0001', version: 1, order: 0, state: 'draft', ownerAccountId: 'a', createdAt: 0, updatedAt: 0, prompt: 'x' })
      .some((x) => x.field === 'prompt' && x.reason === 'forbidden_key'));
  const imports = ['index.ts', 'puerta.ts'].flatMap((f) => [...sinComentarios(leer(`functions/src/productions/${f}`)).matchAll(/from '([^']+)'/g)].map((x) => x[1]));
  const PERMITIDOS = ['crypto', 'firebase-admin/firestore', 'firebase-functions/v2/https', '../core/creative', '../core/element', '../content',
    '../filmmaker/modelo', '../filmmaker/validacion', '../filmmaker/operaciones', '../identity/cuentas', './index'];
  check('Y3) importa solo lo que necesita: Firestore, la puerta, dos piezas del Core, el Content Core, la cuenta y el dominio de F1-A',
    imports.every((x) => PERMITIDOS.includes(x)), imports.filter((x) => !PERMITIDOS.includes(x)).join(', '));
  const codigo = sinComentarios(leer('functions/src/productions/index.ts'));
  check('Y4) sus colecciones son las suyas: ni `scenes`, ni `shots`, ni consultas de grupo',
    P.COLECCION_DE_PRODUCCIONES === 'productions' && P.COLECCION_DE_ESCENAS === 'productionScenes' && P.COLECCION_DE_REVISIONES === 'productionRevisions'
    && !/collectionGroup|collection\('(scenes|shots)'\)|COLECCION_DE_PLANOS/.test(codigo));
  const indice = leer('functions/src/index.ts');
  const compilado = leer('functions/lib/index.js');
  check('Y5) está conectada, y UNA vez: `index.ts` la exporta desde su puerta en una sola línea, y el compilado la carga desde ella',
    indice.split('\n').filter((l) => /productions/i.test(l)).join('\n') === "export { productions } from './productions/puerta';"
    && (compilado.match(/require\("\.\/productions\/puerta"\)/g) || []).length === 1
    && (compilado.match(/Object\.defineProperty\(exports, "productions"/g) || []).length === 1);
  const mapa = leer('functions/test/runtime-map.test.mjs');
  check('Y6) y el mapa del runtime la declara: 37 Functions (35 + evalRun, F2-C1, + generateWorld, misión mundo3d), `productions` sale de su puerta, y los veinte símbolos del Core que trae, autorizados',
    /reales\.length === 37/.test(mapa) && /'\.\/productions\/puerta': \['productions'\]/.test(mapa) && /const DE_PRODUCTIONS = \{/.test(mapa));
  check('Y7) ni el dominio de F1-A ni el Algorithm Engine se tocaron para esto: Filmmaker sigue siendo cinco archivos de dominio',
    fs.readdirSync(path.resolve(RAIZ, 'functions/src/filmmaker')).sort().join() === 'modelo.ts,operaciones.ts,recomendaciones.ts,requisitos.ts,validacion.ts'
    && !/productions/.test(fs.readdirSync(path.resolve(RAIZ, 'functions/src/filmmaker')).map((f) => leer(`functions/src/filmmaker/${f}`)).join('\n')));
  /*
   * `runtime-map` mide lo que se carga siguiendo los `import` del compilado. Una carga PEREZOSA —un `require(` o un
   * `import(` dentro de una función— se le escaparía, y con ella lo que la conexión pone en producción. Ni una.
   */
  const conCargaPerezosa = ['productions', 'filmmaker'].flatMap((dir) => fs.readdirSync(path.resolve(RAIZ, `functions/src/${dir}`))
    .filter((x) => x.endsWith('.ts')).map((x) => `functions/src/${dir}/${x}`)).filter((x) => /\brequire\s*\(|\bimport\s*\(/.test(sinComentarios(leer(x))));
  check('Y8) nada se carga a escondidas del mapa del runtime: ni `require(` ni `import(` dinámico en `productions/` ni en `filmmaker/`',
    conCargaPerezosa.length === 0, conCargaPerezosa.join(', '));
});

/* ═══ Z · REGLAS, ÍNDICE, PUERTA Y DOCUMENTACIÓN ═══════════════════════════ */
console.log('\n── Z · Reglas, índice, puerta y documentación ──');
await seccion('Z', async () => {
  const reglas = leer('firestore.rules');
  const bloque = (col, v) => new RegExp(`match /${col}/\\{${v}\\} \\{\\s*allow read: if isAuthenticated\\(\\) && resource\\.data\\.ownerAccountId == request\\.auth\\.uid;\\s*allow create, update, delete: if false;`).test(reglas);
  check('Z1) producciones, escenas y registro: las lee su dueño y el cliente no escribe nunca',
    bloque('productions', 'productionId') && bloque('productionScenes', 'sceneId') && bloque('productionRevisions', 'revisionId'));
  const desde = reglas.indexOf('match /productions/{productionId}');
  const suyo = reglas.slice(desde);
  check('Z2) van al final, detrás de `shots`, sin un `if true` y sin tocar la franja de Elements a Media Cloud',
    desde > reglas.indexOf('match /shots/{shotId}') && !/if true/.test(suyo) && (suyo.match(/allow create, update, delete: if false;/g) || []).length === 3
    && (reglas.slice(reglas.indexOf('match /elements/{elementId}'), reglas.indexOf('// === WEE MEDIA CLOUD (MC-1)')).match(/allow create, update, delete: if false;/g) || []).length === 2);
  const ix = JSON.parse(leer('firestore.indexes.json')).indexes;
  const deProducciones = ix.filter((i) => i.collectionGroup === 'productions');
  check('Z3) UN índice nuevo, el de la lista: cuenta, estado y `updatedAt` descendente', deProducciones.length === 1
    && iguales(deProducciones[0].fields.map((f) => [f.fieldPath, f.order]), [['ownerAccountId', 'ASCENDING'], ['status', 'ASCENDING'], ['updatedAt', 'DESCENDING']])
    && deProducciones[0].queryScope === 'COLLECTION');
  check('Z4) ninguno para escenas ni registro, y los tres de `scenes`/`shots` siguen como estaban',
    !ix.some((i) => i.collectionGroup === 'productionScenes' || i.collectionGroup === 'productionRevisions')
    && ix.filter((i) => i.collectionGroup === 'scenes' || i.collectionGroup === 'shots').length === 3);
  const mDb = mundo();
  const ctx = { db: mDb.db, material: mDb.deps.material, at: HOY };
  const hacer = (datos, cuenta = A) => Pu.atenderProducciones(cuenta, datos, ctx);
  const c = await hacer({ op: 'create', productionId: pid(1), production: rica() });
  const g = await hacer({ op: 'get', productionId: pid(1) });
  const l = await hacer({ op: 'list' });
  const a = await hacer({ op: 'apply', productionId: pid(1), expectedRevision: 0, operations: [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }] });
  const ar = await hacer({ op: 'archive', productionId: pid(1) });
  const un = await hacer({ op: 'unarchive', productionId: pid(1) });
  const d = await hacer({ op: 'duplicate', productionId: pid(1), newProductionId: pid(2), title: 'Copia' });
  check('Z5) la puerta atiende las siete operaciones',
    c.created && c.revision === 0 && g.productionId === pid(1) && l.productions.length === 1 && a.revision === 1 && a.alreadyApplied === false
    && ar.changed && ar.summary.status === 'archived' && un.changed && d.created && d.source.productionId === pid(1));
  check('Z6) y son exactamente siete', iguales([...Pu.OPERACIONES_DE_PRODUCCION], ['create', 'get', 'list', 'apply', 'archive', 'unarchive', 'duplicate']));
  const e1 = await lanza(() => hacer({ op: 'get', productionId: pid(1) }, B));
  const e2 = await lanza(() => hacer({ op: 'apply', productionId: pid(1), expectedRevision: 0, operations: [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'fog' }] }));
  await hacer({ op: 'archive', productionId: pid(2) });
  const e3 = await lanza(() => hacer({ op: 'apply', productionId: pid(2), expectedRevision: 0, operations: [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'fog' }] }));
  const e4 = await lanza(() => hacer({ op: 'create', productionId: pid(3), production: { ...rica(), provider: 'x' } }));
  const conEl = rica(); conEl.characters[0].element = { elementId: 'el_luna_0001', version: 1 };
  const e5 = await lanza(() => hacer({ op: 'create', productionId: pid(4), production: conEl }));
  const e6 = await lanza(() => hacer({ op: 'create', productionId: pid(1), title: 'otra', aspectRatio: '1:1' }));
  const e7 = await lanza(() => hacer({ op: 'borrar' }));
  check('Z7) cada rechazo sale con el código estándar de una callable: no encontrado, conflicto, archivada, inválida, Element, ocupado, operación desconocida',
    e1?.code === 'not-found' && e2?.code === 'aborted' && e2?.details?.currentRevision === 1 && e3?.code === 'failed-precondition'
    && e4?.code === 'invalid-argument' && e5?.code === 'failed-precondition' && e6?.code === 'already-exists' && e7?.code === 'invalid-argument');
  const errores = [e1, e2, e3, e4, e5, e6, e7];
  check('Z8) y sin frases: el mensaje es el código y `details` trae su `messageKey`; los del dominio, las suyas',
    errores.every((e) => /^[a-z_]+$/.test(e.message) && e.details.code === e.message && e.details.messageKey === `filmmaker.persistence.${e.message}`)
    && e4.details.problems.some((x) => x.messageKey === 'filmmaker.validation.field_forbidden'));
  const codigos = [...sinComentarios(leer('functions/src/productions/index.ts')).match(/export type CodigoDePersistencia =([\s\S]*?);/)[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
  check('Z9) cada código del almacén tiene su código de callable', codigos.length >= 20 && iguales(codigos.sort(), Object.keys(Pu.CODIGO_DE_CALLABLE).sort()));
  baseDeLaPuerta = mundo().db;
  const sinSesion = await lanza(() => Pu.productions.run({ auth: null, data: { op: 'list' } }));
  const conSesion = await Pu.productions.run({ auth: { uid: A }, data: { op: 'create', productionId: pid(5), title: 'Por la puerta', aspectRatio: '1:1', ownerAccountId: B, accountId: B } });
  check('Z10) la callable de verdad: sin sesión no hay nada, y con sesión la cuenta es la del uid',
    sinSesion?.code === 'unauthenticated' && conSesion.created === true && dato(baseDeLaPuerta, rutaRaiz(pid(5))).ownerAccountId === A);
  const paquete = leer('functions/package.json');
  check('Z11) esta suite está en la cadena de `npm test`, y las dos del emulador —reglas y callable servida por el runtime— existen y NO están', /productions-runtime\.test\.mjs/.test(paquete)
    && ['productions.emulator.mjs', 'productions-callable.emulator.mjs'].every((x) => fs.existsSync(path.resolve(RAIZ, `functions/test/${x}`)))
    && !/productions(-callable)?\.emulator/.test(paquete));
  const doc = leer('docs/FILMMAKER.md');
  const adrs = ['ADR-FM-005', 'ADR-FM-006', 'ADR-FM-007', 'ADR-FM-008', 'ADR-FM-009'];
  const secciones = adrs.map((id) => { const i = doc.indexOf(`**${id}`); const j = doc.indexOf('**ADR-FM-', i + 5); return i < 0 ? '' : doc.slice(i, j < 0 ? undefined : j); });
  check('Z12) `docs/FILMMAKER.md` tiene los cinco ADR de F1-B, cada uno con contexto, decisión, consecuencias y alternativas descartadas',
    secciones.every((s) => s && ['Contexto', 'Decisión', 'Consecuencias', 'Alternativas descartadas'].every((k) => s.includes(k))));
  check('Z13) y dice qué quedó decidido: D2 y D12, y D9 en parte', /\| D2 \|[^\n]*decidida/.test(doc) && /\| D12 \|[^\n]*decidida/.test(doc) && /\| D9 \|[^\n]*en parte/.test(doc));
});

firestoreAdmin.getFirestore = getFirestoreReal;
console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Filmmaker F1-B: ${n} comprobaciones, la producción guardada sin escrituras a medias ni pisar cambios`);
process.exit(failures ? 1 : 0);
