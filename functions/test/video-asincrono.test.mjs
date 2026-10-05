/**
 * PRE-F1-D · LA RUTA ASÍNCRONA DE VÍDEO, DE LA PUERTA AL DINERO.
 *
 * `generateVideo` deja de esperar dentro de la llamada: ModelArk acepta la
 * tarea, la llamada contesta ACCEPTED en segundos y el trabajo del Core se
 * queda con la referencia del proveedor. Desde ahí, solo lo que ModelArk
 * conteste decide el dinero, y lo decide el barrido que ya estaba desplegado:
 *
 *     generateVideo → reserva → conductor → Seedance acepta (taskId)
 *       → trabajo `waiting` con su referencia → ACCEPTED
 *       → barrido: reconciliador → resolutor de Seedance → atención
 *         → materialización → motor de trabajos → liquidación
 *         → completeCredits · refundCredits
 *
 * Aquí se recorre ENTERO con las piezas de verdad —la puerta, el conductor, el
 * Job Engine, el almacén de trabajos, el reconciliador, el barrendero y el
 * Credit Engine—, sobre un Firestore en memoria. Lo único de mentira es lo que
 * está al otro lado de la red: el adaptador de Seedance (que acepta o rechaza),
 * lo que ModelArk contesta cuando se le pregunta, y el almacén al que se trae
 * el vídeo. Ninguna prueba sale a la red, y menos a un proveedor.
 *
 * Lo que se autorizó el 2026-09-27, y se mira una por una:
 *   · la aceptación asíncrona encendida, con el trabajo viviendo lo que
 *     `plazos.ts` le da a un vídeo (2 h 15 min), nunca 120 s;
 *   · UN intento para el vídeo de esta puerta: un fallo de ModelArk es final y
 *     se devuelve exacto, sin un segundo POST;
 *   · legacy intacta; la rama colgada no toca la reserva de un trabajo del Core;
 *   · el estado ACCEPTED se pinta con claves que ya existen.
 *
 * Usa el compilado: `npm run build` antes de `npm test`.
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { crearCargador } from './filmmaker-cliente.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const git = (args) => execSync(`git ${args}`, { cwd: RAIZ, encoding: 'utf8' });
/** El commit sobre el que se activó la ruta: lo que NO debía moverse se compara con él. */
const ANTES = '8e91daa';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const intento = async (fn) => { try { return { ok: true, valor: await fn() }; } catch (error) { return { ok: false, error }; } };

/* ═══ El reloj: la puerta, el conductor y el Credit Engine leen `Date.now`, y aquí se adelanta ═══ */
const relojReal = Date.now.bind(Date);
let adelanto = 0;
Date.now = () => relojReal() + adelanto;
const MINUTO = 60_000;

/* ═══ Firestore en memoria, con lo que piden el almacén de trabajos, el libro y el Credit Engine ═══ */
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
  /* Transacciones en fila, como las serializa Firestore: lo que una escribe lo lee la siguiente. */
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
  for (const [k, v] of Object.entries(w.data)) {
    const r = resolver(v, out[k], false);
    if (r === undefined) delete out[k]; else out[k] = r;
  }
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
  otra(cambios) { return Object.assign(new Consulta(this.base, this.path, this.filtros, this.tope, this.porId, this.despues), cambios); }
  where(campo, op, valor) {
    if (op !== '==' && op !== 'array-contains') throw new Error(`esta base de prueba solo sabe «==» y «array-contains»: ${op}`);
    return this.otra({ filtros: [...this.filtros, [campo, op, valor]] });
  }
  /* El único orden que usan el almacén de trabajos y el barrendero: por el identificador del documento. */
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

/* ═══ Las piezas de verdad ═══════════════════════════════════════════════ */
const video = lib('creator/video.js');
const rt = lib('runtime/index.js');
const core = lib('core/index.js');
const { olvidarLaPuerta } = lib('runtime/configuracion.js');
const { creditEngine } = lib('credits/creditEngine.js');
const { ProviderError } = lib('engine/http.js');
const { leerAvisoDeSeedance } = lib('engine/providers/seedance.js');
const { normalizeVideoRequest } = lib('engine/video.js');
const { loadConfig } = lib('engine/config.js');
const { DEFAULT_ROUTING, ADAPTERS } = lib('engine/registry.js');

/* ═══ Lo que está al otro lado de la red, de mentira ═════════════════════ */

/* El adaptador de Seedance: acepta y suelta, o rechaza el POST. Nada sale de aquí. */
const seedance = ADAPTERS.seedance;
const llamadas = [];
let modelArk = null;
seedance.isConfigured = () => true;
seedance.run = async (req) => {
  llamadas.push({ capability: req.capability, acceptAsync: req.acceptAsync, input: req.input });
  return modelArk(req);
};
let serieDeTareas = 0;
const aceptar = () => async (req) => {
  const taskId = `cgt-prueba-${String(++serieDeTareas).padStart(4, '0')}`;
  return { accepted: { operationId: taskId }, costUSD: 0.21, latencyMs: 4, model: req.model?.id, meta: { providerTaskId: taskId, requestedDurationSec: 5 } };
};
const rechazar = () => async () => { throw new ProviderError('seedance respondió 400: parámetro inválido', 'seedance', 400, false); };

/* Lo que ModelArk contesta cuando se le PREGUNTA por una tarea. Sin entrada: no contesta. */
const enModelArk = new Map();
const cuerpo = (taskId, status, extra = {}) => ({ id: taskId, status, updated_at: Math.floor(Date.now() / 1000), ...extra });
const resolutor = {
  preguntas: [],
  async consultar(ref) {
    this.preguntas.push(ref.operationId);
    const e = enModelArk.get(ref.operationId);
    if (!e || e === 'no_contesta') return { conocido: false, motivo: 'no_contesta' };
    return { conocido: true, aviso: leerAvisoDeSeedance(e) };
  },
};
/* El almacén al que se trae el vídeo. Cuando dice que sí, deja la ficha como la dejaría el de verdad. */
let traer = 'ok';
const traidos = [];
const materializador = {
  async guardar(p) {
    traidos.push(p);
    if (traer !== 'ok') return { ok: false, motivo: traer };
    if (!base.docs.has(`assets/${p.assetId}`)) {
      base.docs.set(`assets/${p.assetId}`, {
        assetId: p.assetId, ownerAccountId: p.userId, kind: p.kind, status: 'ready',
        delivery: { url: `https://almacen.invalid/users/${p.userId}/ai-generations/${p.assetId}.mp4?token=t`, kind: 'bearer_token' },
      });
    }
    return { ok: true, assetId: p.assetId, yaEstaba: false };
  },
};
/* UNA pasada del barrido desplegado: preguntar y después liquidar, compuesta como en producción salvo lo de la red. */
const pasada = () => rt.mantenimientoDeWee({
  reconciliacion: () => rt.reconciliacionDeWee({ db: base, resolutores: { seedance: resolutor }, materializar: materializador, quietoDesdeMs: 0 })(),
  liquidacion: () => rt.barridoDeLiquidacionDeWee({ db: base })(),
})();

/* ═══ Las cuentas, la puerta abierta para ellas, y cómo se pide ═══════════ */
const CUENTAS = ['pruebaB0001', 'pruebaJ0001', 'pruebaR0001', 'pruebaG0001', 'pruebaF0001', 'pruebaD0001', 'pruebaC0001', 'pruebaE0001', 'pruebaI0001', 'pruebaA0001', 'pruebaBrain0001', 'pruebaX0001', 'pruebaS0001', 'pruebaT0001'];
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
const reembolso = (requestId) => base.leer(`creditTransactions/refund_${requestId}`);
const trabajoDe = (uid, requestId) => rt.trabajoDelMedioDeWee(base, uid, requestId);
const codigo = (r) => (r.ok ? 'ok' : `${r.error.code} · ${r.error.details?.code ?? ''}${r.error.details?.reason ? ` · ${r.error.details.reason}` : ''}`);
const HORAS_2_15 = 2 * 60 * MINUTO + 15 * MINUTO;

/* ═══ A · LO DECIDIDO, LEÍDO EN EL CÓDIGO ════════════════════════════════ */
console.log('\n── A · Lo autorizado, en el código: bandera, plazo, un intento, Seedance y nada nuevo ──');
const VIDEO_SRC = leer('functions/src/creator/video.ts');
const VIDEO = sinComentarios(VIDEO_SRC);
{
  check('A1) la aceptación asíncrona está encendida en su único sitio', /const ACEPTA_ASINCRONO: boolean = true;/.test(VIDEO));
  const { PLAZOS_DE_VIDEO, politicaDe, revisarPlazos } = rt;
  check('A2) el plazo de vídeo de plazos.ts es 2 h 15 min, y sus relojes se sostienen', PLAZOS_DE_VIDEO.vidaDelTrabajoMs === HORAS_2_15 && revisarPlazos(PLAZOS_DE_VIDEO).length === 0,
    `${PLAZOS_DE_VIDEO.vidaDelTrabajoMs} ms`);
  check('A3) la puerta lo LEE de plazos.ts: ni 120 s ni un número escrito a mano',
    /PLAZO_DEL_TRABAJO_MS = ACEPTA_ASINCRONO \? PLAZOS_DE_VIDEO\.vidaDelTrabajoMs : POLITICA_DE_TRABAJO\.maxLifetimeMs/.test(VIDEO)
    && !/120_000|8_100_000|MARGEN_DEL_CANARY_MS/.test(VIDEO));
  check('A4) la política del vídeo son los relojes de plazos.ts y UN intento, por la costura `politica` del conductor',
    /const POLITICA_DEL_VIDEO = politicaDe\(PLAZOS_DE_VIDEO, \{\s*\.\.\.POLITICA_DE_TRABAJO,\s*retry: \{ \.\.\.POLITICA_DE_TRABAJO\.retry, maxAttempts: 1 \},\s*\}\);/.test(VIDEO));
  const abre = VIDEO.indexOf('conductorDeWee({');
  const args = VIDEO.slice(abre, VIDEO.indexOf('})', abre));
  check('A5) y el conductor la recibe, UNA vez, detrás de la puerta', (VIDEO.match(/conductorDeWee\(\{/g) || []).length === 1
    && /politica: POLITICA_DEL_VIDEO/.test(args) && /aceptaAsincrono: ACEPTA_ASINCRONO/.test(args) && VIDEO.indexOf('if (porElCore) {') < abre);
  const politica = politicaDe(PLAZOS_DE_VIDEO, { ...core.POLITICA_DE_TRABAJO, retry: { ...core.POLITICA_DE_TRABAJO.retry, maxAttempts: 1 } });
  check('A6) esa política es exactamente: un intento, vida 2 h 15 min, envío de un minuto, concesión de un minuto',
    politica.retry.maxAttempts === 1 && politica.maxLifetimeMs === HORAS_2_15 && politica.attemptTimeoutMs === 60_000 && politica.leaseMs === 60_000);
  check('A7) y el Job Engine sigue con sus tres intentos para todos los demás', core.POLITICA_DE_TRABAJO.retry.maxAttempts === 3 && core.POLITICA_DE_TRABAJO.maxLifetimeMs === 600_000);
  check('A8) Seedance y solo Seedance: la cadena de `video.generate`, y la puerta no admite a otro',
    JSON.stringify((DEFAULT_ROUTING['video.generate']?.chain ?? []).map((e) => e.provider)) === JSON.stringify(['seedance'])
    && /allowedProviders: \['seedance'\]/.test(VIDEO) && /const CAPACIDAD_DEL_CANARY: CapabilityId = 'video\.generate';/.test(VIDEO));
  /* Ni segundo conductor, ni tercera puerta, ni segundo Job Engine de vídeo, ni segunda contabilidad. */
  const fuentes = execSync('git ls-files functions/src', { cwd: RAIZ, encoding: 'utf8' }).trim().split('\n').filter((f) => f.endsWith('.ts'));
  const con = (re) => fuentes.filter((f) => re.test(sinComentarios(leer(f))));
  check('A9) un solo conductor', JSON.stringify(con(/export const crearConductor\b/)) === JSON.stringify(['functions/src/runtime/conductor.ts']));
  check('A10) la puerta CORE/LEGACY la consultan solo brainChat y generateVideo',
    JSON.stringify(con(/decidirRuntime\(/).filter((f) => !f.startsWith('functions/src/runtime/'))) === JSON.stringify(['functions/src/creator/brain.ts', 'functions/src/creator/video.ts']));
  check('A11) la puerta de vídeo no fabrica un motor de trabajos propio: el único lo construye el conductor',
    !/crearJobEngine\(|crearMotorDeTrabajosDeWee\(|crearConductor\(/.test(VIDEO));
  const antes = git(`show ${ANTES}:functions/src/creator/video.ts`);
  const cobros = (s) => (sinComentarios(s).match(/creditEngine\.(spend|complete|refund)Credits\(/g) || []).length;
  /*
   * Una sola llamada nueva, y es una DEVOLUCIÓN: `sinReservaHuerfana` (revisión post-auditoría 2026-10-01,
   * server/reembolso/creator/video.ts#generateVideo) devuelve la reserva cuando el camino del Core falla ANTES
   * de que exista el trabajo. Ningún cobro ni confirmación nuevos.
   */
  const dentroDeLaDevolucion = (s) => {
    const i = s.indexOf('export const sinReservaHuerfana');
    return i < 0 ? '' : s.slice(i, s.indexOf('\n};', i));
  };
  check('A12) ni una llamada nueva al dinero salvo UNA devolución, la de la reserva sin trabajo', cobros(VIDEO_SRC) === cobros(antes) + 1
    && (sinComentarios(dentroDeLaDevolucion(VIDEO_SRC)).match(/creditEngine\.refundCredits\(/g) || []).length === 1
    && !/creditEngine\.(spend|complete)Credits\(/.test(sinComentarios(dentroDeLaDevolucion(VIDEO_SRC))), `${cobros(antes)} → ${cobros(VIDEO_SRC)}`);

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
  /*
   * + misión fal (2026-10-05), con autorización del dueño: core/router.ts +2 −2 (la modalidad '3d' en la lista del
   *   Router del Core y en su guardia) y credits/creditCosts.ts +8 (el servicio `ai_world`: precio de prueba, etiqueta y
   *   capacidad). Ni gasto, ni cobro, ni reembolso. Líneas exactas en job-queue 63fal.
   */
  const DE_LA_MISION_FAL = '2\t2\tfunctions/src/core/router.ts\n8\t0\tfunctions/src/credits/creditCosts.ts';
  check('A13) y el Credit Engine es el de 61d2cdf + 8e91daa, sin tocar — salvo el cierre de spendCredits del Harness (b878068) y el servicio ai_world de la misión fal, del tamaño exacto',
    git(`diff --numstat ${ANTES} -- functions/src/credits functions/src/core/financial functions/src/core/router.ts`).trim().replace(/\r/g, '') === `${DE_LA_MISION_FAL}\n${CREDITS_DEL_HARNESS}`);
  const medios = sinComentarios(leer('functions/src/runtime/medios.ts'));
  const ayudante = medios.slice(medios.indexOf('export const trabajoDelMedio'), medios.indexOf('const sinNada'));
  check('A14) la pregunta nueva de la puerta es de SOLO lectura: `porIdempotencia`, y nada más',
    /trabajos\.porIdempotencia\(alcanceDeIdempotencia\(userId\), claveDePaso\(ejecucionDelMedio\(requestId\), PASO_DE_MEDIO, 1\)\)/.test(ayudante)
    && !/aplicar|crearSiAusente|recibirEvento|informar|reclamar/.test(ayudante));
}

/* ═══ B · EL JOB ENGINE CON LA POLÍTICA DEL VÍDEO: sin Firestore, sin red ═════ */
console.log('\n── B · Un intento y dos horas y cuarto: qué cambia en el motor de trabajos ──');
{
  const motorDe = (politica) => core.crearJobEngine(politica);
  const politicaVideo = rt.politicaDe(rt.PLAZOS_DE_VIDEO, { ...core.POLITICA_DE_TRABAJO, retry: { ...core.POLITICA_DE_TRABAJO.retry, maxAttempts: 1 } });
  const T = 1_700_000_000_000;
  const aceptadoCon = (motor, deadlineAt) => {
    const creado = motor.crear({
      contract: core.JOB_ENGINE_CONTRACT_VERSION, principal: { userId: 'uPura' }, at: T, capability: 'video.generate',
      implementation: { providerId: 'seedance', modelId: 'seedance-2-0-fast' }, input: { prompt: 'una ola' },
      trace: { traceId: 'tr-pura', requestId: 'rq-pura', userId: 'uPura' }, metadata: { creditRequestId: 'rq-pura', creditTransactionId: 'usage_rq-pura', creditsEstimated: 75, service: 'ai_video_draft' },
      mode: 'sync', idempotencyKey: `k-${deadlineAt}`, deadlineAt, context: { appId: 'wee', operationId: 'rq-pura' },
    });
    let job = creado.job;
    const reclamo = motor.reclamar(job, { principal: { userId: 'uPura' }, at: T + 10, worker: 'w-pura' }); job = reclamo.job;
    job = motor.marcarEnvio(job, { principal: { userId: 'uPura' }, at: T + 20, worker: 'w-pura', attemptId: reclamo.dispatch.attemptId }).job;
    job = motor.informar(job, { principal: { userId: 'uPura' }, at: T + 30, worker: 'w-pura', report: { attemptId: reclamo.dispatch.attemptId, outcome: 'unknown', dispatched: true, providerRef: { providerId: 'seedance', operationId: 'cgt-pura' } } }).job;
    return job;
  };
  const conVideo = aceptadoCon(motorDe(politicaVideo), T + HORAS_2_15);
  check('B1) aceptado: `waiting`, con la referencia del proveedor y un desenlace que todavía no se sabe',
    conVideo.state === 'waiting' && conVideo.attempts[0].providerRef?.operationId === 'cgt-pura' && conVideo.attempts[0].outcome === 'unknown');
  const fallaVideo = motorDe(politicaVideo).recibirEvento(conVideo, { eventId: 'ev-fallo', jobId: conVideo.jobId, attemptId: conVideo.attempts[0].attemptId, kind: 'failed', providerRef: { providerId: 'seedance', operationId: 'cgt-pura' } }, T + 5 * MINUTO);
  check('B2) ModelArk dice FAILED: con UN intento el trabajo termina `failed`, sin reintento programado',
    fallaVideo.job.state === 'failed' && fallaVideo.transition?.reason === 'attempts_exhausted' && fallaVideo.job.attemptCount === 1);
  check('B3) y la liquidación lo DEVUELVE entero: fallo definitivo', JSON.stringify(rt.decidirLiquidacion(fallaVideo.job, T + 5 * MINUTO)) === JSON.stringify({ tipo: 'reembolsar', motivo: 'fallo_definitivo' }));
  /* CONTROL: lo que pasaba con los tres intentos de siempre. */
  const conTres = aceptadoCon(motorDe(core.POLITICA_DE_TRABAJO), T + 10 * MINUTO);
  const fallaTres = motorDe(core.POLITICA_DE_TRABAJO).recibirEvento(conTres, { eventId: 'ev-fallo-3', jobId: conTres.jobId, attemptId: conTres.attempts[0].attemptId, kind: 'failed', providerRef: { providerId: 'seedance', operationId: 'cgt-pura' } }, T + 1 * MINUTO);
  check('B4) CONTROL · con tres intentos el mismo fallo vuelve a la COLA, y nadie la atiende: el dinero queda retenido',
    fallaTres.job.state === 'queued' && rt.decidirLiquidacion(fallaTres.job, T + 1 * MINUTO).tipo === 'esperar');
  const tresMinutos = motorDe(politicaVideo).evaluar(conVideo, T + 3 * MINUTO);
  check('B5) a los tres minutos el trabajo aceptado SIGUE esperando: nadie lo vence', tresMinutos.status === 'noop' || tresMinutos.job?.state === 'waiting', tresMinutos.job?.state ?? tresMinutos.status);
  /* CONTROL: con el plazo de antes —120 s— el mismo trabajo ya estaba vencido a los tres minutos. */
  const conCiento = aceptadoCon(motorDe(core.POLITICA_DE_TRABAJO), T + 120_000);
  const vencido = motorDe(core.POLITICA_DE_TRABAJO).evaluar(conCiento, T + 3 * MINUTO);
  check('B6) CONTROL · con 120 s se vencía, y vencido va a «reconciliar», que nadie resuelve',
    vencido.job?.state === 'timed_out' && rt.decidirLiquidacion(vencido.job, T + 3 * MINUTO).tipo === 'reconciliar');
  const alFinal = motorDe(politicaVideo).evaluar(conVideo, T + HORAS_2_15 + MINUTO);
  check('B7) el plazo sigue existiendo: pasadas las 2 h 15 min, vence', alFinal.job?.state === 'timed_out');
}

/* ═══ C · LA PUERTA, DE PUNTA A PUNTA ═════════════════════════════════════ */
console.log('\n── C · generateVideo → ACCEPTED → barrido → dinero ──');
let precio = 0;
{
  /* B · ACEPTADO */
  modelArk = aceptar();
  const t0 = Date.now();
  const r = await pedir('pruebaB0001', 'vid-B');
  const job = await trabajoDe('pruebaB0001', 'vid-B');
  precio = Math.abs(uso('vid-B')?.amount ?? 0);
  check('C1) B · contesta ACCEPTED, con su trabajo, sin URL y sin progreso inventados',
    r.ok && r.valor.status === 'ACCEPTED' && r.valor.jobId === job?.jobId && r.valor.url === null && r.valor.assetId === null && r.valor.credits === precio && precio > 0,
    r.ok ? `${r.valor.status} · ${r.valor.credits} Credits` : codigo(r));
  check('C2) B · el POST salió UNA vez, pidiendo aceptar y soltar, y a Seedance', llamadas.length === 1 && llamadas[0].acceptAsync === true && llamadas[0].capability === 'video.generate');
  check('C3) B · el trabajo espera con la referencia del proveedor: es lo que el barrido necesita',
    job?.state === 'waiting' && job.attempts.length === 1 && job.attempts[0].providerRef?.providerId === 'seedance' && /^cgt-prueba-/.test(job.attempts[0].providerRef?.operationId ?? ''));
  check('C4) B · y lleva la política autorizada: un intento, 2 h 15 min de vida',
    job?.policy.retry.maxAttempts === 1 && job?.policy.maxLifetimeMs === HORAS_2_15 && job.deadlineAt - t0 >= HORAS_2_15 && job.deadlineAt - t0 < HORAS_2_15 + MINUTO,
    `intentos=${job?.policy.retry.maxAttempts} vida=${job?.policy.maxLifetimeMs} plazo=${job ? job.deadlineAt - t0 : '?'}`);
  check('C5) B · la reserva queda AUTORIZADA, sin cobro ni reembolso', uso('vid-B')?.status === 'AUTHORIZED' && !reembolso('vid-B') && saldo('pruebaB0001') === SALDO - precio);
  check('C6) B · y la reserva viaja dentro del trabajo, con la misma petición', job?.metadata?.creditRequestId === 'vid-B' && job?.metadata?.creditTransactionId === 'usage_vid-B');

  /* J · REINTENTO DEL CLIENTE mientras ModelArk trabaja. */
  const saldoJ = saldo('pruebaB0001');
  const rJ = await pedir('pruebaB0001', 'vid-B');
  check('C7) J · reintentar lo mismo mientras se hace: DUPLICATE_REQUEST, sin segundo POST ni segundo trabajo ni segundo cobro',
    !rJ.ok && rJ.error.details?.code === 'DUPLICATE_REQUEST' && llamadas.length === 1 && base.de('jobs').length === 1 && saldo('pruebaB0001') === saldoJ,
    codigo(rJ));

  /* LA RAMA COLGADA: veinticinco minutos después, con el vídeo aceptado y sin contestar todavía. */
  adelanto += 30 * MINUTO;
  const rR = await pedir('pruebaB0001', 'vid-B');
  check('C8) reintento pasados 30 min con un trabajo del Core: NO se devuelve nada, lo decide su liquidación',
    !rR.ok && rR.error.details?.code === 'DUPLICATE_REQUEST' && uso('vid-B')?.status === 'AUTHORIZED' && !reembolso('vid-B') && saldo('pruebaB0001') === saldoJ && llamadas.length === 1,
    codigo(rR));
  /* CONTROL: la misma reserva SIN trabajo del Core es lo que la rama colgada de siempre sigue devolviendo. */
  modelArk = aceptar();
  adelanto -= 30 * MINUTO;
  const rS = await pedir('pruebaR0001', 'vid-R');
  const jobS = await trabajoDe('pruebaR0001', 'vid-R');
  const docDelTrabajo = base.de('jobs').find((j) => j.jobId === jobS?.jobId);
  if (docDelTrabajo) base.docs.delete(`jobs/${docDelTrabajo.id}`);
  adelanto += 30 * MINUTO;
  const rS2 = await pedir('pruebaR0001', 'vid-R');
  check('C9) CONTROL · sin trabajo del Core, la rama colgada de siempre devuelve lo retenido (legacy intacta)',
    rS.ok && !rS2.ok && reembolso('vid-R')?.amount === precio && uso('vid-R')?.status === 'REFUNDED', codigo(rS2));
  adelanto -= 30 * MINUTO;
}

console.log('\n── D · Lo que contesta ModelArk decide, y solo eso ──');
{
  /* G · TERMINÓ BIEN */
  const jobB = await trabajoDe('pruebaB0001', 'vid-B');
  const tarea = jobB.attempts[0].providerRef.operationId;
  enModelArk.set(tarea, cuerpo(tarea, 'succeeded', { content: { video_url: `https://modelark.invalid/${tarea}.mp4` }, usage: { completion_tokens: 40594 } }));
  const saldoAntes = saldo('pruebaB0001');
  await pasada();
  const hecho = await trabajoDe('pruebaB0001', 'vid-B');
  const traido = traidos.find((p) => p.provenance?.jobId === hecho.jobId);
  check('D1) G · el resultado se trae a casa ANTES de cerrar, a nombre del dueño del TRABAJO, como vídeo',
    !!traido && traido.userId === 'pruebaB0001' && traido.kind === 'video' && traido.recurso === `https://modelark.invalid/${tarea}.mp4`);
  check('D2) G · el trabajo queda completado con su material, en el espacio de nombres de siempre: asset_ y 32 hexadecimales',
    hecho.state === 'completed' && hecho.result?.outputRefs?.[0] === traido?.assetId && !!base.leer(`assets/${traido?.assetId}`) && /^asset_[0-9a-f]{32}$/.test(traido?.assetId ?? ''),
    traido?.assetId);
  check('D3) G · y se cobra lo reservado, una vez: completeCredits, sin reembolso',
    uso('vid-B')?.status === 'COMPLETED' && !reembolso('vid-B') && saldo('pruebaB0001') === saldoAntes && saldo('pruebaB0001') === SALDO - precio);
  await pasada();
  check('D4) G · otra pasada no cobra otra vez ni vuelve a traer nada', uso('vid-B')?.status === 'COMPLETED' && saldo('pruebaB0001') === SALDO - precio && traidos.filter((p) => p.provenance?.jobId === hecho.jobId).length === 1);
  /* Y reintentar ahora: ya terminó, y su resultado vive en el material. */
  const rG = await pedir('pruebaB0001', 'vid-B');
  const fichaG = base.leer(`assets/${traido?.assetId}`);
  check('D5) G · reintentar lo terminado devuelve SU material, sin volver a generar ni a cobrar',
    rG.ok && rG.valor.status === 'COMPLETED' && rG.valor.duplicate === true && rG.valor.credits === 0
    && rG.valor.assetId === traido?.assetId && rG.valor.url === fichaG?.delivery?.url && rG.valor.jobId === hecho.jobId
    && llamadas.length === 2 && saldo('pruebaB0001') === SALDO - precio, codigo(rG));

  /* F · FALLÓ EN MODELARK */
  modelArk = aceptar();
  const rF = await pedir('pruebaF0001', 'vid-F');
  const jobF = await trabajoDe('pruebaF0001', 'vid-F');
  const tareaF = jobF.attempts[0].providerRef.operationId;
  enModelArk.set(tareaF, cuerpo(tareaF, 'failed', { error: { code: 'InternalServiceError', message: 'the task failed' } }));
  await pasada();
  const falloF = await trabajoDe('pruebaF0001', 'vid-F');
  check('D6) F · FAILED es final con un intento: el trabajo termina `failed` y no se programa otro POST',
    rF.ok && falloF.state === 'failed' && falloF.attemptCount === 1 && llamadas.filter((l) => l).length === 3);
  check('D7) F · y el barrido devuelve la reserva EXACTA', uso('vid-F')?.status === 'REFUNDED' && reembolso('vid-F')?.amount === precio && saldo('pruebaF0001') === SALDO);
  await pasada();
  check('D8) F · otra pasada no devuelve dos veces', saldo('pruebaF0001') === SALDO && base.de('creditTransactions').filter((t) => t.requestId === 'vid-F' && t.type === 'refund').length === 1);

  /* D · EL GET DE ESTADO FALLA UN RATO */
  modelArk = aceptar();
  await pedir('pruebaD0001', 'vid-D');
  const jobD = await trabajoDe('pruebaD0001', 'vid-D');
  const tareaD = jobD.attempts[0].providerRef.operationId;
  enModelArk.set(tareaD, 'no_contesta');
  await pasada();
  check('D9) D · ModelArk no contesta: nada se cierra y nada se devuelve', (await trabajoDe('pruebaD0001', 'vid-D')).state === 'waiting' && uso('vid-D')?.status === 'AUTHORIZED' && !reembolso('vid-D'));
  enModelArk.set(tareaD, cuerpo(tareaD, 'succeeded', { content: { video_url: `https://modelark.invalid/${tareaD}.mp4` } }));
  await pasada();
  check('D10) D · cuando vuelve a contestar, se cierra como tiene que cerrarse', (await trabajoDe('pruebaD0001', 'vid-D')).state === 'completed' && uso('vid-D')?.status === 'COMPLETED' && saldo('pruebaD0001') === SALDO - precio);

  /* C · SIGUE EN MARCHA (lo que antes era el sondeo que vencía) */
  modelArk = aceptar();
  await pedir('pruebaC0001', 'vid-C');
  const tareaC = (await trabajoDe('pruebaC0001', 'vid-C')).attempts[0].providerRef.operationId;
  enModelArk.set(tareaC, cuerpo(tareaC, 'running'));
  adelanto += 40 * MINUTO;
  await pasada();
  adelanto -= 40 * MINUTO;
  check('D11) C · cuarenta minutos en marcha: nadie lo vence, nadie lo cobra y nadie lo devuelve',
    (await trabajoDe('pruebaC0001', 'vid-C')).state === 'waiting' && uso('vid-C')?.status === 'AUTHORIZED' && !reembolso('vid-C'));

  /* E · TERMINÓ, PERO TRAERLO FALLA */
  modelArk = aceptar();
  await pedir('pruebaE0001', 'vid-E');
  const tareaE = (await trabajoDe('pruebaE0001', 'vid-E')).attempts[0].providerRef.operationId;
  enModelArk.set(tareaE, cuerpo(tareaE, 'succeeded', { content: { video_url: `https://modelark.invalid/${tareaE}.mp4` } }));
  traer = 'no_se_pudo_traer';
  await pasada();
  check('D12) E · terminó y no se pudo traer: se aplaza, sin cerrar y sin devolver', (await trabajoDe('pruebaE0001', 'vid-E')).state === 'waiting' && uso('vid-E')?.status === 'AUTHORIZED' && !reembolso('vid-E'));
  traer = 'ok';
  await pasada();
  check('D13) E · la pasada siguiente lo trae y lo cobra', (await trabajoDe('pruebaE0001', 'vid-E')).state === 'completed' && uso('vid-E')?.status === 'COMPLETED' && saldo('pruebaE0001') === SALDO - precio);

  /* H · EL PROCESO SE REINICIA DESPUÉS DE ACCEPTED: todo lo que hace falta está guardado. */
  modelArk = aceptar();
  await pedir('pruebaX0001', 'vid-H');
  const tareaH = (await trabajoDe('pruebaX0001', 'vid-H')).attempts[0].providerRef.operationId;
  olvidarLaPuerta();
  enModelArk.set(tareaH, cuerpo(tareaH, 'succeeded', { content: { video_url: `https://modelark.invalid/${tareaH}.mp4` } }));
  const otraComposicion = rt.mantenimientoDeWee({
    reconciliacion: () => rt.reconciliacionDeWee({ db: base, resolutores: { seedance: resolutor }, materializar: materializador, quietoDesdeMs: 0 })(),
    liquidacion: () => rt.barridoDeLiquidacionDeWee({ db: base })(),
  });
  await otraComposicion();
  check('D14) H · otra composición, sin nada en memoria, lo continúa y lo cierra', (await trabajoDe('pruebaX0001', 'vid-H')).state === 'completed' && uso('vid-H')?.status === 'COMPLETED');

  /* I · DOS RECONCILIACIONES A LA VEZ */
  modelArk = aceptar();
  await pedir('pruebaI0001', 'vid-I');
  const jobI = await trabajoDe('pruebaI0001', 'vid-I');
  const tareaI = jobI.attempts[0].providerRef.operationId;
  enModelArk.set(tareaI, cuerpo(tareaI, 'succeeded', { content: { video_url: `https://modelark.invalid/${tareaI}.mp4` } }));
  await Promise.all([pasada(), pasada()]);
  const cobrosI = base.de('creditTransactions').filter((t) => t.requestId === 'vid-I');
  check('D15) I · dos pasadas a la vez: un trabajo completado, un material, UNA liquidación',
    (await trabajoDe('pruebaI0001', 'vid-I')).state === 'completed' && uso('vid-I')?.status === 'COMPLETED' && saldo('pruebaI0001') === SALDO - precio
    && cobrosI.filter((t) => t.type === 'usage').length === 1 && !reembolso('vid-I')
    && base.de('assets').filter((a) => a.ownerAccountId === 'pruebaI0001').length === 1);

  /* A · EL POST SE RECHAZA ANTES DE QUE EXISTA LA TAREA */
  modelArk = rechazar();
  const rA = await pedir('pruebaA0001', 'vid-A');
  const jobA = await trabajoDe('pruebaA0001', 'vid-A');
  check('A) el POST se rechaza sin tarea: el trabajo termina sin referencia y la reserva se devuelve EXACTA',
    !rA.ok && jobA?.state === 'failed' && !jobA.attempts[0].providerRef && uso('vid-A')?.status === 'REFUNDED' && reembolso('vid-A')?.amount === precio && saldo('pruebaA0001') === SALDO,
    codigo(rA));
  await pasada();
  check('A) y el barrido no la devuelve otra vez', saldo('pruebaA0001') === SALDO && base.de('creditTransactions').filter((t) => t.requestId === 'vid-A' && t.type === 'refund').length === 1);
}

console.log('\n── E · Un reintento que llega tarde ya no vence un vídeo aceptado ──');
{
  /* El conductor de verdad, retomado como lo retomaría una segunda llamada, tres minutos después. */
  const { settings } = await loadConfig();
  const normalizado = normalizeVideoRequest({ prompt: 'Un tren de noche', durationSec: 5, aspectRatio: '16:9', quality: 'auto', model: 'auto' }, settings);
  const retomar = async (requestId, deadlineMs, politica) => {
    modelArk = aceptar();
    const conductor = await rt.conductorDeWee({ db: base, aceptaAsincrono: true, ...(politica ? { politica } : {}) });
    return rt.pedirMedio({
      conductor, principal: { userId: 'pruebaT0001' },
      trace: { traceId: requestId, requestId, userId: 'pruebaT0001', workplace: 'studio' },
      capability: 'video.generate', input: normalizado.input, proposito: 'Crear un vídeo',
      ruteo: { modelId: normalizado.modelId, allowedProviders: ['seedance'] },
      contabilidad: { service: 'ai_video', creditsEstimated: 75, creditTransactionId: `usage_${requestId}`, creditRequestId: requestId },
      contexto: { appId: 'wee', operationId: requestId },
      deadlineAt: Date.now() + deadlineMs,
    });
  };
  const politicaVideo = rt.politicaDe(rt.PLAZOS_DE_VIDEO, { ...core.POLITICA_DE_TRABAJO, retry: { ...core.POLITICA_DE_TRABAJO.retry, maxAttempts: 1 } });
  const primera = await retomar('vid-T', HORAS_2_15, politicaVideo);
  adelanto += 3 * MINUTO;
  const segunda = await retomar('vid-T', HORAS_2_15, politicaVideo);
  const jobT = await trabajoDe('pruebaT0001', 'vid-T');
  check('E1) con la vida de plazos.ts, retomarlo a los 3 min lo deja esperando: nadie lo vence',
    primera.estado === 'en_marcha' && segunda.estado === 'en_marcha' && jobT?.state === 'waiting', `${primera.estado}/${segunda.estado}/${jobT?.state}`);
  adelanto -= 3 * MINUTO;
  /* CONTROL: con los 120 s de antes, la segunda llamada venció el vídeo aceptado. */
  await retomar('vid-T120', 120_000);
  adelanto += 3 * MINUTO;
  await retomar('vid-T120', 120_000);
  const jobT120 = await trabajoDe('pruebaT0001', 'vid-T120');
  check('E2) CONTROL · con 120 s, el reintento tardío lo vencía y la liquidación lo dejaba en «reconciliar»',
    jobT120?.state === 'timed_out' && rt.decidirLiquidacion(jobT120, Date.now()).tipo === 'reconciliar', jobT120?.state);
  adelanto -= 3 * MINUTO;
}

console.log('\n── F · Credits: la regla autorizada, también por el camino asíncrono ──');
{
  await creditEngine.spendCredits({ userId: 'pruebaBrain0001', service: 'ai_brain', amount: 1, requestId: 'brain_uBrain_1', source: 'weë-brain' });
  await creditEngine.completeCredits({ userId: 'pruebaBrain0001', requestId: 'brain_uBrain_1' });
  const antesDeBrain = JSON.stringify(uso('brain_uBrain_1'));
  const antes = llamadas.length;
  modelArk = aceptar();
  const r = await pedir('pruebaBrain0001', 'brain_uBrain_1');
  check('F1) un requestId de Brain no vale para vídeo, con la puerta abierta: INVALID_REQUEST · idempotency_conflict, antes de generar',
    !r.ok && r.error.details?.code === 'INVALID_REQUEST' && r.error.details?.reason === 'idempotency_conflict'
    && llamadas.length === antes && !(await trabajoDe('pruebaBrain0001', 'brain_uBrain_1')) && JSON.stringify(uso('brain_uBrain_1')) === antesDeBrain, codigo(r));
  modelArk = aceptar();
  const rX = await pedir('pruebaS0001', 'vid-B');
  check('F2) la clave de OTRA cuenta: FORBIDDEN, sin POST, sin trabajo propio y sin tocar el ajeno',
    !rX.ok && rX.error.details?.code === 'FORBIDDEN' && llamadas.length === antes && !(await trabajoDe('pruebaS0001', 'vid-B')) && (await trabajoDe('pruebaB0001', 'vid-B'))?.state === 'completed', codigo(rX));
}

console.log('\n── G · Seguridad: la app no decide nada del dinero ni del resultado ──');
{
  modelArk = aceptar();
  const r = await pedir('pruebaS0001', 'vid-S', { status: 'COMPLETED', assetId: 'asset_0123456789abcdef0123456789abcdef', jobId: 'job-de-otro', providerTaskId: 'cgt-inventada', refund: true, credits: 0 });
  const job = await trabajoDe('pruebaS0001', 'vid-S');
  check('G1) lo que el cliente mande de estado, material, trabajo, tarea o reembolso se ignora',
    r.ok && r.valor.status === 'ACCEPTED' && r.valor.jobId === job?.jobId && job?.attempts[0].providerRef?.operationId !== 'cgt-inventada'
    && uso('vid-S')?.status === 'AUTHORIZED' && !reembolso('vid-S') && !base.leer('assets/asset_0123456789abcdef0123456789abcdef'));
  check('G2) el material de un resultado es SIEMPRE del dueño del trabajo, nunca de lo que diga el aviso', traidos.length > 0 && traidos.every((p) => base.de('jobs').some((j) => JSON.parse(j.json).owner.userId === p.userId && JSON.parse(j.json).jobId === p.provenance.jobId)));
  check('G3) una operación de proveedor que no es de nadie no encuentra trabajo', (await rt.atenderAviso(rt.atencionDeWee({ db: base, materializar: materializador }), leerAvisoDeSeedance(cuerpo('cgt-no-existe', 'succeeded', { content: { video_url: 'https://modelark.invalid/x.mp4' } })))).estado === 'no_encontrada');
  check('G4) el receptor de avisos sigue sin desplegarse: solo el barrido le pregunta a ModelArk', !/avisoDeProveedor/.test(sinComentarios(leer('functions/src/index.ts'))));
}

console.log('\n── H · Legacy, F1-A y productions: intactos ──');
{
  const bloque = (s) => {
    const a = s.indexOf('    try {\n      const result = await videoEngine.generate(');
    return a < 0 ? '' : s.slice(a, s.indexOf('  } catch (error) {\n    throw toEngineHttpsError(error);', a));
  };
  const antes = git(`show ${ANTES}:functions/src/creator/video.ts`);
  check('H1) la rama legacy de generateVideo es byte a byte la de antes', bloque(VIDEO_SRC).length > 500 && bloque(VIDEO_SRC) === bloque(antes));
  /*
   * F1-D mueve DOS piezas del motor, con autorización y solo esas: el cupo cuenta
   * una operación repetida UNA vez (`limits.ts`, decisión 14) y el adaptador de
   * Seedance le manda a ModelArk el plazo de `plazos.ts` al aceptar y soltar
   * (`providers/seedance.ts`, ficha 6). Se fijan por nombre y por tamaño: una
   * línea más en cualquiera de las dos, o un archivo más, y esto falla.
   */
  const MOTOR_F1D = { 'functions/src/engine/limits.ts': '15\t3', 'functions/src/engine/providers/seedance.ts': '10\t0' };
  /*
   * Y los arreglos de la FASE 1 del Harness (auditoría H0), también por nombre y
   * tamaño, re-anclados al integrar producción en main como hizo 88fa34d: ninguna
   * cerca se quita ni se afloja. limits.ts y providers/seedance.ts los mueven F1-D
   * Y el Harness: su tamaño es el del diff combinado.
   */
  const MOTOR_F1D_Y_HARNESS = {
    'functions/src/creator/credits.ts': '45\t4', // 0926584 (#9) · 6d33fd2 (#15a) · 0799ed6
    'functions/src/creator/index.ts': '140\t21', // C-1 2026-10-05 (+16 −5, antes 124/16): creatorQuote en transacción, solo con el trabajo `planned`, sin reclamo reciente ni reserva · segunda auditoría de cierre 2026-10-01 (+7 −1, antes 117/15): vozSinNarracion antes del vídeo · 0926584 (#9) · 0799ed6 · i18n da-DK (+10 el locale, +2 la observación del idioma de salida) · revisión post-auditoría 2026-10-01: jobId/stepId en el aviso del idioma de salida · cierre post-auditoría 2026-10-01 (+6 −5, antes 111/10): creatorChat y creatorQuote montan MODEL_SECRETS, y la adaptación de idioma de creatorRun lleva su sistema y `format: 'text'` (entradaDeAdaptacion)
    'functions/src/engine/admin.ts': '11\t4', // 0ad8500 (#19) · 5e87b80 (FASE 8) · cierre post-auditoría 2026-10-01 (+2 −2, antes 9/2): engineAdmin monta MODEL_SECRETS
    'functions/src/engine/config.ts': '36\t1', // 8193184 (#20) · misión fal: '3d' entra en la lista de modalidades que ya añadió #20 (no cambia la cifra)
    'functions/src/engine/elegibilidad.ts': '193\t0', // misión fal (nuevo): la regla común de elegibilidad —gobierno, revisión, activación y jurisdicción—
    'functions/src/engine/errors.ts': '1\t1', // i18n da-DK: el rechazo de entrada sin «el proveedor»
    'functions/src/engine/gateway.ts': '10\t2', // 0ad8500 (#19) · misión fal (+8 −2, antes 2/0): el ejecutor pregunta a la regla común y los ajustes no tocan identidad ni gobierno
    'functions/src/engine/http.ts': '26\t1', // 16ca1ae (#3)
    'functions/src/engine/index.ts': '3\t1', // misión fal (nuevo en el mapa): la composición conecta la jurisdicción de la cuenta al Router
    'functions/src/engine/jurisdiccion.ts': '46\t0', // misión fal (nuevo): el conector de la jurisdicción —el país que declara el Perfil Real, leído en el servidor—
    'functions/src/engine/ledger.ts': '19\t2', // harness/fase-2 (H0 #22) · F2-C1 (+7 −1, antes 12/1): el gasto de eval (attribution:'eval') se contabiliza en evalUsage/{día}, no en el tope del usuario
    'functions/src/engine/limits.ts': '40\t4', // F1-D (decisión 14) + 5e87b80 (FASE 8) + harness/fase-2 (H0 #22) · misión fal (+2 −1, antes 38/3): cupo diario de la modalidad 3d
    'functions/src/engine/mundo.ts': '12\t0', // misión mundo3d (nuevo): el contrato de world.generate (core/mundo3d) reexportado para los adaptadores, que no importan del Core
    'functions/src/engine/promptLanguage.ts': '21\t0', // cierre post-auditoría 2026-10-01 (nuevo en el mapa, +21): SISTEMA_POR_DEFECTO neutro y `pideTextoPlano` (server/prompts-internos)
    'functions/src/engine/providers/claude.ts': '3\t2', // cierre post-auditoría 2026-10-01 (nuevo en el mapa): el sistema por defecto neutro y `format: 'text'` respetado
    'functions/src/engine/providers/deepseek.ts': '3\t2', // cierre post-auditoría 2026-10-01 (nuevo en el mapa): el sistema por defecto neutro y `format: 'text'` respetado
    'functions/src/engine/providers/fal-modelos.ts': '147\t0', // misión fal (nuevo): los modelos de fal como DATOS, con su gobierno y sus reglas territoriales · misión mundo3d (+31, antes 116/0): el mapeo de la entrada de Weë a su esquema y el papel del archivo de salida, como datos
    'functions/src/engine/providers/fal.ts': '424\t0', // misión fal (nuevo): el adaptador de fal (cola, fotos en línea, avisos firmados, cancelación, reconciliación) · misión mundo3d (+31, antes 393/0): traduce la entrada de Weë con los datos del mapeo y no escribe ningún campo de fal
    'functions/src/engine/providers/gemini.ts': '4\t2', // cierre post-auditoría 2026-10-01 (nuevo en el mapa): el sistema por defecto neutro y `format: 'text'` respetado
    'functions/src/engine/providers/openai.ts': '3\t2', // cierre post-auditoría 2026-10-01 (nuevo en el mapa): el sistema por defecto neutro y `format: 'text'` respetado
    'functions/src/engine/providers/seedance.ts': '33\t19', // F1-D (ficha 6) + 8a9f098 (#21)
    'functions/src/engine/registry.ts': '17\t1', // 0ad8500 (#19) · misión fal (+15 −1, antes 2/0): fal en ADAPTERS (apagado), la cadena de world.generate y el plazo de la modalidad 3d
    'functions/src/engine/router.ts': '122\t13', // 0ad8500 (#19) · 5e87b80 (FASE 8) · i18n da-DK · harness/fase-2 (H0 #22) · cierre post-auditoría 2026-10-01 · F2-C1 (+2, antes 57/4) · misión fal (+63 −9, antes 59/4): la elegibilidad con las jurisdicciones de la operación —de la petición o de la cuenta, solo si algún modelo las necesita—, el descarte con su escalón y su modelo, NOT_AVAILABLE «sin_modelo_elegible» y la decisión al libro (auditoría)
    'functions/src/engine/types.ts': '194\t3', // misión mundo3d (+45, antes 149/3): el papel de un archivo de salida, las variantes de un resultado y el origen de un campo del proveedor en la entrada de Weë · 0ad8500 (#19) · 5e87b80 (FASE 8) · F2-C1 (+10, antes 19/0) · misión fal (+120 −3, antes 29/0): gobierno y territorio del modelo, escalones de elegibilidad, jurisdicciones de la operación, la decisión en el libro, modalidad 3d
    'functions/src/engine/verification.ts': '8\t0', // misión fal (nuevo en el mapa): la ficha de fal, documentada y sin verificar con la API real
    'functions/src/engine/webhooks.ts': '38\t14', // 8a9f098 (#21)
    'functions/src/generateAvatar.ts': '132\t15', // a5f6f99 (#11) · 0ad8500 (#19) · 0799ed6 · revisión post-auditoría 2026-10-01: reservas abandonadas del avatar (money/reserva-colgada-avatar) · cierre post-auditoría 2026-10-01 (+3 −3, antes 129/12): el avatar monta AVATAR_SECRETS (solo Gemini)
  };
  /*
   * Y la integración i18n da-DK (rama i18n/da-dk, 2026-10-01), también por nombre y tamaño: el locale de la app viaja
   * con creatorChat y creatorRun para que los pasos de texto escriban en el idioma de la persona (+10 en
   * creator/index.ts, ni una línea del reclamo, del cobro ni del vídeo), y dos errores del motor dejan de nombrar a
   * «el proveedor» (una línea en errors.ts y otra en router.ts, solo el texto).
   */
  const movidos = git(`diff --numstat ${ANTES} -- functions/src/engine functions/src/creator/index.ts functions/src/creator/credits.ts functions/src/generateAvatar.ts`)
    .trim().split('\n').filter(Boolean).map((l) => l.split('\t')).map(([mas, menos, f]) => [f, `${mas}\t${menos}`]);
  check('H2) y lo que la sostiene tampoco se movió: sondeo, adaptador, router, motor de vídeo, libro, creatorRun — salvo las dos piezas nominales de F1-D y los arreglos del Harness, del tamaño exacto',
    JSON.stringify(Object.fromEntries(movidos)) === JSON.stringify(MOTOR_F1D_Y_HARNESS) && Object.keys(MOTOR_F1D).every((f) => f in MOTOR_F1D_Y_HARNESS),
    JSON.stringify(Object.fromEntries(movidos)));
  /*
   * Del Core, solo la misión fal (2026-10-05), por nombre y tamaño: world.generate y la modalidad 3d, el material
   * `world` y sus derechos, el núcleo 3D (escena3d, nuevo) y su contrato, el tipo `aggregator` del registro, los dos
   * tipos de resultado y la modalidad en el Router (job-queue 63fal). Aditivo: ningún contrato sube de versión.
   */
  /*
   * + misión mundo3d (2026-10-05): el contrato canónico de world.generate (mundo3d, nuevo), su versión en contracts (+6),
   * su exportación (index +1) y la forma de un id del núcleo 3D exportada para reutilizarla (escena3d +1).
   */
  const CORE_DE_LA_MISION_FAL = '4\t2\tfunctions/src/core/capability.ts|44\t2\tfunctions/src/core/content/asset.ts|12\t0\tfunctions/src/core/contracts.ts'
    + '|217\t0\tfunctions/src/core/escena3d.ts|2\t0\tfunctions/src/core/index.ts|364\t0\tfunctions/src/core/mundo3d.ts|2\t1\tfunctions/src/core/provider.ts'
    + '|6\t0\tfunctions/src/core/registry/capabilities.ts|6\t2\tfunctions/src/core/registry/types.ts|2\t2\tfunctions/src/core/router.ts';
  check('H3) F1-A y productions, sin tocar; y del Core, solo la misión fal, del tamaño exacto',
    git(`diff --name-only ${ANTES} -- functions/src/filmmaker functions/src/productions`).trim() === ''
    && git(`diff --numstat ${ANTES} -- functions/src/core`).trim().split('\n').map((l) => l.replace(/\r$/, '')).join('|') === CORE_DE_LA_MISION_FAL,
    git(`diff --numstat ${ANTES} -- functions/src/core`).trim().split('\n').join('|'));
}

console.log('\n── I · El cliente: ACCEPTED, con claves que ya existen ──');
{
  const SERVICIO = leer('services/videoService.ts');
  check('I1) el servicio entiende ACCEPTED: trabajo, petición, sin URL ni progreso inventados',
    /status: 'ACCEPTED';/.test(SERVICIO) && /jobId: string \| null;/.test(SERVICIO) && /requestId: string;/.test(SERVICIO) && /url: null;/.test(SERVICIO)
    && !/progress|porcentaje|percent/i.test(sinComentarios(SERVICIO)));
  check('I2) y devuelve la petición con la que se pidió, no una inventada', /return result\.data\.status === 'ACCEPTED' \? \{ \.\.\.result\.data, requestId \} : result\.data;/.test(SERVICIO));
  /*
   * Los diccionarios salen del REGISTRO (`i18n/idiomas.ts`), como en f1d-cliente M3b, y no de una lista escrita aquí
   * (cierre post-auditoría 2026-10-01): la lista a mano eran los once de cuando se escribió y el registro ya tiene
   * dieciséis. Uno por idioma ofrecido (`listo`) y uno más por cada variante con diccionario propio (la que cubre el
   * código base del idioma ES ese diccionario). Tienen que ser EXACTAMENTE las carpetas de `i18n/textos`, y los once
   * de antes siguen dentro: la lista solo puede crecer con el registro, nunca quedarse corta ni encoger.
   */
  const { IDIOMAS: REGISTRO } = crearCargador()('i18n/idiomas.ts');
  const IDIOMAS = REGISTRO.filter((i) => i.listo)
    .flatMap((i) => [i.codigo, ...(i.variantes || []).filter((v) => !v.cubre.includes(i.codigo)).map((v) => v.locale)]);
  const LOS_ONCE_DE_ANTES = ['es', 'en', 'pt', 'pt-PT', 'de', 'fr', 'it', 'ko', 'ru', 'zh', 'zh-TW'];
  const carpetas = fs.readdirSync(path.resolve(RAIZ, 'i18n/textos'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  check('I3a) los diccionarios, contados del registro, son exactamente las carpetas de i18n/textos, y los once de antes siguen ahí',
    JSON.stringify([...IDIOMAS].sort()) === JSON.stringify([...carpetas].sort()) && LOS_ONCE_DE_ANTES.every((l) => IDIOMAS.includes(l)),
    `registro: ${IDIOMAS.join(',')} · carpetas: ${carpetas.join(',')}`);
  const faltan = IDIOMAS.filter((l) => !/progressWorking:/.test(leer(`i18n/textos/${l}/creaciones.ts`)) || !/progressFindLater:/.test(leer(`i18n/textos/${l}/creaciones.ts`)));
  check(`I3) «en proceso» se dice con las claves del progreso que ya están en los ${IDIOMAS.length} diccionarios del registro: ninguna nueva, ninguna duplicada`,
    faltan.length === 0 && /creaciones\.progressWorking/.test(SERVICIO) && /creaciones\.progressFindLater/.test(SERVICIO), faltan.join(', ') || `los ${IDIOMAS.length}`);
}

check('esta suite está en la cadena de `npm test`', /video-asincrono\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
