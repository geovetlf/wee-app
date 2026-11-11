/**
 * LA SOMBRA DESDE creatorChat, CONTRA FIRESTORE DE VERDAD (el emulador) — la pareja de `sombra-creatorchat.test.mjs`.
 *
 * El mismo escenario que la suite en memoria, pero con el Firestore del emulador: `create` que choca de verdad, tipos
 * de verdad, `undefined` rechazado de verdad y transacciones de verdad. Se ejecuta el callable COMPILADO
 * (`creatorChat.run(request)`, en este proceso) con una petición de Weë Travel de una cuenta de prueba, y la base se
 * VACÍA y se vuelve a sembrar antes de cada llamada, así que cada pareja abierta/cerrada parte de lo mismo:
 *
 *   A · La respuesta a la app es la misma con la puerta abierta y cerrada.
 *   B · Abierta: UNA sombra en creatorJobs/{jobId}/private/sombra, con su sección `algoritmo`, sus sellos de contrato y
 *       sin el texto de la persona.
 *   C · Cerrada: ni sombra, ni puente, ni Planner del Core, ni algoritmo.
 *   D · Cero efectos en TODA la base: ni libro, ni Credits, ni materiales, ni trabajos del Core; ni motor ni red.
 *   E · El trabajo que guarda Legacy es el mismo, y la sombra no lo toca (igual byte a byte antes y después de ella).
 *
 * ── «Módulo» qué, y por qué ─────────────────────────────────────────────────
 *
 * Aquí el id del trabajo lo pone el SDK (aleatorio) y las horas, `Timestamp.now()` de Legacy (el reloj no se congela:
 * el cliente de Firestore lo usa para sus plazos). Así que las comparaciones ENTRE llamadas sustituyen el id del
 * trabajo por «‹jobId›» y cada marca de tiempo por «‹hora›»: son las dos únicas cosas que Legacy cambia de una
 * llamada a otra. Lo que la sombra pudiera tocar del trabajo se compara SIN sustituir nada: el documento antes y
 * después de la sombra, dentro de la misma llamada.
 *
 * ── Aislamiento ─────────────────────────────────────────────────────────────
 *
 * Solo contra un proyecto demo-* y un emulador de ESTA máquina (`proyectoDeEmulador` y la dirección del emulador); sin
 * ninguna clave en el entorno (se borran antes de cargar nada); `fetch` solo llega a esta máquina —cualquier otra
 * dirección se cuenta y se rechaza—; y el motor (`engine.generate`) lanza si alguien lo llama. La disponibilidad se
 * mira dos veces, como en la suite en memoria: la DE VERDAD (sin claves: el algoritmo se queda en `sin_plan_del_core`)
 * y la de lo que producción puede enrutar, doblada solo en la pregunta al registro (el algoritmo llega a `decidido`).
 * No está en `npm test`: necesita el emulador de Firestore (Java 21).
 *
 *   firebase emulators:exec --only firestore --project demo-wee-sombra "node functions/test/sombra-creatorchat.emulator.mjs"
 */
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

/* ═══ Sin claves, antes de cargar nada ═══════════════════════════════════════════════════════════════════════════ */
const CLAVES = [
  'GEMINI_API_KEY', 'ARK_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'BFL_API_KEY',
  'ELEVENLABS_API_KEY', 'MINIMAX_API_KEY', 'SEEDANCE_CALLBACK_TOKEN', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'FAL_KEY',
];
for (const k of [...CLAVES, 'GOOGLE_APPLICATION_CREDENTIALS', 'K_SERVICE', 'FUNCTION_TARGET', 'CREATOR_PRICING_MODE']) delete process.env[k];

/* ═══ Solo un proyecto demo-* y un emulador de esta máquina ══════════════════════════════════════════════════════ */
const PROY = proyectoDeEmulador();
const HOST = process.env.FIRESTORE_EMULATOR_HOST || '';
if (!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(HOST)) {
  console.log(`✘ FIRESTORE_EMULATOR_HOST tiene que ser un emulador de esta máquina, y llegó «${HOST}»`);
  process.exit(2);
}

/* `fetch` solo llega a esta máquina (el emulador); cualquier otra dirección se cuenta y se rechaza. */
let red = 0;
const fetchDeVerdad = globalThis.fetch;
const deEstaMaquina = (url) => {
  try { return ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(new URL(String(url?.url ?? url)).hostname); } catch { return false; }
};
globalThis.fetch = async (url, init) => {
  if (deEstaMaquina(url)) return fetchDeVerdad(url, init);
  red++;
  throw new Error('esta suite no sale de esta máquina');
};

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

/* ═══ Firestore del emulador ═════════════════════════════════════════════════════════════════════════════════════ */
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: PROY });
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const db = getFirestore();

/* ═══ Weë, compilado y de verdad ═════════════════════════════════════════════════════════════════════════════════ */
const creatorMod = lib('creator/index.js');
const sombraMod = lib('creator/sombra.js');
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
  CLAVE_DE_LA_SOMBRA, CONTRATO_DE_LA_SOMBRA, COLECCION_DE_LA_SOMBRA, DOCUMENTO_DE_LA_SOMBRA, olvidarLaSombra, disponibilidadDelCatalogo, seccionPresentable,
} = sombraMod;
/* Y las que declare secrets.ts aunque la lista de arriba se quede vieja (la parte 0 lo señala). El registro, sin ninguna. */
for (const k of [...PROVIDER_SECRET_NAMES, ...MEDIA_SECRET_NAMES, ...FAL_SECRET_NAMES]) delete process.env[k];
olvidarRegistro();

/* ═══ Los mismos dobles y espías que la suite en memoria ═════════════════════════════════════════════════════════ */
const copia = (v) => JSON.parse(JSON.stringify(v));
/* Una forma canónica: claves ordenadas, sin `undefined` (Firestore no los guarda), y las marcas de tiempo EXACTAS. */
const exacto = (v) => {
  if (v instanceof Timestamp) return `ts:${v.seconds}.${v.nanoseconds}`;
  if (Array.isArray(v)) return v.map(exacto);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => [k, exacto(v[k])]));
  return v;
};
const modo = { disponibilidad: 'registro' };
const nuevoEspia = () => ({ disponibilidad: [], puente: 0, planners: 0, planificar: [], ciclos: 0, decisiones: 0, motor: 0, sombras: [] });
let espia = nuevoEspia();
let motorEnTotal = 0;

const catalogo = disponibilidadDelCatalogo();
const comoProduccion = { disponible: (c) => c !== 'text.structure' && catalogo.disponible(c) };
const disponibleDeVerdad = plannerMod.disponibilidadDeWee.disponible;
plannerMod.disponibilidadDeWee.disponible = (c) => {
  espia.disponibilidad.push(c);
  return modo.disponibilidad === 'catalogo' ? comoProduccion.disponible(c) : disponibleDeVerdad.call(plannerMod.disponibilidadDeWee, c);
};
const puenteDeVerdad = necesidadesMod.pasosParaElCore;
necesidadesMod.pasosParaElCore = (...a) => { espia.puente++; return puenteDeVerdad(...a); };
const crearPlannerDeVerdad = plannerMod.crearPlannerDeWee;
plannerMod.crearPlannerDeWee = (deps) => {
  espia.planners++;
  const p = crearPlannerDeVerdad(deps);
  return { ...p, planificar: (peticion) => { espia.planificar.push(String(peticion?.trace?.requestId)); return p.planificar(peticion); } };
};
const crearCicloDeVerdad = cicloMod.crearCicloAlgoritmico;
cicloMod.crearCicloAlgoritmico = (...a) => {
  espia.ciclos++;
  const c = crearCicloDeVerdad(...a);
  return { ...c, decidir: (peticion) => { espia.decisiones++; return c.decidir(peticion); } };
};
const generarDeVerdad = engineMod.engine.generate;
engineMod.engine.generate = async () => { espia.motor++; motorEnTotal++; throw new Error('el motor no se llama en esta suite'); };
const sombraDeVerdad = sombraMod.sombraDelPlan;
sombraMod.sombraDelPlan = async (entrada) => {
  const leerTrabajo = async () => { const s = await entrada.jobRef.get(); return s.exists ? JSON.stringify(exacto(s.data())) : 'undefined'; };
  const trabajoAntes = await leerTrabajo();
  const planAntes = JSON.stringify(exacto(entrada?.legacyPlan));
  const resultado = await sombraDeVerdad(entrada);
  const despues = await entrada.jobRef.get();
  espia.sombras.push({
    resultado, claves: Object.keys(entrada ?? {}).sort(), puerta: copia(entrada?.puerta ?? null),
    trabajoAntes, trabajoDespues: despues.exists ? JSON.stringify(exacto(despues.data())) : 'undefined',
    planIntacto: JSON.stringify(exacto(entrada?.legacyPlan)) === planAntes,
    planIgualAlGuardado: JSON.stringify(exacto(entrada?.legacyPlan)) === JSON.stringify(exacto(despues.data()?.plan)),
  });
  return resultado;
};

/* ═══ El escenario ═══════════════════════════════════════════════════════════════════════════════════════════════ */
const UID = 'SombraCanaryTravel01';
const OTRA = 'OtraCuentaFueraDeLaPrueba02';
const RUTA_DE_LA_PUERTA = `${COLECCION_DE_LA_SOMBRA}/${DOCUMENTO_DE_LA_SOMBRA}`;
const PUERTA = Object.freeze({ habilitado: true, cuentas: [UID], caminos: ['puente', 'algoritmo'], experiencias: ['travel'] });
const MARCA = 'SOMBRA_CC_MARCA_9f31';
const GOAL = `Qué hacer y dónde comer en Lisboa, sin prisas ${MARCA}`;
const PETICION = Object.freeze({ experienceId: 'travel', goal: GOAL, presetAnswers: [{ questionId: 'what', optionId: 'doing' }], locale: 'es-ES' });
const EFECTOS = ['aiGenerations', 'aiUsage', 'creatorUsage', 'brainUsage', 'aiRateLimits', 'creditStats', 'assets', 'mediaObjects',
  'elements', 'projectItems', 'jobs', 'workflowRuns', 'jobQueue', 'brainChats', 'aiProviderCallbacks'];
const CLAVES_DE_LA_ENTRADA = ['entendimientoDe', 'experienceId', 'goal', 'jobId', 'jobRef', 'legacyPlan', 'puerta', 'userId'];

const vaciar = async () => {
  const r = await fetch(`http://${HOST}/emulator/v1/projects/${PROY}/databases/(default)/documents`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`no se pudo vaciar el emulador: HTTP ${r.status}`);
};
/* Una cuenta con su billetera ya hecha: `ensureAccount` no tiene nada que escribir. */
const sembrar = async (puerta) => {
  await db.doc(`users/${UID}`).set({
    uid: UID, profileType: 'real', displayName: 'Cuenta de prueba de la sombra',
    creditsBalance: 240, creditsLifetimeEarned: 240, creditsLifetimeSpent: 0, creditsInitializedAt: Timestamp.fromMillis(Date.UTC(2026, 9, 5, 12, 0, 0)),
  });
  await db.doc(`creditTransactions/${welcomeTransactionId(UID)}`).set({
    id: welcomeTransactionId(UID), userId: UID, type: 'grant', amount: 240, balanceBefore: 0, balanceAfter: 240,
    reason: 'Credits de bienvenida', source: 'welcome', status: 'COMPLETED', requestId: welcomeTransactionId(UID),
  });
  if (puerta !== undefined) await db.doc(RUTA_DE_LA_PUERTA).set(copia(puerta));
};
/* Toda la base, con sus subcolecciones: ruta → datos. */
const volcar = async () => {
  const out = new Map();
  const andar = async (colecciones) => {
    for (const col of colecciones) {
      for (const ref of await col.listDocuments()) {
        const snap = await ref.get();
        if (snap.exists) out.set(ref.path, snap.data());
        await andar(await ref.listCollections());
      }
    }
  };
  await andar(await db.listCollections());
  return out;
};

const correr = async ({ puerta, peticion = PETICION, disponibilidad = 'registro' }) => {
  await vaciar();
  await sembrar(puerta);
  modo.disponibilidad = disponibilidad;
  espia = nuevoEspia();
  olvidarLaSombra(); invalidateConfig(); invalidateCostOverrides();
  const lineas = [];
  const consola = { log: console.log, warn: console.warn, error: console.error };
  const anotar = (...a) => lineas.push(a.map((x) => (x instanceof Error ? `${x.name}: ${x.message}` : String(x))).join(' '));
  console.log = anotar; console.warn = anotar; console.error = anotar;
  const redAntes = red;
  const t0 = Date.now();
  let respuesta; let error;
  try {
    respuesta = await creatorMod.creatorChat.run({ auth: { uid: UID }, data: copia(peticion) });
  } catch (e) { error = e; } finally {
    Object.assign(console, consola);
  }
  const t1 = Date.now();
  const docs = await volcar();
  return { respuesta, error, jobId: respuesta?.jobId, docs, lineas, espia, red: red - redAntes, t0, t1 };
};

/* ── Lo que se mira ── */
const rutaDelTrabajo = (r) => `creatorJobs/${r.jobId}`;
const rutaDeLaSombra = (r) => `creatorJobs/${r.jobId}/private/${CLAVE_DE_LA_SOMBRA}`;
const privadas = (r) => [...r.docs.keys()].filter((p) => p.includes('/private/'));
/* Entre llamadas: el id del trabajo (aleatorio) y las marcas de tiempo de Legacy son lo único que cambia. */
const sinIdNiHora = (v, jobId) => {
  if (v instanceof Timestamp) return '‹hora›';
  if (typeof v === 'string') return jobId ? v.split(jobId).join('‹jobId›') : v;
  if (Array.isArray(v)) return v.map((x) => sinIdNiHora(x, jobId));
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => [k, sinIdNiHora(v[k], jobId)]));
  return v;
};
const estado = (r) => new Map([...r.docs.entries()].map(([p, d]) => [r.jobId ? p.split(r.jobId).join('‹jobId›') : p, JSON.stringify(sinIdNiHora(d, r.jobId))]));
const diferencia = (a, b, ignorar = []) => {
  const fuera = (p) => ignorar.includes(p);
  return {
    soloA: [...a.keys()].filter((p) => !fuera(p) && !b.has(p)),
    soloB: [...b.keys()].filter((p) => !fuera(p) && !a.has(p)),
    distintos: [...a.keys()].filter((p) => !fuera(p) && b.has(p) && a.get(p) !== b.get(p)),
  };
};
const contar = (r, coleccion) => [...r.docs.keys()].filter((p) => p.startsWith(`${coleccion}/`)).length;
const huella = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 12);
const clavesDe = (v, out = new Set()) => { if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { out.add(k); clavesDe(x, out); } return out; };
const sinEfectos = (r) => EFECTOS.every((c) => contar(r, c) === 0) && contar(r, 'creditTransactions') === 1
  && r.docs.get(`users/${UID}`)?.creditsBalance === 240 && r.docs.get(`users/${UID}`)?.creditsLifetimeSpent === 0;

const comprobarPar = (et, cerrada, abierta, { algoritmo, puente, motivoCerrada }) => {
  const contestan = !cerrada.error && !abierta.error && !!cerrada.respuesta && !!abierta.respuesta;
  check(`${et} · las dos llamadas contestan y dejan el trabajo «planned»`,
    contestan && cerrada.respuesta.status === 'planned' && abierta.respuesta.status === 'planned',
    contestan ? `${cerrada.respuesta.status}/${abierta.respuesta.status}` : `${cerrada.error?.message ?? ''} | ${abierta.error?.message ?? ''}`);

  /* A */
  const ra = sinIdNiHora(abierta.respuesta, abierta.jobId);
  const rc = sinIdNiHora(cerrada.respuesta, cerrada.jobId);
  check(`${et} · A) la respuesta a la app es la MISMA con la puerta abierta y cerrada (deep-equal, salvo el id aleatorio del trabajo)`,
    contestan && isDeepStrictEqual(ra, rc), `huella ${huella(JSON.stringify(ra))} / ${huella(JSON.stringify(rc))}`);

  /* E */
  const ja = JSON.stringify(sinIdNiHora(abierta.docs.get(rutaDelTrabajo(abierta)), abierta.jobId));
  const jc = JSON.stringify(sinIdNiHora(cerrada.docs.get(rutaDelTrabajo(cerrada)), cerrada.jobId));
  check(`${et} · E) el trabajo que guardó Legacy es el mismo (salvo su id y sus horas, que pone Legacy en cada llamada)`,
    !!abierta.docs.get(rutaDelTrabajo(abierta)) && ja === jc, `${huella(ja)} / ${huella(jc)}`);
  const vista = abierta.espia.sombras[0];
  check(`${et} · E) y la sombra no lo tocó: el documento es IDÉNTICO byte a byte antes y después de ella (horas incluidas), y el plan que recibió es el guardado`,
    abierta.espia.sombras.length === 1 && vista.trabajoAntes !== 'undefined' && vista.trabajoAntes === vista.trabajoDespues
    && vista.trabajoDespues === JSON.stringify(exacto(abierta.docs.get(rutaDelTrabajo(abierta)))) && vista.planIntacto && vista.planIgualAlGuardado,
    vista ? `antes=${huella(vista.trabajoAntes)} después=${huella(vista.trabajoDespues)}` : 'la sombra no se llamó');

  /* B */
  const s = abierta.docs.get(rutaDeLaSombra(abierta));
  check(`${et} · B) abierta: UNA sola sombra, en creatorJobs/{jobId}/private/${CLAVE_DE_LA_SOMBRA}`,
    privadas(abierta).length === 1 && !!s && vista?.resultado?.escrita === true, privadas(abierta).join(', ') || 'ninguna');
  check(`${et} · B) su sección del algoritmo acaba en «${algoritmo}» y el plan del puente en «${puente}»`,
    s?.algoritmo?.estado === algoritmo && s?.coreDesdePuente?.status === puente && vista?.resultado?.algoritmo === algoritmo,
    `algoritmo=${s?.algoritmo?.estado} (${s?.algoritmo?.duracionMs} ms) · puente=${s?.coreDesdePuente?.status}`);
  check(`${et} · B) sellos: sombra ${CONTRATO_DE_LA_SOMBRA}, algoritmo ${ALGORITHM_CONTRACT_VERSION}, shadowRunId «jobId:algoritmo», caminos puente+algoritmo, Brain «omitido»; el trabajo, la cuenta, Travel y la hora de la llamada`,
    s?.contract === CONTRATO_DE_LA_SOMBRA && s?.algoritmo?.contract === ALGORITHM_CONTRACT_VERSION
    && s?.algoritmo?.shadowRunId === `${abierta.jobId}:algoritmo` && isDeepStrictEqual(s?.caminos, ['puente', 'algoritmo'])
    && s?.estado === 'omitido' && ['core', 'coreDesdeBrain', 'autoridad', 'regresion', 'errores'].every((k) => !(k in (s ?? {})))
    && s?.jobId === abierta.jobId && s?.userId === UID && s?.experienceId === 'travel'
    && typeof s?.creadaEn === 'number' && s.creadaEn >= abierta.t0 && s.creadaEn <= abierta.t1,
    `contract=${s?.contract} · algoritmo.contract=${s?.algoritmo?.contract} · shadowRunId=${s?.algoritmo?.shadowRunId}`);
  const enLaSombra = JSON.stringify(s ?? {});
  const enElTrabajo = JSON.stringify(abierta.docs.get(rutaDelTrabajo(abierta)) ?? {});
  check(`${et} · B) sin texto de la persona: ni el objetivo ni su marca —que el trabajo de Legacy SÍ guarda—, ni una clave goal/brief, y la sección se puede guardar`,
    !!s && [GOAL, MARCA].every((t) => enElTrabajo.includes(t) && !enLaSombra.includes(t))
    && !clavesDe(s).has('goal') && !clavesDe(s).has('brief') && seccionPresentable(s.algoritmo),
    `en la sombra: ${[GOAL, MARCA].filter((t) => enLaSombra.includes(t)).length}/2`);
  check(`${et} · B) sus avisos tampoco: «empieza» y «termina … algoritmo=${algoritmo}», sin el objetivo`,
    abierta.lineas.some((l) => l.startsWith('WEË SOMBRA: empieza '))
    && abierta.lineas.some((l) => l.startsWith('WEË SOMBRA: termina ') && l.includes(` algoritmo=${algoritmo} `))
    && abierta.lineas.every((l) => !l.includes(MARCA)),
    abierta.lineas.filter((l) => l.startsWith('WEË SOMBRA')).join(' | '));

  /* C */
  const ciclos = algoritmo === 'sin_plan_del_core' ? 0 : 1;
  const res = cerrada.espia.sombras[0]?.resultado;
  check(`${et} · C) cerrada: ninguna sombra, y la sombra lo dice («no_corre» · ${motivoCerrada})`,
    privadas(cerrada).length === 0 && cerrada.espia.sombras.length === 1 && res?.escrita === false && res?.estado === 'no_corre' && res?.motivo === motivoCerrada,
    JSON.stringify(res));
  check(`${et} · C) cerrada: ni puente, ni Planner del Core, ni ciclo; la disponibilidad solo la pregunta Legacy (text.structure)`,
    cerrada.espia.puente === 0 && cerrada.espia.planners === 0 && cerrada.espia.planificar.length === 0 && cerrada.espia.ciclos === 0
    && isDeepStrictEqual(cerrada.espia.disponibilidad, ['text.structure']),
    `puente=${cerrada.espia.puente} planner=${cerrada.espia.planners} ciclo=${cerrada.espia.ciclos} disponibilidad=[${cerrada.espia.disponibilidad.join(',')}]`);
  check(`${et} · C) abierta, en cambio: un puente, un Planner con el sello del puente (nunca el del Brain) y ${ciclos} ciclo(s)`,
    abierta.espia.puente === 1 && abierta.espia.planners === 1 && isDeepStrictEqual(abierta.espia.planificar, [`${abierta.jobId}:sombra-puente`])
    && abierta.espia.ciclos === ciclos && abierta.espia.decisiones === ciclos,
    `puente=${abierta.espia.puente} planificar=[${abierta.espia.planificar.join(',')}] ciclo=${abierta.espia.ciclos}`);

  /* D */
  const d = diferencia(estado(cerrada), estado(abierta), [RUTA_DE_LA_PUERTA]);
  check(`${et} · D) TODA la base del emulador (salvo la puerta, que es la entrada): lo único distinto es la sombra privada`,
    d.soloA.length === 0 && d.distintos.length === 0 && isDeepStrictEqual(d.soloB, [`creatorJobs/‹jobId›/private/${CLAVE_DE_LA_SOMBRA}`]),
    `solo cerrada=[${d.soloA.join(',')}] · solo abierta=[${d.soloB.join(',')}] · distintos=[${d.distintos.join(',')}]`);
  check(`${et} · D) cero libro, cero uso, cero Credits movidos, cero materiales, cero trabajos del Core; cero motor y cero red fuera de esta máquina`,
    sinEfectos(abierta) && sinEfectos(cerrada) && abierta.espia.motor === 0 && cerrada.espia.motor === 0 && abierta.red === 0 && cerrada.red === 0,
    EFECTOS.map((c) => [c, contar(abierta, c)]).filter(([, k]) => k > 0).map(([c, k]) => `${c}=${k}`).join(' ')
      || `saldo ${abierta.docs.get(`users/${UID}`)?.creditsBalance} · ${contar(abierta, 'creditTransactions')} movimiento (la bienvenida sembrada)`);
};

await seccion('0 · Sin claves, un emulador de esta máquina, y los espías en su sitio', async () => {
  const nombres = [...PROVIDER_SECRET_NAMES, ...MEDIA_SECRET_NAMES, ...FAL_SECRET_NAMES];
  check(`proyecto ${PROY} (demo-*) contra el emulador de ${HOST}, sin ninguna clave en el entorno (la lista que se borra antes de cargar nada las cubre todas)`,
    PROY.startsWith('demo-') && nombres.length >= 12 && nombres.every((k) => process.env[k] === undefined && CLAVES.includes(k)),
    `${nombres.length} nombres${nombres.some((k) => !CLAVES.includes(k)) ? ` · faltan en CLAVES: ${nombres.filter((k) => !CLAVES.includes(k)).join(',')}` : ''}`);
  check('los espías son lo que ve la sombra: el índice del Algorithm Engine re-exporta el ciclo espiado',
    algoritmoMod.crearCicloAlgoritmico === cicloMod.crearCicloAlgoritmico && cicloMod.crearCicloAlgoritmico !== crearCicloDeVerdad);
  /*
   * CALENTAMIENTO. La primera decisión de un proceso paga la compilación del motor, y el tope del algoritmo (250 ms)
   * mide lo que tarda en decidir, no eso. Una sombra suelta antes de medir nada, con un documento DE MEMORIA que se
   * tira: no escribe en el emulador.
   */
  const deMemoria = { collection: () => ({ doc: () => ({ get: async () => ({ exists: false, data: () => undefined }), create: async () => {} }) }) };
  await sombraDeVerdad({
    jobRef: deMemoria, jobId: 'calentamiento', userId: UID, experienceId: 'travel', goal: 'calentamiento',
    legacyPlan: { experience: 'travel', goal: 'calentamiento', explainToUser: '-', steps: [{ id: 'activities', capability: 'text.search', purpose: '-', input: { kind: 'activities', brief: '-' } }] },
    puerta: PUERTA, entendimientoDe: async () => undefined, disponibilidad: comoProduccion, ahora: () => Date.now(), observar: () => {},
  });
});

await seccion('K · Sin claves, con la disponibilidad DE VERDAD: el puente no tiene plan y el algoritmo no decide', async () => {
  const cerrada = await correr({ puerta: undefined });
  const abierta = await correr({ puerta: PUERTA });
  comprobarPar('K', cerrada, abierta, { algoritmo: 'sin_plan_del_core', puente: 'unsupported', motivoCerrada: 'sin_configuracion' });
  check('K · creatorChat no le pasa a la sombra ni `disponibilidad`, ni ciclo, ni cronómetro, ni reloj: solo estas ocho claves',
    isDeepStrictEqual(abierta.espia.sombras[0]?.claves, CLAVES_DE_LA_ENTRADA) && isDeepStrictEqual(abierta.espia.sombras[0]?.puerta, copia(PUERTA)),
    (abierta.espia.sombras[0]?.claves ?? []).join(','));
});

await seccion('P · Con lo que producción puede enrutar (doble de la disponibilidad): el algoritmo DECIDE', async () => {
  const cerrada = await correr({ puerta: undefined, disponibilidad: 'catalogo' });
  const abierta = await correr({ puerta: PUERTA, disponibilidad: 'catalogo' });
  comprobarPar('P', cerrada, abierta, { algoritmo: 'decidido', puente: 'ready', motivoCerrada: 'sin_configuracion' });
  const a = abierta.docs.get(rutaDeLaSombra(abierta))?.algoritmo;
  check('P · la decisión, guardada por el Firestore de verdad: la línea base en fila con los mismos pasos que el plan del Core, 0 violaciones, sin historial',
    a?.decision?.status === 'decided' && a?.violaciones === 0 && a?.decision?.historial === 'ninguno'
    && a?.decision?.elegida?.esLineaBase === true && a?.decision?.elegida?.pasosIgualesAlPlanDelCore === true
    && a?.comparacion?.categorias?.AUTHORITY_VIOLATION === 0 && a?.comparacion?.categorias?.SHADOW_ERROR === 0,
    `${a?.decision?.elegida?.label} · ${a?.decision?.elegida?.proposedBy} · ${a?.duracionMs} ms`);

  const otra = await correr({ puerta: { ...PUERTA, cuentas: [OTRA] }, disponibilidad: 'catalogo' });
  const res = otra.espia.sombras[0]?.resultado;
  check('P · la puerta nombra OTRA cuenta: cerrada (cuenta_fuera_de_la_prueba), sin sombra ni puente, y la misma respuesta y el mismo trabajo',
    !otra.error && res?.estado === 'no_corre' && res?.motivo === 'cuenta_fuera_de_la_prueba' && privadas(otra).length === 0 && otra.espia.puente === 0
    && isDeepStrictEqual(sinIdNiHora(otra.respuesta, otra.jobId), sinIdNiHora(cerrada.respuesta, cerrada.jobId))
    && JSON.stringify(sinIdNiHora(otra.docs.get(rutaDelTrabajo(otra)), otra.jobId)) === JSON.stringify(sinIdNiHora(cerrada.docs.get(rutaDelTrabajo(cerrada)), cerrada.jobId))
    && sinEfectos(otra),
    JSON.stringify(res));
});

check('en TODA la suite: cero peticiones fuera de esta máquina y cero llamadas al motor', red === 0 && motorEnTotal === 0, `red=${red} motor=${motorEnTotal}`);

/* ── Limpieza: la base del emulador, vacía; cada doble, de vuelta a lo de verdad ── */
await vaciar().catch(() => {});
plannerMod.disponibilidadDeWee.disponible = disponibleDeVerdad;
necesidadesMod.pasosParaElCore = puenteDeVerdad;
plannerMod.crearPlannerDeWee = crearPlannerDeVerdad;
cicloMod.crearCicloAlgoritmico = crearCicloDeVerdad;
engineMod.engine.generate = generarDeVerdad;
sombraMod.sombraDelPlan = sombraDeVerdad;
globalThis.fetch = fetchDeVerdad;

console.log(failures
  ? `\n${failures} de ${n} comprobaciones fallaron`
  : `\nApp → creatorChat → sombra → Algorithm Engine, contra el emulador: ${n} comprobaciones en verde · la respuesta no cambia`);
process.exit(failures ? 1 : 0);
