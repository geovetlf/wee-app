/*
 * FRENTE I · CARGA — EL ENTORNO COMÚN (aislamiento + instrumentos).
 *
 * No es una prueba: lo importan `carga.mjs` y `rafaga-dinero.mjs`. Hace tres cosas, en este orden:
 *
 *  1. AISLA el proceso ANTES de cargar nada de Weë: proyecto `demo-*`, emulador de Firestore obligatorio en
 *     FIRESTORE_EMULATOR_HOST, sin claves de proveedor, sin sondeo del servidor de metadatos, y la red cortada salvo
 *     ese emulador (cualquier otro intento se cuenta y se informa). Es el patrón de
 *     functions/test/_brain-operacion-emulador.mjs (rama a03/brain-suite-om).
 *  2. Carga el código COMPILADO (functions/lib) y sustituye el proveedor `mock` por uno con latencia configurable
 *     (CARGA_DEMORA_MS, por defecto 25 ms) que cuenta llamadas.
 *  3. INSTRUMENTA el SDK de Firestore sin tocar el código de Weë: cuántos intentos hace cada transacción (un intento
 *     de más = la transacción se reintentó por contención), con qué código acaba (10 = ABORTED), y cuántas
 *     escrituras recibe cada documento (para encontrar documentos calientes).
 *
 * Lo que esto mide es CONTENCIÓN Y LÓGICA en el emulador. No mide la latencia real de Firestore ni de Cloud Run, ni
 * arranques en frío, ni el límite sostenido de escrituras por documento de Firestore real: el emulador no lo aplica.
 */
import net from 'node:net';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const FUNCIONES = path.resolve(AQUI, '../../functions');

/* ── 1. Aislamiento ────────────────────────────────────────────────────────── */
const PROYECTO = process.env.GCLOUD_PROJECT || 'demo-wee-carga';
if (!PROYECTO.startsWith('demo-')) { console.error(`✘ Solo proyectos demo-* (llegó «${PROYECTO}»).`); process.exit(2); }
const [HOST, PUERTO_TXT] = String(process.env.FIRESTORE_EMULATOR_HOST || '').split(':');
const PUERTO = Number(PUERTO_TXT);
if (!HOST || !PUERTO) { console.error('✘ Falta FIRESTORE_EMULATOR_HOST (p. ej. 127.0.0.1:18100).'); process.exit(2); }
for (const k of ['ANTHROPIC_API_KEY', 'ARK_API_KEY', 'BFL_API_KEY', 'DEEPSEEK_API_KEY', 'ELEVENLABS_API_KEY', 'FAL_KEY', 'GEMINI_API_KEY',
  'MINIMAX_API_KEY', 'OPENAI_API_KEY', 'TRIPO_API_KEY', 'MESHY_API_KEY', 'SEEDANCE_CALLBACK_TOKEN', 'GOOGLE_APPLICATION_CREDENTIALS',
  'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST', 'STORAGE_EMULATOR_HOST', 'FUNCTIONS_EMULATOR', 'FIREBASE_CONFIG',
  'GOOGLE_CLOUD_PROJECT', 'WEE_ADMIN_UIDS']) delete process.env[k];
process.env.GCLOUD_PROJECT = PROYECTO;
process.env.METADATA_SERVER_DETECTION = 'none';

export const intentosDeRed = [];
globalThis.fetch = async (url) => { intentosDeRed.push(`fetch ${String(url).slice(0, 80)}`); throw new Error('carga: red cortada'); };
const conectarOriginal = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...a) {
  const crudo = Array.isArray(a[0]) ? a[0][0] : a[0];
  const o = typeof crudo === 'object' && crudo !== null ? crudo : { port: crudo, host: a[1] };
  const host = String(o.host ?? 'localhost');
  const port = Number(o.port);
  if (['127.0.0.1', 'localhost', '::1', HOST].includes(host) && port === PUERTO) return conectarOriginal.apply(this, a);
  intentosDeRed.push(`socket ${host}:${port}`);
  throw new Error(`carga: conexión no permitida a ${host}:${port}`);
};

/* Los avisos de Weë (console.error/warn de los catch) se cuentan en vez de inundar la salida. */
export const avisos = [];
const escribir = (...p) => process.stdout.write(p.join(' ') + '\n');
for (const n of ['log', 'warn', 'error', 'info']) console[n] = (...p) => { if (n !== 'log') avisos.push(`[${n}] ${p.map((x) => (x instanceof Error ? x.message : String(x))).join(' ').slice(0, 160)}`); };
export const decir = escribir;

/* ── 2. Código compilado y Firestore del emulador ──────────────────────────── */
export const req = createRequire(path.join(FUNCIONES, 'package.json'));
const { initializeApp } = req('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = req('firebase-admin/firestore');
initializeApp({ projectId: PROYECTO });
export const db = getFirestore();
export { FieldValue, Timestamp };
export const lib = (p) => req(path.join(FUNCIONES, 'lib', p));

/* ── 3. Instrumentos sobre el SDK ──────────────────────────────────────────── */
const gcf = req('@google-cloud/firestore');
if (!(db instanceof gcf.Firestore)) { escribir('BLOQUEADO: firebase-admin no usa el mismo @google-cloud/firestore que se instrumenta'); process.exit(2); }

export const medidor = {
  transacciones: 0, intentos: 0, reintentadas: 0, maxIntentos: 0, abortadas: 0, fallidasPorCodigo: {},
  escrituras: new Map(),
  reiniciar() { this.transacciones = 0; this.intentos = 0; this.reintentadas = 0; this.maxIntentos = 0; this.abortadas = 0; this.fallidasPorCodigo = {}; this.escrituras = new Map(); },
  foto() {
    return { transacciones: this.transacciones, intentos: this.intentos, reintentadas: this.reintentadas, maxIntentos: this.maxIntentos,
      abortadas: this.abortadas, fallidasPorCodigo: { ...this.fallidasPorCodigo } };
  },
  /** Los documentos que más escrituras recibieron, con la ruta normalizada (ids de la tanda → {cuenta}, fechas → {dia}). */
  calientes(top = 8) {
    return [...this.escrituras.entries()].sort((a, b) => b[1] - a[1]).slice(0, top).map(([ruta, n]) => ({ ruta, escrituras: n }));
  },
};
const runTxOriginal = gcf.Firestore.prototype.runTransaction;
gcf.Firestore.prototype.runTransaction = function (fn, opciones) {
  medidor.transacciones++;
  let intentos = 0;
  const envuelta = (tx) => { intentos++; medidor.intentos++; return fn(tx); };
  return runTxOriginal.call(this, envuelta, opciones).then(
    (v) => { if (intentos > 1) medidor.reintentadas++; medidor.maxIntentos = Math.max(medidor.maxIntentos, intentos); return v; },
    (e) => {
      if (intentos > 1) medidor.reintentadas++;
      medidor.maxIntentos = Math.max(medidor.maxIntentos, intentos);
      const codigo = typeof e?.code === 'number' ? `grpc_${e.code}` : String(e?.code ?? e?.name ?? 'error');
      /* Solo los fallos del almacén (gRPC): los errores de negocio de Weë (saldo, duplicado…) no son contención. */
      if (typeof e?.code === 'number') medidor.fallidasPorCodigo[codigo] = (medidor.fallidasPorCodigo[codigo] || 0) + 1;
      if (e?.code === 10) medidor.abortadas++;
      throw e;
    },
  );
};
const RE_DIA = /\d{4}-\d{2}-\d{2}/g;
const normalizar = (ruta) => ruta.replace(RE_DIA, '{dia}').replace(/C[a-z0-9]{6,}u\d+/g, '{cuenta}');
for (const metodo of ['set', 'update', 'create', 'delete']) {
  const original = gcf.WriteBatch.prototype[metodo];
  gcf.WriteBatch.prototype[metodo] = function (ref, ...resto) {
    const ruta = normalizar(String(ref?.path ?? '?'));
    /* Los documentos de una sola operación (ids automáticos) se agrupan por colección: lo que interesa es lo compartido. */
    const clave = /\/[A-Za-z0-9]{20}$/.test(ruta) ? ruta.replace(/[A-Za-z0-9]{20}$/, '{auto}') : ruta;
    medidor.escrituras.set(clave, (medidor.escrituras.get(clave) || 0) + 1);
    return original.call(this, ref, ...resto);
  };
}

/* ── Proveedor simulado con latencia ───────────────────────────────────────── */
const { ADAPTERS } = lib('engine/registry.js');
const reales = Object.entries(ADAPTERS).filter(([id, a]) => id !== 'mock' && a.isConfigured?.()).map(([id]) => id);
if (reales.length) { escribir('BLOQUEADO: hay proveedores reales configurados:', reales.join(',')); process.exit(2); }
export const mock = { llamadas: 0, demoraMs: Number(process.env.CARGA_DEMORA_MS || 25) };
const correMock = ADAPTERS.mock.run;
ADAPTERS.mock.run = async (r) => {
  mock.llamadas++;
  await new Promise((ok) => setTimeout(ok, mock.demoraMs));
  return correMock.call(ADAPTERS.mock, r);
};

/* ── Utilidades de medida ──────────────────────────────────────────────────── */
export const RUN = Date.now().toString(36);
let contadorCuentas = 0;
/** Un uid nuevo de esta ejecución (la forma la reconoce `normalizar`). */
export const nuevaCuenta = () => `C${RUN}u${++contadorCuentas}`;

const { creditEngine } = lib('credits/creditEngine.js');
export { creditEngine };
const { welcomeTransactionId } = lib('credits/creditTransactions.js');
/**
 * Perfil Real + cuenta de Credits YA inicializada (saldo 240 o el dado), escrita directamente y fuera del reloj: la
 * misma forma que deja `ensureAccount` (campos de Credits + el asiento de bienvenida, para que nadie la vuelva a dar).
 * No pasa por el Credit Engine A PROPÓSITO: la primera tanda demostró que dar de alta 25 cuentas a la vez por
 * `ensureAccount` choca en creditStats/global y aborta (ver estado-lineas.md § Frente I). La bienvenida por el motor
 * se mide aparte (R4 y getCreditsBalance «primera vez»).
 */
export const alta = async (uid, saldo) => {
  const b = db.batch();
  const ahora = Timestamp.now();
  b.set(db.collection('users').doc(`doc_${uid}`), { uid, displayName: uid, creditsBalance: saldo ?? 240, creditsLifetimeEarned: 240, creditsLifetimeSpent: 0, creditsInitializedAt: ahora });
  b.set(db.collection('creditTransactions').doc(welcomeTransactionId(uid)), { id: welcomeTransactionId(uid), userId: uid, type: 'grant', amount: 240, balanceBefore: 0, balanceAfter: 240,
    reason: 'Credits de bienvenida', source: 'welcome', status: 'COMPLETED', requestId: welcomeTransactionId(uid), createdAt: ahora, updatedAt: ahora });
  await b.commit();
  return uid;
};
export const saldoDe = async (uid) => (await db.collection('users').doc(`doc_${uid}`).get()).data()?.creditsBalance;
export const movimientosDe = async (uid) => (await db.collection('creditTransactions').where('userId', '==', uid).get()).docs.map((d) => d.data());

export const percentil = (xs, p) => {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  return Math.round(o[Math.min(o.length - 1, Math.ceil((p / 100) * o.length) - 1)] * 10) / 10;
};
export const resumenLatencias = (xs) => ({ n: xs.length, p50: percentil(xs, 50), p95: percentil(xs, 95), p99: percentil(xs, 99), max: xs.length ? Math.round(Math.max(...xs)) : null });

/** Ejecuta y cronometra; nunca lanza (el error se clasifica). */
export const cronometrar = async (fn) => {
  const t0 = process.hrtime.bigint();
  try {
    const v = await fn();
    return { ok: true, ms: Number(process.hrtime.bigint() - t0) / 1e6, v };
  } catch (e) {
    const codigo = e?.details?.code ?? e?.code ?? e?.name ?? 'error';
    return { ok: false, ms: Number(process.hrtime.bigint() - t0) / 1e6, codigo: String(codigo), mensaje: String(e?.message ?? e).slice(0, 140) };
  }
};
export const contarErrores = (rs) => rs.filter((r) => !r.ok).reduce((a, r) => ((a[r.codigo] = (a[r.codigo] || 0) + 1), a), {});

/** Memoria y CPU del proceso durante una medición: pico de RSS/heap muestreado cada 50 ms y CPU consumida. */
export const conRecursos = async (fn) => {
  const cpu0 = process.cpuUsage();
  const t0 = Date.now();
  let picoRss = process.memoryUsage().rss;
  let picoHeap = process.memoryUsage().heapUsed;
  const iv = setInterval(() => { const m = process.memoryUsage(); picoRss = Math.max(picoRss, m.rss); picoHeap = Math.max(picoHeap, m.heapUsed); }, 50);
  try {
    const valor = await fn();
    const cpu = process.cpuUsage(cpu0);
    const pared = Date.now() - t0;
    return { valor, recursos: { paredMs: pared, cpuMs: Math.round((cpu.user + cpu.system) / 1000), cpuPorPared: pared ? Math.round(((cpu.user + cpu.system) / 1000 / pared) * 100) / 100 : 0,
      picoRssMB: Math.round(picoRss / 1048576), picoHeapMB: Math.round(picoHeap / 1048576) } };
  } finally { clearInterval(iv); }
};
