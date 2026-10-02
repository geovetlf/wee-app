/*
 * CANARY DE LA SOMBRA (TRAVEL) — MONITOR DE LAS 24 CONDICIONES DE PARADA. SOLO LECTURA.
 *
 * Herramienta de máquina, como `canary-medios.mjs` o `inventario-media.mjs`: no es
 * parte del producto, no la llama nadie y no se despliega. Mide en producción, desde
 * la apertura de `aiSettings/sombra`, las 24 condiciones con las que la canary de
 * Travel se cierra, y clasifica cada llamada a proveedor como LEGACY · BRAIN (camino
 * brain de la sombra) · ALGORITHM SHADOW · SIN ATRIBUIR.
 *
 * ── No escribe nada ─────────────────────────────────────────────────────────
 *
 * Antes de leer, todos los métodos de escritura de Firestore se sustituyen por uno
 * que lanza (el «cinturón»). Usa la ADC de gcloud de la máquina; ningún token.
 *
 * ── Qué es de la sombra (condiciones #3, #4 y #5) ───────────────────────────
 *
 * Lo decide `canary-sombra-atribucion.mjs`, con la identidad que pone el propio
 * código de la sombra (`shadowRunId` = `<jobId>:algoritmo` en
 * `creatorJobs/{jobId}/private/sombra`, y sus sellos). La cuenta o el trabajo de la
 * canary NO bastan: si la persona pulsa «Crear», `creatorRun` (Legacy) ejecuta y
 * cobra, y eso no es la sombra. Antes #3 y #5 miraban solo la cuenta y el estado del
 * trabajo, y el Request 4 (Japón, 2026-09-25) dio dos STOP falsos. #4 miraba la cuenta
 * en `userId`/`ownerId`/`accountId`, que un material del Content Core no tiene (su
 * dueño es `ownerAccountId`): ahora decide su PROCEDENCIA (S1.5).
 *
 * ── Privacidad ──────────────────────────────────────────────────────────────
 *
 * La cuenta se lee del trabajo que se indica (nunca de la línea de órdenes) y sale
 * como huella. El texto de la persona solo se usa en memoria, para comprobar que NO
 * está en la sombra (#14); no se imprime ni se guarda.
 *
 * ── Uso ─────────────────────────────────────────────────────────────────────
 *
 *   node scripts/canary-sombra.mjs --apertura <ISO> --trabajo-de-la-cuenta <jobId> [--json ruta]
 *
 * El determinismo (#16) repite cada sombra en local con `functions/lib`: tiene que ser
 * el compilado de lo desplegado (compruébese por hash contra el paquete de la revisión).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { condicionAssets, condicionCreditos, condicionEjecuciones, identidadDeLaSombra } from './canary-sombra-atribucion.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(RAIZ, 'functions/package.json'));
const admin = require('firebase-admin');
const FS = require('@google-cloud/firestore');
const { GoogleAuth } = require('google-auth-library');

const prohibido = (que) => function () { throw new Error(`SOLO LECTURA: se intentó ${que}`); };
for (const m of ['set', 'update', 'create', 'delete']) FS.DocumentReference.prototype[m] = prohibido(`DocumentReference.${m}`);
FS.CollectionReference.prototype.add = prohibido('CollectionReference.add');
FS.WriteBatch.prototype.commit = prohibido('WriteBatch.commit');
FS.Firestore.prototype.runTransaction = prohibido('runTransaction');
FS.Firestore.prototype.bulkWriter = prohibido('bulkWriter');
FS.Firestore.prototype.recursiveDelete = prohibido('recursiveDelete');

const arg = (n, def = null) => { const i = process.argv.indexOf(n); return i === -1 ? def : process.argv[i + 1]; };
const APERTURA = arg('--apertura');
const TRABAJO_DE_LA_CUENTA = arg('--trabajo-de-la-cuenta');
if (!APERTURA || Number.isNaN(Date.parse(APERTURA)) || !TRABAJO_DE_LA_CUENTA) throw new Error('--apertura ISO y --trabajo-de-la-cuenta ID son obligatorios');
const SALIDA = arg('--json');
const aperturaMs = Date.parse(APERTURA);
const huella = (v) => (v ? `huella:${crypto.createHash('sha256').update(String(v)).digest('hex').slice(0, 10)}` : null);
const iso = (t) => (t ? (typeof t.toDate === 'function' ? t.toDate().toISOString() : new Date(t).toISOString()) : null);
const tras = (t) => !!t && t.toMillis() > aperturaMs;
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const DIA = 86_400_000;
const PROHIBIDAS = ['providerId', 'model', 'modelId', 'adapter', 'provider', 'providerChain', 'implementationId'];
const clavesProhibidas = (v, ruta = '', out = []) => {
  if (Array.isArray(v)) v.forEach((x, i) => clavesProhibidas(x, `${ruta}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (PROHIBIDAS.includes(k)) out.push(`${ruta}.${k}`); clavesProhibidas(x, `${ruta}.${k}`, out); }
  return out;
};
const ESTADOS = ['decidido', 'sin_plan_del_core', 'no_decidido', 'violacion_de_autoridad', 'fuera_de_presupuesto', 'fallo', 'duplicado'];

admin.initializeApp({ projectId: 'get-wee' });
const db = admin.firestore();
const ahoraServidor = (await db.doc('aiSettings/sombra').get()).readTime.toMillis();
const UID = (await db.doc(`creatorJobs/${TRABAJO_DE_LA_CUENTA}`).get()).get('userId');
if (typeof UID !== 'string' || !UID) throw new Error('no se pudo leer la cuenta del trabajo');
const deLaCuenta = (x) => [x.get?.('userId') ?? x.userId, x.get?.('ownerId') ?? x.ownerId, x.get?.('accountId') ?? x.accountId].includes(UID);
const informe = { generado: new Date(ahoraServidor).toISOString(), apertura: APERTURA, cuenta: huella(UID), condiciones: {} };
const cond = (n, nombre, estado, detalle) => { informe.condiciones[n] = { nombre, estado, detalle }; };

/* ── A · La configuración: lo escrito, intacto, y nada más movido ──────────── */
const sombraDoc = await db.doc('aiSettings/sombra').get();
const G = sombraDoc.data() ?? {};
informe.puerta = {
  habilitado: G.habilitado, cuentas: Array.isArray(G.cuentas) ? G.cuentas.length : typeof G.cuentas,
  soloLaCuenta: Array.isArray(G.cuentas) && G.cuentas.length === 1 && G.cuentas[0] === UID,
  experiencias: G.experiencias, caminos: G.caminos, capacidades: G.capacidades,
  hasta: typeof G.hasta === 'number' ? new Date(G.hasta).toISOString() : G.hasta, claves: Object.keys(G).sort(),
  escritaEn: iso(sombraDoc.updateTime), intactaDesdeLaApertura: iso(sombraDoc.updateTime) === APERTURA,
};
const configExacta = G.habilitado === true && igual(Object.keys(G).sort(), ['caminos', 'capacidades', 'cuentas', 'experiencias', 'habilitado', 'hasta'])
  && informe.puerta.soloLaCuenta && igual(G.experiencias, ['travel']) && igual(G.caminos, ['puente', 'algoritmo']) && igual(G.capacidades, ['text.search']);
const movidos = [];
for (const c of ['aiSettings', 'aiRouting', 'aiProviders', 'creditCosts']) {
  for (const x of (await db.collection(c).get()).docs) if (!(c === 'aiSettings' && x.id === 'sombra') && x.updateTime.toMillis() > aperturaMs) movidos.push(`${c}/${x.id}`);
}
const runtime = await db.doc('aiSettings/runtime').get();
const visual = await db.doc('aiSettings/visualContext').get();

/* ── B · Las sombras escritas desde la apertura ──────────────────────────── */
const L = path.join(RAIZ, 'functions/lib') + path.sep;
const S = require(L + 'creator/sombra.js');
const { olvidarRegistro } = require(L + 'registry/index.js');
const clonar = (v) => JSON.parse(JSON.stringify(v));
class Base { constructor() { this.docs = new Map(); } collection(x) { return { doc: (id) => new Ref(this, `${x}/${id}`) }; } }
class Ref {
  constructor(d, x) { this.db = d; this.path = x; }
  collection(s) { return { doc: (id) => new Ref(this.db, `${this.path}/${s}/${id}`) }; }
  async get() { const d = this.db.docs.get(this.path); return { exists: d !== undefined, data: () => d && clonar(d), get: (k) => d?.[k] }; }
  async create(d) { this.db.docs.set(this.path, clonar(d)); }
}
let redLocal = 0;
const repetir = async (job, doc) => {
  const antes = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'presencia-simulada-no-es-una-clave';
  olvidarRegistro();
  const fetchReal = globalThis.fetch;
  globalThis.fetch = async () => { redLocal++; throw new Error('sin red'); };
  try {
    const f = new Base();
    await S.sombraDelPlan({
      jobRef: f.collection('creatorJobs').doc(doc.jobId), jobId: doc.jobId, userId: doc.userId, experienceId: doc.experienceId,
      goal: job.goal, legacyPlan: job.plan, entendimientoDe: async () => { throw new Error('el Brain no debía llamarse'); }, cronometro: () => 0, observar: () => {},
      puerta: { habilitado: true, cuentas: [doc.userId], experiencias: ['travel'], caminos: ['puente', 'algoritmo'], capacidades: ['text.search'] }, ahora: () => doc.creadaEn,
    });
    return f.docs.get(`creatorJobs/${doc.jobId}/private/sombra`);
  } finally {
    globalThis.fetch = fetchReal;
    if (antes === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = antes;
    olvidarRegistro();
  }
};
const sinTiempo = (v) => JSON.parse(JSON.stringify(v, (k, x) => (k === 'duracionMs' ? undefined : x)).replace(/"fuera_de_presupuesto"/g, '"decidido"'));
const textosDeLaPersona = (job) => [job.goal, job.plan?.explainToUser, ...(job.plan?.steps ?? []).flatMap((s) => [s.purpose, s.input?.brief]), ...(job.answers ?? []).map((a) => a.text)]
  .filter((t) => typeof t === 'string' && t.trim().length >= 8).map((t) => t.trim());

const privados = await db.collectionGroup('private').get();
const sombras = privados.docs.filter((x) => x.id === 'sombra' && tras(x.createTime));
const filas = [];
for (const x of sombras) {
  const d = x.data();
  const jobRef = x.ref.parent.parent;
  const job = (await jobRef.get()).data() ?? {};
  const al = d.algoritmo;
  const otra = al && job.plan ? await repetir(job, d) : undefined;
  filas.push({
    trabajo: jobRef.id, creada: iso(x.createTime), sobrescrita: x.updateTime.toMillis() !== x.createTime.toMillis(),
    cuentaAutorizada: d.userId === UID, experiencia: d.experienceId, contrato: d.contract, caminos: d.caminos, estado: d.estado,
    seccionesDeBrain: ['core', 'autoridad', 'regresion', 'entendimiento'].filter((k) => k in d),
    clavesDelDocumento: Object.keys(d).sort(),
    legacy: d.legacy ?? null,
    coreDesdePuente: d.coreDesdePuente ?? null,
    regresionDesdePuente: d.regresionDesdePuente ? { resumen: d.regresionDesdePuente.resumen, diferencias: (d.regresionDesdePuente.diferencias ?? []).length } : null,
    erroresDesdePuente: Array.isArray(d.erroresDesdePuente) ? d.erroresDesdePuente.length : d.erroresDesdePuente ?? null,
    algoritmo: al ? {
      contract: al.contract, shadowRunId: al.shadowRunId, shadowRunIdCorrecto: al.shadowRunId === `${jobRef.id}:algoritmo`,
      estado: al.estado, duracionMs: al.duracionMs, objetivo: al.objetivo, entrada: al.entrada,
      decision: al.decision ? {
        status: al.decision.status, recorrido: al.decision.recorrido, candidatas: al.decision.candidatas, estrategias: al.decision.estrategias,
        historial: al.decision.historial, confianza: al.decision.confianza, incertidumbre: al.decision.incertidumbre,
        elegida: al.decision.elegida, descartadas: Array.isArray(al.decision.descartadas) ? al.decision.descartadas.length : al.decision.descartadas,
        porque: Array.isArray(al.decision.porque) ? al.decision.porque.length : al.decision.porque, optimizacion: al.decision.optimizacion ?? null,
      } : null,
      violaciones: al.violaciones,
      comparacion: al.comparacion ? { resumen: al.comparacion.resumen, categorias: al.comparacion.categorias, total: al.comparacion.total, clavesDeLaComparacion: Object.keys(al.comparacion).sort() } : null,
      errores: Array.isArray(al.errores) ? al.errores.length : al.errores,
      claves: Object.keys(al).sort(),
      clavesProhibidas: clavesProhibidas(al),
    } : null,
    determinista: otra ? igual(sinTiempo(otra), sinTiempo(d)) : null,
    citaAlaPersona: textosDeLaPersona(job).filter((t) => JSON.stringify(d).includes(t)).map((t) => `${t.length} car`),
  });
}
informe.sombras = filas;

/* ── C · Llamadas a proveedor desde la apertura, clasificadas ────────────── */
const gen = await db.collection('aiGenerations').get();
const genTras = gen.docs.filter((x) => tras(x.createTime));
const clase = (g) => {
  const tag = `${g.stepId ?? ''} ${g.requestId ?? ''}`;
  if (/sombra/.test(tag)) return 'BRAIN (camino brain de la sombra)';
  if (/algoritmo|puente/.test(tag)) return 'ALGORITHM SHADOW';
  if (!g.stepId && g.capability === 'text.structure') return 'LEGACY (planificación: llmPlanner)';
  if (g.stepId && g.requestId === `${g.jobId}:${g.stepId}`) return 'LEGACY (ejecución: creatorRun)';
  if (/^brain_/.test(String(g.requestId ?? ''))) return 'LEGACY (brainChat)';
  return 'SIN ATRIBUIR';
};
informe.proveedor = genTras.map((x) => {
  const g = x.data();
  return { creada: iso(x.createTime), clase: clase(g), deLaCuenta: g.userId === UID, trabajo: g.jobId ?? null, capability: g.capability, provider: g.provider, model: g.model, status: g.status, providerCost: g.providerCost ?? 0, creditsCharged: g.creditsCharged ?? null };
});
const porClase = informe.proveedor.reduce((a, f) => ({ ...a, [f.clase]: { llamadas: (a[f.clase]?.llamadas ?? 0) + 1, costeUSD: (a[f.clase]?.costeUSD ?? 0) + (f.providerCost || 0) } }), {});
informe.proveedorPorClase = porClase;

/* ── D · Credits, Assets, trabajos, workflows ────────────────────────────── */
const nuevosEn = async (c) => (await db.collection(c).get()).docs.filter((x) => tras(x.createTime) || tras(x.updateTime));
const credit = await nuevosEn('creditTransactions');
const stats = await nuevosEn('creditStats');
const assets = await nuevosEn('assets');
const medios = await nuevosEn('mediaObjects');
const jobs = await nuevosEn('jobs');
const wf = await nuevosEn('workflowRuns');
const cj = (await db.collection('creatorJobs').get()).docs.filter((x) => tras(x.createTime) || tras(x.updateTime));
informe.colecciones = {
  creditTransactions: { tocadas: credit.length, deLaCuenta: credit.filter(deLaCuenta).length },
  creditStats: { tocados: stats.length },
  assets: { tocados: assets.length, deLaCuenta: assets.filter(deLaCuenta).length },
  mediaObjects: { tocados: medios.length },
  jobs: { tocados: jobs.length }, workflowRuns: { tocados: wf.length },
  creatorJobs: cj.map((x) => ({ id: x.id, creado: iso(x.createTime), actualizado: iso(x.updateTime), deLaCuenta: deLaCuenta(x), experiencia: x.get('experienceId'), estado: x.get('status'),
    pasos: (x.get('plan')?.steps ?? []).map((s) => `${s.capability}/${s.input?.kind ?? '-'}${s.input?.count !== undefined ? `×${s.input.count}` : ''}${(s.dependsOn ?? []).length ? ` ←${s.dependsOn.length}` : ''}`),
    creditsEstimated: x.get('creditsEstimated') ?? null, creditsCharged: x.get('creditsCharged') ?? null, resultados: (x.get('results') ?? []).length })),
};
/* Totales, para la línea base. */
informe.totales = {};
for (const c of ['aiGenerations', 'creditTransactions', 'creditStats', 'assets', 'mediaObjects', 'jobs', 'creatorJobs', 'workflowRuns', 'creatorUsage', 'aiUsage']) informe.totales[c] = (await db.collection(c).count().get()).data().count;
informe.totales.private = privados.size;
informe.totales.privateSombra = privados.docs.filter((x) => x.id === 'sombra').length;
informe.totales.privateSombraConAlgoritmo = privados.docs.filter((x) => x.id === 'sombra' && x.get('algoritmo') !== undefined).length;

/* ── D' · De quién es cada cargo y cada ejecución (#3 y #5) ──────────────── *
 * Solo identificadores, tipos e importes. Los ids de movimientos de OTRAS cuentas
 * salen como huella: algunos (la bienvenida) llevan el uid de la cuenta dentro. */
const texto_ = (v) => (typeof v === 'string' ? v : undefined);
const hechos = {
  idsDeLaSombra: new Set(privados.docs.filter((x) => x.id === 'sombra').map((x) => x.get('algoritmo')?.shadowRunId).filter((v) => typeof v === 'string')),
  creditos: credit.map((x) => {
    const t = x.data();
    return { id: x.id, userId: t.userId, type: t.type, amount: t.amount, status: t.status, source: t.source, requestId: texto_(t.requestId), generationId: texto_(t.generationId),
      meta: { requestId: texto_(t.meta?.requestId), stepId: texto_(t.meta?.stepId), shadowRunId: texto_(t.meta?.shadowRunId) } };
  }),
  filas: gen.docs.map((x) => { const g = x.data(); return { id: x.id, jobId: g.jobId ?? null, userId: g.userId ?? null, stepId: g.stepId ?? null, requestId: g.requestId ?? null, capability: g.capability ?? null, creditTransactionId: g.creditTransactionId ?? null }; }),
  trabajos: cj.map((x) => ({ id: x.id, userId: x.get('userId'), status: x.get('status') })),
  jobsNuevos: jobs.map((x) => ({ id: x.id, ...x.data() })),
  workflowsNuevos: wf.map((x) => ({ id: x.id, ...x.data() })),
  estadisticasTocadas: stats.length,
};
const IDENTIDAD = identidadDeLaSombra(S);
const c3 = condicionCreditos(hechos, IDENTIDAD, UID);
const c5 = condicionEjecuciones(hechos, IDENTIDAD, UID);
const sinUid = (id, deLaCuentaDeLaCanary) => (deLaCuentaDeLaCanary ? String(id).split(UID).join('‹cuenta›') : huella(id));
/* #4 (S1.5): los materiales, por su PROCEDENCIA. Solo sus identificadores; nunca nombre, contenido ni URL. */
const soloTextos = (o) => Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => typeof v === 'string'));
const hechosDeMateriales = {
  idsDeLaSombra: hechos.idsDeLaSombra,
  filas: hechos.filas,
  assetsTodos: (await db.collection('assets').get()).docs.map((x) => {
    const a = x.data();
    const p = a.provenance ?? {};
    return {
      assetId: typeof a.assetId === 'string' ? a.assetId : x.id, ownerAccountId: a.ownerAccountId,
      provenance: { generationId: texto_(p.generationId), jobId: texto_(p.jobId), runId: texto_(p.runId), stepId: texto_(p.stepId), requestId: texto_(p.requestId),
        operationId: texto_(p.operationId), traceId: texto_(p.traceId), sourceAssetIds: Array.isArray(p.sourceAssetIds) ? p.sourceAssetIds.filter((v) => typeof v === 'string') : [] },
      metadata: soloTextos(a.metadata),
    };
  }),
  assetsNuevos: new Set(assets.map((x) => (typeof x.get('assetId') === 'string' ? x.get('assetId') : x.id))),
  objetosNuevos: medios.map((x) => ({ id: x.id, ...soloTextos(x.data()) })),
  /* El trabajo del motor se guarda con un id CODIFICADO; el que llevan las procedencias es su campo `jobId`. Van los dos. */
  jobsDelMotor: new Set((await db.collection('jobs').select('jobId').get()).docs.flatMap((x) => [x.id, x.get('jobId')].filter((v) => typeof v === 'string'))),
};
const c4 = condicionAssets(hechosDeMateriales, IDENTIDAD, UID);
informe.atribucion = {
  creditos: { ...c3, movimientos: c3.movimientos.map((m) => ({ ...m, id: sinUid(m.id, m.deLaCuenta) })) },
  materiales: c4,
  ejecuciones: c5,
};

/* ── E · Registros desde la apertura ─────────────────────────────────────── */
const cliente = await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/logging.read'] }).getClient();
const logs = [];
let pt;
do {
  const r = await cliente.request({ url: 'https://logging.googleapis.com/v2/entries:list', method: 'POST',
    data: { resourceNames: ['projects/get-wee'], filter: `resource.type="cloud_run_revision" AND timestamp>="${APERTURA}"`, orderBy: 'timestamp asc', pageSize: 500, ...(pt ? { pageToken: pt } : {}) } });
  logs.push(...(r.data.entries ?? []));
  pt = r.data.nextPageToken;
} while (pt && logs.length < 10000);
const texto = (e) => String(e.textPayload ?? e.jsonPayload?.message ?? '').replace(/\s+/g, ' ');
const cc = logs.filter((e) => e.resource?.labels?.service_name === 'creatorchat');
const lineas = cc.filter((e) => !e.httpRequest && texto(e)).map((e) => `${e.timestamp} ${e.severity ?? '-'} ${texto(e).split(UID).join('‹cuenta›').slice(0, 190)}`);
informe.registros = {
  servicios: [...new Set(logs.map((e) => e.resource?.labels?.service_name))],
  peticiones: cc.filter((e) => e.httpRequest).map((e) => `${e.timestamp} ${e.httpRequest.status} ${e.httpRequest.latency}`),
  sombra: lineas.filter((l) => /WEË SOMBRA/.test(l)),
  brainDeLaSombra: lineas.filter((l) => /WEË BRAIN.*:sombra|:sombra/.test(l)).length,
  errores: cc.filter((e) => ['ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY'].includes(e.severity) || (e.httpRequest?.status ?? 0) >= 500).length,
  lineas,
};

/* ── Las 24 condiciones ──────────────────────────────────────────────────── */
const ok = (b) => (b ? 'OK' : 'STOP');
const conAl = filas.filter((f) => f.algoritmo);
const nClase = (c) => porClase[c]?.llamadas ?? 0;
cond(1, 'provider call del Algorithm Shadow', ok(nClase('ALGORITHM SHADOW') === 0 && nClase('SIN ATRIBUIR') === 0), `algorithm shadow=${nClase('ALGORITHM SHADOW')} · sin atribuir=${nClase('SIN ATRIBUIR')} · legacy=${Object.entries(porClase).filter(([k]) => k.startsWith('LEGACY')).map(([k, v]) => `${k}:${v.llamadas}`).join(', ') || 0}`);
cond(2, 'Router execution del shadow', ok(jobs.length === 0 && runtime.get('habilitado') === false && runtime.updateTime.toMillis() <= aperturaMs), `jobs nuevos=${jobs.length} · runtime ${runtime.get('habilitado')} (sin tocar=${runtime.updateTime.toMillis() <= aperturaMs})`);
/* #3 y #5: por la IDENTIDAD de la sombra, no por la cuenta ni por el trabajo (ver canary-sombra-atribucion.mjs). */
cond(3, 'Credits charged por shadow', c3.estado, `shadowCreditsCharged=${c3.shadowCreditsCharged} · legacyCreditsCharged=${c3.legacyCreditsCharged} · movimientos=${c3.movimientos.length} (sombra ${c3.movimientos.filter((m) => m.de === 'SOMBRA').length}, legacy ${c3.movimientos.filter((m) => m.de === 'LEGACY').length}, sin atribuir de la cuenta ${c3.sinAtribuirDeLaCuenta}) · creditStats=${stats.length}`);
/* #4 (S1.5): por la PROCEDENCIA del material, no por su dueño (ver canary-sombra-atribucion.mjs). */
cond(4, 'Asset creado por shadow', c4.estado, `shadowAssetsCreated=${c4.shadowAssetsCreated} · legacyAssetsCreated=${c4.legacyAssetsCreated} · shadowMediaObjects=${c4.shadowMediaObjects} · sin atribuir de la cuenta=${c4.sinAtribuirDeLaCuenta} · assets=${assets.length} · mediaObjects=${medios.length}`);
cond(5, 'execution Job del shadow', c5.estado, `shadowExecutionJobs=${c5.shadowExecutionJobs} · legacyExecutionJobs=${c5.legacyExecutionJobs} · jobs=${jobs.length} · workflowRuns=${wf.length}`);
cond(6, 'workflow del shadow', wf.length ? 'INVESTIGAR' : 'OK', `workflowRuns=${wf.length}`);
cond(7, 'Brain ejecutado con paths sin brain', ok(nClase('BRAIN (camino brain de la sombra)') === 0 && filas.every((f) => !f.seccionesDeBrain.length && igual(f.caminos, ['puente', 'algoritmo'])) && informe.registros.brainDeLaSombra === 0), `filas brain=${nClase('BRAIN (camino brain de la sombra)')} · secciones brain=${filas.filter((f) => f.seccionesDeBrain.length).length}`);
cond(8, 'capability fuera de text.search', ok(conAl.every((f) => (f.algoritmo.entrada?.capacidades ?? []).every((c) => c === 'text.search'))), JSON.stringify([...new Set(conAl.flatMap((f) => f.algoritmo.entrada?.capacidades ?? []))]));
cond(9, 'account fuera de la cuenta autorizada', ok(filas.every((f) => f.cuentaAutorizada) && filas.every((f) => f.experiencia === 'travel')), `sombras=${filas.length} · de la cuenta=${filas.filter((f) => f.cuentaAutorizada).length}`);
cond(10, 'providerId/model/adapter dentro de la decisión', ok(conAl.every((f) => f.algoritmo.clavesProhibidas.length === 0)), JSON.stringify(conAl.flatMap((f) => f.algoritmo.clavesProhibidas)));
cond(11, 'authority violation', ok(conAl.every((f) => f.algoritmo.violaciones === 0 && f.algoritmo.estado !== 'violacion_de_autoridad')), `violaciones=${conAl.map((f) => f.algoritmo.violaciones).join(',') || '-'}`);
/*
 * «Shadow error» = la sombra se rompió: estado `fallo` (del documento o de la sección), la categoría
 * SHADOW_ERROR de su comparación, o la línea «WEË SOMBRA: falla». NO lo es `algoritmo.errores`: son
 * los ERRORES DE PARIDAD del comparador (`erroresDeParidad`, paridad.ts:409), diferencias
 * LEGACY_ONLY_INFORMATION/UNSUPPORTED que se cuentan como diagnóstico; ni `estado: omitido`, que es
 * «al Brain no se le preguntó» (sombra.ts). Corregido tras la primera ejecución: la regla v1 los
 * confundía y dio un STOP falso.
 */
cond(12, 'shadow error', ok(filas.every((f) => f.estado !== 'fallo' && f.algoritmo?.estado !== 'fallo' && (f.algoritmo?.comparacion?.categorias?.SHADOW_ERROR ?? 0) === 0) && !informe.registros.sombra.some((l) => /WEË SOMBRA: falla/.test(l))),
  `estados=${filas.map((f) => `${f.estado}/${f.algoritmo?.estado}`).join(',') || '-'} · SHADOW_ERROR=${filas.map((f) => f.algoritmo?.comparacion?.categorias?.SHADOW_ERROR ?? '-').join(',') || '-'} · errores de paridad (diagnóstico, no parada)=${filas.map((f) => f.algoritmo?.errores ?? '-').join(',') || '-'}`);
cond(13, 'malformed shadow evidence', ok(filas.every((f) => f.contrato === '1.2' && f.algoritmo && f.algoritmo.shadowRunIdCorrecto && ESTADOS.includes(f.algoritmo.estado) && typeof f.algoritmo.duracionMs === 'number')), JSON.stringify(filas.map((f) => ({ c: f.contrato, id: f.algoritmo?.shadowRunIdCorrecto, e: f.algoritmo?.estado }))));
cond(14, 'raw user text persistido', ok(filas.every((f) => f.citaAlaPersona.length === 0)), JSON.stringify(filas.map((f) => f.citaAlaPersona)));
cond(15, 'duplicate shadow document', ok(filas.every((f) => !f.sobrescrita)), `sobrescritas=${filas.filter((f) => f.sobrescrita).length} · carreras resueltas como duplicado (log)=${informe.registros.sombra.filter((l) => /duplicada/.test(l)).length}`);
cond(16, 'nondeterministic decision', ok(conAl.every((f) => f.determinista === true)), `repetidas=${conAl.length} · iguales=${conAl.filter((f) => f.determinista === true).length} · red local=${redLocal}`);
cond(17, 'configuration mutation fuera de aiSettings/sombra', ok(movidos.length === 0), movidos.join(', ') || 'ninguna');
const fallos = filas.filter((f) => f.estado === 'fallo' || ['fallo', 'violacion_de_autoridad'].includes(f.algoritmo?.estado)).length;
cond(18, 'más de 2 fallos de canary', ok(fallos <= 2), `fallos=${fallos} · lentas (fuera_de_presupuesto)=${conAl.filter((f) => f.algoritmo.estado === 'fuera_de_presupuesto').length}`);
cond(19, 'hasta inválido', typeof G.hasta === 'number' && G.hasta > ahoraServidor && G.hasta <= aperturaMs + 7 * DIA ? 'OK' : typeof G.hasta === 'number' && G.hasta <= ahoraServidor ? 'CERRAR (plazo cumplido)' : 'STOP', informe.puerta.hasta);
cond(20, 'wildcard accidental', ok(informe.puerta.soloLaCuenta && configExacta && informe.puerta.intactaDesdeLaApertura), `una cuenta=${informe.puerta.soloLaCuenta} · config exacta=${configExacta} · intacta=${informe.puerta.intactaDesdeLaApertura}`);
cond(21, 'runtime gate modificado', ok(runtime.updateTime.toMillis() <= aperturaMs && runtime.get('habilitado') === false), iso(runtime.updateTime));
cond(22, 'visualContext modificado', ok(!visual.exists), visual.exists ? 'EXISTE' : 'no existe');
cond(23, 'aiRouting modificado', ok(!movidos.some((m) => m.startsWith('aiRouting/'))), movidos.filter((m) => m.startsWith('aiRouting/')).join(', ') || 'intacto');
cond(24, 'aiProviders modificado', ok(!movidos.some((m) => m.startsWith('aiProviders/'))), movidos.filter((m) => m.startsWith('aiProviders/')).join(', ') || 'intacto');
cond('límite', 'como mucho 20 planned jobs', conAl.length >= 20 ? 'CERRAR' : 'OK', `${conAl.length}/20`);
const estados = Object.values(informe.condiciones).map((c) => c.estado);
informe.veredicto = estados.some((e) => e === 'STOP') ? 'STOP' : estados.some((e) => e.startsWith('CERRAR')) ? 'CERRAR' : estados.includes('INVESTIGAR') ? 'INVESTIGAR' : 'OK';

if (SALIDA) fs.writeFileSync(SALIDA, JSON.stringify(informe, null, 1));
const { registros, sombras: _s, ...resto } = informe;
console.log(JSON.stringify({ ...resto, sombras: filas.length, registros: { servicios: registros.servicios, peticiones: registros.peticiones.length, sombra: registros.sombra, errores: registros.errores } }, null, 1));
