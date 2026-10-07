/*
 * LA SOMBRA DESDE LA PUERTA DE VERDAD — App → creatorChat → sombra → Algorithm Engine → resultado.
 *
 * ── Qué añade a lo que ya había ────────────────────────────────────────────
 *
 * `sombra-experiencia` y `sombra-sin-texto` prueban `sombraDelPlan` llamándola directamente. Ninguna suite pasaba
 * por el ÚNICO sitio que la llama en producción: `creatorChat`. Aquí se ejecuta el callable COMPILADO
 * (`functions/lib/creator/index.js`, `creatorChat.run(request)`, lo mismo que atiende a la app) con una petición de
 * Weë Travel de una cuenta de prueba nombrada en la puerta, y se compara lo que sale y lo que queda con la puerta
 * ABIERTA y con la puerta CERRADA:
 *
 *   A · La respuesta a la app es IDÉNTICA.
 *   B · Abierta: UNA sombra en creatorJobs/{jobId}/private/sombra, con su sección `algoritmo`, sus sellos de
 *       contrato y sin el texto de la persona.
 *   C · Cerrada: ni sombra, ni puente, ni Planner del Core, ni algoritmo.
 *   D · Cero efectos: ni libro (aiGenerations), ni Credits, ni materiales, ni trabajos del Core; ni motor, ni red.
 *   E · El trabajo que guarda Legacy es el mismo byte a byte, y la sombra no lo toca.
 *   F · Si la sombra se rompe —el ciclo, Firestore, la lectura de la puerta, el puente—, la respuesta no cambia.
 *   G · Lo que creatorChat le pasa a la sombra es el plan guardado y nada más (equivalencia con la llamada directa).
 *
 * ── Cómo corre sin red y sin claves ─────────────────────────────────────────
 *
 *  · Sin claves: antes de cargar nada se borran del entorno TODAS las de `functions/src/secrets.ts` (y se comprueba).
 *  · `fetch` lanza y cuenta: ninguna petición sale de esta máquina, ni a un proveedor ni a Google.
 *  · El motor (`engine.generate`) lanza y cuenta: el camino del Brain no se pide, así que nadie debe llamarlo.
 *  · Firestore en memoria (la base de `mundo3d-costes` / `puente-pre-f1d`), con un `create` que falla si el documento
 *    existe y que rechaza `undefined`, como el de verdad. Cada llamada empieza de la MISMA semilla, con el reloj
 *    congelado y los ids deterministas: por eso las comparaciones son EXACTAS, sin «módulo» de ids ni de horas.
 *  · Legacy, sin claves, planifica con la PLANTILLA: `getPlanner()` pregunta si hay quien entienda texto con
 *    estructura (`text.structure`) y no hay ninguna matriz con credencial. Determinista y sin una sola llamada.
 *
 * ── Por qué hay dos disponibilidades ────────────────────────────────────────
 *
 * creatorChat no le pasa `disponibilidad` a la sombra: su Planner del Core pregunta al REGISTRO de verdad
 * (`disponibilidadDeWee`). Sin ninguna credencial `text.search` no es enrutable, el puente sale `unsupported` y el
 * algoritmo se queda en `sin_plan_del_core`: es lo que pasa en cualquier entorno sin claves —también en los
 * emuladores— y se fija en la parte K. En producción la credencial existe. Para recorrer la decisión entera sin
 * ninguna clave se dobla SOLO esa pregunta (`disponibilidadDeWee.disponible`): lo enrutable del catálogo
 * (`disponibilidadDelCatalogo`, la misma de las otras suites de la sombra) salvo `text.structure`, para que Legacy
 * siga en la plantilla. Con eso el algoritmo llega a `decidido` (parte P).
 *
 * Nada de esto toca `functions/src` ni `functions/lib`: los dobles y los espías viven en este proceso, llaman a lo de
 * verdad y se quitan al final.
 *
 *   node functions/test/sombra-creatorchat.test.mjs     (usa el compilado: `npm run build` antes)
 */
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

/* ═══ Sin claves, antes de cargar nada ═══════════════════════════════════════════════════════════════════════════ */
const CLAVES = [
  'GEMINI_API_KEY', 'ARK_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'BFL_API_KEY',
  'ELEVENLABS_API_KEY', 'MINIMAX_API_KEY', 'SEEDANCE_CALLBACK_TOKEN', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'FAL_KEY',
];
/* Ni credencial de Google, ni pinta de función desplegada (con ella `secretValue` iría a Secret Manager), ni un modo de precio heredado. */
for (const k of [...CLAVES, 'GOOGLE_APPLICATION_CREDENTIALS', 'K_SERVICE', 'FUNCTION_TARGET', 'CREATOR_PRICING_MODE']) delete process.env[k];

/* Se cuenta Y se rechaza: una petición que saliera por error no llega a ninguna parte. */
let red = 0;
const fetchDeVerdad = globalThis.fetch;
globalThis.fetch = async () => { red++; throw new Error('esta suite no sale a la red'); };

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));

let failures = 0; let n = 0;
const check = (nombre, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${nombre}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const seccion = async (titulo, fn) => {
  console.log(`\n─── ${titulo} ───`);
  try { await fn(); } catch (e) { check(`${titulo.split(' ')[0]} · la sección termina sin lanzar`, false, String(e?.stack ?? e).split('\n').slice(0, 4).join(' · ')); }
};

/* ═══ Firestore en memoria (la base de mundo3d-costes / puente-pre-f1d), con registro de operaciones ═══════════════ */
const fa = require('firebase-admin/firestore');
const esTipo = (v, nombre) => !!v && typeof v === 'object' && v.constructor?.name === nombre;
const esPlano = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const copia = (v) => (Array.isArray(v) ? v.map(copia) : esPlano(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copia(x)])) : v);
/* Como el Firestore de Weë (sin `ignoreUndefinedProperties`): un `undefined` en cualquier parte tumba la escritura entera. */
const indefinidoEn = (v, ruta = '') => {
  if (v === undefined) return ruta || '(el documento)';
  if (Array.isArray(v) || esPlano(v)) {
    for (const [k, x] of Object.entries(v)) { const r = indefinidoEn(x, ruta ? `${ruta}.${k}` : k); if (r) return r; }
  }
  return null;
};
const resolver = (valor, previo, profundo) => {
  if (esTipo(valor, 'NumericIncrementTransform')) return (typeof previo === 'number' ? previo : 0) + valor.operand;
  if (esTipo(valor, 'ServerTimestampTransform')) return fa.Timestamp.now();
  if (esTipo(valor, 'DeleteTransform')) return undefined;
  if (esTipo(valor, 'ArrayUnionTransform')) {
    const lista = Array.isArray(previo) ? [...previo] : [];
    for (const e of valor.elements ?? []) if (!lista.some((x) => isDeepStrictEqual(x, e))) lista.push(copia(e));
    return lista;
  }
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
  constructor() {
    this.docs = new Map();
    /* Todo lo que se pide, en orden: lecturas, consultas y escrituras (las fallidas con «!»). */
    this.ops = [];
    /* Solo lo que llegó a escribirse. */
    this.escrituras = [];
    this.cola = Promise.resolve();
    this.auto = 0;
    /* Fallos inyectados por ruta: { get(ruta) → Error|null, create(ruta) → Error|null }. */
    this.fallos = {};
  }
  collection(p) { return new Consulta(this, p); }
  doc(p) { return new Ref(this, p); }
  runTransaction(fn) {
    const correr = async () => { const tx = new Tx(this); const r = await fn(tx); tx.confirmar(); return r; };
    const p = this.cola.then(correr, correr);
    this.cola = p.catch(() => {});
    return p;
  }
  batch() {
    const pendientes = [];
    const b = {
      set: (ref, data, opts) => { pendientes.push({ tipo: 'set', ref, data, merge: !!opts?.merge }); return b; },
      update: (ref, data) => { pendientes.push({ tipo: 'update', ref, data }); return b; },
      delete: (ref) => { pendientes.push({ tipo: 'delete', ref }); return b; },
      commit: async () => { for (const w of pendientes) escribir(this, w); },
    };
    return b;
  }
}
const escribir = (base, w) => {
  const ruta = w.ref.path;
  const fallar = (e) => { base.ops.push(`${w.tipo}! ${ruta}`); throw e; };
  const donde = w.tipo === 'delete' ? null : indefinidoEn(w.data);
  if (donde) fallar(new Error(`Cannot use "undefined" as a Firestore value (found in field "${donde}")`));
  if (w.tipo === 'create') {
    const inyectado = base.fallos.create?.(ruta);
    if (inyectado) fallar(inyectado);
    if (base.docs.has(ruta)) fallar(yaExiste(ruta));
  }
  const previo = base.docs.get(ruta);
  if (w.tipo === 'update' && !previo) fallar(new Error(`update sobre un documento que no existe: ${ruta}`));
  base.ops.push(`${w.tipo} ${ruta}`);
  base.escrituras.push(`${w.tipo} ${ruta}`);
  if (w.tipo === 'delete') { base.docs.delete(ruta); return; }
  if (w.tipo === 'create') { base.docs.set(ruta, resolver(w.data, undefined, true)); return; }
  if (w.tipo === 'set') { base.docs.set(ruta, resolver(w.data, w.merge ? (previo || {}) : undefined, true)); return; }
  const out = { ...previo };
  for (const [k, v] of Object.entries(w.data)) { const r = resolver(v, out[k], false); if (r === undefined) delete out[k]; else out[k] = r; }
  base.docs.set(ruta, out);
};
const foto = (ref, d) => ({ exists: d !== undefined, id: ref.id, ref, data: () => d, get: (f) => (d === undefined ? undefined : leerCampo(d, f)) });
class Ref {
  constructor(base, p) { this.base = base; this.path = p; this.id = p.split('/').pop(); }
  collection(c) { return new Consulta(this.base, `${this.path}/${c}`); }
  async get() {
    const inyectado = this.base.fallos.get?.(this.path);
    this.base.ops.push(`get${inyectado ? '!' : ''} ${this.path}`);
    if (inyectado) throw inyectado;
    return foto(this, this.base.docs.has(this.path) ? copia(this.base.docs.get(this.path)) : undefined);
  }
  async create(data) { escribir(this.base, { tipo: 'create', ref: this, data }); }
  async set(data, opts) { escribir(this.base, { tipo: 'set', ref: this, data, merge: !!opts?.merge }); }
  async update(data) { escribir(this.base, { tipo: 'update', ref: this, data }); }
  async delete() { escribir(this.base, { tipo: 'delete', ref: this }); }
}
class Consulta {
  constructor(base, p, filtros = [], tope = null) { Object.assign(this, { base, path: p, filtros, tope }); }
  /* Ids automáticos DETERMINISTAS (20 caracteres, como los de Firestore): el mismo en cada ejecución que empieza de cero. */
  doc(id) { return new Ref(this.base, `${this.path}/${id ?? `sombraCC${String(++this.base.auto).padStart(12, '0')}`}`); }
  where(campo, op, valor) {
    if (op !== '==') throw new Error(`esta base de prueba solo sabe «==»: ${op}`);
    return new Consulta(this.base, this.path, [...this.filtros, [campo, valor]], this.tope);
  }
  limit(tope) { return new Consulta(this.base, this.path, this.filtros, tope); }
  orderBy() { return this; }
  async get() {
    this.base.ops.push(`query ${this.path}${this.filtros.length ? ` ${this.filtros.map(([f, v]) => `${f}==${v}`).join(',')}` : ''}`);
    let filas = [...this.base.docs.entries()].filter(([p]) => p.startsWith(`${this.path}/`) && !p.slice(this.path.length + 1).includes('/'));
    filas = filas.filter(([, d]) => this.filtros.every(([f, v]) => leerCampo(d, f) === v));
    if (this.tope) filas = filas.slice(0, this.tope);
    const docs = filas.map(([p, d]) => foto(new Ref(this.base, p), copia(d)));
    return { docs, empty: !docs.length, size: docs.length, forEach: (fn) => docs.forEach(fn) };
  }
}
class Tx {
  constructor(base) { this.base = base; this.pendientes = []; }
  get(objetivo) { return objetivo.get(); }
  create(ref, data) { this.pendientes.push({ tipo: 'create', ref, data }); return this; }
  set(ref, data, opts) { this.pendientes.push({ tipo: 'set', ref, data, merge: !!opts?.merge }); return this; }
  update(ref, data) { this.pendientes.push({ tipo: 'update', ref, data }); return this; }
  delete(ref) { this.pendientes.push({ tipo: 'delete', ref }); return this; }
  confirmar() { for (const w of this.pendientes) escribir(this.base, w); }
}

let baseActual = new Base();
const getFirestoreDeVerdad = fa.getFirestore;
fa.getFirestore = () => baseActual;

/* ═══ Weë, compilado y de verdad ═════════════════════════════════════════════════════════════════════════════════ */
const creatorMod = lib('creator/index.js');
const sombraMod = lib('creator/sombra.js');
const plannerCreatorMod = lib('creator/planner.js');
const plannerMod = lib('planner/index.js');
const necesidadesMod = lib('creator/necesidades.js');
const cicloMod = lib('core/algorithm/integration-cycle.js');
const algoritmoMod = lib('core/algorithm/index.js');
const engineMod = lib('engine/index.js');
const { invalidateConfig } = lib('engine/config.js');
const { invalidateCostOverrides } = lib('credits/creditCosts.js');
const { olvidarRegistro } = lib('registry/index.js');
const { welcomeTransactionId } = lib('credits/creditTransactions.js');
const { ALGORITHM_CONTRACT_VERSION } = lib('core/contracts.js');
const { PROVIDER_SECRET_NAMES, MEDIA_SECRET_NAMES, FAL_SECRET_NAMES } = lib('secrets.js');
const {
  CLAVE_DE_LA_SOMBRA, CONTRATO_DE_LA_SOMBRA, COLECCION_DE_LA_SOMBRA, DOCUMENTO_DE_LA_SOMBRA, CATEGORIAS_DE_LA_COMPARACION,
  olvidarLaSombra, disponibilidadDelCatalogo, seccionPresentable,
} = sombraMod;
const { TOPES_POR_DEFECTO } = algoritmoMod;
/* Y las que declare secrets.ts aunque la lista de arriba se quede vieja (la parte 0 lo señala). El registro, sin ninguna. */
for (const k of [...PROVIDER_SECRET_NAMES, ...MEDIA_SECRET_NAMES, ...FAL_SECRET_NAMES]) delete process.env[k];
olvidarRegistro();

/* ═══ Dobles y espías: viven en este proceso y llaman a lo de verdad ════════════════════════════════════════════ */
const modo = { disponibilidad: 'registro', ciclo: 'real', puente: 'real' };
const nuevoEspia = () => ({ disponibilidad: [], puente: 0, planners: 0, planificar: [], ciclos: 0, decisiones: 0, motor: 0, sombras: [] });
let espia = nuevoEspia();
let motorEnTotal = 0;

/* La ÚNICA pregunta que se dobla: «¿qué puede servir Weë?». En modo «registro», la respuesta de verdad. */
const catalogo = disponibilidadDelCatalogo();
const comoProduccion = { disponible: (c) => c !== 'text.structure' && catalogo.disponible(c) };
const disponibleDeVerdad = plannerMod.disponibilidadDeWee.disponible;
plannerMod.disponibilidadDeWee.disponible = (c) => {
  espia.disponibilidad.push(c);
  return modo.disponibilidad === 'catalogo' ? comoProduccion.disponible(c) : disponibleDeVerdad.call(plannerMod.disponibilidadDeWee, c);
};
/* El puente (G13.5): se cuenta; en modo «roto», lanza. */
const puenteDeVerdad = necesidadesMod.pasosParaElCore;
necesidadesMod.pasosParaElCore = (...a) => {
  espia.puente++;
  if (modo.puente === 'roto') throw new Error('el puente explotó');
  return puenteDeVerdad(...a);
};
/* El Planner del Core: se cuenta cada uno y cada `planificar`, con su requestId (el sello dice qué camino planificó). */
const crearPlannerDeVerdad = plannerMod.crearPlannerDeWee;
plannerMod.crearPlannerDeWee = (deps) => {
  espia.planners++;
  const p = crearPlannerDeVerdad(deps);
  return { ...p, planificar: (peticion) => { espia.planificar.push(String(peticion?.trace?.requestId)); return p.planificar(peticion); } };
};
/* El ciclo del Algorithm Engine: el de verdad, contado; en modo «roto», uno que lanza al decidir. */
const crearCicloDeVerdad = cicloMod.crearCicloAlgoritmico;
cicloMod.crearCicloAlgoritmico = (...a) => {
  espia.ciclos++;
  if (modo.ciclo === 'roto') return { decidir: () => { espia.decisiones++; throw new Error('el ciclo explotó'); }, cerrar: () => {} };
  const c = crearCicloDeVerdad(...a);
  return { ...c, decidir: (peticion) => { espia.decisiones++; return c.decidir(peticion); } };
};
/* El motor: con los caminos puente+algoritmo nadie debe llamarlo. Si alguien lo hace, se cuenta y no llega a ningún sitio. */
const generarDeVerdad = engineMod.engine.generate;
engineMod.engine.generate = async () => { espia.motor++; motorEnTotal++; throw new Error('el motor no se llama en esta suite'); };
/* La sombra: la de verdad, observada. Se anota lo que recibió, lo que devolvió y el trabajo antes y después de ella. */
const serial = (d) => (d === undefined ? 'undefined' : JSON.stringify(d));
const sombraDeVerdad = sombraMod.sombraDelPlan;
sombraMod.sombraDelPlan = async (entrada) => {
  const base = baseActual;
  const ruta = entrada?.jobRef?.path;
  const trabajoAntes = serial(base.docs.get(ruta));
  const planAntes = JSON.stringify(entrada?.legacyPlan);
  const resultado = await sombraDeVerdad(entrada);
  espia.sombras.push({
    resultado, ruta, claves: Object.keys(entrada ?? {}).sort(), puerta: copia(entrada?.puerta),
    jobId: entrada?.jobId, userId: entrada?.userId, experienceId: entrada?.experienceId, goal: entrada?.goal,
    trabajoAntes, trabajoDespues: serial(base.docs.get(ruta)),
    planIntacto: JSON.stringify(entrada?.legacyPlan) === planAntes,
    planIgualAlGuardado: JSON.stringify(entrada?.legacyPlan) === JSON.stringify(base.docs.get(ruta)?.plan),
  });
  return resultado;
};

/* ═══ El escenario ═══════════════════════════════════════════════════════════════════════════════════════════════ */
/* El instante de cada llamada: el reloj se congela aquí mientras corre creatorChat. */
const RELOJ = Date.UTC(2026, 9, 6, 12, 0, 0);
/* Alfanuméricas: ids de cuenta válidos para el Credit Engine y etiquetas válidas para la puerta. */
const UID = 'SombraCanaryTravel01';
const OTRA = 'OtraCuentaFueraDeLaPrueba02';
const RUTA_DE_LA_PUERTA = `${COLECCION_DE_LA_SOMBRA}/${DOCUMENTO_DE_LA_SOMBRA}`;
/* La puerta de la tarea: la cuenta de prueba, Travel, y los dos caminos sin red (puente + algoritmo). LOCAL, de mentira. */
const PUERTA = Object.freeze({ habilitado: true, cuentas: [UID], caminos: ['puente', 'algoritmo'], experiencias: ['travel'] });
/* Lo que escribe la persona, con una marca imposible de confundir. Con «qué hacer», Legacy pone el objetivo entero en el `brief` del paso. */
const MARCA = 'SOMBRA_CC_MARCA_9f31';
const GOAL = `Qué hacer y dónde comer en Lisboa, sin prisas ${MARCA}`;
const PETICION = Object.freeze({ experienceId: 'travel', goal: GOAL, presetAnswers: [{ questionId: 'what', optionId: 'doing' }], locale: 'es-ES' });

/* Una cuenta con su billetera ya hecha (como las cuentas de prueba de la canary): `ensureAccount` no tiene nada que escribir. */
const sembrar = (base, puerta) => {
  base.docs.set(`users/${UID}`, {
    uid: UID, profileType: 'real', displayName: 'Cuenta de prueba de la sombra',
    creditsBalance: 240, creditsLifetimeEarned: 240, creditsLifetimeSpent: 0, creditsInitializedAt: fa.Timestamp.fromMillis(RELOJ - 86_400_000),
  });
  base.docs.set(`creditTransactions/${welcomeTransactionId(UID)}`, {
    id: welcomeTransactionId(UID), userId: UID, type: 'grant', amount: 240, balanceBefore: 0, balanceAfter: 240,
    reason: 'Credits de bienvenida', source: 'welcome', status: 'COMPLETED', requestId: welcomeTransactionId(UID),
  });
  if (puerta !== undefined) base.docs.set(RUTA_DE_LA_PUERTA, copia(puerta));
};

/**
 * Una llamada (o varias a la vez) a `creatorChat.run`, como la app: misma semilla, cachés vaciadas, reloj congelado,
 * consola recogida. Con `base` se sigue sobre una base anterior (otra vuelta de la misma conversación).
 */
const correr = async ({ puerta, peticiones, disponibilidad = 'registro', ciclo = 'real', puente = 'real', fallos = {}, base: dada, uid = UID }) => {
  const base = dada ?? new Base();
  if (!dada) sembrar(base, puerta);
  base.fallos = fallos;
  base.ops = [];
  base.escrituras = [];
  baseActual = base;
  Object.assign(modo, { disponibilidad, ciclo, puente });
  espia = nuevoEspia();
  olvidarLaSombra(); invalidateConfig(); invalidateCostOverrides();
  const lineas = [];
  const consola = { log: console.log, warn: console.warn, error: console.error };
  const anotar = (...a) => lineas.push(a.map((x) => (x instanceof Error ? `${x.name}: ${x.message}` : String(x))).join(' '));
  console.log = anotar; console.warn = anotar; console.error = anotar;
  const ahoraDeVerdad = Date.now;
  Date.now = () => RELOJ;
  const redAntes = red;
  let salidas = [];
  try {
    salidas = await Promise.all(peticiones.map((data) => creatorMod.creatorChat.run({ auth: { uid }, data: copia(data) })
      .then((respuesta) => ({ respuesta }), (error) => ({ error }))));
  } finally {
    Date.now = ahoraDeVerdad;
    Object.assign(console, consola);
  }
  const primera = salidas[0] ?? {};
  return { base, salidas, respuesta: primera.respuesta, error: primera.error, jobId: primera.respuesta?.jobId, lineas, red: red - redAntes, espia };
};

/* ── Lo que se mira ── */
const rutaDelTrabajo = (r) => `creatorJobs/${r.jobId}`;
const rutaDeLaSombra = (r) => `creatorJobs/${r.jobId}/private/${CLAVE_DE_LA_SOMBRA}`;
const trabajo = (r) => serial(r.base.docs.get(rutaDelTrabajo(r)));
const privadas = (r) => [...r.base.docs.keys()].filter((p) => p.includes('/private/'));
const estado = (base) => new Map([...base.docs.entries()].map(([p, d]) => [p, serial(d)]));
const diferencia = (a, b, ignorar = []) => {
  const fuera = (p) => ignorar.includes(p);
  return {
    soloA: [...a.keys()].filter((p) => !fuera(p) && !b.has(p)),
    soloB: [...b.keys()].filter((p) => !fuera(p) && !a.has(p)),
    distintos: [...a.keys()].filter((p) => !fuera(p) && b.has(p) && a.get(p) !== b.get(p)),
  };
};
const contar = (base, coleccion) => [...base.docs.keys()].filter((p) => p.startsWith(`${coleccion}/`)).length;
const huella = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 12);
const clavesDe = (v, out = new Set()) => { if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { out.add(k); clavesDe(x, out); } return out; };
const primeraDiferencia = (a, b, ruta = 'respuesta') => {
  if (isDeepStrictEqual(a, b)) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = primeraDiferencia(a[k], b[k], `${ruta}.${k}`); if (d) return d; }
    return `${ruta}: mismas claves, otro prototipo`;
  }
  return `${ruta}: ${String(JSON.stringify(a)).slice(0, 80)} ≠ ${String(JSON.stringify(b)).slice(0, 80)}`;
};
/* Donde dejaría rastro cualquier efecto: el libro y el uso, el dinero, los materiales y los trabajos del Core. */
const EFECTOS = ['aiGenerations', 'aiUsage', 'creatorUsage', 'brainUsage', 'aiRateLimits', 'creditStats', 'assets', 'mediaObjects',
  'elements', 'projectItems', 'jobs', 'workflowRuns', 'jobQueue', 'brainChats', 'aiProviderCallbacks'];
const sinEfectos = (r) => EFECTOS.every((c) => contar(r.base, c) === 0) && contar(r.base, 'creditTransactions') === 1
  && r.base.docs.get(`users/${UID}`)?.creditsBalance === 240 && r.base.docs.get(`users/${UID}`)?.creditsLifetimeSpent === 0;
/* Lo que recibe la sombra de creatorChat, ni una clave más: sin disponibilidad, sin ciclo, sin cronómetro, sin reloj. */
const CLAVES_DE_LA_ENTRADA = ['entendimientoDe', 'experienceId', 'goal', 'jobId', 'jobRef', 'legacyPlan', 'puerta', 'userId'];

/**
 * A–E para una pareja de llamadas idénticas que solo se distinguen por la puerta. `algoritmo` y `puente` son los
 * estados que se esperan en la sombra; `motivoCerrada`, por qué la sombra no corre en la cerrada.
 */
const comprobarPar = (et, cerrada, abierta, { algoritmo, puente, motivoCerrada, textos }) => {
  const contestan = !cerrada.error && !abierta.error && !!cerrada.respuesta && !!abierta.respuesta;
  check(`${et} · las dos llamadas contestan y dejan el trabajo «planned»`,
    contestan && cerrada.respuesta.status === 'planned' && abierta.respuesta.status === 'planned',
    contestan ? `${cerrada.respuesta.status}/${abierta.respuesta.status}` : `${cerrada.error?.message ?? ''} | ${abierta.error?.message ?? ''}`);

  /* A · la respuesta */
  check(`${et} · A) la respuesta a la app es IDÉNTICA con la puerta abierta y con la puerta cerrada (deep-equal exacto: mismo id, mismo plan, mismo precio)`,
    contestan && isDeepStrictEqual(abierta.respuesta, cerrada.respuesta),
    contestan ? (primeraDiferencia(cerrada.respuesta, abierta.respuesta)
      ?? `huella ${huella(JSON.stringify(abierta.respuesta))} · ${abierta.respuesta.plan?.steps?.length} paso(s) · ${abierta.respuesta.creditsEstimated} Credits`) : 'sin respuesta');

  /* E · el trabajo de Legacy */
  const tc = trabajo(cerrada);
  const ta = trabajo(abierta);
  check(`${et} · E) el trabajo que guardó Legacy es el MISMO byte a byte`, tc !== 'undefined' && tc === ta, `${huella(tc)} / ${huella(ta)} · ${tc.length} bytes`);
  const vista = abierta.espia.sombras[0];
  check(`${et} · E) y la sombra no lo tocó: el mismo antes y después de ella, y el plan que recibió es el guardado, sin un cambio`,
    abierta.espia.sombras.length === 1 && vista.trabajoAntes === vista.trabajoDespues && vista.trabajoDespues === ta
    && vista.planIntacto === true && vista.planIgualAlGuardado === true,
    vista ? `antes=${huella(vista.trabajoAntes)} después=${huella(vista.trabajoDespues)} plan intacto=${vista.planIntacto}` : 'la sombra no se llamó');

  /* B · la sombra, abierta */
  const s = abierta.base.docs.get(rutaDeLaSombra(abierta));
  check(`${et} · B) abierta: UNA sola sombra, en creatorJobs/{jobId}/private/${CLAVE_DE_LA_SOMBRA}`,
    privadas(abierta).length === 1 && !!s && vista?.resultado?.escrita === true, privadas(abierta).join(', ') || 'ninguna');
  check(`${et} · B) su sección del algoritmo acaba en «${algoritmo}» y el plan del puente en «${puente}»`,
    s?.algoritmo?.estado === algoritmo && s?.coreDesdePuente?.status === puente && vista?.resultado?.algoritmo === algoritmo,
    `algoritmo=${s?.algoritmo?.estado} (${s?.algoritmo?.duracionMs} ms) · puente=${s?.coreDesdePuente?.status}`);
  check(`${et} · B) sellos: sombra ${CONTRATO_DE_LA_SOMBRA}, algoritmo ${ALGORITHM_CONTRACT_VERSION}, shadowRunId «jobId:algoritmo», caminos puente+algoritmo, Brain «omitido» y sin sus secciones; el trabajo, la cuenta y Travel`,
    s?.contract === CONTRATO_DE_LA_SOMBRA && s?.algoritmo?.contract === ALGORITHM_CONTRACT_VERSION
    && s?.algoritmo?.shadowRunId === `${abierta.jobId}:algoritmo` && isDeepStrictEqual(s?.caminos, ['puente', 'algoritmo'])
    && s?.estado === 'omitido' && ['core', 'coreDesdeBrain', 'autoridad', 'regresion', 'errores'].every((k) => !(k in (s ?? {})))
    && s?.jobId === abierta.jobId && s?.userId === UID && s?.experienceId === 'travel' && s?.creadaEn === RELOJ,
    `contract=${s?.contract} · algoritmo.contract=${s?.algoritmo?.contract} · shadowRunId=${s?.algoritmo?.shadowRunId}`);
  const enLaSombra = JSON.stringify(s ?? {});
  check(`${et} · B) sin texto de la persona: ni el objetivo ni su marca —que el trabajo de Legacy SÍ guarda—, ni una clave goal/brief, y la sección se puede guardar`,
    !!s && textos.every((t) => ta.includes(t)) && textos.every((t) => !enLaSombra.includes(t))
    && !clavesDe(s).has('goal') && !clavesDe(s).has('brief') && seccionPresentable(s.algoritmo),
    `en el trabajo ${textos.filter((t) => ta.includes(t)).length}/${textos.length} · en la sombra ${textos.filter((t) => enLaSombra.includes(t)).length}/${textos.length}`);
  check(`${et} · B) sus avisos tampoco: «empieza» y «termina … algoritmo=${algoritmo}», sin el objetivo`,
    abierta.lineas.some((l) => l.startsWith('WEË SOMBRA: empieza '))
    && abierta.lineas.some((l) => l.startsWith('WEË SOMBRA: termina ') && l.includes(` algoritmo=${algoritmo} `))
    && abierta.lineas.every((l) => textos.every((t) => !l.includes(t))),
    abierta.lineas.filter((l) => l.startsWith('WEË SOMBRA')).join(' | '));

  /* C · cerrada */
  const ciclos = algoritmo === 'sin_plan_del_core' ? 0 : 1;
  const rc = cerrada.espia.sombras[0]?.resultado;
  check(`${et} · C) cerrada: ninguna sombra, y la sombra lo dice («no_corre» · ${motivoCerrada})`,
    privadas(cerrada).length === 0 && cerrada.espia.sombras.length === 1 && rc?.escrita === false && rc?.estado === 'no_corre' && rc?.motivo === motivoCerrada,
    JSON.stringify(rc));
  check(`${et} · C) cerrada: ni puente, ni Planner del Core, ni ciclo; ni se lee private/sombra; la disponibilidad solo la pregunta Legacy (text.structure)`,
    cerrada.espia.puente === 0 && cerrada.espia.planners === 0 && cerrada.espia.planificar.length === 0 && cerrada.espia.ciclos === 0
    && cerrada.espia.decisiones === 0 && !cerrada.base.ops.some((o) => o.includes('/private/'))
    && isDeepStrictEqual(cerrada.espia.disponibilidad, ['text.structure']),
    `puente=${cerrada.espia.puente} planner=${cerrada.espia.planners} ciclo=${cerrada.espia.ciclos} disponibilidad=[${cerrada.espia.disponibilidad.join(',')}]`);
  check(`${et} · C) abierta, en cambio: un puente, un Planner que planifica con el sello del puente (nunca el del Brain) y ${ciclos} ciclo(s)`,
    abierta.espia.puente === 1 && abierta.espia.planners === 1 && isDeepStrictEqual(abierta.espia.planificar, [`${abierta.jobId}:sombra-puente`])
    && abierta.espia.ciclos === ciclos && abierta.espia.decisiones === ciclos,
    `puente=${abierta.espia.puente} planner=${abierta.espia.planners} planificar=[${abierta.espia.planificar.join(',')}] ciclo=${abierta.espia.ciclos}`);

  /* D · ningún efecto */
  const d = diferencia(estado(cerrada.base), estado(abierta.base), [RUTA_DE_LA_PUERTA]);
  check(`${et} · D) TODA la base de datos (salvo la puerta, que es la entrada): lo único distinto es la sombra privada`,
    d.soloA.length === 0 && d.distintos.length === 0 && isDeepStrictEqual(d.soloB, [rutaDeLaSombra(abierta)]),
    `solo cerrada=[${d.soloA.join(',')}] · solo abierta=[${d.soloB.join(',')}] · distintos=[${d.distintos.join(',')}]`);
  check(`${et} · D) escrituras: cerrada = [el trabajo]; abierta = [el trabajo, la sombra], ni una más`,
    isDeepStrictEqual(cerrada.base.escrituras, [`set ${rutaDelTrabajo(cerrada)}`])
    && isDeepStrictEqual(abierta.base.escrituras, [`set ${rutaDelTrabajo(abierta)}`, `create ${rutaDeLaSombra(abierta)}`]),
    `cerrada=[${cerrada.base.escrituras.join(', ')}] · abierta=[${abierta.base.escrituras.join(', ')}]`);
  const deLaSombra = [`get ${rutaDeLaSombra(abierta)}`, `create ${rutaDeLaSombra(abierta)}`];
  const iPuerta = abierta.base.ops.indexOf(`get ${RUTA_DE_LA_PUERTA}`);
  check(`${et} · D) lo único que la sombra le pide a Firestore: leer y crear SU documento, justo después de leer la puerta, y la puerta después de guardar el trabajo`,
    isDeepStrictEqual(abierta.base.ops.filter((o) => !deLaSombra.includes(o)), cerrada.base.ops)
    && iPuerta > abierta.base.ops.indexOf(`set ${rutaDelTrabajo(abierta)}`) && abierta.base.ops.indexOf(`set ${rutaDelTrabajo(abierta)}`) >= 0
    && isDeepStrictEqual(abierta.base.ops.slice(iPuerta + 1, iPuerta + 3), deLaSombra),
    `${abierta.base.ops.length} operaciones abierta · ${cerrada.base.ops.length} cerrada`);
  const efectos = EFECTOS.map((c) => [c, contar(abierta.base, c)]).filter(([, k]) => k > 0);
  check(`${et} · D) cero libro, cero uso, cero Credits movidos, cero materiales, cero trabajos del Core; cero motor y cero red`,
    sinEfectos(abierta) && sinEfectos(cerrada) && abierta.espia.motor === 0 && cerrada.espia.motor === 0 && abierta.red === 0 && cerrada.red === 0,
    efectos.map(([c, k]) => `${c}=${k}`).join(' ')
      || `saldo ${abierta.base.docs.get(`users/${UID}`)?.creditsBalance} · ${contar(abierta.base, 'creditTransactions')} movimiento (la bienvenida sembrada) · motor ${abierta.espia.motor} · red ${abierta.red}`);
};

/* Resultados que se reutilizan entre partes. */
let K = {};
let P = {};

await seccion('0 · Sin red, sin claves, Legacy determinista', async () => {
  const nombres = [...PROVIDER_SECRET_NAMES, ...MEDIA_SECRET_NAMES, ...FAL_SECRET_NAMES];
  check('ninguna clave en el entorno, y la lista que se borra ANTES de cargar nada cubre todas las de functions/src/secrets.ts',
    nombres.length >= 12 && nombres.every((k) => process.env[k] === undefined && CLAVES.includes(k)),
    `${nombres.length} nombres${nombres.some((k) => !CLAVES.includes(k)) ? ` · faltan en CLAVES: ${nombres.filter((k) => !CLAVES.includes(k)).join(',')}` : ''}`);
  modo.disponibilidad = 'registro';
  const searchDeVerdad = plannerMod.disponibilidadDeWee.disponible('text.search');
  const structureDeVerdad = plannerMod.disponibilidadDeWee.disponible('text.structure');
  const legacyDeVerdad = plannerCreatorMod.getPlanner();
  modo.disponibilidad = 'catalogo';
  const searchDoblado = plannerMod.disponibilidadDeWee.disponible('text.search');
  const legacyDoblado = plannerCreatorMod.getPlanner();
  modo.disponibilidad = 'registro';
  check('sin credenciales, el registro de verdad no enruta ni `text.search` ni `text.structure`', searchDeVerdad === false && structureDeVerdad === false);
  check('Legacy planifica con la PLANTILLA con y sin el doble (nadie sirve `text.structure`); el doble solo enciende lo enrutable, como `text.search`',
    legacyDeVerdad === plannerCreatorMod.templatePlanner && legacyDoblado === plannerCreatorMod.templatePlanner && searchDoblado === true);
  check('los espías son lo que ve la sombra: el índice del Algorithm Engine re-exporta el ciclo espiado, no el original',
    algoritmoMod.crearCicloAlgoritmico === cicloMod.crearCicloAlgoritmico && cicloMod.crearCicloAlgoritmico !== crearCicloDeVerdad);
  /*
   * CALENTAMIENTO. La primera decisión de un proceso paga la compilación del motor, y el tope del algoritmo (250 ms)
   * mide lo que tarda en decidir, no eso: con cuatro suites a la vez, el primer `decidir` en frío podría pasarse sin
   * que el código cambiara. Una sombra suelta, en una base que se tira, antes de medir nada.
   */
  await sombraDeVerdad({
    jobRef: new Base().collection('creatorJobs').doc('calentamiento'), jobId: 'calentamiento', userId: UID, experienceId: 'travel',
    goal: 'calentamiento', legacyPlan: { experience: 'travel', goal: 'calentamiento', explainToUser: '-', steps: [{ id: 'activities', capability: 'text.search', purpose: '-', input: { kind: 'activities', brief: '-' } }] },
    puerta: PUERTA, entendimientoDe: async () => undefined, disponibilidad: comoProduccion, ahora: () => RELOJ, observar: () => {},
  });
});

await seccion('K · Sin claves, con la disponibilidad DE VERDAD: el puente no tiene plan y el algoritmo no decide', async () => {
  const cerrada = await correr({ puerta: undefined, peticiones: [PETICION] });
  const abierta = await correr({ puerta: PUERTA, peticiones: [PETICION] });
  K = { cerrada, abierta };
  comprobarPar('K', cerrada, abierta, { algoritmo: 'sin_plan_del_core', puente: 'unsupported', motivoCerrada: 'sin_configuracion', textos: [GOAL, MARCA] });
  const s = abierta.base.docs.get(rutaDeLaSombra(abierta));
  check('K · por qué: el Planner del Core preguntó al REGISTRO por `text.search` y, sin credencial, no es enrutable; sin plan del Core no hay sobre qué decidir',
    abierta.espia.disponibilidad.includes('text.search') && s?.algoritmo?.decision === null && s?.algoritmo?.entrada?.pasos === 0
    && (s?.regresionDesdePuente?.diferencias ?? []).some((x) => x.campo === 'status' && /core=unsupported/.test(x.evidencia)),
    `disponibilidad=[${abierta.espia.disponibilidad.join(',')}] · decision=${JSON.stringify(s?.algoritmo?.decision)}`);
  check('K · y es porque creatorChat no le pasa a la sombra ni `disponibilidad`, ni ciclo, ni cronómetro, ni reloj: solo estas ocho claves',
    isDeepStrictEqual(abierta.espia.sombras[0]?.claves, CLAVES_DE_LA_ENTRADA), (abierta.espia.sombras[0]?.claves ?? []).join(','));
});

await seccion('P · Con lo que producción puede enrutar (doble de la disponibilidad): el algoritmo DECIDE', async () => {
  const cerrada = await correr({ puerta: undefined, peticiones: [PETICION], disponibilidad: 'catalogo' });
  const abierta = await correr({ puerta: PUERTA, peticiones: [PETICION], disponibilidad: 'catalogo' });
  P = { cerrada, abierta };
  comprobarPar('P', cerrada, abierta, { algoritmo: 'decidido', puente: 'ready', motivoCerrada: 'sin_configuracion', textos: [GOAL, MARCA] });
  const a = abierta.base.docs.get(rutaDeLaSombra(abierta))?.algoritmo;
  const el = a?.decision?.elegida;
  check(`P · la decisión: la línea base en fila con los MISMOS pasos que el plan del Core, 0 violaciones, sin historial, propuesta por un motor con versión y dentro de su tope (${TOPES_POR_DEFECTO.maxLatencyMs} ms)`,
    a?.decision?.status === 'decided' && a?.violaciones === 0 && a?.decision?.historial === 'ninguno'
    && el?.esLineaBase === true && el?.esRespaldo === false && el?.pasosIgualesAlPlanDelCore === true && isDeepStrictEqual(el?.gruposParalelos, [])
    && /@\d+$/.test(el?.proposedBy ?? '') && a?.entrada?.pasos === 1 && isDeepStrictEqual(a?.entrada?.capacidades, ['text.search'])
    && typeof a?.duracionMs === 'number' && a.duracionMs >= 0 && a.duracionMs <= TOPES_POR_DEFECTO.maxLatencyMs,
    `${el?.label} · ${el?.proposedBy} · ${a?.decision?.candidatas} candidata(s) · ${a?.duracionMs} ms`);
  const c = a?.comparacion;
  const sumas = Object.fromEntries(Object.keys(c?.resumen ?? {}).map((k) => [k, c.categorias?.[k]]));
  check('P · la comparación: las 8 categorías, cada diferencia marcada «algoritmo», el resumen cuadra, y ni AUTHORITY_VIOLATION ni SHADOW_ERROR',
    isDeepStrictEqual(Object.keys(c?.categorias ?? {}), [...CATEGORIAS_DE_LA_COMPARACION]) && (c?.diferencias ?? []).length > 0
    && c.diferencias.every((x) => x.camino === 'algoritmo') && isDeepStrictEqual(sumas, c?.resumen)
    && c?.categorias?.AUTHORITY_VIOLATION === 0 && c?.categorias?.SHADOW_ERROR === 0,
    JSON.stringify(c?.categorias));
  check('P · el doble no toca a Legacy: la respuesta y el trabajo son los mismos que sin él (K cerrada = P cerrada)',
    !!K.cerrada?.respuesta && isDeepStrictEqual(K.cerrada.respuesta, cerrada.respuesta) && trabajo(K.cerrada) === trabajo(cerrada),
    `${huella(JSON.stringify(K.cerrada?.respuesta))} / ${huella(JSON.stringify(cerrada.respuesta))}`);
});

await seccion('I · Otro encargo de Travel —un itinerario, fechas por decidir—: lo mismo', async () => {
  const goal = `Organizar un viaje a Lisboa de cinco días ${MARCA}`;
  const peticion = {
    experienceId: 'travel', goal, locale: 'es-ES',
    presetAnswers: [{ questionId: 'what', optionId: 'plan' }, { questionId: 'dates', optionId: 'idk' }, { questionId: 'interest', optionId: 'food' }, { questionId: 'pace', optionId: 'slow' }],
  };
  const cerrada = await correr({ puerta: undefined, peticiones: [peticion], disponibilidad: 'catalogo' });
  const abierta = await correr({ puerta: PUERTA, peticiones: [peticion], disponibilidad: 'catalogo' });
  check('I · el plan de Legacy es el itinerario (un paso de búsqueda), no «qué hacer»',
    abierta.respuesta?.plan?.steps?.length === 1 && abierta.respuesta.plan.steps[0].input?.kind === 'itinerary',
    `${abierta.respuesta?.plan?.steps?.map((x) => `${x.capability}/${x.input?.kind}`).join(',')}`);
  comprobarPar('I', cerrada, abierta, { algoritmo: 'decidido', puente: 'ready', motivoCerrada: 'sin_configuracion', textos: [goal, MARCA] });
});

await seccion('C · La puerta decide, y solo ella: cerrada de cualquier forma, la respuesta no cambia', async () => {
  const ref = P.cerrada;
  const variantes = [
    ['deshabilitada', { ...PUERTA, habilitado: false }, 'deshabilitada'],
    ['otra cuenta', { ...PUERTA, cuentas: [OTRA] }, 'cuenta_fuera_de_la_prueba'],
    ['comodín «*»', { ...PUERTA, cuentas: ['*'] }, 'configuracion_ilegible'],
    ['sin lista de cuentas', { habilitado: true, caminos: ['puente', 'algoritmo'], experiencias: ['travel'] }, 'sin_lista_de_cuentas'],
    ['otra experiencia', { ...PUERTA, experiencias: ['writer'] }, 'experiencia_fuera_de_la_prueba'],
    ['otra capacidad', { ...PUERTA, capacidades: ['text.generate'] }, 'capacidad_fuera_de_la_prueba'],
    ['plazo vencido', { ...PUERTA, hasta: RELOJ - 1 }, 'fuera_de_plazo'],
    ['algoritmo sin puente', { ...PUERTA, caminos: ['algoritmo'] }, 'configuracion_ilegible'],
  ];
  for (const [nombre, puerta, motivo] of variantes) {
    /* Con la disponibilidad de producción: si la puerta se abriera por error, el algoritmo correría y se vería. */
    const r = await correr({ puerta, peticiones: [PETICION], disponibilidad: 'catalogo' });
    const res = r.espia.sombras[0]?.resultado;
    check(`C · «${nombre}»: cerrada (${motivo}) — sin sombra, sin puente, sin ciclo, y la MISMA respuesta y el mismo trabajo`,
      !r.error && res?.estado === 'no_corre' && res?.motivo === motivo && privadas(r).length === 0 && r.espia.puente === 0
      && r.espia.ciclos === 0 && isDeepStrictEqual(r.respuesta, ref.respuesta) && trabajo(r) === trabajo(ref) && sinEfectos(r),
      JSON.stringify(res));
  }
  const canaria = await correr({
    puerta: { ...PUERTA, capacidades: ['text.search'], hasta: RELOJ + 3_600_000 }, peticiones: [PETICION], disponibilidad: 'catalogo',
  });
  check('C · con la forma EXACTA de la puerta de la canary (cuenta, Travel, puente+algoritmo, capacidades [text.search], hasta): abre, decide, y la respuesta no cambia',
    !canaria.error && canaria.base.docs.get(rutaDeLaSombra(canaria))?.algoritmo?.estado === 'decidido'
    && isDeepStrictEqual(canaria.respuesta, ref.respuesta) && trabajo(canaria) === trabajo(ref) && sinEfectos(canaria),
    `algoritmo=${canaria.base.docs.get(rutaDeLaSombra(canaria))?.algoritmo?.estado}`);
});

await seccion('M · Varias vueltas: mientras Weë pregunta la sombra no corre; con el plan, corre UNA vez', async () => {
  /* Sin palabras que la plantilla entienda: Weë tiene que preguntar qué necesita. */
  const goal = `Me apetece algo distinto este año ${MARCA}`;
  const primera = { experienceId: 'travel', goal, locale: 'es-ES' };
  const vuelta = (r) => ({ jobId: r.jobId, answer: { questionId: 'what', optionId: 'doing' }, locale: 'es-ES' });
  const a1 = await correr({ puerta: PUERTA, peticiones: [primera], disponibilidad: 'catalogo' });
  check('M · primera vuelta: Weë pregunta «what», el trabajo queda «asking», y la sombra ni se llama ni se lee la puerta',
    a1.respuesta?.status === 'asking' && a1.respuesta?.question?.id === 'what' && a1.espia.sombras.length === 0
    && privadas(a1).length === 0 && !a1.base.ops.includes(`get ${RUTA_DE_LA_PUERTA}`) && a1.espia.puente === 0,
    `${a1.respuesta?.status} · ${a1.respuesta?.question?.id} · sombras=${a1.espia.sombras.length}`);
  const a2 = await correr({ base: a1.base, peticiones: [vuelta(a1)], disponibilidad: 'catalogo' });
  const c1 = await correr({ puerta: undefined, peticiones: [primera], disponibilidad: 'catalogo' });
  const c2 = await correr({ base: c1.base, peticiones: [vuelta(c1)], disponibilidad: 'catalogo' });
  check('M · las dos vueltas contestan lo MISMO con la puerta abierta y cerrada',
    !!a2.respuesta && isDeepStrictEqual(a1.respuesta, c1.respuesta) && isDeepStrictEqual(a2.respuesta, c2.respuesta) && a2.respuesta.status === 'planned',
    primeraDiferencia(c2.respuesta, a2.respuesta) ?? `${a2.respuesta?.status}`);
  const s2 = a2.base.docs.get(rutaDeLaSombra(a2));
  check('M · al contestar sale el plan y la sombra corre UNA vez: decide, sin el texto de la persona, y el trabajo es el mismo byte a byte',
    privadas(a2).length === 1 && s2?.algoritmo?.estado === 'decidido' && !JSON.stringify(s2).includes(MARCA) && trabajo(a2).includes(MARCA)
    && trabajo(a2) === trabajo(c2) && isDeepStrictEqual(a2.base.escrituras, [`set ${rutaDelTrabajo(a2)}`, `create ${rutaDeLaSombra(a2)}`]),
    `${s2?.algoritmo?.estado} · escrituras=[${a2.base.escrituras.join(', ')}]`);
  /* El doble toque en la última respuesta: dos llamadas a la vez que llegan al mismo plan. */
  const d1 = await correr({ puerta: PUERTA, peticiones: [primera], disponibilidad: 'catalogo' });
  const d2 = await correr({ base: d1.base, peticiones: [vuelta(d1), vuelta(d1)], disponibilidad: 'catalogo' });
  const resultados = d2.espia.sombras.map((x) => x.resultado);
  check('M · DOBLE TOQUE en la última respuesta: las dos contestan lo mismo que una sola, y queda UNA sombra (la otra: «duplicado» o «ya estaba»)',
    d2.salidas.length === 2 && d2.salidas.every((x) => isDeepStrictEqual(x.respuesta, c2.respuesta)) && privadas(d2).length === 1
    && resultados.filter((x) => x?.escrita).length === 1
    && resultados.some((x) => x && !x.escrita && (x.estado === 'duplicado' || (x.estado === 'no_corre' && x.motivo === 'abierta'))),
    resultados.map((x) => `${x?.estado}/${x?.motivo}`).join(' · '));
});

await seccion('F · Si la sombra se rompe, la persona no se entera: misma respuesta y mismo trabajo', async () => {
  const ref = P.cerrada;
  const comoSinSombra = (r) => !r.error && isDeepStrictEqual(r.respuesta, ref.respuesta) && trabajo(r) === trabajo(ref);

  const f1 = await correr({ puerta: PUERTA, peticiones: [PETICION], disponibilidad: 'catalogo', ciclo: 'roto' });
  const s1 = f1.base.docs.get(rutaDeLaSombra(f1));
  check('F1 · el CICLO del Algorithm Engine lanza al decidir: la respuesta y el trabajo, intactos; su sección dice «fallo» (SHADOW_ERROR) y el puente sigue «ready»',
    comoSinSombra(f1) && f1.espia.ciclos === 1 && f1.espia.decisiones === 1 && s1?.algoritmo?.estado === 'fallo'
    && s1.algoritmo.fallo === 'Error: el ciclo explotó' && s1.algoritmo.comparacion?.categorias?.SHADOW_ERROR === 1
    && s1?.coreDesdePuente?.status === 'ready' && f1.espia.sombras[0]?.resultado?.algoritmo === 'fallo'
    && isDeepStrictEqual(f1.base.escrituras, [`set ${rutaDelTrabajo(f1)}`, `create ${rutaDeLaSombra(f1)}`]),
    `${s1?.algoritmo?.estado} · ${s1?.algoritmo?.fallo} · ${primeraDiferencia(ref.respuesta, f1.respuesta) ?? 'misma respuesta'}`);

  const noEsta = (p) => (p.endsWith(`/private/${CLAVE_DE_LA_SOMBRA}`) ? Object.assign(new Error('Firestore no está hoy'), { code: 14 }) : null);
  const f2 = await correr({ puerta: PUERTA, peticiones: [PETICION], disponibilidad: 'catalogo', fallos: { create: noEsta } });
  const r2 = f2.espia.sombras[0]?.resultado;
  check('F2 · Firestore no deja escribir la sombra: no queda nada a medias, la sombra no lanza, dice hasta dónde llegó, y la respuesta y el trabajo, intactos',
    comoSinSombra(f2) && privadas(f2).length === 0 && isDeepStrictEqual(f2.base.escrituras, [`set ${rutaDelTrabajo(f2)}`])
    && r2?.escrita === false && r2?.estado === 'fallo' && r2?.algoritmo === 'decidido' && f2.lineas.some((l) => l.startsWith('WEË SOMBRA: falla ')),
    JSON.stringify(r2));

  const ilegible = (p) => (p === RUTA_DE_LA_PUERTA ? new Error('permiso denegado') : null);
  const f3 = await correr({ puerta: PUERTA, peticiones: [PETICION], disponibilidad: 'catalogo', fallos: { get: ilegible } });
  check('F3 · la puerta no se puede LEER (aunque diga «abierta»): queda cerrada, sin sombra ni puente, y la respuesta no cambia',
    comoSinSombra(f3) && f3.espia.sombras[0]?.resultado?.motivo === 'sin_configuracion' && privadas(f3).length === 0 && f3.espia.puente === 0
    && f3.base.ops.includes(`get! ${RUTA_DE_LA_PUERTA}`),
    JSON.stringify(f3.espia.sombras[0]?.resultado));

  const f4 = await correr({ puerta: PUERTA, peticiones: [PETICION], disponibilidad: 'catalogo', puente: 'roto' });
  const s4 = f4.base.docs.get(rutaDeLaSombra(f4));
  check('F4 · el PUENTE lanza: queda una sombra «fallo» con la CLASE del error y no su texto, sin sección del algoritmo; la respuesta y el trabajo, intactos',
    comoSinSombra(f4) && s4?.estado === 'fallo' && s4?.fallo === `Error · mensaje de ${'el puente explotó'.length} car`
    && !('algoritmo' in (s4 ?? {})) && f4.espia.ciclos === 0 && f4.espia.sombras[0]?.resultado?.estado === 'fallo'
    && isDeepStrictEqual(f4.base.escrituras, [`set ${rutaDelTrabajo(f4)}`, `create ${rutaDeLaSombra(f4)}`]),
    `${s4?.estado} · ${s4?.fallo}`);

  check('F · y en ninguno de los cuatro hubo motor, red, libro, Credits ni materiales',
    [f1, f2, f3, f4].every((r) => r.espia.motor === 0 && r.red === 0 && sinEfectos(r)),
    [f1, f2, f3, f4].map((r) => `motor=${r.espia.motor} red=${r.red}`).join(' · '));
});

await seccion('G · Lo que creatorChat le pasa a la sombra: el trabajo guardado, su cuenta, Travel y la puerta, nada más', async () => {
  const abierta = P.abierta;
  const job = abierta.base.docs.get(rutaDelTrabajo(abierta));
  const v = abierta.espia.sombras[0];
  check('G · recibió el trabajo, su cuenta, Travel, el objetivo guardado, la puerta leída de aiSettings/sombra y el Brain de verdad (que no se llamó)',
    !!v && v.jobId === abierta.jobId && v.userId === UID && v.experienceId === 'travel' && v.goal === job?.goal && v.ruta === rutaDelTrabajo(abierta)
    && isDeepStrictEqual(v.puerta, PUERTA) && isDeepStrictEqual(v.claves, CLAVES_DE_LA_ENTRADA) && abierta.espia.motor === 0,
    v ? `${v.jobId} · ${v.experienceId} · ${v.claves.join(',')}` : 'la sombra no se llamó');
  /* La misma sombra, llamada a mano con lo que quedó guardado: si creatorChat le pasara otra cosa, no saldría igual. */
  espia = nuevoEspia();
  /* Los dobles, en lo de verdad (F dejó el puente «roto»); la disponibilidad va explícita en la llamada. */
  Object.assign(modo, { disponibilidad: 'registro', ciclo: 'real', puente: 'real' });
  const directa = new Base();
  const salida = await sombraDeVerdad({
    jobRef: directa.collection('creatorJobs').doc(abierta.jobId), jobId: abierta.jobId, userId: UID, experienceId: 'travel',
    goal: job.goal, legacyPlan: job.plan, puerta: PUERTA,
    entendimientoDe: async () => { throw new Error('el Brain no se pide'); },
    disponibilidad: comoProduccion, ahora: () => RELOJ, observar: () => {},
  });
  const sinDuracion = (d) => { const x = JSON.parse(JSON.stringify(d ?? {})); if (x.algoritmo) delete x.algoritmo.duracionMs; return x; };
  const deCreatorChat = abierta.base.docs.get(rutaDeLaSombra(abierta));
  const aMano = directa.docs.get(rutaDeLaSombra(abierta));
  check('G · la sombra que deja creatorChat es la MISMA que la de sombraDelPlan con el trabajo guardado (salvo los milisegundos que tardó en decidir)',
    salida?.escrita === true && !!deCreatorChat && isDeepStrictEqual(sinDuracion(deCreatorChat), sinDuracion(aMano)),
    primeraDiferencia(sinDuracion(aMano), sinDuracion(deCreatorChat), 'sombra') ?? `huella ${huella(JSON.stringify(sinDuracion(aMano)))}`);
});

check('en TODA la suite: cero peticiones de red y cero llamadas al motor', red === 0 && motorEnTotal === 0, `red=${red} motor=${motorEnTotal}`);

/* ── Limpieza: cada doble, de vuelta a lo de verdad ── */
plannerMod.disponibilidadDeWee.disponible = disponibleDeVerdad;
necesidadesMod.pasosParaElCore = puenteDeVerdad;
plannerMod.crearPlannerDeWee = crearPlannerDeVerdad;
cicloMod.crearCicloAlgoritmico = crearCicloDeVerdad;
engineMod.engine.generate = generarDeVerdad;
sombraMod.sombraDelPlan = sombraDeVerdad;
fa.getFirestore = getFirestoreDeVerdad;
globalThis.fetch = fetchDeVerdad;

console.log(failures
  ? `\n${failures} de ${n} comprobaciones fallaron`
  : `\nApp → creatorChat → sombra → Algorithm Engine: ${n} comprobaciones en verde · la respuesta no cambia · ${red} peticiones de red`);
process.exit(failures ? 1 : 0);
